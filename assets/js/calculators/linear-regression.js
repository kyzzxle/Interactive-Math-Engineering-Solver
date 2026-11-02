/**
 * Least-squares regression line ŷ = a + bx and Pearson's correlation coefficient r:
 *   b = Sxy / Sxx,  a = ȳ − b x̄,  r = Sxy / √(Sxx Syy),  r² = share of variation explained
 * with Sxx = Σ(x − x̄)², Syy = Σ(y − ȳ)², Sxy = Σ(x − x̄)(y − ȳ). Optional prediction at x₀.
 */
import { validator, answer, fmt, tx } from '../lib/calc-kit.js';
import { parseDecimal } from '../lib/parse.js';
import { plot } from '../lib/plot.js';

export function fit(xs, ys) {
  const n = xs.length, mx = xs.reduce((s, x) => s + x, 0) / n, my = ys.reduce((s, y) => s + y, 0) / n;
  let Sxx = 0, Syy = 0, Sxy = 0;
  for (let i = 0; i < n; i++) { Sxx += (xs[i] - mx) ** 2; Syy += (ys[i] - my) ** 2; Sxy += (xs[i] - mx) * (ys[i] - my); }
  const b = Sxy / Sxx, a = my - b * mx, r = Syy === 0 ? NaN : Sxy / Math.sqrt(Sxx * Syy);
  return { n, mx, my, Sxx, Syy, Sxy, a, b, r };
}
const strength = (r) => { const a = Math.abs(r); return a >= 0.9 ? 'very strong' : a >= 0.7 ? 'strong' : a >= 0.4 ? 'moderate' : a >= 0.2 ? 'weak' : 'very weak or no'; };

