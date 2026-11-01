/** Sphere: surface area A = 4πr², volume V = (4/3)πr³. Any one of r, d, A, V determines the rest. */
import { validator, answer, piAnswer, piTex, fmt, tx, units, UNIT_FIELD } from '../lib/calc-kit.js';
import { parseFrac } from '../lib/fraction.js';
import { sphereSketch } from '../lib/diagrams.js';

export const calculator = {
  id: 'sphere',
  fields: [
    { name: 'known', label: 'What do you know?', type: 'radio', options: [['r', 'Radius'], ['d', 'Diameter'], ['A', 'Surface area'], ['V', 'Volume']] },
    { name: 'value', label: 'Value', type: 'number', signed: false, placeholder: 'e.g. 3', affix: 'len', hint: 'Enter the measurement you selected above.' },
    UNIT_FIELD,
  ],
  examples: [
    { label: 'Radius 3 cm', values: { known: 'r', value: '3', unit: 'cm' } },
    { label: 'Volume 1000 cm³', values: { known: 'V', value: '1000', unit: 'cm' } },
    { label: 'Diameter 12 m', values: { known: 'd', value: '12', unit: 'm' } },
  ],
  solve(values) {
    const v = validator(values);
    const known = ['r', 'd', 'A', 'V'].includes(values.known) ? values.known : 'r';
    const label = { r: 'the radius', d: 'the diameter', A: 'the surface area', V: 'the volume' }[known];
    const x = v.number('value', label, { positive: true, maxAbs: 1e15 });
    if (!v.ok()) return v.result();
    const u = units(values.unit);
    let r;
    const steps = [{ title: 'Identify the known value', tex: `${known} = ${tx(x)}${known === 'A' ? u.texArea : known === 'V' ? u.texVol : u.texLen}` }];
    if (known === 'r') r = x;
    else if (known === 'd') { r = x / 2; steps.push({ title: 'Find the radius from the diameter', texLines: ['r = \\frac{d}{2}', `r = \\frac{${tx(x)}}{2} = ${tx(r)}`] }); }
    else if (known === 'A') { r = Math.sqrt(x / (4 * Math.PI)); steps.push({ title: 'Solve A = 4πr² for the radius', texLines: ['r = \\sqrt{\\frac{A}{4\\pi}}', `r = \\sqrt{\\frac{${tx(x)}}{4\\pi}} \\approx ${tx(r)}`] }); }
    else { r = Math.cbrt((3 * x) / (4 * Math.PI)); steps.push({ title: 'Solve V = (4/3)πr³ for the radius', texLines: ['r = \\sqrt[3]{\\frac{3V}{4\\pi}}', `r = \\sqrt[3]{\\frac{3(${tx(x)})}{4\\pi}} \\approx ${tx(r)}`] }); }
    const A = 4 * Math.PI * r * r;
    const V = (4 / 3) * Math.PI * r ** 3;
    if (!Number.isFinite(V) || V > 1e300) return { ok: false, errors: [{ field: 'value', message: 'That value is too large to compute reliably.' }] };
    // exact coefficients of π when the radius is known exactly
    let rF = null;
    if (known === 'r' || known === 'd') { rF = parseFrac(values.value); if (rF && known === 'd') rF = rF.div(2); }
    const cA = rF ? rF.pow(2).mul(4) : null;
    const cV = rF ? rF.pow(3).mul(4).div(3) : null;
    steps.push({ title: 'Surface area', texLines: ['A = 4\\pi r^2', `A = 4\\pi (${tx(r)})^2`, cA ? `A = ${piTex(cA)} \\approx ${tx(A)}` : `A \\approx ${tx(A)}`] });
    steps.push({ title: 'Volume', texLines: ['V = \\frac{4}{3}\\pi r^3', `V = \\frac{4}{3}\\pi (${tx(r)})^3`, cV ? `V = ${piTex(cV)} \\approx ${tx(V)}` : `V \\approx ${tx(V)}`] });
    const answers = [
      answer('Radius r', r, { unit: u.len }),
      answer('Diameter d', 2 * r, { unit: u.len }),
      piAnswer('Surface area A', known === 'A' ? null : cA, A, u.area, true),
      piAnswer('Volume V', known === 'V' ? null : cV, V, u.vol, true),
      piAnswer('Great-circle circumference', rF ? rF.mul(2) : null, 2 * Math.PI * r, u.len),
    ];
    if (known === 'A') answers[2] = answer('Surface area A', A, { unit: u.area, primary: true });
    if (known === 'V') answers[3] = answer('Volume V', V, { unit: u.vol, primary: true });
    return {
      ok: true,
      final: { texLines: [`A ${cA ? `= ${piTex(cA)}` : ''} \\approx ${tx(A)}${u.texArea}`, `V ${cV ? `= ${piTex(cV)}` : ''} \\approx ${tx(V)}${u.texVol}`] },
      answers,
      visual: { svg: sphereSketch({ r: `r = ${fmt(r, 4)}${u.len ? ` ${u.len}` : ''}` }), caption: 'Every point on the surface is the same distance r from the centre.' },
      formula: ['A = 4\\pi r^2 \\qquad V = \\frac{4}{3}\\pi r^3'],
      steps,
      notes: [{ kind: 'info', text: 'Doubling the radius multiplies the surface area by 4 and the volume by 8 (area scales with r², volume with r³).' }],
    };
  },
};
