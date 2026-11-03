/**
 * Ellipsoid x²/a² + y²/b² + z²/c² = 1. Volume V = (4/3)πabc exactly. The surface area has no
 * elementary formula: it is computed from Legendre's incomplete elliptic integrals F and E
 * (evaluated numerically to about 10 significant digits), and compared with Thomsen's
 * approximation (error at most about 1.06%).
 */
import { validator, answer, piAnswer, piTex, fmt, tx, units, UNIT_FIELD } from '../lib/calc-kit.js';
import { parseFrac } from '../lib/fraction.js';
import { adaptiveSimpson } from '../lib/numeric.js';
import { ellipsoidMesh, renderSolid } from '../lib/solid3d.js';
import { ellipsoidPractice } from '../explore/solids-practice.js';

/** Surface area and the intermediate quantities of the elliptic-integral formula. */
export function ellipsoidArea(a, b, c) {
  const [A, B, C] = [a, b, c].sort((x, y) => y - x);
  if (A - C <= 1e-12 * A) return { S: 4 * Math.PI * A * A, sphere: true, A, B, C };
  const phi = Math.acos(C / A);
  const k2 = (A * A * (B * B - C * C)) / (B * B * (A * A - C * C));
  const Fi = adaptiveSimpson((t) => 1 / Math.sqrt(1 - k2 * Math.sin(t) ** 2), 0, phi, 1e-12).value;
  const Ei = adaptiveSimpson((t) => Math.sqrt(1 - k2 * Math.sin(t) ** 2), 0, phi, 1e-12).value;
  const s = Math.sin(phi);
  const S = 2 * Math.PI * C * C + ((2 * Math.PI * A * B) / s) * (Ei * s * s + Fi * (1 - s * s));
  return { S, A, B, C, phi, k2, Fi, Ei };
}
export const thomsen = (a, b, c, p = 1.6075) => 4 * Math.PI * (((a * b) ** p + (a * c) ** p + (b * c) ** p) / 3) ** (1 / p);
const kind = (a, b, c) => {
  const eq = (x, y) => Math.abs(x - y) <= 1e-12 * Math.max(x, y);
  if (eq(a, b) && eq(b, c)) return 'a sphere (all three semi-axes equal)';
  const [A, B, C] = [a, b, c].sort((x, y) => y - x);
  if (eq(A, B)) return 'an oblate spheroid (two longer equal axes, like a lentil or the Earth)';
  if (eq(B, C)) return 'a prolate spheroid (two shorter equal axes, like a rugby ball)';
  return 'a triaxial (scalene) ellipsoid: all three semi-axes differ';
};

