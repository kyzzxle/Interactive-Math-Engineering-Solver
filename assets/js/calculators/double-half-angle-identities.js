/**
 * Double-angle and half-angle identities:
 *   sin 2θ = 2 sin θ cos θ,  cos 2θ = cos²θ − sin²θ = 2cos²θ − 1 = 1 − 2sin²θ,  tan 2θ = 2tanθ/(1 − tan²θ)
 *   sin(θ/2) = ±√((1 − cos θ)/2),  cos(θ/2) = ±√((1 + cos θ)/2),  tan(θ/2) = (1 − cos θ)/sin θ
 * The ± sign is decided by the quadrant of θ/2. Exact values for multiples of 15° (double) or 30° (half).
 */
import { validator, answer, tx } from '../lib/calc-kit.js';
import { exactTrig } from '../lib/trig.js';
import { unitCircleAngles } from './sum-difference-identities.js';

const rad = (d) => (d * Math.PI) / 180;
const FN = { sin: Math.sin, cos: Math.cos, tan: Math.tan };
const quadrant = (d) => { const t = ((d % 360) + 360) % 360; return t === 0 || t === 90 || t === 180 || t === 270 ? 0 : Math.floor(t / 90) + 1; };

export const calculator = {
  id: 'double-half-angle-identities',
  fields: [
    { name: 'kind', label: 'Identity', type: 'radio', options: [['double', 'Double angle (2θ)'], ['half', 'Half angle (θ/2)']] },
    { name: 'fn', label: 'Function', type: 'radio', options: [['sin', 'sin'], ['cos', 'cos'], ['tan', 'tan']] },
    { name: 'theta', label: 'Angle θ', type: 'number', placeholder: 'e.g. 30', suffix: '°' },
  ],
  examples: [
    { label: 'cos 2θ for θ = 30°', values: { kind: 'double', fn: 'cos', theta: '30' } },
    { label: 'sin(θ/2) for θ = 45° (sin 22.5°)', values: { kind: 'half', fn: 'sin', theta: '45' } },
    { label: 'tan 2θ for θ = 15° (tan 30°)', values: { kind: 'double', fn: 'tan', theta: '15' } },
    { label: 'cos(θ/2) for θ = 300° (sign!)', values: { kind: 'half', fn: 'cos', theta: '300' } },
    { label: 'Undefined: tan 2θ at θ = 45°', values: { kind: 'double', fn: 'tan', theta: '45' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const half = values.kind === 'half';
    const fn = FN[values.fn] ? values.fn : 'sin';
    const th = v.number('theta', 'the angle θ', { maxAbs: 1e6 });
    if (!v.ok()) return v.result();
    const target = half ? th / 2 : 2 * th;
    const s = Math.sin(rad(th)), c = Math.cos(rad(th));
    const e = exactTrig(th), eT = exactTrig(target);
    const sT = e ? e.sin[0] : tx(s, 6), cT = e ? e.cos[0] : tx(c, 6);
    const w = (t) => (/^[\d.]+$/.test(t) ? t : `\\left(${t}\\right)`);
    const steps = [{ title: 'Known values', tex: `\\theta = ${tx(th)}^\\circ,\\quad \\sin\\theta = ${sT},\\quad \\cos\\theta = ${cT}` }];
    let identity, subTex;
    if (fn === 'tan' && Math.abs(Math.cos(rad(target))) < 1e-12) return { ok: false, errors: [{ field: 'theta', message: `tan(${tx(target)}°) is undefined because cos(${tx(target)}°) = 0.` }] };
    if (!half) {
      if (fn === 'sin') { identity = '\\sin 2\\theta = 2\\sin\\theta\\cos\\theta'; subTex = `2${w(sT)}${w(cT)}`; }
      else if (fn === 'cos') { identity = '\\cos 2\\theta = \\cos^2\\theta - \\sin^2\\theta = 2\\cos^2\\theta - 1 = 1 - 2\\sin^2\\theta'; subTex = `2${w(cT)}^2 - 1`; }
      else {
        if (Math.abs(c) < 1e-12) return { ok: false, errors: [{ field: 'theta', message: 'tan θ is undefined at this angle, so use sin 2θ / cos 2θ instead.' }] };
        const tT = e && e.tan ? e.tan[0] : tx(s / c, 6);
        identity = '\\tan 2\\theta = \\frac{2\\tan\\theta}{1 - \\tan^2\\theta}'; subTex = `\\frac{2${w(tT)}}{1 - ${w(tT)}^2}`;
      }
      steps.push({ title: 'Identity', tex: identity });
    } else {
      const q = quadrant(target);
      const sign = FN[fn](rad(target)) >= 0 ? '+' : '-';
      if (fn === 'sin') { identity = '\\sin\\frac{\\theta}{2} = \\pm\\sqrt{\\frac{1 - \\cos\\theta}{2}}'; subTex = `${sign === '-' ? '-' : ''}\\sqrt{\\frac{1 - ${w(cT)}}{2}}`; }
      else if (fn === 'cos') { identity = '\\cos\\frac{\\theta}{2} = \\pm\\sqrt{\\frac{1 + \\cos\\theta}{2}}'; subTex = `${sign === '-' ? '-' : ''}\\sqrt{\\frac{1 + ${w(cT)}}{2}}`; }
      else {
        if (Math.abs(s) < 1e-12) return { ok: false, errors: [{ field: 'theta', message: 'The formula (1 − cos θ)/sin θ needs sin θ ≠ 0. Choose another angle.' }] };
        identity = '\\tan\\frac{\\theta}{2} = \\frac{1 - \\cos\\theta}{\\sin\\theta}'; subTex = `\\frac{1 - ${w(cT)}}{${sT}}`;
      }
      steps.push({ title: 'Identity', tex: identity });
      if (fn !== 'tan') steps.push({ title: 'Choose the sign from the quadrant of θ/2', text: `θ/2 = ${tx(target)}° ${q ? `is in quadrant ${['I', 'II', 'III', 'IV'][q - 1]}` : 'is on an axis'}, where ${fn} is ${sign === '+' ? 'positive (or zero)' : 'negative'}, so take the ${sign === '+' ? 'positive' : 'negative'} root.` });
    }
    const name = half ? `\\${fn}\\left(${tx(target)}^\\circ\\right)` : `\\${fn}\\left(${tx(target)}^\\circ\\right)`;
    const num = FN[fn](rad(target));
    const ex = eT && eT[fn] ? eT[fn][0] : null;
    steps.push({ title: 'Substitute', tex: `${name} = ${subTex}` });
    steps.push({ title: 'Simplify', tex: ex ? `${name} = ${ex} \\approx ${tx(num, 6)}` : `${name} \\approx ${tx(num, 6)}` });
    return {
      ok: true,
      final: { tex: `${name} ${ex ? `= ${ex}` : ''} \\approx ${tx(num, 6)}` },
      answers: [answer(`${fn}(${tx(target)}°)`, num, { primary: true, exactTex: ex && !/^-?\d+$/.test(ex) ? ex : undefined, irrational: !(ex && /^-?\d+$/.test(ex)) }), answer(half ? 'Half angle θ/2' : 'Double angle 2θ', target, { unit: '°' })],
      visual: { svg: unitCircleAngles([{ deg: th, cls: 'd-line', label: 'θ' }, { deg: target, cls: 'd-line3', label: half ? 'θ/2' : '2θ' }]), caption: half ? 'θ/2 can be in a different quadrant from θ, which is what fixes the sign of the square root.' : 'Doubling the angle does not double the sine or cosine.' },
      formula: [identity],
      steps,
      notes: [{ kind: 'warn', text: half ? 'Common mistake: forgetting the ± — the square root alone is never negative, so the sign must come from the quadrant of θ/2.' : 'Common mistake: sin 2θ ≠ 2 sin θ. For θ = 60°, sin 120° ≈ 0.866 but 2 sin 60° ≈ 1.732.' }],
    };
  },
};
