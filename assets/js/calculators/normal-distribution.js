/** Normal distribution probabilities P(X < a), P(X > a), P(a < X < b) and percentiles (inverse). */
import { validator, fmt, tx, eq } from '../lib/calc-kit.js';
import { normalCdf, normalInv } from '../lib/numeric.js';
import { normalGraph, fmtP, texP } from '../lib/stats-kit.js';

import { normalExplore } from '../explore/data.js';
export const calculator = {
  id: 'normal-distribution',
  explore: normalExplore,
  fields: [
    { name: 'mu', label: 'Mean μ', type: 'number', placeholder: 'e.g. 100', row: 'p' },
    { name: 'sigma', label: 'Standard deviation σ', type: 'number', signed: false, placeholder: 'e.g. 15', row: 'p' },
    { name: 'type', label: 'Find', type: 'select', options: [['lt', 'P(X < a) — area to the left'], ['gt', 'P(X > a) — area to the right'], ['between', 'P(a < X < b) — area between'], ['inv', 'Percentile: x with P(X < x) = p']] },
    { name: 'a', label: 'a', type: 'number', placeholder: 'e.g. 120', row: 'ab', showWhen: { type: ['lt', 'gt', 'between'] }, rowShowWhen: { type: ['lt', 'gt', 'between'] } },
    { name: 'b', label: 'b', type: 'number', placeholder: 'e.g. 130', row: 'ab', showWhen: { type: ['between'] } },
    { name: 'p', label: 'Probability p (or percentile ÷ 100)', type: 'number', signed: false, placeholder: 'e.g. 0.95', showWhen: { type: ['inv'] } },
  ],
  examples: [
    { label: 'IQ: P(X < 120), μ = 100, σ = 15', values: { mu: '100', sigma: '15', type: 'lt', a: '120' } },
    { label: 'P(85 < X < 115)', values: { mu: '100', sigma: '15', type: 'between', a: '85', b: '115' } },
    { label: '90th percentile', values: { mu: '100', sigma: '15', type: 'inv', p: '0.9' } },
    { label: 'Right tail: P(X > 2.2), μ = 2, σ = 0.1', values: { mu: '2', sigma: '0.1', type: 'gt', a: '2.2' } },
  ],
  solve(values) {
    const v = validator(values);
    const mu = v.number('mu', 'the mean');
    const sigma = v.number('sigma', 'the standard deviation', { positive: true });
    const type = ['lt', 'gt', 'between', 'inv'].includes(values.type) ? values.type : 'lt';
    let a, b, p;
    if (type === 'inv') p = v.number('p', 'the probability p');
    else { a = v.number('a', 'a'); if (type === 'between') b = v.number('b', 'b'); }
    if (!v.ok()) return v.result();
    if (type === 'inv' && !(p > 0 && p < 1)) return { ok: false, errors: [{ field: 'p', message: 'p must be strictly between 0 and 1 (for the 95th percentile enter 0.95).' }] };
    if (type === 'between' && !(b > a)) return { ok: false, errors: [{ field: ['a', 'b'], message: 'b must be greater than a.' }] };
    const steps = [{ title: 'Identify the distribution', tex: `X \\sim N(\\mu = ${tx(mu)},\\ \\sigma = ${tx(sigma)})` }];
    const zOf = (x) => (x - mu) / sigma;
    if (type === 'inv') {
      const z = normalInv(p);
      const x = mu + z * sigma;
      steps.push({ title: 'Find the z-score with area p to its left', text: 'Use the inverse of the standard normal CDF (a z-table read backwards).', tex: `\\Phi(z) = ${tx(p)} \\;\\Rightarrow\\; z \\approx ${tx(z)}` });
      steps.push({ title: 'Convert back to x', texLines: ['x = \\mu + z\\sigma', `x = ${tx(mu)} + (${tx(z)})(${tx(sigma)}) \\approx ${tx(x)}`] });
      return {
        ok: true,
        final: { tex: `x \\approx ${tx(x)}` },
        answers: [{ label: `x at the ${fmt(p * 100, 4)}th percentile`, value: fmt(x), approx: true, primary: true }, { label: 'z-score', value: fmt(z), approx: true }],
        visual: { svg: normalGraph(mu, sigma, -Infinity, x, [{ x, label: `x ≈ ${fmt(x, 3)}` }]), caption: `${fmt(p * 100, 4)}% of the distribution lies below x.` },
        formula: ['x = \\mu + z\\sigma, \\quad \\Phi(z) = p'], steps,
        rounding: 'The inverse normal is computed to about 15 significant digits and rounded to 6 decimal places.',
      };
    }
    let prob, lo = -Infinity, hi = Infinity, notation;
    const za = zOf(a), Pa = normalCdf(za);
    steps.push({ title: 'Standardise', texLines: [`z_a = \\frac{${tx(a)} - ${tx(mu)}}{${tx(sigma)}} ${eq(za)}`, ...(type === 'between' ? [`z_b = \\frac{${tx(b)} - ${tx(mu)}}{${tx(sigma)}} ${eq(zOf(b))}`] : [])] });
    if (type === 'lt') {
      prob = Pa; hi = a; notation = `P(X < ${tx(a)})`;
      steps.push({ title: 'Area to the left', tex: `P(X < ${tx(a)}) = \\Phi(${tx(za, 4)}) \\approx ${texP(prob)}` });
    } else if (type === 'gt') {
      prob = 1 - Pa; lo = a; notation = `P(X > ${tx(a)})`;
      steps.push({ title: 'Area to the right (complement)', tex: `P(X > ${tx(a)}) = 1 - \\Phi(${tx(za, 4)}) \\approx 1 - ${texP(Pa)} \\approx ${texP(prob)}` });
    } else {
      const Pb = normalCdf(zOf(b));
      prob = Pb - Pa; lo = a; hi = b; notation = `P(${tx(a)} < X < ${tx(b)})`;
      steps.push({ title: 'Area between: subtract the left areas', tex: `\\Phi(${tx(zOf(b), 4)}) - \\Phi(${tx(za, 4)}) \\approx ${texP(Pb)} - ${texP(Pa)} \\approx ${texP(prob)}` });
    }
    return {
      ok: true,
      final: { tex: `${notation} \\approx ${texP(prob)}` },
      answers: [{ label: 'Probability', value: fmtP(prob), approx: true, primary: true }, { label: 'As a percentage', value: `${fmt(prob * 100, 4)}%`, approx: true }, { label: 'z-score of a', value: fmt(za), approx: true }],
      visual: { svg: normalGraph(mu, sigma, lo, hi, [{ x: a, label: 'a' }, ...(type === 'between' ? [{ x: b, label: 'b' }] : [])]), caption: 'The shaded area under the curve equals the probability.' },
      formula: ['P(X < a) = \\Phi\\left(\\frac{a - \\mu}{\\sigma}\\right)'],
      steps,
      notes: [{ kind: 'info', text: 'For a continuous distribution P(X < a) = P(X ≤ a): a single point has probability 0.' }],
      rounding: 'Φ is computed with a series/continued-fraction method accurate to about 15 digits; results are rounded to 6 decimal places.',
    };
  },
};
