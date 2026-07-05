#!/usr/bin/env node

const path = require('path');
const { main } = require(path.join(__dirname, '..', 'src', 'launcher.js'));

main().catch(err => {
  console.error('影子kwh encountered an error:', err.message);
  process.exit(1);
});
