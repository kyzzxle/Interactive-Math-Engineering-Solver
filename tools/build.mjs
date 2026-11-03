#!/usr/bin/env node
/**
 * Solver Hub build script (zero dependencies, Node 18+).
 *
 * What it does, in place:
 *   1. Injects the shared <head>, header and footer (tools/partials/*) into every page
 *      between <!-- build:NAME --> ... <!-- /build:NAME --> markers.
 *   2. Generates calculator cards, category tiles and footer links from data/calculators.json.
 *   3. Rewrites the site URL (canonical, Open Graph, JSON-LD, 404 base) everywhere.
 *   4. Writes assets/js/site-config.js, sitemap.xml, robots.txt, ads.txt and (optionally) CNAME.
 *   5. Generates calculator pages marked "generated" in data/calculators.json from
 *      content/calculators/<id>.html and the form fields in assets/js/calculators/<id>.js.
 *   6. Renders every \( ... \) and \[ ... \] formula to MathML (raw LaTeX never reaches visitors).
 *   7. Bundles each page's JavaScript modules into one classic script in assets/js/bundles/.
 *
 * Usage:
 *   node tools/build.mjs                      build using site.config.json
 *   node tools/build.mjs --site-url URL       fallback URL when siteUrl/customDomain are empty (used by CI)
 *   node tools/build.mjs --check              report files that are out of date, change nothing
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, sep, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { texToMathML } from './katex-node.mjs';
import { renderCalculatorPage } from './page-template.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLACEHOLDER_URL = 'https://your-username.github.io/your-repository';
const SKIP_DIRS = new Set(['.git', '.github', 'node_modules', 'tools', 'tests', '_site', 'docs', 'content']);

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const cliUrlIndex = args.indexOf('--site-url');
const cliUrl = cliUrlIndex >= 0 ? args[cliUrlIndex + 1] : process.env.SITE_URL;

const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const config = JSON.parse(read('site.config.json'));
const registry = JSON.parse(read('data/calculators.json'));

const changed = [];
const warnings = [];

const virtualFiles = new Map(); // generated content, so --check works without writing
function output(path, content) {
  virtualFiles.set(path, content);
  const full = join(ROOT, path);
  const before = existsSync(full) ? readFileSync(full, 'utf8') : null;
  if (before === content) return;
  changed.push(path);
  if (!CHECK) { mkdirSync(dirname(full), { recursive: true }); writeFileSync(full, content, 'utf8'); }
}
const readPage = (p) => (virtualFiles.has(p) ? virtualFiles.get(p) : read(p));

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function normaliseUrl(u) {
  if (!u) return '';
  let url = u.trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  return url.replace(/\/+$/, '');
}

// ---------------------------------------------------------------- site URL
let siteUrl = normaliseUrl(config.siteUrl);
if (!siteUrl && config.customDomain) siteUrl = normaliseUrl(config.customDomain);
if (!siteUrl && cliUrl) siteUrl = normaliseUrl(cliUrl);
if (!siteUrl) {
  siteUrl = PLACEHOLDER_URL;
  warnings.push(`siteUrl is not set in site.config.json — pages still use the placeholder ${PLACEHOLDER_URL}. Set it before deploying (see README.md).`);
}

const indexHtml = existsSync(join(ROOT, 'index.html')) ? read('index.html') : '';
const canonicalMatch = indexHtml.match(/<link rel="canonical" href="([^"]+?)\/?">/);
const currentUrl = canonicalMatch ? canonicalMatch[1].replace(/\/+$/, '') : PLACEHOLDER_URL;

// ---------------------------------------------------------------- AdSense
const ads = config.adsense || {};
const publisherValid = /^ca-pub-\d{16}$/.test(ads.publisherId || '');
if (ads.publisherId && !publisherValid) {
  warnings.push(`adsense.publisherId "${ads.publisherId}" does not look like ca-pub- followed by 16 digits. It was ignored.`);
}
if (ads.enabled && !publisherValid) {
  warnings.push('adsense.enabled is true but no valid publisherId is set, so no ads will load.');
}

// ---------------------------------------------------------------- generated calculator pages
const categoriesById = Object.fromEntries(registry.categories.map((c) => [c.id, c]));
const calcById = Object.fromEntries(registry.calculators.map((c) => [c.id, c]));
for (const entry of registry.calculators) {
  entry.url = entry.url || `calculators/${entry.id}/`;
  if (!entry.generated) continue;
  const modPath = join(ROOT, 'assets/js/calculators', `${entry.id}.js`);
  const contentPath = `content/calculators/${entry.id}.html`;
  if (!existsSync(modPath) || !existsSync(join(ROOT, contentPath))) { warnings.push(`${entry.id}: missing ${existsSync(modPath) ? contentPath : modPath}`); continue; }
  const mod = await import(pathToFileURL(modPath).href);
  if (!mod.calculator || !Array.isArray(mod.calculator.fields)) throw new Error(`${entry.id}: assets/js/calculators/${entry.id}.js must export "calculator" with fields`);
  const related = (entry.related || []).map((id) => {
    if (!calcById[id]) throw new Error(`${entry.id}: related calculator "${id}" is not in the registry`);
    return calcById[id];
  });
  const html = renderCalculatorPage({ entry, calc: mod.calculator, content: read(contentPath), category: categoriesById[entry.category], related, siteUrl });
  // Only a draft: the marker pass below finishes the page and writes it once.
  virtualFiles.set(`${entry.url}index.html`, html);
}

// ---------------------------------------------------------------- HTML files
function walk(dir) {
  const out = [];
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = dir ? join(dir, name) : name;
    const st = statSync(join(ROOT, rel));
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name) && !name.startsWith('.')) out.push(...walk(rel));
    } else if (name.endsWith('.html')) {
      out.push(rel.split(sep).join('/'));
    }
  }
  return out;
}
const htmlFiles = [...new Set([...walk(''), ...[...virtualFiles.keys()].filter((f) => f.endsWith('.html'))])].sort();

const partials = {
  head: read('tools/partials/head.partial'),
  header: read('tools/partials/header.partial'),
  footer: read('tools/partials/footer.partial'),
};

for (const calc of registry.calculators) {
  if (!categoriesById[calc.category]) throw new Error(`Calculator ${calc.id} uses unknown category ${calc.category}`);
  if (!existsSync(join(ROOT, calc.url, 'index.html')) && !virtualFiles.has(`${calc.url}index.html`)) warnings.push(`Registry lists ${calc.url} but ${calc.url}index.html does not exist.`);
}

// One index entry: the whole row is the link. The subject is shown only in mixed lists;
// in the directory the section heading already names it.
function card(calc, root, headingLevel, { showCategory = true } = {}) {
  const cat = categoriesById[calc.category];
  const search = [calc.name, calc.shortName, calc.summary, cat.name, ...calc.keywords].join(' ').toLowerCase();
  const h = `h${headingLevel}`;
  return `<li class="calc-card-item" data-category="${calc.category}" data-featured="${calc.featured ? 'true' : 'false'}" data-search="${escapeHtml(search)}">
          <a class="calc-card" href="${root}${calc.url}">
            <${h} class="calc-card-title">${escapeHtml(calc.name)}</${h}>${showCategory ? `
            <span class="calc-card-category">${escapeHtml(cat.name)}</span>` : ''}
            <span class="calc-card-summary">${escapeHtml(calc.summary)}</span>
          </a>
        </li>`;
}

const generators = {
  head(root, opts, source, file) {
    const math = opts.includes('math');
    let html = partials.head;
    // Link-preview image: the page's own card from tools/og-images.mjs, or the site-wide default.
    const slug = (file.match(/^calculators\/([^/]+)\/index\.html$/) || [])[1];
    const img = slug && existsSync(join(ROOT, 'assets/og', `${slug}.jpg`)) ? `${slug}.jpg` : 'default.jpg';
    const title = escapeHtml(((source.match(/<meta property="og:title" content="([^"]*)">/) || [])[1] || config.siteName).replace(/&amp;/g, '&'));
    html = `  <meta property="og:image" content="${siteUrl}/assets/og/${img}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${/Solver Hub/.test(title) ? title : `${title} — Solver Hub`}">
  <meta name="twitter:image" content="${siteUrl}/assets/og/${img}">
${html}`;
    const meta = publisherValid ? `<meta name="google-adsense-account" content="${ads.publisherId}">` : '';
    html = meta ? html.replace('{{adsenseMeta}}', meta) : html.replace(/^[ \t]*\{\{adsenseMeta\}\}\r?\n/m, '');
    // KaTeX is self-hosted and only loaded where results are typeset in the browser.
    const js = `<script defer src="{{root}}assets/vendor/katex/katex.min.js"></script>`;
    html = math ? html.replace('{{mathJs}}', js) : html.replace(/^[ \t]*\{\{mathJs\}\}\r?\n/m, '');
    return html;
  },
  header: () => partials.header,
  base: () => `  <base href="${new URL(`${siteUrl}/`).pathname}">`,
  footer(root) {
    // With dozens of calculators the footer links to subjects rather than individual pages.
    const links = registry.categories
      .map((c) => `          <li><a class="footer-link" href="${root}calculators/#${c.id}">${escapeHtml(c.name)}</a></li>`)
      .join('\n');
    return partials.footer.replace('{{footerCalculators}}', links).replace('{{year}}', String(new Date().getFullYear()));
  },
  featured(root) {
    // All cards are present for search; only "featured" ones show until the visitor searches or filters.
    return `        <ul class="card-grid" data-search-list data-featured-only>
        ${registry.calculators.map((c) => card(c, root, 3)).join('\n        ')}
        </ul>`;
  },
  chips() {
    const used = registry.categories.filter((cat) => registry.calculators.some((c) => c.category === cat.id));
    const chip = (id, label, pressed) => `<button type="button" class="chip" data-category-filter="${id}" aria-pressed="${pressed}">${escapeHtml(label)}</button>`;
    return `        <div class="chip-row" role="group" aria-label="Filter by subject">
          ${[chip('all', 'All subjects', true), ...used.map((c) => chip(c.id, c.name, false))].join('\n          ')}
        </div>`;
  },
  categories(root) {
    const tiles = registry.categories.map((cat) => {
      const count = registry.calculators.filter((c) => c.category === cat.id).length;
      const label = count ? `${count} calculator${count === 1 ? '' : 's'}` : 'In development';
      return `<li>
          <a class="category-tile" href="${root}calculators/#${cat.id}">
            <span class="category-glyph" aria-hidden="true">${escapeHtml(cat.glyph)}</span>
            <span class="category-name">${escapeHtml(cat.name)}</span>
            <span class="category-desc">${escapeHtml(cat.description)}</span>
            <span class="category-count${count ? '' : ' is-empty'}">${label}</span>
          </a>
        </li>`;
    });
    return `        <ul class="category-grid">
        ${tiles.join('\n        ')}
        </ul>`;
  },
  directory(root) {
    const sections = registry.categories.map((cat) => {
      const calcs = registry.calculators.filter((c) => c.category === cat.id);
      const body = calcs.length
        ? `<ul class="card-grid">
          ${calcs.map((c) => card(c, root, 3, { showCategory: false })).join('\n          ')}
          </ul>`
        : `<div class="planned-box">
            <p>No calculators are published in this category yet.</p>
          </div>`;
      return `<section class="directory-section" id="${cat.id}" aria-labelledby="${cat.id}-heading" data-directory-section>
          <div class="directory-section-head">
            <span class="category-glyph" aria-hidden="true">${escapeHtml(cat.glyph)}</span>
            <div>
              <h2 id="${cat.id}-heading">${escapeHtml(cat.name)}</h2>
              <p>${escapeHtml(cat.description)}</p>
            </div>
          </div>
          ${body}
        </section>`;
    });
    return `        <div data-search-list>
        ${sections.join('\n        ')}
        </div>`;
  },
};

// ---------------------------------------------------------------- structured data (JSON-LD)
function textOf(fragment) {
  return fragment
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&rarr;/g, '→').replace(/&times;/g, '×')
    .replace(/\s+/g, ' ')
    .trim();
}
const meta = (html, re) => ((html.match(re) || [])[1] || '').trim();

function pageUrl(file) {
  const path = file === 'index.html' ? '' : file.endsWith('/index.html') ? file.slice(0, -'index.html'.length) : file;
  return `${siteUrl}/${path}`;
}

generators.schema = (root, opts, html, file) => {
  const url = pageUrl(file);
  const title = textOf(meta(html, /<meta property="og:title" content="([^"]*)">/) || meta(html, /<title>([^<]*)<\/title>/));
  const description = textOf(meta(html, /<meta name="description" content="([^"]*)">/));
  const modified = meta(html, /<meta name="dcterms.modified" content="([^"]*)">/);
  const graph = [];
  const website = { '@type': 'WebSite', '@id': `${siteUrl}/#website`, name: config.siteName, alternateName: config.shortName, url: `${siteUrl}/`, inLanguage: 'en' };
  if (opts.includes('website')) {
    graph.push({ ...website, description });
  }
  const pageType = opts.includes('about') ? 'AboutPage' : opts.includes('contact') ? 'ContactPage' : opts.includes('collection') ? 'CollectionPage' : 'WebPage';
  const page = { '@type': pageType, '@id': `${url}#webpage`, url, name: title, description, isPartOf: { '@id': `${siteUrl}/#website` }, inLanguage: 'en' };
  if (modified) page.dateModified = modified;

  const crumbNav = (html.match(/<nav class="breadcrumbs"[\s\S]*?<\/nav>/) || [])[0];
  if (crumbNav) {
    // A subject crumb links to a section of the directory (#fragment); it is not a page of its own.
    const items = [...crumbNav.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].filter((m) => !/href="[^"]*#/.test(m[1])).map((m, i) => {
      const href = (m[1].match(/href="([^"]+)"/) || [])[1];
      const abs = href ? new URL(href, `${siteUrl}/${file}`).href.replace(/index\.html$/, '') : url;
      return { '@type': 'ListItem', position: i + 1, name: textOf(m[1]), item: abs };
    });
    graph.push({ '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: items });
    page.breadcrumb = { '@id': `${url}#breadcrumb` };
  }
  graph.push(page);

  if (opts.includes('calculator')) {
    const name = textOf(meta(html, /<h1[^>]*>([\s\S]*?)<\/h1>/));
    graph.push({
      '@type': 'WebApplication',
      '@id': `${url}#calculator`,
      name,
      url,
      description,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Any (runs in a web browser)',
      browserRequirements: 'Requires JavaScript',
      isAccessibleForFree: true,
      inLanguage: 'en',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      ...(modified ? { dateModified: modified } : {}),
    });
  }

  const faqSection = (html.match(/<section[^>]*class="[^"]*\bfaq\b[^"]*"[\s\S]*?<\/section>/) || [])[0];
  if (faqSection) {
    const qa = [...faqSection.matchAll(/<summary>([\s\S]*?)<\/summary>\s*<div class="faq-answer">([\s\S]*?)<\/div>\s*<\/details>/g)];
    if (qa.length) {
      graph.push({
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: qa.map((m) => ({ '@type': 'Question', name: textOf(m[1]), acceptedAnswer: { '@type': 'Answer', text: textOf(m[2]) } })),
      });
    }
  }
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2).replace(/</g, '\\u003c');
  return `  <script type="application/ld+json">\n${json}\n  </script>`;
};

// ---------------------------------------------------------------- formulas → MathML
const decodeEntities = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const encodeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function mathSpan(tex, display, file) {
  let mathml;
  try {
    mathml = texToMathML(tex.trim(), display);
  } catch (e) {
    throw new Error(`${file}: invalid formula "${tex}": ${e.message}`);
  }
  // data-tex keeps the source so the formula can be edited and re-rendered on the next build.
  return `<span class="${display ? 'math-display' : 'math'}" data-tex="${encodeAttr(tex.trim())}">${mathml}</span>`;
}

const RENDERED = /<span class="(math|math-display)" data-tex="([^"]*)">[\s\S]*?<\/math><\/span><\/span>/g;
const PROTECTED = /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<textarea[\s\S]*?<\/textarea>|<span class="(?:math|math-display)" data-tex="[^"]*">[\s\S]*?<\/math><\/span><\/span>|<[^>]+>/g;

/** Render \( … \) and \[ … \] in page text to MathML; re-render existing formulas from their data-tex. */
function prerenderMath(html, file) {
  html = html.replace(RENDERED, (_, cls, enc) => mathSpan(decodeEntities(enc), cls === 'math-display', file));
  let out = '', last = 0;
  const renderText = (t) => t
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, tex) => mathSpan(decodeEntities(tex), true, file))
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, tex) => mathSpan(decodeEntities(tex), false, file));
  for (const m of html.matchAll(PROTECTED)) {
    out += renderText(html.slice(last, m.index)) + m[0];
    last = m.index + m[0].length;
  }
  return out + renderText(html.slice(last));
}

