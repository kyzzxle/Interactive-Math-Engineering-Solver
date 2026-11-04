/**
 * Variation and proportion.
 *   variation:  y = k xⁿ (direct), y = k / xⁿ (inverse), y = k xⁿ wᵐ (joint), y = k xⁿ / wᵐ (combined).
 *               One known set of values gives k; then y for new values. Exact for whole-number powers.
 *   proportion: a : b = c : x (fourth proportional), mean proportional √(ab), third proportional b²/a.
 *   divide:     share a total T in the ratio r₁ : r₂ (: r₃).
 */
import { validator, fp, fmt, tx } from '../lib/calc-kit.js';
import { Frac } from '../lib/fraction.js';
import { simplifySqrt } from '../lib/exact.js';
import { sqrtFrac } from '../lib/calc-kit.js';
import { plot } from '../lib/plot.js';
import { variationExplore, variationPractice } from '../explore/algebra-new.js';

const F = (x) => Frac.of(x);
const POW = [['1', 'first power'], ['2', 'square'], ['3', 'cube'], ['1/2', 'square root']];
const powTex = (b, n) => (n === '1' ? b : n === '1/2' ? `\\sqrt{${b}}` : `${b}^{${n}}`);
/** Exact power for whole-number exponents, else a number. */
const pw = (f, n) => (n === '1/2' ? (() => { const s = sqrtFrac(f, simplifySqrt); return s.exact ? F(s.text) : s.value; })() : f.pow(Number(n)));
const num = (q) => (q instanceof Frac ? q.toNumber() : q);
const tex = (q) => (q instanceof Frac ? q.toTex() : tx(q));
const mul = (p, q) => (p instanceof Frac && q instanceof Frac ? p.mul(q) : num(p) * num(q));
const dv = (p, q) => (p instanceof Frac && q instanceof Frac ? p.div(q) : num(p) / num(q));
const KINDS = {
  direct: { label: 'y varies directly as', law: (n) => `y = k\\,${powTex('x', n)}`, two: false },
  inverse: { label: 'y varies inversely as', law: (n) => `y = \\frac{k}{${powTex('x', n)}}`, two: false },
  joint: { label: 'y varies jointly as', law: (n, m) => `y = k\\,${powTex('x', n)}\\,${powTex('w', m)}`, two: true },
  combined: { label: 'y varies directly as x and inversely as w', law: (n, m) => `y = \\frac{k\\,${powTex('x', n)}}{${powTex('w', m)}}`, two: true },
};

