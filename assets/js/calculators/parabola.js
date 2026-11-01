/**
 * Parabola properties for supported forms (exact fractions):
 *   y = ax² + bx + c          (opens up/down)
 *   x = ay² + by + c          (opens right/left)
 *   (x − h)² = 4p(y − k)      (vertex form, vertical axis)
 *   (y − k)² = 4p(x − h)      (vertex form, horizontal axis)
 * Results: vertex, focus, directrix, axis of symmetry, p, latus rectum length, intercepts and a graph.
 */
import { validator, pointTex, fmt } from '../lib/calc-kit.js';
import { Frac } from '../lib/fraction.js';
import { plot } from '../lib/plot.js';

const FORMS = [
  ['yx', 'y = ax² + bx + c'],
  ['xy', 'x = ay² + by + c'],
  ['vv', '(x − h)² = 4p(y − k)'],
  ['vh', '(y − k)² = 4p(x − h)'],
];

export const calculator = {
  id: 'parabola',
  fields: [
    { name: 'form', label: 'Form of the equation', type: 'select', options: FORMS },
    { name: 'a', label: 'a', type: 'number', placeholder: 'e.g. 1', row: 'q', showWhen: { form: ['yx', 'xy'] }, rowShowWhen: { form: ['yx', 'xy'] } },
    { name: 'b', label: 'b', type: 'number', placeholder: 'e.g. -4', row: 'q', showWhen: { form: ['yx', 'xy'] } },
    { name: 'c', label: 'c', type: 'number', placeholder: 'e.g. 3', row: 'q', showWhen: { form: ['yx', 'xy'] } },
    { name: 'h', label: 'h', type: 'number', placeholder: 'e.g. 2', row: 'v', showWhen: { form: ['vv', 'vh'] }, rowShowWhen: { form: ['vv', 'vh'] } },
    { name: 'k', label: 'k', type: 'number', placeholder: 'e.g. -1', row: 'v', showWhen: { form: ['vv', 'vh'] } },
    { name: 'p', label: 'p', type: 'number', placeholder: 'e.g. 1', row: 'v', showWhen: { form: ['vv', 'vh'] } },
  ],
  examples: [
    { label: 'y = x² − 4x + 3', values: { form: 'yx', a: '1', b: '-4', c: '3' } },
    { label: '(y − 1)² = 8(x + 2)', values: { form: 'vh', h: '-2', k: '1', p: '2' } },
    { label: 'y = −0.5x² + 2', values: { form: 'yx', a: '-0.5', b: '0', c: '2' } },
  ],
  solve(values) {
    const v = validator(values);
    const form = FORMS.some(([f]) => f === values.form) ? values.form : 'yx';
    let h, k, p, vertical, steps = [], eqTex, intercepts = [];
    if (form === 'yx' || form === 'xy') {
      const a = v.frac('a', 'a'), b = v.frac('b', 'b'), c = v.frac('c', 'c');
      if (!v.ok()) return v.result();
      if (a.isZero()) return { ok: false, errors: [{ field: 'a', message: 'a cannot be 0: the equation would be a straight line, not a parabola.' }] };
      vertical = form === 'yx';
      const [u, w] = vertical ? ['x', 'y'] : ['y', 'x'];
      const hv = b.neg().div(a.mul(2));
      const kv = c.sub(b.pow(2).div(a.mul(4)));
      p = new Frac(1n).div(a.mul(4));
      eqTex = `${w} = ${termsTex(a, b, c, u)}`;
      steps.push({ title: 'Identify the equation and its coefficients', texLines: [eqTex, `a = ${a.toTex()}, \\quad b = ${b.toTex()}, \\quad c = ${c.toTex()}`] });
      steps.push({ title: 'Vertex', text: `The ${u}-coordinate of the vertex is −b/(2a); substitute it back to get the other coordinate.`, texLines: [`${u}_0 = -\\frac{b}{2a} = -\\frac{${b.toTex()}}{2(${a.toTex()})} = ${hv.toTex()}`, `${w}_0 = c - \\frac{b^2}{4a} = ${c.toTex()} - \\frac{(${b.toTex()})^2}{4(${a.toTex()})} = ${kv.toTex()}`] });
      steps.push({ title: 'Focal distance p', text: 'Comparing with the vertex form shows that a = 1/(4p).', texLines: [`p = \\frac{1}{4a} = \\frac{1}{4(${a.toTex()})} = ${p.toTex()}`] });
      if (vertical) { h = hv; k = kv; } else { h = kv; k = hv; }
      // intercepts with the axis of the dependent variable
      const disc = b.pow(2).sub(a.mul(c).mul(4));
      const dn = disc.toNumber();
      const roots = dn < 0 ? [] : dn === 0 ? [b.neg().div(a.mul(2)).toNumber()] : [(-b.toNumber() - Math.sqrt(dn)) / (2 * a.toNumber()), (-b.toNumber() + Math.sqrt(dn)) / (2 * a.toNumber())].sort((m, n) => m - n);
      intercepts = [{ label: `${u}-intercept${roots.length === 1 ? '' : 's'}`, value: roots.length ? roots.map((x) => fmt(x)).join(', ') : 'none (b² − 4ac < 0)', approx: roots.some((x) => Math.abs(x * 1e6 - Math.round(x * 1e6)) > 1e-6) }, { label: `${w}-intercept`, value: fmt(c.toNumber()) }];
    } else {
      h = v.frac('h', 'h'); k = v.frac('k', 'k'); p = v.frac('p', 'p');
      if (!v.ok()) return v.result();
      if (p.isZero()) return { ok: false, errors: [{ field: 'p', message: 'p cannot be 0: the equation would collapse to a line, not a parabola.' }] };
      vertical = form === 'vv';
      const [u, w, s, t] = vertical ? ['x', 'y', h, k] : ['y', 'x', k, h];
      eqTex = `${sq(u, s)} = ${p.mul(4).toTex()}${lin(w, t)}`;
      steps.push({ title: 'Read the vertex and p from the vertex form', texLines: [`${sq(u, s)} = 4p${lin(w, t)}`, `(h, k) = ${pointTex(h, k)}, \\qquad 4p = ${p.mul(4).toTex()} \\Rightarrow p = ${p.toTex()}`] });
    }
    const focus = vertical ? [h, k.add(p)] : [h.add(p), k];
    const directrix = vertical ? `y = ${k.sub(p).toTex()}` : `x = ${h.sub(p).toTex()}`;
    const axis = vertical ? `x = ${h.toTex()}` : `y = ${k.toTex()}`;
    const opens = vertical ? (p.sign() > 0 ? 'upward' : 'downward') : (p.sign() > 0 ? 'to the right' : 'to the left');
    const lr = p.mul(4).abs();
    steps.push({ title: 'Focus, directrix and axis', text: `Since p ${p.sign() > 0 ? '> 0' : '< 0'}, the parabola opens ${opens}. The focus is p units from the vertex inside the curve; the directrix is p units on the other side.`, texLines: [`\\text{Focus } = ${pointTex(focus[0], focus[1])}`, `\\text{Directrix: } ${directrix}`, `\\text{Axis of symmetry: } ${axis}`, `\\text{Latus rectum length } |4p| = ${lr.toTex()}`] });

    const hn = h.toNumber(), kn = k.toNumber(), pn = p.toNumber();
    const span = Math.max(6 * Math.abs(pn), 4);
    let curves, x, y;
    if (vertical) {
      curves = [{ f: (xx) => kn + ((xx - hn) ** 2) / (4 * pn), cls: 'd-line' }];
      x = [hn - span, hn + span]; y = pn > 0 ? [kn - span * 0.6, kn + span * 1.4] : [kn - span * 1.4, kn + span * 0.6];
    } else {
      curves = [{ f: (xx) => { const q = (xx - hn) / pn; return q < 0 ? NaN : kn + 2 * Math.sqrt(pn * (xx - hn)); }, cls: 'd-line' }, { f: (xx) => { const q = (xx - hn) / pn; return q < 0 ? NaN : kn - 2 * Math.sqrt(pn * (xx - hn)); }, cls: 'd-line' }];
      x = pn > 0 ? [hn - span * 0.6, hn + span * 1.4] : [hn - span * 1.4, hn + span * 0.6]; y = [kn - span, kn + span];
    }
    const svg = plot({
      x, y, equal: true, curves,
      hlines: vertical ? [{ y: kn - pn, cls: 'd-line3', label: 'directrix' }] : [],
      vlines: vertical ? [] : [{ x: hn - pn, cls: 'd-line3', label: 'directrix' }],
      points: [{ x: hn, y: kn, label: 'V' }, { x: focus[0].toNumber(), y: focus[1].toNumber(), label: 'F', cls: 'd-foot' }],
      title: 'Graph of the parabola with its vertex, focus and directrix',
    });
    return {
      ok: true,
      final: { texLines: [`V = ${pointTex(h, k)}, \\quad F = ${pointTex(focus[0], focus[1])}`, `\\text{directrix } ${directrix}`] },
      answers: [
        { label: 'Vertex V', valueTex: pointTex(h, k), primary: true, copy: `Vertex (${h}, ${k})` },
        { label: 'Focus F', valueTex: pointTex(focus[0], focus[1]), primary: true, copy: `Focus (${focus[0]}, ${focus[1]})` },
        { label: 'Directrix', valueTex: directrix, primary: true, copy: `Directrix ${directrix.replace(/\\frac\{(-?\d+)\}\{(\d+)\}/g, '$1/$2')}` },
        { label: 'Axis of symmetry', valueTex: axis },
        { label: 'p (vertex to focus)', valueTex: p.toTex(), copy: `p = ${p}` },
        { label: 'Opens', value: opens },
        { label: 'Latus rectum length', valueTex: lr.toTex(), copy: `|4p| = ${lr}` },
        ...intercepts,
      ],
      visual: { svg, legend: '<div class="legend"><span><i></i>Parabola</span><span><i class="l3"></i>Directrix</span></div>', caption: 'Every point on the parabola is equally far from the focus F and the directrix.' },
      formula: ['(x - h)^2 = 4p(y - k) \\qquad y = ax^2 + bx + c \\Rightarrow p = \\frac{1}{4a}'],
      steps,
      rounding: 'Vertex, focus, directrix and p are exact fractions; intercepts are rounded to 6 decimal places.',
    };
  },
};

function termsTex(a, b, c, u) {
  const parts = [[a, `${u}^2`], [b, u], [c, '']].filter(([f]) => !f.isZero());
  return parts.map(([f, s], i) => {
    const neg = f.sign() < 0, abs = f.abs();
    const body = s ? `${abs.isOne() ? '' : abs.toTex()}${s}` : abs.toTex();
    return i === 0 ? `${neg ? '-' : ''}${body}` : ` ${neg ? '-' : '+'} ${body}`;
  }).join('');
}
const sq = (u, s) => (s.isZero() ? `${u}^2` : `\\left(${u} ${s.sign() < 0 ? '+' : '-'} ${s.abs().toTex()}\\right)^2`);
const lin = (w, t) => (t.isZero() ? w : `\\left(${w} ${t.sign() < 0 ? '+' : '-'} ${t.abs().toTex()}\\right)`);
