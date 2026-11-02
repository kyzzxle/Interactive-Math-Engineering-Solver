/**
 * First-order differential equations with an initial condition y(x₀) = y₀, four supported forms:
 *   direct     dy/dx = f(x)       →  y = y₀ + ∫_{x₀}^{x} f(t) dt
 *   growth     dy/dx = k·y        →  y = y₀ e^{k(x − x₀)}
 *   linear     dy/dx = a·y + b    →  y = (y₀ + b/a) e^{a(x − x₀)} − b/a
 *   separable  dy/dx = f(x)·y     →  y = y₀ e^{F(x) − F(x₀)},  F′ = f
 * Antiderivatives come from the symbolic integrator; the result is checked against a
 * Runge–Kutta (RK4) numerical solution, and drawn on a slope field.
 */
import { validator, answer, tx, fmt } from '../lib/calc-kit.js';
import { parseFunction, compile } from '../lib/calculus-kit.js';
import { texOf, integrate, UnsupportedError } from '../lib/expr.js';
import { plot } from '../lib/plot.js';

const FORMS = [['direct', 'dy/dx = f(x)'], ['growth', 'dy/dx = k·y (growth / decay)'], ['linear', 'dy/dx = a·y + b (constant a, b)'], ['separable', 'dy/dx = f(x)·y']];

function rk4(g, x0, y0, x1, steps = 400) {
  const h = (x1 - x0) / steps;
  let x = x0, y = y0;
  for (let i = 0; i < steps; i++) {
    const k1 = g(x, y), k2 = g(x + h / 2, y + (h * k1) / 2), k3 = g(x + h / 2, y + (h * k2) / 2), k4 = g(x + h, y + h * k3);
    y += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4); x += h;
  }
  return y;
}

