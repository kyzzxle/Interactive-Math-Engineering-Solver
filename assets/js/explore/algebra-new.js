/**
 * Explorers and "Try it" practice for the five newer algebra calculators: absolute value,
 * radical and rational equations, function operations, variation, and work/mixture/clock
 * problems. Every practice problem carries `verify` (calculator inputs and the result cards
 * that must match), which the tests use to re-solve it with the real calculator.
 */
import { plot } from '../lib/plot.js';
import { tx, txp } from '../lib/calc-kit.js';
import { Frac } from '../lib/fraction.js';
import { linearTex } from '../lib/lines.js';
import { randInt, pick } from '../lib/learn.js';

const { abs, sqrt, PI, cos, sin } = Math;
const F = (x) => Frac.of(x);
const f2 = (x) => tx(x, 2), f3 = (x) => tx(x, 3);
const nz = (rand, lo, hi) => { let v = 0; while (v === 0) v = randInt(rand, lo, hi); return v; };
const lin = (a, b) => linearTex([[F(a), 'x'], [F(b), '']]);
const GRID = { x: [-10, 10], y: [-8, 8], width: 400, height: 320, includeZero: true };

// ================================================================ absolute value
export const absExplore = {
  title: 'Slide a line across the V',
  intro: 'The graph of y = |ax + b| is a V with its vertex on the x-axis. Move the line y = k: two crossings, one (at the vertex) or none. For an inequality, the thick part of the axis shows where the V is below (or above) the line.',
  controls: [
    { name: 'a', label: 'a', min: -3, max: 3, step: 0.5, value: 1 },
    { name: 'b', label: 'b', min: -6, max: 6, step: 0.5, value: -2 },
    { name: 'k', label: 'k (the line y = k)', min: -2, max: 7, step: 0.5, value: 3 },
    { name: 'op', label: 'Show', type: 'select', options: [['eq', '|ax + b| = k'], ['lt', '|ax + b| < k'], ['gt', '|ax + b| > k']], value: 'eq' },
  ],
  presets: [{ label: 'Line below the axis', values: { k: -1 } }, { label: 'Line through the vertex', values: { k: 0 } }, { label: 'Steep V', values: { a: 3, b: 3 } }],
  render({ a, b, k, op }) {
    if (a === 0) return { svg: plot({ ...GRID, hlines: [{ y: abs(b), cls: 'd-line' }, { y: k, cls: 'd-line2' }] }), readouts: [{ label: 'a = 0', text: 'With a = 0 the left side is the constant |b|, not a V. Move the a slider.', tone: 'warn' }] };
    const v = -b / a, sols = k > 0 ? [(-k - b) / a, (k - b) / a].sort((p, q) => p - q) : k === 0 ? [v] : [];
    const lo = sols.length === 2 ? sols[0] : v, hi = sols.length === 2 ? sols[1] : v;
    const segs = op === 'lt' ? (k > 0 ? [{ x1: lo, y1: 0, x2: hi, y2: 0, cls: 'd-line3' }] : []) : op === 'gt' ? (k < 0 ? [{ x1: -10, y1: 0, x2: 10, y2: 0, cls: 'd-line3' }] : [{ x1: -10, y1: 0, x2: lo, y2: 0, cls: 'd-line3' }, { x1: hi, y1: 0, x2: 10, y2: 0, cls: 'd-line3' }]) : [];
    const result = op === 'eq' ? (sols.length ? `x = ${sols.map(f2).join(',\\ x = ')}` : '\\text{no solution}')
      : op === 'lt' ? (k > 0 ? `${f2(lo)} \\lt x \\lt ${f2(hi)}` : '\\varnothing')
      : k < 0 ? 'x \\in \\mathbb{R}' : k === 0 ? `x \\ne ${f2(v)}` : `x \\lt ${f2(lo)} \\ \\text{or}\\ x \\gt ${f2(hi)}`;
    return {
      svg: plot({ ...GRID, title: 'y = |ax + b| and the line y = k', curves: [{ f: (x) => abs(a * x + b), samples: 500 }, { f: () => k, cls: 'd-line2' }], segments: segs, points: [{ x: v, y: 0, label: 'vertex', cls: 'd-point2' }, ...(op === 'eq' ? sols.map((s) => ({ x: s, y: abs(a * s + b), cls: 'd-foot' })) : [])] }),
      readouts: [
        { label: 'Cases', tex: k > 0 ? `${lin(a, b)} = ${tx(k)} \\ \\text{or}\\ ${lin(a, b)} = ${tx(-k)}` : k === 0 ? `${lin(a, b)} = 0` : `k \\lt 0: |ax + b| \\text{ is never negative}` },
        { label: 'Solution', tex: result, tone: 'good' },
        { label: 'Vertex', tex: `x = -\\frac{b}{a} = ${f2(v)}` },
      ],
    };
  },
};

