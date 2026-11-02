/**
 * Inverse Laplace transform of a proper rational function F(s) = P(s)/Q(s) by partial fractions
 * and the transform table:
 *   A/(s − r)^k                         →  A t^{k−1} e^{rt} / (k − 1)!
 *   (Bs + C)/((s + α)² + ω²)            →  e^{−αt}(B cos ωt + ((C − Bα)/ω) sin ωt)
 *   (Bs + C)/((s + α)² − β²)            →  e^{−αt}(B cosh βt + ((C − Bα)/β) sinh βt)
 * Supported denominators: linear factors with rational roots and at most one quadratic factor.
 */
import { answer, sqrtFrac, tx } from '../lib/calc-kit.js';
import { simplifySqrt } from '../lib/exact.js';
import { parsePolyField, partialFractions, termTex, sumTex, polyTex, degree, evalNum, isZeroPoly } from '../lib/poly-kit.js';
import { factorial } from '../lib/bigint.js';
import { Frac } from '../lib/fraction.js';
import { plot } from '../lib/plot.js';

const expTex = (r) => (r.isZero() ? '' : `e^{${r.isOne() ? '' : r.eq(-1) ? '-' : r.toTex()}t}`);
const coefT = (c, rest) => (c.isOne() ? rest || '1' : c.eq(-1) ? `-${rest || '1'}` : `${c.toTex()}${rest ? `\\,${rest}` : ''}`);

