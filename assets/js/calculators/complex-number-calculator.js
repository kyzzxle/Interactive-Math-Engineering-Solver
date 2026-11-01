/**
 * Complex numbers a + bi with exact (fraction) arithmetic for +, −, ×, ÷, plus modulus, argument,
 * conjugate, polar and exponential forms, integer powers (de Moivre) and an Argand diagram.
 */
import { validator, fmt, tx, sqrtFrac } from '../lib/calc-kit.js';
import { Frac, parseFrac } from '../lib/fraction.js';
import { simplifySqrt } from '../lib/exact.js';
import { piMultiple, piFracTex } from '../lib/trig.js';
import { plot } from '../lib/plot.js';

const NUM = '(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:/\\d+)?';

/** Parse "3+4i", "-2i", "i", "5", "4i - 3", "2.5 - 1/2i", "3 + 4j". Returns { re, im } (Frac) or null. */
export function parseComplex(raw) {
  const s = String(raw ?? '').replace(/\s+/g, '').replace(/[−]/g, '-').replace(/j/g, 'i').replace(/\*i/g, 'i');
  if (!s) return null;
  const terms = s.match(/[+-]?[^+-]+/g);
  if (!terms || terms.join('') !== s) return null;
  let re = new Frac(0n), im = new Frac(0n), seenRe = false, seenIm = false;
  for (const t of terms) {
    const m = new RegExp(`^([+-]?)(${NUM})?(i?)$`).exec(t);
    if (!m || (!m[2] && !m[3])) return null;
    const sign = m[1] === '-' ? -1 : 1;
    const val = m[2] ? parseFrac(m[2]) : new Frac(1n);
    if (!val) return null;
    if (m[3]) { if (seenIm) return null; im = val.mul(sign); seenIm = true; }
    else { if (seenRe) return null; re = val.mul(sign); seenRe = true; }
  }
  return { re, im };
}

const cTex = (z) => {
  const { re, im } = z;
  if (im.isZero()) return re.toTex();
  const imAbs = im.abs();
  const imPart = `${imAbs.isOne() ? '' : imAbs.toTex()}i`;
  if (re.isZero()) return `${im.sign() < 0 ? '-' : ''}${imPart}`;
  return `${re.toTex()} ${im.sign() < 0 ? '-' : '+'} ${imPart}`;
};
const cText = (z) => cTex(z).replace(/\\frac\{(\d+)\}\{(\d+)\}/g, '$1/$2').replace(/-\\frac/g, '-');
const add = (z, w) => ({ re: z.re.add(w.re), im: z.im.add(w.im) });
const subC = (z, w) => ({ re: z.re.sub(w.re), im: z.im.sub(w.im) });
const mulC = (z, w) => ({ re: z.re.mul(w.re).sub(z.im.mul(w.im)), im: z.re.mul(w.im).add(z.im.mul(w.re)) });
const p = (f) => (f.sign() < 0 ? `(${f.toTex()})` : f.toTex());

/** Modulus, argument and forms of one complex number. */
function properties(z) {
  const r2 = z.re.pow(2).add(z.im.pow(2));
  const r = sqrtFrac(r2, simplifySqrt);
  const theta = Math.atan2(z.im.toNumber(), z.re.toNumber());
  const pm = piMultiple(theta);
  const thetaTex = pm ? piFracTex(pm) : tx(theta);
  return { r2, r, theta, thetaTex, exactAngle: !!pm };
}

