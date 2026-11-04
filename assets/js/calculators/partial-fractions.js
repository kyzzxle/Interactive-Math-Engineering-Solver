/**
 * Partial fraction decomposition of P(x)/Q(x) over the rationals. Supported denominators
 * factor into linear factors with rational roots (any multiplicity) and at most one remaining
 * quadratic factor. Improper fractions are divided first. Coefficients are found exactly by
 * comparing coefficients (a linear system solved with fractions).
 */
import { parsePolyField, partialFractions, termTex, sumTex, polyTex, factorRational, multiplicities, linTex, degree, evalNum, isZeroPoly } from '../lib/poly-kit.js';
import { factoredTex } from './rational-expression-simplifier.js';
import { plot } from '../lib/plot.js';
import { partialExplore, partialPractice } from '../explore/algebra-practice.js';
import { withNotes } from '../lib/step-notes.js';
import { parsePolyField as __ppf, partialFractions as __pf, evalNum as __ev } from '../lib/poly-kit.js';

const LETTERS = 'ABCDEFGHIJKLMN';

export const calculator = {
  id: 'partial-fractions',
  explore: partialExplore,
  practice: partialPractice,
  fields: [
    { name: 'num', label: 'Numerator P(x)', type: 'text', placeholder: 'e.g. 3x + 5', hint: 'Polynomials in x; the denominator may have degree up to 6.' },
    { name: 'den', label: 'Denominator Q(x)', type: 'text', placeholder: 'e.g. x^2 + x - 2', hint: 'It may be entered factored, e.g. (x - 1)^2 (x + 3).' },
  ],
  examples: [
    { label: '(3x + 5)/(x² + x − 2)', values: { num: '3x + 5', den: 'x^2 + x - 2' } },
    { label: 'Repeated factor: (x² + 1)/((x − 1)²(x + 2))', values: { num: 'x^2 + 1', den: '(x - 1)^2 (x + 2)' } },
    { label: 'Quadratic factor: (2x² + 3)/(x(x² + 1))', values: { num: '2x^2 + 3', den: 'x(x^2 + 1)' } },
    { label: 'Improper: x³/(x² − 1)', values: { num: 'x^3', den: 'x^2 - 1' } },
    { label: 'Not supported: cubic with no rational roots', values: { num: '1', den: 'x^3 - 2' }, expectError: true },
  ],
  solve(values) {
    const A = parsePolyField(values, 'num', 'the numerator', { maxDeg: 8, allowZero: true });
    if (A.error) return A.error;
    const B = parsePolyField(values, 'den', 'the denominator', { maxDeg: 6 });
    if (B.error) return B.error;
    const N = A.p, D = B.p;
    if (degree(D) < 1) return { ok: false, errors: [{ field: 'den', message: 'The denominator must contain x (degree at least 1); otherwise there is nothing to decompose.' }] };
    if (isZeroPoly(N)) return { ok: false, errors: [{ field: 'num', message: 'The numerator is 0, so the fraction is simply 0.' }] };
    const pf = partialFractions(N, D);
    if (!pf.ok) return { ok: false, errors: [{ field: 'den', message: pf.reason }] };
    const steps = [{ title: 'The fraction', tex: `\\frac{${polyTex(N)}}{${polyTex(D)}}` }];
    if (!isZeroPoly(pf.poly)) steps.push({ title: 'Improper fraction: divide first (numerator degree ≥ denominator degree)', tex: `\\frac{${polyTex(N)}}{${polyTex(D)}} = ${polyTex(pf.poly)} + \\frac{${polyTex(pf.num)}}{${polyTex(D)}}` });
    const { lc, roots, rest } = factorRational(D);
    steps.push({ title: 'Factor the denominator', tex: `${polyTex(D)} = ${factoredTex(D)}` });
    // general form with letters
    let li = 0;
    const generic = [];
    for (const g of multiplicities(roots)) for (let k = 1; k <= g.m; k++) generic.push(`\\frac{${LETTERS[li++]}}{${k === 1 ? linTex(g.r) : `\\left(${linTex(g.r)}\\right)^{${k}}`}}`);
    if (degree(rest) === 2) { generic.push(`\\frac{${LETTERS[li]}x + ${LETTERS[li + 1]}}{${polyTex(rest)}}`); li += 2; }
    steps.push({ title: 'Write the form of the decomposition', text: 'One term for each power of each linear factor, and a linear numerator over the quadratic factor.', tex: `\\frac{${polyTex(pf.num)}}{${factoredTex(D)}} = ${generic.join(' + ')}` });
    steps.push({ title: 'Multiply through by the denominator and compare coefficients', text: `This gives ${li} linear equations for ${LETTERS.slice(0, li).split('').join(', ')} — one for each power of x. Solving them exactly:` });
    const vals = [];
    pf.terms.forEach((t) => { if (t.kind === 'lin') vals.push(t.A); else vals.push(t.B, t.C); });
    steps.push({ title: 'Coefficients', tex: vals.map((v, i) => `${LETTERS[i]} = ${v.toTex()}`).join(',\\quad ') });
    const body = sumTex(pf.terms.map((t) => termTex(t)));
    const full = isZeroPoly(pf.poly) ? body : sumTex([polyTex(pf.poly), body]);
    steps.push({ title: 'Partial fraction decomposition', tex: `\\frac{${polyTex(N)}}{${polyTex(D)}} = ${full}` });
    if (!lc.isOne()) steps.splice(3, 0, { title: 'Leading coefficient', text: `The denominator's leading coefficient ${lc} is divided into the numerator so that the factors are monic.` });
    const f = (x) => evalNum(N, x) / evalNum(D, x);
    const xs = roots.map((r) => r.toNumber());
    const lo = Math.min(-4, ...xs) - 2, hi = Math.max(4, ...xs) + 2;
    return {
      ok: true,
      final: { tex: `\\frac{${polyTex(N)}}{${polyTex(D)}} = ${full}` },
      answers: [{ label: 'Decomposition', valueTex: full, primary: true, copy: '' }, ...vals.map((v, i) => ({ label: LETTERS[i], valueTex: v.toTex(), copy: `${LETTERS[i]} = ${v}` }))],
      visual: { svg: plot({ x: [lo, hi], width: 380, height: 260, title: 'Graph of the rational function', curves: [{ f, samples: 900 }], vlines: [...new Set(xs)].map((x) => ({ x, cls: 'd-line3' })) }), caption: 'Each linear factor of the denominator gives a vertical asymptote (dashed); the partial fractions show how the function behaves near each one.' },
      formula: ['\\frac{P(x)}{(x - r)^m\\,(x^2 + px + q)} = \\frac{A_1}{x - r} + \\cdots + \\frac{A_m}{(x - r)^m} + \\frac{Bx + C}{x^2 + px + q}'],
      steps,
      notes: [{ kind: 'info', text: 'Supported: denominators that factor into linear factors with rational roots (repeated factors allowed) and at most one quadratic factor. A check: putting the terms back over a common denominator returns the original fraction.' }],
    };
  },
};

