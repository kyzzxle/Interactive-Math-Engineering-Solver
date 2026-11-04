/**
 * "Try it" practice problems for the analytic geometry calculators, plus explorers for the
 * parabola, the distance from a point to a plane and the distance from a point to a line.
 *
 * Each problem also carries `verify`: the calculator inputs that reproduce it and, for every
 * answer, the result card (and which number on it) that should match. The tests use this to
 * solve every generated problem with the real calculator.
 */
import { plot } from '../lib/plot.js';
import { tx, txp } from '../lib/calc-kit.js';
import { Frac } from '../lib/fraction.js';
import { linearTex } from '../lib/lines.js';
import { randInt, pick } from '../lib/learn.js';
import { scene3d } from './analytic-new.js';

const { abs, sqrt, hypot, atan, PI } = Math;
const F = (x) => Frac.of(x);
const f2 = (x) => tx(x, 2);
const f3 = (x) => tx(x, 3);
const deg = (r) => (r * 180) / PI;
const nz = (rand, lo, hi) => { let v = 0; while (v === 0) v = randInt(rand, lo, hi); return v; };
const sgn = (rand) => (rand() < 0.5 ? -1 : 1);
const gcd = (a, b) => { a = abs(a); b = abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
const lineTex = (A, B, C) => `${linearTex([[F(A), 'x'], [F(B), 'y'], [F(C), '']])} = 0`;
const GRID = { x: [-10, 10], y: [-8, 8], width: 400, height: 330, includeZero: true };

// ---------------------------------------------------------------- slope and equation of a line
export const slopePractice = {
  title: 'Slope and y-intercept',
  generate(rand) {
    const x1 = randInt(rand, -6, 5), y1 = randInt(rand, -6, 6);
    const dx = nz(rand, -6, 6), dy = randInt(rand, -7, 7);
    const x2 = x1 + dx, y2 = y1 + dy;
    const m = F(dy).div(dx), b = F(y1).sub(m.mul(x1));
    return {
      prompt: `<p>Find the slope of the line through <strong>A(${x1}, ${y1})</strong> and <strong>B(${x2}, ${y2})</strong>, and the y-intercept b of its equation y = mx + b.</p>`,
      answers: [{ label: 'Slope m', value: m.toNumber() }, { label: 'y-intercept b', value: b.toNumber() }],
      hint: 'Slope is rise over run. Then substitute either point into y = mx + b and solve for b.',
      hintTex: 'm = \\frac{y_2 - y_1}{x_2 - x_1} \\qquad b = y_1 - m x_1',
      steps: [
        { title: 'Slope', tex: `m = \\frac{${y2} - ${txp(y1)}}{${x2} - ${txp(x1)}} = \\frac{${dy}}{${dx}} = ${m.toTex()}` },
        { title: 'y-intercept', tex: `b = ${y1} - \\left(${m.toTex()}\\right)(${x1}) = ${b.toTex()}` },
        { title: 'Equation', tex: `y = ${linearTex([[m, 'x'], [b, '']])}` },
      ],
      verify: { id: 'slope-and-equation-of-a-line', values: { mode: 'two', x1: String(x1), y1: String(y1), x2: String(x2), y2: String(y2) }, cards: [['Slope m'], ['y-intercept b']] },
    };
  },
};

// ---------------------------------------------------------------- intersection of two lines
export const intersectionPractice = {
  title: 'Where two lines cross',
  generate(rand) {
    const x = randInt(rand, -5, 5), y = randInt(rand, -5, 5);
    let A1, B1, A2, B2;
    do { A1 = nz(rand, -5, 5); B1 = nz(rand, -5, 5); A2 = nz(rand, -5, 5); B2 = randInt(rand, -5, 5); } while (A1 * B2 - A2 * B1 === 0);
    const C1 = -(A1 * x + B1 * y), C2 = -(A2 * x + B2 * y);
    const D = A1 * B2 - A2 * B1, Dx = B1 * C2 - B2 * C1, Dy = A2 * C1 - A1 * C2;
    return {
      prompt: '<p>Find the point where these two lines intersect.</p>',
      promptTex: `${lineTex(A1, B1, C1)} \\qquad ${lineTex(A2, B2, C2)}`,
      answers: [{ label: 'x', value: x, int: true }, { label: 'y', value: y, int: true }],
      hint: 'Use elimination, substitution or Cramer’s rule. Check your answer in both equations.',
      hintTex: 'D = A_1B_2 - A_2B_1,\\quad x = \\frac{B_1C_2 - B_2C_1}{D},\\quad y = \\frac{A_2C_1 - A_1C_2}{D}',
      steps: [
        { title: 'Determinant', tex: `D = (${A1})(${B2}) - (${A2})(${B1}) = ${D}` },
        { title: "Cramer's rule", texLines: [`x = \\frac{(${B1})(${C2}) - (${B2})(${C1})}{${D}} = \\frac{${Dx}}{${D}} = ${x}`, `y = \\frac{(${A2})(${C1}) - (${A1})(${C2})}{${D}} = \\frac{${Dy}}{${D}} = ${y}`] },
        { title: 'Check', texLines: [`${A1}(${x}) + ${txp(B1)}(${y}) + ${txp(C1)} = 0`, `${A2}(${x}) + ${txp(B2)}(${y}) + ${txp(C2)} = 0`] },
      ],
      verify: { id: 'intersection-of-two-lines', values: { A1: String(A1), B1: String(B1), C1: String(C1), A2: String(A2), B2: String(B2), C2: String(C2) }, cards: [['Intersection point', 0], ['Intersection point', 1]] },
    };
  },
};

// ---------------------------------------------------------------- line and circle
const LATTICE = {};
for (const r of [5, 10, 13]) {
  LATTICE[r] = [];
  for (let x = -r; x <= r; x++) { const y = sqrt(r * r - x * x); if (Number.isInteger(y)) { LATTICE[r].push([x, y]); if (y) LATTICE[r].push([x, -y]); } }
}
export const lineCirclePractice = {
  title: 'Where a line cuts a circle',
  generate(rand) {
    const r = pick(rand, [5, 5, 10, 13]), pts = LATTICE[r];
    let P = pick(rand, pts), Q = pick(rand, pts);
    while (Q[0] === P[0] && Q[1] === P[1]) Q = pick(rand, pts);
    const h = randInt(rand, -3, 3), k = randInt(rand, -3, 3);
    P = [P[0] + h, P[1] + k]; Q = [Q[0] + h, Q[1] + k];
    let A = Q[1] - P[1], B = P[0] - Q[0];
    const g = gcd(A, B); A /= g; B /= g;
    if (A < 0 || (A === 0 && B < 0)) { A = -A; B = -B; }
    const C = -(A * P[0] + B * P[1]);
    const [p1, p2] = [P, Q].sort((u, w) => u[0] - w[0] || u[1] - w[1]);
    const N = A * h + B * k + C, n = hypot(A, B), d = abs(N) / n, t = sqrt(r * r - d * d);
    const circ = `(x ${h < 0 ? '+' : '-'} ${abs(h)})^2 + (y ${k < 0 ? '+' : '-'} ${abs(k)})^2 = ${r * r}`.replace(/\(x - 0\)/, 'x').replace(/\(y - 0\)/, 'y');
    return {
      prompt: '<p>Find the two points where the line meets the circle. Give the point with the smaller x-coordinate first (if the x-coordinates are equal, the one with the smaller y).</p>',
      promptTex: `${lineTex(A, B, C)} \\qquad ${circ}`,
      answers: [{ label: 'P₁ x', value: p1[0], int: true }, { label: 'P₁ y', value: p1[1], int: true }, { label: 'P₂ x', value: p2[0], int: true }, { label: 'P₂ y', value: p2[1], int: true }],
      hint: B !== 0 ? 'Solve the line for y, substitute into the circle and solve the quadratic in x. Then find each y from the line.' : 'The line is vertical: substitute its x-value into the circle and solve for y.',
      hintTex: 'd = \\frac{|Ah + Bk + C|}{\\sqrt{A^2 + B^2}} < r \\;\\Rightarrow\\; \\text{two points}',
      steps: [
        { title: 'Distance from the centre to the line', tex: `d = \\frac{|${A}(${h}) + ${txp(B)}(${k}) + ${txp(C)}|}{\\sqrt{${A * A + B * B}}} ${Number.isInteger(d) ? '=' : '\\approx'} ${f3(d)} < ${r}` },
        { title: 'Half the chord', tex: `t = \\sqrt{r^2 - d^2} = \\sqrt{${r * r} - ${f3(d * d)}} \\approx ${f3(t)}` },
        { title: 'The two points', texLines: [`P_1 = (${p1[0]},\\ ${p1[1]}), \\quad P_2 = (${p2[0]},\\ ${p2[1]})`, `\\text{chord } P_1P_2 = \\sqrt{${(p2[0] - p1[0]) ** 2} + ${(p2[1] - p1[1]) ** 2}} \\approx ${f3(2 * t)} = 2t`] },
      ],
      verify: { id: 'line-circle-intersection', values: { A: String(A), B: String(B), C: String(C), h: String(h), k: String(k), r: String(r) }, cards: [['Point P1', 0], ['Point P1', 1], ['Point P2', 0], ['Point P2', 1]] },
    };
  },
};

// ---------------------------------------------------------------- circle from general form
export const circlePractice = {
  title: 'Centre and radius from the general form',
  generate(rand) {
    const h = randInt(rand, -6, 6), k = randInt(rand, -6, 6), r = randInt(rand, 1, 8);
    const D = -2 * h, E = -2 * k, Fc = h * h + k * k - r * r;
    const one = F(1);
    return {
      prompt: '<p>Find the centre (h, k) and the radius r of this circle.</p>',
      promptTex: `${linearTex([[one, 'x^2'], [one, 'y^2'], [F(D), 'x'], [F(E), 'y'], [F(Fc), '']])} = 0`,
      answers: [{ label: 'h', value: h, int: true }, { label: 'k', value: k, int: true }, { label: 'Radius r', value: r }],
      hint: 'Complete the square in x and in y, or use the shortcut formulas.',
      hintTex: '(h, k) = \\left(-\\tfrac{D}{2}, -\\tfrac{E}{2}\\right) \\qquad r^2 = \\tfrac{D^2 + E^2}{4} - F',
      steps: [
        { title: 'Centre', tex: `h = -\\frac{${D}}{2} = ${h}, \\qquad k = -\\frac{${E}}{2} = ${k}` },
        { title: 'Radius', tex: `r^2 = \\frac{${D * D} + ${E * E}}{4} - ${txp(Fc)} = ${h * h + k * k} - ${txp(Fc)} = ${r * r} \\;\\Rightarrow\\; r = ${r}` },
      ],
      verify: { id: 'circle-equation', values: { mode: 'gen', D: String(D), E: String(E), F: String(Fc) }, cards: [['Centre (h, k)', 0], ['Centre (h, k)', 1], ['Radius r']] },
    };
  },
};

// ---------------------------------------------------------------- parabola
export const parabolaPractice = {
  title: 'Vertex and focus of a parabola',
  generate(rand) {
    const a = F(pick(rand, ['1/4', '-1/4', '1/8', '-1/8', '1/2', '-1/2', '1', '-1']));
    const h = randInt(rand, -5, 5), k = randInt(rand, -5, 5);
    const b = a.mul(-2 * h), c = a.mul(h * h).add(k), p = F(1).div(a.mul(4));
    return {
      prompt: '<p>Find the vertex of this parabola and the y-coordinate of its focus.</p>',
      promptTex: `y = ${linearTex([[a, 'x^2'], [b, 'x'], [c, '']])}`,
      answers: [{ label: 'Vertex x', value: h, int: true }, { label: 'Vertex y', value: k, int: true }, { label: 'Focus y', value: k + p.toNumber(), decimals: 3 }],
      hint: 'The vertex is at x = −b/(2a). The focus is p = 1/(4a) above the vertex (below it when a is negative).',
      hintTex: 'x_0 = -\\frac{b}{2a} \\qquad p = \\frac{1}{4a} \\qquad F = (x_0,\\ y_0 + p)',
      steps: [
        { title: 'Vertex', texLines: [`x_0 = -\\frac{${b.toTex()}}{2\\left(${a.toTex()}\\right)} = ${h}`, `y_0 = ${linearTex([[a, `(${h})^2`], [b, `(${h})`], [c, '']])} = ${k}`] },
        { title: 'Focal distance', tex: `p = \\frac{1}{4\\left(${a.toTex()}\\right)} = ${p.toTex()}` },
        { title: 'Focus', tex: `F = \\left(${h},\\ ${k} ${p.sign() < 0 ? '-' : '+'} ${p.abs().toTex()}\\right) = \\left(${h},\\ ${p.add(k).toTex()}\\right)` },
      ],
      verify: { id: 'parabola', values: { form: 'yx', a: a.toString(), b: b.toString(), c: c.toString() }, cards: [['Vertex V', 0], ['Vertex V', 1], ['Focus F', 1]] },
    };
  },
};

// ---------------------------------------------------------------- point to plane
const QUADS = [[1, 2, 2, 3], [2, 3, 6, 7], [1, 4, 8, 9], [2, 6, 9, 11], [4, 4, 7, 9], [2, 1, 2, 3], [6, 2, 3, 7]];
export const planePractice = {
  title: 'Distance from a point to a plane',
  generate(rand) {
    const [qa, qb, qc, n] = pick(rand, QUADS);
    const A = qa * sgn(rand), B = qb * sgn(rand), C = qc * sgn(rand);
    const x0 = randInt(rand, -5, 5), y0 = randInt(rand, -5, 5), z0 = randInt(rand, -5, 5);
    let D, N;
    do { D = randInt(rand, -12, 12); N = A * x0 + B * y0 + C * z0 + D; } while (N === 0);
    const t = F(N).div(n * n), Fx = F(x0).sub(t.mul(A));
    return {
      prompt: `<p>Find the distance from <strong>P(${x0}, ${y0}, ${z0})</strong> to the plane below, and the x-coordinate of the foot of the perpendicular from P.</p>`,
      promptTex: `${linearTex([[F(A), 'x'], [F(B), 'y'], [F(C), 'z'], [F(D), '']])} = 0`,
      answers: [{ label: 'Distance d', value: abs(N) / n }, { label: 'Foot F: x', value: Fx.toNumber() }],
      hint: 'Substitute the point into the left side of the plane equation, then divide by the length of the normal (A, B, C).',
      hintTex: 'd = \\frac{|Ax_0 + By_0 + Cz_0 + D|}{\\sqrt{A^2 + B^2 + C^2}} \\qquad F = P - t\\,(A, B, C),\\ t = \\frac{Ax_0 + By_0 + Cz_0 + D}{A^2 + B^2 + C^2}',
      steps: [
        { title: 'Substitute the point', tex: `${A}(${x0}) + ${txp(B)}(${y0}) + ${txp(C)}(${z0}) + ${txp(D)} = ${N}` },
        { title: 'Length of the normal', tex: `\\sqrt{${A * A} + ${B * B} + ${C * C}} = \\sqrt{${n * n}} = ${n}` },
        { title: 'Distance', tex: `d = \\frac{|${N}|}{${n}} = ${F(abs(N)).div(n).toTex()} ${abs(N) % n === 0 ? '' : `\\approx ${f3(abs(N) / n)}`}` },
        { title: 'Foot of the perpendicular', tex: `t = \\frac{${N}}{${n * n}} = ${t.toTex()}, \\qquad F_x = ${x0} - \\left(${t.toTex()}\\right)(${A}) = ${Fx.toTex()}` },
      ],
      verify: { id: 'point-to-plane-distance', values: { A: String(A), B: String(B), C: String(C), D: String(D), x0: String(x0), y0: String(y0), z0: String(z0) }, cards: [['Distance d'], ['Foot F: x']] },
    };
  },
};

// ---------------------------------------------------------------- angle between lines
const SLOPES = ['-3', '-2', '-1', '-1/2', '-1/3', '0', '1/3', '1/2', '1', '2', '3', '3/4', '-4/3'];
export const anglePractice = {
  title: 'Angle between two lines',
  generate(rand) {
    let m1, m2;
    do { m1 = F(pick(rand, SLOPES)); m2 = F(pick(rand, SLOPES)); } while (m1.eq(m2) || m1.mul(m2).add(1).isZero());
    const tn = m2.sub(m1).div(m1.mul(m2).add(1)).abs();
    const th = deg(atan(tn.toNumber()));
    return {
      prompt: `<p>Find the acute angle, in degrees, between a line with slope <strong>${m1}</strong> and a line with slope <strong>${m2}</strong>.</p>`,
      answers: [{ label: 'Angle θ', value: th, unit: '°' }],
      hint: 'Use the tangent formula and take the absolute value to get the acute angle.',
      hintTex: '\\tan\\theta = \\left\\lvert \\frac{m_2 - m_1}{1 + m_1 m_2} \\right\\rvert',
      steps: [
        { title: 'Substitute', tex: `\\tan\\theta = \\left\\lvert \\frac{${m2.toTex()} - \\left(${m1.toTex()}\\right)}{1 + \\left(${m1.toTex()}\\right)\\left(${m2.toTex()}\\right)} \\right\\rvert = \\left\\lvert \\frac{${m2.sub(m1).toTex()}}{${m1.mul(m2).add(1).toTex()}} \\right\\rvert = ${tn.toTex()}` },
        { title: 'Inverse tangent', tex: `\\theta = \\tan^{-1}\\left(${tn.toTex()}\\right) \\approx ${f2(th)}^\\circ` },
      ],
      verify: { id: 'angle-between-lines', values: { mode: 'slopes', m1: m1.toString(), m2: m2.toString() }, cards: [['Acute angle θ']] },
    };
  },
};

// ---------------------------------------------------------------- polygon area
export const polygonPractice = {
  title: 'Area of a quadrilateral from its corners',
  generate(rand) {
    const x0 = randInt(rand, -7, -2), x1 = randInt(rand, 2, 7), y0 = randInt(rand, -6, -2), y1 = randInt(rand, 2, 6);
    const P = [[randInt(rand, x0 + 1, x1 - 1), y0], [x1, randInt(rand, y0 + 1, y1 - 1)], [randInt(rand, x0 + 1, x1 - 1), y1], [x0, randInt(rand, y0 + 1, y1 - 1)]];
    const terms = P.map(([xa, ya], i) => { const [xb, yb] = P[(i + 1) % 4]; return xa * yb - xb * ya; });
    const S = terms.reduce((s, v) => s + v, 0);
    return {
      prompt: `<p>Find the area of the quadrilateral with vertices, in order, <strong>${P.map(([x, y]) => `(${x}, ${y})`).join(', ')}</strong>.</p>`,
      answers: [{ label: 'Area', value: abs(S) / 2 }],
      hint: 'Use the shoelace formula: cross-multiply each pair of neighbouring vertices, add, and halve. The last vertex pairs with the first.',
      hintTex: 'A = \\tfrac{1}{2}\\left\\lvert \\sum (x_i y_{i+1} - x_{i+1} y_i) \\right\\rvert',
      steps: [
        { title: 'Shoelace terms', texLines: P.map(([xa, ya], i) => { const [xb, yb] = P[(i + 1) % 4]; return `(${xa})(${yb}) - (${xb})(${ya}) = ${terms[i]}`; }) },
        { title: 'Add and halve', tex: `A = \\tfrac{1}{2}\\left\\lvert ${terms.join(' + ').replace(/\+ -/g, '- ')} \\right\\rvert = \\tfrac{1}{2}(${abs(S)}) = ${tx(abs(S) / 2)}` },
      ],
      verify: { id: 'polygon-area-coordinates', values: { pts: P.map((q) => q.join(', ')).join('\n') }, cards: [['Area']] },
    };
  },
};

// ---------------------------------------------------------------- ellipse
const ETRIPLES = [[5, 3, 4], [5, 4, 3], [10, 6, 8], [10, 8, 6], [13, 5, 12], [13, 12, 5], [17, 8, 15], [17, 15, 8]];
const sq = (v, s) => (s === 0 ? `${v}^2` : `(${v} ${s < 0 ? '+' : '-'} ${abs(s)})^2`);
export const ellipsePractice = {
  title: 'Foci and eccentricity of an ellipse',
  generate(rand) {
    const [p, q, c] = pick(rand, ETRIPLES), horiz = rand() < 0.5;
    const a = horiz ? p : q, b = horiz ? q : p, h = randInt(rand, -4, 4), k = randInt(rand, -4, 4);
    const c0 = horiz ? h : k;
    return {
      prompt: `<p>For this ellipse, find the distance c from the centre to each focus, the eccentricity e, and the ${horiz ? 'x' : 'y'}-coordinate of the focus with the larger ${horiz ? 'x' : 'y'}-value.</p>`,
      promptTex: `\\frac{${sq('x', h)}}{${a * a}} + \\frac{${sq('y', k)}}{${b * b}} = 1`,
      answers: [{ label: 'c', value: c }, { label: 'Eccentricity e', value: c / p, decimals: 3 }, { label: `Focus ${horiz ? 'x' : 'y'}`, value: c0 + c, int: true }],
      hint: 'The larger denominator belongs to the major axis, and the foci lie on it. For an ellipse, subtract: c² = (major)² − (minor)².',
      hintTex: 'c^2 = p^2 - q^2 \\qquad e = \\frac{c}{p}',
      steps: [
        { title: 'Major axis', text: `${p * p} > ${q * q}, so the major semi-axis is ${p} and it is ${horiz ? 'horizontal' : 'vertical'}.` },
        { title: 'Focal distance', tex: `c = \\sqrt{${p * p} - ${q * q}} = \\sqrt{${c * c}} = ${c}` },
        { title: 'Eccentricity', tex: `e = \\frac{${c}}{${p}} ${Number.isInteger((c / p) * 1000) ? '=' : '\\approx'} ${f3(c / p)}` },
        { title: 'Foci', tex: horiz ? `(${h} \\pm ${c},\\ ${k}) = (${h - c},\\ ${k}),\\ (${h + c},\\ ${k})` : `(${h},\\ ${k} \\pm ${c}) = (${h},\\ ${k - c}),\\ (${h},\\ ${k + c})` },
      ],
      verify: { id: 'ellipse', values: { h: String(h), k: String(k), a: String(a), b: String(b) }, cards: [['c (centre to focus)'], ['Eccentricity e'], [null]] },
    };
  },
};

// ---------------------------------------------------------------- hyperbola
const HTRIPLES = [[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13], [8, 15, 17]];
export const hyperbolaPractice = {
  title: 'Foci and asymptotes of a hyperbola',
  generate(rand) {
    const [a, b, c] = pick(rand, HTRIPLES), horiz = rand() < 0.5, h = randInt(rand, -4, 4), k = randInt(rand, -4, 4);
    const slope = horiz ? b / a : a / b;
    const X = sq('x', h), Y = sq('y', k);
    return {
      prompt: `<p>For this hyperbola, find c (centre to focus), the eccentricity e and the positive slope of its asymptotes.</p>`,
      promptTex: horiz ? `\\frac{${X}}{${a * a}} - \\frac{${Y}}{${b * b}} = 1` : `\\frac{${Y}}{${a * a}} - \\frac{${X}}{${b * b}} = 1`,
      answers: [{ label: 'c', value: c }, { label: 'Eccentricity e', value: c / a, decimals: 3 }, { label: 'Asymptote slope', value: slope, decimals: 3 }],
      hint: `The positive term is the ${horiz ? 'x' : 'y'}-term, so the hyperbola opens ${horiz ? 'left and right' : 'up and down'} and its denominator is a². For a hyperbola, add: c² = a² + b².`,
      hintTex: horiz ? 'c^2 = a^2 + b^2 \\qquad e = \\frac{c}{a} \\qquad \\text{slope} = \\pm\\frac{b}{a}' : 'c^2 = a^2 + b^2 \\qquad e = \\frac{c}{a} \\qquad \\text{slope} = \\pm\\frac{a}{b}',
      steps: [
        { title: 'Read a and b', tex: `a^2 = ${a * a} \\Rightarrow a = ${a}, \\qquad b^2 = ${b * b} \\Rightarrow b = ${b}` },
        { title: 'Focal distance', tex: `c = \\sqrt{${a * a} + ${b * b}} = \\sqrt{${c * c}} = ${c}` },
        { title: 'Eccentricity', tex: `e = \\frac{${c}}{${a}} \\approx ${f3(c / a)}` },
        { title: 'Asymptote slope', tex: horiz ? `\\frac{b}{a} = \\frac{${b}}{${a}} \\approx ${f3(slope)}` : `\\frac{a}{b} = \\frac{${a}}{${b}} \\approx ${f3(slope)}` },
      ],
      verify: { id: 'hyperbola', values: { dir: horiz ? 'x' : 'y', h: String(h), k: String(k), a: String(a), b: String(b) }, cards: [['c (centre to focus)'], ['Eccentricity e'], ['Asymptote slope (±)']] },
    };
  },
};

// ---------------------------------------------------------------- point to line (hand-written page)
const PAIRS = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10], [8, 15, 17], [1, 0, 1], [0, 1, 1]];
export const pointLinePractice = {
  title: 'Distance from a point to a line',
  generate(rand) {
    const [pa, pb, n] = pick(rand, PAIRS);
    const A = pa * sgn(rand), B = pb * sgn(rand);
    const x1 = randInt(rand, -6, 6), y1 = randInt(rand, -6, 6);
    let C, N;
    do { C = randInt(rand, -20, 20); N = A * x1 + B * y1 + C; } while (N === 0);
    const t = F(N).div(n * n), Fx = F(x1).sub(t.mul(A));
    return {
      prompt: `<p>Find the perpendicular distance from <strong>P(${x1}, ${y1})</strong> to the line below, and the x-coordinate of the foot of the perpendicular.</p>`,
      promptTex: lineTex(A, B, C),
      answers: [{ label: 'Distance d', value: abs(N) / n }, { label: 'Foot F: x', value: Fx.toNumber() }],
      hint: 'Substitute the point into Ax + By + C, take the absolute value, and divide by the length of (A, B).',
      hintTex: 'd = \\frac{|Ax_1 + By_1 + C|}{\\sqrt{A^2 + B^2}} \\qquad F = P - t\\,(A, B),\\ t = \\frac{Ax_1 + By_1 + C}{A^2 + B^2}',
      steps: [
        { title: 'Substitute the point', tex: `${A}(${x1}) + ${txp(B)}(${y1}) + ${txp(C)} = ${N}` },
        { title: 'Length of (A, B)', tex: `\\sqrt{${A * A} + ${B * B}} = ${n}` },
        { title: 'Distance', tex: `d = \\frac{|${N}|}{${n}} = ${F(abs(N)).div(n).toTex()}${abs(N) % n === 0 ? '' : ` \\approx ${f3(abs(N) / n)}`}` },
        { title: 'Foot of the perpendicular', tex: `t = \\frac{${N}}{${n * n}} = ${t.toTex()}, \\qquad F_x = ${x1} - \\left(${t.toTex()}\\right)(${A}) = ${Fx.toTex()}` },
      ],
      verify: { id: 'distance-from-point-to-line', values: { x1: String(x1), y1: String(y1), A: String(A), B: String(B), C: String(C) } },
    };
  },
};

