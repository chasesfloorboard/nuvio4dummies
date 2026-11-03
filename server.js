const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, 'public');

http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);

  // Short address for typing into Downloader on a Fire TV: sends the latest
  // official Nuvio TV release (32-bit build, runs on every Fire TV device).
  // Short download links to the latest official Nuvio releases on GitHub.
  //   /tv       Nuvio TV, 32-bit build: runs on every Fire TV and Android TV.
  //   /android  Nuvio for phones, 64-bit build: every Android phone since ~2017.
  const downloads = {
    '/tv': 'https://github.com/NuvioMedia/NuvioTV/releases/latest/download/app-full-armeabi-v7a-release.apk',
    '/android': 'https://github.com/NuvioMedia/NuvioMobile/releases/latest/download/androidApp-full-arm64-v8a-release.apk'
  };
  const download = downloads[pathname.replace(/\/+$/, '').toLowerCase()];
  if (download) {
    res.writeHead(302, { Location: download, 'Cache-Control': 'no-cache' });
    return res.end();
  }
  const file = path.join(root, pathname === '/' ? 'index.html' : pathname);

  if (!file.startsWith(root + path.sep) && file !== path.join(root, 'index.html')) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }

    const ext = path.extname(file);
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.svg': 'image/svg+xml',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png'
    };

    res.writeHead(200, {
      'Content-Type': types[ext] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache',
      // Nuvio TV's "Manage from phone" page fetches the collections link from
      // the phone's browser, which needs permission to read it cross-site.
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
}).listen(process.env.PORT || 8080, '0.0.0.0');
