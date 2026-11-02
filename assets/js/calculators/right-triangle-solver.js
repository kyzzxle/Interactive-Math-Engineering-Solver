/**
 * Right triangle with the right angle at C: legs a, b, hypotenuse c, acute angles A (opposite a)
 * and B (opposite b). Any two values with at least one side determine the triangle.
 */
import { fmt, tx, eq, UNIT_FIELD } from '../lib/calc-kit.js';
import { readOptional, triangleOutput, sinD, cosD, asinD } from '../lib/triangle-kit.js';

import { rightTriangleExplore } from '../explore/functions.js';
export const calculator = {
  id: 'right-triangle-solver',
  explore: rightTriangleExplore,
  fields: [
    { name: 'a', label: 'Leg a', type: 'number', signed: false, placeholder: 'unknown', row: 's', affix: 'len' },
    { name: 'b', label: 'Leg b', type: 'number', signed: false, placeholder: 'unknown', row: 's', affix: 'len' },
    { name: 'c', label: 'Hypotenuse c', type: 'number', signed: false, placeholder: 'unknown', row: 's', affix: 'len' },
    { name: 'A', label: 'Angle A (opposite a)', type: 'number', signed: false, placeholder: 'unknown', suffix: '°', row: 'g' },
    { name: 'B', label: 'Angle B (opposite b)', type: 'number', signed: false, placeholder: 'unknown', suffix: '°', row: 'g' },
    UNIT_FIELD,
  ],
  examples: [
    { label: 'Legs 3 and 4', values: { a: '3', b: '4', unit: 'cm' } },
    { label: 'Hypotenuse 10, angle 30°', values: { c: '10', A: '30', unit: 'm' } },
    { label: 'Leg 7, hypotenuse 25', values: { a: '7', c: '25' } },
    { label: 'Ramp: leg b = 12, angle A = 5°', values: { b: '12', A: '5', unit: 'ft' } },
  ],
  solve(values) {
    const errors = [];
    const g = readOptional(values, ['a', 'b', 'c', 'A', 'B'], errors);
    if (errors.length) return { ok: false, errors };
    for (const n of ['A', 'B']) if (g[n] !== null && g[n] >= 90) errors.push({ field: n, message: `Angle ${n} must be less than 90° — the 90° angle is C, so the other two are acute.` });
    const given = Object.keys(g).filter((k) => g[k] !== null);
    if (given.length !== 2) errors.push({ field: given.length ? given : ['a', 'b'], message: given.length < 2 ? 'Enter exactly two values (at least one of them a side). Leave the others blank.' : `Enter exactly two values; you entered ${given.length} (${given.join(', ')}). Leave the unknowns blank.` });
    if (errors.length) return { ok: false, errors };
    if (given.every((k) => k === k.toUpperCase())) return { ok: false, errors: [{ field: ['A', 'B'], message: 'Two angles fix the shape but not the size. Enter at least one side.' }] };
    let { a, b, c, A, B } = g;
    const steps = [{ title: 'Identify the given values', text: `The right angle is C = 90°. Given: ${given.map((k) => `${k} = ${fmt(g[k])}${k === k.toUpperCase() ? '°' : ''}`).join(', ')}.` }];
    const key = given.sort().join('');
    if (key === 'ab') {
      c = Math.hypot(a, b); A = Math.atan2(a, b) * 180 / Math.PI;
      steps.push({ title: 'Hypotenuse (Pythagorean theorem)', texLines: ['c = \\sqrt{a^2 + b^2}', `c = \\sqrt{${tx(a)}^2 + ${tx(b)}^2} ${eq(c)}`] });
      steps.push({ title: 'Angle A (tangent = opposite/adjacent)', texLines: ['\\tan A = \\frac{a}{b}', `A = \\tan^{-1}\\left(\\frac{${tx(a)}}{${tx(b)}}\\right) ${eq(A)}^\\circ`] });
    } else if (key === 'ac' || key === 'bc') {
      const leg = key === 'ac' ? a : b;
      if (leg >= c) return { ok: false, errors: [{ field: [key[0], 'c'], message: `The hypotenuse (${fmt(c)}) must be longer than either leg (${fmt(leg)}).` }] };
      const other = Math.sqrt((c - leg) * (c + leg));
      if (key === 'ac') { b = other; A = asinD(a / c); } else { a = other; A = 90 - asinD(b / c); }
      steps.push({ title: `Missing leg (Pythagorean theorem)`, texLines: [`${key === 'ac' ? 'b' : 'a'} = \\sqrt{c^2 - ${key[0]}^2}`, `= \\sqrt{${tx(c)}^2 - ${tx(leg)}^2} ${eq(other)}`] });
      steps.push({ title: 'Angle A (sine = opposite/hypotenuse)', texLines: ['\\sin A = \\frac{a}{c}', `A = \\sin^{-1}\\left(\\frac{${tx(a)}}{${tx(c)}}\\right) ${eq(A)}^\\circ`] });
    } else {
      // one side and one acute angle
      const angName = given.find((k) => k === k.toUpperCase());
      A = angName === 'A' ? g.A : 90 - g.B;
      const sA = sinD(A), cA = cosD(A);
      if (g.c !== null) { a = c * sA; b = c * cA; steps.push({ title: 'Legs from the hypotenuse', texLines: [`a = c \\sin A = ${tx(c)}\\sin ${tx(A)}^\\circ ${eq(a)}`, `b = c \\cos A = ${tx(c)}\\cos ${tx(A)}^\\circ ${eq(b)}`] }); }
      else if (g.a !== null) { c = a / sA; b = a / Math.tan((A * Math.PI) / 180); steps.push({ title: 'Other sides from leg a', texLines: [`c = \\frac{a}{\\sin A} = \\frac{${tx(a)}}{\\sin ${tx(A)}^\\circ} ${eq(c)}`, `b = \\frac{a}{\\tan A} = \\frac{${tx(a)}}{\\tan ${tx(A)}^\\circ} ${eq(b)}`] }); }
      else { c = b / cA; a = b * Math.tan((A * Math.PI) / 180); steps.push({ title: 'Other sides from leg b', texLines: [`c = \\frac{b}{\\cos A} = \\frac{${tx(b)}}{\\cos ${tx(A)}^\\circ} ${eq(c)}`, `a = b \\tan A = ${tx(b)}\\tan ${tx(A)}^\\circ ${eq(a)}`] }); }
    }
    B = 90 - A;
    steps.push({ title: 'Remaining angle', text: 'The acute angles of a right triangle add up to 90°.', tex: `B = 90^\\circ - A = 90^\\circ - ${tx(A)}^\\circ ${eq(B)}^\\circ` });
    const t = { a, b, c, A, B, C: 90 };
    const out = triangleOutput(t, new Set([...given, 'C']), values.unit, 'Right triangle drawn to scale with the right angle at C');
    steps.push({ title: 'Area', tex: `\\text{Area} = \\frac{1}{2}ab = \\frac{1}{2}(${tx(a)})(${tx(b)}) ${eq(out.area)}` });
    return {
      ok: true,
      final: { texLines: [`a ${eq(a)}, \\quad b ${eq(b)}, \\quad c ${eq(c)}`, `A ${eq(A)}^\\circ, \\quad B ${eq(B)}^\\circ, \\quad C = 90^\\circ`] },
      answers: out.answers.filter((x) => !x.label.startsWith('Angle C')),
      visual: { svg: out.svg, caption: 'Drawn to scale. Calculated values are highlighted in orange.' },
      formula: ['a^2 + b^2 = c^2 \\qquad \\sin A = \\frac{a}{c} \\qquad \\cos A = \\frac{b}{c} \\qquad \\tan A = \\frac{a}{b}'],
      steps,
    };
  },
};
