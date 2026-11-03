/**
 * Parts of a sphere of radius R not covered by the cap/segment calculator:
 *   Spherical sector (cone from the centre + cap of height h): V = (2/3)πR²h,
 *     surface = zone 2πRh + cone πR·a, with a = √(h(2R − h))
 *   Spherical wedge / lune (two planes through a diameter at angle θ):
 *     lune area = (θ/360°)·4πR², wedge volume = (θ/360°)·(4/3)πR³, wedge surface = lune + πR²
 *   Spherical triangle with angles A, B, C: excess E = A + B + C − 180°,
 *     area = πR²E/180°, volume of the spherical pyramid = (area)·R/3
 * Exact multiples of π are shown for rational inputs.
 */
import { validator, answer, piAnswer, piTex, tx, units, UNIT_FIELD } from '../lib/calc-kit.js';
import { parseFrac } from '../lib/fraction.js';
import { renderSolid, sphereWedgeMesh } from '../lib/solid3d.js';
import { sectorMesh, sphereSectorExplore, sphereSectorPractice } from '../explore/solids-new.js';

const PI = Math.PI;
const MODES = [['sector', 'Spherical sector'], ['wedge', 'Spherical wedge and lune'], ['triangle', 'Spherical triangle and pyramid']];

export const calculator = {
  id: 'spherical-sector-wedge',
  explore: sphereSectorExplore,
  practice: sphereSectorPractice,
  fields: [
    { name: 'mode', label: 'Shape', type: 'radio', options: MODES },
    { name: 'R', label: 'Sphere radius R', type: 'number', signed: false, placeholder: 'e.g. 6', affix: 'len' },
    { name: 'h', label: 'Height of the cap (zone) h', type: 'number', signed: false, placeholder: 'e.g. 2', affix: 'len', showWhen: { mode: ['sector'] }, hint: 'The sector is the cone from the centre to the rim plus the cap of height h above it (0 < h ≤ 2R).' },
    { name: 'theta', label: 'Angle between the planes θ', type: 'number', signed: false, placeholder: 'e.g. 40', suffix: '°', showWhen: { mode: ['wedge'] } },
    { name: 'A', label: 'Angle A', type: 'number', signed: false, placeholder: 'e.g. 80', suffix: '°', showWhen: { mode: ['triangle'] }, row: 'angles' },
    { name: 'B', label: 'Angle B', type: 'number', signed: false, placeholder: 'e.g. 75', suffix: '°', showWhen: { mode: ['triangle'] }, row: 'angles' },
    { name: 'C', label: 'Angle C', type: 'number', signed: false, placeholder: 'e.g. 65', suffix: '°', showWhen: { mode: ['triangle'] }, row: 'angles' },
    UNIT_FIELD,
  ],
  examples: [
    { label: 'Sector: R = 6 cm, cap height 2 cm', values: { mode: 'sector', R: '6', h: '2', unit: 'cm' } },
    { label: 'Wedge: R = 9 cm, θ = 40°', values: { mode: 'wedge', R: '9', theta: '40', unit: 'cm' } },
    { label: 'Spherical triangle 80°, 75°, 65° on R = 10 m', values: { mode: 'triangle', R: '10', A: '80', B: '75', C: '65', unit: 'm' } },
    { label: 'Hemispherical sector: h = R', values: { mode: 'sector', R: '5', h: '5', unit: '' } },
    { label: 'Impossible: triangle angles adding to 180°', values: { mode: 'triangle', R: '4', A: '60', B: '60', C: '60', unit: '' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const mode = MODES.some(([k]) => k === values.mode) ? values.mode : 'sector';
    const R = v.number('R', 'the radius', { positive: true, maxAbs: 1e6 });
    const u = units(values.unit);
    const fR = parseFrac(values.R);
    if (mode === 'sector') {
      const h = v.number('h', 'the cap height', { positive: true, maxAbs: 1e6 });
      if (!v.ok()) return v.result();
      if (h > 2 * R * (1 + 1e-12)) return { ok: false, errors: [{ field: 'h', message: `The cap height can be at most 2R = ${tx(2 * R)}: that is the whole sphere.` }] };
      const a = Math.sqrt(Math.max(0, h * (2 * R - h))), V = (2 / 3) * PI * R * R * h, Z = 2 * PI * R * h, Lc = PI * R * a;
      const fh = parseFrac(values.h);
      const cV = fR && fh ? fR.pow(2).mul(fh).mul(2).div(3) : null, cZ = fR && fh ? fR.mul(fh).mul(2) : null;
      const alpha = (Math.acos((R - h) / R) * 180) / PI;
      return {
        ok: true,
        final: { texLines: [`V ${cV ? `= ${piTex(cV)}` : ''} \\approx ${tx(V)}${u.texVol}`, `A_{\\text{total}} \\approx ${tx(Z + Lc)}${u.texArea}`] },
        answers: [
          piAnswer('Volume V', cV, V, u.vol, true),
          piAnswer('Zone (curved) area', cZ, Z, u.area),
          answer('Cone (inner) surface area', Lc, { unit: u.area, irrational: true }),
          answer('Total surface area', Z + Lc, { unit: u.area, primary: true, irrational: true }),
          answer('Radius of the rim a', a, { unit: u.len }),
          answer('Half-angle of the cone', alpha, { unit: '°', decimals: 4 }),
          answer('Fraction of the sphere', h / (2 * R), { decimals: 6 }),
        ],
        visual: { svg: renderSolid(sectorMesh(R, h), { yaw: 30, pitch: 18, scale: 100 / R, title: `Spherical sector of radius ${tx(R, 4)} with cap height ${tx(h, 4)}` }), caption: 'A cone with its apex at the centre of the sphere, plus the cap above its rim. Every point of the zone is R from the apex.' },
        formula: ['V = \\tfrac{2}{3}\\pi R^2 h = \\tfrac{1}{3} R \\cdot (2\\pi R h) \\qquad A = 2\\pi R h + \\pi R a'],
        steps: [
          { title: 'Known values', tex: `R = ${tx(R)},\\quad h = ${tx(h)}${u.texLen}` },
          { title: 'Zone (curved) area', tex: `Z = 2\\pi R h = 2\\pi(${tx(R)})(${tx(h)}) ${cZ ? `= ${piTex(cZ)}` : ''} \\approx ${tx(Z)}` },
          { title: 'Volume: one third of R times the zone', texLines: ['V = \\tfrac{1}{3} R Z = \\tfrac{2}{3}\\pi R^2 h', `V = \\tfrac{2}{3}\\pi(${tx(R)})^2(${tx(h)}) ${cV ? `= ${piTex(cV)}` : ''} \\approx ${tx(V)}`], text: 'Like a pyramid: the sector is made of thin cones from the centre, each with height R and base on the zone.' },
          { title: 'Rim radius and the cone surface', texLines: [`a = \\sqrt{h(2R - h)} = \\sqrt{${tx(h)}(${tx(2 * R - h)})} \\approx ${tx(a)}`, `\\pi R a \\approx ${tx(Lc)}`], text: 'The cone’s slant height is R, because the rim lies on the sphere.' },
          { title: 'Total surface area', tex: `A = Z + \\pi R a \\approx ${tx(Z + Lc)}` },
        ],
        notes: [{ kind: 'info', text: h === R ? 'With h = R the cone is flat, so the sector is a hemisphere: V = (2/3)πR³.' : 'For the cap alone (without the cone), use the spherical cap calculator.' }],
      };
    }
    if (mode === 'wedge') {
      const th = v.number('theta', 'the angle θ', { positive: true, max: 360 });
      if (!v.ok()) return v.result();
      const L = (PI * R * R * th) / 90, V = (PI * R ** 3 * th) / 270, T = L + PI * R * R;
      const ft = parseFrac(values.theta);
      const cL = fR && ft ? fR.pow(2).mul(ft).div(90) : null, cV = fR && ft ? fR.pow(3).mul(ft).div(270) : null, cT = cL ? cL.add(fR.pow(2)) : null;
      return {
        ok: true,
        final: { texLines: [`A_{\\text{lune}} ${cL ? `= ${piTex(cL)}` : ''} \\approx ${tx(L)}${u.texArea}`, `V_{\\text{wedge}} ${cV ? `= ${piTex(cV)}` : ''} \\approx ${tx(V)}${u.texVol}`] },
        answers: [
          piAnswer('Lune area', cL, L, u.area, true),
          piAnswer('Wedge volume', cV, V, u.vol, true),
          piAnswer('Total surface of the wedge', cT, T, u.area),
          answer('Fraction of the sphere θ/360°', th / 360, { decimals: 6 }),
        ],
        visual: { svg: renderSolid(sphereWedgeMesh(R, th), { yaw: th > 180 ? 200 : 300, pitch: 20, scale: 100 / R, title: `Spherical wedge with angle ${tx(th, 4)}°` }), caption: 'Like a segment of an orange: two half-planes through a diameter. Its curved surface is a lune; its two flat faces are semicircles of radius R.' },
        formula: ['A_{\\text{lune}} = \\frac{\\theta}{360^\\circ}\\,4\\pi R^2 = \\frac{\\pi R^2 \\theta}{90^\\circ} \\qquad V = \\frac{\\theta}{360^\\circ}\\,\\frac{4}{3}\\pi R^3 = \\frac{\\pi R^3 \\theta}{270^\\circ}'],
        steps: [
          { title: 'Fraction of the sphere', tex: `\\frac{\\theta}{360^\\circ} = \\frac{${tx(th)}}{360} \\approx ${tx(th / 360)}` },
          { title: 'Lune area', texLines: ['A = \\frac{\\pi R^2 \\theta}{90}', `A = \\frac{\\pi (${tx(R)})^2 (${tx(th)})}{90} ${cL ? `= ${piTex(cL)}` : ''} \\approx ${tx(L)}`] },
          { title: 'Wedge volume', texLines: ['V = \\frac{\\pi R^3 \\theta}{270}', `V = \\frac{\\pi (${tx(R)})^3 (${tx(th)})}{270} ${cV ? `= ${piTex(cV)}` : ''} \\approx ${tx(V)}`] },
          { title: 'Total surface: lune plus two semicircles', tex: `A_{\\text{total}} = A_{\\text{lune}} + \\pi R^2 \\approx ${tx(T)}` },
        ],
        notes: [{ kind: 'info', text: 'θ is the dihedral angle between the two cutting planes, in degrees. θ = 360° gives the whole sphere (with the two flat faces coinciding).' }],
      };
    }
    const A = v.number('A', 'angle A', { positive: true, max: 180 }), B = v.number('B', 'angle B', { positive: true, max: 180 }), C = v.number('C', 'angle C', { positive: true, max: 180 });
    if (!v.ok()) return v.result();
    if ([A, B, C].some((x) => x >= 180)) return { ok: false, errors: [{ field: 'A', message: 'Each angle of a spherical triangle must be less than 180°.' }] };
    const sum = A + B + C, E = sum - 180;
    if (!(E > 0)) return { ok: false, errors: [{ field: 'C', message: `The angles of a spherical triangle always add to more than 180°; these add to ${tx(sum)}°. A sum of exactly 180° would be a flat triangle.` }] };
    for (const [x, y, z, f] of [[A, B, C, 'A'], [B, C, A, 'B'], [C, A, B, 'C']]) if (y + z - x >= 180) return { ok: false, errors: [{ field: f, message: 'No spherical triangle has these angles: for each angle, the other two must add to less than 180° plus that angle.' }] };
    const area = (PI * R * R * E) / 180, Vp = (area * R) / 3;
    const fA = parseFrac(values.A), fB = parseFrac(values.B), fC = parseFrac(values.C);
    const fE = fA && fB && fC ? fA.add(fB).add(fC).sub(180) : null;
    const cA = fR && fE ? fR.pow(2).mul(fE).div(180) : null, cV = cA ? cA.mul(fR).div(3) : null;
    return {
      ok: true,
      final: { texLines: [`E = ${tx(E)}^\\circ`, `A_{\\triangle} ${cA ? `= ${piTex(cA)}` : ''} \\approx ${tx(area)}${u.texArea}`] },
      answers: [
        answer('Spherical excess E', E, { unit: '°', primary: true }),
        piAnswer('Area of the triangle', cA, area, u.area, true),
        piAnswer('Volume of the spherical pyramid', cV, Vp, u.vol),
        answer('Fraction of the sphere’s surface', E / 720, { decimals: 6 }),
      ],
      formula: ['E = A + B + C - 180^\\circ \\qquad A_{\\triangle} = \\frac{\\pi R^2 E}{180^\\circ} \\qquad V_{\\text{pyramid}} = \\tfrac{1}{3} A_{\\triangle} R'],
      steps: [
        { title: 'Spherical excess', tex: `E = ${tx(A)}^\\circ + ${tx(B)}^\\circ + ${tx(C)}^\\circ - 180^\\circ = ${tx(E)}^\\circ`, text: 'On a sphere the angles of a triangle add to more than 180°. The extra is the spherical excess.' },
        { title: 'Area (Girard’s theorem)', texLines: ['A_{\\triangle} = \\frac{\\pi R^2 E}{180}', `A_{\\triangle} = \\frac{\\pi (${tx(R)})^2 (${tx(E)})}{180} ${cA ? `= ${piTex(cA)}` : ''} \\approx ${tx(area)}`], text: 'The area is the same fraction of the whole sphere (4πR²) as E is of 720°.' },
        { title: 'Spherical pyramid (apex at the centre)', tex: `V = \\tfrac{1}{3} A_{\\triangle} R \\approx ${tx(Vp)}` },
      ],
      notes: [{ kind: 'info', text: 'For a spherical polygon with n sides the excess is (sum of angles) − (n − 2)·180°, and the same area formula applies.' }],
    };
  },
};
