/**
 * Fourier series of three standard periodic waves with amplitude A and period T (ω₀ = 2π/T):
 *   square    f = +A on (0, T/2), −A on (−T/2, 0):   bₙ = 4A/(nπ) for odd n, 0 for even n
 *   sawtooth  f = 2At/T on (−T/2, T/2):               bₙ = 2A(−1)^{n+1}/(nπ)
 *   triangle  f = A(1 − 4|t|/T) on (−T/2, T/2):       aₙ = 8A/(n²π²) for odd n
 * Partial sums show convergence and the Gibbs overshoot at jumps.
 */
import { validator, answer, tx, fmt } from '../lib/calc-kit.js';
import { plot } from '../lib/plot.js';

const WAVES = [['square', 'Square wave'], ['saw', 'Sawtooth wave'], ['triangle', 'Triangle wave']];
const mod = (t, T) => ((((t + T / 2) % T) + T) % T) - T / 2; // into (−T/2, T/2]

export function wave(kind, A, T) {
  if (kind === 'square') return (t) => { const u = mod(t, T); return u === 0 || Math.abs(Math.abs(u) - T / 2) < 1e-12 ? 0 : u > 0 ? A : -A; };
  if (kind === 'saw') return (t) => { const u = mod(t, T); return Math.abs(Math.abs(u) - T / 2) < 1e-12 ? 0 : (2 * A * u) / T; };
  return (t) => A * (1 - (4 * Math.abs(mod(t, T))) / T);
}
/** Coefficients [{ n, a, b }] for n = 1..N. */
export function coeffs(kind, A, N) {
  return Array.from({ length: N }, (_, i) => {
    const n = i + 1;
    if (kind === 'square') return { n, a: 0, b: n % 2 ? (4 * A) / (n * Math.PI) : 0 };
    if (kind === 'saw') return { n, a: 0, b: (2 * A * (n % 2 ? 1 : -1)) / (n * Math.PI) };
    return { n, a: n % 2 ? (8 * A) / (n * n * Math.PI * Math.PI) : 0, b: 0 };
  });
}
export const partial = (cs, T) => (t) => cs.reduce((s, c) => s + c.a * Math.cos((2 * Math.PI * c.n * t) / T) + c.b * Math.sin((2 * Math.PI * c.n * t) / T), 0);
const SERIES_TEX = {
  square: (A) => `\\frac{${tx(4 * A)}}{\\pi}\\sum_{n \\text{ odd}} \\frac{\\sin(n\\omega_0 t)}{n}`,
  saw: (A) => `\\frac{${tx(2 * A)}}{\\pi}\\sum_{n=1}^{\\infty} \\frac{(-1)^{n+1}\\sin(n\\omega_0 t)}{n}`,
  triangle: (A) => `\\frac{${tx(8 * A)}}{\\pi^2}\\sum_{n \\text{ odd}} \\frac{\\cos(n\\omega_0 t)}{n^2}`,
};