export const absPractice = {
  title: 'Absolute value equations and inequalities',
  generate(rand) {
    const a = pick(rand, [1, 1, 2, 3]), x2 = randInt(rand, -8, 4);
    let gap = randInt(rand, 1, 7); if ((a * gap) % 2) gap += 1;
    const x1 = x2 + gap, k = (a * gap) / 2, b = k - a * x1;
    const ineq = rand() < 0.45, op = pick(rand, ['lt', 'le', 'gt', 'ge']), symT = { lt: '\\lt', le: '\\le', gt: '\\gt', ge: '\\ge' }[op];
    const less = op === 'lt' || op === 'le';
    return {
      prompt: ineq ? `<p>Solve the inequality and enter the two boundary points of the solution set (smaller first).</p>` : '<p>Solve the equation. Enter both solutions, smaller first.</p>',
      promptTex: ineq ? `\\left|${lin(a, b)}\\right| ${symT} ${k}` : `\\left|${lin(a, b)}\\right| = ${k}`,
      answers: [{ label: ineq ? 'Lower boundary' : 'Smaller solution', value: x2, int: true }, { label: ineq ? 'Upper boundary' : 'Larger solution', value: x1, int: true }],
      hint: ineq ? (less ? 'Write it as a double inequality: −k < ax + b < k, then solve for x.' : 'Split it: ax + b < −k or ax + b > k.') : 'Split it into two equations: ax + b = k or ax + b = −k.',
      hintTex: '|u| = k \\iff u = \\pm k \\qquad |u| \\lt k \\iff -k \\lt u \\lt k',
      steps: [
        { title: ineq ? 'Boundary equations' : 'Two cases', texLines: [`${lin(a, b)} = ${k} \\;\\Rightarrow\\; x = ${x1}`, `${lin(a, b)} = ${-k} \\;\\Rightarrow\\; x = ${x2}`] },
        ...(ineq ? [{ title: 'Solution set', tex: less ? `${x2} ${symT} x ${symT} ${x1}` : `x ${op === 'gt' ? '\\lt' : '\\le'} ${x2} \\ \\text{or}\\ x ${symT} ${x1}`, text: less ? 'Less than k: between the boundary points.' : 'Greater than k: outside the boundary points.' }] : [{ title: 'Check', texLines: [`|${a}(${x1}) ${b < 0 ? '-' : '+'} ${abs(b)}| = ${k}`, `|${a}(${x2}) ${b < 0 ? '-' : '+'} ${abs(b)}| = ${k}`] }]),
      ],
      verify: ineq
        ? { id: 'absolute-value-equations', values: { mode: 'ineq', a: String(a), b: String(b), op, k: String(k) }, cards: [['Boundary points', 0], ['Boundary points', 1]] }
        : { id: 'absolute-value-equations', values: { mode: 'eq', a: String(a), b: String(b), k: String(k) }, cards: [['Solution x₁'], ['Solution x₂']] },
    };
  },
};

