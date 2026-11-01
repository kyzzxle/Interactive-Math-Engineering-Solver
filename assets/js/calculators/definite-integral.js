/**
 * Definite integral ∫ₐᵇ f(x) dx.
 * Method 1 (exact): find an antiderivative with the rule table and use the Fundamental Theorem of
 *   Calculus. Polynomials with rational limits give exact fractions.
 * Method 2 (numerical): adaptive Simpson's rule, used when no antiderivative is found.
 * The FTC answer is always cross-checked against the numerical value; integrands that are undefined
 * or infinite somewhere on [a, b] (improper integrals) are rejected.
 */
import { fmt, tx, eq, isExact } from '../lib/calc-kit.js';
import { integrate, texOf, toPoly, polyEvalFrac, polyToNode, parse, UnsupportedError } from '../lib/expr.js';
import { Frac, parseFrac } from '../lib/fraction.js';
import { parseFunction, parseNumberExpr, FUNCTION_HINT, compile } from '../lib/calculus-kit.js';
import { adaptiveSimpson } from '../lib/numeric.js';
import { plot } from '../lib/plot.js';

/** Value of ∫ₐᵇ f by the best available method. Shared with the area-between-curves calculator. */
export function definiteIntegral(node, a, b, aText, bText) {
  const f = compile(node);
  // reject improper integrals: sample densely for undefined/huge values
  for (let i = 0; i <= 2000; i++) {
    const x = a + ((b - a) * i) / 2000;
    const y = f(x);
    if (!Number.isFinite(y) || Math.abs(y) > 1e12) return { error: `The integrand is undefined or infinite at x ≈ ${fmt(x, 4)}, which lies in the interval. Improper integrals are not supported.` };
  }
  let numeric;
  try { numeric = adaptiveSimpson(f, a, b, 1e-11).value; } catch (e) { return { error: e.message + ' Improper integrals are not supported.' }; }
  let anti = null;
  try { anti = integrate(node).result; } catch (e) { if (!(e instanceof UnsupportedError)) throw e; }
  if (anti) {
    const F = compile(anti);
    const ftc = F(b) - F(a);
    const scale = Math.max(1, Math.abs(numeric));
    if (Number.isFinite(ftc) && Math.abs(ftc - numeric) < 1e-7 * scale) {
      let exact = null;
      const poly = toPoly(node), aF = aText && parseFrac(aText), bF = bText && parseFrac(bText);
      if (poly && aF && bF) {
        const P = toPoly(polyToNode([new Frac(0n), ...poly.map((c, i) => c.div(i + 1))]));
        exact = polyEvalFrac(P, bF).sub(polyEvalFrac(P, aF));
      }
      return { method: 'ftc', value: ftc, anti, F, exact, numeric };
    }
  }
  return { method: 'numeric', value: numeric, numeric };
}

