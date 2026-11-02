/**
 * Simplify P(x)/Q(x) for polynomials with rational coefficients (degree ≤ 6) by cancelling
 * their greatest common divisor (Euclid's algorithm, exact). Reports the excluded values
 * (zeros of the original denominator), holes (cancelled zeros) and vertical asymptotes.
 */
import { answer, fmt } from '../lib/calc-kit.js';
import { parsePolyField, polyDivide, polyGcd, polyTex, polyText, degree, factorRational, multiplicities, linTex, evalNum, isZeroPoly, lead, scalePoly } from '../lib/poly-kit.js';
import { polyRealRoots } from '../lib/numeric.js';
import { plot } from '../lib/plot.js';
import { Frac } from '../lib/fraction.js';

/** TeX of p in factored form over the rationals: c(x − r)²(x² + 1)… */
export function factoredTex(p) {
  if (degree(p) < 1) return polyTex(p);
  const { lc, roots, rest } = factorRational(p);
  const parts = multiplicities(roots).map(({ r, m }) => `\\left(${linTex(r)}\\right)${m > 1 ? `^{${m}}` : ''}`);
  if (degree(rest) >= 1) parts.push(`\\left(${polyTex(rest)}\\right)`);
  const c = lc.isOne() ? '' : lc.eq(-1) ? '-' : lc.toTex();
  return `${c}${parts.join('')}` || polyTex(p);
}
const realZeros = (p) => {
  if (degree(p) < 1) return [];
  const { roots, rest } = factorRational(p);
  const exact = multiplicities(roots).map((g) => ({ x: g.r.toNumber(), tex: g.r.toTex(), exact: true }));
  const other = degree(rest) >= 1 ? polyRealRoots(rest).map((x) => ({ x, tex: `\\approx ${fmt(x, 6)}`, exact: false })) : [];
  return [...exact, ...other].sort((a, b) => a.x - b.x);
};

