/**
 * Intersection of A₁x + B₁y + C₁ = 0 and A₂x + B₂y + C₂ = 0 by Cramer's rule (exact fractions).
 * D = A₁B₂ − A₂B₁; if D ≠ 0, x = (B₁C₂ − B₂C₁)/D and y = (A₂C₁ − A₁C₂)/D.
 */
import { validator, fp, pointTex, fmt } from '../lib/calc-kit.js';
import { generalTex } from '../lib/lines.js';
import { plot, windowAround } from '../lib/plot.js';

import { twoLinesExplore } from '../explore/geometry.js';
import { intersectionPractice } from '../explore/analytic-practice.js';
const line = (n) => [
  { name: `A${n}`, label: `A${n === 1 ? '₁' : '₂'}`, type: 'number', placeholder: n === 1 ? 'e.g. 2' : 'e.g. 1', row: `l${n}` },
  { name: `B${n}`, label: `B${n === 1 ? '₁' : '₂'}`, type: 'number', placeholder: n === 1 ? 'e.g. 3' : 'e.g. -1', row: `l${n}` },
  { name: `C${n}`, label: `C${n === 1 ? '₁' : '₂'}`, type: 'number', placeholder: n === 1 ? 'e.g. -12' : 'e.g. -1', row: `l${n}` },
];

