/**
 * Shared calculator UI helpers: math rendering, result cards, step lists,
 * validation messages, copy buttons and shareable URLs.
 * Calculator modules return data; these helpers turn it into accessible HTML.
 */

export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Render TeX to HTML. Uses window.SolverMath (assets/js/math-render.js), which produces
 * MathML via the self-hosted KaTeX library, or readable plain text if that is unavailable.
 * Raw LaTeX is never shown.
 */
export function tex(source, display = false) {
  if (window.SolverMath) return window.SolverMath.tex(source, display);
  return `<span class="math-fallback">${escapeHtml(source)}</span>`;
}

/**
 * Result card.
 * @param {object} o
 * @param {string} o.label     Card heading, e.g. "Volume"
 * @param {string} [o.value]   Main value as plain text, e.g. "205.251786 cm³"
 * @param {string} [o.valueTex] Main value as TeX (used instead of value when present)
 * @param {string} [o.exactTex] Exact symbolic form in TeX
 * @param {boolean} [o.approx] Whether the main value is rounded
 * @param {boolean} [o.primary]
 * @param {string} [o.copy]    Text placed on the clipboard
 */
export function resultCard(o) {
  const tag = o.approx === undefined ? '' : o.approx
    ? '<span class="result-tag tag-approx" title="Rounded decimal approximation">≈ approx.</span>'
    : '<span class="result-tag tag-exact" title="Exact value">exact</span>';
  const exact = o.exactTex ? `<div class="result-exact">Exact: ${tex(o.exactTex)}</div>` : '';
  const copy = o.copy ? `<button type="button" class="copy-btn" data-copy="${escapeHtml(o.copy)}" aria-label="Copy ${escapeHtml(o.label)}">Copy</button>` : '';
  const main = o.valueTex !== undefined ? tex(o.valueTex) : escapeHtml(o.value);
  return `<div class="result-card${o.primary ? ' is-primary' : ''}">
      <div class="result-label">${escapeHtml(o.label)}</div>${copy}
      <div class="result-value">${o.approx && o.valueTex === undefined ? '≈ ' : ''}${main}${tag}</div>
      ${exact}
    </div>`;
}

/** Highlighted final answer. lines: TeX strings (rendered as display math) or {text}. */
export function finalAnswerBlock(final) {
  if (!final) return '';
  const lines = [].concat(final.texLines || (final.tex ? [final.tex] : []));
  const body = lines.map((l) => `<div class="final-math">${tex(l, true)}</div>`).join('')
    + (final.text ? `<p class="final-text">${escapeHtml(final.text)}</p>` : '');
  return `<section class="final-answer" aria-label="Final answer">
      <p class="final-label">${escapeHtml(final.label || 'Answer')}</p>${body}
    </section>`;
}

/**
 * Numbered step-by-step solution with a show/hide control.
 * steps: [{ title, text?, tex?, texLines?, note? }] — text is ordinary prose,
 * tex/texLines are equations shown one per line.
 */
export function stepsBlock(steps, { open = true, title = 'Step-by-step solution' } = {}) {
  const items = steps.map((s) => {
    const lines = s.texLines || (s.tex ? [s.tex] : []);
    const text = s.text ? `<p class="step-text">${escapeHtml(s.text)}</p>` : '';
    const math = lines.map((l) => `<div class="step-math">${tex(l, true)}</div>`).join('');
    const note = s.note ? `<p class="step-note">${s.noteHtml ? s.note : escapeHtml(s.note)}</p>` : '';
    return `<li class="step"><div class="min-w-0"><div class="step-title">${escapeHtml(s.title)}</div>${text}${math}${note}</div></li>`;
  }).join('');
  return `<details class="steps"${open ? ' open' : ''}>
      <summary><span>${escapeHtml(title)} <span class="steps-count">(${steps.length} step${steps.length === 1 ? '' : 's'})</span></span><span class="steps-toggle" aria-hidden="true"></span></summary>
      <ol class="steps-list">${items}</ol>
    </details>`;
}

