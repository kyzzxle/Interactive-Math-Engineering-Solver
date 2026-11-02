/**
 * Explorers for algebra, trigonometry and calculus: a quadratic graph driven by its
 * coefficients, the unit circle, a right triangle, tangent/secant lines and Riemann sums.
 */
import { plot } from '../lib/plot.js';
import { tx, txp } from '../lib/calc-kit.js';
import { parse, derivative, texOf, compile } from '../lib/expr.js';
import { exactTrig, piMultiple, piFracTex } from '../lib/trig.js';
import { adaptiveSimpson } from '../lib/numeric.js';
import { randInt, pick } from '../lib/learn.js';

const t = (v, d = 3) => tx(v, d);
const signed = (v, d = 3) => `${v < 0 ? '-' : '+'} ${tx(Math.abs(v), d)}`;

// ------------------------------------------------------------------ algebra: quadratic
export const quadraticExplore = {
  title: 'Shape a parabola',
  intro: 'Change a, b and c. The discriminant b² − 4ac decides how many times the parabola crosses the x-axis.',
  controls: [
    { name: 'a', label: 'a (coefficient of x²)', min: -3, max: 3, step: 0.1, value: 1 },
    { name: 'b', label: 'b (coefficient of x)', min: -10, max: 10, step: 0.5, value: -2 },
    { name: 'c', label: 'c (constant)', min: -10, max: 10, step: 0.5, value: -3 },
  ],
  presets: [{ label: 'Two roots', values: { a: 1, b: -2, c: -3 } }, { label: 'Double root', values: { a: 1, b: -4, c: 4 } }, { label: 'No real roots', values: { a: 1, b: 2, c: 5 } }, { label: 'Opens down', values: { a: -0.5, b: 1, c: 4 } }],
  render({ a, b, c }) {
    const f = (x) => a * x * x + b * x + c;
    const view = { x: [-10, 10], y: [-12, 12], width: 400, height: 320, title: 'Graph of y = ax² + bx + c' };
    if (a === 0) {
      return {
        svg: plot({ ...view, curves: [{ f }], points: b !== 0 ? [{ x: -c / b, y: 0, label: 'root', cls: 'd-point3' }] : [] }),
        readouts: [{ label: 'Not a quadratic', text: b !== 0 ? `With a = 0 this is the line y = ${b}x ${c < 0 ? '−' : '+'} ${Math.abs(c)}, with one root x = ${(-c / b).toFixed(3)}.` : 'With a = 0 and b = 0 there is no x term at all.', tone: 'warn' }],
      };
    }
    const D = b * b - 4 * a * c;
    const h = -b / (2 * a), k = f(h);
    const roots = D > 1e-12 ? [(-b - Math.sqrt(D)) / (2 * a), (-b + Math.sqrt(D)) / (2 * a)].sort((p, q) => p - q) : Math.abs(D) <= 1e-12 ? [h] : [];
    const kind = roots.length === 2 ? 'Δ > 0: two real roots' : roots.length === 1 ? 'Δ = 0: one repeated root' : 'Δ < 0: no real roots (two complex roots)';
    return {
      svg: plot({ ...view, curves: [{ f }], vlines: [{ x: h, cls: 'd-line3', label: 'axis' }], points: [{ x: h, y: k, label: 'vertex', cls: 'd-point2' }, ...roots.map((x) => ({ x, y: 0, cls: 'd-point3' }))] }),
      readouts: [
        { label: 'Discriminant', tex: `\\Delta = b^2 - 4ac = ${t(D)}`, tone: D < -1e-12 ? 'warn' : 'good' },
        { label: 'Roots', text: roots.length ? `x = ${roots.map((r) => r.toFixed(3)).join(' and x = ')}` : `x = ${h.toFixed(3)} ± ${(Math.sqrt(-D) / (2 * Math.abs(a))).toFixed(3)}i` },
        { label: 'Vertex', tex: `\\left(-\\tfrac{b}{2a},\\ f\\!\\left(-\\tfrac{b}{2a}\\right)\\right) = (${t(h)},\\ ${t(k)})` },
        { label: 'Opens', text: a > 0 ? 'upward (a > 0): the vertex is a minimum' : 'downward (a < 0): the vertex is a maximum' },
      ],
      note: kind,
    };
  },
};

