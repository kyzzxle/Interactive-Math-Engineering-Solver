/**
 * Area of a polygon from the coordinates of its vertices (shoelace / surveyor's formula):
 *   A = ½ |Σ (xᵢ yᵢ₊₁ − xᵢ₊₁ yᵢ)|
 * Exact for fractional coordinates. Also the orientation, perimeter and centroid. Self-crossing
 * polygons are detected, because the formula does not give their enclosed area.
 */
import { answer, fracAnswer, fmt, tx } from '../lib/calc-kit.js';
import { parseFrac, Frac } from '../lib/fraction.js';
import { plot } from '../lib/plot.js';
import { polygonPractice } from '../explore/analytic-practice.js';

const F0 = new Frac(0n);

export function parseVertices(raw) {
  const nums = String(raw ?? '').replace(/[()[\]]/g, ' ').split(/[\s,;]+/).filter(Boolean);
  if (!nums.length) return { error: 'Enter the vertices, one point per line, for example 0, 0.' };
  if (nums.length % 2) return { error: 'Each vertex needs an x and a y coordinate; one number is missing.' };
  const pts = [];
  for (let i = 0; i < nums.length; i += 2) {
    const x = parseFrac(nums[i]), y = parseFrac(nums[i + 1]);
    if (!x || !y) return { error: `“${nums[i]}, ${nums[i + 1]}” is not a point. Use numbers or fractions such as 3/2.` };
    if ([x, y].some((f) => f.abs().toNumber() > 1e9 || f.n.toString().length > 20 || f.d.toString().length > 20)) return { error: 'Please keep coordinates between −10⁹ and 10⁹ with moderate precision.' };
    pts.push([x, y]);
  }
  if (pts.length < 3) return { error: 'A polygon needs at least 3 vertices.' };
  if (pts.length > 30) return { error: 'Please enter at most 30 vertices.' };
  return { pts };
}

const segCross = (a, b, c, d) => {
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
};
export function selfIntersects(P) {
  const n = P.length;
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    if (segCross(P[i], P[(i + 1) % n], P[j], P[(j + 1) % n])) return true;
  }
  return false;
}

export function shoelaceNum(P) {
  let s = 0;
  for (let i = 0; i < P.length; i++) { const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length]; s += x1 * y2 - x2 * y1; }
  return s / 2;
}

