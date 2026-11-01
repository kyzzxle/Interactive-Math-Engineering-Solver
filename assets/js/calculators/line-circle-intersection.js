/**
 * Points where the line Ax + By + C = 0 meets the circle (x − h)² + (y − k)² = r².
 * The distance d from the centre to the line decides the case: d > r none, d = r tangent, d < r two points.
 * Points: foot of the perpendicular F ± t·u, with t = √(r² − d²) and u a unit vector along the line.
 */
import { validator, fmt, tx, txp, eq, isExact } from '../lib/calc-kit.js';
import { plot } from '../lib/plot.js';

const rel2 = (p) => (isExact(p[0]) && isExact(p[1]) ? '=' : '\\approx');
const ptTex = (p) => `(${tx(p[0])},\\ ${tx(p[1])})`;

export const calculator = {
  id: 'line-circle-intersection',
  fields: [
    { name: 'A', label: 'Line: A', type: 'number', placeholder: 'e.g. 1', row: 'l' },
    { name: 'B', label: 'B', type: 'number', placeholder: 'e.g. -1', row: 'l' },
    { name: 'C', label: 'C', type: 'number', placeholder: 'e.g. 1', row: 'l' },
    { name: 'h', label: 'Circle centre h', type: 'number', placeholder: 'e.g. 0', row: 'c' },
    { name: 'k', label: 'Centre k', type: 'number', placeholder: 'e.g. 0', row: 'c' },
    { name: 'r', label: 'Radius r', type: 'number', signed: false, placeholder: 'e.g. 5', row: 'c' },
  ],
  examples: [
    { label: 'x − y + 1 = 0 and x² + y² = 25', values: { A: '1', B: '-1', C: '1', h: '0', k: '0', r: '5' } },
    { label: 'Tangent: y = 5 and x² + y² = 25', values: { A: '0', B: '1', C: '-5', h: '0', k: '0', r: '5' } },
    { label: 'No intersection', values: { A: '1', B: '1', C: '-12', h: '1', k: '2', r: '3' } },
  ],
  solve(values) {
    const v = validator(values);
    const A = v.number('A', 'A'), B = v.number('B', 'B'), C = v.number('C', 'C');
    const h = v.number('h', 'h'), k = v.number('k', 'k'), r = v.number('r', 'the radius', { positive: true });
    if (!v.ok()) return v.result();
    if (A === 0 && B === 0) return { ok: false, errors: [{ field: ['A', 'B'], message: 'A and B cannot both be 0 — the equation would not describe a line.' }] };
    const n2 = A * A + B * B, n = Math.sqrt(n2);
    const N = A * h + B * k + C;
    const d = Math.abs(N) / n;
    const F = [h - (A * N) / n2, k - (B * N) / n2];
    const u = [-B / n, A / n];
    const tol = 1e-12 * Math.max(1, r);
    const steps = [
      { title: 'Identify the line and the circle', texLines: [`${tx(A)}x + ${txp(B)}y + ${txp(C)} = 0`, `(x - ${txp(h)})^2 + (y - ${txp(k)})^2 = ${txp(r)}^2`] },
      { title: 'Distance from the centre to the line', texLines: ['d = \\frac{|Ah + Bk + C|}{\\sqrt{A^2 + B^2}}', `d = \\frac{|${txp(A)}${txp(h)} + ${txp(B)}${txp(k)} + ${txp(C)}|}{\\sqrt{${txp(A)}^2 + ${txp(B)}^2}} ${eq(d)}`] },
    ];
    let points = [], final, kind;
    if (d > r + tol) {
      kind = 'none';
      steps.push({ title: 'Compare d with the radius', tex: `d ${eq(d)} > r = ${tx(r)}`, text: 'The line passes outside the circle, so they do not meet.' });
      final = { text: 'No intersection: the line misses the circle.' };
    } else {
      steps.push({ title: 'Closest point of the line to the centre (foot of the perpendicular)', texLines: ['F = \\left(h - \\frac{A(Ah + Bk + C)}{A^2 + B^2},\\ k - \\frac{B(Ah + Bk + C)}{A^2 + B^2}\\right)', `F ${rel2(F)} ${ptTex(F)}`] });
      if (Math.abs(d - r) <= tol) {
        kind = 'tangent';
        points = [F];
        steps.push({ title: 'Compare d with the radius', tex: `d = r = ${tx(r)}`, text: 'The line touches the circle at exactly one point: it is a tangent line, and F is the point of tangency.' });
        final = { tex: `\\text{Tangent at } (x, y) ${rel2(F)} ${ptTex(F)}` };
      } else {
        kind = 'secant';
        const t = Math.sqrt((r - d) * (r + d));
        points = [[F[0] - t * u[0], F[1] - t * u[1]], [F[0] + t * u[0], F[1] + t * u[1]]].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
        steps.push({ title: 'Half the chord length (Pythagorean theorem)', texLines: ['t = \\sqrt{r^2 - d^2}', `t = \\sqrt{${tx(r)}^2 - ${tx(d)}^2} ${eq(t)}`] });
        steps.push({ title: 'Move t units each way along the line from F', text: 'The unit direction of the line is (−B, A)/√(A² + B²).', texLines: [`u ${rel2(u)} ${ptTex(u)}`, `P_1 ${rel2(points[0])} ${ptTex(points[0])}`, `P_2 ${rel2(points[1])} ${ptTex(points[1])}`] });
        steps.push({ title: 'Check', text: `Both points satisfy the line equation and are ${fmt(r)} units from the centre (chord length ${fmt(2 * t)}).` });
        final = { texLines: points.map((p, i) => `P_${i + 1} ${rel2(p)} ${ptTex(p)}`) };
      }
    }
    const span = r * 1.6;
    const lineF = (x) => (B === 0 ? NaN : -(A * x + C) / B);
    const svg = plot({
      x: [h - span, h + span], y: [k - span, k + span], equal: true,
      circles: [{ cx: h, cy: k, r, cls: 'd-line' }],
      curves: [{ f: lineF, cls: 'd-line2' }],
      vlines: B === 0 ? [{ x: -C / A, cls: 'd-line2' }] : [],
      segments: kind !== 'none' ? [{ x1: h, y1: k, x2: F[0], y2: F[1], cls: 'd-line3' }] : [],
      points: [{ x: h, y: k, label: 'centre', cls: 'd-point', r: 3 }, ...points.map((p, i) => ({ x: p[0], y: p[1], label: points.length > 1 ? `P${i + 1}` : 'T', cls: 'd-foot' }))],
      title: 'The circle, the line and their intersection points',
    });
    const answers = [
      { label: 'Number of intersection points', value: String(points.length), primary: true },
      ...points.map((p, i) => ({ label: points.length > 1 ? `Point P${i + 1}` : 'Point of tangency', value: `(${fmt(p[0])}, ${fmt(p[1])})`, approx: rel2(p) !== '=', primary: true })),
      { label: 'Distance from centre to line', value: fmt(d), approx: !isExact(d) },
    ];
    return {
      ok: true, final, answers, steps,
      visual: { svg, legend: '<div class="legend"><span><i></i>Circle</span><span><i class="l2"></i>Line</span><span><i class="l3"></i>Perpendicular from the centre</span></div>', caption: kind === 'none' ? 'The perpendicular distance is larger than the radius.' : 'The dashed segment is the shortest distance from the centre to the line.' },
      formula: ['d = \\frac{|Ah + Bk + C|}{\\sqrt{A^2 + B^2}} \\qquad d < r:\\ 2 \\text{ points}, \\quad d = r:\\ \\text{tangent}, \\quad d > r:\\ \\text{none}'],
      notes: [{ kind: 'info', text: 'The same answer comes from substituting the line into the circle equation and solving the resulting quadratic: its discriminant is positive, zero or negative exactly when d < r, d = r or d > r.' }],
    };
  },
};
