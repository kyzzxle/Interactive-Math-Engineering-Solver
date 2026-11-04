/**
 * Radical and rational equations, with a check of every candidate for extraneous roots.
 *   radical:   √(ax + b) = cx + d   square both sides, solve, then keep only roots with
 *              ax + b ≥ 0 and cx + d ≥ 0
 *   rational:  any equation of rational expressions in x, e.g. x/(x − 2) + 1/x = 2/(x(x − 2)).
 *              Both sides become N/D; multiplying by the denominators gives a polynomial
 *              equation. Roots that make a denominator 0 are rejected.
 */
import { validator, fp, fmt } from '../lib/calc-kit.js';
import { Frac } from '../lib/fraction.js';
import { simplifySqrt } from '../lib/exact.js';
import { sqrtFrac } from '../lib/calc-kit.js';
import { linearTex } from '../lib/lines.js';
import { parse, texOf, ExprError, polyAdd, polyMul, polyTrim } from '../lib/expr.js';
import { polyTex, degree, factorRational, multiplicities, isZeroPoly, evalNum, polyEvalFrac, polyGcd, polyDivide } from '../lib/poly-kit.js';
import { factoredTex } from './rational-expression-simplifier.js';
import { polyRealRoots } from '../lib/numeric.js';
import { plot } from '../lib/plot.js';
import { radicalExplore, radicalPractice } from '../explore/algebra-new.js';

const F = (x) => Frac.of(x);
const ONE = F(1), ZERO = F(0);
const lin = (a, b) => linearTex([[a, 'x'], [b, '']]);

/** Real roots of A x² + B x + C = 0 (A may be 0) as { x, f (Frac or null), tex }. */
export function quadRoots(A, B, C) {
  if (A.isZero()) { if (B.isZero()) return null; const f = C.neg().div(B); return [{ x: f.toNumber(), f, tex: f.toTex() }]; }
  const D = B.pow(2).sub(A.mul(C).mul(4));
  if (D.sign() < 0) return [];
  const s = sqrtFrac(D, simplifySqrt);
  if (s.exact) {
    const r = F(s.text);
    const list = [B.neg().sub(r).div(A.mul(2)), B.neg().add(r).div(A.mul(2))].sort((p, q) => p.cmp(q)).filter((f, i, arr) => i === 0 || !f.eq(arr[i - 1]));
    return list.map((f) => ({ x: f.toNumber(), f, tex: f.toTex() }));
  }
  const xs = [(-B.toNumber() - s.value) / (2 * A.toNumber()), (-B.toNumber() + s.value) / (2 * A.toNumber())].sort((p, q) => p - q);
  const sgn = A.sign() > 0 ? ['-', '+'] : ['+', '-'];
  return xs.map((x, i) => ({ x, f: null, tex: `\\frac{${B.neg().toTex()} ${sgn[i]} ${s.tex}}{${A.mul(2).toTex()}}` }));
}

/** Rational function of a parsed expression: [N, D] polynomials (D kept unreduced, so every denominator's zeros stay excluded). */
export function toRational(n) {
  switch (n.t) {
    case 'num': return [[n.v], [ONE]];
    case 'sym': if (n.n !== 'x') throw new ExprError(`Only the variable x is allowed (found ${n.n}).`); return [[ZERO, ONE], [ONE]];
    case 'add': return n.a.map(toRational).reduce(([N1, D1], [N2, D2]) => [polyTrim(polyAdd(polyMul(N1, D2), polyMul(N2, D1))), polyTrim(polyMul(D1, D2))]);
    case 'mul': return n.a.map(toRational).reduce(([N1, D1], [N2, D2]) => [polyTrim(polyMul(N1, N2)), polyTrim(polyMul(D1, D2))]);
    case 'pow': {
      if (n.e.t !== 'num' || !n.e.v.isInt()) throw new ExprError('Only whole-number powers are allowed in a rational equation (no roots). For square roots use the radical mode.');
      let k = Number(n.e.v.n);
      if (Math.abs(k) > 8) throw new ExprError('Powers above 8 are not supported.');
      let [N, D] = toRational(n.b);
      if (k < 0) { [N, D] = [D, N]; k = -k; }
      let PN = [ONE], PD = [ONE];
      for (let i = 0; i < k; i++) { PN = polyMul(PN, N); PD = polyMul(PD, D); }
      return [polyTrim(PN), polyTrim(PD)];
    }
    default: throw new ExprError('Use only numbers, x, + − × ÷ and whole-number powers.');
  }
}

