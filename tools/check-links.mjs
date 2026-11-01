#!/usr/bin/env node
/**
 * Checks every internal link and asset reference in the site's HTML files:
 *   - relative href/src targets must exist (folders must contain index.html)
 *   - "#fragment" targets must match an id on the target page
 * External (http/https/mailto) links are listed but not fetched.
 * Exit code 1 if anything is broken.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, sep, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['.git', '.github', 'node_modules', 'tools', 'tests', 'content', '_site', '.claude']);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = dir ? join(dir, name) : name;
    if (statSync(join(ROOT, rel)).isDirectory()) { if (!SKIP.has(name)) out.push(...walk(rel)); }
    else if (name.endsWith('.html')) out.push(rel.split(sep).join('/'));
  }
  return out;
}

const pages = walk('');
const idCache = new Map();
function idsOf(file) {
  if (!idCache.has(file)) {
    const html = readFileSync(join(ROOT, file), 'utf8');
    idCache.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idCache.get(file);
}

const broken = [];
const external = new Set();
let checked = 0;

for (const page of pages) {
  const html = readFileSync(join(ROOT, page), 'utf8')
    .replace(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/g, '') // inline scripts and JSON-LD are not links
    .replace(/<base [^>]*>/g, ''); // the 404 page's <base> is the production root path, not a link
  // 404.html sets <base href> to the site root, so resolve its links from the root.
  const baseDir = page === '404.html' ? '' : dirname(page);
  for (const m of html.matchAll(/\s(?:href|src|action)="([^"]*)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|data:|javascript:)/i.test(url)) { if (/^https?:/.test(url)) external.add(url); continue; }
    if (url === '' || url === '#') continue;
    checked++;
    const [pathPart, fragment] = url.split('#');
    let target = pathPart ? normalize(join(baseDir, pathPart.split('?')[0])).split(sep).join('/') : page;
    if (target === '.' || target === '') target = '';
    const full = join(ROOT, target);
    let file = target;
    if (pathPart && (existsSync(full) && statSync(full).isDirectory())) file = (target ? `${target}/` : '') + 'index.html';
    if (!existsSync(join(ROOT, file)) || statSync(join(ROOT, file)).isDirectory()) {
      broken.push(`${page}: "${url}" -> ${file} does not exist`);
      continue;
    }
    if (fragment && file.endsWith('.html') && !idsOf(file).has(fragment)) {
      broken.push(`${page}: "${url}" -> no element with id="${fragment}" in ${file}`);
    }
  }
}

console.log(`Checked ${checked} internal links/assets across ${pages.length} pages. ${external.size} distinct external URLs (not fetched).`);
if (broken.length) {
  console.error(`\n${broken.length} broken link(s):\n  ${broken.join('\n  ')}`);
  process.exit(1);
}
console.log('No broken internal links.');
