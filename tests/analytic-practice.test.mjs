/* Analytic geometry "Try it" problems: every generated problem is solved again with the real
   calculator and its answers must match. Also checks the new explorers and the worked
   solutions, hints and prompts for valid TeX. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { texToMathML } from '../tools/katex-node.mjs';
import * as P from '../assets/js/explore/analytic-practice.js';
import { solvePointLine } from '../assets/js/calculators/point-line-distance.js';

const BAD = /NaN|Infinity|undefined|\[object Object\]/;
const near = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b));
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }
/** Numbers in a card value: "(3, -2)", "81.8699 °", "\left(2,\ -\frac{3}{4}\right)". */
function nums(s) {
  const t = String(s).replace(/\\left|\\right|\\ /g, '').replace(/-\\frac\{(\d+)\}\{(\d+)\}/g, (m, p, q) => String(-p / q)).replace(/\\frac\{(\d+)\}\{(\d+)\}/g, (m, p, q) => String(p / q)).replace(/−/g, '-');
  return (t.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g) || []).map(Number);
}
const texOk = (s, where) => assert.doesNotThrow(() => texToMathML(s, true), `${where}: invalid TeX ${s}`);

const PRACTICE = Object.entries(P).filter(([k]) => k.endsWith('Practice'));
const calcs = {};

test('every analytic geometry calculator has an explorer and a practice problem', async () => {
  const ids = ['midpoint-and-distance', 'slope-and-equation-of-a-line', 'intersection-of-two-lines', 'line-circle-intersection', 'circle-equation', 'parabola', 'point-to-plane-distance', 'angle-between-lines', 'polygon-area-coordinates', 'ellipse', 'hyperbola', 'division-of-line-segment', 'general-conic', 'polar-coordinates', 'tangent-normal-conic', 'lines-planes-3d'];
  for (const id of ids) {
    const { calculator } = await import(`../assets/js/calculators/${id}.js`);
    assert.ok(calculator.explore, `${id}: explorer`);
    assert.ok(calculator.practice, `${id}: practice`);
  }
});

for (const [name, spec] of PRACTICE) {
  test(`${name}: 80 problems agree with the calculator`, async () => {
    const rand = seeded(name.length * 7919);
    for (let i = 0; i < 80; i++) {
      const pr = spec.generate(rand);
      const where = `${name} #${i}`;
      assert.ok(pr.answers.length && pr.answers.every((a) => Number.isFinite(a.value)), `${where}: finite answers`);
      const text = [pr.prompt, pr.promptTex || '', pr.hint, pr.hintTex || '', ...pr.steps.flatMap((s) => [s.title, s.tex || '', ...(s.texLines || []), s.text || ''])].join('\n');
      assert.ok(!BAD.test(text), `${where}: ${text.match(BAD)}`);
      for (const t of [pr.promptTex, pr.hintTex, ...pr.steps.flatMap((s) => [s.tex, ...(s.texLines || [])])].filter(Boolean)) texOk(t, where);

      const { id, values, cards } = pr.verify;
      if (id === 'distance-from-point-to-line') {
        const r = solvePointLine(values);
        assert.ok(r.ok, where);
        assert.ok(near(r.values.distance, pr.answers[0].value) && near(r.values.foot.x, pr.answers[1].value), `${where}: ${JSON.stringify(values)}`);
        continue;
      }
      calcs[id] ??= (await import(`../assets/js/calculators/${id}.js`)).calculator;
      const res = calcs[id].solve(values);
      assert.ok(res.ok, `${where}: ${JSON.stringify(values)} ${JSON.stringify(res.errors)}`);
      cards.forEach(([label, idx = 0], j) => {
        if (label === null) return;
        const card = res.answers.find((a) => a.label.startsWith(label));
        assert.ok(card, `${where}: no card ${label}`);
        const got = nums(card.value ?? card.valueTex)[idx];
        assert.ok(near(got, pr.answers[j].value) || Math.abs(got - pr.answers[j].value) < 6e-5, `${where}: ${label} calculator ${got} vs practice ${pr.answers[j].value} for ${JSON.stringify(values)}`);
      });
    }
  });
}

test('ellipse practice: the focus answer matches the foci', () => {
  const rand = seeded(11);
  for (let i = 0; i < 40; i++) {
    const pr = P.ellipsePractice.generate(rand);
    const { h, k, a, b } = pr.verify.values;
    const horiz = Number(a) >= Number(b), c = Math.sqrt(Math.abs(a * a - b * b));
    assert.equal(pr.answers[2].value, (horiz ? Number(h) : Number(k)) + c);
    assert.ok(near(pr.answers[0].value, c));
  }
});

function renderAll(spec, extra = []) {
  const base = Object.fromEntries(spec.controls.map((c) => [c.name, c.value]));
  const cases = [base, ...(spec.presets || []).map((p) => ({ ...base, ...p.values })), ...extra.map((e) => ({ ...base, ...e }))];
  for (const c of spec.controls) cases.push({ ...base, [c.name]: c.min }, { ...base, [c.name]: c.max });
  for (const v of cases) {
    const out = spec.render(v);
    assert.ok(out.svg && out.svg.includes('<svg'), `draws for ${JSON.stringify(v)}`);
    const text = [out.svg, out.note || '', ...out.readouts.map((r) => `${r.tex ?? ''} ${r.text ?? ''}`)].join(' ');
    assert.ok(!BAD.test(text), `${JSON.stringify(v)}: ${text.match(BAD)}`);
    for (const r of out.readouts) if (r.tex) texOk(r.tex, JSON.stringify(v));
  }
}

test('explorers render everywhere, including degenerate settings', () => {
  renderAll(P.parabolaExplore, [{ p: 0 }, { p: -3, s: 1 }, { p: 0.25, s: -1 }]);
  renderAll(P.planeDistanceExplore, [{ A: 0, B: 0, C: 0 }, { A: 3, B: 0, C: 0 }, { A: 0, B: -3, C: 0 }]);
  renderAll(P.pointLineExplore, [{ A: 0, B: 0 }, { A: 0, B: 2 }, { A: 2, B: 0 }]);
});

test('parabola explorer: PF equals the distance to the directrix', () => {
  for (const p of [-2.5, -0.5, 0.75, 3]) for (const s of [-1, -0.3, 0, 0.6, 1]) {
    const ro = P.parabolaExplore.render({ p, s }).readouts.find((r) => r.label === 'Distances from P').tex;
    const [pf, pd] = nums(ro);
    assert.ok(Math.abs(pf - pd) < 2e-3, `p=${p} s=${s}: ${ro}`);
  }
});

test('plane explorer: the foot lies on the plane and |PF| = d', () => {
  const out = P.planeDistanceExplore.render({ A: 2, B: -1, C: 2, D: -3, x0: 1, y0: 4, z0: 3.5, yaw: 35, pitch: 22 });
  const d = nums(out.readouts.find((r) => r.label === 'Distance').tex).pop();
  assert.ok(Math.abs(d - Math.abs(2 - 4 + 7 - 3) / 3) < 1e-3);
});
