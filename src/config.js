const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.yingzi-kwh');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG = {
  provider: 'deepseek',
  model: 'deepseek-chat',
  apiKey: '',
  apiBase: 'https://api.deepseek.com',
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: `You are 影子kwh, an expert AI coding assistant operating in a terminal environment.

Your capabilities:
- Read, write, and analyze files in the current project
- Execute shell commands and interpret their output
- Provide code reviews, debugging help, and refactoring suggestions
- Answer questions about codebases, frameworks, and best practices

Guidelines:
- Always think step by step before taking actions
- When modifying files, show the exact changes you plan to make
- Use Chinese or English based on the user's language preference
- Be concise but thorough in your responses
- If a command might be destructive, ask for confirmation first
- When you don't know something, admit it clearly`
};

const PROVIDER_PRESETS = {
  deepseek: {
    apiBase: 'https://api.deepseek.com',
    model: 'deepseek-chat'
  },
  qwen: {
    apiBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-max'
  },
  openai: {
    apiBase: 'https://api.openai.com/v1',
    model: 'gpt-4o'
  }
};

function loadConfig() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return { ...DEFAULT_CONFIG, ...saved };
    } catch (e) {
      console.warn('Config file corrupted, using defaults.');
    }
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

function setupConfig() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('\n=== 影子kwh Initial Setup ===\n');
    console.log('Choose your AI provider:');
    console.log('  1. DeepSeek (recommended for China)');
    console.log('  2. Qwen (Alibaba)');
    console.log('  3. OpenAI');
    console.log('  4. Custom');

    rl.question('\nSelect (1-4): ', (choice) => {
      const config = { ...DEFAULT_CONFIG };
      const map = { '1': 'deepseek', '2': 'qwen', '3': 'openai' };

      if (map[choice]) {
        config.provider = map[choice];
        Object.assign(config, PROVIDER_PRESETS[config.provider]);
      } else {
        config.provider = 'custom';
      }

      rl.question('Enter your API key: ', (key) => {
        config.apiKey = key.trim();

        if (choice === '4') {
          rl.question('Enter API base URL: ', (url) => {
            config.apiBase = url.trim();
            rl.question('Enter model name: ', (model) => {
              config.model = model.trim();
              saveConfig(config);
              rl.close();
              console.log('\nSetup complete! Run "yingzi-kwh" to start.\n');
              resolve(config);
            });
          });
        } else {
          saveConfig(config);
          rl.close();
          console.log(`\nSetup complete! Provider: ${config.provider}, Model: ${config.model}`);
          console.log('Run "yingzi-kwh" to start.\n');
          resolve(config);
        }
      });
    });
  });
}

module.exports = {
  loadConfig,
  saveConfig,
  setupConfig,
  CONFIG_DIR,
  PROVIDER_PRESETS
};