export const calculator = {
  id: 'variation-proportion',
  explore: variationExplore,
  practice: variationPractice,
  fields: [
    { name: 'mode', label: 'Problem', type: 'radio', options: [['variation', 'Variation (find k, then y)'], ['proportion', 'Proportion'], ['divide', 'Divide in a ratio']] },
    { name: 'kind', label: 'Type of variation', type: 'select', options: [['direct', 'Direct: y = k·xⁿ'], ['inverse', 'Inverse: y = k / xⁿ'], ['joint', 'Joint: y = k·xⁿ·wᵐ'], ['combined', 'Combined: y = k·xⁿ / wᵐ']], showWhen: { mode: ['variation'] } },
    { name: 'n', label: 'Power of x', type: 'select', options: POW.map(([v, l]) => [v, `${v === '1/2' ? '½' : v} (${l})`]), showWhen: { mode: ['variation'] }, row: 'pw' },
    { name: 'm', label: 'Power of w', type: 'select', options: POW.map(([v, l]) => [v, `${v === '1/2' ? '½' : v} (${l})`]), showWhen: { mode: ['variation'], kind: ['joint', 'combined'] }, row: 'pw' },
    { name: 'x1', label: 'Known x', type: 'number', placeholder: 'e.g. 2', row: 'k1', showWhen: { mode: ['variation'] }, rowShowWhen: { mode: ['variation'] } },
    { name: 'w1', label: 'Known w', type: 'number', placeholder: 'e.g. 3', row: 'k1', showWhen: { mode: ['variation'], kind: ['joint', 'combined'] } },
    { name: 'y1', label: 'Known y', type: 'number', placeholder: 'e.g. 12', row: 'k1', showWhen: { mode: ['variation'] } },
    { name: 'x2', label: 'New x', type: 'number', placeholder: 'e.g. 5', row: 'k2', showWhen: { mode: ['variation'] }, rowShowWhen: { mode: ['variation'] } },
    { name: 'w2', label: 'New w', type: 'number', placeholder: 'e.g. 4', row: 'k2', showWhen: { mode: ['variation'], kind: ['joint', 'combined'] } },
    { name: 'ptype', label: 'Find', type: 'select', options: [['fourth', 'Fourth proportional: a : b = c : x'], ['mean', 'Mean proportional: a : x = x : b'], ['third', 'Third proportional: a : b = b : x']], showWhen: { mode: ['proportion'] } },
    { name: 'pa', label: 'a', type: 'number', placeholder: 'e.g. 3', row: 'pr', showWhen: { mode: ['proportion'] }, rowShowWhen: { mode: ['proportion'] } },
    { name: 'pb', label: 'b', type: 'number', placeholder: 'e.g. 5', row: 'pr', showWhen: { mode: ['proportion'] } },
    { name: 'pc', label: 'c', type: 'number', placeholder: 'e.g. 12', row: 'pr', showWhen: { mode: ['proportion'], ptype: ['fourth'] } },
    { name: 'T', label: 'Total to share', type: 'number', placeholder: 'e.g. 1200', showWhen: { mode: ['divide'] } },
    { name: 'r1', label: 'Ratio part 1', type: 'number', placeholder: 'e.g. 2', row: 'rt', showWhen: { mode: ['divide'] }, rowShowWhen: { mode: ['divide'] } },
    { name: 'r2', label: 'Part 2', type: 'number', placeholder: 'e.g. 3', row: 'rt', showWhen: { mode: ['divide'] } },
    { name: 'r3', label: 'Part 3 (optional)', type: 'number', placeholder: 'e.g. 5', row: 'rt', showWhen: { mode: ['divide'] } },
  ],
  examples: [
    { label: 'Direct square: y = 12 at x = 2; y at x = 5', values: { mode: 'variation', kind: 'direct', n: '2', x1: '2', y1: '12', x2: '5' } },
    { label: 'Inverse: y = 8 at x = 3; y at x = 6', values: { mode: 'variation', kind: 'inverse', n: '1', x1: '3', y1: '8', x2: '6' } },
    { label: 'Combined: z ∝ x / w²', values: { mode: 'variation', kind: 'combined', n: '1', m: '2', x1: '6', w1: '2', y1: '9', x2: '10', w2: '5' } },
    { label: 'Fourth proportional 3 : 5 = 12 : x', values: { mode: 'proportion', ptype: 'fourth', pa: '3', pb: '5', pc: '12' } },
    { label: 'Mean proportional of 4 and 9', values: { mode: 'proportion', ptype: 'mean', pa: '4', pb: '9' } },
    { label: 'Share 1200 in the ratio 2 : 3 : 5', values: { mode: 'divide', T: '1200', r1: '2', r2: '3', r3: '5' } },
  ],
  solve(values) {
    if (values.mode === 'proportion') return solveProportion(values);
    if (values.mode === 'divide') return solveDivide(values);
    return solveVariation(values);
  },
};

