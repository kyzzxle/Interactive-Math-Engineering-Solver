/**
 * Hyperbola with centre (h, k):
 *   opens left–right:  (x − h)²/a² − (y − k)²/b² = 1
 *   opens up–down:     (y − k)²/a² − (x − h)²/b² = 1
 * a is the transverse semi-axis (centre to vertex), b the conjugate semi-axis.
 * c² = a² + b², foci at distance c, asymptotes with slopes ±b/a (or ±a/b), e = c/a > 1.
 */
import { validator, answer, sqrtFrac, fracAnswer, fmt, tx } from '../lib/calc-kit.js';
import { simplifySqrt } from '../lib/exact.js';
import { plot } from '../lib/plot.js';
import { linearTex } from '../lib/lines.js';
import { Frac } from '../lib/fraction.js';
import { hyperbolaPractice } from '../explore/analytic-practice.js';

const shift = (v, h) => (h.isZero() ? v : `(${v} ${h.sign() > 0 ? '-' : '+'} ${h.abs().toTex()})`);
const pm = (h, c) => (h.isZero() ? `\\pm ${c.tex}` : `${h.toTex()} \\pm ${c.tex}`);

function branches(hn, kn, a, b, horiz) {
  if (horiz) return [{ f: (x) => (Math.abs(x - hn) >= a ? kn + b * Math.sqrt(((x - hn) / a) ** 2 - 1) : NaN), samples: 900 }, { f: (x) => (Math.abs(x - hn) >= a ? kn - b * Math.sqrt(((x - hn) / a) ** 2 - 1) : NaN), samples: 900 }];
  return [{ f: (x) => kn + a * Math.sqrt(((x - hn) / b) ** 2 + 1), samples: 600 }, { f: (x) => kn - a * Math.sqrt(((x - hn) / b) ** 2 + 1), samples: 600 }];
}

