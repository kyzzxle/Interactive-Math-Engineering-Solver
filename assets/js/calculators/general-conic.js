/**
 * General second-degree equation Ax² + Bxy + Cy² + Dx + Ey + F = 0.
 *   1. Classify with the discriminant B² − 4AC (and the 3×3 determinant for degenerate cases).
 *   2. Rotate the axes by θ with tan 2θ = B/(A − C) to remove the xy term.
 *   3. Translate (complete the square) to reach standard form, then report the centre or vertex,
 *      a, b, c, eccentricity, foci, vertices, asymptotes or directrix in the original xy-coordinates.
 */
import { validator, answer, tx } from '../lib/calc-kit.js';
import { plot } from '../lib/plot.js';
import { conicBranches, polyline, windowOf, lineSegment, conicExplore, conicPractice } from '../explore/analytic-new.js';

const { cos, sin, atan2, sqrt, abs, PI } = Math;
const t4 = (x) => tx(Math.abs(x) < 1e-12 ? 0 : x, 4);
const sgn = (x) => (x < 0 ? '-' : '+');
const term = (c, v, first = false) => (Math.abs(c) < 1e-12 ? '' : `${first ? (c < 0 ? '-' : '') : ` ${sgn(c)} `}${Math.abs(Math.abs(c) - 1) < 1e-12 && v ? '' : t4(Math.abs(c))}${v}`);
const poly = (cs) => { const s = cs.map(([c, v], i) => term(c, v, i === 0 || cs.slice(0, i).every(([d]) => Math.abs(d) < 1e-12))).join('').trim(); return s || '0'; };
const pt = (x, y) => `\\left(${t4(x)},\\ ${t4(y)}\\right)`;

export function classify(A, B, C, D, E, F) {
  const disc = B * B - 4 * A * C;
  const det = A * (C * F - (E * E) / 4) - (B / 2) * ((B / 2) * F - (E * D) / 4) + (D / 2) * ((B / 2) * (E / 2) - C * (D / 2));
  return { disc, det };
}