export const calculator = {
  id: 'fourier-series',
  explore: {
    title: 'Add harmonics one by one',
    intro: 'Each extra term adds a faster wave. Smooth shapes (triangle) converge quickly; shapes with jumps (square, sawtooth) keep a small overshoot near each jump — the Gibbs phenomenon.',
    controls: [
      { name: 'kind', label: 'Wave', type: 'select', options: WAVES, value: 'square' },
      { name: 'N', label: 'Number of harmonics N', min: 1, max: 40, step: 1, value: 3 },
    ],
    animate: { control: 'N', seconds: 8 },
    render({ kind, N }) {
      const f = wave(kind, 1, 2), cs = coeffs(kind, 1, N), S = partial(cs, 2);
      let maxS = -Infinity; for (let i = 0; i <= 2000; i++) maxS = Math.max(maxS, S(-2 + (4 * i) / 2000));
      return {
        svg: plot({ x: [-2, 2], y: [-1.5, 1.5], width: 400, height: 260, title: `Partial sum with ${N} harmonics`, curves: [{ f, cls: 'd-hidden', samples: 800 }, { f: S, samples: 1200 }] }),
        readouts: [
          { label: 'Non-zero terms used', text: String(cs.filter((c) => c.a || c.b).length) },
          { label: 'Peak of the partial sum', tex: `${tx(maxS, 4)}${kind === 'triangle' ? '' : `\\ (\\text{overshoot } ${tx(100 * (maxS - 1), 1)}\\%)`}`, tone: 'good' },
        ],
      };
    },
  },
  fields: [
    { name: 'kind', label: 'Periodic function', type: 'select', options: WAVES },
    { name: 'A', label: 'Amplitude A', type: 'number', signed: false, placeholder: 'e.g. 1', row: 'p' },
    { name: 'T', label: 'Period T', type: 'number', signed: false, placeholder: 'e.g. 2', row: 'p' },
    { name: 'N', label: 'Harmonics in the partial sum N', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 7', hint: 'From 1 to 100.' },
  ],
  examples: [
    { label: 'Square wave, A = 1, T = 2π, 7 harmonics', values: { kind: 'square', A: '1', T: '6.283185307', N: '7' } },
    { label: 'Sawtooth A = 2, T = 1, 10 harmonics', values: { kind: 'saw', A: '2', T: '1', N: '10' } },
    { label: 'Triangle A = 3, T = 4, 5 harmonics', values: { kind: 'triangle', A: '3', T: '4', N: '5' } },
    { label: 'Invalid: period 0', values: { kind: 'square', A: '1', T: '0', N: '5' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const kind = WAVES.some(([k]) => k === values.kind) ? values.kind : 'square';
    const A = v.number('A', 'the amplitude', { positive: true, maxAbs: 1e6 }), T = v.number('T', 'the period', { positive: true, maxAbs: 1e6 });
    const N = v.whole('N', 'N', 100, 1);
    if (!v.ok()) return v.result();
    if (T < 1e-6) return { ok: false, errors: [{ field: 'T', message: 'Please use a period of at least 10⁻⁶.' }] };
    const cs = coeffs(kind, A, N), S = partial(cs, T), f = wave(kind, A, T);
    const w0 = (2 * Math.PI) / T;
    const def = { square: `f(t) = \\begin{cases} ${tx(A)}, & 0 < t < \\frac{T}{2} \\\\ -${tx(A)}, & -\\frac{T}{2} < t < 0 \\end{cases}`, saw: `f(t) = \\frac{2 \\cdot ${tx(A)}\\,t}{T},\\quad -\\frac{T}{2} < t < \\frac{T}{2}`, triangle: `f(t) = ${tx(A)}\\left(1 - \\frac{4|t|}{T}\\right),\\quad -\\frac{T}{2} \\le t \\le \\frac{T}{2}` }[kind];
    const coefTex = { square: 'a_0 = a_n = 0 \\ (\\text{odd function}),\\quad b_n = \\frac{2}{T}\\int_{-T/2}^{T/2} f(t)\\sin(n\\omega_0 t)\\,dt = \\begin{cases} \\frac{4A}{n\\pi}, & n \\text{ odd} \\\\ 0, & n \\text{ even} \\end{cases}', saw: 'a_0 = a_n = 0 \\ (\\text{odd function}),\\quad b_n = \\frac{2A(-1)^{n+1}}{n\\pi}', triangle: 'b_n = 0 \\ (\\text{even function}),\\ a_0 = 0,\\quad a_n = \\begin{cases} \\frac{8A}{n^2\\pi^2}, & n \\text{ odd} \\\\ 0, & n \\text{ even} \\end{cases}' }[kind];
    let maxS = -Infinity; for (let i = 0; i <= 4000; i++) maxS = Math.max(maxS, S(-T / 2 + (T * i) / 4000));
    let err = 0; for (let i = 1; i < 400; i++) { const t = -T / 2 + (T * i) / 400; err += (f(t) - S(t)) ** 2; }
    const rms = Math.sqrt(err / 399);
    return {
      ok: true,
      final: { tex: `f(t) = ${SERIES_TEX[kind](A)},\\quad \\omega_0 = \\frac{2\\pi}{T} \\approx ${tx(w0, 6)}` },
      answers: [answer('Fundamental angular frequency ω₀', w0, { unit: 'rad/s', irrational: true }), answer('First coefficient', kind === 'triangle' ? cs[0].a : cs[0].b, { primary: true, irrational: true }), answer(`Peak of S${N}`, maxS, { irrational: true }), answer('RMS error over one period', rms, { irrational: true })],
      visual: { svg: plot({ x: [-T, T], y: [-1.5 * A, 1.5 * A], width: 380, height: 260, title: `f(t) and the partial sum with ${N} harmonics`, curves: [{ f, cls: 'd-hidden', samples: 800 }, { f: S, samples: 1500 }] }), caption: 'Dashed: the periodic function. Solid: the sum of the first N harmonics.' },
      formula: ['f(t) = \\frac{a_0}{2} + \\sum_{n=1}^{\\infty}\\left(a_n\\cos n\\omega_0 t + b_n\\sin n\\omega_0 t\\right),\\quad \\omega_0 = \\frac{2\\pi}{T}'],
      steps: [
        { title: 'The function over one period', tex: def },
        { title: 'Symmetry decides which coefficients vanish', text: kind === 'triangle' ? 'The triangle wave is even (f(−t) = f(t)), so only cosine terms appear. Its average over a period is 0, so a₀ = 0.' : 'The function is odd (f(−t) = −f(t)), so every cosine coefficient and the constant term are 0: only sines appear.' },
        { title: 'Coefficient formula (from the Euler integrals)', tex: coefTex },
        { title: 'The series', tex: `f(t) = ${SERIES_TEX[kind](A)}` },
        { title: `Partial sum with ${N} harmonics`, tex: `S_{${N}}(t) = ${cs.filter((c) => c.a || c.b).slice(0, 4).map((c) => `${tx(c.a || c.b, 4)}\\${c.a ? 'cos' : 'sin'}(${c.n === 1 ? '' : c.n}\\omega_0 t)`).join(' + ').replace(/\+ -/g, '- ')}${cs.filter((c) => c.a || c.b).length > 4 ? ' + \\cdots' : ''}` },
      ],
      tables: [{ caption: 'Coefficients', headers: ['n', 'aₙ', 'bₙ'], rows: cs.slice(0, 15).map((c) => [String(c.n), fmt(c.a, 6), fmt(c.b, 6)]) }],
      notes: [{ kind: 'info', text: kind === 'triangle' ? 'The coefficients shrink like 1/n², so the series converges quickly and uniformly.' : `At the jumps the series converges to the midpoint (0), and the partial sums overshoot by about 9% of the jump however many terms are used (Gibbs phenomenon). Here the peak is ${fmt(maxS, 4)}.` }],
    };
  },
};
