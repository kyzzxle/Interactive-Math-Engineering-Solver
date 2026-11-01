/**
 * Law of cosines  c² = a² + b² − 2ab cos C.
 * Supported cases: SAS (two sides and the included angle) and SSS (three sides).
 */
import { validator, fmt, tx, eq, UNIT_FIELD } from '../lib/calc-kit.js';
import { triangleOutput, cosD, acosD } from '../lib/triangle-kit.js';

export const calculator = {
  id: 'law-of-cosines',
  fields: [
    { name: 'mode', label: 'What do you know?', type: 'radio', options: [['sas', 'Two sides and the angle between them (SAS)'], ['sss', 'Three sides (SSS)']] },
    { name: 'a', label: 'Side a', type: 'number', signed: false, placeholder: 'e.g. 5', row: 's' },
    { name: 'b', label: 'Side b', type: 'number', signed: false, placeholder: 'e.g. 7', row: 's' },
    { name: 'c', label: 'Side c', type: 'number', signed: false, placeholder: 'e.g. 8', row: 's', showWhen: { mode: ['sss'] } },
    { name: 'C', label: 'Included angle C (between a and b)', type: 'number', signed: false, placeholder: 'e.g. 60', suffix: '°', showWhen: { mode: ['sas'] } },
    UNIT_FIELD,
  ],
  examples: [
    { label: 'SAS: a = 5, b = 7, C = 60°', values: { mode: 'sas', a: '5', b: '7', C: '60' } },
    { label: 'SSS: 5, 7, 8', values: { mode: 'sss', a: '5', b: '7', c: '8' } },
    { label: 'SSS impossible: 2, 3, 6', expectError: true, values: { mode: 'sss', a: '2', b: '3', c: '6' } },
  ],
  solve(values) {
    const v = validator(values);
    const mode = values.mode === 'sss' ? 'sss' : 'sas';
    const a = v.number('a', 'side a', { positive: true }), b = v.number('b', 'side b', { positive: true });
    let c, C;
    if (mode === 'sss') c = v.number('c', 'side c', { positive: true });
    else C = v.number('C', 'angle C', { positive: true, max: 179.999999 });
    if (!v.ok()) return v.result();
    const steps = [];
    if (mode === 'sas') {
      steps.push({ title: 'Identify the given values', text: `Two sides a = ${fmt(a)}, b = ${fmt(b)} and the angle between them, C = ${fmt(C)}°.` });
      const c2 = a * a + b * b - 2 * a * b * cosD(C);
      c = Math.sqrt(c2);
      steps.push({ title: 'Third side (law of cosines)', texLines: ['c^2 = a^2 + b^2 - 2ab\\cos C', `c^2 = ${tx(a)}^2 + ${tx(b)}^2 - 2(${tx(a)})(${tx(b)})\\cos ${tx(C)}^\\circ ${eq(c2)}`, `c = \\sqrt{${tx(c2)}} ${eq(c)}`] });
    } else {
      steps.push({ title: 'Identify the given values', text: `Three sides a = ${fmt(a)}, b = ${fmt(b)}, c = ${fmt(c)}.` });
      const [p, q, r] = [a, b, c].sort((x, y) => x - y);
      if (p + q <= r) return { ok: false, errors: [{ field: ['a', 'b', 'c'], message: `These sides cannot form a triangle: ${fmt(p)} + ${fmt(q)} = ${fmt(p + q)} is not greater than ${fmt(r)} (triangle inequality).` }] };
      steps.push({ title: 'Check the triangle inequality', text: `The two shorter sides add to ${fmt(p + q)}, which is more than the longest side ${fmt(r)}, so the triangle exists.` });
    }
    // angles by the law of cosines (no ambiguity, unlike the law of sines)
    const A = acosD((b * b + c * c - a * a) / (2 * b * c));
    const B = acosD((a * a + c * c - b * b) / (2 * a * c));
    if (mode === 'sss') C = 180 - A - B;
    steps.push({ title: 'Angle A', texLines: ['\\cos A = \\frac{b^2 + c^2 - a^2}{2bc}', `\\cos A = \\frac{${tx(b)}^2 + ${tx(c)}^2 - ${tx(a)}^2}{2(${tx(b)})(${tx(c)})} ${eq((b * b + c * c - a * a) / (2 * b * c))}`, `A ${eq(A)}^\\circ`] });
    steps.push({ title: 'Angle B', texLines: ['\\cos B = \\frac{a^2 + c^2 - b^2}{2ac}', `B ${eq(B)}^\\circ`] });
    if (mode === 'sss') steps.push({ title: 'Angle C (angle sum is 180°)', tex: `C = 180^\\circ - A - B ${eq(C)}^\\circ` });
    else steps.push({ title: 'Check: angle sum', tex: `A + B + C ${eq(A + B + C)}^\\circ` });
    const t = { a, b, c, A, B, C };
    const out = triangleOutput(t, new Set(mode === 'sas' ? ['a', 'b', 'C'] : ['a', 'b', 'c']), values.unit, 'Triangle drawn to scale');
    const largest = Math.max(A, B, C);
    return {
      ok: true,
      final: { texLines: [`a ${eq(a)}, \\quad b ${eq(b)}, \\quad c ${eq(c)}`, `A ${eq(A)}^\\circ, \\quad B ${eq(B)}^\\circ, \\quad C ${eq(C)}^\\circ`] },
      answers: out.answers,
      visual: { svg: out.svg, caption: 'Drawn to scale; calculated values are highlighted.' },
      formula: ['c^2 = a^2 + b^2 - 2ab\\cos C \\qquad \\cos C = \\frac{a^2 + b^2 - c^2}{2ab}'],
      steps,
      notes: [{ kind: 'info', text: `This triangle is ${Math.abs(largest - 90) < 1e-9 ? 'right-angled' : largest > 90 ? 'obtuse' : 'acute'} (largest angle ${fmt(largest)}°).` }],
    };
  },
};
