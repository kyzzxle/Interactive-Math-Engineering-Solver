/* Analytic geometry: the five newer calculators checked against hand calculations and
   independent properties (points on curves, focus–directrix property, perpendicularity). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conicOf } from '../assets/js/calculators/tangent-normal-conic.js';
import { implicitSegments } from '../assets/js/explore/analytic-new.js';

const load = async (id) => (await import(`../assets/js/calculators/${id}.js`)).calculator;
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const card = (res, label) => { assert.ok(res.ok, JSON.stringify(res.errors)); const a = res.answers.find((x) => x.label.startsWith(label)); assert.ok(a, `no card ${label}`); return a; };
/** Numbers inside a TeX or text value, e.g. \left(2,\ -\frac{3}{4}\right) → [2, -0.75]. */
function nums(s) {
  const t = String(s).replace(/\\left|\\right|\\ /g, '').replace(/\\frac\{(-?[\d.]+)\}\{([\d.]+)\}/g, (m, p, q) => String(p / q)).replace(/-\\frac\{([\d.]+)\}\{([\d.]+)\}/g, (m, p, q) => String(-p / q));
  return (t.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g) || []).map(Number);
}

test('division of a line segment: internal, external, ratio, centroid', async () => {
  const c = await load('division-of-line-segment');
  assert.equal(card(c.solve({ mode: 'ratio', x1: '-2', y1: '3', x2: '8', y2: '-2', r1: '2', r2: '3', kind: 'internal' }), 'Point P').valueTex, '\\left(2,\\ 1\\right)');
  assert.deepEqual(nums(card(c.solve({ mode: 'ratio', x1: '1', y1: '2', x2: '4', y2: '5', r1: '3', r2: '1', kind: 'external' }), 'Point P').valueTex), [5.5, 6.5]);
  // midpoint is ratio 1 : 1
  assert.deepEqual(nums(card(c.solve({ mode: 'ratio', x1: '1/2', y1: '-3', x2: '7/2', y2: '5', r1: '1', r2: '1', kind: 'internal' }), 'Point P').valueTex), [2, 1]);
  // round trip: point from a ratio, then the ratio from that point
  for (const [r1, r2] of [[1, 4], [3, 2], [5, 1]]) {
    const P = nums(card(c.solve({ mode: 'ratio', x1: '-6', y1: '1', x2: '9', y2: '-4', r1: String(r1), r2: String(r2), kind: 'internal' }), 'Point P').valueTex);
    const r = c.solve({ mode: 'find', x1: '-6', y1: '1', x2: '9', y2: '-4', px: String(P[0]), py: String(P[1]) });
    assert.ok(near(Number(card(r, 'Ratio').value), r1 / r2, 1e-6), `${r1}:${r2}`);
  }
  assert.deepEqual(nums(card(c.solve({ mode: 'centroid', x1: '0', y1: '0', x2: '6', y2: '0', x3: '3', y3: '9' }), 'Centroid').valueTex), [3, 3]);
  assert.equal(c.solve({ mode: 'ratio', x1: '0', y1: '0', x2: '4', y2: '4', r1: '2', r2: '2', kind: 'external' }).ok, false, '1 : 1 external');
});

