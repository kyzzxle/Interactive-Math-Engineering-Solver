/**
 * Lines and planes in space:
 *   two points     — distance, midpoint, direction numbers, direction cosines and angles, line equations
 *   three points   — normal n = (B − A) × (C − A), plane Ax + By + Cz + D = 0, intercepts, triangle area
 *   line and plane — intersection point (or parallel / in the plane) and the angle between them
 *   two planes     — angle between them, line of intersection or distance between parallel planes
 */
import { tx } from '../lib/calc-kit.js';
import { parseDecimal } from '../lib/parse.js';
import { scene3d, space3dExplore, space3dPractice } from '../explore/analytic-new.js';

const { abs, sqrt, acos, asin, PI } = Math;
const t4 = (x) => tx(abs(x) < 1e-12 ? 0 : x, 4);
const deg = (r) => (r * 180) / PI;
const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(...a);
const vT = (a) => `\\left(${a.map(t4).join(',\\ ')}\\right)`;
const planeTex = ([A, B, C], D) => `${[[A, 'x'], [B, 'y'], [C, 'z'], [D, '']].filter(([c], i) => abs(c) > 1e-12 || i === 3 && false).map(([c, s], i) => `${i ? (c < 0 ? ' - ' : ' + ') : c < 0 ? '-' : ''}${abs(abs(c) - 1) < 1e-12 && s ? '' : t4(abs(c))}${s}`).join('')} = 0`;
function gcdList(xs) { const g = (a, b) => (b ? g(b, a % b) : abs(a)); return xs.reduce((a, b) => g(a, b), 0); }

/** Parse "x, y, z" (or n numbers) into an array, recording a helpful error. */
function vec(values, name, label, n, errors) {
  const raw = String(values[name] ?? '').trim();
  const parts = raw ? raw.replace(/[()]/g, '').split(/[\s,;]+/).filter(Boolean) : [];
  if (parts.length !== n) { errors.push({ field: name, message: `Enter ${n} numbers for ${label}, separated by commas (for example ${n === 3 ? '1, -2, 4' : '2, -1, 2, -3'}).` }); return null; }
  const out = [];
  for (const p of parts) { const r = parseDecimal(p, label); if (!r.ok || abs(r.value) > 1e9) { errors.push({ field: name, message: `${label[0].toUpperCase()}${label.slice(1)} must contain only numbers (for example ${n === 3 ? '1, -2, 4' : '2, -1, 2, -3'}).` }); return null; } out.push(r.value); }
  return out;
}

