/* Solid mensuration: the five newer calculators checked against hand calculations and
   independent identities, plus the frustum-of-a-cone explorer and practice problem. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POLYHEDRA, polyhedronMesh, prismoidal } from '../assets/js/explore/solids-new.js';
import { frustumConeExplore, frustumConePractice } from '../assets/js/explore/solids-practice.js';
import { ellipsePerimeter, obliqueConeLateral } from '../assets/js/calculators/cylindrical-wedge-oblique.js';
import { texToMathML } from '../tools/katex-node.mjs';

const load = async (id) => (await import(`../assets/js/calculators/${id}.js`)).calculator;
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
function card(res, label) {
  assert.ok(res.ok, JSON.stringify(res.errors));
  const a = res.answers.find((x) => x.label.startsWith(label));
  assert.ok(a, `no card "${label}"`);
  return Number(String(a.value).replace(/,/g, '').split(' ')[0]);
}
const PI = Math.PI;

test('regular polyhedra: meshes have the right faces, and V = rA/3 for every solid', async () => {
  for (const [type, P] of Object.entries(POLYHEDRA)) {
    const mesh = polyhedronMesh(type, 1);
    assert.equal(mesh.faces.length, P.faces, `${type} faces`);
    const verts = new Set(mesh.faces.flatMap((f) => f.pts.map((p) => p.map((c) => c.toFixed(6)).join(','))));
    assert.equal(verts.size, P.vertices, `${type} vertices`);
    assert.equal(mesh.faces.reduce((s, f) => s + f.pts.length, 0) / 2, P.edges, `${type} edges`);
    // every edge of the mesh has length 1
    for (const f of mesh.faces) for (let i = 0; i < f.pts.length; i++) {
      const a = f.pts[i], b = f.pts[(i + 1) % f.pts.length];
      assert.ok(near(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), 1, 1e-9), `${type} edge length`);
    }
    // circumradius of the mesh matches kR
    const R = Math.max(...mesh.faces.flatMap((f) => f.pts.map((p) => Math.hypot(...p))));
    assert.ok(near(R, P.kR, 1e-9), `${type} circumradius`);
    assert.ok(near(P.kV, (P.kr * P.kA) / 3, 1e-12), `${type}: V = rA/3`);
  }
  const c = await load('regular-polyhedron');
  assert.ok(near(card(c.solve({ type: 'tetra', known: 'a', value: '6', unit: '' }), 'Volume'), 18 * Math.SQRT2));
  assert.equal(card(c.solve({ type: 'cube', known: 'V', value: '27', unit: '' }), 'Edge'), 3);
  for (const known of ['A', 'V', 'r', 'R']) {
    const r = c.solve({ type: 'icosa', known: 'a', value: '2.5', unit: '' });
    const val = card(r, { A: 'Surface area', V: 'Volume', r: 'Inradius', R: 'Circumradius' }[known]);
    assert.ok(near(card(c.solve({ type: 'icosa', known, value: String(val), unit: '' }), 'Edge'), 2.5, 1e-6), `icosa from ${known}`);
  }
  // exact form of the octahedron volume with a = 3: (√2/3)·27 = 9√2
  const oct = c.solve({ type: 'octa', known: 'a', value: '3', unit: '' });
  assert.equal(oct.answers.find((x) => x.label.startsWith('Volume')).exactTex, '9\\sqrt{2}');
});

test('prismatoid: reproduces prisms, pyramids, frustums and the wedge formula', async () => {
  const c = await load('prismatoid');
  assert.equal(card(c.solve({ mode: 'obelisk', L1: '6', W1: '6', L2: '0', W2: '0', h: '9', unit: '' }), 'Volume'), 108, 'pyramid = Bh/3');
  assert.equal(card(c.solve({ mode: 'obelisk', L1: '4', W1: '5', L2: '4', W2: '5', h: '3', unit: '' }), 'Volume'), 60, 'prism = Bh');
  const fr = card(c.solve({ mode: 'obelisk', L1: '10', W1: '6', L2: '5', W2: '3', h: '4', unit: '' }), 'Volume');
  assert.ok(near(fr, (4 / 3) * (60 + 15 + Math.sqrt(60 * 15))), 'similar ends = frustum formula');
  assert.equal(card(c.solve({ mode: 'wedge', l: '10', w: '6', e: '4', h: '5', unit: '' }), 'Volume'), (6 * 5 * (2 * 10 + 4)) / 6);
  assert.ok(near(prismoidal(0, (PI * 9) / 4, PI * 9, 6), (PI * 9 * 6) / 3), 'cone as a prismatoid');
  assert.equal(c.solve({ mode: 'general', A1: '100', Am: '4', A2: '100', h: '3', unit: '' }).ok, false);
  assert.equal(c.solve({ mode: 'general', A1: '0', Am: '5', A2: '0', h: '3', unit: '' }).ok, true, 'a tetrahedron-like solid has zero-area ends');
});

test('truncated prism: average edge, faces and planarity', async () => {
  const c = await load('truncated-prism');
  const r = c.solve({ type: 'tri', a: '3', b: '4', c: '5', edges: '6, 8, 10', unit: '' });
  assert.equal(card(r, 'Volume'), 48);
  assert.equal(card(r, 'Lateral area'), 3 * 7 + 4 * 9 + 5 * 8);
  // with equal edges it is an ordinary prism
  const p = c.solve({ type: 'rect', l: '8', w: '5', edges: '4, 4, 4, 4', unit: '' });
  assert.equal(card(p, 'Volume'), 160);
  assert.equal(card(p, 'Total surface'), 2 * 40 + 26 * 4);
  assert.equal(c.solve({ type: 'rect', l: '8', w: '5', edges: '3, 5, 9, 2', unit: '' }).ok, false);
  assert.equal(c.solve({ type: 'tri', a: '1', b: '2', c: '5', edges: '1, 1, 1', unit: '' }).ok, false, 'not a triangle');
  assert.equal(c.solve({ type: 'tri', a: '3', b: '4', c: '5', edges: '1, 2', unit: '' }).ok, false, 'wrong number of edges');
});

test('spherical sector, wedge and triangle', async () => {
  const c = await load('spherical-sector-wedge');
  assert.ok(near(card(c.solve({ mode: 'sector', R: '6', h: '2', unit: '' }), 'Volume'), 48 * PI));
  // h = 2R: the whole sphere
  assert.ok(near(card(c.solve({ mode: 'sector', R: '3', h: '6', unit: '' }), 'Volume'), 36 * PI));
  const w = c.solve({ mode: 'wedge', R: '9', theta: '40', unit: '' });
  assert.ok(near(card(w, 'Lune area'), 36 * PI));
  assert.ok(near(card(w, 'Wedge volume'), 108 * PI));
  assert.ok(near(card(c.solve({ mode: 'wedge', R: '2', theta: '360', unit: '' }), 'Wedge volume'), (32 / 3) * PI), '360° = whole sphere');
  // octant triangle (three right angles) is 1/8 of the sphere
  assert.ok(near(card(c.solve({ mode: 'triangle', R: '1', A: '90', B: '90', C: '90', unit: '' }), 'Area of the triangle'), (4 * PI) / 8));
  assert.equal(c.solve({ mode: 'triangle', R: '1', A: '170', B: '170', C: '10', unit: '' }).ok, false);
});

test('cylindrical wedge and oblique solids', async () => {
  const c = await load('cylindrical-wedge-oblique');
  // ungula volume by direct numerical integration of triangular slices
  const r = 6, h = 9;
  let V = 0; const N = 20000;
  for (let i = 0; i < N; i++) { const x = -r + ((i + 0.5) * 2 * r) / N; V += ((h / (2 * r)) * (r * r - x * x) * 2 * r) / N; }
  assert.ok(near(card(c.solve({ mode: 'ungula', r: '6', h: '9', unit: '' }), 'Volume'), V, 1e-6));
  assert.ok(near(ellipsePerimeter(3, 3), 6 * PI, 1e-10), 'circle');
  assert.ok(near(ellipsePerimeter(5, 3), 25.526998863398131, 1e-9), 'known ellipse perimeter');
  assert.ok(near(obliqueConeLateral(3, 4, 0), PI * 3 * 5, 1e-9), 'right cone');
  assert.ok(obliqueConeLateral(3, 4, 2) > PI * 3 * 5, 'leaning adds area');
  const cyl = c.solve({ mode: 'cylinder', r: '2', L: '5', alpha: '90', unit: '' });
  assert.ok(near(card(cyl, 'Lateral area'), 2 * PI * 2 * 5));
  const lean = c.solve({ mode: 'cylinder', r: '4', L: '10', alpha: '30', unit: '' });
  assert.ok(near(card(lean, 'Volume'), PI * 16 * 5), 'V uses h = L sin α');
});

test('frustum of a cone: explorer and practice', () => {
  const vals = Object.fromEntries(frustumConeExplore.controls.map((k) => [k.name, k.value]));
  for (const over of [{}, { r: 0 }, { r: vals.R }, { r: 6 }]) {
    const out = frustumConeExplore.render({ ...vals, ...over });
    assert.ok(out.svg.includes('<svg'), 'draws the frustum');
    for (const ro of out.readouts) if (ro.tex) assert.doesNotThrow(() => texToMathML(ro.tex, false));
  }
  let seed = 7; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 40; i++) {
    const p = frustumConePractice.generate(rand);
    assert.ok(p.answers.every((a) => Number.isFinite(a.value)));
    const [s, L, V] = p.answers.map((a) => a.value);
    const R = Number(p.prompt.match(/top radius <strong>(\d+)/)[1]), r = Number(p.prompt.match(/bottom radius <strong>(\d+)/)[1]), h = Number(p.prompt.match(/depth <strong>(\d+)/)[1]);
    assert.ok(near(s, Math.hypot(h, R - r)) && near(L, PI * (R + r) * s) && near(V, ((PI * h) / 3) * (R * R + R * r + r * r)));
    for (const st of p.steps) assert.doesNotThrow(() => texToMathML(st.tex, true));
  }
});
