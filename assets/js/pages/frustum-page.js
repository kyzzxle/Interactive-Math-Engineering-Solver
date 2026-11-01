/* Frustum of a cone — page controller (connects the form, the math module and the output). */
import { solveFrustum, exactTex, exactText } from '../calculators/frustum.js';
import { formatNumber, unitLabels, isDisplayExact } from '../lib/format.js';
import { isRational } from '../lib/exact.js';
import { resultCard, stepsBlock, alertBlock, notesBlock, showFieldErrors, clearFieldErrors, wireCalculator, tex } from '../lib/ui.js';

const form = document.getElementById('frustum-form');
const output = document.getElementById('frustum-output');
const status = document.getElementById('frustum-status');
const svg = document.getElementById('frustum-diagram');
const caption = document.getElementById('frustum-diagram-caption');
const copyAllBtn = document.querySelector('[data-copy-all]');
const placeholderHtml = output.innerHTML;
const FIELDS = ['r', 'R', 'known', 'h', 's', 'unit'];

// ------------------------------------------------------------ "which height" toggle and unit suffixes
function syncKnown() {
  const known = form.elements.namedItem('known').value || 'h';
  form.querySelectorAll('[data-known-field]').forEach((el) => {
    el.hidden = el.getAttribute('data-known-field') !== known;
  });
}
function syncUnits() {
  const unit = form.elements.namedItem('unit').value;
  form.querySelectorAll('[data-unit-affix]').forEach((el) => { el.textContent = unit; });
}
form.addEventListener('change', () => { syncKnown(); syncUnits(); });
syncKnown();
syncUnits();

// ------------------------------------------------------------ diagram
const SVG_NS = 'http://www.w3.org/2000/svg';
function el(name, attrs, text) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Draw a side view. With values it is drawn to scale (within limits); otherwise a generic sketch. */
function drawDiagram(v) {
  const title = svg.querySelector('title');
  svg.replaceChildren(title);
  const W = 320, H = 230, cx = 150, base = 190;
  let r = 2, R = 3, h = 2.4, toScale = false;
  if (v) { r = v.r; R = v.R; h = v.h; toScale = true; }
  const scale = Math.min(100 / R, 150 / h);
  let Rp = R * scale, rp = r * scale, hp = h * scale;
  // Keep extreme shapes readable; then the sketch is no longer to scale.
  if (hp < 28) { hp = 28; toScale = false; }
  if (Rp < 30) { Rp = 30; rp = Math.min(rp, Rp); toScale = false; }
  const top = base - hp;
  const ry = Math.max(6, Rp * 0.16);
  const rty = Math.max(3, rp * 0.16);

  const g = el('g', {});
  // back half of the bottom ellipse (hidden edge), body, front edges
  g.append(el('path', { class: 'd-hidden', d: `M ${cx - Rp} ${base} A ${Rp} ${ry} 0 0 1 ${cx + Rp} ${base}` }));
  g.append(el('path', { class: 'd-solid', d: `M ${cx - Rp} ${base} L ${cx - rp} ${top} L ${cx + rp} ${top} L ${cx + Rp} ${base} A ${Rp} ${ry} 0 0 1 ${cx - Rp} ${base} Z` }));
  if (rp > 0.5) g.append(el('ellipse', { class: 'd-solid-face', cx, cy: top, rx: rp, ry: rty }));
  // axis / height
  g.append(el('line', { class: 'd-hidden', x1: cx, y1: base, x2: cx, y2: top }));
  g.append(el('text', { class: 'd-text', x: cx + 6, y: (base + top) / 2 + 4 }, 'h'));
  // radii
  g.append(el('line', { class: 'd-dim', x1: cx, y1: base, x2: cx + Rp, y2: base }));
  g.append(el('text', { class: 'd-text', x: cx + Rp / 2 - 4, y: base + ry + 16 }, 'R'));
  if (rp > 0.5) {
    g.append(el('line', { class: 'd-dim', x1: cx, y1: top, x2: cx + rp, y2: top }));
    g.append(el('text', { class: 'd-text', x: cx + rp / 2 - 3, y: top - rty - 6 }, 'r'));
  } else {
    g.append(el('text', { class: 'd-text', x: cx + 6, y: top - 6 }, 'r = 0'));
  }
  // slant height label along the right side
  const mx = (cx + rp + cx + Rp) / 2, my = (top + base) / 2;
  g.append(el('text', { class: 'd-text', x: mx + 10, y: my }, 's'));
  // right-triangle hint: vertical from top rim down to base
  g.append(el('line', { class: 'd-dim', 'stroke-dasharray': '3 3', x1: cx + rp, y1: top, x2: cx + rp, y2: base, opacity: 0.6 }));
  if (v && v.R > v.r) g.append(el('text', { class: 'd-text-muted', x: cx + rp + 4, y: base - 6 }, 'R − r'));
  svg.append(g);
  // Crop the view to the drawing so flat frustums do not leave a large empty band.
  const y0 = Math.max(0, top - rty - 24);
  svg.setAttribute('viewBox', `0 ${y0} ${W} ${Math.min(H, base + ry + 26) - y0}`);
  caption.textContent = v
    ? (toScale ? 'Side view drawn to scale from your inputs.' : 'Side view based on your inputs (proportions adjusted so the labels stay readable).')
    : 'Labelled sketch of a frustum (not to scale).';
}
drawDiagram(null);

