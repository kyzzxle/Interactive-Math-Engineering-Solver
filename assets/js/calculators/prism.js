/**
 * Right prisms: rectangular (box), cube, triangular (any triangle base) and regular n-gon.
 * Lateral area = perimeter × height, total area = 2·base + lateral, volume = base × height.
 */
import { validator, answer, fmt, tx, eq, units, UNIT_FIELD } from '../lib/calc-kit.js';
import { heron, regularArea, apothem, polygonName, SIDES_OPTIONS } from '../lib/geometry.js';
import { boxSketch, prismSketch } from '../lib/diagrams.js';

import { prismExplore } from '../explore/solids.js';
import { prismPractice } from '../explore/solids-practice.js';
export const calculator = {
  id: 'prism',
  practice: prismPractice,
  explore: prismExplore,
  fields: [
    { name: 'type', label: 'Prism type', type: 'select', options: [['rect', 'Rectangular prism (box)'], ['cube', 'Cube'], ['tri', 'Triangular prism (any triangle)'], ['regular', 'Regular polygon prism']] },
    { name: 'l', label: 'Length l', type: 'number', signed: false, placeholder: 'e.g. 8', affix: 'len', row: 'box', showWhen: { type: ['rect'] }, rowShowWhen: { type: ['rect'] } },
    { name: 'w', label: 'Width w', type: 'number', signed: false, placeholder: 'e.g. 5', affix: 'len', row: 'box', showWhen: { type: ['rect'] } },
    { name: 'a', label: 'Edge or side a', type: 'number', signed: false, placeholder: 'e.g. 3', affix: 'len', row: 'tri', showWhen: { type: ['cube', 'tri', 'regular'] }, rowShowWhen: { type: ['cube', 'tri', 'regular'] } },
    { name: 'b', label: 'Side b', type: 'number', signed: false, placeholder: 'e.g. 4', affix: 'len', row: 'tri', showWhen: { type: ['tri'] } },
    { name: 'c', label: 'Side c', type: 'number', signed: false, placeholder: 'e.g. 5', affix: 'len', row: 'tri', showWhen: { type: ['tri'] } },
    { name: 'n', label: 'Number of sides of the base', type: 'select', options: SIDES_OPTIONS, default: '6', showWhen: { type: ['regular'] } },
    { name: 'h', label: 'Height (length of the prism) h', type: 'number', signed: false, placeholder: 'e.g. 10', affix: 'len', showWhen: { type: ['rect', 'tri', 'regular'] } },
    UNIT_FIELD,
  ],
  examples: [
    { label: 'Box 8 × 5 × 3', values: { type: 'rect', l: '8', w: '5', h: '3', unit: 'cm' } },
    { label: 'Triangular 3-4-5, h = 10', values: { type: 'tri', a: '3', b: '4', c: '5', h: '10', unit: 'cm' } },
    { label: 'Hexagonal, side 2, h = 7', values: { type: 'regular', n: '6', a: '2', h: '7', unit: 'm' } },
    { label: 'Cube, edge 4', values: { type: 'cube', a: '4', unit: 'in' } },
  ],
  solve(values) {
    const v = validator(values);
    const type = ['rect', 'cube', 'tri', 'regular'].includes(values.type) ? values.type : 'rect';
    const u = units(values.unit);
    let B, P, h, baseLines, sketch, desc;
    if (type === 'rect') {
      const l = v.number('l', 'the length', { positive: true }), w = v.number('w', 'the width', { positive: true });
      h = v.number('h', 'the height', { positive: true });
      if (!v.ok()) return v.result();
      B = l * w; P = 2 * (l + w);
      baseLines = [`B = lw = (${tx(l)})(${tx(w)}) ${eq(B)}`, `P = 2(l + w) = 2(${tx(l)} + ${tx(w)}) ${eq(P)}`];
      sketch = boxSketch({ l: `l = ${fmt(l, 4)}`, w: `w = ${fmt(w, 4)}`, h: `h = ${fmt(h, 4)}` });
      desc = `rectangular prism ${fmt(l)} × ${fmt(w)} × ${fmt(h)}`;
    } else if (type === 'cube') {
      const a = v.number('a', 'the edge length', { positive: true });
      if (!v.ok()) return v.result();
      h = a; B = a * a; P = 4 * a;
      baseLines = [`B = a^2 = (${tx(a)})^2 = ${tx(B)}`, `P = 4a = ${tx(P)}`];
      sketch = boxSketch({ l: `a = ${fmt(a, 4)}`, w: 'a', h: 'a' });
      desc = `cube with edge ${fmt(a)}`;
    } else if (type === 'tri') {
      const a = v.number('a', 'side a', { positive: true }), b = v.number('b', 'side b', { positive: true }), c = v.number('c', 'side c', { positive: true });
      h = v.number('h', 'the height', { positive: true });
      if (!v.ok()) return v.result();
      const sides = [a, b, c].sort((x, y) => x - y);
      if (sides[0] + sides[1] <= sides[2]) return { ok: false, errors: [{ field: ['a', 'b', 'c'], message: `Sides ${fmt(a)}, ${fmt(b)} and ${fmt(c)} cannot form a triangle: the two shorter sides must add up to more than the longest (triangle inequality).` }] };
      B = heron(a, b, c); P = a + b + c;
      const s = P / 2;
      baseLines = [`s = \\frac{a + b + c}{2} = ${tx(s)}`, `B = \\sqrt{s(s-a)(s-b)(s-c)} = \\sqrt{${tx(s)}(${tx(s - a)})(${tx(s - b)})(${tx(s - c)})} \\approx ${tx(B)}`, `P = a + b + c = ${tx(P)}`];
      sketch = prismSketch(3, { h: `h = ${fmt(h, 4)}`, s: `${fmt(a, 3)}, ${fmt(b, 3)}, ${fmt(c, 3)}` });
      desc = `triangular prism with base sides ${fmt(a)}, ${fmt(b)}, ${fmt(c)}`;
    } else {
      const n = Number(values.n);
      if (![3, 4, 5, 6, 8, 10, 12].includes(n)) return { ok: false, errors: [{ field: 'n', message: 'Choose the number of sides from the list.' }] };
      const a = v.number('a', 'the side length', { positive: true });
      h = v.number('h', 'the height', { positive: true });
      if (!v.ok()) return v.result();
      B = regularArea(n, a); P = n * a;
      const ap = apothem(n, a);
      baseLines = [`\\text{apothem} = \\frac{a}{2\\tan(180^\\circ/${n})} \\approx ${tx(ap)}`, `B = \\frac{1}{2} P \\cdot \\text{apothem} = \\frac{1}{2}(${tx(P)})(${tx(ap)}) \\approx ${tx(B)}`, `P = ${n}a = ${tx(P)}`];
      sketch = prismSketch(n, { h: `h = ${fmt(h, 4)}`, s: `side ${fmt(a, 4)}` });
      desc = `prism with a ${polygonName(n)} base of side ${fmt(a)}`;
    }
    const L = P * h, T = 2 * B + L, V = B * h;
    if (![L, T, V].every(Number.isFinite)) return { ok: false, errors: [{ field: 'h', message: 'These values are too large to compute reliably.' }] };
    const steps = [
      { title: 'Base area B and perimeter P', texLines: baseLines },
      { title: 'Lateral area (the rectangular sides)', text: 'Each side face is a rectangle whose width is one base edge and whose height is h, so together they make P × h.', texLines: ['L = P h', `L = (${tx(P)})(${tx(h)}) ${eq(L)}`] },
      { title: 'Total surface area', texLines: ['T = 2B + L', `T = 2(${tx(B)}) + ${tx(L)} ${eq(T)}`] },
      { title: 'Volume', texLines: ['V = B h', `V = (${tx(B)})(${tx(h)}) ${eq(V)}`] },
    ];
    return {
      ok: true,
      final: { texLines: [`V ${Number.isInteger(V) ? '=' : '\\approx'} ${tx(V)}${u.texVol}`, `T ${Number.isInteger(T) ? '=' : '\\approx'} ${tx(T)}${u.texArea}`] },
      answers: [answer('Volume V', V, { unit: u.vol, primary: true }), answer('Total surface area', T, { unit: u.area, primary: true }), answer('Lateral area', L, { unit: u.area }), answer('Base area B', B, { unit: u.area }), answer('Base perimeter P', P, { unit: u.len })],
      visual: { svg: sketch, caption: `Sketch of the ${desc} (not to scale).` },
      formula: ['V = B h \\qquad L = P h \\qquad T = 2B + P h'],
      steps,
      notes: [{ kind: 'info', text: 'These formulas assume a right prism (side edges perpendicular to the base). For an oblique prism the volume is still B × h with h the perpendicular height, but the lateral area differs.' }],
    };
  },
};
