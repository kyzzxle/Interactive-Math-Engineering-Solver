/**
 * Practice problems for every solid mensuration calculator, plus explorers for composite
 * solids, similar solids and the frustum of a cone. Problems use whole numbers (and
 * Pythagorean triples where a slant height appears) so the working stays clean.
 */
import { frustumMesh, latheMesh, renderSolid } from '../lib/solid3d.js';
import { tx } from '../lib/calc-kit.js';
import { randInt, pick } from '../lib/learn.js';

const PI = Math.PI;
const f2 = (x) => tx(x, 2);
const f4 = (x) => tx(x, 4);
const TRIPLES = [[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17], [7, 24, 25], [9, 12, 15], [12, 16, 20]];
const VIEW = [
  { name: 'yaw', label: 'Turn', min: 0, max: 360, step: 1, value: 35, unit: '°' },
  { name: 'pitch', label: 'Tilt', min: -10, max: 60, step: 1, value: 22, unit: '°' },
];

// ---------------------------------------------------------------- practice for existing calculators
export const conePractice = {
  title: 'Slant height, area and volume of a cone',
  generate(rand) {
    const [r, h, s] = pick(rand, TRIPLES);
    const L = PI * r * s, V = (PI * r * r * h) / 3;
    return {
      prompt: `<p>A conical tent has base radius <strong>${r} m</strong> and height <strong>${h} m</strong>. Find its slant height, the area of canvas for the sloping side, and the volume of air inside.</p>`,
      answers: [{ label: 'Slant height s', value: s, unit: 'm' }, { label: 'Lateral area', value: L, unit: 'm²' }, { label: 'Volume', value: V, unit: 'm³' }],
      hint: 'The radius, height and slant height form a right triangle with the slant height as the hypotenuse.',
      hintTex: 's = \\sqrt{r^2 + h^2} \\qquad L = \\pi r s \\qquad V = \\tfrac{1}{3}\\pi r^2 h',
      steps: [
        { title: 'Slant height', tex: `s = \\sqrt{${r}^2 + ${h}^2} = \\sqrt{${r * r + h * h}} = ${s}\\ \\text{m}` },
        { title: 'Lateral area', tex: `L = \\pi (${r})(${s}) = ${r * s}\\pi \\approx ${f2(L)}\\ \\text{m}^2` },
        { title: 'Volume', tex: `V = \\tfrac{1}{3}\\pi (${r})^2 (${h}) = ${f4((r * r * h) / 3)}\\pi \\approx ${f2(V)}\\ \\text{m}^3` },
      ],
    };
  },
};

export const prismPractice = {
  title: 'Volume and surface area of a box',
  generate(rand) {
    const l = randInt(rand, 3, 15), w = randInt(rand, 2, 12), h = randInt(rand, 2, 10);
    const V = l * w * h, T = 2 * (l * w + l * h + w * h);
    return {
      prompt: `<p>A closed rectangular box measures <strong>${l} cm × ${w} cm × ${h} cm</strong>. Find its volume and its total surface area.</p>`,
      answers: [{ label: 'Volume', value: V, unit: 'cm³' }, { label: 'Total surface area', value: T, unit: 'cm²' }],
      hint: 'A box has three pairs of identical rectangular faces.',
      hintTex: 'V = l\\,w\\,h \\qquad T = 2(lw + lh + wh)',
      steps: [
        { title: 'Volume', tex: `V = ${l} \\times ${w} \\times ${h} = ${V}\\ \\text{cm}^3` },
        { title: 'Total surface area', tex: `T = 2(${l * w} + ${l * h} + ${w * h}) = ${T}\\ \\text{cm}^2` },
      ],
    };
  },
};

