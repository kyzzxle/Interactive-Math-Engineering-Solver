/**
 * Finite-difference derivatives:
 *   forward  (f(x + h) − f(x))/h            error O(h)
 *   backward (f(x) − f(x − h))/h            error O(h)
 *   central  (f(x + h) − f(x − h))/(2h)     error O(h²)
 * The exact derivative (symbolic) is shown for comparison, together with errors for several h.
 */
import { fmt, tx } from '../lib/calc-kit.js';
import { derivative, texOf } from '../lib/expr.js';
import { parseFunction, parseNumberExpr, FUNCTION_HINT, compile } from '../lib/calculus-kit.js';
import { plot } from '../lib/plot.js';

const FORMULA = {
  forward: { f: (F, x, h) => (F(x + h) - F(x)) / h, tex: "f'(x) \\approx \\frac{f(x + h) - f(x)}{h}", order: 'O(h)' },
  backward: { f: (F, x, h) => (F(x) - F(x - h)) / h, tex: "f'(x) \\approx \\frac{f(x) - f(x - h)}{h}", order: 'O(h)' },
  central: { f: (F, x, h) => (F(x + h) - F(x - h)) / (2 * h), tex: "f'(x) \\approx \\frac{f(x + h) - f(x - h)}{2h}", order: 'O(h^2)' },
};

export const calculator = {
  id: 'numerical-differentiation',
  fields: [
    { name: 'f', label: 'Function f(x)', type: 'text', placeholder: 'e.g. sin(x)', hint: FUNCTION_HINT },
    { name: 'x0', label: 'Point x', type: 'text', placeholder: 'e.g. 1', row: 'p' },
    { name: 'h', label: 'Step size h', type: 'text', placeholder: 'e.g. 0.1', row: 'p', hint: 'A small positive number, e.g. 0.1 or 0.001.' },
    { name: 'method', label: 'Method', type: 'radio', options: [['central', 'Central'], ['forward', 'Forward'], ['backward', 'Backward']] },
  ],
  examples: [
    { label: 'sin x at x = 1, h = 0.1 (central)', values: { f: 'sin(x)', x0: '1', h: '0.1', method: 'central' } },
    { label: 'eˣ at x = 0, h = 0.1 (forward)', values: { f: 'e^x', x0: '0', h: '0.1', method: 'forward' } },
    { label: 'x³ at x = 2, h = 0.5 (backward)', values: { f: 'x^3', x0: '2', h: '0.5', method: 'backward' } },
  ],
  solve(values) {
    const P = parseFunction(values, 'f', 'the function f(x)'); if (P.error) return P.error;
    const X = parseNumberExpr(values, 'x0', 'the point x'); if (X.error) return X.error;
    const H = parseNumberExpr(values, 'h', 'the step size h'); if (H.error) return H.error;
    const x = X.value, h = H.value;
    if (!(h > 0)) return { ok: false, errors: [{ field: 'h', message: 'The step size h must be a positive number.' }] };
    if (h < 1e-12 || h > 1e3) return { ok: false, errors: [{ field: 'h', message: 'Choose h between 10⁻¹² and 1000. Very small h makes round-off error dominate.' }] };
    const method = FORMULA[values.method] ? values.method : 'central';
    const F = compile(P.node);
    const M = FORMULA[method];
    const pts = method === 'forward' ? [x, x + h] : method === 'backward' ? [x - h, x] : [x - h, x + h];
    if (pts.some((t) => !Number.isFinite(F(t)))) return { ok: false, errors: [{ field: 'x0', message: `f is undefined at one of the points used (${pts.map((t) => fmt(t)).join(', ')}).` }] };
    const approx = M.f(F, x, h);
    let exact = null, dTex = null;
    try { const d = derivative(P.node); dTex = texOf(d); exact = compile(d)(x); } catch (e) { exact = null; }
    const steps = [
      { title: `${method[0].toUpperCase()}${method.slice(1)} difference formula`, tex: M.tex, text: method === 'central' ? 'The central difference uses points on both sides of x; its errors cancel to first order, so it is usually far more accurate.' : 'One-sided differences use x and one neighbouring point; their error is proportional to h.' },
      { title: 'Evaluate f at the required points', texLines: pts.map((t) => `f(${tx(t)}) \\approx ${tx(F(t), 10)}`) },
      { title: 'Substitute', tex: method === 'central' ? `f'(${tx(x)}) \\approx \\frac{${tx(F(x + h), 10)} - ${tx(F(x - h), 10)}}{2(${tx(h)})} \\approx ${tx(approx, 10)}` : method === 'forward' ? `f'(${tx(x)}) \\approx \\frac{${tx(F(x + h), 10)} - ${tx(F(x), 10)}}{${tx(h)}} \\approx ${tx(approx, 10)}` : `f'(${tx(x)}) \\approx \\frac{${tx(F(x), 10)} - ${tx(F(x - h), 10)}}{${tx(h)}} \\approx ${tx(approx, 10)}` },
    ];
    const rows = [];
    if (exact !== null && Number.isFinite(exact)) {
      steps.push({ title: 'Compare with the exact derivative', texLines: [`f'(x) = ${dTex}`, `f'(${tx(x)}) \\approx ${tx(exact, 10)}`, `\\text{error} \\approx ${tx(Math.abs(approx - exact), 10)}`] });
      for (const k of [1, 0.1, 0.01, 0.001]) {
        const hh = h * k;
        if (hh < 1e-12) continue;
        rows.push([fmt(hh, 10), ...['forward', 'backward', 'central'].map((m) => { const val = FORMULA[m].f(F, x, hh); return Number.isFinite(val) ? Math.abs(val - exact).toExponential(2) : '—'; })]);
      }
    }
    const span = Math.max(4 * h, 1);
    const svg = plot({
      x: [x - span, x + span], curves: [{ f: F, cls: 'd-line' }, { f: (t) => F(x) + approx * (t - x), cls: 'd-line3' }],
      points: pts.map((t) => ({ x: t, y: F(t), r: 3.5, cls: 'd-foot' })),
      title: 'The curve and the line through the sample points used by the difference formula',
    });
    return {
      ok: true,
      final: { tex: `f'(${tx(x)}) \\approx ${tx(approx, 10)}` },
      answers: [
        { label: `${method[0].toUpperCase()}${method.slice(1)} difference`, value: fmt(approx, 10), approx: true, primary: true },
        ...(exact !== null && Number.isFinite(exact) ? [{ label: 'Exact derivative value', value: fmt(exact, 10), approx: true }, { label: 'Absolute error', value: Math.abs(approx - exact).toExponential(3), approx: true }] : []),
        { label: 'Truncation error order', valueTex: M.order },
      ],
      visual: { svg, legend: '<div class="legend"><span><i></i>f(x)</span><span><i class="l3"></i>Slope estimate</span></div>', caption: 'The dashed line has the estimated slope; the highlighted points are where f was evaluated.' },
      tables: rows.length ? [{ caption: 'Absolute error for smaller step sizes', headers: ['h', 'Forward', 'Backward', 'Central'], rows }] : [],
      formula: [M.tex],
      steps,
      notes: [{ kind: 'info', text: 'Making h 10 times smaller cuts the forward/backward error about 10 times and the central error about 100 times — until h is so small that round-off error takes over (below roughly 10⁻⁸).' }],
      rounding: 'Values are shown to 10 decimal places.',
    };
  },
};
