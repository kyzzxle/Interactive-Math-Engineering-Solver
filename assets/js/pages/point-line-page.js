/* Distance from a point to a line — page controller and graph. */
import { solvePointLine, fractionTex, fractionText } from '../calculators/point-line-distance.js';
import { formatNumber, isDisplayExact } from '../lib/format.js';
import { radicalTex, radicalText, isRational } from '../lib/exact.js';
import { parseDecimal } from '../lib/parse.js';
import { mountExplorer, mountPractice } from '../lib/learn.js';
import { pointLineExplore, pointLinePractice } from '../explore/analytic-practice.js';
import { resultCard, stepsBlock, alertBlock, notesBlock, showFieldErrors, clearFieldErrors, wireCalculator, tex, escapeHtml } from '../lib/ui.js';

const form = document.getElementById('pl-form');
const output = document.getElementById('pl-output');
const status = document.getElementById('pl-status');
const figure = document.getElementById('pl-figure');
const svg = document.getElementById('pl-graph');
const preview = document.getElementById('pl-preview');
const copyAllBtn = document.querySelector('[data-copy-all]');
const placeholderHtml = output.innerHTML;
const FIELDS = ['x1', 'y1', 'A', 'B', 'C'];

// ------------------------------------------------------------ live preview of the typed line
function termText(coef, symbol, first) {
  if (coef === 0) return '';
  const sign = coef < 0 ? '−' : first ? '' : '+';
  const abs = Math.abs(coef);
  const body = symbol ? `${abs === 1 ? '' : formatNumber(abs)}${symbol}` : formatNumber(abs);
  return first ? `${sign}${body}` : ` ${sign} ${body}`;
}
function updatePreview() {
  const vals = ['A', 'B', 'C'].map((k) => parseDecimal(form.elements.namedItem(k).value, k));
  if (!vals.every((p) => p.ok)) { preview.textContent = 'Ax + By + C = 0'; return; }
  const [A, B, C] = vals.map((p) => p.value);
  let s = '';
  s += termText(A, 'x', s === '');
  s += termText(B, 'y', s === '');
  s += termText(C, '', s === '');
  preview.textContent = `${s || '0'} = 0`;
}
form.addEventListener('input', updatePreview);