export const calculator = {
  id: 'rational-expression-simplifier',
  fields: [
    { name: 'num', label: 'Numerator P(x)', type: 'text', placeholder: 'e.g. x^2 - 9', hint: 'A polynomial in x, degree up to 6. Coefficients may be fractions.' },
    { name: 'den', label: 'Denominator Q(x)', type: 'text', placeholder: 'e.g. x^2 + x - 6' },
  ],
  examples: [
    { label: '(x² − 9)/(x² + x − 6)', values: { num: 'x^2 - 9', den: 'x^2 + x - 6' } },
    { label: '(x³ − 1)/(x² − 1)', values: { num: 'x^3 - 1', den: 'x^2 - 1' } },
    { label: '(2x² + 4x)/(6x)', values: { num: '2x^2 + 4x', den: '6x' } },
    { label: 'Already simplest: (x + 1)/(x² + 1)', values: { num: 'x + 1', den: 'x^2 + 1' } },
    { label: 'Invalid: denominator 0', values: { num: 'x + 1', den: '0' }, expectError: true },
  ],
  solve(values) {
    const P = parsePolyField(values, 'num', 'the numerator', { allowZero: true });
    if (P.error) return P.error;
    const Q = parsePolyField(values, 'den', 'the denominator');
    if (Q.error) return Q.error;
    const N = P.p, D = Q.p;
    const steps = [{ title: 'The expression', tex: `\\frac{${polyTex(N)}}{${polyTex(D)}}` }];
    const excluded = realZeros(D);
    if (isZeroPoly(N)) {
      return result([new Frac(0n)], [new Frac(1n)], [], 'The numerator is 0, so the expression equals 0 wherever it is defined.');
    }
    steps.push({ title: 'Factor the numerator and the denominator', texLines: [`P(x) = ${factoredTex(N)}`, `Q(x) = ${factoredTex(D)}`] });
    const G = polyGcd(N, D);
    let Ns = polyDivide(N, G).q, Ds = polyDivide(D, G).q;
    if (lead(Ds).sign() < 0) { Ns = scalePoly(Ns, -1); Ds = scalePoly(Ds, -1); }
    if (degree(G) >= 1) {
      steps.push({ title: 'Greatest common factor (Euclid’s algorithm)', tex: `\\gcd(P, Q) = ${factoredTex(G)}` });
      steps.push({ title: 'Cancel the common factor', tex: `\\frac{${factoredTex(N)}}{${factoredTex(D)}} = \\frac{${factoredTex(Ns)}}{${factoredTex(Ds)}}` });
    } else {
      steps.push({ title: 'Look for common factors', text: 'P and Q have no common polynomial factor, so the expression is already in lowest terms (apart from a constant factor).' });
    }
    const holes = realZeros(G);
    return result(Ns, Ds, holes);

    function result(Ns2, Ds2, hz, extra) {
      const simple = degree(Ds2) === 0 ? polyTex(scalePoly(Ns2, Ds2[0].inv())) : `\\frac{${polyTex(Ns2)}}{${polyTex(Ds2)}}`;
      const asym = realZeros(Ds2);
      steps.push({ title: 'Simplified form', tex: simple });
      steps.push({ title: 'Excluded values (zeros of the original denominator)', tex: excluded.length ? `x \\ne ${excluded.map((z) => z.tex.replace('\\approx ', '')).join(',\\ ')}${excluded.some((z) => !z.exact) ? '\\ (\\text{rounded})' : ''}` : '\\text{none: } Q(x) \\ne 0 \\text{ for every real } x' });
      const f = (x) => evalNum(Ns2, x) / evalNum(Ds2, x);
      const xs = [...excluded.map((z) => z.x), ...realZeros(Ns2).map((z) => z.x)];
      const lo = Math.min(-5, ...xs) - 2, hi = Math.max(5, ...xs) + 2;
      const svg = plot({ x: [lo, hi], width: 380, height: 280, title: 'Graph of the simplified expression', curves: [{ f, samples: 800 }], vlines: asym.map((z) => ({ x: z.x, cls: 'd-line3', label: 'asymptote' })), points: hz.map((z) => ({ x: z.x, y: f(z.x), label: 'hole', cls: 'd-point3' })) });
      return {
        ok: true,
        final: { tex: `\\frac{${polyTex(N)}}{${polyTex(D)}} = ${simple}${excluded.length ? `,\\quad x \\ne ${excluded.map((z) => z.tex.replace('\\approx ', '')).join(',\\ ')}` : ''}` },
        answers: [
          { label: 'Simplified expression', valueTex: simple, copy: `${polyText(Ns2)} / (${polyText(Ds2)})` },
          { label: 'Excluded values', value: excluded.length ? excluded.map((z) => (z.exact ? z.tex.replace(/\\frac\{(\d+)\}\{(\d+)\}/, '$1/$2').replace('-\\frac', '-') : fmt(z.x))).join(', ') : 'none', copy: '' },
          { label: 'Holes (cancelled factors)', value: hz.length ? hz.map((z) => `x = ${fmt(z.x)}`).join(', ') : 'none', copy: '' },
          { label: 'Vertical asymptotes', value: asym.length ? asym.map((z) => `x = ${fmt(z.x)}`).join(', ') : 'none', copy: '' },
          answer('Degree of the simplified numerator / denominator', degree(Ns2), { decimals: 0 }),
        ],
        visual: { svg, caption: 'Cancelled factors leave holes in the graph (the original expression has no value there); remaining denominator zeros give vertical asymptotes.' },
        formula: ['\\frac{P(x)}{Q(x)} = \\frac{P(x) / G(x)}{Q(x) / G(x)},\\quad G = \\gcd(P, Q)'],
        steps,
        notes: [{ kind: 'info', text: extra || 'The simplified expression equals the original only where the original is defined: keep the excluded values. Factors are over the rationals; quadratic factors with irrational roots are left as they are.' }],
      };
    }
  },
};