export const calculator = {
  id: 'intersection-of-two-lines',
  practice: intersectionPractice,
  explore: twoLinesExplore,
  fields: [...line(1), ...line(2)],
  examples: [
    { label: '2x + 3y − 12 = 0 and x − y − 1 = 0', values: { A1: '2', B1: '3', C1: '-12', A2: '1', B2: '-1', C2: '-1' } },
    { label: 'Parallel lines', values: { A1: '1', B1: '2', C1: '-4', A2: '2', B2: '4', C2: '3' } },
    { label: 'Same line written twice', values: { A1: '1', B1: '-1', C1: '2', A2: '3', B2: '-3', C2: '6' } },
  ],
  solve(values) {
    const v = validator(values);
    const c = {};
    for (const k of ['A1', 'B1', 'C1', 'A2', 'B2', 'C2']) c[k] = v.frac(k, k.replace('1', '₁').replace('2', '₂'));
    if (!v.ok()) return v.result();
    for (const n of [1, 2]) if (c[`A${n}`].isZero() && c[`B${n}`].isZero()) v.fail([`A${n}`, `B${n}`], `In line ${n}, A and B cannot both be 0 — the equation would not describe a line.`);
    if (!v.ok()) return v.result();
    const { A1, B1, C1, A2, B2, C2 } = c;
    const D = A1.mul(B2).sub(A2.mul(B1));
    const Dx = B1.mul(C2).sub(B2.mul(C1));
    const Dy = A2.mul(C1).sub(A1.mul(C2));
    const steps = [
      { title: 'Write both lines in general form', texLines: [`L_1:\\ ${generalTex(A1, B1, C1)}`, `L_2:\\ ${generalTex(A2, B2, C2)}`], note: 'The intersection point is the one pair (x, y) that makes both equations true at the same time, so we solve them as a system.' },
      { title: 'Determinant of the coefficients', text: 'If this determinant is zero the lines have the same slope (parallel or identical).', texLines: ['D = A_1 B_2 - A_2 B_1', `D = ${fp(A1)}${fp(B2)} - ${fp(A2)}${fp(B1)} = ${A1.mul(B2).toTex()} - ${fp(A2.mul(B1))} = ${D.toTex()}`], note: D.isZero() ? 'D = 0, so the slopes are equal and there is no single intersection point.' : 'D is not zero, so the slopes differ and the lines cross at exactly one point.' },
    ];
    const f = (A, B, C) => (x) => (B.isZero() ? NaN : -(A.toNumber() * x + C.toNumber()) / B.toNumber());
    const vline = (A, B, C, cls) => (B.isZero() ? [{ x: -C.toNumber() / A.toNumber(), cls }] : []);
    let final, answers, pt = null;
    const notes = [];
    if (!D.isZero()) {
      const x = Dx.div(D), y = Dy.div(D);
      pt = [x.toNumber(), y.toNumber()];
      steps.push({ title: "Solve with Cramer's rule", texLines: ['x = \\frac{B_1 C_2 - B_2 C_1}{D}, \\qquad y = \\frac{A_2 C_1 - A_1 C_2}{D}', `x = \\frac{${fp(B1)}${fp(C2)} - ${fp(B2)}${fp(C1)}}{${D.toTex()}} = \\frac{${Dx.toTex()}}{${D.toTex()}} = ${x.toTex()}`, `y = \\frac{${fp(A2)}${fp(C1)} - ${fp(A1)}${fp(C2)}}{${D.toTex()}} = \\frac{${Dy.toTex()}}{${D.toTex()}} = ${y.toTex()}`], note: "Cramer's rule is elimination written as one formula: multiplying the equations by B₂ and B₁ and subtracting removes y and leaves D·x on the left." });
      steps.push({ title: 'Check in both equations', texLines: [`${fp(A1)}${fp(x)} + ${fp(B1)}${fp(y)} + ${fp(C1)} = ${A1.mul(x).add(B1.mul(y)).add(C1).toTex()}\\ \\checkmark`, `${fp(A2)}${fp(x)} + ${fp(B2)}${fp(y)} + ${fp(C2)} = ${A2.mul(x).add(B2.mul(y)).add(C2).toTex()}\\ \\checkmark`], note: 'Both left-hand sides are 0, so the point lies on both lines.' });
      const ang = Math.abs(Math.atan2(A1.toNumber() * B2.toNumber() - A2.toNumber() * B1.toNumber(), A1.toNumber() * A2.toNumber() + B1.toNumber() * B2.toNumber())) * 180 / Math.PI;
      const acute = ang > 90 ? 180 - ang : ang;
      const nd = A1.mul(A2).add(B1.mul(B2));
      steps.push({ title: 'Angle between the lines', texLines: ['\\cos\\theta = \\frac{|A_1A_2 + B_1B_2|}{\\sqrt{A_1^2 + B_1^2}\\,\\sqrt{A_2^2 + B_2^2}}', `\\cos\\theta = \\frac{|${nd.toTex()}|}{\\sqrt{${A1.pow(2).add(B1.pow(2)).toTex()}}\\,\\sqrt{${A2.pow(2).add(B2.pow(2)).toTex()}}} \\;\\Rightarrow\\; \\theta ${Math.abs(acute - Math.round(acute)) < 1e-9 ? '=' : '\\approx'} ${fmt(acute, 4)}^\\circ`], note: nd.isZero() ? 'A₁A₂ + B₁B₂ = 0, so the normals are perpendicular and so are the lines.' : 'The angle between the lines equals the angle between their normal vectors (A₁, B₁) and (A₂, B₂). The acute angle is reported.' });
      final = { tex: `(x, y) = ${pointTex(x, y)}` };
      answers = [
        { label: 'Intersection point', value: `(${fmt(pt[0])}, ${fmt(pt[1])})`, primary: true, approx: !(x.toDecimal() && y.toDecimal()), exactTex: x.isInt() && y.isInt() ? undefined : pointTex(x, y), copy: `(${x}, ${y})` },
        { label: 'Acute angle between the lines', value: `${fmt(acute, 4)}°`, approx: Math.abs(acute - Math.round(acute)) > 1e-9 },
      ];
      if (Math.abs(acute - 90) < 1e-12) notes.push({ kind: 'info', text: 'The lines are perpendicular (A₁A₂ + B₁B₂ = 0).' });
    } else {
      const coincident = Dx.isZero() && Dy.isZero();
      steps.push({ title: 'Compare the other determinants', texLines: [`D_x = B_1C_2 - B_2C_1 = ${Dx.toTex()}`, `D_y = A_2C_1 - A_1C_2 = ${Dy.toTex()}`], note: 'With D = 0, these decide the case: both zero means the equations are multiples of each other; otherwise they contradict each other.' });
      steps.push({ title: coincident ? 'The equations describe the same line' : 'The lines are parallel', text: coincident ? 'One equation is a multiple of the other, so every point on the line satisfies both: there are infinitely many intersection points.' : 'Same slope but different positions: the lines never meet, so there is no solution.' });
      final = { text: coincident ? 'The lines coincide — infinitely many intersection points.' : 'The lines are parallel — no intersection point.' };
      answers = [{ label: 'Intersection', value: coincident ? 'Infinitely many points (same line)' : 'None (parallel lines)', primary: true }];
    }
    const svg = plot({
      x: windowAround(pt ? [pt[0], 0] : [0], 6), y: windowAround(pt ? [pt[1], 0] : [0], 6), equal: true,
      curves: [{ f: f(A1, B1, C1), cls: 'd-line' }, { f: f(A2, B2, C2), cls: 'd-line2' }],
      vlines: [...vline(A1, B1, C1, 'd-line'), ...vline(A2, B2, C2, 'd-line2')],
      points: pt ? [{ x: pt[0], y: pt[1], label: 'Intersection', cls: 'd-foot' }] : [],
      title: 'Graph of both lines',
    });
    return {
      ok: true, final, answers, notes, steps,
      visual: { svg, legend: '<div class="legend"><span><i></i>Line 1</span><span><i class="l2"></i>Line 2</span></div>', caption: 'The intersection is the one point that lies on both lines.' },
      formula: ['D = A_1B_2 - A_2B_1 \\qquad x = \\frac{B_1C_2 - B_2C_1}{D} \\qquad y = \\frac{A_2C_1 - A_1C_2}{D}'],
      rounding: 'Coordinates are exact fractions; decimals are shown rounded to 6 places.',
    };
  },
};
