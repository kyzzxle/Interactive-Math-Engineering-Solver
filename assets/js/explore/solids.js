/**
 * Explorers and practice problems for solid mensuration: rotatable 3D solids whose
 * surface area and volume update as the dimensions change. The drawing scale is fixed,
 * so growing a dimension visibly grows the solid.
 */
import { frustumMesh, sphereMesh, renderSolid } from '../lib/solid3d.js';
import { tx } from '../lib/calc-kit.js';
import { randInt } from '../lib/learn.js';

const VIEW = [
  { name: 'yaw', label: 'Turn', min: 0, max: 360, step: 1, value: 35, unit: '°' },
  { name: 'pitch', label: 'Tilt', min: -10, max: 60, step: 1, value: 22, unit: '°' },
];
const SIDES = [['3', 'Triangle (3)'], ['4', 'Square (4)'], ['5', 'Pentagon (5)'], ['6', 'Hexagon (6)'], ['8', 'Octagon (8)']];
const f2 = (x) => tx(x, 2);
const ratio = (x, x0) => (x0 > 0 ? `×${(x / x0).toFixed(2)}` : '');

/** Compare with the starting shape so the scaling laws (r², r³) are visible. */
function scaling(V, A, V0, A0) {
  return { label: 'Compared with the starting shape', text: `volume ${ratio(V, V0)}, surface area ${ratio(A, A0)}` };
}
const poly = (n, a) => ({ B: (n * a * a) / (4 * Math.tan(Math.PI / n)), P: n * a, ap: a / (2 * Math.tan(Math.PI / n)), R: a / (2 * Math.sin(Math.PI / n)) });

const sphereVals = (r) => ({ A: 4 * Math.PI * r * r, V: (4 / 3) * Math.PI * r ** 3 });
export const sphereExplore = {
  title: 'Resize and turn a sphere',
  intro: 'Change the radius and compare the area and volume with the starting sphere: area grows with r², volume with r³.',
  controls: [{ name: 'r', label: 'Radius r', min: 0.5, max: 8, step: 0.1, value: 3 }, ...VIEW],
  rotate: { yaw: 'yaw', pitch: 'pitch' },
  presets: [{ label: 'Double the radius (r = 6)', values: { r: 6 } }, { label: 'Half the radius (r = 1.5)', values: { r: 1.5 } }],
  render({ r, yaw, pitch }) {
    const { A, V } = sphereVals(r), s0 = sphereVals(3);
    return {
      svg: renderSolid(sphereMesh(r), { yaw, pitch, scale: 18, title: `Sphere with radius ${r}`, lines: [{ a: [0, 0, 0], b: [r, 0, 0], label: 'r' }] }),
      readouts: [
        { label: 'Surface area', tex: `A = 4\\pi r^2 \\approx ${f2(A)}` },
        { label: 'Volume', tex: `V = \\tfrac{4}{3}\\pi r^3 \\approx ${f2(V)}` },
        scaling(V, A, s0.V, s0.A),
      ],
    };
  },
};

const cylVals = (r, h) => ({ L: 2 * Math.PI * r * h, A: 2 * Math.PI * r * (r + h), V: Math.PI * r * r * h });
export const cylinderExplore = {
  title: 'Resize and turn a cylinder',
  intro: 'Doubling the height doubles the volume; doubling the radius multiplies it by 4.',
  controls: [{ name: 'r', label: 'Radius r', min: 0.5, max: 7, step: 0.1, value: 3 }, { name: 'h', label: 'Height h', min: 0.5, max: 14, step: 0.1, value: 6 }, ...VIEW],
  rotate: { yaw: 'yaw', pitch: 'pitch' },
  presets: [{ label: 'Double h', values: { r: 3, h: 12 } }, { label: 'Double r', values: { r: 6, h: 6 } }],
  render({ r, h, yaw, pitch }) {
    const v = cylVals(r, h), v0 = cylVals(3, 6);
    return {
      svg: renderSolid(frustumMesh(r, r, h, 48, { smooth: true }), { yaw, pitch, scale: 16, title: `Cylinder r = ${r}, h = ${h}`, lines: [{ a: [0, -h / 2, 0], b: [0, h / 2, 0], label: 'h' }, { a: [0, h / 2, 0], b: [r, h / 2, 0], label: 'r' }] }),
      readouts: [
        { label: 'Volume', tex: `V = \\pi r^2 h \\approx ${f2(v.V)}` },
        { label: 'Lateral area', tex: `2\\pi r h \\approx ${f2(v.L)}` },
        { label: 'Total surface area', tex: `2\\pi r(r + h) \\approx ${f2(v.A)}` },
        scaling(v.V, v.A, v0.V, v0.A),
      ],
    };
  },
};

