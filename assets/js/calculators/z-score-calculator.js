/** z-scores: z = (x − μ)/σ, the reverse x = μ + zσ, and the matching percentile Φ(z). */
import { validator, fmt, tx, eq, isExact } from '../lib/calc-kit.js';
import { normalCdf } from '../lib/numeric.js';
import { normalGraph, fmtP, texP } from '../lib/stats-kit.js';

export const calculator = {
  id: 'z-score-calculator',
  fields: [
    { name: 'mode', label: 'Find', type: 'radio', options: [['z', 'z from a value x'], ['x', 'x from a z-score']] },
    { name: 'mu', label: 'Mean μ', type: 'number', placeholder: 'e.g. 70', row: 'p' },
    { name: 'sigma', label: 'Standard deviation σ', type: 'number', signed: false, placeholder: 'e.g. 8', row: 'p' },
    { name: 'x', label: 'Value x', type: 'number', placeholder: 'e.g. 82', showWhen: { mode: ['z'] } },
    { name: 'z', label: 'z-score', type: 'number', placeholder: 'e.g. 1.5', showWhen: { mode: ['x'] } },
  ],
  examples: [
    { label: 'Score 82 when μ = 70, σ = 8', values: { mode: 'z', mu: '70', sigma: '8', x: '82' } },
    { label: 'Height 160 when μ = 170, σ = 6.5', values: { mode: 'z', mu: '170', sigma: '6.5', x: '160' } },
    { label: 'Value 2 SDs above μ = 100, σ = 15', values: { mode: 'x', mu: '100', sigma: '15', z: '2' } },
  ],
  solve(values) {
    const v = validator(values);
    const mode = values.mode === 'x' ? 'x' : 'z';
    const mu = v.number('mu', 'the mean');
    const sigma = v.number('sigma', 'the standard deviation', { positive: true });
    let x, z;
    if (mode === 'z') x = v.number('x', 'the value x'); else z = v.number('z', 'the z-score', { maxAbs: 40 });
    if (!v.ok()) return v.result();
    const steps = [];
    if (mode === 'z') {
      z = (x - mu) / sigma;
      steps.push({ title: 'Identify the values', tex: `x = ${tx(x)}, \\quad \\mu = ${tx(mu)}, \\quad \\sigma = ${tx(sigma)}` });
      steps.push({ title: 'Standardise', text: 'The z-score counts how many standard deviations x lies above (+) or below (−) the mean.', texLines: ['z = \\frac{x - \\mu}{\\sigma}', `z = \\frac{${tx(x)} - ${tx(mu)}}{${tx(sigma)}} ${eq(z)}`] });
    } else {
      x = mu + z * sigma;
      steps.push({ title: 'Identify the values', tex: `z = ${tx(z)}, \\quad \\mu = ${tx(mu)}, \\quad \\sigma = ${tx(sigma)}` });
      steps.push({ title: 'Undo the standardisation', texLines: ['x = \\mu + z\\sigma', `x = ${tx(mu)} + (${tx(z)})(${tx(sigma)}) ${eq(x)}`] });
    }
    const below = normalCdf(z);
    steps.push({ title: 'Percentile (if the data are normally distributed)', texLines: [`P(Z < ${tx(z, 4)}) = \\Phi(${tx(z, 4)}) \\approx ${texP(below)}`], text: `About ${fmt(below * 100, 2)}% of values lie below x and ${fmt((1 - below) * 100, 2)}% above it.` });
    return {
      ok: true,
      final: { tex: mode === 'z' ? `z ${eq(z)}` : `x ${eq(x)}` },
      answers: [
        mode === 'z' ? { label: 'z-score', value: fmt(z), approx: !isExact(z), primary: true } : { label: 'Value x', value: fmt(x), primary: true },
        { label: 'Percentile (area below)', value: `${fmt(below * 100, 4)}%`, approx: true },
        { label: 'P(Z < z)', value: fmtP(below), approx: true },
        { label: 'P(Z > z)', value: fmtP(1 - below), approx: true },
        { label: 'Interpretation', value: `${fmt(Math.abs(z), 4)} standard deviation${Math.abs(z) === 1 ? '' : 's'} ${z >= 0 ? 'above' : 'below'} the mean` },
      ],
      visual: { svg: normalGraph(mu, sigma, -Infinity, x, [{ x, label: `x = ${fmt(x, 3)}` }]), caption: `The shaded area (${fmt(below * 100, 2)}%) is the proportion of the distribution below x.` },
      formula: ['z = \\frac{x - \\mu}{\\sigma} \\qquad x = \\mu + z\\sigma'],
      steps,
      notes: Math.abs(z) > 3 ? [{ kind: 'info', text: 'A |z| above 3 is unusual: fewer than 0.3% of values in a normal distribution are that far from the mean.' }] : [],
      rounding: 'z is rounded to 6 decimal places; probabilities use an accurate (≈15 digit) normal CDF and are rounded to 6 places.',
    };
  },
};