function solveVariation(values) {
  const v = validator(values);
  const kind = KINDS[values.kind] ? values.kind : 'direct', K = KINDS[kind];
  const n = POW.some(([p]) => p === values.n) ? values.n : '1', m = POW.some(([p]) => p === values.m) ? values.m : '1';
  const x1 = v.frac('x1', 'the known x'), y1 = v.frac('y1', 'the known y'), x2 = v.frac('x2', 'the new x');
  const w1 = K.two ? v.frac('w1', 'the known w') : null, w2 = K.two ? v.frac('w2', 'the new w') : null;
  if (!v.ok()) return v.result();
  for (const [name, f] of [['x1', x1], ['x2', x2], ['w1', w1], ['w2', w2]]) {
    if (!f) continue;
    if ((kind === 'inverse' || (kind === 'combined' && name.startsWith('w'))) && f.isZero()) return { ok: false, errors: [{ field: name, message: 'This value is in a denominator, so it cannot be 0.' }] };
    if ((n === '1/2' && name.startsWith('x') && f.sign() < 0) || (m === '1/2' && name.startsWith('w') && f.sign() < 0)) return { ok: false, errors: [{ field: name, message: 'A square root needs a value of 0 or more.' }] };
  }
  const X1 = pw(x1, n), X2 = pw(x2, n), W1 = K.two ? pw(w1, m) : null, W2 = K.two ? pw(w2, m) : null;
  const factor1 = kind === 'direct' ? X1 : kind === 'inverse' ? dv(F(1), X1) : kind === 'joint' ? mul(X1, W1) : dv(X1, W1);
  const factor2 = kind === 'direct' ? X2 : kind === 'inverse' ? dv(F(1), X2) : kind === 'joint' ? mul(X2, W2) : dv(X2, W2);
  if (num(factor1) === 0) return { ok: false, errors: [{ field: 'x1', message: 'With these known values the variable part is 0, so k cannot be found. Choose a known x (and w) that is not 0.' }] };
  const k = dv(y1, factor1), y2 = mul(k, factor2);
  const sub = (x, w) => (kind === 'direct' ? `${powTex(fp(x), n)}` : kind === 'inverse' ? `\\frac{1}{${powTex(fp(x), n)}}` : kind === 'joint' ? `${powTex(fp(x), n)}\\,${powTex(fp(w), m)}` : `\\frac{${powTex(fp(x), n)}}{${powTex(fp(w), m)}}`);
  const law = K.law(n, m);
  if (num(y1) === 0) return { ok: false, errors: [{ field: 'y1', message: 'With a known y of 0 the constant k is 0, so y is 0 for every x. Enter a non-zero known value.' }] };
  const ratio = dv(y2, y1);
  const steps = [
    { title: 'Write the variation as an equation', tex: law, note: kind === 'direct' ? 'Direct variation: y is a constant multiple of xⁿ, so increasing x increases y.' : kind === 'inverse' ? 'Inverse variation: y times xⁿ stays constant, so increasing x decreases y.' : kind === 'joint' ? 'Joint variation: y is a constant multiple of the product of the variables.' : 'Combined variation: y grows with x and shrinks as w grows.' },
    { title: 'Find the constant of variation k', texLines: [`${tex(y1)} = k \\cdot ${sub(x1, w1)}`, `k = ${tex(k)}`], note: 'Substitute the known set of values and solve for k. The same k holds for every set of values.' },
    { title: 'Write the equation with k', tex: law.replace('k', `${tex(k)}`) },
    { title: 'Substitute the new values', texLines: [`y = ${tex(k)} \\cdot ${sub(x2, w2)}`, `y = ${tex(y2)}${y2 instanceof Frac && !y2.isInt() ? ` \\approx ${tx(num(y2))}` : ''}`] },
    { title: 'Check with ratios', tex: `\\frac{y_2}{y_1} = \\frac{${sub(x2, w2)}}{${sub(x1, w1)}} = ${tex(ratio)} \\;\\Rightarrow\\; y_2 = ${tex(y1)} \\times ${tex(ratio)} = ${tex(y2)}\\ \\checkmark`, note: 'The ratio method skips k: the new y is the old y times the factor by which the variable part changed.' },
  ];
  const kx = num(k);
  const nn = n === '1/2' ? 0.5 : Number(n);
  const fx = (x) => (kind === 'direct' ? kx * Math.pow(x, nn) : kind === 'inverse' ? kx / Math.pow(x, nn) : NaN);
  const xs = [num(x1), num(x2)], lo = Math.min(0, ...xs) - 1, hi = Math.max(...xs) * 1.4 + 1;
  return {
    ok: true,
    final: { texLines: [`k = ${tex(k)}`, `y = ${tex(y2)}`] },
    answers: [
      { label: 'New value y', value: fmt(num(y2)), approx: !(y2 instanceof Frac && y2.toDecimal(8)), exactTex: y2 instanceof Frac && !y2.isInt() ? y2.toTex() : undefined, primary: true },
      { label: 'Constant of variation k', value: fmt(kx), approx: !(k instanceof Frac && k.toDecimal(8)), exactTex: k instanceof Frac && !k.isInt() ? k.toTex() : undefined, primary: true },
      { label: 'Equation', valueTex: law.replace('k', tex(k)), copy: '' },
      { label: 'Factor y₂ / y₁', value: fmt(num(ratio)), copy: '' },
    ],
    steps,
    visual: !K.two ? { svg: plot({ x: [Math.max(lo, n === '1/2' ? 0 : lo), hi], width: 380, height: 260, title: 'The variation curve through both points', curves: [{ f: fx, samples: 600 }], points: [{ x: num(x1), y: num(y1), label: 'known' }, { x: num(x2), y: num(y2), label: 'new', cls: 'd-foot' }] }), caption: kind === 'direct' ? 'Direct variation passes through the origin.' : 'Inverse variation: y gets smaller as x gets larger.' } : undefined,
    formula: [law],
  };
}

