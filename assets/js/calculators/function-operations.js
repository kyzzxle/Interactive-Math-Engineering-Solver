/**
 * Function operations:
 *   combine: (f ∘ g)(x), (g ∘ f)(x), f + g, f − g, f·g, f/g for any two expressions in x,
 *            simplified (polynomials expanded, rational functions reduced), plus values at x₀.
 *   inverse: f⁻¹ for (ax + b)/(cx + d), a(x − h)ⁿ + k (n = 2 or 3) and a·bˣ + k, with the
 *            domain and range of f and f⁻¹ and the check f(f⁻¹(x)) = x.
 */
import { validator, tx, txp, fmt, fp } from '../lib/calc-kit.js';
import { Frac } from '../lib/fraction.js';
import { parse, simplify, texOf, textOf, evaluate, ExprError, polyMul, polyTrim } from '../lib/expr.js';
import { polyTex, degree, polyGcd, polyDivide, lead, scalePoly, isZeroPoly } from '../lib/poly-kit.js';
import { toRational } from './radical-rational-equations.js';
import { plot } from '../lib/plot.js';
import { inverseExplore, functionPractice } from '../explore/algebra-new.js';

const F = (x) => Frac.of(x);

/** Replace x by the expression g everywhere in n. */
export function subst(n, g) {
  switch (n.t) {
    case 'sym': return n.n === 'x' ? g : n;
    case 'add': case 'mul': return { t: n.t, a: n.a.map((c) => subst(c, g)) };
    case 'pow': return { t: 'pow', b: subst(n.b, g), e: subst(n.e, g) };
    case 'fn': return { t: 'fn', n: n.n, a: subst(n.a, g) };
    default: return n;
  }
}
/** Best simplified TeX: expanded polynomial, reduced fraction of polynomials, or the simplified expression. */
export function nice(n, fallback) {
  try {
    let [N, D] = toRational(n);
    if (isZeroPoly(D)) throw new ExprError('zero');
    const G = polyGcd(N, D);
    if (degree(G) >= 1) { N = polyDivide(N, G).q; D = polyDivide(D, G).q; }
    const k = lead(D); N = scalePoly(N, k.inv()); D = scalePoly(D, k.inv());
    return degree(D) === 0 ? polyTex(scalePoly(N, D[0].inv())) : `\\frac{${polyTex(N)}}{${polyTex(D)}}`;
  } catch (e) {
    return fallback || texOf(simplify(n));
  }
}
const at = (n, x) => { try { const v = evaluate(n, { x }); return Number.isFinite(v) ? v : NaN; } catch { return NaN; } };
const valTex = (y) => (Number.isFinite(y) ? tx(y) : '\\text{not defined}');

