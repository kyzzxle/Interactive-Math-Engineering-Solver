/** Slope and equation of a line from two points or from a point and a slope (exact fractions). */
import { validator, fracAnswer, fp, pointTex, fmt } from '../lib/calc-kit.js';
import { Frac } from '../lib/fraction.js';
import { integerLine, generalTex, generalText, slopeInterceptTex, slopeInterceptText, pointSlopeTex } from '../lib/lines.js';
import { plot, windowAround } from '../lib/plot.js';

export const calculator = {
  id: 'slope-and-equation-of-a-line',
  fields: [
    { name: 'mode', label: 'What do you know?', type: 'radio', options: [['two', 'Two points'], ['ps', 'A point and the slope']] },
    { name: 'x1', label: 'x₁', type: 'number', placeholder: 'e.g. 1', row: 'p1' },
    { name: 'y1', label: 'y₁', type: 'number', placeholder: 'e.g. 3', row: 'p1' },
    { name: 'x2', label: 'x₂', type: 'number', placeholder: 'e.g. 4', row: 'p2', showWhen: { mode: ['two'] }, rowShowWhen: { mode: ['two'] } },
    { name: 'y2', label: 'y₂', type: 'number', placeholder: 'e.g. 9', row: 'p2', showWhen: { mode: ['two'] } },
    { name: 'm', label: 'Slope m', type: 'number', placeholder: 'e.g. 2 or -3/4', hint: 'Fractions such as 2/3 are allowed.', showWhen: { mode: ['ps'] } },
  ],
  examples: [
    { label: '(1, 3) and (4, 9)', values: { mode: 'two', x1: '1', y1: '3', x2: '4', y2: '9' } },
    { label: '(−2, 5) with slope −3/4', values: { mode: 'ps', x1: '-2', y1: '5', m: '-3/4' } },
    { label: 'Vertical: (3, 1) and (3, 7)', values: { mode: 'two', x1: '3', y1: '1', x2: '3', y2: '7' } },
  ],
  solve(values) {
    const v = validator(values);
    const mode = values.mode === 'ps' ? 'ps' : 'two';
    const x1 = v.frac('x1', 'x₁'), y1 = v.frac('y1', 'y₁');
    let x2, y2, m;
    if (mode === 'two') { x2 = v.frac('x2', 'x₂'); y2 = v.frac('y2', 'y₂'); } else m = v.frac('m', 'the slope');
    if (!v.ok()) return v.result();
    const steps = [];
    if (mode === 'two') {
      if (x1.eq(x2) && y1.eq(y2)) return { ok: false, errors: [{ field: ['x2', 'y2'], message: 'The two points are identical. Infinitely many lines pass through a single point, so enter two different points.' }] };
      steps.push({ title: 'Identify the points', tex: `(x_1, y_1) = ${pointTex(x1, y1)}, \\quad (x_2, y_2) = ${pointTex(x2, y2)}` });
      if (x1.eq(x2)) {
        const A = new Frac(1n), B = new Frac(0n), C = x1.neg();
        steps.push({ title: 'Compute the slope', texLines: [`m = \\frac{y_2 - y_1}{x_2 - x_1} = \\frac{${y2.sub(y1).toTex()}}{0}`], text: 'The run is zero, so the slope is undefined (vertical line).' });
        steps.push({ title: 'Equation of a vertical line', tex: `x = ${x1.toTex()}` });
        return result({ vertical: true, x1, y1, x2, y2, A, B, C, steps });
      }
      const dy = y2.sub(y1), dx = x2.sub(x1);
      m = dy.div(dx);
      steps.push({ title: 'Compute the slope (rise over run)', texLines: ['m = \\frac{y_2 - y_1}{x_2 - x_1}', `m = \\frac{${y2.toTex()} - ${fp(y1)}}{${x2.toTex()} - ${fp(x1)}} = \\frac{${dy.toTex()}}{${dx.toTex()}} = ${m.toTex()}`] });
    } else {
      steps.push({ title: 'Identify the point and slope', tex: `(x_1, y_1) = ${pointTex(x1, y1)}, \\quad m = ${m.toTex()}` });
    }
    steps.push({ title: 'Point–slope form', texLines: ['y - y_1 = m(x - x_1)', pointSlopeTex(m, x1, y1)] });
    const b = y1.sub(m.mul(x1));
    steps.push({ title: 'Solve for y to get slope–intercept form', texLines: ['b = y_1 - m x_1', `b = ${y1.toTex()} - ${fp(m)}${fp(x1)} = ${b.toTex()}`, slopeInterceptTex(m, b)] });
    const [A, B, C] = integerLine(m, new Frac(-1n), b);
    steps.push({ title: 'Rearrange into general form Ax + By + C = 0', text: 'Move every term to one side and multiply by a common denominator so all coefficients are whole numbers.', tex: generalTex(A, B, C) });
    return result({ vertical: false, x1, y1, x2, y2, m, b, A, B, C, steps });
  },
};

