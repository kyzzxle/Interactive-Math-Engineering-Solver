/**
 * HTML template for generated calculator pages. Input: registry entry, calculator module
 * (for its form fields and examples), lesson content and related calculators.
 * Shared parts are left as build markers and filled by tools/build.mjs.
 */
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function defaultValue(f) {
  if (f.default !== undefined) return String(f.default);
  if (f.type === 'radio' || f.type === 'select') return String(f.options[0][0]);
  return '';
}

function renderField(f, fields) {
  const id = `f-${f.name}`;
  let show = '';
  let hidden = '';
  if (f.showWhen) {
    const [field, list] = Object.entries(f.showWhen)[0];
    show = ` data-show-when="${field}=${list.join('|')}"`;
    const ctrl = fields.find((x) => x.name === field);
    if (ctrl && !list.includes(defaultValue(ctrl))) hidden = ' hidden';
  }
  const hint = f.hint ? `<p id="${id}-hint" class="field-hint">${esc(f.hint)}</p>` : '';
  const describedBy = `${f.hint ? `${id}-hint ` : ''}${id}-error`;
  const error = `<p id="${id}-error" class="field-error" data-error-for="${f.name}"></p>`;
  if (f.type === 'radio') {
    const def = defaultValue(f);
    return `<fieldset class="field"${show}${hidden}>
                <legend class="field-label mb-2">${esc(f.label)}</legend>
                <div class="segmented">${f.options.map(([v, l]) => `<label><input type="radio" name="${f.name}" value="${esc(v)}"${v === def ? ' checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>
                ${hint}${error}
              </fieldset>`;
  }
  let control;
  if (f.type === 'select') {
    control = `<select id="${id}" name="${f.name}" class="select" aria-describedby="${describedBy}">${f.options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === defaultValue(f) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  } else if (f.type === 'textarea') {
    control = `<textarea id="${id}" name="${f.name}" class="input" rows="${f.rows || 4}" spellcheck="false" autocomplete="off" placeholder="${esc(f.placeholder)}" aria-describedby="${describedBy}"></textarea>`;
  } else {
    const mode = f.type === 'text' ? '' : f.inputmode ? ` inputmode="${f.inputmode}"` : f.signed === false ? ' inputmode="decimal"' : '';
    const mono = f.type === 'text' ? ' font-mono' : '';
    control = `<input id="${id}" name="${f.name}" class="input${mono}" type="text"${mode} autocomplete="off" spellcheck="false" enterkeyhint="go" placeholder="${esc(f.placeholder)}" aria-describedby="${describedBy}">`;
    if (f.affix || f.suffix) {
      control = `<div class="input-affix">${control}<span class="affix"${f.affix ? ` data-unit-affix="${f.affix}"` : ''}>${f.suffix ? esc(f.suffix) : ''}</span></div>`;
    }
  }
  return `<div class="field"${show}${hidden}>
                <label class="field-label" for="${id}">${esc(f.label)}</label>
                ${control}
                ${hint}${error}
              </div>`;
}

export function renderForm(calc) {
  const fields = calc.fields;
  const blocks = [];
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    if (f.row) {
      const group = [f];
      while (fields[i + 1] && fields[i + 1].row === f.row) group.push(fields[++i]);
      const show = f.rowShowWhen ? (() => { const [k, l] = Object.entries(f.rowShowWhen)[0]; const ctrl = fields.find((x) => x.name === k); return ` data-show-when="${k}=${l.join('|')}"${ctrl && !l.includes(defaultValue(ctrl)) ? ' hidden' : ''}`; })() : '';
      blocks.push(`<div class="field-row mt-4"${show}>${group.map((g) => renderField(g, fields)).join('')}</div>`);
    } else {
      blocks.push(`<div class="mt-4">${renderField(f, fields)}</div>`);
    }
  }
  const examples = calc.examples || [];
  const more = examples.length > 1
    ? `<div class="example-row"><span>More examples:</span>${examples.slice(1).map((e, i) => `<button type="button" class="chip" data-example-index="${i + 1}">${esc(e.label)}</button>`).join('')}</div>`
    : '';
  return `<form id="calc-form" class="panel-body" novalidate>
            ${blocks.join('\n            ')}
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Calculate</button>
              <button type="reset" class="btn btn-secondary">Clear</button>
              ${examples.length ? `<button type="button" class="btn btn-ghost" data-load-example title="${esc(examples[0].label)}">Worked example</button>` : ''}
            </div>
            ${more}
          </form>`;
}

/** "Explore" and "Try it" panels, only for calculators whose module defines them. */
export function renderLearn(calc) {
  if (!calc.explore && !calc.practice) return '';
  const panel = (key, kicker, title, body) => `<div class="panel learn-panel" id="${key}">
          <div class="panel-head"><div><p class="learn-kicker">${kicker}</p><h3 class="panel-title">${esc(title)}</h3></div></div>
          <div class="panel-body" data-${key}-root><p class="text-sm text-slate-500">${body}</p></div>
        </div>`;
  const parts = [];
  if (calc.explore) parts.push(panel('explore', 'Explore', calc.explore.title, 'The interactive explorer needs JavaScript.'));
  if (calc.practice) parts.push(panel('practice', 'Try it', calc.practice.title || 'Practice problem', 'Practice problems need JavaScript.'));
  return `
    <section class="container-page learn-shell" aria-labelledby="learn-h">
      <h2 id="learn-h" class="section-title">Explore and practise</h2>
      <p class="section-sub">${calc.explore ? 'Change the values and watch the picture respond. ' : ''}${calc.practice ? 'Then test yourself on a fresh problem — use a hint if you get stuck.' : ''}</p>
      <div class="learn-grid${parts.length === 1 ? ' is-single' : ''}">
        ${parts.join('\n        ')}
      </div>
    </section>
`;
}

export function renderCalculatorPage({ entry, calc, content, category, related, siteUrl }) {
  const url = `${siteUrl}/${entry.url}`;
  const toc = [...content.matchAll(/<h2 id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => [m[1], m[2].replace(/<[^>]+>/g, '').replace(/\\\(|\\\)/g, '')]);
  toc.push(['related', 'Related calculators']);
  const relatedCards = related.map((r) => `<li><a class="related-card" href="../${r.id}/"><strong>${esc(r.name)}</strong><span>${esc(r.summary)}</span></a></li>`).join('\n            ');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- Generated by tools/build.mjs from data/calculators.json, content/calculators/${entry.id}.html and assets/js/calculators/${entry.id}.js. Edit those files, not this one. -->
  <title>${esc(entry.title)}</title>
  <meta name="description" content="${esc(entry.description)}">
  <link rel="canonical" href="${url}">
  <meta name="robots" content="index, follow">
  <meta name="dcterms.modified" content="${entry.updated}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Interactive Math &amp; Engineering Solver Hub">
  <meta property="og:title" content="${esc(entry.name)}">
  <meta property="og:description" content="${esc(entry.summary)}">
  <meta property="og:url" content="${url}">
  <meta name="twitter:card" content="summary_large_image">
  <!-- build:schema calculator -->
  <!-- /build:schema -->
  <!-- build:head math -->
  <!-- /build:head -->
</head>
<body data-calc="${entry.id}">
  <!-- build:header -->
  <!-- /build:header -->

  <main id="main">
    <aside class="ad-slot container-page" data-ad-slot-key="header" aria-label="Advertisement"></aside>

    <div class="container-page pt-6">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li><a href="../../">Home</a></li>
          <li><a href="../">Calculators</a></li>
          <li><span aria-current="page">${esc(entry.shortName)}</span></li>
        </ol>
      </nav>

      <header class="mt-5 mb-7">
        <a class="eyebrow" href="../#${category.id}">${esc(category.name)}</a>
        <h1 class="page-title mt-2">${esc(entry.name)}</h1>
        <p class="lead mt-3">${entry.lead}</p>
      </header>

      <noscript><div class="alert alert-warn mb-6">The interactive calculator needs JavaScript. The formulas and worked example below work without it.</div></noscript>

      <section class="calc-shell" aria-label="${esc(entry.name)}">
        <div class="panel">
          <div class="panel-head"><h2 class="panel-title">Enter values</h2></div>
          ${renderForm(calc)}
        </div>

        <div class="panel">
          <div class="panel-head">
            <h2 class="panel-title">Results</h2>
            <button type="button" class="btn btn-secondary btn-sm" data-copy-all hidden>Copy all results</button>
          </div>
          <div class="panel-body">
            <div id="calc-output" class="calc-output">
              <div class="results-placeholder">
                <span class="big-glyph" aria-hidden="true">${esc(category.glyph)}</span>
                <p>Enter your values and press <strong>Calculate</strong>.</p>
                <p class="text-sm">Or press <strong>Worked example</strong> to see a complete solution.</p>
              </div>
            </div>
            <p id="calc-status" class="sr-only" role="status" aria-live="polite"></p>
          </div>
        </div>
      </section>
    </div>

${renderLearn(calc)}
    <aside class="ad-slot container-page" data-ad-slot-key="afterCalculator" aria-label="Advertisement"></aside>

    <div class="container-page mt-12 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
      <aside class="toc-aside hidden lg:block">
        <nav class="toc sticky top-24" aria-label="On this page" data-toc>
          <p class="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">On this page</p>
          <ol>
            ${toc.map(([id, label]) => `<li><a href="#${id}">${label}</a></li>`).join('\n            ')}
          </ol>
        </nav>
      </aside>

      <article class="prose-content">
${content.trim()}

        <aside class="ad-slot" data-ad-slot-key="bottom" aria-label="Advertisement"></aside>

        <section id="related" aria-labelledby="related-h">
          <h2 id="related-h">Related calculators</h2>
          <ul class="related-grid">
            ${relatedCards}
          </ul>
        </section>
      </article>
    </div>
  </main>

  <!-- build:footer -->
  <!-- /build:footer -->
  <script defer src="../../assets/js/bundles/${entry.id}.js"></script>
</body>
</html>
`;
}
