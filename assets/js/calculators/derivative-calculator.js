/**
 * Symbolic derivative of f(x). Supported: polynomials, rational functions, powers and roots,
 * sin, cos, tan, sec, csc, cot, inverse trig (asin, acos, atan), sinh, cosh, tanh, e^x, a^x,
 * ln, log, |x|, with the sum, constant multiple, product, quotient and chain rules.
 */
import { fmt, tx, eq, isExact } from '../lib/calc-kit.js';
import { derivRuleName, derivative, texOf, textOf, toPoly, polyMul, polyAdd, polyTrim, polyDeriv, polyToNode, simplify, mul, pow, num } from '../lib/expr.js';
import { Frac } from '../lib/fraction.js';
import { parseFunction, parseNumberExpr, FUNCTION_HINT, verifyDerivative, compile } from '../lib/calculus-kit.js';
import { plot } from '../lib/plot.js';

import { tangentExplore, derivativePractice } from '../explore/functions.js';
/** Steps for one differentiation: sum rule, then each term with its rule. */
export function derivativeSteps(node, label = "f'(x)") {
  const steps = [];
  const terms = node.t === 'add' ? node.a : [node];
  if (terms.length > 1) steps.push({ title: 'Sum rule', text: 'The derivative of a sum is the sum of the derivatives, so differentiate each term separately.', tex: `\\frac{d}{dx}\\left[${texOf(node)}\\right] = ${terms.map((t) => `\\frac{d}{dx}\\left[${texOf(t)}\\right]`).join(' + ')}` });
  for (const t of terms) {
    const d = derivative(t);
    steps.push({ title: derivRuleName(t), tex: `\\frac{d}{dx}\\left[${texOf(t)}\\right] = ${texOf(d)}` });
  }
  const d = derivative(node);
  steps.push({ title: terms.length > 1 ? 'Combine the terms and simplify' : 'Result', tex: `${label} = ${texOf(d)}` });
  return { steps, d };
}

/** Exact polynomial long division (coefficients low → high). */
function polyDivide(num, den) {
  const n = num.slice();
  const q = Array.from({ length: Math.max(n.length - den.length + 1, 1) }, () => new Frac(0n));
  for (let i = n.length - den.length; i >= 0; i--) {
    const c = n[i + den.length - 1].div(den[den.length - 1]);
    q[i] = c;
    for (let j = 0; j < den.length; j++) n[i + j] = n[i + j].sub(c.mul(den[j]));
  }
  return { q: polyTrim(q), r: n.slice(0, den.length - 1) };
}

/** Write f as N(x)/D(x) with polynomial N and D when possible (for a tidy quotient-rule answer). */
function asRational(node) {
  if (node.t !== 'mul' && node.t !== 'pow') return null;
  const factors = node.t === 'mul' ? node.a : [node];
  let N = [new Frac(1n)], D = [new Frac(1n)];
  const denNodes = [];
  for (const f of factors) {
    if (f.t === 'pow' && f.e.t === 'num' && f.e.v.isInt() && f.e.v.sign() < 0) {
      const base = toPoly(f.b);
      if (!base) return null;
      for (let i = 0; i < Number(-f.e.v.n); i++) D = polyMul(D, base);
      denNodes.push(simplify(pow(f.b, num(f.e.v.neg()))));
    } else {
      const p = toPoly(f);
      if (!p) return null;
      N = polyMul(N, p);
    }
  }
  if (D.length < 2) return null;
  return { N, D, Dnode: denNodes.length === 1 ? denNodes[0] : simplify(mul(...denNodes)) };
}

