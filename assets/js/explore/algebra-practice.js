/**
 * Explorers and "Try it" practice for the original algebra calculators. Each problem carries
 * `verify` (calculator inputs plus the result cards that must match), which the tests use to
 * re-solve it with the real calculator.
 */
import { plot } from '../lib/plot.js';
import { tx, txp } from '../lib/calc-kit.js';
import { Frac } from '../lib/fraction.js';
import { linearTex } from '../lib/lines.js';
import { randInt, pick } from '../lib/learn.js';

const { abs, sqrt } = Math;
const F = (x) => Frac.of(x);
const f2 = (x) => tx(x, 2), f3 = (x) => tx(x, 3);
const nz = (rand, lo, hi) => { let v = 0; while (v === 0) v = randInt(rand, lo, hi); return v; };
const lin = (a, b) => linearTex([[F(a), 'x'], [F(b), '']]);
const polyT = (cs) => linearTex(cs.map((c, i) => [F(c), i === 0 ? '' : i === 1 ? 'x' : `x^{${i}}`]).reverse());
const polyS = (cs) => { const out = []; for (let i = cs.length - 1; i >= 0; i--) { const c = cs[i]; if (!c) continue; out.push(`${c < 0 ? '-' : '+'} ${abs(c) === 1 && i ? '' : abs(c)}${i === 0 ? '' : i === 1 ? 'x' : `x^${i}`}`); } return out.join(' ').replace(/^\+ /, '').replace(/^- /, '-') || '0'; };
const mulRoots = (rs, k = 1) => { let p = [k]; for (const r of rs) { const q = new Array(p.length + 1).fill(0); p.forEach((c, j) => { q[j + 1] += c; q[j] -= r * c; }); p = q; } return p; };
const fac = (r) => (r === 0 ? 'x' : `(x ${r < 0 ? '+' : '-'} ${abs(r)})`);
const GRID = { x: [-10, 10], y: [-8, 8], width: 400, height: 320, includeZero: true };

// ================================================================ explorers
export const linearExplore = {
  title: 'Two sides, two lines',
  intro: 'Graph each side of ax + b = cx + d as a line. The solution is the x-value where they cross. Equal slopes give parallel lines (no solution) or the same line (every x).',
  controls: [
    { name: 'a', label: 'a (left slope)', min: -4, max: 4, step: 0.5, value: 3 },
    { name: 'b', label: 'b (left constant)', min: -8, max: 8, step: 1, value: 5 },
    { name: 'c', label: 'c (right slope)', min: -4, max: 4, step: 0.5, value: 2 },
    { name: 'd', label: 'd (right constant)', min: -8, max: 8, step: 1, value: -7 },
  ],
  presets: [{ label: 'No solution', values: { a: 2, b: 2, c: 2, d: 5 } }, { label: 'Every x', values: { a: 1, b: 3, c: 1, d: 3 } }],
  render({ a, b, c, d }) {
    const pts = [];
    let sol;
    if (a === c) sol = b === d ? 'every x (the two sides are identical)' : `no solution: ${tx(b)} = ${tx(d)} is false`;
    else { const x = (d - b) / (a - c); pts.push({ x, y: a * x + b, label: `x = ${f2(x)}`, cls: 'd-foot' }); sol = null; }
    return {
      svg: plot({ x: [-12, 12], y: [-20, 20], width: 400, height: 320, includeZero: true, title: 'y = ax + b and y = cx + d', curves: [{ f: (x) => a * x + b }, { f: (x) => c * x + d, cls: 'd-line2' }], points: pts }),
      readouts: [
        { label: 'Equation', tex: `${lin(a, b)} = ${lin(c, d)}` },
        { label: 'Collect terms', tex: `${tx(a - c)}x = ${tx(d - b)}` },
        sol ? { label: 'Solution', text: sol, tone: 'warn' } : { label: 'Solution', tex: `x = \\frac{${tx(d - b)}}{${tx(a - c)}} ${Number.isInteger(((d - b) / (a - c)) * 100) ? '=' : '\\approx'} ${f3((d - b) / (a - c))}`, tone: 'good' },
      ],
    };
  },
};

