/**
 * Truncated prism: a prism cut by a plane that is not parallel to its base.
 *   Right truncated triangular prism:  V = B (h₁ + h₂ + h₃)/3
 *   Right truncated rectangular prism: V = B (h₁ + h₂ + h₃ + h₄)/4  (needs h₁ + h₃ = h₂ + h₄)
 *   Any truncated prism: V = (area of the right section) × (average lateral edge)
 * Lateral faces of a right truncated prism are trapezoids; the slanted top is found in 3D.
 */
import { validator, answer, tx, units, UNIT_FIELD } from '../lib/calc-kit.js';
import { renderSolid } from '../lib/solid3d.js';
import { parseDecimal } from '../lib/parse.js';
import { truncatedMesh, truncatedExplore, truncatedPractice } from '../explore/solids-new.js';

const TYPES = [['tri', 'Right triangular base (three sides)'], ['rect', 'Right rectangular base'], ['general', 'Any truncated prism (right-section area)']];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** Area of a planar polygon in 3D. */
function area3d(pts) {
  let s = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) { const c = cross(pts[i], pts[(i + 1) % pts.length]); s = [s[0] + c[0], s[1] + c[1], s[2] + c[2]]; }
  return Math.hypot(...s) / 2;
}

export const calculator = {
  id: 'truncated-prism',
  explore: truncatedExplore,
  practice: truncatedPractice,
  fields: [
    { name: 'type', label: 'Type of prism', type: 'select', options: TYPES },
    { name: 'a', label: 'Base side a', type: 'number', signed: false, placeholder: 'e.g. 5', affix: 'len', showWhen: { type: ['tri'] }, row: 'tri' },
    { name: 'b', label: 'Base side b', type: 'number', signed: false, placeholder: 'e.g. 6', affix: 'len', showWhen: { type: ['tri'] }, row: 'tri' },
    { name: 'c', label: 'Base side c', type: 'number', signed: false, placeholder: 'e.g. 7', affix: 'len', showWhen: { type: ['tri'] }, row: 'tri', hint: 'Side a joins edges h₁ and h₂, side b joins h₂ and h₃, side c joins h₃ and h₁.' },
    { name: 'l', label: 'Base length l', type: 'number', signed: false, placeholder: 'e.g. 8', affix: 'len', showWhen: { type: ['rect'] }, row: 'rect' },
    { name: 'w', label: 'Base width w', type: 'number', signed: false, placeholder: 'e.g. 5', affix: 'len', showWhen: { type: ['rect'] }, row: 'rect' },
    { name: 'S', label: 'Area of the right section S', type: 'number', signed: false, placeholder: 'e.g. 24', affix: 'area', showWhen: { type: ['general'] }, hint: 'The section perpendicular to the lateral edges.' },
    { name: 'edges', label: 'Lateral edge lengths', type: 'text', placeholder: 'e.g. 4, 6, 9 (corners in order)', hint: 'Three edges for a triangular prism, four for a rectangular one, in order around the base, separated by commas.' },
    UNIT_FIELD,
  ],
  examples: [
    { label: 'Triangular base 5, 6, 7 with edges 4, 6, 9', values: { type: 'tri', a: '5', b: '6', c: '7', edges: '4, 6, 9', unit: 'cm' } },
    { label: 'Rectangular base 8 × 5 with edges 3, 5, 9, 7', values: { type: 'rect', l: '8', w: '5', edges: '3, 5, 9, 7', unit: 'm' } },
    { label: 'Right section 24 with edges 10, 12, 17', values: { type: 'general', S: '24', edges: '10, 12, 17', unit: 'cm' } },
    { label: 'Right triangle 3-4-5 with edges 6, 8, 10', values: { type: 'tri', a: '3', b: '4', c: '5', edges: '6, 8, 10', unit: '' } },
    { label: 'Impossible: the four tops are not in one plane', values: { type: 'rect', l: '8', w: '5', edges: '3, 5, 9, 2', unit: '' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const type = TYPES.some(([k]) => k === values.type) ? values.type : 'tri';
    let a, b, c, l, w, S;
    if (type === 'tri') { a = v.number('a', 'side a', { positive: true, maxAbs: 1e6 }); b = v.number('b', 'side b', { positive: true, maxAbs: 1e6 }); c = v.number('c', 'side c', { positive: true, maxAbs: 1e6 }); }
    if (type === 'rect') { l = v.number('l', 'the base length', { positive: true, maxAbs: 1e6 }); w = v.number('w', 'the base width', { positive: true, maxAbs: 1e6 }); }
    if (type === 'general') S = v.number('S', 'the right-section area', { positive: true, maxAbs: 1e12 });
    const raw = String(values.edges ?? '').trim();
    const parts = raw ? raw.replace(/−/g, '-').split(/[\s,;]+/).filter(Boolean) : [];
    const hs = [];
    if (!parts.length) v.fail('edges', 'Enter the lateral edge lengths, separated by commas, for example 4, 6, 9.');
    for (const [k, s] of parts.entries()) {
      const p = parseDecimal(s, `edge ${k + 1}`);
      if (!p.ok) { v.fail('edges', `Edge ${k + 1} (“${s.slice(0, 12)}”) is not a number. Separate the lengths with commas.`); break; }
      if (!(p.value > 0) || p.value > 1e6) { v.fail('edges', `Every lateral edge must be greater than 0 and at most 1,000,000 (edge ${k + 1} is ${s.slice(0, 12)}).`); break; }
      hs.push(p.value);
    }
    if (!v.ok()) return v.result();
    const need = type === 'tri' ? 3 : type === 'rect' ? 4 : null;
    if (need && hs.length !== need) return { ok: false, errors: [{ field: 'edges', message: `A ${type === 'tri' ? 'triangular' : 'rectangular'} prism has ${need} lateral edges; you entered ${hs.length}.` }] };
    if (type === 'general' && (hs.length < 3 || hs.length > 4)) return { ok: false, errors: [{ field: 'edges', message: 'Enter three edges (triangular prism) or four edges (a prism whose right section is a parallelogram).' }] };
    const u = units(values.unit);
    const n = hs.length, mean = hs.reduce((s, x) => s + x, 0) / n;
    const steps = [];
    let B, base = null, answers = [];
    if (type === 'tri') {
      if (!(a + b > c && b + c > a && a + c > b)) return { ok: false, errors: [{ field: 'c', message: `Sides ${tx(a)}, ${tx(b)} and ${tx(c)} cannot form a triangle: each side must be shorter than the other two together.` }] };
      const s = (a + b + c) / 2; B = Math.sqrt(s * (s - a) * (s - b) * (s - c));
      steps.push({ title: 'Base area (Heron’s formula)', texLines: [`s = \\frac{a + b + c}{2} = ${tx(s)}`, `B = \\sqrt{s(s - a)(s - b)(s - c)} = \\sqrt{${tx(s)}(${tx(s - a)})(${tx(s - b)})(${tx(s - c)})} \\approx ${tx(B)}${u.texArea}`] });
      const x3 = (a * a + c * c - b * b) / (2 * a);
      base = [[0, 0], [a, 0], [x3, Math.sqrt(Math.max(0, c * c - x3 * x3))]];
    } else if (type === 'rect') {
      if (Math.abs(hs[0] + hs[2] - hs[1] - hs[3]) > 1e-9 * Math.max(1, ...hs)) return { ok: false, errors: [{ field: 'edges', message: `The four top corners must lie in one plane, which needs h₁ + h₃ = h₂ + h₄. Here ${tx(hs[0])} + ${tx(hs[2])} = ${tx(hs[0] + hs[2])} but ${tx(hs[1])} + ${tx(hs[3])} = ${tx(hs[1] + hs[3])}.` }] };
      B = l * w;
      steps.push({ title: 'Base area', tex: `B = l\\,w = ${tx(l)} \\times ${tx(w)} = ${tx(B)}${u.texArea}` });
      base = [[0, 0], [l, 0], [l, w], [0, w]];
    } else {
      B = S;
      steps.push({ title: 'Right section', tex: `S = ${tx(S)}${u.texArea}`, text: 'For an oblique truncated prism, use the section perpendicular to the edges and the edge lengths themselves.' });
    }
    const label = type === 'general' ? 'S' : 'B';
    steps.push({ title: 'Average lateral edge', tex: `\\bar{h} = \\frac{${hs.map((x) => tx(x)).join(' + ')}}{${n}} = ${tx(mean)}${u.texLen}` });
    const V = B * mean;
    steps.push({ title: 'Volume', texLines: [`V = ${label}\\,\\bar{h}`, `V = ${tx(B)} \\times ${tx(mean)} = ${tx(V)}${u.texVol}`], text: 'The truncated prism has the same volume as a straight prism whose height is the average edge.' });
    answers.push(answer('Volume V', V, { unit: u.vol, primary: true }), answer(type === 'general' ? 'Right-section area S' : 'Base area B', B, { unit: u.area }), answer('Average lateral edge', mean, { unit: u.len }));
    let visual;
    if (base) {
      const lat = base.map((p, i) => { const q = base[(i + 1) % base.length]; return (Math.hypot(q[0] - p[0], q[1] - p[1]) * (hs[i] + hs[(i + 1) % n])) / 2; });
      const L = lat.reduce((s, x) => s + x, 0);
      const top = area3d(base.map(([x, z], i) => [x, hs[i], z]));
      steps.push({ title: 'Lateral area: one trapezoid per side', tex: `L = ${lat.map((x) => tx(x, 4)).join(' + ')} \\approx ${tx(L)}${u.texArea}`, text: 'Each side face is a trapezoid whose parallel sides are the two lateral edges at its ends.' });
      steps.push({ title: 'Slanted top face', tex: `A_{\\text{top}} \\approx ${tx(top)}${u.texArea}`, text: 'Found from the 3D coordinates of the top corners; it is larger than the base because it is tilted.' });
      answers.push(answer('Lateral area L', L, { unit: u.area }), answer('Area of the slanted top', top, { unit: u.area }), answer('Total surface area', L + top + B, { unit: u.area, primary: true }));
      const size = Math.max(...hs, ...base.flat());
      // Pick the viewing angle that shows the most faces (a fixed angle can hide the slanted top).
      const mesh = truncatedMesh(base, hs);
      let best = { yaw: 35, n: -1 };
      for (let yaw = 0; yaw < 360; yaw += 15) { const n = (renderSolid(mesh, { yaw, pitch: 25, scale: 1 }).match(/<polygon/g) || []).length; if (n > best.n) best = { yaw, n }; }
      visual = { svg: renderSolid(mesh, { yaw: best.yaw, pitch: 25, scale: 120 / size, title: 'Truncated prism' }), caption: 'A right prism cut by a slanted plane. The lateral edges are perpendicular to the base, so each side face is a trapezoid.' };
    }
    if (!Number.isFinite(V)) return { ok: false, errors: [{ message: 'These values are too extreme to compute reliably.' }] };
    return {
      ok: true,
      final: { tex: `V = ${label}\\,\\bar{h} = ${tx(V)}${u.texVol}` },
      answers,
      visual,
      formula: [type === 'rect' ? 'V = B\\,\\frac{h_1 + h_2 + h_3 + h_4}{4}' : `V = ${label}\\,\\frac{h_1 + h_2 + h_3}{3}`],
      steps,
      notes: [{ kind: 'info', text: type === 'rect' ? 'A rectangular prism can only be cut by one plane if opposite edges have the same sum (h₁ + h₃ = h₂ + h₄); then the average of the four edges gives the volume.' : 'The formula V = (area) × (average edge) is exact for triangular truncated prisms because a cut prism splits into three pyramids.' }],
    };
  },
};