export const calculator = {
  id: 'definite-integral',
  fields: [
    { name: 'f', label: 'Integrand f(x)', type: 'text', placeholder: 'e.g. x^2 + 1', hint: FUNCTION_HINT },
    { name: 'a', label: 'Lower limit a', type: 'text', placeholder: 'e.g. 0', row: 'lim', hint: 'Numbers or expressions such as pi/2.' },
    { name: 'b', label: 'Upper limit b', type: 'text', placeholder: 'e.g. 3', row: 'lim' },
  ],
  examples: [
    { label: '∫₀³ (x² + 1) dx', values: { f: 'x^2 + 1', a: '0', b: '3' } },
    { label: '∫₀^π sin x dx', values: { f: 'sin(x)', a: '0', b: 'pi' } },
    { label: 'Numerical: ∫₀¹ e^(−x²) dx', values: { f: 'e^(-x^2)', a: '0', b: '1' } },
    { label: '∫₁^e (1/x) dx', values: { f: '1/x', a: '1', b: 'e' } },
  ],
  solve(values) {
    const p = parseFunction(values, 'f', 'the integrand');
    if (p.error) return p.error;
    const A = parseNumberExpr(values, 'a', 'the lower limit'); if (A.error) return A.error;
    const B = parseNumberExpr(values, 'b', 'the upper limit'); if (B.error) return B.error;
    const a = A.value, b = B.value;
    if (a === b) return { ok: true, final: { tex: `\\int_{${tx(a)}}^{${tx(b)}} f(x)\\,dx = 0` }, answers: [{ label: 'Value', value: '0', primary: true }], steps: [{ title: 'Equal limits', text: 'An integral over an interval of zero width is 0.' }], rounding: false };
    const r = definiteIntegral(p.node, a, b, values.a, values.b);
    if (r.error) return { ok: false, errors: [{ field: 'f', message: r.error }] };
    const lim = `\\int_{${texLimit(values.a, a)}}^{${texLimit(values.b, b)}} ${texOf(p.node)}\\,dx`;
    const steps = [{ title: 'Write the integral', tex: lim }];
    let final, answers;
    if (r.method === 'ftc') {
      steps.push({ title: 'Find an antiderivative', tex: `F(x) = ${texOf(r.anti)}` });
      steps.push({ title: 'Apply the Fundamental Theorem of Calculus', texLines: ['\\int_a^b f(x)\\,dx = F(b) - F(a)', `= F(${texLimit(values.b, b)}) - F(${texLimit(values.a, a)}) ${eq(r.F(b))} - ${r.F(a) < 0 ? `(${tx(r.F(a))})` : tx(r.F(a))}`, r.exact ? `= ${r.exact.toTex()}${r.exact.isInt() ? '' : ` ${r.exact.toDecimal() ? `= ${r.exact.toDecimal()}` : `\\approx ${tx(r.value)}`}`}` : `${eq(r.value)}`] });
      final = { tex: `${lim} ${r.exact ? `= ${r.exact.toTex()}` : eq(r.value)}` };
      answers = [{ label: 'Value of the integral', value: fmt(r.value), approx: r.exact ? !r.exact.toDecimal() : !isExact(r.value), exactTex: r.exact && !r.exact.isInt() ? r.exact.toTex() : undefined, primary: true }, { label: 'Method', value: 'Exact (Fundamental Theorem of Calculus)' }, { label: 'Antiderivative F(x)', valueTex: texOf(r.anti) }];
      steps.push({ title: 'Cross-check numerically', text: `Adaptive Simpson's rule gives ${fmt(r.numeric, 9)}, agreeing with the exact method.` });
    } else {
      steps.push({ title: 'No elementary antiderivative in the supported rule table', text: 'The integral is evaluated numerically with adaptive Simpson’s rule, which repeatedly halves sub-intervals until successive estimates agree to about 10⁻¹¹.' });
      steps.push({ title: "Adaptive Simpson's rule", texLines: ['\\int_a^b f(x)\\,dx \\approx \\frac{h}{3}\\left[f(x_0) + 4f(x_1) + 2f(x_2) + \\cdots + f(x_n)\\right]', `\\approx ${tx(r.value, 9)}`] });
      final = { tex: `${lim} \\approx ${tx(r.value, 9)}` };
      answers = [{ label: 'Value of the integral', value: fmt(r.value, 9), approx: true, primary: true }, { label: 'Method', value: "Numerical (adaptive Simpson's rule)" }];
    }
    const f = compile(p.node);
    const lo = Math.min(a, b), hi = Math.max(a, b), pad = (hi - lo) * 0.25;
    const svg = plot({ x: [lo - pad, hi + pad], curves: [{ f, cls: 'd-line' }], shade: [{ f, a: lo, b: hi }], vlines: [{ x: a, cls: 'd-grid' }, { x: b, cls: 'd-grid' }], title: 'Graph of f with the region between the curve and the x-axis shaded' });
    return {
      ok: true, final, answers, steps,
      visual: { svg, caption: 'The integral counts area above the x-axis as positive and area below as negative.' },
      formula: ['\\int_a^b f(x)\\,dx = F(b) - F(a), \\quad F\' = f'],
      notes: b < a ? [{ kind: 'info', text: 'The upper limit is smaller than the lower limit, so the result is the negative of the integral from b to a.' }] : [],
      rounding: r.method === 'ftc' ? 'Exact when the integrand is a polynomial and the limits are rational; otherwise rounded to 6 decimal places.' : 'Numerical result shown to 9 decimal places (estimated accuracy about 10⁻¹⁰).',
    };
  },
};

/** TeX for a limit as typed (e.g. pi/2 → π/2, 0.5 → 1/2 stays readable). */
function texLimit(raw, v) {
  try { return texOf(parse(String(raw))); } catch (e) { return tx(v); }
}