/** All real roots of a polynomial: exact rational ones first, the rest numerically. */
function realRoots(p) {
  if (degree(p) < 1) return [];
  const { roots, rest } = factorRational(p);
  const out = multiplicities(roots).map((g) => ({ x: g.r.toNumber(), f: g.r, tex: g.r.toTex() }));
  if (degree(rest) === 2) for (const r of quadRoots(rest[2], rest[1], rest[0]) || []) out.push(r);
  else if (degree(rest) >= 1) for (const x of polyRealRoots(rest)) out.push({ x, f: null, tex: `\\approx ${fmt(x, 6)}` });
  return out.sort((p2, q) => p2.x - q.x);
}
const frac = (N, D) => (degree(D) === 0 && D[0].isOne() ? polyTex(N) : `\\frac{${polyTex(N)}}{${polyTex(D)}}`);
const mul = (N, M) => (degree(M) === 0 && M[0].isOne() ? polyTex(N) : degree(N) === 0 && N[0].isOne() ? polyTex(M) : `\\left(${polyTex(N)}\\right)\\left(${polyTex(M)}\\right)`);
const valTex = (r) => (r.f ? r.f.toTex() : r.tex.startsWith('\\approx') ? r.tex.replace('\\approx ', '') : r.tex);

export const calculator = {
  id: 'radical-rational-equations',
  explore: radicalExplore,
  practice: radicalPractice,
  fields: [
    { name: 'mode', label: 'Type of equation', type: 'radio', options: [['radical', 'Radical: √(ax + b) = cx + d'], ['rational', 'Rational: fractions with x in a denominator']] },
    { name: 'a', label: 'a', type: 'number', placeholder: 'e.g. 1', row: 'ab', showWhen: { mode: ['radical'] }, rowShowWhen: { mode: ['radical'] } },
    { name: 'b', label: 'b', type: 'number', placeholder: 'e.g. 7', row: 'ab', showWhen: { mode: ['radical'] } },
    { name: 'c', label: 'c', type: 'number', placeholder: 'e.g. 1', row: 'cd', showWhen: { mode: ['radical'] }, rowShowWhen: { mode: ['radical'] } },
    { name: 'd', label: 'd', type: 'number', placeholder: 'e.g. 1', row: 'cd', showWhen: { mode: ['radical'] } },
    { name: 'lhs', label: 'Left side', type: 'text', placeholder: 'e.g. x/(x - 2) + 1/x', showWhen: { mode: ['rational'] }, hint: 'Use x, numbers, + − * / and ^. Put denominators in brackets, e.g. 3/(x + 1).' },
    { name: 'rhs', label: 'Right side', type: 'text', placeholder: 'e.g. 2/(x(x - 2))', showWhen: { mode: ['rational'] } },
  ],
  examples: [
    { label: '√(x + 7) = x + 1 (one root rejected)', values: { mode: 'radical', a: '1', b: '7', c: '1', d: '1' } },
    { label: '√(2x + 3) = x', values: { mode: 'radical', a: '2', b: '3', c: '1', d: '0' } },
    { label: '√(3x − 2) = 4', values: { mode: 'radical', a: '3', b: '-2', c: '0', d: '4' } },
    { label: 'x/(x − 2) + 1/x = 2/(x(x − 2))', values: { mode: 'rational', lhs: 'x/(x - 2) + 1/x', rhs: '2/(x(x - 2))' } },
    { label: '3/(x + 1) = 2/(x − 1)', values: { mode: 'rational', lhs: '3/(x + 1)', rhs: '2/(x - 1)' } },
    { label: 'x + 6/x = 5', values: { mode: 'rational', lhs: 'x + 6/x', rhs: '5' } },
  ],
  solve(values) {
    return values.mode === 'rational' ? solveRational(values) : solveRadical(values);
  },
};

