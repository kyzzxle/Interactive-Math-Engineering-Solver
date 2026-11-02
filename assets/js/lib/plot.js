/**
 * Graphs as SVG strings (no DOM needed, so they can be tested in Node).
 * Colours come from CSS classes in styles.css, so graphs follow light/dark mode.
 */
let uid = 0;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r2 = (v) => Math.round(v * 100) / 100;

export function niceStep(range, target = 6) {
  const raw = range / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

export function fmtTick(v, step) {
  const d = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  const s = v.toFixed(Math.min(d, 6));
  return s === '-0' ? '0' : s.replace(/\.0+$/, '');
}

/** Choose a y-range that shows the curves without letting asymptotes flatten everything. */
function autoY(opts, xmin, xmax) {
  const ys = [];
  for (const c of opts.curves || []) {
    for (let i = 0; i <= 240; i++) {
      const x = xmin + ((xmax - xmin) * i) / 240;
      const y = c.f(x);
      if (Number.isFinite(y)) ys.push(y);
    }
  }
  for (const s of opts.shade || []) {
    for (let i = 0; i <= 60; i++) { const x = s.a + ((s.b - s.a) * i) / 60; [s.f(x), s.g ? s.g(x) : 0].forEach((y) => Number.isFinite(y) && ys.push(y)); }
  }
  for (const p of opts.points || []) ys.push(p.y);
  for (const s of opts.segments || []) ys.push(s.y1, s.y2);
  for (const h of opts.hlines || []) ys.push(h.y);
  for (const c of opts.circles || []) ys.push(c.cy - c.r, c.cy + c.r);
  for (const b of opts.bars || []) ys.push(0, b.h);
  if (!ys.length) return [-1, 1];
  ys.sort((a, b) => a - b);
  let lo = ys[0], hi = ys[ys.length - 1];
  if ((opts.curves || []).length && ys.length > 40) {
    const q = (t) => ys[Math.floor(t * (ys.length - 1))];
    const iqr = q(0.95) - q(0.05);
    if (hi - lo > 8 * Math.max(iqr, 1e-9)) {
      const py = (opts.points || []).map((p) => p.y);
      lo = Math.min(q(0.05), ...py);
      hi = Math.max(q(0.95), ...py);
    }
  }
  if (opts.includeZero !== false) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.1;
  return [lo - pad, hi + pad];
}

/**
 * opts: { width, height, x: [min, max], y?: [min, max], equal?, curves: [{ f, cls }], shade: [{ f, g?, a, b, cls }],
 *         points: [{ x, y, label, cls }], segments, vlines, hlines, circles, bars: [{ x, h, w, cls }],
 *         title, desc, xLabel, yLabel, xTicks?: [{x, label}] }
 */
export function plot(opts) {
  const W = opts.width || 360, H = opts.height || 270;
  const pad = { l: 34, r: 12, t: 12, b: 26 };
  let [xmin, xmax] = opts.x;
  if (!Number.isFinite(xmin) || !Number.isFinite(xmax)) { xmin = -5; xmax = 5; }
  if (!(xmax - xmin > 1e-12 * Math.max(1, Math.abs(xmin), Math.abs(xmax)))) { const c = (xmin + xmax) / 2; xmin = c - 1; xmax = c + 1; }
  let [ymin, ymax] = opts.y || autoY(opts, xmin, xmax);
  if (!Number.isFinite(ymin) || !Number.isFinite(ymax)) { ymin = -5; ymax = 5; }
  if (!(ymax - ymin > 1e-12 * Math.max(1, Math.abs(ymin), Math.abs(ymax)))) { const c = (ymin + ymax) / 2; ymin = c - 1; ymax = c + 1; }
  const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
  if (opts.equal) {
    const sx = pw / (xmax - xmin), sy = ph / (ymax - ymin);
    if (sx > sy) { const c = (xmin + xmax) / 2, half = (pw / sy) / 2; xmin = c - half; xmax = c + half; }
    else { const c = (ymin + ymax) / 2, half = (ph / sx) / 2; ymin = c - half; ymax = c + half; }
  }
  const X = (x) => pad.l + ((x - xmin) / (xmax - xmin)) * pw;
  const Y = (y) => pad.t + ph - ((y - ymin) / (ymax - ymin)) * ph;
  const id = `clip${++uid}`;
  const out = [];
  // data-view lets interactive explorers convert pointer positions back to graph coordinates.
  out.push(`<svg class="diagram" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.title || 'Graph')}" data-view="${[xmin, xmax, ymin, ymax, pad.l, pad.t, pw, ph].map((v) => +v.toPrecision(10)).join(' ')}"><title>${esc(opts.title || 'Graph')}</title>${opts.desc ? `<desc>${esc(opts.desc)}</desc>` : ''}`);
  out.push(`<defs><clipPath id="${id}"><rect x="${pad.l}" y="${pad.t}" width="${pw}" height="${ph}"/></clipPath></defs>`);

  const xs = niceStep(xmax - xmin), ys = niceStep(ymax - ymin, 5);
  const grid = [], ticks = [];
  // Tolerances are relative to the step, and loops are capped, so tiny or huge ranges stay safe.
  for (let x = Math.ceil(xmin / xs) * xs, i = 0; x <= xmax + xs * 1e-6 && i < 60; x += xs, i++) {
    grid.push(`<line class="d-grid" x1="${r2(X(x))}" y1="${pad.t}" x2="${r2(X(x))}" y2="${pad.t + ph}"/>`);
    if (!opts.xTicks) ticks.push(`<text class="d-tick" x="${r2(X(x))}" y="${H - 8}" text-anchor="middle">${fmtTick(x, xs)}</text>`);
  }
  for (const t of opts.xTicks || []) ticks.push(`<text class="d-tick" x="${r2(X(t.x))}" y="${H - 8}" text-anchor="middle">${esc(t.label)}</text>`);
  for (let y = Math.ceil(ymin / ys) * ys, i = 0; y <= ymax + ys * 1e-6 && i < 60; y += ys, i++) {
    grid.push(`<line class="d-grid" x1="${pad.l}" y1="${r2(Y(y))}" x2="${pad.l + pw}" y2="${r2(Y(y))}"/>`);
    ticks.push(`<text class="d-tick" x="${pad.l - 4}" y="${r2(Y(y) + 3)}" text-anchor="end">${fmtTick(y, ys)}</text>`);
  }
  out.push(grid.join(''));
  if (xmin < 0 && xmax > 0) out.push(`<line class="d-axis" x1="${r2(X(0))}" y1="${pad.t}" x2="${r2(X(0))}" y2="${pad.t + ph}"/>`);
  if (ymin < 0 && ymax > 0) out.push(`<line class="d-axis" x1="${pad.l}" y1="${r2(Y(0))}" x2="${pad.l + pw}" y2="${r2(Y(0))}"/>`);
  out.push(ticks.join(''));

  const body = [];
  for (const s of opts.shade || []) {
    const n = 120;
    const top = [], bottom = [];
    for (let i = 0; i <= n; i++) {
      const x = s.a + ((s.b - s.a) * i) / n;
      const y1 = s.f(x), y2 = s.g ? s.g(x) : 0;
      if (!Number.isFinite(y1) || !Number.isFinite(y2)) continue;
      top.push(`${r2(X(x))},${r2(Y(y1))}`);
      bottom.unshift(`${r2(X(x))},${r2(Y(y2))}`);
    }
    if (top.length) body.push(`<polygon class="${s.cls || 'd-shade'}" points="${top.concat(bottom).join(' ')}"/>`);
  }
  for (const b of opts.bars || []) {
    const x0 = X(b.x - b.w / 2), x1 = X(b.x + b.w / 2);
    const yTop = Y(Math.max(b.h, 0)), yBot = Y(Math.min(b.h, 0));
    body.push(`<rect class="${b.cls || 'd-bar'}" x="${r2(x0)}" y="${r2(yTop)}" width="${r2(Math.max(x1 - x0, 0.5))}" height="${r2(Math.max(yBot - yTop, 0))}"/>`);
  }
  for (const c of opts.circles || []) {
    body.push(`<ellipse class="${c.cls || 'd-line'}" cx="${r2(X(c.cx))}" cy="${r2(Y(c.cy))}" rx="${r2(Math.abs(X(c.cx + c.r) - X(c.cx)))}" ry="${r2(Math.abs(Y(c.cy + c.r) - Y(c.cy)))}" fill="none"/>`);
  }
  for (const c of opts.curves || []) {
    const n = c.samples || 500;
    let d = '', pen = false, lastY = null;
    for (let i = 0; i <= n; i++) {
      const x = xmin + ((xmax - xmin) * i) / n;
      const y = c.f(x);
      if (!Number.isFinite(y)) { pen = false; continue; }
      const py = Y(y);
      if (pen && lastY !== null && Math.abs(py - lastY) > ph * 1.5) pen = false; // vertical asymptote
      const cy = Math.max(-ph * 3, Math.min(ph * 4, py));
      d += `${pen ? 'L' : 'M'}${r2(X(x))} ${r2(cy)} `;
      pen = true;
      lastY = py;
    }
    if (d) body.push(`<path class="${c.cls || 'd-line'}" d="${d.trim()}"/>`);
  }
  for (const v of opts.vlines || []) body.push(`<line class="${v.cls || 'd-perp'}" x1="${r2(X(v.x))}" y1="${pad.t}" x2="${r2(X(v.x))}" y2="${pad.t + ph}"/>`);
  for (const h of opts.hlines || []) body.push(`<line class="${h.cls || 'd-perp'}" x1="${pad.l}" y1="${r2(Y(h.y))}" x2="${pad.l + pw}" y2="${r2(Y(h.y))}"/>`);
  for (const s of opts.segments || []) body.push(`<line class="${s.cls || 'd-perp'}" x1="${r2(X(s.x1))}" y1="${r2(Y(s.y1))}" x2="${r2(X(s.x2))}" y2="${r2(Y(s.y2))}"/>`);
  out.push(`<g clip-path="url(#${id})">${body.join('')}</g>`);

  const labels = [];
  for (const v of opts.vlines || []) if (v.label) labels.push(`<text class="d-text-muted" x="${r2(Math.min(X(v.x) + 3, W - 40))}" y="${pad.t + 11}">${esc(v.label)}</text>`);
  for (const h of opts.hlines || []) if (h.label) labels.push(`<text class="d-text-muted" x="${pad.l + 4}" y="${r2(Y(h.y) - 4)}">${esc(h.label)}</text>`);
  for (const p of opts.points || []) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    const px = X(p.x), py = Y(p.y);
    if (px < pad.l - 1 || px > pad.l + pw + 1 || py < pad.t - 1 || py > pad.t + ph + 1) continue;
    if (p.drag) labels.push(`<circle class="d-drag-hit" data-drag="${esc(p.drag)}" cx="${r2(px)}" cy="${r2(py)}" r="14"/>`);
    labels.push(`<circle class="${p.cls || 'd-point'}${p.drag ? ' d-draggable' : ''}" cx="${r2(px)}" cy="${r2(py)}" r="${p.r || (p.drag ? 6 : 4.5)}"${p.drag ? ` data-drag="${esc(p.drag)}"` : ''}/>`);
    if (p.label) {
      const right = px < W - 90;
      labels.push(`<text class="d-text" x="${r2(right ? px + 7 : px - 7)}" y="${r2(py < pad.t + 16 ? py + 15 : py - 7)}" text-anchor="${right ? 'start' : 'end'}">${esc(p.label)}</text>`);
    }
  }
  if (opts.xLabel) labels.push(`<text class="d-text-muted" x="${W - pad.r}" y="${r2(Math.min(Math.max(Y(0) - 5, pad.t + 10), pad.t + ph - 4))}" text-anchor="end">${esc(opts.xLabel)}</text>`);
  if (opts.yLabel) labels.push(`<text class="d-text-muted" x="${r2(Math.min(Math.max(X(0) + 5, pad.l + 4), W - 30))}" y="${pad.t + 10}">${esc(opts.yLabel)}</text>`);
  out.push(labels.join(''));
  out.push('</svg>');
  const svg = out.join('');
  return /NaN|Infinity/.test(svg) ? unavailableSvg(W, H, opts.title) : svg;
}

/** Shown instead of a graph when the values are too large or too small to draw. */
export function unavailableSvg(W = 360, H = 120, title = 'Graph') {
  return `<svg class="diagram" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title || 'Graph')} not drawn"><text class="d-text-muted" x="${W / 2}" y="${H / 2}" text-anchor="middle">Graph not drawn: the values are too large or too small to show to scale.</text></svg>`;
}

/** Legend HTML: items [{ cls: '' | 'l2' | 'l3', label }] */
export function legend(items) {
  return `<div class="legend">${items.map((i) => `<span><i class="${i.cls || ''}"></i>${esc(i.label)}</span>`).join('')}</div>`;
}

/** Pick an x-window that contains all the given x-values with margin. */
export function windowAround(xs, minHalf = 3) {
  const fin = xs.filter(Number.isFinite);
  if (!fin.length) return [-5, 5];
  const lo = Math.min(...fin), hi = Math.max(...fin);
  const span = Math.max(hi - lo, 2 * minHalf);
  const c = (lo + hi) / 2;
  return [c - span * 0.65, c + span * 0.65];
}

export { esc as escapeSvg };