export const quadraticPractice = {
  title: 'Solve a quadratic',
  generate(rand) {
    let r1 = randInt(rand, -8, 8), r2 = randInt(rand, -8, 8);
    if (r1 === -r2 && rand() < 0.5) r2 += 1;
    const a = pick(rand, [1, 1, 1, 2, -1]);
    const b = -a * (r1 + r2), c = a * r1 * r2;
    const poly = `${a === 1 ? '' : a === -1 ? '-' : a}x^2 ${b === 0 ? '' : `${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x`} ${c === 0 ? '' : `${c < 0 ? '-' : '+'} ${Math.abs(c)}`} = 0`;
    const D = b * b - 4 * a * c, sD = Math.sqrt(D);
    return {
      prompt: '<p>Find both roots of the equation (enter them in any order):</p>',
      promptTex: poly,
      unordered: true,
      answers: [{ label: 'Root 1', value: Math.min(r1, r2), int: true }, { label: 'Root 2', value: Math.max(r1, r2), int: true }],
      hint: `Here a = ${a}, b = ${b}, c = ${c}. Work out the discriminant first; it is a perfect square, so the roots are whole numbers.`,
      hintTex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
      steps: [
        { title: 'Known values', tex: `a = ${a},\\ b = ${b},\\ c = ${c}` },
        { title: 'Discriminant', tex: `\\Delta = (${b})^2 - 4(${a})(${c}) = ${D}` },
        { title: 'Quadratic formula', texLines: [`x = \\frac{${-b} \\pm \\sqrt{${D}}}{${2 * a}} = \\frac{${-b} \\pm ${sD}}{${2 * a}}`] },
        { title: 'The two roots', tex: `x_1 = ${Math.min(r1, r2)},\\quad x_2 = ${Math.max(r1, r2)}` },
      ],
    };
  },
};

// ------------------------------------------------------------------ trigonometry
export const unitCircleExplore = {
  title: 'Walk around the unit circle',
  intro: 'For the point P at angle θ on a circle of radius 1, the x-coordinate is cos θ and the y-coordinate is sin θ. Drag P or use the slider.',
  controls: [{ name: 'deg', label: 'Angle θ', min: 0, max: 360, step: 1, value: 30, unit: '°' }],
  drag: { P: (g) => ({ deg: ((Math.atan2(g.y, g.x) * 180) / Math.PI + 360) % 360 }) },
  presets: [{ label: '45°', values: { deg: 45 } }, { label: '120°', values: { deg: 120 } }, { label: '210°', values: { deg: 210 } }, { label: '300°', values: { deg: 300 } }],
  render({ deg }) {
    const th = (deg * Math.PI) / 180, c = Math.cos(th), s = Math.sin(th);
    const ex = exactTrig(deg);
    const pm = piMultiple(th);
    const val = (pair, x) => (pair ? `${pair[0]}${/\\sqrt/.test(pair[0]) ? ` \\approx ${t(x, 4)}` : ''}` : t(x, 4));
    const svg = plot({
      x: [-1.4, 1.4], y: [-1.25, 1.25], width: 380, height: 340, equal: true, title: `Unit circle at ${deg} degrees`,
      circles: [{ cx: 0, cy: 0, r: 1 }],
      segments: [{ x1: 0, y1: 0, x2: c, y2: s, cls: 'd-line' }, { x1: c, y1: 0, x2: c, y2: s, cls: 'd-perp' }, { x1: 0, y1: 0, x2: c, y2: 0, cls: 'd-line3' }],
      points: [{ x: c, y: s, label: `P(${c.toFixed(2)}, ${s.toFixed(2)})`, drag: 'P' }],
    });
    const quadrant = ex ? ex.quadrant : Math.floor(deg / 90) % 4 + 1;
    const ref = deg <= 90 ? deg : deg <= 180 ? 180 - deg : deg <= 270 ? deg - 180 : 360 - deg;
    const tanUndefined = Math.abs(c) < 1e-12;
    return {
      svg,
      readouts: [
        { label: 'Angle', tex: `\\theta = ${deg}^\\circ = ${pm ? piFracTex(pm) : t(th, 4)}\\text{ rad}` },
        { label: 'cos θ (x, amber)', tex: `\\cos\\theta = ${val(ex && ex.cos, c)}` },
        { label: 'sin θ (y, green)', tex: `\\sin\\theta = ${val(ex && ex.sin, s)}` },
        { label: 'tan θ = sin θ / cos θ', tex: tanUndefined ? '\\tan\\theta \\text{ is undefined}' : `\\tan\\theta = ${val(ex && ex.tan, s / c)}` },
        { label: 'Position', text: quadrant ? `Quadrant ${['I', 'II', 'III', 'IV'][quadrant - 1]}, reference angle ${ref}°` : `On an axis (θ = ${deg}°)` },
      ],
    };
  },
};

export const rightTriangleExplore = {
  title: 'Change a right triangle',
  intro: 'Keep the angle and change the hypotenuse: every side scales, but the ratios sin, cos and tan stay the same. They depend only on the angle.',
  controls: [{ name: 'A', label: 'Angle A', min: 5, max: 85, step: 1, value: 35, unit: '°' }, { name: 'c', label: 'Hypotenuse c', min: 1, max: 10, step: 0.1, value: 6 }],
  render({ A, c }) {
    const r = (A * Math.PI) / 180, a = c * Math.sin(r), b = c * Math.cos(r);
    return {
      svg: plot({
        x: [-0.5, 10.5], y: [-0.8, 9], width: 380, height: 320, equal: true, includeZero: false, title: 'Right triangle',
        segments: [{ x1: 0, y1: 0, x2: b, y2: 0, cls: 'd-line' }, { x1: b, y1: 0, x2: b, y2: a, cls: 'd-line2' }, { x1: 0, y1: 0, x2: b, y2: a, cls: 'd-line3' }],
        points: [{ x: 0, y: 0, label: 'A' }, { x: b, y: 0, label: 'C' }, { x: b, y: a, label: 'B' }],
      }),
      readouts: [
        { label: 'Opposite a (green)', tex: `a = c\\sin A \\approx ${t(a)}` },
        { label: 'Adjacent b (blue)', tex: `b = c\\cos A \\approx ${t(b)}` },
        { label: 'Ratios', tex: `\\sin A = \\tfrac{a}{c} \\approx ${t(a / c, 4)},\\ \\cos A = \\tfrac{b}{c} \\approx ${t(b / c, 4)}` },
        { label: 'tan A', tex: `\\tan A = \\tfrac{a}{b} \\approx ${t(a / b, 4)}` },
        { label: 'Check', tex: `a^2 + b^2 \\approx ${t(a * a + b * b)} = c^2` },
      ],
    };
  },
};

export const unitCirclePractice = {
  title: 'Unit-circle values',
  generate(rand) {
    const deg = pick(rand, [30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330]);
    const fnName = pick(rand, ['sin', 'cos']);
    const ex = exactTrig(deg);
    const value = fnName === 'sin' ? Math.sin((deg * Math.PI) / 180) : Math.cos((deg * Math.PI) / 180);
    const pair = fnName === 'sin' ? ex.sin : ex.cos;
    return {
      prompt: `<p>Find the value below as a decimal (4 decimal places), and the reference angle in degrees.</p>`,
      promptTex: `\\${fnName}\\left(${deg}^\\circ\\right)`,
      answers: [{ label: `${fnName} ${deg}°`, value, decimals: 4 }, { label: 'Reference angle', value: ex.ref, int: true, unit: '°' }],
      hint: `${deg}° is in quadrant ${['I', 'II', 'III', 'IV'][ex.quadrant - 1]}. Find the reference angle (its distance to the x-axis), then decide the sign: ${fnName === 'sin' ? 'sin is positive above the x-axis' : 'cos is positive to the right of the y-axis'}.`,
      steps: [
        { title: 'Quadrant and reference angle', text: `${deg}° lies in quadrant ${['I', 'II', 'III', 'IV'][ex.quadrant - 1]}; its reference angle is ${ex.ref}°.` },
        { title: 'Value at the reference angle', tex: `\\${fnName}\\left(${ex.ref}^\\circ\\right) = ${fnName === 'sin' ? exactTrig(ex.ref).sin[0] : exactTrig(ex.ref).cos[0]}` },
        { title: 'Apply the sign of the quadrant', tex: `\\${fnName}\\left(${deg}^\\circ\\right) = ${pair[0]} \\approx ${t(value, 4)}` },
      ],
    };
  },
};

// ------------------------------------------------------------------ calculus
const FUNCS = [
  ['x^2', 'f(x) = x²'],
  ['x^3 - 3x', 'f(x) = x³ − 3x'],
  ['sin(x)', 'f(x) = sin x'],
  ['e^x', 'f(x) = eˣ'],
  ['sqrt(x)', 'f(x) = √x'],
  ['ln(x)', 'f(x) = ln x'],
];
const POSITIVE = new Set(['sqrt(x)', 'ln(x)']);
const cache = new Map();
function fnInfo(src) {
  if (!cache.has(src)) {
    const node = parse(src);
    const d = derivative(node);
    cache.set(src, { f: compile(node), df: compile(d), tex: texOf(node), dtex: texOf(d) });
  }
  return cache.get(src);
}

export const tangentExplore = {
  title: 'Secant to tangent',
  intro: 'The secant through x = a and x = a + h has slope (f(a + h) − f(a)) / h. Shrink h towards 0 and it becomes the tangent, whose slope is f′(a).',
  controls: [
    { name: 'fn', label: 'Function', type: 'select', options: FUNCS, value: 'x^2' },
    { name: 'a', label: 'Point a', min: (v) => (POSITIVE.has(v.fn) ? 0.2 : -3), max: 3, step: 0.05, value: 1 },
    { name: 'h', label: 'Step h', min: 0.01, max: 2, step: 0.01, value: 1 },
    { name: 'deriv', label: 'Also draw f′(x)', type: 'select', options: [['no', 'No'], ['yes', 'Yes (dashed)']], value: 'no' },
  ],
  drag: { P: (g, v) => ({ a: g.x }) },
  presets: [{ label: 'h = 1', values: { h: 1 } }, { label: 'h = 0.1', values: { h: 0.1 } }, { label: 'h = 0.01', values: { h: 0.01 } }],
  render({ fn, a, h, deriv }) {
    const F = fnInfo(fn);
    const fa = F.f(a), fb = F.f(a + h), m = F.df(a), ms = (fb - fa) / h;
    const curves = [{ f: F.f }, { f: (x) => fa + m * (x - a), cls: 'd-line2' }, { f: (x) => fa + ms * (x - a), cls: 'd-line3' }];
    if (deriv === 'yes') curves.push({ f: F.df, cls: 'd-hidden' });
    return {
      svg: plot({ x: [-4, 4], y: [-5, 7], width: 400, height: 320, title: 'Function with secant and tangent lines', curves, points: [{ x: a, y: fa, label: 'P', drag: 'P' }, { x: a + h, y: fb, label: 'Q', cls: 'd-point3' }] }),
      readouts: [
        { label: 'Function and derivative', tex: `f(x) = ${F.tex},\\ f'(x) = ${F.dtex}` },
        { label: 'Secant slope (amber)', tex: `\\frac{f(a+h) - f(a)}{h} \\approx ${t(ms, 4)}` },
        { label: 'Tangent slope (green)', tex: `f'(${t(a, 2)}) \\approx ${t(m, 4)}`, tone: 'good' },
        { label: 'Tangent line', tex: `y = ${t(fa)} ${signed(m)}\\,(x ${a < 0 ? '+' : '-'} ${t(Math.abs(a), 2)})` },
      ],
      note: `Gap between the two slopes: ${Math.abs(ms - m).toFixed(4)}. Halving h roughly halves this gap.`,
    };
  },
};

export const riemannExplore = {
  title: 'Approximate the area with rectangles',
  intro: 'Split [a, b] into n strips. More strips give a better approximation; the trapezoid and midpoint rules improve much faster than left or right sums.',
  controls: [
    { name: 'fn', label: 'Function', type: 'select', options: [['x^2', 'f(x) = x²'], ['sin(x) + 1.5', 'f(x) = sin x + 1.5'], ['e^x', 'f(x) = eˣ'], ['sqrt(x)', 'f(x) = √x']], value: 'x^2' },
    { name: 'method', label: 'Rule', type: 'select', options: [['left', 'Left endpoints'], ['right', 'Right endpoints'], ['mid', 'Midpoints'], ['trap', 'Trapezoids']], value: 'left' },
    { name: 'a', label: 'Lower limit a', min: 0, max: 3, step: 0.1, value: 0 },
    { name: 'b', label: 'Upper limit b', min: (v) => v.a + 0.1, max: 4, step: 0.1, value: 2 },
    { name: 'n', label: 'Number of strips n', min: 1, max: 50, step: 1, value: 4 },
  ],
  presets: [{ label: 'n = 4', values: { n: 4 } }, { label: 'n = 16', values: { n: 16 } }, { label: 'n = 50', values: { n: 50 } }],
  render({ fn, method, a, b, n }) {
    const F = fnInfo(fn);
    const w = (b - a) / n;
    const bars = [], shade = [];
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const x0 = a + i * w, x1 = x0 + w;
      if (method === 'trap') {
        const y0 = F.f(x0), y1 = F.f(x1);
        sum += ((y0 + y1) / 2) * w;
        shade.push({ f: (x) => y0 + ((y1 - y0) * (x - x0)) / w, a: x0, b: x1, cls: i % 2 ? 'd-shade' : 'd-shade2' });
      } else {
        const xs = method === 'left' ? x0 : method === 'right' ? x1 : (x0 + x1) / 2;
        const y = F.f(xs);
        sum += y * w;
        bars.push({ x: (x0 + x1) / 2, w, h: y });
      }
    }
    const exact = adaptiveSimpson(F.f, a, b).value;
    return {
      svg: plot({ x: [Math.min(-0.3, a - 0.3), 4.3], width: 400, height: 300, title: 'Riemann sum', curves: [{ f: F.f }], bars, shade }),
      readouts: [
        { label: `Approximation (n = ${n})`, tex: `\\approx ${t(sum, 5)}` },
        { label: 'Exact integral', tex: `\\int_{${t(a, 2)}}^{${t(b, 2)}} ${F.tex}\\,dx \\approx ${t(exact, 5)}`, tone: 'good' },
        { label: 'Error', tex: `${t(Math.abs(sum - exact), 6)}` },
        { label: 'Strip width', tex: `\\Delta x = \\frac{b - a}{n} \\approx ${t(w, 4)}` },
      ],
    };
  },
};

