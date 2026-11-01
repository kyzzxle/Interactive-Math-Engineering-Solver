/**
 * Binomial theorem: (a + b)ⁿ = Σ C(n, k) a^(n−k) b^k, for terms a and b that are monomials such as
 * 2x, −3y, x², 1/2 or 5. Gives the full expansion (n ≤ 30) and any single term (n ≤ 1000).
 */
import { validator } from '../lib/calc-kit.js';
import { parse, simplify, texOf, textOf, mul, pow, num, ExprError } from '../lib/expr.js';
import { binomial } from '../lib/bigint.js';
import { Frac } from '../lib/fraction.js';

const VARS = ['x', 'y', 'z', 'a', 'b', 't'];

function monomial(raw, field, label) {
  const s = String(raw ?? '').trim();
  if (!s) return { error: { field, message: `Please enter a value for ${label}.` } };
  let node;
  try { node = parse(s, { vars: VARS }); } catch (e) { if (e instanceof ExprError) return { error: { field, message: e.message } }; throw e; }
  const ok = (n) => n.t === 'num' || (n.t === 'sym' && VARS.includes(n.n)) || (n.t === 'pow' && n.b.t === 'sym' && n.e.t === 'num' && n.e.v.isInt() && n.e.v.sign() > 0) || (n.t === 'mul' && n.a.every(ok));
  if (!ok(node)) return { error: { field, message: `${label.charAt(0).toUpperCase() + label.slice(1)} must be a single term such as 2x, -3y, x^2 or 5 (no + or − inside the term).` } };
  if (node.t === 'num' && node.v.isZero()) return { error: { field, message: `${label.charAt(0).toUpperCase() + label.slice(1)} cannot be 0.` } };
  return { node };
}

export const calculator = {
  id: 'binomial-theorem-expansion',
  fields: [
    { name: 'a', label: 'First term a', type: 'text', placeholder: 'e.g. 2x', row: 't' },
    { name: 'b', label: 'Second term b', type: 'text', placeholder: 'e.g. -3', row: 't', hint: 'For (2x − 3) enter b = -3.' },
    { name: 'n', label: 'Power n', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 5' },
    { name: 'mode', label: 'Show', type: 'radio', options: [['all', 'Full expansion'], ['term', 'One specific term']] },
    { name: 'k', label: 'Term number (1 = first term)', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 3', showWhen: { mode: ['term'] } },
  ],
  examples: [
    { label: '(2x − 3)⁵', values: { a: '2x', b: '-3', n: '5', mode: 'all' } },
    { label: '(x + y)⁶', values: { a: 'x', b: 'y', n: '6', mode: 'all' } },
    { label: '(x² + 1/2)⁴', values: { a: 'x^2', b: '1/2', n: '4', mode: 'all' } },
    { label: '8th term of (a − 2b)¹²', values: { a: 'a', b: '-2b', n: '12', mode: 'term', k: '8' } },
  ],
  solve(values) {
    const v = validator(values);
    const A = monomial(values.a, 'a', 'the first term'), B = monomial(values.b, 'b', 'the second term');
    if (A.error) v.errors.push(A.error);
    if (B.error) v.errors.push(B.error);
    const n = v.whole('n', 'the power n', 1000);
    const mode = values.mode === 'term' ? 'term' : 'all';
    const k = mode === 'term' ? v.whole('k', 'the term number', 1001, 1) : null;
    if (!v.ok()) return v.result();
    if (mode === 'all' && n > 30) return { ok: false, errors: [{ field: 'n', message: 'The full expansion is limited to n ≤ 30 (it would have more than 31 terms). Choose "One specific term" for larger powers.' }] };
    if (mode === 'term' && k > n + 1) return { ok: false, errors: [{ field: 'k', message: `(a + b)^${n} has only ${n + 1} terms.` }] };
    const a = A.node, b = B.node;
    const term = (j) => simplify(mul(num(new Frac(binomial(n, j))), pow(a, num(n - j)), pow(b, num(j))));
    const paren = (node) => (node.t === 'sym' ? texOf(node) : `\\left(${texOf(node)}\\right)`);
    const steps = [{ title: 'Write the binomial and the general term', texLines: [`\\left(${texOf(a)} + ${texOf(b).startsWith('-') ? `\\left(${texOf(b)}\\right)` : texOf(b)}\\right)^{${n}}`, `T_{k+1} = \\binom{${n}}{k} ${paren(a)}^{${n} - k} ${paren(b)}^{k}`] }];
    if (mode === 'term') {
      const j = k - 1;
      const t = term(j);
      const C = binomial(n, j);
      steps.push({ title: `Term ${k} uses k = ${j}`, texLines: [`T_{${k}} = \\binom{${n}}{${j}} ${paren(a)}^{${n - j}} ${paren(b)}^{${j}}`, `\\binom{${n}}{${j}} = ${C.toString().length <= 30 ? C.toString() : `\\text{(${C.toString().length} digits)}`}`, `T_{${k}} = ${texOf(t)}`] });
      return {
        ok: true,
        final: { tex: `T_{${k}} = ${texOf(t)}` },
        answers: [{ label: `Term ${k}`, valueTex: texOf(t), primary: true, copy: textOf(t) }, { label: 'Binomial coefficient', valueTex: `\\binom{${n}}{${j}}`, copy: C.toString() }],
        steps,
        formula: ['(a + b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^{k}'],
        rounding: 'All coefficients are exact.',
      };
    }
    const terms = Array.from({ length: n + 1 }, (_, j) => term(j));
    const coeffs = Array.from({ length: n + 1 }, (_, j) => binomial(n, j).toString());
    steps.push({ title: `Binomial coefficients (row ${n} of Pascal's triangle)`, tex: coeffs.join(',\\ ') });
    const lines = terms.map((t, j) => `k = ${j}:\\ \\binom{${n}}{${j}} ${paren(a)}^{${n - j}} ${paren(b)}^{${j}} = ${texOf(t)}`);
    steps.push({ title: 'Compute each term', texLines: lines.length > 12 ? [...lines.slice(0, 6), '\\vdots', ...lines.slice(-3)] : lines });
    const expanded = simplify({ t: 'add', a: terms });
    steps.push({ title: 'Add the terms', tex: texOf(expanded) });
    return {
      ok: true,
      final: { tex: `\\left(${texOf(a)} ${texOf(b).startsWith('-') ? '' : '+ '}${texOf(b)}\\right)^{${n}} = ${texOf(expanded)}` },
      answers: [{ label: 'Expansion', valueTex: texOf(expanded), primary: true, copy: textOf(expanded) }, { label: 'Number of terms', value: String(n + 1) }, { label: 'Coefficients C(n, k)', value: coeffs.join(', ') }],
      steps,
      formula: ['(a + b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^{k}'],
      notes: [{ kind: 'info', text: 'Check: setting every variable to 1 makes the expansion add up to (value of a + value of b)ⁿ.' }],
      rounding: 'All coefficients are exact (whole numbers or fractions).',
    };
  },
};
