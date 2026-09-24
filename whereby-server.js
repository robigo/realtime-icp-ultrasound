/* Local-only Whereby pilot. Never deploy publicly without real server-side authentication. */
'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const port = Number(process.env.ECHOPULSE_PORT || 8080);
const host = '127.0.0.1';
const origin = `http://${host}:${port}`;
const key = process.env.WHEREBY_API_KEY;
const allowed = new Set(['whereby.html', 'whereby.js', 'whereby.css', 'styles.css', 'vision.css', 'session.css', 'index.html', 'app.js', 'data.js', 'vision.html', 'vision.js', 'vision-camera.js', 'research.html', 'research.js', 'research.css', 'session.html', 'session.js']);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

function reply(res, status, data, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
  res.end(type.startsWith('application/json') ? JSON.stringify(data) : data);
}
function validWherebyUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.whereby.com') && !parsed.username && !parsed.password;
  } catch (_) { return false; }
}

const server = http.createServer(async (req, res) => {
  if (req.headers.host !== `${host}:${port}`) return reply(res, 403, { error: 'כתובת מקומית בלבד.' });
  if (req.method === 'POST' && req.url === '/api/meetings') {
    if (req.headers.origin !== origin || req.headers['content-type']?.split(';')[0] !== 'application/json') return reply(res, 403, { error: 'בקשה לא מורשית.' });
    if (!key) return reply(res, 503, { error: 'חסר WHEREBY_API_KEY בשרת המקומי.' });
    try {
      const response = await fetch('https://api.whereby.dev/v1/meetings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ endDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), fields: ['hostRoomUrl'], isLocked: true, roomNamePattern: 'uuid', roomPreferences: { streaming: false, roomIntegrations: false } }),
        signal: AbortSignal.timeout(12000)
      });
      if (!response.ok) return reply(res, 502, { error: `Whereby דחה את יצירת החדר (${response.status}). בדוק את המפתח ואת המסלול.` });
      const room = await response.json();
      if (!validWherebyUrl(room.roomUrl) || !validWherebyUrl(room.hostRoomUrl)) throw new Error('Invalid provider response');
      return reply(res, 201, { callId: `CALL-${crypto.randomBytes(10).toString('hex').toUpperCase()}`, roomUrl: room.roomUrl, hostRoomUrl: room.hostRoomUrl });
    } catch (_) { return reply(res, 502, { error: 'לא ניתן ליצור חדר. בדוק את החיבור ל־Whereby.' }); }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return reply(res, 405, { error: 'Method not allowed' });
  const name = (req.url === '/' ? 'whereby.html' : req.url.slice(1).split('?')[0]);
  if (!allowed.has(name)) return reply(res, 404, { error: 'Not found' });
  try {
    const content = await fs.readFile(path.join(__dirname, name));
    res.writeHead(200, { 'Content-Type': types[path.extname(name)], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (_) { reply(res, 404, { error: 'Not found' }); }
});
server.listen(port, host, () => process.stdout.write(`EchoPulse pilot: ${origin}/whereby.html\n`));
