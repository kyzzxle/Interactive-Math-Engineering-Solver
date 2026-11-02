/**
 * Sum and difference identities:
 *   sin(A ± B) = sin A cos B ± cos A sin B
 *   cos(A ± B) = cos A cos B ∓ sin A sin B
 *   tan(A ± B) = (tan A ± tan B)/(1 ∓ tan A tan B)
 * Exact values are used when A and B are multiples of 15°; otherwise decimals.
 */
import { validator, answer, tx } from '../lib/calc-kit.js';
import { exactTrig } from '../lib/trig.js';
import { plot } from '../lib/plot.js';

const rad = (d) => (d * Math.PI) / 180;
const FN = { sin: Math.sin, cos: Math.cos, tan: Math.tan };
const wrap = (t) => (/^[\d.]+$|^\\frac\{[^{}]*\}\{[^{}]*\}$|^\\sqrt\{\d+\}$/.test(t) ? t : `\\left(${t}\\right)`);

export function unitCircleAngles(angles) {
  const segs = [], pts = [];
  angles.forEach(({ deg, cls, label }) => {
    const r = rad(deg), x = Math.cos(r), y = Math.sin(r);
    segs.push({ x1: 0, y1: 0, x2: x, y2: y, cls });
    pts.push({ x, y, label, cls: cls === 'd-line' ? 'd-point' : cls === 'd-line2' ? 'd-point2' : 'd-point3' });
  });
  return plot({ x: [-1.5, 1.5], y: [-1.25, 1.25], equal: true, width: 340, height: 280, title: 'Angles on the unit circle', circles: [{ cx: 0, cy: 0, r: 1 }], segments: segs, points: pts });
}

