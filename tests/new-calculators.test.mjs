/* Known answers for the calculators added in the 45-topic expansion, checked against
   hand calculations or independent methods, plus a regression test for exact trig signs. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exactTrig } from '../assets/js/lib/trig.js';

const load = async (id) => (await import(`../assets/js/calculators/${id}.js`)).calculator;
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const card = (res, label) => {
  const a = res.answers.find((x) => x.label.startsWith(label));
  assert.ok(a, `no card "${label}"`);
  return Number(String(a.value).replace(/[ ,]/g, ' ').split(' ')[0].replace(/,/g, ''));
};

test('exact trig values keep the sign of two-term values (tan 105° = −(2 + √3))', () => {
  for (let d = 0; d < 360; d += 15) {
    const e = exactTrig(d);
    if (!e.tan) continue;
    const t = e.tan[1].replace(/−/g, '-').replace(/√(\d)/g, 'Math.sqrt($1)').replace(/\)\//, ')/');
    assert.ok(near(Function(`return ${t.replace(/(\d)\(/g, '$1*(')}`)(), Math.tan((d * Math.PI) / 180), 1e-9), `tan ${d}°: ${e.tan[1]}`);
  }
});

test('solid mensuration', async () => {
  const e = await load('ellipsoid');
  const prol = e.solve({ a: '6', b: '4', c: '4', unit: '' });
  const ecc = Math.sqrt(1 - 16 / 36);
  assert.ok(near(card(prol, 'Surface area'), 2 * Math.PI * 16 * (1 + (6 / (4 * ecc)) * Math.asin(ecc)), 1e-6));
  assert.ok(near(card(e.solve({ a: '3', b: '3', c: '3', unit: '' }), 'Surface area'), 36 * Math.PI, 1e-7));
  assert.ok(near(card((await load('spherical-cap')).solve({ mode: 'cap', R: '5', h: '2', unit: '' }), 'Volume'), (52 * Math.PI) / 3));
  assert.ok(near(card((await load('torus')).solve({ R: '6', r: '2', unit: '' }), 'Volume'), 48 * Math.PI ** 2));
  assert.ok(near(card((await load('composite-solid')).solve({ type: 'silo', r: '3', h: '10', unit: '' }), 'Total volume'), 108 * Math.PI));
  assert.ok(near(card((await load('similar-solids')).solve({ given: 'lengths', L1: '4', L2: '6', A1: '', V1: '64' }), 'Volume of solid 2'), 216));
});

test('analytic geometry and algebra', async () => {
  assert.equal(card((await load('polygon-area-coordinates')).solve({ pts: '0,0\n4,0\n4,3\n0,5' }), 'Area'), 16);
  assert.ok(near(card((await load('angle-between-lines')).solve({ mode: 'vectors', u: '1,2,2', w: '2,-1,2' }), 'Acute'), (Math.acos(4 / 9) * 180) / Math.PI, 1e-5));
  const ineq = (await load('inequality-solver')).solve({ lhs: 'x^2 - 5x', op: 'lt', rhs: '-6' });
  assert.equal(ineq.final.texLines[0], '2 < x < 3');
  const seq = (await load('arithmetic-geometric-sequences')).solve({ type: 'geo', a1: '5', r: '2', n: '8' });
  assert.equal(card(seq, 'Sum'), 1275);
});

test('statistics and combinatorics', async () => {
  assert.ok(near(card((await load('counting-probability')).solve({ N: '52', K: '13', n: '5', k: '2', type: 'eq' }), 'Probability'), 9139 / 33320, 1e-7));
  assert.ok(near(card((await load('poisson-distribution')).solve({ lam: '3', op: 'eq', k: '2', k2: '' }), 'Probability'), 4.5 * Math.exp(-3), 1e-7));
  assert.ok(near(card((await load('bayes-theorem')).solve({ mode: 'bayes', pA: '1%', pBA: '0.95', pBnA: '0.05' }), 'P(A | B)'), 0.0095 / 0.059, 1e-7));
  const q = (await load('quartiles-percentiles')).solve({ data: '3,7,8,5,12,14,21,13,18,64', method: 'tukey', p: '' });
  assert.equal(card(q, 'Q₁'), 7); assert.equal(card(q, 'Q₃'), 18);
  assert.equal((await load('derangements')).solve({ n: '10' }).answers[0].copy, '1334961');
  assert.equal((await load('integer-partitions')).solve({ n: '100', mode: 'all' }).answers[0].copy, '190569292');
  assert.equal((await load('generating-functions')).solve({ mode: 'coins', coins: '1, 5, 10, 25', n: '100' }).answers[0].copy, '242');
});

test('engineering and physics', async () => {
  const ode = (await load('first-order-ode')).solve({ form: 'linear', a: '-0.2', b: '4', x0: '0', y0: '90', x1: '10' });
  assert.ok(near(card(ode, 'y(10)'), 20 + 70 * Math.exp(-2), 1e-6));
  assert.equal((await load('inverse-laplace-transform')).solve({ num: 's + 3', den: 's^2 + 2s + 5' }).final.tex, 'f(t) = e^{-t}\\left(\\cos(2t) + \\sin(2t)\\right)');
  const col = (await load('momentum-collisions')).solve({ m1: '2', v1: '4', m2: '3', v2: '-1', type: 'elastic' });
  assert.equal(card(col, 'Velocity of body 1'), -2); assert.equal(card(col, 'Velocity of body 2'), 3);
  assert.equal(card((await load('lens-mirror-equation')).solve({ type: 'convex-lens', f: '10', do: '30', ho: '2' }), 'Image distance'), 15);
  assert.ok(near(card((await load('thermal-expansion-calorimetry')).solve({ mode: 'mix', mat1: 'copper', m1: '0.2', t1: '90', mat2: 'water', m2: '0.5', t2: '20' }), 'Final temperature'), (77 * 90 + 2093 * 20) / 2170, 1e-5));
});
