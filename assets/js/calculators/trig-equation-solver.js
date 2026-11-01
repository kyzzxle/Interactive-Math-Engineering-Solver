/**
 * Trigonometric equations of the form  a·f(b·x + c) + d = k  with f = sin, cos or tan.
 * Solutions are listed in a chosen interval ([0, 2π), [0°, 360°) or a custom one) and as a general
 * solution. Constants may be expressions such as sqrt(3)/2 or pi/6, so exact angles are recognised.
 */
import { fmt, tx, isExact } from '../lib/calc-kit.js';
import { parseValue, piMultiple, piFracTex } from '../lib/trig.js';
import { plot } from '../lib/plot.js';

const FN = { sin: Math.sin, cos: Math.cos, tan: Math.tan };

export const calculator = {
  id: 'trig-equation-solver',
  fields: [
    { name: 'f', label: 'Function', type: 'select', options: [['sin', 'sin'], ['cos', 'cos'], ['tan', 'tan']] },
    { name: 'a', label: 'a', type: 'text', placeholder: '1', default: '', row: 'p1', hint: 'Equation: a·f(b·x + c) + d = k' },
    { name: 'b', label: 'b', type: 'text', placeholder: '1', row: 'p1' },
    { name: 'c', label: 'c (phase)', type: 'text', placeholder: '0', row: 'p1' },
    { name: 'd', label: 'd', type: 'text', placeholder: '0', row: 'p2' },
    { name: 'k', label: 'k (right side)', type: 'text', placeholder: 'e.g. sqrt(3)/2', row: 'p2' },
    { name: 'interval', label: 'List solutions in', type: 'select', options: [['rad', '[0, 2π) — radians'], ['deg', '[0°, 360°) — degrees']] },
  ],
  examples: [
    { label: '2 sin x − 1 = 0', values: { f: 'sin', a: '2', b: '1', c: '0', d: '-1', k: '0', interval: 'rad' } },
    { label: 'cos 2x = √3/2', values: { f: 'cos', a: '1', b: '2', c: '0', d: '0', k: 'sqrt(3)/2', interval: 'deg' } },
    { label: 'tan(x − π/4) = 1', values: { f: 'tan', a: '1', b: '1', c: '-pi/4', d: '0', k: '1', interval: 'rad' } },
    { label: 'No solution: sin x = 2', values: { f: 'sin', a: '1', b: '1', c: '0', d: '0', k: '2', interval: 'rad' } },
  ],
  solve(values) {
    const fname = ['sin', 'cos', 'tan'].includes(values.f) ? values.f : 'sin';
    const errors = [];
    const get = (name, label, def) => {
      if (String(values[name] ?? '').trim() === '' && def !== undefined) return def;
      const p = parseValue(values[name], label);
      if (p.error) { errors.push({ field: name, message: p.error }); return NaN; }
      return p.value;
    };
    const a = get('a', 'a', 1), b = get('b', 'b', 1), c = get('c', 'c', 0), d = get('d', 'd', 0), k = get('k', 'k');
    if (errors.length) return { ok: false, errors };
    if (a === 0) return { ok: false, errors: [{ field: 'a', message: 'a cannot be 0 — the equation would not involve the trigonometric function.' }] };
    if (b === 0) return { ok: false, errors: [{ field: 'b', message: 'b cannot be 0 — the function would be constant.' }] };
    if (Math.abs(b) > 1000) return { ok: false, errors: [{ field: 'b', message: 'Please keep |b| at most 1000 so the solutions in one turn can be listed.' }] };
    const deg = values.interval === 'deg';
    const r = (k - d) / a;
    const fTex = `\\${fname}`;
    const coef = (v) => (v === 1 ? '' : v === -1 ? '-' : tx(v));
    const signed = (v) => (v === 0 ? '' : ` ${v < 0 ? '-' : '+'} ${tx(Math.abs(v))}`);
    const eqTex = `${coef(a)}${fTex}\\left(${coef(b)}x${signed(c)}\\right)${signed(d)} = ${tx(k)}`;
    const steps = [
      { title: 'Write the equation', tex: eqTex },
      { title: `Isolate ${fname}`, texLines: [`${fTex}(u) = \\frac{k - d}{a} = \\frac{${tx(k)} - (${tx(d)})}{${tx(a)}}`, `${fTex}(u) ${isExact(r) ? '=' : '\\approx'} ${tx(r)}, \\qquad u = ${coef(b)}x${signed(c)}`] },
    ];
    if (fname !== 'tan' && Math.abs(r) > 1 + 1e-12) {
      steps.push({ title: 'No solution', text: `${fname} only takes values between −1 and 1, but the equation needs ${fname}(u) = ${fmt(r)}.` });
      return { ok: true, final: { text: `No real solution: ${fname} cannot equal ${fmt(r)}.` }, answers: [{ label: 'Solutions', value: 'None', primary: true }], visual: graph(fname, a, b, c, d, k, [], deg), steps, formula: formulas(fname), rounding: false };
    }
    const rc = Math.max(-1, Math.min(1, r));
    let base, period, second = null;
    if (fname === 'sin') { base = Math.asin(rc); second = Math.PI - base; period = 2 * Math.PI; }
    else if (fname === 'cos') { base = Math.acos(rc); second = -base; period = 2 * Math.PI; }
    else { base = Math.atan(r); period = Math.PI; }
    const pmBase = piMultiple(base);
    const inv = { sin: '\\sin^{-1}', cos: '\\cos^{-1}', tan: '\\tan^{-1}' }[fname];
    const angTex = (u) => { const p = piMultiple(u); return p ? piFracTex(p) : tx(u); };
    steps.push({ title: 'Principal value', text: pmBase ? 'This is a standard exact value from the unit circle.' : 'Use the inverse function (on a calculator).', tex: `u_0 = ${inv}(${tx(r)}) ${pmBase ? `= ${piFracTex(pmBase)}` : `\\approx ${tx(base)}`}` });
    const general = fname === 'sin' ? [`u = ${angTex(base)} + 2\\pi n`, `u = ${angTex(second)} + 2\\pi n`]
      : fname === 'cos' ? [`u = \\pm ${angTex(base)} + 2\\pi n`] : [`u = ${angTex(base)} + \\pi n`];
    steps.push({ title: 'All solutions for u', text: fname === 'sin' ? 'sin u = sin(π − u), so there are two families, repeating every 2π.' : fname === 'cos' ? 'cos u = cos(−u), so there are two families (±), repeating every 2π.' : 'tan repeats every π, so one family is enough.', texLines: [...general, 'n \\in \\mathbb{Z}'] });
    // solve u = bx + c for x and collect solutions in [0, 2π)
    const bases = second === null ? [base] : Math.abs(second - base) < 1e-12 || Math.abs(Math.abs(second - base) - period) < 1e-12 ? [base] : [base, second];
    const sols = [];
    const lo = 0, hi = 2 * Math.PI;
    for (const u0 of bases) {
      const step = period / Math.abs(b);
      // x = (u0 + period·n − c)/b
      const x0 = (u0 - c) / b;
      const nStart = Math.ceil((lo - x0) / step) - 1;
      for (let n = nStart; n < nStart + Math.ceil((hi - lo) / step) + 3; n++) {
        const x = x0 + n * step;
        if (x >= lo - 1e-12 && x < hi - 1e-12) sols.push(Math.abs(x) < 1e-12 ? 0 : x);
      }
    }
    const uniq = [...new Set(sols.map((x) => +x.toFixed(12)))].sort((p, q) => p - q);
    // validate each solution numerically (guards against rounding in the formulas)
    const fx = (x) => a * FN[fname](b * x + c) + d;
    const good = uniq.filter((x) => Math.abs(fx(x) - k) < 1e-7 * Math.max(1, Math.abs(k)));
    const label = (x) => { if (deg) return `${fmt((x * 180) / Math.PI)}°`; const p = piMultiple(x); return p ? piFracTex(p) : tx(x); };
    const labelText = (x) => { if (deg) return `${fmt((x * 180) / Math.PI)}°`; const p = piMultiple(x); return p ? `${p.toString().replace(/^(-?\d+)\/(\d+)$/, '$1π/$2').replace(/^(-?\d+)$/, '$1π').replace(/^1π/, 'π')} ≈ ${fmt(x)}` : fmt(x); };
    steps.push({ title: `Solve u = ${fmt(b)}x + ${fmt(c)} for x and keep solutions in ${deg ? '[0°, 360°)' : '[0, 2π)'}`, text: `x = (u − c)/b; consecutive solutions are ${fmt(period / Math.abs(b))} rad apart.`, texLines: good.length ? [`x = ${good.map(label).join(',\\ ')}`] : ['\\text{no solutions in this interval}'] });
    const xGeneral = 'x = \\frac{u - c}{b}';
    return {
      ok: true,
      final: { texLines: good.length ? [`x = ${good.map(label).join(',\\ ')}`] : [], text: good.length ? `${good.length} solution${good.length === 1 ? '' : 's'} in ${deg ? '[0°, 360°)' : '[0, 2π)'}.` : `No solutions in ${deg ? '[0°, 360°)' : '[0, 2π)'}.` },
      answers: [{ label: `Solutions in ${deg ? '[0°, 360°)' : '[0, 2π)'}`, value: good.length ? good.map(labelText).join('; ') : 'none', primary: true }, { label: 'Number of solutions', value: String(good.length) }, { label: 'General solution', valueTex: `${general.join(',\\quad ')},\\quad ${xGeneral}` }],
      visual: graph(fname, a, b, c, d, k, good, deg), steps, formula: formulas(fname),
      notes: [{ kind: 'info', text: 'Each solution was checked by substituting it back into the equation.' }],
      rounding: 'Exact angles are shown as multiples of π when recognised; other solutions are rounded to 6 decimal places.',
    };
  },
};