export const pyramidPractice = {
  title: 'Square pyramid',
  generate(rand) {
    const [half, h, l] = pick(rand, TRIPLES), a = 2 * half;
    const B = a * a, L = 2 * a * l, V = (B * h) / 3;
    return {
      prompt: `<p>A right pyramid has a square base of side <strong>${a} cm</strong> and height <strong>${h} cm</strong>. Find the slant height of a face, the lateral area and the volume.</p>`,
      answers: [{ label: 'Slant height', value: l, unit: 'cm' }, { label: 'Lateral area', value: L, unit: 'cm²' }, { label: 'Volume', value: V, unit: 'cm³' }],
      hint: 'The slant height runs from the apex to the middle of a base edge, so it is the hypotenuse of a triangle with legs h and a/2.',
      hintTex: 'l = \\sqrt{h^2 + (a/2)^2} \\qquad L = 4 \\cdot \\tfrac{1}{2} a\\,l \\qquad V = \\tfrac{1}{3} a^2 h',
      steps: [
        { title: 'Slant height', tex: `l = \\sqrt{${h}^2 + ${half}^2} = \\sqrt{${h * h + half * half}} = ${l}\\ \\text{cm}` },
        { title: 'Lateral area: four triangles', tex: `L = 4 \\times \\tfrac{1}{2}(${a})(${l}) = ${L}\\ \\text{cm}^2` },
        { title: 'Volume', tex: `V = \\tfrac{1}{3}(${a})^2(${h}) = ${f2(V)}\\ \\text{cm}^3` },
      ],
    };
  },
};

export const frustumPyramidPractice = {
  title: 'Volume of a square frustum',
  generate(rand) {
    const a = randInt(rand, 6, 16), b = randInt(rand, 2, a - 2), h = randInt(rand, 3, 12);
    const A1 = a * a, A2 = b * b, V = (h / 3) * (A1 + A2 + a * b);
    return {
      prompt: `<p>A concrete footing is a frustum of a square pyramid. The bottom is <strong>${a} m</strong> square, the top is <strong>${b} m</strong> square, and it is <strong>${h} m</strong> high. Find its volume.</p>`,
      answers: [{ label: 'Volume', value: V, unit: 'm³' }],
      hint: 'Use the frustum formula with the two base areas and the square root of their product.',
      hintTex: 'V = \\frac{h}{3}\\left(A_1 + A_2 + \\sqrt{A_1 A_2}\\right)',
      steps: [
        { title: 'Base areas', tex: `A_1 = ${a}^2 = ${A1},\\quad A_2 = ${b}^2 = ${A2},\\quad \\sqrt{A_1 A_2} = ${a * b}` },
        { title: 'Volume', tex: `V = \\frac{${h}}{3}(${A1} + ${A2} + ${a * b}) = ${f2(V)}\\ \\text{m}^3` },
      ],
    };
  },
};

export const ellipsoidPractice = {
  title: 'Volume of an ellipsoidal tank',
  generate(rand) {
    const a = randInt(rand, 3, 12), b = randInt(rand, 2, 10), c = randInt(rand, 2, 8);
    const V = (4 / 3) * PI * a * b * c;
    return {
      prompt: `<p>A storage tank is an ellipsoid with semi-axes <strong>${a} m</strong>, <strong>${b} m</strong> and <strong>${c} m</strong>. How much does it hold?</p>`,
      answers: [{ label: 'Volume', value: V, unit: 'm³' }],
      hint: 'An ellipsoid is a stretched sphere: replace r³ by the product of the three semi-axes.',
      hintTex: 'V = \\tfrac{4}{3}\\pi a b c',
      steps: [
        { title: 'Formula', tex: 'V = \\tfrac{4}{3}\\pi a b c' },
        { title: 'Substitute', tex: `V = \\tfrac{4}{3}\\pi (${a})(${b})(${c}) = ${f4((4 * a * b * c) / 3)}\\pi \\approx ${f2(V)}\\ \\text{m}^3` },
      ],
    };
  },
};

export const capPractice = {
  title: 'Spherical cap',
  generate(rand) {
    const R = randInt(rand, 4, 15), h = randInt(rand, 1, R);
    const V = (PI * h * h * (3 * R - h)) / 3, C = 2 * PI * R * h;
    return {
      prompt: `<p>A dome is a spherical cap cut from a sphere of radius <strong>${R} m</strong>. The dome is <strong>${h} m</strong> high. Find its curved surface area and the volume it encloses.</p>`,
      answers: [{ label: 'Curved surface area', value: C, unit: 'm²' }, { label: 'Volume', value: V, unit: 'm³' }],
      hint: 'The curved area of a cap depends only on R and h. The volume uses h squared.',
      hintTex: 'A = 2\\pi R h \\qquad V = \\tfrac{1}{3}\\pi h^2 (3R - h)',
      steps: [
        { title: 'Curved area', tex: `A = 2\\pi(${R})(${h}) = ${2 * R * h}\\pi \\approx ${f2(C)}\\ \\text{m}^2` },
        { title: 'Volume', tex: `V = \\tfrac{1}{3}\\pi(${h})^2(3 \\cdot ${R} - ${h}) = ${f4((h * h * (3 * R - h)) / 3)}\\pi \\approx ${f2(V)}\\ \\text{m}^3` },
      ],
    };
  },
};

