/**
 * ax² + bx + c = 0 with exact coefficients. Discriminant D = b² − 4ac decides the roots:
 * D > 0 two real, D = 0 one repeated, D < 0 two complex conjugates. Roots are given in
 * simplest radical form x = (P ± Q√m)/R (with i when D < 0).
 */
import { validator, fp, fmt, isExact } from '../lib/calc-kit.js';
import { Frac, bgcd } from '../lib/fraction.js';
import { simplifySqrt } from '../lib/exact.js';
import { plot } from '../lib/plot.js';
import { texOf, polyToNode } from '../lib/expr.js';

/** √|D| as (a√b)/d with integers. */
function sqrtParts(D) {
  const A = D.abs();
  const pq = A.n * A.d;
  if (pq > 10n ** 12n) return null;
  const [a, b] = simplifySqrt(Number(pq));
  return { a: BigInt(a), b, d: A.d };
}

/** Exact root expression (P ± Q√m)/R as TeX and text. */
function rootForm(a, b, D) {
  const s = sqrtParts(D);
  if (!s) return null;
  // x = -b/(2a) ± (s.a √m)/(s.d · 2a)
  const p = b.neg().div(a.mul(2));
  let q = new Frac(s.a, s.d).div(a.mul(2)).abs();
  const L = (p.d * q.d) / (bgcd(p.d, q.d) || 1n);
  let P = (p.n * L) / p.d, Q = (q.n * L) / q.d, R = L;
  const g = bgcd(bgcd(P, Q), R) || 1n;
  P /= g; Q /= g; R /= g;
  const m = s.b;
  const i = D.sign() < 0 ? 'i' : '';
  const rad = m === 1 ? `${Q}${i}` : `${Q === 1n ? '' : Q}\\sqrt{${m}}${i ? '\\,i' : ''}`;
  const radText = m === 1 ? `${Q}${i}` : `${Q === 1n ? '' : Q}√${m}${i}`;
  const top = P === 0n ? `\\pm ${rad}` : `${P} \\pm ${rad}`;
  const topText = P === 0n ? `±${radText}` : `${P} ± ${radText}`;
  return { tex: R === 1n ? top : `\\frac{${top}}{${R}}`, text: R === 1n ? topText : `(${topText})/${R}`, rational: m === 1 && D.sign() >= 0 };
}

