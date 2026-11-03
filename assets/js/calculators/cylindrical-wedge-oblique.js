/**
 * Cylindrical wedge (ungula) and oblique circular solids.
 *   Ungula cut by a plane through a diameter of the base, height h at the far edge:
 *     V = (2/3) r² h, curved area = 2rh, slanted face = (π/2) r √(r² + h²)
 *   Oblique cylinder, base radius r, element length L at angle α to the base:
 *     h = L sin α, V = πr²h, lateral area = (perimeter of the right section) × L,
 *     right section = ellipse with semi-axes r and r sin α
 *   Oblique cone, base radius r, height h, apex offset d from above the centre:
 *     V = πr²h/3 (Cavalieri), lateral area found by numerical integration
 */
import { validator, answer, tx, units, UNIT_FIELD } from '../lib/calc-kit.js';
import { parseFrac } from '../lib/fraction.js';
import { adaptiveSimpson } from '../lib/numeric.js';
import { renderSolid, ungulaMesh, obliqueMesh } from '../lib/solid3d.js';
import { obliqueExplore, obliquePractice } from '../explore/solids-new.js';

const PI = Math.PI;
const MODES = [['ungula', 'Cylindrical wedge (ungula)'], ['cylinder', 'Oblique cylinder'], ['cone', 'Oblique cone']];

/** Perimeter of an ellipse with semi-axes a ≥ b (numerical, accurate to ~1e-10). */
export function ellipsePerimeter(a, b) {
  const e2 = 1 - (b * b) / (a * a);
  return 4 * a * adaptiveSimpson((t) => Math.sqrt(1 - e2 * Math.sin(t) ** 2), 0, PI / 2, 1e-12).value;
}
/** Lateral area of an oblique cone: base circle radius r at y = 0, apex at (d, h, 0). */
export function obliqueConeLateral(r, h, d) {
  const f = (t) => {
    const px = r * Math.cos(t) - d, py = -h, pz = r * Math.sin(t); // P − apex
    const tx_ = -r * Math.sin(t), tz = r * Math.cos(t); // dP/dt (y component 0)
    const c = [py * tz - 0, pz * tx_ - px * tz, 0 - py * tx_];
    return 0.5 * Math.hypot(...c);
  };
  return adaptiveSimpson(f, 0, 2 * PI, 1e-10).value;
}

