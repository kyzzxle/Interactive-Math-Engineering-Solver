/* The five newer algebra calculators, checked against hand calculations and against the
   original equations (every reported solution must satisfy them; rejected roots must not). */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const load = async (id) => (await import(`../assets/js/calculators/${id}.js`)).calculator;
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const card = (res, label) => { assert.ok(res.ok, JSON.stringify(res.errors)); const a = res.answers.find((x) => x.label.startsWith(label)); assert.ok(a, `no card ${label}`); return a; };
const nums = (s) => (String(s).replace(/−/g, '-').match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g) || []).map(Number);
const sols = (res) => res.answers.filter((a) => /^Solution x/.test(a.label)).map((a) => Number(a.value));
let seed = 12345; const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const I = (lo, hi) => lo + Math.floor(R() * (hi - lo + 1));

test('absolute value: hand examples', async () => {
  const c = await load('absolute-value-equations');
  assert.deepEqual(sols(c.solve({ mode: 'eq', a: '2', b: '-3', k: '7' })), [-2, 5]);
  const r = c.solve({ mode: 'abslin', a: '1', b: '-4', c: '2', d: '1' });
  assert.deepEqual(sols(r), [1]);
  assert.match(card(r, 'Rejected').value, /-5/);
  assert.deepEqual(sols(c.solve({ mode: 'absabs', a: '3', b: '1', c: '1', d: '-5' })), [-3, 1]);
  assert.equal(card(c.solve({ mode: 'eq', a: '1', b: '-1', k: '-4' }), 'Number of solutions').value, '0');
  assert.deepEqual(nums(card(c.solve({ mode: 'ineq', a: '2', b: '-1', op: 'lt', k: '5' }), 'Boundary points').value), [-2, 3]);
});

test('absolute value: every reported solution satisfies the equation', async () => {
  const c = await load('absolute-value-equations');
  for (let i = 0; i < 1500; i++) {
    const a = I(-6, 6) || 1, b = I(-9, 9), cc = I(-5, 5), d = I(-9, 9), k = I(-3, 9);
    const mode = ['eq', 'abslin', 'absabs'][i % 3];
    const res = c.solve({ mode, a: String(a), b: String(b), c: String(cc), d: String(d), k: String(k) });
    assert.ok(res.ok);
    const right = (x) => (mode === 'eq' ? k : mode === 'abslin' ? cc * x + d : Math.abs(cc * x + d));
    for (const x of sols(res)) assert.ok(near(Math.abs(a * x + b), right(x), 1e-5), `${mode} ${a},${b},${cc},${d},${k}: x=${x}`);
    // brute force: count integer-or-half solutions the solver must not miss
    if (mode === 'eq' && k > 0) assert.equal(sols(res).length, 2);
  }
});

test('absolute value inequalities agree with test points', async () => {
  const c = await load('absolute-value-equations');
  for (let i = 0; i < 800; i++) {
    const a = I(-5, 5) || 2, b = I(-9, 9), k = I(-2, 8), op = ['lt', 'le', 'gt', 'ge'][I(0, 3)];
    const res = c.solve({ mode: 'ineq', a: String(a), b: String(b), op, k: String(k) });
    const holds = (x) => { const v = Math.abs(a * x + b); return op === 'lt' ? v < k : op === 'le' ? v <= k : op === 'gt' ? v > k : v >= k; };
    const iv = card(res, 'Interval notation').valueTex;
    const pts = nums((res.answers.find((x) => x.label === 'Boundary points') || {}).value || '');
    if (pts.length === 2) {
      const inside = holds((pts[0] + pts[1]) / 2), outside = holds(pts[1] + 1);
      assert.equal(inside, op === 'lt' || op === 'le', `${a},${b},${op},${k}`);
      assert.equal(outside, op === 'gt' || op === 'ge', `${a},${b},${op},${k}`);
    } else if (/varnothing/.test(iv)) for (const x of [-7, 0, 3.3]) assert.equal(holds(x), false);
  }
});

