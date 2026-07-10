/**
 * OmniStream — Node.js Production Server
 * ---------------------------------------
 * Serves the built player (dist/) + protected-stream proxy in one process.
 *
 * Usage:
 *   node server.js
 *
 * Env vars:
 *   PORT              — Listen port (default: 3000)
 *   PROXY_ORIGIN      — CORS allowed origin (default: '*')
 *   PROXY_SELF_ORIGIN — Public URL for manifest rewriting (auto-detected)
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const PORT = parseInt(process.env.PORT || '3000', 10);
const ALLOW_ORIGIN = process.env.PROXY_ORIGIN || '*';
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.mpd': 'application/dash+xml',
  '.ts': 'video/mp2t',
  '.m4s': 'video/iso.segment',
  '.mp4': 'video/mp4',
  '.key': 'application/octet-stream',
  '.map': 'application/json',
};

/* ------------------------------------------------------------------ */
/*  Proxy helpers (from proxy/server.js)                               */
/* ------------------------------------------------------------------ */

function selfOrigin(req) {
  if (process.env.PROXY_SELF_ORIGIN) return process.env.PROXY_SELF_ORIGIN;
  const host = req.headers.host || `localhost:${PORT}`;
  const proto = req.headers['x-forwarded-proto'] || 'http';
  return `${proto}://${host}`;
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type, Date');
  res.setHeader('Vary', 'Origin');
}

function toProxyUrl(absUrl, origin) {
  return `${origin}/proxy?url=${encodeURIComponent(absUrl)}`;
}

function rewriteHls(baseUrl, body, origin) {
  return body
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith('#')) {
        return line.replace(/URI="([^"]+)"/g, (_m, u) => {
          const abs = new URL(u, baseUrl).toString();
          return `URI="${toProxyUrl(abs, origin)}"`;
        });
      }
      try {
        const abs = new URL(trimmed, baseUrl).toString();
        return toProxyUrl(abs, origin);
      } catch {
        return line;
      }
    })
    .join('\n');
}

function rewriteDash(baseUrl, body, origin) {
  return body.replace(/<BaseURL>([^<]*)<\/BaseURL>/g, (_m, u) => {
    const abs = new URL(u, baseUrl).toString();
    return `<BaseURL>${toProxyUrl(abs, origin)}</BaseURL>`;
  });
}

function isHls(url, ct) {
  return /m3u8/i.test(url.pathname) || /mpegurl|application\/vnd\.apple\.mpegurl/i.test(ct);
}

function isDash(url, ct) {
  return /\.mpd(\?|$)/i.test(url.pathname) || /dash/i.test(ct);
}

function handleProxy(req, res, origin) {
  setCors(res);

  if (req.method === 'OPTIONS' || req.method === 'HEAD') {
    res.writeHead(204);
    return res.end();
  }

  const parsed = new URL(req.url, origin);
  const target = parsed.searchParams.get('url');
  if (!target) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('OmniStream proxy: provide ?url=');
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('Invalid URL');
  }

  if (!/^https?:$/.test(targetUrl.protocol)) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('Only http/https allowed');
  }

  const upstreamHeaders = {
    'User-Agent':
      req.headers['x-user-agent'] ||
      'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
    Accept: req.headers['accept'] || '*/*',
  };
  if (req.headers['x-cookie']) upstreamHeaders['Cookie'] = req.headers['x-cookie'];
  if (req.headers['x-referer']) upstreamHeaders['Referer'] = req.headers['x-referer'];
  if (req.headers['range']) upstreamHeaders['Range'] = req.headers['range'];

  const lib = targetUrl.protocol === 'https:' ? https : http;

  const upstream = lib.request(
    targetUrl,
    { method: 'GET', headers: upstreamHeaders },
    (upRes) => {
      const status = upRes.statusCode || 200;
      const contentType = upRes.headers['content-type'] || '';

      if (status >= 300 && status < 400 && upRes.headers.location) {
        const next = new URL(upRes.headers.location, targetUrl).toString();
        res.writeHead(status, { Location: toProxyUrl(next, origin) });
        return res.end();
      }

      if (isHls(targetUrl, contentType)) {
        const chunks = [];
        upRes.on('data', (c) => chunks.push(c));
        upRes.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          res.writeHead(status, {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Cache-Control': 'no-cache',
          });
          res.end(rewriteHls(targetUrl.toString(), body, origin));
        });
        upRes.on('error', () => {
          if (!res.headersSent) {
            res.writeHead(502);
            res.end('upstream error');
          }
        });
        return;
      }

      if (isDash(targetUrl, contentType)) {
        const chunks = [];
        upRes.on('data', (c) => chunks.push(c));
        upRes.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          res.writeHead(status, {
            'Content-Type': 'application/dash+xml',
            'Cache-Control': 'no-cache',
          });
          res.end(rewriteDash(targetUrl.toString(), body, origin));
        });
        return;
      }

      const respHeaders = { 'Content-Type': contentType };
      if (upRes.headers['content-length']) respHeaders['Content-Length'] = upRes.headers['content-length'];
      if (upRes.headers['content-range']) respHeaders['Content-Range'] = upRes.headers['content-range'];
      if (upRes.headers['accept-ranges']) respHeaders['Accept-Ranges'] = upRes.headers['accept-ranges'];
      res.writeHead(status, respHeaders);
      upRes.pipe(res);
    },
  );

  upstream.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Proxy error: ' + err.message);
    }
  });

  upstream.end();
}

/* ------------------------------------------------------------------ */
/*  Static file server                                                 */
/* ------------------------------------------------------------------ */

function serveStatic(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let filePath = path.join(DIST_DIR, decodeURIComponent(url.pathname));

  // Directory → index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // Missing → try without extension (SPA fallback), then index.html
  if (!fs.existsSync(filePath)) {
    const tryIndex = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(tryIndex)) {
      filePath = tryIndex;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stat.size,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });

  fs.createReadStream(filePath).pipe(res);
}

/* ------------------------------------------------------------------ */
/*  Server                                                             */
/* ------------------------------------------------------------------ */

const server = http.createServer((req, res) => {
  // Proxy endpoint
  if (req.url.startsWith('/proxy')) {
    return handleProxy(req, res, selfOrigin(req));
  }

  // Everything else → static files from dist/
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`\n  OmniStream running at http://localhost:${PORT}\n`);
  console.log(`  Proxy endpoint:       http://localhost:${PORT}/proxy`);
  console.log(`  Player:               http://localhost:${PORT}/\n`);
});