export const torusPractice = {
  title: 'Doughnut (torus)',
  generate(rand) {
    const r = randInt(rand, 1, 5), R = r + randInt(rand, 2, 8);
    const V = 2 * PI * PI * R * r * r, A = 4 * PI * PI * R * r;
    return {
      prompt: `<p>An inflatable ring is a torus. The tube has radius <strong>${r} cm</strong>, and its centre circle has radius <strong>${R} cm</strong>. Find the volume and the surface area.</p>`,
      answers: [{ label: 'Volume', value: V, unit: 'cm³' }, { label: 'Surface area', value: A, unit: 'cm²' }],
      hint: 'Theorem of Pappus: the circle of radius r sweeps a path of length 2πR.',
      hintTex: 'V = (\\pi r^2)(2\\pi R) \\qquad A = (2\\pi r)(2\\pi R)',
      steps: [
        { title: 'Volume', tex: `V = 2\\pi^2 R r^2 = 2\\pi^2(${R})(${r})^2 = ${2 * R * r * r}\\pi^2 \\approx ${f2(V)}\\ \\text{cm}^3` },
        { title: 'Surface area', tex: `A = 4\\pi^2 R r = 4\\pi^2(${R})(${r}) = ${4 * R * r}\\pi^2 \\approx ${f2(A)}\\ \\text{cm}^2` },
      ],
    };
  },
};

export const compositePractice = {
  title: 'Grain silo',
  generate(rand) {
    const r = randInt(rand, 2, 8), h = randInt(rand, 5, 25);
    const Vc = PI * r * r * h, Vh = (2 / 3) * PI * r ** 3, V = Vc + Vh;
    return {
      prompt: `<p>A silo is a cylinder of radius <strong>${r} m</strong> and height <strong>${h} m</strong> with a hemispherical roof. Find the total volume.</p>`,
      answers: [{ label: 'Total volume', value: V, unit: 'm³' }],
      hint: 'Add the cylinder and the hemisphere (half a sphere) of the same radius.',
      hintTex: 'V = \\pi r^2 h + \\tfrac{2}{3}\\pi r^3',
      steps: [
        { title: 'Cylinder', tex: `\\pi(${r})^2(${h}) = ${r * r * h}\\pi \\approx ${f2(Vc)}` },
        { title: 'Hemisphere', tex: `\\tfrac{2}{3}\\pi(${r})^3 = ${f4((2 * r ** 3) / 3)}\\pi \\approx ${f2(Vh)}` },
        { title: 'Total', tex: `V \\approx ${f2(Vc)} + ${f2(Vh)} = ${f2(V)}\\ \\text{m}^3` },
      ],
    };
  },
};

export const frustumConePractice = {
  title: 'Frustum of a cone',
  generate(rand) {
    const [d, h, s] = pick(rand, TRIPLES), r = randInt(rand, 1, 6), R = r + d;
    const V = ((PI * h) / 3) * (R * R + R * r + r * r), L = PI * (R + r) * s;
    return {
      prompt: `<p>A bucket is a frustum of a cone with top radius <strong>${R} cm</strong>, bottom radius <strong>${r} cm</strong> and depth <strong>${h} cm</strong>. Find its slant height, its curved surface area and how much it holds.</p>`,
      answers: [{ label: 'Slant height s', value: s, unit: 'cm' }, { label: 'Lateral area', value: L, unit: 'cm²' }, { label: 'Volume', value: V, unit: 'cm³' }],
      hint: 'The slant height is the hypotenuse of a right triangle with legs h and R − r.',
      hintTex: 's = \\sqrt{h^2 + (R - r)^2} \\qquad L = \\pi (R + r) s \\qquad V = \\frac{\\pi h}{3}(R^2 + Rr + r^2)',
      steps: [
        { title: 'Slant height', tex: `s = \\sqrt{${h}^2 + ${d}^2} = \\sqrt{${h * h + d * d}} = ${s}\\ \\text{cm}` },
        { title: 'Lateral area', tex: `L = \\pi(${R} + ${r})(${s}) = ${(R + r) * s}\\pi \\approx ${f2(L)}\\ \\text{cm}^2` },
        { title: 'Volume', tex: `V = \\frac{\\pi (${h})}{3}(${R * R} + ${R * r} + ${r * r}) = ${f4((h * (R * R + R * r + r * r)) / 3)}\\pi \\approx ${f2(V)}\\ \\text{cm}^3` },
      ],
    };
  },
};