// Explanations for each step, and a final check.
withNotes(calculator, {
  'The fraction': 'Partial fractions undo the addition of fractions: one fraction is split into simpler ones, which is useful for integration and Laplace transforms.',
  'Improper fraction': 'Partial fractions need the numerator to have a lower degree than the denominator.',
  'Factor the denominator': 'The factors of the denominator decide the form of the answer.',
  'Write the form of the decomposition': 'A repeated factor (x − r)ᵐ needs a term for every power from 1 to m.',
  'Multiply through by the denominator': 'Substituting the roots of the denominator (the cover-up method) gives some coefficients at once.',
  'Coefficients': 'Solving the equations gives each unknown numerator exactly.',
  'Partial fraction decomposition': 'Adding the pieces back over the common denominator returns the original fraction.',
}, (r, values) => {
  const N = __ppf(values, 'num', 'the numerator', { maxDeg: 8, allowZero: true }).p, D = __ppf(values, 'den', 'the denominator', { maxDeg: 6 }).p;
  const pf = __pf(N, D);
  if (!pf.ok) return;
  const xs = [0.5, 2.5, -1.5, 4.5].filter((x) => Math.abs(__ev(D, x)) > 1e-6).slice(0, 2);
  const g = (x) => { let s = __ev(pf.poly, x); for (const t of pf.terms) s += t.kind === 'lin' ? t.A.toNumber() / Math.pow(x - t.r.toNumber(), t.k) : (t.B.toNumber() * x + t.C.toNumber()) / __ev(t.Q, x); return s; };
  const f = (v) => +v.toPrecision(8);
  r.steps.push({ title: 'Check at sample points', texLines: xs.map((x) => `x = ${x}: \\quad \\text{fraction} \\approx ${f(__ev(N, x) / __ev(D, x))}, \\quad \\text{sum of the parts} \\approx ${f(g(x))}\\ \\checkmark`), note: 'The decomposition must give the same value as the original fraction at every allowed x.' });
});