// ------------------------------------------------------------ graph
const NS = 'http://www.w3.org/2000/svg';
function node(name, attrs, text) {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text !== undefined) n.textContent = text;
  return n;
}
function niceStep(range) {
  const raw = range / 8;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

function drawGraph(v) {
  const W = 360, H = 300, pad = 24;
  const { x1, y1, A, B, foot, distance } = v;
  const cxw = (x1 + foot.x) / 2;
  const cyw = (y1 + foot.y) / 2;
  let half = Math.max(distance * 0.95, 2.5, Math.abs(x1 - foot.x) * 0.75, Math.abs(y1 - foot.y) * 0.75);
  // Show the origin too when it is reasonably close, so the axes give context.
  const toOrigin = Math.max(Math.abs(cxw), Math.abs(cyw));
  if (toOrigin < half * 3) half = Math.max(half, toOrigin * 1.15);
  const aspect = (W - 2 * pad) / (H - 2 * pad);
  const xmin = cxw - half * aspect, xmax = cxw + half * aspect;
  const ymin = cyw - half, ymax = cyw + half;
  const sx = (x) => pad + ((x - xmin) / (xmax - xmin)) * (W - 2 * pad);
  const sy = (y) => H - pad - ((y - ymin) / (ymax - ymin)) * (H - 2 * pad);

  const keep = svg.querySelectorAll('title, desc');
  svg.replaceChildren(...keep);
  const g = node('g', {});

  // grid
  const step = niceStep(ymax - ymin);
  for (let x = Math.ceil(xmin / step) * step; x <= xmax; x += step) g.append(node('line', { class: 'd-grid', x1: sx(x), y1: pad, x2: sx(x), y2: H - pad }));
  for (let y = Math.ceil(ymin / step) * step; y <= ymax; y += step) g.append(node('line', { class: 'd-grid', x1: pad, y1: sy(y), x2: W - pad, y2: sy(y) }));
  // axes
  if (xmin < 0 && xmax > 0) g.append(node('line', { class: 'd-axis', x1: sx(0), y1: pad, x2: sx(0), y2: H - pad }));
  if (ymin < 0 && ymax > 0) g.append(node('line', { class: 'd-axis', x1: pad, y1: sy(0), x2: W - pad, y2: sy(0) }));
  g.append(node('text', { class: 'd-text-muted', x: pad, y: H - 6 }, `x: ${formatNumber(xmin, { decimals: 2 })} to ${formatNumber(xmax, { decimals: 2 })}`));
  g.append(node('text', { class: 'd-text-muted', x: W - pad, y: H - 6, 'text-anchor': 'end' }, `grid step ${formatNumber(step, { decimals: 4 })}`));

  // the line, clipped to the view box: points F + t·(−B, A)
  const dx = -B, dy = A;
  let tMin = -Infinity, tMax = Infinity;
  for (const [p, d, lo, hi] of [[foot.x, dx, xmin, xmax], [foot.y, dy, ymin, ymax]]) {
    if (d === 0) continue;
    const a = (lo - p) / d, b = (hi - p) / d;
    tMin = Math.max(tMin, Math.min(a, b));
    tMax = Math.min(tMax, Math.max(a, b));
  }
  if (tMin < tMax) {
    g.append(node('line', { class: 'd-line', x1: sx(foot.x + dx * tMin), y1: sy(foot.y + dy * tMin), x2: sx(foot.x + dx * tMax), y2: sy(foot.y + dy * tMax) }));
  }

  // perpendicular segment and right-angle marker
  if (distance > 0) {
    g.append(node('line', { class: 'd-perp', x1: sx(x1), y1: sy(y1), x2: sx(foot.x), y2: sy(foot.y) }));
    const ux = sx(foot.x + dx) - sx(foot.x), uy = sy(foot.y + dy) - sy(foot.y);
    const ul = Math.hypot(ux, uy) || 1;
    const px = sx(x1) - sx(foot.x), py = sy(y1) - sy(foot.y);
    const pl = Math.hypot(px, py) || 1;
    const m = Math.min(10, pl / 2);
    const a = [sx(foot.x) + (ux / ul) * m, sy(foot.y) + (uy / ul) * m];
    const b = [sx(foot.x) + (px / pl) * m, sy(foot.y) + (py / pl) * m];
    g.append(node('path', { class: 'd-dim', d: `M ${a[0]} ${a[1]} L ${a[0] + (px / pl) * m} ${a[1] + (py / pl) * m} L ${b[0]} ${b[1]}` }));
    g.append(node('text', { class: 'd-text', x: (sx(x1) + sx(foot.x)) / 2 + 8, y: (sy(y1) + sy(foot.y)) / 2 }, 'd'));
  }
  g.append(node('circle', { class: 'd-foot', cx: sx(foot.x), cy: sy(foot.y), r: 4.5 }));
  g.append(node('circle', { class: 'd-point', cx: sx(x1), cy: sy(y1), r: 5.5 }));
  const lx = Math.min(sx(x1) + 8, W - 110);
  g.append(node('text', { class: 'd-text', x: lx, y: sy(y1) - 9 }, `P(${formatNumber(x1, { decimals: 3 })}, ${formatNumber(y1, { decimals: 3 })})`));
  if (distance > 0) g.append(node('text', { class: 'd-text', x: Math.min(sx(foot.x) + 8, W - 30), y: sy(foot.y) + 18 }, 'F'));
  svg.append(g);
  svg.querySelector('desc').textContent = `The line ${preview.textContent} with the point P(${formatNumber(x1)}, ${formatNumber(y1)}) and the foot of the perpendicular F(${formatNumber(foot.x)}, ${formatNumber(foot.y)}). The distance is about ${formatNumber(distance)}.`;
  figure.hidden = false;
}

// ------------------------------------------------------------ results
function show(values) {
  updatePreview();
  const res = solvePointLine(values);
  if (!res.ok) {
    showFieldErrors(form, res.errors);
    output.innerHTML = alertBlock('error', 'Please check your inputs', [...new Set(res.errors.map((e) => e.message))]);
    status.textContent = `Error: ${res.errors[0].message}`;
    copyAllBtn.hidden = true;
    figure.hidden = true;
    return false;
  }
  clearFieldErrors(form);
  const v = res.values;
  const ex = res.exact;
  const lines = [];
  const cards = [];

  const dApprox = !isDisplayExact(v.distance);
  const dExactTex = ex && !isRational(ex.distance) ? radicalTex(ex.distance) : ex && ex.distance.den !== 1 ? radicalTex(ex.distance) : null;
  const dExactText = ex ? radicalText(ex.distance) : null;
  const dLine = `Distance d: ${dExactText && dExactText !== formatNumber(v.distance) ? `${dExactText} ${dApprox ? '≈' : '='} ` : dApprox ? '≈ ' : ''}${formatNumber(v.distance)}`;
  lines.push(dLine);
  cards.push(resultCard({ label: 'Distance d', value: formatNumber(v.distance), exactTex: dExactTex, approx: dApprox, primary: true, copy: dLine }));

  const numLine = `Numerator |Ax₁ + By₁ + C| = ${formatNumber(Math.abs(v.N))}`;
  lines.push(numLine);
  cards.push(resultCard({ label: 'Numerator |Ax₁ + By₁ + C|', value: formatNumber(Math.abs(v.N)), approx: !isDisplayExact(Math.abs(v.N)), copy: numLine }));

  const rootApprox = !isDisplayExact(v.root);
  const rootExactTex = ex && !isRational(ex.sqrtD) ? radicalTex(ex.sqrtD) : null;
  const rootLine = `Denominator √(A² + B²) ${rootExactTex ? `= ${radicalText(ex.sqrtD)} ` : ''}${rootApprox ? '≈' : '='} ${formatNumber(v.root)}`;
  lines.push(rootLine);
  cards.push(resultCard({ label: 'Denominator √(A² + B²)', value: formatNumber(v.root), exactTex: rootExactTex, approx: rootApprox, copy: rootLine }));

  const fApprox = !isDisplayExact(v.foot.x) || !isDisplayExact(v.foot.y);
  const fx = ex && ex.foot;
  const fExactTex = fx && (fx.x[1] !== 1 || fx.y[1] !== 1) ? `\\left(${fractionTex(fx.x)},\\ ${fractionTex(fx.y)}\\right)` : null;
  const fText = `(${formatNumber(v.foot.x)}, ${formatNumber(v.foot.y)})`;
  const fLine = `Foot of perpendicular F ${fExactTex ? `= (${fractionText(fx.x)}, ${fractionText(fx.y)}) ` : ''}${fApprox ? '≈' : '='} ${fText}`;
  lines.push(fLine);
  cards.push(resultCard({ label: 'Closest point on the line F', value: fText, exactTex: fExactTex, approx: fApprox, copy: fLine }));

  const lineInfo = `<p class="mt-3 text-sm text-slate-600 dark:text-slate-400">In slope-intercept terms, the line is ${escapeHtml(res.line.text)}.</p>`;
  const formulas = `<div class="formula-box mt-4" aria-label="Formula used">
      <p class="text-sm font-semibold">Formula used</p>
      ${tex('d = \\frac{|Ax_1 + By_1 + C|}{\\sqrt{A^2 + B^2}}', true)}
    </div>`;
  output.innerHTML = `<div class="result-grid">${cards.join('')}</div>
    ${lineInfo}
    ${notesBlock(res.notes)}
    ${formulas}
    ${stepsBlock(res.steps)}`;
  copyAllBtn.hidden = false;
  copyAllBtn.setAttribute('data-copy', [`Point (${formatNumber(v.x1)}, ${formatNumber(v.y1)}), line ${preview.textContent}`, ...lines].join('\n'));
  status.textContent = `Results updated. The distance is ${dApprox ? 'approximately ' : ''}${formatNumber(v.distance)}.`;
  output.querySelector('.result-grid').after(figure); // show the graph right under the numbers
  drawGraph(v);
  return true;
}

wireCalculator({
  form,
  output,
  fields: FIELDS,
  example: { x1: '4', y1: '-1', A: '3', B: '4', C: '-2' },
  onCalculate: show,
  onReset: () => {
    output.innerHTML = placeholderHtml;
    status.textContent = 'Form cleared.';
    copyAllBtn.hidden = true;
    figure.hidden = true;
    updatePreview();
  },
});

copyAllBtn.addEventListener('click', () => {
  const text = copyAllBtn.getAttribute('data-copy') || '';
  window.SolverHub.copyText(text).then(() => window.SolverHub.toast('All results copied'), () => window.SolverHub.toast('Copy failed'));
});

// ------------------------------------------------------------ explore and practise
mountExplorer(document.querySelector('[data-explore-root]'), pointLineExplore);
mountPractice(document.querySelector('[data-practice-root]'), pointLinePractice);
