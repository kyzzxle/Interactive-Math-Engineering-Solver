/**
 * Absolute value equations and inequalities with exact fractions:
 *   |ax + b| = k                 two cases ax + b = ±k (none if k < 0)
 *   |ax + b| = cx + d            two cases, then reject candidates with cx + d < 0
 *   |ax + b| = |cx + d|          ax + b = ±(cx + d)
 *   |ax + b| < k, ≤, >, ≥        between or outside the two boundary points
 */
import { validator, fracAnswer, fp } from '../lib/calc-kit.js';
import { Frac } from '../lib/fraction.js';
import { linearTex, linearText } from '../lib/lines.js';
import { plot } from '../lib/plot.js';
import { absExplore, absPractice } from '../explore/algebra-new.js';

const F = (x) => Frac.of(x);
const lin = (a, b) => linearTex([[a, 'x'], [b, '']]);
const linT = (a, b) => linearText([[a, 'x'], [b, '']]);
const OPS = { lt: ['<', '\\lt'], le: ['≤', '\\le'], gt: ['>', '\\gt'], ge: ['≥', '\\ge'] };
const sortF = (list) => list.slice().sort((p, q) => p.cmp(q));
const uniqF = (list) => sortF(list).filter((f, i, arr) => i === 0 || !f.eq(arr[i - 1]));

export const calculator = {
  id: 'absolute-value-equations',
  explore: absExplore,
  practice: absPractice,
  fields: [
    { name: 'mode', label: 'Type of problem', type: 'select', options: [['eq', '|ax + b| = k'], ['abslin', '|ax + b| = cx + d'], ['absabs', '|ax + b| = |cx + d|'], ['ineq', '|ax + b| < k, ≤, > or ≥']] },
    { name: 'a', label: 'a', type: 'number', placeholder: 'e.g. 2', row: 'ab' },
    { name: 'b', label: 'b', type: 'number', placeholder: 'e.g. -3', row: 'ab' },
    { name: 'op', label: 'Sign', type: 'select', options: [['lt', '<'], ['le', '≤'], ['gt', '>'], ['ge', '≥']], showWhen: { mode: ['ineq'] }, row: 'k' },
    { name: 'k', label: 'Right side k', type: 'number', placeholder: 'e.g. 7', showWhen: { mode: ['eq', 'ineq'] }, row: 'k' },
    { name: 'c', label: 'c', type: 'number', placeholder: 'e.g. 1', showWhen: { mode: ['abslin', 'absabs'] }, row: 'cd', rowShowWhen: { mode: ['abslin', 'absabs'] } },
    { name: 'd', label: 'd', type: 'number', placeholder: 'e.g. 3', showWhen: { mode: ['abslin', 'absabs'] }, row: 'cd' },
  ],
  examples: [
    { label: '|2x − 3| = 7', values: { mode: 'eq', a: '2', b: '-3', k: '7' } },
    { label: '|x − 4| = 2x + 1 (one root rejected)', values: { mode: 'abslin', a: '1', b: '-4', c: '2', d: '1' } },
    { label: '|3x + 1| = |x − 5|', values: { mode: 'absabs', a: '3', b: '1', c: '1', d: '-5' } },
    { label: '|2x − 1| < 5', values: { mode: 'ineq', a: '2', b: '-1', op: 'lt', k: '5' } },
    { label: '|x + 2| ≥ 3', values: { mode: 'ineq', a: '1', b: '2', op: 'ge', k: '3' } },
    { label: 'No solution: |x − 1| = −4', values: { mode: 'eq', a: '1', b: '-1', k: '-4' } },
  ],
  solve(values) {
    const v = validator(values);
    const mode = ['eq', 'abslin', 'absabs', 'ineq'].includes(values.mode) ? values.mode : 'eq';
    const a = v.frac('a', 'a'), b = v.frac('b', 'b');
    let k, c, d;
    if (mode === 'eq' || mode === 'ineq') k = v.frac('k', 'the right side k'); else { c = v.frac('c', 'c'); d = v.frac('d', 'd'); }
    if (!v.ok()) return v.result();
    if (a.isZero()) return { ok: false, errors: [{ field: 'a', message: 'a cannot be 0: the absolute value would not contain x. Enter a non-zero coefficient.' }] };
    if (mode === 'eq') return solveEq(a, b, k);
    if (mode === 'abslin') return solveAbsLin(a, b, c, d);
    if (mode === 'absabs') {
      if (c.isZero() && d.isZero()) return solveEq(a, b, F(0));
      return solveAbsAbs(a, b, c, d);
    }
    return solveIneq(a, b, k, values.op in OPS ? values.op : 'lt');
  },
};

