/**
 * Division of a line segment (section formula), with exact fractions:
 *   internal ratio r₁ : r₂   P = (r₂A + r₁B)/(r₁ + r₂)
 *   external ratio r₁ : r₂   P = (r₁B − r₂A)/(r₁ − r₂)
 *   ratio from a point P on line AB, and the centroid G = (A + B + C)/3 of a triangle.
 */
import { validator, answer, fracAnswer, pointTex } from '../lib/calc-kit.js';
import { Frac } from '../lib/fraction.js';
import { plot } from '../lib/plot.js';
import { divisionExplore, divisionPractice } from '../explore/analytic-new.js';

const F = (x) => Frac.of(x);
const ptT = (x, y) => pointTex(x, y);
const fT = (f) => (f.sign() < 0 ? `(${f.toTex()})` : f.toTex());

function picture(pts, segs, extend = false) {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const lo = (a) => Math.min(...a), hi = (a) => Math.max(...a);
  const span = Math.max(hi(xs) - lo(xs), hi(ys) - lo(ys), 2), pad = span * 0.25;
  return plot({ x: [lo(xs) - pad, hi(xs) + pad], y: [lo(ys) - pad, hi(ys) + pad], equal: true, width: 380, height: 300, title: 'Points on the coordinate plane', segments: segs.map((s) => ({ ...s, cls: s.cls || 'd-line' })), points: pts, includeZero: false, ...(extend ? {} : {}) });
}

