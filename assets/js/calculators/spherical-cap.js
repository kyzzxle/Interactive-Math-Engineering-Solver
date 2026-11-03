/**
 * Spherical cap (one cut) and spherical segment / zone (two parallel cuts) of a sphere of radius R.
 *   Cap of height h:      a² = h(2R − h),  V = πh²(3R − h)/3,  curved area = 2πRh
 *   Segment between planes at signed distances y₁ < y₂ from the centre:
 *     h = y₂ − y₁,  aᵢ² = R² − yᵢ²,  V = πh(3a₁² + 3a₂² + h²)/6,  zone area = 2πRh
 * Exact multiples of π are shown for rational inputs.
 */
import { validator, answer, piAnswer, piTex, tx, units, UNIT_FIELD } from '../lib/calc-kit.js';
import { parseFrac } from '../lib/fraction.js';
import { plot } from '../lib/plot.js';
import { capMesh, renderSolid } from '../lib/solid3d.js';
import { capPractice } from '../explore/solids-practice.js';

function section(R, lo, hi, title) {
  const top = (x) => Math.min(hi, Math.sqrt(Math.max(0, R * R - x * x)));
  const bot = (x) => Math.max(lo, -Math.sqrt(Math.max(0, R * R - x * x)));
  return plot({
    x: [-R * 1.25, R * 1.25], y: [-R * 1.15, R * 1.15], equal: true, width: 360, height: 300, title,
    circles: [{ cx: 0, cy: 0, r: R }],
    shade: [{ f: (x) => Math.max(bot(x), top(x)), g: bot, a: -R, b: R }],
    hlines: [{ y: lo, cls: 'd-line3' }, ...(hi < R ? [{ y: hi, cls: 'd-line3' }] : [])],
    segments: [{ x1: 0, y1: 0, x2: R, y2: 0, cls: 'd-perp' }],
    points: [{ x: 0, y: 0, label: 'O' }],
  });
}