function graph({ a, b, right, sols = [], intervals = [], title }) {
  const an = a.toNumber(), bn = b.toNumber(), v = -bn / an;
  const xs = [v, ...sols.map((s) => s.toNumber()), ...intervals.flat().filter(Number.isFinite)];
  const lo = Math.min(...xs) - 4, hi = Math.max(...xs) + 4;
  const f = (x) => Math.abs(an * x + bn);
  const ys = [0, ...sols.map((s) => f(s.toNumber())), right(lo), right(hi), f(lo), f(hi)].filter(Number.isFinite);
  const ymax = Math.min(Math.max(...ys, 4) * 1.15, Math.max(8, Math.max(...sols.map((s) => f(s.toNumber())), 4) * 2.2));
  return plot({
    x: [lo, hi], y: [Math.min(-1.5, Math.min(...ys) - 1), ymax], width: 380, height: 280, title,
    curves: [{ f, cls: 'd-line', samples: 600 }, { f: right, cls: 'd-line2', samples: 600 }],
    segments: intervals.map(([p, q]) => ({ x1: Math.max(p, lo), y1: 0, x2: Math.min(q, hi), y2: 0, cls: 'd-line3' })),
    points: [{ x: v, y: 0, label: 'vertex', cls: 'd-point2' }, ...sols.map((s, i) => ({ x: s.toNumber(), y: f(s.toNumber()), label: `x${sols.length > 1 ? i + 1 : ''}`, cls: 'd-foot' }))],
  });
}
const LEGEND = '<div class="legend"><span><i></i>Left side |ax + b|</span><span><i class="l2"></i>Right side</span></div>';
const solAnswers = (sols) => [
  { label: 'Number of solutions', value: String(sols.length), primary: true },
  ...sols.map((s, i) => fracAnswer(`Solution x${sols.length > 1 ? ['₁', '₂'][i] : ''}`, s, { primary: true })),
  ...(sols.length ? [{ label: 'Boundary points', value: sols.map((s) => s.toDecimal(8) || String(+s.toNumber().toFixed(6))).join(', '), copy: '' }] : []),
];
const checkLines = (a, b, sols, rightTex) => sols.map((s) => `\\left|${fp(a)}\\left(${s.toTex()}\\right) ${b.sign() < 0 ? '-' : '+'} ${b.abs().toTex()}\\right| = ${a.mul(s).add(b).abs().toTex()} = ${rightTex(s)}\\ \\checkmark`);

function solveEq(a, b, k) {
  const L = lin(a, b);
  const steps = [{ title: 'Write the equation', tex: `\\left|${L}\\right| = ${k.toTex()}`, note: 'An absolute value is a distance from 0, so it can never be negative.' }];
  if (k.sign() < 0) {
    steps.push({ title: 'The right side is negative', text: `|${linT(a, b)}| is never negative, so it can never equal ${k}. There is no solution.` });
    return { ok: true, final: { text: 'No solution: an absolute value cannot equal a negative number.' }, answers: [{ label: 'Number of solutions', value: '0', primary: true }], steps, visual: { svg: graph({ a, b, right: () => k.toNumber(), title: 'The V never reaches the line y = k' }), legend: LEGEND, caption: 'The whole V-shaped graph is on or above the x-axis, so it never meets a line below it.' }, formula: ['|u| = k \\iff u = k \\ \\text{or}\\ u = -k \\quad (k \\ge 0)'] };
  }
  let sols;
  if (k.isZero()) {
    const x = b.neg().div(a);
    steps.push({ title: 'The right side is 0', tex: `${L} = 0 \\;\\Rightarrow\\; x = ${x.toTex()}`, note: 'Only 0 has absolute value 0, so there is just one case.' });
    sols = [x];
  } else {
    const x1 = k.sub(b).div(a), x2 = k.neg().sub(b).div(a);
    steps.push({ title: 'Split into two cases', texLines: [`${L} = ${k.toTex()} \\quad\\text{or}\\quad ${L} = ${k.neg().toTex()}`], note: `The expression inside is either ${k} units above 0 or ${k} units below 0.` });
    steps.push({ title: 'Case 1', texLines: [`${a.isOne() ? '' : a.toTex()}x = ${k.toTex()} - ${fp(b)} = ${k.sub(b).toTex()}`, `x = ${x1.toTex()}`] });
    steps.push({ title: 'Case 2', texLines: [`${a.isOne() ? '' : a.toTex()}x = ${k.neg().toTex()} - ${fp(b)} = ${k.neg().sub(b).toTex()}`, `x = ${x2.toTex()}`] });
    sols = sortF([x1, x2]);
  }
  steps.push({ title: 'Check', texLines: checkLines(a, b, sols, () => k.toTex()), note: 'Both values satisfy the original equation.' });
  return {
    ok: true,
    final: { tex: sols.length === 1 ? `x = ${sols[0].toTex()}` : `x = ${sols[0].toTex()} \\quad\\text{or}\\quad x = ${sols[1].toTex()}` },
    answers: solAnswers(sols), steps,
    visual: { svg: graph({ a, b, right: () => k.toNumber(), sols, title: 'Where the V meets the line y = k' }), legend: LEGEND, caption: 'The solutions are the x-values where the V-shaped graph of |ax + b| meets the horizontal line y = k.' },
    formula: ['|u| = k \\iff u = k \\ \\text{or}\\ u = -k \\quad (k \\ge 0)'],
  };
}

