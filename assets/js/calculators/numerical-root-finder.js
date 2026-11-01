/**
 * Numerical root finding for f(x) = 0:
 *   Bisection:       needs f(a), f(b) of opposite sign; always converges, error halves each step.
 *   Newton–Raphson:  x_{k+1} = x_k − f(x_k)/f′(x_k); fast near a simple root, may fail or diverge.
 * Stops when |x_{k+1} − x_k| < tolerance (and |f| is small) or after the iteration limit.
 */
import { fmt, tx } from '../lib/calc-kit.js';
import { derivative, texOf } from '../lib/expr.js';
import { parseFunction, parseNumberExpr, FUNCTION_HINT, compile } from '../lib/calculus-kit.js';
import { plot } from '../lib/plot.js';

export const calculator = {
  id: 'numerical-root-finder',
  fields: [
    { name: 'f', label: 'Function f(x)', type: 'text', placeholder: 'e.g. x^3 - x - 2', hint: FUNCTION_HINT },
    { name: 'method', label: 'Method', type: 'radio', options: [['bisection', 'Bisection'], ['newton', 'Newton–Raphson']] },
    { name: 'a', label: 'Left end a', type: 'text', placeholder: 'e.g. 1', row: 'ab', showWhen: { method: ['bisection'] }, rowShowWhen: { method: ['bisection'] } },
    { name: 'b', label: 'Right end b', type: 'text', placeholder: 'e.g. 2', row: 'ab', showWhen: { method: ['bisection'] } },
    { name: 'x0', label: 'Starting guess x₀', type: 'text', placeholder: 'e.g. 1.5', showWhen: { method: ['newton'] } },
    { name: 'tol', label: 'Tolerance', type: 'select', options: [['1e-4', '10⁻⁴'], ['1e-6', '10⁻⁶'], ['1e-8', '10⁻⁸'], ['1e-10', '10⁻¹⁰']], default: '1e-6', row: 'stop' },
    { name: 'maxit', label: 'Maximum iterations', type: 'number', inputmode: 'numeric', placeholder: '50', row: 'stop' },
  ],
  examples: [
    { label: 'x³ − x − 2 by bisection on [1, 2]', values: { f: 'x^3 - x - 2', method: 'bisection', a: '1', b: '2', tol: '1e-6', maxit: '50' } },
    { label: 'cos x = x by Newton from 1', values: { f: 'cos(x) - x', method: 'newton', x0: '1', tol: '1e-10', maxit: '20' } },
    { label: '√2 as a root of x² − 2', values: { f: 'x^2 - 2', method: 'newton', x0: '1', tol: '1e-10', maxit: '20' } },
    { label: 'Newton failure: x³ − 2x + 2 from 0', values: { f: 'x^3 - 2x + 2', method: 'newton', x0: '0', tol: '1e-8', maxit: '30' } },
  ],
  solve(values) {
    const P = parseFunction(values, 'f', 'the function f(x)');
    if (P.error) return P.error;
    const f = compile(P.node);
    const method = values.method === 'newton' ? 'newton' : 'bisection';
    const tol = { '1e-4': 1e-4, '1e-6': 1e-6, '1e-8': 1e-8, '1e-10': 1e-10 }[values.tol] || 1e-6;
    const maxRaw = String(values.maxit ?? '').trim();
    const maxit = maxRaw ? Number(maxRaw) : 50;
    if (!Number.isInteger(maxit) || maxit < 1 || maxit > 1000) return { ok: false, errors: [{ field: 'maxit', message: 'The iteration limit must be a whole number from 1 to 1000.' }] };
    const steps = [{ title: 'The equation to solve', tex: `f(x) = ${texOf(P.node)} = 0` }];
    const rows = [];
    let root = null, converged = false, reason = '', iterates = [];
    if (method === 'bisection') {
      const A = parseNumberExpr(values, 'a', 'a'); if (A.error) return A.error;
      const B = parseNumberExpr(values, 'b', 'b'); if (B.error) return B.error;
      let a = A.value, b = B.value;
      if (!(b > a)) return { ok: false, errors: [{ field: ['a', 'b'], message: 'The right end b must be greater than the left end a.' }] };
      let fa = f(a), fb = f(b);
      if (!Number.isFinite(fa) || !Number.isFinite(fb)) return { ok: false, errors: [{ field: ['a', 'b'], message: 'f is undefined at one of the end points.' }] };
      if (fa * fb > 0) return { ok: false, errors: [{ field: ['a', 'b'], message: `f(a) = ${fmt(fa)} and f(b) = ${fmt(fb)} have the same sign, so bisection cannot guarantee a root in [a, b]. Choose an interval where f changes sign (the graph may help).` }] };
      steps.push({ title: 'Check the sign change', text: `f(${fmt(a)}) = ${fmt(fa)} and f(${fmt(b)}) = ${fmt(fb)} have opposite signs, so (if f is continuous) a root lies between them.` });
      if (fa === 0) { root = a; converged = true; }
      else if (fb === 0) { root = b; converged = true; }
      for (let k = 1; k <= maxit && !converged; k++) {
        const m = (a + b) / 2, fm = f(m);
        if (!Number.isFinite(fm)) { reason = `f is undefined at x = ${fmt(m)}, so f is not continuous on the interval.`; break; }
        rows.push([String(k), fmt(a, 8), fmt(b, 8), fmt(m, 10), fmt(fm, 8), fmt((b - a) / 2, 8)]);
        iterates.push(m);
        if (fm === 0 || (b - a) / 2 < tol) { root = m; converged = true; break; }
        if (fa * fm < 0) { b = m; } else { a = m; fa = fm; }
        root = m;
      }
      steps.push({ title: 'Repeatedly halve the interval', text: 'Evaluate f at the midpoint m and keep the half where the sign change is; the error bound (b − a)/2 halves every step.', texLines: ['m = \\frac{a + b}{2}, \\qquad \\text{keep } [a, m] \\text{ if } f(a)f(m) < 0, \\text{ else } [m, b]'] });
    } else {
      const X = parseNumberExpr(values, 'x0', 'the starting guess'); if (X.error) return X.error;
      const d = derivative(P.node);
      const df = compile(d);
      steps.push({ title: 'Differentiate f', tex: `f'(x) = ${texOf(d)}` });
      steps.push({ title: 'Newton–Raphson iteration', text: 'Follow the tangent line at the current guess down to the x-axis.', tex: "x_{k+1} = x_k - \\frac{f(x_k)}{f'(x_k)}" });
      let x = X.value;
      iterates.push(x);
      for (let k = 1; k <= maxit; k++) {
        const fx = f(x), dfx = df(x);
        if (!Number.isFinite(fx) || !Number.isFinite(dfx)) { reason = `f or f′ is undefined at x = ${fmt(x)}.`; break; }
        if (Math.abs(dfx) < 1e-14) { reason = `f′(${fmt(x)}) = 0: the tangent line is horizontal and never meets the x-axis. Try a different starting guess.`; break; }
        const next = x - fx / dfx;
        rows.push([String(k), fmt(x, 10), fmt(fx, 8), fmt(dfx, 8), fmt(next, 10), fmt(Math.abs(next - x), 8)]);
        if (!Number.isFinite(next) || Math.abs(next) > 1e12) { reason = 'The iterates grew without bound (divergence). Try a starting guess closer to the root.'; break; }
        iterates.push(next);
        if (Math.abs(next - x) < tol && Math.abs(f(next)) < Math.sqrt(tol)) { root = next; converged = true; break; }
        x = next; root = next;
      }
      if (!converged && !reason) {
        const cyc = iterates.length > 4 && Math.abs(iterates[iterates.length - 1] - iterates[iterates.length - 3]) < 1e-6;
        reason = cyc ? 'The iterates are cycling between the same values instead of converging (a known failure mode of Newton’s method).' : `No convergence within ${maxit} iterations.`;
      }
    }
    if (!converged) {
      steps.push({ title: 'The method did not converge', text: reason });
      return {
        ok: true,
        final: { text: `No root found: ${reason}` },
        answers: [{ label: 'Result', value: 'Did not converge', primary: true }, { label: 'Iterations performed', value: String(rows.length) }],
        visual: graph(f, iterates, null), tables: [table(method, rows)], steps,
        notes: [{ kind: 'warn', text: method === 'newton' ? 'Newton’s method needs a starting guess reasonably close to a root where f′ ≠ 0. Bisection is slower but always converges once you have a sign change.' : 'Check that f is continuous on [a, b].' }],
        rounding: false,
      };
    }
    const fr = f(root);
    steps.push({ title: 'Stop: the tolerance is met', text: `After ${rows.length} iteration${rows.length === 1 ? '' : 's'} the change is below ${tol} and f(x) ≈ ${fmt(fr, 10)}.`, tex: `x \\approx ${tx(root, 10)}` });
    return {
      ok: true,
      final: { tex: `x \\approx ${tx(root, 10)}` },
      answers: [{ label: 'Root', value: fmt(root, 10), approx: true, primary: true }, { label: 'f(root)', value: fr.toExponential(3), approx: true }, { label: 'Iterations', value: String(rows.length) }, { label: 'Method', value: method === 'newton' ? 'Newton–Raphson' : 'Bisection' }],
      visual: graph(f, iterates, root), tables: [table(method, rows)], steps,
      formula: [method === 'newton' ? "x_{k+1} = x_k - \\frac{f(x_k)}{f'(x_k)}" : 'm = \\frac{a + b}{2}, \\quad |x - m| \\le \\frac{b - a}{2}'],
      notes: [{ kind: 'info', text: method === 'newton' ? 'Near a simple root Newton’s method converges quadratically: the number of correct digits roughly doubles each iteration.' : `Bisection gains one binary digit per step: after k steps the error is at most (b − a)/2^k.` }],
      rounding: 'The root is shown to 10 decimal places; its accuracy is set by the chosen tolerance.',
    };
  },
};

function table(method, rows) {
  return method === 'newton'
    ? { caption: 'Newton–Raphson iterations', headers: ['k', 'xₖ', 'f(xₖ)', 'f′(xₖ)', 'xₖ₊₁', '|xₖ₊₁ − xₖ|'], rows }
    : { caption: 'Bisection iterations', headers: ['k', 'a', 'b', 'midpoint m', 'f(m)', 'error bound'], rows };
}
function graph(f, iterates, root) {
  const pts = iterates.filter(Number.isFinite);
  const all = root !== null ? [...pts, root] : pts;
  const lo = Math.min(...all), hi = Math.max(...all);
  const pad = Math.max(1, (hi - lo) * 0.4);
  return {
    svg: plot({ x: [lo - pad, hi + pad], curves: [{ f, cls: 'd-line' }], points: [...pts.slice(0, 15).map((x, i) => ({ x, y: 0, r: 3, cls: 'd-point', label: i < 4 ? `x${i}` : '' })), ...(root !== null ? [{ x: root, y: 0, label: 'root', cls: 'd-foot' }] : [])], title: 'Graph of f with the successive approximations on the x-axis' }),
    caption: 'Successive approximations close in on the point where the curve crosses the x-axis.',
  };
}
