/**
 * Exponent and radical simplifier. Supported (clearly limited) expression types:
 *   1. radical: ⁿ√(k · x^a · y^b · …) — integer coefficient, variables with whole-number exponents
 *   2. power:   b^(p/q) for a rational base and rational exponent (exact result or simplest radical)
 *   3. laws:    products, quotients and powers of monomials, e.g. (2x^3y^-2)^2 / (4x^-1 y)
 * Variables are assumed positive (so even roots need no absolute values and division is allowed).
 */
import { validator } from '../lib/calc-kit.js';
import { Frac } from '../lib/fraction.js';
import { parse, simplify, texOf, textOf, ExprError } from '../lib/expr.js';

const VARS = ['x', 'y', 'z', 'a', 'b', 'c', 'm', 'n'];

/** Largest perfect k-th power factor of a positive BigInt (trial division up to 10⁶). */
function extractRoot(n, k) {
  let outside = 1n, inside = n;
  for (let p = 2n; p <= 1000000n && p ** BigInt(k) <= inside; p++) {
    const pk = p ** BigInt(k);
    while (inside % pk === 0n) { inside /= pk; outside *= p; }
  }
  return [outside, inside];
}

function radicalMode(values, v) {
  const n = v.whole('index', 'the index of the root', 20, 2);
  const src = v.text('radicand', 'the radicand');
  if (!v.ok()) return v.result();
  // radicand must be a monomial: integer coefficient and variables with whole-number exponents
  let node;
  try { node = parse(src, { vars: VARS }); } catch (e) { if (e instanceof ExprError) return { ok: false, errors: [{ field: 'radicand', message: e.message }] }; throw e; }
  const factors = node.t === 'mul' ? node.a : [node];
  let coef = new Frac(1n);
  const vars = [];
  for (const f of factors) {
    if (f.t === 'num') { coef = coef.mul(f.v); continue; }
    if (f.t === 'sym' && VARS.includes(f.n)) { vars.push([f.n, 1]); continue; }
    if (f.t === 'pow' && f.b.t === 'sym' && f.e.t === 'num' && f.e.v.isInt() && f.e.v.sign() > 0) { vars.push([f.b.n, Number(f.e.v.n)]); continue; }
    return { ok: false, errors: [{ field: 'radicand', message: 'The radicand must be a single term such as 72x^5y^2: an integer times variables with whole-number exponents (no + or −, no fractions of variables).' }] };
  }
  if (!coef.isInt()) return { ok: false, errors: [{ field: 'radicand', message: 'Use an integer coefficient in the radicand (for a fraction, simplify the numerator and denominator separately).' }] };
  if (coef.sign() < 0 && n % 2 === 0) return { ok: false, errors: [{ field: 'radicand', message: `An even root (index ${n}) of a negative number is not a real number.` }] };
  if (coef.isZero()) return { ok: false, errors: [{ field: 'radicand', message: 'The radicand is 0, so the root is simply 0.' }] };
  const neg = coef.sign() < 0;
  vars.sort((p, q) => (p[0] < q[0] ? -1 : 1));
  const [outC, inC] = extractRoot(neg ? -coef.n : coef.n, n);
  const outside = [], inside = [];
  const lines = [];
  for (const [name, e] of vars) {
    const q = Math.floor(e / n), r = e % n;
    if (q) outside.push(q === 1 ? name : `${name}^{${q}}`);
    if (r) inside.push(r === 1 ? name : `${name}^{${r}}`);
    lines.push(`${name}^{${e}} = ${name}^{${n}\\cdot ${q} + ${r}} \\Rightarrow ${q ? (q === 1 ? name : `${name}^{${q}}`) : '1'} \\text{ outside}${r ? `,\\ ${r === 1 ? name : `${name}^{${r}}`} \\text{ inside}` : ''}`);
  }
  const outsideTex = `${neg ? '-' : ''}${outC === 1n && outside.length ? '' : outC}${outside.join('')}`;
  const insideTex = `${inC === 1n && inside.length ? '' : inC}${inside.join('')}`;
  const rootTex = (t) => (n === 2 ? `\\sqrt{${t}}` : `\\sqrt[${n}]{${t}}`);
  const resultTex = insideTex === '1' ? (outsideTex || '1') : `${outsideTex === '1' ? '' : outsideTex === '-1' ? '-' : outsideTex}${rootTex(insideTex)}`;
  const steps = [
    { title: 'Write the radical', tex: rootTex(texOf(node)) },
    { title: `Split the coefficient into a perfect ${n === 2 ? 'square' : n === 3 ? 'cube' : `${n}th power`} and the rest`, tex: `${neg ? '-' : ''}${outC ** BigInt(n) * inC} = ${neg ? '-' : ''}${outC}^{${n}} \\cdot ${inC}` },
  ];
  if (vars.length) steps.push({ title: `Divide each exponent by the index ${n}`, text: 'The quotient goes outside the root; the remainder stays inside.', texLines: lines });
  steps.push({ title: 'Write the simplified radical', tex: `${rootTex(texOf(node))} = ${resultTex}` });
  return {
    ok: true,
    final: { tex: `${rootTex(texOf(node))} = ${resultTex}` },
    answers: [{ label: 'Simplified form', valueTex: resultTex, primary: true }],
    steps,
    formula: [`\\sqrt[n]{a^n b} = a\\sqrt[n]{b}`],
    notes: [{ kind: 'info', text: 'Variables are assumed to be positive, so no absolute-value signs are needed for even roots.' }],
    rounding: false,
  };
}

