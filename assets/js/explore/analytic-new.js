/**
 * Drawing helpers, explorers and practice problems for the newer analytic geometry calculators:
 * division of a segment, the general conic, polar curves, tangents to conics and 3D lines/planes.
 */
import { plot } from '../lib/plot.js';
import { tx } from '../lib/calc-kit.js';
import { randInt, pick } from '../lib/learn.js';

const { PI, cos, sin, sqrt, hypot, atan2 } = Math;
const f2 = (x) => tx(x, 2);
const f3 = (x) => tx(x, 3);
const deg = (r) => (r * 180) / PI;
const rad = (d) => (d * PI) / 180;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Polyline through points as plot segments (skipping jumps and non-finite points). */
export function polyline(pts, cls = 'd-line', maxJump = Infinity) {
  const segs = [];
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    if (![a[0], a[1], b[0], b[1]].every(Number.isFinite)) continue;
    if (hypot(b[0] - a[0], b[1] - a[1]) > maxJump) continue;
    segs.push({ x1: a[0], y1: a[1], x2: b[0], y2: b[1], cls });
  }
  return segs;
}
/** Square window around points with padding. */
export function windowOf(pts, minHalf = 3, padFrac = 0.15) {
  const xs = pts.map((p) => p[0]).filter(Number.isFinite), ys = pts.map((p) => p[1]).filter(Number.isFinite);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const half = Math.max(minHalf, (Math.max(...xs) - Math.min(...xs)) / 2, (Math.max(...ys) - Math.min(...ys)) / 2) * (1 + padFrac);
  return { x: [cx - half, cx + half], y: [cy - half * 0.8, cy + half * 0.8] };
}
/** Endpoints of the line ax + by + c = 0 clipped roughly to a window. */
export function lineSegment(a, b, c, win, cls = 'd-line2') {
  const [x0, x1] = win.x, [y0, y1] = win.y;
  if (Math.abs(b) > 1e-12 && Math.abs(b) >= Math.abs(a) * 1e-3) {
    const y = (x) => (-c - a * x) / b;
    return { x1: x0, y1: y(x0), x2: x1, y2: y(x1), cls };
  }
  if (Math.abs(a) > 1e-12) { const x = -c / a; return { x1: x, y1: y0, x2: x, y2: y1, cls }; }
  return null;
}

// ---------------------------------------------------------------- conic geometry shared by two calculators
/**
 * Points along a conic described in its own rotated frame: type 'ellipse' (a, b), 'hyperbola' (a, b;
 * transverse axis along X), 'parabola' (p; Y² = 4pX). centre/vertex (cx, cy), rotation th (radians).
 * Returns arrays of [x, y] branches in the original frame.
 */
export function conicBranches({ type, a = 1, b = 1, p = 1, cx = 0, cy = 0, th = 0, span = 10 }) {
  const c = cos(th), s = sin(th);
  const map = ([X, Y]) => [cx + X * c - Y * s, cy + X * s + Y * c];
  if (type === 'ellipse') return [Array.from({ length: 241 }, (_, i) => map([a * cos((2 * PI * i) / 240), b * sin((2 * PI * i) / 240)]))];
  if (type === 'hyperbola') {
    const um = Math.acosh(Math.max(1.0001, span / a + 1));
    const br = (sg) => Array.from({ length: 121 }, (_, i) => { const u = -um + (2 * um * i) / 120; return map([sg * a * Math.cosh(u), b * Math.sinh(u)]); });
    return [br(1), br(-1)];
  }
  const ym = Math.max(2, sqrt(Math.abs(4 * p) * span) + 1);
  return [Array.from({ length: 161 }, (_, i) => { const Y = -ym + (2 * ym * i) / 160; return map([(Y * Y) / (4 * p), Y]); })];
}

