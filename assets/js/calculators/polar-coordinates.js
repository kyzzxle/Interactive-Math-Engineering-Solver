/**
 * Polar coordinates: rectangular ↔ polar conversion, and the standard polar curves
 * (roses, cardioid, limaçon, lemniscate, circle, spiral) with their key features and the
 * area ½∫r² dθ, over the whole curve or between two angles.
 */
import { validator, answer, tx } from '../lib/calc-kit.js';
import { simplifySqrt } from '../lib/exact.js';
import { adaptiveSimpson } from '../lib/numeric.js';
import { POLAR, polarPoints, polarPlot, polyline, polarExplore, polarPractice } from '../explore/analytic-new.js';

const { PI, cos, sin, atan2, hypot, abs } = Math;
const deg = (r) => (r * 180) / PI, rad = (d) => (d * PI) / 180;
const t4 = (x) => tx(abs(x) < 1e-12 ? 0 : x, 4);
const CURVES = Object.entries(POLAR).map(([k, p]) => [k, p.name]);

/** Exact √(x² + y²) for integer inputs, as TeX. */
function rootTex(x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || abs(x) > 1e6 || abs(y) > 1e6) return null;
  const s = simplifySqrt(x * x + y * y);
  if (!s) return null;
  const [k, m] = s;
  return m === 1 ? String(k) : `${k === 1 ? '' : k}\\sqrt{${m}}`;
}
const SPECIAL = { 0: '0', 30: '\\tfrac{\\pi}{6}', 45: '\\tfrac{\\pi}{4}', 60: '\\tfrac{\\pi}{3}', 90: '\\tfrac{\\pi}{2}', 120: '\\tfrac{2\\pi}{3}', 135: '\\tfrac{3\\pi}{4}', 150: '\\tfrac{5\\pi}{6}', 180: '\\pi', 210: '\\tfrac{7\\pi}{6}', 225: '\\tfrac{5\\pi}{4}', 240: '\\tfrac{4\\pi}{3}', 270: '\\tfrac{3\\pi}{2}', 300: '\\tfrac{5\\pi}{3}', 315: '\\tfrac{7\\pi}{4}', 330: '\\tfrac{11\\pi}{6}' };

function curveFacts(key, a, b, n) {
  const roseN = n % 2 ? n : 2 * n;
  switch (key) {
    case 'roseCos': case 'roseSin': return { desc: `a rose with ${roseN} petals of length ${t4(abs(a))}`, area: n % 2 ? (PI * a * a) / 4 : (PI * a * a) / 2, areaTex: n % 2 ? '\\frac{\\pi a^2}{4}\\ (n \\text{ odd})' : '\\frac{\\pi a^2}{2}\\ (n \\text{ even})', rmax: abs(a), sym: key === 'roseCos' ? 'symmetric about the x-axis (polar axis)' : n % 2 ? 'symmetric about the y-axis' : 'symmetric about both axes' };
    case 'cardioid': return { desc: 'a heart-shaped cardioid touching the pole', area: 1.5 * PI * a * a, areaTex: '\\frac{3}{2}\\pi a^2', rmax: 2 * abs(a), sym: 'symmetric about the x-axis' };
    case 'limacon': return { desc: abs(b) > abs(a) ? 'a limaçon with an inner loop' : abs(b) === abs(a) ? 'a cardioid (special limaçon)' : abs(a) >= 2 * abs(b) ? 'a convex limaçon' : 'a dimpled limaçon', area: abs(b) > abs(a) ? null : PI * (a * a + (b * b) / 2), areaTex: '\\pi\\left(a^2 + \\tfrac{b^2}{2}\\right)\\ (a \\ge b)', rmax: abs(a) + abs(b), sym: 'symmetric about the x-axis' };
    case 'lemniscate': return { desc: 'a figure-eight lemniscate with two loops', area: a * a, areaTex: 'a^2\\ (\\text{both loops})', rmax: abs(a), sym: 'symmetric about both axes and the pole' };
    case 'circle': return { desc: `a circle of radius ${t4(abs(a))} through the pole, centred at (${t4(a)}, 0)`, area: PI * a * a, areaTex: '\\pi a^2', rmax: 2 * abs(a), sym: 'symmetric about the x-axis' };
    default: return { desc: 'an Archimedean spiral: r grows by 2πa every turn', area: ((4 * PI ** 3) / 3) * a * a, areaTex: '\\frac{4}{3}\\pi^3 a^2\\ (\\text{first turn})', rmax: 2 * PI * abs(a), sym: 'no symmetry' };
  }
}

