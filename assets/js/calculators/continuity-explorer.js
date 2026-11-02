/**
 * Continuity at a point, using the three-part test:
 *   1. f(a) is defined   2. lim f(x) as x → a exists   3. the limit equals f(a)
 * Works for one formula or a piecewise function (left formula, value at a, right formula).
 * Discontinuities are classified as removable, jump, infinite, or oscillating/other.
 * Limits are estimated numerically (see the limit calculator).
 */
import { fmt, tx } from '../lib/calc-kit.js';
import { parseFunction, FUNCTION_HINT, compile } from '../lib/calculus-kit.js';
import { texOf } from '../lib/expr.js';
import { parseValue } from '../lib/trig.js';
import { oneSided } from '../lib/limits.js';
import { plot } from '../lib/plot.js';

const same = (p, q) => Math.abs(p - q) < 1e-4 * (1 + Math.abs(p));

/** Classify from one-sided results and f(a) (number or NaN). */
export function classify(L, R, fa) {
  const defined = Number.isFinite(fa);
  if (L.kind === 'finite' && R.kind === 'finite') {
    if (same(L.L, R.L)) {
      if (defined && same(L.L, fa)) return { type: 'continuous', text: 'Continuous: f(a) exists, the limit exists, and they are equal.' };
      return { type: 'removable', text: defined ? `Removable discontinuity: the limit is ${fmt(L.L, 6)} but f(a) = ${fmt(fa, 6)}. Redefining f(a) as the limit would make f continuous.` : `Removable discontinuity (a hole): the limit is ${fmt(L.L, 6)} but f(a) is not defined. Defining f(a) = ${fmt(L.L, 6)} would remove it.` };
    }
    return { type: 'jump', text: `Jump discontinuity: the left limit ${fmt(L.L, 6)} and right limit ${fmt(R.L, 6)} differ (jump of ${fmt(Math.abs(R.L - L.L), 6)}).` };
  }
  if (L.kind === 'inf' || R.kind === 'inf') return { type: 'infinite', text: 'Infinite discontinuity: the function grows without bound on at least one side (a vertical asymptote).' };
  return { type: 'other', text: 'Not continuous: the function does not approach a single value from at least one side (for example it oscillates), or it is not defined nearby.' };
}

