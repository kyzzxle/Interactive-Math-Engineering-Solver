/**
 * Degree ↔ radian conversion with unit-circle values: coterminal angle, quadrant, reference angle,
 * and sin, cos, tan (exact for multiples of 15°, decimal otherwise).
 */
import { fmt, tx, eq, isExact } from '../lib/calc-kit.js';
import { piMultiple, piFracTex, piFracText, exactTrig, parseValue } from '../lib/trig.js';
import { plot } from '../lib/plot.js';

export const calculator = {
  id: 'degrees-radians-unit-circle',
  fields: [
    { name: 'from', label: 'Convert from', type: 'radio', options: [['deg', 'Degrees → radians'], ['rad', 'Radians → degrees']] },
    { name: 'angle', label: 'Angle', type: 'text', placeholder: 'e.g. 150 or 5pi/6', hint: 'Radians may be written with pi, e.g. 2pi/3 or 0.75pi. Negative and large angles are fine.' },
  ],
  examples: [
    { label: '150°', values: { from: 'deg', angle: '150' } },
    { label: '5π/4 rad', values: { from: 'rad', angle: '5pi/4' } },
    { label: '−420°', values: { from: 'deg', angle: '-420' } },
    { label: '2 rad', values: { from: 'rad', angle: '2' } },
  ],
  solve(values) {
    const from = values.from === 'rad' ? 'rad' : 'deg';
    const p = parseValue(values.angle, 'the angle');
    if (p.error) return { ok: false, errors: [{ field: 'angle', message: p.error }] };
    if (Math.abs(p.value) > 1e7) return { ok: false, errors: [{ field: 'angle', message: 'Please enter an angle smaller than 10,000,000 in size.' }] };
    const deg = from === 'deg' ? p.value : (p.value * 180) / Math.PI;
    const rad = from === 'rad' ? p.value : (p.value * Math.PI) / 180;
    const pm = piMultiple(rad);
    const steps = [];
    if (from === 'deg') {
      steps.push({ title: 'Multiply by π/180', text: 'A full turn is 360° = 2π radians, so 1° = π/180 radians.', texLines: [`${tx(deg)}^\\circ \\times \\frac{\\pi}{180}`, pm ? `= ${piFracTex(pm)} \\text{ rad} ${eq(rad)}` : `\\approx ${tx(rad)} \\text{ rad}`] });
    } else {
      steps.push({ title: 'Multiply by 180/π', text: '1 radian = 180/π degrees ≈ 57.2958°.', texLines: [`${pm ? piFracTex(pm) : tx(rad)} \\times \\frac{180^\\circ}{\\pi}`, `${eq(deg)}^\\circ`] });
    }
    const t = ((deg % 360) + 360) % 360;
    const tClean = Math.abs(t - 360) < 1e-9 ? 0 : t;
    const quadrant = [0, 90, 180, 270].some((q) => Math.abs(tClean - q) < 1e-9) ? 0 : Math.floor(tClean / 90) + 1;
    const ref = tClean <= 90 ? tClean : tClean <= 180 ? 180 - tClean : tClean <= 270 ? tClean - 180 : 360 - tClean;
    if (Math.abs(deg - tClean) > 1e-9) steps.push({ title: 'Coterminal angle in [0°, 360°)', text: 'Add or subtract full turns of 360° until the angle lies between 0° and 360°.', tex: `${tx(deg)}^\\circ ${deg > tClean ? '-' : '+'} ${tx(Math.abs(deg - tClean) / 360)}(360^\\circ) = ${tx(tClean)}^\\circ` });
    steps.push({ title: 'Quadrant and reference angle', text: quadrant ? `The terminal side lies in quadrant ${['I', 'II', 'III', 'IV'][quadrant - 1]}. The reference angle is the acute angle to the x-axis: ${fmt(ref)}°.` : `The terminal side lies on an axis (a quadrantal angle), so there is no quadrant.` });
    const ex = exactTrig(deg);
    const s = Math.sin(rad), c = Math.cos(rad);
    const tanUndefined = Math.abs(c) < 1e-12;
    const clean = (x) => (Math.abs(x) < 1e-12 ? 0 : x);
    if (ex) {
      steps.push({ title: 'Exact trigonometric values', text: `Use the reference angle ${ex.ref}° and the signs in quadrant ${quadrant ? ['I', 'II', 'III', 'IV'][quadrant - 1] : '(on an axis)'} (ASTC rule: All, Sine, Tangent, Cosine positive).`, texLines: [`\\sin(${tx(deg)}^\\circ) = ${ex.sin[0]}`, `\\cos(${tx(deg)}^\\circ) = ${ex.cos[0]}`, `\\tan(${tx(deg)}^\\circ) = ${ex.tan ? ex.tan[0] : '\\text{undefined}'}`] });
    } else {
      steps.push({ title: 'Trigonometric values (decimal)', text: 'This angle is not a multiple of 15°, so the values are irrational decimals.', texLines: [`\\sin \\theta \\approx ${tx(clean(s))}, \\quad \\cos \\theta \\approx ${tx(clean(c))}`, `\\tan \\theta ${tanUndefined ? '\\text{ is undefined}' : `\\approx ${tx(s / c)}`}`] });
    }
    const card = (label, pair, val) => (pair ? { label, valueTex: pair[0], exactTex: undefined, copy: `${label} = ${pair[1]} ≈ ${fmt(val)}`, value: undefined } : { label, value: fmt(clean(val)), approx: true });
    const answers = [
      from === 'deg'
        ? { label: 'Radians', value: fmt(rad), approx: true, exactTex: pm ? piFracTex(pm) : undefined, primary: true, copy: pm ? `${piFracText(pm)} rad ≈ ${fmt(rad)}` : `${fmt(rad)} rad` }
        : { label: 'Degrees', value: `${fmt(deg)}°`, approx: !isExact(deg), primary: true },
      { label: 'Coterminal angle in [0°, 360°)', value: `${fmt(tClean)}°` },
      { label: 'Quadrant', value: quadrant ? ['I', 'II', 'III', 'IV'][quadrant - 1] : 'none (on an axis)' },
      { label: 'Reference angle', value: `${fmt(ref)}°` },
      card('sin θ', ex && ex.sin, s),
      card('cos θ', ex && ex.cos, c),
      tanUndefined ? { label: 'tan θ', value: 'undefined (cos θ = 0)' } : card('tan θ', ex && ex.tan, s / c),
    ];
    const svg = plot({
      x: [-1.35, 1.35], y: [-1.25, 1.25], equal: true,
      circles: [{ cx: 0, cy: 0, r: 1, cls: 'd-line' }],
      segments: [{ x1: 0, y1: 0, x2: c, y2: s, cls: 'd-line2' }, { x1: c, y1: 0, x2: c, y2: s, cls: 'd-line3' }, { x1: 0, y1: 0, x2: c, y2: 0, cls: 'd-line3' }],
      points: [{ x: c, y: s, label: `(${fmt(clean(c), 3)}, ${fmt(clean(s), 3)})`, cls: 'd-foot' }],
      title: 'Unit circle showing the angle and the point (cos θ, sin θ)',
    });
    return {
      ok: true,
      final: { tex: from === 'deg' ? `${tx(deg)}^\\circ = ${pm ? `${piFracTex(pm)} \\text{ rad} ` : ''}${eq(rad)} \\text{ rad}` : `${pm ? piFracTex(pm) : tx(rad)} \\text{ rad} ${eq(deg)}^\\circ` },
      answers,
      visual: { svg, caption: 'On the unit circle, the point at angle θ is (cos θ, sin θ); the dashed lines are its x- and y-components.' },
      formula: ['\\text{radians} = \\text{degrees} \\times \\frac{\\pi}{180} \\qquad \\text{degrees} = \\text{radians} \\times \\frac{180}{\\pi}'],
      steps,
      rounding: 'Exact values are shown for multiples of 15°; other values are rounded to 6 decimal places.',
    };
  },
};
