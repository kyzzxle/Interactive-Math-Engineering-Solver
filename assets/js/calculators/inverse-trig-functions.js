/**
 * Inverse trigonometric functions arcsin, arccos and arctan: principal value (exact for the
 * standard values), the restricted domain and range, and every solution of sin θ = x (etc.).
 */
import { answer, fmt, tx } from '../lib/calc-kit.js';
import { piMultiple, piFracTex, parseValue } from '../lib/trig.js';
import { plot } from '../lib/plot.js';

const INFO = {
  asin: { name: '\\sin^{-1}', fn: '\\sin', f: Math.asin, base: Math.sin, dom: '[-1,\\ 1]', range: '\\left[-\\tfrac{\\pi}{2},\\ \\tfrac{\\pi}{2}\\right]', lo: -Math.PI / 2, hi: Math.PI / 2 },
  acos: { name: '\\cos^{-1}', fn: '\\cos', f: Math.acos, base: Math.cos, dom: '[-1,\\ 1]', range: '[0,\\ \\pi]', lo: 0, hi: Math.PI },
  atan: { name: '\\tan^{-1}', fn: '\\tan', f: Math.atan, base: Math.tan, dom: '(-\\infty,\\ \\infty)', range: '\\left(-\\tfrac{\\pi}{2},\\ \\tfrac{\\pi}{2}\\right)', lo: -Math.PI / 2, hi: Math.PI / 2 },
};
const radTex = (x) => { const m = piMultiple(x); return m ? piFracTex(m) : tx(x, 6); };
const degText = (x) => { const d = (x * 180) / Math.PI; return Math.abs(d - Math.round(d)) < 1e-9 ? `${Math.round(d)}` : fmt(d, 4); };