// ================================================================ radical equations
export const radicalExplore = {
  title: 'Why squaring creates extra roots',
  intro: 'The solid curve is y = √(ax + b). Squaring the equation also brings in its mirror image y = −√(ax + b) (dashed). The line can cross either one, but only crossings with the solid curve are real solutions.',
  controls: [
    { name: 'a', label: 'a', min: 0.5, max: 4, step: 0.5, value: 1 },
    { name: 'b', label: 'b', min: -4, max: 10, step: 0.5, value: 7 },
    { name: 'c', label: 'c (slope of the line)', min: -2, max: 2, step: 0.25, value: 1 },
    { name: 'd', label: 'd (intercept of the line)', min: -6, max: 6, step: 0.5, value: 1 },
  ],
  presets: [{ label: '√(x + 7) = x + 1', values: { a: 1, b: 7, c: 1, d: 1 } }, { label: 'Both roots valid', values: { a: 2, b: 3, c: 1, d: 0 } }, { label: 'Horizontal line', values: { a: 3, b: -2, c: 0, d: 4 } }],
  render({ a, b, c, d }) {
    const A = c * c, B = 2 * c * d - a, C = d * d - b;
    let xs = [];
    if (abs(A) < 1e-12) { if (abs(B) > 1e-12) xs = [-C / B]; }
    else { const D = B * B - 4 * A * C; if (D >= 0) xs = [(-B - sqrt(D)) / (2 * A), (-B + sqrt(D)) / (2 * A)]; }
    xs = xs.filter((x, i, arr) => i === 0 || abs(x - arr[0]) > 1e-9);
    const good = xs.filter((x) => c * x + d >= -1e-9), bad = xs.filter((x) => c * x + d < -1e-9);
    const root = (x) => (a * x + b >= 0 ? sqrt(a * x + b) : NaN);
    return {
      svg: plot({ ...GRID, title: 'y = √(ax + b), its mirror image and the line', curves: [{ f: root, samples: 600 }, { f: (x) => -root(x), cls: 'd-hidden', samples: 600 }, { f: (x) => c * x + d, cls: 'd-line2' }], points: [...good.map((x) => ({ x, y: c * x + d, label: 'solution', cls: 'd-foot' })), ...bad.map((x) => ({ x, y: c * x + d, label: 'extraneous', cls: 'd-point3' }))] }),
      readouts: [
        { label: 'Squared equation', tex: `${tx(A, 3)}x^2 ${B < 0 ? '-' : '+'} ${tx(abs(B), 3)}x ${C < 0 ? '-' : '+'} ${tx(abs(C), 3)} = 0` },
        { label: 'Candidates', tex: xs.length ? `x \\approx ${xs.map(f2).join(',\\ ')}` : '\\text{none}' },
        { label: 'Valid solutions', tex: good.length ? `x \\approx ${good.map(f2).join(',\\ ')}` : '\\text{none}', tone: 'good' },
        { label: 'Extraneous', tex: bad.length ? `x \\approx ${bad.map(f2).join(',\\ ')}\\ (cx + d \\lt 0)` : '\\text{none}', tone: bad.length ? 'warn' : undefined },
      ],
    };
  },
};

export const radicalPractice = {
  title: 'Radical and rational equations',
  generate(rand) {
    if (rand() < 0.55) {
      // √(ax + b) = x + d with roots r (valid) and s (extraneous): a = r + s + 2d, b = d² − rs
      let d, r, s, a;
      do { d = randInt(rand, -3, 3); r = randInt(rand, Math.max(-d, -4), 8); s = randInt(rand, -9, -d - 1); a = r + s + 2 * d; } while (a <= 0 || r === s);
      const b = d * d - r * s;
      return {
        prompt: '<p>Solve the equation. Enter the solution, and the extraneous root that squaring introduces.</p>',
        promptTex: `\\sqrt{${lin(a, b)}} = ${lin(1, d)}`,
        answers: [{ label: 'Solution', value: r, int: true }, { label: 'Extraneous root', value: s, int: true }],
        hint: 'Square both sides, solve the quadratic, then check both candidates in the original equation. The right side must not be negative.',
        hintTex: '\\sqrt{u} = v \\;\\Rightarrow\\; u = v^2,\\ v \\ge 0',
        steps: [
          { title: 'Square both sides', tex: `${lin(a, b)} = \\left(${lin(1, d)}\\right)^2 = x^2 ${2 * d < 0 ? '-' : '+'} ${abs(2 * d)}x + ${d * d}` },
          { title: 'Solve the quadratic', texLines: [`x^2 ${2 * d - a < 0 ? '-' : '+'} ${abs(2 * d - a)}x ${d * d - b < 0 ? '-' : '+'} ${abs(d * d - b)} = 0`, `(x ${r < 0 ? '+' : '-'} ${abs(r)})(x ${s < 0 ? '+' : '-'} ${abs(s)}) = 0 \\;\\Rightarrow\\; x = ${r} \\text{ or } x = ${s}`] },
          { title: 'Check', texLines: [`x = ${r}: \\ \\sqrt{${a * r + b}} = ${sqrt(a * r + b)} = ${r + d} \\ \\checkmark`, `x = ${s}: \\ \\sqrt{${a * s + b}} = ${sqrt(a * s + b)} \\ne ${s + d} \\ \\text{(rejected)}`] },
        ],
        verify: { id: 'radical-rational-equations', values: { mode: 'radical', a: String(a), b: String(b), c: '1', d: String(d) }, cards: [['Solution x'], ['Rejected', 0]] },
      };
    }
    // a/(x − p) = b/(x − q)  →  a(x − q) = b(x − p)  →  x = (aq − bp)/(a − b), chosen to be a whole number
    let a, b, p, q, x;
    do { a = nz(rand, -6, 6); b = nz(rand, -6, 6); p = randInt(rand, -5, 5); q = randInt(rand, -5, 5); x = a - b !== 0 ? (a * q - b * p) / (a - b) : NaN; } while (!Number.isInteger(x) || p === q || x === p || x === q);
    const den = (r) => `x ${r < 0 ? '+' : '-'} ${abs(r)}`.replace('x - 0', 'x');
    return {
      prompt: '<p>Solve the rational equation, and give the excluded value with the larger x.</p>',
      promptTex: `\\frac{${a}}{${den(p)}} = \\frac{${b}}{${den(q)}}`,
      answers: [{ label: 'Solution x', value: x, int: true }, { label: 'Larger excluded value', value: Math.max(p, q), int: true }],
      hint: 'The denominators cannot be 0. Cross-multiply, solve the linear equation, and check the answer is not an excluded value.',
      hintTex: '\\frac{A}{B} = \\frac{C}{D} \\;\\Rightarrow\\; AD = BC',
      steps: [
        { title: 'Excluded values', tex: `x \\ne ${p},\\ x \\ne ${q}` },
        { title: 'Cross-multiply', texLines: [`${a}(${den(q)}) = ${b}(${den(p)})`, `${a - b}x = ${a * q - b * p} \\;\\Rightarrow\\; x = ${x}`] },
        { title: 'Check', tex: `\\frac{${a}}{${x - p}} = ${tx(a / (x - p), 4)}, \\quad \\frac{${b}}{${x - q}} = ${tx(b / (x - q), 4)}\\ \\checkmark` },
      ],
      verify: { id: 'radical-rational-equations', values: { mode: 'rational', lhs: `${a}/(${den(p)})`, rhs: `${b}/(${den(q)})` }, cards: [['Solution x'], ['Excluded values', 1]] },
    };
  },
};