function result({ vertical, x1, y1, x2, y2, m, b, A, B, C, steps }) {
  const answers = [];
  const xs = [x1, x2].filter(Boolean).map((f) => f.toNumber()), ys = [y1, y2].filter(Boolean).map((f) => f.toNumber());
  let curves = [], vlines = [];
  if (vertical) {
    answers.push({ label: 'Slope', value: 'undefined (vertical line)', primary: true }, { label: 'Equation', valueTex: `x = ${x1.toTex()}`, primary: true, copy: `x = ${x1}` });
    vlines = [{ x: x1.toNumber(), cls: 'd-line' }];
  } else {
    const theta = (Math.atan(m.toNumber()) * 180) / Math.PI;
    const incl = theta < 0 ? theta + 180 : theta;
    answers.push(
      fracAnswer('Slope m', m, { primary: true }),
      { label: 'Slope–intercept form', valueTex: slopeInterceptTex(m, b), primary: true, copy: slopeInterceptText(m, b) },
      { label: 'General form', valueTex: generalTex(A, B, C), copy: generalText(A, B, C) },
      fracAnswer('y-intercept b', b),
      m.isZero() ? { label: 'x-intercept', value: 'none (horizontal line)' } : fracAnswer('x-intercept', b.neg().div(m)),
      { label: 'Angle of inclination', value: `${fmt(incl, 4)}°`, approx: Math.abs(incl - Math.round(incl)) > 1e-9 },
    );
    curves = [{ f: (x) => m.toNumber() * x + b.toNumber(), cls: 'd-line' }];
  }
  const win = windowAround([...xs, 0], 4);
  const svg = plot({
    x: win, y: windowAround([...ys, 0], 4), equal: true, curves, vlines,
    points: [{ x: x1.toNumber(), y: y1.toNumber(), label: 'P₁' }, ...(x2 ? [{ x: x2.toNumber(), y: y2.toNumber(), label: 'P₂' }] : [])],
    title: 'Graph of the line through the given point(s)',
  });
  return {
    ok: true,
    final: { texLines: vertical ? [`x = ${x1.toTex()}`] : [slopeInterceptTex(m, b), generalTex(A, B, C)] },
    answers,
    visual: { svg, caption: vertical ? 'A vertical line: every point has the same x-coordinate.' : 'The line rises (or falls) m units for every 1 unit to the right.' },
    formula: ['m = \\frac{y_2 - y_1}{x_2 - x_1} \\qquad y - y_1 = m(x - x_1) \\qquad y = mx + b'],
    steps,
    notes: [{ kind: 'info', text: vertical ? 'Vertical lines have no slope–intercept form because their slope is not defined.' : 'Positive slope: the line rises to the right. Negative: it falls. Zero: horizontal.' }],
    rounding: 'Slopes, intercepts and equations are exact fractions; only the angle of inclination is rounded.',
  };
}
