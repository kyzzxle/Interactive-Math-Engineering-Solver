/**
 * Binomial probabilities for X ~ B(n, p):  P(X = k) = C(n, k) p^k (1 − p)^(n − k).
 * Probabilities are computed in log space (log-gamma) so large n does not overflow.
 */
import { validator, fmt, tx } from '../lib/calc-kit.js';
import { lgamma } from '../lib/numeric.js';
import { binomial } from '../lib/bigint.js';
import { fmtP, texP } from '../lib/stats-kit.js';
import { Frac, parseFrac } from '../lib/fraction.js';
import { plot } from '../lib/plot.js';

import { binomialExplore } from '../explore/data.js';
export const calculator = {
  id: 'binomial-probability',
  explore: binomialExplore,
  fields: [
    { name: 'n', label: 'Number of trials n', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 10', row: 'np' },
    { name: 'p', label: 'Probability of success p', type: 'number', signed: false, placeholder: 'e.g. 0.3', row: 'np' },
    { name: 'type', label: 'Find', type: 'select', options: [['eq', 'P(X = k)'], ['le', 'P(X ≤ k)'], ['lt', 'P(X < k)'], ['ge', 'P(X ≥ k)'], ['gt', 'P(X > k)'], ['range', 'P(k₁ ≤ X ≤ k₂)']] },
    { name: 'k', label: 'k (number of successes)', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 3', row: 'k' },
    { name: 'k2', label: 'k₂ (upper)', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 5', row: 'k', showWhen: { type: ['range'] } },
  ],
  examples: [
    { label: 'Exactly 3 heads in 10 fair tosses', values: { n: '10', p: '0.5', type: 'eq', k: '3' } },
    { label: 'At most 2 defects, n = 20, p = 0.05', values: { n: '20', p: '0.05', type: 'le', k: '2' } },
    { label: 'At least 8 of 12, p = 0.6', values: { n: '12', p: '0.6', type: 'ge', k: '8' } },
    { label: 'Between 40 and 60 of 100, p = 0.5', values: { n: '100', p: '0.5', type: 'range', k: '40', k2: '60' } },
  ],
  solve(values) {
    const v = validator(values);
    const n = v.whole('n', 'the number of trials n', 100000, 1);
    const p = v.number('p', 'the probability p', { min: 0, max: 1 });
    const type = ['eq', 'le', 'lt', 'ge', 'gt', 'range'].includes(values.type) ? values.type : 'eq';
    const k = v.whole('k', 'k', 100000);
    const k2 = type === 'range' ? v.whole('k2', 'k₂', 100000) : undefined;
    if (!v.ok()) return v.result();
    if (k > n) return { ok: false, errors: [{ field: 'k', message: `k cannot be more than the number of trials n = ${n}.` }] };
    if (type === 'range' && (k2 > n || k2 < k)) return { ok: false, errors: [{ field: 'k2', message: `k₂ must be between k₁ = ${k} and n = ${n}.` }] };
    const q = 1 - p;
    const logC = (j) => lgamma(n + 1) - lgamma(j + 1) - lgamma(n - j + 1);
    const pmf = (j) => {
      if (p === 0) return j === 0 ? 1 : 0;
      if (p === 1) return j === n ? 1 : 0;
      return Math.exp(logC(j) + j * Math.log(p) + (n - j) * Math.log(q));
    };
    const sum = (lo, hi) => { let s = 0; for (let j = lo; j <= hi; j++) s += pmf(j); return Math.min(1, Math.max(0, s)); };
    let prob, lo, hi, notation;
    switch (type) {
      case 'eq': lo = hi = k; notation = `P(X = ${k})`; break;
      case 'le': lo = 0; hi = k; notation = `P(X \\le ${k})`; break;
      case 'lt': lo = 0; hi = k - 1; notation = `P(X < ${k})`; break;
      case 'ge': lo = k; hi = n; notation = `P(X \\ge ${k})`; break;
      case 'gt': lo = k + 1; hi = n; notation = `P(X > ${k})`; break;
      default: lo = k; hi = k2; notation = `P(${k} \\le X \\le ${k2})`;
    }
    prob = hi < lo ? 0 : sum(lo, hi);
    // exact fraction when n is moderate and p is a terminating decimal or fraction
    let exact = null;
    const pF = parseFrac(values.p);
    if (pF && n <= 300 && hi >= lo) {
      const qF = new Frac(1n).sub(pF);
      let s = new Frac(0n);
      for (let j = lo; j <= hi; j++) s = s.add(new Frac(binomial(n, j)).mul(pF.pow(j)).mul(qF.pow(n - j)));
      exact = s;
      prob = s.toNumber();
    }
    const exactShort = exact && exact.d.toString().length <= 12 ? exact : null;
    const mean = n * p, variance = n * p * q;
    const Cexact = n <= 1000 ? binomial(n, k) : null;
    const steps = [
      { title: 'Check the binomial setting', text: `n = ${n} independent trials, each a success with the same probability p = ${fmt(p)} (so q = 1 − p = ${fmt(q)}). X counts the successes.` },
      { title: 'Probability of exactly k successes', texLines: ['P(X = k) = \\binom{n}{k} p^{k} q^{\\,n-k}', `P(X = ${k}) = \\binom{${n}}{${k}} (${tx(p)})^{${k}} (${tx(q)})^{${n - k}}`, `= ${Cexact !== null && Cexact.toString().length <= 18 ? Cexact.toString() : `\\binom{${n}}{${k}}`} \\times ${texP(Math.pow(p, k))} \\times ${texP(Math.pow(q, n - k))} \\approx ${texP(pmf(k))}`] },
    ];
    if (type !== 'eq') {
      const count = Math.max(0, hi - lo + 1);
      const useComplement = count > (n + 1) / 2 && (type === 'ge' || type === 'gt');
      steps.push({
        title: 'Add the probabilities of every included value',
        text: hi < lo ? 'No values are included, so the probability is 0.' : `${notation.replace(/\\le/g, '≤').replace(/\\ge/g, '≥')} adds P(X = j) for j = ${lo} to ${hi} (${count} term${count === 1 ? '' : 's'}).${useComplement ? ' Equivalently, 1 minus the probability of the other values.' : ''}`,
        tex: hi < lo ? `${notation} = 0` : `${notation} = \\sum_{j=${lo}}^{${hi}} \\binom{${n}}{j} p^{j} q^{\\,${n}-j} \\approx ${texP(prob)}`,
      });
    }
    steps.push({ title: 'Mean and standard deviation of X', texLines: [`\\mu = np = ${tx(mean)}`, `\\sigma = \\sqrt{npq} = \\sqrt{${tx(variance)}} \\approx ${tx(Math.sqrt(variance))}`] });
    // bar chart (window around the mean for large n)
    const sd = Math.sqrt(variance);
    const from = n <= 60 ? 0 : Math.max(0, Math.floor(mean - 5 * sd - 1)), to = n <= 60 ? n : Math.min(n, Math.ceil(mean + 5 * sd + 1));
    const bars = [];
    for (let j = from; j <= to; j++) bars.push({ x: j, h: pmf(j), w: 0.8, cls: j >= lo && j <= hi ? 'd-bar-hi' : 'd-bar' });
    const svg = plot({ x: [from - 1, to + 1], bars, includeZero: true, title: 'Binomial probability distribution with the requested outcomes highlighted' });
    return {
      ok: true,
      final: { tex: `${notation} ${exactShort ? `= ${exactShort.toTex()} ` : ''}${exact && exact.toDecimal(6) ? `= ${exact.toDecimal(6)}` : `\\approx ${texP(prob)}`}` },
      answers: [
        { label: 'Probability', value: exact && exact.toDecimal(6) ? exact.toDecimal(6) : fmtP(prob), approx: !(exact && exact.toDecimal(6)), exactTex: exactShort && !exactShort.isInt() ? exactShort.toTex() : undefined, primary: true },
        { label: `P(X = ${k})`, value: fmtP(pF && n <= 300 ? new Frac(binomial(n, k)).mul(pF.pow(k)).mul(new Frac(1n).sub(pF).pow(n - k)).toNumber() : pmf(k)), approx: true },
        { label: 'Mean μ = np', value: fmt(mean) },
        { label: 'Standard deviation σ', value: fmt(sd), approx: true },
      ],
      visual: { svg, caption: `Highlighted bars are the values of X included in ${notation.replace(/\\le/g, '≤').replace(/\\ge/g, '≥').replace(/\\/g, '')}.${n > 60 ? ' Only values near the mean are drawn; the others have negligible probability.' : ''}` },
      formula: ['P(X = k) = \\binom{n}{k} p^k (1 - p)^{n-k}'],
      steps,
      rounding: exact ? 'The probability was computed exactly with fractions and rounded to 6 decimal places.' : 'Probabilities are computed with logarithms of factorials (about 13 significant digits) and rounded to 6 decimal places; tiny values are shown in scientific notation.',
    };
  },
};