test('radical equations: valid roots satisfy, rejected roots do not', async () => {
  const c = await load('radical-rational-equations');
  assert.deepEqual(sols(c.solve({ mode: 'radical', a: '1', b: '7', c: '1', d: '1' })), [2]);
  assert.deepEqual(sols(c.solve({ mode: 'radical', a: '3', b: '-2', c: '0', d: '4' })), [6]);
  for (let i = 0; i < 1500; i++) {
    const a = I(-5, 6) || 1, b = I(-9, 12), cc = I(-3, 3), d = I(-6, 6);
    const res = c.solve({ mode: 'radical', a: String(a), b: String(b), c: String(cc), d: String(d) });
    assert.ok(res.ok);
    for (const x of sols(res)) assert.ok(a * x + b >= -1e-5 && near(Math.sqrt(Math.max(0, a * x + b)), cc * x + d, 3e-3), `√(${a}x+${b}) = ${cc}x+${d}: ${x}`);
    const rej = card(res, 'Rejected').value;
    if (rej !== 'none') for (const x of nums(rej)) assert.ok(!(near(Math.sqrt(Math.max(0, a * x + b)), cc * x + d, 1e-6) && a * x + b >= 0), `rejected ${x} actually works`);
  }
});

test('rational equations: solutions satisfy the original, excluded values are rejected', async () => {
  const c = await load('radical-rational-equations');
  const r1 = c.solve({ mode: 'rational', lhs: 'x/(x - 2) + 1/x', rhs: '2/(x(x - 2))' });
  assert.deepEqual(sols(r1).map((x) => +x.toFixed(6)), [-2.561553, 1.561553]);
  const r2 = c.solve({ mode: 'rational', lhs: 'x/(x - 1)', rhs: '1/(x - 1)' });
  assert.equal(card(r2, 'Number of solutions').value, '0');
  assert.match(card(r2, 'Rejected').value, /^1$/);
  for (let i = 0; i < 600; i++) {
    const p = I(-4, 4), q = I(-4, 4), A = I(-5, 5) || 1, B = I(-5, 5), C = I(-6, 6);
    const lhs = `${A}/(x - ${p}) + ${B}/(x - ${q})`.replace(/- -/g, '+ '), rhs = String(C);
    const res = c.solve({ mode: 'rational', lhs, rhs });
    if (!res.ok) continue;
    for (const x of sols(res)) {
      assert.ok(Math.abs(x - p) > 1e-9 && Math.abs(x - q) > 1e-9, `${lhs} = ${rhs}: ${x} is excluded`);
      assert.ok(near(A / (x - p) + B / (x - q), C, 1e-4), `${lhs} = ${rhs}: x=${x}`);
    }
  }
});

test('function operations: composition and inverses', async () => {
  const c = await load('function-operations');
  const r = c.solve({ mode: 'combine', f: '2x + 3', g: 'x^2 - 1', x0: '2' });
  assert.equal(card(r, '(f∘g)(x)').valueTex, '2 x^{2} + 1');
  assert.equal(card(r, '(g∘f)(x)').valueTex, '4 x^{2} + 12 x + 8');
  assert.equal(Number(card(r, 'Value (f∘g)').value), 9);
  assert.equal(Number(card(r, 'Value (g∘f)').value), 48);
  const inv = c.solve({ mode: 'inverse', ftype: 'linfrac', a: '2', b: '1', c: '1', d: '-3', y0: '5' });
  assert.equal(card(inv, 'Inverse').valueTex, '\\frac{3x + 1}{x - 2}');
  assert.ok(near(Number(card(inv, 'Value f⁻¹').value), 16 / 3));
  for (let i = 0; i < 400; i++) {
    const a = I(-5, 5), b = I(-6, 6), cc = I(-3, 3), d = I(-6, 6);
    if (a * d - b * cc === 0 || (cc === 0 && d === 0)) continue;
    const y0 = I(-6, 6); if (cc !== 0 && y0 * cc === a) continue;
    const res = c.solve({ mode: 'inverse', ftype: 'linfrac', a: String(a), b: String(b), c: String(cc), d: String(d), y0: String(y0) });
    const x = Number(card(res, 'Value f⁻¹').value);
    assert.ok(near(x, (-d * y0 + b) / (cc * y0 - a), 1e-5) && near((a * x + b) / (cc * x + d), y0, 1e-2), `f(${x}) should be ${y0}`);
  }
  for (const [pa, ph, pk, pn] of [[2, 1, -3, '3'], [-1, 2, 4, '3'], [3, -1, 2, '2']]) {
    const res = c.solve({ mode: 'inverse', ftype: 'power', pa: String(pa), ph: String(ph), pk: String(pk), pn, y0: String(pk + pa) });
    assert.ok(near(Number(card(res, 'Value f⁻¹').value), ph + 1), 'f(h + 1) = a + k');
  }
  const e = c.solve({ mode: 'inverse', ftype: 'exp', ea: '3', eb: '2', ek: '1', y0: '25' });
  assert.ok(near(Number(card(e, 'Value f⁻¹').value), 3), '3·2³ + 1 = 25');
});

