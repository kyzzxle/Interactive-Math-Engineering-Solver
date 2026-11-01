/**
 * Law of sines  a/sin A = b/sin B = c/sin C.
 * Supported cases: AAS / ASA (two angles and any side) and SSA (two sides and an angle opposite one
 * of them — the ambiguous case, which can give 0, 1 or 2 triangles).
 */
import { fmt, tx, eq, UNIT_FIELD } from '../lib/calc-kit.js';
import { readOptional, triangleOutput, sinD, asinD } from '../lib/triangle-kit.js';

const OPP = { a: 'A', b: 'B', c: 'C', A: 'a', B: 'b', C: 'c' };

export const calculator = {
  id: 'law-of-sines',
  fields: [
    { name: 'a', label: 'Side a', type: 'number', signed: false, placeholder: 'unknown', row: 's' },
    { name: 'b', label: 'Side b', type: 'number', signed: false, placeholder: 'unknown', row: 's' },
    { name: 'c', label: 'Side c', type: 'number', signed: false, placeholder: 'unknown', row: 's' },
    { name: 'A', label: 'Angle A', type: 'number', signed: false, placeholder: 'unknown', suffix: '°', row: 'g' },
    { name: 'B', label: 'Angle B', type: 'number', signed: false, placeholder: 'unknown', suffix: '°', row: 'g' },
    { name: 'C', label: 'Angle C', type: 'number', signed: false, placeholder: 'unknown', suffix: '°', row: 'g' },
    UNIT_FIELD,
  ],
  examples: [
    { label: 'AAS: A = 40°, B = 60°, a = 8', values: { A: '40', B: '60', a: '8' } },
    { label: 'SSA, two triangles: a = 6, b = 8, A = 35°', values: { a: '6', b: '8', A: '35' } },
    { label: 'SSA, no triangle: a = 3, b = 8, A = 40°', values: { a: '3', b: '8', A: '40' } },
  ],
  solve(values) {
    const errors = [];
    const g = readOptional(values, ['a', 'b', 'c', 'A', 'B', 'C'], errors);
    if (errors.length) return { ok: false, errors };
    const given = Object.keys(g).filter((k) => g[k] !== null);
    const angles = given.filter((k) => k === k.toUpperCase()), sides = given.filter((k) => k === k.toLowerCase());
    if (given.length !== 3) return { ok: false, errors: [{ field: given.length ? given : ['a'], message: `Enter exactly three values (you entered ${given.length}) and leave the rest blank.` }] };
    if (!sides.length) return { ok: false, errors: [{ field: angles, message: 'Three angles fix the shape but not the size. Enter at least one side.' }] };
    if (sides.length === 3) return { ok: false, errors: [{ field: sides, message: 'With three sides (SSS) use the law of cosines calculator: the law of sines needs a known angle–side pair.' }] };
    const unit = values.unit;
    const steps = [{ title: 'Identify the given values', text: given.map((k) => `${k} = ${fmt(g[k])}${k === k.toUpperCase() ? '°' : ''}`).join(', ') }];
    if (angles.length === 2) {
      const sum = angles.reduce((s, k) => s + g[k], 0);
      if (sum >= 180) return { ok: false, errors: [{ field: angles, message: `The two angles add up to ${fmt(sum)}°, leaving nothing for the third angle. Angles in a triangle sum to 180°.` }] };
      const third = ['A', 'B', 'C'].find((k) => g[k] === null);
      const t = { ...g, [third]: 180 - sum };
      steps.push({ title: 'Third angle (angle sum is 180°)', tex: `${third} = 180^\\circ - ${tx(g[angles[0]])}^\\circ - ${tx(g[angles[1]])}^\\circ = ${tx(t[third])}^\\circ` });
      const s = sides[0], ratio = t[s] / sinD(t[OPP[s]]);
      steps.push({ title: 'Ratio from the known side and its opposite angle', texLines: [`\\frac{${s}}{\\sin ${OPP[s]}} = \\frac{${tx(t[s])}}{\\sin ${tx(t[OPP[s]])}^\\circ} ${eq(ratio)}`] });
      for (const x of ['a', 'b', 'c']) if (t[x] === null || t[x] === undefined) {
        t[x] = ratio * sinD(t[OPP[x]]);
        steps.push({ title: `Side ${x}`, texLines: [`${x} = \\frac{${s}}{\\sin ${OPP[s]}}\\,\\sin ${OPP[x]} = ${tx(ratio)} \\sin ${tx(t[OPP[x]])}^\\circ ${eq(t[x])}`] });
      }
      return finish([t], given, unit, steps, 'AAS/ASA: one triangle');
    }
    // one angle, two sides
    const ang = angles[0], opp = OPP[ang];
    if (!sides.includes(opp)) return { ok: false, errors: [{ field: given, message: `The angle ${ang} lies between the two given sides (SAS). Use the law of cosines calculator for this case.` }] };
    const other = sides.find((s) => s !== opp), otherAng = OPP[other];
    const sinOther = (g[other] * sinD(g[ang])) / g[opp];
    steps.push({ title: `Use the law of sines to find angle ${otherAng}`, texLines: [`\\frac{\\sin ${otherAng}}{${other}} = \\frac{\\sin ${ang}}{${opp}}`, `\\sin ${otherAng} = \\frac{${tx(g[other])}\\sin ${tx(g[ang])}^\\circ}{${tx(g[opp])}} ${eq(sinOther)}`] });
    if (sinOther > 1 + 1e-12) {
      steps.push({ title: 'No triangle exists', text: `sin ${otherAng} would have to be ${fmt(sinOther)}, but a sine can never exceed 1. Side ${opp} is too short to reach the third side.` });
      return { ok: true, final: { text: 'No triangle exists with these measurements.' }, answers: [{ label: 'Number of triangles', value: '0', primary: true }], steps, formula: ['\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}'], notes: [{ kind: 'warn', text: 'This is the "no solution" outcome of the ambiguous SSA case.' }] };
    }
    const base = asinD(Math.min(1, sinOther));
    const candidates = [base];
    if (Math.abs(base - 90) > 1e-9) candidates.push(180 - base);
    const triangles = [];
    candidates.forEach((B1, i) => {
      if (g[ang] + B1 >= 180 - 1e-9) {
        if (i === 1) steps.push({ title: `Second possibility ${otherAng} = ${fmt(B1)}° rejected`, text: `${fmt(g[ang])}° + ${fmt(B1)}° is not less than 180°, so this angle cannot be in the triangle.` });
        return;
      }
      const third = ['A', 'B', 'C'].find((k) => k !== ang && k !== otherAng);
      const t = { a: null, b: null, c: null, A: null, B: null, C: null, [ang]: g[ang], [opp]: g[opp], [other]: g[other], [otherAng]: B1 };
      t[third] = 180 - g[ang] - B1;
      t[OPP[third]] = (g[opp] / sinD(g[ang])) * sinD(t[third]);
      steps.push({ title: `Triangle ${i + 1}: ${otherAng} = ${fmt(B1)}°`, texLines: [`${otherAng} ${i === 0 ? `= \\sin^{-1}(${tx(sinOther)})` : `= 180^\\circ - ${tx(base)}^\\circ`} ${eq(B1)}^\\circ`, `${third} = 180^\\circ - ${tx(g[ang])}^\\circ - ${tx(B1)}^\\circ ${eq(t[third])}^\\circ`, `${OPP[third]} = \\frac{${tx(g[opp])}}{\\sin ${tx(g[ang])}^\\circ}\\sin ${tx(t[third])}^\\circ ${eq(t[OPP[third]])}`] });
      triangles.push(t);
    });
    return finish(triangles, given, unit, steps, triangles.length === 2 ? 'Ambiguous case: two triangles' : 'SSA: one triangle');
  },
};