export const calculator = {
  id: 'continuity-explorer',
  explore: {
    title: 'Glue two pieces together',
    intro: 'The left piece is x² + p, the right piece is 2x + q, both meeting at x = 1. Make the pieces meet and set f(1) to the same height to make the function continuous.',
    controls: [
      { name: 'p', label: 'Left piece: x² + p', min: -3, max: 3, step: 0.5, value: 0 },
      { name: 'q', label: 'Right piece: 2x + q', min: -3, max: 3, step: 0.5, value: 1 },
      { name: 'c', label: 'Value f(1)', min: -3, max: 5, step: 0.5, value: 2 },
    ],
    presets: [{ label: 'Continuous', values: { p: 1, q: 0, c: 2 } }, { label: 'Removable', values: { p: 1, q: 0, c: 4 } }, { label: 'Jump', values: { p: 0, q: 1, c: 1 } }],
    render({ p, q, c }) {
      const Lv = 1 + p, Rv = 2 + q;
      const fake = (k, val) => ({ kind: 'finite', L: val });
      const cl = classify(fake('L', Lv), fake('R', Rv), c);
      return {
        svg: plot({ x: [-1.5, 3], y: [-3, 7], width: 400, height: 280, title: 'Piecewise function at x = 1', curves: [{ f: (x) => (x < 1 ? x * x + p : NaN) }, { f: (x) => (x > 1 ? 2 * x + q : NaN), cls: 'd-line2' }], points: [{ x: 1, y: Lv, cls: 'd-hidden', r: 5 }, { x: 1, y: Rv, cls: 'd-hidden', r: 5 }, { x: 1, y: c, label: 'f(1)', cls: 'd-point3' }], vlines: [{ x: 1, cls: 'd-line3' }] }),
        readouts: [
          { label: 'Left limit', tex: `\\lim_{x \\to 1^-} = 1 + ${tx(p)} = ${tx(Lv)}` },
          { label: 'Right limit', tex: `\\lim_{x \\to 1^+} = 2 + ${tx(q)} = ${tx(Rv)}` },
          { label: 'Verdict', text: cl.type === 'continuous' ? 'Continuous at x = 1' : `${cl.type.charAt(0).toUpperCase()}${cl.type.slice(1)} discontinuity`, tone: cl.type === 'continuous' ? 'good' : 'warn' },
        ],
      };
    },
  },
  fields: [
    { name: 'mode', label: 'Function', type: 'radio', options: [['single', 'One formula'], ['piece', 'Piecewise at x = a']] },
    { name: 'f', label: 'f(x)', type: 'text', placeholder: 'e.g. (x^2 - 1)/(x - 1)', showWhen: { mode: ['single'] }, hint: FUNCTION_HINT },
    { name: 'g', label: 'Formula for x < a', type: 'text', placeholder: 'e.g. x^2', showWhen: { mode: ['piece'] } },
    { name: 'h', label: 'Formula for x > a', type: 'text', placeholder: 'e.g. 2x + 1', showWhen: { mode: ['piece'] } },
    { name: 'c', label: 'Value f(a) (blank = not defined)', type: 'text', placeholder: 'e.g. 3', showWhen: { mode: ['piece'] } },
    { name: 'a', label: 'Point a', type: 'text', placeholder: 'e.g. 1' },
  ],
  examples: [
    { label: '(x² − 1)/(x − 1) at x = 1 (hole)', values: { mode: 'single', f: '(x^2 - 1)/(x - 1)', a: '1' } },
    { label: 'Piecewise jump at x = 1', values: { mode: 'piece', g: 'x^2', h: '2x + 1', c: '1', a: '1' } },
    { label: 'Piecewise continuous at x = 2', values: { mode: 'piece', g: 'x + 2', h: 'x^2', c: '4', a: '2' } },
    { label: '1/(x − 2) at x = 2 (infinite)', values: { mode: 'single', f: '1/(x - 2)', a: '2' } },
    { label: 'sin x at x = 0 (continuous)', values: { mode: 'single', f: 'sin(x)', a: '0' } },
    { label: 'Invalid: no point given', values: { mode: 'single', f: 'x', a: '' }, expectError: true },
  ],
  solve(values) {
    const piece = values.mode === 'piece';
    const pa = parseValue(values.a, 'the point a');
    let fl, fr, fa, texL, texR;
    if (piece) {
      const G = parseFunction(values, 'g', 'the left formula'); if (G.error) return G.error;
      const Hh = parseFunction(values, 'h', 'the right formula'); if (Hh.error) return Hh.error;
      fl = compile(G.node); fr = compile(Hh.node); texL = texOf(G.node); texR = texOf(Hh.node);
      const raw = String(values.c ?? '').trim();
      if (raw) { const pc = parseValue(raw, 'f(a)'); if (pc.error) return { ok: false, errors: [{ field: 'c', message: pc.error }] }; fa = pc.value; } else fa = NaN;
    } else {
      const F = parseFunction(values, 'f', 'the function f(x)'); if (F.error) return F.error;
      fl = fr = compile(F.node); texL = texR = texOf(F.node);
    }
    if (pa.error) return { ok: false, errors: [{ field: 'a', message: pa.error }] };
    const a = pa.value;
    if (Math.abs(a) > 1e6) return { ok: false, errors: [{ field: 'a', message: 'Please choose a point between −1,000,000 and 1,000,000.' }] };
    if (!piece) { try { fa = fl(a); } catch { fa = NaN; } }
    const L = oneSided(fl, a, -1), R = oneSided(fr, a, 1);
    const cl = classify(L, R, fa);
    const ls = (r) => (r.kind === 'finite' ? tx(r.L, 6) : r.kind === 'inf' ? `${r.sign > 0 ? '' : '-'}\\infty` : '\\text{no value}');
    const aT = tx(a, 6);
    const steps = [
      { title: 'The function', tex: piece ? `f(x) = \\begin{cases} ${texL}, & x < ${aT} \\\\ ${Number.isFinite(fa) ? tx(fa, 6) : '\\text{not defined}'}, & x = ${aT} \\\\ ${texR}, & x > ${aT} \\end{cases}` : `f(x) = ${texL}` },
      { title: '1. Is f(a) defined?', tex: Number.isFinite(fa) ? `f(${aT}) = ${tx(fa, 6)}` : `f(${aT})\\ \\text{is not defined}` },
      { title: '2. Do the one-sided limits exist and agree?', texLines: [`\\lim_{x \\to ${aT}^-} f(x) ${L.kind === 'finite' ? '\\approx' : '='} ${ls(L)}`, `\\lim_{x \\to ${aT}^+} f(x) ${R.kind === 'finite' ? '\\approx' : '='} ${ls(R)}`] },
      { title: '3. Does the limit equal f(a)?', text: cl.text },
    ];
    const pts = [];
    if (L.kind === 'finite') pts.push({ x: a, y: L.L, cls: 'd-hidden', r: 5 });
    if (R.kind === 'finite') pts.push({ x: a, y: R.L, cls: 'd-hidden', r: 5 });
    if (Number.isFinite(fa)) pts.push({ x: a, y: fa, label: 'f(a)', cls: 'd-point3' });
    const ys = [L.L, R.L, fa].filter(Number.isFinite);
    const lo = Math.min(-2, ...ys) - 3, hi = Math.max(2, ...ys) + 3;
    const label = { continuous: 'Continuous', removable: 'Removable discontinuity', jump: 'Jump discontinuity', infinite: 'Infinite discontinuity', other: 'Discontinuous (no limit)' }[cl.type];
    return {
      ok: true,
      final: { tex: `\\text{At } x = ${aT}\\text{: ${label.toLowerCase()}}` },
      answers: [
        { label: 'Verdict', value: label, primary: true, copy: label },
        { label: 'f(a)', value: Number.isFinite(fa) ? fmt(fa, 6) : 'not defined', copy: '' },
        { label: 'Left limit', value: L.kind === 'finite' ? fmt(L.L, 6) : L.kind === 'inf' ? (L.sign > 0 ? '+∞' : '−∞') : 'none', copy: '' },
        { label: 'Right limit', value: R.kind === 'finite' ? fmt(R.L, 6) : R.kind === 'inf' ? (R.sign > 0 ? '+∞' : '−∞') : 'none', copy: '' },
      ],
      visual: { svg: plot({ x: [a - 3, a + 3], y: [lo, hi], width: 380, height: 260, title: 'Graph near x = a', curves: [{ f: (x) => (x < a ? fl(x) : NaN), samples: 900 }, { f: (x) => (x > a ? fr(x) : NaN), cls: piece ? 'd-line2' : 'd-line', samples: 900 }], vlines: [{ x: a, cls: 'd-line3' }], points: pts }), caption: 'Grey dots mark where each side is heading; the orange dot is the actual value f(a), if it exists.' },
      formula: ['f \\text{ continuous at } a \\iff \\lim_{x \\to a} f(x) = f(a)'],
      steps,
      notes: [{ kind: 'info', text: 'The one-sided limits are estimated numerically from values very close to a (see the limit explorer for the table). Common mistake: a function can have a limit at a even if f(a) is not defined — that is a removable discontinuity, not "no limit".' }],
    };
  },
};
