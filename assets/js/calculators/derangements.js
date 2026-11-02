/**
 * Derangements: arrangements of n items in which no item is in its original place
 * (for example n letters in n envelopes, all wrong). The subfactorial !n is computed exactly:
 *   !n = (n − 1)(!(n − 1) + !(n − 2)),  !0 = 1, !1 = 0
 *   !n = n! Σ (−1)^k / k!   (inclusion–exclusion),  P(no fixed point) = !n / n! → 1/e
 */
import { validator, answer, fmt } from '../lib/calc-kit.js';
import { factorial, groupDigits } from '../lib/bigint.js';
import { plot } from '../lib/plot.js';

export function subfactorial(n) {
  let a = 1n, b = 0n; // !0, !1
  if (n === 0) return 1n;
  for (let k = 2; k <= n; k++) [a, b] = [b, BigInt(k - 1) * (a + b)];
  return b;
}
function derangementList(n) {
  const out = [];
  const used = Array(n).fill(false), cur = [];
  const go = () => {
    if (cur.length === n) { out.push(cur.slice()); return; }
    for (let i = 0; i < n; i++) if (!used[i] && i !== cur.length) { used[i] = true; cur.push(i); go(); cur.pop(); used[i] = false; }
  };
  go();
  return out;
}
const L = 'ABCDEF';

export const calculator = {
  id: 'derangements',
  practice: {
    title: 'Secret Santa',
    generate(rand) {
      const n = 3 + Math.floor(rand() * 5);
      const d = subfactorial(n), f = factorial(n);
      return {
        prompt: `<p><strong>${n}</strong> friends each draw one name from a hat for a gift exchange. In how many ways can it happen that nobody draws their own name, and what is the probability of that (4 decimal places)?</p>`,
        answers: [{ label: 'Derangements', value: Number(d), int: true }, { label: 'Probability', value: Number(d) / Number(f), decimals: 4 }],
        hint: 'Use the recurrence !n = (n − 1)(!(n − 1) + !(n − 2)) starting from !1 = 0, !2 = 1.',
        steps: [{ title: 'Subfactorial', tex: `!${n} = ${d}` }, { title: 'Probability', tex: `\\frac{!${n}}{${n}!} = \\frac{${d}}{${f}} \\approx ${(Number(d) / Number(f)).toFixed(4)}` }],
      };
    },
  },
  fields: [{ name: 'n', label: 'Number of items n', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 4', hint: 'A whole number from 0 to 1000. All derangements are listed for n ≤ 5.' }],
  examples: [
    { label: 'n = 4 (letters and envelopes)', values: { n: '4' } },
    { label: 'n = 10', values: { n: '10' } },
    { label: 'n = 1 (impossible to derange)', values: { n: '1' } },
    { label: 'Invalid: fractional n', values: { n: '2.5' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const n = v.whole('n', 'n', 1000, 0);
    if (!v.ok()) return v.result();
    const d = subfactorial(n), f = factorial(n);
    const p = n <= 170 ? Number(d) / Number(f) : 1 / Math.E;
    const seq = Array.from({ length: Math.min(n, 12) + 1 }, (_, k) => subfactorial(k));
    const show = (b) => (b.toString().length > 40 ? `${b.toString().slice(0, 12)}…(${b.toString().length} digits)` : groupDigits(b.toString()));
    const steps = [
      { title: 'Start values', tex: '!0 = 1,\\quad !1 = 0' },
      { title: 'Recurrence', tex: '!n = (n - 1)\\left(!(n - 1) + !(n - 2)\\right)' },
      { title: 'Build up to n', text: seq.map((s, k) => `!${k} = ${s}`).join(', ') + (n > 12 ? ', …' : '') },
      { title: 'Check with inclusion–exclusion', tex: n <= 6 ? `!${n} = ${n}!\\left(${Array.from({ length: n + 1 }, (_, k) => `${k % 2 ? '-' : k ? '+' : ''}\\frac{1}{${k}!}`).join(' ')}\\right) = ${d}` : `!${n} = ${n}!\\sum_{k=0}^{${n}} \\frac{(-1)^k}{k!}` },
      { title: 'Probability that a random arrangement has no item in place', tex: n <= 20 ? `\\frac{!${n}}{${n}!} = \\frac{${d}}{${f}} \\approx ${p.toFixed(8)}` : `\\frac{!${n}}{${n}!} \\approx \\frac{1}{e} \\approx ${p.toFixed(8)}` },
    ];
    let html = '';
    if (n >= 1 && n <= 5) {
      const list = derangementList(n);
      html = `<p class="combo-head">All ${list.length} derangement${list.length === 1 ? '' : 's'} of ${L.slice(0, n).split('').join('')} (letter i must not stay in position i)</p><ul class="combo-list">${list.map((p2) => `<li>${p2.map((i) => L[i]).join('')}</li>`).join('')}</ul>`;
    }
    const ks = Array.from({ length: 12 }, (_, k) => k + 1);
    const svg = plot({ x: [0.3, 12.7], y: [0, 0.6], width: 380, height: 220, title: 'Probability of a derangement for n = 1 to 12', bars: ks.map((k) => ({ x: k, w: 0.7, h: Number(subfactorial(k)) / Number(factorial(k)), cls: k === n ? 'd-bar-hi' : 'd-bar' })), hlines: [{ y: 1 / Math.E, cls: 'd-line3', label: '1/e' }] });
    return {
      ok: true,
      final: { tex: `!${n} = ${show(d).replace(/,/g, '{,}')}` },
      answers: [{ label: `Derangements !${n}`, value: show(d), primary: true, copy: d.toString() }, answer('Probability !n / n!', p, { primary: true, irrational: true, decimals: 8 }), { label: `Total arrangements ${n}!`, value: show(f), copy: f.toString() }],
      visual: { svg: html ? `${svg}<div class="p-2">${html}</div>` : svg, caption: 'The probability settles at 1/e ≈ 0.3679 very quickly as n grows.' },
      formula: ['!n = n!\\sum_{k=0}^{n} \\frac{(-1)^k}{k!} \\qquad !n = (n - 1)\\left(!(n - 1) + !(n - 2)\\right)'],
      steps,
      notes: [{ kind: 'info', text: n === 1 ? 'With one item, the only arrangement leaves it in place, so there are no derangements.' : 'Surprisingly, the chance that nobody gets their own item hardly depends on n once n ≥ 4: it is always about 37%.' }],
    };
  },
};
