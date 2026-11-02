/* Physics calculators: textbook answers and an independent consistency check of every
   SUVAT input combination. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const load = async (id) => (await import(`../assets/js/calculators/${id}.js`)).calculator;
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
/** Numeric value of the answer card whose label starts with `label`. */
function card(res, label) {
  const a = res.answers.find((x) => x.label.startsWith(label));
  assert.ok(a, `no answer card "${label}"`);
  return Number(a.value.replace(/ .*$/, ''));
}

test('motion: speed, distance and time', async () => {
  const c = await load('motion-calculator');
  assert.equal(card(c.solve({ kind: 'speed', find: 'v', d: '400', t: '50' }), 'Speed v'), 8);
  assert.equal(card(c.solve({ kind: 'speed', find: 'd', v: '25', t: '120' }), 'Distance d'), 3000);
  assert.equal(card(c.solve({ kind: 'velocity', find: 't', d: '-45', v: '-3' }), 'Time t'), 15);
  assert.equal(c.solve({ kind: 'speed', find: 'v', d: '-5', t: '2' }).ok, false, 'negative distance rejected for speed');
});

test('kinematics: textbook problems', async () => {
  const c = await load('kinematics-calculator');
  const brake = c.solve({ u: '20', v: '0', a: '-4', t: '', s: '' });
  assert.equal(card(brake, 'Time'), 5);
  assert.equal(card(brake, 'Displacement'), 50);
  const drop = c.solve({ u: '0', v: '', a: '9.81', t: '', s: '45' });
  assert.ok(near(card(drop, 'Time'), Math.sqrt(90 / 9.81), 1e-5));
  const up = c.solve({ u: '15', v: '', a: '-9.81', t: '', s: '10' });
  assert.equal(up.tables[0].rows.length, 2, 'two times for a ball passing 10 m');
  assert.ok(near(card(up, 'Time'), (15 - Math.sqrt(225 - 196.2)) / 9.81, 1e-5));
  assert.equal(c.solve({ u: '1', v: '2', a: '3', t: '4', s: '' }).ok, false, 'four values rejected');
  assert.equal(c.solve({ u: '1', v: '', a: '', t: '4', s: '' }).ok, false, 'two values rejected');
});

test('kinematics: every choice of three knowns reproduces the other two', async () => {
  const c = await load('kinematics-calculator');
  const names = ['u', 'v', 'a', 't', 's'];
  const cases = [[3, 2, 4], [0, 9.81, 3], [20, -4, 3], [-5, 2, 6], [12, -9.81, 1.5], [7, 0, 2]];
  for (const [u, a, t] of cases) {
    const truth = { u, a, t, v: u + a * t, s: u * t + 0.5 * a * t * t };
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) {
      const unknown = [names[i], names[j]];
      const values = Object.fromEntries(names.map((n) => [n, unknown.includes(n) ? '' : String(truth[n])]));
      const res = c.solve(values);
      if (a === 0 && unknown.includes('t') && unknown.includes('s')) { assert.equal(res.ok, false); continue; }
      if (a === 0 && unknown.join() === 'v,a') { /* u, t, s known: fine */ }
      assert.ok(res.ok, `${JSON.stringify(values)}: ${JSON.stringify(res.errors)}`);
      // the true motion must be one of the reported solutions
      const sols = res.tables && res.tables.length ? res.tables[0].rows.map((r) => Object.fromEntries(names.map((n, k) => [n, Number(r[k + 1])]))) : [Object.fromEntries(names.map((n) => [n, card(res, { u: 'Initial', v: 'Final', a: 'Acceleration', t: 'Time', s: 'Displacement' }[n])]))];
      assert.ok(sols.some((sol) => names.every((n) => near(sol[n], truth[n], 1e-4))), `${unknown.join(',')} unknown for ${JSON.stringify(truth)}: got ${JSON.stringify(sols)}`);
    }
  }
});

test('projectile: 20 m/s at 45° from the ground', async () => {
  const c = await load('projectile-motion');
  const r = c.solve({ v0: '20', angle: '45', h0: '0', g: '9.81' });
  assert.ok(near(card(r, 'Maximum height'), 400 / (4 * 9.81), 1e-5));
  assert.ok(near(card(r, 'Horizontal range'), 400 / 9.81, 1e-5));
  assert.ok(near(card(r, 'Time of flight'), (2 * 20 * Math.SQRT1_2) / 9.81, 1e-5));
  // complementary angles give the same range
  const a = card(c.solve({ v0: '25', angle: '30', h0: '', g: '' }), 'Horizontal range');
  const b = card(c.solve({ v0: '25', angle: '60', h0: '', g: '' }), 'Horizontal range');
  assert.ok(near(a, b, 1e-5));
  // horizontal launch from height h: T = sqrt(2h/g)
  assert.ok(near(card(c.solve({ v0: '8', angle: '0', h0: '1.2', g: '9.81' }), 'Time of flight'), Math.sqrt(2.4 / 9.81), 1e-5));
});

test('Newton, energy, Ohm, resistors and waves', async () => {
  assert.equal(card((await load('newtons-second-law')).solve({ find: 'F', m: '1200', a: '2.5' }), 'Net force'), 3000);
  assert.equal(card((await load('newtons-second-law')).solve({ find: 'a', F: '150', m: '60' }), 'Acceleration'), 2.5);
  const e = await load('work-energy-power');
  assert.ok(near(card(e.solve({ mode: 'work', F: '50', d: '10', theta: '30' }), 'Work done'), 500 * Math.cos(Math.PI / 6), 1e-5));
  assert.equal(card(e.solve({ mode: 'work', F: '50', d: '10', theta: '90' }), 'Work done'), 0);
  assert.equal(card(e.solve({ mode: 'ke', m: '1200', v: '15' }), 'Kinetic'), 135000);
  assert.ok(near(card(e.solve({ mode: 'fall', h: '20', u: '', g: '' }), 'Speed at the bottom'), Math.sqrt(392.4), 1e-5));
  const o = await load('ohms-law');
  assert.equal(card(o.solve({ find: 'I', V: '9', R: '450' }), 'Current I'), 0.02);
  assert.equal(card(o.solve({ find: 'R', V: '230', I: '0.25' }), 'Resistance'), 920);
  const r = await load('series-parallel-resistance');
  assert.equal(card(r.solve({ config: 'series', list: '10, 20, 30', V: '12' }), 'Equivalent'), 60);
  assert.equal(card(r.solve({ config: 'parallel', list: '6, 3', V: '12' }), 'Total current'), 6);
  assert.equal(card(r.solve({ config: 'mixed', list: '10, 20; 30', V: '' }), 'Equivalent'), 15);
  assert.equal(card(r.solve({ config: 'parallel', list: '300 300 300', V: '' }), 'Equivalent'), 100);
  assert.equal(r.solve({ config: 'mixed', list: '10, 20', V: '' }).ok, false, 'branches need a semicolon');
  const w = await load('wave-calculator');
  assert.ok(near(card(w.solve({ find: 'lambda', v: '343', f: '440' }), 'Wavelength'), 343 / 440, 1e-6));
  assert.equal(card(w.solve({ find: 'v', f: '2', lambda: '1.5' }), 'Wave speed'), 3);
});