export const factoringExplore = {
  title: 'Build a polynomial from its roots',
  intro: 'Choose three roots and a leading coefficient. The graph crosses the x-axis at each root, and every root r gives a factor (x − r). Expanding the factors gives the standard form.',
  controls: [
    { name: 'r1', label: 'Root r₁', min: -4, max: 4, step: 0.5, value: -2 },
    { name: 'r2', label: 'Root r₂', min: -4, max: 4, step: 0.5, value: 1 },
    { name: 'r3', label: 'Root r₃', min: -4, max: 4, step: 0.5, value: 3 },
    { name: 'k', label: 'Leading coefficient', min: -2, max: 2, step: 0.5, value: 1 },
  ],
  presets: [{ label: 'Double root', values: { r1: 1, r2: 1, r3: -3 } }, { label: 'Triple root', values: { r1: 2, r2: 2, r3: 2 } }],
  render({ r1, r2, r3, k }) {
    const kk = k === 0 ? 1 : k;
    const p = mulRoots([r1, r2, r3], kk);
    const f = (x) => kk * (x - r1) * (x - r2) * (x - r3);
    const pt = (r) => (r === 0 ? 'x' : `(x ${r < 0 ? '+' : '-'} ${tx(abs(r))})`);
    return {
      svg: plot({ x: [-6, 6], y: [-20, 20], width: 400, height: 300, includeZero: true, title: 'y = k(x − r₁)(x − r₂)(x − r₃)', curves: [{ f, samples: 400 }], points: [r1, r2, r3].map((r) => ({ x: r, y: 0, cls: 'd-foot' })) }),
      readouts: [
        { label: 'Factored form', tex: `${kk === 1 ? '' : kk === -1 ? '-' : tx(kk)}${pt(r1)}${pt(r2)}${pt(r3)}`, tone: 'good' },
        { label: 'Expanded', tex: linearTex(p.map((c, i) => [F(+c.toFixed(6)), i === 0 ? '' : i === 1 ? 'x' : `x^{${i}}`]).reverse()) },
        { label: 'Vieta check', tex: `r_1 + r_2 + r_3 = ${tx(r1 + r2 + r3)} = -\\frac{${tx(+p[2].toFixed(6))}}{${tx(kk)}}` },
      ],
      note: k === 0 ? 'k = 0 would make the polynomial 0, so k = 1 is used.' : '',
    };
  },
};

export const systemsExplore = {
  title: 'Two equations, two lines',
  intro: 'Each equation a₁x + b₁y = c₁ is a line. The solution of the system is the point on both. Make the lines parallel to get no solution, or the same line to get infinitely many.',
  controls: [
    { name: 'a1', label: 'a₁', min: -4, max: 4, step: 1, value: 2 }, { name: 'b1', label: 'b₁', min: -4, max: 4, step: 1, value: 3 }, { name: 'c1', label: 'c₁', min: -12, max: 12, step: 1, value: 12 },
    { name: 'a2', label: 'a₂', min: -4, max: 4, step: 1, value: 1 }, { name: 'b2', label: 'b₂', min: -4, max: 4, step: 1, value: -1 }, { name: 'c2', label: 'c₂', min: -12, max: 12, step: 1, value: 1 },
  ],
  presets: [{ label: 'Parallel', values: { a1: 1, b1: 2, c1: 4, a2: 2, b2: 4, c2: 3 } }, { label: 'Same line', values: { a1: 1, b1: 2, c1: 4, a2: 2, b2: 4, c2: 8 } }],
  render({ a1, b1, c1, a2, b2, c2 }) {
    const line = (a, b, c, cls) => (b === 0 ? { v: a === 0 ? null : { x: c / a, cls } } : { f: { f: (x) => (c - a * x) / b, cls } });
    const L1 = line(a1, b1, c1, 'd-line'), L2 = line(a2, b2, c2, 'd-line2');
    const D = a1 * b2 - a2 * b1;
    const x = D ? (c1 * b2 - c2 * b1) / D : NaN, y = D ? (a1 * c2 - a2 * c1) / D : NaN;
    const same = !D && a1 * c2 === a2 * c1 && b1 * c2 === b2 * c1;
    const empty = (a1 === 0 && b1 === 0) || (a2 === 0 && b2 === 0);
    return {
      svg: plot({ ...GRID, title: 'The two equations as lines', curves: [L1.f, L2.f].filter(Boolean), vlines: [L1.v, L2.v].filter(Boolean), points: D ? [{ x, y, label: 'solution', cls: 'd-foot' }] : [] }),
      readouts: empty ? [{ label: 'Equation', text: 'An equation with a = b = 0 is not a line. Move a slider.', tone: 'warn' }] : [
        { label: 'System', tex: `${linearTex([[F(a1), 'x'], [F(b1), 'y']])} = ${c1}, \\quad ${linearTex([[F(a2), 'x'], [F(b2), 'y']])} = ${c2}` },
        { label: 'Determinant', tex: `D = a_1b_2 - a_2b_1 = ${D}` },
        D ? { label: 'Solution', tex: `x = ${f3(x)},\\quad y = ${f3(y)}`, tone: 'good' } : { label: 'Solution', text: same ? 'Infinitely many: the equations describe the same line.' : 'None: the lines are parallel.', tone: 'warn' },
      ],
    };
  },
};

