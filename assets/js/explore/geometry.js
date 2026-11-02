/**
 * Analytic-geometry explorers: draggable points on a fixed coordinate grid, with distances,
 * slopes, equations and intersections recomputed as they move.
 */
import { plot } from '../lib/plot.js';
import { tx, txp } from '../lib/calc-kit.js';
import { randInt, pick } from '../lib/learn.js';

const GRID = { x: [-10, 10], y: [-8, 8], width: 400, height: 330, includeZero: true };
const coord = (name, label, value, axis) => ({ name, label, min: axis === 'x' ? -10 : -8, max: axis === 'x' ? 10 : 8, step: 0.5, value });
const t = (v) => tx(v, 3);
const pt = (x, y) => `(${t(x)},\\ ${t(y)})`;

const POINTS = [coord('x1', 'A: x₁', -6, 'x'), coord('y1', 'A: y₁', -3, 'y'), coord('x2', 'B: x₂', 4, 'x'), coord('y2', 'B: y₂', 5, 'y')];
const DRAG_AB = { A: { x: 'x1', y: 'y1' }, B: { x: 'x2', y: 'y2' } };

export const distanceExplore = {
  title: 'Drag two points',
  intro: 'The distance formula is Pythagoras: the dashed legs are Δx and Δy, and the segment AB is the hypotenuse.',
  controls: POINTS,
  drag: DRAG_AB,
  presets: [{ label: '3-4-5 triangle', values: { x1: 0, y1: 0, x2: 3, y2: 4 } }, { label: 'Horizontal segment', values: { x1: -5, y1: 2, x2: 5, y2: 2 } }],
  render({ x1, y1, x2, y2 }) {
    const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const svg = plot({
      ...GRID, title: 'Distance and midpoint of AB',
      segments: [{ x1, y1, x2, y2, cls: 'd-line' }, { x1, y1, x2, y2: y1, cls: 'd-perp' }, { x1: x2, y1, x2, y2, cls: 'd-perp' }],
      points: [{ x: x1, y: y1, label: 'A', drag: 'A' }, { x: x2, y: y2, label: 'B', drag: 'B' }, { x: mx, y: my, label: 'M', cls: 'd-point2' }],
    });
    return {
      svg,
      readouts: [
        { label: 'Legs', tex: `\\Delta x = ${t(dx)},\\ \\Delta y = ${t(dy)}` },
        { label: 'Distance', tex: `d = \\sqrt{(${t(dx)})^2 + (${t(dy)})^2} ${Number.isInteger(d) ? '=' : '\\approx'} ${t(d)}`, tone: 'good' },
        { label: 'Midpoint M', tex: `M = ${pt(mx, my)}` },
      ],
    };
  },
};

export const slopeExplore = {
  title: 'Drag a line through two points',
  intro: 'Slope is rise over run. Make the line steeper, flatter, falling or vertical and watch m and the equation change.',
  controls: POINTS,
  drag: DRAG_AB,
  presets: [{ label: 'Rising (m = 2)', values: { x1: 0, y1: -2, x2: 3, y2: 4 } }, { label: 'Falling', values: { x1: -4, y1: 5, x2: 4, y2: -3 } }, { label: 'Vertical', values: { x1: 3, y1: -4, x2: 3, y2: 4 } }],
  render({ x1, y1, x2, y2 }) {
    const dx = x2 - x1, dy = y2 - y1;
    const pts = [{ x: x1, y: y1, label: 'A', drag: 'A' }, { x: x2, y: y2, label: 'B', drag: 'B' }];
    if (dx === 0 && dy === 0) return { svg: plot({ ...GRID, points: pts }), readouts: [{ label: 'Slope', text: 'A and B are the same point, so they do not define a line.', tone: 'warn' }] };
    if (dx === 0) {
      return {
        svg: plot({ ...GRID, title: 'Vertical line', vlines: [{ x: x1, cls: 'd-line' }], points: pts }),
        readouts: [{ label: 'Slope', text: 'Undefined — the line is vertical, so the run Δx is 0', tone: 'warn' }, { label: 'Equation', tex: `x = ${t(x1)}` }],
      };
    }
    const m = dy / dx, b = y1 - m * x1;
    const angle = (Math.atan(m) * 180) / Math.PI;
    return {
      svg: plot({ ...GRID, title: `Line with slope ${t(m)}`, curves: [{ f: (x) => m * x + b }], segments: [{ x1, y1, x2, y2: y1 }, { x1: x2, y1, x2, y2 }], points: pts }),
      readouts: [
        { label: 'Slope', tex: `m = \\frac{\\Delta y}{\\Delta x} = \\frac{${t(dy)}}{${t(dx)}} ${Number.isInteger(m * 1000) ? '=' : '\\approx'} ${t(m)}`, tone: 'good' },
        { label: 'Slope-intercept form', tex: `y = ${t(m)}x ${b < 0 ? '-' : '+'} ${t(Math.abs(b))}` },
        { label: 'Angle of inclination', tex: `\\theta = \\tan^{-1} m \\approx ${tx(angle < 0 ? angle + 180 : angle, 2)}^\\circ` },
      ],
    };
  },
};