export const calculator = {
  id: 'function-operations',
  explore: inverseExplore,
  practice: functionPractice,
  fields: [
    { name: 'mode', label: 'What do you want to do?', type: 'radio', options: [['combine', 'Combine or compose f and g'], ['inverse', 'Find an inverse function']] },
    { name: 'f', label: 'f(x)', type: 'text', placeholder: 'e.g. 2x + 3', showWhen: { mode: ['combine'] } },
    { name: 'g', label: 'g(x)', type: 'text', placeholder: 'e.g. x^2 - 1', showWhen: { mode: ['combine'] }, hint: 'Any expression in x: powers, fractions, sqrt(x), exp, ln, sin …' },
    { name: 'x0', label: 'Evaluate at x₀ (optional)', type: 'number', placeholder: 'e.g. 2', showWhen: { mode: ['combine'] } },
    { name: 'ftype', label: 'Type of function', type: 'select', options: [['linfrac', 'f(x) = (ax + b)/(cx + d)'], ['power', 'f(x) = a(x − h)ⁿ + k'], ['exp', 'f(x) = a·bˣ + k']], showWhen: { mode: ['inverse'] } },
    { name: 'a', label: 'a', type: 'number', placeholder: 'e.g. 2', row: 'abcd', showWhen: { mode: ['inverse'], ftype: ['linfrac'] }, rowShowWhen: { mode: ['inverse'], ftype: ['linfrac'] } },
    { name: 'b', label: 'b', type: 'number', placeholder: 'e.g. 1', row: 'abcd', showWhen: { mode: ['inverse'], ftype: ['linfrac'] } },
    { name: 'c', label: 'c', type: 'number', placeholder: 'e.g. 1', row: 'abcd', showWhen: { mode: ['inverse'], ftype: ['linfrac'] } },
    { name: 'd', label: 'd', type: 'number', placeholder: 'e.g. -3', row: 'abcd', showWhen: { mode: ['inverse'], ftype: ['linfrac'] } },
    { name: 'pa', label: 'a', type: 'number', placeholder: 'e.g. 2', row: 'pw', showWhen: { mode: ['inverse'], ftype: ['power'] }, rowShowWhen: { mode: ['inverse'], ftype: ['power'] } },
    { name: 'ph', label: 'h', type: 'number', placeholder: 'e.g. 1', row: 'pw', showWhen: { mode: ['inverse'], ftype: ['power'] } },
    { name: 'pk', label: 'k', type: 'number', placeholder: 'e.g. -3', row: 'pw', showWhen: { mode: ['inverse'], ftype: ['power'] } },
    { name: 'pn', label: 'Power n', type: 'select', options: [['3', '3 (cube)'], ['2', '2 (square, x ≥ h)']], showWhen: { mode: ['inverse'], ftype: ['power'] } },
    { name: 'ea', label: 'a', type: 'number', placeholder: 'e.g. 3', row: 'ex', showWhen: { mode: ['inverse'], ftype: ['exp'] }, rowShowWhen: { mode: ['inverse'], ftype: ['exp'] } },
    { name: 'eb', label: 'Base b', type: 'number', placeholder: 'e.g. 2', row: 'ex', showWhen: { mode: ['inverse'], ftype: ['exp'] } },
    { name: 'ek', label: 'k', type: 'number', placeholder: 'e.g. 1', row: 'ex', showWhen: { mode: ['inverse'], ftype: ['exp'] } },
    { name: 'y0', label: 'Evaluate f⁻¹ at (optional)', type: 'number', placeholder: 'e.g. 5', showWhen: { mode: ['inverse'] } },
  ],
  examples: [
    { label: 'f(x) = 2x + 3, g(x) = x² − 1', values: { mode: 'combine', f: '2x + 3', g: 'x^2 - 1', x0: '2' } },
    { label: 'f(x) = 1/(x − 1), g(x) = 1/x', values: { mode: 'combine', f: '1/(x - 1)', g: '1/x', x0: '3' } },
    { label: 'f(x) = √x, g(x) = 4 − x', values: { mode: 'combine', f: 'sqrt(x)', g: '4 - x', x0: '-5' } },
    { label: 'Inverse of (2x + 1)/(x − 3)', values: { mode: 'inverse', ftype: 'linfrac', a: '2', b: '1', c: '1', d: '-3' } },
    { label: 'Inverse of 2(x − 1)³ − 3', values: { mode: 'inverse', ftype: 'power', pa: '2', ph: '1', pk: '-3', pn: '3' } },
    { label: 'Inverse of 3·2ˣ + 1', values: { mode: 'inverse', ftype: 'exp', ea: '3', eb: '2', ek: '1' } },
  ],
  solve(values) {
    return values.mode === 'inverse' ? solveInverse(values) : solveCombine(values);
  },
};

