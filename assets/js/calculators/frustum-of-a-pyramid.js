/**
 * Frustum of a right pyramid with parallel, similar bases:
 *   V = (h/3)(A₁ + A₂ + √(A₁A₂)),  lateral faces are congruent trapezoids (regular bases)
 * Supported: regular n-gon bases (bottom edge a, top edge b) and rectangular bases with
 * proportional sides (L₂/L₁ = W₂/W₁), which is required for the solid to be a true frustum.
 */
import { validator, answer, fmt, tx, eq, units, UNIT_FIELD } from '../lib/calc-kit.js';
import { regularArea, apothem, polygonName, SIDES_OPTIONS } from '../lib/geometry.js';
import { frustumPyramidSketch } from '../lib/diagrams.js';

import { frustumPyramidExplore } from '../explore/solids.js';
export const calculator = {
  id: 'frustum-of-a-pyramid',
  explore: frustumPyramidExplore,
  fields: [
    { name: 'type', label: 'Base shape', type: 'select', options: [['regular', 'Regular polygon (square, hexagon, …)'], ['rect', 'Rectangle']] },
    { name: 'n', label: 'Number of sides', type: 'select', options: SIDES_OPTIONS, default: '4', showWhen: { type: ['regular'] } },
    { name: 'a', label: 'Bottom edge a', type: 'number', signed: false, placeholder: 'e.g. 10', affix: 'len', row: 'r1', showWhen: { type: ['regular'] }, rowShowWhen: { type: ['regular'] } },
    { name: 'b', label: 'Top edge b', type: 'number', signed: false, placeholder: 'e.g. 6', affix: 'len', row: 'r1', showWhen: { type: ['regular'] } },
    { name: 'L1', label: 'Bottom length L₁', type: 'number', signed: false, placeholder: 'e.g. 12', affix: 'len', row: 'q1', showWhen: { type: ['rect'] }, rowShowWhen: { type: ['rect'] } },
    { name: 'W1', label: 'Bottom width W₁', type: 'number', signed: false, placeholder: 'e.g. 8', affix: 'len', row: 'q1', showWhen: { type: ['rect'] } },
    { name: 'L2', label: 'Top length L₂', type: 'number', signed: false, placeholder: 'e.g. 6', affix: 'len', row: 'q2', showWhen: { type: ['rect'] }, rowShowWhen: { type: ['rect'] } },
    { name: 'W2', label: 'Top width W₂', type: 'number', signed: false, placeholder: 'e.g. 4', affix: 'len', row: 'q2', showWhen: { type: ['rect'] } },
    { name: 'h', label: 'Perpendicular height h', type: 'number', signed: false, placeholder: 'e.g. 3', affix: 'len' },
    UNIT_FIELD,
  ],
  examples: [
    { label: 'Square: a = 10, b = 6, h = 3', values: { type: 'regular', n: '4', a: '10', b: '6', h: '3', unit: 'm' } },
    { label: 'Rectangle 12×8 → 6×4, h = 5', values: { type: 'rect', L1: '12', W1: '8', L2: '6', W2: '4', h: '5', unit: 'cm' } },
    { label: 'Hexagonal: a = 4, b = 2, h = 6', values: { type: 'regular', n: '6', a: '4', b: '2', h: '6', unit: 'cm' } },
  ],
  solve(values) {
    const v = validator(values);
    const type = values.type === 'rect' ? 'rect' : 'regular';
    const u = units(values.unit);
    const h = v.number('h', 'the height', { positive: true });
    let A1, A2, Lat, baseLines, slantStep, n = 4, extra = [];
    if (type === 'regular') {
      n = Number(values.n);
      if (![3, 4, 5, 6, 8, 10, 12].includes(n)) v.fail('n', 'Choose the number of sides from the list.');
      const a = v.number('a', 'the bottom edge', { positive: true }), b = v.number('b', 'the top edge', { nonneg: true });
      if (!v.ok()) return v.result();
      if (b > a) return { ok: false, errors: [{ field: ['a', 'b'], message: 'The bottom edge a must be at least the top edge b. This calculator calls the larger base the bottom — swap the values.' }] };
      A1 = regularArea(n, a); A2 = regularArea(n, b);
      const m1 = apothem(n, a), m2 = apothem(n, b);
      const s = Math.hypot(h, m1 - m2);
      Lat = n * ((a + b) / 2) * s;
      baseLines = [`A_1 = \\frac{${n} a^2}{4\\tan(180^\\circ/${n})} = \\frac{${n}(${tx(a)})^2}{4\\tan(${tx(180 / n, 4)}^\\circ)} ${eq(A1)}`, `A_2 = \\frac{${n}(${tx(b)})^2}{4\\tan(${tx(180 / n, 4)}^\\circ)} ${eq(A2)}`];
      slantStep = { title: 'Slant height of each trapezoidal face', text: 'Use the right triangle formed by the height and the difference of the apothems of the two bases.', texLines: [`m_1 ${eq(m1)}, \\quad m_2 ${eq(m2)}`, 's = \\sqrt{h^2 + (m_1 - m_2)^2}', `s = \\sqrt{${tx(h)}^2 + ${tx(m1 - m2)}^2} ${eq(s)}`, `L = ${n}\\cdot\\frac{a + b}{2}\\cdot s = ${n}\\cdot\\frac{${tx(a)} + ${tx(b)}}{2}\\cdot ${tx(s)} ${eq(Lat)}`] };
      extra = [answer('Slant height s', s, { unit: u.len })];
      if (b === 0) extra.push({ label: 'Note', value: 'b = 0 gives a complete pyramid' });
    } else {
      const L1 = v.number('L1', 'the bottom length', { positive: true }), W1 = v.number('W1', 'the bottom width', { positive: true });
      const L2 = v.number('L2', 'the top length', { nonneg: true }), W2 = v.number('W2', 'the top width', { nonneg: true });
      if (!v.ok()) return v.result();
      if (L2 > L1 || W2 > W1) return { ok: false, errors: [{ field: ['L2', 'W2'], message: 'The top rectangle must not be larger than the bottom one. Enter the larger base as the bottom.' }] };
      if (Math.abs(L2 * W1 - W2 * L1) > 1e-9 * L1 * W1) {
        return { ok: false, errors: [{ field: ['L2', 'W2'], message: `The two bases must be similar (same proportions) for the solid to be a frustum of a pyramid: L₂/L₁ = ${fmt(L2 / L1)} but W₂/W₁ = ${fmt(W2 / W1)}. For W₂ to match, it should be ${fmt((W1 * L2) / L1)}.` }] };
      }
      A1 = L1 * W1; A2 = L2 * W2;
      const sL = Math.hypot(h, (W1 - W2) / 2), sW = Math.hypot(h, (L1 - L2) / 2);
      Lat = (L1 + L2) * sL + (W1 + W2) * sW;
      baseLines = [`A_1 = L_1 W_1 = (${tx(L1)})(${tx(W1)}) ${eq(A1)}`, `A_2 = L_2 W_2 = (${tx(L2)})(${tx(W2)}) ${eq(A2)}`];
      slantStep = { title: 'Slant heights of the two kinds of trapezoidal face', texLines: [`s_L = \\sqrt{h^2 + \\left(\\frac{W_1 - W_2}{2}\\right)^2} ${eq(sL)}`, `s_W = \\sqrt{h^2 + \\left(\\frac{L_1 - L_2}{2}\\right)^2} ${eq(sW)}`, `L = (L_1 + L_2)s_L + (W_1 + W_2)s_W ${eq(Lat)}`] };
      extra = [answer('Slant height (length faces)', sL, { unit: u.len }), answer('Slant height (width faces)', sW, { unit: u.len })];
    }
    const root = Math.sqrt(A1 * A2);
    const V = (h / 3) * (A1 + A2 + root);
    const T = Lat + A1 + A2;
    return {
      ok: true,
      final: { texLines: [`V ${eq(V)}${u.texVol}`, `T ${eq(T)}${u.texArea}`] },
      answers: [answer('Volume V', V, { unit: u.vol, primary: true }), answer('Total surface area', T, { unit: u.area, primary: true }), answer('Lateral area', Lat, { unit: u.area }), answer('Bottom base area A₁', A1, { unit: u.area }), answer('Top base area A₂', A2, { unit: u.area }), ...extra.filter((e) => e.label !== 'Note')],
      visual: { svg: frustumPyramidSketch(type === 'rect' ? 4 : n), caption: `Frustum of a pyramid with ${type === 'rect' ? 'rectangular' : polygonName(n)} bases (sketch, not to scale).` },
      formula: ['V = \\frac{h}{3}\\left(A_1 + A_2 + \\sqrt{A_1 A_2}\\right) \\qquad T = A_1 + A_2 + L'],
      steps: [
        { title: 'Areas of the two parallel bases', texLines: baseLines },
        slantStep,
        { title: 'Volume (prismoidal frustum formula)', texLines: ['V = \\frac{h}{3}\\left(A_1 + A_2 + \\sqrt{A_1 A_2}\\right)', `V = \\frac{${tx(h)}}{3}\\left(${tx(A1)} + ${tx(A2)} + \\sqrt{(${tx(A1)})(${tx(A2)})}\\right)`, `V = \\frac{${tx(h)}}{3}\\left(${tx(A1)} + ${tx(A2)} + ${tx(root)}\\right) ${eq(V)}`] },
        { title: 'Total surface area', texLines: ['T = A_1 + A_2 + L', `T = ${tx(A1)} + ${tx(A2)} + ${tx(Lat)} ${eq(T)}`] },
      ],
      notes: [{ kind: 'info', text: 'Assumptions: the frustum is cut from a right pyramid by a plane parallel to the base, so the two bases are similar, parallel and centred on the same axis.' }],
    };
  },
};
