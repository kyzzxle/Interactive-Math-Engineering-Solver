/**
 * Shapes, explorers and practice problems for the newer solid mensuration calculators:
 * regular polyhedra, prismatoids, truncated prisms, spherical sectors and wedges, and
 * cylindrical wedges / oblique solids.
 */
import { hullMesh, latheMesh, obliqueMesh, sphereWedgeMesh, ungulaMesh, renderSolid } from '../lib/solid3d.js';
import { tx } from '../lib/calc-kit.js';
import { randInt, pick } from '../lib/learn.js';
import { Frac } from '../lib/fraction.js';

const PI = Math.PI, S5 = Math.sqrt(5), PHI = (1 + S5) / 2;
const f2 = (x) => tx(x, 2);
const f4 = (x) => tx(x, 4);
const VIEW = [
  { name: 'yaw', label: 'Turn', min: 0, max: 360, step: 1, value: 35, unit: '°' },
  { name: 'pitch', label: 'Tilt', min: -10, max: 60, step: 1, value: 22, unit: '°' },
];
const deg = (x) => (x * 180) / PI;

// ---------------------------------------------------------------- regular polyhedra
const Q = (p, q = 1) => new Frac(BigInt(p), BigInt(q));
export const POLYHEDRA = {
  tetra: { name: 'Tetrahedron', faces: 4, edges: 6, vertices: 4, faceName: 'triangle', perVertex: 3, kA: Math.sqrt(3), kV: Math.SQRT2 / 12, kr: Math.sqrt(6) / 12, kR: Math.sqrt(6) / 4, kM: Math.SQRT2 / 4, dihedral: deg(Math.acos(1 / 3)),
    tex: { A: '\\sqrt{3}', V: '\\frac{\\sqrt{2}}{12}', r: '\\frac{\\sqrt{6}}{12}', R: '\\frac{\\sqrt{6}}{4}' }, exact: { A: [Q(1), 3], V: [Q(1, 12), 2], r: [Q(1, 12), 6], R: [Q(1, 4), 6] }, irrational: { A: true, V: true } },
  cube: { name: 'Cube (hexahedron)', faces: 6, edges: 12, vertices: 8, faceName: 'square', perVertex: 3, kA: 6, kV: 1, kr: 0.5, kR: Math.sqrt(3) / 2, kM: Math.SQRT2 / 2, dihedral: 90,
    tex: { A: '6', V: '1', r: '\\frac{1}{2}', R: '\\frac{\\sqrt{3}}{2}' }, exact: { A: [Q(6), 1], V: [Q(1), 1], r: [Q(1, 2), 1], R: [Q(1, 2), 3] }, irrational: { A: false, V: false } },
  octa: { name: 'Octahedron', faces: 8, edges: 12, vertices: 6, faceName: 'triangle', perVertex: 4, kA: 2 * Math.sqrt(3), kV: Math.SQRT2 / 3, kr: Math.sqrt(6) / 6, kR: Math.SQRT2 / 2, kM: 0.5, dihedral: deg(Math.acos(-1 / 3)),
    tex: { A: '2\\sqrt{3}', V: '\\frac{\\sqrt{2}}{3}', r: '\\frac{\\sqrt{6}}{6}', R: '\\frac{\\sqrt{2}}{2}' }, exact: { A: [Q(2), 3], V: [Q(1, 3), 2], r: [Q(1, 6), 6], R: [Q(1, 2), 2] }, irrational: { A: true, V: true } },
  dodeca: { name: 'Dodecahedron', faces: 12, edges: 30, vertices: 20, faceName: 'pentagon', perVertex: 3, kA: 3 * Math.sqrt(25 + 10 * S5), kV: (15 + 7 * S5) / 4, kr: Math.sqrt((25 + 11 * S5) / 10) / 2, kR: (Math.sqrt(3) * (1 + S5)) / 4, kM: (3 + S5) / 4, dihedral: deg(Math.acos(-1 / S5)),
    tex: { A: '3\\sqrt{25 + 10\\sqrt{5}}', V: '\\frac{15 + 7\\sqrt{5}}{4}', r: '\\frac{1}{2}\\sqrt{\\frac{25 + 11\\sqrt{5}}{10}}', R: '\\frac{\\sqrt{3}\\,(1 + \\sqrt{5})}{4}' }, exact: null, irrational: { A: true, V: true } },
  icosa: { name: 'Icosahedron', faces: 20, edges: 30, vertices: 12, faceName: 'triangle', perVertex: 5, kA: 5 * Math.sqrt(3), kV: (5 * (3 + S5)) / 12, kr: (Math.sqrt(3) * (3 + S5)) / 12, kR: Math.sqrt(10 + 2 * S5) / 4, kM: (1 + S5) / 4, dihedral: deg(Math.acos(-S5 / 3)),
    tex: { A: '5\\sqrt{3}', V: '\\frac{5\\,(3 + \\sqrt{5})}{12}', r: '\\frac{\\sqrt{3}\\,(3 + \\sqrt{5})}{12}', R: '\\frac{1}{4}\\sqrt{10 + 2\\sqrt{5}}' }, exact: null, irrational: { A: true, V: true } },
};
const signs = (n) => Array.from({ length: 2 ** n }, (_, k) => Array.from({ length: n }, (_, j) => ((k >> j) & 1 ? -1 : 1)));
const VERTS = {
  tetra: { pts: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]], edge: 2 * Math.SQRT2 },
  cube: { pts: signs(3), edge: 2 },
  octa: { pts: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], edge: Math.SQRT2 },
  icosa: { pts: signs(2).flatMap(([s, t]) => [[0, s, t * PHI], [s, t * PHI, 0], [t * PHI, 0, s]]), edge: 2 },
  dodeca: { pts: [...signs(3), ...signs(2).flatMap(([s, t]) => [[0, s / PHI, t * PHI], [s / PHI, t * PHI, 0], [t * PHI, 0, s / PHI]])], edge: 2 / PHI },
};
const meshCache = new Map();
/** Mesh of a regular polyhedron with edge a. */
export function polyhedronMesh(type, a) {
  if (!meshCache.has(type)) meshCache.set(type, hullMesh(VERTS[type].pts));
  const base = meshCache.get(type), k = a / VERTS[type].edge;
  return { ...base, faces: base.faces.map((f) => ({ ...f, pts: f.pts.map((p) => p.map((c) => c * k)) })) };
}

