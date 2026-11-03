/**
 * The five regular (Platonic) polyhedra. From the edge a, or any one of the surface area,
 * volume, inradius or circumradius:
 *   A = kA a², V = kV a³, r = kr a, R = kR a (constants below)
 * Exact forms are given for the tetrahedron, cube and octahedron when the edge is rational.
 */
import { validator, answer, tx, units, UNIT_FIELD } from '../lib/calc-kit.js';
import { parseFrac } from '../lib/fraction.js';
import { renderSolid } from '../lib/solid3d.js';
import { polyhedronMesh, POLYHEDRA, polyhedronExplore, polyhedronPractice } from '../explore/solids-new.js';

const KNOWN = [['a', 'Edge a'], ['A', 'Surface area'], ['V', 'Volume'], ['r', 'Inradius'], ['R', 'Circumradius']];

/** Exact TeX for (p/q)·√m times a rational power of the edge. coef = [Frac p/q, m]. */
function radTex(coef, f) {
  if (!coef || !f) return undefined;
  const [pq, m] = coef, c = pq.mul(f);
  if (m === 1) return c.toTex();
  const top = `${c.n === 1n ? '' : c.n}\\sqrt{${m}}`;
  return c.d === 1n ? top : `\\frac{${top}}{${c.d}}`;
}