// ================================================================ functions and inverses
const INV = {
  linear: { f: (p) => (x) => p * x + 1, g: (p) => (x) => (x - 1) / p, tex: (p) => `f(x) = ${tx(p, 2)}x + 1`, itex: (p) => `f^{-1}(x) = \\frac{x - 1}{${tx(p, 2)}}` },
  cubic: { f: (p) => (x) => p * x ** 3, g: (p) => (x) => Math.cbrt(x / p), tex: (p) => `f(x) = ${tx(p, 2)}x^3`, itex: (p) => `f^{-1}(x) = \\sqrt[3]{x / ${tx(p, 2)}}` },
  exp: { f: (p) => (x) => p ** x, g: (p) => (x) => (x > 0 ? Math.log(x) / Math.log(p) : NaN), tex: (p) => `f(x) = ${tx(p, 2)}^x`, itex: (p) => `f^{-1}(x) = \\log_{${tx(p, 2)}} x` },
};
export const inverseExplore = {
  title: 'A function and its mirror image',
  intro: 'Move P along the graph of f. Its mirror point P′ in the line y = x always lies on the graph of f⁻¹: the inverse swaps every input with its output.',
  controls: [
    { name: 'type', label: 'Function', type: 'select', options: [['linear', 'Linear: px + 1'], ['cubic', 'Cubic: px³'], ['exp', 'Exponential: pˣ']], value: 'exp' },
    { name: 'p', label: 'Parameter p', min: 0.25, max: 3, step: 0.25, value: 2 },
    { name: 't', label: 'Position of P (its x-value)', min: -2, max: 2, step: 0.05, value: 1 },
  ],
  animate: { control: 't', seconds: 6, loop: true },
  presets: [{ label: '2ˣ and log₂ x', values: { type: 'exp', p: 2 } }, { label: 'Steep line', values: { type: 'linear', p: 3 } }, { label: 'Cubic', values: { type: 'cubic', p: 0.5 } }],
  render({ type, p, t }) {
    const T = INV[type] ? type : 'exp', K = INV[T];
    if (T === 'exp' && p === 1) return { svg: plot({ ...GRID, equal: true, curves: [{ f: () => 1 }, { f: (x) => x, cls: 'd-hidden' }] }), readouts: [{ label: 'p = 1', text: '1ˣ is always 1, so it is not one-to-one and has no inverse. Move p.', tone: 'warn' }] };
    const f = K.f(p), g = K.g(p), y = f(t);
    const inView = abs(y) <= 8;
    return {
      svg: plot({ x: [-8, 8], y: [-8, 8], equal: true, width: 380, height: 360, includeZero: true, title: 'f, f⁻¹ and the line y = x', curves: [{ f, samples: 600 }, { f: g, cls: 'd-line2', samples: 600 }, { f: (x) => x, cls: 'd-hidden' }], segments: inView ? [{ x1: t, y1: y, x2: y, y2: t, cls: 'd-perp' }] : [], points: inView ? [{ x: t, y, label: 'P' }, { x: y, y: t, label: 'P′', cls: 'd-point2' }] : [] }),
      readouts: [
        { label: 'Function', tex: K.tex(p) },
        { label: 'Inverse', tex: K.itex(p), tone: 'good' },
        { label: 'Swap', tex: `P = (${f2(t)},\\ ${f2(y)}) \\;\\to\\; P' = (${f2(y)},\\ ${f2(t)})` },
        { label: 'Check', tex: `f^{-1}\\big(f(${f2(t)})\\big) = ${f2(g(y))}` },
      ],
      note: inView ? '' : 'P is outside the visible window. Move it closer to 0.',
    };
  },
};