export const calculator = {
  id: 'inverse-trig-functions',
  explore: {
    title: 'Reflect a trig graph in y = x',
    intro: 'An inverse function undoes the original. Only the restricted piece of the trig graph (solid) is reflected, which is why each inverse returns exactly one angle.',
    controls: [
      { name: 'fn', label: 'Function', type: 'select', options: [['asin', 'arcsin'], ['acos', 'arccos'], ['atan', 'arctan']], value: 'asin' },
      { name: 'x', label: 'Input x', min: (v) => (v.fn === 'atan' ? -4 : -1), max: (v) => (v.fn === 'atan' ? 4 : 1), step: 0.01, value: 0.5 },
    ],
    render({ fn, x }) {
      const I = INFO[fn], y = I.f(x);
      return {
        svg: plot({ x: [-4, 4], y: [-2, 3.5], equal: true, width: 400, height: 300, title: 'Restricted trig function and its inverse', curves: [{ f: (t) => (t >= I.lo && t <= I.hi ? I.base(t) : NaN), cls: 'd-line2' }, { f: (t) => (fn === 'atan' || Math.abs(t) <= 1 ? I.f(t) : NaN) }, { f: (t) => t, cls: 'd-hidden' }], points: [{ x, y, label: `(${x}, ${y.toFixed(3)})` }, { x: y, y: x, cls: 'd-point2' }] }),
        readouts: [
          { label: 'Inverse value', tex: `${I.name}(${tx(x, 2)}) \\approx ${tx(y, 4)}\\text{ rad} \\approx ${degText(y)}^\\circ` },
          { label: 'Check', tex: `${I.fn}(${tx(y, 4)}) \\approx ${tx(I.base(y), 4)}` },
          { label: 'Range of the inverse', tex: I.range },
        ],
      };
    },
  },
  fields: [
    { name: 'fn', label: 'Function', type: 'radio', options: [['asin', 'arcsin'], ['acos', 'arccos'], ['atan', 'arctan']] },
    { name: 'x', label: 'Value x', type: 'text', placeholder: 'e.g. sqrt(3)/2 or 0.4', hint: 'Numbers, fractions and square roots are allowed: 1/2, -sqrt(2)/2, sqrt(3).' },
  ],
  examples: [
    { label: 'arcsin(√3/2)', values: { fn: 'asin', x: 'sqrt(3)/2' } },
    { label: 'arccos(−1/2)', values: { fn: 'acos', x: '-1/2' } },
    { label: 'arctan(1)', values: { fn: 'atan', x: '1' } },
    { label: 'arcsin(0.4) (not a standard value)', values: { fn: 'asin', x: '0.4' } },
    { label: 'Outside the domain: arccos(2)', values: { fn: 'acos', x: '2' }, expectError: true },
  ],
  solve(values) {
    const fn = INFO[values.fn] ? values.fn : 'asin';
    const I = INFO[fn];
    const p = parseValue(values.x, 'the value');
    if (p.error) return { ok: false, errors: [{ field: 'x', message: p.error }] };
    const x = p.value;
    if (Math.abs(x) > 1e9) return { ok: false, errors: [{ field: 'x', message: 'Please enter a value between −10⁹ and 10⁹.' }] };
    if (fn !== 'atan' && Math.abs(x) > 1 + 1e-12) return { ok: false, errors: [{ field: 'x', message: `${fn === 'asin' ? 'Sine' : 'Cosine'} values are always between −1 and 1, so ${fn === 'asin' ? 'arcsin' : 'arccos'}(${fmt(x)}) does not exist (no angle has that ${fn === 'asin' ? 'sine' : 'cosine'}).` }] };
    const xc = fn === 'atan' ? x : Math.max(-1, Math.min(1, x));
    const y = I.f(xc);
    const exact = piMultiple(y);
    const yTex = exact ? piFracTex(exact) : tx(y, 6);
    const shown = tx(x, 6);
    const steps = [
      { title: 'Domain check', tex: `x = ${shown} \\in ${I.dom}` },
      { title: 'Principal value: the one angle in the restricted range', tex: `${I.name}(x) \\in ${I.range}` },
      { title: `Find the angle whose ${fn === 'asin' ? 'sine' : fn === 'acos' ? 'cosine' : 'tangent'} is x`, tex: `${I.name}(${shown}) = ${yTex}${exact ? '' : '\\text{ rad}'} ${exact ? `= ${degText(y)}^\\circ` : `\\approx ${degText(y)}^\\circ`}` },
      { title: 'Check', tex: `${I.fn}\\left(${yTex}\\right) ${exact ? '=' : '\\approx'} ${shown}` },
    ];
    // all solutions of base(θ) = x
    let general, sols;
    if (fn === 'asin') { general = `\\theta = ${yTex} + 2\\pi n \\ \\text{ or } \\ \\theta = \\pi - ${exact ? `\\left(${yTex}\\right)` : yTex} + 2\\pi n`; sols = [y, Math.PI - y]; }
    else if (fn === 'acos') { general = `\\theta = \\pm ${exact ? `\\left(${yTex}\\right)` : yTex} + 2\\pi n`; sols = [y, 2 * Math.PI - y]; }
    else { general = `\\theta = ${yTex} + \\pi n`; sols = [y, y + Math.PI]; }
    const in360 = [...new Set(sols.map((s) => ((s % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)).map((s) => +s.toFixed(12)))].sort((a, b) => a - b);
    steps.push({ title: `All angles with ${I.fn} θ = x (n any integer)`, tex: general });
    return {
      ok: true,
      final: { tex: `${I.name}(${shown}) = ${yTex} ${exact ? `= ${degText(y)}^\\circ` : `\\approx ${degText(y)}^\\circ`}` },
      answers: [
        answer('Principal value (radians)', y, { primary: true, exactTex: exact && !Number.isInteger(y) ? yTex : undefined, irrational: !(y === 0) }),
        answer('Principal value (degrees)', (y * 180) / Math.PI, { unit: '°', primary: true, decimals: 4 }),
        { label: 'Solutions in [0°, 360°)', value: in360.map((s) => `${degText(s)}°`).join(', '), copy: '' },
      ],
      visual: { svg: plot({ x: [-4, 4], y: [-2, 3.5], equal: true, width: 360, height: 280, title: 'Inverse function graph', curves: [{ f: (t) => (fn === 'atan' || Math.abs(t) <= 1 ? I.f(t) : NaN) }], points: [{ x: Math.max(-4, Math.min(4, x)), y, label: `(${fmt(x, 3)}, ${fmt(y, 3)})` }], hlines: [{ y: I.lo, cls: 'd-line3' }, { y: I.hi, cls: 'd-line3' }] }), caption: 'The dashed lines mark the range of the inverse function.' },
      formula: [`y = ${I.name}(x) \\iff ${I.fn}\\,y = x \\text{ and } y \\in ${I.range}`],
      steps,
      notes: [{ kind: 'info', text: `${I.name.replace('\\', '').replace('^{-1}', '⁻¹')} means the inverse function, not 1/${I.fn.replace('\\', '')}. Calculators return only the principal value; other angles with the same ${I.fn.replace('\\', '')} are listed above.` }],
    };
  },
};