// ---------------------------------------------------------------- division of a segment
export const divisionExplore = {
  title: 'Slide a point along a segment',
  intro: 'Drag A and B, then move the slider. Between 0 and 1 the point divides AB internally; beyond the ends it divides it externally.',
  controls: [
    { name: 'x1', label: 'A: x', min: -10, max: 10, step: 0.5, value: -6 }, { name: 'y1', label: 'A: y', min: -8, max: 8, step: 0.5, value: -3 },
    { name: 'x2', label: 'B: x', min: -10, max: 10, step: 0.5, value: 6 }, { name: 'y2', label: 'B: y', min: -8, max: 8, step: 0.5, value: 5 },
    { name: 't', label: 'Position t = AP ÷ AB', min: -1, max: 2, step: 0.05, value: 0.4 },
  ],
  drag: { A: { x: 'x1', y: 'y1' }, B: { x: 'x2', y: 'y2' } },
  animate: { control: 't', seconds: 6 },
  presets: [{ label: 'Midpoint (t = ½)', values: { t: 0.5 } }, { label: 'Trisection (t = ⅓)', values: { t: 1 / 3 } }, { label: 'External (t = 1.5)', values: { t: 1.5 } }],
  render({ x1, y1, x2, y2, t }) {
    const px = x1 + t * (x2 - x1), py = y1 + t * (y2 - y1);
    const lo = Math.min(0, t), hi = Math.max(1, t);
    const svg = plot({ x: [-10, 10], y: [-8, 8], width: 400, height: 330, title: 'Dividing AB', segments: [{ x1: x1 + lo * (x2 - x1), y1: y1 + lo * (y2 - y1), x2: x1 + hi * (x2 - x1), y2: y1 + hi * (y2 - y1), cls: 'd-perp' }, { x1, y1, x2, y2, cls: 'd-line' }], points: [{ x: x1, y: y1, label: 'A', drag: 'A' }, { x: x2, y: y2, label: 'B', drag: 'B' }, { x: px, y: py, label: 'P', cls: 'd-point2' }] });
    const internal = t > 0 && t < 1;
    const ratio = Math.abs(1 - t) < 1e-9 ? '∞' : `${f3(Math.abs(t / (1 - t)))} : 1`;
    return {
      svg,
      readouts: [
        { label: 'Point P', tex: `P = (${f3(px)},\\ ${f3(py)})`, tone: 'good' },
        { label: 'AP : PB', text: `${ratio} (${internal ? 'internal' : t === 0 ? 'P = A' : 'external'})` },
        { label: 'Section formula', tex: `P = A + t(B - A),\\ t = ${f3(t)}` },
      ],
    };
  },
};
export const divisionPractice = {
  title: 'Find the dividing point',
  generate(rand) {
    const r1 = randInt(rand, 1, 4), r2 = randInt(rand, 1, 4), k = r1 + r2;
    const x1 = randInt(rand, -8, 8), y1 = randInt(rand, -8, 8), dx = k * randInt(rand, -3, 3) || k, dy = k * randInt(rand, -3, 3) || -k;
    const x2 = x1 + dx, y2 = y1 + dy, px = (r2 * x1 + r1 * x2) / k, py = (r2 * y1 + r1 * y2) / k;
    return {
      prompt: `<p>Find the point P that divides the segment from <strong>A(${x1}, ${y1})</strong> to <strong>B(${x2}, ${y2})</strong> internally in the ratio <strong>${r1} : ${r2}</strong>.</p>`,
      answers: [{ label: 'x of P', value: px }, { label: 'y of P', value: py }],
      hint: 'Weight each endpoint by the part of the ratio next to the other point: r₂ goes with A and r₁ goes with B.',
      hintTex: 'P = \\left(\\frac{r_2 x_1 + r_1 x_2}{r_1 + r_2},\\ \\frac{r_2 y_1 + r_1 y_2}{r_1 + r_2}\\right)',
      steps: [
        { title: 'x-coordinate', tex: `x = \\frac{${r2}(${x1}) + ${r1}(${x2})}{${k}} = \\frac{${r2 * x1 + r1 * x2}}{${k}} = ${f3(px)}` },
        { title: 'y-coordinate', tex: `y = \\frac{${r2}(${y1}) + ${r1}(${y2})}{${k}} = \\frac{${r2 * y1 + r1 * y2}}{${k}} = ${f3(py)}` },
      ],
    };
  },
};

