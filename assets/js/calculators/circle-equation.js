/**
 * Circle equation: standard form (x − h)² + (y − k)² = r² and general form x² + y² + Dx + Ey + F = 0.
 * Modes: centre + radius, centre + a point on the circle, general form → centre and radius,
 * and the circle through three points. All arithmetic is exact.
 */
import { validator, fp, pointTex, sqrtFrac, fmt, fracAnswer } from '../lib/calc-kit.js';
import { Frac } from '../lib/fraction.js';
import { simplifySqrt } from '../lib/exact.js';
import { linearTex, linearText } from '../lib/lines.js';
import { solveLinear } from '../lib/linalg.js';
import { plot } from '../lib/plot.js';

const shifted = (v, h) => (h.isZero() ? `${v}^2` : `\\left(${v} ${h.sign() < 0 ? '+' : '-'} ${h.abs().toTex()}\\right)^2`);
const shiftedText = (v, h) => (h.isZero() ? `${v}²` : `(${v} ${h.sign() < 0 ? '+' : '−'} ${h.abs().toString()})²`);

export const calculator = {
  id: 'circle-equation',
  fields: [
    { name: 'mode', label: 'What do you know?', type: 'select', options: [['cr', 'Centre and radius'], ['cp', 'Centre and a point on the circle'], ['gen', 'General form x² + y² + Dx + Ey + F = 0'], ['three', 'Three points on the circle']] },
    { name: 'h', label: 'Centre h', type: 'number', placeholder: 'e.g. 2', row: 'c', showWhen: { mode: ['cr', 'cp'] }, rowShowWhen: { mode: ['cr', 'cp'] } },
    { name: 'k', label: 'Centre k', type: 'number', placeholder: 'e.g. -3', row: 'c', showWhen: { mode: ['cr', 'cp'] } },
    { name: 'r', label: 'Radius r', type: 'number', signed: false, placeholder: 'e.g. 5', showWhen: { mode: ['cr'] } },
    { name: 'px', label: 'Point x', type: 'number', placeholder: 'e.g. 5', row: 'p', showWhen: { mode: ['cp'] }, rowShowWhen: { mode: ['cp'] } },
    { name: 'py', label: 'Point y', type: 'number', placeholder: 'e.g. 1', row: 'p', showWhen: { mode: ['cp'] } },
    { name: 'D', label: 'D', type: 'number', placeholder: 'e.g. -4', row: 'g', showWhen: { mode: ['gen'] }, rowShowWhen: { mode: ['gen'] } },
    { name: 'E', label: 'E', type: 'number', placeholder: 'e.g. 6', row: 'g', showWhen: { mode: ['gen'] } },
    { name: 'F', label: 'F', type: 'number', placeholder: 'e.g. -12', row: 'g', showWhen: { mode: ['gen'] } },
    { name: 'pts', label: 'Three points', type: 'textarea', rows: 3, placeholder: '0 0\n4 0\n0 2', hint: 'One point per line: x and y separated by a space or comma.', showWhen: { mode: ['three'] } },
  ],
  examples: [
    { label: 'Centre (2, −3), radius 5', values: { mode: 'cr', h: '2', k: '-3', r: '5' } },
    { label: 'x² + y² − 4x + 6y − 12 = 0', values: { mode: 'gen', D: '-4', E: '6', F: '-12' } },
    { label: 'Through (0,0), (4,0), (0,2)', values: { mode: 'three', pts: '0 0\n4 0\n0 2' } },
    { label: 'Centre (1, 1) through (4, 5)', values: { mode: 'cp', h: '1', k: '1', px: '4', py: '5' } },
  ],
  solve(values) {
    const v = validator(values);
    const mode = ['cr', 'cp', 'gen', 'three'].includes(values.mode) ? values.mode : 'cr';
    let h, k, r2;
    const steps = [];
    if (mode === 'cr' || mode === 'cp') {
      h = v.frac('h', 'h'); k = v.frac('k', 'k');
      if (mode === 'cr') {
        const r = v.frac('r', 'the radius');
        if (!v.ok()) return v.result();
        if (r.sign() <= 0) return { ok: false, errors: [{ field: 'r', message: 'The radius must be greater than 0.' }] };
        r2 = r.pow(2);
        steps.push({ title: 'Identify the centre and radius', tex: `(h, k) = ${pointTex(h, k)}, \\quad r = ${r.toTex()}` });
      } else {
        const px = v.frac('px', 'the point’s x'), py = v.frac('py', 'the point’s y');
        if (!v.ok()) return v.result();
        r2 = px.sub(h).pow(2).add(py.sub(k).pow(2));
        if (r2.isZero()) return { ok: false, errors: [{ field: ['px', 'py'], message: 'The point is the centre itself, which gives a radius of 0. Enter a different point.' }] };
        steps.push({ title: 'The radius is the distance from the centre to the point', texLines: ['r^2 = (x - h)^2 + (y - k)^2', `r^2 = \\left(${px.toTex()} - ${fp(h)}\\right)^2 + \\left(${py.toTex()} - ${fp(k)}\\right)^2 = ${r2.toTex()}`] });
      }
    } else if (mode === 'gen') {
      const D = v.frac('D', 'D'), E = v.frac('E', 'E'), F = v.frac('F', 'F');
      if (!v.ok()) return v.result();
      h = D.div(-2); k = E.div(-2);
      r2 = D.pow(2).div(4).add(E.pow(2).div(4)).sub(F);
      const one = new Frac(1n), hd = D.div(2).pow(2), he = E.div(2).pow(2);
      steps.push({ title: 'Start from the general form', tex: `${linearTex([[one, 'x^2'], [one, 'y^2'], [D, 'x'], [E, 'y'], [F, '']])} = 0` });
      steps.push({ title: 'Complete the square in x and in y', text: 'Move F to the right, then add (D/2)² and (E/2)² to both sides.', texLines: [`\\left(${linearTex([[one, 'x^2'], [D, 'x'], [hd, '']])}\\right) + \\left(${linearTex([[one, 'y^2'], [E, 'y'], [he, '']])}\\right) = ${linearTex([[F.neg(), ''], [hd, ''], [he, '']])}`, `${shifted('x', h)} + ${shifted('y', k)} = ${r2.toTex()}`] });
      if (r2.sign() <= 0) {
        return { ok: false, errors: [{ field: ['D', 'E', 'F'], message: r2.isZero() ? `This equation describes a single point (${h}, ${k}), not a circle: the right-hand side after completing the square is 0.` : `No real circle has this equation: after completing the square the right-hand side is ${r2}, which is negative, so r² would be negative.` }] };
      }
    } else {
      const rows = String(values.pts ?? '').trim().split(/\n+/).map((l) => l.trim()).filter(Boolean);
      if (rows.length !== 3) return { ok: false, errors: [{ field: 'pts', message: 'Enter exactly three points, one per line, for example "4 0".' }] };
      const P = [];
      for (const [i, row] of rows.entries()) {
        const parts = row.split(/[\s,;]+/).filter(Boolean);
        const xy = parts.map((t) => { try { return Frac.of(t); } catch (e) { return null; } });
        if (parts.length !== 2 || xy.some((t) => !t)) return { ok: false, errors: [{ field: 'pts', message: `Line ${i + 1} ("${row}") must contain two numbers: x and y.` }] };
        P.push(xy);
      }
      // x² + y² + Dx + Ey + F = 0 at each point → linear system in D, E, F
      const A = P.map(([x, y]) => [x, y, new Frac(1n)]);
      const b = P.map(([x, y]) => x.pow(2).add(y.pow(2)).neg());
      const sol = solveLinear(A, b);
      if (sol.status !== 'unique') return { ok: false, errors: [{ field: 'pts', message: 'The three points are collinear (or two are the same), so no circle passes through all of them.' }] };
      const [D, E, F] = sol.x;
      h = D.div(-2); k = E.div(-2);
      r2 = D.pow(2).div(4).add(E.pow(2).div(4)).sub(F);
      steps.push({ title: 'Substitute each point into x² + y² + Dx + Ey + F = 0', texLines: P.map(([x, y]) => `${linearTex([[x, 'D'], [y, 'E'], [new Frac(1n), 'F']])} = ${x.pow(2).add(y.pow(2)).neg().toTex()}`) });
      steps.push({ title: 'Solve the three linear equations', tex: `D = ${D.toTex()}, \\quad E = ${E.toTex()}, \\quad F = ${F.toTex()}` });
      steps.push({ title: 'Centre and radius from D, E, F', texLines: [`(h, k) = \\left(-\\frac{D}{2}, -\\frac{E}{2}\\right) = ${pointTex(h, k)}`, `r^2 = \\frac{D^2 + E^2}{4} - F = ${r2.toTex()}`] });
    }
    const r = sqrtFrac(r2, simplifySqrt);
    const D = h.mul(-2), E = k.mul(-2), F = h.pow(2).add(k.pow(2)).sub(r2);
    const std = `${shifted('x', h)} + ${shifted('y', k)} = ${r2.toTex()}`;
    const one = new Frac(1n);
    const genTerms = [[one, 'x^2'], [one, 'y^2'], [D, 'x'], [E, 'y'], [F, '']];
    const gen = `${linearTex(genTerms)} = 0`;
    steps.push({ title: 'Standard form', texLines: ['(x - h)^2 + (y - k)^2 = r^2', std] });
    steps.push({ title: 'Expand to general form', text: 'Expand the squares and move everything to the left side.', tex: gen });
    const hn = h.toNumber(), kn = k.toNumber(), rn = r.value;
    const svg = plot({
      x: [hn - rn * 1.5, hn + rn * 1.5], y: [kn - rn * 1.5, kn + rn * 1.5], equal: true,
      circles: [{ cx: hn, cy: kn, r: rn, cls: 'd-line' }],
      segments: [{ x1: hn, y1: kn, x2: hn + rn, y2: kn, cls: 'd-line3' }],
      points: [{ x: hn, y: kn, label: `C(${fmt(hn, 3)}, ${fmt(kn, 3)})` }],
      title: 'Graph of the circle with its centre and a radius',
    });
    return {
      ok: true,
      final: { texLines: [std, gen] },
      answers: [
        { label: 'Standard form', valueTex: std, primary: true, copy: `${shiftedText('x', h)} + ${shiftedText('y', k)} = ${r2}` },
        { label: 'General form', valueTex: gen, primary: true, copy: `${linearText([[one, 'x²'], [one, 'y²'], [D, 'x'], [E, 'y'], [F, '']])} = 0` },
        { label: 'Centre (h, k)', valueTex: pointTex(h, k), copy: `(${h}, ${k})` },
        { label: 'Radius r', value: fmt(rn), approx: !r.exact, exactTex: r.exact ? undefined : r.tex, copy: `r = ${r.text}` },
        fracAnswer('Radius squared r²', r2),
        { label: 'Circumference 2πr', value: fmt(2 * Math.PI * rn), approx: true },
        { label: 'Area πr²', value: fmt(Math.PI * rn * rn), approx: true },
      ],
      visual: { svg, caption: 'Every point on the circle is the same distance r from the centre C.' },
      formula: ['(x - h)^2 + (y - k)^2 = r^2 \\qquad x^2 + y^2 + Dx + Ey + F = 0'],
      steps,
    };
  },
};