/** Simple accessible table. rows: arrays of cells; a cell may be {tex} for math. */
export function tableBlock(t) {
  const cell = (c) => (c && typeof c === 'object' && c.tex !== undefined ? tex(c.tex) : escapeHtml(c));
  return `<div class="table-wrap mt-4"><table class="data-table">
      ${t.caption ? `<caption>${escapeHtml(t.caption)}</caption>` : ''}
      <thead><tr>${t.headers.map((h) => `<th scope="col">${cell(h)}</th>`).join('')}</tr></thead>
      <tbody>${t.rows.map((r) => `<tr>${r.map((c) => `<td>${cell(c)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
}

export function alertBlock(kind, title, items = []) {
  const list = items.length ? `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>` : '';
  return `<div class="alert alert-${kind}" role="${kind === 'error' ? 'alert' : 'note'}"><p class="alert-title">${escapeHtml(title)}</p>${list}</div>`;
}

export function notesBlock(notes) {
  if (!notes || !notes.length) return '';
  return `<div class="notes">${notes.map((n) => `<div class="alert alert-${n.kind || 'info'}">${escapeHtml(n.text)}</div>`).join('')}</div>`;
}

/** Mark invalid fields and fill their inline error messages. errors: [{ field, message }] */
export function showFieldErrors(form, errors, { focus = true } = {}) {
  clearFieldErrors(form);
  for (const err of errors) {
    if (!err.field) continue;
    for (const name of [].concat(err.field)) {
      const input = form.elements.namedItem(name);
      const box = form.querySelector(`[data-error-for="${name}"]`);
      if (input && input.setAttribute) input.setAttribute('aria-invalid', 'true');
      if (box && !box.textContent) box.textContent = err.message;
    }
  }
  const first = errors.find((e) => e.field);
  if (first && focus) {
    const el = form.elements.namedItem([].concat(first.field)[0]);
    if (el && el.focus) el.focus({ preventScroll: false });
  }
}

export function clearFieldErrors(form) {
  form.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));
  form.querySelectorAll('[data-error-for]').forEach((el) => { el.textContent = ''; });
}

/** Read named inputs as raw strings. */
export function readForm(form, names) {
  const out = {};
  for (const n of names) {
    const el = form.elements.namedItem(n);
    if (!el) continue;
    out[n] = el.value !== undefined ? el.value : '';
  }
  return out;
}

export function fillForm(form, values) {
  for (const [k, v] of Object.entries(values)) {
    const el = form.elements.namedItem(k);
    if (!el) continue;
    if (el instanceof RadioNodeList) {
      for (const r of el) r.checked = r.value === v;
      el.value = v;
    } else {
      el.value = v;
    }
  }
}

/** Keep the inputs in the address bar so a solution can be bookmarked or shared. */
export function writeUrlState(values) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(values)) if (v !== '' && v !== undefined) params.set(k, v);
  const url = `${location.pathname}?${params.toString()}${location.hash}`;
  history.replaceState(null, '', url);
}

export function clearUrlState() {
  history.replaceState(null, '', location.pathname + location.hash);
}

export function readUrlState(names) {
  const params = new URLSearchParams(location.search);
  const out = {};
  let found = false;
  for (const n of names) {
    if (params.has(n)) { out[n] = params.get(n).slice(0, 40); found = true; }
  }
  return found ? out : null;
}

/** Delegated handler for every [data-copy] button inside a container. */
export function enableCopyButtons(container) {
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    const text = btn.getAttribute('data-copy');
    const done = () => {
      const label = btn.textContent;
      btn.classList.add('is-copied');
      btn.textContent = 'Copied';
      setTimeout(() => { btn.classList.remove('is-copied'); btn.textContent = label; }, 1500);
      window.SolverHub && window.SolverHub.toast('Copied to clipboard');
    };
    const hub = window.SolverHub;
    const p = hub ? hub.copyText(text) : navigator.clipboard.writeText(text);
    p.then(done, () => hub && hub.toast('Copy failed — select the text and copy it manually'));
  });
}

/**
 * Wire a calculator form: Calculate, Reset, optional example button, URL state.
 * @param {object} o
 * @param {HTMLFormElement} o.form
 * @param {HTMLElement} o.output
 * @param {string[]} o.fields          Input names to read / sync with the URL
 * @param {(values: object) => void} o.onCalculate
 * @param {() => void} [o.onReset]
 * @param {object} [o.example]         Values for the "Load example" button
 * @param {(values: object) => object} [o.urlFilter] Choose which values go into the shareable URL
 */
export function wireCalculator(o) {
  const { form, output, fields } = o;
  const run = () => {
    const values = readForm(form, fields);
    const ok = o.onCalculate(values);
    if (ok) writeUrlState(o.urlFilter ? o.urlFilter(values) : values);
    output.classList.remove('fade-in');
    void output.offsetWidth; // restart the animation
    output.classList.add('fade-in');
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  form.addEventListener('reset', () => {
    setTimeout(() => {
      clearFieldErrors(form);
      clearUrlState();
      if (o.onReset) o.onReset();
    }, 0);
  });
  const exampleBtn = form.querySelector('[data-load-example]');
  if (exampleBtn && o.example) {
    exampleBtn.addEventListener('click', () => {
      fillForm(form, o.example);
      form.dispatchEvent(new Event('change'));
      run();
    });
  }
  enableCopyButtons(output);
  const initial = readUrlState(fields);
  if (initial) {
    fillForm(form, initial);
    form.dispatchEvent(new Event('change'));
    run();
  }
  return { run };
}
