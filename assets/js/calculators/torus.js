/**
 * Ring torus (doughnut): tube radius r swept around a circle of radius R (R ≥ r > 0).
 * Pappus's theorems: V = (πr²)(2πR) = 2π²Rr²,  A = (2πr)(2πR) = 4π²Rr.
 */
import { validator, answer, tx, fmt, units, UNIT_FIELD } from '../lib/calc-kit.js';
import { parseFrac } from '../lib/fraction.js';
import { torusMesh, renderSolid } from '../lib/solid3d.js';

const pi2Tex = (f) => (f.isZero() ? '0' : f.d === 1n ? `${f.n === 1n ? '' : f.n}\\pi^2` : `\\frac{${f.n === 1n ? '' : f.n}\\pi^2}{${f.d}}`);
const pi2Text = (f) => `${f.n === 1n ? '' : f.n}π²${f.d === 1n ? '' : `/${f.d}`}`;

export const calculator = {
  id: 'torus',
  explore: {
    title: 'Shape a doughnut',
    intro: 'Pappus: the volume is the tube’s cross-section area times the distance its centre travels (2πR). Double R and the volume doubles; double r and it quadruples.',
    controls: [
      { name: 'R', label: 'Major radius R', min: 1, max: 6, step: 0.1, value: 4 },
      { name: 'r', label: 'Tube radius r', min: 0.2, max: (v) => v.R, step: 0.1, value: 1.5 },
      { name: 'yaw', label: 'Turn', min: 0, max: 360, step: 1, value: 20, unit: '°' },
      { name: 'pitch', label: 'Tilt', min: 0, max: 80, step: 1, value: 35, unit: '°' },
    ],
    rotate: { yaw: 'yaw', pitch: 'pitch' },
    presets: [{ label: 'Thin ring', values: { R: 5, r: 0.5 } }, { label: 'Horn torus (R = r)', values: { R: 3, r: 3 } }],
    render({ R, r, yaw, pitch }) {
      return {
        svg: renderSolid(torusMesh(R, r), { yaw, pitch, scale: 22, title: `Torus with R = ${R} and r = ${r}` }),
        readouts: [
          { label: 'Volume', tex: `V = 2\\pi^2 R r^2 \\approx ${tx(2 * Math.PI ** 2 * R * r * r, 2)}` },
          { label: 'Surface area', tex: `A = 4\\pi^2 R r \\approx ${tx(4 * Math.PI ** 2 * R * r, 2)}` },
          { label: 'Hole diameter', tex: `2(R - r) = ${tx(2 * (R - r), 2)}` },
        ],
      };
    },
  },
  fields: [
    { name: 'R', label: 'Major radius R', type: 'number', signed: false, placeholder: 'e.g. 6', affix: 'len', row: 'r', hint: 'From the centre of the hole to the centre of the tube.' },
    { name: 'r', label: 'Minor (tube) radius r', type: 'number', signed: false, placeholder: 'e.g. 2', affix: 'len', row: 'r' },
    UNIT_FIELD,
  ],
  examples: [
    { label: 'Doughnut R = 6 cm, r = 2 cm', values: { R: '6', r: '2', unit: 'cm' } },
    { label: 'Inner tube R = 30, r = 8 cm', values: { R: '30', r: '8', unit: 'cm' } },
    { label: 'Horn torus R = r = 3', values: { R: '3', r: '3', unit: '' } },
    { label: 'Not supported: r larger than R', values: { R: '2', r: '3', unit: '' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const R = v.number('R', 'the major radius', { positive: true, maxAbs: 1e6 });
    const r = v.number('r', 'the tube radius', { positive: true, maxAbs: 1e6 });
    if (!v.ok()) return v.result();
    if (r > R) return { ok: false, errors: [{ field: 'r', message: 'The tube radius r must not exceed R. With r > R the tube passes through the axis (a spindle torus) and these formulas count the overlap twice.' }] };
    const u = units(values.unit);
    const fR = parseFrac(values.R), fr = parseFrac(values.r);
    const cV = fR && fr ? fR.mul(fr.pow(2)).mul(2) : null, cA = fR && fr ? fR.mul(fr).mul(4) : null;
    const V = 2 * Math.PI ** 2 * R * r * r, A = 4 * Math.PI ** 2 * R * r;
    const ans = (label, c, x, unit, primary) => { const o = answer(label, x, { unit, primary, irrational: true }); if (c) { o.exactTex = pi2Tex(c); o.copy = `${label}: ${pi2Text(c)} ≈ ${o.value}`; } return o; };
    return {
      ok: true,
      final: { texLines: [`V ${cV ? `= ${pi2Tex(cV)}` : ''} \\approx ${tx(V)}${u.texVol}`, `A ${cA ? `= ${pi2Tex(cA)}` : ''} \\approx ${tx(A)}${u.texArea}`] },
      answers: [
        ans('Volume V', cV, V, u.vol, true),
        ans('Surface area A', cA, A, u.area, true),
        answer('Inner (hole) radius R − r', R - r, { unit: u.len }),
        answer('Outer radius R + r', R + r, { unit: u.len }),
      ],
      visual: { svg: renderSolid(torusMesh(R, r), { yaw: 20, pitch: 35, scale: 125 / (R + r), title: 'Torus drawn to scale' }), caption: 'The tube is a circle of radius r whose centre travels around a circle of radius R.' },
      formula: ['V = 2\\pi^2 R r^2 \\qquad A = 4\\pi^2 R r'],
      steps: [
        { title: 'Known values', tex: `R = ${tx(R)},\\quad r = ${tx(r)}${u.texLen}` },
        { title: 'Pappus: volume = cross-section area × path of its centre', texLines: ['V = \\left(\\pi r^2\\right)\\left(2\\pi R\\right) = 2\\pi^2 R r^2', `V = 2\\pi^2 (${tx(R)})(${tx(r)})^2 ${cV ? `= ${pi2Tex(cV)}` : ''} \\approx ${tx(V)}`] },
        { title: 'Pappus: area = circumference of the tube × path of its centre', texLines: ['A = \\left(2\\pi r\\right)\\left(2\\pi R\\right) = 4\\pi^2 R r', `A = 4\\pi^2 (${tx(R)})(${tx(r)}) ${cA ? `= ${pi2Tex(cA)}` : ''} \\approx ${tx(A)}`] },
      ],
      notes: [{ kind: 'info', text: R === r ? 'R = r is a horn torus: the hole closes to a single point. The formulas still hold.' : `The hole has diameter 2(R − r) = ${fmt(2 * (R - r))}${u.len ? ` ${u.len}` : ''}.` }],
    };
  },
};