// ---------------------------------------------------------------- explorers
/** Profile (radius, height) of each composite solid, centred vertically. */
function compositeProfile(type, r, h, H, ri) {
  const arc = (cy, from, to, n = 10) => Array.from({ length: n + 1 }, (_, k) => { const t = from + ((to - from) * k) / n; return [r * Math.cos(t), cy + r * Math.sin(t)]; });
  let p;
  if (type === 'silo') p = [[r, 0], [r, h], ...arc(h, 0, PI / 2).slice(1)];
  else if (type === 'capsule') p = [...arc(0, -PI / 2, 0), [r, h], ...arc(h, 0, PI / 2).slice(1)];
  else if (type === 'rocket') p = [[r, 0], [r, h], [0, h + H]];
  else if (type === 'icecream') p = [[0, 0], [r, H], ...arc(H, 0, PI / 2).slice(1)];
  else p = [[r, 0], [r, h], [ri, h], [ri, 0], [r, 0]];
  const ys = p.map((q) => q[1]), mid = (Math.min(...ys) + Math.max(...ys)) / 2;
  return p.map(([x, y]) => [Math.max(0, x), y - mid]);
}
export const compositeExplore = {
  title: 'Build a composite solid',
  intro: 'Every composite solid is just simpler solids added (or a hole subtracted). Change the dimensions and watch each part of the volume change.',
  controls: [
    { name: 'type', label: 'Solid', type: 'select', options: [['silo', 'Silo (cylinder + hemisphere)'], ['capsule', 'Capsule (cylinder + 2 hemispheres)'], ['rocket', 'Rocket (cylinder + cone)'], ['icecream', 'Ice-cream cone (cone + hemisphere)'], ['tube', 'Pipe (cylinder with a hole)']], value: 'silo' },
    { name: 'r', label: 'Radius r', min: 0.5, max: 5, step: 0.1, value: 3 },
    { name: 'h', label: 'Cylinder height h', min: 0.5, max: 12, step: 0.1, value: 6 },
    { name: 'H', label: 'Cone height H', min: 0.5, max: 10, step: 0.1, value: 4 },
    { name: 'ri', label: 'Inner radius (pipe)', min: 0.1, max: (v) => Math.max(0.1, v.r - 0.1), step: 0.1, value: 2 },
    ...VIEW,
  ],
  rotate: { yaw: 'yaw', pitch: 'pitch' },
  render({ type, r, h, H, ri, yaw, pitch }) {
    const inner = Math.min(ri, r - 0.05);
    const cyl = PI * r * r * h, hemi = (2 / 3) * PI * r ** 3, cone = (PI * r * r * H) / 3, hole = PI * inner * inner * h;
    const parts = { silo: [['Cylinder', cyl], ['Hemisphere', hemi]], capsule: [['Cylinder', cyl], ['Two hemispheres', 2 * hemi]], rocket: [['Cylinder', cyl], ['Cone', cone]], icecream: [['Cone', cone], ['Hemisphere', hemi]], tube: [['Outer cylinder', cyl], ['Hole', -hole]] }[type];
    const V = parts.reduce((s, [, x]) => s + x, 0);
    const mesh = latheMesh(compositeProfile(type, r, h, H, inner), 40, { closeEnds: type !== 'tube' });
    return {
      svg: renderSolid(mesh, { yaw, pitch, scale: 14, title: `Composite solid: ${type}` }),
      readouts: [
        ...parts.map(([name, x]) => ({ label: name, tex: `${x < 0 ? '-' : ''}${f2(Math.abs(x))}` })),
        { label: 'Total volume', tex: `V \\approx ${f2(V)}`, tone: 'good' },
      ],
      note: type === 'tube' ? 'The hole is subtracted: V = π(r² − rᵢ²)h.' : '',
    };
  },
};

