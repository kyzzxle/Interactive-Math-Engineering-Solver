/**
 * Confidence intervals from summary statistics:
 *   mean, σ known:    x̄ ± z*·σ/√n
 *   mean, σ unknown:  x̄ ± t*·s/√n   with n − 1 degrees of freedom
 *   proportion:       p̂ ± z*·√(p̂(1 − p̂)/n)   (Wald interval; requires np̂ ≥ 10 and n(1 − p̂) ≥ 10)
 */
import { validator, fmt, tx, isExact } from '../lib/calc-kit.js';
import { normalInv, tInv } from '../lib/numeric.js';
import { plot } from '../lib/plot.js';

export const calculator = {
  id: 'confidence-interval',
  fields: [
    { name: 'type', label: 'Interval for', type: 'select', options: [['z', 'A mean, population σ known (z-interval)'], ['t', 'A mean, σ unknown — sample s (t-interval)'], ['prop', 'A proportion (one-proportion z-interval)']] },
    { name: 'mean', label: 'Sample mean x̄', type: 'number', placeholder: 'e.g. 52.3', showWhen: { type: ['z', 't'] } },
    { name: 'sd', label: 'Standard deviation (σ or s)', type: 'number', signed: false, placeholder: 'e.g. 6.1', showWhen: { type: ['z', 't'] } },
    { name: 'x', label: 'Number of successes x', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 412', showWhen: { type: ['prop'] } },
    { name: 'n', label: 'Sample size n', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 40' },
    { name: 'level', label: 'Confidence level', type: 'select', options: [['90', '90%'], ['95', '95%'], ['98', '98%'], ['99', '99%'], ['99.9', '99.9%']], default: '95' },
  ],
  examples: [
    { label: 't-interval: x̄ = 52.3, s = 6.1, n = 15', values: { type: 't', mean: '52.3', sd: '6.1', n: '15', level: '95' } },
    { label: 'z-interval: x̄ = 100, σ = 15, n = 36', values: { type: 'z', mean: '100', sd: '15', n: '36', level: '95' } },
    { label: 'Proportion: 412 of 1000', values: { type: 'prop', x: '412', n: '1000', level: '99' } },
  ],
  solve(values) {
    const v = validator(values);
    const type = ['z', 't', 'prop'].includes(values.type) ? values.type : 'z';
    const n = v.whole('n', 'the sample size n', 1e9, type === 't' ? 2 : 1);
    const level = Number(values.level);
    if (![90, 95, 98, 99, 99.9].includes(level)) v.fail('level', 'Choose a confidence level from the list.');
    let mean, sd, x;
    if (type === 'prop') x = v.whole('x', 'the number of successes x', 1e9);
    else { mean = v.number('mean', 'the sample mean'); sd = v.number('sd', 'the standard deviation', { positive: true }); }
    if (!v.ok()) return v.result();
    const alpha = 1 - level / 100;
    const steps = [];
    let est, se, crit, critName, critTex, notes = [];
    if (type === 'prop') {
      if (x > n) return { ok: false, errors: [{ field: 'x', message: `The number of successes (${x}) cannot exceed the sample size (${n}).` }] };
      est = x / n;
      if (n * est < 10 || n * (1 - est) < 10) return { ok: false, errors: [{ field: ['x', 'n'], message: `This interval needs at least 10 successes and 10 failures (here ${x} and ${n - x}). With smaller counts the normal approximation is unreliable, so no interval is shown.` }] };
      se = Math.sqrt((est * (1 - est)) / n);
      crit = normalInv(1 - alpha / 2); critName = 'z*'; critTex = 'z^{*}';
      steps.push({ title: 'Sample proportion', tex: `\\hat{p} = \\frac{x}{n} = \\frac{${x}}{${n}} = ${tx(est)}` });
      steps.push({ title: 'Check the conditions', text: `n·p̂ = ${fmt(n * est, 2)} ≥ 10 and n(1 − p̂) = ${fmt(n * (1 - est), 2)} ≥ 10, so the normal approximation is reasonable.` });
      steps.push({ title: 'Standard error', tex: `SE = \\sqrt{\\frac{\\hat{p}(1 - \\hat{p})}{n}} = \\sqrt{\\frac{${tx(est)}(${tx(1 - est)})}{${n}}} \\approx ${tx(se)}` });
    } else {
      est = mean;
      se = sd / Math.sqrt(n);
      if (type === 'z') { crit = normalInv(1 - alpha / 2); critName = 'z*'; critTex = 'z^{*}'; }
      else { crit = tInv(1 - alpha / 2, n - 1); critName = `t* (df = ${n - 1})`; critTex = `t^{*}_{${n - 1}}`; }
      steps.push({ title: 'Identify the summary statistics', tex: `\\bar{x} = ${tx(mean)}, \\quad ${type === 'z' ? '\\sigma' : 's'} = ${tx(sd)}, \\quad n = ${n}` });
      steps.push({ title: 'Standard error of the mean', tex: `SE = \\frac{${type === 'z' ? '\\sigma' : 's'}}{\\sqrt{n}} = \\frac{${tx(sd)}}{\\sqrt{${n}}} \\approx ${tx(se)}` });
      if (type === 't' && n < 30) notes.push({ kind: 'info', text: 'With a small sample the t-interval assumes the population is roughly normal (no strong skew or outliers).' });
    }
    steps.push({ title: `Critical value for ${level}% confidence`, text: type === 't' ? `Use the t-distribution with n − 1 = ${n - 1} degrees of freedom: the middle ${level}% leaves ${fmt(alpha / 2 * 100, 3)}% in each tail.` : `The middle ${level}% of the standard normal distribution leaves ${fmt(alpha / 2 * 100, 3)}% in each tail.`, tex: `${critTex} \\approx ${tx(crit, 4)}` });
    const E = crit * se;
    steps.push({ title: 'Margin of error', tex: `E = ${critTex} \\times SE \\approx ${tx(crit, 4)} \\times ${tx(se)} \\approx ${tx(E)}` });
    const L = est - E, U = est + E;
    steps.push({ title: 'Confidence interval', tex: `${type === 'prop' ? '\\hat{p}' : '\\bar{x}'} \\pm E = ${tx(est)} \\pm ${tx(E)} = (${tx(L)},\\ ${tx(U)})` });
    const svg = plot({
      x: [L - 2 * E, U + 2 * E], y: [0, 1],
      segments: [{ x1: L, y1: 0.5, x2: U, y2: 0.5, cls: 'd-line' }],
      points: [{ x: est, y: 0.5, label: type === 'prop' ? 'p̂' : 'x̄', cls: 'd-foot' }, { x: L, y: 0.5, label: fmt(L, 4), r: 3 }, { x: U, y: 0.5, label: fmt(U, 4), r: 3 }],
      includeZero: false, title: 'The confidence interval on a number line',
    });
    return {
      ok: true,
      final: { tex: `${level}\\%\\ \\text{CI}: (${tx(L)},\\ ${tx(U)})`, text: `We are ${level}% confident that the population ${type === 'prop' ? 'proportion' : 'mean'} lies between ${fmt(L)} and ${fmt(U)}.` },
      answers: [
        { label: 'Lower limit', value: fmt(L), approx: true, primary: true },
        { label: 'Upper limit', value: fmt(U), approx: true, primary: true },
        { label: 'Point estimate', value: fmt(est), approx: !isExact(est) },
        { label: 'Margin of error E', value: fmt(E), approx: true },
        { label: 'Standard error', value: fmt(se), approx: true },
        { label: `Critical value ${critName}`, value: fmt(crit, 4), approx: true },
      ],
      visual: { svg, caption: 'The interval is centred on the point estimate and extends one margin of error each way.' },
      formula: [type === 'prop' ? '\\hat{p} \\pm z^{*}\\sqrt{\\frac{\\hat{p}(1 - \\hat{p})}{n}}' : type === 'z' ? '\\bar{x} \\pm z^{*}\\frac{\\sigma}{\\sqrt{n}}' : '\\bar{x} \\pm t^{*}_{n-1}\\frac{s}{\\sqrt{n}}'],
      steps,
      notes: [...notes, { kind: 'info', text: `Meaning: if many samples were taken and an interval built from each, about ${level}% of those intervals would contain the true value. It is not a ${level}% probability for this one interval.` }],
      rounding: 'Critical values are computed to about 12 significant digits; results are rounded to 6 decimal places.',
    };
  },
};