function solveProportion(values) {
  const v = validator(values);
  const t = ['fourth', 'mean', 'third'].includes(values.ptype) ? values.ptype : 'fourth';
  const a = v.frac('pa', 'a', { nonzero: true }), b = v.frac('pb', 'b', { nonzero: t !== 'fourth' });
  const c = t === 'fourth' ? v.frac('pc', 'c') : null;
  if (!v.ok()) return v.result();
  let x, steps, law;
  if (t === 'fourth') {
    x = b.mul(c).div(a); law = 'a : b = c : x \\;\\Rightarrow\\; x = \\frac{bc}{a}';
    steps = [
      { title: 'Write the proportion', tex: `${a.toTex()} : ${b.toTex()} = ${c.toTex()} : x \\quad\\text{or}\\quad \\frac{${a.toTex()}}{${b.toTex()}} = \\frac{${c.toTex()}}{x}`, note: 'A proportion says two ratios are equal.' },
      { title: 'Cross-multiply', tex: `${a.toTex()}\\,x = ${fp(b)}${fp(c)} = ${b.mul(c).toTex()}`, note: 'The product of the means equals the product of the extremes.' },
      { title: 'Solve for x', tex: `x = \\frac{${b.mul(c).toTex()}}{${a.toTex()}} = ${x.toTex()}` },
      { title: 'Check', tex: `\\frac{${a.toTex()}}{${b.toTex()}} = ${a.div(b).toTex()}, \\qquad \\frac{${c.toTex()}}{${x.toTex()}} = ${x.isZero() ? '\\text{undefined}' : c.div(x).toTex()}\\ \\checkmark` },
    ];
  } else if (t === 'third') {
    x = b.pow(2).div(a); law = 'a : b = b : x \\;\\Rightarrow\\; x = \\frac{b^2}{a}';
    steps = [
      { title: 'Write the proportion', tex: `${a.toTex()} : ${b.toTex()} = ${b.toTex()} : x`, note: 'In a continued proportion the middle term appears twice.' },
      { title: 'Cross-multiply', tex: `${a.toTex()}\\,x = ${fp(b)}^2 = ${b.pow(2).toTex()}` },
      { title: 'Solve for x', tex: `x = ${x.toTex()}` },
      { title: 'Check', tex: `\\frac{${a.toTex()}}{${b.toTex()}} = ${a.div(b).toTex()}, \\qquad \\frac{${b.toTex()}}{${x.toTex()}} = ${b.div(x).toTex()}\\ \\checkmark` },
    ];
  } else {
    if (a.mul(b).sign() < 0) return { ok: false, errors: [{ field: ['pa', 'pb'], message: 'a and b must have the same sign: the mean proportional is √(ab), and ab is negative here.' }] };
    const s = sqrtFrac(a.mul(b), simplifySqrt);
    x = s.exact ? F(s.text) : s.value; law = 'a : x = x : b \\;\\Rightarrow\\; x = \\sqrt{ab}';
    steps = [
      { title: 'Write the proportion', tex: `${a.toTex()} : x = x : ${b.toTex()}`, note: 'The mean proportional (geometric mean) sits between a and b in a continued proportion.' },
      { title: 'Cross-multiply', tex: `x^2 = ${fp(a)}${fp(b)} = ${a.mul(b).toTex()}` },
      { title: 'Take the square root', tex: `x = \\sqrt{${a.mul(b).toTex()}} = ${s.tex}${s.exact ? '' : ` \\approx ${tx(s.value)}`}`, note: 'The negative root −√(ab) also satisfies the proportion; the positive one is the usual answer.' },
      { title: 'Check', tex: `x^2 = ${s.exact ? F(s.text).pow(2).toTex() : tx(s.value ** 2)} = ${a.toTex()} \\times ${b.toTex()}\\ \\checkmark` },
    ];
  }
  return { ok: true, final: { tex: `x = ${tex(x)}` }, answers: [{ label: 'Unknown x', value: fmt(num(x)), approx: !(x instanceof Frac && x.toDecimal(8)), exactTex: x instanceof Frac && !x.isInt() ? x.toTex() : undefined, primary: true }], steps, formula: [law] };
}

