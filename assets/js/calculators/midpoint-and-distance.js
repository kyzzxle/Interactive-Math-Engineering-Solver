/** Midpoint M = ((x₁+x₂)/2, (y₁+y₂)/2) and distance d = √((x₂−x₁)² + (y₂−y₁)²) between two points. */
import { validator, fracAnswer, fp, pointTex, sqrtFrac, fmt, tx } from '../lib/calc-kit.js';
import { simplifySqrt } from '../lib/exact.js';
import { plot, windowAround } from '../lib/plot.js';

import { distanceExplore, distancePractice } from '../explore/geometry.js';
export const calculator = {
  id: 'midpoint-and-distance',
  explore: distanceExplore,
  practice: distancePractice,
  fields: [
    { name: 'x1', label: 'x₁', type: 'number', placeholder: 'e.g. -2', row: 'p1' },
    { name: 'y1', label: 'y₁', type: 'number', placeholder: 'e.g. 1', row: 'p1' },
    { name: 'x2', label: 'x₂', type: 'number', placeholder: 'e.g. 4', row: 'p2' },
    { name: 'y2', label: 'y₂', type: 'number', placeholder: 'e.g. 9', row: 'p2' },
  ],
  examples: [
    { label: '(−2, 1) and (4, 9)', values: { x1: '-2', y1: '1', x2: '4', y2: '9' } },
    { label: '(1, 2) and (4, 3)', values: { x1: '1', y1: '2', x2: '4', y2: '3' } },
    { label: 'Fractions: (1/2, −3) and (5/2, 1)', values: { x1: '1/2', y1: '-3', x2: '5/2', y2: '1' } },
  ],
  solve(values) {
    const v = validator(values);
    const [x1, y1, x2, y2] = [['x1', 'x₁'], ['y1', 'y₁'], ['x2', 'x₂'], ['y2', 'y₂']].map(([k, l]) => v.frac(k, l));
    if (!v.ok()) return v.result();
    const dx = x2.sub(x1), dy = y2.sub(y1);
    const mx = x1.add(x2).div(2), my = y1.add(y2).div(2);
    const d2 = dx.pow(2).add(dy.pow(2));
    const d = sqrtFrac(d2, simplifySqrt);
    const same = d2.isZero();
    const steps = [
      { title: 'Identify the two points', tex: `P_1 = ${pointTex(x1, y1)}, \\quad P_2 = ${pointTex(x2, y2)}` },
      { title: 'Midpoint: average the coordinates', texLines: ['M = \\left(\\frac{x_1 + x_2}{2},\\ \\frac{y_1 + y_2}{2}\\right)', `M = \\left(\\frac{${x1.toTex()} + ${fp(x2)}}{2},\\ \\frac{${y1.toTex()} + ${fp(y2)}}{2}\\right)`, `M = ${pointTex(mx, my)}`] },
      { title: 'Horizontal and vertical changes', texLines: [`\\Delta x = x_2 - x_1 = ${x2.toTex()} - ${fp(x1)} = ${dx.toTex()}`, `\\Delta y = y_2 - y_1 = ${y2.toTex()} - ${fp(y1)} = ${dy.toTex()}`] },
      { title: 'Distance (Pythagorean theorem)', texLines: ['d = \\sqrt{(\\Delta x)^2 + (\\Delta y)^2}', `d = \\sqrt{${fp(dx)}^2 + ${fp(dy)}^2} = \\sqrt{${d2.toTex()}}`, `d = ${d.tex}${d.exact ? '' : ` \\approx ${tx(d.value)}`}`] },
    ];
    const answers = [
      { label: 'Distance d', value: fmt(d.value), approx: !d.exact, primary: true, exactTex: d.exact ? undefined : d.tex, copy: `Distance: ${d.text}${d.exact ? '' : ` ≈ ${fmt(d.value)}`}` },
      { label: 'Midpoint M', value: `(${fmt(mx.toNumber())}, ${fmt(my.toNumber())})`, approx: !(mx.toDecimal() && my.toDecimal()), primary: true, exactTex: mx.isInt() && my.isInt() ? undefined : pointTex(mx, my), copy: `Midpoint: (${mx}, ${my})` },
      fracAnswer('Δx', dx),
      fracAnswer('Δy', dy),
    ];
    if (!dx.isZero()) answers.push(fracAnswer('Slope of the segment', dy.div(dx)));
    const pts = [x1, x2, mx].map((f) => f.toNumber()), ys = [y1, y2, my].map((f) => f.toNumber());
    const span = Math.max(...pts) - Math.min(...pts), spanY = Math.max(...ys) - Math.min(...ys);
    const svg = plot({
      x: windowAround(pts, Math.max(2, spanY / 2)), y: windowAround(ys, Math.max(2, span / 2)), equal: true,
      segments: [{ x1: pts[0], y1: ys[0], x2: pts[1], y2: ys[1], cls: 'd-line' }],
      points: [{ x: pts[0], y: ys[0], label: 'P₁' }, { x: pts[1], y: ys[1], label: 'P₂' }, { x: pts[2], y: ys[2], label: 'M', cls: 'd-foot' }],
      title: 'The two points, the segment joining them and its midpoint',
    });
    return {
      ok: true,
      final: { texLines: [`M = ${pointTex(mx, my)}`, `d = ${d.tex}${d.exact ? '' : ` \\approx ${tx(d.value)}`}`] },
      answers,
      visual: { svg, caption: 'The midpoint M lies halfway along the segment from P₁ to P₂.' },
      notes: same ? [{ kind: 'warn', text: 'The two points are the same, so the distance is 0 and the midpoint is the point itself.' }] : [],
      formula: ['M = \\left(\\frac{x_1 + x_2}{2}, \\frac{y_1 + y_2}{2}\\right) \\qquad d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}'],
      steps,
    };
  },
};
