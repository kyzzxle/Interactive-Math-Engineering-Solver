/* Engineering economy calculators: textbook answers checked against hand calculations,
   plus consistency checks (solving for each unknown reproduces the inputs). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { money } from '../assets/js/lib/econ-kit.js';
import { npv, irrs, parseFlows } from '../assets/js/calculators/npv-irr.js';
import { bookValue } from '../assets/js/calculators/depreciation.js';
import { factors } from '../assets/js/calculators/annuity.js';

const load = async (id) => (await import(`../assets/js/calculators/${id}.js`)).calculator;
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
/** Number on the answer card whose label starts with `label` (commas, % and units removed). */
function card(res, label) {
  assert.ok(res.ok, JSON.stringify(res.errors));
  const a = res.answers.find((x) => x.label.startsWith(label));
  assert.ok(a, `no answer card "${label}"`);
  return Number(String(a.value).replace(/−/g, '-').replace(/,/g, '').replace(/[%a-z ]+$/i, ''));
}

test('money formatting', () => {
  assert.equal(money(1234567.891), '1,234,567.89');
  assert.equal(money(-0.004), '0.00');
  assert.equal(money(-1500), '−1,500.00');
  assert.equal(money(999.995), '1,000.00');
});

test('simple interest: textbook problems and ordinary vs exact interest', async () => {
  const c = await load('simple-interest');
  assert.equal(card(c.solve({ find: 'F', P: '50000', r: '8', t: '18', unit: 'months', basis: '360' }), 'Future amount'), 56000);
  assert.equal(card(c.solve({ find: 'F', P: '20000', r: '10', t: '120', unit: 'days', basis: '360' }), 'Interest earned'), 666.67);
  assert.equal(card(c.solve({ find: 'F', P: '20000', r: '10', t: '120', unit: 'days', basis: '365' }), 'Interest earned'), 657.53);
  assert.equal(card(c.solve({ find: 't', P: '1000', F: '2000', r: '5', unit: 'years', basis: '360' }), 'Time'), 20);
  assert.equal(card(c.solve({ find: 'r', P: '12000', F: '13500', t: '2', unit: 'years', basis: '360' }), 'Rate'), 6.25);
  assert.equal(c.solve({ find: 'r', P: '5000', F: '5000', t: '1', unit: 'years', basis: '360' }).ok, false);
});

test('compound interest: each unknown reproduces the inputs', async () => {
  const c = await load('compound-interest');
  assert.equal(card(c.solve({ find: 'F', P: '100000', r: '6', n: '5', m: '4' }), 'Future worth'), 134685.5);
  assert.equal(card(c.solve({ find: 'F', P: '1000', r: '10', n: '1', m: '1' }), 'Future worth'), 1100);
  assert.ok(near(card(c.solve({ find: 'F', P: '20000', r: '5', n: '7', m: 'c' }), 'Future worth'), 20000 * Math.exp(0.35), 1e-6));
  for (const m of ['1', '2', '4', '12', '365', 'c']) {
    const F = card(c.solve({ find: 'F', P: '25000', r: '7.5', n: '9', m }), 'Future worth');
    assert.ok(near(card(c.solve({ find: 'P', F: String(F), r: '7.5', n: '9', m }), 'Present worth'), 25000, 1e-6), `P for m=${m}`);
    assert.ok(near(card(c.solve({ find: 'r', P: '25000', F: String(F), n: '9', m }), 'Nominal rate'), 7.5, 1e-4), `r for m=${m}`);
    assert.ok(near(card(c.solve({ find: 'n', P: '25000', F: String(F), r: '7.5', m }), 'Years'), 9, 1e-4), `n for m=${m}`);
  }
});

test('effective rate: conversions and round trips', async () => {
  const c = await load('effective-interest-rate');
  assert.equal(card(c.solve({ mode: 'toER', r: '12', m: '12', m2: '4' }), 'Effective'), 12.6825);
  assert.equal(card(c.solve({ mode: 'toER', r: '6', m: '2', m2: '4' }), 'Effective'), 6.09);
  assert.ok(near(card(c.solve({ mode: 'toER', r: '8', m: 'c', m2: '4' }), 'Effective'), (Math.exp(0.08) - 1) * 100, 1e-4));
  assert.ok(near(card(c.solve({ mode: 'toNom', er: '12.682503', m: '12', m2: '4' }), 'Nominal'), 12, 1e-5));
  const conv = c.solve({ mode: 'convert', r: '6', m: '2', m2: '12' });
  assert.ok(near(card(conv, 'Equivalent'), 1200 * (1.0609 ** (1 / 12) - 1), 1e-4));
});