export const exponentExplore = {
  title: 'What a fractional exponent means',
  intro: 'x^(p/q) is the q-th root of x, raised to the power p. A negative p takes the reciprocal. Change p and q and watch the curve and the value at your chosen x.',
  controls: [
    { name: 'p', label: 'Numerator p', min: -3, max: 4, step: 1, value: 2 },
    { name: 'q', label: 'Denominator q (the root)', min: 1, max: 4, step: 1, value: 3 },
    { name: 'x', label: 'x', min: 0.25, max: 9, step: 0.25, value: 8 },
  ],
  presets: [{ label: 'Square root (1/2)', values: { p: 1, q: 2 } }, { label: '8^(2/3) = 4', values: { p: 2, q: 3, x: 8 } }, { label: 'Negative exponent', values: { p: -1, q: 2, x: 4 } }],
  render({ p, q, x }) {
    const e = p / q;
    const f = (t) => (t > 0 ? t ** e : t === 0 ? (e > 0 ? 0 : NaN) : q % 2 ? -((-t) ** e) * (p % 2 ? 1 : -1) : NaN);
    const val = x ** e, root = x ** (1 / q);
    return {
      svg: plot({ x: [-9.5, 9.5], y: [-6, 8], width: 400, height: 300, includeZero: true, title: `y = x^(${p}/${q})`, curves: [{ f, samples: 600 }], points: [{ x, y: val, label: `(${f2(x)}, ${f2(val)})` }] }),
      readouts: [
        { label: 'Meaning', tex: `x^{${p}/${q}} = \\left(\\sqrt[${q}]{x}\\right)^{${p}}` },
        { label: 'At your x', tex: `${tx(x)}^{${p}/${q}} = \\left(\\sqrt[${q}]{${tx(x)}}\\right)^{${p}} \\approx (${f3(root)})^{${p}} \\approx ${f3(val)}`, tone: 'good' },
        { label: 'Domain', text: q % 2 ? 'An odd root is defined for negative x too.' : 'An even root needs x ≥ 0.' },
      ],
    };
  },
};

export const logExplore = {
  title: 'Exponential and logarithm as mirror images',
  intro: 'y = log_b x answers "b to what power gives x?", so its graph is y = bˣ reflected in the line y = x. Every log graph passes through (1, 0) and (b, 1).',
  controls: [
    { name: 'b', label: 'Base b', min: 0.25, max: 5, step: 0.25, value: 2 },
    { name: 'x', label: 'x', min: 0.25, max: 9, step: 0.25, value: 8 },
  ],
  presets: [{ label: 'Base 2', values: { b: 2, x: 8 } }, { label: 'Base 10', values: { b: 5, x: 5 } }, { label: 'Base between 0 and 1', values: { b: 0.5, x: 4 } }],
  degenerate: [{ b: 1 }],
  render({ b, x }) {
    if (b === 1) return { svg: plot({ x: [-6, 9], y: [-6, 9], equal: true, width: 380, height: 340, curves: [{ f: () => 1 }, { f: (t) => t, cls: 'd-hidden' }] }), readouts: [{ label: 'b = 1', text: '1 to any power is 1, so log base 1 is not defined. Move the base.', tone: 'warn' }] };
    const L = Math.log(x) / Math.log(b);
    return {
      svg: plot({ x: [-6, 9], y: [-6, 9], equal: true, width: 380, height: 340, includeZero: true, title: 'y = bˣ, y = log_b x and y = x', curves: [{ f: (t) => b ** t, samples: 500 }, { f: (t) => (t > 0 ? Math.log(t) / Math.log(b) : NaN), cls: 'd-line2', samples: 500 }, { f: (t) => t, cls: 'd-hidden' }], points: [{ x, y: L, label: `(${f2(x)}, ${f2(L)})`, cls: 'd-foot' }, { x: L, y: x, cls: 'd-point2' }] }),
      readouts: [
        { label: 'Logarithm', tex: `\\log_{${tx(b)}} ${tx(x)} ${Number.isInteger(L * 1000) ? '=' : '\\approx'} ${f3(L)}`, tone: 'good' },
        { label: 'Because', tex: `${tx(b)}^{${f3(L)}} \\approx ${f3(b ** L)}` },
        { label: 'Change of base', tex: `\\frac{\\ln ${tx(x)}}{\\ln ${tx(b)}} \\approx \\frac{${f3(Math.log(x))}}{${f3(Math.log(b))}}` },
      ],
    };
  },
};

