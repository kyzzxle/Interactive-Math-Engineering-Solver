/**
 * Optimization for three classic problem types, solved with derivatives:
 *   box   — open box from a W × L sheet by cutting squares of side x: maximise V = x(W − 2x)(L − 2x)
 *   fence — rectangle with a fixed length of fencing P (optionally one side along a wall): maximise area
 *   can   — closed cylinder holding a fixed volume V: minimise the surface area 2πr² + 2V/r
 * Each answer is confirmed with the second-derivative test (or the endpoints).
 */
import { validator, answer, tx } from '../lib/calc-kit.js';
import { plot } from '../lib/plot.js';

const TYPES = [['box', 'Open box from a sheet (maximise volume)'], ['fence', 'Fenced rectangle (maximise area)'], ['can', 'Cylindrical can (minimise material)']];
const boxV = (W, L, x) => x * (W - 2 * x) * (L - 2 * x);
const boxX = (W, L) => ((W + L) - Math.sqrt((W + L) ** 2 - 3 * W * L)) / 6;

export const calculator = {
  id: 'optimization',
  explore: {
    title: 'Find the best cut',
    intro: 'Cut squares of side x from each corner and fold up the sides. Small cuts give a shallow box, big cuts a narrow one — the volume peaks in between, where the slope of V(x) is 0.',
    controls: [
      { name: 'W', label: 'Sheet width W', min: 4, max: 30, step: 1, value: 20 },
      { name: 'L', label: 'Sheet length L', min: 4, max: 40, step: 1, value: 30 },
      { name: 'x', label: 'Cut size x', min: 0, max: (v) => Math.min(v.W, v.L) / 2, step: 0.05, value: 2 },
    ],
    render({ W, L, x }) {
      const xs = boxX(W, L), Vmax = boxV(W, L, xs), V = boxV(W, L, x);
      return {
        svg: plot({ x: [0, Math.min(W, L) / 2], width: 400, height: 260, title: 'Volume V(x) of the box', curves: [{ f: (t) => boxV(W, L, t) }], points: [{ x, y: V, label: `x = ${x}` }, { x: xs, y: Vmax, label: 'maximum', cls: 'd-point2' }], xLabel: 'x', yLabel: 'V' }),
        readouts: [
          { label: 'Box now', tex: `${tx(x, 2)} \\times ${tx(W - 2 * x, 2)} \\times ${tx(L - 2 * x, 2)},\\ V \\approx ${tx(V, 1)}` },
          { label: 'Best cut', tex: `x^* \\approx ${tx(xs, 3)},\\ V_{\\max} \\approx ${tx(Vmax, 1)}`, tone: 'good' },
          { label: 'Slope here', tex: `V'(x) \\approx ${tx(12 * x * x - 4 * (W + L) * x + W * L, 2)}` },
        ],
      };
    },
  },
  fields: [
    { name: 'type', label: 'Problem type', type: 'select', options: TYPES },
    { name: 'W', label: 'Sheet width W', type: 'number', signed: false, placeholder: 'e.g. 20', row: 'b', showWhen: { type: ['box'] }, rowShowWhen: { type: ['box'] } },
    { name: 'L', label: 'Sheet length L', type: 'number', signed: false, placeholder: 'e.g. 30', row: 'b', showWhen: { type: ['box'] } },
    { name: 'P', label: 'Total fencing P', type: 'number', signed: false, placeholder: 'e.g. 100', showWhen: { type: ['fence'] } },
    { name: 'wall', label: 'Sides to fence', type: 'radio', options: [['4', 'All four sides'], ['3', 'Three sides (one side is a wall)']], showWhen: { type: ['fence'] } },
    { name: 'V', label: 'Volume V', type: 'number', signed: false, placeholder: 'e.g. 500', showWhen: { type: ['can'] } },
  ],
  examples: [
    { label: 'Box from a 20 × 30 sheet', values: { type: 'box', W: '20', L: '30' } },
    { label: 'Fence 100 m, four sides', values: { type: 'fence', P: '100', wall: '4' } },
    { label: 'Fence 100 m along a wall', values: { type: 'fence', P: '100', wall: '3' } },
    { label: 'Can holding 500 cm³', values: { type: 'can', V: '500' } },
    { label: 'Invalid: zero fencing', values: { type: 'fence', P: '0', wall: '4' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const type = TYPES.some(([k]) => k === values.type) ? values.type : 'box';
    if (type === 'box') {
      const W = v.number('W', 'the width', { positive: true, maxAbs: 1e6 }), L = v.number('L', 'the length', { positive: true, maxAbs: 1e6 });
      if (!v.ok()) return v.result();
      const x = boxX(W, L), V = boxV(W, L, x), lim = Math.min(W, L) / 2;
      const d2 = 24 * x - 4 * (W + L);
      return out({
        final: `x \\approx ${tx(x)},\\quad V_{\\max} \\approx ${tx(V)}`,
        answers: [answer('Cut size x', x, { primary: true, irrational: true }), answer('Maximum volume', V, { primary: true, irrational: true }), answer('Box base', W - 2 * x, { irrational: true }), answer('Box base (other side)', L - 2 * x, { irrational: true })],
        steps: [
          { title: 'Objective: the volume of the box', tex: `V(x) = x(W - 2x)(L - 2x) = x(${tx(W)} - 2x)(${tx(L)} - 2x)` },
          { title: 'Domain', tex: `0 < x < \\frac{\\min(W, L)}{2} = ${tx(lim)}` },
          { title: 'Expand and differentiate', texLines: [`V(x) = 4x^3 - ${tx(2 * (W + L))}x^2 + ${tx(W * L)}x`, `V'(x) = 12x^2 - ${tx(4 * (W + L))}x + ${tx(W * L)}`] },
          { title: 'Critical points: V′(x) = 0 (quadratic formula)', tex: `x = \\frac{${tx(W + L)} \\pm \\sqrt{${tx((W + L) ** 2)} - ${tx(3 * W * L)}}}{6} \\Rightarrow x \\approx ${tx(x)}\\ \\text{(the other root is outside the domain)}` },
          { title: 'Second-derivative test', tex: `V''(x) = 24x - ${tx(4 * (W + L))} \\approx ${tx(d2)} < 0 \\Rightarrow \\text{maximum}` },
          { title: 'Maximum volume', tex: `V(${tx(x, 4)}) \\approx ${tx(V)}` },
        ],
        svg: plot({ x: [0, lim], width: 380, height: 250, title: 'Volume as a function of the cut', curves: [{ f: (t) => boxV(W, L, t) }], points: [{ x, y: V, label: 'maximum', cls: 'd-point2' }], xLabel: 'x', yLabel: 'V' }),
        caption: 'The volume is zero for no cut and for the largest possible cut; the maximum lies between.',
        formula: 'V(x) = x(W - 2x)(L - 2x)',
      });
    }
    if (type === 'fence') {
      const P = v.number('P', 'the fencing length', { positive: true, maxAbs: 1e9 });
      if (!v.ok()) return v.result();
      const wall = values.wall === '3';
      const x = P / 4, y = wall ? P / 2 : P / 4, A = x * y;
      return out({
        final: wall ? `x = ${tx(x)},\\ y = ${tx(y)},\\ A_{\\max} = ${tx(A)}` : `\\text{a square of side } ${tx(x)},\\ A_{\\max} = ${tx(A)}`,
        answers: [answer(wall ? 'Side perpendicular to the wall x' : 'Width x', x, { primary: true }), answer(wall ? 'Side parallel to the wall y' : 'Length y', y, { primary: true }), answer('Maximum area', A, { primary: true })],
        steps: wall ? [
          { title: 'Constraint (the wall needs no fence)', tex: `2x + y = ${tx(P)} \\Rightarrow y = ${tx(P)} - 2x` },
          { title: 'Objective', tex: `A(x) = x(${tx(P)} - 2x) = ${tx(P)}x - 2x^2,\\quad 0 < x < ${tx(P / 2)}` },
          { title: 'Differentiate and set to zero', tex: `A'(x) = ${tx(P)} - 4x = 0 \\Rightarrow x = ${tx(x)}` },
          { title: 'Second-derivative test', tex: "A''(x) = -4 < 0 \\Rightarrow \\text{maximum}" },
          { title: 'Dimensions and area', tex: `y = ${tx(P)} - 2(${tx(x)}) = ${tx(y)},\\quad A = ${tx(A)}` },
        ] : [
          { title: 'Constraint', tex: `2x + 2y = ${tx(P)} \\Rightarrow y = ${tx(P / 2)} - x` },
          { title: 'Objective', tex: `A(x) = x(${tx(P / 2)} - x),\\quad 0 < x < ${tx(P / 2)}` },
          { title: 'Differentiate and set to zero', tex: `A'(x) = ${tx(P / 2)} - 2x = 0 \\Rightarrow x = ${tx(x)}` },
          { title: 'Second-derivative test', tex: "A''(x) = -2 < 0 \\Rightarrow \\text{maximum}" },
          { title: 'Dimensions and area', tex: `y = ${tx(y)}\\ \\text{(a square)},\\quad A = ${tx(A)}` },
        ],
        svg: plot({ x: [0, P / 2], width: 380, height: 250, title: 'Area as a function of x', curves: [{ f: (t) => (wall ? t * (P - 2 * t) : t * (P / 2 - t)) }], points: [{ x, y: A, label: 'maximum', cls: 'd-point2' }], xLabel: 'x', yLabel: 'A' }),
        caption: wall ? 'With a wall, the best rectangle is twice as long as it is wide.' : 'Of all rectangles with the same perimeter, the square has the largest area.',
        formula: wall ? '2x + y = P,\\quad A = xy' : '2x + 2y = P,\\quad A = xy',
      });
    }
    const V = v.number('V', 'the volume', { positive: true, maxAbs: 1e12 });
    if (!v.ok()) return v.result();
    const r = Math.cbrt(V / (2 * Math.PI)), h = V / (Math.PI * r * r), S = 2 * Math.PI * r * r + (2 * V) / r;
    return out({
      final: `r \\approx ${tx(r)},\\quad h \\approx ${tx(h)} = 2r,\\quad A_{\\min} \\approx ${tx(S)}`,
      answers: [answer('Radius r', r, { primary: true, irrational: true }), answer('Height h', h, { primary: true, irrational: true }), answer('Minimum surface area', S, { primary: true, irrational: true })],
      steps: [
        { title: 'Constraint: fixed volume', tex: `\\pi r^2 h = ${tx(V)} \\Rightarrow h = \\frac{${tx(V)}}{\\pi r^2}` },
        { title: 'Objective: total surface area (top, bottom, side)', tex: `A(r) = 2\\pi r^2 + 2\\pi r h = 2\\pi r^2 + \\frac{${tx(2 * V)}}{r}` },
        { title: 'Differentiate and set to zero', tex: `A'(r) = 4\\pi r - \\frac{${tx(2 * V)}}{r^2} = 0 \\Rightarrow r^3 = \\frac{${tx(V)}}{2\\pi} \\Rightarrow r \\approx ${tx(r)}` },
        { title: 'Second-derivative test', tex: `A''(r) = 4\\pi + \\frac{${tx(4 * V)}}{r^3} > 0 \\Rightarrow \\text{minimum}` },
        { title: 'Height and area', tex: `h = \\frac{${tx(V)}}{\\pi r^2} \\approx ${tx(h)} = 2r,\\quad A \\approx ${tx(S)}` },
      ],
      svg: plot({ x: [r * 0.25, r * 3], width: 380, height: 250, title: 'Surface area as a function of the radius', curves: [{ f: (t) => 2 * Math.PI * t * t + (2 * V) / t }], points: [{ x: r, y: S, label: 'minimum', cls: 'd-point2' }], xLabel: 'r', yLabel: 'A' }),
      caption: 'The cheapest closed can is as tall as it is wide (h = 2r).',
      formula: 'A = 2\\pi r^2 + 2\\pi r h,\\quad \\pi r^2 h = V',
    });

    function out(o) {
      return {
        ok: true,
        final: { tex: o.final },
        answers: o.answers,
        visual: { svg: o.svg, caption: o.caption },
        formula: [o.formula],
        steps: o.steps,
        notes: [{ kind: 'info', text: 'Supported problem types only: the open box, the fenced rectangle and the closed can. Always check that the critical point lies in the allowed domain and is a maximum or minimum, not just where the derivative is zero.' }],
      };
    }
  },
};