export const calculator = {
  id: 'general-conic',
  explore: conicExplore,
  practice: conicPractice,
  fields: [
    { name: 'A', label: 'A (x²)', type: 'number', placeholder: 'e.g. 5', row: 'r1' },
    { name: 'B', label: 'B (xy)', type: 'number', placeholder: 'e.g. -6', row: 'r1' },
    { name: 'C', label: 'C (y²)', type: 'number', placeholder: 'e.g. 5', row: 'r1' },
    { name: 'D', label: 'D (x)', type: 'number', placeholder: 'e.g. 0', row: 'r2' },
    { name: 'E', label: 'E (y)', type: 'number', placeholder: 'e.g. 0', row: 'r2' },
    { name: 'F', label: 'F (constant)', type: 'number', placeholder: 'e.g. -8', row: 'r2', hint: 'For Ax² + Bxy + Cy² + Dx + Ey + F = 0. Enter 0 for missing terms.' },
  ],
  examples: [
    { label: 'Rotated ellipse 5x² − 6xy + 5y² − 8 = 0', values: { A: '5', B: '-6', C: '5', D: '0', E: '0', F: '-8' } },
    { label: 'Rectangular hyperbola xy = 4', values: { A: '0', B: '1', C: '0', D: '0', E: '0', F: '-4' } },
    { label: 'Rotated parabola x² + 2xy + y² − 4x + 4y = 0', values: { A: '1', B: '2', C: '1', D: '-4', E: '4', F: '0' } },
    { label: 'Shifted hyperbola 9x² − 4y² − 36x − 8y − 4 = 0', values: { A: '9', B: '0', C: '-4', D: '-36', E: '-8', F: '-4' } },
    { label: 'Circle x² + y² − 4x + 6y − 12 = 0', values: { A: '1', B: '0', C: '1', D: '-4', E: '6', F: '-12' } },
    { label: 'Degenerate: two lines x² − y² = 0', values: { A: '1', B: '0', C: '-1', D: '0', E: '0', F: '0' } },
    { label: 'Not a conic: no squared terms', values: { A: '0', B: '0', C: '0', D: '2', E: '3', F: '1' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const [A, B, C, D, E, F] = ['A', 'B', 'C', 'D', 'E', 'F'].map((k) => v.number(k, `coefficient ${k}`, { maxAbs: 1e6 }));
    if (!v.ok()) return v.result();
    if (A === 0 && B === 0 && C === 0) return { ok: false, errors: [{ field: 'A', message: 'A, B and C are all 0, so the equation is linear (a straight line), not a conic.' }] };
    const scale = Math.max(abs(A), abs(B), abs(C), 1e-300);
    const tol = 1e-10 * scale;
    const { disc, det } = classify(A, B, C, D, E, F);
    const eqTex = `${poly([[A, 'x^2'], [B, 'xy'], [C, 'y^2'], [D, 'x'], [E, 'y'], [F, '']])} = 0`;
    const steps = [{ title: 'The equation', tex: eqTex, note: 'Every conic (circle, ellipse, parabola, hyperbola) has an equation of this form. The squared and xy terms decide which one it is.' }];
    const dz = abs(disc) < 1e-10 * scale * scale;
    let kind = dz ? 'parabola' : disc < 0 ? 'ellipse' : 'hyperbola';
    steps.push({ title: 'Discriminant', texLines: ['\\Delta = B^2 - 4AC', `\\Delta = (${t4(B)})^2 - 4(${t4(A)})(${t4(C)}) = ${t4(disc)}`], note: dz ? 'Δ = 0: a parabola (or a degenerate pair of parallel lines).' : disc < 0 ? 'Δ < 0: an ellipse or circle (or a single point / no points).' : 'Δ > 0: a hyperbola (or a degenerate pair of crossing lines).' });
    // rotation
    let th = abs(B) < tol ? 0 : 0.5 * atan2(B, A - C);
    if (th < 0) th += PI / 2;
    const c = cos(th), s = sin(th);
    const A1 = A * c * c + B * s * c + C * s * s, C1 = A * s * s - B * s * c + C * c * c, D1 = D * c + E * s, E1 = -D * s + E * c;
    const back = (X, Y) => [X * c - Y * s, X * s + Y * c];
    if (abs(B) >= tol) {
      steps.push({ title: 'Angle of rotation', texLines: ['\\tan 2\\theta = \\frac{B}{A - C}', abs(A - C) < tol ? `A = C \\Rightarrow 2\\theta = 90^\\circ,\\ \\theta = 45^\\circ` : `\\tan 2\\theta = \\frac{${t4(B)}}{${t4(A - C)}} \\Rightarrow \\theta \\approx ${t4((th * 180) / PI)}^\\circ`], note: 'Rotating the axes by θ removes the xy term, so the conic lines up with the new X′ and Y′ axes.' });
      steps.push({ title: 'Rotate: x = x′cos θ − y′sin θ, y = x′sin θ + y′cos θ', texLines: [`A' = A\\cos^2\\theta + B\\sin\\theta\\cos\\theta + C\\sin^2\\theta \\approx ${t4(A1)}`, `C' = A\\sin^2\\theta - B\\sin\\theta\\cos\\theta + C\\cos^2\\theta \\approx ${t4(C1)}`, `D' = D\\cos\\theta + E\\sin\\theta \\approx ${t4(D1)},\\quad E' = -D\\sin\\theta + E\\cos\\theta \\approx ${t4(E1)}`, `${poly([[A1, "x'^2"], [C1, "y'^2"], [D1, "x'"], [E1, "y'"], [F, '']])} = 0`], note: `Check: A′ + C′ = A + C = ${t4(A + C)} and the discriminant is unchanged.` });
    } else steps.push({ title: 'No rotation needed', text: 'B = 0, so the axes of the conic are already parallel to the x- and y-axes.' });
    const answers = [{ label: 'Type of conic', value: '', primary: true, copy: '' }, answer('Discriminant B² − 4AC', disc)];
    if (abs(B) >= tol) answers.push(answer('Rotation angle θ', (th * 180) / PI, { unit: '°', decimals: 4 }));
    let visual, final, notes = [];
    const mapPt = (X, Y) => back(X, Y);
    if (kind !== 'parabola') {
      const X0 = -D1 / (2 * A1), Y0 = -E1 / (2 * C1), F1 = F - A1 * X0 * X0 - C1 * Y0 * Y0;
      const [hx, hy] = mapPt(X0, Y0);
      steps.push({ title: 'Complete the square (translate to the centre)', texLines: [`${t4(A1)}\\left(x' ${sgn(-X0)} ${t4(abs(X0))}\\right)^2 + ${t4(C1)}\\left(y' ${sgn(-Y0)} ${t4(abs(Y0))}\\right)^2 = ${t4(-F1)}`], note: `The centre is (${tx(X0, 4)}, ${tx(Y0, 4)}) in the rotated axes, which is (${tx(hx, 4)}, ${tx(hy, 4)}) in the original axes.` });
      const R1 = -F1 / A1, R2 = -F1 / C1;
      if (abs(F1) < 1e-10 * Math.max(1, abs(F))) {
        answers[0].value = kind === 'ellipse' ? 'degenerate: a single point' : 'degenerate: two intersecting lines';
        steps.push({ title: 'Degenerate conic', text: kind === 'ellipse' ? `The right-hand side is 0 and both squared terms have the same sign, so only the centre (${tx(hx, 4)}, ${tx(hy, 4)}) satisfies the equation.` : 'The right-hand side is 0 and the squared terms have opposite signs, so the equation factors into two straight lines through the centre.' });
        if (kind === 'hyperbola') { const k = sqrt(-A1 / C1); const m1 = atan2(k, 1) + th, m2 = atan2(-k, 1) + th; answers.push({ label: 'The two lines pass through', valueTex: pt(hx, hy), copy: '' }, answer('Direction angle of line 1', ((m1 * 180) / PI + 360) % 180, { unit: '°', decimals: 4 }), answer('Direction angle of line 2', ((m2 * 180) / PI + 360) % 180, { unit: '°', decimals: 4 })); }
        final = { text: answers[0].value };
      } else if (kind === 'ellipse' && (R1 < 0 || R2 < 0)) {
        answers[0].value = 'imaginary ellipse (no real points)';
        steps.push({ title: 'No real graph', text: 'After completing the square, a sum of squares (with positive coefficients) would have to equal a negative number. No real point satisfies the equation.' });
        final = { text: answers[0].value };
      } else {
        const circle = kind === 'ellipse' && abs(A1 - C1) < 1e-10 * scale;
        let a, b, alongX;
        if (kind === 'ellipse') { alongX = R1 >= R2; a = sqrt(Math.max(R1, R2)); b = sqrt(Math.min(R1, R2)); }
        else { alongX = R1 > 0; a = sqrt(alongX ? R1 : R2); b = sqrt(alongX ? -R2 : -R1); }
        const cf = kind === 'ellipse' ? sqrt(Math.max(0, a * a - b * b)) : sqrt(a * a + b * b);
        const e = cf / a;
        const axisAng = th + (alongX ? 0 : PI / 2);
        const ux = cos(axisAng), uy = sin(axisAng);
        answers[0].value = circle ? 'circle' : kind;
        const XY = alongX ? ["x'", "y'"] : ["y'", "x'"];
        steps.push({ title: 'Standard form', tex: kind === 'ellipse' ? `\\frac{(${XY[0]} - ${t4(alongX ? X0 : Y0)})^2}{${t4(a * a)}} + \\frac{(${XY[1]} - ${t4(alongX ? Y0 : X0)})^2}{${t4(b * b)}} = 1` : `\\frac{(${XY[0]} - ${t4(alongX ? X0 : Y0)})^2}{${t4(a * a)}} - \\frac{(${XY[1]} - ${t4(alongX ? Y0 : X0)})^2}{${t4(b * b)}} = 1`, note: 'Divide both sides by the constant so the right-hand side is 1. The larger denominator (ellipse) or the positive term (hyperbola) gives the main axis.' });
        steps.push({ title: kind === 'ellipse' ? 'Axes, foci and eccentricity' : 'Axes, foci, eccentricity and asymptotes', texLines: [`a = ${t4(a)},\\quad b = ${t4(b)},\\quad c = \\sqrt{a^2 ${kind === 'ellipse' ? '-' : '+'} b^2} = ${t4(cf)}`, `e = \\frac{c}{a} = ${t4(e)}`] });
        answers.push({ label: 'Centre', valueTex: pt(hx, hy), copy: `(${tx(hx, 6)}, ${tx(hy, 6)})` }, answer('Semi-major / transverse axis a', a), answer(kind === 'ellipse' ? 'Semi-minor axis b' : 'Conjugate semi-axis b', b), answer('Focal distance c', cf), answer('Eccentricity e', e));
        if (!circle) {
          answers.push({ label: 'Foci', valueTex: `${pt(hx + cf * ux, hy + cf * uy)},\\ ${pt(hx - cf * ux, hy - cf * uy)}`, copy: '' });
          answers.push({ label: 'Vertices', valueTex: `${pt(hx + a * ux, hy + a * uy)},\\ ${pt(hx - a * ux, hy - a * uy)}`, copy: '' });
        }
        if (kind === 'hyperbola') {
          const ang1 = axisAng + Math.atan(b / a), ang2 = axisAng - Math.atan(b / a);
          const sl = (g) => (abs(cos(g)) < 1e-12 ? null : Math.tan(g));
          const [s1, s2] = [sl(ang1), sl(ang2)];
          answers.push({ label: 'Asymptote slopes', value: [s1, s2].map((x) => (x === null ? 'vertical' : tx(x, 6))).join(' and '), copy: '' });
        }
        const br = conicBranches({ type: kind === 'ellipse' ? 'ellipse' : 'hyperbola', a, b, cx: hx, cy: hy, th: axisAng, span: Math.max(4, a * 2) });
        const all = br.flat();
        const win = windowOf(all.concat([[hx, hy]]), 2);
        const segs = br.flatMap((p) => polyline(p, 'd-line'));
        const axisSegs = [{ x1: hx - 30 * cos(th), y1: hy - 30 * sin(th), x2: hx + 30 * cos(th), y2: hy + 30 * sin(th), cls: 'd-hidden' }, { x1: hx + 30 * sin(th), y1: hy - 30 * cos(th), x2: hx - 30 * sin(th), y2: hy + 30 * cos(th), cls: 'd-hidden' }];
        const asym = kind === 'hyperbola' ? [axisAng + Math.atan(b / a), axisAng - Math.atan(b / a)].map((g) => lineSegment(sin(g), -cos(g), -(sin(g) * hx - cos(g) * hy), win, 'd-perp')).filter(Boolean) : [];
        visual = { svg: plot({ ...win, equal: true, width: 380, height: 320, title: `The ${answers[0].value}`, segments: [...axisSegs, ...asym, ...segs], points: [{ x: hx, y: hy, label: 'centre', cls: 'd-point2' }, ...(circle ? [] : [[1, -1].map((k) => ({ x: hx + k * cf * ux, y: hy + k * cf * uy, label: 'F', cls: 'd-point3' }))].flat())] }), caption: `Dashed: the rotated axes (θ ≈ ${tx((th * 180) / PI, 2)}°)${kind === 'hyperbola' ? ' and the asymptotes' : ''}. F marks the foci.` };
        final = { texLines: [`\\text{${answers[0].value}},\\ \\text{centre } ${pt(hx, hy)}`, `a = ${t4(a)},\\ b = ${t4(b)},\\ e = ${t4(e)}`] };
      }
    } else {
      // parabola: one of A', C' is (numerically) zero
      const vertical = abs(A1) > abs(C1); // A' x'^2 + D'x' + E'y' + F = 0  -> opens along y'
      const sq = vertical ? A1 : C1, lin = vertical ? E1 : D1, sqLin = vertical ? D1 : E1;
      const u0 = -sqLin / (2 * sq), rest = F - sq * u0 * u0;
      if (abs(lin) < 1e-10 * scale) {
        answers[0].value = rest / sq < 0 ? 'degenerate: two parallel lines' : abs(rest) < 1e-12 ? 'degenerate: one line (counted twice)' : 'no real points (imaginary parallel lines)';
        steps.push({ title: 'Degenerate case', text: `There is no first-degree term in the other variable, so the equation reduces to ${vertical ? "x'" : "y'"} = constant: ${answers[0].value}.` });
        final = { text: answers[0].value };
      } else {
        const w0 = -rest / lin, p = -lin / (4 * sq);
        const [VX, VY] = vertical ? [u0, w0] : [w0, u0];
        const [vx, vy] = mapPt(VX, VY);
        const axisAng = th + (vertical ? PI / 2 : 0);
        const ux = cos(axisAng), uy = sin(axisAng);
        const [fx, fy] = [vx + p * ux, vy + p * uy];
        // directrix: points Q with (Q − V)·u = −p  ->  ux x + uy y = ux vx + uy vy − p
        const dc = ux * vx + uy * vy - p;
        steps.push({ title: 'Complete the square', texLines: [`${t4(sq)}\\left(${vertical ? "x'" : "y'"} ${sgn(-u0)} ${t4(abs(u0))}\\right)^2 = ${t4(-lin)}\\left(${vertical ? "y'" : "x'"} ${sgn(-w0)} ${t4(abs(w0))}\\right)`, `\\left(${vertical ? "x'" : "y'"} - ${t4(u0)}\\right)^2 = 4(${t4(p)})\\left(${vertical ? "y'" : "x'"} - ${t4(w0)}\\right)`], note: 'This is the standard form (X)² = 4pY of a parabola, so p is the distance from the vertex to the focus.' });
        steps.push({ title: 'Vertex, focus and directrix in the original axes', texLines: [`V = ${pt(vx, vy)},\\quad F = ${pt(fx, fy)}`, `\\text{directrix: } ${t4(ux)}x ${sgn(uy)} ${t4(abs(uy))}y = ${t4(dc)}`] });
        answers[0].value = 'parabola';
        answers.push({ label: 'Vertex', valueTex: pt(vx, vy), copy: `(${tx(vx, 6)}, ${tx(vy, 6)})` }, answer('p (vertex to focus)', abs(p)), { label: 'Focus', valueTex: pt(fx, fy), copy: '' }, { label: 'Directrix', valueTex: `${t4(ux)}x ${sgn(uy)} ${t4(abs(uy))}y = ${t4(dc)}`, copy: '' }, answer('Latus rectum length', abs(4 * p)), answer('Eccentricity e', 1));
        const br = conicBranches({ type: 'parabola', p, cx: vx, cy: vy, th: axisAng, span: Math.max(6, abs(p) * 6) });
        // Centre the view a little inside the opening so the vertex is not pushed into a corner.
        const half = Math.max(3, 5 * abs(p)), mx = vx + ux * p * 3, my = vy + uy * p * 3;
        const win = { x: [mx - half, mx + half], y: [my - half * 0.8, my + half * 0.8] };
        const dir = lineSegment(ux, uy, -dc, win, 'd-perp');
        visual = { svg: plot({ ...win, equal: true, width: 380, height: 320, title: 'The parabola', segments: [...br.flatMap((b) => polyline(b)), ...(dir ? [dir] : [])], points: [{ x: vx, y: vy, label: 'V', cls: 'd-point2' }, { x: fx, y: fy, label: 'F', cls: 'd-point3' }] }), caption: 'V is the vertex, F the focus; the dashed line is the directrix. Every point of the parabola is equally far from F and from the directrix.' };
        final = { texLines: [`\\text{parabola},\\ V = ${pt(vx, vy)}`, `p = ${t4(p)},\\ F = ${pt(fx, fy)}`] };
      }
    }
    if (abs(det) < 1e-10 * scale ** 3 && !/degenerate|no real|imaginary/.test(answers[0].value)) notes.push({ kind: 'warn', text: 'The determinant of the coefficient matrix is (almost) 0, which signals a degenerate conic; small rounding in the inputs may hide it.' });
    answers[0].copy = `Type: ${answers[0].value}`;
    notes.push({ kind: 'info', text: 'θ is measured anticlockwise from the x-axis to the new x′-axis. Coordinates from rotated axes are converted back with x = x′cos θ − y′sin θ, y = x′sin θ + y′cos θ.' });
    return { ok: true, final, answers, visual, formula: ['\\Delta = B^2 - 4AC \\qquad \\tan 2\\theta = \\frac{B}{A - C}'], steps, notes };
  },
};
