#!/usr/bin/env node
/**
 * Generates the link-preview images (Open Graph, 1200×630) in assets/og/ by rendering a small
 * HTML card in headless Chrome or Edge. Run it after adding or renaming a calculator:
 *
 *   npm run og            only images that are missing
 *   npm run og -- --all   regenerate every image
 *
 * The images are committed, so the site and the GitHub Action never need a browser.
 * Pages without their own image use assets/og/default.jpg (see tools/build.mjs).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets/og');
const ALL = process.argv.includes('--all');
const registry = JSON.parse(readFileSync(join(ROOT, 'data/calculators.json'), 'utf8'));
const cats = Object.fromEntries(registry.categories.map((c) => [c.id, c]));

const BROWSERS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean);
const browser = BROWSERS.find((b) => existsSync(b));
if (!browser) { console.error('No Chrome, Edge or Chromium found. Set CHROME_PATH to its executable.'); process.exit(1); }

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function card({ eyebrow, title, summary, glyph }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0}
  html,body{width:1200px;height:630px;overflow:hidden}
  body{font-family:"Segoe UI",Inter,system-ui,-apple-system,Roboto,Arial,sans-serif;color:#e2e8f0;
    background:radial-gradient(900px 500px at 95% -10%,rgba(99,102,241,.35),transparent 60%),radial-gradient(700px 420px at -10% 110%,rgba(16,185,129,.22),transparent 60%),#0b1220;
    padding:72px 80px;display:flex;flex-direction:column}
  .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(148,163,184,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.07) 1px,transparent 1px);background-size:48px 48px}
  .brand{display:flex;align-items:center;gap:18px;font-size:34px;font-weight:800;letter-spacing:-.02em;position:relative}
  .mark{width:58px;height:58px;border-radius:14px;background:#4f46e5;display:flex;align-items:center;justify-content:center}
  .hub{color:#818cf8}
  .eyebrow{margin-top:64px;font-size:26px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#34d399;position:relative}
  h1{margin-top:16px;font-size:${title.length > 30 ? 60 : 74}px;line-height:1.08;font-weight:800;letter-spacing:-.03em;color:#fff;max-width:830px;position:relative}
  p{margin-top:22px;font-size:28px;line-height:1.4;color:#cbd5e1;max-width:1020px;position:relative;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .glyph{position:absolute;right:80px;top:150px;width:170px;height:170px;border-radius:36px;background:rgba(99,102,241,.16);border:2px solid rgba(129,140,248,.45);display:flex;align-items:center;justify-content:center;font-size:${glyph.length > 2 ? 54 : 72}px;font-weight:800;color:#a5b4fc}
  .foot{margin-top:auto;display:flex;gap:28px;font-size:24px;color:#94a3b8;position:relative}
  .foot b{color:#e2e8f0;font-weight:600}
  </style></head><body><div class="grid"></div>
  <div class="brand"><span class="mark"><svg viewBox="0 0 32 32" width="40" height="40"><path d="M8 22 L14 10 L20 22 M10.5 17h7" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="11" r="2.8" fill="#34d399"/></svg></span><span>Solver<span class="hub">Hub</span></span></div>
  <div class="glyph">${esc(glyph)}</div>
  <div class="eyebrow">${esc(eyebrow)}</div>
  <h1>${esc(title)}</h1>
  <p>${esc(summary)}</p>
  <div class="foot"><b>Free</b><span>Step-by-step solutions</span><span>Runs in your browser</span></div>
  </body></html>`;
}

const jobs = [{ slug: 'default', eyebrow: 'Math · Engineering · Physics', title: 'Calculators that show their work', summary: `${registry.calculators.length} free calculators with exact answers, worked steps, interactive explorers and practice problems.`, glyph: '∫' }];
for (const c of registry.calculators) {
  const cat = cats[c.category];
  jobs.push({ slug: c.id, eyebrow: cat.name, title: c.name.replace(/ Calculator$/, ''), summary: c.summary.length > 150 ? `${c.summary.slice(0, 147).replace(/\s+\S*$/, '')}…` : c.summary, glyph: cat.glyph });
}

mkdirSync(OUT, { recursive: true });
const tmp = join(tmpdir(), `og-${process.pid}`);
mkdirSync(tmp, { recursive: true });
let made = 0;
for (const j of jobs) {
  const target = join(OUT, `${j.slug}.jpg`);
  if (!ALL && existsSync(target)) continue;
  const html = join(tmp, `${j.slug}.html`);
  writeFileSync(html, card(j), 'utf8');
  execFileSync(browser, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1200,630', `--screenshot=${target}`, pathToFileURL(html).href], { stdio: 'ignore', timeout: 60000 });
  if (!existsSync(target)) throw new Error(`The browser did not write ${target}`);
  made++;
  process.stdout.write(`\r${made} image(s) written`);
}
rmSync(tmp, { recursive: true, force: true });
console.log(made ? `\nDone: ${made} image(s) in assets/og/.` : 'All images already exist (use --all to regenerate).');
