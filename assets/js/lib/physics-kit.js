/**
 * Shared pieces for the physics calculators: SI unit formatting, optional inputs,
 * and small SVG drawings (force arrows, circuits, energy bars). No DOM access.
 */
import { parseDecimal } from './parse.js';
import { texNumber, formatNumber, isDisplayExact } from './format.js';

export const G_EARTH = 9.81;

/** Key quantities of a projectile (shared with the explorer). */
export function projectile(v0, deg, h0 = 0, g = G_EARTH) {
  const th = (deg * Math.PI) / 180;
  const vx = v0 * Math.cos(th), vy = v0 * Math.sin(th);
  const T = (vy + Math.sqrt(vy * vy + 2 * g * h0)) / g;
  const tTop = Math.max(0, vy / g);
  const H = h0 + (vy > 0 ? (vy * vy) / (2 * g) : 0);
  const R = vx * T;
  const vyEnd = vy - g * T;
  return { th, vx, vy, T, tTop, H, R, vyEnd, vEnd: Math.hypot(vx, vyEnd), angleEnd: (Math.atan2(-vyEnd, vx) * 180) / Math.PI, x: (t) => vx * t, y: (t) => h0 + vy * t - 0.5 * g * t * t };
}

/** TeX for a quantity with a unit: 12.5\,\text{m/s}. */
export const q = (x, unit, d = 4) => `${texNumber(x, { decimals: d })}${unit ? `\\,\\text{${unit}}` : ''}`;
/** Same, in parentheses when negative (for substitutions). */
export const qp = (x, unit, d = 4) => (x < 0 ? `(${q(x, unit, d)})` : q(x, unit, d));
export const rel = (x, d = 4) => (isDisplayExact(x, d) ? '=' : '\\approx');
export const fmtQ = (x, unit, d = 4) => `${formatNumber(x, { decimals: d })}${unit ? ` ${unit}` : ''}`;

/**
 * Read optional numeric fields. Blank → null. Collects errors.
 * spec: { name: { label, positive?, nonneg?, max? } }
 */