export const derivativePractice = {
  title: 'Slope at a point',
  generate(rand) {
    const a = randInt(rand, -3, 4) || 2, b = randInt(rand, -6, 6), c = randInt(rand, -9, 9), x0 = randInt(rand, -3, 3);
    const tex = `f(x) = ${a === 1 ? '' : a === -1 ? '-' : a}x^2 ${b === 0 ? '' : `${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x`} ${c === 0 ? '' : `${c < 0 ? '-' : '+'} ${Math.abs(c)}`}`;
    const d = 2 * a * x0 + b;
    const y0 = a * x0 * x0 + b * x0 + c;
    return {
      prompt: `<p>Find the slope of the tangent line at <strong>x = ${x0}</strong>, and the y-intercept of that tangent line.</p>`,
      promptTex: tex,
      answers: [{ label: `f′(${x0})`, value: d, int: true }, { label: 'Tangent y-intercept', value: y0 - d * x0, int: true }],
      hint: 'Differentiate term by term with the power rule, then substitute x. The tangent is y = f(x₀) + f′(x₀)(x − x₀).',
      hintTex: '\\frac{d}{dx}\\left(ax^2 + bx + c\\right) = 2ax + b',
      steps: [
        { title: 'Differentiate', tex: `f'(x) = ${2 * a}x ${b < 0 ? '-' : '+'} ${Math.abs(b)}` },
        { title: 'Slope at the point', tex: `f'(${x0}) = ${2 * a}${txp(x0)} ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${d}` },
        { title: 'Point on the curve', tex: `f(${x0}) = ${y0}` },
        { title: 'Tangent line', texLines: [`y = ${y0} ${d < 0 ? '-' : '+'} ${Math.abs(d)}(x ${x0 < 0 ? '+' : '-'} ${Math.abs(x0)})`, `y = ${d}x ${y0 - d * x0 < 0 ? '-' : '+'} ${Math.abs(y0 - d * x0)}`] },
      ],
    };
  },
};