// ================================================================ explorers
export const parabolaExplore = {
  title: 'Focus and directrix',
  intro: 'Move P along the parabola. Its distance to the focus F always equals its distance to the directrix: that is the definition of a parabola. Change p to make it wider, narrower or open downward.',
  controls: [
    { name: 'p', label: 'Focal distance p', min: -3, max: 3, step: 0.25, value: 1.5 },
    { name: 's', label: 'Position of P', min: -1, max: 1, step: 0.01, value: 0.55 },
  ],
  animate: { control: 's', seconds: 6, loop: true },
  presets: [{ label: 'Wide (p = 3)', values: { p: 3 } }, { label: 'Narrow (p = 0.5)', values: { p: 0.5 } }, { label: 'Opens down', values: { p: -1.5 } }],
  render({ p, s }) {
    if (p === 0) return { svg: plot({ ...GRID, title: 'No parabola', hlines: [{ y: 0, cls: 'd-line3' }] }), readouts: [{ label: 'p = 0', text: 'The focus would sit on the directrix, so the curve collapses to a line. Move the slider.', tone: 'warn' }] };
    const x = s * sqrt(28 * abs(p)), y = (x * x) / (4 * p);
    const PF = hypot(x, y - p), PD = abs(y + p);
    return {
      svg: plot({
        ...GRID, equal: true, title: `Parabola x² = ${tx(4 * p, 2)}y`,
        curves: [{ f: (u) => (u * u) / (4 * p), samples: 400 }],
        hlines: [{ y: -p, cls: 'd-line3', label: 'directrix' }],
        segments: [{ x1: x, y1: y, x2: 0, y2: p, cls: 'd-line2' }, { x1: x, y1: y, x2: x, y2: -p, cls: 'd-perp' }],
        points: [{ x: 0, y: 0, label: 'V', cls: 'd-point2' }, { x: 0, y: p, label: 'F', cls: 'd-foot' }, { x, y, label: 'P' }],
      }),
      readouts: [
        { label: 'Equation', tex: `x^2 = 4py = ${tx(4 * p, 3)}\\,y`, },
        { label: 'Focus and directrix', tex: `F = (0,\\ ${tx(p, 3)}), \\quad y = ${tx(-p, 3)}` },
        { label: 'Distances from P', tex: `PF \\approx ${f3(PF)}, \\quad PD \\approx ${f3(PD)}`, tone: 'good' },
        { label: 'Latus rectum', tex: `|4p| = ${tx(abs(4 * p), 3)}` },
      ],
    };
  },
};