function solveRadical(values) {
  const v = validator(values);
  const a = v.frac('a', 'a'), b = v.frac('b', 'b'), c = v.frac('c', 'c'), d = v.frac('d', 'd');
  if (!v.ok()) return v.result();
  if (a.isZero()) return { ok: false, errors: [{ field: 'a', message: 'a cannot be 0: the square root would not contain x.' }] };
  const In = lin(a, b), Rt = lin(c, d);
  const steps = [
    { title: 'Write the equation and the conditions', texLines: [`\\sqrt{${In}} = ${Rt}`, `\\text{need } ${In} \\ge 0 \\ \\text{and}\\ ${Rt} \\ge 0`], note: 'A square root is only defined for a radicand of 0 or more, and its value is never negative. A solution must satisfy both conditions.' },
  ];
  // (cx + d)² = c²x² + 2cd x + d²
  const A = c.pow(2), B = c.mul(d).mul(2).sub(a), C = d.pow(2).sub(b);
  steps.push({ title: 'Square both sides', texLines: [`${In} = \\left(${Rt}\\right)^2`, `${In} = ${linearTex([[A, 'x^2'], [c.mul(d).mul(2), 'x'], [d.pow(2), '']])}`], note: 'Squaring removes the root, but it can also create roots that do not satisfy the original equation: −2 and 2 have the same square. That is why every candidate is checked at the end.' });
  steps.push({ title: 'Move everything to one side', tex: `${linearTex([[A, 'x^2'], [B, 'x'], [C, '']])} = 0` });
  const cand = quadRoots(A, B, C);
  if (cand === null) {
    const holds = C.isZero();
    steps.push({ title: 'No x remains', text: holds ? 'Every x satisfies the squared equation; the conditions decide the solutions.' : `This reduces to ${C} = 0, which is false: no solution.` });
    return finish([], []);
  }
  if (A.isZero()) steps.push({ title: 'Solve the linear equation', tex: `x = ${cand[0].tex}` });
  else steps.push({ title: 'Solve the quadratic', texLines: [`\\Delta = ${fp(B)}^2 - 4${fp(A)}${fp(C)} = ${B.pow(2).sub(A.mul(C).mul(4)).toTex()}`, cand.length ? `x = ${cand.map((r) => r.tex).join(' \\ \\text{or}\\ x = ')}` : '\\Delta \\lt 0: \\text{ no real candidates}'], note: 'Use the quadratic formula (or factor) on the squared equation.' });
  const good = [], rejected = [];
  const lines = cand.map((r) => {
    const rad = a.toNumber() * r.x + b.toNumber(), rhs = c.toNumber() * r.x + d.toNumber();
    const ok = rad >= -1e-12 && rhs >= -1e-12 && Math.abs(Math.sqrt(Math.max(rad, 0)) - rhs) < 1e-9 * Math.max(1, Math.abs(rhs));
    (ok ? good : rejected).push(r);
    const exactR = r.f ? c.mul(r.f).add(d) : null, exactRad = r.f ? a.mul(r.f).add(b) : null;
    return `x = ${valTex(r)}: \\quad \\sqrt{${exactRad ? exactRad.toTex() : fmt(rad)}} ${exactRad ? '=' : '\\approx'} ${fmt(Math.sqrt(Math.max(rad, 0)))}, \\quad ${Rt} ${exactR ? `= ${exactR.toTex()}` : `\\approx ${fmt(rhs)}`} \\quad ${ok ? '\\checkmark' : '\\text{rejected}'}`;
  });
  if (cand.length) steps.push({ title: 'Check each candidate in the original equation', texLines: lines, note: rejected.length ? `x = ${rejected.map((r) => valTex(r).replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)')).join(' and x = ')} makes the right side negative, so the square root cannot equal it. It is an extraneous root, created by squaring.` : 'Every candidate satisfies the original equation.' });
  return finish(good, rejected);

  function finish(good2, rej) {
    const f = (x) => (a.toNumber() * x + b.toNumber() >= 0 ? Math.sqrt(a.toNumber() * x + b.toNumber()) : NaN);
    const xs = [...good2, ...rej].map((r) => r.x), x0 = -b.toNumber() / a.toNumber();
    const lo = Math.min(x0, ...xs) - 3, hi = Math.max(x0, ...xs) + 4;
    return {
      ok: true,
      final: good2.length ? { tex: good2.map((r) => `x = ${valTex(r)}${r.f ? '' : ` \\approx ${fmt(r.x)}`}`).join(' \\quad\\text{or}\\quad ') } : { text: 'No solution: no candidate satisfies the original equation.' },
      answers: [
        { label: 'Number of solutions', value: String(good2.length), primary: true },
        ...good2.map((r, i) => ({ label: `Solution x${good2.length > 1 ? ['₁', '₂'][i] : ''}`, value: fmt(r.x), approx: !r.f || !r.f.toDecimal(8), exactTex: r.f && r.f.isInt() ? undefined : valTex(r), primary: true })),
        { label: 'Rejected (extraneous)', value: rej.length ? rej.map((r) => fmt(r.x)).join(', ') : 'none', copy: '' },
        { label: 'Boundary points', value: good2.map((r) => fmt(r.x)).join(', ') || 'none', copy: '' },
      ],
      steps,
      visual: { svg: plot({ x: [lo, hi], width: 380, height: 280, title: 'Both sides of the equation', curves: [{ f, cls: 'd-line', samples: 600 }, { f: (x) => c.toNumber() * x + d.toNumber(), cls: 'd-line2' }], points: [...good2.map((r) => ({ x: r.x, y: f(r.x), label: 'solution', cls: 'd-foot' })), ...rej.map((r) => ({ x: r.x, y: c.toNumber() * r.x + d.toNumber(), label: 'rejected', cls: 'd-point3' }))] }), legend: '<div class="legend"><span><i></i>√(ax + b)</span><span><i class="l2"></i>cx + d</span></div>', caption: rej.length ? 'A rejected root is where the line meets the lower half of the squared curve, which the square root never reaches.' : 'Solutions are where the root curve meets the line.' },
      formula: ['\\sqrt{u} = v \\;\\Rightarrow\\; u = v^2 \\quad\\text{(then check } v \\ge 0\\text{)}'],
    };
  }
}