test('annuity: factors, loan payment, due, deferred and perpetuity', async () => {
  const c = await load('annuity');
  assert.equal(card(c.solve({ type: 'ordinary', find: 'AP', P: '500000', r: '12', m: '12', n: '5', k: '0' }), 'Payment'), 11122.22);
  assert.equal(card(c.solve({ type: 'ordinary', find: 'F', A: '5000', r: '6', m: '4', n: '10', k: '0' }), 'Future worth'), 271339.47);
  assert.equal(card(c.solve({ type: 'due', find: 'P', A: '20000', r: '7', m: '1', n: '8', k: '0' }), 'Present worth'), 127785.79);
  assert.equal(card(c.solve({ type: 'deferred', find: 'P', A: '15000', r: '9', m: '1', n: '10', k: '3' }), 'Present worth'), 74334.14);
  assert.equal(card(c.solve({ type: 'perpetuity', find: 'P', A: '50000', r: '5', m: '1', n: '', k: '0' }), 'Present worth'), 1000000);
  assert.equal(card(c.solve({ type: 'ordinary', find: 'P', A: '1000', r: '0', m: '1', n: '10', k: '0' }), 'Present worth'), 10000, 'zero rate: sum of payments');
  // P and F are equivalent: F = P (1 + i)^N.
  const f = factors('ordinary', 0.01, 60);
  assert.ok(near(f.fa, f.pa * 1.01 ** 60, 1e-12));
  // Amortisation: the last row's balance is zero.
  const loan = c.solve({ type: 'ordinary', find: 'AP', P: '120000', r: '9', m: '12', n: '2', k: '0' });
  assert.equal(loan.tables[0].rows.at(-1).at(-1), '0.00');
  assert.equal(c.solve({ type: 'ordinary', find: 'P', A: '100', r: '10', m: '12', n: '2.05', k: '0' }).ok, false, 'fractional number of payments rejected');
});

test('depreciation: every method matches the textbook formulas', async () => {
  const c = await load('depreciation');
  const base = { C: '800000', S: '80000', n: '10', m: '4', i: '6' };
  assert.equal(card(c.solve({ ...base, method: 'sl' }), 'Book value at the end of year 4'), 512000);
  assert.equal(card(c.solve({ ...base, method: 'sf' }), 'Book value at the end of year 4'), 561036.91);
  assert.equal(card(c.solve({ ...base, method: 'db' }), 'Book value at the end of year 4'), 318485.74);
  assert.equal(card(c.solve({ ...base, method: 'syd' }), 'Book value at the end of year 4'), 354909.09);
  assert.equal(card(c.solve({ method: 'ddb', C: '120000', S: '10000', n: '5', m: '2', i: '6' }), 'Book value at the end of year 2'), 43200);
  // Methods that honour the salvage value end exactly at S.
  for (const k of ['sl', 'sf', 'db', 'syd']) assert.ok(near(bookValue(k, 800000, 80000, 10, 10, 0.06), 80000, 1e-9), k);
  // Yearly charges add up to C − S.
  const res = c.solve({ ...base, method: 'syd' });
  const total = res.tables[0].rows.reduce((s, r) => s + Number(r[1].replace(/,/g, '')), 0);
  assert.ok(near(total, 720000, 1e-7));
  assert.equal(c.solve({ ...base, method: 'db', S: '0' }).ok, false, 'Matheson needs S > 0');
  assert.equal(c.solve({ ...base, m: '11' }).ok, false, 'year beyond the life');
});

test('break-even', async () => {
  const c = await load('break-even');
  const r = c.solve({ FC: '240000', v: '35', p: '75', target: '100000', Q: '5000' });
  assert.equal(card(r, 'Break-even volume'), 6000);
  assert.equal(card(r, 'Break-even revenue'), 450000);
  assert.equal(card(r, 'Units for a profit'), 8500);
  assert.equal(card(r, 'Loss at'), 40000);
  assert.equal(c.solve({ FC: '1', v: '5', p: '5', target: '', Q: '' }).ok, false);
});

test('NPV and IRR', async () => {
  const flows = [-100000, 30000, 35000, 40000, 45000];
  assert.ok(near(npv(flows, 0.1), 16986.54, 1e-6));
  const [r] = irrs(flows);
  assert.ok(Math.abs(npv(flows, r)) < 1e-4, 'NPV is zero at the IRR');
  assert.deepEqual(irrs([-1000, 2300, -1320]).map((x) => Math.round(x * 1e6) / 1e6), [0.1, 0.2], 'two IRRs');
  assert.equal(irrs([100, 200]).length, 0, 'no IRR when every flow is positive');
  assert.deepEqual(parseFlows('-100, 50; 60\n70').flows, [-100, 50, 60, 70]);
  assert.ok(parseFlows('-100, 5o').error);
  const c = await load('npv-irr');
  const res = c.solve({ flows: '-100000, 30000, 35000, 40000, 45000', i: '10' });
  assert.ok(near(card(res, 'Simple payback'), 2.875, 2e-3));
});
