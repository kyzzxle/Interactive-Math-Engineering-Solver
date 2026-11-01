import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solveCombinatorics, EXACT_DIGIT_LIMIT } from '../assets/js/calculators/combinatorics.js';
import { binomial, factorial, fallingFactorial, scientificFromBigInt, scientificFromLog10, log10Factorial, groupDigits } from '../assets/js/lib/bigint.js';

/** Independent references: naive factorials and Pascal's triangle. */
function naiveFactorial(n) { let p = 1n; for (let i = 2n; i <= BigInt(n); i++) p *= i; return p; }
function pascalRow(n) {
  let row = [1n];
  for (let i = 0; i < n; i++) row = [1n, ...row.slice(1).map((v, k) => v + row[k]), 1n];
  return row;
}

test('worked examples', () => {
  const res = solveCombinatorics({ n: '10', r: '3' });
  assert.equal(res.values.P, 720n);
  assert.equal(res.values.C, 120n);
  assert.equal(res.values.rFact, 6n);
  assert.equal(solveCombinatorics({ n: '52', r: '5' }).values.C, 2598960n);
  assert.equal(solveCombinatorics({ n: '52', r: '5' }).values.P, 311875200n);
  assert.equal(solveCombinatorics({ n: '49', r: '6' }).values.C, 13983816n);
});

test('every C(n, r) for n ≤ 60 matches Pascal\'s triangle and every P(n, r) matches n!/(n-r)!', () => {
  for (let n = 0; n <= 60; n++) {
    const row = pascalRow(n);
    for (let r = 0; r <= n; r++) {
      assert.equal(binomial(n, r), row[r], `C(${n}, ${r})`);
      assert.equal(fallingFactorial(n, r), naiveFactorial(n) / naiveFactorial(n - r), `P(${n}, ${r})`);
    }
  }
});

test('boundary cases: r = 0, r = n, n = 0', () => {
  const zero = solveCombinatorics({ n: '0', r: '0' });
  assert.equal(zero.values.P, 1n);
  assert.equal(zero.values.C, 1n);
  const rz = solveCombinatorics({ n: '7', r: '0' });
  assert.equal(rz.values.P, 1n);
  assert.equal(rz.values.C, 1n);
  const all = solveCombinatorics({ n: '7', r: '7' });
  assert.equal(all.values.P, 5040n);
  assert.equal(all.values.C, 1n);
});

test('large exact results: 1000! and C(1000, 500)', () => {
  const res = solveCombinatorics({ n: '1000', r: '1000' });
  assert.equal(res.values.P, naiveFactorial(1000));
  assert.equal(res.values.permutation.digits, 2568);
  const c = solveCombinatorics({ n: '1000', r: '500' });
  assert.equal(c.values.C * factorial(500) * factorial(500), factorial(1000));
  assert.equal(c.values.combination.digits, 300);
});

test('huge results switch to a flagged approximation that agrees with exact digits', () => {
  const res = solveCombinatorics({ n: '1000000', r: '500000' });
  assert.equal(res.values.permutation.exact, false);
  assert.ok(res.values.permutation.digits > EXACT_DIGIT_LIMIT);
  assert.ok(res.notes.some((n) => n.kind === 'warn'));
  // Compare the log-based approximation with an exact value where both are available.
  const exact = factorial(3000);
  const approx = scientificFromLog10(log10Factorial(3000), 6);
  const sci = scientificFromBigInt(exact, 6);
  assert.equal(approx.exponent, sci.exponent);
  assert.ok(Math.abs(Number(approx.mantissa) - Number(sci.mantissa)) < 2e-5);
});

test('1e9 choose 3 is exact and fast', () => {
  const t = Date.now();
  const res = solveCombinatorics({ n: '1000000000', r: '3' });
  assert.equal(res.values.C, (10n ** 9n) * (10n ** 9n - 1n) * (10n ** 9n - 2n) / 6n);
  assert.ok(Date.now() - t < 500);
});

test('validation: negatives, decimals, r > n, empty, non-numeric', () => {
  const err = (n, r) => solveCombinatorics({ n, r }).errors;
  assert.match(err('-5', '2')[0].message, /cannot be negative/);
  assert.match(err('5.5', '2')[0].message, /whole number/);
  assert.match(err('5', '7')[0].message, /cannot be larger than n/);
  assert.equal(err('', '2')[0].field, 'n');
  assert.match(err('ten', '2')[0].message, /whole number/);
  assert.match(err('99999999999', '2')[0].message, /at most/);
});

test('enumeration lists every outcome for small cases', () => {
  const res = solveCombinatorics({ n: '4', r: '2' });
  assert.equal(res.enumeration.perms.length, 12);
  assert.equal(res.enumeration.combos.length, 6);
  assert.ok(res.enumeration.perms.includes('BA'));
  assert.equal(solveCombinatorics({ n: '30', r: '5' }).enumeration, null);
});

test('number formatting helpers', () => {
  assert.equal(groupDigits('1234567'), '1,234,567');
  assert.equal(groupDigits('100'), '100');
  assert.deepEqual(scientificFromBigInt(9999995n, 6), { mantissa: '1', exponent: 7 });
  assert.deepEqual(scientificFromBigInt(120n, 6), { mantissa: '1.2', exponent: 2 });
});
