/**
 * Distance from a point P(x₀, y₀, z₀) to the plane Ax + By + Cz + D = 0:
 *   d = |Ax₀ + By₀ + Cz₀ + D| / √(A² + B² + C²)
 * and the foot of the perpendicular F = P − t(A, B, C) with t = (Ax₀ + By₀ + Cz₀ + D)/(A² + B² + C²).
 * Exact for fraction inputs (simplest radical form).
 */
import { validator, answer, sqrtFrac, fp, pointTex, fracAnswer } from '../lib/calc-kit.js';
import { simplifySqrt } from '../lib/exact.js';
import { linearTex } from '../lib/lines.js';
import { planePractice, planeDistanceExplore } from '../explore/analytic-practice.js';

/** Axonometric sketch: the plane as a shaded patch around F, the point P and the perpendicular PF. */
function sketch(P, Fp, n) {
  const len = Math.hypot(...n);
  const nh = n.map((x) => x / len);
  const ref = Math.abs(nh[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  let e1 = cr(nh, ref); const l1 = Math.hypot(...e1); e1 = e1.map((x) => x / l1);
  const e2 = cr(nh, e1);
  const d = Math.hypot(P[0] - Fp[0], P[1] - Fp[1], P[2] - Fp[2]);
  const s = Math.max(d, 1) * 1.1;
  const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([u, w]) => Fp.map((f, i) => f + s * (u * e1[i] + w * e2[i])));
  const pr = ([x, y, z]) => [(x - y) * 0.866, z - (x + y) * 0.5];
  const pts2 = [...corners, P, Fp].map(pr);
  const xs = pts2.map((p) => p[0]), ys = pts2.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const W = 360, H = 280, pad = 30, k = Math.min((W - 2 * pad) / (maxX - minX || 1), (H - 2 * pad) / (maxY - minY || 1));
  const T = ([x, y]) => [pad + (x - minX) * k + ((W - 2 * pad) - (maxX - minX) * k) / 2, H - pad - (y - minY) * k - ((H - 2 * pad) - (maxY - minY) * k) / 2];
  const r2 = (v) => Math.round(v * 10) / 10;
  const poly = corners.map(pr).map(T).map((p) => p.map(r2).join(',')).join(' ');
  const [px, py] = T(pr(P)), [fx, fy] = T(pr(Fp));
  const svg = `<svg class="diagram" viewBox="0 0 ${W} ${H}" role="img" aria-label="Plane, point and perpendicular"><title>Plane, point and perpendicular</title><polygon class="d-solid-face" points="${poly}"/><line class="d-perp" x1="${r2(px)}" y1="${r2(py)}" x2="${r2(fx)}" y2="${r2(fy)}"/><circle class="d-point" cx="${r2(px)}" cy="${r2(py)}" r="5"/><circle class="d-foot" cx="${r2(fx)}" cy="${r2(fy)}" r="5"/><text class="d-label" x="${r2(px + 8)}" y="${r2(py - 6)}">P</text><text class="d-label" x="${r2(fx + 8)}" y="${r2(fy + 14)}">F</text><text class="d-text-muted" x="${r2((px + fx) / 2 + 8)}" y="${r2((py + fy) / 2)}">d</text></svg>`;
  return /NaN|Infinity/.test(svg) ? '' : svg;
}

export const calculator = {
  id: 'point-to-plane-distance',
  practice: planePractice,
  explore: planeDistanceExplore,
  fields: [
    { name: 'A', label: 'A', type: 'text', placeholder: 'e.g. 2', row: 'plane', hint: 'Plane Ax + By + Cz + D = 0. Numbers or fractions such as 1/2.' },
    { name: 'B', label: 'B', type: 'text', placeholder: 'e.g. -1', row: 'plane' },
    { name: 'C', label: 'C', type: 'text', placeholder: 'e.g. 2', row: 'plane' },
    { name: 'D', label: 'D', type: 'text', placeholder: 'e.g. -3', row: 'plane' },
    { name: 'x0', label: 'x₀', type: 'text', placeholder: 'e.g. 1', row: 'pt' },
    { name: 'y0', label: 'y₀', type: 'text', placeholder: 'e.g. 4', row: 'pt' },
    { name: 'z0', label: 'z₀', type: 'text', placeholder: 'e.g. 5', row: 'pt' },
  ],
  examples: [
    { label: '2x − y + 2z − 3 = 0, P(1, 4, 5)', values: { A: '2', B: '-1', C: '2', D: '-3', x0: '1', y0: '4', z0: '5' } },
    { label: 'Plane z = 2, P(3, −1, 7)', values: { A: '0', B: '0', C: '1', D: '-2', x0: '3', y0: '-1', z0: '7' } },
    { label: 'x + y + z = 1, origin (radical answer)', values: { A: '1', B: '1', C: '1', D: '-1', x0: '0', y0: '0', z0: '0' } },
    { label: 'Point on the plane', values: { A: '1', B: '2', C: '3', D: '-6', x0: '1', y0: '1', z0: '1' } },
    { label: 'Invalid: A = B = C = 0', values: { A: '0', B: '0', C: '0', D: '5', x0: '1', y0: '1', z0: '1' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const [A, B, C, D, x0, y0, z0] = ['A', 'B', 'C', 'D', 'x0', 'y0', 'z0'].map((k) => v.frac(k, k.replace('0', '₀')));
    if (!v.ok()) return v.result();
    const n2 = A.pow(2).add(B.pow(2)).add(C.pow(2));
    if (n2.isZero()) return { ok: false, errors: [{ field: ['A', 'B', 'C'], message: 'A, B and C cannot all be 0: that is not a plane.' }] };
    const N = A.mul(x0).add(B.mul(y0)).add(C.mul(z0)).add(D);
    const dist = sqrtFrac(N.pow(2).div(n2), simplifySqrt);
    const t = N.div(n2);
    const F = [x0.sub(t.mul(A)), y0.sub(t.mul(B)), z0.sub(t.mul(C))];
    const nrm = sqrtFrac(n2, simplifySqrt);
    const plane = `${linearTex([[A, 'x'], [B, 'y'], [C, 'z'], [D, '']])} = 0`;
    const p3 = (q) => `\\left(${q.map((f) => f.toTex()).join(',\\ ')}\\right)`;
    const onPlane = A.mul(F[0]).add(B.mul(F[1])).add(C.mul(F[2])).add(D);
    const steps = [
      { title: 'Known values', texLines: [`\\text{Plane: } ${plane}`, `P = ${p3([x0, y0, z0])}`, `\\vec{n} = (A, B, C) = ${p3([A, B, C])}`], note: 'Read A, B, C and D with every term of the plane on one side and 0 on the other. (A, B, C) is the normal vector: it points straight out of the plane.' },
      { title: 'Formula', tex: 'd = \\frac{\\lvert A x_0 + B y_0 + C z_0 + D \\rvert}{\\sqrt{A^2 + B^2 + C^2}}', note: 'The shortest path from P to the plane runs along the normal, so the distance is the component of P’s offset in the normal direction.' },
      { title: 'Substitute the point into the plane’s left side', tex: `A x_0 + B y_0 + C z_0 + D = ${fp(A)}${fp(x0)} + ${fp(B)}${fp(y0)} + ${fp(C)}${fp(z0)} + ${fp(D)} = ${N.toTex()}`, note: N.isZero() ? 'The result is 0, so P satisfies the plane equation: it is on the plane.' : `The result is ${N.sign() > 0 ? 'positive' : 'negative'}, so P is on the side of the plane that the normal points ${N.sign() > 0 ? 'towards' : 'away from'}.` },
      { title: 'Length of the normal vector (A, B, C)', tex: `\\sqrt{A^2 + B^2 + C^2} = \\sqrt{${A.pow(2).toTex()} + ${B.pow(2).toTex()} + ${C.pow(2).toTex()}} = \\sqrt{${n2.toTex()}} = ${nrm.tex}`, note: 'Dividing by this length turns the value from the last step into an actual distance, so scaling the plane equation does not change the answer.' },
      { title: 'Divide', tex: `d = \\frac{|${N.toTex()}|}{${nrm.tex}} = ${dist.tex}${dist.exact ? '' : ` \\approx ${dist.value.toFixed(6).replace(/\.?0+$/, '')}`}`, note: dist.exact ? undefined : 'The exact answer is written in simplest radical form with a rational denominator.' },
      { title: 'Foot of the perpendicular', texLines: [`t = \\frac{A x_0 + B y_0 + C z_0 + D}{A^2 + B^2 + C^2} = \\frac{${N.toTex()}}{${n2.toTex()}} = ${t.toTex()}`, `F = P - t\\,(A, B, C) = ${p3([x0, y0, z0])} - ${fp(t)}${p3([A, B, C])} = ${p3(F)}`], note: 'Move from P along the normal by t normal-lengths; F is where that path meets the plane.' },
      { title: 'Check', texLines: [`${fp(A)}${fp(F[0])} + ${fp(B)}${fp(F[1])} + ${fp(C)}${fp(F[2])} + ${fp(D)} = ${onPlane.toTex()}\\ \\checkmark`, `|PF| = |t|\\,\\lVert\\vec{n}\\rVert = ${t.abs().toTex()} \\cdot ${nrm.tex} = ${dist.tex}\\ \\checkmark`], note: 'F satisfies the plane equation, and its distance from P equals d.' },
    ];
    const Pn = [x0, y0, z0].map((f) => f.toNumber()), Fn = F.map((f) => f.toNumber());
    return {
      ok: true,
      final: { tex: `d = ${dist.tex}${dist.exact ? '' : ` \\approx ${dist.value.toFixed(6).replace(/\.?0+$/, '')}`}` },
      answers: [
        answer('Distance d', dist.value, { primary: true, exactTex: dist.exact ? undefined : dist.tex, irrational: !dist.exact }),
        fracAnswer('Foot F: x', F[0]), fracAnswer('Foot F: y', F[1]), fracAnswer('Foot F: z', F[2]),
        { label: 'Side of the plane', value: N.isZero() ? 'on the plane' : N.sign() > 0 ? 'positive side (same as the normal)' : 'negative side', copy: '' },
      ],
      visual: { svg: sketch(Pn, Fn, [A, B, C].map((f) => f.toNumber())), caption: 'The shortest path from P to the plane is along the normal vector (A, B, C), meeting the plane at F.' },
      formula: ['d = \\frac{\\lvert A x_0 + B y_0 + C z_0 + D \\rvert}{\\sqrt{A^2 + B^2 + C^2}}'],
      steps,
      notes: N.isZero() ? [{ kind: 'info', text: 'The distance is 0 because P satisfies the plane equation: it lies on the plane.' }] : [{ kind: 'info', text: 'Write the plane with everything on one side (= 0) before reading A, B, C and D. The sign of the numerator tells you which side of the plane P is on.' }],
    };
  },
};