export const twoLinesExplore = {
  title: 'Move two lines',
  intro: 'Two lines meet in exactly one point unless their slopes are equal. Make the slopes equal to see parallel lines.',
  controls: [
    { name: 'm1', label: 'Line 1 slope m₁', min: -5, max: 5, step: 0.25, value: 1 },
    { name: 'b1', label: 'Line 1 intercept b₁', min: -8, max: 8, step: 0.5, value: 1 },
    { name: 'm2', label: 'Line 2 slope m₂', min: -5, max: 5, step: 0.25, value: -0.5 },
    { name: 'b2', label: 'Line 2 intercept b₂', min: -8, max: 8, step: 0.5, value: 4 },
  ],
  presets: [{ label: 'Parallel', values: { m1: 2, b1: -3, m2: 2, b2: 3 } }, { label: 'Perpendicular', values: { m1: 2, b1: 1, m2: -0.5, b2: -2 } }],
  render({ m1, b1, m2, b2 }) {
    const curves = [{ f: (x) => m1 * x + b1 }, { f: (x) => m2 * x + b2, cls: 'd-line2' }];
    if (m1 === m2) {
      const same = b1 === b2;
      return {
        svg: plot({ ...GRID, title: same ? 'The same line' : 'Parallel lines', curves }),
        readouts: [{ label: 'Intersection', text: same ? 'The lines are identical: every point is shared.' : 'None: equal slopes, different intercepts (parallel).', tone: 'warn' }],
      };
    }
    const x = (b2 - b1) / (m1 - m2), y = m1 * x + b1;
    const perp = Math.abs(m1 * m2 + 1) < 1e-9;
    return {
      svg: plot({ ...GRID, title: 'Two intersecting lines', curves, points: [{ x, y, label: 'P' }] }),
      readouts: [
        { label: 'Set equal', tex: `${t(m1)}x ${b1 < 0 ? '-' : '+'} ${t(Math.abs(b1))} = ${t(m2)}x ${b2 < 0 ? '-' : '+'} ${t(Math.abs(b2))}` },
        { label: 'Intersection P', tex: `x = \\frac{b_2 - b_1}{m_1 - m_2} \\approx ${t(x)},\\ y \\approx ${t(y)}`, tone: 'good' },
        { label: 'Angle between', text: perp ? '90° — perpendicular (m₁·m₂ = −1)' : `${tx((Math.abs(Math.atan(m1) - Math.atan(m2)) * 180) / Math.PI > 90 ? 180 - (Math.abs(Math.atan(m1) - Math.atan(m2)) * 180) / Math.PI : (Math.abs(Math.atan(m1) - Math.atan(m2)) * 180) / Math.PI, 2)}°` },
      ],
      note: Number.isFinite(x) && (Math.abs(x) > 10 || Math.abs(y) > 8) ? 'The intersection is outside the visible grid.' : '',
    };
  },
};

export const circleExplore = {
  title: 'Move and resize a circle',
  intro: 'Drag the centre C. The standard form shows the centre and radius directly; expanding it gives the general form.',
  controls: [coord('h', 'Centre h', 2, 'x'), coord('k', 'Centre k', -1, 'y'), { name: 'r', label: 'Radius r', min: 0.5, max: 8, step: 0.5, value: 4 }],
  drag: { C: { x: 'h', y: 'k' } },
  render({ h, k, r }) {
    const D = -2 * h, E = -2 * k, F = h * h + k * k - r * r;
    const term = (c, s) => (c === 0 ? '' : `${c < 0 ? ' - ' : ' + '}${Math.abs(c) === 1 && s ? '' : t(Math.abs(c))}${s}`);
    return {
      svg: plot({ ...GRID, equal: true, title: 'Circle', circles: [{ cx: h, cy: k, r }], segments: [{ x1: h, y1: k, x2: h + r, y2: k }], points: [{ x: h, y: k, label: 'C', drag: 'C' }] }),
      readouts: [
        { label: 'Standard form', tex: `(x ${h < 0 ? '+' : '-'} ${t(Math.abs(h))})^2 + (y ${k < 0 ? '+' : '-'} ${t(Math.abs(k))})^2 = ${t(r * r)}`, tone: 'good' },
        { label: 'General form', tex: `x^2 + y^2${term(D, 'x')}${term(E, 'y')}${term(F, '')} = 0` },
        { label: 'Circumference and area', tex: `2\\pi r \\approx ${tx(2 * Math.PI * r, 2)},\\ \\pi r^2 \\approx ${tx(Math.PI * r * r, 2)}` },
      ],
    };
  },
};

