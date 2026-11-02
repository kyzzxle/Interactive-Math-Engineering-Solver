/**
 * Simple harmonic motion of a mass m on an ideal spring of stiffness k (no friction):
 *   ω = √(k/m),  T = 2π√(m/k),  x(t) = A cos(ωt + φ),  v_max = Aω,  a_max = Aω²,  E = ½kA²
 * The period does not depend on the amplitude.
 */
import { validator, answer, tx, fmt } from '../lib/calc-kit.js';
import { q, svgWrap, energyBars } from '../lib/physics-kit.js';
import { plot } from '../lib/plot.js';
import { randInt, pick } from '../lib/learn.js';

function springSvg(x, A) {
  const W = 380, H = 110, wall = 20, rest = 210, scale = 90 / Math.max(A, 1e-9), mx = rest + x * scale, y = 55;
  const coils = 12, pts = [];
  for (let i = 0; i <= coils; i++) pts.push(`${wall + 15 + ((mx - wall - 35) * i) / coils},${i === 0 || i === coils ? y : y + (i % 2 ? -12 : 12)}`);
  return svgWrap(W, H, 'Mass on a spring', `<line class="d-wire" x1="${wall}" y1="15" x2="${wall}" y2="95" style="stroke-width:4"/><polyline class="d-resistor" points="${wall},${y} ${pts.join(' ')} ${mx - 20},${y}"/><rect class="d-body" x="${mx - 20}" y="${y - 20}" width="40" height="40" rx="4"/><line class="d-ground" x1="${wall}" y1="${y + 22}" x2="${W - 10}" y2="${y + 22}"/><line class="d-perp" x1="${rest}" y1="20" x2="${rest}" y2="${y + 30}"/><text class="d-text-muted" x="${rest}" y="14" text-anchor="middle">x = 0</text>`);
}