export const functionPractice = {
  title: 'Composition and inverses',
  generate(rand) {
    if (rand() < 0.6) {
      const a = nz(rand, -4, 4), b = randInt(rand, -6, 6), c = randInt(rand, -5, 5), x0 = randInt(rand, -3, 3);
      const f = (x) => a * x + b, g = (x) => x * x + c;
      const fS = `${a}x ${b < 0 ? '-' : '+'} ${abs(b)}`, gS = `x^2 ${c < 0 ? '-' : '+'} ${abs(c)}`;
      return {
        prompt: `<p>For f(x) = ${lin(a, b).replace(/\\/g, '')} and g(x) = x² ${c < 0 ? '−' : '+'} ${abs(c)}, find f(g(${x0})) and g(f(${x0})).</p>`,
        promptTex: `f(x) = ${lin(a, b)}, \\qquad g(x) = x^2 ${c < 0 ? '-' : '+'} ${abs(c)}`,
        answers: [{ label: `f(g(${x0}))`, value: f(g(x0)), int: true }, { label: `g(f(${x0}))`, value: g(f(x0)), int: true }],
        hint: 'Work from the inside out: evaluate the inner function first, then put its output into the outer one.',
        hintTex: '(f \\circ g)(x) = f\\big(g(x)\\big)',
        steps: [
          { title: `f(g(${x0}))`, tex: `g(${x0}) = ${txp(x0)}^2 ${c < 0 ? '-' : '+'} ${abs(c)} = ${g(x0)} \\;\\Rightarrow\\; f(${g(x0)}) = ${a}(${g(x0)}) ${b < 0 ? '-' : '+'} ${abs(b)} = ${f(g(x0))}` },
          { title: `g(f(${x0}))`, tex: `f(${x0}) = ${f(x0)} \\;\\Rightarrow\\; g(${f(x0)}) = ${txp(f(x0))}^2 ${c < 0 ? '-' : '+'} ${abs(c)} = ${g(f(x0))}` },
        ],
        verify: { id: 'function-operations', values: { mode: 'combine', f: fS, g: gS, x0: String(x0) }, cards: [['Value (f∘g)(x₀)'], ['Value (g∘f)(x₀)']] },
      };
    }
    // f(x) = (ax + b)/(x + d); choose t and y0 whole numbers with f(t) = y0
    let a, d, t, y0, b;
    do { a = nz(rand, -4, 4); d = randInt(rand, -5, 5); t = randInt(rand, -5, 5); y0 = randInt(rand, -6, 6); b = y0 * (t + d) - a * t; } while (t + d === 0 || a * d - b === 0 || y0 === a);
    return {
      prompt: `<p>Find the inverse of f and evaluate f⁻¹(${y0}).</p>`,
      promptTex: `f(x) = \\frac{${lin(a, b)}}{${lin(1, d)}}`,
      answers: [{ label: `f⁻¹(${y0})`, value: t, int: true }],
      hint: 'Write y = f(x), swap x and y, and solve for y. Or find the x that makes f(x) = y₀ directly.',
      hintTex: 'f(x) = \\frac{ax + b}{cx + d} \\;\\Rightarrow\\; f^{-1}(x) = \\frac{-dx + b}{cx - a}',
      steps: [
        { title: 'Inverse', tex: `f^{-1}(x) = \\frac{${lin(-d, b)}}{${lin(1, -a)}}` },
        { title: 'Evaluate', tex: `f^{-1}(${y0}) = \\frac{${-d}(${y0}) ${b < 0 ? '-' : '+'} ${abs(b)}}{${y0} ${-a < 0 ? '-' : '+'} ${abs(a)}} = \\frac{${-d * y0 + b}}{${y0 - a}} = ${t}` },
        { title: 'Check', tex: `f(${t}) = \\frac{${a * t + b}}{${t + d}} = ${y0}\\ \\checkmark` },
      ],
      verify: { id: 'function-operations', values: { mode: 'inverse', ftype: 'linfrac', a: String(a), b: String(b), c: '1', d: String(d), y0: String(y0) }, cards: [['Value f⁻¹(y₀)']] },
    };
  },
};

