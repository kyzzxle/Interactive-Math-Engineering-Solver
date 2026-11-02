/**
 * Integer partitions: ways to write n as a sum of positive integers, ignoring order.
 * Counts p(n) exactly (dynamic programming with BigInt) and the restricted versions
 * "into distinct parts", "with parts at most m" and "into exactly k parts". Partitions are listed
 * (with Ferrers diagrams) for small n.
 */
import { validator, answer } from '../lib/calc-kit.js';
import { groupDigits } from '../lib/bigint.js';
import { plot } from '../lib/plot.js';
import { escapeHtml } from '../lib/ui.js';

/** Number of partitions of n with every part ≤ m (BigInt). */
export function partitionsMax(n, m) {
  const p = Array(n + 1).fill(0n); p[0] = 1n;
  for (let part = 1; part <= Math.min(m, n); part++) for (let s = part; s <= n; s++) p[s] += p[s - part];
  return p[n];
}
export function partitionsDistinct(n) {
  const p = Array(n + 1).fill(0n); p[0] = 1n;
  for (let part = 1; part <= n; part++) for (let s = n; s >= part; s--) p[s] += p[s - part];
  return p[n];
}
function list(n, maxPart = n, distinct = false, out = [], cur = []) {
  if (n === 0) { out.push(cur.slice()); return out; }
  for (let k = Math.min(n, maxPart); k >= 1; k--) { cur.push(k); list(n - k, distinct ? k - 1 : k, distinct, out, cur); cur.pop(); if (out.length > 400) break; }
  return out;
}
function ferrers(parts) {
  const r = 7, gap = 17, W = Math.max(...parts) * gap + 10, H = parts.length * gap + 6;
  return `<svg class="diagram" viewBox="0 0 ${W} ${H}" style="width:${W}px;max-width:100%" role="img" aria-label="Ferrers diagram of ${parts.join(' + ')}"><title>${parts.join(' + ')}</title>${parts.map((p, i) => Array.from({ length: p }, (_, j) => `<circle class="d-point" cx="${12 + j * gap}" cy="${10 + i * gap}" r="${r * 0.75}"/>`).join('')).join('')}</svg>`;
}

const MODES = [['all', 'All partitions'], ['distinct', 'Distinct parts only'], ['max', 'Every part at most m'], ['k', 'Exactly k parts']];

