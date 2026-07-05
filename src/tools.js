const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const Diff = require('diff');
const simpleGit = require('simple-git');

// ========== Syntax Highlighting ==========
const KEYWORDS = {
  js: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'from', 'export', 'default', 'async', 'await', 'try', 'catch', 'new', 'this', 'true', 'false', 'null', 'undefined'],
  py: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'import', 'from', 'as', 'try', 'except', 'with', 'lambda', 'None', 'True', 'False', 'pass', 'break', 'continue'],
  java: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'return', 'if', 'else', 'for', 'while', 'new', 'static', 'void', 'import', 'package', 'try', 'catch', 'finally'],
  cpp: ['int', 'float', 'double', 'char', 'void', 'class', 'struct', 'public', 'private', 'protected', 'return', 'if', 'else', 'for', 'while', 'new', 'delete', 'const', 'static', 'include', 'namespace'],
  go: ['package', 'import', 'func', 'return', 'if', 'else', 'for', 'range', 'struct', 'interface', 'type', 'var', 'const', 'defer', 'go', 'chan', 'select', 'map'],
  rs: ['fn', 'let', 'mut', 'const', 'static', 'if', 'else', 'match', 'for', 'while', 'loop', 'return', 'struct', 'enum', 'impl', 'trait', 'use', 'mod', 'pub', 'crate'],
  ts: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'interface', 'import', 'from', 'export', 'default', 'async', 'await', 'type', 'enum', 'namespace'],
  sh: ['if', 'then', 'else', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac', 'function', 'return', 'exit', 'echo', 'export', 'source'],
  html: ['div', 'span', 'p', 'a', 'img', 'script', 'style', 'link', 'meta', 'head', 'body', 'html', 'title', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'form', 'input', 'button'],
  css: ['color', 'background', 'margin', 'padding', 'border', 'display', 'position', 'width', 'height', 'font', 'text', 'align', 'flex', 'grid', 'overflow', 'z-index', 'opacity', 'transform', 'transition']
};

const TYPES = ['string', 'number', 'boolean', 'array', 'object', 'any', 'void', 'null', 'undefined', 'Promise', 'Map', 'Set', 'Date', 'Error', 'RegExp', 'Buffer'];

function detectLang(filePath, code) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.js': 'js', '.mjs': 'js', '.cjs': 'js',
    '.ts': 'ts', '.tsx': 'ts',
    '.py': 'py', '.pyw': 'py',
    '.java': 'java',
    '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp', '.hpp': 'cpp', '.h': 'cpp',
    '.c': 'cpp',
    '.go': 'go',
    '.rs': 'rs',
    '.sh': 'sh', '.bash': 'sh', '.zsh': 'sh',
    '.html': 'html', '.htm': 'html', '.vue': 'html', '.jsx': 'html', '.tsx': 'html',
    '.css': 'css', '.scss': 'css', '.sass': 'css', '.less': 'css',
    '.json': 'js', '.md': 'sh', '.yaml': 'sh', '.yml': 'sh'
  };
  return map[ext] || 'js';
}