export const similarExplore = {
  title: 'Scale a solid',
  intro: 'Make the second cone k times as tall and as wide. Its surface area grows by k² and its volume by k³ — so doubling the size gives 4 times the paint and 8 times the contents.',
  controls: [
    { name: 'k', label: 'Scale factor k', min: 0.5, max: 3, step: 0.05, value: 2 },
    ...VIEW,
  ],
  rotate: { yaw: 'yaw', pitch: 'pitch' },
  presets: [{ label: 'Double (k = 2)', values: { k: 2 } }, { label: 'Half (k = 0.5)', values: { k: 0.5 } }, { label: 'Triple (k = 3)', values: { k: 3 } }],
  render({ k, yaw, pitch }) {
    const r = 1.4, h = 2.6;
    const one = latheMesh([[r, -h / 2], [0, h / 2]], 32);
    const two = latheMesh([[r * k, (-h * k) / 2], [0, (h * k) / 2]], 32);
    const shift = (m, dx, dy) => m.faces.map((f) => ({ ...f, pts: f.pts.map(([x, y, z]) => [x + dx, y + dy, z]) }));
    const base = -2.4;
    const mesh = { smooth: true, faces: [...shift(one, -3.2, base + h / 2), ...shift(two, 1.2 + r * k, base + (h * k) / 2)] };
    return {
      svg: renderSolid(mesh, { yaw, pitch, scale: 22, title: `Two similar cones with scale factor ${k}` }),
      readouts: [
        { label: 'Length ratio', tex: `k = ${f2(k)}` },
        { label: 'Area ratio', tex: `k^2 \\approx ${f2(k * k)}` },
        { label: 'Volume ratio', tex: `k^3 \\approx ${f2(k ** 3)}`, tone: 'good' },
      ],
    };
  },
};

export const frustumConeExplore = {
  title: 'Cut the top off a cone',
  intro: 'Shrink the top radius to 0 and the frustum becomes a cone; make it equal to the bottom radius and it becomes a cylinder.',
  controls: [
    { name: 'R', label: 'Bottom radius R', min: 1, max: 6, step: 0.1, value: 5 },
    { name: 'r', label: 'Top radius r', min: 0, max: 6, step: 0.1, value: 2 },
    { name: 'h', label: 'Height h', min: 0.5, max: 10, step: 0.1, value: 4 },
    ...VIEW,
  ],
  rotate: { yaw: 'yaw', pitch: 'pitch' },
  presets: [{ label: 'Cone (r = 0)', values: { r: 0 } }, { label: 'Cylinder (r = R)', values: { R: 4, r: 4 } }],
  render({ R, r, h, yaw, pitch }) {
    const s = Math.hypot(h, R - r), V = ((PI * h) / 3) * (R * R + R * r + r * r), L = PI * (R + r) * s;
    return {
      svg: renderSolid(frustumMesh(R, r, h, 48, { smooth: true }), { yaw, pitch, scale: 16, title: `Frustum R = ${R}, r = ${r}, h = ${h}`, lines: [{ a: [0, -h / 2, 0], b: [0, h / 2, 0], label: 'h' }, { a: [0, -h / 2, 0], b: [R, -h / 2, 0], label: 'R' }] }),
      readouts: [
        { label: 'Slant height', tex: `s = \\sqrt{h^2 + (R - r)^2} \\approx ${f2(s)}` },
        { label: 'Volume', tex: `V = \\tfrac{\\pi h}{3}(R^2 + Rr + r^2) \\approx ${f2(V)}` },
        { label: 'Lateral area', tex: `\\pi (R + r) s \\approx ${f2(L)}` },
      ],
      note: r === 0 ? 'With r = 0 this is a cone: V = πR²h/3.' : Math.abs(R - r) < 1e-9 ? 'With r = R the sides are vertical: this is a cylinder, V = πR²h.' : r > R ? 'The top is now wider than the bottom: an upside-down frustum. The formulas are the same.' : '',
    };
  },
};