export const calculator = {
  id: 'sum-difference-identities',
  fields: [
    { name: 'fn', label: 'Function', type: 'radio', options: [['sin', 'sin'], ['cos', 'cos'], ['tan', 'tan']] },
    { name: 'op', label: 'Sum or difference', type: 'radio', options: [['+', 'A + B'], ['-', 'A − B']] },
    { name: 'A', label: 'Angle A', type: 'number', placeholder: 'e.g. 45', suffix: '°', row: 'ab' },
    { name: 'B', label: 'Angle B', type: 'number', placeholder: 'e.g. 30', suffix: '°', row: 'ab', hint: 'Degrees. Multiples of 15° give exact answers.' },
  ],
  examples: [
    { label: 'sin 75° = sin(45° + 30°)', values: { fn: 'sin', op: '+', A: '45', B: '30' } },
    { label: 'cos 15° = cos(45° − 30°)', values: { fn: 'cos', op: '-', A: '45', B: '30' } },
    { label: 'tan 105° = tan(60° + 45°)', values: { fn: 'tan', op: '+', A: '60', B: '45' } },
    { label: 'sin(40° + 25°) (decimal)', values: { fn: 'sin', op: '+', A: '40', B: '25' } },
    { label: 'Undefined: tan(45° + 45°)', values: { fn: 'tan', op: '+', A: '45', B: '45' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const fn = FN[values.fn] ? values.fn : 'sin';
    const plus = values.op !== '-';
    const A = v.number('A', 'angle A', { maxAbs: 1e6 }), B = v.number('B', 'angle B', { maxAbs: 1e6 });
    if (!v.ok()) return v.result();
    const C = plus ? A + B : A - B;
    const s = plus ? '+' : '-', ms = plus ? '-' : '+';
    const eA = exactTrig(A), eB = exactTrig(B), eC = exactTrig(C);
    const val = (e, d, f) => (e && e[f] ? e[f][0] : tx(FN[f](rad(d)), 6));
    if (fn === 'tan' && (Math.abs(Math.cos(rad(A))) < 1e-12 || Math.abs(Math.cos(rad(B))) < 1e-12)) return { ok: false, errors: [{ field: Math.abs(Math.cos(rad(A))) < 1e-12 ? 'A' : 'B', message: 'tan is not defined at 90° + 180°n, so the tangent identity cannot be used with this angle. Use the sine and cosine identities instead.' }] };
    if (fn === 'tan' && Math.abs(Math.cos(rad(C))) < 1e-12) return { ok: false, errors: [{ field: 'B', message: `tan(${tx(C)}°) is undefined: the denominator 1 ${ms} tan A tan B equals 0.` }] };
    const identity = {
      sin: `\\sin(A ${s} B) = \\sin A \\cos B ${s} \\cos A \\sin B`,
      cos: `\\cos(A ${s} B) = \\cos A \\cos B ${ms} \\sin A \\sin B`,
      tan: `\\tan(A ${s} B) = \\frac{\\tan A ${s} \\tan B}{1 ${ms} \\tan A \\tan B}`,
    }[fn];
    const sA = val(eA, A, 'sin'), cA = val(eA, A, 'cos'), sB = val(eB, B, 'sin'), cB = val(eB, B, 'cos'), tA = val(eA, A, 'tan'), tB = val(eB, B, 'tan');
    const sub = {
      sin: `${wrap(sA)}${wrap(cB)} ${s} ${wrap(cA)}${wrap(sB)}`,
      cos: `${wrap(cA)}${wrap(cB)} ${ms} ${wrap(sA)}${wrap(sB)}`,
      tan: `\\frac{${tA} ${s} ${wrap(tB)}}{1 ${ms} ${wrap(tA)}${wrap(tB)}}`,
    }[fn];
    const exactAll = eA && eB && eC;
    const resultExact = exactAll && eC[fn] ? eC[fn][0] : null;
    const num = FN[fn](rad(C));
    const steps = [
      { title: 'Known values', tex: `A = ${tx(A)}^\\circ,\\quad B = ${tx(B)}^\\circ,\\quad A ${s} B = ${tx(C)}^\\circ` },
      { title: 'Identity', tex: identity },
      { title: exactAll ? 'Exact values of the parts (special angles)' : 'Values of the parts', texLines: fn === 'tan' ? [`\\tan A = ${tA},\\quad \\tan B = ${tB}`] : [`\\sin A = ${sA},\\quad \\cos A = ${cA}`, `\\sin B = ${sB},\\quad \\cos B = ${cB}`] },
      { title: 'Substitute', tex: `\\${fn}(${tx(C)}^\\circ) = ${sub}` },
      { title: 'Simplify', tex: resultExact ? `\\${fn}(${tx(C)}^\\circ) = ${resultExact} \\approx ${tx(num, 6)}` : `\\${fn}(${tx(C)}^\\circ) \\approx ${tx(num, 6)}` },
    ];
    return {
      ok: true,
      final: { tex: `\\${fn}(${tx(A)}^\\circ ${s} ${tx(B)}^\\circ) ${resultExact ? `= ${resultExact}` : ''} \\approx ${tx(num, 6)}` },
      answers: [answer(`${fn}(${tx(C)}°)`, num, { primary: true, exactTex: resultExact && !/^-?\d+$/.test(resultExact) ? resultExact : undefined, irrational: !(resultExact && /^-?\d+$/.test(resultExact)) }), answer('Angle A ± B', C, { unit: '°' })],
      visual: { svg: unitCircleAngles([{ deg: A, cls: 'd-line', label: 'A' }, { deg: C, cls: 'd-line3', label: plus ? 'A + B' : 'A − B' }]), caption: `B is the turn from A to A ${plus ? '+' : '−'} B. The identity builds the result from the coordinates of A and B.` },
      formula: [identity],
      steps,
      notes: [{ kind: 'warn', text: `A common mistake: ${fn}(A ${s} B) is NOT ${fn} A ${s} ${fn} B. For example sin(30° + 60°) = 1, but sin 30° + sin 60° ≈ 1.366.` }],
    };
  },
};
