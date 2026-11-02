/**
 * Laplace transform F(s) = ∫₀^∞ e^{−st} f(t) dt for sums of supported terms
 *   c · tⁿ · e^{at},   c · e^{at} sin(bt),  c · e^{at} cos(bt),  c · t · e^{at} sin/cos(bt),
 *   c · e^{at} sinh(bt), c · e^{at} cosh(bt)
 * using linearity, the table of transforms and the first shifting theorem L{e^{at}g(t)} = G(s − a).
 * Anything else (products of different trig functions, t·sin(bt + c), …) is reported as unsupported.
 */
import { answer } from '../lib/calc-kit.js';
import { parse, texOf, compile, ExprError } from '../lib/expr.js';
import { Frac } from '../lib/fraction.js';
import { factorial } from '../lib/bigint.js';
import { plot } from '../lib/plot.js';

const F0 = new Frac(0n), F1 = new Frac(1n);
const isT = (n) => n.t === 'sym' && n.n === 't';
/** k for an argument k·t, or null. */
function linK(arg) {
  if (isT(arg)) return F1;
  if (arg.t === 'mul' && arg.a.length === 2 && arg.a[0].t === 'num' && isT(arg.a[1])) return arg.a[0].v;
  return null;
}
/** Decompose one product term. Returns { c, n, a, kind: 'none'|'sin'|'cos'|'sinh'|'cosh', b } or { error }. */
export function decompose(term) {
  const factors = term.t === 'mul' ? term.a : [term];
  const out = { c: F1, n: 0, a: F0, kind: 'none', b: F0 };
  for (const f of factors) {
    if (f.t === 'num') out.c = out.c.mul(f.v);
    else if (isT(f)) out.n += 1;
    else if (f.t === 'pow' && isT(f.b) && f.e.t === 'num' && f.e.v.isInt() && f.e.v.sign() > 0) out.n += Number(f.e.v.n);
    else if (f.t === 'pow' && f.b.t === 'sym' && f.b.n === 'e' && linK(f.e)) out.a = out.a.add(linK(f.e));
    else if (f.t === 'fn' && f.n === 'exp' && linK(f.a)) out.a = out.a.add(linK(f.a));
    else if (f.t === 'fn' && ['sin', 'cos', 'sinh', 'cosh'].includes(f.n) && linK(f.a) && out.kind === 'none') { out.kind = f.n; out.b = linK(f.a); }
    else return { error: `The term ${texOf(term)} is not one of the supported forms (c·tⁿ·e^(at), times at most one sin, cos, sinh or cosh of b·t).` };
  }
  if (out.kind !== 'none' && out.n > 1) return { error: 'Terms like t²·sin(bt) are not supported here (only tⁿ·e^(at), and t·sin or t·cos).' };
  if (out.kind.endsWith('h') && out.n > 0) return { error: 'Terms like t·sinh(bt) are not supported here.' };
  if (out.n > 20) return { error: 'Please keep powers of t at most 20.' };
  return out;
}
const sMinus = (a) => (a.isZero() ? 's' : `s ${a.sign() > 0 ? '-' : '+'} ${a.abs().toTex()}`);
const sm = (a) => (a.isZero() ? 's' : `\\left(${sMinus(a)}\\right)`);
const coefFrac = (c, top) => (c.isOne() ? top : c.eq(-1) ? `-${top}` : null);

/** TeX of the transform of one decomposed term, and a description of the rule used. */
export function transformTerm(d) {
  const { c, n, a, kind, b } = d;
  const b2 = b.pow(2);
  const frac = (num, den) => (num.sign() < 0 ? `-\\frac{${num.abs().toTex()}}{${den}}` : `\\frac{${num.toTex()}}{${den}}`);
  if (kind === 'none') {
    const nf = new Frac(factorial(n));
    return { tex: frac(c.mul(nf), n === 0 ? sMinus(a) : `${sm(a)}^{${n + 1}}`), rule: n === 0 ? (a.isZero() ? 'L\\{1\\} = \\frac{1}{s}' : 'L\\{e^{at}\\} = \\frac{1}{s - a}') : `L\\{t^n e^{at}\\} = \\frac{n!}{(s - a)^{n + 1}}`, pole: a.toNumber() };
  }
  const D = kind.endsWith('h') ? `${sm(a)}^2 - ${b2.toTex()}` : `${sm(a)}^2 + ${b2.toTex()}`;
  const pole = a.toNumber() + (kind.endsWith('h') ? Math.abs(b.toNumber()) : 0);
  if (n === 0) {
    if (kind === 'sin' || kind === 'sinh') return { tex: frac(c.mul(b), D), rule: `L\\{e^{at}\\${kind}(bt)\\} = \\frac{b}{(s - a)^2 ${kind === 'sin' ? '+' : '-'} b^2}`, pole };
    const mag = c.abs();
    const top = mag.isOne() ? sMinus(a) : `${mag.toTex()}${a.isZero() ? 's' : `\\left(${sMinus(a)}\\right)`}`;
    return { tex: `${c.sign() < 0 ? '-' : ''}\\frac{${top}}{${D}}`, rule: `L\\{e^{at}\\${kind}(bt)\\} = \\frac{s - a}{(s - a)^2 ${kind === 'cos' ? '+' : '-'} b^2}`, pole };
  }
  // n = 1 with sin/cos
  if (kind === 'sin') return { tex: `\\frac{${c.mul(b).mul(2).toTex()}${sm(a)}}{\\left(${D}\\right)^2}`, rule: 'L\\{t e^{at}\\sin bt\\} = \\frac{2b(s - a)}{\\left((s - a)^2 + b^2\\right)^2}', pole };
  const m = c.abs(), body = `${sm(a)}^2 - ${b2.toTex()}`;
  return { tex: `${c.sign() < 0 ? '-' : ''}\\frac{${m.isOne() ? body : `${m.toTex()}\\left(${body}\\right)`}}{\\left(${D}\\right)^2}`, rule: 'L\\{t e^{at}\\cos bt\\} = \\frac{(s - a)^2 - b^2}{\\left((s - a)^2 + b^2\\right)^2}', pole };
}