// ---------------------------------------------------------------- general conic
export const conicExplore = {
  title: 'Change the coefficients, change the conic',
  intro: 'Only A, B and C decide the type: the discriminant B² − 4AC is negative for an ellipse, zero for a parabola and positive for a hyperbola. B tilts the axes.',
  controls: [
    { name: 'A', label: 'A (x²)', min: -3, max: 3, step: 0.1, value: 1 },
    { name: 'B', label: 'B (xy)', min: -4, max: 4, step: 0.1, value: 1 },
    { name: 'C', label: 'C (y²)', min: -3, max: 3, step: 0.1, value: 2 },
    { name: 'E', label: 'E (y)', min: -4, max: 4, step: 0.1, value: 0 },
    { name: 'F', label: 'F (constant)', min: -9, max: 9, step: 0.5, value: -6 },
  ],
  presets: [{ label: 'Circle', values: { A: 1, B: 0, C: 1, E: 0, F: -9 } }, { label: 'Parabola (B² = 4AC)', values: { A: 1, B: 2, C: 1, E: 2, F: 0 } }, { label: 'Hyperbola xy = 4', values: { A: 0, B: 1, C: 0, E: 0, F: -4 } }],
  render({ A, B, C, E, F }) {
    const disc = B * B - 4 * A * C;
    const th = Math.abs(B) < 1e-12 ? 0 : 0.5 * atan2(B, A - C);
    const type = Math.abs(disc) < 1e-9 ? 'parabola' : disc < 0 ? 'ellipse' : 'hyperbola';
    // implicit curve drawn by marching squares on a grid
    const win = { x: [-8, 8], y: [-6.5, 6.5] };
    const Q = (x, y) => A * x * x + B * x * y + C * y * y + E * y + F;
    const segs = implicitSegments(Q, win, 90, 72);
    const c2 = cos(th), s2 = sin(th);
    const axes = [{ x1: -8 * c2, y1: -8 * s2, x2: 8 * c2, y2: 8 * s2, cls: 'd-hidden' }, { x1: 8 * s2, y1: -8 * c2, x2: -8 * s2, y2: 8 * c2, cls: 'd-hidden' }];
    return {
      svg: plot({ ...win, width: 400, height: 325, title: 'General second-degree curve', segments: [...axes, ...segs] }),
      readouts: [
        { label: 'Discriminant', tex: `B^2 - 4AC = ${f2(disc)}`, tone: 'good' },
        { label: 'Type (if not degenerate)', text: type === 'ellipse' && Math.abs(B) < 1e-12 && Math.abs(A - C) < 1e-12 ? 'circle' : type },
        { label: 'Rotation of axes', tex: `\\theta = \\tfrac{1}{2}\\arctan\\frac{B}{A - C} \\approx ${f2(deg(th < 0 ? th + PI / 2 : th))}^\\circ` },
      ],
      note: segs.length ? 'Dashed: the rotated axes that remove the xy term.' : 'No real points: this equation has no graph (an imaginary conic).',
    };
  },
};
/** Marching-squares contour of Q(x, y) = 0 as plot segments. */
export function implicitSegments(Q, win, nx = 120, ny = 96, cls = 'd-line') {
  const [x0, x1] = win.x, [y0, y1] = win.y, hx = (x1 - x0) / nx, hy = (y1 - y0) / ny;
  const val = [];
  for (let j = 0; j <= ny; j++) { val.push([]); for (let i = 0; i <= nx; i++) val[j].push(Q(x0 + i * hx, y0 + j * hy)); }
  const segs = [];
  const lerp = (a, b, va, vb) => a + ((b - a) * va) / (va - vb);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const xa = x0 + i * hx, ya = y0 + j * hy, xb = xa + hx, yb = ya + hy;
    const v00 = val[j][i], v10 = val[j][i + 1], v01 = val[j + 1][i], v11 = val[j + 1][i + 1];
    const pts = [];
    if (v00 * v10 < 0) pts.push([lerp(xa, xb, v00, v10), ya]);
    if (v10 * v11 < 0) pts.push([xb, lerp(ya, yb, v10, v11)]);
    if (v01 * v11 < 0) pts.push([lerp(xa, xb, v01, v11), yb]);
    if (v00 * v01 < 0) pts.push([xa, lerp(ya, yb, v00, v01)]);
    if (pts.length === 2) segs.push({ x1: pts[0][0], y1: pts[0][1], x2: pts[1][0], y2: pts[1][1], cls });
    else if (pts.length === 4) segs.push({ x1: pts[0][0], y1: pts[0][1], x2: pts[1][0], y2: pts[1][1], cls }, { x1: pts[2][0], y1: pts[2][1], x2: pts[3][0], y2: pts[3][1], cls });
  }
  return segs;
}
export const conicPractice = {
  title: 'Identify the conic and its rotation',
  generate(rand) {
    const A = randInt(rand, -4, 6) || 2, C = randInt(rand, -4, 6) || 3, B = pick(rand, [-6, -4, -3, -2, 2, 3, 4, 6]);
    const disc = B * B - 4 * A * C;
    let th = 0.5 * atan2(B, A - C); if (th < 0) th += PI / 2;
    const type = disc < 0 ? 'an ellipse' : disc === 0 ? 'a parabola' : 'a hyperbola';
    return {
      prompt: `<p>For the curve <strong>${A}x² ${B < 0 ? '−' : '+'} ${Math.abs(B)}xy ${C < 0 ? '−' : '+'} ${Math.abs(C)}y² − 12 = 0</strong>, find the discriminant B² − 4AC and the angle θ (between 0° and 90°) through which the axes must be rotated to remove the xy term.</p>`,
      answers: [{ label: 'B² − 4AC', value: disc, decimals: 0 }, { label: 'θ in degrees', value: deg(th), decimals: 2 }],
      hint: 'cot 2θ = (A − C)/B. Find 2θ first, then halve it.',
      hintTex: 'B^2 - 4AC \\qquad \\tan 2\\theta = \\frac{B}{A - C}',
      steps: [
        { title: 'Discriminant', tex: `B^2 - 4AC = (${B})^2 - 4(${A})(${C}) = ${disc}`, text: `So the curve is ${type} (unless it is degenerate).` },
        { title: 'Rotation angle', tex: `\\tan 2\\theta = \\frac{${B}}{${A} - ${C < 0 ? `(${C})` : C}} \\Rightarrow 2\\theta \\approx ${f2(2 * deg(th))}^\\circ,\\ \\theta \\approx ${f2(deg(th))}^\\circ` },
      ],
    };
  },
};

