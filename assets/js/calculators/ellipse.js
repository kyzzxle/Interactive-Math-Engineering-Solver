/**
 * Ellipse with centre (h, k), horizontal semi-axis a and vertical semi-axis b:
 *   (x − h)²/a² + (y − k)²/b² = 1
 * The major axis is the longer one. With p = max(a, b), q = min(a, b): c² = p² − q²,
 * foci at distance c from the centre along the major axis, e = c/p, latus rectum 2q²/p,
 * directrices at distance p²/c. Exact for fraction inputs.
 */
import { validator, answer, sqrtFrac, fracAnswer, tx, fmt } from '../lib/calc-kit.js';
import { simplifySqrt } from '../lib/exact.js';
import { plot } from '../lib/plot.js';
import { linearTex } from '../lib/lines.js';

const shift = (v, h) => (h.isZero() ? v : `${v} ${h.sign() > 0 ? '-' : '+'} ${h.abs().toTex()}`);
/** "h ± c" as TeX with an exact radical c. */
const pm = (h, c) => (h.isZero() ? `\\pm ${c.tex}` : `${h.toTex()} \\pm ${c.tex}`);

export const calculator = {
  id: 'ellipse',
  explore: {
    title: 'Draw an ellipse with two pins',
    intro: 'Move P around the ellipse. The distances to the two foci change, but their sum always equals the major-axis length 2a — that is the definition of an ellipse.',
    controls: [
      { name: 'a', label: 'Horizontal semi-axis a', min: 1, max: 7, step: 0.1, value: 5 },
      { name: 'b', label: 'Vertical semi-axis b', min: 1, max: 5, step: 0.1, value: 3 },
      { name: 't', label: 'Position of P', min: 0, max: 360, step: 1, value: 50, unit: '°' },
    ],
    animate: { control: 't', seconds: 8, loop: true },
    presets: [{ label: 'Circle (a = b)', values: { a: 4, b: 4 } }, { label: 'Very flat', values: { a: 7, b: 1.5 } }, { label: 'Tall', values: { a: 2, b: 5 } }],
    render({ a, b, t }) {
      const p = Math.max(a, b), q = Math.min(a, b), c = Math.sqrt(p * p - q * q);
      const F1 = a >= b ? [-c, 0] : [0, -c], F2 = a >= b ? [c, 0] : [0, c];
      const r = (t * Math.PI) / 180, P = [a * Math.cos(r), b * Math.sin(r)];
      const d1 = Math.hypot(P[0] - F1[0], P[1] - F1[1]), d2 = Math.hypot(P[0] - F2[0], P[1] - F2[1]);
      return {
        svg: plot({ x: [-8, 8], y: [-6, 6], equal: true, width: 400, height: 300, title: 'Ellipse with foci', curves: [{ f: (x) => (Math.abs(x) <= a ? b * Math.sqrt(1 - (x / a) ** 2) : NaN), samples: 800 }, { f: (x) => (Math.abs(x) <= a ? -b * Math.sqrt(1 - (x / a) ** 2) : NaN), samples: 800 }], segments: [{ x1: F1[0], y1: F1[1], x2: P[0], y2: P[1], cls: 'd-line2' }, { x1: F2[0], y1: F2[1], x2: P[0], y2: P[1], cls: 'd-line3' }], points: [{ x: F1[0], y: F1[1], label: 'F₁', cls: 'd-point2' }, { x: F2[0], y: F2[1], label: 'F₂', cls: 'd-point3' }, { x: P[0], y: P[1], label: 'P' }] }),
        readouts: [
          { label: 'Distances to the foci', tex: `PF_1 \\approx ${tx(d1, 3)},\\ PF_2 \\approx ${tx(d2, 3)}` },
          { label: 'Sum (constant)', tex: `PF_1 + PF_2 \\approx ${tx(d1 + d2, 3)} = 2 \\cdot ${tx(p, 2)}`, tone: 'good' },
          { label: 'Eccentricity', tex: `e = \\frac{c}{${a >= b ? 'a' : 'b'}} \\approx ${tx(c / p, 3)}` },
        ],
      };
    },
  },
  fields: [
    { name: 'h', label: 'Centre h', type: 'text', placeholder: 'e.g. 2', row: 'c' },
    { name: 'k', label: 'Centre k', type: 'text', placeholder: 'e.g. -1', row: 'c' },
    { name: 'a', label: 'Horizontal semi-axis a', type: 'text', placeholder: 'e.g. 5', row: 'ab', hint: 'Half the width.' },
    { name: 'b', label: 'Vertical semi-axis b', type: 'text', placeholder: 'e.g. 3', row: 'ab', hint: 'Half the height.' },
  ],
  examples: [
    { label: 'Centre (2, −1), a = 5, b = 3', values: { h: '2', k: '-1', a: '5', b: '3' } },
    { label: 'Vertical major axis: a = 2, b = 4', values: { h: '0', k: '0', a: '2', b: '4' } },
    { label: 'Radical foci: a = 3, b = 2', values: { h: '1', k: '1', a: '3', b: '2' } },
    { label: 'Circle: a = b = 4', values: { h: '0', k: '0', a: '4', b: '4' } },
    { label: 'Invalid: negative semi-axis', values: { h: '0', k: '0', a: '-3', b: '2' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const h = v.frac('h', 'h'), k = v.frac('k', 'k'), a = v.frac('a', 'semi-axis a'), b = v.frac('b', 'semi-axis b');
    if (a && a.sign() <= 0) v.fail('a', 'The semi-axis a must be greater than 0.');
    if (b && b.sign() <= 0) v.fail('b', 'The semi-axis b must be greater than 0.');
    if (!v.ok()) return v.result();
    if ([h, k, a, b].some((f) => f.abs().toNumber() > 1e6)) return { ok: false, errors: [{ message: 'Please keep all values between −1,000,000 and 1,000,000.' }] };
    const horiz = a.cmp(b) >= 0, circle = a.eq(b);
    const p = horiz ? a : b, q = horiz ? b : a;
    const c2 = p.pow(2).sub(q.pow(2));
    const c = sqrtFrac(c2, simplifySqrt);
    const e = sqrtFrac(c2.div(p.pow(2)), simplifySqrt);
    const lr = q.pow(2).mul(2).div(p);
    const a2 = a.pow(2), b2 = b.pow(2);
    // general form: b²(x − h)² + a²(y − k)² − a²b² = 0
    const A = b2, C = a2, D = b2.mul(h).mul(-2), E = a2.mul(k).mul(-2), Fc = b2.mul(h.pow(2)).add(a2.mul(k.pow(2))).sub(a2.mul(b2));
    const general = `${linearTex([[A, 'x^2'], [C, 'y^2'], [D, 'x'], [E, 'y'], [Fc, '']])} = 0`;
    const sq = (vv, cc) => (cc.isZero() ? `${vv}^2` : `(${shift(vv, cc)})^2`);
    const term = (top, den) => (den.isOne() ? top : `\\frac{${top}}{${den.toTex()}}`);
    const std = `${term(sq('x', h), a2)} + ${term(sq('y', k), b2)} = 1`;
    const axisVar = horiz ? 'x' : 'y', c0 = horiz ? h : k, other = horiz ? k : h;
    const ptTex = (main, side) => (horiz ? `\\left(${main},\\ ${side}\\right)` : `\\left(${side},\\ ${main}\\right)`);
    const steps = [
      { title: 'Known values', tex: `(h, k) = (${h.toTex()},\\ ${k.toTex()}),\\quad a = ${a.toTex()},\\quad b = ${b.toTex()}` },
      { title: 'Standard form', tex: std },
      { title: circle ? 'Equal semi-axes: a circle' : `Major axis is ${horiz ? 'horizontal (a > b)' : 'vertical (b > a)'}`, text: circle ? 'With a = b the ellipse is a circle: both foci are at the centre.' : `The major semi-axis is ${horiz ? 'a' : 'b'} = ${p}, the minor semi-axis is ${horiz ? 'b' : 'a'} = ${q}.` },
      { title: 'Focal distance', texLines: [`c^2 = ${horiz ? 'a^2 - b^2' : 'b^2 - a^2'} = ${p.pow(2).toTex()} - ${q.pow(2).toTex()} = ${c2.toTex()}`, `c = ${c.tex}${c.exact ? '' : ` \\approx ${fmt(c.value)}`}`] },
      { title: 'Vertices, co-vertices and foci', texLines: [`\\text{Vertices: } ${ptTex(`${c0.toTex()} \\pm ${p.toTex()}`, other.toTex())}`, `\\text{Co-vertices: } ${horiz ? `\\left(${h.toTex()},\\ ${k.toTex()} \\pm ${q.toTex()}\\right)` : `\\left(${h.toTex()} \\pm ${q.toTex()},\\ ${k.toTex()}\\right)`}`, `\\text{Foci: } ${ptTex(pm(c0, c), other.toTex())}`] },
      { title: 'Eccentricity and latus rectum', texLines: [`e = \\frac{c}{${horiz ? 'a' : 'b'}} = ${e.tex}${e.exact ? '' : ` \\approx ${fmt(e.value)}`}`, `\\text{latus rectum} = \\frac{2${horiz ? 'b' : 'a'}^2}{${horiz ? 'a' : 'b'}} = ${lr.toTex()}`] },
      { title: 'General form (multiply out and collect terms)', tex: general },
    ];
    if (!circle) steps.push({ title: 'Directrices', tex: `${axisVar} = ${c0.toTex()} \\pm \\frac{${p.pow(2).toTex()}}{c} ${c.exact ? `= ${c0.toTex()} \\pm ${p.pow(2).toNumber() / c.value}` : `\\approx ${fmt(c0.toNumber())} \\pm ${fmt(p.pow(2).toNumber() / c.value, 4)}`}` });
    const an = a.toNumber(), bn = b.toNumber(), hn = h.toNumber(), kn = k.toNumber(), cn = c.value;
    const R = Math.max(an, bn) * 1.25;
    const foci = horiz ? [[hn - cn, kn], [hn + cn, kn]] : [[hn, kn - cn], [hn, kn + cn]];
    const ram = Math.PI * (3 * (an + bn) - Math.sqrt((3 * an + bn) * (an + 3 * bn)));
    return {
      ok: true,
      final: { texLines: [std, circle ? `\\text{A circle of radius } ${a.toTex()}\\text{: both foci at the centre, } e = 0` : `\\text{Foci: } ${ptTex(pm(c0, c), other.toTex())},\\quad e = ${e.tex}`] },
      answers: [
        { label: 'Standard form', valueTex: std, copy: '' },
        answer('c (centre to focus)', cn, { exactTex: c.exact ? undefined : c.tex, irrational: !c.exact }),
        answer('Eccentricity e', e.value, { primary: true, exactTex: e.exact ? undefined : e.tex, irrational: !e.exact }),
        fracAnswer('Latus rectum length', lr),
        answer('Area πab', Math.PI * an * bn, { irrational: true }),
        answer('Perimeter (Ramanujan approximation)', ram, { irrational: true }),
      ],
      visual: {
        svg: plot({ x: [hn - R, hn + R], y: [kn - R, kn + R], equal: true, width: 360, height: 300, title: 'Ellipse with centre, vertices and foci', curves: [{ f: (x) => (Math.abs(x - hn) <= an ? kn + bn * Math.sqrt(1 - ((x - hn) / an) ** 2) : NaN), samples: 900 }, { f: (x) => (Math.abs(x - hn) <= an ? kn - bn * Math.sqrt(1 - ((x - hn) / an) ** 2) : NaN), samples: 900 }], segments: [horiz ? { x1: hn - an, y1: kn, x2: hn + an, y2: kn, cls: 'd-perp' } : { x1: hn, y1: kn - bn, x2: hn, y2: kn + bn, cls: 'd-perp' }], points: [{ x: hn, y: kn, label: 'centre', cls: 'd-point2' }, ...foci.map((f, i) => ({ x: f[0], y: f[1], label: circle ? '' : `F${i + 1}`, cls: 'd-point3' }))] }),
        caption: 'The dashed line is the major axis. Every point on the ellipse has distances to F₁ and F₂ that add up to the major-axis length.',
      },
      formula: ['\\frac{(x - h)^2}{a^2} + \\frac{(y - k)^2}{b^2} = 1 \\qquad c^2 = |a^2 - b^2| \\qquad e = \\frac{c}{\\max(a, b)}'],
      steps,
      notes: [{ kind: 'info', text: 'Here a is always the horizontal semi-axis and b the vertical one; the major axis is whichever is longer. The perimeter has no exact elementary formula, so Ramanujan’s approximation is shown (very accurate).' }],
    };
  },
};