function highlightCode(code, filePath) {
  const lang = detectLang(filePath || 'code.js', code);
  const keywords = KEYWORDS[lang] || KEYWORDS.js;
  const lines = code.split('\n');
  return lines.map(line => {
    // Strings
    let colored = line
      .replace(/("(?:[^"\\]|\\.)*")/g, chalk.green('$1'))
      .replace(/('(?:[^'\\]|\\.)*')/g, chalk.green('$1'))
      .replace(/(`(?:[^`\\]|\\.)*`)/g, chalk.green('$1'));
    // Comments
    colored = colored.replace(/(\/\/.*$)/gm, chalk.gray('$1'));
    colored = colored.replace(/(\/\*[\s\S]*?\*\/)/g, chalk.gray('$1'));
    // Keywords
    for (const kw of keywords) {
      const re = new RegExp(`\\b(${kw})\\b`, 'g');
      colored = colored.replace(re, chalk.magenta('$1'));
    }
    // Types
    for (const t of TYPES) {
      const re = new RegExp(`\\b(${t})\\b`, 'g');
      colored = colored.replace(re, chalk.cyan('$1'));
    }
    // Numbers
    colored = colored.replace(/\b(\d+(?:\.\d+)?)\b/g, chalk.yellow('$1'));
    return colored;
  }).join('\n');
}

// ========== Diff Display ==========
function showFileDiff(filePath, newContent) {
  const resolved = path.resolve(filePath);
  let oldContent = '';
  let oldExists = false;
  if (fs.existsSync(resolved)) {
    oldContent = fs.readFileSync(resolved, 'utf8');
    oldExists = true;
  }

  if (oldContent === newContent) {
    return chalk.gray('  (no changes)');
  }

  const diffResult = Diff.diffLines(oldContent, newContent);
  let output = '\n' + chalk.bold(`  Diff for ${filePath}:`) + '\n';
  output += chalk.gray(`  ${'─'.repeat(60)}`) + '\n';

  for (const part of diffResult) {
    const lines = part.value.split('\n');
    // Remove trailing empty line from split
    if (lines[lines.length - 1] === '') lines.pop();
    for (const line of lines) {
      if (part.added) {
        output += chalk.green(`  + ${line}`) + '\n';
      } else if (part.removed) {
        output += chalk.red(`  - ${line}`) + '\n';
      } else {
        // Context line, show first 60 chars
        const truncated = line.length > 60 ? line.slice(0, 57) + '...' : line;
        output += chalk.gray(`    ${truncated}`) + '\n';
      }
    }
  }
  output += chalk.gray(`  ${'─'.repeat(60)}`);
  return output;
}

// ========== Tool Definitions ==========
const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file at the given path. Use relative paths from the current working directory.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative or absolute path to the file' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write content to a file at the given path. Creates the file if it does not exist. Overwrites if it does. Shows a diff preview before overwriting.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative or absolute path to the file' },
          content: { type: 'string', description: 'The content to write' }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_dir',
      description: 'List files and directories at the given path. Defaults to current directory.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path. Defaults to "."' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Execute a shell command and return its stdout and stderr. Use with caution.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The shell command to execute' },
          cwd: { type: 'string', description: 'Working directory for the command. Defaults to current directory.' }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_files',
      description: 'Search for files matching a pattern in the given directory.',
      parameters: {
        type: 'object',
        properties: {
          directory: { type: 'string', description: 'Directory to search in' },
          pattern: { type: 'string', description: 'Filename pattern, supports wildcards like *.js' }
        },
        required: ['directory', 'pattern']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_status',
      description: 'Get the git status of the repository (modified, staged, untracked files).',
      parameters: {
        type: 'object',
        properties: {
          cwd: { type: 'string', description: 'Repository path. Defaults to current directory.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_diff',
      description: 'Show git diff for staged or unstaged changes.',
      parameters: {
        type: 'object',
        properties: {
          cwd: { type: 'string', description: 'Repository path. Defaults to current directory.' },
          staged: { type: 'boolean', description: 'Show staged changes. Defaults to false (unstaged).' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_log',
      description: 'Show recent git commit history.',
      parameters: {
        type: 'object',
        properties: {
          cwd: { type: 'string', description: 'Repository path. Defaults to current directory.' },
          count: { type: 'number', description: 'Number of commits to show. Defaults to 5.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_branch',
      description: 'List git branches or switch/create branch.',
      parameters: {
        type: 'object',
        properties: {
          cwd: { type: 'string', description: 'Repository path. Defaults to current directory.' },
          action: { type: 'string', description: '"list" (default), "create", or "switch"' },
          name: { type: 'string', description: 'Branch name for create/switch actions' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_commit',
      description: 'Stage all changes and commit with a message.',
      parameters: {
        type: 'object',
        properties: {
          cwd: { type: 'string', description: 'Repository path. Defaults to current directory.' },
          message: { type: 'string', description: 'Commit message' }
        },
        required: ['message']
      }
    }
  }
];

// ========== Tool Implementations ==========
function readFile(filePath) {
  try {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) return { error: `File not found: ${filePath}` };
    const content = fs.readFileSync(resolved, 'utf8');
    // Return highlighted preview for display
    const preview = highlightCode(content, filePath);
    return { content, preview };
  } catch (e) {
    return { error: e.message };
  }
}

function writeFile(filePath, content) {
  try {
    const resolved = path.resolve(filePath);
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Show diff before writing
    const diffPreview = showFileDiff(filePath, content);
    console.log(diffPreview);

    fs.writeFileSync(resolved, content, 'utf8');
    return { success: true, path: filePath };
  } catch (e) {
    return { error: e.message };
  }
}

function listDir(dirPath = '.') {
  try {
    const resolved = path.resolve(dirPath);
    if (!fs.existsSync(resolved)) return { error: `Directory not found: ${dirPath}` };
    const items = fs.readdirSync(resolved, { withFileTypes: true });
    return {
      entries: items.map(i => ({
        name: i.name,
        type: i.isDirectory() ? 'directory' : 'file'
      }))
    };
  } catch (e) {
    return { error: e.message };
  }
}

function runCommand(command, cwd) {
  try {
    const options = {
      encoding: 'utf8',
      timeout: 30000,
      cwd: cwd || process.cwd()
    };
    const result = execSync(command, options);
    return { stdout: result, stderr: '' };
  } catch (e) {
    return {
      stdout: e.stdout || '',
      stderr: e.stderr || e.message,
      exitCode: e.status || 1
    };
  }
}

function searchFiles(directory, pattern) {
  try {
    const resolved = path.resolve(directory);
    if (!fs.existsSync(resolved)) return { error: `Directory not found: ${directory}` };
    const regex = new RegExp(pattern.replace(/\./g, '\\.').replace(/\*/g, '.*'));
    const results = [];

    function walk(dir) {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory() && item.name !== 'node_modules' && !item.name.startsWith('.')) {
          walk(fullPath);
        } else if (item.isFile() && regex.test(item.name)) {
          results.push(path.relative(process.cwd(), fullPath));
        }
      }
    }

    walk(resolved);
    return { files: results };
  } catch (e) {
    return { error: e.message };
  }
}

// ========== Git Tools ==========
async function gitStatus(cwd) {
  try {
    const git = simpleGit(cwd || process.cwd());
    const status = await git.status();
    return {
      branch: status.current,
      ahead: status.ahead,
      behind: status.behind,
      staged: status.staged,
      modified: status.modified,
      untracked: status.not_added,
      conflicted: status.conflicted
    };
  } catch (e) {
    return { error: e.message };
  }
}

async function gitDiff(cwd, staged = false) {
  try {
    const git = simpleGit(cwd || process.cwd());
    const diff = staged ? await git.diff(['--staged']) : await git.diff();
    return { diff };
  } catch (e) {
    return { error: e.message };
  }
}

async function gitLog(cwd, count = 5) {
  try {
    const git = simpleGit(cwd || process.cwd());
    const log = await git.log({ n: count });
    return {
      commits: log.all.map(c => ({
        hash: c.hash.substring(0, 7),
        message: c.message,
        author: c.author_name,
        date: c.date
      }))
    };
  } catch (e) {
    return { error: e.message };
  }
}

async function gitBranch(cwd, action = 'list', name) {
  try {
    const git = simpleGit(cwd || process.cwd());
    if (action === 'list') {
      const branches = await git.branch();
      return {
        current: branches.current,
        branches: branches.all
      };
    } else if (action === 'create') {
      await git.checkoutLocalBranch(name);
      return { success: true, created: name };
    } else if (action === 'switch') {
      await git.checkout(name);
      return { success: true, switched: name };
    }
    return { error: `Unknown action: ${action}` };
  } catch (e) {
    return { error: e.message };
  }
}

async function gitCommit(cwd, message) {
  try {
    const git = simpleGit(cwd || process.cwd());
    await git.add('.');
    const result = await git.commit(message);
    return {
      success: true,
      commit: result.commit,
      message
    };
  } catch (e) {
    return { error: e.message };
  }
}

// ========== Tool Executor ==========
async function executeTool(name, args) {
  switch (name) {
    case 'read_file': return readFile(args.path);
    case 'write_file': return writeFile(args.path, args.content);
    case 'list_dir': return listDir(args.path);
    case 'run_command': return runCommand(args.command, args.cwd);
    case 'search_files': return searchFiles(args.directory, args.pattern);
    case 'git_status': return gitStatus(args.cwd);
    case 'git_diff': return gitDiff(args.cwd, args.staged);
    case 'git_log': return gitLog(args.cwd, args.count);
    case 'git_branch': return gitBranch(args.cwd, args.action, args.name);
    case 'git_commit': return gitCommit(args.cwd, args.message);
    default: return { error: `Unknown tool: ${name}` };
  }
}

// ========== Colored Output Helpers ==========
function formatToolCall(name, args) {
  const argStr = JSON.stringify(args).slice(0, 120);
  return chalk.cyan(`  [Tool] ${name}`) + chalk.gray(` ${argStr}`);
}

function formatToolResult(result) {
  if (result.error) {
    return chalk.red(`  [Error] ${result.error}`);
  }
  if (result.success) {
    return chalk.green(`  [OK] ${JSON.stringify(result).slice(0, 100)}`);
  }
  return chalk.gray(`  [Result] ${JSON.stringify(result).slice(0, 100)}`);
}

module.exports = {
  TOOL_DEFINITIONS,
  executeTool,
  readFile,
  writeFile,
  listDir,
  runCommand,
  searchFiles,
  gitStatus,
  gitDiff,
  gitLog,
  gitBranch,
  gitCommit,
  highlightCode,
  showFileDiff,
  formatToolCall,
  formatToolResult
};
