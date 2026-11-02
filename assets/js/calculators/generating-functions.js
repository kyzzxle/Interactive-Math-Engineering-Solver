/**
 * Ordinary generating functions for counting, in two clearly defined cases:
 *   limits — choose items of several types, type i between minᵢ and maxᵢ times (max may be
 *            unlimited); the number of ways to get n items is the coefficient of xⁿ in
 *            Π (x^{minᵢ} + … + x^{maxᵢ})
 *   coins  — make the amount n from coins of given values, unlimited supply: coefficient of xⁿ in
 *            Π 1/(1 − x^{c})
 * Polynomials are multiplied exactly (BigInt), truncated at degree n.
 */
import { validator } from '../lib/calc-kit.js';
import { groupDigits } from '../lib/bigint.js';
import { plot } from '../lib/plot.js';

function mulTrunc(a, b, n) {
  const out = Array(n + 1).fill(0n);
  for (let i = 0; i <= n; i++) if (a[i]) for (let j = 0; i + j <= n; j++) if (b[j]) out[i + j] += a[i] * b[j];
  return out;
}
const series = (lo, hi, n, step = 1) => Array.from({ length: n + 1 }, (_, k) => (k >= lo && k <= hi && (k - lo) % step === 0 ? 1n : 0n));
const polyText = (c, upto = 8) => { const t = []; c.forEach((x, k) => { if (x && t.length < upto) t.push(`${x === 1n && k ? '' : x}${k ? `x^{${k}}` : ''}`); }); return t.join(' + ') + (c.filter(Boolean).length > upto ? ' + \\cdots' : ''); };

