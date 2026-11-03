/**
 * Tangent and normal lines to a conic in standard position (circle, parabola, ellipse, hyperbola).
 * The conic is written as Ax² + Cy² + Dx + Ey + F = 0 (no xy term). Three problem types:
 *   at a point on the curve  — tangent (A x₁)x + (C y₁)y + D(x + x₁)/2 + E(y + y₁)/2 + F = 0, and the normal
 *   with a given slope m      — y = mx + c is tangent when the quadratic in x has a double root
 *   from an outside point     — lines through the point whose slope makes the double root
 */
import { validator, tx } from '../lib/calc-kit.js';
import { plot } from '../lib/plot.js';
import { conicBranches, polyline, windowOf, lineSegment, tangentExplore, tangentPractice } from '../explore/analytic-new.js';

const { abs, sqrt, hypot } = Math;
const t4 = (x) => tx(abs(x) < 1e-12 ? 0 : x, 4);
const TYPES = [['circle', 'Circle (x − h)² + (y − k)² = r²'], ['parV', 'Parabola (x − h)² = 4p(y − k)'], ['parH', 'Parabola (y − k)² = 4p(x − h)'], ['ellipse', 'Ellipse (x − h)²/a² + (y − k)²/b² = 1'], ['hypH', 'Hyperbola (x − h)²/a² − (y − k)²/b² = 1'], ['hypV', 'Hyperbola (y − k)²/a² − (x − h)²/b² = 1']];

/** General coefficients and a drawing description for each conic. */
export function conicOf(type, h, k, a, b, p) {
  if (type === 'circle') return { A: 1, C: 1, D: -2 * h, E: -2 * k, F: h * h + k * k - a * a, draw: { type: 'ellipse', a, b: a, cx: h, cy: k } };
  if (type === 'parV') return { A: 1, C: 0, D: -2 * h, E: -4 * p, F: h * h + 4 * p * k, draw: { type: 'parabola', p, cx: h, cy: k, th: Math.PI / 2 } };
  if (type === 'parH') return { A: 0, C: 1, D: -4 * p, E: -2 * k, F: k * k + 4 * p * h, draw: { type: 'parabola', p, cx: h, cy: k, th: 0 } };
  if (type === 'ellipse') return { A: 1 / (a * a), C: 1 / (b * b), D: (-2 * h) / (a * a), E: (-2 * k) / (b * b), F: (h * h) / (a * a) + (k * k) / (b * b) - 1, draw: { type: 'ellipse', a, b, cx: h, cy: k } };
  if (type === 'hypH') return { A: 1 / (a * a), C: -1 / (b * b), D: (-2 * h) / (a * a), E: (2 * k) / (b * b), F: (h * h) / (a * a) - (k * k) / (b * b) - 1, draw: { type: 'hyperbola', a, b, cx: h, cy: k, th: 0 } };
  return { A: -1 / (b * b), C: 1 / (a * a), D: (2 * h) / (b * b), E: (-2 * k) / (a * a), F: (k * k) / (a * a) - (h * h) / (b * b) - 1, draw: { type: 'hyperbola', a, b, cx: h, cy: k, th: Math.PI / 2 } };
}
const Q = (g, x, y) => g.A * x * x + g.C * y * y + g.D * x + g.E * y + g.F;
/** Real roots of qa·z² + qb·z + qc = 0 (handles the linear case). */
function roots(qa, qb, qc, scale) {
  const eps = 1e-12 * Math.max(1, scale);
  if (abs(qa) < eps) return abs(qb) < eps ? [] : [-qc / qb];
  const d = qb * qb - 4 * qa * qc;
  if (d < -1e-10 * Math.max(1, qb * qb, abs(4 * qa * qc))) return [];
  const sd = sqrt(Math.max(0, d));
  return abs(sd) < 1e-12 ? [-qb / (2 * qa)] : [(-qb + sd) / (2 * qa), (-qb - sd) / (2 * qa)];
}
/** y = m x + c tangent: c satisfies −4AC c² + (4Cm(D + Em) − 4KE) c + (D + Em)² − 4KF = 0 with K = A + Cm². */
function interceptsForSlope(g, m) {
  const K = g.A + g.C * m * m;
  if (abs(K) < 1e-12) return { cs: [], parallelAxis: true };
  const qa = -4 * g.A * g.C, qb = 4 * g.C * m * (g.D + g.E * m) - 4 * K * g.E, qc = (g.D + g.E * m) ** 2 - 4 * K * g.F;
  return { cs: roots(qa, qb, qc, abs(qb) + abs(qc)), K };
}
/** Point where y = m x + c touches the conic. */
function touch(g, m, c) { const K = g.A + g.C * m * m; const x = -(2 * g.C * m * c + g.D + g.E * m) / (2 * K); return [x, m * x + c]; }
const lineTex = (m, c) => `y = ${t4(m)}x ${c < 0 ? '-' : '+'} ${t4(abs(c))}`;
const genTex = (a, b, c) => `${t4(a)}x ${b < 0 ? '-' : '+'} ${t4(abs(b))}y ${c < 0 ? '-' : '+'} ${t4(abs(c))} = 0`;

