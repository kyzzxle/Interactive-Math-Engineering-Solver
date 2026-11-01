import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDecimal, parseWhole, toCommonScale } from '../assets/js/lib/parse.js';
import { formatNumber, texNumber, isDisplayExact } from '../assets/js/lib/format.js';
import { simplifySqrt, reduceFraction, radicalExpr, radicalTex, radicalText } from '../assets/js/lib/exact.js';

test('parseDecimal accepts valid numbers and rejects junk', () => {
  for (const [input, value] of [['4', 4], ['-2.75', -2.75], ['.5', 0.5], ['5.', 5], ['+3', 3], ['1e3', 1000], ['  7 ', 7], ['−4', -4], ['-0', 0]]) {
    const p = parseDecimal(input, 'x');
    assert.equal(p.ok, true, input);
    assert.equal(p.value, value);
  }
  for (const input of ['', '   ', 'abc', '1.2.3', '--1', '1e', '0x10', 'NaN', 'Infinity', '1,5', '1/2']) {
    assert.equal(parseDecimal(input, 'x').ok, false, input);
  }
});

test('parseWhole', () => {
  assert.equal(parseWhole('12', 'n').value, 12);
  assert.equal(parseWhole('+0', 'n').value, 0);
  assert.equal(parseWhole('3.0', 'n').ok, false);
  assert.equal(parseWhole('-1', 'n').ok, false);
  assert.equal(parseWhole('11', 'n', 10).ok, false);
});

test('toCommonScale', () => {
  assert.deepEqual(toCommonScale(['1.5', '2', '0.25']), { ints: [150, 200, 25], scale: 100 });
  assert.deepEqual(toCommonScale(['-1.50', '3']), { ints: [-15, 30], scale: 10 });
  assert.equal(toCommonScale(['1e3']), null);
  assert.equal(toCommonScale(['0.123456']), null);
});

test('formatting and exactness labels', () => {
  assert.equal(formatNumber(0.1 + 0.2), '0.3');
  assert.equal(isDisplayExact(0.1 + 0.2), true);
  assert.equal(isDisplayExact(75 * Math.PI), false);
  assert.equal(isDisplayExact(1 / 3), false);
  assert.equal(formatNumber(-0.0000001), '-1 × 10^-7');
  assert.equal(texNumber(2e20), '2 \\times 10^{20}');
  assert.equal(formatNumber(1234567.891, { group: true }), '1,234,567.891');
});

test('radicals and fractions', () => {
  assert.deepEqual(simplifySqrt(72), [6, 2]);
  assert.deepEqual(simplifySqrt(49), [7, 1]);
  assert.deepEqual(simplifySqrt(1), [1, 1]);
  assert.deepEqual(simplifySqrt(999983 * 999983), [999983, 1]);
  assert.deepEqual(reduceFraction(6, -8), [-3, 4]);
  const e = radicalExpr([[34, 1], [8, 20]], 2); // (34 + 8√20)/2 = 17 + 8√5
  assert.equal(radicalTex(e), '17 + 8\\sqrt{5}');
  assert.equal(radicalTex(radicalExpr([[1, 1]], 3), '\\pi'), '\\frac{\\pi}{3}');
  assert.equal(radicalText(radicalExpr([[196, 1]], 3), 'π'), '196π/3');
  assert.equal(radicalText(radicalExpr([[34, 1], [16, 5]], 1), 'π'), '(34 + 16√5)π');
});
