const readline = require('readline');
const chalk = require('chalk');
const { loadConfig, setupConfig } = require('./config');
const { Agent } = require('./agent');

function printBanner() {
  console.log(chalk.cyan(`
   __  ____________  _____ _   _ ________   __
  |  \/  |  _  |  \/  |  _ | | | |  _  \ \ / /
  | .  . | | | | .  . | | | | |_| | | | |\ V / 
  | |\/| | | | | |\/| | | | |  _  | | | | \ /  
  | |  | \ \_/ | |  | | |/ /| | | | |/ /  | |  
  \_|  |_/\___/\_|  |_/___/ \_| |_/___/   \_/  
  `));
  console.log(chalk.bold('  影子kwh v1.0.0 ') + chalk.gray('- AI Coding Agent'));
  console.log(chalk.gray('  Enhanced with diff, git, syntax highlight, and autonomous planning'));
  console.log(chalk.gray('  Type /help for commands, /exit to quit\n'));
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--setup') || args.includes('-s')) {
    await setupConfig();
    return;
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log('影子kwh v1.0.0');
    return;
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
${chalk.bold('Usage:')} yingzi-kwh [options]

${chalk.bold('Options:')}
  -s, --setup    Run initial setup (API key, provider)
  -v, --version  Show version
  -h, --help     Show help

${chalk.bold('Commands in REPL:')}
  /help          Show available commands
  /clear         Clear conversation history
  /pwd           Show current directory
  /index         Build code index for current project
  /search <q>    Search indexed code
  /stats         Show agent statistics
  /plan          Toggle auto-planning mode
  /exit, /quit   Exit 影子kwh
`);
    return;
  }

  let config = loadConfig();

  if (!config.apiKey) {
    console.log(chalk.yellow("Welcome! Let's set up 影子kwh first."));
    config = await setupConfig();
  }

  printBanner();

  const agent = new Agent(config);
  let autoPlan = true;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('\n影子kwh ') + chalk.gray('> ')
  });

  rl.prompt();

  rl.on('line', async (input) => {
    const line = input.trim();

    if (!line) {
      rl.prompt();
      return;
    }

    if (line.startsWith('/')) {
      const parts = line.slice(1).split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const rest = parts.slice(1).join(' ');

      switch (cmd) {
        case 'help':
          console.log(`
${chalk.bold('Available commands:')}
  /help              Show this help
  /clear             Clear conversation history
  /pwd               Show current working directory
  /index             Build code index for current project
  /search <query>    Search indexed code with keywords
  /stats             Show agent statistics
  /plan              Toggle auto-planning mode (currently: ${autoPlan ? 'ON' : 'OFF'})
  /exit, /quit       Exit 影子kwh
`);
          break;
        case 'clear':
          agent.clear();
          console.log(chalk.green('Conversation cleared.'));
          break;
        case 'pwd':
          console.log(process.cwd());
          break;
        case 'index':
          process.stdout.write(chalk.gray('Indexing project files...'));
          try {
            const stats = await agent.buildIndex('.');
            process.stdout.write('\r                          \r');
            console.log(chalk.green(`Indexed ${stats.indexed} / ${stats.files} files.`));
          } catch (e) {
            process.stdout.write('\r                          \r');
            console.log(chalk.red('Indexing failed:'), e.message);
          }
          break;
        case 'search':
          if (!rest) {
            console.log(chalk.yellow('Usage: /search <query>'));
          } else {
            const results = agent.searchIndex(rest);
            if (results.length === 0) {
              console.log(chalk.gray('No results found.'));
            } else {
              console.log(chalk.bold(`\nFound ${results.length} results:`));
              for (const r of results) {
                console.log(`  ${chalk.cyan(r.file)} ${chalk.gray(`(${r.lines} lines, score: ${r.score})`)}`);
              }
            }
          }
          break;
        case 'stats':
          const stats = agent.getStats();
          console.log(`
${chalk.bold('Agent Statistics:')}
  Messages:     ${stats.messages}
  Indexed files: ${stats.indexedFiles}
  Auto-plan:    ${autoPlan ? 'ON' : 'OFF'}
`);
          break;
        case 'plan':
          autoPlan = !autoPlan;
          console.log(chalk.green(`Auto-planning is now ${autoPlan ? 'ON' : 'OFF'}.`));
          break;
        case 'exit':
        case 'quit':
          console.log(chalk.cyan('\nGoodbye! See you next time.\n'));
          rl.close();
          return;
        default:
          console.log(chalk.yellow(`Unknown command: /${cmd}. Type /help for available commands.`));
      }
      rl.prompt();
      return;
    }

    try {
      process.stdout.write(chalk.gray('\nThinking...'));
      const startTime = Date.now();
      const reply = await agent.send(line, { autoPlan });
      const elapsed = Date.now() - startTime;
      process.stdout.write('\r              \r');
      console.log('\n' + reply);
      console.log(chalk.gray(`  (${elapsed}ms)`));
    } catch (err) {
      process.stdout.write('\r              \r');
      console.error(chalk.red('\nError:'), err.message);
      if (err.message.includes('401')) {
        console.log(chalk.yellow('Tip: Your API key may be invalid. Run "yingzi-kwh --setup" to reconfigure.'));
      }
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log(chalk.cyan('\nGoodbye! See you next time.\n'));
    process.exit(0);
  });
}

module.exports = { main };