export const calculator = {
  id: 'cylindrical-wedge-oblique',
  explore: obliqueExplore,
  practice: obliquePractice,
  fields: [
    { name: 'mode', label: 'Solid', type: 'radio', options: MODES },
    { name: 'r', label: 'Base radius r', type: 'number', signed: false, placeholder: 'e.g. 5', affix: 'len' },
    { name: 'h', label: 'Height h', type: 'number', signed: false, placeholder: 'e.g. 8', affix: 'len', showWhen: { mode: ['ungula', 'cone'] }, hint: 'For the wedge: the height at the far edge. For the cone: the perpendicular height of the apex.' },
    { name: 'L', label: 'Length of an element L', type: 'number', signed: false, placeholder: 'e.g. 12', affix: 'len', showWhen: { mode: ['cylinder'] }, row: 'cyl' },
    { name: 'alpha', label: 'Angle with the base α', type: 'number', signed: false, placeholder: 'e.g. 60', suffix: '°', showWhen: { mode: ['cylinder'] }, row: 'cyl' },
    { name: 'd', label: 'Apex offset d', type: 'number', signed: false, placeholder: 'e.g. 3', affix: 'len', showWhen: { mode: ['cone'] }, hint: 'Horizontal distance from the centre of the base to the point directly below the apex (0 for a right cone).' },
    UNIT_FIELD,
  ],
  examples: [
    { label: 'Wedge: r = 6 cm, h = 9 cm', values: { mode: 'ungula', r: '6', h: '9', unit: 'cm' } },
    { label: 'Oblique cylinder: r = 4, elements 10 at 60°', values: { mode: 'cylinder', r: '4', L: '10', alpha: '60', unit: 'cm' } },
    { label: 'Oblique cone: r = 3, h = 4, apex offset 2', values: { mode: 'cone', r: '3', h: '4', d: '2', unit: 'm' } },
    { label: 'Check: right cylinder (α = 90°)', values: { mode: 'cylinder', r: '2', L: '5', alpha: '90', unit: '' } },
    { label: 'Impossible: an angle of 0°', values: { mode: 'cylinder', r: '2', L: '5', alpha: '0', unit: '' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const mode = MODES.some(([k]) => k === values.mode) ? values.mode : 'ungula';
    const r = v.number('r', 'the radius', { positive: true, maxAbs: 1e6 });
    const u = units(values.unit);
    if (mode === 'ungula') {
      const h = v.number('h', 'the height', { positive: true, maxAbs: 1e6 });
      if (!v.ok()) return v.result();
      const V = (2 / 3) * r * r * h, C = 2 * r * h, base = (PI * r * r) / 2, top = (PI / 2) * r * Math.hypot(r, h);
      const fr = parseFrac(values.r), fh = parseFrac(values.h);
      const exV = fr && fh ? fr.pow(2).mul(fh).mul(2).div(3) : null, exC = fr && fh ? fr.mul(fh).mul(2) : null;
      return {
        ok: true,
        final: { texLines: [`V = \\tfrac{2}{3} r^2 h = ${exV ? exV.toTex() : tx(V)}${exV && !exV.isInt() ? ` \\approx ${tx(V)}` : ''}${u.texVol}`] },
        answers: [
          answer('Volume V', V, { unit: u.vol, primary: true, exactTex: exV && !exV.isInt() ? exV.toTex() : undefined }),
          answer('Curved surface area', C, { unit: u.area, exactTex: exC && !exC.isInt() ? exC.toTex() : undefined }),
          answer('Semicircular base', base, { unit: u.area, irrational: true }),
          answer('Slanted face (half-ellipse)', top, { unit: u.area, irrational: true }),
          answer('Total surface area', C + base + top, { unit: u.area, primary: true, irrational: true }),
        ],
        visual: { svg: renderSolid(ungulaMesh(r, h), { yaw: 220, pitch: 22, scale: 110 / Math.max(r * 2, h), title: `Cylindrical wedge r = ${tx(r, 4)}, h = ${tx(h, 4)}` }), caption: 'The cutting plane passes through a diameter of the base and rises to height h at the far side, like a wedge of cheese cut from a round block.' },
        formula: ['V = \\tfrac{2}{3} r^2 h \\qquad A_{\\text{curved}} = 2 r h \\qquad A_{\\text{slanted}} = \\tfrac{\\pi}{2} r \\sqrt{r^2 + h^2}'],
        steps: [
          { title: 'Known values', tex: `r = ${tx(r)},\\quad h = ${tx(h)}${u.texLen}` },
          { title: 'Volume by slicing', texLines: ['\\text{triangle slices at } x:\\ \\tfrac{1}{2}\\,y\\,\\tfrac{h}{r}y = \\tfrac{h}{2r}(r^2 - x^2)', 'V = \\int_{-r}^{r} \\tfrac{h}{2r}(r^2 - x^2)\\,dx = \\tfrac{2}{3} r^2 h', `V = \\tfrac{2}{3}(${tx(r)})^2(${tx(h)}) = ${tx(V)}`], text: 'Slices perpendicular to the cutting diameter are right triangles.' },
          { title: 'Curved surface', tex: `A = \\int_0^{\\pi} (h\\sin t)\\,r\\,dt = 2 r h = ${tx(C)}`, text: 'Unrolled, the curved face is one arch of a sine curve. Note that neither V nor this area involves π.' },
          { title: 'Flat faces', texLines: [`\\text{base} = \\tfrac{1}{2}\\pi r^2 \\approx ${tx(base)}`, `\\text{slanted half-ellipse} = \\tfrac{\\pi}{2}\\,r\\,\\sqrt{r^2 + h^2} \\approx ${tx(top)}`] },
        ],
        notes: [{ kind: 'info', text: 'The wedge holds 4/(3π) ≈ 42.4% of the half-cylinder it is cut from.' }],
      };
    }
    if (mode === 'cylinder') {
      const L = v.number('L', 'the element length', { positive: true, maxAbs: 1e6 });
      const al = v.number('alpha', 'the angle', { positive: true, max: 90 });
      if (!v.ok()) return v.result();
      const s = Math.sin((al * PI) / 180), h = L * s, V = PI * r * r * h;
      if (s < 1e-6) return { ok: false, errors: [{ field: 'alpha', message: 'The angle is too small: the cylinder would be flat.' }] };
      const P = ellipsePerimeter(r, r * s), Lat = P * L, T = Lat + 2 * PI * r * r;
      return {
        ok: true,
        final: { texLines: [`V = \\pi r^2 h \\approx ${tx(V)}${u.texVol}`, `A_{\\text{lateral}} \\approx ${tx(Lat)}${u.texArea}`] },
        answers: [
          answer('Volume V', V, { unit: u.vol, primary: true, irrational: true }),
          answer('Perpendicular height h', h, { unit: u.len }),
          answer('Lateral area', Lat, { unit: u.area, primary: true, irrational: true }),
          answer('Total surface area', T, { unit: u.area, irrational: true }),
          answer('Perimeter of the right section', P, { unit: u.len, irrational: true }),
          answer('Horizontal lean of the top', L * Math.cos((al * PI) / 180), { unit: u.len }),
        ],
        visual: { svg: renderSolid(obliqueMesh(r, r, h, L * Math.cos((al * PI) / 180)), { yaw: 15, pitch: 15, scale: 120 / Math.max(h, 2 * r + L * Math.cos((al * PI) / 180)), title: 'Oblique cylinder' }), caption: 'The elements (lateral lines) lean at angle α. The volume uses the perpendicular height; the lateral area uses the element length and the right section.' },
        formula: ['h = L\\sin\\alpha \\qquad V = \\pi r^2 h \\qquad A_{\\text{lateral}} = (\\text{perimeter of right section}) \\times L'],
        steps: [
          { title: 'Perpendicular height', tex: `h = L\\sin\\alpha = ${tx(L)}\\sin ${tx(al)}^\\circ \\approx ${tx(h)}${u.texLen}` },
          { title: 'Volume (Cavalieri: every horizontal slice is the same circle)', tex: `V = \\pi r^2 h = \\pi(${tx(r)})^2(${tx(h)}) \\approx ${tx(V)}` },
          { title: 'Right section: an ellipse', texLines: [`\\text{semi-axes } r = ${tx(r)} \\text{ and } r\\sin\\alpha \\approx ${tx(r * s)}`, `P \\approx ${tx(P)}`], text: 'Cutting perpendicular to the elements gives an ellipse; its perimeter is found numerically (there is no elementary formula).' },
          { title: 'Lateral area', tex: `A = P \\times L \\approx ${tx(P)} \\times ${tx(L)} \\approx ${tx(Lat)}` },
          { title: 'Total surface area', tex: `A_{\\text{total}} = A + 2\\pi r^2 \\approx ${tx(T)}` },
        ],
        notes: [{ kind: 'info', text: al === 90 ? 'At α = 90° the cylinder is upright: the right section is the base circle and the lateral area is 2πrL.' : 'Tilting a cylinder keeps its volume (for the same height) but increases its lateral area.' }],
      };
    }
    const h = v.number('h', 'the height', { positive: true, maxAbs: 1e6 });
    const d = v.number('d', 'the apex offset', { nonneg: true, maxAbs: 1e6 });
    if (!v.ok()) return v.result();
    const V = (PI * r * r * h) / 3, Lat = obliqueConeLateral(r, h, d), sMin = Math.hypot(h, Math.abs(r - d)), sMax = Math.hypot(h, r + d);
    if (!Number.isFinite(Lat)) return { ok: false, errors: [{ message: 'These values are too extreme to compute reliably.' }] };
    return {
      ok: true,
      final: { texLines: [`V = \\tfrac{1}{3}\\pi r^2 h \\approx ${tx(V)}${u.texVol}`, `A_{\\text{lateral}} \\approx ${tx(Lat)}${u.texArea}`] },
      answers: [
        answer('Volume V', V, { unit: u.vol, primary: true, irrational: true }),
        answer('Lateral area (numerical)', Lat, { unit: u.area, primary: true, irrational: true }),
        answer('Total surface area', Lat + PI * r * r, { unit: u.area, irrational: true }),
        answer('Shortest slant element', sMin, { unit: u.len }),
        answer('Longest slant element', sMax, { unit: u.len }),
        answer('Right cone with the same base and height: lateral area', PI * r * Math.hypot(r, h), { unit: u.area, irrational: true }),
      ],
      visual: { svg: renderSolid(obliqueMesh(r, 0, h, d), { yaw: 15, pitch: 15, scale: 120 / Math.max(h, 2 * r + d), title: 'Oblique cone' }), caption: 'The apex is not above the centre of the base. The volume is the same as a right cone of the same base and height; the slanted side has a larger area.' },
      formula: ['V = \\tfrac{1}{3}\\pi r^2 h \\qquad A_{\\text{lateral}} = \\tfrac{1}{2}\\int_0^{2\\pi} \\left|(P(t) - \\text{apex}) \\times P\'(t)\\right| dt'],
      steps: [
        { title: 'Volume (Cavalieri)', tex: `V = \\tfrac{1}{3}\\pi r^2 h = \\tfrac{1}{3}\\pi(${tx(r)})^2(${tx(h)}) \\approx ${tx(V)}`, text: 'Every horizontal slice is a circle of the same size as in the right cone, so the volume is unchanged by the lean.' },
        { title: 'Slant elements', tex: `s_{\\min} = \\sqrt{h^2 + (r - d)^2} \\approx ${tx(sMin)},\\quad s_{\\max} = \\sqrt{h^2 + (r + d)^2} \\approx ${tx(sMax)}` },
        { title: 'Lateral area (numerical integration)', tex: `A \\approx ${tx(Lat)}`, text: 'The side is made of thin triangles from the apex to the rim; their areas are added numerically because no simple formula exists for an oblique cone.' },
      ],
      notes: [{ kind: 'info', text: d === 0 ? 'With d = 0 this is a right cone, and the lateral area equals πr·√(r² + h²).' : 'The lateral area is approximate (numerical integration, accurate to about 10 significant figures).' }],
    };
  },
};