function solveCombine(values) {
  const v = validator(values);
  const fs = v.text('f', 'f(x)'), gs = v.text('g', 'g(x)');
  if (!v.ok()) return v.result();
  let f, g;
  try { f = parse(fs); } catch (e) { if (e instanceof ExprError) return { ok: false, errors: [{ field: 'f', message: e.message }] }; throw e; }
  try { g = parse(gs); } catch (e) { if (e instanceof ExprError) return { ok: false, errors: [{ field: 'g', message: e.message }] }; throw e; }
  const hasX0 = String(values.x0 ?? '').trim() !== '';
  const x0 = hasX0 ? v.number('x0', 'x₀') : null;
  if (!v.ok()) return v.result();
  const fT = texOf(f), gT = texOf(g);
  const fog = subst(f, g), gof = subst(g, f);
  const ops = [
    ['(f \\circ g)(x) = f\\big(g(x)\\big)', fog, 'f∘g'],
    ['(g \\circ f)(x) = g\\big(f(x)\\big)', gof, 'g∘f'],
    ['(f + g)(x)', { t: 'add', a: [f, g] }, 'f+g'],
    ['(f - g)(x)', { t: 'add', a: [f, { t: 'mul', a: [{ t: 'num', v: F(-1) }, g] }] }, 'f−g'],
    ['(f \\cdot g)(x)', { t: 'mul', a: [f, g] }, 'f·g'],
    ['\\left(\\frac{f}{g}\\right)(x)', { t: 'mul', a: [f, { t: 'pow', b: g, e: { t: 'num', v: F(-1) } }] }, 'f/g'],
  ];
  const sf = texOf(simplify(f)), sg = texOf(simplify(g));
  const plain = { 'f+g': `${sf} ${sg.startsWith('-') ? `- ${sg.slice(1)}` : `+ ${sg}`}`, 'f−g': `${sf} - \\left(${sg}\\right)`, 'f·g': `\\left(${sf}\\right)\\left(${sg}\\right)`, 'f/g': `\\frac{${sf}}{${sg}}` };
  const res = ops.map(([lab, node, key]) => ({ lab, node, key, tex: nice(node, plain[key]) }));
  const steps = [
    { title: 'The two functions', texLines: [`f(x) = ${fT}`, `g(x) = ${gT}`], note: 'f ∘ g means "do g first, then f". The order matters: f(g(x)) and g(f(x)) are usually different.' },
    { title: 'Composition f(g(x)): replace every x in f by g(x)', texLines: [`f\\big(g(x)\\big) = ${texOf(subst(f, { t: 'sym', n: '\\square' })).replace(/\\square/g, `\\left(${gT}\\right)`)}`, `= ${res[0].tex}`], note: 'Put g(x) in brackets wherever x appears in f, then simplify.' },
    { title: 'Composition g(f(x)): replace every x in g by f(x)', texLines: [`g\\big(f(x)\\big) = ${texOf(subst(g, { t: 'sym', n: '\\square' })).replace(/\\square/g, `\\left(${fT}\\right)`)}`, `= ${res[1].tex}`] },
    { title: 'Sum, difference, product and quotient', texLines: res.slice(2).map((r) => `${r.lab} = ${r.tex}`), note: 'These combine the outputs: (f + g)(x) = f(x) + g(x), and so on. The quotient is not defined where g(x) = 0.' },
  ];
  const answers = [
    { label: '(f∘g)(x)', valueTex: res[0].tex, primary: true, copy: textOf(simplify(fog)) },
    { label: '(g∘f)(x)', valueTex: res[1].tex, primary: true, copy: textOf(simplify(gof)) },
    { label: '(f + g)(x)', valueTex: res[2].tex, copy: '' }, { label: '(f − g)(x)', valueTex: res[3].tex, copy: '' },
    { label: '(f · g)(x)', valueTex: res[4].tex, copy: '' }, { label: '(f / g)(x)', valueTex: res[5].tex, copy: '' },
  ];
  if (hasX0) {
    const gx = at(g, x0), fx = at(f, x0), fgx = at(f, gx), gfx = at(g, fx);
    steps.push({ title: `Values at x = ${fmt(x0)}`, texLines: [`g(${tx(x0)}) = ${valTex(gx)} \\;\\Rightarrow\\; f\\big(g(${tx(x0)})\\big) = f(${valTex(gx)}) = ${valTex(fgx)}`, `f(${tx(x0)}) = ${valTex(fx)} \\;\\Rightarrow\\; g\\big(f(${tx(x0)})\\big) = g(${valTex(fx)}) = ${valTex(gfx)}`], note: 'Work from the inside out: evaluate the inner function first and feed its output to the outer one.' });
    const direct = at(fog, x0);
    steps.push({ title: 'Check with the simplified composition', tex: `(f \\circ g)(${tx(x0)}) = ${valTex(direct)} ${Number.isFinite(direct) && Math.abs(direct - fgx) < 1e-9 * Math.max(1, Math.abs(fgx)) ? '\\ \\checkmark' : ''}`, note: Number.isFinite(fgx) ? 'Substituting into the simplified formula gives the same value.' : 'The value is not defined because the inner output is outside the domain of the outer function.' });
    answers.push({ label: `Value (f∘g)(x₀)`, value: Number.isFinite(fgx) ? fmt(fgx) : 'not defined', primary: true }, { label: `Value (g∘f)(x₀)`, value: Number.isFinite(gfx) ? fmt(gfx) : 'not defined', primary: true }, { label: 'Value f(x₀)', value: Number.isFinite(fx) ? fmt(fx) : 'not defined' }, { label: 'Value g(x₀)', value: Number.isFinite(gx) ? fmt(gx) : 'not defined' });
  } else {
    const t = 1.7, fgx = at(f, at(g, t)), direct = at(fog, t);
    steps.push({ title: 'Check at a sample point', tex: `x = ${t}: \\quad f\\big(g(${t})\\big) ${Number.isFinite(fgx) ? `\\approx ${tx(fgx, 4)}` : '\\text{ not defined}'}, \\quad \\text{simplified } (f \\circ g)(${t}) ${Number.isFinite(direct) ? `\\approx ${tx(direct, 4)}` : '\\text{ not defined}'}`, note: 'Working from the inside out at one x-value must agree with the simplified formula.' });
  }
  return {
    ok: true,
    final: { texLines: [`(f \\circ g)(x) = ${res[0].tex}`, `(g \\circ f)(x) = ${res[1].tex}`] },
    answers, steps,
    visual: { svg: plot({ x: [-6, 6], width: 380, height: 280, title: 'f, g and f ∘ g', curves: [{ f: (x) => at(f, x), cls: 'd-line', samples: 700 }, { f: (x) => at(g, x), cls: 'd-line2', samples: 700 }, { f: (x) => at(fog, x), cls: 'd-line3', samples: 700 }] }), legend: '<div class="legend"><span><i></i>f(x)</span><span><i class="l2"></i>g(x)</span><span><i class="l3"></i>(f∘g)(x)</span></div>', caption: 'The composition feeds the output of g into f.' },
    formula: ['(f \\circ g)(x) = f\\big(g(x)\\big)'],
    notes: [{ kind: 'info', text: 'The domain of f∘g contains only the x-values in the domain of g whose output g(x) is in the domain of f.' }],
  };
}