export const rationalExplore = {
  title: 'Holes and asymptotes',
  intro: 'f(x) = (x − a)(x − b) / ((x − a)(x − c)). The common factor (x − a) cancels and leaves a hole at x = a. The factor (x − c) left in the denominator gives a vertical asymptote.',
  controls: [
    { name: 'a', label: 'Cancelled factor a', min: -5, max: 5, step: 0.5, value: 2 },
    { name: 'b', label: 'Numerator zero b', min: -5, max: 5, step: 0.5, value: 3 },
    { name: 'c', label: 'Denominator zero c', min: -5, max: 5, step: 0.5, value: -1 },
  ],
  presets: [{ label: 'b = c (simplifies to 1)', values: { a: 2, b: 1, c: 1 } }],
  render({ a, b, c }) {
    const g = (x) => (x - b) / (x - c);
    const hole = abs(a - c) > 1e-9 ? g(a) : NaN;
    const simp = b === c ? '1' : `\\frac{x ${b < 0 ? '+' : '-'} ${tx(abs(b))}}{x ${c < 0 ? '+' : '-'} ${tx(abs(c))}}`;
    return {
      svg: plot({ ...GRID, title: 'The simplified expression with its hole', curves: [{ f: (x) => (abs(x - a) < 1e-9 ? NaN : g(x)), samples: 900 }], hlines: [{ y: 1, cls: 'd-hidden' }], vlines: b === c ? [] : [{ x: c, cls: 'd-line3' }], points: Number.isFinite(hole) ? [{ x: a, y: hole, label: 'hole', cls: 'd-point3' }] : [] }),
      readouts: [
        { label: 'Simplified', tex: simp, tone: 'good' },
        { label: 'Excluded values', tex: a === c ? `x \\ne ${tx(a)}` : `x \\ne ${tx(a)},\\ x \\ne ${tx(c)}` },
        { label: 'Hole', tex: Number.isFinite(hole) ? `(${tx(a)},\\ ${f3(hole)})` : `\\text{none: } (x - ${tx(a)}) \\text{ does not fully cancel}` },
        { label: 'Vertical asymptote', tex: b === c ? '\\text{none}' : `x = ${tx(c)}` },
      ],
    };
  },
};

export const remainderExplore = {
  title: 'The remainder theorem',
  intro: 'Dividing P(x) by (x − c) leaves the remainder P(c): the height of the graph at x = c. When the point sits on the x-axis the remainder is 0, and (x − c) is a factor.',
  controls: [
    { name: 'p2', label: 'P(x) = x³ + p₂x² + p₁x + p₀: p₂', min: -5, max: 5, step: 1, value: -2 },
    { name: 'p1', label: 'p₁', min: -8, max: 8, step: 1, value: -5 },
    { name: 'p0', label: 'p₀', min: -10, max: 10, step: 1, value: 6 },
    { name: 'c', label: 'Divide by x − c: c', min: -4, max: 4, step: 0.5, value: 3 },
  ],
  presets: [{ label: 'c = 1 is a root', values: { p2: -2, p1: -5, p0: 6, c: 1 } }],
  render({ p2, p1, p0, c }) {
    const P = (x) => x ** 3 + p2 * x * x + p1 * x + p0;
    const q1 = p2 + c, q0 = p1 + c * q1, r = p0 + c * q0;
    return {
      svg: plot({ x: [-5, 5], y: [-30, 30], width: 400, height: 300, includeZero: true, title: 'y = P(x) and the point (c, P(c))', curves: [{ f: P, samples: 400 }], segments: [{ x1: c, y1: 0, x2: c, y2: r, cls: 'd-perp' }], points: [{ x: c, y: r, label: `(${tx(c)}, ${f2(r)})`, cls: 'd-foot' }] }),
      readouts: [
        { label: 'Synthetic division', tex: `1 \\;\\to\\; ${f2(q1)} \\;\\to\\; ${f2(q0)} \\;\\to\\; \\text{remainder } ${f2(r)}` },
        { label: 'Quotient', tex: `x^2 ${q1 < 0 ? '-' : '+'} ${tx(abs(q1))}x ${q0 < 0 ? '-' : '+'} ${tx(abs(q0))}` },
        { label: 'Remainder = P(c)', tex: `P(${tx(c)}) = ${f2(r)}`, tone: abs(r) < 1e-9 ? 'good' : undefined },
      ],
      note: abs(r) < 1e-9 ? `The remainder is 0, so (x − ${tx(c)}) is a factor of P(x).` : '',
    };
  },
};