test('variation and proportion', async () => {
  const c = await load('variation-proportion');
  assert.equal(Number(card(c.solve({ mode: 'variation', kind: 'direct', n: '2', x1: '2', y1: '12', x2: '5' }), 'New value').value), 75);
  assert.equal(Number(card(c.solve({ mode: 'variation', kind: 'inverse', n: '1', x1: '3', y1: '8', x2: '6' }), 'New value').value), 4);
  assert.equal(Number(card(c.solve({ mode: 'variation', kind: 'combined', n: '1', m: '2', x1: '6', w1: '2', y1: '9', x2: '10', w2: '5' }), 'New value').value), 2.4);
  assert.equal(Number(card(c.solve({ mode: 'variation', kind: 'joint', n: '1', m: '1', x1: '2', w1: '3', y1: '12', x2: '4', w2: '5' }), 'New value').value), 40);
  assert.ok(near(Number(card(c.solve({ mode: 'variation', kind: 'direct', n: '1/2', x1: '4', y1: '6', x2: '9' }), 'New value').value), 9));
  assert.equal(Number(card(c.solve({ mode: 'proportion', ptype: 'fourth', pa: '3', pb: '5', pc: '12' }), 'Unknown').value), 20);
  assert.equal(Number(card(c.solve({ mode: 'proportion', ptype: 'third', pa: '4', pb: '6' }), 'Unknown').value), 9);
  assert.ok(near(Number(card(c.solve({ mode: 'proportion', ptype: 'mean', pa: '2', pb: '3' }), 'Unknown').value), Math.sqrt(6)));
  const d = c.solve({ mode: 'divide', T: '1200', r1: '2', r2: '3', r3: '5' });
  assert.deepEqual(d.answers.map((a) => Number(a.value)), [240, 360, 600]);
});

test('work, mixture and clock problems', async () => {
  const c = await load('work-mixture-clock');
  assert.equal(Number(card(c.solve({ mode: 'work', tA: '6', tB: '4', wkind: 'with' }), 'Time').value), 2.4);
  assert.equal(Number(card(c.solve({ mode: 'work', tA: '3', tB: '5', wkind: 'against' }), 'Time').value), 7.5);
  assert.equal(Number(card(c.solve({ mode: 'work', tA: '10', tB: '15', wkind: 'with', t0: '2' }), 'Total time').value), 6.8);
  assert.equal(card(c.solve({ mode: 'work', tA: '5', tB: '3', wkind: 'against' }), 'Time').value, 'never');
  assert.equal(Number(card(c.solve({ mode: 'mixture', mkind: 'mix', x1: '10', c1: '20', x2: '15', c2: '50' }), 'Concentration').value), 38);
  assert.equal(Number(card(c.solve({ mode: 'mixture', mkind: 'find', x1: '8', c1: '25', c2: '60', ct: '40' }), 'Amount').value), 6);
  assert.equal(Number(card(c.solve({ mode: 'clock', h: '3', min: '40' }), 'Angle').value), 130);
  assert.equal(Number(card(c.solve({ mode: 'clock', h: '12', min: '0' }), 'Angle').value), 0);
  assert.equal(Number(card(c.solve({ mode: 'clock', h: '6', min: '0' }), 'Angle').value), 180);
  // every time reported for "hands at θ°" really has that angle
  for (let h = 1; h <= 12; h++) for (const th of [0, 30, 90, 120, 180]) {
    const res = c.solve({ mode: 'clocktime', h: String(h), theta: String(th) });
    for (const a of res.answers.filter((x) => x.label.startsWith('Minutes'))) {
      const m = Number(a.value), H = (h % 12) * 30 + m / 2, M = 6 * m, d = Math.abs(H - M), s = d > 180 ? 360 - d : d;
      assert.ok(Math.abs(s - th) < 1e-4, `${h}:${m} angle ${s} vs ${th}`);
    }
  }
  assert.equal(card(c.solve({ mode: 'clocktime', h: '4', theta: '90' }), 'Number of times').value, '2');
});