function solveAbsLin(a, b, c, d) {
  const L = lin(a, b), Rt = lin(c, d);
  const steps = [{ title: 'Write the equation', tex: `\\left|${L}\\right| = ${Rt}`, note: 'The left side is never negative, so any solution must make the right side 0 or positive. Candidates that make it negative are extraneous.' }];
  const cand = [];
  let identity = null;
  for (const [name, A, B] of [['Case 1: the inside is positive', a.sub(c), d.sub(b)], ['Case 2: the inside is negative', a.add(c), d.add(b).neg()]]) {
    const eqTex = name.startsWith('Case 1') ? `${L} = ${Rt}` : `${L} = -\\left(${Rt}\\right)`;
    if (A.isZero()) {
      if (B.isZero()) { identity = name; steps.push({ title: name, tex: eqTex, text: 'This case holds for every x, so every x with cx + d ≥ 0 is a solution.' }); }
      else steps.push({ title: name, tex: eqTex, text: `The x-terms cancel and leave 0 = ${B}, which is false: no solution from this case.` });
      continue;
    }
    const x = B.div(A);
    steps.push({ title: name, texLines: [eqTex, `${A.isOne() ? '' : A.toTex()}x = ${B.toTex()} \\;\\Rightarrow\\; x = ${x.toTex()}`] });
    cand.push(x);
  }
  if (identity) {
    const x0 = d.neg().div(c);
    const set = c.sign() > 0 ? `x \\ge ${x0.toTex()}` : `x \\le ${x0.toTex()}`;
    steps.push({ title: 'Solution set', tex: set, note: 'The right side cx + d must be 0 or positive for the equation to hold.' });
    return { ok: true, final: { tex: set }, answers: [{ label: 'Solution set', valueTex: set, primary: true, copy: '' }, { label: 'Number of solutions', value: 'infinitely many', primary: true }], steps, visual: { svg: graph({ a, b, right: (x) => c.toNumber() * x + d.toNumber(), intervals: [c.sign() > 0 ? [x0.toNumber(), Infinity] : [-Infinity, x0.toNumber()]], title: 'The graphs coincide on part of the line' }), legend: LEGEND, caption: 'On the thick part of the axis the two sides are equal.' }, formula: ['|u| = v \\iff (u = v \\ \\text{or}\\ u = -v) \\ \\text{and}\\ v \\ge 0'] };
  }
  const all = uniqF(cand);
  const ok = all.filter((x) => c.mul(x).add(d).sign() >= 0);
  const rejected = all.filter((x) => c.mul(x).add(d).sign() < 0);
  steps.push({ title: 'Check each candidate in the original equation', texLines: all.map((x) => { const r = c.mul(x).add(d); return `x = ${x.toTex()}: \\quad \\left|${L.replace(/x/g, `\\left(${x.toTex()}\\right)`)}\\right| = ${a.mul(x).add(b).abs().toTex()}, \\quad ${Rt.replace(/x/g, `\\left(${x.toTex()}\\right)`)} = ${r.toTex()} \\quad ${r.sign() >= 0 ? '\\checkmark' : '\\text{rejected}'}`; }), note: rejected.length ? `x = ${rejected.join(' and x = ')} makes the right side negative, so it cannot equal an absolute value. It is an extraneous solution.` : 'Every candidate keeps the right side 0 or positive, so all of them are solutions.' });
  return {
    ok: true,
    final: ok.length ? { tex: ok.map((x) => `x = ${x.toTex()}`).join(' \\quad\\text{or}\\quad ') } : { text: 'No solution: every candidate is extraneous.' },
    answers: [...solAnswers(ok), ...(rejected.length ? [{ label: 'Rejected (extraneous)', value: rejected.map((x) => `x = ${x}`).join(', '), copy: '' }] : [])],
    steps,
    visual: { svg: graph({ a, b, right: (x) => c.toNumber() * x + d.toNumber(), sols: ok, title: 'Where the V meets the line y = cx + d' }), legend: LEGEND, caption: rejected.length ? 'The rejected candidate is where the V would meet the reflection of the line below the axis, not the line itself.' : 'The solutions are where the V meets the line.' },
    formula: ['|u| = v \\iff (u = v \\ \\text{or}\\ u = -v) \\ \\text{and}\\ v \\ge 0'],
  };
}