function solveInverse(values) {
  const v = validator(values);
  const type = ['linfrac', 'power', 'exp'].includes(values.ftype) ? values.ftype : 'linfrac';
  if (type === 'linfrac') {
    const a = v.frac('a', 'a'), b = v.frac('b', 'b'), c = v.frac('c', 'c'), d = v.frac('d', 'd');
    if (!v.ok()) return v.result();
    if (a.mul(d).sub(b.mul(c)).isZero()) return { ok: false, errors: [{ field: ['a', 'b', 'c', 'd'], message: 'ad − bc = 0, so f is constant (or not defined) and has no inverse. Change a coefficient.' }] };
    if (c.isZero() && d.isZero()) return { ok: false, errors: [{ field: ['c', 'd'], message: 'c and d cannot both be 0: the denominator would be 0.' }] };
    const L = (p, q) => `${p.isZero() ? '' : `${p.isOne() ? '' : p.eq(-1) ? '-' : p.toTex()}x`}${q.isZero() ? (p.isZero() ? '0' : '') : `${p.isZero() ? q.toTex() : ` ${q.sign() < 0 ? '-' : '+'} ${q.abs().toTex()}`}`}`;
    const fr = (p, q, r, s) => (r.isZero() ? (s.isOne() ? L(p, q) : `\\frac{${L(p, q)}}{${s.toTex()}}`) : `\\frac{${L(p, q)}}{${L(r, s)}}`);
    const fTex = fr(a, b, c, d), invTex = fr(d.neg(), b, c, a.neg());
    // tidy: if the denominator's x-coefficient is negative, multiply top and bottom by −1
    const invNice = c.isZero() ? fr(d.div(a), b.neg().div(a), F(0), F(1)) : c.sign() < 0 ? fr(d, b.neg(), c.neg(), a) : invTex;
    const steps = [
      { title: 'Write y = f(x)', tex: `y = ${fTex}`, note: 'f has an inverse because it is one-to-one: ad − bc ≠ 0, so no two x-values give the same output.' },
      { title: 'Swap x and y', tex: `x = ${fr(a, b, c, d).replace(/x/g, 'y')}`, note: 'The inverse undoes f, so its inputs are f’s outputs and its outputs are f’s inputs.' },
    ];
    if (c.isZero()) steps.push({ title: 'Solve for y', texLines: [`${d.toTex()}x = ${L(a, b).replace(/x/g, 'y')}`, `y = ${invNice}`] });
    else steps.push({ title: 'Solve for y', texLines: [`x\\left(${L(c, d).replace(/x/g, 'y')}\\right) = ${L(a, b).replace(/x/g, 'y')}`, `${c.isOne() ? '' : c.toTex()}xy ${d.sign() < 0 ? '-' : '+'} ${d.abs().isOne() ? '' : d.abs().toTex()}x = ${L(a, b).replace(/x/g, 'y')}`, `y\\left(${L(c, a.neg())}\\right) = ${L(d.neg(), b)}`, `y = ${invNice}`], note: 'Multiply out, collect the y-terms on one side, factor out y and divide.' });
    const domF = c.isZero() ? '\\mathbb{R}' : `x \\ne ${d.neg().div(c).toTex()}`, ranF = c.isZero() ? '\\mathbb{R}' : `y \\ne ${a.div(c).toTex()}`;
    steps.push({ title: 'Domain and range', texLines: [`\\text{f: domain } ${domF}, \\quad \\text{range } ${ranF}`, `\\text{f}^{-1}\\text{: domain } ${ranF.replace('y', 'x')}, \\quad \\text{range } ${domF.replace('x', 'y')}`], note: c.isZero() ? 'A non-constant linear function takes every real value.' : 'f is not defined where cx + d = 0, and it never reaches a/c, the height of its horizontal asymptote. Domain and range swap for the inverse.' });
    // exact symbolic check f(f⁻¹(x)) = x with Frac polynomials: N = a·(−dx + b) + b·(cx − a), D = c·(−dx + b) + d·(cx − a)
    const N = [a.mul(b).sub(b.mul(a)), a.mul(d.neg()).add(b.mul(c))], D = [c.mul(b).sub(d.mul(a)), c.mul(d.neg()).add(d.mul(c))];
    steps.push({ title: 'Check: f(f⁻¹(x)) = x', texLines: [`f\\big(f^{-1}(x)\\big) = \\frac{${fp(a)}\\left(${L(d.neg(), b)}\\right) + ${fp(b)}\\left(${L(c, a.neg())}\\right)}{${fp(c)}\\left(${L(d.neg(), b)}\\right) + ${fp(d)}\\left(${L(c, a.neg())}\\right)}`, `= \\frac{${polyTex(polyTrim(N))}}{${polyTex(polyTrim(D))}} = x\\ \\checkmark`], note: 'Composing a function with its inverse gives back the input.' });
    const fn = (x) => (a.toNumber() * x + b.toNumber()) / (c.toNumber() * x + d.toNumber());
    const inv = (x) => (-d.toNumber() * x + b.toNumber()) / (c.toNumber() * x - a.toNumber());
    return result(steps, fTex, invNice, domF, ranF, fn, inv, c.isZero() ? [] : [d.neg().div(c).toNumber()], values);
  }
  if (type === 'power') {
    const a = v.number('pa', 'a', { nonzero: true }), h = v.number('ph', 'h'), k = v.number('pk', 'k');
    if (!v.ok()) return v.result();
    const n = values.pn === '2' ? 2 : 3;
    const sh = (s, c) => (c === 0 ? s : `${s} ${c < 0 ? '+' : '-'} ${tx(Math.abs(c))}`);
    const fTex = `${a === 1 ? '' : a === -1 ? '-' : tx(a)}\\left(${sh('x', h)}\\right)^${n}${k === 0 ? '' : ` ${k < 0 ? '-' : '+'} ${tx(Math.abs(k))}`}`;
    const inner = `\\frac{${sh('x', k)}}{${tx(a)}}`.replace(`\\frac{${sh('x', k)}}{1}`, sh('x', k));
    const invTex = `${n === 3 ? `\\sqrt[3]{${inner}}` : `\\sqrt{${inner}}`}${h === 0 ? '' : ` ${h < 0 ? '-' : '+'} ${tx(Math.abs(h))}`}`;
    const steps = [
      { title: 'Write y = f(x)', tex: `y = ${fTex}${n === 2 ? `, \\quad x \\ge ${tx(h)}` : ''}`, note: n === 2 ? 'A square is not one-to-one (two x-values give each output), so the domain is restricted to x ≥ h, the right half of the parabola.' : 'A cube is one-to-one, so the inverse exists for every real x.' },
      { title: 'Swap x and y', tex: `x = ${fTex.replace(/x/g, 'y')}` },
      { title: 'Solve for y', texLines: [`${sh('x', k)} = ${a === 1 ? '' : tx(a)}\\left(${sh('y', h)}\\right)^${n}`, `\\left(${sh('y', h)}\\right)^${n} = ${inner}`, `y = ${invTex}`], note: n === 2 ? 'Take the positive square root, because y ≥ h on the restricted domain.' : 'Undo each operation in reverse order: subtract k, divide by a, take the cube root, add h.' },
    ];
    const domF = n === 3 ? '\\mathbb{R}' : `x \\ge ${tx(h)}`, ranF = n === 3 ? '\\mathbb{R}' : a > 0 ? `y \\ge ${tx(k)}` : `y \\le ${tx(k)}`;
    steps.push({ title: 'Domain and range', texLines: [`\\text{f: domain } ${domF}, \\quad \\text{range } ${ranF}`, `\\text{f}^{-1}\\text{: domain } ${ranF.replace('y', 'x')}, \\quad \\text{range } ${domF.replace('x', 'y')}`] });
    const fn = (x) => (n === 2 && x < h ? NaN : a * (x - h) ** n + k), inv = (x) => { const q = (x - k) / a; return n === 3 ? h + Math.cbrt(q) : q < 0 ? NaN : h + Math.sqrt(q); };
    const t = h + 2, y = fn(t);
    steps.push({ title: 'Check: f⁻¹(f(x)) = x at a sample point', tex: `f(${tx(t)}) = ${tx(y)}, \\qquad f^{-1}(${tx(y)}) = ${tx(inv(y))}\\ \\checkmark`, note: 'The inverse sends the output back to the original input.' });
    return result(steps, fTex, invTex, domF, ranF, fn, inv, [], values);
  }
  const a = v.number('ea', 'a', { nonzero: true }), b = v.number('eb', 'the base b', { positive: true }), k = v.number('ek', 'k');
  if (!v.ok()) return v.result();
  if (b === 1) return { ok: false, errors: [{ field: 'eb', message: 'The base cannot be 1: 1ˣ is constant, so it has no inverse.' }] };
  const fTex = `${a === 1 ? '' : a === -1 ? '-' : `${tx(a)} \\cdot `}${txp(b)}^{x}${k === 0 ? '' : ` ${k < 0 ? '-' : '+'} ${tx(Math.abs(k))}`}`;
  const inner = a === 1 ? (k === 0 ? 'x' : `x ${k < 0 ? '+' : '-'} ${tx(Math.abs(k))}`) : `\\frac{x ${k === 0 ? '' : `${k < 0 ? '+' : '-'} ${tx(Math.abs(k))}`}}{${tx(a)}}`;
  const invTex = `\\log_{${tx(b)}}\\left(${inner}\\right)`;
  const steps = [
    { title: 'Write y = f(x)', tex: `y = ${fTex}`, note: 'An exponential function is one-to-one, so it has an inverse: a logarithm.' },
    { title: 'Swap x and y', tex: `x = ${fTex.replace('^{x}', '^{y}')}` },
    { title: 'Solve for y', texLines: [`${txp(b)}^{y} = ${inner}`, `y = ${invTex}`], note: 'Isolate the power, then rewrite b^y = u as y = log_b u.' },
  ];
  const domF = '\\mathbb{R}', ranF = a > 0 ? `y \\gt ${tx(k)}` : `y \\lt ${tx(k)}`;
  steps.push({ title: 'Domain and range', texLines: [`\\text{f: domain } ${domF}, \\quad \\text{range } ${ranF}`, `\\text{f}^{-1}\\text{: domain } ${ranF.replace('y', 'x')}, \\quad \\text{range } \\mathbb{R}`], note: `b^x is always positive, so f stays on one side of y = ${fmt(k)}, its horizontal asymptote. The logarithm is defined only for positive arguments.` });
  const fn = (x) => a * b ** x + k, inv = (x) => { const q = (x - k) / a; return q > 0 ? Math.log(q) / Math.log(b) : NaN; };
  const t = 1, y = fn(t);
  steps.push({ title: 'Check: f⁻¹(f(x)) = x at a sample point', tex: `f(1) = ${tx(y)}, \\qquad f^{-1}(${tx(y)}) = ${tx(inv(y))}\\ \\checkmark` });
  return result(steps, fTex, invTex, domF, ranF, fn, inv, [], values);
}