function powerMode(values, v) {
  const b = v.frac('base', 'the base');
  const e = v.frac('exp', 'the exponent');
  if (!v.ok()) return v.result();
  if (b.isZero() && e.sign() <= 0) return { ok: false, errors: [{ field: 'exp', message: '0 raised to a zero or negative power is undefined.' }] };
  if (b.sign() < 0 && !e.isInt() && e.d % 2n === 0n) return { ok: false, errors: [{ field: 'base', message: `A negative base with exponent ${e} needs an even root of a negative number, which is not real.` }] };
  if (e.n > 50n || e.n < -50n || e.d > 12n) return { ok: false, errors: [{ field: 'exp', message: 'Use an exponent whose numerator is at most 50 in size and whose denominator is at most 12.' }] };
  const p = Number(e.n), q = Number(e.d);
  const steps = [{ title: 'Write the power', tex: `${b.sign() < 0 || !b.isInt() ? `\\left(${b.toTex()}\\right)` : b.toTex()}^{${e.toTex()}}` }];
  if (p < 0) steps.push({ title: 'Negative exponent: take the reciprocal', tex: `a^{-n} = \\frac{1}{a^{n}}` });
  if (q > 1) steps.push({ title: 'Fractional exponent: the denominator is a root', tex: `a^{p/q} = \\left(\\sqrt[q]{a}\\right)^{p} = \\sqrt[q]{a^{p}}` });
  // b^(p/q): use 1/b for negative p, take the sign out for odd roots, then pull perfect q-th powers out.
  let base = b, P = p, sign = 1n;
  if (P < 0) { base = base.inv(); P = -P; }
  if (base.sign() < 0) { base = base.neg(); if (P % 2) sign = -1n; }
  const B = base.pow(P);
  // ⁿ√(N/D) = ⁿ√(N·D^(q−1)) / D, so the denominator is rational
  const [o, i] = q === 1 ? [1n, 1n] : extractRoot(B.n * B.d ** BigInt(q - 1), q);
  const coef = q === 1 ? new Frac(sign * B.n, B.d) : new Frac(sign * o, B.d);
  const exact = i === 1n;
  const rootPart = exact ? '' : q === 2 ? `\\sqrt{${i}}` : `\\sqrt[${q}]{${i}}`;
  const resTex = exact ? coef.toTex() : coef.d === 1n
    ? `${coef.n === 1n ? '' : coef.n === -1n ? '-' : coef.n}${rootPart}`
    : `${coef.sign() < 0 ? '-' : ''}\\frac{${coef.n === 1n || coef.n === -1n ? '' : coef.abs().n}${rootPart}}{${coef.d}}`;
  const resText = exact ? coef.toString() : `${coef.toString()}·${q === 2 ? '√' : `${q}√`}${i}`;
  const value = coef.toNumber() * (exact ? 1 : Math.pow(Number(i), 1 / q));
  steps.push({ title: exact ? 'Evaluate exactly' : 'Simplify the radical', text: exact ? undefined : `Pull every perfect ${q === 2 ? 'square' : q === 3 ? 'cube' : `${q}th power`} out of the root and keep the remainder inside.`, tex: `${b.sign() < 0 || !b.isInt() ? `\\left(${b.toTex()}\\right)` : b.toTex()}^{${e.toTex()}} = ${resTex}` });
  return {
    ok: true,
    final: { tex: `${b.sign() < 0 || !b.isInt() ? `\\left(${b.toTex()}\\right)` : b.toTex()}^{${e.toTex()}} = ${resTex}${!exact ? ` \\approx ${+value.toPrecision(8)}` : ''}` },
    answers: [
      { label: 'Exact value', valueTex: resTex, primary: true, copy: resText },
      { label: 'Decimal value', value: Number.isFinite(value) ? (Math.abs(value) < 1e15 ? String(+value.toPrecision(10)) : value.toExponential(6)) : 'too large', approx: !exact || !coef.toDecimal() },
    ],
    steps,
    formula: ['a^{-n} = \\frac{1}{a^n} \\qquad a^{p/q} = \\sqrt[q]{a^p}'],
    rounding: 'The exact value uses fractions and simplified radicals; the decimal is rounded to 10 significant figures.',
  };
}