export const calculator = {
  id: 'spring-mass-shm',
  explore: {
    title: 'Set a mass oscillating',
    intro: 'Press Play. A heavier mass or a softer spring oscillates more slowly; a bigger amplitude does not change the period — it only makes the motion faster through the middle.',
    controls: [
      { name: 'm', label: 'Mass m', min: 0.1, max: 5, step: 0.1, value: 1, unit: 'kg' },
      { name: 'k', label: 'Spring constant k', min: 5, max: 200, step: 1, value: 40, unit: 'N/m' },
      { name: 'A', label: 'Amplitude A', min: 0.02, max: 0.5, step: 0.01, value: 0.2, unit: 'm' },
      { name: 't', label: 'Time t', min: 0, max: 10, step: 0.01, value: 0, unit: 's' },
    ],
    animate: { control: 't', seconds: 10, loop: true },
    render({ m, k, A, t }) {
      const w = Math.sqrt(k / m), x = A * Math.cos(w * t), v = -A * w * Math.sin(w * t);
      return {
        svg: springSvg(x, A),
        html: plot({ x: [0, 10], y: [-0.55, 0.55], width: 380, height: 150, title: 'Position against time', curves: [{ f: (s) => A * Math.cos(w * s), samples: 900 }], points: [{ x: t, y: x, cls: 'd-point3' }] }),
        readouts: [
          { label: 'Period', tex: `T = 2\\pi\\sqrt{\\frac{m}{k}} \\approx ${q((2 * Math.PI) / w, 's', 3)}`, tone: 'good' },
          { label: 'Now', tex: `x \\approx ${tx(x, 3)}\\ \\text{m},\\ v \\approx ${tx(v, 3)}\\ \\text{m/s}` },
          { label: 'Energy', tex: `KE \\approx ${tx(0.5 * m * v * v, 3)},\\ PE \\approx ${tx(0.5 * k * x * x, 3)}\\ \\text{J}` },
        ],
      };
    },
  },
  practice: {
    title: 'Period of a spring',
    generate(rand) {
      const m = pick(rand, [0.2, 0.5, 1, 1.5, 2, 4]), k = randInt(rand, 10, 200);
      const T = 2 * Math.PI * Math.sqrt(m / k);
      return {
        prompt: `<p>A <strong>${m} kg</strong> mass hangs on a spring with <strong>k = ${k} N/m</strong>. Find the period and the frequency of its oscillation (3 decimal places).</p>`,
        answers: [{ label: 'Period', value: T, unit: 's', decimals: 3 }, { label: 'Frequency', value: 1 / T, unit: 'Hz', decimals: 3 }],
        hint: 'T = 2π√(m/k); the frequency is the reciprocal of the period.',
        hintTex: 'T = 2\\pi\\sqrt{\\frac{m}{k}}',
        steps: [{ title: 'Period', tex: `T = 2\\pi\\sqrt{\\frac{${m}}{${k}}} \\approx ${tx(T, 4)}\\ \\text{s}` }, { title: 'Frequency', tex: `f = \\frac{1}{T} \\approx ${tx(1 / T, 4)}\\ \\text{Hz}` }],
      };
    },
  },
  fields: [
    { name: 'm', label: 'Mass m', type: 'number', signed: false, placeholder: 'e.g. 0.5', suffix: 'kg', row: 'mk' },
    { name: 'k', label: 'Spring constant k', type: 'number', signed: false, placeholder: 'e.g. 20', suffix: 'N/m', row: 'mk' },
    { name: 'A', label: 'Amplitude A', type: 'number', signed: false, placeholder: 'e.g. 0.1', suffix: 'm', hint: 'The largest distance from the rest position. Released from rest at x = A.' },
    { name: 't', label: 'Position at time t (optional)', type: 'number', signed: false, placeholder: 'e.g. 0.3', suffix: 's' },
  ],
  examples: [
    { label: '0.5 kg on a 20 N/m spring, A = 0.1 m', values: { m: '0.5', k: '20', A: '0.1', t: '0.3' } },
    { label: 'Car suspension: 300 kg, 30 000 N/m, 5 cm', values: { m: '300', k: '30000', A: '0.05', t: '' } },
    { label: 'Stiff spring: 0.1 kg, 1000 N/m, 1 cm', values: { m: '0.1', k: '1000', A: '0.01', t: '0.01' } },
    { label: 'Invalid: zero spring constant', values: { m: '1', k: '0', A: '0.1', t: '' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const m = v.number('m', 'the mass', { positive: true, maxAbs: 1e9 }), k = v.number('k', 'the spring constant', { positive: true, maxAbs: 1e12 }), A = v.number('A', 'the amplitude', { positive: true, maxAbs: 1e6 });
    const t = String(values.t ?? '').trim() === '' ? null : v.number('t', 'the time', { nonneg: true, maxAbs: 1e9 });
    if (!v.ok()) return v.result();
    const w = Math.sqrt(k / m), T = (2 * Math.PI) / w, vmax = A * w, amax = A * w * w, E = 0.5 * k * A * A;
    const steps = [
      { title: 'Known values', tex: `m = ${q(m, 'kg')},\\quad k = ${q(k, 'N/m')},\\quad A = ${q(A, 'm')}` },
      { title: 'Angular frequency', tex: `\\omega = \\sqrt{\\frac{k}{m}} = \\sqrt{\\frac{${tx(k)}}{${tx(m)}}} \\approx ${q(w, 'rad/s')}` },
      { title: 'Period and frequency', texLines: [`T = \\frac{2\\pi}{\\omega} = 2\\pi\\sqrt{\\frac{m}{k}} \\approx ${q(T, 's')}`, `f = \\frac{1}{T} \\approx ${q(1 / T, 'Hz')}`] },
      { title: 'Maximum speed (at x = 0) and acceleration (at x = ±A)', texLines: [`v_{\\max} = A\\omega \\approx ${q(vmax, 'm/s')}`, `a_{\\max} = A\\omega^2 \\approx ${q(amax, 'm/s²')}`] },
      { title: 'Total energy', tex: `E = \\tfrac{1}{2}kA^2 = \\tfrac{1}{2}(${tx(k)})(${tx(A)})^2 \\approx ${q(E, 'J')}` },
    ];
    const answers = [answer('Period T', T, { unit: 's', primary: true, irrational: true }), answer('Frequency f', 1 / T, { unit: 'Hz', irrational: true }), answer('Angular frequency ω', w, { unit: 'rad/s', irrational: true }), answer('Maximum speed', vmax, { unit: 'm/s', irrational: true }), answer('Maximum acceleration', amax, { unit: 'm/s²', irrational: true }), answer('Total energy', E, { unit: 'J' })];
    let xt = null;
    if (t !== null) {
      xt = A * Math.cos(w * t);
      const vt = -A * w * Math.sin(w * t);
      steps.push({ title: `Position and velocity at t = ${fmt(t)} s (released from rest at x = A)`, texLines: [`x(t) = A\\cos(\\omega t) = ${tx(A)}\\cos(${tx(w, 4)} \\times ${tx(t)}) \\approx ${q(xt, 'm')}`, `v(t) = -A\\omega\\sin(\\omega t) \\approx ${q(vt, 'm/s')}`] });
      answers.splice(1, 0, answer(`Position at t = ${fmt(t)} s`, xt, { unit: 'm', primary: true, irrational: true }));
    }
    return {
      ok: true,
      final: { texLines: [`T \\approx ${q(T, 's')},\\quad \\omega \\approx ${q(w, 'rad/s')}`, ...(xt !== null ? [`x(${tx(t)}) \\approx ${q(xt, 'm')}`] : [])] },
      answers,
      visual: { svg: plot({ x: [0, 2 * T], y: [-1.3 * A, 1.3 * A], width: 380, height: 220, title: 'Position over two periods', curves: [{ f: (s) => A * Math.cos(w * s), samples: 600 }], points: t !== null && t <= 2 * T ? [{ x: t, y: xt, cls: 'd-point3', label: `t = ${fmt(t, 3)}` }] : [], xLabel: 't (s)', yLabel: 'x (m)' }) + energyBars([{ label: 'KE max', value: E }, { label: 'PE max', value: E }, { label: 'Total', value: E, cls: 'd-bar-hi' }], 'Energy swaps between kinetic and elastic potential'), caption: 'The motion is a cosine wave. Energy moves back and forth between kinetic (fastest at x = 0) and elastic potential (largest at x = ±A); the total stays ½kA².' },
      formula: ['\\omega = \\sqrt{\\frac{k}{m}} \\qquad T = 2\\pi\\sqrt{\\frac{m}{k}} \\qquad x(t) = A\\cos(\\omega t)'],
      steps,
      notes: [{ kind: 'info', text: 'Model: an ideal massless spring obeying Hooke’s law F = −kx, no friction or air resistance, and amplitudes small enough that the spring stays linear. For a vertical spring the same formulas hold, measured from the hanging rest position.' }],
    };
  },
};
