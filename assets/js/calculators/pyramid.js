/**
 * Right pyramids with the apex above the centre of the base: regular n-gon bases (including
 * square) and rectangular bases. V = (1/3)Bh, lateral area from the slant heights of the faces.
 */
import { validator, answer, fmt, tx, eq, units, UNIT_FIELD } from '../lib/calc-kit.js';
import { regularArea, apothem, circumradius, polygonName, SIDES_OPTIONS } from '../lib/geometry.js';
import { pyramidSketch } from '../lib/diagrams.js';

import { pyramidExplore } from '../explore/solids.js';
import { pyramidPractice } from '../explore/solids-practice.js';
export const calculator = {
  id: 'pyramid',
  practice: pyramidPractice,
  explore: pyramidExplore,
  fields: [
    { name: 'type', label: 'Base shape', type: 'select', options: [['regular', 'Regular polygon (square, triangle, hexagon, …)'], ['rect', 'Rectangle']] },
    { name: 'n', label: 'Number of sides of the base', type: 'select', options: SIDES_OPTIONS, default: '4', showWhen: { type: ['regular'] } },
    { name: 'a', label: 'Base edge a', type: 'number', signed: false, placeholder: 'e.g. 6', affix: 'len', row: 'b1', showWhen: { type: ['regular'] }, rowShowWhen: { type: ['regular'] } },
    { name: 'l', label: 'Base length l', type: 'number', signed: false, placeholder: 'e.g. 8', affix: 'len', row: 'b2', showWhen: { type: ['rect'] }, rowShowWhen: { type: ['rect'] } },
    { name: 'w', label: 'Base width w', type: 'number', signed: false, placeholder: 'e.g. 6', affix: 'len', row: 'b2', showWhen: { type: ['rect'] } },
    { name: 'h', label: 'Perpendicular height h', type: 'number', signed: false, placeholder: 'e.g. 4', affix: 'len', hint: 'From the apex straight down to the centre of the base.' },
    UNIT_FIELD,
  ],
  examples: [
    { label: 'Square base 6, h = 4', values: { type: 'regular', n: '4', a: '6', h: '4', unit: 'm' } },
    { label: 'Rectangle 8 × 6, h = 12', values: { type: 'rect', l: '8', w: '6', h: '12', unit: 'cm' } },
    { label: 'Hexagonal base 2, h = 5', values: { type: 'regular', n: '6', a: '2', h: '5', unit: 'cm' } },
  ],
  solve(values) {
    const v = validator(values);
    const type = values.type === 'rect' ? 'rect' : 'regular';
    const u = units(values.unit);
    const h = v.number('h', 'the height', { positive: true });
    let B, L, edge, slantInfo, baseLines, n = 4, desc;
    if (type === 'regular') {
      n = Number(values.n);
      if (![3, 4, 5, 6, 8, 10, 12].includes(n)) v.fail('n', 'Choose the number of sides from the list.');
      const a = v.number('a', 'the base edge', { positive: true });
      if (!v.ok()) return v.result();
      const ap = apothem(n, a), R = circumradius(n, a);
      B = regularArea(n, a);
      const s = Math.hypot(h, ap);
      L = 0.5 * n * a * s;
      edge = Math.hypot(h, R);
      baseLines = [`\\text{apothem } m = \\frac{a}{2\\tan(180^\\circ/${n})} ${eq(ap)}`, `B = \\frac{1}{2}(${n}a)\\,m = \\frac{1}{2}(${tx(n * a)})(${tx(ap)}) ${eq(B)}`];
      slantInfo = { title: 'Slant height of each triangular face', text: 'The slant height is the hypotenuse of a right triangle with legs h and the apothem m.', texLines: ['s = \\sqrt{h^2 + m^2}', `s = \\sqrt{${tx(h)}^2 + ${tx(ap)}^2} ${eq(s)}`] };
      var lateralLines = ['L = \\frac{1}{2} P s', `L = \\frac{1}{2}(${tx(n * a)})(${tx(s)}) ${eq(L)}`];
      var answersExtra = [answer('Slant height s', s, { unit: u.len }), answer('Lateral edge', edge, { unit: u.len })];
      desc = `pyramid with a ${polygonName(n)} base`;
    } else {
      const l = v.number('l', 'the base length', { positive: true }), w = v.number('w', 'the base width', { positive: true });
      if (!v.ok()) return v.result();
      B = l * w;
      const sl = Math.hypot(h, w / 2); // faces on the l edges
      const sw = Math.hypot(h, l / 2); // faces on the w edges
      L = l * sl + w * sw;
      edge = Math.sqrt(h * h + (l / 2) ** 2 + (w / 2) ** 2);
      baseLines = [`B = lw = (${tx(l)})(${tx(w)}) ${eq(B)}`];
      slantInfo = { title: 'Two different slant heights', text: 'Faces on the length edges lean over half the width; faces on the width edges lean over half the length.', texLines: [`s_l = \\sqrt{h^2 + (w/2)^2} = \\sqrt{${tx(h)}^2 + ${tx(w / 2)}^2} ${eq(sl)}`, `s_w = \\sqrt{h^2 + (l/2)^2} = \\sqrt{${tx(h)}^2 + ${tx(l / 2)}^2} ${eq(sw)}`] };
      lateralLines = ['L = 2\\cdot\\frac{1}{2} l\\, s_l + 2\\cdot\\frac{1}{2} w\\, s_w = l s_l + w s_w', `L = (${tx(l)})(${tx(sl)}) + (${tx(w)})(${tx(sw)}) ${eq(L)}`];
      answersExtra = [answer('Slant height on length edges', sl, { unit: u.len }), answer('Slant height on width edges', sw, { unit: u.len }), answer('Lateral edge', edge, { unit: u.len })];
      desc = 'pyramid with a rectangular base';
    }
    const T = B + L, V = (B * h) / 3;
    return {
      ok: true,
      final: { texLines: [`V ${eq(V)}${u.texVol}`, `T ${eq(T)}${u.texArea}`] },
      answers: [answer('Volume V', V, { unit: u.vol, primary: true }), answer('Total surface area', T, { unit: u.area, primary: true }), answer('Lateral area', L, { unit: u.area }), answer('Base area B', B, { unit: u.area }), ...answersExtra],
      visual: { svg: pyramidSketch(type === 'rect' ? 4 : n, { h: `h = ${fmt(h, 4)}`, s: type === 'rect' ? `${fmt(Number(values.l), 3)} × ${fmt(Number(values.w), 3)}` : `a = ${fmt(Number(values.a), 4)}` }), caption: `Sketch of a ${desc} (not to scale).` },
      formula: ['V = \\frac{1}{3} B h \\qquad T = B + L'],
      steps: [
        { title: 'Base area', texLines: baseLines },
        slantInfo,
        { title: 'Lateral area (sum of the triangular faces)', texLines: lateralLines },
        { title: 'Total surface area', texLines: ['T = B + L', `T = ${tx(B)} + ${tx(L)} ${eq(T)}`] },
        { title: 'Volume (one third of the prism with the same base and height)', texLines: ['V = \\frac{1}{3} B h', `V = \\frac{1}{3}(${tx(B)})(${tx(h)}) ${eq(V)}`] },
      ],
      notes: [{ kind: 'info', text: 'Assumes a right pyramid: the apex is directly above the centre of the base. The volume formula holds for any pyramid if h is the perpendicular height.' }],
    };
  },
};