export const partialExplore = {
  title: 'Add two simple fractions',
  intro: 'A/(x − p) + B/(x − q) combine into one fraction over (x − p)(x − q). Partial fractions run this backwards: near x = p the first term dominates, near x = q the second.',
  controls: [
    { name: 'A', label: 'A', min: -5, max: 5, step: 0.5, value: 2 }, { name: 'p', label: 'p', min: -5, max: 5, step: 0.5, value: -1 },
    { name: 'B', label: 'B', min: -5, max: 5, step: 0.5, value: 3 }, { name: 'q', label: 'q', min: -5, max: 5, step: 0.5, value: 2 },
  ],
  presets: [{ label: 'Equal and opposite', values: { A: 2, B: -2 } }],
  render({ A, p, B, q }) {
    const t1 = (x) => A / (x - p), t2 = (x) => B / (x - q), s = (x) => t1(x) + t2(x);
    const n1 = A + B, n0 = -(A * q + B * p);
    const same = p === q;
    return {
      svg: plot({ ...GRID, title: 'The two terms (dashed) and their sum', curves: [{ f: t1, cls: 'd-hidden', samples: 800 }, { f: t2, cls: 'd-hidden', samples: 800 }, { f: s, samples: 900 }], vlines: [{ x: p, cls: 'd-line3' }, ...(same ? [] : [{ x: q, cls: 'd-line3' }])] }),
      readouts: same ? [{ label: 'Same denominator', tex: `\\frac{${tx(A)}}{x - ${tx(p)}} + \\frac{${tx(B)}}{x - ${tx(q)}} = \\frac{${tx(A + B)}}{x - ${tx(p)}}`, tone: 'warn' }] : [
        { label: 'Terms', tex: `\\frac{${tx(A)}}{${lin(1, -p)}} + \\frac{${tx(B)}}{${lin(1, -q)}}` },
        { label: 'Combined', tex: `\\frac{${linearTex([[F(n1), 'x'], [F(n0), '']])}}{\\left(${lin(1, -p)}\\right)\\left(${lin(1, -q)}\\right)}`, tone: 'good' },
        { label: 'Cover-up check', tex: `A = \\frac{${linearTex([[F(n1), 'x'], [F(n0), '']])}}{x - ${tx(q)}}\\Big|_{x = ${tx(p)}} = ${f3((n1 * p + n0) / (p - q))}` },
      ],
    };
  },
};

