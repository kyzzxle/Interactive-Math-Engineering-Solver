/**
 * Polynomial long division P(x) ÷ D(x) with every step shown (exact fractions):
 *   P(x) = D(x) Q(x) + R(x),  deg R < deg D.
 * For a divisor x − c the remainder theorem P(c) = R is also checked.
 */
import { answer, fracAnswer } from '../lib/calc-kit.js';
import { parsePolyField, polyDivide, polyTex, polyText, degree, lead, isZeroPoly, polyEvalFrac, evalNum } from '../lib/poly-kit.js';
import { polyMul, polyAdd } from '../lib/expr.js';
import { plot } from '../lib/plot.js';
import { randInt } from '../lib/learn.js';
import { Frac } from '../lib/fraction.js';

export const calculator = {
  id: 'polynomial-long-division',
  practice: {
    title: 'Divide by (x − c)',
    generate(rand) {
      const c = randInt(rand, -4, 4) || 2, a = randInt(rand, 1, 3), b = randInt(rand, -5, 5), d = randInt(rand, -6, 6), e = randInt(rand, -9, 9);
      // P(x) = a x³ + b x² + d x + e
      const P = [e, d, b, a].map((x) => new Frac(BigInt(x)));
      const { q, r } = polyDivide(P, [new Frac(BigInt(-c)), new Frac(1n)]);
      return {
        prompt: `<p>Divide by <strong>x ${c < 0 ? '+' : '−'} ${Math.abs(c)}</strong>. Enter the remainder and the constant term of the quotient.</p>`,
        promptTex: `\\left(${polyTex(P)}\\right) \\div \\left(x ${c < 0 ? '+' : '-'} ${Math.abs(c)}\\right)`,
        answers: [{ label: 'Remainder', value: r[0].toNumber(), int: true }, { label: 'Quotient constant term', value: q[0].toNumber(), int: true }],
        hint: `By the remainder theorem the remainder is P(${c}). Synthetic division with ${c} gives the quotient's coefficients.`,
        steps: [
          { title: 'Divide', tex: `\\left(${polyTex(P)}\\right) = \\left(x ${c < 0 ? '+' : '-'} ${Math.abs(c)}\\right)\\left(${polyTex(q)}\\right) ${r[0].sign() < 0 ? '-' : '+'} ${r[0].abs().toTex()}` },
          { title: 'Remainder theorem check', tex: `P(${c}) = ${r[0].toTex()}` },
        ],
      };
    },
  },
  fields: [
    { name: 'num', label: 'Dividend P(x)', type: 'text', placeholder: 'e.g. 2x^3 - 3x^2 + 4x - 5', hint: 'Polynomials in x up to degree 8; coefficients may be fractions. Missing powers are treated as 0.' },
    { name: 'den', label: 'Divisor D(x)', type: 'text', placeholder: 'e.g. x - 2' },
  ],
  examples: [
    { label: '(2x³ − 3x² + 4x − 5) ÷ (x − 2)', values: { num: '2x^3 - 3x^2 + 4x - 5', den: 'x - 2' } },
    { label: '(x⁴ − 1) ÷ (x² + 1)', values: { num: 'x^4 - 1', den: 'x^2 + 1' } },
    { label: '(3x³ + x − 7) ÷ (x² − x + 2)', values: { num: '3x^3 + x - 7', den: 'x^2 - x + 2' } },
    { label: '(x² + 1) ÷ (2x + 1)', values: { num: 'x^2 + 1', den: '2x + 1' } },
    { label: 'Invalid: divide by 0', values: { num: 'x^2', den: '0' }, expectError: true },
  ],
  solve(values) {
    const A = parsePolyField(values, 'num', 'the dividend', { maxDeg: 8, allowZero: true });
    if (A.error) return A.error;
    const B = parsePolyField(values, 'den', 'the divisor', { maxDeg: 8 });
    if (B.error) return B.error;
    const P = A.p, D = B.p;
    const { q, r, steps: div } = polyDivide(P, D);
    const steps = [{ title: 'Set up', texLines: [`P(x) = ${polyTex(P)}`, `D(x) = ${polyTex(D)}`] }];
    if (degree(P) < degree(D)) steps.push({ title: 'No division needed', text: 'The dividend has a lower degree than the divisor, so the quotient is 0 and the remainder is the dividend itself.' });
    const tableRows = [];
    div.forEach((s, i) => {
      steps.push({
        title: `Step ${i + 1}: divide the leading terms, multiply back, subtract`,
        texLines: [`\\text{next quotient term: } ${polyTex(s.term)}`, `${polyTex(s.term)} \\cdot \\left(${polyTex(D)}\\right) = ${polyTex(s.product)}`, `\\text{remainder so far: } ${polyTex(s.remainder)}`],
      });
      tableRows.push([String(i + 1), { tex: polyTex(s.term) }, { tex: polyTex(s.product) }, { tex: polyTex(s.remainder) }]);
    });
    const check = polyAdd(polyMul(D, q), r);
    steps.push({ title: 'Result', texLines: [`Q(x) = ${polyTex(q)},\\quad R(x) = ${polyTex(r)}`, `\\frac{P(x)}{D(x)} = ${polyTex(q)}${isZeroPoly(r) ? '' : ` + \\frac{${polyTex(r)}}{${polyTex(D)}}`}`] });
    steps.push({ title: 'Check: D(x)·Q(x) + R(x) = P(x)', tex: `${polyTex(check)} = P(x)\\ \\checkmark` });
    const answers = [
      { label: 'Quotient Q(x)', valueTex: polyTex(q), primary: true, copy: `Q(x) = ${polyText(q)}` },
      { label: 'Remainder R(x)', valueTex: polyTex(r), primary: true, copy: `R(x) = ${polyText(r)}` },
      { label: 'Divides exactly?', value: isZeroPoly(r) ? 'Yes — D(x) is a factor of P(x)' : 'No', copy: '' },
    ];
    const notes = [{ kind: 'info', text: 'Write every power of x in the dividend, including zero terms (x⁴ − 1 is x⁴ + 0x³ + 0x² + 0x − 1), so the columns line up when you work by hand.' }];
    if (degree(D) === 1) {
      const c = D[0].neg().div(lead(D));
      answers.push(fracAnswer(`Remainder theorem: P(${c})`, polyEvalFrac(P, c)));
      notes.push({ kind: 'info', text: `Remainder theorem: the divisor is zero at x = ${c}, so the remainder equals P(${c}) = ${polyEvalFrac(P, c)}.` });
    }
    const f = (x) => evalNum(P, x) / evalNum(D, x), g = (x) => evalNum(q, x);
    const svg = degree(D) >= 1
      ? plot({ x: [-8, 8], width: 380, height: 260, title: 'P(x)/D(x) and its quotient Q(x)', curves: [{ f, samples: 800 }, { f: g, cls: 'd-hidden' }] })
      : plot({ x: [-6, 6], width: 380, height: 260, title: 'P(x) and Q(x)', curves: [{ f: (x) => evalNum(P, x) }, { f: g, cls: 'd-hidden' }] });
    return {
      ok: true,
      final: { tex: `${polyTex(P)} = \\left(${polyTex(D)}\\right)\\left(${polyTex(q)}\\right)${isZeroPoly(r) ? '' : degree(r) === 0 ? ` ${r[0].sign() < 0 ? '-' : '+'} ${r[0].abs().toTex()}` : ` + \\left(${polyTex(r)}\\right)`}` },
      answers,
      visual: { svg, caption: degree(D) >= 1 && degree(r) < degree(D) ? 'Far from the origin, P(x)/D(x) approaches the quotient Q(x) (dashed): the remainder term R/D shrinks towards 0.' : 'The dashed curve is the quotient.' },
      formula: ['P(x) = D(x)\\,Q(x) + R(x),\\quad \\deg R < \\deg D'],
      steps,
      tables: tableRows.length ? [{ caption: 'Long-division steps', headers: ['Step', 'Quotient term', 'Subtract', 'Remainder'], rows: tableRows }] : [],
      notes,
    };
  },
};