// ------------------------------------------------------------ results
function show(values) {
  const res = solveFrustum(values);
  if (!res.ok) {
    showFieldErrors(form, res.errors);
    output.innerHTML = alertBlock('error', 'Please check your inputs', [...new Set(res.errors.map((e) => e.message))]);
    status.textContent = `Error: ${res.errors[0].message}`;
    copyAllBtn.hidden = true;
    drawDiagram(null);
    return false;
  }
  clearFieldErrors(form);
  const v = res.values;
  const ex = res.exact;
  const u = unitLabels(values.unit);
  const len = (x) => `${formatNumber(x)} ${u.length}`;
  const area = (x) => `${formatNumber(x)} ${u.area}`;
  const vol = (x) => `${formatNumber(x)} ${u.volume}`;

  const cards = [];
  const copyLines = [];
  const add = (label, valueText, x, exprKey, withPi, opts = {}) => {
    const expr = ex ? ex[exprKey] : null;
    const exactT = expr && (withPi || !isRational(expr)) ? exactTex(expr, withPi) : null;
    const exactPlain = expr && (withPi || !isRational(expr)) ? exactText(expr, withPi) : null;
    const approx = withPi || !isDisplayExact(x); // π multiples are irrational, so their decimals are always rounded
    const line = `${label}: ${exactPlain ? `${exactPlain} ${approx ? '≈' : '='} ` : approx ? '≈ ' : ''}${valueText}`;
    copyLines.push(line);
    cards.push(resultCard({ label, value: valueText, exactTex: exactT, approx, primary: opts.primary, copy: line }));
  };

  if (v.known === 'h') add('Slant height s', len(v.s), v.s, 's', false);
  else add('Perpendicular height h', len(v.h), v.h, 'h', false);
  add('Volume V', vol(v.volume), v.volume, 'volume', true, { primary: true });
  add('Lateral surface area', area(v.lsa), v.lsa, 'lsa', true, { primary: true });
  add('Total surface area', area(v.tsa), v.tsa, 'tsa', true);
  add('Bottom base area πR²', area(v.bottom), v.bottom, 'bottom', true);
  if (v.r > 0) add('Top base area πr²', area(v.top), v.top, 'top', true);

  const formulas = `<div class="formula-box mt-4" aria-label="Formulas used">
      <p class="text-sm font-semibold">Formulas used</p>
      ${tex(v.known === 'h' ? 's = \\sqrt{h^2 + (R - r)^2}' : 'h = \\sqrt{s^2 - (R - r)^2}', true)}
      ${tex('LSA = \\pi (R + r)s \\qquad TSA = LSA + \\pi R^2 + \\pi r^2', true)}
      ${tex('V = \\frac{\\pi h}{3}\\left(R^2 + Rr + r^2\\right)', true)}
    </div>`;
  const exactNote = ex
    ? '<p class="mt-3 text-sm text-slate-500 dark:text-slate-400">"Exact" values are written in terms of π and square roots. Decimals are rounded to 6 decimal places.</p>'
    : '<p class="mt-3 text-sm text-slate-500 dark:text-slate-400">Exact symbolic forms are shown only for whole numbers and decimals with up to 4 decimal places; these results are rounded to 6 decimal places.</p>';

  output.innerHTML = `<div class="result-grid">${cards.join('')}</div>
    ${exactNote}
    ${notesBlock(res.notes)}
    ${formulas}
    ${stepsBlock(res.steps)}`;
  copyAllBtn.hidden = false;
  copyAllBtn.setAttribute('data-copy', [`Frustum: r = ${len(v.r)}, R = ${len(v.R)}, ${v.known} = ${len(v.known === 'h' ? v.h : v.s)}`, ...copyLines].join('\n'));
  status.textContent = `Results updated. Volume approximately ${vol(v.volume)}, lateral surface area approximately ${area(v.lsa)}.`;
  drawDiagram(v);
  return true;
}

wireCalculator({
  form,
  output,
  fields: FIELDS,
  example: { r: '6', R: '9', known: 'h', h: '4', s: '', unit: 'cm' },
  onCalculate: show,
  // Only the height that is actually in use belongs in the shareable link.
  urlFilter: (v) => ({ ...v, [v.known === 's' ? 'h' : 's']: '' }),
  onReset: () => {
    output.innerHTML = placeholderHtml;
    status.textContent = 'Form cleared.';
    copyAllBtn.hidden = true;
    syncKnown();
    syncUnits();
    drawDiagram(null);
  },
});

copyAllBtn.addEventListener('click', () => {
  const text = copyAllBtn.getAttribute('data-copy') || '';
  window.SolverHub.copyText(text).then(() => window.SolverHub.toast('All results copied'), () => window.SolverHub.toast('Copy failed'));
});