export const inequalityExplore = {
  title: 'Where is the parabola above the axis?',
  intro: 'For ax² + bx + c > 0, find where the graph is above the x-axis; for < 0, where it is below. The roots split the line into intervals, and the sign stays the same inside each one.',
  controls: [
    { name: 'a', label: 'a', min: -3, max: 3, step: 0.5, value: 1 },
    { name: 'b', label: 'b', min: -6, max: 6, step: 0.5, value: -1 },
    { name: 'c', label: 'c', min: -8, max: 8, step: 0.5, value: -6 },
    { name: 'op', label: 'Solve', type: 'select', options: [['gt', 'ax² + bx + c > 0'], ['lt', 'ax² + bx + c < 0']], value: 'lt' },
  ],
  presets: [{ label: 'No real roots', values: { a: 1, b: 0, c: 3 } }, { label: 'Opens downward', values: { a: -1, b: 0, c: 4 } }],
  render({ a, b, c, op }) {
    const f = (x) => a * x * x + b * x + c;
    const pos = op === 'gt';
    if (a === 0) {
      if (b === 0) return { svg: plot({ ...GRID, curves: [{ f }] }), readouts: [{ label: 'Constant', text: `The left side is the constant ${tx(c)}, so the inequality is ${(pos ? c > 0 : c < 0) ? 'always' : 'never'} true.`, tone: 'warn' }] };
      const x0 = -c / b, right = pos === b > 0;
      return { svg: plot({ ...GRID, title: 'A straight line (a = 0)', curves: [{ f }], segments: [{ x1: right ? x0 : -10, y1: 0, x2: right ? 10 : x0, y2: 0, cls: 'd-line3' }], points: [{ x: x0, y: 0, cls: 'd-foot' }] }), readouts: [{ label: 'Linear', tex: `x ${right ? '\\gt' : '\\lt'} ${f3(x0)}`, tone: 'good' }] };
    }
    const D = b * b - 4 * a * c;
    const roots = D > 0 ? [(-b - sqrt(D)) / (2 * a), (-b + sqrt(D)) / (2 * a)].sort((p, q) => p - q) : D === 0 ? [-b / (2 * a)] : [];
    const up = a > 0, between = up !== pos;
    let segs, text;
    if (roots.length < 2) {
      const always = pos ? up : !up;
      segs = always ? [{ x1: -10, y1: 0, x2: 10, y2: 0, cls: 'd-line3' }] : [];
      text = always ? (roots.length ? `x \\ne ${f3(roots[0])}` : 'x \\in \\mathbb{R}') : '\\varnothing';
    } else if (between) { segs = [{ x1: roots[0], y1: 0, x2: roots[1], y2: 0, cls: 'd-line3' }]; text = `${f3(roots[0])} \\lt x \\lt ${f3(roots[1])}`; }
    else { segs = [{ x1: -10, y1: 0, x2: roots[0], y2: 0, cls: 'd-line3' }, { x1: roots[1], y1: 0, x2: 10, y2: 0, cls: 'd-line3' }]; text = `x \\lt ${f3(roots[0])} \\ \\text{or}\\ x \\gt ${f3(roots[1])}`; }
    return {
      svg: plot({ ...GRID, title: 'y = ax² + bx + c', curves: [{ f, samples: 500 }], segments: segs, points: roots.map((r) => ({ x: r, y: 0, cls: 'd-foot' })) }),
      readouts: [
        { label: 'Roots', tex: roots.length ? `x = ${roots.map(f3).join(',\\ ')}` : `\\text{none } (\\Delta = ${tx(D)} \\lt 0)` },
        { label: 'Opens', text: up ? 'upward: negative between the roots, positive outside' : 'downward: positive between the roots, negative outside' },
        { label: 'Solution', tex: text, tone: 'good' },
      ],
    };
  },
};

// ================================================================ practice
export const linearPractice = {
  title: 'Solve a linear equation',
  generate(rand) {
    const x = randInt(rand, -8, 8); let a, c;
    do { a = nz(rand, -7, 7); c = randInt(rand, -6, 6); } while (a === c);
    const b = randInt(rand, -12, 12), d = (a - c) * x + b;
    const eq = `${polyS([b, a])} = ${polyS([d, c])}`;
    return {
      prompt: '<p>Solve for x.</p>', promptTex: `${lin(a, b)} = ${lin(c, d)}`,
      answers: [{ label: 'x', value: x, int: true }],
      hint: 'Collect the x-terms on one side and the numbers on the other, then divide by the coefficient of x.',
      hintTex: 'ax + b = cx + d \\;\\Rightarrow\\; x = \\frac{d - b}{a - c}',
      steps: [{ title: 'Collect terms', tex: `${a}x - ${txp(c)}x = ${d} - ${txp(b)} \\;\\Rightarrow\\; ${a - c}x = ${d - b}` }, { title: 'Divide', tex: `x = \\frac{${d - b}}{${a - c}} = ${x}` }, { title: 'Check', tex: `${a}(${x}) ${b < 0 ? '-' : '+'} ${abs(b)} = ${a * x + b} = ${c}(${x}) ${d < 0 ? '-' : '+'} ${abs(d)}\\ \\checkmark` }],
      verify: { id: 'linear-equation-solver', values: { eq }, cards: [['Solution x']] },
    };
  },
};

export const factoringPractice = {
  title: 'Factor a cubic',
  generate(rand) {
    const rs = []; while (rs.length < 3) { const r = randInt(rand, -5, 5); if (!rs.includes(r)) rs.push(r); }
    rs.sort((p, q) => p - q);
    const p = mulRoots(rs);
    return {
      prompt: '<p>Factor completely. Enter the three roots from smallest to largest.</p>', promptTex: polyT(p),
      answers: rs.map((r, i) => ({ label: `Root ${i + 1}`, value: r, int: true })),
      hint: 'By the rational root theorem every whole-number root divides the constant term. Test the divisors, then divide out (x − r) and factor the quadratic that is left.',
      hintTex: 'P(r) = 0 \\iff (x - r) \\text{ is a factor}',
      steps: [{ title: 'Candidates', text: `Divisors of ${p[0]}${p[0] === 0 ? ' (0 is a root, so first factor out x)' : ''}.` }, { title: 'Test a root', tex: `P(${rs[0]}) = 0` }, { title: 'Factored form', tex: `${fac(rs[0])}${fac(rs[1])}${fac(rs[2])}` }],
      verify: { id: 'polynomial-factoring', values: { poly: polyS(p) }, cards: [['Rational roots', 0], ['Rational roots', 1], ['Rational roots', 2]] },
    };
  },
};

