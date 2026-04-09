// ═══════════════════════════════════════════════════════
//  DO NANTHAVATH PORTFOLIO — SERVER
//  Static file server + file upload API (no dependencies)
// ═══════════════════════════════════════════════════════

const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// ── MIME types ──────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.mov':  'video/quicktime',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
};

// ── Upload slot → file path mapping ────────────────────
const SLOTS = {
  'profile':   { dir: 'assets/images', base: 'profile',   types: ['jpg','jpeg','png','webp','avif'] },
  'project-1': { dir: 'assets/images', base: 'project-1', types: ['jpg','jpeg','png','webp'] },
  'project-2': { dir: 'assets/images', base: 'project-2', types: ['jpg','jpeg','png','webp'] },
  'project-3': { dir: 'assets/images', base: 'project-3', types: ['jpg','jpeg','png','webp'] },
  'project-4': { dir: 'assets/images', base: 'project-4', types: ['jpg','jpeg','png','webp'] },
  'project-5': { dir: 'assets/images', base: 'project-5', types: ['jpg','jpeg','png','webp'] },
  'project-6': { dir: 'assets/images', base: 'project-6', types: ['jpg','jpeg','png','webp'] },
  'showreel':  { dir: 'assets/videos', base: 'showreel',  types: ['mp4','webm','mov'] },
  'flipcard':  { dir: 'assets/videos', base: 'flipcard',  types: ['mp4','webm','mov'] },
};

// ── Find existing file for a slot ──────────────────────
function findSlotFile(slot) {
  const cfg = SLOTS[slot];
  if (!cfg) return null;
  for (const ext of cfg.types) {
    const p = path.join(ROOT, cfg.dir, `${cfg.base}.${ext}`);
    if (fs.existsSync(p)) return { ext, rel: `${cfg.dir}/${cfg.base}.${ext}` };
  }
  return null;
}

// ── Remove old files for a slot ────────────────────────
function clearSlot(slot) {
  const cfg = SLOTS[slot];
  if (!cfg) return;
  for (const ext of cfg.types) {
    const p = path.join(ROOT, cfg.dir, `${cfg.base}.${ext}`);
    try { fs.unlinkSync(p); } catch (_) {}
  }
}

// ── Send JSON ──────────────────────────────────────────
function json(res, code, data) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

// ── Video range streaming ──────────────────────────────
function streamVideo(req, res, filePath, mime) {
  const stat = fs.statSync(filePath);
  const total = stat.size;
  const rangeHeader = req.headers.range;

  if (rangeHeader) {
    const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end   = endStr ? parseInt(endStr, 10) : Math.min(start + 1024 * 1024, total - 1);
    const chunkSize = end - start + 1;
    res.writeHead(206, {
      'Content-Range':  `bytes ${start}-${end}/${total}`,
      'Accept-Ranges':  'bytes',
      'Content-Length': chunkSize,
      'Content-Type':   mime,
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': total,
      'Content-Type':   mime,
      'Accept-Ranges':  'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
  }
}

// ══════════════════════════════════════════════════════
const server = http.createServer((req, res) => {
  const parsed  = url.parse(req.url, true);
  const urlPath = parsed.pathname;
  const query   = parsed.query;
  const method  = req.method.toUpperCase();

  // ── CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,DELETE', 'Access-Control-Allow-Headers': 'Content-Type,X-Filename' });
    return res.end();
  }

  // ── GET /api/media — list all slot statuses
  if (method === 'GET' && urlPath === '/api/media') {
    const result = {};
    for (const slot of Object.keys(SLOTS)) {
      const found = findSlotFile(slot);
      result[slot] = found ? { exists: true, path: found.rel, ext: found.ext } : { exists: false };
    }
    return json(res, 200, result);
  }

  // ── POST /upload?slot=profile — stream file directly
  if (method === 'POST' && urlPath === '/upload') {
    const slot = query.slot;
    const ext  = (query.ext || '').toLowerCase().replace(/^\./, '');

    if (!SLOTS[slot]) return json(res, 400, { error: 'Invalid slot' });
    if (!SLOTS[slot].types.includes(ext)) return json(res, 400, { error: `Invalid file type .${ext} for slot ${slot}` });

    // Ensure directory exists
    fs.mkdirSync(path.join(ROOT, SLOTS[slot].dir), { recursive: true });

    // Remove old files for this slot
    clearSlot(slot);

    const savePath = path.join(ROOT, SLOTS[slot].dir, `${SLOTS[slot].base}.${ext}`);
    const writeStream = fs.createWriteStream(savePath);

    req.pipe(writeStream);

    writeStream.on('finish', () => {
      const rel = `${SLOTS[slot].dir}/${SLOTS[slot].base}.${ext}`;
      console.log(`  ✓ Uploaded: ${rel}`);
      json(res, 200, { ok: true, path: rel, slot });
    });

    writeStream.on('error', (err) => {
      console.error('Upload error:', err);
      json(res, 500, { error: 'Write failed' });
    });

    req.on('error', (err) => {
      console.error('Request error:', err);
      writeStream.destroy();
    });

    return;
  }

  // ── DELETE /upload?slot=profile — remove file
  if (method === 'DELETE' && urlPath === '/upload') {
    const slot = query.slot;
    if (!SLOTS[slot]) return json(res, 400, { error: 'Invalid slot' });
    clearSlot(slot);
    return json(res, 200, { ok: true, slot });
  }

  // ── Static file serving ─────────────────────────────
  let filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
  const ext    = path.extname(filePath).toLowerCase();
  const mime   = MIME[ext] || 'application/octet-stream';

  // Security: prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // Static assets → real 404 (so probe() works correctly)
      if (urlPath.startsWith('/assets/') || /\.(jpg|jpeg|png|webp|avif|gif|svg|mp4|webm|mov|ico|woff2?|css|js)$/i.test(urlPath)) {
        res.writeHead(404); return res.end('Not found');
      }
      // App routes → fallback to index.html
      fs.readFile(path.join(ROOT, 'index.html'), (e, data) => {
        if (e) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
      });
      return;
    }

    // Video range support
    if (['.mp4', '.webm', '.mov'].includes(ext)) {
      return streamVideo(req, res, filePath, mime);
    }

    fs.readFile(filePath, (err2, data) => {
      if (err2) { res.writeHead(500); return res.end('Error'); }
      res.writeHead(200, {
        'Content-Type': mime,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=604800',
      });
      res.end(data);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ┌──────────────────────────────────────────────┐');
  console.log('  │  Do Nanthavath Portfolio                     │');
  console.log(`  │  Portfolio  →  http://localhost:${PORT}          │`);
  console.log(`  │  Admin      →  http://localhost:${PORT}/admin    │`);
  console.log('  │  Press Ctrl+C to stop                        │');
  console.log('  └──────────────────────────────────────────────┘');
  console.log('');
});