export const calculator = {
  id: 'tangent-normal-conic',
  explore: tangentExplore,
  practice: tangentPractice,
  fields: [
    { name: 'type', label: 'Conic', type: 'select', options: TYPES },
    { name: 'h', label: 'h (centre or vertex x)', type: 'number', placeholder: 'e.g. 0', row: 'hk' },
    { name: 'k', label: 'k (centre or vertex y)', type: 'number', placeholder: 'e.g. 0', row: 'hk' },
    { name: 'a', label: 'r or a', type: 'number', signed: false, placeholder: 'e.g. 5', showWhen: { type: ['circle', 'ellipse', 'hypH', 'hypV'] }, row: 'ab' },
    { name: 'b', label: 'b', type: 'number', signed: false, placeholder: 'e.g. 3', showWhen: { type: ['ellipse', 'hypH', 'hypV'] }, row: 'ab' },
    { name: 'p', label: 'p (vertex to focus)', type: 'number', placeholder: 'e.g. 2', showWhen: { type: ['parV', 'parH'] } },
    { name: 'mode', label: 'Find the tangent', type: 'radio', options: [['point', 'At a point on the curve'], ['slope', 'With a given slope'], ['external', 'From an outside point']] },
    { name: 'x1', label: 'Point x', type: 'number', placeholder: 'e.g. 3', showWhen: { mode: ['point', 'external'] }, row: 'pt' },
    { name: 'y1', label: 'Point y', type: 'number', placeholder: 'e.g. 4', showWhen: { mode: ['point', 'external'] }, row: 'pt' },
    { name: 'm', label: 'Slope m', type: 'number', placeholder: 'e.g. 2', showWhen: { mode: ['slope'] } },
  ],
  examples: [
    { label: 'Circle x² + y² = 25 at (3, 4)', values: { type: 'circle', h: '0', k: '0', a: '5', b: '', p: '', mode: 'point', x1: '3', y1: '4', m: '' } },
    { label: 'Ellipse x²/16 + y²/9 = 1 with slope 1', values: { type: 'ellipse', h: '0', k: '0', a: '4', b: '3', p: '', mode: 'slope', x1: '', y1: '', m: '1' } },
    { label: 'Parabola y² = 8x from the point (−2, 3)', values: { type: 'parH', h: '0', k: '0', a: '', b: '', p: '2', mode: 'external', x1: '-2', y1: '3', m: '' } },
    { label: 'Hyperbola x²/9 − y²/16 = 1 at (5, 16/3)', values: { type: 'hypH', h: '0', k: '0', a: '3', b: '4', p: '', mode: 'point', x1: '5', y1: '16/3', m: '' } },
    { label: 'Parabola x² = 4y at (2, 1)', values: { type: 'parV', h: '0', k: '0', a: '', b: '', p: '1', mode: 'point', x1: '2', y1: '1', m: '' } },
    { label: 'Not possible: the point is inside the circle', values: { type: 'circle', h: '0', k: '0', a: '5', b: '', p: '', mode: 'external', x1: '1', y1: '1', m: '' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const type = TYPES.some(([t]) => t === values.type) ? values.type : 'circle';
    const mode = ['point', 'slope', 'external'].includes(values.mode) ? values.mode : 'point';
    const h = v.number('h', 'h', { maxAbs: 1e6 }), k = v.number('k', 'k', { maxAbs: 1e6 });
    const needAB = ['circle', 'ellipse', 'hypH', 'hypV'].includes(type);
    const a = needAB ? v.number('a', type === 'circle' ? 'the radius' : 'a', { positive: true, maxAbs: 1e6 }) : 1;
    const b = ['ellipse', 'hypH', 'hypV'].includes(type) ? v.number('b', 'b', { positive: true, maxAbs: 1e6 }) : a;
    const p = type.startsWith('par') ? v.number('p', 'p', { nonzero: true, maxAbs: 1e6 }) : 1;
    let x1, y1, m;
    if (mode === 'slope') m = v.number('m', 'the slope', { maxAbs: 1e6 });
    else { const fx = v.frac('x1', 'x'), fy = v.frac('y1', 'y'); x1 = fx && fx.toNumber(); y1 = fy && fy.toNumber(); }
    if (!v.ok()) return v.result();
    const g = conicOf(type, h, k, a, b, p);
    const conicTex = { circle: `(x - ${t4(h)})^2 + (y - ${t4(k)})^2 = ${t4(a * a)}`, parV: `(x - ${t4(h)})^2 = ${t4(4 * p)}(y - ${t4(k)})`, parH: `(y - ${t4(k)})^2 = ${t4(4 * p)}(x - ${t4(h)})`, ellipse: `\\frac{(x - ${t4(h)})^2}{${t4(a * a)}} + \\frac{(y - ${t4(k)})^2}{${t4(b * b)}} = 1`, hypH: `\\frac{(x - ${t4(h)})^2}{${t4(a * a)}} - \\frac{(y - ${t4(k)})^2}{${t4(b * b)}} = 1`, hypV: `\\frac{(y - ${t4(k)})^2}{${t4(a * a)}} - \\frac{(x - ${t4(h)})^2}{${t4(b * b)}} = 1` }[type].replace(/- -/g, '+ ').replace(/- 0\)/g, ')').replace(/\(x \)/g, 'x').replace(/\(y \)/g, 'y');
    const steps = [{ title: 'The conic', texLines: [conicTex, `\\text{expanded: } ${genTex(0, 0, 0).replace('0x + 0y + 0 = 0', '')}${[[g.A, 'x^2'], [g.C, 'y^2'], [g.D, 'x'], [g.E, 'y'], [g.F, '']].filter(([c]) => abs(c) > 1e-12).map(([c, s], i) => `${i ? (c < 0 ? ' - ' : ' + ') : c < 0 ? '-' : ''}${t4(abs(c))}${s}`).join('')} = 0`], note: 'Writing the conic as Ax² + Cy² + Dx + Ey + F = 0 lets one method handle every type.' }];
    const lines = [], pts = [], answers = [];
    const scale = Math.max(abs(h), abs(k), a, b, abs(p), 1);
    if (mode === 'point') {
      const q = Q(g, x1, y1), gscale = abs(g.A * x1 * x1) + abs(g.C * y1 * y1) + abs(g.D * x1) + abs(g.E * y1) + abs(g.F) + 1;
      if (abs(q) > 1e-7 * gscale) return { ok: false, errors: [{ field: 'x1', message: `The point (${tx(x1, 4)}, ${tx(y1, 4)}) is not on this conic (substituting gives ${tx(q, 4)} instead of 0). Check the point, or choose “From an outside point”.` }] };
      const gx = 2 * g.A * x1 + g.D, gy = 2 * g.C * y1 + g.E; // gradient = normal direction
      const ta = gx / 2, tb = gy / 2, tc = (g.D * x1) / 2 + (g.E * y1) / 2 + g.F;
      steps.push({ title: 'Check the point is on the curve', tex: `\\text{substitute } (${t4(x1)}, ${t4(y1)}) \\Rightarrow 0\\ \\checkmark` });
      steps.push({ title: 'Tangent: replace x² by x₁x, y² by y₁y, x by (x + x₁)/2, y by (y + y₁)/2', texLines: [`${t4(g.A)}(${t4(x1)})x + ${t4(g.C)}(${t4(y1)})y + ${t4(g.D)}\\frac{x + ${t4(x1)}}{2} + ${t4(g.E)}\\frac{y + ${t4(y1)}}{2} + ${t4(g.F)} = 0`, genTex(ta, tb, tc)], note: 'This substitution rule gives the tangent at a point of any conic without calculus. It agrees with the derivative dy/dx found by implicit differentiation.' });
      const mt = abs(tb) < 1e-12 ? null : -ta / tb;
      steps.push({ title: 'Slope of the tangent', tex: mt === null ? '\\text{The tangent is vertical: } x = ' + t4(x1) : `m_T = -\\frac{${t4(ta)}}{${t4(tb)}} = ${t4(mt)}`, note: 'Implicit differentiation gives the same value: dy/dx = −(2Ax₁ + D)/(2Cy₁ + E).' });
      const mn = mt === null ? 0 : abs(mt) < 1e-12 ? null : -1 / mt;
      steps.push({ title: 'Normal line (perpendicular through the point)', texLines: [mn === null ? `x = ${t4(x1)}` : `m_N = ${mt === null ? '0' : `-\\frac{1}{m_T} = ${t4(mn)}`}`, mn === null ? '' : lineTex(mn, y1 - mn * x1)].filter(Boolean) });
      answers.push({ label: 'Tangent line', valueTex: mt === null ? `x = ${t4(x1)}` : lineTex(mt, y1 - mt * x1), primary: true, copy: mt === null ? `x = ${x1}` : `y = ${tx(mt, 6)}x + ${tx(y1 - mt * x1, 6)}` });
      answers.push({ label: 'Tangent (general form)', valueTex: genTex(ta, tb, tc), copy: '' });
      answers.push({ label: 'Normal line', valueTex: mn === null ? `x = ${t4(x1)}` : lineTex(mn, y1 - mn * x1), primary: true, copy: '' });
      answers.push({ label: 'Slope of the tangent', value: mt === null ? 'undefined (vertical)' : tx(mt, 6), copy: '' }, { label: 'Slope of the normal', value: mn === null ? 'undefined (vertical)' : tx(mn, 6), copy: '' });
      lines.push(['T', ta, tb, tc, 'd-line2'], ['N', tb, -ta, -(tb * x1 - ta * y1), 'd-line3']);
      pts.push({ x: x1, y: y1, label: 'P', cls: 'd-point2' });
    } else if (mode === 'slope') {
      const { cs, parallelAxis } = interceptsForSlope(g, m);
      steps.push({ title: 'Substitute y = mx + c', tex: `(${t4(g.A)} + ${t4(g.C)}m^2)x^2 + (2(${t4(g.C)})mc + ${t4(g.D)} + ${t4(g.E)}m)x + (${t4(g.C)}c^2 + ${t4(g.E)}c + ${t4(g.F)}) = 0`, note: 'A line is tangent when it meets the conic at exactly one point, so this quadratic in x must have a zero discriminant.' });
      if (parallelAxis || !cs.length) return { ok: false, errors: [{ field: 'm', message: parallelAxis ? `No line with slope ${tx(m, 4)} can be tangent to this conic: ${type.startsWith('par') ? 'it is parallel to the axis of the parabola, so it meets the curve only once without touching it' : 'it is parallel to an asymptote of the hyperbola'}.` : `No tangent to this conic has slope ${tx(m, 4)}${type.startsWith('hyp') ? ': for a hyperbola the slope must be steeper than the asymptotes' : ''}.` }] };
      steps.push({ title: 'Set the discriminant to zero and solve for c', tex: cs.map((c, i) => `c_{${i + 1}} = ${t4(c)}`).join(',\\quad ') });
      cs.forEach((c, i) => {
        const [tx1, ty1] = touch(g, m, c);
        answers.push({ label: `Tangent ${cs.length > 1 ? i + 1 : ''}`.trim(), valueTex: lineTex(m, c), primary: true, copy: `y = ${tx(m, 6)}x + ${tx(c, 6)}` }, { label: `Point of tangency ${cs.length > 1 ? i + 1 : ''}`.trim(), valueTex: `\\left(${t4(tx1)},\\ ${t4(ty1)}\\right)`, copy: '' });
        lines.push([`T${i + 1}`, m, -1, c, 'd-line2']);
        pts.push({ x: tx1, y: ty1, label: `T${cs.length > 1 ? i + 1 : ''}`, cls: 'd-point2' });
      });
      steps.push({ title: 'Points of tangency', tex: cs.map((c) => { const [u, w] = touch(g, m, c); return `(${t4(u)}, ${t4(w)})`; }).join(',\\quad '), note: 'At a double root the x-coordinate is −(coefficient of x) ÷ (2 × coefficient of x²).' });
    } else {
      const q = Q(g, x1, y1), gscale = abs(g.A * x1 * x1) + abs(g.C * y1 * y1) + abs(g.D * x1) + abs(g.E * y1) + abs(g.F) + 1;
      if (abs(q) < 1e-9 * gscale) return { ok: false, errors: [{ field: 'x1', message: 'This point is on the conic, so there is exactly one tangent through it. Choose “At a point on the curve”.' }] };
      // lines through (x1, y1): y = m(x − x1) + y1 → c = y1 − m x1; tangency gives a polynomial in m
      const poly = (cs) => cs; const mul = (P, R) => { const o = Array(P.length + R.length - 1).fill(0); P.forEach((pv, i) => R.forEach((rv, j) => { o[i + j] += pv * rv; })); return o; };
      const add = (...Ps) => { const L = Math.max(...Ps.map((P) => P.length)); return Array.from({ length: L }, (_, i) => Ps.reduce((s, P) => s + (P[i] || 0), 0)); };
      const sc = (P, s) => P.map((x) => x * s);
      const cPoly = poly([y1, -x1]); // c(m) = y1 − x1 m
      const L = add(sc(mul([0, 1], cPoly), 2 * g.C), [g.D, g.E]);
      const K = [g.A, 0, g.C];
      const M = add(sc(mul(cPoly, cPoly), g.C), sc(cPoly, g.E), [g.F]);
      const disc = add(mul(L, L), sc(mul(K, M), -4)); // degree ≤ 4 in m; the m³, m⁴ terms cancel
      const big = Math.max(...disc.map(abs), 1e-300);
      const [d0, d1, d2] = [disc[0] || 0, disc[1] || 0, disc[2] || 0];
      const ms = roots(abs(d2) < 1e-12 * big ? 0 : d2, d1, d0, big).filter(Number.isFinite);
      // vertical tangent x = x1?
      const vy = roots(g.C, g.E, g.A * x1 * x1 + g.D * x1 + g.F, scale);
      const vertical = abs(g.C) > 1e-12 && vy.length === 1;
      if (!ms.length && !vertical) return { ok: false, errors: [{ field: 'x1', message: 'No tangent line can be drawn from this point: it is inside the curve (for a hyperbola, between the branches in a region the tangents cannot reach).' }] };
      steps.push({ title: 'Lines through the point', tex: `y - ${t4(y1)} = m(x - ${t4(x1)}) \\Rightarrow c = ${t4(y1)} - ${t4(x1)}m`, note: 'Substitute this family of lines into the conic and require a double root (zero discriminant). That gives an equation for the slope m.' });
      steps.push({ title: 'Tangency condition in m', tex: `${t4(d2)}m^2 ${d1 < 0 ? '-' : '+'} ${t4(abs(d1))}m ${d0 < 0 ? '-' : '+'} ${t4(abs(d0))} = 0 \\Rightarrow ${ms.map((s, i) => `m_{${i + 1}} = ${t4(s)}`).join(',\\ ') || '\\text{no finite slope}'}` });
      ms.forEach((s, i) => {
        const c = y1 - s * x1, [tx1, ty1] = touch(g, s, c);
        answers.push({ label: `Tangent ${i + 1}`, valueTex: lineTex(s, c), primary: true, copy: `y = ${tx(s, 6)}x + ${tx(c, 6)}` }, { label: `Point of tangency ${i + 1}`, valueTex: `\\left(${t4(tx1)},\\ ${t4(ty1)}\\right)`, copy: '' });
        lines.push([`T${i + 1}`, s, -1, c, 'd-line2']); pts.push({ x: tx1, y: ty1, label: `T${i + 1}`, cls: 'd-point3' });
      });
      if (vertical) { answers.push({ label: `Tangent ${ms.length + 1} (vertical)`, valueTex: `x = ${t4(x1)}`, primary: true, copy: `x = ${x1}` }); lines.push(['V', 1, 0, -x1, 'd-line2']); pts.push({ x: x1, y: vy[0], label: 'T', cls: 'd-point3' }); steps.push({ title: 'Vertical tangent', tex: `x = ${t4(x1)}`, note: 'Vertical lines have no slope, so they are checked separately: x = x₁ meets the conic at a double point.' }); }
      pts.push({ x: x1, y: y1, label: 'P', cls: 'd-point2' });
      if (ms.length === 2) { const ang = Math.atan(abs((ms[1] - ms[0]) / (1 + ms[0] * ms[1]))) * 180 / Math.PI; answers.push({ label: 'Angle between the tangents', value: `${tx(abs(1 + ms[0] * ms[1]) < 1e-12 ? 90 : ang, 4)}°`, copy: '' }); }
    }
    const br = conicBranches({ ...g.draw, span: Math.max(6, scale * 2) });
    const win = windowOf([...br.flat(), ...pts.map((q) => [q.x, q.y])], 3, 0.1);
    const segs = [...br.flatMap((p) => polyline(p, 'd-line')), ...lines.map(([, A1, B1, C1, cls]) => lineSegment(A1, B1, C1, win, cls)).filter(Boolean)];
    return {
      ok: true,
      final: { texLines: answers.filter((x) => x.primary).map((x) => x.valueTex) },
      answers,
      visual: { svg: plot({ ...win, equal: true, width: 380, height: 320, title: 'Tangent lines to the conic', segments: segs, points: pts }), caption: mode === 'point' ? 'Green: the tangent at P. Orange: the normal, perpendicular to the tangent at P.' : 'Green: the tangent lines; each touches the conic at one point.' },
      formula: ['A x_1 x + C y_1 y + \\tfrac{D}{2}(x + x_1) + \\tfrac{E}{2}(y + y_1) + F = 0'],
      steps,
      notes: [{ kind: 'info', text: 'The normal at a point of a circle always passes through the centre; for a parabola the normal is used in reflection problems (the reflector property).' }],
    };
  },
};
