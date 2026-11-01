#!/usr/bin/env node
/**
 * Local preview server that behaves like GitHub Pages (no dependencies).
 *   npm run serve            -> http://localhost:8080
 *   PORT=3000 npm run serve  -> custom port
 * - "/folder/" serves folder/index.html, "/folder" redirects to "/folder/"
 * - "/about" serves about.html (extensionless URLs, as on GitHub Pages)
 * - unknown paths return 404.html with status 404
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
};

async function isFile(p) {
  try { return (await stat(p)).isFile(); } catch { return false; }
}
async function isDir(p) {
  try { return (await stat(p)).isDirectory(); } catch { return false; }
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let path;
  try { path = decodeURIComponent(url.pathname); } catch { path = '/'; }
  const safe = normalize(path).replace(/^(\.\.[/\\])+/, '');
  let file = join(ROOT, safe);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }

  if (await isDir(file)) {
    if (!path.endsWith('/')) { res.writeHead(301, { Location: `${path}/${url.search}` }).end(); return; }
    file = join(file, 'index.html');
  } else if (!(await isFile(file)) && !extname(file) && (await isFile(`${file}.html`))) {
    file = `${file}.html`;
  }

  let status = 200;
  if (!(await isFile(file))) { status = 404; file = join(ROOT, '404.html'); }
  let body;
  for (let attempt = 0; attempt < 3 && !body; attempt++) {
    // Files in synced folders (e.g. OneDrive) can be locked for a moment right after saving.
    try { body = await readFile(file); } catch { await new Promise((r) => setTimeout(r, 150)); }
  }
  if (!body) { res.writeHead(500).end('Server error'); return; }
  if (status === 404) {
    // Locally the site lives at "/", not at the production sub-path written into 404.html.
    body = Buffer.from(body.toString('utf8').replace(/<base href="[^"]*">/, '<base href="/">'));
  }
  res.writeHead(status, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  res.end(body);
}).listen(PORT, () => console.log(`Serving ${ROOT} at http://localhost:${PORT}`));