// ================================================================ variation
export const variationExplore = {
  title: 'Double x and watch y',
  intro: 'In direct variation y = kxⁿ, doubling x multiplies y by 2ⁿ. In inverse variation y = k/xⁿ, doubling x divides y by 2ⁿ. The constant k only stretches the curve.',
  controls: [
    { name: 'kind', label: 'Variation', type: 'select', options: [['direct', 'Direct: y = kxⁿ'], ['inverse', 'Inverse: y = k/xⁿ']], value: 'direct' },
    { name: 'n', label: 'Power n', min: 1, max: 3, step: 1, value: 2 },
    { name: 'k', label: 'Constant k', min: 0.5, max: 5, step: 0.5, value: 1 },
    { name: 'x', label: 'x', min: 0.5, max: 3, step: 0.05, value: 1.2 },
  ],
  presets: [{ label: 'y = 3x (direct, n = 1)', values: { kind: 'direct', n: 1, k: 3 } }, { label: 'Inverse square', values: { kind: 'inverse', n: 2, k: 4 } }],
  render({ kind, n, k, x }) {
    const f = kind === 'inverse' ? (t) => (t > 0 ? k / t ** n : NaN) : (t) => (t >= 0 ? k * t ** n : NaN);
    const y = f(x), y2 = f(2 * x), factor = y2 / y;
    const top = Math.min(Math.max(y, y2) * 1.3 + 1, 60);
    return {
      svg: plot({ x: [0, 6.5], y: [0, top], width: 380, height: 280, title: kind === 'inverse' ? 'Inverse variation' : 'Direct variation', curves: [{ f, samples: 500 }], segments: [{ x1: x, y1: 0, x2: x, y2: y, cls: 'd-perp' }, { x1: 2 * x, y1: 0, x2: 2 * x, y2: y2, cls: 'd-perp' }], points: [{ x, y, label: '(x, y)' }, { x: 2 * x, y: y2, label: '(2x, y₂)', cls: 'd-point2' }] }),
      readouts: [
        { label: 'Equation', tex: kind === 'inverse' ? `y = \\frac{${tx(k, 2)}}{x^{${n}}}` : `y = ${tx(k, 2)}\\,x^{${n}}` },
        { label: 'Values', tex: `y(${f2(x)}) \\approx ${f3(y)}, \\quad y(${f2(2 * x)}) \\approx ${f3(y2)}` },
        { label: 'Doubling x multiplies y by', tex: `${f3(factor)} = ${kind === 'inverse' ? `\\frac{1}{2^{${n}}}` : `2^{${n}}`}`, tone: 'good' },
      ],
    };
  },
};

export const variationPractice = {
  title: 'Direct and inverse variation',
  generate(rand) {
    const inverse = rand() < 0.45, n = pick(rand, [1, 1, 2, 2, 3]);
    const k = randInt(rand, 1, 6), x1 = randInt(rand, 1, 4);
    let x2 = randInt(rand, 1, 6); if (x2 === x1) x2 += 1;
    // inverse: k = (known y)·x₁ⁿ, with the known y a whole number; direct: k itself is whole
    const K = inverse ? k * x1 ** n : k, Y1 = inverse ? k : k * x1 ** n, Y2 = inverse ? K / x2 ** n : K * x2 ** n;
    const word = n === 1 ? '' : n === 2 ? 'the square of ' : 'the cube of ';
    return {
      prompt: `<p>y varies ${inverse ? 'inversely' : 'directly'} as ${word}x. When x = ${x1}, y = ${Y1}. Find the constant of variation k and the value of y when x = ${x2}.</p>`,
      answers: [{ label: 'k', value: K }, { label: `y when x = ${x2}`, value: Y2 }],
      hint: inverse ? 'Write y = k/xⁿ, substitute the known pair to find k, then substitute the new x.' : 'Write y = kxⁿ, substitute the known pair to find k, then substitute the new x.',
      hintTex: inverse ? 'y = \\frac{k}{x^n}' : 'y = k\\,x^n',
      steps: [
        { title: 'Find k', tex: inverse ? `${Y1} = \\frac{k}{${x1}^{${n}}} \\;\\Rightarrow\\; k = ${Y1} \\times ${x1 ** n} = ${K}` : `${Y1} = k \\cdot ${x1}^{${n}} \\;\\Rightarrow\\; k = \\frac{${Y1}}{${x1 ** n}} = ${K}` },
        { title: 'New value', tex: inverse ? `y = \\frac{${K}}{${x2}^{${n}}} = \\frac{${K}}{${x2 ** n}} ${Number.isInteger(Y2) ? '=' : '\\approx'} ${f3(Y2)}` : `y = ${K} \\cdot ${x2}^{${n}} = ${Y2}` },
      ],
      verify: { id: 'variation-proportion', values: { mode: 'variation', kind: inverse ? 'inverse' : 'direct', n: String(n), x1: String(x1), y1: String(Y1), x2: String(x2) }, cards: [['Constant of variation k'], ['New value y']] },
    };
  },
};