export const calculator = {
  id: 'hyperbola',
  practice: hyperbolaPractice,
  explore: {
    title: 'Follow a point on a hyperbola',
    intro: 'For every point P on the right branch, PF₁ − PF₂ is the same: 2a. Far from the centre the curve hugs its dashed asymptotes.',
    controls: [
      { name: 'a', label: 'Transverse semi-axis a', min: 0.5, max: 4, step: 0.1, value: 2 },
      { name: 'b', label: 'Conjugate semi-axis b', min: 0.5, max: 4, step: 0.1, value: 1.5 },
      { name: 's', label: 'Position of P along the branch', min: -2, max: 2, step: 0.02, value: 0.6 },
    ],
    animate: { control: 's', seconds: 6 },
    presets: [{ label: 'Rectangular (a = b)', values: { a: 2, b: 2 } }, { label: 'Narrow', values: { a: 3, b: 1 } }],
    render({ a, b, s }) {
      const c = Math.hypot(a, b), P = [a * Math.cosh(s), b * Math.sinh(s)];
      const d1 = Math.hypot(P[0] + c, P[1]), d2 = Math.hypot(P[0] - c, P[1]);
      return {
        svg: plot({ x: [-9, 9], y: [-6, 6], equal: true, width: 400, height: 300, title: 'Hyperbola with foci and asymptotes', curves: [...branches(0, 0, a, b, true), { f: (x) => (b / a) * x, cls: 'd-hidden' }, { f: (x) => (-b / a) * x, cls: 'd-hidden' }], segments: [{ x1: -c, y1: 0, x2: P[0], y2: P[1], cls: 'd-line2' }, { x1: c, y1: 0, x2: P[0], y2: P[1], cls: 'd-line3' }], points: [{ x: -c, y: 0, label: 'F₁', cls: 'd-point2' }, { x: c, y: 0, label: 'F₂', cls: 'd-point3' }, { x: P[0], y: P[1], label: 'P' }] }),
        readouts: [
          { label: 'Distances', tex: `PF_1 \\approx ${tx(d1, 3)},\\ PF_2 \\approx ${tx(d2, 3)}` },
          { label: 'Difference (constant)', tex: `PF_1 - PF_2 \\approx ${tx(d1 - d2, 3)} = 2a`, tone: 'good' },
          { label: 'Asymptote slopes', tex: `\\pm\\frac{b}{a} = \\pm ${tx(b / a, 3)}` },
        ],
      };
    },
  },
  fields: [
    { name: 'dir', label: 'The hyperbola opens', type: 'radio', options: [['x', 'Left and right'], ['y', 'Up and down']] },
    { name: 'h', label: 'Centre h', type: 'text', placeholder: 'e.g. 1', row: 'c' },
    { name: 'k', label: 'Centre k', type: 'text', placeholder: 'e.g. -2', row: 'c' },
    { name: 'a', label: 'Transverse semi-axis a', type: 'text', placeholder: 'e.g. 3', row: 'ab', hint: 'Centre to vertex.' },
    { name: 'b', label: 'Conjugate semi-axis b', type: 'text', placeholder: 'e.g. 4', row: 'ab' },
  ],
  examples: [
    { label: 'Opens left–right: centre (1, −2), a = 3, b = 4', values: { dir: 'x', h: '1', k: '-2', a: '3', b: '4' } },
    { label: 'Opens up–down: a = 2, b = 1', values: { dir: 'y', h: '0', k: '0', a: '2', b: '1' } },
    { label: 'Rectangular hyperbola a = b = 1', values: { dir: 'x', h: '0', k: '0', a: '1', b: '1' } },
    { label: 'Invalid: b = 0', values: { dir: 'x', h: '0', k: '0', a: '2', b: '0' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const horiz = values.dir !== 'y';
    const h = v.frac('h', 'h'), k = v.frac('k', 'k'), a = v.frac('a', 'a'), b = v.frac('b', 'b');
    if (a && a.sign() <= 0) v.fail('a', 'The semi-axis a must be greater than 0.');
    if (b && b.sign() <= 0) v.fail('b', 'The semi-axis b must be greater than 0.');
    if (!v.ok()) return v.result();
    if ([h, k, a, b].some((f) => f.abs().toNumber() > 1e6)) return { ok: false, errors: [{ message: 'Please keep all values between −1,000,000 and 1,000,000.' }] };
    const a2 = a.pow(2), b2 = b.pow(2), c2 = a2.add(b2);
    const c = sqrtFrac(c2, simplifySqrt), e = sqrtFrac(c2.div(a2), simplifySqrt);
    const slope = horiz ? b.div(a) : a.div(b);
    const lr = b2.mul(2).div(a);
    const X = shift('x', h), Y = shift('y', k);
    const term = (top, den) => (den.isOne() ? `${top}^2` : `\\frac{${top}^2}{${den.toTex()}}`);
    const std = horiz ? `${term(X, a2)} - ${term(Y, b2)} = 1` : `${term(Y, a2)} - ${term(X, b2)} = 1`;
    // general form, multiplied by a²b²
    const [A, C] = horiz ? [b2, a2.neg()] : [a2.neg(), b2];
    const D = A.mul(h).mul(-2), E = C.mul(k).mul(-2), Fc = A.mul(h.pow(2)).add(C.mul(k.pow(2))).sub(a2.mul(b2));
    const general = `${linearTex([[A, 'x^2'], [C, 'y^2'], [D, 'x'], [E, 'y'], [Fc, '']])} = 0`;
    const vert = horiz ? `\\left(${h.toTex()} \\pm ${a.toTex()},\\ ${k.toTex()}\\right)` : `\\left(${h.toTex()},\\ ${k.toTex()} \\pm ${a.toTex()}\\right)`;
    const foc = horiz ? `\\left(${pm(h, c)},\\ ${k.toTex()}\\right)` : `\\left(${h.toTex()},\\ ${pm(k, c)}\\right)`;
    const asym = `y${k.isZero() ? '' : k.sign() > 0 ? ` - ${k.toTex()}` : ` + ${k.abs().toTex()}`} = \\pm ${slope.isOne() ? '' : `${slope.toTex()}\\,`}${X}`;
    const c0 = horiz ? h : k, side = horiz ? k : h;
    const pt = (main, s) => (horiz ? `\\left(${main},\\ ${s}\\right)` : `\\left(${s},\\ ${main}\\right)`);
    const both = (d) => `${pt(c0.sub(d).toTex(), side.toTex())},\\ ${pt(c0.add(d).toTex(), side.toTex())}`;
    const cFrac = c.exact ? Frac.of(c.text) : null;
    const steps = [
      { title: 'Known values', tex: `(h, k) = (${h.toTex()},\\ ${k.toTex()}),\\quad a = ${a.toTex()},\\quad b = ${b.toTex()}`, note: `a is the transverse semi-axis: from the centre to a vertex, in the direction the hyperbola opens (${horiz ? 'left and right' : 'up and down'}). b may be larger or smaller than a.` },
      { title: `Standard form (opens ${horiz ? 'left and right' : 'up and down'})`, tex: std, note: `The positive squared term is the ${horiz ? 'x' : 'y'}-term, which is why the branches open ${horiz ? 'left and right' : 'up and down'}. Its denominator is a².` },
      { title: 'Focal distance: for a hyperbola c² = a² + b²', texLines: [`c^2 = ${a2.toTex()} + ${b2.toTex()} = ${c2.toTex()}`, `c = ${c.tex}${c.exact ? '' : ` \\approx ${fmt(c.value)}`}`], note: 'c is the half-diagonal of the rectangle 2a by 2b around the centre. Add the squares for a hyperbola (an ellipse subtracts them).' },
      { title: 'Vertices and foci', texLines: [`\\text{Vertices: } ${vert} = ${both(a)}`, `\\text{Foci: } ${foc}${cFrac ? ` = ${both(cFrac)}` : ''}`], note: 'Both lie on the transverse axis, the foci further out than the vertices because c > a.' },
      { title: 'Asymptotes', texLines: [`\\text{slope } = \\pm${horiz ? '\\frac{b}{a}' : '\\frac{a}{b}'} = \\pm ${slope.toTex()}`, asym], note: 'The asymptotes are the diagonals of the 2a by 2b rectangle, through the centre. Far from the centre the branches get closer and closer to them.' },
      { title: 'Eccentricity and latus rectum', texLines: [`e = \\frac{c}{a} = \\frac{${c.tex}}{${a.toTex()}}${`\\frac{${c.tex}}{${a.toTex()}}` === e.tex ? '' : ` = ${e.tex}`}${e.exact ? '' : ` \\approx ${fmt(e.value)}`} > 1`, `\\text{latus rectum} = \\frac{2b^2}{a} = \\frac{2(${b2.toTex()})}{${a.toTex()}} = ${lr.toTex()}`], note: 'A hyperbola always has e > 1. The larger e is, the wider the branches open.' },
      { title: 'General form', tex: general, note: 'Multiply the standard form by a²b², expand the squares and move everything to the left.' },
    ];
    const V = c0.add(a);
    const dFar = c.exact ? `${V.sub(c0.sub(cFrac)).abs().toTex()}` : `${a.toTex()} + ${c.tex}`, dNear = c.exact ? `${V.sub(c0.add(cFrac)).abs().toTex()}` : `${c.tex} - ${a.toTex()}`;
    steps.push({ title: 'Check: the focal distances differ by 2a', texLines: [`\\text{Vertex } ${pt(V.toTex(), side.toTex())}: \\quad PF_1 = ${dFar}, \\quad PF_2 = ${dNear}`, `PF_1 - PF_2 = ${c.exact ? `${dFar} - ${dNear}` : `(${dFar}) - (${dNear})`} = ${a.mul(2).toTex()} = 2a\\ \\checkmark`], note: 'For every point on a hyperbola, the difference of the distances to the two foci is 2a. At a vertex this is easy to see.' });
    const hn = h.toNumber(), kn = k.toNumber(), an = a.toNumber(), bn = b.toNumber(), cn = c.value;
    const R = Math.max(cn, an, bn) * 2.2;
    const sl = slope.toNumber();
    return {
      ok: true,
      final: { texLines: [std, `\\text{Asymptotes: } ${asym}`] },
      answers: [
        { label: 'Standard form', valueTex: std, copy: '' },
        answer('c (centre to focus)', cn, { exactTex: c.exact ? undefined : c.tex, irrational: !c.exact }),
        answer('Eccentricity e', e.value, { primary: true, exactTex: e.exact ? undefined : e.tex, irrational: !e.exact }),
        fracAnswer('Asymptote slope (±)', slope),
        fracAnswer('Latus rectum length', lr),
      ],
      visual: {
        svg: plot({ x: [hn - R, hn + R], y: [kn - R * 0.8, kn + R * 0.8], equal: true, width: 360, height: 300, title: 'Hyperbola with asymptotes and foci', curves: [...branches(hn, kn, an, bn, horiz), { f: (x) => kn + sl * (x - hn), cls: 'd-hidden' }, { f: (x) => kn - sl * (x - hn), cls: 'd-hidden' }], points: [{ x: hn, y: kn, label: 'centre', cls: 'd-point2' }, ...(horiz ? [[hn - cn, kn], [hn + cn, kn]] : [[hn, kn - cn], [hn, kn + cn]]).map((f, i) => ({ x: f[0], y: f[1], label: `F${i + 1}`, cls: 'd-point3' }))] }),
        caption: 'The dashed lines are the asymptotes. Each branch curves around one focus.',
      },
      formula: [horiz ? '\\frac{(x - h)^2}{a^2} - \\frac{(y - k)^2}{b^2} = 1 \\qquad c^2 = a^2 + b^2' : '\\frac{(y - k)^2}{a^2} - \\frac{(x - h)^2}{b^2} = 1 \\qquad c^2 = a^2 + b^2'],
      steps,
      notes: [{ kind: 'info', text: 'Unlike an ellipse, b may be larger than a: a is always the semi-axis in the direction the hyperbola opens. Remember c² = a² + b² here (not a² − b²).' }],
    };
  },
};