// ---------------------------------------------------------------- polar curves
export const POLAR = {
  roseCos: { name: 'Rose r = a cos nθ', r: (t, a, b, n) => a * cos(n * t), turns: (n) => (n % 2 ? 1 : 2) },
  roseSin: { name: 'Rose r = a sin nθ', r: (t, a, b, n) => a * sin(n * t), turns: (n) => (n % 2 ? 1 : 2) },
  cardioid: { name: 'Cardioid r = a(1 + cos θ)', r: (t, a) => a * (1 + cos(t)), turns: () => 2 },
  limacon: { name: 'Limaçon r = a + b cos θ', r: (t, a, b) => a + b * cos(t), turns: () => 2 },
  lemniscate: { name: 'Lemniscate r² = a² cos 2θ', r: (t, a) => { const v = a * a * cos(2 * t); return v >= 0 ? sqrt(v) : NaN; }, turns: () => 2, twoSided: true },
  circle: { name: 'Circle r = 2a cos θ', r: (t, a) => 2 * a * cos(t), turns: () => 1 },
  spiral: { name: 'Spiral r = aθ', r: (t, a) => a * t, turns: () => 2 },
};
/** Points of a polar curve over [t0, t1] (radians). Lemniscates include the negative root. */
export function polarPoints(key, a, b, n, t0 = 0, t1 = null, N = 720) {
  const P = POLAR[key];
  const end = t1 ?? P.turns(n) * PI;
  const pts = [];
  for (let i = 0; i <= N; i++) { const t = t0 + ((end - t0) * i) / N, r = P.r(t, a, b, n); pts.push(Number.isFinite(r) ? [r * cos(t), r * sin(t)] : [NaN, NaN]); }
  if (P.twoSided) for (let i = 0; i <= N; i++) { const t = t0 + ((end - t0) * i) / N, r = P.r(t, a, b, n); pts.push(Number.isFinite(r) ? [-r * cos(t), -r * sin(t)] : [NaN, NaN]); }
  return pts;
}
/** Polar grid (circles and rays) plus curve segments. */
export function polarPlot(segs, R, extra = {}, title = 'Polar graph') {
  const step = R > 8 ? Math.ceil(R / 4) : R > 4 ? 2 : R > 2 ? 1 : 0.5;
  const circles = []; for (let r = step; r <= R * 1.05; r += step) circles.push({ cx: 0, cy: 0, r, cls: 'd-grid' });
  const rays = Array.from({ length: 12 }, (_, k) => ({ x1: 0, y1: 0, x2: R * 1.1 * cos((k * PI) / 6), y2: R * 1.1 * sin((k * PI) / 6), cls: 'd-grid' }));
  return plot({ x: [-R * 1.2, R * 1.2], y: [-R * 1.2, R * 1.2], equal: true, width: 380, height: 380, title, circles, segments: [...rays, ...segs, ...(extra.segments || [])], points: extra.points || [] });
}
export const polarExplore = {
  title: 'Trace a polar curve',
  intro: 'Press Play. The point sweeps around as θ grows, at distance r(θ) from the pole. Try odd and even n for roses: odd n gives n petals, even n gives 2n.',
  controls: [
    { name: 'curve', label: 'Curve', type: 'select', options: Object.entries(POLAR).map(([k, p]) => [k, p.name]), value: 'roseCos' },
    { name: 'a', label: 'a', min: 0.5, max: 5, step: 0.1, value: 4 },
    { name: 'b', label: 'b (limaçon)', min: 0, max: 5, step: 0.1, value: 2 },
    { name: 'n', label: 'n (rose)', min: 1, max: 8, step: 1, value: 3 },
    { name: 'th', label: 'θ swept', min: 0, max: 720, step: 2, value: 360, unit: '°' },
  ],
  animate: { control: 'th', seconds: 8 },
  render({ curve, a, b, n, th }) {
    const key = POLAR[curve] ? curve : 'roseCos';
    const end = rad(th);
    const pts = polarPoints(key, a, b, n, 0, end, Math.max(8, Math.round(th * 2)));
    const r = POLAR[key].r(end, a, b, n);
    const R = key === 'spiral' ? a * 4 * PI : key === 'limacon' ? a + b : key === 'circle' ? 2 * a : key === 'cardioid' ? 2 * a : a;
    const pt = Number.isFinite(r) ? [r * cos(end), r * sin(end)] : null;
    return {
      svg: polarPlot(polyline(pts, 'd-line', R), Math.max(R, 1), { segments: pt ? [{ x1: 0, y1: 0, x2: pt[0], y2: pt[1], cls: 'd-perp' }] : [], points: pt ? [{ x: pt[0], y: pt[1], label: 'P', cls: 'd-point2' }] : [] }, POLAR[key].name),
      readouts: [
        { label: 'Current angle', tex: `\\theta = ${th}^\\circ` },
        { label: 'Distance from the pole', tex: Number.isFinite(r) ? `r \\approx ${f3(r)}` : '\\text{no point (}r^2 \\lt 0\\text{)}' },
        { label: 'Rectangular point', tex: pt ? `(${f2(pt[0])},\\ ${f2(pt[1])})` : '\\text{—}' },
      ],
      note: r < 0 ? 'r is negative here, so the point is plotted on the opposite side of the pole.' : '',
    };
  },
};
export const polarPractice = {
  title: 'Rectangular to polar',
  generate(rand) {
    const [p, q, h] = pick(rand, [[3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10], [1, 1, sqrt(2)], [1, sqrt(3), 2]]);
    const sx = pick(rand, [1, -1]), sy = pick(rand, [1, -1]), x = sx * p, y = sy * q;
    let th = deg(atan2(y, x)); if (th < 0) th += 360;
    const show = (v) => (Number.isInteger(v) ? String(v) : v === sqrt(3) ? '√3' : (-v === sqrt(3) ? '−√3' : String(+v.toFixed(4))));
    return {
      prompt: `<p>Convert the point <strong>(${show(x)}, ${show(y)})</strong> to polar coordinates (r, θ) with r &gt; 0 and 0° ≤ θ &lt; 360°.</p>`,
      answers: [{ label: 'r', value: h }, { label: 'θ in degrees', value: th }],
      hint: 'r is the distance from the origin. For θ, find the reference angle from tan θ = y/x, then use the quadrant of the point.',
      hintTex: 'r = \\sqrt{x^2 + y^2} \\qquad \\tan\\theta = \\frac{y}{x}',
      steps: [
        { title: 'Distance from the origin', tex: `r = \\sqrt{(${show(x)})^2 + (${show(y)})^2} = ${f3(h)}` },
        { title: 'Angle in the correct quadrant', tex: `\\theta \\approx ${f2(th)}^\\circ`, text: `The point is in quadrant ${x > 0 ? (y > 0 ? 'I' : 'IV') : y > 0 ? 'II' : 'III'}, so the angle is measured from the positive x-axis into that quadrant.` },
      ],
    };
  },
};

