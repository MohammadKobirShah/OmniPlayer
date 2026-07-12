const http = require('http');
const fs = require('fs');
const path = require('path');
const distPath = path.join('C:\\Users\\Kobir Shah\\Downloads\\optimize-omniplayer-repository (2)\\dist');
const mimeTypes = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.join(distPath, url === '/' ? 'index.html' : url);
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, content) => {
    if (err) {
      fs.readFile(path.join(distPath, 'index.html'), (e, c) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(c);
      });
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});
server.listen(8080, () => console.log('Server running on http://localhost:8080'));