export const calculator = {
  id: 'complex-number-calculator',
  fields: [
    { name: 'op', label: 'Operation', type: 'select', options: [['add', 'z₁ + z₂'], ['sub', 'z₁ − z₂'], ['mul', 'z₁ × z₂'], ['div', 'z₁ ÷ z₂'], ['props', 'Properties of z₁ (modulus, argument, polar form)'], ['pow', 'Power z₁ⁿ (de Moivre)']] },
    { name: 'z1', label: 'z₁', type: 'text', placeholder: 'e.g. 3 + 4i', hint: 'Write a + bi, e.g. 3+4i, -2i, 5 or 1/2 - 3/4i.' },
    { name: 'z2', label: 'z₂', type: 'text', placeholder: 'e.g. 1 - 2i', showWhen: { op: ['add', 'sub', 'mul', 'div'] } },
    { name: 'n', label: 'Power n', type: 'number', placeholder: 'e.g. 5', showWhen: { op: ['pow'] } },
  ],
  examples: [
    { label: '(3 + 4i) ÷ (1 − 2i)', values: { op: 'div', z1: '3+4i', z2: '1-2i' } },
    { label: '(2 + 3i)(4 − i)', values: { op: 'mul', z1: '2+3i', z2: '4-i' } },
    { label: 'Polar form of 1 + i', values: { op: 'props', z1: '1+i' } },
    { label: '(1 + i)⁸', values: { op: 'pow', z1: '1+i', n: '8' } },
  ],
  solve(values) {
    const v = validator(values);
    const op = ['add', 'sub', 'mul', 'div', 'props', 'pow'].includes(values.op) ? values.op : 'add';
    const z = parseComplex(values.z1);
    if (!z) v.fail('z1', String(values.z1 ?? '').trim() ? 'Write z₁ in the form a + bi, for example 3+4i, -2i or 5.' : 'Please enter z₁, for example 3+4i.');
    let w = null, n = null;
    if (['add', 'sub', 'mul', 'div'].includes(op)) {
      w = parseComplex(values.z2);
      if (!w) v.fail('z2', String(values.z2 ?? '').trim() ? 'Write z₂ in the form a + bi, for example 1-2i.' : 'Please enter z₂, for example 1-2i.');
    }
    if (op === 'pow') n = v.number('n', 'the power n', { integer: true, maxAbs: 100 });
    if (!v.ok()) return v.result();
    const steps = [];
    steps.push({ title: 'Identify the given numbers', text: 'Read off the real part a and the imaginary part b of each number written as a + bi.', texLines: [`z_1 = ${cTex(z)}`].concat(w ? [`z_2 = ${cTex(w)}`] : []).concat(op === 'pow' ? [`n = ${n}`] : []) });
    let result, final;
    if (op === 'add' || op === 'sub') {
      result = op === 'add' ? add(z, w) : subC(z, w);
      steps.push({ title: `${op === 'add' ? 'Add' : 'Subtract'} real parts and imaginary parts separately`, texLines: [`(${cTex(z)}) ${op === 'add' ? '+' : '-'} (${cTex(w)})`, `= (${z.re.toTex()} ${op === 'add' ? '+' : '-'} ${p(w.re)}) + (${z.im.toTex()} ${op === 'add' ? '+' : '-'} ${p(w.im)})i`, `= ${cTex(result)}`] });
    } else if (op === 'mul') {
      result = mulC(z, w);
      steps.push({ title: 'Multiply out (FOIL) and use i² = −1', texLines: [`(${cTex(z)})(${cTex(w)})`, `= ${p(z.re)}${p(w.re)} + ${p(z.re)}${p(w.im)}i + ${p(z.im)}${p(w.re)}i + ${p(z.im)}${p(w.im)}i^2`, `= (${z.re.mul(w.re).toTex()} - ${p(z.im.mul(w.im))}) + (${z.re.mul(w.im).toTex()} + ${p(z.im.mul(w.re))})i`, `= ${cTex(result)}`] });
    } else if (op === 'div') {
      const d = w.re.pow(2).add(w.im.pow(2));
      if (d.isZero()) return { ok: false, errors: [{ field: 'z2', message: 'Division by zero: z₂ = 0 has no reciprocal.' }] };
      const conj = { re: w.re, im: w.im.neg() };
      const top = mulC(z, conj);
      result = { re: top.re.div(d), im: top.im.div(d) };
      steps.push({ title: 'Multiply top and bottom by the conjugate of the denominator', texLines: [`\\frac{${cTex(z)}}{${cTex(w)}} \\cdot \\frac{${cTex(conj)}}{${cTex(conj)}}`] });
      steps.push({ title: 'Simplify the numerator and the (real) denominator', texLines: [`\\text{numerator: } (${cTex(z)})(${cTex(conj)}) = ${cTex(top)}`, `\\text{denominator: } ${p(w.re)}^2 + ${p(w.im)}^2 = ${d.toTex()}`, `= \\frac{${cTex(top)}}{${d.toTex()}} = ${cTex(result)}`] });
    } else if (op === 'pow') {
      const pr = properties(z);
      if (pr.r2.isZero() && n <= 0) return { ok: false, errors: [{ field: 'n', message: '0 raised to a zero or negative power is undefined.' }] };
      // exact repeated multiplication (or reciprocal)
      let acc = { re: new Frac(1n), im: new Frac(0n) };
      const base = n >= 0 ? z : (() => { const d = pr.r2; return { re: z.re.div(d), im: z.im.neg().div(d) }; })();
      for (let i = 0; i < Math.abs(n); i++) acc = mulC(acc, base);
      result = acc;
      steps.push({ title: 'Write z₁ in polar form', tex: `z_1 = ${pr.r.tex}\\left(\\cos ${pr.thetaTex} + i\\sin ${pr.thetaTex}\\right)` });
      steps.push({ title: "Apply de Moivre's theorem", text: 'Raise the modulus to the power n and multiply the argument by n.', texLines: [`z_1^{${n}} = (${pr.r.tex})^{${n}}\\left(\\cos ${n}\\theta + i\\sin ${n}\\theta\\right)`, `= ${cTex(result)}`] });
    }
    const target = op === 'props' ? z : result;
    const pr = properties(target);
    steps.push({ title: op === 'props' ? 'Modulus and argument' : 'Modulus and argument of the result', texLines: [`|z| = \\sqrt{${p(target.re)}^2 + ${p(target.im)}^2} = \\sqrt{${pr.r2.toTex()}} = ${pr.r.tex}${pr.r.exact ? '' : ` \\approx ${tx(pr.r.value)}`}`, pr.r2.isZero() ? '\\text{The argument of 0 is not defined.}' : `\\theta = \\operatorname{atan2}(${target.im.toTex()}, ${target.re.toTex()}) ${pr.exactAngle ? '=' : '\\approx'} ${pr.thetaTex} \\text{ rad} \\approx ${tx((pr.theta * 180) / Math.PI)}^\\circ`] });
    const polar = pr.r2.isZero() ? '0' : `${pr.r.tex}\\left(\\cos ${pr.thetaTex} + i \\sin ${pr.thetaTex}\\right) = ${pr.r.tex}\\,e^{${pr.exactAngle ? `i${pr.thetaTex}` : `${tx(pr.theta)}i`}}`;
    final = op === 'props' ? { tex: `z = ${polar}` } : { tex: `${cTex(result)}` };
    const answers = [];
    if (op !== 'props') answers.push({ label: 'Result (rectangular form)', valueTex: cTex(result), primary: true, copy: cText(result) });
    answers.push(
      { label: 'Modulus |z|', value: fmt(pr.r.value), approx: !pr.r.exact, exactTex: pr.r.exact ? undefined : pr.r.tex, primary: op === 'props' },
      { label: 'Argument θ', value: pr.r2.isZero() ? 'not defined for z = 0' : `${fmt(pr.theta)} rad = ${fmt((pr.theta * 180) / Math.PI, 4)}°`, approx: !pr.r2.isZero(), exactTex: pr.exactAngle && !pr.r2.isZero() ? pr.thetaTex : undefined, primary: op === 'props' },
      { label: 'Polar / exponential form', valueTex: polar },
      { label: 'Conjugate', valueTex: cTex({ re: target.re, im: target.im.neg() }) },
    );
    const pts = [{ z, label: 'z₁', cls: 'd-point' }];
    if (w) pts.push({ z: w, label: 'z₂', cls: 'd-point' });
    if (op !== 'props') pts.push({ z: result, label: 'result', cls: 'd-foot' });
    const coords = pts.map((q) => [q.z.re.toNumber(), q.z.im.toNumber()]);
    const m = Math.max(1, ...coords.flat().map(Math.abs)) * 1.3;
    const svg = plot({
      x: [-m, m], y: [-m, m], equal: true,
      segments: coords.map(([x, y], i) => ({ x1: 0, y1: 0, x2: x, y2: y, cls: i === coords.length - 1 && op !== 'props' ? 'd-line2' : 'd-line' })),
      points: pts.map((q, i) => ({ x: coords[i][0], y: coords[i][1], label: q.label, cls: q.cls })),
      xLabel: 'Re', yLabel: 'Im', title: 'Argand diagram: complex numbers as points in the plane',
    });
    return {
      ok: true, final, answers, steps,
      visual: { svg, caption: 'The horizontal axis is the real part and the vertical axis the imaginary part; the length of each arrow is the modulus.' },
      formula: ['i^2 = -1 \\qquad |a + bi| = \\sqrt{a^2 + b^2} \\qquad r(\\cos\\theta + i\\sin\\theta) = re^{i\\theta}'],
      rounding: 'Rectangular results are exact fractions; the modulus is exact in radical form; angles are rounded to 6 decimal places unless they are a simple multiple of π.',
    };
  },
};