// ---------------------------------------------------------------- tangent to a conic
export const tangentExplore = {
  title: 'Slide a point around a conic',
  intro: 'Move the point along the curve. The tangent just touches the curve; the normal is perpendicular to it and, for a circle, always passes through the centre.',
  controls: [
    { name: 'type', label: 'Conic', type: 'select', options: [['circle', 'Circle x² + y² = 16'], ['ellipse', 'Ellipse x²/36 + y²/16 = 1'], ['parabola', 'Parabola y² = 8x'], ['hyperbola', 'Hyperbola x²/9 − y²/4 = 1']], value: 'ellipse' },
    { name: 't', label: 'Position on the curve', min: -180, max: 180, step: 1, value: 40, unit: '°' },
  ],
  animate: { control: 't', seconds: 10 },
  render({ type, t }) {
    const u = rad(t);
    let x1, y1, gx, gy, branches;
    if (type === 'circle') { x1 = 4 * cos(u); y1 = 4 * sin(u); gx = 2 * x1; gy = 2 * y1; branches = conicBranches({ type: 'ellipse', a: 4, b: 4 }); }
    else if (type === 'parabola') { const Y = (t / 180) * 8; x1 = (Y * Y) / 8; y1 = Y; gx = -8; gy = 2 * y1; branches = conicBranches({ type: 'parabola', p: 2, span: 10 }); }
    else if (type === 'hyperbola') { const w = (t / 180) * 2; x1 = 3 * Math.cosh(w) * (Math.abs(t) > 90 ? -1 : 1); y1 = 2 * Math.sinh(w); gx = (2 * x1) / 9; gy = (-2 * y1) / 4; branches = conicBranches({ type: 'hyperbola', a: 3, b: 2, span: 6 }); }
    else { x1 = 6 * cos(u); y1 = 4 * sin(u); gx = (2 * x1) / 36; gy = (2 * y1) / 16; branches = conicBranches({ type: 'ellipse', a: 6, b: 4 }); }
    const win = { x: [-9, 9], y: [-7, 7] };
    const tan = lineSegment(gx, gy, -(gx * x1 + gy * y1), win, 'd-line2'), nor = lineSegment(gy, -gx, -(gy * x1 - gx * y1), win, 'd-line3');
    const m = Math.abs(gy) < 1e-12 ? null : -gx / gy;
    return {
      svg: plot({ ...win, width: 400, height: 320, title: 'Tangent and normal', segments: [...branches.flatMap((b) => polyline(b)), ...(tan ? [tan] : []), ...(nor ? [nor] : [])], points: [{ x: x1, y: y1, label: 'P', cls: 'd-point2' }] }),
      readouts: [
        { label: 'Point of tangency', tex: `(${f2(x1)},\\ ${f2(y1)})` },
        { label: 'Slope of the tangent', tex: m === null ? '\\text{vertical}' : `m_T \\approx ${f3(m)}`, tone: 'good' },
        { label: 'Slope of the normal', tex: m === null ? '0' : Math.abs(m) < 1e-12 ? '\\text{vertical}' : `m_N = -\\frac{1}{m_T} \\approx ${f3(-1 / m)}` },
      ],
    };
  },
};
export const tangentPractice = {
  title: 'Tangent to a circle',
  generate(rand) {
    const [p, q, r] = pick(rand, [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 6, 10], [12, 5, 13]]);
    const x1 = pick(rand, [1, -1]) * p, y1 = pick(rand, [1, -1]) * q;
    const m = -x1 / y1, c = (r * r) / y1;
    return {
      prompt: `<p>Find the slope and the y-intercept of the tangent to the circle <strong>x² + y² = ${r * r}</strong> at the point <strong>(${x1}, ${y1})</strong>.</p>`,
      answers: [{ label: 'Slope', value: m, decimals: 3 }, { label: 'y-intercept', value: c, decimals: 3 }],
      hint: 'For a circle centred at the origin, the tangent at (x₁, y₁) is x₁x + y₁y = r². It is perpendicular to the radius.',
      hintTex: 'x_1 x + y_1 y = r^2',
      steps: [
        { title: 'Tangent equation', tex: `${x1}x ${y1 < 0 ? '-' : '+'} ${Math.abs(y1)}y = ${r * r}` },
        { title: 'Solve for y', tex: `y = ${f3(m)}x ${c < 0 ? '-' : '+'} ${f3(Math.abs(c))}`, text: `Check: the radius has slope ${f3(y1 / x1)}, and ${f3(m)} × ${f3(y1 / x1)} = −1.` },
      ],
    };
  },
};