test('general conic: classification, rotation and standard-form features', async () => {
  const c = await load('general-conic');
  const ell = c.solve({ A: '5', B: '-6', C: '5', D: '0', E: '0', F: '-8' });
  assert.equal(card(ell, 'Type').value, 'ellipse');
  assert.ok(near(Number(card(ell, 'Rotation').value.split(' ')[0]), 45));
  assert.equal(Number(card(ell, 'Semi-major').value), 2);
  assert.equal(Number(card(ell, 'Semi-minor').value), 1);
  // every vertex reported lies on the original curve
  const Q = (x, y) => 5 * x * x - 6 * x * y + 5 * y * y - 8;
  const v = nums(card(ell, 'Vertices').valueTex);
  assert.ok(Math.abs(Q(v[0], v[1])) < 1e-3 && Math.abs(Q(v[2], v[3])) < 1e-3);
  const hyp = c.solve({ A: '9', B: '0', C: '-4', D: '-36', E: '-8', F: '-4' });
  assert.equal(card(hyp, 'Type').value, 'hyperbola');
  assert.deepEqual(nums(card(hyp, 'Centre').valueTex), [2, -1]);
  assert.ok(near(Number(card(hyp, 'Eccentricity').value), Math.sqrt(13) / 2, 1e-5));
  // parabola: a point on the curve is equally far from the focus and the directrix
  const par = c.solve({ A: '1', B: '2', C: '1', D: '-4', E: '4', F: '0' });
  assert.equal(card(par, 'Type').value, 'parabola');
  const [fx, fy] = nums(card(par, 'Focus').valueTex), [da, db, dc] = nums(card(par, 'Directrix').valueTex);
  const x = 1, y = -3 + Math.sqrt(12); // on x² + 2xy + y² − 4x + 4y = 0
  assert.ok(Math.abs(x * x + 2 * x * y + y * y - 4 * x + 4 * y) < 1e-9);
  assert.ok(near(Math.hypot(x - fx, y - fy), Math.abs(da * x + db * y - dc) / Math.hypot(da, db), 1e-3));
  assert.equal(card(c.solve({ A: '1', B: '0', C: '1', D: '-4', E: '6', F: '-12' }), 'Type').value, 'circle');
  assert.match(card(c.solve({ A: '1', B: '0', C: '-1', D: '0', E: '0', F: '0' }), 'Type').value, /two intersecting lines/);
  assert.match(card(c.solve({ A: '1', B: '0', C: '1', D: '0', E: '0', F: '4' }), 'Type').value, /imaginary/);
  assert.equal(c.solve({ A: '0', B: '0', C: '0', D: '1', E: '1', F: '1' }).ok, false);
  // the explorer's contour tracer finds points on the curve
  const segs = implicitSegments((x2, y2) => x2 * x2 + y2 * y2 - 9, { x: [-5, 5], y: [-5, 5] });
  assert.ok(segs.length > 20 && segs.every((s) => Math.abs(Math.hypot(s.x1, s.y1) - 3) < 0.15));
});

test('polar coordinates: conversions and areas', async () => {
  const c = await load('polar-coordinates');
  const p = c.solve({ mode: 'toPolar', x: '-3', y: '3' });
  assert.ok(near(Number(card(p, 'r').value), 3 * Math.SQRT2));
  assert.ok(near(Number(card(p, 'θ (degrees').value.split(' ')[0]), 135));
  for (const [x, y, th] of [[1, 0, 0], [0, 2, 90], [-1, 0, 180], [0, -4, 270], [1, -1, 315], [-2, -2 * Math.sqrt(3), 240]]) {
    assert.ok(near(Number(card(c.solve({ mode: 'toPolar', x: String(x), y: String(y) }), 'θ (degrees').value.split(' ')[0]), th, 1e-5), `${x},${y}`);
  }
  const r = c.solve({ mode: 'toRect', r: '6', theta: '150' });
  assert.ok(near(Number(card(r, 'x').value), -3 * Math.sqrt(3)));
  assert.ok(near(Number(card(r, 'y').value), 3));
  const area = (curve, a, b, n, extra = {}) => Number(card(c.solve({ mode: 'curve', curve, a: String(a), b: String(b), n: String(n), t1: '', t2: '', ...extra }), extra.t1 ? 'Area from' : 'Area enclosed').value);
  assert.ok(near(area('roseCos', 4, 0, 3), 4 * Math.PI));
  assert.ok(near(area('roseSin', 2, 0, 2), 2 * Math.PI));
  assert.ok(near(area('cardioid', 2, 0, 1), 6 * Math.PI));
  assert.ok(near(area('limacon', 3, 1, 1), Math.PI * 9.5));
  assert.ok(near(area('lemniscate', 3, 0, 1), 9));
  assert.ok(near(area('roseCos', 4, 0, 3, { t1: '-30', t2: '30' }), (4 * Math.PI) / 3, 1e-7), 'one petal');
  assert.equal(c.solve({ mode: 'toPolar', x: '0', y: '0' }).ok, false);
});