export const lineCircleExplore = {
  title: 'Slide a line across a circle',
  intro: 'Substituting the line into the circle gives a quadratic. Its discriminant decides: 2 points (secant), 1 point (tangent) or none.',
  controls: [{ name: 'm', label: 'Line slope m', min: -4, max: 4, step: 0.25, value: 0.5 }, { name: 'b', label: 'Line intercept b', min: -8, max: 8, step: 0.25, value: 1 }, { name: 'r', label: 'Circle radius r (centre at origin)', min: 1, max: 7, step: 0.5, value: 4 }],
  presets: [{ label: 'Tangent', values: { m: 0, b: 4, r: 4 } }, { label: 'Missing', values: { m: 0, b: 6, r: 4 } }],
  render({ m, b, r }) {
    // x² + (mx + b)² = r²  →  (1 + m²)x² + 2mb x + (b² − r²) = 0
    const A = 1 + m * m, B = 2 * m * b, C = b * b - r * r;
    const disc = B * B - 4 * A * C;
    const pts = [];
    if (disc > 1e-9) for (const s of [-1, 1]) { const x = (-B + s * Math.sqrt(disc)) / (2 * A); pts.push({ x, y: m * x + b }); }
    else if (Math.abs(disc) <= 1e-9) { const x = -B / (2 * A); pts.push({ x, y: m * x + b }); }
    const kind = pts.length === 2 ? 'secant: 2 intersection points' : pts.length === 1 ? 'tangent: 1 point of contact' : 'no intersection';
    return {
      svg: plot({ ...GRID, equal: true, title: 'Line and circle', circles: [{ cx: 0, cy: 0, r }], curves: [{ f: (x) => m * x + b, cls: 'd-line2' }], points: pts.map((p, i) => ({ ...p, label: `P${i + 1}`, cls: 'd-point3' })) }),
      readouts: [
        { label: 'Quadratic in x', tex: `${t(A)}x^2 ${B < 0 ? '-' : '+'} ${t(Math.abs(B))}x ${C < 0 ? '-' : '+'} ${t(Math.abs(C))} = 0` },
        { label: 'Discriminant', tex: `\\Delta = B^2 - 4AC \\approx ${t(disc)}`, tone: disc < -1e-9 ? 'warn' : 'good' },
        { label: 'Result', text: `${kind}${pts.length ? ` — ${pts.map((p) => `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`).join(', ')}` : ''}` },
      ],
    };
  },
};

export const distancePractice = {
  title: 'Distance and midpoint',
  generate(rand) {
    const [a, b] = pick(rand, [[3, 4], [5, 12], [6, 8], [8, 15], [2, 3], [1, 5], [4, 7]]);
    const x1 = randInt(rand, -6, 4), y1 = randInt(rand, -6, 4);
    const sx = rand() < 0.5 ? -1 : 1, sy = rand() < 0.5 ? -1 : 1;
    const x2 = x1 + sx * a, y2 = y1 + sy * b;
    const d = Math.hypot(a, b);
    return {
      prompt: `<p>Find the distance between <strong>A(${x1}, ${y1})</strong> and <strong>B(${x2}, ${y2})</strong>, and the x-coordinate of their midpoint.</p>`,
      answers: [{ label: 'Distance AB', value: d }, { label: 'Midpoint x', value: (x1 + x2) / 2 }],
      hint: 'Subtract the coordinates first, square both differences, add, then take the square root. The midpoint averages the coordinates.',
      hintTex: 'd = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}',
      steps: [
        { title: 'Differences', tex: `\\Delta x = ${x2} - ${txp(x1)} = ${x2 - x1},\\quad \\Delta y = ${y2} - ${txp(y1)} = ${y2 - y1}` },
        { title: 'Distance formula', texLines: [`d = \\sqrt{(${x2 - x1})^2 + (${y2 - y1})^2} = \\sqrt{${a * a + b * b}}`, `d ${Number.isInteger(d) ? '=' : '\\approx'} ${tx(d, 2)}`] },
        { title: 'Midpoint', tex: `x_M = \\frac{${x1} + ${txp(x2)}}{2} = ${tx((x1 + x2) / 2)}` },
      ],
    };
  },
};