export const polyhedronExplore = {
  title: 'Turn the five Platonic solids',
  intro: 'Press Play to spin the solid. Count the faces, edges and vertices: for every one, V − E + F = 2.',
  controls: [
    { name: 'type', label: 'Polyhedron', type: 'select', options: Object.entries(POLYHEDRA).map(([k, p]) => [k, p.name]), value: 'icosa' },
    { name: 'a', label: 'Edge a', min: 0.5, max: 5, step: 0.1, value: 2.5 },
    { name: 'yaw', label: 'Turn', min: 0, max: 360, step: 1, value: 20, unit: '°' },
    { name: 'pitch', label: 'Tilt', min: -10, max: 60, step: 1, value: 20, unit: '°' },
  ],
  rotate: { yaw: 'yaw', pitch: 'pitch' },
  animate: { control: 'yaw', seconds: 8 },
  render({ type, a, yaw, pitch }) {
    const P = POLYHEDRA[type] || POLYHEDRA.tetra;
    return {
      svg: renderSolid(polyhedronMesh(POLYHEDRA[type] ? type : 'tetra', a), { yaw, pitch, scale: 34, title: `${P.name} with edge ${a}` }),
      readouts: [
        { label: 'Faces, edges, vertices', text: `F = ${P.faces}, E = ${P.edges}, V = ${P.vertices} (V − E + F = 2)` },
        { label: 'Surface area', tex: `A = ${P.tex.A}\\,a^2 \\approx ${f2(P.kA * a * a)}` },
        { label: 'Volume', tex: `V = ${P.tex.V}\\,a^3 \\approx ${f2(P.kV * a ** 3)}`, tone: 'good' },
      ],
    };
  },
};
export const polyhedronPractice = {
  title: 'Area and volume of a regular polyhedron',
  generate(rand) {
    const type = pick(rand, ['tetra', 'cube', 'octa']), a = randInt(rand, 2, 12), P = POLYHEDRA[type];
    const A = P.kA * a * a, V = P.kV * a ** 3;
    return {
      prompt: `<p>A regular <strong>${P.name.replace(/ \(.*\)/, '').toLowerCase()}</strong> has edges of <strong>${a} cm</strong>. Find its total surface area and its volume.</p>`,
      answers: [{ label: 'Surface area', value: A, unit: 'cm²' }, { label: 'Volume', value: V, unit: 'cm³' }],
      hint: `It has ${P.faces} faces, each a regular ${P.faceName}. Add the face areas for the surface area.`,
      hintTex: `A = ${P.tex.A}\\,a^2 \\qquad V = ${P.tex.V}\\,a^3`,
      steps: [
        { title: 'Surface area', tex: `A = ${P.tex.A}\\,(${a})^2 \\approx ${f2(A)}\\ \\text{cm}^2` },
        { title: 'Volume', tex: `V = ${P.tex.V}\\,(${a})^3 \\approx ${f2(V)}\\ \\text{cm}^3` },
      ],
    };
  },
};