const P0 = [[1, 2], [2, 3.5], [3, 3], [4, 5.5], [5, 6], [6, 7.5]];
export const calculator = {
  id: 'linear-regression',
  explore: {
    title: 'Drag the data points',
    intro: 'Drag any point and watch the best-fit line and r update. One point far from the others (an outlier) can swing the line a lot.',
    controls: P0.flatMap(([x, y], i) => [{ name: `x${i}`, label: `x${i}`, min: 0, max: 10, step: 0.1, value: x, hidden: true }, { name: `y${i}`, label: `y${i}`, min: 0, max: 10, step: 0.1, value: y, hidden: true }]),
    drag: Object.fromEntries(P0.map((_, i) => [`P${i}`, { x: `x${i}`, y: `y${i}` }])),
    presets: [{ label: 'Strong positive', values: Object.fromEntries(P0.flatMap(([x, y], i) => [[`x${i}`, x], [`y${i}`, y]])) }, { label: 'One outlier', values: { x5: 9, y5: 0.5 } }],
    render(v) {
      const xs = P0.map((_, i) => v[`x${i}`]), ys = P0.map((_, i) => v[`y${i}`]);
      const F = fit(xs, ys);
      const ok = F.Sxx > 1e-12;
      return {
        svg: plot({ x: [0, 10], y: [0, 10], width: 400, height: 320, title: 'Scatter plot with regression line', curves: ok ? [{ f: (x) => F.a + F.b * x }] : [], points: xs.map((x, i) => ({ x, y: ys[i], drag: `P${i}` })) }),
        readouts: ok ? [
          { label: 'Regression line', tex: `\\hat{y} = ${tx(F.a, 3)} ${F.b < 0 ? '-' : '+'} ${tx(Math.abs(F.b), 3)}x` },
          { label: 'Correlation', tex: Number.isFinite(F.r) ? `r \\approx ${tx(F.r, 3)},\\ r^2 \\approx ${tx(F.r * F.r, 3)}` : '\\text{all } y \\text{ equal}', tone: 'good' },
          { label: 'Strength', text: Number.isFinite(F.r) ? `${strength(F.r)} ${F.r > 0 ? 'positive' : 'negative'} linear relationship` : '—' },
        ] : [{ label: 'Regression line', text: 'All x-values are equal, so no line can be fitted.', tone: 'warn' }],
      };
    },
  },
  fields: [
    { name: 'pairs', label: 'Data pairs (x, y)', type: 'textarea', rows: 6, placeholder: '1, 2\n2, 3.5\n3, 3\n4, 5.5', hint: 'One pair per line: x, y. At least 3 pairs, up to 1,000.' },
    { name: 'x0', label: 'Predict y at x = (optional)', type: 'number', placeholder: 'e.g. 7' },
  ],
  examples: [
    { label: 'Study hours vs score', values: { pairs: '1, 52\n2, 55\n3, 61\n4, 64\n5, 70\n6, 73\n7, 78', x0: '8' } },
    { label: 'Negative relationship', values: { pairs: '10, 32\n15, 28\n20, 25\n25, 19\n30, 16', x0: '' } },
    { label: 'Weak relationship', values: { pairs: '1, 5\n2, 3\n3, 6\n4, 2\n5, 5\n6, 4', x0: '' } },
    { label: 'Invalid: all x equal', values: { pairs: '2, 1\n2, 3\n2, 5', x0: '' }, expectError: true },
  ],
  solve(values) {
    const lines = String(values.pairs ?? '').split(/\n|;/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) return { ok: false, errors: [{ field: 'pairs', message: 'Enter at least 3 (x, y) pairs, one per line.' }] };
    if (lines.length > 1000) return { ok: false, errors: [{ field: 'pairs', message: 'Please enter at most 1,000 pairs.' }] };
    const xs = [], ys = [];
    for (const [i, line] of lines.entries()) {
      const parts = line.replace(/[()]/g, ' ').split(/[\s,]+/).filter(Boolean);
      if (parts.length !== 2) return { ok: false, errors: [{ field: 'pairs', message: `Line ${i + 1} should contain exactly two numbers: x, y.` }] };
      const px = parseDecimal(parts[0], 'x'), py = parseDecimal(parts[1], 'y');
      if (!px.ok || !py.ok) return { ok: false, errors: [{ field: 'pairs', message: `Line ${i + 1}: ${(px.ok ? py : px).error}` }] };
      if (Math.abs(px.value) > 1e9 || Math.abs(py.value) > 1e9) return { ok: false, errors: [{ field: 'pairs', message: `Line ${i + 1}: please keep values below 10⁹ in size.` }] };
      xs.push(px.value); ys.push(py.value);
    }
    const v = validator(values);
    const x0 = String(values.x0 ?? '').trim() === '' ? null : v.number('x0', 'x₀', { maxAbs: 1e9 });
    if (!v.ok()) return v.result();
    const F = fit(xs, ys);
    if (!(F.Sxx > 1e-12 * (1 + F.mx * F.mx))) return { ok: false, errors: [{ field: 'pairs', message: 'All x-values are the same, so the slope cannot be calculated (the line would be vertical).' }] };
    const hasR = Number.isFinite(F.r);
    const steps = [
      { title: 'Means', tex: `\\bar{x} = ${tx(F.mx)},\\quad \\bar{y} = ${tx(F.my)}\\quad (n = ${F.n})` },
      { title: 'Sums of squares and products', texLines: [`S_{xx} = \\sum (x - \\bar{x})^2 = ${tx(F.Sxx)}`, `S_{yy} = \\sum (y - \\bar{y})^2 = ${tx(F.Syy)}`, `S_{xy} = \\sum (x - \\bar{x})(y - \\bar{y}) = ${tx(F.Sxy)}`] },
      { title: 'Slope and intercept', texLines: [`b = \\frac{S_{xy}}{S_{xx}} = \\frac{${tx(F.Sxy)}}{${tx(F.Sxx)}} \\approx ${tx(F.b)}`, `a = \\bar{y} - b\\bar{x} = ${tx(F.my)} - ${tx(F.b, 6)}(${tx(F.mx)}) \\approx ${tx(F.a)}`] },
      hasR ? { title: 'Correlation coefficient', tex: `r = \\frac{S_{xy}}{\\sqrt{S_{xx} S_{yy}}} \\approx ${tx(F.r)},\\quad r^2 \\approx ${tx(F.r * F.r)}` } : { title: 'Correlation coefficient', text: 'All y-values are equal, so r is not defined (there is no variation in y to explain).' },
    ];
    const line = `\\hat{y} = ${tx(F.a)} ${F.b < 0 ? '-' : '+'} ${tx(Math.abs(F.b))}x`;
    const answers = [{ label: 'Regression line', valueTex: line, primary: true, copy: `y = ${fmt(F.a)} + ${fmt(F.b)}x` }, answer('Slope b', F.b), answer('Intercept a', F.a)];
    if (hasR) answers.push(answer('Correlation r', F.r, { primary: true }), answer('r² (variation explained)', F.r * F.r));
    const notes = [{ kind: 'info', text: 'Correlation measures only linear association and does not prove cause and effect. Check the scatter plot for curves or outliers before trusting the line.' }];
    if (x0 !== null) {
      const y0 = F.a + F.b * x0;
      steps.push({ title: 'Prediction', tex: `\\hat{y}(${tx(x0)}) = ${tx(F.a)} + ${tx(F.b)}(${tx(x0)}) \\approx ${tx(y0)}` });
      answers.push(answer(`Predicted y at x = ${fmt(x0)}`, y0, { primary: true }));
      if (x0 < Math.min(...xs) || x0 > Math.max(...xs)) notes.unshift({ kind: 'warn', text: `x = ${fmt(x0)} is outside the range of the data (${fmt(Math.min(...xs))} to ${fmt(Math.max(...xs))}). Extrapolation assumes the linear pattern continues, which may not be true.` });
    }
    const resid = xs.map((x, i) => ys[i] - (F.a + F.b * x));
    const lx = Math.min(...xs), hx = Math.max(...xs), padx = (hx - lx) * 0.1 || 1;
    return {
      ok: true,
      final: { texLines: [line, ...(hasR ? [`r \\approx ${tx(F.r, 4)}`] : [])] },
      answers,
      visual: { svg: plot({ x: [lx - padx, hx + padx], width: 380, height: 280, title: 'Scatter plot and least-squares line', curves: [{ f: (x) => F.a + F.b * x }], points: xs.slice(0, 400).map((x, i) => ({ x, y: ys[i], r: 3.5 })), segments: xs.length <= 60 ? xs.map((x, i) => ({ x1: x, y1: ys[i], x2: x, y2: F.a + F.b * x, cls: 'd-hidden' })) : [] }), caption: hasR ? `A ${strength(F.r)} ${F.r > 0 ? 'positive' : 'negative'} linear relationship. Dashed segments are the residuals the line makes as small as possible (in total squared size).` : 'The line is horizontal because every y is the same.' },
      formula: ['b = \\frac{S_{xy}}{S_{xx}},\\quad a = \\bar{y} - b\\bar{x},\\quad r = \\frac{S_{xy}}{\\sqrt{S_{xx}S_{yy}}}'],
      steps,
      tables: xs.length <= 30 ? [{ caption: 'Fitted values and residuals', headers: ['x', 'y', 'ŷ', 'residual'], rows: xs.map((x, i) => [fmt(x), fmt(ys[i]), fmt(F.a + F.b * x, 4), fmt(resid[i], 4)]) }] : [],
      notes,
    };
  },
};
