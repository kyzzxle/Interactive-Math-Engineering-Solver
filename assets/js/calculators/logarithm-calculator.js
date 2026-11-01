/**
 * Logarithms. Supported tasks:
 *   evaluate  log_b(x)                        (exact when x is a rational power of b)
 *   log-eq    log_b(a·x + c) = d   → x = (b^d − c)/a
 *   exp-eq    b^(a·x + c) = k      → x = (log_b k − c)/a
 * Domain: b > 0, b ≠ 1; arguments of logarithms must be positive; k > 0.
 */
import { validator, fmt, tx, txp, eq, isExact } from '../lib/calc-kit.js';
import { Frac, parseFrac } from '../lib/fraction.js';
import { plot } from '../lib/plot.js';

/** If x = b^(p/q) exactly for some q ≤ 12, return the Frac p/q. */
function exactLog(b, x) {
  if (!b || !x) return null;
  const guess = Math.log(x.toNumber()) / Math.log(b.toNumber());
  if (!Number.isFinite(guess)) return null;
  for (let q = 1; q <= 12; q++) {
    const p = Math.round(guess * q);
    if (Math.abs(p / q - guess) > 1e-9 || Math.abs(p) > 200) continue;
    // check x^q = b^p exactly
    const lhs = x.pow(q), rhs = b.pow(p);
    if (lhs.eq(rhs)) return new Frac(BigInt(p), BigInt(q));
  }
  return null;
}
const lnTex = (b) => (Math.abs(b - Math.E) < 1e-15 ? '1' : `\\ln ${tx(b)}`);

