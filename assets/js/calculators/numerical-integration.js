/**
 * Composite trapezoidal and Simpson's rules with n sub-intervals:
 *   T = (h/2)[f₀ + 2f₁ + … + 2f_{n−1} + fₙ]          error O(h²)
 *   S = (h/3)[f₀ + 4f₁ + 2f₂ + … + 4f_{n−1} + fₙ]     error O(h⁴), n even
 * Compared with an accurate reference value (exact when an antiderivative is available).
 */
import { fmt, tx } from '../lib/calc-kit.js';
import { parseFunction, parseNumberExpr, FUNCTION_HINT, compile } from '../lib/calculus-kit.js';
import { trapezoid, simpson } from '../lib/numeric.js';
import { definiteIntegral } from './definite-integral.js';
import { plot } from '../lib/plot.js';

export const calculator = {
  id: 'numerical-integration',
  fields: [
    { name: 'f', label: 'Integrand f(x)', type: 'text', placeholder: 'e.g. e^(-x^2)', hint: FUNCTION_HINT },
    { name: 'a', label: 'a', type: 'text', placeholder: '0', row: 'ab' },
    { name: 'b', label: 'b', type: 'text', placeholder: '1', row: 'ab' },
    { name: 'n', label: 'Sub-intervals n', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 4', row: 'ab' },
    { name: 'method', label: 'Rule', type: 'radio', options: [['both', 'Both'], ['trap', 'Trapezoidal'], ['simpson', "Simpson's"]] },
  ],
  examples: [
    { label: '∫₀¹ e^(−x²) dx, n = 4', values: { f: 'e^(-x^2)', a: '0', b: '1', n: '4', method: 'both' } },
    { label: '∫₀^π sin x dx, n = 6', values: { f: 'sin(x)', a: '0', b: 'pi', n: '6', method: 'both' } },
    { label: '∫₁² (1/x) dx, n = 10 (trapezoidal)', values: { f: '1/x', a: '1', b: '2', n: '10', method: 'trap' } },
  ],
  solve(values) {
    const P = parseFunction(values, 'f', 'the integrand'); if (P.error) return P.error;
    const A = parseNumberExpr(values, 'a', 'a'); if (A.error) return A.error;
    const B = parseNumberExpr(values, 'b', 'b'); if (B.error) return B.error;
    const a = A.value, b = B.value;
    if (!(b > a)) return { ok: false, errors: [{ field: ['a', 'b'], message: 'b must be greater than a.' }] };
    const nRaw = String(values.n ?? '').trim();
    const n = Number(nRaw);
    if (!/^\d+$/.test(nRaw) || n < 1 || n > 10000) return { ok: false, errors: [{ field: 'n', message: 'n must be a whole number from 1 to 10,000.' }] };
    const method = ['both', 'trap', 'simpson'].includes(values.method) ? values.method : 'both';
    if (method !== 'trap' && n % 2) return { ok: false, errors: [{ field: 'n', message: `Simpson's rule needs an even number of sub-intervals (it fits parabolas over pairs of them). Use n = ${n + 1} or choose the trapezoidal rule.` }] };
    const F = compile(P.node);
    const T = trapezoid(F, a, b, n), S = method !== 'trap' ? simpson(F, a, b, n) : null;
    const bad = T.points.find((p) => !Number.isFinite(p.y));
    if (bad) return { ok: false, errors: [{ field: 'f', message: `f is undefined or infinite at x = ${fmt(bad.x)}, one of the sample points. These rules need f to be finite on [a, b].` }] };
    const ref = definiteIntegral(P.node, a, b, values.a, values.b);
    const reference = ref.error ? null : ref.value;
    const h = (b - a) / n;
    const steps = [
      { title: 'Step size and sample points', texLines: [`h = \\frac{b - a}{n} = \\frac{${tx(b)} - ${tx(a)}}{${n}} ${Number.isInteger(h * 1e9) ? '=' : '\\approx'} ${tx(h)}`, `x_i = a + ih, \\quad i = 0, 1, \\dots, ${n}`] },
    ];
    if (method !== 'simpson') steps.push({ title: 'Trapezoidal rule', text: 'Join consecutive points with straight lines and add the areas of the trapezoids: interior points count twice.', texLines: ['T = \\frac{h}{2}\\left[f_0 + 2f_1 + \\cdots + 2f_{n-1} + f_n\\right]', `T = \\frac{${tx(h)}}{2}(${tx(T.sum, 8)}) \\approx ${tx(T.value, 10)}`] });
    if (S) steps.push({ title: "Simpson's rule", text: 'Fit a parabola through each pair of sub-intervals: weights 1, 4, 2, 4, …, 4, 1.', texLines: ['S = \\frac{h}{3}\\left[f_0 + 4f_1 + 2f_2 + \\cdots + 4f_{n-1} + f_n\\right]', `S = \\frac{${tx(h)}}{3}(${tx(S.sum, 8)}) \\approx ${tx(S.value, 10)}`] });
    if (reference !== null) steps.push({ title: 'Compare with an accurate value', text: ref.method === 'ftc' ? 'Reference from the exact antiderivative (Fundamental Theorem of Calculus).' : "Reference from adaptive Simpson's rule (error about 10⁻¹¹).", texLines: [`I \\approx ${tx(reference, 10)}`, ...(method !== 'simpson' ? [`|T - I| \\approx ${sciTex(Math.abs(T.value - reference))}`] : []), ...(S ? [`|S - I| \\approx ${sciTex(Math.abs(S.value - reference))}`] : [])] });
    const shown = T.points.length > 41 ? [...T.points.slice(0, 20), null, ...T.points.slice(-20)] : T.points;
    const rows = shown.map((p) => (p ? [String(p.i), fmt(p.x, 8), fmt(p.y, 8), String(p.w), S ? String(S.points[p.i].w) : '—'] : ['…', '…', '…', '…', '…']));
    const answers = [];
    if (method !== 'simpson') answers.push({ label: 'Trapezoidal estimate T', value: fmt(T.value, 10), approx: true, primary: true });
    if (S) answers.push({ label: "Simpson's estimate S", value: fmt(S.value, 10), approx: true, primary: true });
    if (reference !== null) {
      answers.push({ label: ref.method === 'ftc' ? 'Exact value' : 'Accurate value (adaptive)', value: fmt(reference, 10), approx: true });
      if (method !== 'simpson') answers.push({ label: 'Trapezoidal error', value: Math.abs(T.value - reference).toExponential(3), approx: true });
      if (S) answers.push({ label: "Simpson's error", value: Math.abs(S.value - reference).toExponential(3), approx: true });
    }
    const svg = plot({
      x: [a - (b - a) * 0.1, b + (b - a) * 0.1], curves: [{ f: F, cls: 'd-line' }],
      shade: n <= 60 ? T.points.slice(0, -1).map((p, i) => { const q = T.points[i + 1]; return { f: (t) => p.y + ((q.y - p.y) * (t - p.x)) / (q.x - p.x), a: p.x, b: q.x, cls: i % 2 ? 'd-shade' : 'd-shade2' }; }) : [{ f: F, a, b }],
      points: n <= 60 ? T.points.map((p) => ({ x: p.x, y: p.y, r: 2.5, cls: 'd-foot' })) : [],
      title: 'The curve with the trapezoids used by the trapezoidal rule',
    });
    return {
      ok: true,
      final: { texLines: [...(method !== 'simpson' ? [`T \\approx ${tx(T.value, 10)}`] : []), ...(S ? [`S \\approx ${tx(S.value, 10)}`] : [])] },
      answers,
      visual: { svg, caption: 'Each shaded strip is one trapezoid; Simpson’s rule replaces pairs of straight tops with parabolas.' },
      tables: [{ caption: 'Sample points and weights', headers: ['i', 'xᵢ', 'f(xᵢ)', 'Trapezoid weight', "Simpson's weight"], rows }],
      formula: ['T = \\frac{h}{2}\\left[f_0 + 2\\sum f_i + f_n\\right] \\qquad S = \\frac{h}{3}\\left[f_0 + 4\\sum_{\\text{odd}} f_i + 2\\sum_{\\text{even}} f_i + f_n\\right]'],
      steps,
      notes: [{ kind: 'info', text: "Doubling n roughly divides the trapezoidal error by 4 and Simpson's error by 16." }, ...(ref.error ? [{ kind: 'warn', text: 'No reference value could be computed for comparison.' }] : [])],
      rounding: 'Estimates are shown to 10 decimal places.',
    };
  },
};

/** 1.234 × 10⁻⁵ in TeX (0 stays 0). */
function sciTex(x) {
  if (x === 0) return '0';
  const [m, e] = x.toExponential(3).split('e');
  return `${m} \\times 10^{${Number(e)}}`;
}