const formulas = (f) => [f === 'sin' ? '\\sin u = r \\Rightarrow u = \\sin^{-1} r + 2\\pi n \\ \\text{or}\\ u = \\pi - \\sin^{-1} r + 2\\pi n' : f === 'cos' ? '\\cos u = r \\Rightarrow u = \\pm\\cos^{-1} r + 2\\pi n' : '\\tan u = r \\Rightarrow u = \\tan^{-1} r + \\pi n'];

function graph(fname, a, b, c, d, k, sols, deg) {
  const f = (x) => { const y = a * FN[fname](b * x + c) + d; return Math.abs(y) > 50 ? NaN : y; };
  const ticks = [0, 0.5, 1, 1.5, 2].map((t) => ({ x: t * Math.PI, label: deg ? `${t * 180}°` : t === 0 ? '0' : `${t === 1 ? '' : t}π` }));
  return {
    svg: plot({ x: [0, 2 * Math.PI], curves: [{ f, cls: 'd-line' }], hlines: [{ y: k, cls: 'd-line3', label: `y = ${fmt(k, 4)}` }], points: sols.map((x) => ({ x, y: k, cls: 'd-foot' })), xTicks: ticks, title: 'Graph of the left side and the line y = k over one full turn' }),
    caption: 'Solutions are the x-values where the curve meets the horizontal line y = k.',
  };
}