export function readOptionalNumbers(values, spec, errors) {
  const out = {};
  for (const [name, o] of Object.entries(spec)) {
    const raw = String(values[name] ?? '').trim();
    if (!raw) { out[name] = null; continue; }
    const p = parseDecimal(raw, o.label);
    if (!p.ok) { errors.push({ field: name, message: p.error }); continue; }
    const v = p.value, max = o.max ?? 1e9;
    if (Math.abs(v) > max) { errors.push({ field: name, message: `Please keep ${o.label} between −${max.toExponential(0)} and ${max.toExponential(0)}.` }); continue; }
    if (o.positive && !(v > 0)) { errors.push({ field: name, message: `${cap(o.label)} must be greater than 0.` }); continue; }
    if (o.nonneg && v < 0) { errors.push({ field: name, message: `${cap(o.label)} cannot be negative.` }); continue; }
    out[name] = v;
  }
  return out;
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const r2 = (v) => Math.round(v * 100) / 100;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Horizontal arrow from x1 to x2 at height y, with a label. */
export function arrow(x1, y, x2, label, cls = 'd-arrow') {
  if (Math.abs(x2 - x1) < 2) return '';
  const dir = Math.sign(x2 - x1);
  const head = `<polygon class="${cls}-head" points="${r2(x2)},${r2(y)} ${r2(x2 - dir * 11)},${r2(y - 6)} ${r2(x2 - dir * 11)},${r2(y + 6)}"/>`;
  const text = label ? `<text class="d-label" x="${r2((x1 + x2) / 2)}" y="${r2(y - 10)}" text-anchor="middle">${esc(label)}</text>` : '';
  return `<line class="${cls}" x1="${r2(x1)}" y1="${r2(y)}" x2="${r2(x2 - dir * 9)}" y2="${r2(y)}"/>${head}${text}`;
}

/** Arrow between two arbitrary points. */
export function arrowTo(x1, y1, x2, y2, label, cls = 'd-arrow') {
  const L = Math.hypot(x2 - x1, y2 - y1);
  if (L < 2) return '';
  const ux = (x2 - x1) / L, uy = (y2 - y1) / L;
  const bx = x2 - ux * 11, by = y2 - uy * 11;
  const head = `<polygon class="${cls}-head" points="${r2(x2)},${r2(y2)} ${r2(bx - uy * 6)},${r2(by + ux * 6)} ${r2(bx + uy * 6)},${r2(by - ux * 6)}"/>`;
  const text = label ? `<text class="d-label" x="${r2(x2 + ux * 8 + 4)}" y="${r2(y2 + uy * 8 - 4)}">${esc(label)}</text>` : '';
  return `<line class="${cls}" x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2 - ux * 9)}" y2="${r2(y2 - uy * 9)}"/>${head}${text}`;
}

export function svgWrap(W, H, title, body) {
  const svg = `<svg class="diagram" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${body}</svg>`;
  return /NaN|Infinity/.test(svg) ? '' : svg;
}

/**
 * Free-body diagram of a block on the ground with horizontal forces.
 * forces: [{ value (N, + is right), label, cls }], accel: m/s² (+ right) or null.
 */
export function blockDiagram({ forces = [], accel = null, mass = '', title = 'Force diagram' }) {
  const W = 380, H = 190, cx = W / 2, top = 70, bw = 90, bh = 60;
  const maxF = Math.max(1e-9, ...forces.map((f) => Math.abs(f.value)));
  const parts = [`<line class="d-ground" x1="20" y1="${top + bh}" x2="${W - 20}" y2="${top + bh}"/>`, `<rect class="d-body" x="${cx - bw / 2}" y="${top}" width="${bw}" height="${bh}" rx="6"/>`, `<text class="d-label" x="${cx}" y="${top + bh / 2 + 4}" text-anchor="middle">${esc(mass)}</text>`];
  forces.forEach((f, i) => {
    if (!f.value) return;
    const len = 30 + (110 * Math.abs(f.value)) / maxF;
    const y = top + 18 + i * 24;
    const start = f.value > 0 ? cx + bw / 2 : cx - bw / 2;
    parts.push(arrow(start, y, start + Math.sign(f.value) * len, f.label, f.cls || 'd-arrow'));
  });
  if (accel !== null && Math.abs(accel) > 1e-12) {
    parts.push(arrow(cx - 40 * Math.sign(accel), top - 22, cx + 40 * Math.sign(accel), `a = ${formatNumber(Math.abs(accel), { decimals: 3 })} m/s²`, 'd-arrow2'));
  } else if (accel !== null) {
    parts.push(`<text class="d-text-muted" x="${cx}" y="${top - 18}" text-anchor="middle">a = 0 (balanced forces)</text>`);
  }
  return svgWrap(W, H, title, parts.join(''));
}

/** Zig-zag resistor path from (x, y) horizontally (or vertically) with length L. */
export function resistorPath(x, y, L, vertical = false) {
  const lead = L * 0.2, zig = (L - 2 * lead) / 6, amp = 7;
  const pts = [[0, 0], [lead, 0]];
  for (let i = 0; i < 6; i++) pts.push([lead + zig * (i + 0.5), i % 2 ? amp : -amp]);
  pts.push([L - lead, 0], [L, 0]);
  const d = pts.map(([a, b], i) => `${i ? 'L' : 'M'}${r2(vertical ? x + b : x + a)} ${r2(vertical ? y + a : y + b)}`).join(' ');
  return `<path class="d-resistor" d="${d}"/>`;
}

/** Battery symbol at (x, y), vertical, with label. */
export function batterySymbol(x, y, label) {
  return `<line class="d-wire" x1="${x - 14}" y1="${y - 5}" x2="${x + 14}" y2="${y - 5}"/><line class="d-wire" x1="${x - 8}" y1="${y + 5}" x2="${x + 8}" y2="${y + 5}" style="stroke-width:4"/>`
    + `<text class="d-label" x="${x - 20}" y="${y + 4}" text-anchor="end">${esc(label)}</text><text class="d-text-muted" x="${x + 18}" y="${y - 8}">+</text>`;
}

/** Simple loop: battery on the left, one resistor on the top, current arrow. */
export function simpleCircuit({ V, I, R }) {
  const W = 380, H = 210, L = 60, Rr = 320, T = 40, B = 170;
  const body = [
    `<path class="d-wire" d="M${L} ${T + 40} V${T} H140 M240 ${T} H${Rr} V${B} H${L} V${T + 85}"/>`,
    resistorPath(140, T, 100),
    `<text class="d-label" x="190" y="${T - 14}" text-anchor="middle">R = ${esc(R)}</text>`,
    batterySymbol(L, T + 62, `V = ${V}`),
    arrow(150, B - 14, 250, `I = ${I}`, 'd-arrow2'),
  ];
  return svgWrap(W, H, 'Circuit with a battery and one resistor', body.join(''));
}

/** Resistor network: branches is a list of series groups that are connected in parallel. */
export function networkDiagram(branches, title) {
  const rows = branches.length, maxLen = Math.max(...branches.map((b) => b.length));
  const unit = 76, W = Math.max(300, 80 + maxLen * unit + 40), H = 40 + rows * 56 + 30;
  const x0 = 50, x1 = W - 40;
  const parts = [];
  branches.forEach((br, i) => {
    const y = 40 + i * 56;
    const span = br.length * unit, start = x0 + (x1 - x0 - span) / 2;
    parts.push(`<line class="d-wire" x1="${x0}" y1="${y}" x2="${start}" y2="${y}"/><line class="d-wire" x1="${start + span}" y1="${y}" x2="${x1}" y2="${y}"/>`);
    br.forEach((r, j) => {
      parts.push(resistorPath(start + j * unit, y, unit));
      parts.push(`<text class="d-text" x="${r2(start + j * unit + unit / 2)}" y="${y - 12}" text-anchor="middle">${esc(r)}</text>`);
    });
  });
  const yb = 40 + (rows - 1) * 56;
  if (rows > 1) parts.push(`<line class="d-wire" x1="${x0}" y1="40" x2="${x0}" y2="${yb}"/><line class="d-wire" x1="${x1}" y1="40" x2="${x1}" y2="${yb}"/>`);
  const mid = (40 + yb) / 2;
  parts.push(`<circle class="d-point" cx="${x0}" cy="${mid}" r="4"/><circle class="d-point" cx="${x1}" cy="${mid}" r="4"/><text class="d-text-muted" x="${x0 - 8}" y="${mid + 4}" text-anchor="end">A</text><text class="d-text-muted" x="${x1 + 8}" y="${mid + 4}">B</text>`);
  return svgWrap(W, H, title, parts.join(''));
}

/** Bar chart of energies (J): items [{ label, value, cls }]. */
export function energyBars(items, title = 'Energy bar chart', maxValue = null) {
  const W = 360, H = 220, base = 180, top = 30, bw = 64, gap = 40;
  const max = maxValue || Math.max(1e-9, ...items.map((i) => i.value));
  const startX = (W - (items.length * bw + (items.length - 1) * gap)) / 2;
  const parts = [`<line class="d-axis" x1="20" y1="${base}" x2="${W - 20}" y2="${base}"/>`];
  items.forEach((it, i) => {
    const h = Math.max(0, ((base - top) * it.value) / max);
    const x = startX + i * (bw + gap);
    parts.push(`<rect class="${it.cls || 'd-bar'}" x="${r2(x)}" y="${r2(base - h)}" width="${bw}" height="${r2(h)}" rx="3"/>`);
    parts.push(`<text class="d-label" x="${r2(x + bw / 2)}" y="${base + 18}" text-anchor="middle">${esc(it.label)}</text>`);
    parts.push(`<text class="d-text" x="${r2(x + bw / 2)}" y="${r2(base - h - 6)}" text-anchor="middle">${esc(formatNumber(it.value, { decimals: 1 }))} J</text>`);
  });
  return svgWrap(W, H, title, parts.join(''));
}