function lawsMode(values, v) {
  const src = v.text('expr', 'an expression');
  if (!v.ok()) return v.result();
  let rawNode;
  try { rawNode = parse(src, { vars: VARS, raw: true }); } catch (e) { if (e instanceof ExprError) return { ok: false, errors: [{ field: 'expr', message: e.message }] }; throw e; }
  // only products, quotients and powers (with numeric exponents) of numbers and variables
  const check = (n) => {
    if (n.t === 'num' || n.t === 'sym') return n.t === 'num' || VARS.includes(n.n);
    if (n.t === 'mul') return n.a.every(check);
    if (n.t === 'pow') return n.e.t === 'num' || (n.e.t === 'mul' && n.e.a.every((f) => f.t === 'num')) ? check(n.b) : false;
    return false;
  };
  if (!check(rawNode)) return { ok: false, errors: [{ field: 'expr', message: 'Supported: products, quotients and powers of numbers and variables with numeric exponents, e.g. (2x^3y^-2)^2/(4x^-1y). Sums (+, −) and functions are not supported.' }] };
  // track the total exponent of every base
  const contributions = new Map();
  let ok = true;
  const walk = (n, mult) => {
    if (n.t === 'mul') { n.a.forEach((f) => walk(f, mult)); return; }
    if (n.t === 'pow') { const e = simplify(n.e); walk(n.b, mult.mul(e.v)); return; }
    if (n.t === 'sym') { const list = contributions.get(n.n) || []; list.push(mult); contributions.set(n.n, list); return; }
    if (n.t === 'num' && !(n.v.isOne() && mult.isOne())) {
      const list = contributions.get('#') || []; list.push([n.v, mult]); contributions.set('#', list);
    }
  };
  try { walk(rawNode, new Frac(1n)); } catch (e) { ok = false; }
  if (!ok) return { ok: false, errors: [{ field: 'expr', message: 'Exponents must be numbers.' }] };
  let result;
  try { result = simplify(rawNode); } catch (e) {
    if (e instanceof ExprError) return { ok: false, errors: [{ field: 'expr', message: `${e.message} Check the expression for division by zero.` }] };
    throw e;
  }
  const lines = [];
  for (const [base, list] of contributions) {
    if (base === '#') continue;
    const total = list.reduce((s, x) => s.add(x), new Frac(0n));
    lines.push(`${base}:\\ ${list.map((x, i) => (i === 0 ? x.toTex() : x.sign() < 0 ? `- ${x.abs().toTex()}` : `+ ${x.toTex()}`)).join(' ')} = ${total.toTex()}`);
  }
  const steps = [
    { title: 'Write the expression', tex: texOf(rawNode) },
    { title: 'Apply the power rules', text: 'A power of a product raises every factor: (ab)ⁿ = aⁿbⁿ, and a power of a power multiplies exponents: (aᵐ)ⁿ = aᵐⁿ. A factor in the denominator counts with a negative exponent.' },
  ];
  if (lines.length) steps.push({ title: 'Add the exponents of each variable', text: 'Same base: aᵐ · aⁿ = aᵐ⁺ⁿ. The total exponent for each variable is:', texLines: lines });
  steps.push({ title: 'Simplify numbers and write with positive exponents', text: 'Negative exponents move to the denominator: a⁻ⁿ = 1/aⁿ.', tex: `${texOf(rawNode)} = ${texOf(result)}` });
  return {
    ok: true,
    final: { tex: `${texOf(rawNode)} = ${texOf(result)}` },
    answers: [{ label: 'Simplified expression', valueTex: texOf(result), primary: true, copy: textOf(result) }],
    steps,
    formula: ['a^m a^n = a^{m+n} \\qquad \\frac{a^m}{a^n} = a^{m-n} \\qquad (a^m)^n = a^{mn} \\qquad (ab)^n = a^n b^n \\qquad a^{-n} = \\frac{1}{a^n}'],
    notes: [{ kind: 'info', text: 'Variables are assumed to be positive and non-zero, so every law of exponents applies.' }],
    rounding: false,
  };
}