function solveRational(values) {
  const v = validator(values);
  const ls = v.text('lhs', 'the left side'), rs = v.text('rhs', 'the right side');
  if (!v.ok()) return v.result();
  let L, Rn, NL, DL, NR, DR;
  try {
    L = parse(ls); Rn = parse(rs);
    // the unsimplified parse keeps every denominator (0/(x − 3) still excludes x = 3)
    [NL, DL] = toRational(parse(ls, { raw: true })); [NR, DR] = toRational(parse(rs, { raw: true }));
  } catch (e) {
    if (e instanceof ExprError) return { ok: false, errors: [{ field: 'lhs', message: e.message }] };
    throw e;
  }
  if (isZeroPoly(DL) || isZeroPoly(DR)) return { ok: false, errors: [{ field: 'lhs', message: 'A denominator is 0 for every x. Check the expression.' }] };
  // excluded values come from every original denominator (DL·DR, unreduced)
  const Dall = polyTrim(polyMul(DL, DR));
  // reduce each side, then multiply by the least common denominator, as done by hand
  const reduce = (N, D) => { const G = polyGcd(N, D); return degree(G) >= 1 ? [polyDivide(N, G).q, polyDivide(D, G).q] : [N, D]; };
  [NL, DL] = isZeroPoly(NL) ? [NL, [ONE]] : reduce(NL, DL); [NR, DR] = isZeroPoly(NR) ? [NR, [ONE]] : reduce(NR, DR);
  const Gd = polyGcd(DL, DR), LCD = degree(Gd) >= 1 ? polyTrim(polyMul(polyDivide(DL, Gd).q, DR)) : polyTrim(polyMul(DL, DR));
  const mL = polyDivide(LCD, DL).q, mR = polyDivide(LCD, DR).q;
  const P = polyTrim(polyAdd(polyMul(NL, mL), polyMul(NR, mR).map((q) => q.neg())));
  if (degree(P) > 8) return { ok: false, errors: [{ field: 'lhs', message: 'After clearing denominators the equation has degree above 8. Please enter a simpler equation.' }] };
  const excluded = degree(Dall) >= 1 ? realRoots(Dall).filter((r, i, arr) => i === 0 || Math.abs(r.x - arr[i - 1].x) > 1e-9) : [];
  const steps = [
    { title: 'Write the equation', tex: `${texOf(L)} = ${texOf(Rn)}` },
    { title: 'Excluded values', tex: excluded.length ? `x \\ne ${excluded.map(valTex).join(',\\ ')}` : '\\text{no denominator can be 0}', note: 'A fraction is not defined where its denominator is 0, so these values can never be solutions, even if they turn up later.' },
    { title: 'Write each side as a single fraction', tex: `${frac(NL, DL)} = ${frac(NR, DR)}`, note: 'Combine the terms on each side over a common denominator and cancel any common factor.' },
    { title: 'Multiply both sides by the least common denominator', texLines: [`\\text{LCD} = ${factoredTex(LCD)}`, `${mul(NL, mL)} = ${mul(NR, mR)}`, `${polyTex(P)} = 0`], note: 'This clears the fractions and leaves a polynomial equation. It is only equivalent to the original where the LCD is not 0, which is why the candidates are checked against the excluded values.' },
  ];
  if (degree(P) < 1) {
    const all = isZeroPoly(P);
    steps.push({ title: all ? 'The equation holds for every allowed x' : 'No x remains', text: all ? 'Both sides are the same expression wherever they are defined.' : `The equation reduces to ${P[0]} = 0, which is false.` });
    return { ok: true, final: { text: all ? `Every real number except the excluded values is a solution.` : 'No solution.' }, answers: [{ label: 'Number of solutions', value: all ? 'infinitely many' : '0', primary: true }, { label: 'Excluded values', value: excluded.map((r) => fmt(r.x)).join(', ') || 'none', copy: '' }], steps, formula: ['\\frac{A}{B} = \\frac{C}{D} \\;\\Rightarrow\\; AD = BC \\quad (B, D \\ne 0)'] };
  }
  const cand = realRoots(P);
  steps.push({ title: 'Solve the polynomial equation', tex: cand.length ? `x = ${cand.map(valTex).join(',\\ ')}` : '\\text{no real roots}', note: degree(P) === 1 ? 'It is linear: isolate x.' : 'Factor it (rational roots first), or use the quadratic formula for what is left.' });
  const good = [], rejected = [];
  const lf = (x) => evalNum(NL, x) / evalNum(DL, x), rf = (x) => evalNum(NR, x) / evalNum(DR, x);
  const lines = cand.map((r) => {
    const bad = r.f ? polyEvalFrac(Dall, r.f).isZero() : Math.abs(evalNum(Dall, r.x)) < 1e-9;
    (bad ? rejected : good).push(r);
    if (bad) return `x = ${valTex(r)}: \\quad \\text{a denominator is 0} \\quad \\text{rejected}`;
    const lv = r.f ? polyEvalFrac(NL, r.f).div(polyEvalFrac(DL, r.f)) : null, rv = r.f ? polyEvalFrac(NR, r.f).div(polyEvalFrac(DR, r.f)) : null;
    return `x = ${valTex(r)}: \\quad \\text{left} ${lv ? `= ${lv.toTex()}` : `\\approx ${fmt(lf(r.x))}`}, \\quad \\text{right} ${rv ? `= ${rv.toTex()}` : `\\approx ${fmt(rf(r.x))}`} \\quad \\checkmark`;
  });
  if (cand.length) steps.push({ title: 'Check each candidate', texLines: lines, note: rejected.length ? `x = ${rejected.map((r) => fmt(r.x)).join(' and x = ')} is an excluded value, so it is an extraneous root: it came from multiplying by an expression that is 0 there.` : 'No candidate makes a denominator 0, and both sides agree.' });
  const xs = [...cand.map((r) => r.x), ...excluded.map((r) => r.x)];
  const lo = Math.min(-5, ...xs) - 2, hi = Math.max(5, ...xs) + 2;
  return {
    ok: true,
    final: good.length ? { tex: good.map((r) => `x = ${valTex(r)}`).join(' \\quad\\text{or}\\quad ') } : { text: 'No solution: every candidate is an excluded value.' },
    answers: [
      { label: 'Number of solutions', value: String(good.length), primary: true },
      ...good.map((r, i) => ({ label: `Solution x${good.length > 1 ? ['₁', '₂', '₃', '₄', '₅', '₆'][i] : ''}`, value: fmt(r.x), approx: !r.f || !r.f.toDecimal(8), exactTex: r.f && r.f.isInt() ? undefined : valTex(r), primary: true })),
      { label: 'Rejected (extraneous)', value: rejected.length ? rejected.map((r) => fmt(r.x)).join(', ') : 'none', copy: '' },
      { label: 'Excluded values', value: excluded.map((r) => fmt(r.x)).join(', ') || 'none', copy: '' },
      { label: 'Boundary points', value: good.map((r) => fmt(r.x)).join(', ') || 'none', copy: '' },
    ],
    steps,
    visual: { svg: plot({ x: [lo, hi], width: 380, height: 280, title: 'Both sides of the equation', curves: [{ f: lf, cls: 'd-line', samples: 900 }, { f: rf, cls: 'd-line2', samples: 900 }], vlines: excluded.map((r) => ({ x: r.x, cls: 'd-line3' })), points: good.map((r) => ({ x: r.x, y: lf(r.x), label: 'solution', cls: 'd-foot' })) }), legend: '<div class="legend"><span><i></i>Left side</span><span><i class="l2"></i>Right side</span><span><i class="l3"></i>Excluded value</span></div>', caption: 'Solutions are where the two graphs meet. Dashed lines mark excluded values, where a side is not defined.' },
    formula: ['\\frac{A}{B} = \\frac{C}{D} \\;\\Rightarrow\\; AD = BC \\quad (B, D \\ne 0)'],
  };
}