export const calculator = {
  id: 'division-of-line-segment',
  explore: divisionExplore,
  practice: divisionPractice,
  fields: [
    { name: 'mode', label: 'What do you want to find?', type: 'radio', options: [['ratio', 'Point dividing AB in a ratio'], ['find', 'Ratio in which P divides AB'], ['centroid', 'Centroid of a triangle']] },
    { name: 'x1', label: 'A: x₁', type: 'number', placeholder: 'e.g. -2', row: 'A' },
    { name: 'y1', label: 'A: y₁', type: 'number', placeholder: 'e.g. 3', row: 'A' },
    { name: 'x2', label: 'B: x₂', type: 'number', placeholder: 'e.g. 8', row: 'B' },
    { name: 'y2', label: 'B: y₂', type: 'number', placeholder: 'e.g. -2', row: 'B' },
    { name: 'r1', label: 'Ratio r₁ (from A)', type: 'number', signed: false, placeholder: 'e.g. 2', showWhen: { mode: ['ratio'] }, row: 'r' },
    { name: 'r2', label: 'Ratio r₂ (to B)', type: 'number', signed: false, placeholder: 'e.g. 3', showWhen: { mode: ['ratio'] }, row: 'r' },
    { name: 'kind', label: 'Division', type: 'select', options: [['internal', 'Internal (P between A and B)'], ['external', 'External (P outside AB)']], showWhen: { mode: ['ratio'] } },
    { name: 'px', label: 'P: x', type: 'number', placeholder: 'e.g. 2', showWhen: { mode: ['find'] }, row: 'P' },
    { name: 'py', label: 'P: y', type: 'number', placeholder: 'e.g. 1', showWhen: { mode: ['find'] }, row: 'P' },
    { name: 'x3', label: 'C: x₃', type: 'number', placeholder: 'e.g. 3', showWhen: { mode: ['centroid'] }, row: 'C' },
    { name: 'y3', label: 'C: y₃', type: 'number', placeholder: 'e.g. 7', showWhen: { mode: ['centroid'] }, row: 'C' },
  ],
  examples: [
    { label: 'A(−2, 3), B(8, −2) in the ratio 2 : 3', values: { mode: 'ratio', x1: '-2', y1: '3', x2: '8', y2: '-2', r1: '2', r2: '3', kind: 'internal' } },
    { label: 'External division 3 : 1 of A(1, 2), B(4, 5)', values: { mode: 'ratio', x1: '1', y1: '2', x2: '4', y2: '5', r1: '3', r2: '1', kind: 'external' } },
    { label: 'Trisection point nearer A: ratio 1 : 2', values: { mode: 'ratio', x1: '0', y1: '0', x2: '9', y2: '6', r1: '1', r2: '2', kind: 'internal' } },
    { label: 'In what ratio does P(2, 1) divide A(−2, 3), B(8, −2)?', values: { mode: 'find', x1: '-2', y1: '3', x2: '8', y2: '-2', px: '2', py: '1' } },
    { label: 'Centroid of A(0, 0), B(6, 0), C(3, 9)', values: { mode: 'centroid', x1: '0', y1: '0', x2: '6', y2: '0', x3: '3', y3: '9' } },
    { label: 'Not possible: P is not on line AB', values: { mode: 'find', x1: '0', y1: '0', x2: '4', y2: '4', px: '1', py: '3' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const mode = ['ratio', 'find', 'centroid'].includes(values.mode) ? values.mode : 'ratio';
    const x1 = v.frac('x1', 'x₁'), y1 = v.frac('y1', 'y₁'), x2 = v.frac('x2', 'x₂'), y2 = v.frac('y2', 'y₂');
    if (!v.ok()) return v.result();
    const A = [x1, y1], B = [x2, y2];
    const n = (f) => f.toNumber();
    if (mode === 'centroid') {
      const x3 = v.frac('x3', 'x₃'), y3 = v.frac('y3', 'y₃');
      if (!v.ok()) return v.result();
      const area2 = x2.sub(x1).mul(y3.sub(y1)).sub(x3.sub(x1).mul(y2.sub(y1)));
      if (area2.isZero()) return { ok: false, errors: [{ field: 'x3', message: 'The three points are on one straight line, so they do not form a triangle.' }] };
      const gx = x1.add(x2).add(x3).div(3), gy = y1.add(y2).add(y3).div(3);
      const mx = x2.add(x3).div(2), my = y2.add(y3).div(2);
      return {
        ok: true,
        final: { tex: `G = ${ptT(gx, gy)}` },
        answers: [
          { label: 'Centroid G', valueTex: ptT(gx, gy), primary: true, copy: `G = (${gx}, ${gy})` },
          { label: 'Midpoint of BC (end of the median from A)', valueTex: ptT(mx, my), copy: `(${mx}, ${my})` },
          fracAnswer('Area of the triangle', area2.abs().div(2)),
        ],
        visual: { svg: picture([{ x: n(x1), y: n(y1), label: 'A' }, { x: n(x2), y: n(y2), label: 'B' }, { x: n(x3), y: n(y3), label: 'C' }, { x: n(gx), y: n(gy), label: 'G', cls: 'd-point2' }, { x: n(mx), y: n(my), label: 'M', cls: 'd-point3' }], [{ x1: n(x1), y1: n(y1), x2: n(x2), y2: n(y2) }, { x1: n(x2), y1: n(y2), x2: n(x3), y2: n(y3) }, { x1: n(x3), y1: n(y3), x2: n(x1), y2: n(y1) }, { x1: n(x1), y1: n(y1), x2: n(mx), y2: n(my), cls: 'd-perp' }]), caption: 'The centroid G is where the three medians meet. It lies two thirds of the way along each median from the vertex (dashed: the median from A to the midpoint M of BC).' },
        formula: ['G = \\left(\\frac{x_1 + x_2 + x_3}{3},\\ \\frac{y_1 + y_2 + y_3}{3}\\right)'],
        steps: [
          { title: 'Known vertices', tex: `A${ptT(x1, y1)},\\quad B${ptT(x2, y2)},\\quad C${ptT(x3, y3)}`, note: 'The centroid is the balance point of the triangle: the average of its three vertices.' },
          { title: 'Average the x-coordinates', tex: `\\bar{x} = \\frac{${fT(x1)} + ${fT(x2)} + ${fT(x3)}}{3} = \\frac{${x1.add(x2).add(x3).toTex()}}{3} = ${gx.toTex()}` },
          { title: 'Average the y-coordinates', tex: `\\bar{y} = \\frac{${fT(y1)} + ${fT(y2)} + ${fT(y3)}}{3} = \\frac{${y1.add(y2).add(y3).toTex()}}{3} = ${gy.toTex()}` },
          { title: 'Check with the median from A', texLines: [`M_{BC} = ${ptT(mx, my)}`, `G = \\frac{1 \\cdot A + 2 \\cdot M}{3} = ${ptT(x1.add(mx.mul(2)).div(3), y1.add(my.mul(2)).div(3))}`], note: 'The centroid divides every median in the ratio 2 : 1 from the vertex, so it is the point dividing AM internally in the ratio 2 : 1.' },
        ],
        notes: [{ kind: 'info', text: 'The centroid is also the centre of mass of a uniform triangular plate.' }],
      };
    }
    if (x1.eq(x2) && y1.eq(y2)) return { ok: false, errors: [{ field: 'x2', message: 'A and B are the same point, so there is no segment to divide.' }] };
    const dx = x2.sub(x1), dy = y2.sub(y1);
    if (mode === 'ratio') {
      const r1 = v.frac('r1', 'r₁'), r2 = v.frac('r2', 'r₂');
      if (!v.ok()) return v.result();
      if (r1.sign() <= 0 || r2.sign() <= 0) return { ok: false, errors: [{ field: 'r1', message: 'Both parts of the ratio must be greater than 0 (choose internal or external division separately).' }] };
      const external = values.kind === 'external';
      if (external && r1.eq(r2)) return { ok: false, errors: [{ field: 'r2', message: 'A 1 : 1 external division is impossible: the point would be infinitely far away. Choose unequal ratio parts.' }] };
      const den = external ? r1.sub(r2) : r1.add(r2);
      const px = external ? r1.mul(x2).sub(r2.mul(x1)).div(den) : r2.mul(x1).add(r1.mul(x2)).div(den);
      const py = external ? r1.mul(y2).sub(r2.mul(y1)).div(den) : r2.mul(y1).add(r1.mul(y2)).div(den);
      const t = external ? r1.div(den) : r1.div(den); // P = A + t(B − A)
      const AP = Math.hypot(n(px) - n(x1), n(py) - n(y1)), PB = Math.hypot(n(x2) - n(px), n(y2) - n(py));
      const sign = external ? '-' : '+';
      return {
        ok: true,
        final: { tex: `P = ${ptT(px, py)}` },
        answers: [
          { label: 'Point P', valueTex: ptT(px, py), primary: true, copy: `P = (${px}, ${py})` },
          fracAnswer('Fraction of the way from A to B', t),
          answer('Distance AP', AP),
          answer('Distance PB', PB),
        ],
        visual: { svg: picture([{ x: n(x1), y: n(y1), label: 'A' }, { x: n(x2), y: n(y2), label: 'B' }, { x: n(px), y: n(py), label: 'P', cls: 'd-point2' }], [{ x1: n(x1), y1: n(y1), x2: n(x2), y2: n(y2) }, ...(external ? [{ x1: n(t.toNumber() > 1 ? x2 : x1), y1: n(t.toNumber() > 1 ? y2 : y1), x2: n(px), y2: n(py), cls: 'd-perp' }] : [])]), caption: external ? 'For an external division, P lies on line AB extended beyond the segment (dashed), with AP : PB = r₁ : r₂.' : 'P lies between A and B, with AP : PB = r₁ : r₂.' },
        formula: [external ? 'P = \\left(\\frac{r_1 x_2 - r_2 x_1}{r_1 - r_2},\\ \\frac{r_1 y_2 - r_2 y_1}{r_1 - r_2}\\right)' : 'P = \\left(\\frac{r_2 x_1 + r_1 x_2}{r_1 + r_2},\\ \\frac{r_2 y_1 + r_1 y_2}{r_1 + r_2}\\right)'],
        steps: [
          { title: 'Known values', tex: `A${ptT(x1, y1)},\\quad B${ptT(x2, y2)},\\quad r_1 : r_2 = ${r1.toTex()} : ${r2.toTex()}`, note: `r₁ is measured from A and r₂ towards B, so AP : PB = ${r1} : ${r2}. ${external ? 'External division puts P on the extension of AB.' : 'Internal division puts P between A and B.'}` },
          { title: 'x-coordinate', texLines: [external ? 'x = \\frac{r_1 x_2 - r_2 x_1}{r_1 - r_2}' : 'x = \\frac{r_2 x_1 + r_1 x_2}{r_1 + r_2}', `x = \\frac{${fT(external ? r1 : r2)}(${(external ? x2 : x1).toTex()}) ${sign} ${fT(external ? r2 : r1)}(${(external ? x1 : x2).toTex()})}{${r1.toTex()} ${sign} ${r2.toTex()}} = \\frac{${px.mul(den).toTex()}}{${den.toTex()}} = ${px.toTex()}`] },
          { title: 'y-coordinate', texLines: [external ? 'y = \\frac{r_1 y_2 - r_2 y_1}{r_1 - r_2}' : 'y = \\frac{r_2 y_1 + r_1 y_2}{r_1 + r_2}', `y = \\frac{${fT(external ? r1 : r2)}(${(external ? y2 : y1).toTex()}) ${sign} ${fT(external ? r2 : r1)}(${(external ? y1 : y2).toTex()})}{${r1.toTex()} ${sign} ${r2.toTex()}} = \\frac{${py.mul(den).toTex()}}{${den.toTex()}} = ${py.toTex()}`] },
          { title: 'Check: walk the fraction t along AB', tex: `P = A + t(B - A),\\quad t = \\frac{r_1}{r_1 ${sign} r_2} = ${t.toTex()}`, note: `x = ${x1} + (${t})(${dx}) = ${px}; y = ${y1} + (${t})(${dy}) = ${py}. The two methods agree.` },
          { title: 'Check the distances', tex: `\\frac{AP}{PB} \\approx \\frac{${AP.toFixed(4)}}{${PB.toFixed(4)}} \\approx ${(AP / PB).toFixed(4)} = \\frac{r_1}{r_2}` },
        ],
        notes: [{ kind: 'info', text: 'Some books write the external ratio as negative, r₁ : −r₂; the result is the same point. The midpoint is the special case r₁ = r₂ = 1.' }],
      };
    }
    const px = v.frac('px', 'the x-coordinate of P'), py = v.frac('py', 'the y-coordinate of P');
    if (!v.ok()) return v.result();
    const ex = px.sub(x1), ey = py.sub(y1);
    const cross = ex.mul(dy).sub(ey.mul(dx));
    // Allow for rounded decimal input (e.g. −3.1667 for −19/6): reject only if P is clearly off the line.
    const crossN = Math.abs(cross.toNumber()), scaleN = Math.hypot(n(ex), n(ey)) * Math.hypot(n(dx), n(dy));
    const rounded = !cross.isZero();
    if (rounded && crossN > 1e-4 * Math.max(scaleN, 1e-12)) return { ok: false, errors: [{ field: 'px', message: 'P is not on line AB, so it does not divide AB in any ratio. (The vectors AP and AB are not parallel.)' }] };
    const t = ex.mul(dx).add(ey.mul(dy)).div(dx.mul(dx).add(dy.mul(dy)));
    if (t.eq(1)) return { ok: false, errors: [{ field: 'px', message: 'P is the same point as B, so the ratio AP : PB is undefined (PB = 0).' }] };
    const k = t.div(new Frac(1n).sub(t)); // AP : PB = k : 1 (negative means external)
    const internal = t.sign() > 0 && t.toNumber() < 1;
    const useX = !dx.isZero();
    return {
      ok: true,
      final: { tex: `AP : PB = ${k.abs().toTex()} : 1\\ \\text{(${internal ? 'internal' : t.isZero() ? 'P = A' : 'external'})}` },
      answers: [
        fracAnswer('Ratio AP : PB (as k : 1)', k.abs(), { primary: true }),
        { label: 'Type of division', value: t.isZero() ? 'P coincides with A' : internal ? 'internal (P between A and B)' : 'external (P outside AB)', copy: '' },
        fracAnswer('Fraction of the way from A to B', t),
      ],
      visual: { svg: picture([{ x: n(x1), y: n(y1), label: 'A' }, { x: n(x2), y: n(y2), label: 'B' }, { x: n(px), y: n(py), label: 'P', cls: 'd-point2' }], [(() => { const tn = t.toNumber(), a = Math.min(0, tn), b = Math.max(1, tn); return { x1: n(x1) + a * n(dx), y1: n(y1) + a * n(dy), x2: n(x1) + b * n(dx), y2: n(y1) + b * n(dy), cls: 'd-perp' }; })(), { x1: n(x1), y1: n(y1), x2: n(x2), y2: n(y2) }]), caption: 'P on line AB. The ratio compares AP with PB.' },
      formula: ['r = \\frac{x - x_1}{x_2 - x} = \\frac{y - y_1}{y_2 - y}'],
      steps: [
        { title: 'Check that P is on line AB', tex: `(x - x_1)(y_2 - y_1) - (y - y_1)(x_2 - x_1) = (${ex.toTex()})(${dy.toTex()}) - (${ey.toTex()})(${dx.toTex()}) ${rounded ? '\\approx' : '='} 0`, note: rounded ? 'The result is not exactly 0 because the coordinates were rounded, but it is close enough that P is on the line.' : 'A zero result means AP is parallel to AB, so P lies on the line.' },
        { title: 'Solve the section formula for the ratio', texLines: [useX ? 'r = \\frac{x - x_1}{x_2 - x}' : 'r = \\frac{y - y_1}{y_2 - y}', useX ? `r = \\frac{${px.toTex()} - ${fT(x1)}}{${x2.toTex()} - ${fT(px)}} = \\frac{${ex.toTex()}}{${x2.sub(px).toTex()}} = ${k.toTex()}` : `r = \\frac{${py.toTex()} - ${fT(y1)}}{${y2.toTex()} - ${fT(py)}} = \\frac{${ey.toTex()}}{${y2.sub(py).toTex()}} = ${k.toTex()}`], note: k.sign() < 0 ? 'A negative ratio means external division: P is outside the segment.' : 'A positive ratio means internal division: P is between A and B.' },
        { title: 'Write the ratio', tex: `AP : PB = ${k.abs().toTex()} : 1${k.isInt() ? '' : ` = ${k.abs().n} : ${k.abs().d}`}` },
      ],
      notes: [
        ...(rounded ? [{ kind: 'warn', text: 'P is not exactly on line AB, but within rounding of it, so the ratio is found from the closest point on the line. Enter exact fractions (such as −19/6) for an exact ratio.' }] : []),
        { kind: 'info', text: 'Using x or y gives the same ratio when P is on the line; use whichever coordinate changes between A and B.' },
      ],
    };
  },
};
