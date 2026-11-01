/** Shared helpers for the statistics calculators: data parsing and the normal-curve graph. */
import { parseFrac } from './fraction.js';
import { normalPdf } from './numeric.js';
import { plot } from './plot.js';
import { formatNumber } from './format.js';

export const DATA_FIELD = { name: 'data', label: 'Data values', type: 'textarea', rows: 4, placeholder: '12, 15, 11, 19, 15, 14', hint: 'Separate values with commas, spaces or new lines. Up to 10,000 values.' };

/** Parse a list of numbers; returns { values: number[], fracs: Frac[] } or { error }. */
export function parseData(raw, { min = 1, max = 10000 } = {}) {
  const tokens = String(raw ?? '').split(/[\s,;]+/).filter(Boolean);
  if (tokens.length < min) return { error: tokens.length ? `Enter at least ${min} values.` : 'Enter your data values.' };
  if (tokens.length > max) return { error: `Please enter at most ${max.toLocaleString('en-US')} values.` };
  const fracs = [];
  for (const t of tokens) {
    const f = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t.replace(/[−]/g, '-')) ? parseFrac(t.replace(/[−]/g, '-')) : null;
    if (!f) return { error: `"${t}" is not a number. Use digits with an optional decimal point, e.g. 12.5.` };
    if (Math.abs(f.toNumber()) > 1e12) return { error: `"${t}" is too large; keep values below 10¹² in size.` };
    fracs.push(f);
  }
  return { values: fracs.map((f) => f.toNumber()), fracs };
}

/** Normal curve with a shaded region [lo, hi] (use ±Infinity for tails). */
export function normalGraph(mu, sigma, lo, hi, markers = [], title = 'Normal distribution curve') {
  const pdf = (x) => normalPdf((x - mu) / sigma) / sigma;
  const L = mu - 4 * sigma, R = mu + 4 * sigma;
  const a = Math.max(L, lo === -Infinity ? L : lo), b = Math.min(R, hi === Infinity ? R : hi);
  return plot({
    x: [L, R], y: [0, pdf(mu) * 1.15],
    curves: [{ f: pdf, cls: 'd-line' }],
    shade: b > a ? [{ f: pdf, a, b }] : [],
    vlines: markers.map((m) => ({ x: m.x, cls: 'd-line3', label: m.label })),
    xTicks: [-3, -2, -1, 0, 1, 2, 3].map((k) => ({ x: mu + k * sigma, label: formatNumber(mu + k * sigma, { decimals: 3 }) })),
    includeZero: true,
    title,
  });
}

/** Format a probability: 6 decimals, or scientific notation for tiny values. */
export function fmtP(p) {
  if (p !== 0 && Math.abs(p) < 1e-6) return p.toExponential(4).replace('e', ' × 10^');
  return formatNumber(p, { decimals: 6 });
}
export function texP(p) {
  if (p !== 0 && Math.abs(p) < 1e-6) { const [m, e] = p.toExponential(4).split('e'); return `${m} \\times 10^{${Number(e)}}`; }
  return formatNumber(p, { decimals: 6 });
}