export const calculator = {
  id: 'inverse-laplace-transform',
  fields: [
    { name: 'num', label: 'Numerator P(s)', type: 'text', placeholder: 'e.g. 3s + 7', hint: 'Polynomials in s. The numerator must have a lower degree than the denominator.' },
    { name: 'den', label: 'Denominator Q(s)', type: 'text', placeholder: 'e.g. s^2 + 4s + 3', hint: 'May be entered factored, e.g. (s + 1)(s^2 + 4). Degree up to 6.' },
  ],
  examples: [
    { label: '(3s + 7)/(s² + 4s + 3)', values: { num: '3s + 7', den: 's^2 + 4s + 3' } },
    { label: '1/(s + 2)³ (repeated pole)', values: { num: '1', den: '(s + 2)^3' } },
    { label: '(s + 3)/(s² + 2s + 5) (damped oscillation)', values: { num: 's + 3', den: 's^2 + 2s + 5' } },
    { label: '5/(s(s² + 4))', values: { num: '5', den: 's(s^2 + 4)' } },
    { label: 'Not supported: improper fraction', values: { num: 's^3', den: 's^2 + 1' }, expectError: true },
  ],
  solve(values) {
    const A = parsePolyField(values, 'num', 'the numerator', { v: 's', maxDeg: 6 }); if (A.error) return A.error;
    const B = parsePolyField(values, 'den', 'the denominator', { v: 's', maxDeg: 6 }); if (B.error) return B.error;
    const N = A.p, D = B.p;
    if (degree(D) < 1) return { ok: false, errors: [{ field: 'den', message: 'The denominator must contain s.' }] };
    if (degree(N) >= degree(D)) return { ok: false, errors: [{ field: 'num', message: 'F(s) must be a proper fraction (numerator degree lower than the denominator). Otherwise f(t) contains impulse (delta) functions, which are not supported.' }] };
    const pf = partialFractions(N, D);
    if (!pf.ok) return { ok: false, errors: [{ field: 'den', message: pf.reason }] };
    const pieces = [], fns = [];
    const steps = [
      { title: 'F(s)', tex: `F(s) = \\frac{${polyTex(N, 's')}}{${polyTex(D, 's')}}` },
      { title: 'Partial fractions', tex: `F(s) = ${sumTex(pf.terms.map((t) => termTex(t, 's')))}` },
    ];
    for (const t of pf.terms) {
      if (t.kind === 'lin') {
        if (t.A.isZero()) continue;
        const kf = new Frac(factorial(t.k - 1));
        const c = t.A.div(kf);
        const tp = t.k === 1 ? '' : t.k === 2 ? 't' : `t^{${t.k - 1}}`;
        const body = [tp, expTex(t.r)].filter(Boolean).join('');
        const tex = coefT(c, body);
        pieces.push(tex);
        steps.push({ title: `Invert ${t.k === 1 ? 'A/(s − r)' : `A/(s − r)^${t.k}`}`, tex: `\\mathcal{L}^{-1}\\left\\{${termTex(t, 's')}\\right\\} = ${tex}` });
        const An = t.A.toNumber(), rn = t.r.toNumber(), kk = t.k, fk = Number(factorial(kk - 1));
        fns.push((x) => (An / fk) * x ** (kk - 1) * Math.exp(rn * x));
      } else {
        const [q0, q1] = t.Q; // s² + q1 s + q0
        const alpha = q1.div(2), w2 = q0.sub(alpha.pow(2));
        const Bc = t.B, Cc = t.C.sub(t.B.mul(alpha));
        const osc = w2.sign() > 0;
        const w = sqrtFrac(w2.abs(), simplifySqrt);
        const ex = expTex(alpha.neg());
        const cosName = osc ? '\\cos' : '\\cosh', sinName = osc ? '\\sin' : '\\sinh';
        const arg = `${w.tex === '1' ? '' : w.tex}t`;
        // coefficient of sin: Cc / w (exact when w is rational)
        let sinT;
        if (w.exact) { const wf = Frac.of(Number(w.value.toFixed(12))); sinT = Cc.div(wf).toTex(); }
        else sinT = Cc.isZero() ? '0' : `\\frac{${Cc.toTex()}}{${w.tex}}`;
        const partsT = [];
        if (!Bc.isZero()) partsT.push(`${Bc.isOne() ? '' : Bc.eq(-1) ? '-' : Bc.toTex()}${cosName}(${arg})`);
        if (!Cc.isZero()) partsT.push(`${sinT === '1' ? '' : sinT === '-1' ? '-' : sinT}${sinName}(${arg})`);
        const inner = partsT.join(' + ').replace(/\+ -/g, '- ') || '0';
        const tex = ex ? `${ex}\\left(${inner}\\right)` : inner;
        pieces.push(tex);
        steps.push({ title: 'Complete the square in the quadratic factor', tex: `${polyTex(t.Q, 's')} = \\left(s ${alpha.sign() < 0 ? '-' : '+'} ${alpha.abs().toTex()}\\right)^2 ${osc ? '+' : '-'} ${w2.abs().toTex()}`.replace('\\left(s + 0\\right)^2', 's^2') });
        steps.push({ title: `Write the numerator in terms of (s + α) and use the ${osc ? 'cos/sin' : 'cosh/sinh'} pair`, tex: `\\mathcal{L}^{-1}\\left\\{${termTex(t, 's')}\\right\\} = ${tex}` });
        const al = alpha.toNumber(), Bn = Bc.toNumber(), Cn = Cc.toNumber(), wn = w.value;
        fns.push((x) => Math.exp(-al * x) * (osc ? Bn * Math.cos(wn * x) + (Cn / wn) * Math.sin(wn * x) : Bn * Math.cosh(wn * x) + (Cn / wn) * Math.sinh(wn * x)));
      }
    }
    const ft = sumTex(pieces);
    steps.push({ title: 'Add the pieces', tex: `f(t) = ${ft}` });
    const f = (x) => fns.reduce((s, g) => s + g(x), 0);
    // check numerically: F(s) ≈ ∫ e^{-st} f(t) dt at one s on the right of every pole
    const poles = pf.terms.map((t) => (t.kind === 'lin' ? t.r.toNumber() : -t.Q[1].toNumber() / 2 + Math.sqrt(Math.max(0, -(t.Q[0].toNumber() - (t.Q[1].toNumber() / 2) ** 2)))));
    const s0 = Math.max(0, ...poles) + 2;
    let integral = 0; const hstep = 0.002, T = 40 / s0;
    for (let x = 0; x < T; x += hstep) integral += (Math.exp(-s0 * x) * f(x) + Math.exp(-s0 * (x + hstep)) * f(x + hstep)) * hstep / 2;
    const Fs0 = evalNum(N, s0) / evalNum(D, s0);
    steps.push({ title: 'Check numerically', text: `At s = ${s0.toFixed(2)}: F(s) = ${Fs0.toFixed(6)} and ∫₀^∞ e^(−st) f(t) dt ≈ ${integral.toFixed(6)}.` });
    return {
      ok: true,
      final: { tex: `f(t) = ${ft}` },
      answers: [{ label: 'f(t)', valueTex: ft, primary: true, copy: '' }, answer('f(0)', f(0))],
      visual: { svg: plot({ x: [0, 8], width: 380, height: 240, title: 'f(t) for t ≥ 0', curves: [{ f: (x) => (x >= 0 ? f(x) : NaN), samples: 600 }], xLabel: 't' }), caption: 'Poles of F(s) with negative real part give decaying terms; complex poles give oscillation.' },
      formula: ['\\mathcal{L}^{-1}\\left\\{\\frac{1}{(s - r)^k}\\right\\} = \\frac{t^{k-1}e^{rt}}{(k-1)!} \\qquad \\mathcal{L}^{-1}\\left\\{\\frac{s + \\alpha}{(s + \\alpha)^2 + \\omega^2}\\right\\} = e^{-\\alpha t}\\cos\\omega t'],
      steps,
      notes: [{ kind: 'info', text: `Supported: proper rational functions whose denominator has rational roots plus at most one quadratic factor. ${isZeroPoly(pf.poly) ? '' : ''}f(t) is defined for t ≥ 0.`.trim() }],
    };
  },
};