export const planeDistanceExplore = {
  title: 'Drop a perpendicular onto a plane',
  intro: 'Move the point and tilt the plane. The shortest path from P to the plane runs along the normal vector (A, B, C) and meets the plane at F. Drag the figure to turn it.',
  controls: [
    { name: 'A', label: 'Plane: A', min: -3, max: 3, step: 1, value: 1 },
    { name: 'B', label: 'Plane: B', min: -3, max: 3, step: 1, value: 1 },
    { name: 'C', label: 'Plane: C', min: -3, max: 3, step: 1, value: 2 },
    { name: 'D', label: 'Plane: D', min: -8, max: 8, step: 1, value: -2 },
    { name: 'x0', label: 'Point P: x₀', min: -4, max: 4, step: 0.5, value: 2 },
    { name: 'y0', label: 'Point P: y₀', min: -4, max: 4, step: 0.5, value: 1 },
    { name: 'z0', label: 'Point P: z₀', min: -4, max: 4, step: 0.5, value: 3 },
    { name: 'yaw', label: 'Turn', min: 0, max: 360, step: 1, value: 35, unit: '°', hidden: true },
    { name: 'pitch', label: 'Tilt', min: -10, max: 60, step: 1, value: 22, unit: '°', hidden: true },
  ],
  rotate: { yaw: 'yaw', pitch: 'pitch' },
  presets: [{ label: 'Horizontal plane z = 1', values: { A: 0, B: 0, C: 1, D: -1 } }, { label: 'Point on the plane', values: { A: 1, B: 1, C: 2, D: -2, x0: 0, y0: 0, z0: 1 } }],
  render({ A, B, C, D, x0, y0, z0, yaw, pitch }) {
    const n2 = A * A + B * B + C * C;
    if (n2 === 0) return { svg: scene3d({ yaw, pitch, points: [{ p: [x0, y0, z0], label: 'P' }] }), readouts: [{ label: 'Plane', text: 'A, B and C are all 0, so there is no plane. Move one of them.', tone: 'warn' }] };
    const N = A * x0 + B * y0 + C * z0 + D, n = sqrt(n2), t = N / n2;
    const Fp = [x0 - t * A, y0 - t * B, z0 - t * C];
    const u = [A / n, B / n, C / n];
    const ref = abs(u[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    let e1 = cr(u, ref); const l1 = hypot(...e1); e1 = e1.map((v) => v / l1);
    const e2 = cr(u, e1), R = 3.2;
    const corner = (i, j) => Fp.map((f, m) => f + R * (i * e1[m] + j * e2[m]));
    const d = abs(N) / n;
    return {
      svg: scene3d({
        yaw, pitch, size: 6, title: 'Plane, point and perpendicular',
        planes: [{ pts: [corner(1, 1), corner(1, -1), corner(-1, -1), corner(-1, 1)] }],
        segments: [{ a: [x0, y0, z0], b: Fp, cls: 'd-line2', dash: true }, { a: Fp, b: Fp.map((f, m) => f + 1.5 * u[m]), cls: 'd-line3' }],
        points: [{ p: [x0, y0, z0], label: 'P' }, { p: Fp, label: 'F', cls: 'd-foot' }],
      }),
      readouts: [
        { label: 'Plane', tex: `${linearTex([[F(A), 'x'], [F(B), 'y'], [F(C), 'z'], [F(D), '']])} = 0` },
        { label: 'Substitute P', tex: `Ax_0 + By_0 + Cz_0 + D = ${tx(N, 3)}` },
        { label: 'Distance', tex: `d = \\frac{|${tx(N, 3)}|}{\\sqrt{${n2}}} ${Number.isInteger(d * 1000) ? '=' : '\\approx'} ${f3(d)}`, tone: 'good' },
        { label: 'Foot F', tex: `(${f2(Fp[0])},\\ ${f2(Fp[1])},\\ ${f2(Fp[2])})` },
      ],
      note: N === 0 ? 'P satisfies the plane equation, so it lies on the plane and the distance is 0.' : '',
    };
  },
};

export const pointLineExplore = {
  title: 'Drag a point towards a line',
  intro: 'Drag P anywhere. The dashed segment is the shortest path to the line: it always meets the line at a right angle, at the foot F.',
  controls: [
    { name: 'A', label: 'Line: A', min: -5, max: 5, step: 0.5, value: 3 },
    { name: 'B', label: 'Line: B', min: -5, max: 5, step: 0.5, value: 4 },
    { name: 'C', label: 'Line: C', min: -12, max: 12, step: 1, value: -2 },
    { name: 'x1', label: 'P: x₁', min: -10, max: 10, step: 0.5, value: 4, hidden: true },
    { name: 'y1', label: 'P: y₁', min: -8, max: 8, step: 0.5, value: 5, hidden: true },
  ],
  drag: { P: { x: 'x1', y: 'y1' } },
  presets: [{ label: 'Horizontal line y = 2', values: { A: 0, B: 1, C: -2 } }, { label: 'Vertical line x = −3', values: { A: 1, B: 0, C: 3 } }],
  render({ A, B, C, x1, y1 }) {
    const pts = [{ x: x1, y: y1, label: 'P', drag: 'P' }];
    if (A === 0 && B === 0) return { svg: plot({ ...GRID, points: pts }), readouts: [{ label: 'Line', text: 'A and B are both 0, so there is no line. Move a slider.', tone: 'warn' }] };
    const N = A * x1 + B * y1 + C, n2 = A * A + B * B, t = N / n2, Fp = [x1 - A * t, y1 - B * t], d = abs(N) / sqrt(n2);
    return {
      svg: plot({
        ...GRID, equal: true, title: 'Point, line and perpendicular',
        curves: B === 0 ? [] : [{ f: (x) => -(A * x + C) / B }], vlines: B === 0 ? [{ x: -C / A, cls: 'd-line' }] : [],
        segments: [{ x1, y1, x2: Fp[0], y2: Fp[1], cls: 'd-perp' }],
        points: [...pts, { x: Fp[0], y: Fp[1], label: 'F', cls: 'd-foot' }],
      }),
      readouts: [
        { label: 'Line', tex: `${linearTex([[F(A), 'x'], [F(B), 'y'], [F(C), '']])} = 0` },
        { label: 'Substitute P', tex: `Ax_1 + By_1 + C = ${tx(N, 3)}` },
        { label: 'Distance', tex: `d = \\frac{|${tx(N, 3)}|}{\\sqrt{${tx(n2, 3)}}} ${Number.isInteger(d * 1000) ? '=' : '\\approx'} ${f3(d)}`, tone: 'good' },
        { label: 'Foot F', tex: `(${f2(Fp[0])},\\ ${f2(Fp[1])})` },
      ],
      note: N === 0 ? 'P is on the line, so the distance is 0.' : (abs(Fp[0]) > 10 || abs(Fp[1]) > 8 ? 'The foot of the perpendicular is outside the visible grid.' : ''),
    };
  },
};