export const calculator = {
  id: 'derivative-calculator',
  explore: tangentExplore,
  practice: derivativePractice,
  fields: [
    { name: 'f', label: 'Function f(x)', type: 'text', placeholder: 'e.g. x^3 sin(x)', hint: FUNCTION_HINT },
    { name: 'order', label: 'Derivative', type: 'radio', options: [['1', "First f′(x)"], ['2', "Second f″(x)"]] },
    { name: 'x0', label: 'Evaluate at x = (optional)', type: 'text', placeholder: 'e.g. 2 or pi/4' },
  ],
  examples: [
    { label: 'x³ sin x', values: { f: 'x^3 sin(x)', order: '1', x0: '' } },
    { label: 'ln(x² + 1) at x = 1', values: { f: 'ln(x^2 + 1)', order: '1', x0: '1' } },
    { label: 'Quotient: (x² + 1)/(x − 1)', values: { f: '(x^2 + 1)/(x - 1)', order: '1', x0: '' } },
    { label: 'Second derivative of e^(2x) cos x', values: { f: 'e^(2x) cos(x)', order: '2', x0: '0' } },
  ],
  solve(values) {
    const p = parseFunction(values, 'f', 'the function f(x)');
    if (p.error) return p.error;
    const f = p.node;
    const order = values.order === '2' ? 2 : 1;
    let x0 = null;
    if (String(values.x0 ?? '').trim()) {
      const q = parseNumberExpr(values, 'x0', 'the x-value');
      if (q.error) return q.error;
      x0 = q.value;
    }
    const steps = [{ title: 'Write the function', tex: `f(x) = ${texOf(f)}` }];
    const first = derivativeSteps(f);
    const rat = asRational(f);
    if (rat) {
      // quotient rule with polynomials: (N'D − ND') / D², numerator expanded exactly
      let numer = polyTrim(polyAdd(polyMul(polyDeriv(rat.N), rat.D), polyMul(rat.N, polyDeriv(rat.D)).map((c) => c.neg())));
      const Dt = texOf(rat.Dnode);
      steps.push({ title: 'Quotient rule', text: 'For f = u/v, f′ = (u′v − uv′)/v².', texLines: [`u = ${texOf(polyToNode(rat.N))}, \\quad v = ${Dt}`, `u' = ${texOf(polyToNode(polyDeriv(rat.N)))}, \\quad v' = ${texOf(polyToNode(polyDeriv(rat.D)))}`, `f'(x) = \\frac{${texOf(polyToNode(numer))}}{\\left(${Dt}\\right)^{2}}`] });
      // cancel common factors when the denominator is a power of one polynomial, e.g. (x + 1)^2
      const base = rat.Dnode.t === 'pow' && rat.Dnode.e.t === 'num' ? rat.Dnode.b : rat.Dnode;
      let k = rat.Dnode.t === 'pow' && rat.Dnode.e.t === 'num' ? 2 * Number(rat.Dnode.e.v.n) : 2;
      const B = toPoly(base);
      let cancelled = 0;
      while (B && B.length > 1 && k > 0 && numer.length >= B.length) {
        const { q, r } = polyDivide(numer, B);
        if (!r.every((c) => c.isZero())) break;
        numer = q; k--; cancelled++;
      }
      const denNode = simplify(pow(base, num(k)));
      if (cancelled) steps.push({ title: 'Cancel common factors', text: `The numerator contains the factor (${textOf(base)}) ${cancelled === 1 ? 'once' : `${cancelled} times`}, which cancels with the denominator.`, tex: `f'(x) = \\frac{${texOf(polyToNode(numer))}}{${texOf(denNode)}}` });
      first.d = simplify(mul(polyToNode(numer), pow(denNode, num(-1))));
    } else {
      steps.push(...first.steps);
    }
    let d = first.d, dLabel = "f'(x)";
    if (order === 2) {
      steps.push({ title: 'Now differentiate again for the second derivative', tex: `f''(x) = \\frac{d}{dx}\\left[${texOf(first.d)}\\right]` });
      const second = derivativeSteps(first.d, "f''(x)");
      steps.push(...second.steps);
      d = second.d; dLabel = "f''(x)";
    }
    const check = verifyDerivative(order === 1 ? f : first.d, d, [-2.3, -1.1, 0.37, 0.83, 1.7, 2.9, 4.1]);
    if (!check.ok) return { ok: false, errors: [{ field: 'f', message: 'The symbolic and numerical derivatives disagreed for this input, so no result is shown. Please report the function.' }] };
    steps.push({ title: 'Check numerically', text: `The result was compared with a numerical derivative (central differences) at ${check.checked} points and agreed.` });
    const answers = [{ label: dLabel.replace("''", '″').replace("'", '′'), valueTex: texOf(d), primary: true, copy: `${dLabel} = ${textOf(d)}` }];
    let final = { tex: `${dLabel} = ${texOf(d)}` };
    if (x0 !== null) {
      const val = compile(d)(x0);
      if (!Number.isFinite(val)) return { ok: false, errors: [{ field: 'x0', message: `The derivative is undefined at x = ${fmt(x0)} (outside the domain of f or f′).` }] };
      steps.push({ title: `Evaluate at x = ${fmt(x0)}`, tex: `${dLabel.replace('(x)', `(${tx(x0)})`)} ${eq(val)}` });
      answers.push({ label: `${dLabel.replace('(x)', `(${fmt(x0)})`).replace("''", '″').replace("'", '′')}`, value: fmt(val), approx: !isExact(val), primary: true });
      final = { texLines: [`${dLabel} = ${texOf(d)}`, `${dLabel.replace('(x)', `(${tx(x0)})`)} ${eq(val)}`] };
    }
    const F = compile(f), D = compile(d);
    const c = x0 ?? 0;
    const svg = plot({ x: [c - 5, c + 5], curves: [{ f: F, cls: 'd-line' }, { f: D, cls: 'd-line2' }], points: x0 !== null && Number.isFinite(F(x0)) ? [{ x: x0, y: F(x0), cls: 'd-foot' }] : [], title: 'Graph of f and its derivative' });
    return {
      ok: true, final, answers, steps,
      visual: { svg, legend: `<div class="legend"><span><i></i>f(x)</span><span><i class="l2"></i>${order === 2 ? 'f″(x)' : 'f′(x)'}</span></div>`, caption: order === 1 ? 'Where f rises, f′ is positive; where f falls, f′ is negative; at turning points f′ crosses zero.' : 'Where f″ > 0 the graph of f is concave up; where f″ < 0 it is concave down.' },
      formula: ["\\frac{d}{dx}x^n = nx^{n-1} \\quad (uv)' = u'v + uv' \\quad \\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2} \\quad \\frac{d}{dx}f(g(x)) = f'(g(x))\\,g'(x)"],
      rounding: 'The derivative is exact; values at a point are rounded to 6 decimal places.',
    };
  },
};