export const calculator = {
  id: 'quadratic-equation-solver',
  fields: [
    { name: 'a', label: 'a (coefficient of x²)', type: 'number', placeholder: 'e.g. 1', row: 'c' },
    { name: 'b', label: 'b (coefficient of x)', type: 'number', placeholder: 'e.g. -3', row: 'c' },
    { name: 'c', label: 'c (constant)', type: 'number', placeholder: 'e.g. -10', row: 'c' },
  ],
  examples: [
    { label: 'x² − 3x − 10 = 0', values: { a: '1', b: '-3', c: '-10' } },
    { label: 'Irrational: 2x² + 4x − 1 = 0', values: { a: '2', b: '4', c: '-1' } },
    { label: 'Complex: x² + 2x + 5 = 0', values: { a: '1', b: '2', c: '5' } },
    { label: 'Repeated: 4x² − 12x + 9 = 0', values: { a: '4', b: '-12', c: '9' } },
  ],
  solve(values) {
    const v = validator(values);
    const a = v.frac('a', 'a'), b = v.frac('b', 'b'), c = v.frac('c', 'c');
    if (!v.ok()) return v.result();
    if (a.isZero()) return { ok: false, errors: [{ field: 'a', message: 'a cannot be 0: without an x² term the equation is linear, not quadratic. Use the linear equation solver instead.' }] };
    const D = b.pow(2).sub(a.mul(c).mul(4));
    const cleanEq = `${texOf(polyToNode([c, b, a]))} = 0`;
    const steps = [
      { title: 'Identify a, b and c', texLines: [cleanEq, `a = ${a.toTex()}, \\quad b = ${b.toTex()}, \\quad c = ${c.toTex()}`] },
      { title: 'Compute the discriminant', texLines: ['D = b^2 - 4ac', `D = ${fp(b)}^2 - 4${fp(a)}${fp(c)} = ${b.pow(2).toTex()} - ${fp(a.mul(c).mul(4))} = ${D.toTex()}`] },
    ];
    const kind = D.sign() > 0 ? 'two distinct real roots' : D.isZero() ? 'one repeated real root' : 'two complex conjugate roots';
    steps.push({ title: 'Interpret the discriminant', text: `D ${D.sign() > 0 ? '> 0' : D.isZero() ? '= 0' : '< 0'}, so the equation has ${kind}.` });
    const an = a.toNumber(), bn = b.toNumber(), Dn = D.toNumber();
    const h = -bn / (2 * an);
    const form = rootForm(a, b, D);
    const answers = [];
    let final;
    if (D.isZero()) {
      const r = b.neg().div(a.mul(2));
      steps.push({ title: 'Apply the quadratic formula', texLines: ['x = \\frac{-b \\pm \\sqrt{D}}{2a}', `x = \\frac{${b.neg().toTex()} \\pm 0}{${a.mul(2).toTex()}} = ${r.toTex()}`] });
      final = { tex: `x = ${r.toTex()} \\quad (\\text{double root})` };
      answers.push({ label: 'Root (repeated)', value: fmt(r.toNumber()), approx: !r.toDecimal(), exactTex: r.isInt() ? undefined : r.toTex(), primary: true, copy: `x = ${r}` });
    } else {
      const sq = Math.sqrt(Math.abs(Dn));
      steps.push({ title: 'Apply the quadratic formula', texLines: ['x = \\frac{-b \\pm \\sqrt{D}}{2a}', `x = \\frac{${b.neg().toTex()} \\pm \\sqrt{${D.toTex()}}}{${a.mul(2).toTex()}}`, ...(D.sign() < 0 ? [`\\sqrt{${D.toTex()}} = i\\sqrt{${D.neg().toTex()}}`] : []), ...(form ? [`x = ${form.tex}`] : [])] });
      if (D.sign() > 0) {
        const r1 = (-bn - Math.sign(an) * sq) / (2 * an), r2 = (-bn + Math.sign(an) * sq) / (2 * an);
        const [x1, x2] = [r1, r2].sort((p, q) => p - q);
        if (form && form.rational) {
          // √D is rational: give each root as an exact fraction and the factored form
          const s = sqrtParts(D);
          const root = new Frac(s.a, s.d);
          const [q1, q2] = [b.neg().sub(root).div(a.mul(2)), b.neg().add(root).div(a.mul(2))].sort((p, q) => p.cmp(q));
          const fac = (r) => (r.isZero() ? 'x' : `\\left(x ${r.sign() < 0 ? '+' : '-'} ${r.abs().toTex()}\\right)`);
          steps.push({ title: 'Evaluate the two roots', texLines: [`x_1 = ${q1.toTex()}, \\qquad x_2 = ${q2.toTex()}`] });
          steps.push({ title: 'Factored form', text: 'Rational roots mean the quadratic factors over the rationals.', tex: `${a.isOne() ? '' : a.eq(-1) ? '-' : a.toTex()}${fac(q1)}${fac(q2)} = 0` });
          final = { tex: `x_1 = ${q1.toTex()}, \\qquad x_2 = ${q2.toTex()}` };
          for (const [lab, q] of [['Root x₁', q1], ['Root x₂', q2]]) answers.push({ label: lab, value: q.toDecimal(8) || fmt(q.toNumber()), approx: !q.toDecimal(8), exactTex: q.isInt() ? undefined : q.toTex(), primary: true, copy: `${lab}: ${q}` });
          answers.push({ label: 'Factored form', valueTex: `${a.isOne() ? '' : a.eq(-1) ? '-' : a.toTex()}${fac(q1)}${fac(q2)}` });
        } else {
          steps.push({ title: 'Evaluate the two roots', texLines: [`x_1 \\approx ${fmt(x1)}, \\qquad x_2 \\approx ${fmt(x2)}`] });
          final = { texLines: [form ? `x = ${form.tex}` : `x_1 \\approx ${fmt(x1)},\\ x_2 \\approx ${fmt(x2)}`, ...(form ? [`x_1 \\approx ${fmt(x1)}, \\quad x_2 \\approx ${fmt(x2)}`] : [])] };
          answers.push({ label: 'Root x₁', value: fmt(x1), approx: true, primary: true }, { label: 'Root x₂', value: fmt(x2), approx: true, primary: true });
          if (form) answers.push({ label: 'Exact roots', valueTex: `x = ${form.tex}`, copy: `x = ${form.text}` });
        }
      } else {
        const im = sq / (2 * Math.abs(an));
        steps.push({ title: 'Write the complex roots as a ± bi', texLines: [`x = ${fmt(h)} \\pm ${fmt(im)}\\,i`] });
        final = { texLines: [form ? `x = ${form.tex}` : `x \\approx ${fmt(h)} \\pm ${fmt(im)}i`] };
        answers.push({ label: 'Root x₁', value: `${fmt(h)} − ${fmt(im)}i`, approx: !isExact(im), primary: true }, { label: 'Root x₂', value: `${fmt(h)} + ${fmt(im)}i`, approx: !Number.isInteger(im * 1e6), primary: true });
        if (form) answers.push({ label: 'Exact roots', valueTex: `x = ${form.tex}`, copy: `x = ${form.text}` });
      }
    }
    const k = c.sub(b.pow(2).div(a.mul(4)));
    answers.push(
      { label: 'Discriminant D', valueTex: D.toTex(), copy: `D = ${D}` },
      { label: 'Vertex of y = ax² + bx + c', valueTex: `\\left(${b.neg().div(a.mul(2)).toTex()},\\ ${k.toTex()}\\right)`, copy: `(${b.neg().div(a.mul(2))}, ${k})` },
      { label: 'Sum of roots −b/a', valueTex: b.neg().div(a).toTex() },
      { label: 'Product of roots c/a', valueTex: c.div(a).toTex() },
    );
    steps.push({ title: 'Check with Vieta’s formulas', text: 'The roots always add to −b/a and multiply to c/a.', texLines: [`x_1 + x_2 = -\\frac{b}{a} = ${b.neg().div(a).toTex()}, \\qquad x_1 x_2 = \\frac{c}{a} = ${c.div(a).toTex()}`] });
    const span = Math.max(3, Dn > 0 ? Math.sqrt(Dn) / Math.abs(an) : 3);
    const f = (x) => an * x * x + bn * x + c.toNumber();
    const roots = Dn >= 0 ? [(-bn - Math.sqrt(Math.max(Dn, 0))) / (2 * an), (-bn + Math.sqrt(Math.max(Dn, 0))) / (2 * an)] : [];
    const svg = plot({
      x: [h - span * 1.4, h + span * 1.4],
      curves: [{ f, cls: 'd-line' }],
      points: [...roots.map((r) => ({ x: r, y: 0, cls: 'd-foot' })), { x: h, y: k.toNumber(), label: 'vertex' }],
      title: 'Graph of y = ax² + bx + c; real roots are where it crosses the x-axis',
    });
    return {
      ok: true, final, answers, steps,
      visual: { svg, caption: Dn < 0 ? 'The parabola never touches the x-axis, which is why the roots are complex.' : 'Real roots are the x-intercepts of the parabola.' },
      formula: ['x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'],
      rounding: 'Exact roots are in simplest radical form; decimals are rounded to 6 places.',
    };
  },
};