function finish(tris, given, unit, steps, label) {
  const known = new Set(given);
  if (tris.length === 1) {
    const out = triangleOutput(tris[0], known, unit, 'Triangle drawn to scale');
    const t = tris[0];
    return {
      ok: true,
      final: { texLines: [`a ${eq(t.a)}, \\quad b ${eq(t.b)}, \\quad c ${eq(t.c)}`, `A ${eq(t.A)}^\\circ, \\quad B ${eq(t.B)}^\\circ, \\quad C ${eq(t.C)}^\\circ`] },
      answers: out.answers, visual: { svg: out.svg, caption: `${label}. Drawn to scale; calculated values are highlighted.` },
      formula: ['\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}'], steps,
    };
  }
  const outs = tris.map((t) => triangleOutput(t, known, unit, 'Triangle drawn to scale'));
  return {
    ok: true,
    final: { texLines: tris.map((t, i) => `\\text{Triangle ${i + 1}: } A ${eq(t.A)}^\\circ,\\ B ${eq(t.B)}^\\circ,\\ C ${eq(t.C)}^\\circ;\\ a ${eq(t.a)},\\ b ${eq(t.b)},\\ c ${eq(t.c)}`), text: 'Two different triangles fit these measurements (ambiguous case).' },
    answers: [{ label: 'Number of triangles', value: '2', primary: true }, ...outs[0].answers.filter((x) => !x.label.includes('given')).map((x) => ({ ...x, label: `Triangle 1: ${x.label}` })), ...outs[1].answers.filter((x) => !x.label.includes('given')).map((x) => ({ ...x, label: `Triangle 2: ${x.label}`, primary: false }))],
    visual: { svg: `<div class="grid gap-2 sm:grid-cols-2">${outs.map((o) => `<div>${o.svg}</div>`).join('')}</div>`, caption: 'Both possible triangles, drawn to scale (triangle 1 left, triangle 2 right).' },
    formula: ['\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}'], steps,
    notes: [{ kind: 'info', text: 'SSA is ambiguous because sin θ = sin(180° − θ): an acute and an obtuse angle share the same sine.' }],
  };
}