function solveAbsAbs(a, b, c, d) {
  const L = lin(a, b), Rt = lin(c, d);
  const steps = [{ title: 'Write the equation', tex: `\\left|${L}\\right| = \\left|${Rt}\\right|`, note: 'Two numbers have the same absolute value exactly when they are equal or opposite.' }];
  const cand = [];
  for (const [name, A, B, eqTex] of [['Case 1: equal', a.sub(c), d.sub(b), `${L} = ${Rt}`], ['Case 2: opposite', a.add(c), d.add(b).neg(), `${L} = -\\left(${Rt}\\right)`]]) {
    if (A.isZero()) {
      if (B.isZero()) {
        steps.push({ title: name, tex: eqTex, text: 'This holds for every x: the two expressions always have the same absolute value.' });
        return { ok: true, final: { text: 'Every real number is a solution.' }, answers: [{ label: 'Number of solutions', value: 'infinitely many (all real numbers)', primary: true }], steps, visual: { svg: graph({ a, b, right: (x) => Math.abs(c.toNumber() * x + d.toNumber()), title: 'The two graphs are the same' }), legend: LEGEND, caption: 'The two V shapes coincide.' }, formula: ['|u| = |v| \\iff u = v \\ \\text{or}\\ u = -v'] };
      }
      steps.push({ title: name, tex: eqTex, text: `The x-terms cancel and leave 0 = ${B}: no solution from this case.` });
      continue;
    }
    const x = B.div(A);
    steps.push({ title: name, texLines: [eqTex, `${A.isOne() ? '' : A.toTex()}x = ${B.toTex()} \\;\\Rightarrow\\; x = ${x.toTex()}`] });
    cand.push(x);
  }
  const sols = uniqF(cand);
  steps.push({ title: 'Check', texLines: checkLines(a, b, sols, (s) => `\\left|${Rt.replace(/x/g, `\\left(${s.toTex()}\\right)`)}\\right|`), note: 'Squaring both sides, (ax + b)² = (cx + d)², gives the same solutions, so no candidate is extraneous here.' });
  return {
    ok: true,
    final: { tex: sols.map((x) => `x = ${x.toTex()}`).join(' \\quad\\text{or}\\quad ') },
    answers: solAnswers(sols), steps,
    visual: { svg: graph({ a, b, right: (x) => Math.abs(c.toNumber() * x + d.toNumber()), sols, title: 'Where the two V shapes cross' }), legend: LEGEND, caption: 'The solutions are where the two V-shaped graphs cross.' },
    formula: ['|u| = |v| \\iff u = v \\ \\text{or}\\ u = -v'],
  };
}