// ---------------------------------------------------------------- prismatoid
/** Rectangular-ended prismatoid (obelisk): bottom L1×W1 at y = −h/2, top L2×W2 at y = h/2, centred. */
export function obeliskMesh(L1, W1, L2, W2, h) {
  const rect = (L, W, y) => [[-L / 2, y, -W / 2], [L / 2, y, -W / 2], [L / 2, y, W / 2], [-L / 2, y, W / 2]];
  const top = L2 > 1e-9 && W2 > 1e-9 ? rect(L2, W2, h / 2) : L2 > 1e-9 ? [[-L2 / 2, h / 2, 0], [L2 / 2, h / 2, 0]] : [[0, h / 2, 0]];
  return hullMesh([...rect(L1, W1, -h / 2), ...top]);
}
export const prismoidal = (A1, Am, A2, h) => (h / 6) * (A1 + 4 * Am + A2);
export const prismatoidExplore = {
  title: 'Why the middle section counts four times',
  intro: 'Change the top so the ends are no longer similar. The prismoidal formula stays exact; simply averaging the two end areas does not.',
  controls: [
    { name: 'L1', label: 'Bottom length', min: 1, max: 8, step: 0.1, value: 6 },
    { name: 'W1', label: 'Bottom width', min: 1, max: 8, step: 0.1, value: 4 },
    { name: 'L2', label: 'Top length', min: 0, max: 8, step: 0.1, value: 2 },
    { name: 'W2', label: 'Top width', min: 0, max: 8, step: 0.1, value: 3 },
    { name: 'h', label: 'Height h', min: 0.5, max: 8, step: 0.1, value: 4 },
    ...VIEW,
  ],
  rotate: { yaw: 'yaw', pitch: 'pitch' },
  presets: [{ label: 'Wedge (top is an edge)', values: { L2: 3, W2: 0 } }, { label: 'Pyramid (top is a point)', values: { L2: 0, W2: 0 } }],
  render({ L1, W1, L2, W2, h, yaw, pitch }) {
    const w2 = L2 > 0 ? W2 : 0;
    const A1 = L1 * W1, A2 = L2 * w2, Am = ((L1 + L2) / 2) * ((W1 + w2) / 2), V = prismoidal(A1, Am, A2, h);
    const avg = ((A1 + A2) / 2) * h;
    return {
      svg: renderSolid(obeliskMesh(L1, W1, L2, w2, h), { yaw, pitch, scale: 18, title: 'Prismatoid with rectangular ends' }),
      readouts: [
        { label: 'Areas', tex: `A_1 = ${f2(A1)},\\ A_m = ${f2(Am)},\\ A_2 = ${f2(A2)}` },
        { label: 'Prismoidal formula (exact)', tex: `V = \\tfrac{h}{6}(A_1 + 4A_m + A_2) \\approx ${f2(V)}`, tone: 'good' },
        { label: 'Average end area × h (wrong)', tex: `\\tfrac{A_1 + A_2}{2}\\,h \\approx ${f2(avg)}`, tone: Math.abs(avg - V) > 1e-6 ? 'warn' : undefined },
      ],
    };
  },
};
export const prismatoidPractice = {
  title: 'Volume of a prismatoid',
  generate(rand) {
    if (rand() < 0.5) {
      const l = randInt(rand, 4, 14), w = randInt(rand, 2, 10), e = randInt(rand, 1, l), h = randInt(rand, 2, 10);
      const V = ((w * h) / 6) * (2 * l + e);
      return {
        prompt: `<p>A wedge has a rectangular base <strong>${l} m × ${w} m</strong>. Its top is an edge of length <strong>${e} m</strong>, parallel to the ${l} m sides and <strong>${h} m</strong> above the base. Find its volume.</p>`,
        answers: [{ label: 'Volume', value: V, unit: 'm³' }],
        hint: 'The top area is 0, and the middle section is a rectangle whose sides are the averages of the base and top.',
        hintTex: 'V = \\frac{h}{6}(A_1 + 4A_m + A_2)',
        steps: [
          { title: 'Areas', tex: `A_1 = ${l}(${w}) = ${l * w},\\quad A_m = \\tfrac{${l} + ${e}}{2} \\cdot \\tfrac{${w}}{2} = ${f4(((l + e) / 2) * (w / 2))},\\quad A_2 = 0` },
          { title: 'Prismoidal formula', tex: `V = \\frac{${h}}{6}\\left(${l * w} + 4(${f4(((l + e) * w) / 4)}) + 0\\right) \\approx ${f2(V)}\\ \\text{m}^3` },
        ],
      };
    }
    const L1 = randInt(rand, 6, 16), W1 = randInt(rand, 4, 12), L2 = randInt(rand, 2, L1 - 1), W2 = randInt(rand, 2, W1), h = randInt(rand, 2, 8);
    const A1 = L1 * W1, A2 = L2 * W2, Am = ((L1 + L2) / 2) * ((W1 + W2) / 2), V = prismoidal(A1, Am, A2, h);
    return {
      prompt: `<p>An earth embankment has a rectangular bottom <strong>${L1} m × ${W1} m</strong> and a rectangular top <strong>${L2} m × ${W2} m</strong>, <strong>${h} m</strong> higher. Use the prismoidal formula to find its volume.</p>`,
      answers: [{ label: 'Volume', value: V, unit: 'm³' }],
      hint: 'The middle section is a rectangle whose length and width are the averages of the two ends — not the average of the two areas.',
      hintTex: 'A_m = \\frac{L_1 + L_2}{2} \\cdot \\frac{W_1 + W_2}{2} \\qquad V = \\frac{h}{6}(A_1 + 4A_m + A_2)',
      steps: [
        { title: 'Areas', tex: `A_1 = ${A1},\\quad A_2 = ${A2},\\quad A_m = ${f4((L1 + L2) / 2)} \\times ${f4((W1 + W2) / 2)} = ${f4(Am)}` },
        { title: 'Volume', tex: `V = \\frac{${h}}{6}(${A1} + 4 \\times ${f4(Am)} + ${A2}) \\approx ${f2(V)}\\ \\text{m}^3` },
      ],
    };
  },
};

