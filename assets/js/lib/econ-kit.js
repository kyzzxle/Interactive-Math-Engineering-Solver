/**
 * Shared helpers for the engineering economy calculators: money formatting (two decimals,
 * thousands separators), percentage formatting, optional-field reading and a cash-flow diagram.
 * Amounts carry no currency symbol, so they work for pesos, dollars or any other currency.
 */
import { formatNumber, texNumber } from './format.js';
import { parseDecimal } from './parse.js';

const BIG = 1e15;

/** 12345.6 → "12,345.60" (scientific notation for huge values). */
export function money(x) {
  if (!Number.isFinite(x)) throw new RangeError('Cannot format a non-finite amount');
  if (Math.abs(x) >= BIG) return formatNumber(x, { decimals: 4 });
  const s = Math.abs(x).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (x < 0 && Number(Math.abs(x).toFixed(2)) !== 0 ? '−' : '') + s;
}
/** Money as TeX: 12{,}345.60 */
export function moneyTex(x) {
  if (Math.abs(x) >= BIG) return texNumber(x, { decimals: 4 });
  return money(x).replace(/,/g, '{,}').replace('−', '-');
}
/** Money in parentheses when negative, for substitutions. */
export const moneyTexP = (x) => (x < 0 ? `(${moneyTex(x)})` : moneyTex(x));

/** Rate as a percentage, e.g. 0.0612 → "6.12%". */
export const pct = (rate, d = 4) => `${formatNumber(rate * 100, { decimals: d })}%`;
export const pctTex = (rate, d = 4) => `${texNumber(rate * 100, { decimals: d })}\\%`;
/** Plain decimal for TeX (e.g. interest per period 0.01). */
export const dec = (x, d = 6) => texNumber(x, { decimals: d });

/** Answer card for an amount of money (no exact/approx tag: money is always shown to the cent). */
export function moneyAnswer(label, x, { primary = false } = {}) {
  const value = money(x);
  return { label, value, primary, copy: `${label}: ${value}` };
}
/** Answer card for a rate. */
export function rateAnswer(label, rate, { primary = false, d = 4 } = {}) {
  const value = pct(rate, d);
  return { label, value, primary, copy: `${label}: ${value}` };
}