export const calculator = {
  id: 'polar-coordinates',
  explore: polarExplore,
  practice: polarPractice,
  fields: [
    { name: 'mode', label: 'What do you want to do?', type: 'radio', options: [['toPolar', 'Rectangular → polar'], ['toRect', 'Polar → rectangular'], ['curve', 'Graph a polar curve']] },
    { name: 'x', label: 'x', type: 'number', placeholder: 'e.g. -3', showWhen: { mode: ['toPolar'] }, row: 'xy' },
    { name: 'y', label: 'y', type: 'number', placeholder: 'e.g. 3', showWhen: { mode: ['toPolar'] }, row: 'xy' },
    { name: 'r', label: 'r', type: 'number', placeholder: 'e.g. 6', showWhen: { mode: ['toRect'] }, row: 'rt' },
    { name: 'theta', label: 'θ', type: 'number', placeholder: 'e.g. 150', suffix: '°', showWhen: { mode: ['toRect'] }, row: 'rt' },
    { name: 'curve', label: 'Curve', type: 'select', options: CURVES, showWhen: { mode: ['curve'] } },
    { name: 'a', label: 'a', type: 'number', placeholder: 'e.g. 4', showWhen: { mode: ['curve'] }, row: 'ab' },
    { name: 'b', label: 'b (limaçon only)', type: 'number', placeholder: 'e.g. 2', showWhen: { mode: ['curve'] }, row: 'ab' },
    { name: 'n', label: 'n (roses only)', type: 'number', signed: false, placeholder: 'e.g. 3', showWhen: { mode: ['curve'] } },
    { name: 't1', label: 'Area from θ₁ (optional)', type: 'number', placeholder: 'e.g. 0', suffix: '°', showWhen: { mode: ['curve'] }, row: 'tt' },
    { name: 't2', label: 'to θ₂ (optional)', type: 'number', placeholder: 'e.g. 30', suffix: '°', showWhen: { mode: ['curve'] }, row: 'tt' },
  ],
  examples: [
    { label: 'Convert (−3, 3) to polar', values: { mode: 'toPolar', x: '-3', y: '3' } },
    { label: 'Convert (6, 150°) to rectangular', values: { mode: 'toRect', r: '6', theta: '150' } },
    { label: 'Three-petal rose r = 4 cos 3θ', values: { mode: 'curve', curve: 'roseCos', a: '4', b: '0', n: '3', t1: '', t2: '' } },
    { label: 'Cardioid r = 2(1 + cos θ)', values: { mode: 'curve', curve: 'cardioid', a: '2', b: '0', n: '1', t1: '', t2: '' } },
    { label: 'Area of one petal of r = 4 cos 3θ (−30° to 30°)', values: { mode: 'curve', curve: 'roseCos', a: '4', b: '0', n: '3', t1: '-30', t2: '30' } },
    { label: 'Limaçon with an inner loop r = 1 + 2 cos θ', values: { mode: 'curve', curve: 'limacon', a: '1', b: '2', n: '1', t1: '', t2: '' } },
  ],
  solve(values) {
    const v = validator(values);
    const mode = ['toPolar', 'toRect', 'curve'].includes(values.mode) ? values.mode : 'toPolar';
    if (mode === 'toPolar') {
      const x = v.number('x', 'x', { maxAbs: 1e9 }), y = v.number('y', 'y', { maxAbs: 1e9 });
      if (!v.ok()) return v.result();
      if (x === 0 && y === 0) return { ok: false, errors: [{ field: 'x', message: 'The origin (the pole) has r = 0 and no defined angle: every θ describes it.' }] };
      const r = hypot(x, y); let th = deg(atan2(y, x)); if (th < 0) th += 360; if (abs(th - 360) < 1e-12) th = 0;
      const ref = deg(Math.atan(abs(y / (x || 1e-300))));
      const quad = x > 0 && y > 0 ? 'I' : x < 0 && y > 0 ? 'II' : x < 0 && y < 0 ? 'III' : x > 0 && y < 0 ? 'IV' : 'on an axis';
      const exactR = rootTex(x, y), round = Math.round(th), exactT = abs(th - round) < 1e-9 && SPECIAL[round] ? SPECIAL[round] : null;
      return {
        ok: true,
        final: { tex: `(r, \\theta) = \\left(${exactR ?? t4(r)},\\ ${t4(th)}^\\circ\\right)` },
        answers: [
          answer('r', r, { primary: true, exactTex: exactR && !Number.isInteger(r) ? exactR : undefined }),
          answer('θ (degrees, 0° to 360°)', th, { primary: true, unit: '°' }),
          answer('θ (radians)', rad(th), { exactTex: exactT ?? undefined, unit: 'rad' }),
          { label: 'Other names for the same point', valueTex: `\\left(${t4(r)},\\ ${t4(th - 360)}^\\circ\\right),\\ \\left(${t4(-r)},\\ ${t4((th + 180) % 360)}^\\circ\\right)`, copy: '' },
        ],
        visual: { svg: polarPlot([], Math.max(r, 1), { segments: [{ x1: 0, y1: 0, x2: x, y2: y, cls: 'd-line' }], points: [{ x, y, label: `(${t4(x)}, ${t4(y)})`, cls: 'd-point2' }] }, 'The point on the polar grid'), caption: 'r is the distance from the pole; θ is measured anticlockwise from the positive x-axis.' },
        formula: ['r = \\sqrt{x^2 + y^2} \\qquad \\tan\\theta = \\frac{y}{x}'],
        steps: [
          { title: 'Distance from the pole', texLines: ['r = \\sqrt{x^2 + y^2}', `r = \\sqrt{(${t4(x)})^2 + (${t4(y)})^2} = \\sqrt{${t4(x * x + y * y)}}${exactR ? ` = ${exactR}` : ''} ${Number.isInteger(r) ? '=' : '\\approx'} ${t4(r)}`] },
          { title: 'Reference angle', tex: x === 0 || y === 0 ? '\\text{The point is on an axis.}' : `\\tan\\alpha = \\left|\\frac{y}{x}\\right| = ${t4(abs(y / x))} \\Rightarrow \\alpha \\approx ${t4(ref)}^\\circ`, note: 'The calculator key tan⁻¹ only gives angles between −90° and 90°, so the quadrant must be checked by hand.' },
          { title: `Use the quadrant (${quad})`, tex: `\\theta \\approx ${t4(th)}^\\circ = ${exactT ?? t4(rad(th))}\\ \\text{rad}`, note: quad === 'II' ? 'Quadrant II: θ = 180° − α.' : quad === 'III' ? 'Quadrant III: θ = 180° + α.' : quad === 'IV' ? 'Quadrant IV: θ = 360° − α.' : 'Quadrant I or an axis: θ = α.' },
        ],
        notes: [{ kind: 'info', text: 'A point has infinitely many polar names: add any multiple of 360° to θ, or use −r with θ + 180°.' }],
      };
    }
    if (mode === 'toRect') {
      const r = v.number('r', 'r', { maxAbs: 1e9 }), th = v.number('theta', 'θ', { maxAbs: 1e7 });
      if (!v.ok()) return v.result();
      // cos and sin in degrees, exact at multiples of 90° (so 90° gives x = 0, not 6e-17)
      const red = ((th % 360) + 360) % 360;
      const QUAD = { 0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1] };
      const [cs, sn] = QUAD[red] ?? [cos(rad(th)), sin(rad(th))];
      const rel = QUAD[red] ? '=' : '\\approx';
      const x = r * cs + 0, y = r * sn + 0;
      return {
        ok: true,
        final: { tex: `(x, y) ${rel} \\left(${t4(x)},\\ ${t4(y)}\\right)` },
        answers: [answer('x', x, { primary: true }), answer('y', y, { primary: true })],
        visual: { svg: polarPlot([], Math.max(abs(r), 1), { segments: [{ x1: 0, y1: 0, x2: x, y2: y, cls: 'd-line' }], points: [{ x, y, label: `(${t4(r)}, ${t4(th)}°)`, cls: 'd-point2' }] }, 'The point on the polar grid'), caption: r < 0 ? 'r is negative, so the point is plotted in the direction opposite to θ.' : 'Go out a distance r along the ray at angle θ.' },
        formula: ['x = r\\cos\\theta \\qquad y = r\\sin\\theta'],
        steps: [
          { title: 'Known values', tex: `r = ${t4(r)},\\quad \\theta = ${t4(th)}^\\circ` },
          { title: 'x-coordinate', tex: `x = r\\cos\\theta = ${t4(r)}\\cos ${t4(th)}^\\circ = ${t4(r)}(${t4(cs)}) ${rel} ${t4(x)}` },
          { title: 'y-coordinate', tex: `y = r\\sin\\theta = ${t4(r)}\\sin ${t4(th)}^\\circ = ${t4(r)}(${t4(sn)}) ${rel} ${t4(y)}` },
          { title: 'Check', tex: `\\sqrt{x^2 + y^2} \\approx ${t4(hypot(x, y))} = |r|` },
        ],
        notes: [{ kind: 'info', text: 'For exact values at special angles: cos 150° = −√3/2 and sin 150° = 1/2, so (6, 150°) is (−3√3, 3).' }],
      };
    }
    const key = POLAR[values.curve] ? values.curve : 'roseCos';
    const a = v.number('a', 'a', { nonzero: true, maxAbs: 1e4 });
    const b = key === 'limacon' ? v.number('b', 'b', { maxAbs: 1e4 }) : 0;
    const n = key === 'roseCos' || key === 'roseSin' ? v.whole('n', 'n', 20, 1) : 1;
    if (!v.ok()) return v.result();
    const raw1 = String(values.t1 ?? '').trim(), raw2 = String(values.t2 ?? '').trim();
    let range = null;
    if (raw1 || raw2) {
      const t1 = v.number('t1', 'θ₁', { maxAbs: 3600 }), t2 = v.number('t2', 'θ₂', { maxAbs: 3600 });
      if (!v.ok()) return v.result();
      if (!(t2 > t1)) return { ok: false, errors: [{ field: 't2', message: 'θ₂ must be larger than θ₁.' }] };
      range = [t1, t2];
    }
    const P = POLAR[key], fx = curveFacts(key, a, b, n);
    const r2 = (t) => { const r = P.r(t, a, b, n); return key === 'lemniscate' ? Math.max(0, a * a * cos(2 * t)) : r * r; };
    const steps = [
      { title: 'The curve', tex: { roseCos: `r = ${t4(a)}\\cos ${n}\\theta`, roseSin: `r = ${t4(a)}\\sin ${n}\\theta`, cardioid: `r = ${t4(a)}(1 + \\cos\\theta)`, limacon: `r = ${t4(a)} ${b < 0 ? '-' : '+'} ${t4(abs(b))}\\cos\\theta`, lemniscate: `r^2 = ${t4(a * a)}\\cos 2\\theta`, circle: `r = ${t4(2 * a)}\\cos\\theta`, spiral: `r = ${t4(a)}\\theta` }[key], note: `This is ${fx.desc}. It is ${fx.sym}.` },
      { title: 'Largest distance from the pole', tex: `r_{\\max} = ${t4(fx.rmax)}`, note: key.startsWith('rose') ? `Petals: n = ${n} is ${n % 2 ? 'odd, so there are n' : 'even, so there are 2n'} = ${n % 2 ? n : 2 * n} petals, each of length |a|.` : key === 'limacon' ? 'For a limaçon, compare |a| with |b|: |b| > |a| gives an inner loop, |b| = |a| a cardioid, and |a| ≥ 2|b| a convex curve.' : '' },
    ];
    const answers = [{ label: 'Shape', value: fx.desc, primary: true, copy: fx.desc }, answer('Largest r', fx.rmax), { label: 'Symmetry', value: fx.sym, copy: '' }];
    const full = key === 'spiral' ? 2 * PI : P.turns(n) * PI;
    const numericFull = 0.5 * adaptiveSimpson(r2, 0, full, 1e-10).value;
    if (fx.area !== null) {
      steps.push({ title: 'Area enclosed', texLines: ['A = \\frac{1}{2}\\int r^2\\,d\\theta', `A = ${fx.areaTex} \\approx ${t4(fx.area)}`], note: `Numerical check of ½∫r² dθ: ${tx(numericFull, 6)}.${key.startsWith('rose') ? ' A rose with odd n is traced once as θ goes from 0 to π; with even n it needs 0 to 2π.' : ''}` });
      answers.push(answer('Area enclosed', fx.area, { primary: !range }));
    } else {
      steps.push({ title: 'Area', tex: `\\frac{1}{2}\\int_0^{2\\pi} r^2\\,d\\theta = \\pi\\left(a^2 + \\tfrac{b^2}{2}\\right) \\approx ${t4(numericFull)}`, note: 'With an inner loop this integral counts the inner loop twice. Find the outer and inner loop areas separately by integrating between the angles where r = 0, using the optional θ₁ and θ₂ fields.' });
      answers.push(answer('½∫r² dθ over 0 to 2π (inner loop counted twice)', numericFull));
    }
    let swept = null;
    if (range) {
      const [t1, t2] = range, Ar = 0.5 * adaptiveSimpson(r2, rad(t1), rad(t2), 1e-11).value;
      steps.push({ title: `Area swept from θ = ${t4(t1)}° to ${t4(t2)}°`, texLines: [`A = \\frac{1}{2}\\int_{${t4(t1)}^\\circ}^{${t4(t2)}^\\circ} r^2\\,d\\theta \\approx ${t4(Ar)}`], note: 'The integral is evaluated numerically with θ in radians. It gives the area swept by the radius from the pole.' });
      swept = Ar;
      answers.push(answer(`Area from ${t4(t1)}° to ${t4(t2)}°`, Ar, { primary: true }));
    }
    const pts = polarPoints(key, a, b, n, key === 'spiral' ? 0 : 0, key === 'spiral' ? 4 * PI : null, 1440);
    const R = key === 'spiral' ? 4 * PI * abs(a) : fx.rmax;
    const shade = range ? polyline([[0, 0], ...Array.from({ length: 121 }, (_, i) => { const t = rad(range[0]) + ((rad(range[1]) - rad(range[0])) * i) / 120, r = P.r(t, a, b, n); return Number.isFinite(r) ? [r * cos(t), r * sin(t)] : [0, 0]; }), [0, 0]], 'd-line2') : [];
    return {
      ok: true,
      final: { text: `${fx.desc[0].toUpperCase()}${fx.desc.slice(1)}${fx.area !== null ? `; area ≈ ${tx(fx.area, 4)}` : ''}${swept !== null ? `; swept area ≈ ${tx(swept, 4)}` : ''}.` },
      answers,
      visual: { svg: polarPlot([...polyline(pts, 'd-line', R), ...shade], Math.max(R, 0.5), {}, P.name), caption: range ? 'Green: the boundary of the region swept between θ₁ and θ₂.' : 'The polar grid shows circles of constant r and rays of constant θ every 30°.' },
      formula: ['x = r\\cos\\theta,\\ y = r\\sin\\theta \\qquad A = \\frac{1}{2}\\int_{\\alpha}^{\\beta} r^2\\,d\\theta'],
      steps,
      notes: [{ kind: 'info', text: 'Angles are in degrees for input and output; the spiral and all integrals use radians internally.' }],
    };
  },
};