// ---------------------------------------------------------------- truncated prism
/** Right truncated prism: base polygon (x, z) points with lateral edge heights hs. */
export function truncatedMesh(base, hs) {
  const cx = base.reduce((s, p) => s + p[0], 0) / base.length, cz = base.reduce((s, p) => s + p[1], 0) / base.length;
  const mid = Math.max(...hs) / 2;
  return hullMesh([...base.map(([x, z]) => [x - cx, -mid, z - cz]), ...base.map(([x, z], i) => [x - cx, hs[i] - mid, z - cz])]);
}
export const truncatedExplore = {
  title: 'Slice a prism at an angle',
  intro: 'Tilt the cutting plane by changing the three edge heights. The volume is always the base area times the average edge — the same as a straight prism of that average height.',
  controls: [
    { name: 'a', label: 'Base side (equilateral)', min: 1, max: 6, step: 0.1, value: 4 },
    { name: 'h1', label: 'Edge h₁', min: 0.5, max: 10, step: 0.1, value: 3 },
    { name: 'h2', label: 'Edge h₂', min: 0.5, max: 10, step: 0.1, value: 5 },
    { name: 'h3', label: 'Edge h₃', min: 0.5, max: 10, step: 0.1, value: 8 },
    ...VIEW,
  ],
  rotate: { yaw: 'yaw', pitch: 'pitch' },
  presets: [{ label: 'Straight cut (all equal)', values: { h1: 5, h2: 5, h3: 5 } }],
  render({ a, h1, h2, h3, yaw, pitch }) {
    const base = [[0, 0], [a, 0], [a / 2, (Math.sqrt(3) / 2) * a]], B = (Math.sqrt(3) / 4) * a * a, mean = (h1 + h2 + h3) / 3;
    return {
      svg: renderSolid(truncatedMesh(base, [h1, h2, h3]), { yaw, pitch, scale: 18, title: 'Truncated triangular prism' }),
      readouts: [
        { label: 'Base area', tex: `B = \\tfrac{\\sqrt{3}}{4}a^2 \\approx ${f2(B)}` },
        { label: 'Average edge', tex: `\\bar{h} = \\tfrac{h_1 + h_2 + h_3}{3} \\approx ${f2(mean)}` },
        { label: 'Volume', tex: `V = B\\,\\bar{h} \\approx ${f2(B * mean)}`, tone: 'good' },
      ],
    };
  },
};
export const truncatedPractice = {
  title: 'Truncated triangular prism',
  generate(rand) {
    const [p, q] = pick(rand, [[3, 4], [5, 12], [6, 8], [8, 15]]), h1 = randInt(rand, 2, 12), h2 = randInt(rand, 2, 12), h3 = randInt(rand, 2, 12);
    const B = (p * q) / 2, V = (B * (h1 + h2 + h3)) / 3;
    return {
      prompt: `<p>The base of a right truncated prism is a right triangle with legs <strong>${p} cm</strong> and <strong>${q} cm</strong>. Its three lateral edges are <strong>${h1}</strong>, <strong>${h2}</strong> and <strong>${h3} cm</strong> long. Find the volume.</p>`,
      answers: [{ label: 'Volume', value: V, unit: 'cm³' }],
      hint: 'Multiply the base area by the average length of the lateral edges.',
      hintTex: 'V = B\\,\\frac{h_1 + h_2 + h_3}{3}',
      steps: [
        { title: 'Base area', tex: `B = \\tfrac{1}{2}(${p})(${q}) = ${B}` },
        { title: 'Volume', tex: `V = ${B} \\times \\frac{${h1} + ${h2} + ${h3}}{3} = ${f2(V)}\\ \\text{cm}^3` },
      ],
    };
  },
};