export const calculator = {
  id: 'logarithm-calculator',
  fields: [
    { name: 'mode', label: 'Task', type: 'select', options: [['evaluate', 'Evaluate log_b(x)'], ['logeq', 'Solve log_b(ax + c) = d'], ['expeq', 'Solve b^(ax + c) = k']] },
    { name: 'base', label: 'Base b', type: 'number', placeholder: 'e.g. 2', hint: 'b > 0 and b ≠ 1. Type e for the natural logarithm.', },
    { name: 'x', label: 'Argument x', type: 'number', placeholder: 'e.g. 32', showWhen: { mode: ['evaluate'] } },
    { name: 'a', label: 'a', type: 'number', placeholder: 'e.g. 3', row: 'lin', showWhen: { mode: ['logeq', 'expeq'] }, rowShowWhen: { mode: ['logeq', 'expeq'] } },
    { name: 'c', label: 'c', type: 'number', placeholder: 'e.g. 1', row: 'lin', showWhen: { mode: ['logeq', 'expeq'] } },
    { name: 'd', label: 'Right side d', type: 'number', placeholder: 'e.g. 2', showWhen: { mode: ['logeq'] } },
    { name: 'k', label: 'Right side k', type: 'number', placeholder: 'e.g. 100', showWhen: { mode: ['expeq'] } },
  ],
  examples: [
    { label: 'log₂ 32', values: { mode: 'evaluate', base: '2', x: '32' } },
    { label: 'log₁₀ 50', values: { mode: 'evaluate', base: '10', x: '50' } },
    { label: 'log₃(2x + 1) = 4', values: { mode: 'logeq', base: '3', a: '2', c: '1', d: '4' } },
    { label: '5^(x − 1) = 200', values: { mode: 'expeq', base: '5', a: '1', c: '-1', k: '200' } },
  ],
  solve(values) {
    const v = validator(values);
    const mode = ['evaluate', 'logeq', 'expeq'].includes(values.mode) ? values.mode : 'evaluate';
    const isE = String(values.base ?? '').trim().toLowerCase() === 'e';
    const bF = isE ? null : v.frac('base', 'the base b');
    const b = isE ? Math.E : bF ? bF.toNumber() : NaN;
    if (bF && bF.sign() <= 0) v.fail('base', 'The base must be greater than 0.');
    else if (bF && bF.isOne()) v.fail('base', 'The base cannot be 1: every power of 1 equals 1, so log₁ is undefined.');
    const bTex = isE ? 'e' : bF && !v.errors.length ? bF.toTex() : '';
    const logb = (t) => Math.log(t) / Math.log(b);
    if (mode === 'evaluate') {
      const x = v.number('x', 'the argument x');
      if (!v.ok()) return v.result();
      if (x <= 0) return { ok: false, errors: [{ field: 'x', message: 'The logarithm is only defined for positive arguments: x must be greater than 0.' }] };
      const value = logb(x);
      const exact = exactLog(bF, parseFrac(values.x));
      const steps = [
        { title: 'Meaning of the logarithm', text: `log_b(x) asks: to what power must ${isE ? 'e' : fmt(b)} be raised to give ${fmt(x)}?`, tex: `\\log_{${bTex}} ${txp(x)} = y \\iff ${bTex}^{y} = ${tx(x)}` },
      ];
      if (exact) steps.push({ title: 'Recognise an exact power', tex: `${tx(x)} = ${bTex}^{${exact.toTex()}} \\;\\Rightarrow\\; \\log_{${bTex}} ${tx(x)} = ${exact.toTex()}` });
      steps.push({ title: 'Change of base (natural logarithms)', texLines: [`\\log_{${bTex}} ${tx(x)} = \\frac{\\ln ${tx(x)}}{${lnTex(b)}}`, `= \\frac{${tx(Math.log(x))}}{${tx(Math.log(b))}} ${eq(value)}`] });
      steps.push({ title: 'Check', tex: `${bTex}^{${tx(value)}} ${eq(Math.pow(b, value))}` });
      return {
        ok: true,
        final: { tex: `\\log_{${bTex}} ${tx(x)} ${exact ? `= ${exact.toTex()}` : eq(value)}` },
        answers: [{ label: `log base ${isE ? 'e' : fmt(b)} of ${fmt(x)}`, value: fmt(value), approx: !exact || !exact.toDecimal(), exactTex: exact && !exact.isInt() ? exact.toTex() : undefined, primary: true },
          { label: 'Natural log ln x', value: fmt(Math.log(x)), approx: x !== 1 }, { label: 'Common log log₁₀ x', value: fmt(Math.log10(x)), approx: !Number.isInteger(Math.log10(x)) }],
        visual: graph(b, x, value, isE),
        formula: ['\\log_b x = y \\iff b^y = x \\qquad \\log_b x = \\frac{\\ln x}{\\ln b}'],
        steps,
      };
    }
    const a = v.number('a', 'a', { nonzero: true });
    const c = v.number('c', 'c');
    if (mode === 'logeq') {
      const d = v.number('d', 'd', { maxAbs: 300 });
      if (!v.ok()) return v.result();
      const bd = Math.pow(b, d);
      const x = (bd - c) / a;
      if (!Number.isFinite(x)) return { ok: false, errors: [{ field: 'd', message: 'b^d is too large to compute.' }] };
      const steps = [
        { title: 'Write the equation and its domain', text: 'The argument of a logarithm must be positive, so any solution must satisfy ax + c > 0.', tex: `\\log_{${bTex}}\\left(${tx(a)}x + ${txp(c)}\\right) = ${tx(d)}` },
        { title: 'Rewrite in exponential form', tex: `${tx(a)}x + ${txp(c)} = ${bTex}^{${tx(d)}} ${eq(bd)}` },
        { title: 'Solve the linear equation', texLines: [`x = \\frac{${bTex}^{${tx(d)}} - ${txp(c)}}{${tx(a)}}`, `x ${eq(x)}`] },
        { title: 'Check the domain', text: `a·x + c = ${fmt(a * x + c)} > 0, so the solution is valid.` },
      ];
      return {
        ok: true,
        final: { tex: `x ${eq(x)}` },
        answers: [{ label: 'Solution x', value: fmt(x), approx: !isExact(x), primary: true }, { label: 'b^d', value: fmt(bd), approx: !isExact(bd) }],
        formula: ['\\log_b(ax + c) = d \\iff ax + c = b^d \\iff x = \\frac{b^d - c}{a}'],
        steps,
      };
    }
    const k = v.number('k', 'k');
    if (!v.ok()) return v.result();
    if (k <= 0) return { ok: false, errors: [{ field: 'k', message: `A power of a positive base is always positive, so b^(ax + c) = ${fmt(k)} has no real solution. k must be greater than 0.` }] };
    const L = logb(k);
    const x = (L - c) / a;
    const exact = exactLog(bF, parseFrac(values.k));
    const steps = [
      { title: 'Write the equation', tex: `${bTex}^{${tx(a)}x + ${txp(c)}} = ${tx(k)}` },
      { title: 'Take the logarithm base b of both sides', tex: `${tx(a)}x + ${txp(c)} = \\log_{${bTex}} ${tx(k)} ${exact ? `= ${exact.toTex()}` : eq(L)}` },
      { title: 'Evaluate with the change of base', tex: `\\log_{${bTex}} ${tx(k)} = \\frac{\\ln ${tx(k)}}{${lnTex(b)}} ${eq(L)}` },
      { title: 'Solve for x', texLines: [`x = \\frac{\\log_{${bTex}} ${tx(k)} - ${txp(c)}}{${tx(a)}}`, `x ${eq(x)}`] },
      { title: 'Check', tex: `${bTex}^{${tx(a * x + c)}} ${eq(Math.pow(b, a * x + c))}` },
    ];
    return {
      ok: true,
      final: { tex: `x ${eq(x)}` },
      answers: [{ label: 'Solution x', value: fmt(x), approx: !isExact(x), primary: true }, { label: 'log_b k', value: fmt(L), approx: !exact }],
      formula: ['b^{ax + c} = k \\iff ax + c = \\log_b k \\iff x = \\frac{\\log_b k - c}{a}'],
      steps,
    };
  },
};

function graph(b, x, y, isE) {
  const xmax = Math.max(x * 1.5, 4);
  return {
    svg: plot({ x: [0, xmax], curves: [{ f: (t) => (t > 0 ? Math.log(t) / Math.log(b) : NaN), cls: 'd-line' }], points: [{ x, y, label: `(${fmt(x, 3)}, ${fmt(y, 3)})`, cls: 'd-foot' }], title: 'Graph of y = log_b(x)' }),
    caption: `The curve y = log${isE ? '' : '_b'}(x) passes through (1, 0) and (b, 1); the highlighted point is your answer.`,
  };
}
