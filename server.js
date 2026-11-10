const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, 'public');

// Nuvio Desktop's file names include the version, so there's no fixed
// "latest" download link. Look the files up on GitHub (cached for an hour)
// and fall back to the releases page if that fails.
const DESKTOP_RELEASES = 'https://github.com/NuvioMedia/NuvioDesktop/releases/latest';
const desktopFiles = {
  '/pc': /^Nuvio-Windows-x64-.*\.msi$/,
  '/windows': /^Nuvio-Windows-x64-.*\.msi$/,
  '/mac': /^Nuvio-macOS-arm64-.*\.dmg$/,
  '/mac-intel': /^Nuvio-macOS-x86_64-.*\.dmg$/
};
let desktopAssets = null, desktopAssetsAt = 0;
async function desktopDownload(route) {
  if (!desktopAssets || Date.now() - desktopAssetsAt > 60 * 60 * 1000) {
    try {
      const r = await fetch('https://api.github.com/repos/NuvioMedia/NuvioDesktop/releases/latest', {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'nuvio4dummies' },
        signal: AbortSignal.timeout(5000)
      });
      if (!r.ok) throw new Error('GitHub ' + r.status);
      desktopAssets = (await r.json()).assets.map(a => ({ name: a.name, url: a.browser_download_url }));
      desktopAssetsAt = Date.now();
    } catch (e) {
      if (!desktopAssets) return DESKTOP_RELEASES;
    }
  }
  const asset = desktopAssets.find(a => desktopFiles[route].test(a.name));
  return asset ? asset.url : DESKTOP_RELEASES;
}

http.createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);

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
  const route = pathname.replace(/\/+$/, '').toLowerCase();
  if (desktopFiles[route]) {
    res.writeHead(302, { Location: await desktopDownload(route), 'Cache-Control': 'no-cache' });
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
