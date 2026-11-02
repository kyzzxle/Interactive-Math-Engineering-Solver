/**
 * Volume of the solid formed by rotating the region between y = f(x) (outer) and y = g(x)
 * (inner, default 0) for a ≤ x ≤ b:
 *   about the x-axis — disk/washer method:  V = π ∫ₐᵇ (f² − g²) dx
 *   about the y-axis — shell method:         V = 2π ∫ₐᵇ x (f − g) dx   (needs 0 ≤ a)
 * Exact multiples of π for polynomials; adaptive Simpson's rule otherwise.
 */
import { tx, answer, piTex } from '../lib/calc-kit.js';
import { parseFunction, parseNumberExpr, FUNCTION_HINT, compile } from '../lib/calculus-kit.js';
import { texOf, toPoly, polyMul, polyAdd } from '../lib/expr.js';
import { adaptiveSimpson } from '../lib/numeric.js';
import { parseFrac, Frac } from '../lib/fraction.js';
import { plot } from '../lib/plot.js';

/** Exact ∫ₐᵇ p(x) dx for Frac coefficients, or null. */
function polyIntegral(p, a, b) {
  let s = new Frac(0n);
  p.forEach((c, i) => { s = s.add(c.mul(b.pow(i + 1).sub(a.pow(i + 1))).div(i + 1)); });
  return s;
}

const SHAPES = [['sqrt(x)', 'y = √x'], ['x^2', 'y = x²'], ['sin(x) + 1', 'y = sin x + 1'], ['4 - x^2/4', 'y = 4 − x²/4']];

