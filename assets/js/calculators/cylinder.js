/** Right circular cylinder: LSA = 2πrh, TSA = 2πr² + 2πrh, V = πr²h. */
import { validator, answer, piAnswer, piTex, fmt, tx, units, UNIT_FIELD } from '../lib/calc-kit.js';
import { parseFrac } from '../lib/fraction.js';
import { cylinderSketch } from '../lib/diagrams.js';

export const calculator = {
  id: 'cylinder',
  fields: [
    { name: 'dim', label: 'Base given as', type: 'radio', options: [['r', 'Radius'], ['d', 'Diameter']] },
    { name: 'r', label: 'Radius or diameter of the base', type: 'number', signed: false, placeholder: 'e.g. 4', affix: 'len', row: 'a' },
    { name: 'h', label: 'Height h', type: 'number', signed: false, placeholder: 'e.g. 10', affix: 'len', row: 'a' },
    UNIT_FIELD,
  ],
  examples: [
    { label: 'r = 4 cm, h = 10 cm', values: { dim: 'r', r: '4', h: '10', unit: 'cm' } },
    { label: 'Can: d = 6.6 cm, h = 12.2 cm', values: { dim: 'd', r: '6.6', h: '12.2', unit: 'cm' } },
  ],
  solve(values) {
    const v = validator(values);
    const isD = values.dim === 'd';
    const x = v.number('r', isD ? 'the diameter' : 'the radius', { positive: true });
    const h = v.number('h', 'the height', { positive: true });
    if (!v.ok()) return v.result();
    const u = units(values.unit);
    const r = isD ? x / 2 : x;
    let rF = parseFrac(values.r); const hF = parseFrac(values.h);
    if (rF && isD) rF = rF.div(2);
    const ex = rF && hF;
    const base = Math.PI * r * r, lsa = 2 * Math.PI * r * h, tsa = 2 * base + lsa, V = base * h;
    const cB = ex && rF.pow(2), cL = ex && rF.mul(hF).mul(2), cT = ex && cB.mul(2).add(cL), cV = ex && cB.mul(hF);
    const steps = [
      { title: 'Identify the known values', tex: `r = ${tx(r)}${u.texLen}, \\quad h = ${tx(h)}${u.texLen}`, note: isD ? `The radius is half the diameter: ${fmt(x)} ÷ 2 = ${fmt(r)}.` : undefined },
      { title: 'Area of one circular base', texLines: ['B = \\pi r^2', `B = \\pi (${tx(r)})^2`, `B ${ex ? `= ${piTex(cB)}` : ''} \\approx ${tx(base)}`] },
      { title: 'Lateral (curved) surface area', text: 'Unrolled, the curved side is a rectangle 2πr wide and h tall.', texLines: ['LSA = 2\\pi r h', `LSA = 2\\pi (${tx(r)})(${tx(h)})`, `LSA ${ex ? `= ${piTex(cL)}` : ''} \\approx ${tx(lsa)}`] },
      { title: 'Total surface area (two bases + side)', texLines: ['TSA = 2\\pi r^2 + 2\\pi r h', `TSA \\approx 2(${tx(base)}) + ${tx(lsa)}`, `TSA ${ex ? `= ${piTex(cT)}` : ''} \\approx ${tx(tsa)}`] },
      { title: 'Volume (base area × height)', texLines: ['V = \\pi r^2 h', `V = \\pi (${tx(r)})^2 (${tx(h)})`, `V ${ex ? `= ${piTex(cV)}` : ''} \\approx ${tx(V)}`] },
    ];
    const notes = [{ kind: 'info', text: 'Doubling the height doubles the volume, but doubling the radius multiplies it by 4.' }];
    if (u.len === 'cm') notes.push({ kind: 'info', text: `Capacity: ${fmt(V / 1000, 4)} litres (1 L = 1000 cm³).` });
    return {
      ok: true,
      final: { texLines: [`V ${ex ? `= ${piTex(cV)}` : ''} \\approx ${tx(V)}${u.texVol}`, `TSA ${ex ? `= ${piTex(cT)}` : ''} \\approx ${tx(tsa)}${u.texArea}`] },
      answers: [
        piAnswer('Volume V', ex ? cV : null, V, u.vol, true),
        piAnswer('Total surface area', ex ? cT : null, tsa, u.area, true),
        piAnswer('Lateral surface area', ex ? cL : null, lsa, u.area),
        piAnswer('Area of one base', ex ? cB : null, base, u.area),
        answer('Radius r', r, { unit: u.len }),
      ],
      visual: { svg: cylinderSketch({ r: `r = ${fmt(r, 4)}`, h: `h = ${fmt(h, 4)}` }), caption: 'Right circular cylinder (sketch, not to scale).' },
      formula: ['LSA = 2\\pi r h \\qquad TSA = 2\\pi r^2 + 2\\pi r h \\qquad V = \\pi r^2 h'],
      steps,
      notes,
    };
  },
};
