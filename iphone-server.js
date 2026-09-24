/* Serve the static demo to a phone on the same private Wi-Fi network.
   Does not serve API routes, create rooms, or read the Whereby API key. */
'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');

const host = process.argv[2];
const parts = host?.split('.').map(Number);
const privateAddress = net.isIP(host) === 4 && (
  parts[0] === 10 ||
  (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
  (parts[0] === 192 && parts[1] === 168)
);
if (!privateAddress) {
  process.stderr.write('Usage: node iphone-server.js <your computer private IPv4 address from ipconfig>\n');
  process.exit(1);
}
const port = 8082;
const allowed = new Set([
  'index.html', 'styles.css', 'consultation.css', 'app.js', 'data.js',
  'vision.html', 'vision.css', 'vision.js', 'vision-camera.js', 'research.html', 'research.css', 'research.js'
]);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
const server = http.createServer(async (req, res) => {
  if (req.headers.host !== `${host}:${port}` || !['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(403).end();
    return;
  }
  let name;
  try { name = new URL(req.url, `http://${host}:${port}`).pathname.slice(1) || 'index.html'; }
  catch (_) { res.writeHead(400).end(); return; }
  if (!allowed.has(name)) { res.writeHead(404).end(); return; }
  try {
    const content = await fs.readFile(path.join(__dirname, name));
    res.writeHead(200, {
      'Content-Type': `${types[path.extname(name)]}; charset=utf-8`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (_) { res.writeHead(404).end(); }
});
server.on('error', error => {
  process.stderr.write(`Unable to start phone preview on ${host}:${port}: ${error.message}\n`);
  process.exitCode = 1;
});
server.listen(port, host, () => process.stdout.write(`Phone preview: http://${host}:${port}/vision.html\n`));