export const calculator = {
  id: 'spherical-cap',
  practice: capPractice,
  explore: {
    title: 'Slice a sphere',
    intro: 'Raise the cutting plane to make the cap smaller. At h = R it is a hemisphere; at h = 2R it is the whole sphere.',
    controls: [
      { name: 'R', label: 'Sphere radius R', min: 1, max: 6, step: 0.1, value: 5 },
      { name: 'h', label: 'Cap height h', min: 0.1, max: (v) => 2 * v.R, step: 0.1, value: 3 },
      { name: 'yaw', label: 'Turn', min: 0, max: 360, step: 1, value: 30, unit: '°' },
      { name: 'pitch', label: 'Tilt', min: -10, max: 60, step: 1, value: 25, unit: '°' },
    ],
    rotate: { yaw: 'yaw', pitch: 'pitch' },
    presets: [{ label: 'Hemisphere (h = R)', values: { R: 5, h: 5 } }, { label: 'Thin cap', values: { R: 5, h: 1 } }],
    render({ R, h, yaw, pitch }) {
      const V = (Math.PI * h * h * (3 * R - h)) / 3, frac = V / ((4 / 3) * Math.PI * R ** 3);
      return {
        svg: renderSolid(capMesh(R, h), { yaw, pitch, scale: 22, title: `Spherical cap of height ${h} from a sphere of radius ${R}` }),
        readouts: [
          { label: 'Base radius', tex: `a = \\sqrt{h(2R - h)} \\approx ${tx(Math.sqrt(h * (2 * R - h)), 3)}` },
          { label: 'Volume', tex: `V = \\tfrac{1}{3}\\pi h^2 (3R - h) \\approx ${tx(V, 2)}` },
          { label: 'Share of the sphere', text: `${(100 * frac).toFixed(1)}% of the volume, ${(100 * h / (2 * R)).toFixed(1)}% of the surface` },
        ],
      };
    },
  },
  fields: [
    { name: 'mode', label: 'Shape', type: 'radio', options: [['cap', 'Cap (one cut)'], ['segment', 'Segment between two cuts']] },
    { name: 'R', label: 'Sphere radius R', type: 'number', signed: false, placeholder: 'e.g. 5', affix: 'len' },
    { name: 'h', label: 'Cap height h', type: 'number', signed: false, placeholder: 'e.g. 2', affix: 'len', showWhen: { mode: ['cap'] }, hint: 'From the cutting plane to the top of the sphere, 0 < h ≤ 2R.' },
    { name: 'y1', label: 'Lower plane y₁', type: 'number', placeholder: 'e.g. -1', affix: 'len', row: 'planes', showWhen: { mode: ['segment'] }, rowShowWhen: { mode: ['segment'] } },
    { name: 'y2', label: 'Upper plane y₂', type: 'number', placeholder: 'e.g. 3', affix: 'len', row: 'planes', showWhen: { mode: ['segment'] } },
    UNIT_FIELD,
  ],
  examples: [
    { label: 'Cap: R = 5 cm, h = 2 cm', values: { mode: 'cap', R: '5', h: '2', unit: 'cm' } },
    { label: 'Segment: R = 5, planes at −1 and 3', values: { mode: 'segment', R: '5', y1: '-1', y2: '3', unit: 'm' } },
    { label: 'Hemisphere: R = 6, h = 6', values: { mode: 'cap', R: '6', h: '6', unit: '' } },
    { label: 'Impossible: h larger than the diameter', values: { mode: 'cap', R: '5', h: '12', unit: '' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const mode = values.mode === 'segment' ? 'segment' : 'cap';
    const R = v.number('R', 'the radius', { positive: true, maxAbs: 1e6 });
    if (mode === 'cap') {
      const h = v.number('h', 'the cap height', { positive: true, maxAbs: 1e6 });
      if (!v.ok()) return v.result();
      if (h > 2 * R * (1 + 1e-12)) return { ok: false, errors: [{ field: 'h', message: `A cap can be at most 2R = ${tx(2 * R)} tall (the whole sphere).` }] };
      const u = units(values.unit);
      const fR = parseFrac(values.R), fh = parseFrac(values.h);
      const a2 = h * (2 * R - h), a = Math.sqrt(a2);
      const V = (Math.PI * h * h * (3 * R - h)) / 3, Acurve = 2 * Math.PI * R * h, Abase = Math.PI * a2;
      const cV = fR && fh ? fh.pow(2).mul(fR.mul(3).sub(fh)).div(3) : null;
      const cC = fR && fh ? fR.mul(fh).mul(2) : null;
      const cB = fR && fh ? fh.mul(fR.mul(2).sub(fh)) : null;
      const cT = cC && cB ? cC.add(cB) : null;
      return {
        ok: true,
        final: { texLines: [`V ${cV ? `= ${piTex(cV)}` : ''} \\approx ${tx(V)}${u.texVol}`, `A_{\\text{total}} ${cT ? `= ${piTex(cT)}` : ''} \\approx ${tx(Acurve + Abase)}${u.texArea}`] },
        answers: [
          piAnswer('Volume V', cV, V, u.vol, true),
          piAnswer('Curved surface area', cC, Acurve, u.area),
          piAnswer('Base (circle) area', cB, Abase, u.area),
          piAnswer('Total surface area', cT, Acurve + Abase, u.area, true),
          answer('Base radius a', a, { unit: u.len }),
        ],
        visual: { svg: section(R, R - h, R, 'Cross-section of the sphere with the cap shaded'), caption: 'The shaded region is the cap. The dashed line is the cutting plane at distance R − h from the centre O.' },
        formula: ['a^2 = h(2R - h) \\qquad V = \\frac{\\pi h^2 (3R - h)}{3} \\qquad A_{\\text{curved}} = 2\\pi R h'],
        steps: [
          { title: 'Known values', tex: `R = ${tx(R)},\\quad h = ${tx(h)}${u.texLen}` },
          { title: 'Radius of the circular base (Pythagoras)', texLines: ['a^2 = R^2 - (R - h)^2 = h(2R - h)', `a^2 = ${tx(h)}(2 \\cdot ${tx(R)} - ${tx(h)}) = ${tx(a2)},\\quad a \\approx ${tx(a)}`] },
          { title: 'Volume', texLines: ['V = \\frac{\\pi h^2 (3R - h)}{3}', `V = \\frac{\\pi (${tx(h)})^2 (3 \\cdot ${tx(R)} - ${tx(h)})}{3}`, `V ${cV ? `= ${piTex(cV)}` : ''} \\approx ${tx(V)}`] },
          { title: 'Curved area (Archimedes: same as the matching band of the cylinder)', tex: `A_{\\text{curved}} = 2\\pi R h ${cC ? `= ${piTex(cC)}` : ''} \\approx ${tx(Acurve)}` },
          { title: 'Total surface area', tex: `A_{\\text{total}} = 2\\pi R h + \\pi a^2 \\approx ${tx(Acurve + Abase)}` },
        ],
        notes: [{ kind: 'info', text: h === R ? 'With h = R the cap is a hemisphere: V = (2/3)πR³.' : h === 2 * R ? 'With h = 2R the "cap" is the whole sphere, so the base circle has radius 0.' : 'The curved area depends only on R and h, not on where the cut is — a famous result of Archimedes.' }],
      };
    }
    const y1 = v.number('y1', 'the lower plane', { maxAbs: 1e6 });
    const y2 = v.number('y2', 'the upper plane', { maxAbs: 1e6 });
    if (!v.ok()) return v.result();
    if (!(y1 < y2)) return { ok: false, errors: [{ field: 'y2', message: 'The upper plane y₂ must be above the lower plane y₁.' }] };
    if (y1 < -R || y2 > R) return { ok: false, errors: [{ field: y1 < -R ? 'y1' : 'y2', message: `Both planes must cut the sphere: −R ≤ y₁ < y₂ ≤ R, here −${tx(R)} ≤ y ≤ ${tx(R)}.` }] };
    const u = units(values.unit);
    const h = y2 - y1, a1s = R * R - y1 * y1, a2s = R * R - y2 * y2;
    const V = (Math.PI * h * (3 * a1s + 3 * a2s + h * h)) / 6, Z = 2 * Math.PI * R * h, Ab = Math.PI * (a1s + a2s);
    const fR = parseFrac(values.R), f1 = parseFrac(values.y1), f2 = parseFrac(values.y2);
    let cV = null, cZ = null, cB = null;
    if (fR && f1 && f2) {
      const fh = f2.sub(f1), b1 = fR.pow(2).sub(f1.pow(2)), b2 = fR.pow(2).sub(f2.pow(2));
      cV = fh.mul(b1.mul(3).add(b2.mul(3)).add(fh.pow(2))).div(6); cZ = fR.mul(fh).mul(2); cB = b1.add(b2);
    }
    return {
      ok: true,
      final: { texLines: [`V ${cV ? `= ${piTex(cV)}` : ''} \\approx ${tx(V)}${u.texVol}`, `A_{\\text{zone}} ${cZ ? `= ${piTex(cZ)}` : ''} \\approx ${tx(Z)}${u.texArea}`] },
      answers: [
        piAnswer('Volume V', cV, V, u.vol, true),
        piAnswer('Zone (curved) area', cZ, Z, u.area),
        piAnswer('Area of the two bases', cB, Ab, u.area),
        piAnswer('Total surface area', cZ && cB ? cZ.add(cB) : null, Z + Ab, u.area),
        answer('Height h', h, { unit: u.len }),
        answer('Lower base radius a₁', Math.sqrt(a1s), { unit: u.len }),
        answer('Upper base radius a₂', Math.sqrt(a2s), { unit: u.len }),
      ],
      visual: { svg: section(R, y1, y2, 'Cross-section with the segment shaded'), caption: 'The shaded slab between the two cutting planes is the spherical segment; its curved surface is the zone.' },
      formula: ['V = \\frac{\\pi h}{6}\\left(3a_1^2 + 3a_2^2 + h^2\\right) \\qquad A_{\\text{zone}} = 2\\pi R h'],
      steps: [
        { title: 'Known values', tex: `R = ${tx(R)},\\quad y_1 = ${tx(y1)},\\quad y_2 = ${tx(y2)}` },
        { title: 'Height and base radii', texLines: [`h = y_2 - y_1 = ${tx(h)}`, `a_1^2 = R^2 - y_1^2 = ${tx(a1s)},\\quad a_2^2 = R^2 - y_2^2 = ${tx(a2s)}`] },
        { title: 'Volume', texLines: ['V = \\frac{\\pi h}{6}\\left(3a_1^2 + 3a_2^2 + h^2\\right)', `V = \\frac{\\pi (${tx(h)})}{6}\\left(3(${tx(a1s)}) + 3(${tx(a2s)}) + (${tx(h)})^2\\right) ${cV ? `= ${piTex(cV)}` : ''} \\approx ${tx(V)}`] },
        { title: 'Zone area', tex: `A_{\\text{zone}} = 2\\pi R h ${cZ ? `= ${piTex(cZ)}` : ''} \\approx ${tx(Z)}` },
      ],
      notes: [{ kind: 'info', text: 'y₁ and y₂ are signed distances of the cutting planes from the centre (negative below the centre). With y₂ = R the segment is a cap.' }],
    };
  },
};