const DRAG = ['A', 'B', 'C', 'D'];
export const calculator = {
  id: 'polygon-area-coordinates',
  practice: polygonPractice,
  explore: {
    title: 'Drag the corners of a quadrilateral',
    intro: 'Drag any corner. The area updates using the shoelace sums. Drag one corner across an opposite side and the polygon crosses itself — the formula then stops giving the enclosed area.',
    controls: DRAG.flatMap((k, i) => [
      { name: `x${i}`, label: `${k} x`, min: -8, max: 8, step: 0.5, value: [-5, 5, 6, -4][i], hidden: true },
      { name: `y${i}`, label: `${k} y`, min: -6, max: 6, step: 0.5, value: [-4, -3, 4, 3][i], hidden: true },
    ]),
    drag: Object.fromEntries(DRAG.map((k, i) => [k, { x: `x${i}`, y: `y${i}` }])),
    presets: [{ label: 'Square 6 × 6', values: { x0: -3, y0: -3, x1: 3, y1: -3, x2: 3, y2: 3, x3: -3, y3: 3 } }, { label: 'Crossed (bow tie)', values: { x0: -5, y0: -4, x1: 5, y1: 4, x2: 5, y2: -4, x3: -5, y3: 4 } }],
    render(v) {
      const P = DRAG.map((_, i) => [v[`x${i}`], v[`y${i}`]]);
      const A = shoelaceNum(P), crossed = selfIntersects(P);
      return {
        svg: plot({ x: [-9, 9], y: [-7, 7], width: 400, height: 320, title: 'Quadrilateral', segments: P.map((p, i) => ({ x1: p[0], y1: p[1], x2: P[(i + 1) % 4][0], y2: P[(i + 1) % 4][1], cls: crossed ? 'd-line3' : 'd-line' })), points: P.map((p, i) => ({ x: p[0], y: p[1], label: `${DRAG[i]}(${p[0]}, ${p[1]})`, drag: DRAG[i] })) }),
        readouts: [
          { label: 'Signed area', tex: `\\tfrac{1}{2}\\sum (x_i y_{i+1} - x_{i+1} y_i) = ${tx(A, 3)}` },
          { label: 'Area', tex: `A = ${tx(Math.abs(A), 3)}`, tone: crossed ? 'warn' : 'good' },
          { label: 'Order of the vertices', text: crossed ? 'The sides cross: this is not a simple polygon.' : A > 0 ? 'counter-clockwise (positive)' : A < 0 ? 'clockwise (negative)' : 'all on one line' },
        ],
      };
    },
  },
  fields: [
    { name: 'pts', label: 'Vertices in order (x, y)', type: 'textarea', rows: 6, placeholder: '0, 0\n4, 0\n4, 3\n0, 5', hint: 'One vertex per line, going around the polygon (either direction). Fractions such as 7/2 are allowed.' },
  ],
  examples: [
    { label: 'Quadrilateral (0,0) (4,0) (4,3) (0,5)', values: { pts: '0, 0\n4, 0\n4, 3\n0, 5' } },
    { label: 'Triangle (1,1) (6,2) (3,7)', values: { pts: '(1, 1) (6, 2) (3, 7)' } },
    { label: 'Pentagon with fractions', values: { pts: '0, 0\n5/2, -1\n5, 1\n4, 4\n1/2, 3' } },
    { label: 'Invalid: all points on one line', values: { pts: '0, 0\n1, 1\n2, 2' }, expectError: true },
  ],
  solve(values) {
    const p = parseVertices(values.pts);
    if (p.error) return { ok: false, errors: [{ field: 'pts', message: p.error }] };
    const P = p.pts, n = P.length;
    const rows = [];
    let sum = F0;
    for (let i = 0; i < n; i++) {
      const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % n];
      const term = x1.mul(y2).sub(x2.mul(y1));
      sum = sum.add(term);
      rows.push([`${i + 1} → ${((i + 1) % n) + 1}`, { tex: `(${x1.toTex()})(${y2.toTex()}) - (${x2.toTex()})(${y1.toTex()})` }, { tex: term.toTex() }]);
    }
    if (sum.isZero()) return { ok: false, errors: [{ field: 'pts', message: 'The shoelace sum is 0: the points are all on one line (or the polygon’s parts cancel exactly), so it encloses no area.' }] };
    const area = sum.abs().div(2);
    const Pn = P.map(([x, y]) => [x.toNumber(), y.toNumber()]);
    const crossed = selfIntersects(Pn);
    let per = 0;
    for (let i = 0; i < n; i++) per += Math.hypot(Pn[(i + 1) % n][0] - Pn[i][0], Pn[(i + 1) % n][1] - Pn[i][1]);
    let cx = F0, cy = F0;
    for (let i = 0; i < n; i++) {
      const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % n];
      const c = x1.mul(y2).sub(x2.mul(y1));
      cx = cx.add(x1.add(x2).mul(c)); cy = cy.add(y1.add(y2).mul(c));
    }
    cx = cx.div(sum.mul(3)); cy = cy.div(sum.mul(3));
    const xs = Pn.map((q) => q[0]), ys = Pn.map((q) => q[1]);
    const pad = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 0.2 + 0.5;
    const notes = [];
    if (crossed) notes.push({ kind: 'warn', text: 'Some sides cross each other, so this is not a simple polygon. The shoelace formula then adds and subtracts the pieces, and the result is not the enclosed area. Reorder the vertices so they go around the boundary.' });
    notes.push({ kind: 'info', text: 'List the vertices in order around the boundary. Starting point and direction do not matter; the sign of the sum only tells you the direction.' });
    return {
      ok: true,
      final: { tex: `A = ${area.toTex()}${area.isInt() ? '' : ` = ${fmt(area.toNumber())}`}` },
      answers: [
        fracAnswer('Area', area, { primary: true }),
        answer('Perimeter', per, { irrational: true }),
        fracAnswer('Centroid x', cx), fracAnswer('Centroid y', cy),
        { label: 'Vertex order', value: sum.sign() > 0 ? 'Counter-clockwise' : 'Clockwise', copy: '' },
      ],
      visual: {
        svg: plot({ x: [Math.min(...xs) - pad, Math.max(...xs) + pad], y: [Math.min(...ys) - pad, Math.max(...ys) + pad], equal: true, width: 360, height: 300, title: 'Polygon from its vertices', segments: Pn.map((q, i) => ({ x1: q[0], y1: q[1], x2: Pn[(i + 1) % n][0], y2: Pn[(i + 1) % n][1], cls: crossed ? 'd-line3' : 'd-line' })), points: [...Pn.map((q, i) => ({ x: q[0], y: q[1], label: String(i + 1) })), { x: cx.toNumber(), y: cy.toNumber(), label: 'centroid', cls: 'd-point2' }] }),
        caption: 'Vertices are numbered in the order entered.',
      },
      formula: ['A = \\frac{1}{2}\\left\\lvert \\sum_{i=1}^{n} \\left(x_i y_{i+1} - x_{i+1} y_i\\right) \\right\\rvert,\\quad (x_{n+1}, y_{n+1}) = (x_1, y_1)'],
      steps: [
        { title: 'Known values', text: `${n} vertices in order: ${P.map(([x, y]) => `(${x}, ${y})`).join(', ')}.`, note: 'The vertices must be listed in order around the boundary. Either direction and any starting vertex give the same area.' },
        { title: 'Cross-multiply each pair of neighbouring vertices', text: 'For each side, multiply diagonally: xᵢ·yᵢ₊₁ − xᵢ₊₁·yᵢ (the table shows every term). The last vertex wraps round to the first.', note: 'Each term is twice the signed area of the triangle formed by the origin and one side of the polygon.' },
        { title: 'Add the terms', tex: `\\sum = ${rows.map((r) => r[2].tex).join(' + ').replace(/\+ -/g, '- ')} = ${sum.toTex()}`, note: `The sum is ${sum.sign() > 0 ? 'positive, so the vertices go counter-clockwise' : 'negative, so the vertices go clockwise'}. The triangles outside the polygon cancel out, leaving twice its area.` },
        { title: 'Halve and take the absolute value', tex: `A = \\frac{1}{2}\\left\\lvert ${sum.toTex()} \\right\\rvert = ${area.toTex()}${area.isInt() ? '' : ` \\approx ${tx(area.toNumber())}`}` },
        { title: 'Perimeter and centroid', texLines: [`\\text{Perimeter} = \\sum \\sqrt{(x_{i+1} - x_i)^2 + (y_{i+1} - y_i)^2} \\approx ${tx(per)}`, `\\bar{x} = \\frac{1}{3\\sum}\\sum (x_i + x_{i+1})(x_iy_{i+1} - x_{i+1}y_i) = ${cx.toTex()}, \\quad \\bar{y} = ${cy.toTex()}`], note: n === 3 ? 'For a triangle the centroid is simply the average of the three vertices.' : 'The centroid is the balance point of the flat shape. It is not the average of the vertices unless the polygon is a triangle.' },
        ...(n === 3 ? [{ title: 'Check with the triangle formula', tex: `\\tfrac{1}{2}\\left\\lvert x_1(y_2 - y_3) + x_2(y_3 - y_1) + x_3(y_1 - y_2) \\right\\rvert = \\tfrac{1}{2}\\left\\lvert ${P[0][0].mul(P[1][1].sub(P[2][1])).add(P[1][0].mul(P[2][1].sub(P[0][1]))).add(P[2][0].mul(P[0][1].sub(P[1][1]))).toTex()} \\right\\rvert = ${area.toTex()}\\ \\checkmark` }] : []),
      ],
      tables: [{ caption: 'Shoelace terms', headers: ['Side', 'xᵢyᵢ₊₁ − xᵢ₊₁yᵢ', 'Value'], rows }],
      notes,
    };
  },
};
