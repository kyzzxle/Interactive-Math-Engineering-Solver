/**
 * Quartiles, percentiles, the interquartile range and outliers (1.5 × IQR fences).
 * Two common quartile methods are offered because textbooks differ:
 *   tukey  — median of the lower and upper halves (the median itself excluded when n is odd)
 *   linear — linear interpolation at position (n − 1)p in the sorted data (Excel QUARTILE.INC,
 *            R type 7, NumPy's default)
 * Percentiles always use linear interpolation.
 */
import { validator, answer, fmt, tx } from '../lib/calc-kit.js';
import { DATA_FIELD, parseData } from '../lib/stats-kit.js';
import { plot } from '../lib/plot.js';

const median = (s) => (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2);
export const percentile = (s, p) => {
  const pos = (s.length - 1) * p, lo = Math.floor(pos), hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
};

export const calculator = {
  id: 'quartiles-percentiles',
  fields: [
    DATA_FIELD,
    { name: 'method', label: 'Quartile method', type: 'radio', options: [['tukey', 'Median of halves (most textbooks)'], ['linear', 'Linear interpolation (Excel, R, NumPy)']] },
    { name: 'p', label: 'Percentile to find (optional)', type: 'number', signed: false, placeholder: 'e.g. 90', suffix: '%' },
  ],
  examples: [
    { label: 'Test scores (11 values)', values: { data: '52, 61, 64, 68, 70, 73, 75, 78, 82, 88, 99', method: 'tukey', p: '90' } },
    { label: 'Even count with an outlier', values: { data: '3, 7, 8, 5, 12, 14, 21, 13, 18, 64', method: 'tukey', p: '' } },
    { label: 'Same data, linear method', values: { data: '3, 7, 8, 5, 12, 14, 21, 13, 18, 64', method: 'linear', p: '25' } },
    { label: 'Invalid: only 2 values', values: { data: '4, 9', method: 'tukey', p: '' }, expectError: true },
  ],
  solve(values) {
    const d = parseData(values.data, { min: 4 });
    if (d.error) return { ok: false, errors: [{ field: 'data', message: d.error.replace('at least 4 values', 'at least 4 values (quartiles split the data into four parts)') }] };
    const v = validator(values);
    const p = String(values.p ?? '').trim() === '' ? null : v.number('p', 'the percentile', { min: 0, max: 100 });
    if (!v.ok()) return v.result();
    const s = [...d.values].sort((a, b) => a - b), n = s.length;
    const tukey = values.method !== 'linear';
    let Q1, Q2 = median(s), Q3;
    const steps = [{ title: 'Sort the data', text: `n = ${n}: ${n <= 40 ? s.map((x) => fmt(x)).join(', ') : `${s.slice(0, 20).map((x) => fmt(x)).join(', ')}, …`}` }];
    steps.push({ title: 'Median Q₂', tex: n % 2 ? `Q_2 = x_{(${(n + 1) / 2})} = ${tx(Q2)}` : `Q_2 = \\frac{x_{(${n / 2})} + x_{(${n / 2 + 1})}}{2} = \\frac{${tx(s[n / 2 - 1])} + ${tx(s[n / 2])}}{2} = ${tx(Q2)}` });
    if (tukey) {
      const half = Math.floor(n / 2);
      const lower = s.slice(0, half), upper = s.slice(n - half);
      Q1 = median(lower); Q3 = median(upper);
      steps.push({ title: 'Split into lower and upper halves', text: `${n % 2 ? 'n is odd, so the median itself is left out. ' : ''}Lower half: ${lower.length <= 20 ? lower.map((x) => fmt(x)).join(', ') : `${lower.length} values`}. Upper half: ${upper.length <= 20 ? upper.map((x) => fmt(x)).join(', ') : `${upper.length} values`}.` });
      steps.push({ title: 'Q₁ and Q₃ are the medians of the halves', tex: `Q_1 = ${tx(Q1)},\\quad Q_3 = ${tx(Q3)}` });
    } else {
      Q1 = percentile(s, 0.25); Q3 = percentile(s, 0.75);
      const pos = (q) => (n - 1) * q;
      steps.push({ title: 'Positions (n − 1)p in the sorted list (counting from 0)', tex: `Q_1: ${tx(pos(0.25))},\\quad Q_3: ${tx(pos(0.75))}` });
      steps.push({ title: 'Interpolate between neighbouring values', tex: `Q_1 = ${tx(Q1)},\\quad Q_3 = ${tx(Q3)}` });
    }
    const IQR = Q3 - Q1, lo = Q1 - 1.5 * IQR, hi = Q3 + 1.5 * IQR;
    const outliers = s.filter((x) => x < lo || x > hi);
    steps.push({ title: 'Interquartile range', tex: `\\text{IQR} = Q_3 - Q_1 = ${tx(Q3)} - ${tx(Q1)} = ${tx(IQR)}` });
    steps.push({ title: 'Outlier fences (1.5 × IQR rule)', tex: `[Q_1 - 1.5\\,\\text{IQR},\\ Q_3 + 1.5\\,\\text{IQR}] = [${tx(lo)},\\ ${tx(hi)}]`, text: outliers.length ? `Outliers: ${outliers.map((x) => fmt(x)).join(', ')}.` : 'No values fall outside the fences.' });
    const answers = [answer('Q₁ (25th percentile)', Q1, { primary: true }), answer('Median Q₂', Q2, { primary: true }), answer('Q₃ (75th percentile)', Q3, { primary: true }), answer('Interquartile range', IQR), answer('Minimum', s[0]), answer('Maximum', s[n - 1]), { label: 'Outliers', value: outliers.length ? outliers.map((x) => fmt(x)).join(', ') : 'none', copy: '' }];
    if (p !== null) {
      const P = percentile(s, p / 100);
      steps.push({ title: `${fmt(p)}th percentile (linear interpolation)`, tex: `\\text{position } (n - 1)\\frac{${fmt(p)}}{100} = ${tx((n - 1) * p / 100)} \\Rightarrow P_{${fmt(p)}} = ${tx(P)}` });
      answers.splice(3, 0, answer(`${fmt(p)}th percentile`, P, { primary: true }));
    }
    // box plot
    const wl = s.find((x) => x >= lo), wh = [...s].reverse().find((x) => x <= hi);
    const span = s[n - 1] - s[0] || 1;
    const svg = plot({ x: [s[0] - span * 0.08, s[n - 1] + span * 0.08], y: [-1.6, 1.6], width: 380, height: 170, title: 'Box plot', xTicks: [s[0], Q1, Q2, Q3, s[n - 1]].filter((x, i, a) => a.indexOf(x) === i).map((x) => ({ x, label: fmt(x, 2) })), segments: [{ x1: Q1, y1: -0.7, x2: Q3, y2: -0.7, cls: 'd-line' }, { x1: Q1, y1: 0.7, x2: Q3, y2: 0.7, cls: 'd-line' }, { x1: Q1, y1: -0.7, x2: Q1, y2: 0.7, cls: 'd-line' }, { x1: Q3, y1: -0.7, x2: Q3, y2: 0.7, cls: 'd-line' }, { x1: Q2, y1: -0.7, x2: Q2, y2: 0.7, cls: 'd-line2' }, { x1: wl, y1: 0, x2: Q1, y2: 0, cls: 'd-line' }, { x1: Q3, y1: 0, x2: wh, y2: 0, cls: 'd-line' }, { x1: wl, y1: -0.35, x2: wl, y2: 0.35, cls: 'd-line' }, { x1: wh, y1: -0.35, x2: wh, y2: 0.35, cls: 'd-line' }], points: outliers.map((x) => ({ x, y: 0, cls: 'd-point3', r: 4 })) });
    return {
      ok: true,
      final: { tex: `Q_1 = ${tx(Q1)},\\quad Q_2 = ${tx(Q2)},\\quad Q_3 = ${tx(Q3)},\\quad \\text{IQR} = ${tx(IQR)}` },
      answers,
      visual: { svg, caption: 'The box spans Q₁ to Q₃ (the middle 50%), the green line is the median, whiskers reach the furthest values inside the fences, and orange dots are outliers.' },
      formula: ['\\text{IQR} = Q_3 - Q_1 \\qquad \\text{outlier if } x < Q_1 - 1.5\\,\\text{IQR} \\text{ or } x > Q_3 + 1.5\\,\\text{IQR}'],
      steps,
      notes: [{ kind: 'info', text: 'Different textbooks and software compute quartiles slightly differently, especially for small data sets — check which method your course uses. Both give the same median.' }],
    };
  },
};