const MARKER = /<!-- build:([a-z-]+)((?: [a-z-]+)*) -->[\s\S]*?<!-- \/build:\1 -->/g;
const sitemapEntries = [];

for (const file of htmlFiles) {
  const depth = file.split('/').length - 1;
  const root = depth === 0 ? './' : '../'.repeat(depth);
  let html = readPage(file);
  // Rewrite the site URL first so generated blocks below always use the new value.
  if (currentUrl !== siteUrl) html = html.replaceAll(currentUrl, siteUrl);

  const source = html;
  html = html.replace(MARKER, (whole, name, optStr) => {
    const gen = generators[name];
    if (!gen) { warnings.push(`${file}: unknown build marker "${name}"`); return whole; }
    const opts = optStr.trim() ? optStr.trim().split(' ') : [];
    const content = gen(root, opts, source, file).replaceAll('{{root}}', root).replace(/\s+$/, '');
    return `<!-- build:${name}${optStr} -->\n${content}\n  <!-- /build:${name} -->`;
  });
  html = prerenderMath(html, file);

  output(file, html);

  // Sitemap and canonical checks
  if (/<meta name="robots" content="[^"]*noindex/i.test(html)) continue;
  const loc = pageUrl(file);
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)">/) || [])[1];
  if (!canonical) warnings.push(`${file}: missing canonical link`);
  else if (canonical !== loc) warnings.push(`${file}: canonical ${canonical} does not match expected ${loc}`);
  const lastmod = (html.match(/<meta name="dcterms.modified" content="(\d{4}-\d{2}-\d{2})">/) || [])[1];
  sitemapEntries.push({ loc, lastmod });
}

