/**
 * Limits of f(x) as x → a (one- or two-sided) or x → ±∞.
 *   1. Direct substitution when f is defined and continuous at a (exact for polynomials/rationals).
 *   2. For a ratio of polynomials giving 0/0, the common factor is cancelled exactly.
 *   3. Otherwise a numerical estimate from a table of values approaching a, clearly labelled.
 */
import { tx, fmt } from '../lib/calc-kit.js';
import { parseFunction, FUNCTION_HINT, compile } from '../lib/calculus-kit.js';
import { texOf, toPoly } from '../lib/expr.js';
import { parseValue } from '../lib/trig.js';
import { oneSided, atInfinity, twoSided, guessTex } from '../lib/limits.js';
import { polyGcd, polyDivide, polyTex, degree, lead, polyEvalFrac } from '../lib/poly-kit.js';
import { parseFrac } from '../lib/fraction.js';
import { plot } from '../lib/plot.js';

/** Split a product into numerator and denominator polynomials, or null. */
function ratio(node) {
  const factors = node.t === 'mul' ? node.a : [node];
  const num = [], den = [];
  for (const f of factors) {
    if (f.t === 'pow' && f.e.t === 'num' && f.e.v.sign() < 0 && f.e.v.isInt()) den.push({ t: 'pow', b: f.b, e: { t: 'num', v: f.e.v.neg() } });
    else num.push(f);
  }
  const P = toPoly(num.length ? { t: 'mul', a: num } : { t: 'num', v: parseFrac('1') });
  const Q = den.length ? toPoly({ t: 'mul', a: den }) : null;
  return P && Q ? { P, Q } : null;
}

const LIMITS = [
  ['sin(x)/x', 0, 'sin x / x as x → 0'],
  ['(x^2 - 4)/(x - 2)', 2, '(x² − 4)/(x − 2) as x → 2'],
  ['(1 - cos(x))/x^2', 0, '(1 − cos x)/x² as x → 0'],
  ['abs(x)/x', 0, '|x|/x as x → 0 (no limit)'],
  ['1/x^2', 0, '1/x² as x → 0 (infinite)'],
];

