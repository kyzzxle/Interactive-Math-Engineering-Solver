/* Site-wide checks: required files, SEO metadata, structured data, sitemap and robots. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const HAND_WRITTEN = [
  'calculators/frustum-of-a-cone/index.html',
  'calculators/distance-from-point-to-line/index.html',
  'calculators/permutations-and-combinations/index.html',
];
const registry = JSON.parse(read('data/calculators.json'));
const GENERATED = registry.calculators.filter((c) => c.generated).map((c) => `calculators/${c.id}/index.html`);
const PAGES = [
  'index.html', 'about.html', 'contact.html', 'privacy-policy.html', 'terms.html', 'disclaimer.html',
  'calculators/index.html',
  ...HAND_WRITTEN,
  ...GENERATED,
];

test('every registry entry has a page on disk', () => {
  assert.equal(registry.calculators.length, 120);
  for (const c of registry.calculators) {
    const url = c.url || `calculators/${c.id}/`;
    assert.ok(existsSync(new URL(`../${url}index.html`, import.meta.url)), `missing page for ${c.id}`);
  }
});

test('required files exist', () => {
  for (const f of [...PAGES, '404.html', 'robots.txt', 'sitemap.xml', 'ads.txt', '.nojekyll', 'CNAME.example', 'assets/css/styles.css', 'assets/js/site-config.js']) {
    assert.ok(existsSync(new URL(`../${f}`, import.meta.url)), f);
  }
});

test('every indexable page has unique title, description, one h1, canonical and lang', () => {
  const titles = new Set();
  const descriptions = new Set();
  for (const p of PAGES) {
    const html = read(p);
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const desc = html.match(/<meta name="description" content="([^"]+)">/)?.[1];
    assert.ok(title && title.length >= 20 && title.length <= 90, `${p} title length ${title?.length}`);
    assert.ok(desc && desc.length >= 70 && desc.length <= 200, `${p} description length ${desc?.length}`);
    assert.ok(!titles.has(title), `duplicate title on ${p}`);
    assert.ok(!descriptions.has(desc), `duplicate description on ${p}`);
    titles.add(title);
    descriptions.add(desc);
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${p} should have exactly one h1`);
    assert.match(html, /<html lang="en">/);
    assert.match(html, /<link rel="canonical" href="https?:\/\/[^"]+">/);
    assert.match(html, /<meta name="viewport"/);
  }
});

test('heading levels never skip (h2 -> h4 etc.) inside articles', () => {
  for (const p of PAGES) {
    const levels = [...read(p).matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
    for (let i = 1; i < levels.length; i++) {
      assert.ok(levels[i] <= levels[i - 1] + 1, `${p}: h${levels[i - 1]} followed by h${levels[i]}`);
    }
  }
});

test('structured data parses and calculator pages include breadcrumbs, app and FAQ', () => {
  for (const p of PAGES) {
    const raw = read(p).match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    assert.ok(raw, `${p} has JSON-LD`);
    const data = JSON.parse(raw);
    const types = data['@graph'].map((g) => g['@type']);
    if (GENERATED.includes(p)) {
      for (const t of ['BreadcrumbList', 'WebApplication']) assert.ok(types.includes(t), `${p} missing ${t}`);
    } else if (HAND_WRITTEN.includes(p)) {
      for (const t of ['BreadcrumbList', 'WebApplication', 'FAQPage']) assert.ok(types.includes(t), `${p} missing ${t}`);
      const faq = data['@graph'].find((g) => g['@type'] === 'FAQPage');
      assert.ok(faq.mainEntity.length >= 6);
    }
  }
});

test('calculator pages contain all required educational sections', () => {
  for (const p of GENERATED) {
    const html = read(p);
    for (const id of ['about', 'formula', 'example', 'assumptions', 'related', 'calc-form', 'calc-output']) {
      assert.ok(html.includes(`id="${id}"`), `${p} missing section ${id}`);
    }
    assert.ok(html.includes('data-load-example'), `${p} has no worked-example button`);
    assert.ok(/<math[\s>]/.test(html), `${p} has no pre-rendered formula`);
    assert.ok((html.match(/class="ad-slot/g) || []).length <= 4, `${p} has too many ad slots`);
  }
  for (const p of HAND_WRITTEN) {
    const html = read(p);
    for (const id of ['purpose', 'formula', 'variables', 'derivation', 'worked-example', 'applications', 'mistakes', 'faq', 'related', 'further-learning']) {
      assert.ok(new RegExp(`id="${id}s?"`).test(html), `${p} missing section ${id}`);
    }
    assert.ok((html.match(/class="ad-slot/g) || []).length <= 4, `${p} has too many ad slots`);
  }
});

test('no page shows raw LaTeX commands or delimiters in its visible text', () => {
  for (const p of [...PAGES, '404.html']) {
    const visible = read(p)
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<style[\s\S]*?<\/style>/g, '')
      .replace(/<[^>]+>/g, ' ');
    const m = visible.match(/\\[a-zA-Z]+|\\[()[\]]|\$\$/);
    assert.ok(!m, `${p} shows raw LaTeX "${m && m[0]}" near: ${m && visible.slice(Math.max(0, m.index - 60), m.index + 40).replace(/\s+/g, ' ')}`);
  }
});

test('sitemap lists every indexable page and excludes 404', () => {
  const xml = read('sitemap.xml');
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
  assert.equal((xml.match(/<url>/g) || []).length, PAGES.length);
  assert.equal((xml.match(/<url>/g) || []).length, (xml.match(/<\/url>/g) || []).length);
  assert.ok(!/404/.test(xml));
  for (const p of PAGES) {
    const canonical = read(p).match(/<link rel="canonical" href="([^"]+)">/)[1];
    assert.ok(xml.includes(`<loc>${canonical}</loc>`), `sitemap missing ${canonical}`);
  }
});

test('robots.txt points to the sitemap and 404 is noindex', () => {
  const robots = read('robots.txt');
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Sitemap: https?:\/\/\S+\/sitemap\.xml/);
  assert.match(read('404.html'), /<meta name="robots" content="noindex, follow">/);
});

test('no AdSense code or publisher ID is active without configuration', () => {
  const cfg = JSON.parse(read('site.config.json'));
  if (!cfg.adsense.publisherId) {
    for (const p of PAGES) assert.ok(!/ca-pub-\d/.test(read(p)), `${p} contains a publisher ID`);
    assert.ok(!/^google\.com/m.test(read('ads.txt')), 'ads.txt must not list a seller yet');
  }
});

test('generated files are up to date with the sources (npm run build has been run)', () => {
  // Re-check with the site URL the pages were last built with (CI passes the GitHub Pages URL).
  const builtUrl = read('index.html').match(/<link rel="canonical" href="([^"]+?)\/?">/)[1];
  try {
    execFileSync(process.execPath, ['tools/build.mjs', '--check', '--site-url', builtUrl], { cwd: new URL('..', import.meta.url), stdio: 'pipe' });
  } catch (e) {
    assert.fail(`Build output is stale. Run "npm run build".\n${e.stdout}`);
  }
});

test('styles are self-hosted and every page has a link-preview image', () => {
  assert.ok(existsSync(new URL('../assets/css/tailwind.css', import.meta.url)), 'assets/css/tailwind.css (run npm run css)');
  assert.ok(existsSync(new URL('../assets/og/default.jpg', import.meta.url)), 'assets/og/default.jpg (run npm run og)');
  for (const p of [...PAGES, '404.html']) {
    const html = read(p);
    assert.ok(!html.includes('cdn.tailwindcss.com'), `${p} still loads the Tailwind CDN`);
    assert.ok(html.includes('assets/css/tailwind.css'), `${p} does not load tailwind.css`);
    if (p === '404.html') continue;
    const img = html.match(/<meta property="og:image" content="[^"]*\/assets\/og\/([^"]+)">/)?.[1];
    assert.ok(img, `${p} has no og:image`);
    assert.ok(existsSync(new URL(`../assets/og/${img}`, import.meta.url)), `${p}: assets/og/${img} is missing`);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image">/, `${p} twitter card`);
  }
});