// ---------------------------------------------------------------- spherical sector and wedge
/** Spherical sector of radius R whose cap has height h (the cone's apex is the centre). */
export function sectorMesh(R, h) {
  const phi0 = Math.acos(Math.max(-1, Math.min(1, (R - h) / R)));
  const prof = [[0, 0], ...Array.from({ length: 13 }, (_, k) => { const t = phi0 * (1 - k / 12); return [R * Math.sin(t), R * Math.cos(t)]; })];
  const mid = (Math.min(0, R - h) + R) / 2;
  return latheMesh(prof.map(([x, y]) => [Math.max(0, x), y - mid]), 40, { closeEnds: false });
}
export const sphereSectorExplore = {
  title: 'Cut a sector or a wedge from a sphere',
  intro: 'A sector is a cone from the centre plus the cap above it; a wedge is cut by two planes through the axis like a slice of orange. Both are simple fractions of the sphere.',
  controls: [
    { name: 'solid', label: 'Solid', type: 'select', options: [['wedge', 'Spherical wedge'], ['sector', 'Spherical sector']], value: 'wedge' },
    { name: 'R', label: 'Radius R', min: 1, max: 5, step: 0.1, value: 4 },
    { name: 'theta', label: 'Wedge angle θ', min: 5, max: 355, step: 1, value: 90, unit: '°' },
    { name: 'h', label: 'Sector cap height h', min: 0.1, max: (v) => 2 * v.R, step: 0.1, value: 2 },
    ...VIEW,
  ],
  rotate: { yaw: 'yaw', pitch: 'pitch' },
  render({ solid, R, theta, h, yaw, pitch }) {
    const sphereV = (4 / 3) * PI * R ** 3;
    if (solid === 'sector') {
      const hh = Math.min(h, 2 * R), V = (2 / 3) * PI * R * R * hh, Z = 2 * PI * R * hh;
      return {
        svg: renderSolid(sectorMesh(R, hh), { yaw, pitch, scale: 24, title: `Spherical sector, R = ${R}, h = ${hh}` }),
        readouts: [
          { label: 'Volume', tex: `V = \\tfrac{2}{3}\\pi R^2 h \\approx ${f2(V)}`, tone: 'good' },
          { label: 'Zone (curved) area', tex: `2\\pi R h \\approx ${f2(Z)}` },
          { label: 'Share of the sphere', text: `${((100 * V) / sphereV).toFixed(1)}% = h ÷ 2R` },
        ],
      };
    }
    const L = (PI * R * R * theta) / 90, V = (PI * R ** 3 * theta) / 270;
    return {
      svg: renderSolid(sphereWedgeMesh(R, theta), { yaw, pitch, scale: 24, title: `Spherical wedge, R = ${R}, θ = ${theta}°` }),
      readouts: [
        { label: 'Lune area', tex: `\\frac{\\theta}{360^\\circ}\\,4\\pi R^2 \\approx ${f2(L)}` },
        { label: 'Wedge volume', tex: `\\frac{\\theta}{360^\\circ}\\,\\tfrac{4}{3}\\pi R^3 \\approx ${f2(V)}`, tone: 'good' },
        { label: 'Share of the sphere', text: `${((100 * theta) / 360).toFixed(1)}% = θ ÷ 360°` },
      ],
    };
  },
};
export const sphereSectorPractice = {
  title: 'Lune, wedge and sector',
  generate(rand) {
    const R = randInt(rand, 3, 12);
    if (rand() < 0.5) {
      const th = pick(rand, [30, 45, 60, 72, 90, 120, 150]);
      const L = (PI * R * R * th) / 90, V = (PI * R ** 3 * th) / 270;
      return {
        prompt: `<p>A spherical wedge is cut from a sphere of radius <strong>${R} cm</strong> by two planes through a diameter meeting at <strong>${th}°</strong>. Find the area of its lune and its volume.</p>`,
        answers: [{ label: 'Lune area', value: L, unit: 'cm²' }, { label: 'Volume', value: V, unit: 'cm³' }],
        hint: 'The wedge is the fraction θ/360° of the whole sphere, and its lune is the same fraction of the sphere’s surface.',
        hintTex: 'A_{\\text{lune}} = \\frac{\\theta}{360^\\circ}\\,4\\pi R^2 \\qquad V = \\frac{\\theta}{360^\\circ}\\,\\frac{4}{3}\\pi R^3',
        steps: [
          { title: 'Fraction of the sphere', tex: `\\frac{${th}}{360} = ${f4(th / 360)}` },
          { title: 'Lune area', tex: `A = ${f4(th / 360)} \\times 4\\pi(${R})^2 \\approx ${f2(L)}\\ \\text{cm}^2` },
          { title: 'Volume', tex: `V = ${f4(th / 360)} \\times \\tfrac{4}{3}\\pi(${R})^3 \\approx ${f2(V)}\\ \\text{cm}^3` },
        ],
      };
    }
    const h = randInt(rand, 1, 2 * R - 1), V = (2 / 3) * PI * R * R * h;
    return {
      prompt: `<p>A spherical sector is cut from a sphere of radius <strong>${R} m</strong>. The height of its cap (zone) is <strong>${h} m</strong>. Find its volume.</p>`,
      answers: [{ label: 'Volume', value: V, unit: 'm³' }],
      hint: 'The volume of a sector is one third of the radius times the area of its zone.',
      hintTex: 'V = \\tfrac{1}{3} R \\cdot 2\\pi R h = \\tfrac{2}{3}\\pi R^2 h',
      steps: [
        { title: 'Zone area', tex: `Z = 2\\pi(${R})(${h}) = ${2 * R * h}\\pi` },
        { title: 'Volume', tex: `V = \\tfrac{1}{3}(${R})(${2 * R * h}\\pi) = ${f4((2 * R * R * h) / 3)}\\pi \\approx ${f2(V)}\\ \\text{m}^3` },
      ],
    };
  },
};

