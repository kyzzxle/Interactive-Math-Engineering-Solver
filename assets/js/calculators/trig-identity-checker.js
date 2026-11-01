/**
 * Trigonometric identity checker and simplifier.
 *
 * Reliable symbolic simplification of arbitrary trigonometric expressions is not feasible in a small
 * browser tool, so this calculator does two things it can do reliably:
 *   1. Rewrites expressions in terms of sin x and cos x using the reciprocal and quotient identities.
 *   2. Tests equality numerically at many points of the domain. If two expressions agree at every
 *      test point to 1e-9 they are reported as an identity "verified numerically"; one failing point
 *      is a proof that the equation is NOT an identity (it is shown as a counterexample).
 * In "simplify" mode the expression is compared with a list of common simple forms.
 */
import { validator, fmt } from '../lib/calc-kit.js';
import { parse, simplify, texOf, textOf, compile, ExprError, fn, mul, pow, num, hasVar } from '../lib/expr.js';
import { plot } from '../lib/plot.js';

const CANDIDATES = [
  '0', '1', '-1', '2', '1/2', 'sin(x)', 'cos(x)', 'tan(x)', 'sec(x)', 'csc(x)', 'cot(x)', '-sin(x)', '-cos(x)', '-tan(x)',
  'sin(x)^2', 'cos(x)^2', 'tan(x)^2', 'sec(x)^2', 'csc(x)^2', 'cot(x)^2', '2sin(x)', '2cos(x)', 'sin(2x)', 'cos(2x)', 'tan(2x)',
  '2sin(x)cos(x)', 'sin(x)cos(x)', 'sec(x)csc(x)', 'sin(x)tan(x)', '1 + sin(x)', '1 - sin(x)', '1 + cos(x)', '1 - cos(x)',
  'sec(x) + tan(x)', 'csc(x) - cot(x)', 'sin(x)^4', 'cos(x)^4', '2sec(x)^2', '2csc(x)^2', 'cos(x)/2', 'sin(x)/2',
];

/** Replace tan, sec, csc and cot with sines and cosines. */
function toSinCos(n) {
  switch (n.t) {
    case 'add': case 'mul': return { ...n, a: n.a.map(toSinCos) };
    case 'pow': return { ...n, b: toSinCos(n.b), e: toSinCos(n.e) };
    case 'fn': {
      const u = toSinCos(n.a);
      if (n.n === 'tan') return mul(fn('sin', u), pow(fn('cos', u), num(-1)));
      if (n.n === 'cot') return mul(fn('cos', u), pow(fn('sin', u), num(-1)));
      if (n.n === 'sec') return pow(fn('cos', u), num(-1));
      if (n.n === 'csc') return pow(fn('sin', u), num(-1));
      return fn(n.n, u);
    }
    default: return n;
  }
}

/** Test points spread over (−2π, 2π), avoiding values where either side is undefined. */
function compare(f, g) {
  let tested = 0, worst = 0, counter = null;
  for (let i = 0; i < 400 && tested < 60; i++) {
    const x = -6.2 + (12.4 * (i * 0.6180339887 % 1));
    const a = f(x), b = g(x);
    if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a) > 1e8 || Math.abs(b) > 1e8) continue;
    tested++;
    const err = Math.abs(a - b) / Math.max(1, Math.abs(a), Math.abs(b));
    if (err > worst) worst = err;
    // keep the clearest counterexample (largest difference)
    if (err > 1e-9 && (!counter || err > counter.err)) counter = { x, a, b, err };
  }
  return { tested, worst, counter };
}

