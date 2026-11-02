/**
 * The wave equation v = f λ for periodic waves. Solves for wave speed, frequency or
 * wavelength, and gives the period T = 1/f, angular frequency ω = 2πf and wave number k = 2π/λ.
 */
import { validator, answer, fmt } from '../lib/calc-kit.js';
import { q, rel } from '../lib/physics-kit.js';
import { plot } from '../lib/plot.js';
import { waveExplore, wavePractice } from '../explore/physics.js';

export const calculator = {
  id: 'wave-calculator',
  explore: waveExplore,
  practice: wavePractice,
  fields: [
    { name: 'find', label: 'Solve for', type: 'radio', options: [['v', 'Wave speed v'], ['f', 'Frequency f'], ['lambda', 'Wavelength λ']] },
    { name: 'v', label: 'Wave speed v', type: 'number', signed: false, placeholder: 'e.g. 343', suffix: 'm/s', showWhen: { find: ['f', 'lambda'] }, hint: 'Sound in air ≈ 343 m/s at 20 °C; light in a vacuum = 3.00 × 10^8 m/s (enter 3e8).' },
    { name: 'f', label: 'Frequency f', type: 'number', signed: false, placeholder: 'e.g. 440', suffix: 'Hz', showWhen: { find: ['v', 'lambda'] } },
    { name: 'lambda', label: 'Wavelength λ', type: 'number', signed: false, placeholder: 'e.g. 0.78', suffix: 'm', showWhen: { find: ['v', 'f'] } },
  ],
  examples: [
    { label: 'Note A (440 Hz) in air', values: { find: 'lambda', v: '343', f: '440' } },
    { label: 'Water wave: 2 Hz, λ = 1.5 m', values: { find: 'v', f: '2', lambda: '1.5' } },
    { label: 'Green light, λ = 532 nm', values: { find: 'f', v: '3e8', lambda: '532e-9' } },
  ],
  solve(values) {
    const v = validator(values);
    const find = ['v', 'f', 'lambda'].includes(values.find) ? values.find : 'v';
    const V = find !== 'v' ? v.number('v', 'the wave speed', { positive: true, maxAbs: 1e9 }) : null;
    const F = find !== 'f' ? v.number('f', 'the frequency', { positive: true, maxAbs: 1e20 }) : null;
    const L = find !== 'lambda' ? v.number('lambda', 'the wavelength', { positive: true, maxAbs: 1e9 }) : null;
    if (!v.ok()) return v.result();
    let VV = V, FF = F, LL = L;
    const steps = [];
    if (find === 'v') {
      VV = F * L;
      steps.push({ title: 'Known values', tex: `f = ${q(F, 'Hz')},\\quad \\lambda = ${q(L, 'm')}` });
      steps.push({ title: 'Formula', tex: 'v = f\\lambda' });
      steps.push({ title: 'Substitute and simplify', tex: `v = ${q(F, 'Hz')} \\times ${q(L, 'm')} ${rel(VV)} ${q(VV, 'm/s')}` });
    } else if (find === 'f') {
      FF = V / L;
      steps.push({ title: 'Known values', tex: `v = ${q(V, 'm/s')},\\quad \\lambda = ${q(L, 'm')}` });
      steps.push({ title: 'Formula (rearranged)', tex: 'f = \\frac{v}{\\lambda}' });
      steps.push({ title: 'Substitute and simplify', tex: `f = \\frac{${q(V, 'm/s')}}{${q(L, 'm')}} ${rel(FF)} ${q(FF, 'Hz')}` });
    } else {
      LL = V / F;
      steps.push({ title: 'Known values', tex: `v = ${q(V, 'm/s')},\\quad f = ${q(F, 'Hz')}` });
      steps.push({ title: 'Formula (rearranged)', tex: '\\lambda = \\frac{v}{f}' });
      steps.push({ title: 'Substitute and simplify', tex: `\\lambda = \\frac{${q(V, 'm/s')}}{${q(F, 'Hz')}} ${rel(LL)} ${q(LL, 'm')}` });
    }
    if (![VV, FF, LL].every((x) => Number.isFinite(x) && x > 0) || FF > 1e300 || LL < 1e-300) return { ok: false, errors: [{ message: 'These values are too extreme to compute reliably.' }] };
    const T = 1 / FF;
    steps.push({ title: 'Period (time for one full wave to pass)', tex: `T = \\frac{1}{f} ${rel(T)} ${q(T, 's')}` });
    const finalTex = { v: `v ${rel(VV)} ${q(VV, 'm/s')}`, f: `f ${rel(FF)} ${q(FF, 'Hz')}`, lambda: `\\lambda ${rel(LL)} ${q(LL, 'm')}` }[find];
    const notes = [{ kind: 'info', text: 'The wave speed is set by the medium (string tension, air temperature, water depth…). Changing the source frequency changes the wavelength, not the speed.' }];
    if (VV > 2.9e8 && VV < 3.1e8) notes.push({ kind: 'info', text: `Electromagnetic wave: λ = ${fmt(LL * 1e9, 4)} nm.` });
    return {
      ok: true,
      final: { tex: finalTex },
      answers: [
        answer('Wave speed v', VV, { unit: 'm/s', primary: find === 'v' }),
        answer('Frequency f', FF, { unit: 'Hz', primary: find === 'f' }),
        answer('Wavelength λ', LL, { unit: 'm', primary: find === 'lambda' }),
        answer('Period T', T, { unit: 's' }),
        answer('Angular frequency ω = 2πf', 2 * Math.PI * FF, { unit: 'rad/s' }),
        answer('Wave number k = 2π/λ', (2 * Math.PI) / LL, { unit: 'rad/m' }),
      ],
      visual: {
        svg: plot({ x: [0, 2], y: [-1.4, 1.4], width: 380, height: 200, title: 'Two wavelengths of the wave', curves: [{ f: (x) => Math.sin(2 * Math.PI * x) }], segments: [{ x1: 0.25, y1: 1.15, x2: 1.25, y2: 1.15, cls: 'd-line3' }], points: [{ x: 0.25, y: 1, label: 'crest' }, { x: 1.25, y: 1, label: 'next crest' }], xTicks: [{ x: 0, label: '0' }, { x: 1, label: 'λ' }, { x: 2, label: '2λ' }] }),
        caption: 'One wavelength λ is the distance between neighbouring crests. One crest passes a point every period T.',
      },
      formula: ['v = f\\lambda \\qquad T = \\frac{1}{f}'],
      steps,
      notes,
    };
  },
};