export const calculator = {
  id: 'lines-planes-3d',
  explore: space3dExplore,
  practice: space3dPractice,
  fields: [
    { name: 'mode', label: 'Problem', type: 'select', options: [['points', 'Two points: distance and direction'], ['plane3', 'Plane through three points'], ['lineplane', 'Line and plane: intersection and angle'], ['planes', 'Two planes: angle and intersection']] },
    { name: 'P1', label: 'Point A (x, y, z)', type: 'text', placeholder: 'e.g. 1, 2, 3', showWhen: { mode: ['points', 'plane3', 'lineplane'] } },
    { name: 'P2', label: 'Point B (x, y, z)', type: 'text', placeholder: 'e.g. 4, 6, 15', showWhen: { mode: ['points', 'plane3'] } },
    { name: 'P3', label: 'Point C (x, y, z)', type: 'text', placeholder: 'e.g. 2, 0, 1', showWhen: { mode: ['plane3'] } },
    { name: 'dir', label: 'Direction of the line (a, b, c)', type: 'text', placeholder: 'e.g. 2, -1, 3', showWhen: { mode: ['lineplane'] }, hint: 'The line passes through point A in this direction.' },
    { name: 'pl1', label: 'Plane (A, B, C, D) for Ax + By + Cz + D = 0', type: 'text', placeholder: 'e.g. 1, 1, 1, -6', showWhen: { mode: ['lineplane', 'planes'] } },
    { name: 'pl2', label: 'Second plane (A, B, C, D)', type: 'text', placeholder: 'e.g. 2, -1, 1, -3', showWhen: { mode: ['planes'] } },
  ],
  examples: [
    { label: 'Distance and direction from (1, 2, 3) to (4, 6, 15)', values: { mode: 'points', P1: '1, 2, 3', P2: '4, 6, 15', P3: '', dir: '', pl1: '', pl2: '' } },
    { label: 'Plane through (1, 0, 0), (0, 2, 0), (0, 0, 3)', values: { mode: 'plane3', P1: '1, 0, 0', P2: '0, 2, 0', P3: '0, 0, 3', dir: '', pl1: '', pl2: '' } },
    { label: 'Line through (1, 2, 3) with direction (2, −1, 1) meets x + y + z = 12', values: { mode: 'lineplane', P1: '1, 2, 3', P2: '', P3: '', dir: '2, -1, 1', pl1: '1, 1, 1, -12', pl2: '' } },
    { label: 'Angle between x + y + z = 6 and 2x − y + z = 3', values: { mode: 'planes', P1: '', P2: '', P3: '', dir: '', pl1: '1, 1, 1, -6', pl2: '2, -1, 1, -3' } },
    { label: 'Parallel planes x + 2y + 2z = 3 and 2x + 4y + 4z = 18', values: { mode: 'planes', P1: '', P2: '', P3: '', dir: '', pl1: '1, 2, 2, -3', pl2: '2, 4, 4, -18' } },
    { label: 'Not possible: three points on one line', values: { mode: 'plane3', P1: '0, 0, 0', P2: '1, 1, 1', P3: '2, 2, 2', dir: '', pl1: '', pl2: '' }, expectError: true },
  ],
  solve(values) {
    const mode = ['points', 'plane3', 'lineplane', 'planes'].includes(values.mode) ? values.mode : 'points';
    const errors = [];
    if (mode === 'points') {
      const A = vec(values, 'P1', 'point A', 3, errors), B = vec(values, 'P2', 'point B', 3, errors);
      if (errors.length) return { ok: false, errors };
      const d = sub(B, A), L = len(d);
      if (L < 1e-12) return { ok: false, errors: [{ field: 'P2', message: 'A and B are the same point, so the distance is 0 and there is no direction.' }] };
      const cs = d.map((x) => x / L), angs = cs.map((c) => deg(acos(Math.max(-1, Math.min(1, c)))));
      const M = A.map((x, i) => (x + B[i]) / 2);
      const g = d.every(Number.isInteger) ? gcdList(d) : 1, dn = g > 1 ? d.map((x) => x / g) : d;
      const sym = dn.map((c, i) => (abs(c) < 1e-12 ? `${'xyz'[i]} = ${t4(A[i])}` : `\\frac{${'xyz'[i]} ${A[i] < 0 ? '+' : '-'} ${t4(abs(A[i]))}}{${t4(c)}}`));
      const symTex = sym.filter((s) => s.startsWith('\\frac')).join(' = ') + (sym.some((s) => !s.startsWith('\\frac')) ? `,\\quad ${sym.filter((s) => !s.startsWith('\\frac')).join(',\\ ')}` : '');
      return {
        ok: true,
        final: { texLines: [`d = ${t4(L)}`, `(\\cos\\alpha, \\cos\\beta, \\cos\\gamma) = ${vT(cs)}`] },
        answers: [
          { label: 'Distance AB', value: tx(L, 6), primary: true, copy: `d = ${tx(L, 6)}` },
          { label: 'Midpoint', valueTex: vT(M), copy: '' },
          { label: 'Direction numbers', valueTex: vT(dn), copy: '' },
          { label: 'Direction cosines', valueTex: vT(cs), primary: true, copy: '' },
          { label: 'Direction angles α, β, γ', value: angs.map((x) => `${tx(x, 4)}°`).join(', '), copy: '' },
          { label: 'Symmetric equations of line AB', valueTex: symTex, copy: '' },
        ],
        visual: { svg: scene3d({ points: [{ p: A, label: 'A' }, { p: B, label: 'B', cls: 'd-point2' }], segments: [{ a: A, b: B, cls: 'd-line' }], size: Math.max(...A.map(abs), ...B.map(abs), 3) * 1.2, title: 'Segment AB in space' }), caption: 'x to the front right, y to the back right, z up.' },
        formula: ['d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2 + (z_2 - z_1)^2} \\qquad \\cos\\alpha = \\frac{x_2 - x_1}{d}'],
        steps: [
          { title: 'Components of AB', tex: `\\vec{AB} = B - A = ${vT(d)}`, note: 'These differences are the direction numbers of the line AB.' },
          { title: 'Distance', texLines: [`d = \\sqrt{(${t4(d[0])})^2 + (${t4(d[1])})^2 + (${t4(d[2])})^2} = \\sqrt{${t4(L * L)}} ${Number.isInteger(L) ? '=' : '\\approx'} ${t4(L)}`] },
          { title: 'Midpoint', tex: `M = \\left(\\frac{${t4(A[0])} + ${t4(B[0])}}{2},\\ \\frac{${t4(A[1])} + ${t4(B[1])}}{2},\\ \\frac{${t4(A[2])} + ${t4(B[2])}}{2}\\right) = ${vT(M)}` },
          { title: 'Direction cosines', texLines: [`\\cos\\alpha = \\frac{${t4(d[0])}}{${t4(L)}},\\quad \\cos\\beta = \\frac{${t4(d[1])}}{${t4(L)}},\\quad \\cos\\gamma = \\frac{${t4(d[2])}}{${t4(L)}}`, `${vT(cs)}`], note: `Check: cos²α + cos²β + cos²γ = ${tx(cs.reduce((s, c) => s + c * c, 0), 6)}, which is always 1.` },
          { title: 'Direction angles', tex: `\\alpha \\approx ${t4(angs[0])}^\\circ,\\ \\beta \\approx ${t4(angs[1])}^\\circ,\\ \\gamma \\approx ${t4(angs[2])}^\\circ` },
          { title: 'Equations of the line', tex: symTex, note: 'Symmetric form: each coordinate minus the point’s coordinate, divided by the direction number. A zero direction number means that coordinate stays constant.' },
        ],
        notes: [{ kind: 'info', text: 'Parametric form of the same line: (x, y, z) = A + t(B − A); t = 0 gives A and t = 1 gives B.' }],
      };
    }
    if (mode === 'plane3') {
      const A = vec(values, 'P1', 'point A', 3, errors), B = vec(values, 'P2', 'point B', 3, errors), C = vec(values, 'P3', 'point C', 3, errors);
      if (errors.length) return { ok: false, errors };
      const u = sub(B, A), w = sub(C, A); let n = cross(u, w);
      if (len(n) < 1e-12 * Math.max(1, len(u) * len(w))) return { ok: false, errors: [{ field: 'P3', message: 'The three points lie on one line (or two coincide), so infinitely many planes pass through them. Choose three non-collinear points.' }] };
      const g = n.every(Number.isInteger) ? gcdList(n) : 1;
      const nn = g > 1 ? n.map((x) => x / g) : n.slice();
      const D = -dot(nn, A);
      const area = len(n) / 2;
      const ints = nn.map((c, i) => (abs(c) < 1e-12 ? 'none (parallel to this axis)' : tx(-D / c, 6)));
      return {
        ok: true,
        final: { tex: planeTex(nn, D) },
        answers: [
          { label: 'Plane', valueTex: planeTex(nn, D), primary: true, copy: '' },
          { label: 'Normal vector n', valueTex: vT(nn), copy: '' },
          { label: 'Intercepts (x, y, z)', value: ints.join('; '), copy: '' },
          { label: 'Distance from the origin', value: tx(abs(D) / len(nn), 6), copy: '' },
          { label: 'Area of triangle ABC', value: tx(area, 6), copy: '' },
        ],
        visual: { svg: scene3d({ planes: [{ pts: [A, B, C] }], points: [{ p: A, label: 'A' }, { p: B, label: 'B' }, { p: C, label: 'C' }], segments: [{ a: A, b: B }, { a: B, b: C }, { a: C, b: A }], size: Math.max(...A.map(abs), ...B.map(abs), ...C.map(abs), 3) * 1.2, title: 'Plane through three points' }), caption: 'The shaded triangle ABC lies in the plane.' },
        formula: ['\\vec{n} = \\vec{AB} \\times \\vec{AC} \\qquad n_1(x - x_1) + n_2(y - y_1) + n_3(z - z_1) = 0'],
        steps: [
          { title: 'Two vectors in the plane', texLines: [`\\vec{AB} = ${vT(u)}`, `\\vec{AC} = ${vT(w)}`] },
          { title: 'Normal vector (cross product)', texLines: [`\\vec{n} = \\vec{AB} \\times \\vec{AC} = \\left(${t4(u[1])}\\cdot${t4(w[2])} - ${t4(u[2])}\\cdot${t4(w[1])},\\ ${t4(u[2])}\\cdot${t4(w[0])} - ${t4(u[0])}\\cdot${t4(w[2])},\\ ${t4(u[0])}\\cdot${t4(w[1])} - ${t4(u[1])}\\cdot${t4(w[0])}\\right)`, `\\vec{n} = ${vT(n)}${g > 1 ? ` \\;\\to\\; ${vT(nn)}\\ (\\div ${g})` : ''}`], note: 'The cross product is perpendicular to both vectors, so it is perpendicular to the plane.' },
          { title: 'Plane through A with this normal', texLines: [`${t4(nn[0])}(x - ${t4(A[0])}) + ${t4(nn[1])}(y - ${t4(A[1])}) + ${t4(nn[2])}(z - ${t4(A[2])}) = 0`, planeTex(nn, D)] },
          { title: 'Check with B and C', tex: `${t4(dot(nn, B) + D)} = 0,\\quad ${t4(dot(nn, C) + D)} = 0\\ \\checkmark` },
          { title: 'Area of triangle ABC', tex: `\\tfrac{1}{2}|\\vec{AB} \\times \\vec{AC}| = \\tfrac{1}{2}(${t4(len(n))}) = ${t4(area)}` },
        ],
        notes: [{ kind: 'info', text: 'Any nonzero multiple of the equation describes the same plane; the calculator divides out common factors.' }],
      };
    }
    if (mode === 'lineplane') {
      const P = vec(values, 'P1', 'point A', 3, errors), d = vec(values, 'dir', 'the direction', 3, errors), pl = vec(values, 'pl1', 'the plane', 4, errors);
      if (errors.length) return { ok: false, errors };
      const n = pl.slice(0, 3), D = pl[3];
      if (len(d) < 1e-12) return { ok: false, errors: [{ field: 'dir', message: 'The direction vector cannot be (0, 0, 0).' }] };
      if (len(n) < 1e-12) return { ok: false, errors: [{ field: 'pl1', message: 'A, B and C cannot all be 0: that is not a plane.' }] };
      const nd = dot(n, d), val = dot(n, P) + D;
      const phi = deg(asin(Math.min(1, abs(nd) / (len(n) * len(d)))));
      const steps = [
        { title: 'Line in parametric form', tex: `(x, y, z) = ${vT(P)} + t${vT(d)}` },
        { title: 'Substitute into the plane', tex: `${t4(n[0])}(${t4(P[0])} + ${t4(d[0])}t) + ${t4(n[1])}(${t4(P[1])} + ${t4(d[1])}t) + ${t4(n[2])}(${t4(P[2])} + ${t4(d[2])}t) + ${t4(D)} = 0`, note: `This simplifies to ${tx(nd, 4)}t + ${tx(val, 4)} = 0.` },
      ];
      const answers = [];
      let X = null;
      if (abs(nd) < 1e-12 * len(n) * len(d)) {
        const inPlane = abs(val) < 1e-9 * Math.max(1, abs(D), len(n) * len(P));
        steps.push({ title: inPlane ? 'The line lies in the plane' : 'The line is parallel to the plane', text: inPlane ? 'n · d = 0 and the point satisfies the plane, so every point of the line is in the plane.' : `n · d = 0, so the line never meets the plane. Its distance from the plane is |n·A + D| ÷ |n| = ${tx(abs(val) / len(n), 6)}.` });
        answers.push({ label: 'Intersection', value: inPlane ? 'the whole line (it lies in the plane)' : 'none (parallel)', primary: true, copy: '' });
        if (!inPlane) answers.push({ label: 'Distance from the line to the plane', value: tx(abs(val) / len(n), 6), copy: '' });
      } else {
        const t = -val / nd; X = P.map((x, i) => x + t * d[i]);
        steps.push({ title: 'Solve for t', tex: `t = -\\frac{${t4(val)}}{${t4(nd)}} = ${t4(t)}` });
        steps.push({ title: 'Intersection point', tex: `${vT(P)} + ${t4(t)}${vT(d)} = ${vT(X)}`, note: `Check: ${tx(dot(n, X) + D, 6)} = 0.` });
        answers.push({ label: 'Intersection point', valueTex: vT(X), primary: true, copy: `(${X.map((x) => tx(x, 6)).join(', ')})` }, { label: 'Parameter t', value: tx(t, 6), copy: '' });
      }
      steps.push({ title: 'Angle between the line and the plane', texLines: ['\\sin\\varphi = \\frac{|\\vec{n}\\cdot\\vec{d}|}{|\\vec{n}|\\,|\\vec{d}|}', `\\sin\\varphi = \\frac{${t4(abs(nd))}}{${t4(len(n))}\\cdot${t4(len(d))}} \\Rightarrow \\varphi \\approx ${t4(phi)}^\\circ`], note: 'The angle with the plane is 90° minus the angle with the normal, which is why sine (not cosine) appears.' });
      answers.push({ label: 'Angle between line and plane', value: `${tx(phi, 4)}°`, primary: true, copy: '' });
      const S = Math.max(...P.map(abs), ...(X || P).map(abs), 4) * 1.2;
      const far = P.map((x, i) => x + d[i] * (S / len(d)) * 1.5), near = P.map((x, i) => x - d[i] * (S / len(d)) * 0.5);
      const foot = X || P;
      const e1 = len(cross(n, [1, 0, 0])) > 1e-9 ? cross(n, [1, 0, 0]) : cross(n, [0, 1, 0]), e2 = cross(n, e1);
      const u1 = e1.map((x) => (x / len(e1)) * S * 0.7), u2 = e2.map((x) => (x / len(e2)) * S * 0.7);
      const c0 = X || P.map((x, i) => x - (val / dot(n, n)) * n[i]);
      const quad = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([p, q]) => c0.map((x, i) => x + p * u1[i] + q * u2[i]));
      return { ok: true, final: { texLines: answers.filter((a) => a.primary).map((a) => (a.valueTex ? `${a.valueTex}` : `\\text{${a.label}: ${a.value}}`)) }, answers, visual: { svg: scene3d({ planes: [{ pts: quad }], segments: [{ a: near, b: far, cls: 'd-line2' }], points: [{ p: P, label: 'A' }, ...(X ? [{ p: X, label: 'X', cls: 'd-point2' }] : [])], size: S, title: 'Line and plane' }), caption: X ? 'Green: the line; X is where it crosses the shaded plane.' : 'The line does not cross the plane.' }, formula: ['t = -\\frac{\\vec{n}\\cdot A + D}{\\vec{n}\\cdot\\vec{d}} \\qquad \\sin\\varphi = \\frac{|\\vec{n}\\cdot\\vec{d}|}{|\\vec{n}||\\vec{d}|}'], steps, notes: [{ kind: 'info', text: 'Plane coefficients are entered as A, B, C, D for Ax + By + Cz + D = 0.' }] };
    }
    const p1 = vec(values, 'pl1', 'the first plane', 4, errors), p2 = vec(values, 'pl2', 'the second plane', 4, errors);
    if (errors.length) return { ok: false, errors };
    const n1 = p1.slice(0, 3), n2 = p2.slice(0, 3);
    if (len(n1) < 1e-12 || len(n2) < 1e-12) return { ok: false, errors: [{ field: len(n1) < 1e-12 ? 'pl1' : 'pl2', message: 'A, B and C cannot all be 0: that is not a plane.' }] };
    const cosT = abs(dot(n1, n2)) / (len(n1) * len(n2)), th = deg(acos(Math.min(1, cosT)));
    const dir = cross(n1, n2);
    const steps = [{ title: 'Normal vectors', tex: `\\vec{n}_1 = ${vT(n1)},\\quad \\vec{n}_2 = ${vT(n2)}`, note: 'The angle between two planes equals the angle between their normals.' }, { title: 'Angle between the planes', texLines: ['\\cos\\theta = \\frac{|\\vec{n}_1\\cdot\\vec{n}_2|}{|\\vec{n}_1|\\,|\\vec{n}_2|}', `\\cos\\theta = \\frac{${t4(abs(dot(n1, n2)))}}{${t4(len(n1))}\\cdot${t4(len(n2))}} \\approx ${t4(cosT)} \\Rightarrow \\theta \\approx ${t4(th)}^\\circ`] }];
    const answers = [{ label: 'Angle between the planes', value: `${tx(th, 4)}°`, primary: true, copy: '' }];
    let planes = [], segs = [];
    if (len(dir) < 1e-12 * len(n1) * len(n2)) {
      const k = len(n2) / len(n1) * Math.sign(dot(n1, n2) || 1), D2s = p2[3] / k;
      const dist = abs(D2s - p1[3]) / len(n1);
      const same = dist < 1e-12 * Math.max(1, abs(p1[3]));
      steps.push({ title: same ? 'The planes coincide' : 'The planes are parallel', text: same ? 'The equations are multiples of each other: they describe the same plane.' : `The normals are parallel. Scale the second equation to the same normal: D becomes ${tx(D2s, 4)}. The distance is |D₂ − D₁| ÷ |n₁| = ${tx(dist, 6)}.` });
      answers.push({ label: same ? 'Relationship' : 'Distance between the planes', value: same ? 'same plane' : tx(dist, 6), primary: true, copy: '' });
    } else {
      // a point on both planes: set the coordinate with the largest |dir| component to 0 and solve the 2×2 system
      const i0 = [0, 1, 2].reduce((m, i) => (abs(dir[i]) > abs(dir[m]) ? i : m), 0), [i1, i2] = [0, 1, 2].filter((i) => i !== i0);
      const det = n1[i1] * n2[i2] - n1[i2] * n2[i1];
      const u = (-p1[3] * n2[i2] + p2[3] * n1[i2]) / det, w = (-n1[i1] * p2[3] + n2[i1] * p1[3]) / det;
      const Pt = [0, 0, 0]; Pt[i1] = u; Pt[i2] = w;
      steps.push({ title: 'Direction of the line of intersection', tex: `\\vec{d} = \\vec{n}_1 \\times \\vec{n}_2 = ${vT(dir)}`, note: 'The line lies in both planes, so it is perpendicular to both normals.' });
      steps.push({ title: 'A point on both planes', tex: `${'xyz'[i0]} = 0 \\Rightarrow ${vT(Pt)}`, note: `Setting ${'xyz'[i0]} = 0 leaves two equations in ${'xyz'[i1]} and ${'xyz'[i2]}, solved by elimination. Check: ${tx(dot(n1, Pt) + p1[3], 6)} = 0 and ${tx(dot(n2, Pt) + p2[3], 6)} = 0.` });
      answers.push({ label: 'Line of intersection', valueTex: `(x, y, z) = ${vT(Pt)} + t${vT(dir)}`, primary: true, copy: '' });
      const S = Math.max(...Pt.map(abs), 4) * 1.4, ud = dir.map((x) => x / len(dir));
      const quadFor = (n) => { const e2 = cross(n, ud).map((x) => x / len(cross(n, ud))); return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([p, q]) => Pt.map((x, i) => x + p * ud[i] * S * 0.8 + q * e2[i] * S * 0.6)); };
      planes = [{ pts: quadFor(n1) }, { pts: quadFor(n2), color: 'accent-bright' }];
      segs = [{ a: Pt.map((x, i) => x - ud[i] * S), b: Pt.map((x, i) => x + ud[i] * S), cls: 'd-line3' }];
    }
    return { ok: true, final: { texLines: answers.map((a) => (a.valueTex ? a.valueTex : `\\text{${a.label}: ${a.value}}`)) }, answers, visual: planes.length ? { svg: scene3d({ planes, segments: segs, size: Math.max(5, ...segs.flatMap((s) => [...s.a, ...s.b].map(abs))), title: 'Two planes and their line of intersection' }), caption: 'Orange: the line where the two planes meet.' } : undefined, formula: ['\\cos\\theta = \\frac{|\\vec{n}_1\\cdot\\vec{n}_2|}{|\\vec{n}_1||\\vec{n}_2|} \\qquad \\vec{d} = \\vec{n}_1 \\times \\vec{n}_2'], steps, notes: [{ kind: 'info', text: 'The angle between planes is reported between 0° and 90° (the acute angle).' }] };
  },
};
