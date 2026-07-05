const { chatCompletion } = require('./api');
const { TOOL_DEFINITIONS, executeTool, formatToolCall, formatToolResult } = require('./tools');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

class Agent {
  constructor(config) {
    this.config = config;
    this.messages = [
      { role: 'system', content: config.systemPrompt }
    ];
    this.tools = TOOL_DEFINITIONS;
    this.maxToolIterations = 10; // Prevent infinite loops
    this.fileIndex = new Map(); // Simple code index: filepath -> {content, mtime}
  }

  // ========== Code Indexing (Basic RAG) ==========
  async buildIndex(dir = '.') {
    const resolved = path.resolve(dir);
    if (!fs.existsSync(resolved)) return;
    const files = [];

    function walk(currentDir) {
      const items = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(currentDir, item.name);
        if (item.isDirectory() && item.name !== 'node_modules' && !item.name.startsWith('.') && item.name !== 'dist' && item.name !== 'build') {
          walk(fullPath);
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.h', '.md', '.json', '.html', '.css', '.scss'].includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }

    walk(resolved);
    let indexed = 0;
    for (const file of files) {
      try {
        const stat = fs.statSync(file);
        const content = fs.readFileSync(file, 'utf8');
        this.fileIndex.set(file, {
          content,
          mtime: stat.mtimeMs,
          size: stat.size,
          lines: content.split('\n').length
        });
        indexed++;
      } catch (e) {
        // Skip unreadable files
      }
    }
    return { indexed, files: files.length };
  }

  searchIndex(query) {
    const results = [];
    const queryLower = query.toLowerCase();
    const queryParts = queryLower.split(/\s+/);

    for (const [file, meta] of this.fileIndex) {
      const contentLower = meta.content.toLowerCase();
      let score = 0;
      for (const part of queryParts) {
        if (part.length < 2) continue;
        const count = (contentLower.match(new RegExp(part, 'g')) || []).length;
        score += count;
      }
      // Bonus for filename match
      if (path.basename(file).toLowerCase().includes(queryLower)) score += 10;
      if (score > 0) {
        results.push({ file, score, lines: meta.lines });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  // ========== Core Agent Loop with Multi-step Execution ==========
  async send(userInput, options = {}) {
    const { autoPlan = true } = options;

    // Add user message
    this.messages.push({ role: 'user', content: userInput });

    // Optional: Auto-planning mode
    if (autoPlan && this._needsPlanning(userInput)) {
      await this._generatePlan(userInput);
    }

    // Main interaction loop
    const response = await chatCompletion(this.config, this.messages, this.tools);
    const choice = response.choices[0];

    if (choice.message.tool_calls) {
      return await this._executeToolChain(choice.message);
    } else {
      const content = choice.message.content || '';
      this.messages.push({ role: 'assistant', content });
      return content;
    }
  }

  // Determine if a task needs multi-step planning
  _needsPlanning(input) {
    const planningKeywords = [
      'create', 'build', 'setup', 'implement', 'refactor', 'add', 'fix',
      '开发', '创建', '构建', '实现', '重构', '添加', '修复',
      'multiple', 'several', 'all files', 'project', 'app'
    ];
    const lower = input.toLowerCase();
    return planningKeywords.some(kw => lower.includes(kw.toLowerCase()));
  }

  // Generate an execution plan before acting
  async _generatePlan(userInput) {
    const planPrompt = `Before executing, create a brief plan for this task. Respond with a numbered list of steps (max 5 steps). Keep it concise. Task: ${userInput}`;
    const planMessages = [
      { role: 'system', content: 'You are a planning assistant. Create concise step-by-step plans.' },
      { role: 'user', content: planPrompt }
    ];

    try {
      const planResponse = await chatCompletion(this.config, planMessages, null);
      const plan = planResponse.choices[0].message.content || '';
      if (plan.trim()) {
        console.log(chalk.blue('\n  [Plan]'));
        for (const line of plan.split('\n').filter(l => l.trim())) {
          console.log(chalk.blue(`    ${line}`));
        }
        console.log('');
      }
    } catch (e) {
      // Silently skip planning on error
    }
  }

  // Execute a chain of tool calls with follow-ups
  async _executeToolChain(initialMessage) {
    // Add assistant message with tool_calls
    this.messages.push({
      role: 'assistant',
      content: initialMessage.content || '',
      tool_calls: initialMessage.tool_calls
    });

    let iteration = 0;

    while (iteration < this.maxToolIterations) {
      iteration++;

      // Execute all tool calls in current message
      const toolResults = [];
      const currentCalls = this.messages[this.messages.length - 1].tool_calls || [];

      if (currentCalls.length === 0) break;

      for (const call of currentCalls) {
        const name = call.function.name;
        let args;
        try {
          args = JSON.parse(call.function.arguments);
        } catch (e) {
          args = {};
        }

        console.log(formatToolCall(name, args));
        const result = await executeTool(name, args);
        console.log(formatToolResult(result));

        toolResults.push({
          tool_call_id: call.id,
          role: 'tool',
          content: JSON.stringify(result)
        });
      }

      // Add tool results to conversation
      this.messages.push(...toolResults);

      // Get follow-up from LLM
      const followUp = await chatCompletion(this.config, this.messages, this.tools);
      const followChoice = followUp.choices[0];

      // Add assistant follow-up message
      this.messages.push({
        role: 'assistant',
        content: followChoice.message.content || '',
        tool_calls: followChoice.message.tool_calls || undefined
      });

      // If no more tool calls, we're done
      if (!followChoice.message.tool_calls || followChoice.message.tool_calls.length === 0) {
        return followChoice.message.content || '';
      }

      // Otherwise, continue the loop for more tool calls
    }

    if (iteration >= this.maxToolIterations) {
      return chalk.yellow('(Reached maximum tool execution iterations. The task may be incomplete.)');
    }

    return '';
  }

  // ========== Streaming Response (simulated) ==========
  async sendStream(userInput, onChunk) {
    // For now, fall back to non-streaming but chunk the response
    const response = await this.send(userInput);
    // Simulate streaming by yielding words
    const words = response.split(/(\s+)/);
    let result = '';
    for (const word of words) {
      result += word;
      if (onChunk) onChunk(word);
    }
    return result;
  }

  clear() {
    this.messages = [
      { role: 'system', content: this.config.systemPrompt }
    ];
    this.fileIndex.clear();
  }

  getStats() {
    return {
      messages: this.messages.length,
      indexedFiles: this.fileIndex.size
    };
  }
}

module.exports = { Agent };