function solveIneq(a, b, k, op) {
  const L = lin(a, b), [sym, symTex] = OPS[op];
  const less = op === 'lt' || op === 'le', strict = op === 'lt' || op === 'gt';
  const steps = [{ title: 'Write the inequality', tex: `\\left|${L}\\right| ${symTex} ${k.toTex()}`, note: less ? '|u| < k means u is less than k units from 0: it lies between −k and k.' : '|u| > k means u is more than k units from 0: it lies beyond −k or beyond k.' }];
  const v0 = b.neg().div(a);
  const done = (setTex, intervalTex, intervals, text) => ({
    ok: true, final: { texLines: [setTex, `\\text{Interval notation: } ${intervalTex}`] },
    answers: [{ label: 'Solution set', valueTex: setTex, primary: true, copy: text || '' }, { label: 'Interval notation', valueTex: intervalTex, primary: true, copy: '' }],
    steps,
    visual: { svg: graph({ a, b, right: () => k.toNumber(), intervals, title: `Where |ax + b| ${sym} k` }), legend: LEGEND, caption: 'The thick part of the x-axis is the solution set: where the V is below (or above) the line y = k.' },
    formula: ['|u| < k \\iff -k < u < k \\qquad |u| > k \\iff u < -k \\ \\text{or}\\ u > k'],
  });
  if (k.sign() < 0 || (k.isZero() && op !== 'le')) {
    const always = !less || (k.isZero() && op === 'ge');
    const allBut = k.isZero() && op === 'gt';
    if (allBut) {
      steps.push({ title: 'Compare with 0', text: `|${linT(a, b)}| > 0 everywhere except where the inside is 0.`, tex: `x \\ne ${v0.toTex()}` });
      return done(`x \\ne ${v0.toTex()}`, `\\left(-\\infty,\\ ${v0.toTex()}\\right) \\cup \\left(${v0.toTex()},\\ \\infty\\right)`, [[-Infinity, v0.toNumber()], [v0.toNumber(), Infinity]]);
    }
    steps.push({ title: k.sign() < 0 ? 'The right side is negative' : 'Compare with 0', text: always ? 'An absolute value is always 0 or more, so this is true for every x.' : 'An absolute value is never negative, so this is never true.' });
    return always ? done('x \\in \\mathbb{R}', '\\left(-\\infty,\\ \\infty\\right)', [[-Infinity, Infinity]]) : done('\\varnothing', '\\varnothing', [], 'no solution');
  }
  if (k.isZero()) { steps.push({ title: 'Only 0 has absolute value 0', tex: `${L} = 0 \\;\\Rightarrow\\; x = ${v0.toTex()}` }); return done(`x = ${v0.toTex()}`, `\\{${v0.toTex()}\\}`, [[v0.toNumber(), v0.toNumber()]]); }
  const p = k.neg().sub(b).div(a), q = k.sub(b).div(a);
  const [lo, hi] = sortF([p, q]);
  steps.push({ title: less ? 'Write it as a double inequality' : 'Split into two inequalities', tex: less ? `${k.neg().toTex()} ${symTex} ${L} ${symTex} ${k.toTex()}` : `${L} ${strict ? '\\lt' : '\\le'} ${k.neg().toTex()} \\quad\\text{or}\\quad ${L} ${symTex} ${k.toTex()}` });
  steps.push({ title: 'Solve for x', texLines: [`\\text{boundary points: } x = \\frac{${k.neg().toTex()} - ${fp(b)}}{${a.toTex()}} = ${p.toTex()}, \\quad x = \\frac{${k.toTex()} - ${fp(b)}}{${a.toTex()}} = ${q.toTex()}`], note: a.sign() < 0 ? 'a is negative, so dividing by it reverses the inequality signs; the boundary points swap places.' : 'Subtract b from every part, then divide by a.' });
  const L1 = strict ? '\\lt' : '\\le', bL = strict ? '(' : '[', bR = strict ? ')' : ']';
  const setTex = less ? `${lo.toTex()} ${L1} x ${L1} ${hi.toTex()}` : `x ${strict ? '\\lt' : '\\le'} ${lo.toTex()} \\ \\text{or}\\ x ${strict ? '\\gt' : '\\ge'} ${hi.toTex()}`;
  const iv = less ? `\\left${bL}${lo.toTex()},\\ ${hi.toTex()}\\right${bR}` : `\\left(-\\infty,\\ ${lo.toTex()}\\right${bR} \\cup \\left${bL}${hi.toTex()},\\ \\infty\\right)`;
  const mid = lo.add(hi).div(2), out = hi.add(1);
  const val = (x) => a.mul(x).add(b).abs();
  steps.push({ title: 'Check with test points', texLines: [`x = ${mid.toTex()}: \\ \\left|${L.replace(/x/g, `\\left(${mid.toTex()}\\right)`)}\\right| = ${val(mid).toTex()} \\;\\Rightarrow\\; ${less ? '\\text{inside the set} \\checkmark' : '\\text{not in the set} \\checkmark'}`, `x = ${out.toTex()}: \\ \\left|${L.replace(/x/g, `\\left(${out.toTex()}\\right)`)}\\right| = ${val(out).toTex()} \\;\\Rightarrow\\; ${less ? '\\text{not in the set} \\checkmark' : '\\text{inside the set} \\checkmark'}`], note: `A point between the boundaries gives a value below ${k}; a point outside gives a value above ${k}.` });
  return { ...done(setTex, iv, less ? [[lo.toNumber(), hi.toNumber()]] : [[-Infinity, lo.toNumber()], [hi.toNumber(), Infinity]]), answers: [{ label: 'Solution set', valueTex: setTex, primary: true, copy: '' }, { label: 'Interval notation', valueTex: iv, primary: true, copy: '' }, { label: 'Boundary points', value: [lo, hi].map((s) => s.toDecimal(8) || String(+s.toNumber().toFixed(6))).join(', '), copy: '' }] };
}