// ================================================================ clock, work and mixture
export function clockSvg(h, m) {
  const W = 220, c = 110, R = 92;
  const at = (deg, r) => [c + r * sin((deg * PI) / 180), c - r * cos((deg * PI) / 180)];
  const H = (h % 12) * 30 + m / 2, M = m * 6;
  const r1 = (v) => Math.round(v * 10) / 10;
  const ticks = Array.from({ length: 60 }, (_, i) => { const [x1, y1] = at(i * 6, R), [x2, y2] = at(i * 6, i % 5 ? R - 5 : R - 11); return `<line class="${i % 5 ? 'd-axis' : 'd-line'}" x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" style="stroke-width:${i % 5 ? 1 : 2}"/>`; }).join('');
  const nums = Array.from({ length: 12 }, (_, i) => { const [x, y] = at((i + 1) * 30, R - 24); return `<text class="d-label" x="${r1(x)}" y="${r1(y + 4)}" text-anchor="middle">${i + 1}</text>`; }).join('');
  let a1 = Math.min(H, M), a2 = Math.max(H, M);
  if (a2 - a1 > 180) [a1, a2] = [a2, a1 + 360];
  const arcR = 30, [ax1, ay1] = at(a1, arcR), [ax2, ay2] = at(a2, arcR);
  const arc = Math.abs(a2 - a1) > 0.5 ? `<path class="d-line3" fill="none" d="M ${r1(ax1)} ${r1(ay1)} A ${arcR} ${arcR} 0 0 1 ${r1(ax2)} ${r1(ay2)}"/>` : '';
  const [hx, hy] = at(H, R * 0.52), [mx, my] = at(M, R * 0.8);
  const svg = `<svg class="diagram" viewBox="0 0 ${W} ${W}" role="img" aria-label="Clock face"><title>Clock face showing the hour and minute hands</title><circle cx="${c}" cy="${c}" r="${R}" fill="none" class="d-line" style="stroke-width:2"/>${ticks}${nums}${arc}<line class="d-line" x1="${c}" y1="${c}" x2="${r1(hx)}" y2="${r1(hy)}" style="stroke-width:5;stroke-linecap:round"/><line class="d-line2" x1="${c}" y1="${c}" x2="${r1(mx)}" y2="${r1(my)}" style="stroke-width:3;stroke-linecap:round"/><circle cx="${c}" cy="${c}" r="4" class="d-point"/></svg>`;
  return /NaN/.test(svg) ? '' : svg;
}

export const clockExplore = {
  title: 'Move the hands of a clock',
  intro: 'Press Play to run the clock. The minute hand turns 6° per minute and the hour hand 0.5° per minute, so the minute hand gains 5.5° every minute: the angle between them is |30h − 5.5m|.',
  controls: [{ name: 't', label: 'Minutes after 12:00', min: 0, max: 719, step: 1, value: 220 }],
  animate: { control: 't', seconds: 24, loop: true },
  presets: [{ label: '3:00 (right angle)', values: { t: 180 } }, { label: '6:00 (opposite)', values: { t: 360 } }, { label: '3:40', values: { t: 220 } }, { label: '12:00 (together)', values: { t: 0 } }],
  render({ t }) {
    const h = Math.floor(t / 60), m = t - 60 * h, H = h * 30 + m / 2, M = m * 6;
    const diff = abs(H - M), small = diff > 180 ? 360 - diff : diff;
    return {
      svg: clockSvg(h, m),
      readouts: [
        { label: 'Time', text: `${h === 0 ? 12 : h}:${String(Math.round(m)).padStart(2, '0')}` },
        { label: 'Hour hand', tex: `30^\\circ(${h}) + 0.5^\\circ(${m}) = ${tx(H, 1)}^\\circ` },
        { label: 'Minute hand', tex: `6^\\circ(${m}) = ${tx(M, 1)}^\\circ` },
        { label: 'Angle between', tex: `${tx(small, 1)}^\\circ`, tone: 'good' },
      ],
    };
  },
};