const coneVals = (r, h) => { const s = Math.hypot(r, h); return { s, A: Math.PI * r * (r + s), L: Math.PI * r * s, V: (Math.PI * r * r * h) / 3 }; };
export const coneExplore = {
  title: 'Resize and turn a cone',
  intro: 'The slant height s is the hypotenuse of a right triangle with legs r and h.',
  controls: [{ name: 'r', label: 'Radius r', min: 0.5, max: 7, step: 0.1, value: 3 }, { name: 'h', label: 'Height h', min: 0.5, max: 14, step: 0.1, value: 4 }, ...VIEW],
  rotate: { yaw: 'yaw', pitch: 'pitch' },
  presets: [{ label: '3-4-5 cone', values: { r: 3, h: 4 } }, { label: 'Tall and thin', values: { r: 1.5, h: 12 } }],
  render({ r, h, yaw, pitch }) {
    const v = coneVals(r, h), v0 = coneVals(3, 4);
    return {
      svg: renderSolid(frustumMesh(r, 0, h, 48, { smooth: true }), { yaw, pitch, scale: 16, title: `Cone r = ${r}, h = ${h}`, lines: [{ a: [0, -h / 2, 0], b: [0, h / 2, 0], label: 'h' }, { a: [0, -h / 2, 0], b: [r, -h / 2, 0], label: 'r' }] }),
      readouts: [
        { label: 'Slant height', tex: `s = \\sqrt{r^2 + h^2} \\approx ${f2(v.s)}` },
        { label: 'Volume', tex: `V = \\tfrac{1}{3}\\pi r^2 h \\approx ${f2(v.V)}` },
        { label: 'Total surface area', tex: `\\pi r(r + s) \\approx ${f2(v.A)}` },
        scaling(v.V, v.A, v0.V, v0.A),
      ],
    };
  },
};

const prismVals = (n, a, h) => { const p = poly(n, a); return { ...p, A: 2 * p.B + p.P * h, V: p.B * h }; };
export const prismExplore = {
  title: 'Build a regular prism',
  intro: 'Every prism has volume = base area × height, whatever the shape of the base.',
  controls: [{ name: 'n', label: 'Base shape', type: 'select', options: SIDES, value: '6' }, { name: 'a', label: 'Base edge a', min: 0.5, max: 6, step: 0.1, value: 3 }, { name: 'h', label: 'Height h', min: 0.5, max: 12, step: 0.1, value: 6 }, ...VIEW],
  rotate: { yaw: 'yaw', pitch: 'pitch' },
  render({ n, a, h, yaw, pitch }) {
    const k = Number(n), v = prismVals(k, a, h), v0 = prismVals(k, 3, 6);
    return {
      svg: renderSolid(frustumMesh(v.R, v.R, h, k), { yaw, pitch, scale: 14, title: `Prism with a ${k}-sided base`, lines: [{ a: [0, -h / 2, 0], b: [0, h / 2, 0], label: 'h' }] }),
      readouts: [
        { label: 'Base area', tex: `B = \\frac{n a^2}{4\\tan(180^\\circ/n)} \\approx ${f2(v.B)}` },
        { label: 'Volume', tex: `V = B h \\approx ${f2(v.V)}` },
        { label: 'Total surface area', tex: `2B + P h \\approx ${f2(v.A)}` },
        scaling(v.V, v.A, v0.V, v0.A),
      ],
    };
  },
};

const pyrVals = (n, a, h) => { const p = poly(n, a); const l = Math.hypot(h, p.ap); return { ...p, l, A: p.B + (p.P * l) / 2, V: (p.B * h) / 3 }; };
export const pyramidExplore = {
  title: 'Build a regular pyramid',
  intro: 'A pyramid holds exactly one third of the prism with the same base and height.',
  controls: [{ name: 'n', label: 'Base shape', type: 'select', options: SIDES, value: '4' }, { name: 'a', label: 'Base edge a', min: 0.5, max: 8, step: 0.1, value: 6 }, { name: 'h', label: 'Height h', min: 0.5, max: 12, step: 0.1, value: 4 }, ...VIEW],
  rotate: { yaw: 'yaw', pitch: 'pitch' },
  render({ n, a, h, yaw, pitch }) {
    const k = Number(n), v = pyrVals(k, a, h), v0 = pyrVals(k, 6, 4);
    return {
      svg: renderSolid(frustumMesh(v.R, 0, h, k), { yaw, pitch, scale: 14, title: `Pyramid with a ${k}-sided base`, lines: [{ a: [0, -h / 2, 0], b: [0, h / 2, 0], label: 'h' }] }),
      readouts: [
        { label: 'Slant height (apothem)', tex: `l = \\sqrt{h^2 + \\text{ap}^2} \\approx ${f2(v.l)}` },
        { label: 'Volume', tex: `V = \\tfrac{1}{3} B h \\approx ${f2(v.V)}` },
        { label: 'Same-base prism', tex: `B h \\approx ${f2(3 * v.V)}` },
        { label: 'Total surface area', tex: `B + \\tfrac{1}{2} P l \\approx ${f2(v.A)}` },
        scaling(v.V, v.A, v0.V, v0.A),
      ],
    };
  },
};