export const calculator = {
  id: 'generating-functions',
  fields: [
    { name: 'mode', label: 'Counting problem', type: 'radio', options: [['limits', 'Choose items with limits per type'], ['coins', 'Make an amount from coins']] },
    { name: 'types', label: 'Limits for each type (min-max)', type: 'textarea', rows: 4, placeholder: '0-3\n1-2\n0-inf', showWhen: { mode: ['limits'] }, hint: 'One type per line as min-max, e.g. 0-3 (up to 3), 1-2, or 0-inf for unlimited. Up to 8 types.' },
    { name: 'coins', label: 'Coin values', type: 'text', placeholder: 'e.g. 1, 5, 10, 25', showWhen: { mode: ['coins'] } },
    { name: 'n', label: 'Total n', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 6', hint: 'A whole number up to 500.' },
  ],
  examples: [
    { label: '6 fruits: ≤3 apples, 1–2 bananas, any oranges', values: { mode: 'limits', types: '0-3\n1-2\n0-inf', n: '6' } },
    { label: 'Ways to make 100 cents from 1, 5, 10, 25', values: { mode: 'coins', coins: '1, 5, 10, 25', n: '100' } },
    { label: 'Stars and bars: 10 sweets, 4 children', values: { mode: 'limits', types: '0-inf\n0-inf\n0-inf\n0-inf', n: '10' } },
    { label: 'Invalid: min greater than max', values: { mode: 'limits', types: '3-1', n: '4' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const n = v.whole('n', 'n', 500);
    if (!v.ok()) return v.result();
    const coins = values.mode === 'coins';
    const factors = [];
    if (coins) {
      const parts = String(values.coins ?? '').split(/[\s,;]+/).filter(Boolean);
      if (!parts.length) return { ok: false, errors: [{ field: 'coins', message: 'Enter the coin values, for example 1, 5, 10.' }] };
      if (parts.length > 10) return { ok: false, errors: [{ field: 'coins', message: 'Please enter at most 10 coin values.' }] };
      for (const p of parts) {
        if (!/^\d+$/.test(p) || Number(p) < 1 || Number(p) > 500) return { ok: false, errors: [{ field: 'coins', message: `“${p}” is not a valid coin value: use whole numbers from 1 to 500.` }] };
        if (factors.some((f) => f.c === Number(p))) return { ok: false, errors: [{ field: 'coins', message: `The value ${p} appears twice; list each coin once.` }] };
        factors.push({ c: Number(p), poly: series(0, Infinity, n, Number(p)), tex: Number(p) === 1 ? '\\frac{1}{1 - x}' : `\\frac{1}{1 - x^{${p}}}` });
      }
    } else {
      const lines = String(values.types ?? '').split(/\n|;/).map((l) => l.trim()).filter(Boolean);
      if (!lines.length) return { ok: false, errors: [{ field: 'types', message: 'Enter at least one type as min-max, for example 0-3.' }] };
      if (lines.length > 8) return { ok: false, errors: [{ field: 'types', message: 'Please enter at most 8 types.' }] };
      for (const [i, l] of lines.entries()) {
        const m = /^(\d+)\s*[-–to]+\s*(\d+|inf|∞|infinity)$/i.exec(l.replace(/\s+/g, ' ')) || /^(\d+)\s*\+$/.exec(l);
        if (!m) return { ok: false, errors: [{ field: 'types', message: `Line ${i + 1} (“${l}”) should look like 0-3 or 1-inf.` }] };
        const lo = Number(m[1]), hi = m[2] === undefined || /inf|∞/i.test(m[2]) ? Infinity : Number(m[2]);
        if (hi < lo) return { ok: false, errors: [{ field: 'types', message: `Line ${i + 1}: the minimum ${lo} is larger than the maximum ${hi}.` }] };
        if (lo > 500) return { ok: false, errors: [{ field: 'types', message: `Line ${i + 1}: please keep the minimum at most 500.` }] };
        const tex = hi === Infinity ? (lo === 0 ? '\\frac{1}{1 - x}' : `\\frac{x^{${lo}}}{1 - x}`) : Array.from({ length: Math.min(hi - lo + 1, 4) }, (_, k) => (lo + k === 0 ? '1' : lo + k === 1 ? 'x' : `x^{${lo + k}}`)).join(' + ') + (hi - lo + 1 > 4 ? ` + \\cdots + x^{${hi}}` : '');
        factors.push({ lo, hi, poly: series(lo, hi, n), tex: hi === Infinity ? tex : `\\left(${tex}\\right)` });
      }
    }
    let prod = series(0, 0, n);
    const partial = [];
    for (const f of factors) { prod = mulTrunc(prod, f.poly, n); partial.push(prod); }
    const count = prod[n];
    const G = factors.map((f) => f.tex).join('');
    const steps = [
      { title: coins ? 'One factor per coin: using it 0, 1, 2, … times adds 0, c, 2c, … to the total' : 'One factor per type: the exponent records how many of that type are chosen', tex: `G(x) = ${G}` },
      { title: 'Why it works', text: 'Multiplying the factors adds the exponents, so every way of choosing gives one term x^(total). Collecting equal powers counts the ways for each total.' },
      { title: `Multiply (keeping powers up to x^${n})`, tex: `G(x) = ${polyText(prod)}` },
      { title: `Read off the coefficient of x^${n}`, tex: `[x^{${n}}]\\,G(x) = ${groupDigits(count.toString()).replace(/,/g, '{,}')}` },
    ];
    if (!coins && factors.every((f) => f.lo === 0 && f.hi === Infinity)) steps.push({ title: 'Check with stars and bars', tex: `\\binom{n + k - 1}{k - 1} = \\binom{${n + factors.length - 1}}{${factors.length - 1}} = ${count}` });
    const ks = Array.from({ length: n + 1 }, (_, k) => k);
    const nums = prod.map((c) => Number(c));
    return {
      ok: true,
      final: { tex: `[x^{${n}}]\\,${G} = ${groupDigits(count.toString()).replace(/,/g, '{,}')}` },
      answers: [{ label: `Number of ways to get ${n}`, value: groupDigits(count.toString()), primary: true, copy: count.toString() }],
      visual: { svg: plot({ x: [-0.8, n + 0.8], width: 380, height: 240, title: 'Coefficients: number of ways for each total', bars: ks.map((k) => ({ x: k, w: Math.max(0.3, Math.min(0.75, 30 / (n + 1))), h: nums[k], cls: k === n ? 'd-bar-hi' : 'd-bar' })) }), caption: `Each bar is a coefficient of G(x); the highlighted one answers the question for total ${n}.` },
      formula: [coins ? 'G(x) = \\prod_{c} \\frac{1}{1 - x^{c}} = \\sum_{n \\ge 0} (\\text{ways to make } n)\\,x^n' : 'G(x) = \\prod_i \\left(x^{\\min_i} + \\cdots + x^{\\max_i}\\right) = \\sum_{n \\ge 0} (\\text{ways})\\,x^n'],
      steps,
      tables: [{ caption: 'First coefficients', headers: ['total', 'ways'], rows: ks.slice(0, 16).map((k) => [String(k), groupDigits(prod[k].toString())]) }],
      notes: [{ kind: 'info', text: coins ? 'Order does not matter (5 + 1 and 1 + 5 are the same way). Coins are unlimited.' : 'Items of the same type are identical: only how many of each type matters, not which ones or in what order.' }],
    };
  },
};