export const wordPractice = {
  title: 'Work, mixture and clock problems',
  generate(rand) {
    const kind = pick(rand, ['work', 'work', 'clock', 'mix']);
    if (kind === 'work') {
      const [tA, tB] = pick(rand, [[6, 3], [4, 12], [10, 15], [6, 12], [5, 20], [8, 24], [12, 4], [9, 18], [3, 6], [20, 30]]);
      const t = (tA * tB) / (tA + tB);
      return {
        prompt: `<p>A pipe fills a tank in <strong>${tA} hours</strong>; a second pipe fills it in <strong>${tB} hours</strong>. How long do they take together?</p>`,
        answers: [{ label: 'Time together (hours)', value: t }],
        hint: 'Add the rates, not the times: each pipe does 1/t of the tank per hour.',
        hintTex: '\\frac{1}{t} = \\frac{1}{t_A} + \\frac{1}{t_B}',
        steps: [{ title: 'Combined rate', tex: `\\frac{1}{${tA}} + \\frac{1}{${tB}} = \\frac{${tA + tB}}{${tA * tB}}` }, { title: 'Time', tex: `t = \\frac{${tA * tB}}{${tA + tB}} ${Number.isInteger(t) ? '=' : '\\approx'} ${f3(t)} \\text{ hours}` }],
        verify: { id: 'work-mixture-clock', values: { mode: 'work', tA: String(tA), tB: String(tB), wkind: 'with' }, cards: [['Time working together']] },
      };
    }
    if (kind === 'clock') {
      const h = randInt(rand, 1, 11), m = pick(rand, [5, 10, 15, 20, 24, 30, 36, 40, 45, 50, 55]);
      const d = abs(30 * h - 5.5 * m), th = d > 180 ? 360 - d : d;
      return {
        prompt: `<p>What is the smaller angle between the hands of a clock at <strong>${h}:${String(m).padStart(2, '0')}</strong>?</p>`,
        answers: [{ label: 'Angle', value: th, unit: '°' }],
        hint: 'The hour hand is at 30h + 0.5m degrees and the minute hand at 6m degrees. If the difference is over 180°, subtract it from 360°.',
        hintTex: '\\theta = |30h - 5.5m|',
        steps: [{ title: 'Hand positions (from 12, clockwise)', tex: `\\text{hour: } 30(${h}) + 0.5(${m}) = ${30 * h + m / 2}^\\circ, \\quad \\text{minute: } 6(${m}) = ${6 * m}^\\circ` }, { title: 'Difference', tex: `|30(${h}) - 5.5(${m})| = |${30 * h} - ${5.5 * m}| = ${d}^\\circ` }, ...(d > 180 ? [{ title: 'Smaller angle', tex: `360^\\circ - ${d}^\\circ = ${th}^\\circ` }] : [])],
        verify: { id: 'work-mixture-clock', values: { mode: 'clock', h: String(h), min: String(m) }, cards: [['Angle between']] },
      };
    }
    const x1 = pick(rand, [10, 20, 30, 40]), x2 = pick(rand, [10, 20, 30, 50]), c1 = pick(rand, [10, 20, 25, 30]), c2 = pick(rand, [40, 50, 60, 80]);
    const c = (x1 * c1 + x2 * c2) / (x1 + x2);
    return {
      prompt: `<p><strong>${x1} L</strong> of a ${c1}% solution is mixed with <strong>${x2} L</strong> of a ${c2}% solution. What is the concentration of the mixture?</p>`,
      answers: [{ label: 'Concentration', value: c, unit: '%' }],
      hint: 'Add up the pure substance in each part, then divide by the total volume.',
      hintTex: 'c = \\frac{x_1 c_1 + x_2 c_2}{x_1 + x_2}',
      steps: [{ title: 'Pure substance', tex: `${x1}(${c1}\\%) + ${x2}(${c2}\\%) = ${(x1 * c1 + x2 * c2) / 100} \\text{ L}` }, { title: 'Concentration', tex: `\\frac{${(x1 * c1 + x2 * c2) / 100}}{${x1 + x2}} \\times 100\\% ${Number.isInteger(c * 100) ? '=' : '\\approx'} ${f3(c)}\\%` }],
      verify: { id: 'work-mixture-clock', values: { mode: 'mixture', mkind: 'mix', x1: String(x1), c1: String(c1), x2: String(x2), c2: String(c2) }, cards: [['Concentration of the mixture']] },
    };
  },
};