function solveDivide(values) {
  const v = validator(values);
  const T = v.frac('T', 'the total');
  const r1 = v.frac('r1', 'ratio part 1'), r2 = v.frac('r2', 'ratio part 2');
  const has3 = String(values.r3 ?? '').trim() !== '';
  const r3 = has3 ? v.frac('r3', 'ratio part 3') : null;
  if (!v.ok()) return v.result();
  const parts = [r1, r2, ...(has3 ? [r3] : [])];
  if (parts.some((p) => p.sign() <= 0)) return { ok: false, errors: [{ field: ['r1', 'r2', 'r3'], message: 'Each part of the ratio must be greater than 0.' }] };
  const sum = parts.reduce((s, p) => s.add(p), F(0)), unit = T.div(sum), shares = parts.map((p) => p.mul(unit));
  const steps = [
    { title: 'Add the parts of the ratio', tex: `${parts.map((p) => p.toTex()).join(' + ')} = ${sum.toTex()}`, note: `The total is split into ${sum} equal parts.` },
    { title: 'Value of one part', tex: `\\frac{${T.toTex()}}{${sum.toTex()}} = ${unit.toTex()}` },
    { title: 'Multiply each part', texLines: shares.map((s, i) => `\\text{share ${i + 1}} = ${parts[i].toTex()} \\times ${unit.toTex()} = ${s.toTex()}`) },
    { title: 'Check', tex: `${shares.map((s) => s.toTex()).join(' + ')} = ${shares.reduce((s, q) => s.add(q), F(0)).toTex()} = ${T.toTex()}\\ \\checkmark`, note: 'The shares must add back up to the total.' },
  ];
  return {
    ok: true,
    final: { tex: shares.map((s, i) => `\\text{share ${i + 1}} = ${s.toTex()}`).join(',\\quad ') },
    answers: shares.map((s, i) => ({ label: `Share ${i + 1}`, value: fmt(s.toNumber()), approx: !s.toDecimal(8), exactTex: s.isInt() ? undefined : s.toTex(), primary: true })),
    steps, formula: ['\\text{share}_i = \\frac{r_i}{r_1 + r_2 + \\cdots}\\times T'],
    visual: { svg: plot({ x: [0, parts.length + 1], width: 360, height: 220, title: 'The shares', bars: shares.map((s, i) => ({ x: i + 1, w: 0.6, h: s.toNumber() })) }), caption: `Each share is proportional to its part of the ratio ${parts.join(' : ')}.` },
  };
}