// ---------------------------------------------------------------- cylindrical wedge and oblique solids
export const obliqueExplore = {
  title: 'Lean a cylinder (Cavalieri’s principle)',
  intro: 'Push the top sideways like a stack of coins. Every horizontal slice is still the same circle, so the volume does not change — but the curved surface grows.',
  controls: [
    { name: 'r', label: 'Radius r', min: 0.5, max: 4, step: 0.1, value: 2 },
    { name: 'h', label: 'Height h', min: 1, max: 8, step: 0.1, value: 5 },
    { name: 'lean', label: 'Lean (sideways shift)', min: 0, max: 8, step: 0.1, value: 3 },
    { name: 'shape', label: 'Solid', type: 'select', options: [['cyl', 'Cylinder'], ['cone', 'Cone'], ['ungula', 'Cylindrical wedge']], value: 'cyl' },
    ...VIEW,
  ],
  rotate: { yaw: 'yaw', pitch: 'pitch' },
  presets: [{ label: 'Upright (no lean)', values: { lean: 0 } }],
  render({ r, h, lean, shape, yaw, pitch }) {
    if (shape === 'ungula') {
      return {
        svg: renderSolid(ungulaMesh(r, h), { yaw, pitch, scale: 18, title: `Cylindrical wedge r = ${r}, h = ${h}` }),
        readouts: [
          { label: 'Volume', tex: `V = \\tfrac{2}{3} r^2 h \\approx ${f2((2 / 3) * r * r * h)}`, tone: 'good' },
          { label: 'Curved area', tex: `2 r h \\approx ${f2(2 * r * h)}` },
          { label: 'Share of the half-cylinder', text: `${((100 * (2 / 3) * r * r * h) / ((PI * r * r * h) / 2)).toFixed(1)}% (always 4/(3π) ≈ 42.4%)` },
        ],
        note: 'The lean slider does not apply to the wedge.',
      };
    }
    const cone = shape === 'cone';
    const V = (PI * r * r * h) / (cone ? 3 : 1), L = Math.hypot(h, lean);
    return {
      svg: renderSolid(obliqueMesh(r, cone ? 0 : r, h, lean), { yaw, pitch, scale: 16, title: `Oblique ${cone ? 'cone' : 'cylinder'} r = ${r}, h = ${h}` }),
      readouts: [
        { label: 'Volume (unchanged by the lean)', tex: `V = ${cone ? '\\tfrac{1}{3}' : ''}\\pi r^2 h \\approx ${f2(V)}`, tone: 'good' },
        { label: cone ? 'Longest slant edge' : 'Lateral edge', tex: cone ? `${f2(Math.hypot(h, lean + r))}` : `L = \\sqrt{h^2 + \\text{lean}^2} \\approx ${f2(L)}` },
        { label: 'Angle of inclination', tex: `\\alpha \\approx ${f2(deg(Math.atan2(h, cone ? Math.max(lean, 1e-12) : Math.max(lean, 1e-12))))}^\\circ` },
      ],
    };
  },
};
export const obliquePractice = {
  title: 'Cylindrical wedge and oblique cylinder',
  generate(rand) {
    if (rand() < 0.5) {
      const r = randInt(rand, 2, 10), h = randInt(rand, 2, 12), V = (2 / 3) * r * r * h;
      return {
        prompt: `<p>A wedge is cut from a right circular cylinder of radius <strong>${r} cm</strong> by a plane through a diameter of the base, rising to a height of <strong>${h} cm</strong> at the far edge. Find its volume and curved surface area.</p>`,
        answers: [{ label: 'Volume', value: V, unit: 'cm³' }, { label: 'Curved area', value: 2 * r * h, unit: 'cm²' }],
        hint: 'Neither answer contains π: the wedge formulas are V = (2/3)r²h and curved area = 2rh.',
        hintTex: 'V = \\tfrac{2}{3} r^2 h \\qquad A_{\\text{curved}} = 2 r h',
        steps: [
          { title: 'Volume', tex: `V = \\tfrac{2}{3}(${r})^2(${h}) = ${f2(V)}\\ \\text{cm}^3` },
          { title: 'Curved area', tex: `A = 2(${r})(${h}) = ${2 * r * h}\\ \\text{cm}^2` },
        ],
      };
    }
    const r = randInt(rand, 2, 8), Lx = randInt(rand, 5, 20), al = pick(rand, [30, 45, 60]);
    const h = Lx * Math.sin((al * PI) / 180), V = PI * r * r * h;
    return {
      prompt: `<p>An oblique circular cylinder has base radius <strong>${r} cm</strong>. Its elements are <strong>${Lx} cm</strong> long and make an angle of <strong>${al}°</strong> with the base. Find its volume.</p>`,
      answers: [{ label: 'Volume', value: V, unit: 'cm³' }],
      hint: 'Use the perpendicular height, not the slant length: h = L sin α. The volume is still base area × height.',
      hintTex: 'h = L\\sin\\alpha \\qquad V = \\pi r^2 h',
      steps: [
        { title: 'Perpendicular height', tex: `h = ${Lx}\\sin ${al}^\\circ \\approx ${f4(h)}\\ \\text{cm}` },
        { title: 'Volume', tex: `V = \\pi(${r})^2(${f4(h)}) \\approx ${f2(V)}\\ \\text{cm}^3` },
      ],
    };
  },
};
