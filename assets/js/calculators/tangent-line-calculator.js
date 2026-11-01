/**
 * Tangent (and normal) line to y = f(x) at x = x₀:  y = f(x₀) + f′(x₀)(x − x₀).
 * Exact fractions when f is a polynomial with rational coefficients and x₀ is rational.
 */
import { fmt, tx, eq, isExact } from '../lib/calc-kit.js';
import { derivative, texOf, toPoly, polyEvalFrac, polyDeriv } from '../lib/expr.js';
import { parseFrac, Frac } from '../lib/fraction.js';
import { parseFunction, parseNumberExpr, FUNCTION_HINT, compile } from '../lib/calculus-kit.js';
import { slopeInterceptTex, generalTex, integerLine } from '../lib/lines.js';
import { plot } from '../lib/plot.js';

export const calculator = {
  id: 'tangent-line-calculator',
  fields: [
    { name: 'f', label: 'Function f(x)', type: 'text', placeholder: 'e.g. x^2 - 3x + 1', hint: FUNCTION_HINT },
    { name: 'x0', label: 'Point of tangency x₀', type: 'text', placeholder: 'e.g. 2 or pi/3' },
  ],
  examples: [
    { label: 'f(x) = x² − 3x + 1 at x = 2', values: { f: 'x^2 - 3x + 1', x0: '2' } },
    { label: 'f(x) = sin x at x = π/3', values: { f: 'sin(x)', x0: 'pi/3' } },
    { label: 'f(x) = √x at x = 4', values: { f: 'sqrt(x)', x0: '4' } },
  ],
  solve(values) {
    const p = parseFunction(values, 'f', 'the function f(x)');
    if (p.error) return p.error;
    const q = parseNumberExpr(values, 'x0', 'the point x₀');
    if (q.error) return q.error;
    const f = p.node, x0 = q.value;
    const d = derivative(f);
    const F = compile(f), D = compile(d);
    const y0 = F(x0), m = D(x0);
    if (!Number.isFinite(y0)) return { ok: false, errors: [{ field: 'x0', message: `f is not defined at x = ${fmt(x0)}, so there is no point on the curve there.` }] };
    if (!Number.isFinite(m)) return { ok: false, errors: [{ field: 'x0', message: `f′(${fmt(x0)}) is undefined: the graph has no (non-vertical) tangent line there.` }] };
    // exact route for polynomials with a rational x₀
    const poly = toPoly(f);
    const xF = parseFrac(values.x0);
    let exact = null;
    if (poly && xF) {
      const yF = polyEvalFrac(poly, xF), mF = polyEvalFrac(polyDeriv(poly), xF);
      const b = yF.sub(mF.mul(xF));
      exact = { yF, mF, b, gen: integerLine(mF, new Frac(-1n), b) };
    }
    const x0t = exact ? xF.toTex() : tx(x0);
    const steps = [
      { title: 'Find the point of tangency', texLines: [`f(x) = ${texOf(f)}`, `y_0 = f(${x0t}) ${exact ? `= ${exact.yF.toTex()}` : eq(y0)}`] },
      { title: 'Differentiate to get the slope function', tex: `f'(x) = ${texOf(d)}` },
      { title: 'Slope at the point', tex: `m = f'(${x0t}) ${exact ? `= ${exact.mF.toTex()}` : eq(m)}` },
      { title: 'Point–slope form of the tangent line', texLines: ['y - y_0 = m(x - x_0)', exact ? `y - ${exact.yF.sign() < 0 ? `(${exact.yF.toTex()})` : exact.yF.toTex()} = ${exact.mF.sign() < 0 ? `(${exact.mF.toTex()})` : exact.mF.toTex()}(x - ${xF.sign() < 0 ? `(${xF.toTex()})` : xF.toTex()})` : `y - ${tx(y0)} = ${tx(m)}(x - ${tx(x0)})`] },
    ];
    const b = y0 - m * x0;
    const lineTex = (slope, icpt) => `y ${isExact(slope) && isExact(icpt) ? '=' : '\\approx'} ${tx(slope)}x ${icpt < 0 ? '-' : '+'} ${tx(Math.abs(icpt))}`;
    const tanTex = exact ? slopeInterceptTex(exact.mF, exact.b) : lineTex(m, b);
    steps.push({ title: 'Simplify to slope–intercept form', tex: tanTex });
    let normalTex;
    if (Math.abs(m) < 1e-15) normalTex = `x = ${x0t}`;
    else if (exact) { const mn = exact.mF.inv().neg(); normalTex = slopeInterceptTex(mn, exact.yF.sub(mn.mul(xF))); }
    else { const mn = -1 / m; normalTex = lineTex(mn, y0 - mn * x0); }
    steps.push({ title: 'Normal line (perpendicular to the tangent)', text: 'Its slope is the negative reciprocal −1/m.', tex: normalTex });
    const span = Math.max(3, Math.abs(x0) * 0.5);
    const svg = plot({
      x: [x0 - span, x0 + span],
      curves: [{ f: F, cls: 'd-line' }, { f: (x) => m * (x - x0) + y0, cls: 'd-line2' }],
      points: [{ x: x0, y: y0, label: `(${fmt(x0, 3)}, ${fmt(y0, 3)})`, cls: 'd-foot' }],
      title: 'The curve and its tangent line at the chosen point',
    });
    return {
      ok: true,
      final: { tex: tanTex },
      answers: [
        { label: 'Tangent line', valueTex: tanTex, primary: true },
        exact ? { label: 'General form', valueTex: generalTex(...exact.gen) } : null,
        { label: 'Point of tangency', value: `(${fmt(x0)}, ${fmt(y0)})`, approx: !(isExact(x0) && isExact(y0)) },
        { label: 'Slope m = f′(x₀)', value: fmt(m), approx: !exact && !isExact(m), exactTex: exact && !exact.mF.isInt() ? exact.mF.toTex() : undefined },
        { label: 'Normal line', valueTex: normalTex },
      ].filter(Boolean),
      visual: { svg, legend: '<div class="legend"><span><i></i>y = f(x)</span><span><i class="l2"></i>Tangent line</span></div>', caption: 'Near the point, the tangent line is the best straight-line approximation of the curve.' },
      formula: ["y = f(x_0) + f'(x_0)(x - x_0)"],
      steps,
      rounding: exact ? 'All values are exact fractions.' : 'Values are rounded to 6 decimal places.',
    };
  },
};