export const calculator = {
  id: 'first-order-ode',
  fields: [
    { name: 'form', label: 'Equation type', type: 'select', options: FORMS },
    { name: 'f', label: 'f(x)', type: 'text', placeholder: 'e.g. 2x or cos(x)', showWhen: { form: ['direct', 'separable'] } },
    { name: 'a', label: 'k (or a)', type: 'number', placeholder: 'e.g. -0.5', row: 'ab', showWhen: { form: ['growth', 'linear'] }, rowShowWhen: { form: ['growth', 'linear'] } },
    { name: 'b', label: 'b', type: 'number', placeholder: 'e.g. 10', row: 'ab', showWhen: { form: ['linear'] } },
    { name: 'x0', label: 'x₀', type: 'number', placeholder: 'e.g. 0', row: 'ic' },
    { name: 'y0', label: 'y₀ = y(x₀)', type: 'number', placeholder: 'e.g. 1', row: 'ic' },
    { name: 'x1', label: 'Find y at x =', type: 'number', placeholder: 'e.g. 2' },
  ],
  examples: [
    { label: 'dy/dx = 2x, y(0) = 1', values: { form: 'direct', f: '2x', x0: '0', y0: '1', x1: '3' } },
    { label: 'Radioactive decay dy/dx = −0.1y, y(0) = 500', values: { form: 'growth', a: '-0.1', x0: '0', y0: '500', x1: '10' } },
    { label: 'Cooling: dy/dx = −0.2y + 4, y(0) = 90', values: { form: 'linear', a: '-0.2', b: '4', x0: '0', y0: '90', x1: '10' } },
    { label: 'Separable: dy/dx = cos(x)·y, y(0) = 2', values: { form: 'separable', f: 'cos(x)', x0: '0', y0: '2', x1: '1.5' } },
    { label: 'Not supported: ∫ e^(x²) has no elementary form', values: { form: 'direct', f: 'e^(x^2)', x0: '0', y0: '1', x1: '1' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const form = FORMS.some(([k]) => k === values.form) ? values.form : 'direct';
    const x0 = v.number('x0', 'x₀', { maxAbs: 1e4 }), y0 = v.number('y0', 'y₀', { maxAbs: 1e9 }), x1 = v.number('x1', 'x', { maxAbs: 1e4 });
    const a = ['growth', 'linear'].includes(form) ? v.number('a', form === 'growth' ? 'k' : 'a', { maxAbs: 1e3 }) : null;
    const b = form === 'linear' ? v.number('b', 'b', { maxAbs: 1e6 }) : null;
    if (!v.ok()) return v.result();
    let g, sol, steps = [], solTex, eqTex;
    if (form === 'direct' || form === 'separable') {
      const P = parseFunction(values, 'f', 'f(x)'); if (P.error) return P.error;
      let Fn;
      try { Fn = integrate(P.node).result; } catch (e) { if (e instanceof UnsupportedError) return { ok: false, errors: [{ field: 'f', message: `This f(x) has no antiderivative in the supported table (${e.message}) — this solver needs an exact integral.` }] }; throw e; }
      const f = compile(P.node), Fc = compile(Fn);
      const fT = texOf(P.node), FT = texOf(Fn);
      const F0 = Fc(x0);
      if (!Number.isFinite(F0)) return { ok: false, errors: [{ field: 'x0', message: 'The antiderivative is not defined at x₀. Choose another starting point.' }] };
      if (form === 'direct') {
        eqTex = `\\frac{dy}{dx} = ${fT}`;
        g = (x) => f(x);
        sol = (x) => y0 + Fc(x) - F0;
        steps.push({ title: 'Integrate both sides', tex: `y = \\int ${fT}\\,dx = ${FT} + C` });
        steps.push({ title: 'Use the initial condition', tex: `${tx(y0)} = ${tx(F0, 6)} + C \\Rightarrow C = ${tx(y0 - F0, 6)}` });
        solTex = `y = ${FT} ${y0 - F0 < 0 ? '-' : '+'} ${tx(Math.abs(y0 - F0), 6)}`;
      } else {
        eqTex = `\\frac{dy}{dx} = \\left(${fT}\\right) y`;
        g = (x, y) => f(x) * y;
        sol = (x) => y0 * Math.exp(Fc(x) - F0);
        steps.push({ title: 'Separate the variables (for y ≠ 0)', tex: `\\frac{dy}{y} = ${fT}\\,dx` });
        steps.push({ title: 'Integrate both sides', tex: `\\ln|y| = ${FT} + C` });
        steps.push({ title: 'Solve for y and use y(x₀) = y₀', tex: `y = y_0\\,e^{F(x) - F(x_0)},\\quad F(x) = ${FT},\\ F(${tx(x0)}) \\approx ${tx(F0, 6)}` });
        solTex = `y = ${tx(y0)}\\,e^{${FT} ${F0 < 0 ? '+' : '-'} ${tx(Math.abs(F0), 6)}}`.replace(/ [-+] 0\}$/, '}');
      }
    } else if (form === 'growth') {
      eqTex = `\\frac{dy}{dx} = ${tx(a)}y`;
      g = (x, y) => a * y; sol = (x) => y0 * Math.exp(a * (x - x0));
      steps.push({ title: 'Separate the variables', tex: `\\frac{dy}{y} = ${tx(a)}\\,dx \\Rightarrow \\ln|y| = ${tx(a)}x + C` });
      steps.push({ title: 'Exponentiate and use y(x₀) = y₀', tex: 'y = y_0\\,e^{k(x - x_0)}' });
      solTex = `y = ${tx(y0)}\\,e^{${tx(a)}${x0 === 0 ? 'x' : `(x ${x0 < 0 ? '+' : '-'} ${tx(Math.abs(x0))})`}}`;
      if (a !== 0) steps.push({ title: a < 0 ? 'Half-life' : 'Doubling time', tex: `\\frac{\\ln 2}{|k|} \\approx ${tx(Math.LN2 / Math.abs(a), 6)}` });
    } else {
      if (a === 0) return { ok: false, errors: [{ field: 'a', message: 'With a = 0 the equation is dy/dx = b: use the "dy/dx = f(x)" form with f(x) = b.' }] };
      const L = -b / a;
      eqTex = `\\frac{dy}{dx} = ${tx(a)}y ${b < 0 ? '-' : '+'} ${tx(Math.abs(b))}`;
      g = (x, y) => a * y + b; sol = (x) => (y0 - L) * Math.exp(a * (x - x0)) + L;
      steps.push({ title: 'Equilibrium (where dy/dx = 0)', tex: `y^* = -\\frac{b}{a} = ${tx(L, 6)}` });
      steps.push({ title: 'The distance from equilibrium grows or decays exponentially', tex: `\\frac{d}{dx}(y - y^*) = a\\,(y - y^*) \\Rightarrow y - y^* = (y_0 - y^*)e^{a(x - x_0)}` });
      solTex = `y = ${tx(L, 6)} ${y0 - L < 0 ? '-' : '+'} ${tx(Math.abs(y0 - L), 6)}\\,e^{${tx(a)}${x0 === 0 ? 'x' : `(x ${x0 < 0 ? '+' : '-'} ${tx(Math.abs(x0))})`}}`;
    }
    const y1 = sol(x1);
    if (!Number.isFinite(y1) || Math.abs(y1) > 1e100) return { ok: false, errors: [{ field: 'x1', message: 'The solution grows too large (or is not defined) at this x. Try a value closer to x₀.' }] };
    const yN = rk4(g, x0, y0, x1, 1000);
    steps.unshift({ title: 'The equation and initial condition', tex: `${eqTex},\\quad y(${tx(x0)}) = ${tx(y0)}` });
    steps.push({ title: 'Solution', tex: solTex });
    steps.push({ title: `Evaluate at x = ${fmt(x1)}`, tex: `y(${tx(x1)}) \\approx ${tx(y1, 6)}` });
    steps.push({ title: 'Check with a numerical method (RK4, 1000 steps)', text: `RK4 gives y(${fmt(x1)}) ≈ ${fmt(yN, 6)}; difference ${Math.abs(yN - y1).toExponential(1)}.` });
    // slope field
    const lo = Math.min(x0, x1), hi = Math.max(x0, x1), pad = (hi - lo) * 0.15 || 1;
    const X = [lo - pad, hi + pad];
    const ys = Array.from({ length: 81 }, (_, i) => sol(X[0] + ((X[1] - X[0]) * i) / 80)).filter((y) => Number.isFinite(y) && Math.abs(y) < 1e6);
    const ylo = Math.min(...ys, y0), yhi = Math.max(...ys, y0), ypad = (yhi - ylo) * 0.2 || 1;
    const Y = [ylo - ypad, yhi + ypad];
    const segs = [];
    for (let i = 0; i <= 14; i++) for (let j = 0; j <= 10; j++) {
      const x = X[0] + ((X[1] - X[0]) * i) / 14, y = Y[0] + ((Y[1] - Y[0]) * j) / 10, m = g(x, y);
      if (!Number.isFinite(m)) continue;
      const dx = (X[1] - X[0]) / 40, sx = (Y[1] - Y[0]) / (X[1] - X[0]);
      const len = Math.hypot(1, m / sx), ux = dx / len, uy = (m * dx) / len;
      segs.push({ x1: x - ux, y1: y - uy, x2: x + ux, y2: y + uy, cls: 'd-grid' });
    }
    return {
      ok: true,
      final: { texLines: [solTex, `y(${tx(x1)}) \\approx ${tx(y1, 6)}`] },
      answers: [{ label: 'Solution y(x)', valueTex: solTex, copy: '' }, answer(`y(${fmt(x1)})`, y1, { primary: true, irrational: true }), answer('Numerical check (RK4)', yN, { irrational: true })],
      visual: { svg: plot({ x: X, y: Y, width: 380, height: 280, title: 'Slope field and the solution curve', segments: segs, curves: [{ f: sol, samples: 400 }], points: [{ x: x0, y: y0, label: 'start', cls: 'd-point2' }, { x: x1, y: y1, label: `(${fmt(x1, 2)}, ${fmt(y1, 3)})`, cls: 'd-point3' }] }), caption: 'Short grey segments show the slope dy/dx at each point; the solution follows them through the starting point.' },
      formula: [FORMS.find(([k]) => k === form)[1].replace('dy/dx', '\\frac{dy}{dx}').replace('·', '\\cdot ')],
      steps,
      notes: [{ kind: 'info', text: 'Supported forms only: dy/dx = f(x), k·y, a·y + b and f(x)·y. The separable form assumes y does not cross 0 (y ≡ 0 is also a solution).' }],
    };
  },
};