// ---------------------------------------------------------------- JavaScript bundles
/*
 * Source files are ES modules (imported directly by the Node tests). Browsers get one classic
 * script per page, which loads faster (one request) and also runs when a page is opened from
 * disk or in a file preview, where ES modules are blocked.
 */
function transformModule(rel, code) {
  const dir = posix.dirname(rel);
  const exportsList = [];
  const deps = [];
  code = code.replace(/import\s*\{([^}]*)\}\s*from\s*'([^']+)';?/g, (_, names, from) => {
    const target = posix.normalize(posix.join(dir, from));
    deps.push(target);
    const bindings = names.split(',').map((n) => n.trim()).filter(Boolean).map((n) => n.replace(/\s+as\s+/, ': '));
    return `const { ${bindings.join(', ')} } = __m[${JSON.stringify(target)}];`;
  });
  if (/^\s*import\s/m.test(code)) throw new Error(`${rel}: unsupported import syntax for the bundler (use import { a, b } from './x.js')`);
  code = code.replace(/^export\s+((?:async\s+)?function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm, (_, kind, name) => { exportsList.push(name); return `${kind} ${name}`; });
  code = code.replace(/^export\s*\{([^}]*)\};?/gm, (_, names) => {
    for (const n of names.split(',').map((x) => x.trim()).filter(Boolean)) {
      const [local, exported] = n.split(/\s+as\s+/);
      exportsList.push(exported ? `${exported}: ${local}` : local);
    }
    return '';
  });
  if (/^export\s/m.test(code)) throw new Error(`${rel}: unsupported export syntax for the bundler`);
  return { deps, code: `__m[${JSON.stringify(rel)}] = (function () {\n${code}\nreturn { ${exportsList.join(', ')} };\n})();` };
}