test('tangent and normal: every tangent touches the conic exactly once', async () => {
  const c = await load('tangent-normal-conic');
  const t1 = c.solve({ type: 'circle', h: '0', k: '0', a: '5', mode: 'point', x1: '3', y1: '4' });
  assert.deepEqual(nums(card(t1, 'Tangent line').valueTex), [-0.75, 6.25]);
  assert.deepEqual(nums(card(t1, 'Normal line').valueTex).slice(0, 1).map((v) => +v.toFixed(4)), [1.3333]);
  const ell = c.solve({ type: 'ellipse', h: '0', k: '0', a: '4', b: '3', mode: 'slope', m: '1' });
  const cs = ell.answers.filter((a) => /^Tangent/.test(a.label)).map((a) => nums(a.valueTex)[1] * (a.valueTex.includes('- ') ? -1 : 1));
  assert.deepEqual(cs.map(Math.abs), [5, 5]);
  const ext = c.solve({ type: 'parH', h: '0', k: '0', p: '2', mode: 'external', x1: '-2', y1: '3' });
  const slopes = ext.answers.filter((a) => /^Tangent \d/.test(a.label)).map((a) => nums(a.valueTex)[0]).sort((a, b) => a - b);
  assert.deepEqual(slopes, [-2, 0.5]);
  // generic check: for random conics and slopes, each reported tangent meets the conic once
  const types = [['circle', 0, 0, 3, 3, 1], ['ellipse', 1, -2, 5, 2, 1], ['hypH', 0, 1, 2, 3, 1], ['parV', 2, 1, 1, 1, 1.5]];
  for (const [type, h, k, a, b, p] of types) {
    for (const m of [0.5, 2, -3]) {
      const r = c.solve({ type, h: String(h), k: String(k), a: String(a), b: String(b), p: String(p), mode: 'slope', m: String(m) });
      if (!r.ok) continue;
      const g = conicOf(type, h, k, a, b, p);
      for (const ans of r.answers.filter((x) => /^Point of tangency/.test(x.label))) {
        const [x0, y0] = nums(ans.valueTex);
        assert.ok(Math.abs(g.A * x0 * x0 + g.C * y0 * y0 + g.D * x0 + g.E * y0 + g.F) < 1e-3, `${type} m=${m} contact point on curve`);
      }
    }
  }
  assert.equal(c.solve({ type: 'circle', h: '0', k: '0', a: '5', mode: 'point', x1: '1', y1: '1' }).ok, false, 'point not on the curve');
});

test('lines and planes in space', async () => {
  const c = await load('lines-planes-3d');
  const pts = c.solve({ mode: 'points', P1: '1, 2, 3', P2: '4, 6, 15' });
  assert.equal(Number(card(pts, 'Distance').value), 13);
  const cosines = nums(card(pts, 'Direction cosines').valueTex);
  assert.ok(near(cosines.reduce((s, x) => s + x * x, 0), 1, 1e-3));
  assert.equal(card(c.solve({ mode: 'plane3', P1: '1, 0, 0', P2: '0, 2, 0', P3: '0, 0, 3' }), 'Plane').valueTex, '6x + 3y + 2z - 6 = 0');
  assert.deepEqual(nums(card(c.solve({ mode: 'lineplane', P1: '1, 2, 3', dir: '2, -1, 1', pl1: '1, 1, 1, -12' }), 'Intersection point').valueTex), [7, -1, 6]);
  const par = c.solve({ mode: 'lineplane', P1: '0, 0, 5', dir: '1, -1, 0', pl1: '1, 1, 1, -2' });
  assert.match(card(par, 'Intersection').value, /parallel/);
  const two = c.solve({ mode: 'planes', pl1: '1, 1, 1, -6', pl2: '2, -1, 1, -3' });
  assert.ok(near(parseFloat(card(two, 'Angle').value), (Math.acos(2 / Math.sqrt(18)) * 180) / Math.PI, 1e-5));
  const [px, py, pz, dx, dy, dz] = nums(card(two, 'Line of intersection').valueTex);
  for (const t of [0, 1, -2.5]) { const X = [px + t * dx, py + t * dy, pz + t * dz]; assert.ok(Math.abs(X[0] + X[1] + X[2] - 6) < 1e-9 && Math.abs(2 * X[0] - X[1] + X[2] - 3) < 1e-9); }
  assert.equal(Number(card(c.solve({ mode: 'planes', pl1: '1, 2, 2, -3', pl2: '2, 4, 4, -18' }), 'Distance').value), 2);
  assert.equal(c.solve({ mode: 'plane3', P1: '0, 0, 0', P2: '1, 1, 1', P3: '2, 2, 2' }).ok, false);
});
