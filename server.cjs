const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.woff2':'font/woff2','.otf':'font/otf','.png':'image/png','.ico':'image/x-icon','.webp':'image/webp'};
http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  if (pathname === '/' || pathname === '/consoulium') pathname = '/consoulium.html';
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) || pathname.startsWith('/.')) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, body) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream'}).end(body);
  });
}).listen(8080, '127.0.0.1', () => console.log('Demo: http://localhost:8080/consoulium'));