export const calculator = {
  id: 'volume-of-revolution',
  explore: {
    title: 'Stack disks to build the volume',
    intro: 'Each rectangle under the curve spins into a thin disk of volume πf(x)²Δx. More disks give a better approximation — in the limit, the integral.',
    controls: [
      { name: 'fn', label: 'Curve', type: 'select', options: SHAPES, value: 'sqrt(x)' },
      { name: 'b', label: 'Right end b', min: 1, max: 4, step: 0.1, value: 4 },
      { name: 'n', label: 'Number of disks n', min: 1, max: 40, step: 1, value: 6 },
    ],
    presets: [{ label: 'n = 4', values: { n: 4 } }, { label: 'n = 40', values: { n: 40 } }],
    render({ fn, b, n }) {
      const f = compile(parseFunction({ f: fn }, 'f').node);
      const w = b / n;
      let approx = 0;
      const bars = [], neg = [];
      for (let i = 0; i < n; i++) { const xm = (i + 0.5) * w, y = f(xm); approx += Math.PI * y * y * w; bars.push({ x: xm, w, h: y }); neg.push({ x: xm, w, h: -y, cls: 'd-bar' }); }
      const exact = Math.PI * adaptiveSimpson((x) => f(x) ** 2, 0, b).value;
      return {
        svg: plot({ x: [-0.3, 4.3], y: [-4.5, 4.5], width: 400, height: 280, title: 'Disks approximating the solid (side view)', curves: [{ f }, { f: (x) => -f(x), cls: 'd-line' }], bars: [...bars, ...neg] }),
        readouts: [
          { label: `Sum of ${n} disks`, tex: `\\sum \\pi f(x_i)^2 \\Delta x \\approx ${tx(approx, 4)}` },
          { label: 'Exact volume', tex: `\\pi \\int_0^{${tx(b, 2)}} f(x)^2\\,dx \\approx ${tx(exact, 4)}`, tone: 'good' },
          { label: 'Error', text: `${(100 * Math.abs(approx - exact) / exact).toFixed(2)}%` },
        ],
      };
    },
  },
  fields: [
    { name: 'f', label: 'Outer curve f(x)', type: 'text', placeholder: 'e.g. sqrt(x)', hint: FUNCTION_HINT },
    { name: 'g', label: 'Inner curve g(x) (optional)', type: 'text', placeholder: 'blank = the x-axis (0)', hint: 'Leave blank for a solid with no hole. f(x) must be ≥ g(x) ≥ 0 on [a, b].' },
    { name: 'a', label: 'From x = a', type: 'text', placeholder: 'e.g. 0', row: 'ab' },
    { name: 'b', label: 'To x = b', type: 'text', placeholder: 'e.g. 4', row: 'ab' },
    { name: 'axis', label: 'Rotate about', type: 'radio', options: [['x', 'the x-axis (disk / washer)'], ['y', 'the y-axis (shells)']] },
  ],
  examples: [
    { label: 'y = √x, 0 ≤ x ≤ 4, about the x-axis', values: { f: 'sqrt(x)', g: '', a: '0', b: '4', axis: 'x' } },
    { label: 'Washer: between y = x and y = x², about the x-axis', values: { f: 'x', g: 'x^2', a: '0', b: '1', axis: 'x' } },
    { label: 'Shells: y = x², 0 ≤ x ≤ 2, about the y-axis', values: { f: 'x^2', g: '', a: '0', b: '2', axis: 'y' } },
    { label: 'Sphere check: y = √(4 − x²) about the x-axis', values: { f: 'sqrt(4 - x^2)', g: '', a: '-2', b: '2', axis: 'x' } },
    { label: 'Invalid: shells with negative x', values: { f: 'x^2', g: '', a: '-1', b: '2', axis: 'y' }, expectError: true },
  ],
  solve(values) {
    const F = parseFunction(values, 'f', 'the outer curve f(x)'); if (F.error) return F.error;
    const hasG = String(values.g ?? '').trim() !== '';
    const G = hasG ? parseFunction(values, 'g', 'the inner curve g(x)') : null; if (G && G.error) return G.error;
    const A = parseNumberExpr(values, 'a', 'a'); if (A.error) return A.error;
    const B = parseNumberExpr(values, 'b', 'b'); if (B.error) return B.error;
    const a = A.value, b = B.value;
    if (!(b > a)) return { ok: false, errors: [{ field: 'b', message: 'b must be greater than a.' }] };
    const axis = values.axis === 'y' ? 'y' : 'x';
    if (axis === 'y' && a < 0) return { ok: false, errors: [{ field: 'a', message: 'For rotation about the y-axis the region must lie to the right of the axis (a ≥ 0); otherwise parts of the solid overlap.' }] };
    const f = compile(F.node), g = G ? compile(G.node) : () => 0;
    for (let i = 0; i <= 200; i++) {
      const x = a + ((b - a) * i) / 200, fx = f(x), gx = g(x);
      if (!Number.isFinite(fx) || !Number.isFinite(gx)) return { ok: false, errors: [{ field: 'f', message: `The curves are not defined everywhere on [a, b] (for example at x ≈ ${tx(x, 4)}).` }] };
      if (fx < gx - 1e-9 * (1 + Math.abs(gx))) return { ok: false, errors: [{ field: hasG ? 'g' : 'f', message: `The outer curve must be on top: f(x) < g(x) at x ≈ ${tx(x, 4)}. Swap them, or choose an interval where f ≥ g.` }] };
      if (gx < -1e-9 || fx < -1e-9) return { ok: false, errors: [{ field: hasG ? 'g' : 'f', message: `The region dips below the x-axis (at x ≈ ${tx(x, 4)}). This calculator needs f(x) ≥ g(x) ≥ 0, so the region does not cross the axis of rotation.` }] };
    }
    const fT = texOf(F.node), gT = G ? texOf(G.node) : '0';
    const integrand = axis === 'x' ? (x) => f(x) ** 2 - g(x) ** 2 : (x) => x * (f(x) - g(x));
    let I;
    try { I = adaptiveSimpson(integrand, a, b, 1e-10).value; } catch (e) { return { ok: false, errors: [{ field: 'f', message: e.message }] }; }
    const V = (axis === 'x' ? Math.PI : 2 * Math.PI) * I;
    // exact coefficient of π for polynomials with rational limits
    let coef = null;
    const pf = toPoly(F.node), pg = G ? toPoly(G.node) : [new Frac(0n)], fa = parseFrac(values.a), fb = parseFrac(values.b);
    if (pf && pg && fa && fb) {
      const neg = (p) => p.map((c) => c.neg());
      const poly = axis === 'x' ? polyAdd(polyMul(pf, pf), neg(polyMul(pg, pg))) : polyMul([new Frac(0n), new Frac(1n)], polyAdd(pf, neg(pg)));
      coef = polyIntegral(poly, fa, fb);
      if (axis === 'y') coef = coef.mul(2);
    }
    const method = axis === 'x' ? (G ? 'washer' : 'disk') : 'shell';
    const formula = axis === 'x' ? (G ? `V = \\pi \\int_a^b \\left[f(x)^2 - g(x)^2\\right] dx` : 'V = \\pi \\int_a^b f(x)^2\\, dx') : 'V = 2\\pi \\int_a^b x\\left[f(x) - g(x)\\right] dx';
    const sub = axis === 'x' ? `V = \\pi \\int_{${tx(a)}}^{${tx(b)}} ${G ? `\\left[\\left(${fT}\\right)^2 - \\left(${gT}\\right)^2\\right]` : `\\left(${fT}\\right)^2`}\\, dx` : `V = 2\\pi \\int_{${tx(a)}}^{${tx(b)}} x\\left[${fT}${G ? ` - \\left(${gT}\\right)` : ''}\\right] dx`;
    const steps = [
      { title: `Choose the method: ${method}`, text: axis === 'x' ? (G ? 'Rotating about the x-axis with a gap between the curves gives washers: outer radius f(x), inner radius g(x).' : 'Rotating about the x-axis, each thin slice is a disk of radius f(x).') : 'Rotating about the y-axis, each thin vertical strip at distance x sweeps out a cylindrical shell of radius x and height f(x) − g(x).' },
      { title: 'Formula', tex: formula },
      { title: 'Substitute', tex: sub },
      { title: 'Evaluate the integral', tex: coef ? `V = ${piTex(coef)} \\approx ${tx(V)}` : `\\int \\approx ${tx(I, 8)} \\Rightarrow V \\approx ${tx(V)}` },
    ];
    const ymax = Math.max(...Array.from({ length: 101 }, (_, i) => f(a + ((b - a) * i) / 100)));
    const svg = axis === 'x'
      ? plot({ x: [a - (b - a) * 0.1, b + (b - a) * 0.1], y: [-ymax * 1.2, ymax * 1.2], width: 380, height: 280, title: 'Region and its mirror image across the x-axis', curves: [{ f: (x) => (x >= a && x <= b ? f(x) : NaN) }, { f: (x) => (x >= a && x <= b ? -f(x) : NaN) }], shade: [{ f, g, a, b }, { f: (x) => -g(x), g: (x) => -f(x), a, b, cls: 'd-shade2' }], hlines: [{ y: 0, cls: 'd-line3', label: 'axis' }] })
      : plot({ x: [-b * 1.1, b * 1.1], y: [0, ymax * 1.2], width: 380, height: 280, title: 'Region and its mirror image across the y-axis', shade: [{ f, g, a, b }, { f: (x) => f(-x), g: (x) => g(-x), a: -b, b: -a, cls: 'd-shade2' }], vlines: [{ x: 0, cls: 'd-line3', label: 'axis' }] });
    return {
      ok: true,
      final: { tex: coef ? `V = ${piTex(coef)} \\approx ${tx(V)}` : `V \\approx ${tx(V)}` },
      answers: [answer('Volume V', V, { primary: true, irrational: true, exactTex: coef ? piTex(coef) : undefined }), answer('Value of the integral', I, { irrational: true })],
      visual: { svg, caption: 'Side view: the shaded region (blue) and its reflection (green) outline the cross-section of the solid.' },
      formula: [formula],
      steps,
      notes: [{ kind: 'info', text: coef ? 'Exact: both curves are polynomials and the limits are rational.' : 'Evaluated numerically (adaptive Simpson’s rule, error about 10⁻¹⁰). Supported: rotation about the x- or y-axis of a region with f ≥ g ≥ 0.' }],
    };
  },
};