export const calculator = {
  id: 'exponent-and-radical-simplifier',
  fields: [
    { name: 'mode', label: 'What do you want to simplify?', type: 'select', options: [['laws', 'Expression with exponents, e.g. (2x³y⁻²)² / (4x⁻¹y)'], ['radical', 'Radical, e.g. √(72x⁵y²) or ∛(−54)'], ['power', 'Number to a fractional power, e.g. 8^(2/3)']] },
    { name: 'expr', label: 'Expression', type: 'text', placeholder: '(2x^3y^-2)^2/(4x^-1y)', hint: 'Use ^ for powers. Variables allowed: x, y, z, a, b, c, m, n.', showWhen: { mode: ['laws'] } },
    { name: 'index', label: 'Index n of the root', type: 'number', inputmode: 'numeric', placeholder: '2', default: '', hint: '2 = square root, 3 = cube root, …', row: 'r', showWhen: { mode: ['radical'] }, rowShowWhen: { mode: ['radical'] } },
    { name: 'radicand', label: 'Radicand (inside the root)', type: 'text', placeholder: '72x^5y^2', row: 'r', showWhen: { mode: ['radical'] } },
    { name: 'base', label: 'Base', type: 'number', placeholder: '8 or 27/8', row: 'p', showWhen: { mode: ['power'] }, rowShowWhen: { mode: ['power'] } },
    { name: 'exp', label: 'Exponent', type: 'number', placeholder: '2/3 or -1.5', row: 'p', showWhen: { mode: ['power'] } },
  ],
  examples: [
    { label: '(2x³y⁻²)² / (4x⁻¹y)', values: { mode: 'laws', expr: '(2x^3y^-2)^2/(4x^-1y)' } },
    { label: '√(72x⁵y²)', values: { mode: 'radical', index: '2', radicand: '72x^5y^2' } },
    { label: '∛(−54a⁷)', values: { mode: 'radical', index: '3', radicand: '-54a^7' } },
    { label: '16^(−3/4)', values: { mode: 'power', base: '16', exp: '-3/4' } },
    { label: '12^(3/2)', values: { mode: 'power', base: '12', exp: '3/2' } },
  ],
  solve(values) {
    const v = validator(values);
    const mode = ['laws', 'radical', 'power'].includes(values.mode) ? values.mode : 'laws';
    if (mode === 'radical') return radicalMode(values, v);
    if (mode === 'power') return powerMode(values, v);
    return lawsMode(values, v);
  },
};