export const calculator = {
  id: 'integer-partitions',
  explore: {
    title: 'Ferrers diagrams',
    intro: 'Each row of dots is one part. Reading the columns instead of the rows gives the conjugate partition — which is why "at most k parts" and "parts at most k" always have the same count.',
    controls: [{ name: 'n', label: 'n', min: 1, max: 9, step: 1, value: 5 }],
    render({ n }) {
      const ps = list(n);
      return {
        html: `<p class="combo-head">The ${ps.length} partitions of ${n}</p><div style="display:flex;flex-wrap:wrap;gap:0.75rem;align-items:flex-start">${ps.map((p) => `<div style="text-align:center">${ferrers(p)}<div class="field-hint">${escapeHtml(p.join('+'))}</div></div>`).join('')}</div>`,
        readouts: [{ label: 'p(n)', tex: `p(${n}) = ${ps.length}`, tone: 'good' }, { label: 'Into distinct parts', tex: `${partitionsDistinct(n)}` }],
      };
    },
  },
  fields: [
    { name: 'n', label: 'Number n', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 6', hint: 'Counts for n up to 2000; partitions are listed for n ≤ 12.' },
    { name: 'mode', label: 'Count', type: 'select', options: MODES },
    { name: 'm', label: 'Largest allowed part m', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 3', showWhen: { mode: ['max'] } },
    { name: 'k', label: 'Number of parts k', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 3', showWhen: { mode: ['k'] } },
  ],
  examples: [
    { label: 'All partitions of 6', values: { n: '6', mode: 'all' } },
    { label: 'Partitions of 10 into distinct parts', values: { n: '10', mode: 'distinct' } },
    { label: 'Partitions of 8 into exactly 3 parts', values: { n: '8', mode: 'k', k: '3' } },
    { label: 'p(100)', values: { n: '100', mode: 'all' } },
    { label: 'Invalid: n = 0 parts', values: { n: '5', mode: 'k', k: '0' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const n = v.whole('n', 'n', 2000, 1);
    const mode = MODES.some(([m]) => m === values.mode) ? values.mode : 'all';
    const m = mode === 'max' ? v.whole('m', 'm', 2000, 1) : null;
    const k = mode === 'k' ? v.whole('k', 'k', 2000, 1) : null;
    if (!v.ok()) return v.result();
    let count, desc, parts = null, formula;
    const steps = [];
    if (mode === 'all') {
      count = partitionsMax(n, n); desc = `p(${n})`;
      formula = 'p(n) = \\text{number of ways to write } n \\text{ as a sum of positive integers (order ignored)}';
      steps.push({ title: 'Build up the count part by part', text: 'Start with p(0) = 1. For each allowed part size, add the ways that use it: ways(s) += ways(s − part). This counts each partition exactly once because parts are added in increasing size.' });
      if (n <= 12) parts = list(n);
    } else if (mode === 'distinct') {
      count = partitionsDistinct(n); desc = `q(${n})`;
      formula = 'q(n) = \\text{partitions of } n \\text{ into distinct parts} = \\text{partitions into odd parts}';
      steps.push({ title: 'Each part size may be used at most once', text: 'Same building-up method, but each part is used at most once (sums are updated from the top down).' });
      if (n <= 20) parts = list(n, n, true);
    } else if (mode === 'max') {
      count = partitionsMax(n, m); desc = `p(${n}, \\le ${m})`;
      formula = 'p_{\\le m}(n): \\text{ partitions of } n \\text{ with every part} \\le m';
      steps.push({ title: `Only parts 1, 2, …, ${Math.min(m, n)} are allowed`, text: 'Build up the count using only these part sizes.' });
      if (n <= 12) parts = list(n, m);
    } else {
      if (k > n) count = 0n;
      else count = partitionsMax(n - k, k); // remove one from each of the k parts (conjugation)
      desc = `p_{${k}}(${n})`;
      formula = 'p_k(n) = p_{\\le k}(n - k)';
      steps.push({ title: 'Subtract 1 from each of the k parts', text: `Every partition of ${n} into exactly ${k} parts becomes a partition of ${n} − ${k} = ${n - k} into at most ${k} parts — and by the Ferrers-diagram (conjugate) argument, that equals the number with parts at most ${k}.`, tex: `p_{${k}}(${n}) = p_{\\le ${k}}(${n - k})` });
      if (n <= 14) parts = list(n).filter((p) => p.length === k);
    }
    steps.push({ title: 'Result', tex: `${desc} = ${count}` });
    if (parts && parts.length <= 60) steps.push({ title: 'The partitions', text: parts.map((p) => p.join(' + ')).join(';  ') });
    const ns = Array.from({ length: 15 }, (_, i) => i + 1);
    const html = parts && parts.length && parts.length <= 40 ? `<div class="p-2"><p class="combo-head">Ferrers diagrams</p><div style="display:flex;flex-wrap:wrap;gap:0.75rem">${parts.map((p) => `<div style="text-align:center">${ferrers(p)}<div class="field-hint">${escapeHtml(p.join('+'))}</div></div>`).join('')}</div></div>` : '';
    const svg = plot({ x: [0.3, 15.7], width: 380, height: 220, title: 'p(n) for n = 1 to 15', bars: ns.map((x) => ({ x, w: 0.7, h: Number(partitionsMax(x, x)), cls: x === n ? 'd-bar-hi' : 'd-bar' })) });
    return {
      ok: true,
      final: { tex: `${desc} = ${groupDigits(count.toString()).replace(/,/g, '{,}')}` },
      answers: [{ label: 'Number of partitions', value: groupDigits(count.toString()), primary: true, copy: count.toString() }],
      visual: { svg: html ? `${html}${svg}` : svg, caption: 'p(n) grows quickly: p(100) already has 9 digits.' },
      formula: [formula],
      steps,
      notes: [{ kind: 'info', text: 'Order does not matter: 3 + 1 and 1 + 3 are the same partition. (Ordered sums are called compositions; there are 2ⁿ⁻¹ of them.)' }],
    };
  },
};