export const systemsPractice = {
  title: 'Solve a 2 × 2 system',
  generate(rand) {
    const x = randInt(rand, -6, 6), y = randInt(rand, -6, 6); let a1, b1, a2, b2;
    do { a1 = nz(rand, -5, 5); b1 = nz(rand, -5, 5); a2 = nz(rand, -5, 5); b2 = nz(rand, -5, 5); } while (a1 * b2 - a2 * b1 === 0);
    const c1 = a1 * x + b1 * y, c2 = a2 * x + b2 * y, D = a1 * b2 - a2 * b1;
    const E = (a, b, c) => `${linearTex([[F(a), 'x'], [F(b), 'y']])} = ${c}`;
    return {
      prompt: '<p>Solve the system.</p>', promptTex: `${E(a1, b1, c1)} \\qquad ${E(a2, b2, c2)}`,
      answers: [{ label: 'x', value: x, int: true }, { label: 'y', value: y, int: true }],
      hint: 'Multiply the equations so one variable has opposite coefficients, add them to eliminate it, then substitute back.',
      hintTex: 'x = \\frac{c_1b_2 - c_2b_1}{a_1b_2 - a_2b_1},\\quad y = \\frac{a_1c_2 - a_2c_1}{a_1b_2 - a_2b_1}',
      steps: [{ title: 'Determinant', tex: `D = (${a1})(${b2}) - (${a2})(${b1}) = ${D}` }, { title: 'Solve', texLines: [`x = \\frac{(${c1})(${b2}) - (${c2})(${b1})}{${D}} = ${x}`, `y = \\frac{(${a1})(${c2}) - (${a2})(${c1})}{${D}} = ${y}`] }, { title: 'Check', tex: `${a1}(${x}) + ${txp(b1)}(${y}) = ${c1}\\ \\checkmark` }],
      verify: { id: 'systems-of-linear-equations', values: { n: '2', e1x: String(a1), e1y: String(b1), e1r: String(c1), e2x: String(a2), e2y: String(b2), e2r: String(c2) }, cards: [['x'], ['y']] },
    };
  },
};

export const exponentPractice = {
  title: 'Rational exponents',
  generate(rand) {
    const q = pick(rand, [2, 2, 3, 3, 4]), base = pick(rand, q === 4 ? [2, 3] : q === 3 ? [2, 3, 4, 5] : [2, 3, 4, 5, 6, 7, 9]);
    const p = pick(rand, [-2, -1, 1, 2, 3].filter((v) => v % q !== 0));
    const b = base ** q, val = base ** p;
    return {
      prompt: `<p>Evaluate exactly, then give the decimal value.</p>`, promptTex: `${b}^{${p}/${q}}`,
      answers: [{ label: 'Value', value: val, decimals: 4 }],
      hint: 'The denominator of the exponent is a root and the numerator is a power: take the root first, while the number is small. A negative exponent means a reciprocal.',
      hintTex: 'a^{p/q} = \\left(\\sqrt[q]{a}\\right)^{p}, \\qquad a^{-n} = \\frac{1}{a^n}',
      steps: [{ title: 'Root first', tex: `\\sqrt[${q}]{${b}} = ${base}` }, { title: 'Then the power', tex: `${base}^{${p}} = ${p < 0 ? `\\frac{1}{${base ** -p}}` : base ** p}${p < 0 ? ` \\approx ${tx(val, 4)}` : ''}` }],
      verify: { id: 'exponent-and-radical-simplifier', values: { mode: 'power', base: String(b), exp: `${p}/${q}` }, cards: [['Decimal value']] },
    };
  },
};