export const calculator = {
  id: 'laplace-transform',
  fields: [{ name: 'f', label: 'f(t)', type: 'text', placeholder: 'e.g. 3e^(-2t) + t^2 - 4sin(5t)', hint: 'Use t as the variable. Supported terms: c·tⁿ·e^(at), e^(at)·sin(bt), e^(at)·cos(bt), t·sin(bt), t·cos(bt), sinh(bt), cosh(bt), and sums of these.' }],
  examples: [
    { label: '3e^(−2t) + t² − 4 sin 5t', values: { f: '3e^(-2t) + t^2 - 4sin(5t)' } },
    { label: 'e^(−t) cos 2t (shifting theorem)', values: { f: 'e^(-t)cos(2t)' } },
    { label: 't e^(3t) + 5', values: { f: 't*e^(3t) + 5' } },
    { label: 't sin 2t', values: { f: 't*sin(2t)' } },
    { label: 'Not supported: sin t · cos t', values: { f: 'sin(t)*cos(t)' }, expectError: true },
  ],
  solve(values) {
    const src = String(values.f ?? '').trim();
    if (!src) return { ok: false, errors: [{ field: 'f', message: 'Enter f(t), for example 3e^(-2t) + t^2.' }] };
    let node;
    try { node = parse(src, { vars: ['t'] }); } catch (e) { if (e instanceof ExprError) return { ok: false, errors: [{ field: 'f', message: e.message }] }; throw e; }
    const terms = node.t === 'add' ? node.a : [node];
    if (terms.length > 12) return { ok: false, errors: [{ field: 'f', message: 'Please enter at most 12 terms.' }] };
    const ds = [];
    for (const term of terms) { const d = decompose(term); if (d.error) return { ok: false, errors: [{ field: 'f', message: d.error }] }; ds.push({ term, d, T: transformTerm(d) }); }
    const Fs = ds.map((x) => x.T.tex).join(' + ').replace(/\+ -/g, '- ');
    const sigma = Math.max(...ds.map((x) => x.T.pole));
    const steps = [
      { title: 'Split into terms (linearity)', tex: `\\mathcal{L}\\{f(t)\\} = ${ds.map((x) => `\\mathcal{L}\\left\\{${texOf(x.term)}\\right\\}`).join(' + ')}` },
      ...ds.map((x) => ({ title: `Transform ${x.d.a.isZero() ? '' : '(with the shift s → s − a) '}`.trim(), texLines: [x.T.rule.replace(/L\\\{/g, '\\mathcal{L}\\{'), `\\mathcal{L}\\left\\{${texOf(x.term)}\\right\\} = ${x.T.tex}`] })),
      { title: 'Add the results', tex: `F(s) = ${Fs}` },
      { title: 'Region of convergence', tex: `s > ${Number.isInteger(sigma) ? sigma : sigma.toFixed(4)}`, text: 'The integral converges only when s is larger than the real part of every exponential rate in f(t).' },
    ];
    const f = compile(node, 't');
    return {
      ok: true,
      final: { tex: `F(s) = ${Fs},\\quad s > ${Number.isInteger(sigma) ? sigma : sigma.toFixed(4)}` },
      answers: [{ label: 'F(s)', valueTex: Fs, primary: true, copy: '' }, answer('Converges for s greater than', sigma)],
      visual: { svg: plot({ x: [0, 6], width: 380, height: 240, title: 'f(t) for t ≥ 0', curves: [{ f: (t) => (t >= 0 ? f(t) : NaN), samples: 600 }], xLabel: 't' }), caption: 'The Laplace transform only uses f(t) for t ≥ 0.' },
      formula: ['F(s) = \\int_0^\\infty e^{-st} f(t)\\,dt \\qquad \\mathcal{L}\\{e^{at}g(t)\\} = G(s - a)'],
      steps,
      notes: [{ kind: 'info', text: 'Supported: sums of c·tⁿ·e^(at), e^(at)·sin(bt), e^(at)·cos(bt), t·e^(at)·sin/cos(bt), e^(at)·sinh/cosh(bt). Step functions, delays and products like sin t·cos t are not handled (rewrite sin t cos t as ½ sin 2t first).' }],
    };
  },
};
