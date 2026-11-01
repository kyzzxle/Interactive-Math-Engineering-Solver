/**
 * Variance and standard deviation, population (divide by N) and sample (divide by n − 1).
 * Sums of squared deviations are computed exactly with fractions, so there is no cancellation error.
 */
import { fmt, tx, isExact } from '../lib/calc-kit.js';
import { Frac } from '../lib/fraction.js';
import { DATA_FIELD, parseData } from '../lib/stats-kit.js';
import { plot } from '../lib/plot.js';

export const calculator = {
  id: 'variance-and-standard-deviation',
  fields: [
    DATA_FIELD,
    { name: 'kind', label: 'Your data are', type: 'radio', options: [['sample', 'A sample (use n − 1)'], ['population', 'The whole population (use N)']] },
  ],
  examples: [
    { label: 'Sample: 2, 4, 4, 4, 5, 5, 7, 9', values: { data: '2, 4, 4, 4, 5, 5, 7, 9', kind: 'sample' } },
    { label: 'Population: 2, 4, 4, 4, 5, 5, 7, 9', values: { data: '2, 4, 4, 4, 5, 5, 7, 9', kind: 'population' } },
    { label: 'Measurements (decimals)', values: { data: '9.8 10.1 10.0 9.9 10.3 9.7 10.2', kind: 'sample' } },
  ],
  solve(values) {
    const p = parseData(values.data, { min: 2 });
    if (p.error) return { ok: false, errors: [{ field: 'data', message: p.error === 'Enter at least 2 values.' ? 'Enter at least 2 values: the spread of a single value is not defined for a sample.' : p.error }] };
    const sample = values.kind !== 'population';
    const n = p.fracs.length;
    const mean = p.fracs.reduce((s, f) => s.add(f), new Frac(0n)).div(n);
    const devs = p.fracs.map((f) => f.sub(mean));
    const ss = devs.reduce((s, d) => s.add(d.mul(d)), new Frac(0n));
    const denom = sample ? n - 1 : n;
    const varF = ss.div(denom);
    const sd = Math.sqrt(varF.toNumber());
    const popVar = ss.div(n).toNumber(), sampVar = ss.div(n - 1).toNumber();
    const sym = sample ? { m: '\\bar{x}', v: 's^2', s: 's', d: 'n - 1' } : { m: '\\mu', v: '\\sigma^2', s: '\\sigma', d: 'N' };
    const dec = (f) => (f.toDecimal(6) ? f.toDecimal(6) : `${f.toTex()} \\approx ${tx(f.toNumber())}`);
    const steps = [
      { title: 'Mean of the data', texLines: [`${sym.m} = \\frac{\\sum x_i}{${sample ? 'n' : 'N'}} = ${dec(mean)}`] },
      { title: 'Deviation of each value from the mean, squared', text: 'Subtract the mean from every value and square the result (see the table). Squaring makes every deviation positive.' },
      { title: 'Sum of squared deviations', tex: `SS = \\sum (x_i - ${sym.m})^2 = ${dec(ss)}` },
      { title: sample ? 'Divide by n − 1 (sample variance)' : 'Divide by N (population variance)', text: sample ? 'Dividing by n − 1 instead of n (Bessel’s correction) makes the sample variance an unbiased estimate of the population variance.' : 'For a complete population, average the squared deviations over all N values.', texLines: [`${sym.v} = \\frac{SS}{${sym.d}} = \\frac{${dec(ss).split(' ')[0]}}{${denom}} = ${dec(varF)}`] },
      { title: 'Standard deviation: square root of the variance', tex: `${sym.s} = \\sqrt{${sym.v}} = \\sqrt{${tx(varF.toNumber())}} \\approx ${tx(sd)}` },
    ];
    const rows = p.fracs.slice(0, 50).map((f, i) => [String(i + 1), fmt(f.toNumber()), fmt(devs[i].toNumber()), fmt(devs[i].mul(devs[i]).toNumber())]);
    const xs = p.values, m = mean.toNumber();
    const lo = Math.min(...xs), hi = Math.max(...xs), span = Math.max(hi - lo, sd * 4, 1e-9);
    const svg = plot({
      x: [Math.min(lo, m - 2 * sd) - span * 0.1, Math.max(hi, m + 2 * sd) + span * 0.1], y: [0, 1],
      shade: [{ f: () => 0.95, g: () => 0.05, a: m - sd, b: m + sd, cls: 'd-shade2' }],
      vlines: [{ x: m, cls: 'd-line', label: 'mean' }],
      points: xs.slice(0, 500).map((x, i) => ({ x, y: 0.2 + 0.6 * ((i * 0.618) % 1), r: 3, cls: 'd-point' })),
      includeZero: false, title: 'Data values with the band mean ± one standard deviation shaded',
    });
    return {
      ok: true,
      final: { texLines: [`${sym.v} = ${dec(varF)}`, `${sym.s} \\approx ${tx(sd)}`] },
      answers: [
        { label: sample ? 'Sample standard deviation s' : 'Population standard deviation σ', value: fmt(sd), approx: !isExact(sd) || Math.abs(sd - Math.round(sd * 1e6) / 1e6) > 1e-12, primary: true },
        { label: sample ? 'Sample variance s²' : 'Population variance σ²', value: fmt(varF.toNumber()), approx: !varF.toDecimal(6), exactTex: varF.toDecimal(6) ? undefined : varF.toTex(), primary: true },
        { label: 'Mean', value: fmt(m), approx: !mean.toDecimal(6) },
        { label: 'Sum of squares SS', value: fmt(ss.toNumber()), approx: !ss.toDecimal(6) },
        { label: 'Count', value: String(n) },
        { label: sample ? 'For comparison: population σ' : 'For comparison: sample s', value: fmt(Math.sqrt(sample ? popVar : sampVar)), approx: true },
      ],
      visual: { svg, caption: 'The shaded band runs from one standard deviation below the mean to one above it.' },
      tables: [{ caption: n > 50 ? 'Deviations (first 50 values shown)' : 'Deviations from the mean', headers: ['#', 'x', `x − mean`, '(x − mean)²'], rows }],
      formula: [sample ? 's^2 = \\frac{\\sum (x_i - \\bar{x})^2}{n - 1} \\qquad s = \\sqrt{s^2}' : '\\sigma^2 = \\frac{\\sum (x_i - \\mu)^2}{N} \\qquad \\sigma = \\sqrt{\\sigma^2}'],
      steps,
      rounding: 'The variance is computed exactly; decimals are rounded to 6 places.',
    };
  },
};