// ---------------------------------------------------------------- 3D scene
/** Simple 3D projector: axes, optional plane patches (quads), segments and labelled points. */
export function scene3d({ points = [], segments = [], planes = [], yaw = 35, pitch = 22, size = 6, title = '3D view' }) {
  const W = 380, H = 320, s = 120 / size;
  const cy = cos(rad(yaw)), sy = sin(rad(yaw)), cp = cos(rad(pitch)), sp = sin(rad(pitch));
  // math axes (x right-ish, y into the page, z up) -> screen
  const rot = ([x, y, z]) => { const X = x * cy - y * sy, Y = x * sy + y * cy; return [X, z * cp - Y * sp, z * sp + Y * cp]; };
  const P = (p) => { const [X, Y, Z] = rot(p); return [W / 2 + s * X, H / 2 - s * Y, Z]; };
  const r1 = (v) => Math.round(v * 10) / 10;
  const out = [];
  const polys = planes.map((pl) => { const q = pl.pts.map(P); return { z: q.reduce((a, b) => a + b[2], 0) / q.length, svg: `<polygon points="${q.map((v) => `${r1(v[0])},${r1(v[1])}`).join(' ')}" style="fill:color-mix(in srgb, var(--${pl.color || 'primary'}) 22%, transparent);stroke:var(--${pl.color || 'primary'});stroke-width:1.2"/>` }; });
  polys.sort((a, b) => a.z - b.z);
  const axis = (v, label) => { const [a, b] = [P([0, 0, 0]), P(v)]; out.push(`<line class="d-axis" x1="${r1(a[0])}" y1="${r1(a[1])}" x2="${r1(b[0])}" y2="${r1(b[1])}"/><text class="d-text-muted" x="${r1(b[0] + 4)}" y="${r1(b[1] - 4)}">${label}</text>`); };
  axis([size, 0, 0], 'x'); axis([0, size, 0], 'y'); axis([0, 0, size], 'z');
  out.push(...polys.map((p) => p.svg));
  for (const sg of segments) { const [a, b] = [P(sg.a), P(sg.b)]; out.push(`<line class="${sg.cls || 'd-line'}" x1="${r1(a[0])}" y1="${r1(a[1])}" x2="${r1(b[0])}" y2="${r1(b[1])}"${sg.dash ? ' stroke-dasharray="5 4"' : ''}/>`); }
  for (const pt of points) { const [x, y] = P(pt.p); out.push(`<circle class="${pt.cls || 'd-point'}" cx="${r1(x)}" cy="${r1(y)}" r="4"/>${pt.label ? `<text class="d-label" x="${r1(x + 6)}" y="${r1(y - 6)}">${esc(pt.label)}</text>` : ''}`); }
  const svg = `<svg class="diagram" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${out.join('')}</svg>`;
  return /NaN|Infinity/.test(svg) ? '' : svg;
}
export const space3dExplore = {
  title: 'Direction cosines of a vector',
  intro: 'Change the components of the direction vector. Its angles with the three axes change, but the squares of their cosines always add up to 1.',
  controls: [
    { name: 'a', label: 'a (x-component)', min: -5, max: 5, step: 0.5, value: 2 },
    { name: 'b', label: 'b (y-component)', min: -5, max: 5, step: 0.5, value: 3 },
    { name: 'c', label: 'c (z-component)', min: -5, max: 5, step: 0.5, value: 4 },
    { name: 'yaw', label: 'Turn', min: 0, max: 360, step: 1, value: 35, unit: '°' },
    { name: 'pitch', label: 'Tilt', min: -10, max: 60, step: 1, value: 22, unit: '°' },
  ],
  rotate: { yaw: 'yaw', pitch: 'pitch' },
  render({ a, b, c, yaw, pitch }) {
    const L = hypot(a, b, c);
    if (L < 1e-12) return { svg: scene3d({ yaw, pitch }), readouts: [{ label: 'Direction', text: 'The zero vector has no direction. Move a slider.', tone: 'warn' }] };
    const [l, m, n] = [a / L, b / L, c / L];
    return {
      svg: scene3d({ yaw, pitch, segments: [{ a: [0, 0, 0], b: [a, b, c], cls: 'd-line' }, { a: [a, b, 0], b: [a, b, c], cls: 'd-hidden', dash: true }, { a: [0, 0, 0], b: [a, b, 0], cls: 'd-hidden', dash: true }], points: [{ p: [a, b, c], label: `(${a}, ${b}, ${c})`, cls: 'd-point2' }], title: 'Direction vector' }),
      readouts: [
        { label: 'Length', tex: `|\\vec{d}| = \\sqrt{a^2 + b^2 + c^2} \\approx ${f3(L)}` },
        { label: 'Direction cosines', tex: `(${f3(l)},\\ ${f3(m)},\\ ${f3(n)})` },
        { label: 'Direction angles', tex: `\\alpha \\approx ${f2(deg(Math.acos(l)))}^\\circ,\\ \\beta \\approx ${f2(deg(Math.acos(m)))}^\\circ,\\ \\gamma \\approx ${f2(deg(Math.acos(n)))}^\\circ` },
        { label: 'Check', tex: `\\cos^2\\alpha + \\cos^2\\beta + \\cos^2\\gamma = ${f3(l * l + m * m + n * n)}`, tone: 'good' },
      ],
    };
  },
};
export const space3dPractice = {
  title: 'Distance and direction in space',
  generate(rand) {
    const [p, q, r, d] = pick(rand, [[2, 3, 6, 7], [1, 2, 2, 3], [2, 6, 9, 11], [4, 4, 7, 9], [6, 2, 3, 7], [8, 4, 1, 9]]);
    const x1 = randInt(rand, -5, 5), y1 = randInt(rand, -5, 5), z1 = randInt(rand, -5, 5);
    const x2 = x1 + p, y2 = y1 + pick(rand, [1, -1]) * q, z2 = z1 + pick(rand, [1, -1]) * r;
    return {
      prompt: `<p>Find the distance between <strong>A(${x1}, ${y1}, ${z1})</strong> and <strong>B(${x2}, ${y2}, ${z2})</strong>, and the direction cosine cos α of AB with the x-axis.</p>`,
      answers: [{ label: 'Distance AB', value: d }, { label: 'cos α', value: p / d, decimals: 4 }],
      hint: 'Use the 3D distance formula. The direction cosines are the components of AB divided by its length.',
      hintTex: 'd = \\sqrt{\\Delta x^2 + \\Delta y^2 + \\Delta z^2} \\qquad \\cos\\alpha = \\frac{\\Delta x}{d}',
      steps: [
        { title: 'Components of AB', tex: `(\\Delta x, \\Delta y, \\Delta z) = (${x2 - x1},\\ ${y2 - y1},\\ ${z2 - z1})` },
        { title: 'Distance', tex: `d = \\sqrt{${(x2 - x1) ** 2} + ${(y2 - y1) ** 2} + ${(z2 - z1) ** 2}} = \\sqrt{${d * d}} = ${d}` },
        { title: 'Direction cosine', tex: `\\cos\\alpha = \\frac{${x2 - x1}}{${d}} \\approx ${tx(p / d, 4)}` },
      ],
    };
  },
};