export const calculator = {
  id: 'limit-explorer',
  explore: {
    title: 'Close in on a limit',
    intro: 'Shrink h. The two points move towards x = a from each side; if their heights settle on the same number, that number is the limit — even if f(a) itself is undefined.',
    controls: [
      { name: 'i', label: 'Function', type: 'select', options: LIMITS.map((l, i) => [String(i), l[2]]), value: '0' },
      { name: 'h', label: 'Distance h from a', min: 0.01, max: 2, step: 0.01, value: 1 },
    ],
    presets: [{ label: 'h = 1', values: { h: 1 } }, { label: 'h = 0.1', values: { h: 0.1 } }, { label: 'h = 0.01', values: { h: 0.01 } }],
    render({ i, h }) {
      const [src, a] = LIMITS[Number(i)];
      const P = parseFunction({ f: src }, 'f');
      const f = compile(P.node);
      const yl = f(a - h), yr = f(a + h);
      const ylo = Math.max(-6, Math.min(-1, ...[yl, yr].filter(Number.isFinite)) - 1), yhi = Math.min(8, Math.max(2, ...[yl, yr].filter(Number.isFinite)) + 1);
      return {
        svg: plot({ x: [a - 3, a + 3], y: [ylo, yhi], width: 400, height: 280, title: 'Approaching x = a from both sides', curves: [{ f, samples: 900 }], vlines: [{ x: a, cls: 'd-line3', label: `x = ${a}` }], points: [{ x: a - h, y: yl, label: 'left', cls: 'd-point2' }, { x: a + h, y: yr, label: 'right', cls: 'd-point3' }] }),
        readouts: [
          { label: 'From the left', tex: `f(${tx(a - h, 3)}) ${Number.isFinite(yl) ? `\\approx ${tx(yl, 5)}` : '\\text{ is not defined}'}` },
          { label: 'From the right', tex: `f(${tx(a + h, 3)}) ${Number.isFinite(yr) ? `\\approx ${tx(yr, 5)}` : '\\text{ is not defined}'}` },
          { label: 'Gap between them', text: Number.isFinite(yl) && Number.isFinite(yr) ? fmt(Math.abs(yr - yl), 5) : '—' },
        ],
      };
    },
  },
  fields: [
    { name: 'f', label: 'Function f(x)', type: 'text', placeholder: 'e.g. (x^2 - 9)/(x - 3)', hint: FUNCTION_HINT },
    { name: 'a', label: 'x approaches', type: 'text', placeholder: 'e.g. 3, pi/2, inf or -inf', hint: 'A number, an expression such as pi/2, or inf / -inf for limits at infinity.' },
    { name: 'side', label: 'Direction', type: 'radio', options: [['both', 'Both sides'], ['left', 'From the left (x → a⁻)'], ['right', 'From the right (x → a⁺)']] },
  ],
  examples: [
    { label: '(x² − 9)/(x − 3) as x → 3', values: { f: '(x^2 - 9)/(x - 3)', a: '3', side: 'both' } },
    { label: 'sin x / x as x → 0', values: { f: 'sin(x)/x', a: '0', side: 'both' } },
    { label: '(3x² + 1)/(2x² − x) as x → ∞', values: { f: '(3x^2 + 1)/(2x^2 - x)', a: 'inf', side: 'both' } },
    { label: '1/x as x → 0 (one-sided)', values: { f: '1/x', a: '0', side: 'right' } },
    { label: '|x|/x as x → 0 (no limit)', values: { f: 'abs(x)/x', a: '0', side: 'both' } },
    { label: 'Invalid: missing point', values: { f: 'x^2', a: '', side: 'both' }, expectError: true },
  ],
  solve(values) {
    const P = parseFunction(values, 'f', 'the function f(x)');
    if (P.error) return P.error;
    const f = compile(P.node);
    const side = ['left', 'right'].includes(values.side) ? values.side : 'both';
    const raw = String(values.a ?? '').trim().toLowerCase().replace(/∞/g, 'inf').replace(/infinity/g, 'inf').replace(/\s+/g, '');
    if (!raw) return { ok: false, errors: [{ field: 'a', message: 'Enter the value that x approaches, for example 2 or inf.' }] };
    const fTex = texOf(P.node);
    const steps = [];
    const ratioPQ = ratio(P.node);
    if (raw === 'inf' || raw === '+inf' || raw === '-inf') {
      const s = raw === '-inf' ? -1 : 1;
      const arrow = s > 0 ? '\\infty' : '-\\infty';
      steps.push({ title: 'The limit', tex: `\\lim_{x \\to ${arrow}} ${fTex}` });
      let exactTex = null;
      if (ratioPQ) {
        const dp = degree(ratioPQ.P), dq = degree(ratioPQ.Q);
        steps.push({ title: 'Compare the degrees of the numerator and denominator', tex: `\\deg P = ${dp},\\quad \\deg Q = ${dq}` });
        if (dp < dq) { exactTex = '0'; steps.push({ title: 'Denominator wins', text: 'The denominator grows faster, so the fraction tends to 0.' }); }
        else if (dp === dq) { const L = lead(ratioPQ.P).div(lead(ratioPQ.Q)); exactTex = L.toTex(); steps.push({ title: 'Equal degrees: ratio of leading coefficients', tex: `\\frac{${lead(ratioPQ.P).toTex()}}{${lead(ratioPQ.Q).toTex()}} = ${L.toTex()}` }); }
        else steps.push({ title: 'Numerator wins', text: 'The numerator grows faster, so the fraction grows without bound.' });
      }
      const r = atInfinity(f, s);
      return finish(r, arrow, exactTex, r.rows, 'x → ' + (s > 0 ? '∞' : '−∞'));
    }
    const pv = parseValue(values.a, 'the point');
    if (pv.error) return { ok: false, errors: [{ field: 'a', message: pv.error }] };
    const a = pv.value;
    if (Math.abs(a) > 1e6) return { ok: false, errors: [{ field: 'a', message: 'Please choose a point between −1,000,000 and 1,000,000.' }] };
    const aTex = tx(a, 6);
    const sup = side === 'left' ? '^-' : side === 'right' ? '^+' : '';
    steps.push({ title: 'The limit', tex: `\\lim_{x \\to ${aTex}${sup}} ${fTex}` });
    let fa; try { fa = f(a); } catch { fa = NaN; }
    const L = side === 'right' ? null : oneSided(f, a, -1), R = side === 'left' ? null : oneSided(f, a, 1);
    const res = side === 'both' ? twoSided(L, R) : side === 'left' ? L : R;
    let exactTex = null;
    const aF = parseFrac(values.a);
    if (Number.isFinite(fa) && res.kind === 'finite' && Math.abs(fa - res.L) < 1e-6 * (1 + Math.abs(fa))) {
      steps.push({ title: 'Try direct substitution', tex: `f(${aTex}) = ${tx(fa, 8)}`, text: 'f is defined at this point and the nearby values agree with it, so the limit is f(a).' });
      if (ratioPQ && aF) exactTex = polyEvalFrac(ratioPQ.P, aF).div(polyEvalFrac(ratioPQ.Q, aF)).toTex();
      else if (!ratioPQ && aF && toPoly(P.node)) exactTex = polyEvalFrac(toPoly(P.node), aF).toTex();
    } else if (ratioPQ && aF && polyEvalFrac(ratioPQ.Q, aF).isZero()) {
      const pa = polyEvalFrac(ratioPQ.P, aF);
      if (pa.isZero()) {
        steps.push({ title: 'Direct substitution gives 0/0 (indeterminate)', tex: `\\frac{${polyEvalFrac(ratioPQ.P, aF).toTex()}}{0}` });
        const G = polyGcd(ratioPQ.P, ratioPQ.Q);
        const Pn = polyDivide(ratioPQ.P, G).q, Qn = polyDivide(ratioPQ.Q, G).q;
        steps.push({ title: 'Factor and cancel the common factor', tex: `\\frac{${polyTex(ratioPQ.P)}}{${polyTex(ratioPQ.Q)}} = \\frac{${polyTex(Pn)}}{${polyTex(Qn)}}\\quad (x \\ne ${aTex})` });
        const qa = polyEvalFrac(Qn, aF);
        if (!qa.isZero()) { exactTex = polyEvalFrac(Pn, aF).div(qa).toTex(); steps.push({ title: 'Substitute into the simplified fraction', tex: `\\frac{${polyEvalFrac(Pn, aF).toTex()}}{${qa.toTex()}} = ${exactTex}` }); }
      } else steps.push({ title: 'Direct substitution gives a non-zero number over 0', tex: `\\frac{${pa.toTex()}}{0}`, text: 'So the function grows without bound near this point: look at the sign from each side.' });
    } else {
      steps.push({ title: 'Direct substitution does not settle it', text: Number.isFinite(fa) ? 'f(a) exists, but nearby values must be checked too.' : `f(${fmt(a)}) is not defined, so look at values of x closer and closer to a.` });
    }
    const rows = [...(L ? L.rows.map((r) => ({ ...r, side: 'left' })) : []), ...(R ? R.rows.map((r) => ({ ...r, side: 'right' })) : [])];
    return finish(res, `${aTex}${sup}`, exactTex, rows, `x → ${fmt(a)}${side === 'left' ? '⁻' : side === 'right' ? '⁺' : ''}`, { L, R, a });

    function finish(r, arrowTex, exTex, rws, label, extra = {}) {
      const lim = `\\lim_{x \\to ${arrowTex}} ${fTex}`;
      let final, value, msg;
      if (r.kind === 'finite') {
        const g = r.guess;
        final = exTex ? `${lim} = ${exTex}` : g && guessTex(g) !== tx(r.L, 6) ? `${lim} \\approx ${tx(r.L, 6)}\\ \\left(\\text{appears to be } ${guessTex(g)}\\right)` : `${lim} \\approx ${tx(r.L, 6)}`;
        value = exTex ? exTex.replace(/\\frac\{(\d+)\}\{(\d+)\}/, '$1/$2') : fmt(r.L, 6);
        msg = exTex ? 'Found exactly (substitution or cancellation).' : 'Numerical estimate from the table: the values agree to at least 4 significant digits. It is not a proof.';
      } else if (r.kind === 'inf') { final = `${lim} = ${r.sign > 0 ? '' : '-'}\\infty`; value = r.sign > 0 ? '+∞ (grows without bound)' : '−∞'; msg = 'The values grow without bound, so the limit does not exist as a number; we write ∞ to describe how.'; }
      else if (r.kind === 'jump') { final = `${lim}\\ \\text{does not exist}`; value = 'does not exist'; msg = `The one-sided limits differ (left ≈ ${fmt(extra.L.L, 5)}, right ≈ ${fmt(extra.R.L, 5)}), so the two-sided limit does not exist.`; }
      else if (r.kind === 'inf-split') { final = `${lim}\\ \\text{does not exist}`; value = 'does not exist'; msg = 'The function heads to infinity from at least one side, with different behaviour on the two sides.'; }
      else { final = `${lim}\\ \\text{does not exist (no single value)}`; value = 'does not exist'; msg = 'The values do not settle on one number (for example they oscillate), or the function is not defined near this point.'; }
      steps.push({ title: 'Conclusion', tex: final });
      const pts = rws.filter((q) => Number.isFinite(q.y));
      const cx = extra.a ?? 0;
      const yv = pts.map((q) => q.y).filter((y) => Math.abs(y) < 1e6);
      const yr = yv.length ? [Math.min(...yv), Math.max(...yv)] : [-1, 1];
      const pad = Math.max(1, (yr[1] - yr[0]) * 0.6);
      const svg = extra.a !== undefined
        ? plot({ x: [cx - 2, cx + 2], y: [yr[0] - pad, yr[1] + pad], width: 380, height: 260, title: 'Graph near the point', curves: [{ f, samples: 1200 }], vlines: [{ x: cx, cls: 'd-line3' }], points: r.kind === 'finite' ? [{ x: cx, y: r.L, label: 'limit', cls: 'd-point3' }] : [] })
        : plot({ x: arrowTex.startsWith('-') ? [-60, 0] : [0, 60], width: 380, height: 260, title: 'Graph for large |x|', curves: [{ f, samples: 1200 }], hlines: r.kind === 'finite' ? [{ y: r.L, cls: 'd-line3', label: 'limit' }] : [] });
      return {
        ok: true,
        final: { tex: final },
        answers: [{ label: `Limit as ${label}`, value, primary: true, copy: `Limit: ${value}` }, ...(extra.L && extra.R && extra.L.kind === 'finite' && extra.R.kind === 'finite' ? [{ label: 'Left / right limits', value: `${fmt(extra.L.L, 5)} / ${fmt(extra.R.L, 5)}`, copy: '' }] : [])],
        visual: { svg, caption: 'What matters is where the curve heads as x gets close, not the value exactly at the point.' },
        formula: ['\\lim_{x \\to a} f(x) = L \\iff \\lim_{x \\to a^-} f(x) = \\lim_{x \\to a^+} f(x) = L'],
        steps,
        tables: [{ caption: 'Values approaching the point', headers: ['x', 'f(x)'], rows: rws.map((q) => [fmt(q.x, 8), Number.isFinite(q.y) ? fmt(q.y, 8) : 'not defined']) }],
        notes: [{ kind: r.kind === 'finite' && !exTex ? 'warn' : 'info', text: msg }],
      };
    }
  },
};
