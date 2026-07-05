const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { loadConfig } = require('./config');
const { Agent } = require('./agent');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ASSETS_DIR = path.join(__dirname, '..', 'assets');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// In-memory session storage for web mode
const sessions = new Map();

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    const config = loadConfig();
    sessions.set(sessionId, new Agent(config));
  }
  return sessions.get(sessionId);
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

function createServer(port) {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://localhost:${port}`);
    const pathname = parsedUrl.pathname;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // API endpoint
    if (pathname === '/api/chat' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const { message } = JSON.parse(body);
          const sessionId = req.headers['x-session-id'] || 'default';
          const agent = getSession(sessionId);

          const reply = await agent.send(message, { autoPlan: true });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ reply }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // Static files
    let filePath;
    if (pathname.startsWith('/assets/')) {
      filePath = path.join(ASSETS_DIR, pathname.slice('/assets/'.length));
    } else {
      const cleanPath = pathname === '/' ? '/cover.html' : pathname;
      filePath = path.join(PUBLIC_DIR, cleanPath);
    }

    // Security: prevent directory traversal
    const resolved = path.resolve(filePath);
    const publicResolved = path.resolve(PUBLIC_DIR);
    const assetsResolved = path.resolve(ASSETS_DIR);

    if (!resolved.startsWith(publicResolved) && !resolved.startsWith(assetsResolved)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    serveFile(res, filePath);
  });

  return server;
}

function startServer(port = 0) {
  return new Promise((resolve, reject) => {
    const server = createServer(port);
    server.listen(port, () => {
      const actualPort = server.address().port;
      resolve({ server, port: actualPort });
    });
    server.on('error', reject);
  });
}

module.exports = { startServer };
