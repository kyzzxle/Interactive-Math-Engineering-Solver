import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solveFrustum } from '../assets/js/calculators/frustum.js';
import { radicalValue, radicalTex } from '../assets/js/lib/exact.js';

const close = (a, b, rel = 1e-12) => assert.ok(Math.abs(a - b) <= rel * Math.max(1, Math.abs(b)), `${a} ≉ ${b}`);

/** Independent reference: volume and lateral area as the difference of two cones. */
function reference(r, R, h) {
  const s = Math.sqrt(h * h + (R - r) ** 2);
  if (r === R) return { s, lsa: 2 * Math.PI * R * h, volume: Math.PI * R * R * h };
  const H = (R * h) / (R - r); // full cone height
  const L = Math.sqrt(H * H + R * R); // full cone slant
  const l = Math.sqrt((H - h) ** 2 + r * r);
  return {
    s,
    lsa: Math.PI * R * L - Math.PI * r * l,
    volume: (Math.PI / 3) * (R * R * H - r * r * (H - h)),
  };
}

test('textbook example r=6, R=9, h=4', () => {
  const res = solveFrustum({ r: '6', R: '9', known: 'h', h: '4' });
  assert.equal(res.ok, true);
  const v = res.values;
  assert.equal(v.s, 5);
  close(v.lsa, 75 * Math.PI);
  close(v.tsa, 192 * Math.PI);
  close(v.volume, 228 * Math.PI);
  assert.equal(radicalTex(res.exact.volume, '\\pi'), '228\\pi');
  assert.equal(radicalTex(res.exact.tsa, '\\pi'), '192\\pi');
  assert.equal(radicalTex(res.exact.s), '5');
});

test('irrational slant height gets simplest radical form', () => {
  const res = solveFrustum({ r: '3', R: '5', known: 'h', h: '4' });
  assert.equal(radicalTex(res.exact.s), '2\\sqrt{5}');
  assert.equal(radicalTex(res.exact.lsa, '\\pi'), '16\\sqrt{5}\\,\\pi');
  assert.equal(radicalTex(res.exact.tsa, '\\pi'), '\\left(34 + 16\\sqrt{5}\\right)\\pi');
  assert.equal(radicalTex(res.exact.volume, '\\pi'), '\\frac{196\\pi}{3}');
  close(radicalValue(res.exact.s), Math.sqrt(20));
});

test('slant-height mode: hopper r=0.2, R=1, s=1', () => {
  const res = solveFrustum({ r: '0.2', R: '1.0', known: 's', s: '1' });
  assert.equal(res.ok, true);
  close(res.values.h, 0.6, 1e-12);
  close(res.values.volume, 0.248 * Math.PI, 1e-12);
  close(res.values.lsa, 1.2 * Math.PI, 1e-12);
  close(radicalValue(res.exact.volume) * Math.PI, 0.248 * Math.PI);
});

test('decimal inputs give exact forms via scaling', () => {
  const res = solveFrustum({ r: '1.5', R: '2.5', known: 'h', h: '3' });
  assert.equal(radicalTex(res.exact.s), '\\sqrt{10}');
  assert.equal(radicalTex(res.exact.volume, '\\pi'), '\\frac{49\\pi}{4}');
});

test('matches the independent difference-of-cones reference for many inputs', () => {
  const cases = [[1, 2, 3], [0.5, 7.25, 2.2], [10, 10.001, 50], [3, 3, 8], [123.4, 567.8, 91.01], [1e-3, 2e-3, 5e-3]];
  for (const [r, R, h] of cases) {
    const res = solveFrustum({ r: String(r), R: String(R), known: 'h', h: String(h) });
    assert.equal(res.ok, true, JSON.stringify(res.errors));
    const ref = reference(r, R, h);
    close(res.values.s, ref.s, 1e-9);
    close(res.values.lsa, ref.lsa, 1e-7);
    close(res.values.volume, ref.volume, 1e-7);
    // the slant-height route must give back the same height
    const back = solveFrustum({ r: String(r), R: String(R), known: 's', s: String(ref.s) });
    close(back.values.h, h, 1e-7);
  }
});

test('cone (r = 0) and cylinder (r = R) special cases', () => {
  const cone = solveFrustum({ r: '0', R: '3', known: 'h', h: '4' });
  assert.equal(cone.ok, true);
  close(cone.values.volume, (Math.PI * 9 * 4) / 3);
  close(cone.values.lsa, Math.PI * 3 * 5);
  assert.ok(cone.notes.some((n) => /complete cone/.test(n.text)));
  const cyl = solveFrustum({ r: '2', R: '2', known: 'h', h: '5' });
  close(cyl.values.volume, Math.PI * 4 * 5);
  close(cyl.values.lsa, 2 * Math.PI * 2 * 5);
  assert.equal(cyl.values.s, 5);
});

test('rejects invalid and impossible inputs with field-specific messages', () => {
  const bad = (input) => {
    const res = solveFrustum(input);
    assert.equal(res.ok, false, JSON.stringify(input));
    return res.errors;
  };
  assert.equal(bad({ r: '', R: '5', known: 'h', h: '4' })[0].field, 'r');
  assert.match(bad({ r: 'abc', R: '5', known: 'h', h: '4' })[0].message, /must be a number/);
  assert.match(bad({ r: '-1', R: '5', known: 'h', h: '4' })[0].message, /cannot be negative/);
  assert.match(bad({ r: '0', R: '0', known: 'h', h: '4' })[0].message, /greater than 0/);
  assert.match(bad({ r: '6', R: '5', known: 'h', h: '4' })[0].message, /at least the top radius/);
  assert.match(bad({ r: '1', R: '5', known: 'h', h: '0' })[0].message, /greater than 0/);
  assert.match(bad({ r: '1', R: '5', known: 's', s: '3' })[0].message, /Impossible frustum/);
  assert.match(bad({ r: '1', R: '5', known: 's', s: '4' })[0].message, /flat/);
  assert.match(bad({ r: '1', R: '5', known: 'h', h: '1e400' })[0].message, /too large/);
  assert.match(bad({ r: '1', R: '5', known: 'h', h: '1,5' })[0].message, /comma/);
  assert.match(bad({ r: '1', R: '2e10', known: 'h', h: '1' })[0].message, /at or below/);
});

test('accepts Unicode minus and surrounding spaces, and steps are produced', () => {
  const res = solveFrustum({ r: '  2 ', R: '4', known: 'h', h: '−1' });
  assert.equal(res.ok, false); // −1 parsed as a negative height
  const ok = solveFrustum({ r: ' 2 ', R: '4', known: 'h', h: '3' });
  assert.equal(ok.ok, true);
  assert.equal(ok.steps.length, 6);
  for (const s of ok.steps) assert.ok((s.tex || s.texLines.join('')).length > 0);
});
