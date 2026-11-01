/**
 * Area between y = f(x) and y = g(x) on [a, b] (or between their outermost intersection points):
 *   A = ∫ |f(x) − g(x)| dx, split at every crossing inside the interval so no area cancels.
 * Each piece uses the exact antiderivative when available, otherwise adaptive Simpson's rule.
 */
import { fmt, tx, eq, isExact } from '../lib/calc-kit.js';
import { sub, simplify, texOf, toPoly } from '../lib/expr.js';
import { parseFunction, parseNumberExpr, FUNCTION_HINT, compile } from '../lib/calculus-kit.js';
import { findRoots, polyRealRoots } from '../lib/numeric.js';
import { definiteIntegral } from './definite-integral.js';
import { plot } from '../lib/plot.js';

export const calculator = {
  id: 'area-between-curves',
  fields: [
    { name: 'f', label: 'Upper or first curve f(x)', type: 'text', placeholder: 'e.g. x + 2', hint: FUNCTION_HINT },
    { name: 'g', label: 'Second curve g(x)', type: 'text', placeholder: 'e.g. x^2' },
    { name: 'bounds', label: 'Interval', type: 'radio', options: [['given', 'Use limits a and b'], ['meet', 'Between the curves’ intersection points']] },
    { name: 'a', label: 'a', type: 'text', placeholder: 'e.g. -1', row: 'lim', showWhen: { bounds: ['given'] }, rowShowWhen: { bounds: ['given'] } },
    { name: 'b', label: 'b', type: 'text', placeholder: 'e.g. 2', row: 'lim', showWhen: { bounds: ['given'] } },
  ],
  examples: [
    { label: 'y = x + 2 and y = x² (where they meet)', values: { f: 'x + 2', g: 'x^2', bounds: 'meet' } },
    { label: 'sin x and cos x on [0, π]', values: { f: 'sin(x)', g: 'cos(x)', bounds: 'given', a: '0', b: 'pi' } },
    { label: 'x³ and x on [−1, 1]', values: { f: 'x^3', g: 'x', bounds: 'given', a: '-1', b: '1' } },
  ],
  solve(values) {
    const P = parseFunction(values, 'f', 'the first curve'); if (P.error) return P.error;
    const Q = parseFunction(values, 'g', 'the second curve'); if (Q.error) return Q.error;
    const h = simplify(sub(P.node, Q.node));
    const H = compile(h), F = compile(P.node), G = compile(Q.node);
    let a, b, aText, bText;
    const steps = [{ title: 'Write the difference of the curves', tex: `f(x) - g(x) = ${texOf(h)}` }];
    if (values.bounds === 'meet') {
      const poly = toPoly(h);
      let xs = poly && poly.length > 1 ? polyRealRoots(poly) : findRoots(H, -50, 50, { samples: 20000 });
      xs = xs.filter((x) => Math.abs(x) <= 1e6);
      if (xs.length < 2) return { ok: false, errors: [{ field: 'g', message: `The curves ${xs.length ? 'meet only once' : 'do not meet'}${poly ? '' : ' in [−50, 50]'}, so they do not enclose a region. Choose "Use limits a and b" instead.` }] };
      a = xs[0]; b = xs[xs.length - 1];
      aText = String(+a.toPrecision(15)); bText = String(+b.toPrecision(15));
      steps.push({ title: 'Find where the curves meet', text: 'Solve f(x) = g(x), i.e. f(x) − g(x) = 0.', texLines: [`x = ${xs.map((x) => tx(x)).join(',\\ ')}`, `\\text{Outermost points: } a ${eq(a)},\\ b ${eq(b)}`] });
    } else {
      const A = parseNumberExpr(values, 'a', 'the limit a'); if (A.error) return A.error;
      const B = parseNumberExpr(values, 'b', 'the limit b'); if (B.error) return B.error;
      a = A.value; b = B.value; aText = values.a; bText = values.b;
      if (!(b > a)) return { ok: false, errors: [{ field: ['a', 'b'], message: 'The upper limit b must be greater than the lower limit a.' }] };
    }
    // split at crossings inside (a, b)
    const poly = toPoly(h);
    const inner = (poly && poly.length > 1 ? polyRealRoots(poly) : findRoots(H, a, b)).filter((x) => x > a + 1e-9 * Math.max(1, Math.abs(a)) && x < b - 1e-9 * Math.max(1, Math.abs(b)));
    const cuts = [a, ...inner, b];
    if (inner.length) steps.push({ title: 'Split the interval where the curves cross', text: 'Between crossings, one curve stays on top. Integrating each piece separately (with absolute values) stops positive and negative parts from cancelling.', tex: `\\text{Crossings inside the interval: } x ${inner.length === 1 ? eq(inner[0]) : `\\approx ${inner.map((x) => tx(x)).join(',\\ ')}`}` });
    let total = 0, allExact = true;
    const rows = [];
    const pieceLines = [];
    for (let i = 0; i < cuts.length - 1; i++) {
      const lo = cuts[i], hi = cuts[i + 1];
      const loT = i === 0 ? aText : String(+lo.toPrecision(15)), hiT = i === cuts.length - 2 ? bText : String(+hi.toPrecision(15));
      const r = definiteIntegral(h, lo, hi, loT, hiT);
      if (r.error) return { ok: false, errors: [{ field: 'f', message: r.error }] };
      const piece = Math.abs(r.value);
      if (r.method !== 'ftc') allExact = false;
      total += piece;
      const top = F((lo + hi) / 2) >= G((lo + hi) / 2) ? 'f' : 'g';
      rows.push([`[${fmt(lo, 4)}, ${fmt(hi, 4)}]`, top === 'f' ? 'f(x)' : 'g(x)', fmt(r.value), fmt(piece), r.method === 'ftc' ? 'exact (FTC)' : 'Simpson'] );
      pieceLines.push(`\\left|\\int_{${tx(lo, 4)}}^{${tx(hi, 4)}} (f - g)\\,dx\\right| ${eq(piece)}`);
    }
    steps.push({ title: 'Integrate |f − g| on each piece', texLines: pieceLines });
    steps.push({ title: 'Add the pieces', tex: `A ${eq(total)}` });
    const span = b - a, pad = span * 0.2;
    const svg = plot({
      x: [a - pad, b + pad], curves: [{ f: F, cls: 'd-line' }, { f: G, cls: 'd-line2' }],
      shade: [{ f: F, g: G, a, b, cls: 'd-shade2' }],
      points: inner.map((x) => ({ x, y: F(x), cls: 'd-foot' })),
      title: 'The two curves with the region between them shaded',
    });
    return {
      ok: true,
      final: { tex: `A = \\int_{${tx(a, 4)}}^{${tx(b, 4)}} \\left|f(x) - g(x)\\right|\\,dx ${eq(total)}` },
      answers: [{ label: 'Area', value: fmt(total), approx: !allExact || !isExact(total), primary: true }, { label: 'Interval', value: `[${fmt(a)}, ${fmt(b)}]` }, { label: 'Pieces', value: String(cuts.length - 1) }],
      visual: { svg, legend: '<div class="legend"><span><i></i>f(x)</span><span><i class="l2"></i>g(x)</span></div>', caption: 'The shaded region is the area being calculated.' },
      tables: [{ caption: 'Pieces of the region', headers: ['Interval', 'Upper curve', '∫(f − g) dx', 'Area', 'Method'], rows }],
      formula: ['A = \\int_a^b \\left|f(x) - g(x)\\right|\\,dx'],
      steps,
      rounding: 'Areas are rounded to 6 decimal places; pieces are exact (FTC) where an antiderivative is available.',
    };
  },
};