/** Read a field that may be left blank. Returns null when blank, NaN (and records an error) when invalid. */
export function optionalNumber(values, name, label, errors, { nonneg = false, positive = false, maxAbs = 1e12 } = {}) {
  const raw = String(values[name] ?? '').trim();
  if (!raw) return null;
  const p = parseDecimal(raw, label);
  if (!p.ok) { errors.push({ field: name, message: p.error }); return NaN; }
  const v = p.value;
  if (Math.abs(v) > maxAbs) { errors.push({ field: name, message: `Please keep ${label} below ${maxAbs.toExponential(0)}.` }); return NaN; }
  if (positive && !(v > 0)) { errors.push({ field: name, message: `${label.charAt(0).toUpperCase() + label.slice(1)} must be greater than 0.` }); return NaN; }
  if (nonneg && v < 0) { errors.push({ field: name, message: `${label.charAt(0).toUpperCase() + label.slice(1)} cannot be negative.` }); return NaN; }
  return v;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r1 = (v) => Math.round(v * 10) / 10;

/**
 * Cash-flow diagram: a time line from 0 to N periods with arrows for each flow.
 * flows: [{ t, amount, label? }] — positive amounts (receipts) point up, negative (payments) down.
 * Long series are drawn with a break so the diagram stays readable.
 */
export function cashFlowDiagram(flows, N, { title = 'Cash-flow diagram', unitLabel = 'period' } = {}) {
  const W = 400, H = 230, y0 = 120, left = 24, right = W - 24;
  const maxTicks = 16;
  // Choose which periods to draw: all of them, or the first few and last few with a break.
  let shown;
  if (N <= maxTicks) shown = Array.from({ length: N + 1 }, (_, k) => k);
  else shown = [0, 1, 2, 3, 4, 5, 6, null, N - 5, N - 4, N - 3, N - 2, N - 1, N];
  const slots = shown.length - 1;
  const X = (idx) => left + ((right - left) * idx) / Math.max(1, slots);
  const pos = new Map(); shown.forEach((t, idx) => { if (t !== null) pos.set(t, X(idx)); });
  const maxAbs = Math.max(1e-12, ...flows.map((f) => Math.abs(f.amount)));
  const len = (a) => 18 + 68 * Math.min(1, Math.abs(a) / maxAbs);
  const out = [`<line class="d-axis" x1="${left - 8}" y1="${y0}" x2="${right + 8}" y2="${y0}" style="stroke-width:1.6"/>`];
  shown.forEach((t, idx) => {
    const x = r1(X(idx));
    if (t === null) { out.push(`<text class="d-text-muted" x="${x}" y="${y0 + 4}" text-anchor="middle" style="font-size:14px">…</text>`); return; }
    out.push(`<line class="d-axis" x1="${x}" y1="${y0 - 4}" x2="${x}" y2="${y0 + 4}"/><text class="d-tick" x="${x}" y="${y0 + 18}" text-anchor="middle">${t}</text>`);
  });
  // Several flows in the same period are drawn as one net arrow.
  const net = new Map();
  for (const f of flows) {
    if (!pos.has(f.t)) continue;
    const cur = net.get(f.t) || { amount: 0, labels: [] };
    cur.amount += f.amount; if (f.label) cur.labels.push(f.label);
    net.set(f.t, cur);
  }
  for (const [t, f] of net) {
    if (Math.abs(f.amount) < 1e-12) continue;
    const x = r1(pos.get(t)), up = f.amount > 0, L = len(f.amount);
    const tip = up ? y0 - L : y0 + L;
    const cls = up ? 'd-arrow' : 'd-arrow2';
    out.push(`<line class="${cls}" x1="${x}" y1="${y0}" x2="${x}" y2="${r1(up ? tip + 7 : tip - 7)}" style="stroke-width:2.4"/>`);
    out.push(`<polygon class="${cls}-head" points="${x},${r1(tip)} ${r1(x - 4.5)},${r1(up ? tip + 8 : tip - 8)} ${r1(x + 4.5)},${r1(up ? tip + 8 : tip - 8)}"/>`);
    // Labels near either edge are anchored inwards so they are never cut off.
    const anchor = x < 90 ? 'start' : x > W - 90 ? 'end' : 'middle';
    const lx = anchor === 'start' ? Math.max(4, x - 6) : anchor === 'end' ? Math.min(W - 4, x + 6) : x;
    if (f.labels.length) out.push(`<text class="d-label" x="${r1(lx)}" y="${r1(up ? tip - 6 : tip + 15)}" text-anchor="${anchor}">${esc(f.labels.join(' + '))}</text>`);
  }
  out.push(`<text class="d-text-muted" x="${right + 8}" y="${y0 + 32}" text-anchor="end">${esc(unitLabel)}s</text>`);
  const svg = `<svg class="diagram" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${out.join('')}</svg>`;
  return /NaN|Infinity/.test(svg) ? '' : svg;
}

/** Payments-per-year options shared by the interest calculators. */
export const FREQUENCIES = [['1', 'Annually (m = 1)'], ['2', 'Semi-annually (m = 2)'], ['4', 'Quarterly (m = 4)'], ['12', 'Monthly (m = 12)']];
export const COMPOUNDING = [...FREQUENCIES, ['365', 'Daily (m = 365)'], ['c', 'Continuously']];
export const freqName = (m) => ({ 1: 'annually', 2: 'semi-annually', 4: 'quarterly', 12: 'monthly', 365: 'daily', c: 'continuously' }[m] || `${m} times a year`);
