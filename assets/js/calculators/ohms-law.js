/**
 * Ohm's law for a resistor: V = I R. Solves for voltage, current or resistance and gives
 * the power dissipated, P = V I = I² R = V² / R.
 */
import { validator, answer } from '../lib/calc-kit.js';
import { q, rel, fmtQ, simpleCircuit } from '../lib/physics-kit.js';
import { ohmExplore, ohmPractice } from '../explore/physics.js';

export const calculator = {
  id: 'ohms-law',
  explore: ohmExplore,
  practice: ohmPractice,
  fields: [
    { name: 'find', label: 'Solve for', type: 'radio', options: [['I', 'Current I'], ['V', 'Voltage V'], ['R', 'Resistance R']] },
    { name: 'V', label: 'Voltage V', type: 'number', signed: false, placeholder: 'e.g. 12', suffix: 'V', showWhen: { find: ['I', 'R'] } },
    { name: 'I', label: 'Current I', type: 'number', signed: false, placeholder: 'e.g. 0.5', suffix: 'A', showWhen: { find: ['V', 'R'] }, hint: 'For milliamps, divide by 1000: 250 mA = 0.25 A.' },
    { name: 'R', label: 'Resistance R', type: 'number', signed: false, placeholder: 'e.g. 220', suffix: 'Ω', showWhen: { find: ['I', 'V'] } },
  ],
  examples: [
    { label: '9 V across 450 Ω', values: { find: 'I', V: '9', R: '450' } },
    { label: '2 A through 6 Ω', values: { find: 'V', I: '2', R: '6' } },
    { label: '230 V lamp drawing 0.25 A', values: { find: 'R', V: '230', I: '0.25' } },
    { label: 'Impossible: zero current with a voltage', values: { find: 'R', V: '12', I: '0' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const find = ['I', 'V', 'R'].includes(values.find) ? values.find : 'I';
    const V = find !== 'V' ? v.number('V', 'the voltage', { nonneg: true, maxAbs: 1e9 }) : null;
    const I = find !== 'I' ? v.number('I', 'the current', { nonneg: true, maxAbs: 1e9 }) : null;
    const R = find !== 'R' ? v.number('R', 'the resistance', { positive: true, maxAbs: 1e15 }) : null;
    if (!v.ok()) return v.result();
    if (R !== null && R < 1e-9) return { ok: false, errors: [{ field: 'R', message: 'Please enter a resistance of at least 0.000000001 Ω (10⁻⁹ Ω); smaller values are effectively a short circuit.' }] };
    if (find === 'R' && I > 0 && V / I < 1e-9) return { ok: false, errors: [{ field: 'V', message: 'That gives a resistance below 10⁻⁹ Ω, which is effectively a short circuit. Check the values.' }] };
    let VV = V, II = I, RR = R;
    const steps = [];
    if (find === 'I') {
      II = V / R;
      steps.push({ title: 'Known values', tex: `V = ${q(V, 'V')},\\quad R = ${q(R, 'Ω')}` });
      steps.push({ title: 'Formula (rearranged)', tex: 'I = \\frac{V}{R}' });
      steps.push({ title: 'Substitute and simplify', tex: `I = \\frac{${q(V, 'V')}}{${q(R, 'Ω')}} ${rel(II)} ${q(II, 'A')}` });
    } else if (find === 'V') {
      VV = I * R;
      steps.push({ title: 'Known values', tex: `I = ${q(I, 'A')},\\quad R = ${q(R, 'Ω')}` });
      steps.push({ title: 'Formula', tex: 'V = I\\,R' });
      steps.push({ title: 'Substitute and simplify', tex: `V = ${q(I, 'A')} \\times ${q(R, 'Ω')} ${rel(VV)} ${q(VV, 'V')}` });
    } else {
      if (I === 0) return { ok: false, errors: [{ field: 'I', message: V === 0 ? 'With no voltage and no current the resistance cannot be found.' : 'A voltage with zero current means an open circuit (infinite resistance), so R cannot be calculated. Enter a current greater than 0.' }] };
      RR = V / I;
      if (RR === 0) return { ok: false, errors: [{ field: 'V', message: 'A current with zero voltage would mean zero resistance (a perfect conductor). Enter a voltage greater than 0.' }] };
      steps.push({ title: 'Known values', tex: `V = ${q(V, 'V')},\\quad I = ${q(I, 'A')}` });
      steps.push({ title: 'Formula (rearranged)', tex: 'R = \\frac{V}{I}' });
      steps.push({ title: 'Substitute and simplify', tex: `R = \\frac{${q(V, 'V')}}{${q(I, 'A')}} ${rel(RR)} ${q(RR, 'Ω')}` });
    }
    if (![VV, II, RR].every(Number.isFinite)) return { ok: false, errors: [{ message: 'These values are too extreme to compute reliably.' }] };
    const P = VV * II;
    steps.push({ title: 'Power dissipated by the resistor', texLines: [`P = V I = ${q(VV, 'V')} \\times ${q(II, 'A')} ${rel(P)} ${q(P, 'W')}`, `\\text{check: } I^2 R ${rel(II * II * RR)} ${q(II * II * RR, 'W')}`] });
    const finalTex = { I: `I ${rel(II)} ${q(II, 'A')}`, V: `V ${rel(VV)} ${q(VV, 'V')}`, R: `R ${rel(RR)} ${q(RR, 'Ω')}` }[find];
    return {
      ok: true,
      final: { tex: finalTex },
      answers: [
        answer('Current I', II, { unit: 'A', primary: find === 'I' }),
        answer('Voltage V', VV, { unit: 'V', primary: find === 'V' }),
        answer('Resistance R', RR, { unit: 'Ω', primary: find === 'R' }),
        answer('Current in milliamps', II * 1000, { unit: 'mA' }),
        answer('Power P', P, { unit: 'W' }),
      ],
      visual: { svg: simpleCircuit({ V: fmtQ(VV, 'V', 3), I: fmtQ(II, 'A', 4), R: fmtQ(RR, 'Ω', 3) }), caption: 'Conventional current flows from the + terminal, through the resistor, back to the − terminal.' },
      formula: ['V = I\\,R \\qquad P = V I = I^2 R = \\frac{V^2}{R}'],
      steps,
      notes: [{ kind: 'info', text: 'Assumes an ohmic resistor at constant temperature (R does not change with current) and ideal wires and source. Filament lamps and diodes do not obey Ohm’s law exactly.' }],
    };
  },
};
