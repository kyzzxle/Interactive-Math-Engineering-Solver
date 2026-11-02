/**
 * Probability by counting with combinations (the hypergeometric distribution): a group of N
 * items contains K "successes"; n items are chosen at random without replacement. Then
 *   P(X = k) = C(K, k) · C(N − K, n − k) / C(N, n)
 * Exact fractions (BigInt), plus "at least", "at most" and the full distribution chart.
 */
import { validator, answer, fmt, tx } from '../lib/calc-kit.js';
import { binomial } from '../lib/bigint.js';
import { Frac } from '../lib/fraction.js';
import { plot } from '../lib/plot.js';
import { randInt, pick } from '../lib/learn.js';

const C = (n, r) => (r < 0 || r > n ? 0n : binomial(n, r));
const pmf = (N, K, n, k) => new Frac(C(K, k) * C(N - K, n - k), C(N, n));

export const calculator = {
  id: 'counting-probability',
  practice: {
    title: 'Choosing a committee',
    generate(rand) {
      const W = randInt(rand, 3, 8), M = randInt(rand, 3, 8), n = randInt(rand, 2, Math.min(5, W + M - 1)), k = randInt(rand, 0, Math.min(n, W));
      const P = pmf(W + M, W, n, k);
      return {
        prompt: `<p>A class has <strong>${W} girls</strong> and <strong>${M} boys</strong>. A committee of <strong>${n}</strong> is chosen at random. What is the probability that it has exactly <strong>${k} girl${k === 1 ? '' : 's'}</strong>? Give a decimal to 4 places.</p>`,
        answers: [{ label: 'Probability', value: P.toNumber(), decimals: 4 }],
        hint: 'Count the favourable committees (choose the girls, then the boys) and divide by all possible committees.',
        hintTex: 'P = \\frac{\\binom{K}{k}\\binom{N - K}{n - k}}{\\binom{N}{n}}',
        steps: [
          { title: 'Favourable committees', tex: `\\binom{${W}}{${k}}\\binom{${M}}{${n - k}} = ${C(W, k)} \\times ${C(M, n - k)} = ${C(W, k) * C(M, n - k)}` },
          { title: 'All committees', tex: `\\binom{${W + M}}{${n}} = ${C(W + M, n)}` },
          { title: 'Probability', tex: `P = ${P.toTex()} \\approx ${P.toNumber().toFixed(4)}` },
        ],
      };
    },
  },
  fields: [
    { name: 'N', label: 'Total number of items N', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 52', row: 'pop' },
    { name: 'K', label: 'Of these, “successes” K', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 13', row: 'pop', hint: 'For example the hearts in a deck, or the defective items in a batch.' },
    { name: 'n', label: 'Number chosen n', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 5', row: 'draw' },
    { name: 'k', label: 'Successes wanted k', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 2', row: 'draw' },
    { name: 'type', label: 'Probability of', type: 'radio', options: [['eq', 'exactly k'], ['ge', 'at least k'], ['le', 'at most k']] },
  ],
  examples: [
    { label: 'Exactly 2 hearts in a 5-card hand', values: { N: '52', K: '13', n: '5', k: '2', type: 'eq' } },
    { label: 'At least 1 defective in 4 from 20 (3 bad)', values: { N: '20', K: '3', n: '4', k: '1', type: 'ge' } },
    { label: 'Lottery: all 6 of 6 from 49', values: { N: '49', K: '6', n: '6', k: '6', type: 'eq' } },
    { label: 'Impossible: K larger than N', values: { N: '10', K: '12', n: '3', k: '1', type: 'eq' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const N = v.whole('N', 'N', 100000, 1), K = v.whole('K', 'K', 100000), n = v.whole('n', 'n', 100000, 1), k = v.whole('k', 'k', 100000);
    if (!v.ok()) return v.result();
    if (K > N) return { ok: false, errors: [{ field: 'K', message: 'There cannot be more successes K than items N.' }] };
    if (n > N) return { ok: false, errors: [{ field: 'n', message: 'You cannot choose more items n than there are (N).' }] };
    if (k > n) return { ok: false, errors: [{ field: 'k', message: 'k cannot be larger than the number chosen n.' }] };
    const type = ['eq', 'ge', 'le'].includes(values.type) ? values.type : 'eq';
    const lo = Math.max(0, n - (N - K)), hi = Math.min(n, K);
    const ks = type === 'eq' ? [k] : type === 'ge' ? Array.from({ length: Math.max(0, hi - k + 1) }, (_, i) => k + i) : Array.from({ length: Math.max(0, Math.min(k, hi) + 1) }, (_, i) => i);
    let P = new Frac(0n);
    for (const j of ks) if (j >= lo && j <= hi) P = P.add(pmf(N, K, n, j));
    const total = C(N, n);
    const big = (x) => (x.toString().length > 15 ? `${x.toString().slice(0, 6)}… (${x.toString().length} digits)` : x.toString());
    const fav = C(K, k) * C(N - K, n - k);
    const steps = [
      { title: 'Count all equally likely selections', tex: `\\binom{N}{n} = \\binom{${N}}{${n}} = ${big(total)}` },
      { title: `Count selections with exactly ${k} successes`, tex: `\\binom{K}{k}\\binom{N - K}{n - k} = \\binom{${K}}{${k}}\\binom{${N - K}}{${n - k}} = ${big(C(K, k))} \\times ${big(C(N - K, n - k))} = ${big(fav)}` },
      { title: 'Divide', tex: `P(X = ${k}) = \\frac{${big(fav)}}{${big(total)}}${total.toString().length < 30 ? ` = ${pmf(N, K, n, k).toTex()}` : ''} \\approx ${tx(pmf(N, K, n, k).toNumber(), 8)}` },
    ];
    if (type !== 'eq') {
      steps.push({ title: type === 'ge' ? `Add the cases k = ${k}, …, ${hi}` : `Add the cases k = 0, …, ${Math.min(k, hi)}`, tex: `P = \\sum P(X = j) \\approx ${tx(P.toNumber(), 8)}`, text: type === 'ge' && k >= 1 ? `Shortcut: P(X ≥ ${k}) = 1 − P(X ≤ ${k - 1}).` : '' });
    }
    const dist = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    const exactTex = P.d.toString().length < 25 ? P.toTex() : null;
    const sym = { eq: '=', ge: '\\ge', le: '\\le' }[type];
    return {
      ok: true,
      final: { tex: `P(X ${sym} ${k}) ${exactTex ? `= ${exactTex}` : ''} \\approx ${tx(P.toNumber(), 8)}` },
      answers: [answer('Probability', P.toNumber(), { primary: true, irrational: true, decimals: 8, exactTex: exactTex && !P.isInt() ? exactTex : undefined }), answer('As a percentage', 100 * P.toNumber(), { unit: '%', irrational: true, decimals: 6 }), answer('Expected number of successes nK/N', (n * K) / N)],
      visual: dist.length <= 60 ? { svg: plot({ x: [lo - 0.8, hi + 0.8], width: 380, height: 240, title: 'Probability of each number of successes', bars: dist.map((j) => ({ x: j, w: 0.7, h: pmf(N, K, n, j).toNumber(), cls: ks.includes(j) ? 'd-bar-hi' : 'd-bar' })), xTicks: dist.length <= 20 ? dist.map((j) => ({ x: j, label: String(j) })) : undefined }), caption: 'Highlighted bars are included in the probability.' } : undefined,
      formula: ['P(X = k) = \\frac{\\binom{K}{k}\\binom{N - K}{n - k}}{\\binom{N}{n}}'],
      steps,
      notes: [{ kind: 'info', text: 'Assumes every selection of n items is equally likely and items are not replaced. With replacement, use the binomial distribution instead. Order does not matter here, so combinations (not permutations) are counted.' }],
    };
  },
};
