/**
 * Critical points and intervals of increase/decrease for polynomial functions (degree 2–6).
 * f′ is found exactly; its rational roots exactly (rational root theorem), a remaining quadratic
 * with exact radicals, and any other real roots numerically. Each critical number is classified
 * with a sign chart of f′ (first-derivative test).
 */
import { fmt, tx, isExact } from '../lib/calc-kit.js';
import { toPoly, polyDeriv, polyToNode, texOf, polyEval } from '../lib/expr.js';
import { rationalRoots, synthDiv, polyRealRoots } from '../lib/numeric.js';
import { parseFunction } from '../lib/calculus-kit.js';
import { plot } from '../lib/plot.js';
import { simplifySqrt } from '../lib/exact.js';
import { sqrtFrac } from '../lib/calc-kit.js';

export const calculator = {
  id: 'critical-points',
  fields: [
    { name: 'f', label: 'Polynomial f(x)', type: 'text', placeholder: 'e.g. x^3 - 6x^2 + 9x + 1', hint: 'Polynomials of degree 2 to 6 in x, e.g. 2x^3 - 3x^2 - 12x + 5.' },
  ],
  examples: [
    { label: 'x³ − 6x² + 9x + 1', values: { f: 'x^3 - 6x^2 + 9x + 1' } },
    { label: 'x⁴ − 2x²', values: { f: 'x^4 - 2x^2' } },
    { label: 'x³ (inflection, no extremum)', values: { f: 'x^3' } },
    { label: 'Irrational: x³ − 3x² − 3x + 1', values: { f: 'x^3 - 3x^2 - 3x + 1' } },
  ],
  solve(values) {
    const p = parseFunction(values, 'f', 'a polynomial');
    if (p.error) return p.error;
    const poly = toPoly(p.node);
    if (!poly) return { ok: false, errors: [{ field: 'f', message: 'This calculator supports polynomials only (sums of terms like 3x^2). For other functions use the derivative calculator and solve f′(x) = 0 with the numerical root finder.' }] };
    const deg = poly.length - 1;
    if (deg < 2 || deg > 6) return { ok: false, errors: [{ field: 'f', message: deg < 2 ? 'A constant or linear function has no turning points (its derivative never changes sign).' : 'Please enter a polynomial of degree at most 6.' }] };
    const dp = polyDeriv(poly);
    const steps = [
      { title: 'Write the function', tex: `f(x) = ${texOf(polyToNode(poly))}` },
      { title: 'Differentiate', tex: `f'(x) = ${texOf(polyToNode(dp))}` },
    ];
    // critical numbers: exact rational roots, then a quadratic remainder exactly, then numerics
    const crit = [];
    const rr = rationalRoots(dp);
    let rest = dp.slice();
    for (const r of rr) { rest = synthDiv(rest, r); }
    const seen = new Set();
    for (const r of rr) { const k = r.toString(); if (!seen.has(k)) { seen.add(k); crit.push({ x: r.toNumber(), tex: r.toTex() }); } }
    if (rest.length === 3) {
      const [c, b, a] = rest;
      const D = b.pow(2).sub(a.mul(c).mul(4));
      if (D.sign() > 0) {
        const s = sqrtFrac(D, simplifySqrt);
        const center = b.neg().div(a.mul(2)), an = a.toNumber();
        for (const sign of [-1, 1]) {
          const x = center.toNumber() + (sign * s.value) / (2 * an);
          crit.push({ x, tex: `${center.isZero() ? '' : center.toTex()} ${sign < 0 ? '-' : '+'} \\frac{${s.tex}}{${a.mul(2).toTex()}}`.trim() });
        }
      }
    } else if (rest.length > 3) {
      for (const x of polyRealRoots(rest)) crit.push({ x, tex: `${tx(x)}`, approx: true });
    }
    crit.sort((u, v) => u.x - v.x);
    steps.push({ title: "Solve f'(x) = 0 for the critical numbers", text: crit.length ? 'Factor f′ (rational root theorem and the quadratic formula; any remaining roots are found numerically).' : 'f′(x) is never zero, so there are no critical numbers.', texLines: crit.length ? crit.map((c, i) => `x_${i + 1} ${c.approx ? '\\approx' : '='} ${c.tex}${c.approx ? '' : Number.isInteger(c.x) ? '' : ` \\approx ${tx(c.x)}`}`) : [] });
    // sign chart
    const f = (x) => polyEval(poly, x), fp = (x) => polyEval(dp, x);
    const xs = crit.map((c) => c.x);
    const edges = [-Infinity, ...xs, Infinity];
    const rows = [];
    const inc = [], dec = [];
    const fmtEdge = (v) => (v === -Infinity ? '−∞' : v === Infinity ? '∞' : fmt(v, 4));
    for (let i = 0; i < edges.length - 1; i++) {
      const lo = edges[i], hi = edges[i + 1];
      const t = lo === -Infinity ? (hi === Infinity ? 0 : hi - 1) : hi === Infinity ? lo + 1 : (lo + hi) / 2;
      const s = fp(t);
      const sign = s > 0 ? '+' : s < 0 ? '−' : '0';
      rows.push([`(${fmtEdge(lo)}, ${fmtEdge(hi)})`, fmt(t, 4), sign, s > 0 ? 'increasing ↗' : 'decreasing ↘']);
      (s > 0 ? inc : dec).push(`(${fmtEdge(lo)}, ${fmtEdge(hi)})`);
    }
    // merge adjacent intervals with the same behaviour (e.g. around a stationary inflection point)
    const classes = crit.map((c, i) => {
      const left = fp(i === 0 ? c.x - 1 : (xs[i - 1] + c.x) / 2), right = fp(i === xs.length - 1 ? c.x + 1 : (c.x + xs[i + 1]) / 2);
      const kind = left > 0 && right < 0 ? 'local maximum' : left < 0 && right > 0 ? 'local minimum' : 'neither (f′ does not change sign)';
      return { ...c, y: f(c.x), kind };
    });
    steps.push({ title: "Sign chart of f'(x)", text: 'Pick a test point in each interval between critical numbers: f′ > 0 means f is increasing, f′ < 0 means decreasing.' });
    steps.push({ title: 'Classify each critical number (first-derivative test)', texLines: classes.map((c) => `x ${c.approx ? '\\approx' : '='} ${c.approx ? tx(c.x) : c.tex}:\\ \\text{${c.kind}},\\ f(x) \\approx ${tx(c.y)}`) });
    const merge = (list) => {
      // join intervals that share an endpoint
      const out = [];
      for (const s of list) {
        const [a, b] = s.slice(1, -1).split(', ');
        if (out.length && out[out.length - 1][1] === a) out[out.length - 1][1] = b; else out.push([a, b]);
      }
      return out.map(([a, b]) => `(${a}, ${b})`).join(' ∪ ') || 'none';
    };
    const lo = xs.length ? Math.min(...xs) : -2, hi = xs.length ? Math.max(...xs) : 2;
    const pad = Math.max(1.5, (hi - lo) * 0.4);
    const svg = plot({
      x: [lo - pad, hi + pad], curves: [{ f, cls: 'd-line' }, { f: fp, cls: 'd-line3' }],
      points: classes.map((c) => ({ x: c.x, y: c.y, label: c.kind.startsWith('local max') ? 'max' : c.kind.startsWith('local min') ? 'min' : '', cls: 'd-foot' })),
      title: "Graph of f with its critical points, and f'",
    });
    return {
      ok: true,
      final: { texLines: classes.length ? classes.map((c) => `x ${c.approx ? '\\approx' : '='} ${c.approx ? tx(c.x) : c.tex}:\\ \\text{${c.kind}}`) : [], text: `Increasing on ${merge(inc)}; decreasing on ${merge(dec)}.` },
      answers: [
        { label: "f′(x)", valueTex: texOf(polyToNode(dp)) },
        { label: 'Critical numbers', value: classes.length ? classes.map((c) => fmt(c.x)).join(', ') : 'none', approx: classes.some((c) => !isExact(c.x)), primary: true },
        ...classes.filter((c) => c.kind.startsWith('local')).map((c) => ({ label: c.kind.replace(/^./, (s) => s.toUpperCase()), value: `(${fmt(c.x)}, ${fmt(c.y)})`, approx: !(isExact(c.x) && isExact(c.y)), primary: true })),
        { label: 'Increasing on', value: merge(inc) },
        { label: 'Decreasing on', value: merge(dec) },
      ],
      visual: { svg, legend: '<div class="legend"><span><i></i>f(x)</span><span><i class="l3"></i>f′(x)</span></div>', caption: 'Local maxima and minima occur where f′ changes sign (where the dashed curve crosses zero).' },
      tables: [{ caption: "Sign chart of f′(x)", headers: ['Interval', 'Test point', 'Sign of f′', 'f is'], rows }],
      formula: ["f'(c) = 0 \\text{ and } f' \\text{ changes from } + \\text{ to } - \\Rightarrow \\text{local maximum at } c"],
      steps,
      rounding: 'Exact critical numbers are shown where they exist; decimals are rounded to 6 places (4 in the sign chart).',
    };
  },
};