export const logPractice = {
  title: 'Solve a logarithmic equation',
  generate(rand) {
    const b = pick(rand, [2, 3, 5, 10]), d = b === 10 ? pick(rand, [1, 2]) : pick(rand, [1, 2, 3]), a = nz(rand, -4, 5), x = randInt(rand, -6, 9);
    const c = b ** d - a * x;
    return {
      prompt: '<p>Solve for x, and check that the argument of the logarithm is positive.</p>', promptTex: `\\log_{${b}}\\left(${lin(a, c)}\\right) = ${d}`,
      answers: [{ label: 'x', value: x, int: true }],
      hint: 'Rewrite in exponential form: log_b(u) = d means u = b^d. Then solve the linear equation.',
      hintTex: '\\log_b u = d \\iff u = b^{d}',
      steps: [{ title: 'Exponential form', tex: `${lin(a, c)} = ${b}^{${d}} = ${b ** d}` }, { title: 'Solve', tex: `${a}x = ${b ** d} - ${txp(c)} = ${a * x} \\;\\Rightarrow\\; x = ${x}` }, { title: 'Check the domain', tex: `${a}(${x}) ${c < 0 ? '-' : '+'} ${abs(c)} = ${b ** d} \\gt 0\\ \\checkmark` }],
      verify: { id: 'logarithm-calculator', values: { mode: 'logeq', base: String(b), a: String(a), c: String(c), d: String(d) }, cards: [['Solution x']] },
    };
  },
};

export const rationalPractice = {
  title: 'Holes and asymptotes',
  generate(rand) {
    let r1, r2, r3; do { r1 = randInt(rand, -5, 5); r2 = randInt(rand, -5, 5); r3 = randInt(rand, -5, 5); } while (r1 === r2 || r1 === r3 || r2 === r3);
    const N = mulRoots([r1, r2]), D = mulRoots([r1, r3]);
    return {
      prompt: '<p>Simplify. Where is the hole in the graph, and where is the vertical asymptote?</p>', promptTex: `\\frac{${polyT(N)}}{${polyT(D)}}`,
      answers: [{ label: 'Hole at x =', value: r1, int: true }, { label: 'Vertical asymptote x =', value: r3, int: true }],
      hint: 'Factor the top and the bottom. A factor that cancels leaves a hole; a factor left in the denominator gives a vertical asymptote.',
      hintTex: '\\frac{(x - a)(x - b)}{(x - a)(x - c)} = \\frac{x - b}{x - c},\\quad x \\ne a',
      steps: [{ title: 'Factor', tex: `\\frac{${fac(r1)}${fac(r2)}}{${fac(r1)}${fac(r3)}}` }, { title: 'Cancel', tex: `\\frac{${fac(r2)}}{${fac(r3)}}, \\quad x \\ne ${r1}` }, { title: 'Read off', text: `Hole at x = ${r1} (the cancelled factor); vertical asymptote at x = ${r3}.` }],
      verify: { id: 'rational-expression-simplifier', values: { num: polyS(N), den: polyS(D) }, cards: [['Holes', 0], ['Vertical asymptotes', 0]] },
    };
  },
};

export const partialPractice = {
  title: 'Partial fractions with two linear factors',
  generate(rand) {
    let p, q; do { p = randInt(rand, -5, 5); q = randInt(rand, -5, 5); } while (p >= q);
    const A = nz(rand, -6, 6), B = nz(rand, -6, 6);
    // A/(x − p) + B/(x − q) = ((A + B)x − (Aq + Bp)) / ((x − p)(x − q))
    const n1 = A + B, n0 = -(A * q + B * p);
    const num = polyS([n0, n1]), den = `${fac(p)}${fac(q)}`;
    return {
      prompt: `<p>Write as A/(x ${p < 0 ? '+' : '−'} ${abs(p)}) + B/(x ${q < 0 ? '+' : '−'} ${abs(q)}) and find A and B.</p>`.replace('(x − 0)', '(x)').replace('x − 0', 'x').replace('x + 0', 'x'),
      promptTex: `\\frac{${linearTex([[F(n1), 'x'], [F(n0), '']])}}{${den}}`,
      answers: [{ label: 'A', value: A, int: true }, { label: 'B', value: B, int: true }],
      hint: 'Multiply through by the denominator, then substitute x = p and x = q (the cover-up method): each choice makes one term vanish.',
      hintTex: `${linearTex([[F(n1), 'x'], [F(n0), '']])} = A${fac(q)} + B${fac(p)}`,
      steps: [{ title: `x = ${p}`, tex: `${n1 * p + n0} = A(${p - q}) \\;\\Rightarrow\\; A = ${A}` }, { title: `x = ${q}`, tex: `${n1 * q + n0} = B(${q - p}) \\;\\Rightarrow\\; B = ${B}` }],
      verify: { id: 'partial-fractions', values: { num, den: den.replace(/\(x\)/g, 'x') }, cards: [['A'], ['B']] },
    };
  },
};
