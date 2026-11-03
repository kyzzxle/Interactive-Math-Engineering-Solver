/**
 * Composite solids made of a cylinder, cones and hemispheres sharing one radius r, plus a hollow
 * cylinder (tube). Volumes add (or subtract for the tube); the surface area counts only the
 * outside surfaces — faces where two parts are joined are hidden and left out.
 */
import { validator, answer, tx, fmt, units, UNIT_FIELD } from '../lib/calc-kit.js';
import { plot } from '../lib/plot.js';
import { compositePractice, compositeExplore } from '../explore/solids-practice.js';

const TYPES = [
  ['silo', 'Silo: cylinder with a hemisphere on top'],
  ['capsule', 'Capsule: cylinder with hemispheres on both ends'],
  ['rocket', 'Rocket / pencil: cone on top of a cylinder'],
  ['icecream', 'Ice-cream cone: hemisphere on top of a cone'],
  ['tube', 'Tube / pipe: hollow cylinder'],
];
const PI = Math.PI;

export const calculator = {
  id: 'composite-solid',
  practice: compositePractice,
  explore: compositeExplore,
  fields: [
    { name: 'type', label: 'Composite solid', type: 'select', options: TYPES },
    { name: 'r', label: 'Radius r (shared by all parts)', type: 'number', signed: false, placeholder: 'e.g. 3', affix: 'len', hint: 'For a tube this is the outer radius.' },
    { name: 'h', label: 'Cylinder height h', type: 'number', signed: false, placeholder: 'e.g. 10', affix: 'len', showWhen: { type: ['silo', 'capsule', 'rocket', 'tube'] } },
    { name: 'H', label: 'Cone height H', type: 'number', signed: false, placeholder: 'e.g. 4', affix: 'len', showWhen: { type: ['rocket', 'icecream'] } },
    { name: 'ri', label: 'Inner radius rᵢ', type: 'number', signed: false, placeholder: 'e.g. 2', affix: 'len', showWhen: { type: ['tube'] } },
    UNIT_FIELD,
  ],
  examples: [
    { label: 'Grain silo: r = 3 m, h = 10 m', values: { type: 'silo', r: '3', h: '10', unit: 'm' } },
    { label: 'Capsule pill: r = 0.4 cm, h = 1.2 cm', values: { type: 'capsule', r: '0.4', h: '1.2', unit: 'cm' } },
    { label: 'Pencil: r = 0.35, h = 15, cone 1.5 cm', values: { type: 'rocket', r: '0.35', h: '15', H: '1.5', unit: 'cm' } },
    { label: 'Ice-cream cone: r = 3, H = 10 cm', values: { type: 'icecream', r: '3', H: '10', unit: 'cm' } },
    { label: 'Pipe: outer 5, inner 4, length 100 cm', values: { type: 'tube', r: '5', ri: '4', h: '100', unit: 'cm' } },
    { label: 'Impossible: inner radius ≥ outer', values: { type: 'tube', r: '4', ri: '5', h: '10', unit: '' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const type = TYPES.some(([k]) => k === values.type) ? values.type : 'silo';
    const r = v.number('r', 'the radius', { positive: true, maxAbs: 1e6 });
    const h = ['silo', 'capsule', 'rocket', 'tube'].includes(type) ? v.number('h', 'the cylinder height', { positive: true, maxAbs: 1e6 }) : 0;
    const H = ['rocket', 'icecream'].includes(type) ? v.number('H', 'the cone height', { positive: true, maxAbs: 1e6 }) : 0;
    const ri = type === 'tube' ? v.number('ri', 'the inner radius', { positive: true, maxAbs: 1e6 }) : 0;
    if (!v.ok()) return v.result();
    if (type === 'tube' && ri >= r) return { ok: false, errors: [{ field: 'ri', message: 'The inner radius must be smaller than the outer radius r.' }] };
    const u = units(values.unit);
    const L = u.texLen, s = Math.hypot(r, H);
    const parts = []; // { name, V, Vtex, areas: [{ name, A, tex }] }
    const cyl = { name: 'Cylinder', V: PI * r * r * h, Vtex: `\\pi r^2 h = \\pi(${tx(r)})^2(${tx(h)})` };
    const hemi = { name: 'Hemisphere', V: (2 / 3) * PI * r ** 3, Vtex: `\\tfrac{2}{3}\\pi r^3 = \\tfrac{2}{3}\\pi(${tx(r)})^3` };
    const cone = { name: 'Cone', V: (PI * r * r * H) / 3, Vtex: `\\tfrac{1}{3}\\pi r^2 H = \\tfrac{1}{3}\\pi(${tx(r)})^2(${tx(H)})` };
    const side = { name: 'Curved side of the cylinder', A: 2 * PI * r * h, tex: `2\\pi r h` };
    const dome = { name: 'Curved surface of a hemisphere', A: 2 * PI * r * r, tex: `2\\pi r^2` };
    const disc = { name: 'Flat circular base', A: PI * r * r, tex: `\\pi r^2` };
    const slant = { name: 'Curved surface of the cone', A: PI * r * s, tex: `\\pi r s,\\ s = \\sqrt{r^2 + H^2} \\approx ${tx(s, 4)}` };
    let areas, combine;
    if (type === 'silo') { parts.push(cyl, hemi); areas = [side, dome, disc]; combine = 'V = V_{\\text{cyl}} + V_{\\text{hemi}}'; }
    else if (type === 'capsule') { parts.push(cyl, hemi, { ...hemi, name: 'Second hemisphere' }); areas = [side, dome, { ...dome, name: 'Curved surface of the second hemisphere' }]; combine = 'V = V_{\\text{cyl}} + 2V_{\\text{hemi}} = \\pi r^2 h + \\tfrac{4}{3}\\pi r^3'; }
    else if (type === 'rocket') { parts.push(cyl, cone); areas = [side, slant, disc]; combine = 'V = V_{\\text{cyl}} + V_{\\text{cone}}'; }
    else if (type === 'icecream') { parts.push(cone, hemi); areas = [slant, dome]; combine = 'V = V_{\\text{cone}} + V_{\\text{hemi}}'; }
    else {
      parts.push({ name: 'Outer cylinder', V: PI * r * r * h, Vtex: `\\pi r^2 h = \\pi(${tx(r)})^2(${tx(h)})` }, { name: 'Hole (subtracted)', V: -PI * ri * ri * h, Vtex: `-\\pi r_i^2 h = -\\pi(${tx(ri)})^2(${tx(h)})` });
      areas = [{ name: 'Outer curved surface', A: 2 * PI * r * h, tex: '2\\pi r h' }, { name: 'Inner curved surface', A: 2 * PI * ri * h, tex: '2\\pi r_i h' }, { name: 'Two ring-shaped ends', A: 2 * PI * (r * r - ri * ri), tex: '2\\pi\\left(r^2 - r_i^2\\right)' }];
      combine = 'V = \\pi\\left(r^2 - r_i^2\\right) h';
    }
    const V = parts.reduce((a, p) => a + p.V, 0), A = areas.reduce((a, p) => a + p.A, 0);
    if (!Number.isFinite(V) || V > 1e300) return { ok: false, errors: [{ message: 'These values are too large to compute reliably.' }] };
    const steps = [
      { title: 'Known values', tex: [`r = ${tx(r)}`, h ? `h = ${tx(h)}` : '', H ? `H = ${tx(H)}` : '', ri ? `r_i = ${tx(ri)}` : ''].filter(Boolean).join(',\\quad ') + L, note: 'Split the composite solid into simple parts that share the same radius r. Find each part on its own, then add (or subtract a hole).' },
      ...parts.map((p) => ({ title: `Volume of the ${p.name.toLowerCase()}`, tex: `${p.Vtex} \\approx ${tx(p.V)}`, note: p.name.includes('emisphere') ? 'A hemisphere is half a sphere: ½ × (4/3)πr³ = (2/3)πr³.' : p.name === 'Cone' ? 'A cone is one third of the cylinder with the same base and height.' : p.name.startsWith('Hole') ? 'The hole is a cylinder of the inner radius, removed from the outer one.' : 'Base area πr² times the height.' })),
      { title: 'Combine the volumes', texLines: [combine, `V \\approx ${parts.map((p, i) => `${p.V < 0 ? '- ' : i ? '+ ' : ''}${tx(Math.abs(p.V), 4)}`).join(' ')} \\approx ${tx(V)}${u.texVol}`] },
      { title: 'Exposed surfaces only', text: type === 'tube' ? 'A tube has an outside, an inside and two ring-shaped ends.' : 'Where two parts are joined, the joining circle is inside the solid and is not part of the surface.' },
      ...areas.map((a) => ({ title: a.name, tex: `${a.tex} \\approx ${tx(a.A)}` })),
      { title: 'Total surface area', tex: `A \\approx ${areas.map((a) => tx(a.A, 4)).join(' + ')} \\approx ${tx(A)}${u.texArea}` },
    ];
    // side-view profile drawn to scale (shaded)
    let shade, top = h, bottom = 0;
    const circ = (x) => Math.sqrt(Math.max(0, r * r - x * x));
    if (type === 'silo') { shade = [{ f: (x) => h + circ(x), g: () => 0, a: -r, b: r }]; top = h + r; }
    else if (type === 'capsule') { shade = [{ f: (x) => h + circ(x), g: (x) => -circ(x), a: -r, b: r }]; top = h + r; bottom = -r; }
    else if (type === 'rocket') { shade = [{ f: (x) => h + H * (1 - Math.abs(x) / r), g: () => 0, a: -r, b: r }]; top = h + H; }
    else if (type === 'icecream') { shade = [{ f: (x) => H + circ(x), g: (x) => H * (Math.abs(x) / r), a: -r, b: r }]; top = H + r; }
    else { shade = [{ f: () => h, g: () => 0, a: -r, b: r }, { f: () => h, g: () => 0, a: -ri, b: ri, cls: 'd-shade2' }]; }
    const span = Math.max(top - bottom, 2 * r) * 0.6;
    const mid = (top + bottom) / 2;
    const svg = plot({ x: [-span, span], y: [mid - span, mid + span], equal: true, width: 340, height: 300, includeZero: false, title: 'Side view drawn to scale', shade, hlines: type === 'tube' ? [] : [{ y: type === 'icecream' ? H : h, cls: 'd-line3' }].concat(type === 'capsule' ? [{ y: 0, cls: 'd-line3' }] : []) });
    return {
      ok: true,
      final: { texLines: [`V \\approx ${tx(V)}${u.texVol}`, `A \\approx ${tx(A)}${u.texArea}`] },
      answers: [
        answer('Total volume V', V, { unit: u.vol, primary: true, irrational: true }),
        answer('Total surface area A', A, { unit: u.area, primary: true, irrational: true }),
        ...parts.map((p) => answer(`${p.name} volume`, Math.abs(p.V), { unit: u.vol, irrational: true })),
      ],
      visual: { svg, caption: type === 'tube' ? 'Side view: the lighter band is the hole running through the tube.' : 'Side view: the dashed line marks where the parts are joined (hidden inside the solid).' },
      formula: [combine],
      steps,
      tables: [{ caption: 'Surface pieces', headers: ['Piece', `Area${u.area ? ` (${u.area})` : ''}`], rows: areas.map((a) => [a.name, fmt(a.A)]) }],
      notes: [{ kind: 'info', text: 'All parts share the same radius r and are joined along full circles. Units must be consistent; volumes are in cubic units and areas in square units.' }],
    };
  },
};