export const calculator = {
  id: 'regular-polyhedron',
  explore: polyhedronExplore,
  practice: polyhedronPractice,
  fields: [
    { name: 'type', label: 'Polyhedron', type: 'select', options: Object.entries(POLYHEDRA).map(([k, p]) => [k, `${p.name} (${p.faces} ${p.faceName}s)`]) },
    { name: 'known', label: 'What do you know?', type: 'select', options: KNOWN },
    { name: 'value', label: 'Value', type: 'number', signed: false, placeholder: 'e.g. 6', hint: 'Edge, surface area, volume, inradius (centre to a face) or circumradius (centre to a vertex), as chosen above.' },
    UNIT_FIELD,
  ],
  examples: [
    { label: 'Regular tetrahedron with edge 6 cm', values: { type: 'tetra', known: 'a', value: '6', unit: 'cm' } },
    { label: 'Octahedron with edge 4 m', values: { type: 'octa', known: 'a', value: '4', unit: 'm' } },
    { label: 'Icosahedron with edge 2 in', values: { type: 'icosa', known: 'a', value: '2', unit: 'in' } },
    { label: 'Dodecahedron with volume 1000 cm³', values: { type: 'dodeca', known: 'V', value: '1000', unit: 'cm' } },
    { label: 'Cube inscribed in a sphere of radius 5', values: { type: 'cube', known: 'R', value: '5', unit: '' } },
  ],
  solve(values) {
    const v = validator(values);
    const type = POLYHEDRA[values.type] ? values.type : 'tetra';
    const known = KNOWN.some(([k]) => k === values.known) ? values.known : 'a';
    const P = POLYHEDRA[type];
    const x = v.number('value', `the ${KNOWN.find(([k]) => k === known)[1].toLowerCase()}`, { positive: true, maxAbs: 1e9 });
    if (!v.ok()) return v.result();
    const u = units(values.unit);
    const a = { a: x, A: Math.sqrt(x / P.kA), V: Math.cbrt(x / P.kV), r: x / P.kr, R: x / P.kR }[known];
    const A = P.kA * a * a, V = P.kV * a ** 3, r = P.kr * a, R = P.kR * a, m = P.kM * a, face = A / P.faces;
    if (![a, A, V, r, R].every(Number.isFinite) || a < 1e-9) return { ok: false, errors: [{ field: 'value', message: 'That value is too extreme to compute reliably. Try a different unit.' }] };
    const fa = known === 'a' ? parseFrac(values.value) : null;
    const exact = (key, power) => (P.exact && fa ? radTex(P.exact[key], fa.pow(power)) : undefined);
    const steps = [{ title: `A ${P.name.toLowerCase()}`, text: `${P.faces} faces (each a regular ${P.faceName}), ${P.edges} edges and ${P.vertices} vertices. Euler's formula checks: V − E + F = ${P.vertices} − ${P.edges} + ${P.faces} = 2.` }];
    if (known !== 'a') {
      const how = { A: [`a = \\sqrt{\\frac{A}{${P.tex.A}}}`, `a = \\sqrt{\\frac{${tx(x)}}{${tx(P.kA, 6)}}}`], V: [`a = \\sqrt[3]{\\frac{V}{${P.tex.V}}}`, `a = \\sqrt[3]{\\frac{${tx(x)}}{${tx(P.kV, 6)}}}`], r: [`a = \\frac{r}{${P.tex.r}}`, `a = \\frac{${tx(x)}}{${tx(P.kr, 6)}}`], R: [`a = \\frac{R}{${P.tex.R}}`, `a = \\frac{${tx(x)}}{${tx(P.kR, 6)}}`] }[known];
      steps.push({ title: 'Find the edge first', texLines: [...how, `a \\approx ${tx(a)}${u.texLen}`] });
    }
    steps.push({ title: 'Surface area', texLines: [`A = ${P.tex.A}\\,a^2`, `A = ${P.tex.A}\\,(${tx(a)})^2 \\approx ${tx(A)}${u.texArea}`] });
    steps.push({ title: 'Volume', texLines: [`V = ${P.tex.V}\\,a^3`, `V = ${P.tex.V}\\,(${tx(a)})^3 \\approx ${tx(V)}${u.texVol}`] });
    steps.push({ title: 'Inradius and circumradius', texLines: [`r = ${P.tex.r}\\,a \\approx ${tx(r)},\\qquad R = ${P.tex.R}\\,a \\approx ${tx(R)}`], text: 'The inradius reaches the centre of a face (the inscribed sphere touches every face); the circumradius reaches a vertex (the circumscribed sphere passes through every vertex).' });
    steps.push({ title: 'Check: volume from the inscribed sphere', tex: `V = \\tfrac{1}{3}\\,r\\,A = \\tfrac{1}{3}(${tx(r, 6)})(${tx(A, 6)}) \\approx ${tx((r * A) / 3)}`, text: 'Splitting the solid into pyramids, one on each face with apex at the centre, gives V = (1/3)·r·A.' });
    const mesh = polyhedronMesh(type, a);
    return {
      ok: true,
      final: { texLines: [`A \\approx ${tx(A)}${u.texArea},\\quad V \\approx ${tx(V)}${u.texVol}`] },
      answers: [
        answer('Surface area A', A, { unit: u.area, primary: true, irrational: P.irrational.A, exactTex: exact('A', 2) }),
        answer('Volume V', V, { unit: u.vol, primary: true, irrational: P.irrational.V, exactTex: exact('V', 3) }),
        answer('Edge a', a, { unit: u.len, primary: known !== 'a' }),
        answer('Inradius r', r, { unit: u.len, irrational: true, exactTex: exact('r', 1) }),
        answer('Circumradius R', R, { unit: u.len, irrational: true, exactTex: exact('R', 1) }),
        answer('Midradius (centre to edge midpoint)', m, { unit: u.len }),
        answer('Area of one face', face, { unit: u.area }),
        answer('Dihedral angle (between faces)', P.dihedral, { unit: '°', decimals: 4 }),
      ],
      visual: { svg: renderSolid(mesh, { yaw: 30, pitch: 20, scale: 105 / R, title: `Regular ${P.name.toLowerCase()} with edge ${tx(a, 4)}` }), caption: `A regular ${P.name.toLowerCase()}: every face is the same regular ${P.faceName} and the same number of faces (${P.perVertex}) meet at every vertex.` },
      formula: [`A = ${P.tex.A}\\,a^2 \\qquad V = ${P.tex.V}\\,a^3 \\qquad r = ${P.tex.r}\\,a \\qquad R = ${P.tex.R}\\,a`],
      steps,
      notes: [{ kind: 'info', text: 'There are exactly five regular convex polyhedra. Exact radical forms are shown for the tetrahedron, cube and octahedron when the edge is a whole number or fraction.' }],
    };
  },
};