function bundle(entries, tail = '') {
  const done = new Set();
  const parts = [];
  const visit = (rel) => {
    if (done.has(rel)) return;
    done.add(rel);
    const { deps, code } = transformModule(rel, read(`assets/js/${rel}`));
    deps.forEach(visit);
    parts.push(code);
  };
  entries.forEach(visit);
  return `/* Generated by tools/build.mjs from ${entries.join(', ')}. Do not edit; edit the source modules. */\n(function () {\n'use strict';\nconst __m = {};\n${parts.join('\n')}\n${tail}\n})();\n`;
}

for (const name of readdirSync(join(ROOT, 'assets/js/pages'))) {
  if (!name.endsWith('.js') || name === 'calculator-page.js') continue;
  output(`assets/js/bundles/${name}`, bundle([`pages/${name}`]));
}
for (const entry of registry.calculators.filter((c) => c.generated)) {
  if (!existsSync(join(ROOT, 'assets/js/calculators', `${entry.id}.js`))) continue;
  output(`assets/js/bundles/${entry.id}.js`, bundle(['pages/calculator-page.js', `calculators/${entry.id}.js`],
    `__m['pages/calculator-page.js'].mountCalculator(__m['calculators/${entry.id}.js'].calculator);`));
}

// ---------------------------------------------------------------- generated files
const runtimeConfig = {
  siteName: config.siteName,
  siteUrl,
  contact: { email: config.contact?.email || '', formEndpoint: config.contact?.formEndpoint || '' },
  adsense: {
    enabled: Boolean(ads.enabled && publisherValid),
    publisherId: publisherValid ? ads.publisherId : '',
    mode: ads.mode === 'auto' ? 'auto' : 'manual',
    showPlaceholders: Boolean(ads.showPlaceholders),
    slots: ads.slots || {},
  },
};
output('assets/js/site-config.js',
  `/* Generated by tools/build.mjs from site.config.json. Do not edit by hand: change site.config.json and run "npm run build". */\nwindow.SITE_CONFIG = ${JSON.stringify(runtimeConfig, null, 2)};\n`);

