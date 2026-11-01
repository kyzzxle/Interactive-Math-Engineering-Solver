import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solvePointLine, describeLine } from '../assets/js/calculators/point-line-distance.js';
import { radicalTex, radicalValue } from '../assets/js/lib/exact.js';

const close = (a, b, rel = 1e-12) => assert.ok(Math.abs(a - b) <= rel * Math.max(1, Math.abs(b)), `${a} ≉ ${b}`);

/**
 * Independent reference: minimise the distance from P to points on the line
 * by parametrising the line and solving for the closest parameter.
 */
function reference(x1, y1, A, B, C) {
  // a point on the line and its direction
  const q = B !== 0 ? [0, -C / B] : [-C / A, 0];
  const d = [-B, A];
  const t = ((x1 - q[0]) * d[0] + (y1 - q[1]) * d[1]) / (d[0] ** 2 + d[1] ** 2);
  const foot = [q[0] + t * d[0], q[1] + t * d[1]];
  return { distance: Math.hypot(x1 - foot[0], y1 - foot[1]), foot };
}

test('worked example: (4, -1) to 3x + 4y - 2 = 0', () => {
  const res = solvePointLine({ x1: '4', y1: '-1', A: '3', B: '4', C: '-2' });
  assert.equal(res.ok, true);
  assert.equal(res.values.N, 6);
  assert.equal(res.values.distance, 1.2);
  close(res.values.foot.x, 3.28);
  close(res.values.foot.y, -1.96);
  assert.equal(radicalTex(res.exact.distance), '\\frac{6}{5}');
  assert.deepEqual(res.exact.foot.x, [82, 25]);
  assert.deepEqual(res.exact.foot.y, [-49, 25]);
});

test('rationalised exact answer: (-2, 3) to 2x - y + 1 = 0', () => {
  const res = solvePointLine({ x1: '-2', y1: '3', A: '2', B: '-1', C: '1' });
  assert.equal(radicalTex(res.exact.distance), '\\frac{6\\sqrt{5}}{5}');
  close(res.values.distance, 6 / Math.sqrt(5));
  close(radicalValue(res.exact.distance), 6 / Math.sqrt(5));
});

test('matches the independent reference across decimals, negatives and special lines', () => {
  const cases = [
    [3, 5, 2, -4, 7], [0, 0, 1, 1, -1], [-2.5, 7.25, 0.3, -1.7, 4.4],
    [10, -3, 0, 5, 2], [6, 1, -3, 0, 9], [1e6, -1e6, 3, 4, 5], [0.001, 0.002, 1000, -2000, 0.5],
  ];
  for (const c of cases) {
    const [x1, y1, A, B, C] = c;
    const res = solvePointLine({ x1: String(x1), y1: String(y1), A: String(A), B: String(B), C: String(C) });
    assert.equal(res.ok, true);
    const ref = reference(x1, y1, A, B, C);
    close(res.values.distance, ref.distance, 1e-9);
    close(res.values.foot.x, ref.foot[0], 1e-9);
    close(res.values.foot.y, ref.foot[1], 1e-9);
    // The foot must lie on the line.
    assert.ok(Math.abs(A * res.values.foot.x + B * res.values.foot.y + C) <= 1e-9 * Math.max(1, Math.abs(C), Math.abs(A * x1), Math.abs(B * y1)));
  }
});

test('point on the line gives distance 0 with a note', () => {
  const res = solvePointLine({ x1: '1', y1: '1', A: '1', B: '-1', C: '0' });
  assert.equal(res.values.distance, 0);
  assert.ok(res.notes.some((n) => /lies on the line/.test(n.text)));
});

test('scaling the equation does not change the distance', () => {
  const a = solvePointLine({ x1: '4', y1: '-1', A: '3', B: '4', C: '-2' });
  const b = solvePointLine({ x1: '4', y1: '-1', A: '-6', B: '-8', C: '4' });
  close(a.values.distance, b.values.distance);
});

test('validation: A and B both zero, empty and invalid values', () => {
  const both = solvePointLine({ x1: '1', y1: '2', A: '0', B: '0', C: '3' });
  assert.equal(both.ok, false);
  assert.deepEqual(both.errors[0].field, ['A', 'B']);
  const empty = solvePointLine({ x1: '', y1: '2', A: '1', B: '1', C: '3' });
  assert.equal(empty.errors[0].field, 'x1');
  const text = solvePointLine({ x1: '1', y1: 'two', A: '1', B: '1', C: '3' });
  assert.match(text.errors[0].message, /must be a number/);
  const dots = solvePointLine({ x1: '1.2.3', y1: '2', A: '1', B: '1', C: '3' });
  assert.equal(dots.ok, false);
});

test('describes vertical, horizontal and oblique lines', () => {
  assert.equal(describeLine(2, 0, -6).kind, 'vertical');
  assert.match(describeLine(2, 0, -6).text, /x = 3/);
  assert.match(describeLine(0, 4, -8).text, /y = 2/);
  assert.match(describeLine(3, 4, -2).text, /slope -0\.75/);
});