function result(steps, fTex, invTex, domF, ranF, fn, inv, asym, values) {
  const y0s = String(values.y0 ?? '').trim();
  const y0 = y0s === '' ? null : Number(y0s);
  const extra = [];
  if (y0 !== null && Number.isFinite(y0)) {
    const x = inv(y0);
    steps.push({ title: `Evaluate the inverse at ${fmt(y0)}`, tex: Number.isFinite(x) ? `f^{-1}(${tx(y0)}) = ${tx(x)}, \quad \text{check: } f(${tx(x)}) = ${tx(fn(x))}\ \checkmark` : `f^{-1}(${tx(y0)}) \text{ is not defined: } ${tx(y0)} \text{ is not in the range of f}`, note: 'f⁻¹(y₀) is the input of f that gives the output y₀.' });
    extra.push({ label: 'Value f⁻¹(y₀)', value: Number.isFinite(x) ? fmt(x) : 'not defined', primary: true });
  }
  return {
    ok: true,
    final: { tex: `f^{-1}(x) = ${invTex}` },
    answers: [
      { label: 'Inverse f⁻¹(x)', valueTex: invTex, primary: true, copy: '' },
      { label: 'Domain of f', valueTex: domF, copy: '' }, { label: 'Range of f', valueTex: ranF, copy: '' },
      { label: 'Domain of f⁻¹', valueTex: ranF.replace('y', 'x'), copy: '' }, { label: 'Range of f⁻¹', valueTex: domF.replace('x', 'y'), copy: '' },
      ...extra,
    ],
    steps,
    visual: { svg: plot({ x: [-8, 8], y: [-8, 8], equal: true, width: 360, height: 340, title: 'f, its inverse and the mirror line y = x', curves: [{ f: fn, cls: 'd-line', samples: 900 }, { f: inv, cls: 'd-line2', samples: 900 }, { f: (x) => x, cls: 'd-hidden' }], vlines: asym.map((x) => ({ x, cls: 'd-line3' })) }), legend: '<div class="legend"><span><i></i>f(x)</span><span><i class="l2"></i>f⁻¹(x)</span><span><i class="l3"></i>y = x</span></div>', caption: 'The graph of the inverse is the mirror image of f in the line y = x: each point (a, b) becomes (b, a).' },
    formula: ['y = f(x) \\;\\Rightarrow\\; \\text{swap } x, y \\;\\Rightarrow\\; \\text{solve for } y = f^{-1}(x)'],
  };
}
