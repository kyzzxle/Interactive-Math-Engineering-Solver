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

// Same look as the site's light theme: engineering paper, graphite text, ink-blue radical wordmark.
const font = (file) => pathToFileURL(join(ROOT, 'assets/fonts', file)).href;
function card({ eyebrow, title, summary, glyph }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:"Atkinson Hyperlegible Next";font-weight:200 800;src:url(${font('atkinson-hyperlegible-next-latin-wght-normal.woff2')}) format("woff2-variations")}
  @font-face{font-family:"STIX Two Text";font-weight:400 700;src:url(${font('stix-two-text-latin-wght-normal.woff2')}) format("woff2-variations")}
  @font-face{font-family:"STIX Two Text";font-weight:400 700;src:url(${font('stix-two-text-greek-wght-normal.woff2')}) format("woff2-variations");unicode-range:U+0370-03FF}
  *{box-sizing:border-box;margin:0}
  html,body{width:1200px;height:630px;overflow:hidden}
  body{font-family:"Atkinson Hyperlegible Next",system-ui,sans-serif;color:#1c2126;background:#f2f4ec;padding:64px 80px 60px;display:flex;flex-direction:column;position:relative}
  .sheet{position:absolute;right:80px;top:150px;width:250px;height:250px;border:2px solid #a9b5a0;border-radius:4px;background-color:#fdfdf9;
    background-image:linear-gradient(rgba(96,132,88,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(96,132,88,.16) 1px,transparent 1px);background-size:30px 30px;
    box-shadow:0 26px 40px -30px rgba(40,52,36,.6);display:flex;align-items:center;justify-content:center;
    font-family:"STIX Two Text",serif;font-size:${glyph.length > 2 ? 84 : 120}px;color:#1f43c1}
  .brand{display:flex;align-items:flex-start;color:#1f43c1}
  .brand svg{width:30px;height:46px;margin-right:-1px}
  .brand span{font-family:"STIX Two Text",serif;font-weight:600;font-size:36px;line-height:1.2;color:#1c2126;border-top:3px solid #1f43c1;padding:1px 4px 0 3px}
  .eyebrow{margin-top:64px;font-size:28px;font-weight:700;color:#59646e}
  h1{margin-top:10px;font-family:"STIX Two Text",serif;font-size:${title.length > 24 ? 60 : 76}px;line-height:1.04;font-weight:600;letter-spacing:-.01em;max-width:770px}
  p{margin-top:20px;font-size:27px;line-height:1.4;color:#38414a;max-width:770px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .foot{margin-top:auto;padding-top:18px;border-top:2px solid #1c2126;font-size:24px;color:#38414a}
  </style></head><body>
  <div class="brand"><svg viewBox="0 0 20 30" aria-hidden="true"><path d="M1.5 18.5 5 16.5l5.2 11L17.6 1H20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg><span>Solver Hub</span></div>
  <div class="sheet">${esc(glyph)}</div>
  <div class="eyebrow">${esc(eyebrow)}</div>
  <h1>${esc(title)}</h1>
  <p>${esc(summary)}</p>
  <div class="foot">Free step-by-step solutions that run in your browser</div>
  </body></html>`;
}

const jobs = [{ slug: 'default', eyebrow: 'Math, engineering and physics', title: 'Calculators that show their work', summary: `${registry.calculators.length} free calculators with exact answers, worked steps, interactive explorers and practice problems.`, glyph: '∫' }];
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