export const calculator = {
  id: 'trig-identity-checker',
  fields: [
    { name: 'mode', label: 'Task', type: 'radio', options: [['verify', 'Verify an identity'], ['simplify', 'Simplify an expression']] },
    { name: 'lhs', label: 'Expression (left side)', type: 'text', placeholder: 'e.g. sin(x)^2 + cos(x)^2', hint: 'Use x as the angle. Functions: sin, cos, tan, sec, csc, cot. Write sin^2(x) or sin(x)^2 for squares.' },
    { name: 'rhs', label: 'Right side', type: 'text', placeholder: 'e.g. 1', showWhen: { mode: ['verify'] } },
  ],
  examples: [
    { label: 'tan x · cos x = sin x', values: { mode: 'verify', lhs: 'tan(x)cos(x)', rhs: 'sin(x)' } },
    { label: 'Simplify (1 − cos²x)/sin x', values: { mode: 'simplify', lhs: '(1 - cos(x)^2)/sin(x)' } },
    { label: 'Not an identity: sin 2x = 2 sin x', values: { mode: 'verify', lhs: 'sin(2x)', rhs: '2sin(x)' } },
    { label: 'Simplify sec²x − tan²x', values: { mode: 'simplify', lhs: 'sec(x)^2 - tan(x)^2' } },
  ],
  solve(values) {
    const v = validator(values);
    const mode = values.mode === 'simplify' ? 'simplify' : 'verify';
    const lsrc = v.text('lhs', 'an expression');
    const rsrc = mode === 'verify' ? v.text('rhs', 'the right side') : null;
    if (!v.ok()) return v.result();
    let L, R;
    try { L = parse(lsrc); } catch (e) { if (e instanceof ExprError) return { ok: false, errors: [{ field: 'lhs', message: e.message }] }; throw e; }
    if (rsrc !== null) { try { R = parse(rsrc); } catch (e) { if (e instanceof ExprError) return { ok: false, errors: [{ field: 'rhs', message: e.message }] }; throw e; } }
    const Ls = simplify(toSinCos(L));
    const steps = [{ title: 'Write the expression', tex: mode === 'verify' ? `${texOf(L)} \\stackrel{?}{=} ${texOf(R)}` : texOf(L) }];
    steps.push({ title: 'Rewrite in terms of sin x and cos x', text: 'Use tan x = sin x / cos x, cot x = cos x / sin x, sec x = 1 / cos x and csc x = 1 / sin x.', texLines: [`\\text{Left: } ${texOf(Ls)}`, ...(R ? [`\\text{Right: } ${texOf(simplify(toSinCos(R)))}`] : [])] });
    const f = compile(L);
    if (mode === 'verify') {
      const g = compile(R);
      const res = compare(f, g);
      if (res.tested < 10) return { ok: false, errors: [{ field: 'lhs', message: 'The expressions are undefined at almost every test point, so they cannot be compared.' }] };
      if (res.counter) {
        const c = res.counter;
        steps.push({ title: 'Test values of x', text: `At x = ${fmt(c.x, 4)} rad the left side is ${fmt(c.a)} but the right side is ${fmt(c.b)}. One counterexample is enough to show this is not an identity.` });
        return {
          ok: true, final: { text: 'Not an identity: the two sides are different for some values of x.' },
          answers: [{ label: 'Result', value: 'Not an identity', primary: true }, { label: 'Counterexample', value: `x = ${fmt(c.x, 4)}: ${fmt(c.a)} ≠ ${fmt(c.b)}` }],
          visual: graph(f, g), steps, notes: [{ kind: 'warn', text: 'A counterexample proves the equation is false in general; it may still hold for particular values of x.' }], rounding: false,
        };
      }
      steps.push({ title: 'Compare the two sides numerically', text: `The two sides were evaluated at ${res.tested} different angles across (−2π, 2π). They agreed every time (largest relative difference ${res.worst.toExponential(1)}).` });
      return {
        ok: true, final: { text: 'This is an identity (verified numerically at ' + res.tested + ' points).' },
        answers: [{ label: 'Result', value: 'Identity (numerically verified)', primary: true }, { label: 'Points tested', value: String(res.tested) }],
        visual: graph(f, g), steps,
        notes: [{ kind: 'info', text: 'Numerical agreement at many points is very strong evidence, but it is not a formal proof. For a written proof, transform one side into the other using the identities listed on this page.' }],
        rounding: false,
      };
    }
    // simplify mode: compare with the candidate forms
    if (!hasVar(L)) return { ok: false, errors: [{ field: 'lhs', message: 'The expression does not contain x. Enter an expression in x.' }] };
    let found = null;
    for (const cand of CANDIDATES) {
      const node = parse(cand);
      const res = compare(f, compile(node));
      if (res.tested >= 20 && !res.counter) { found = node; break; }
    }
    if (!found) {
      steps.push({ title: 'Search for a simpler equivalent form', text: `None of the ${CANDIDATES.length} common simple forms (such as 1, sin x, sec² x, sin 2x) matches this expression, so the sin/cos form above is the simplest result this tool can give.` });
      return { ok: true, final: { tex: texOf(Ls), text: 'No simpler standard form was found; this is the expression in terms of sin x and cos x.' }, answers: [{ label: 'In terms of sin and cos', valueTex: texOf(Ls), primary: true }], visual: graph(f, null), steps, rounding: false };
    }
    steps.push({ title: 'Match a simpler form', text: `The expression agrees with ${textOf(found)} at every test point, so they are equal wherever both are defined.`, tex: `${texOf(L)} = ${texOf(found)}` });
    return {
      ok: true,
      final: { tex: `${texOf(L)} = ${texOf(found)}` },
      answers: [{ label: 'Simplified', valueTex: texOf(found), primary: true }, { label: 'In terms of sin and cos', valueTex: texOf(Ls) }],
      visual: graph(f, compile(found)), steps,
      notes: [{ kind: 'info', text: 'Equality was verified numerically; the result holds wherever both expressions are defined.' }],
      rounding: false,
    };
  },
};

function graph(f, g) {
  return {
    svg: plotBoth(f, g),
    legend: g ? '<div class="legend"><span><i></i>Left side</span><span><i class="l3"></i>Right side / simplified</span></div>' : '',
    caption: g ? 'If the curves lie exactly on top of each other, the expressions are equal.' : 'Graph of the expression on (−2π, 2π).',
  };
}
function plotBoth(f, g) {
  const clip = (h) => (x) => { const y = h(x); return Number.isFinite(y) && Math.abs(y) < 6 ? y : NaN; };
  return plot({ x: [-2 * Math.PI, 2 * Math.PI], y: [-4, 4], curves: [{ f: clip(f), cls: 'd-line' }, ...(g ? [{ f: clip(g), cls: 'd-line3' }] : [])], xTicks: [-2, -1, 0, 1, 2].map((k) => ({ x: k * Math.PI, label: k === 0 ? '0' : `${k === 1 ? '' : k === -1 ? '−' : k}π` })), title: 'Graph of the expressions' });
}