function frustVals(n, a, b, h) {
  const p1 = poly(n, a), p2 = poly(n, b);
  const l = Math.hypot(h, p1.ap - p2.ap);
  return { p1, p2, l, V: (h / 3) * (p1.B + p2.B + Math.sqrt(p1.B * p2.B)), A: p1.B + p2.B + (n * (a + b) * l) / 2 };
}
export const frustumPyramidExplore = {
  title: 'Slice the top off a pyramid',
  intro: 'Shrink the top edge to 0 and the frustum becomes a pyramid; make it equal to the bottom edge and it becomes a prism.',
  controls: [{ name: 'n', label: 'Base shape', type: 'select', options: SIDES, value: '4' }, { name: 'a', label: 'Bottom edge a', min: 1, max: 8, step: 0.1, value: 6 }, { name: 'b', label: 'Top edge b', min: 0, max: 8, step: 0.1, value: 3 }, { name: 'h', label: 'Height h', min: 0.5, max: 10, step: 0.1, value: 4 }, ...VIEW],
  rotate: { yaw: 'yaw', pitch: 'pitch' },
  presets: [{ label: 'Pyramid (b = 0)', values: { b: 0 } }, { label: 'Prism (b = a)', values: { a: 6, b: 6 } }],
  render({ n, a, b, h, yaw, pitch }) {
    const k = Number(n), v = frustVals(k, a, b, h);
    return {
      svg: renderSolid(frustumMesh(v.p1.R, v.p2.R, h, k), { yaw, pitch, scale: 14, title: `Frustum with a ${k}-sided base`, lines: [{ a: [0, -h / 2, 0], b: [0, h / 2, 0], label: 'h' }] }),
      readouts: [
        { label: 'Volume', tex: `V = \\tfrac{h}{3}\\left(B_1 + B_2 + \\sqrt{B_1 B_2}\\right) \\approx ${f2(v.V)}` },
        { label: 'Slant height', tex: `l \\approx ${f2(v.l)}` },
        { label: 'Total surface area', tex: `A \\approx ${f2(v.A)}` },
      ],
      note: b === 0 ? 'With b = 0 the top face disappears: this is a pyramid, V = Bh/3.' : Math.abs(a - b) < 1e-9 ? 'With b = a the sides are vertical: this is a prism, V = Bh.' : '',
    };
  },
};

export const spherePractice = {
  title: 'Volume and area of a sphere',
  generate(rand) {
    const r = randInt(rand, 2, 12);
    const V = (4 / 3) * Math.PI * r ** 3, A = 4 * Math.PI * r * r;
    return {
      prompt: `<p>A ball has radius <strong>${r} cm</strong>. Find its surface area and volume.</p>`,
      answers: [{ label: 'Surface area', value: A, unit: 'cm²' }, { label: 'Volume', value: V, unit: 'cm³' }],
      hint: 'Surface area uses r squared; volume uses r cubed and the fraction 4/3.',
      hintTex: 'A = 4\\pi r^2 \\qquad V = \\frac{4}{3}\\pi r^3',
      steps: [
        { title: 'Known value', tex: `r = ${r}\\text{ cm}` },
        { title: 'Surface area', texLines: ['A = 4\\pi r^2', `A = 4\\pi(${r})^2 = ${4 * r * r}\\pi \\approx ${f2(A)}\\text{ cm}^2`] },
        { title: 'Volume', texLines: ['V = \\frac{4}{3}\\pi r^3', `V = \\frac{4}{3}\\pi(${r})^3 \\approx ${f2(V)}\\text{ cm}^3`] },
      ],
    };
  },
};

export const cylinderPractice = {
  title: 'Volume of a cylinder',
  generate(rand) {
    const r = randInt(rand, 2, 9), h = randInt(rand, 3, 20);
    const V = Math.PI * r * r * h;
    return {
      prompt: `<p>A cylindrical tank has radius <strong>${r} m</strong> and height <strong>${h} m</strong>. How much does it hold?</p>`,
      answers: [{ label: 'Volume', value: V, unit: 'm³' }],
      hint: 'Volume = area of the circular base × height.',
      hintTex: 'V = \\pi r^2 h',
      steps: [
        { title: 'Known values', tex: `r = ${r}\\text{ m}, \\quad h = ${h}\\text{ m}` },
        { title: 'Formula', tex: 'V = \\pi r^2 h' },
        { title: 'Substitute and simplify', texLines: [`V = \\pi (${r})^2 (${h})`, `V = ${r * r * h}\\pi \\approx ${f2(V)}\\text{ m}^3`] },
      ],
    };
  },
};