output('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.map((e) => `  <url>\n    <loc>${escapeHtml(e.loc)}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ''}\n  </url>`).join('\n')}
</urlset>
`);

output('robots.txt', `# robots.txt for ${config.siteName}
# Generated by tools/build.mjs. Search engines only read robots.txt at the root of a domain,
# so this file takes full effect once the site is served from a custom domain.
User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`);

output('ads.txt', publisherValid
  ? `# ads.txt — Authorized Digital Sellers for ${config.siteName}\n# Generated by tools/build.mjs from adsense.publisherId in site.config.json.\ngoogle.com, ${ads.publisherId.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`
  : `# ads.txt — Authorized Digital Sellers for ${config.siteName}
#
# No advertising account is configured yet, so this file intentionally lists no sellers.
# After Google AdSense approves your site, put your publisher ID (ca-pub-XXXXXXXXXXXXXXXX)
# in site.config.json -> adsense.publisherId and run "npm run build". This file is then
# regenerated with a line in the format Google publishes in your AdSense account:
#
#   google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
#
# Always copy the exact line shown under AdSense -> Sites -> ads.txt if it differs.
`);

if (config.customDomain) {
  output('CNAME', config.customDomain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '') + '\n');
} else if (existsSync(join(ROOT, 'CNAME'))) {
  warnings.push('A CNAME file exists but customDomain is empty in site.config.json. Delete CNAME if you are not using a custom domain.');
}

// ---------------------------------------------------------------- report
const verb = CHECK ? 'out of date' : 'updated';
console.log(`Site URL: ${siteUrl}`);
console.log(`${htmlFiles.length} HTML pages scanned, ${sitemapEntries.length} indexable pages in sitemap.`);
console.log(changed.length ? `${changed.length} file(s) ${verb}:\n  ${changed.join('\n  ')}` : `All files are up to date.`);
for (const w of warnings) console.warn(`WARNING: ${w}`);
if (CHECK && changed.length) process.exit(1);
