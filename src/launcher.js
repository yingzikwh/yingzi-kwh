const { spawn } = require('child_process');
const chalk = require('chalk');
const { loadConfig, setupConfig } = require('./config');
const { startServer } = require('./server');
const { main: cliMain } = require('./index');

function openBrowser(url) {
  const platform = process.platform;
  const cmd = platform === 'win32' ? 'start' : platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(cmd, [url], { detached: true, stdio: 'ignore' });
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
  --cli          Run in CLI mode (terminal)
  --port <n>     Web server port (default: random)
  --no-open      Don't open browser automatically

${chalk.bold('Modes:')}
  Default        Launch web interface with cover page
  --cli          Launch terminal REPL interface
`);
    return;
  }

  // CLI mode
  if (args.includes('--cli')) {
    await cliMain();
    return;
  }

  // Web mode (default)
  let config = loadConfig();
  if (!config.apiKey) {
    console.log(chalk.yellow('Welcome! Let\'s set up 影子kwh first.'));
    config = await setupConfig();
  }

  const portArg = args.find((arg, i) => arg === '--port' && args[i + 1]);
  const port = portArg ? parseInt(args[args.indexOf('--port') + 1]) : 0;
  const noOpen = args.includes('--no-open');

  console.log(chalk.magenta('\n  ___  _           _     _    _  _    _ '));
  console.log(chalk.magenta(' / _ \\| |         | |   | |  | || |  | |'));
  console.log(chalk.magenta('/ /_\ \\ | ___  ___| |_  | |  | || |__| |'));
  console.log(chalk.magenta('|  _  || |/ _ \\/ __| __| | |/\\| ||  __  |'));
  console.log(chalk.magenta('| | | || |  __/\\__ \\ |_  \\  /\\  /| |  | |'));
  console.log(chalk.magenta('\\_| |_||_|\\___||___/\\__|  \\/  \\/ |_|  |_|'));
  console.log('');

  try {
    const { port: actualPort } = await startServer(port);
    const url = `http://localhost:${actualPort}`;

    console.log(chalk.cyan('  影子kwh Web Server started!'));
    console.log(chalk.gray(`  Local:   ${url}`));
    console.log(chalk.gray(`  Cover:   ${url}/cover.html`));
    console.log(chalk.gray(`  Terminal: ${url}/terminal.html`));
    console.log('');

    if (!noOpen) {
      console.log(chalk.gray('  Opening browser...'));
      openBrowser(url + '/cover.html');
    }

    console.log(chalk.gray('  Press Ctrl+C to stop the server.\n'));
  } catch (err) {
    console.error(chalk.red('Failed to start server:'), err.message);
    process.exit(1);
  }
}

module.exports = { main };