export const calculator = {
  id: 'ellipsoid',
  practice: ellipsoidPractice,
  explore: {
    title: 'Stretch an ellipsoid',
    intro: 'Make all three semi-axes equal to get a sphere. Stretch one axis to see how the volume grows in proportion, while the surface area grows more slowly.',
    controls: [
      { name: 'a', label: 'Semi-axis a (left–right)', min: 0.5, max: 6, step: 0.1, value: 5 },
      { name: 'b', label: 'Semi-axis b (up–down)', min: 0.5, max: 6, step: 0.1, value: 3 },
      { name: 'c', label: 'Semi-axis c (front–back)', min: 0.5, max: 6, step: 0.1, value: 2 },
      { name: 'yaw', label: 'Turn', min: 0, max: 360, step: 1, value: 35, unit: '°' },
      { name: 'pitch', label: 'Tilt', min: -10, max: 60, step: 1, value: 22, unit: '°' },
    ],
    rotate: { yaw: 'yaw', pitch: 'pitch' },
    presets: [{ label: 'Sphere', values: { a: 4, b: 4, c: 4 } }, { label: 'Oblate (Earth-like)', values: { a: 5, b: 3, c: 5 } }, { label: 'Prolate (rugby ball)', values: { a: 5.5, b: 3, c: 3 } }],
    render({ a, b, c, yaw, pitch }) {
      const { S } = ellipsoidArea(a, b, c);
      return {
        svg: renderSolid(ellipsoidMesh(a, b, c), { yaw, pitch, scale: 18, title: `Ellipsoid with semi-axes ${a}, ${b}, ${c}` }),
        readouts: [
          { label: 'Volume', tex: `V = \\tfrac{4}{3}\\pi abc \\approx ${tx((4 / 3) * Math.PI * a * b * c, 2)}` },
          { label: 'Surface area', tex: `S \\approx ${tx(S, 2)}` },
          { label: 'Shape', text: kind(a, b, c).replace(/ \(.*\)$/, '').replace(/^an? /, '').replace(/:.*$/, '') },
        ],
      };
    },
  },
  fields: [
    { name: 'a', label: 'Semi-axis a', type: 'number', signed: false, placeholder: 'e.g. 5', affix: 'len', row: 'ax' },
    { name: 'b', label: 'Semi-axis b', type: 'number', signed: false, placeholder: 'e.g. 3', affix: 'len', row: 'ax' },
    { name: 'c', label: 'Semi-axis c', type: 'number', signed: false, placeholder: 'e.g. 2', affix: 'len', row: 'ax', hint: 'Semi-axes are half of the full widths along three perpendicular directions.' },
    UNIT_FIELD,
  ],
  examples: [
    { label: 'Triaxial 5 × 3 × 2 cm', values: { a: '5', b: '3', c: '2', unit: 'cm' } },
    { label: 'Prolate spheroid 6, 4, 4', values: { a: '6', b: '4', c: '4', unit: '' } },
    { label: 'Sphere check: 3, 3, 3', values: { a: '3', b: '3', c: '3', unit: 'm' } },
    { label: 'Invalid: a semi-axis of 0', values: { a: '5', b: '0', c: '2', unit: '' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const a = v.number('a', 'semi-axis a', { positive: true, maxAbs: 1e6 });
    const b = v.number('b', 'semi-axis b', { positive: true, maxAbs: 1e6 });
    const c = v.number('c', 'semi-axis c', { positive: true, maxAbs: 1e6 });
    if (!v.ok()) return v.result();
    const big = Math.max(a, b, c), small = Math.min(a, b, c);
    if (big / small > 1e6) return { ok: false, errors: [{ field: ['a', 'b', 'c'], message: 'The semi-axes differ by more than a factor of a million; the surface-area integral would be unreliable.' }] };
    const u = units(values.unit);
    const fa = parseFrac(values.a), fb = parseFrac(values.b), fc = parseFrac(values.c);
    const coef = fa && fb && fc ? fa.mul(fb).mul(fc).mul(4).div(3) : null;
    const V = (4 / 3) * Math.PI * a * b * c;
    const E = ellipsoidArea(a, b, c);
    const T = thomsen(a, b, c);
    const steps = [
      { title: 'Known values', tex: `a = ${tx(a)},\\quad b = ${tx(b)},\\quad c = ${tx(c)}${u.texLen}` },
      { title: 'Volume', texLines: ['V = \\frac{4}{3}\\pi abc', `V = \\frac{4}{3}\\pi (${tx(a)})(${tx(b)})(${tx(c)})`, coef ? `V = ${piTex(coef)} \\approx ${tx(V)}${u.texVol}` : `V \\approx ${tx(V)}${u.texVol}`] },
    ];
    if (E.sphere) {
      steps.push({ title: 'Surface area (all semi-axes equal: a sphere)', tex: `S = 4\\pi a^2 \\approx ${tx(E.S)}${u.texArea}` });
    } else {
      steps.push({ title: 'Order the semi-axes so that A ≥ B ≥ C', tex: `A = ${tx(E.A)},\\quad B = ${tx(E.B)},\\quad C = ${tx(E.C)}` });
      steps.push({ title: 'Angle and modulus for the elliptic integrals', texLines: [`\\varphi = \\arccos\\frac{C}{A} \\approx ${tx(E.phi, 6)}\\text{ rad}`, `k^2 = \\frac{A^2 (B^2 - C^2)}{B^2 (A^2 - C^2)} \\approx ${tx(E.k2, 6)}`] });
      steps.push({ title: 'Evaluate the elliptic integrals numerically', texLines: [`F(\\varphi, k) = \\int_0^{\\varphi} \\frac{d\\theta}{\\sqrt{1 - k^2 \\sin^2\\theta}} \\approx ${tx(E.Fi, 6)}`, `E(\\varphi, k) = \\int_0^{\\varphi} \\sqrt{1 - k^2 \\sin^2\\theta}\\, d\\theta \\approx ${tx(E.Ei, 6)}`] });
      steps.push({ title: 'Surface area', texLines: ['S = 2\\pi C^2 + \\frac{2\\pi AB}{\\sin\\varphi}\\left(E \\sin^2\\varphi + F \\cos^2\\varphi\\right)', `S \\approx ${tx(E.S)}${u.texArea}`] });
    }
    steps.push({ title: 'Check with Thomsen’s approximation (p = 1.6075)', tex: `S \\approx 4\\pi\\left(\\frac{(ab)^p + (ac)^p + (bc)^p}{3}\\right)^{1/p} \\approx ${tx(T)}` });
    return {
      ok: true,
      final: { texLines: [`V ${coef ? `= ${piTex(coef)}` : ''} \\approx ${tx(V)}${u.texVol}`, `S \\approx ${tx(E.S)}${u.texArea}`] },
      answers: [
        piAnswer('Volume V', coef, V, u.vol, true),
        answer('Surface area S', E.S, { unit: u.area, primary: true, irrational: true }),
        answer('Thomsen approximation of S', T, { unit: u.area, irrational: true }),
        answer('Difference from the approximation', (100 * Math.abs(T - E.S)) / E.S, { unit: '%', irrational: true, decimals: 4 }),
      ],
      visual: { svg: renderSolid(ellipsoidMesh(a, b, c), { yaw: 35, pitch: 22, scale: 110 / big, title: 'Ellipsoid drawn to scale' }), caption: `This is ${kind(a, b, c)}.` },
      formula: ['V = \\frac{4}{3}\\pi abc', 'S = 2\\pi C^2 + \\frac{2\\pi AB}{\\sin\\varphi}\\left(E(\\varphi,k)\\sin^2\\varphi + F(\\varphi,k)\\cos^2\\varphi\\right)'],
      steps,
      notes: [{ kind: 'info', text: 'The volume is exact. The surface area is evaluated numerically (accurate to about 10 significant figures) because no formula with elementary functions exists for a general ellipsoid.' }],
    };
  },
};
