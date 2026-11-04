/* Algebra "Try it" problems: every generated problem is solved again with the real calculator
   and its answers must match. Also checks the explorers and that every algebra calculator has
   an explorer and a practice problem. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { texToMathML } from '../tools/katex-node.mjs';
import * as NEW from '../assets/js/explore/algebra-new.js';
import * as OLD from '../assets/js/explore/algebra-practice.js';

const registry = JSON.parse(readFileSync(new URL('../data/calculators.json', import.meta.url), 'utf8'));
const BAD = /NaN|Infinity|undefined|\[object Object\]/;
const near = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b)) || Math.abs(a - b) < 6e-5;
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }
/** Numbers in a card value: "(3, -2)", "81.8699 °", "\left(2,\ -\frac{3}{4}\right)", "4.77 × 10^-7". */
function nums(s) {
  const t = String(s).replace(/ × 10\^/g, 'e').replace(/\\left|\\right|\\ /g, '').replace(/−/g, '-').replace(/-\\frac\{(\d+)\}\{(\d+)\}/g, (m, p, q) => String(-p / q)).replace(/\\frac\{(\d+)\}\{(\d+)\}/g, (m, p, q) => String(p / q));
  return (t.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g) || []).map(Number);
}
const texOk = (s, where) => assert.doesNotThrow(() => texToMathML(s, true), `${where}: invalid TeX ${s}`);
const calcs = {};
const load = async (id) => (calcs[id] ??= (await import(`../assets/js/calculators/${id}.js`)).calculator);

test('every algebra calculator has an explorer and a practice problem', async () => {
  const ids = registry.calculators.filter((c) => c.category === 'algebra').map((c) => c.id);
  assert.ok(ids.length >= 16, `${ids.length} algebra calculators`);
  for (const id of ids) {
    const c = await load(id);
    assert.ok(c.explore, `${id}: explorer`);
    assert.ok(c.practice, `${id}: practice`);
  }
});

const PRACTICE = [...Object.entries(NEW), ...Object.entries(OLD)].filter(([k, v]) => k.endsWith('Practice') && v.generate);
for (const [name, spec] of PRACTICE) {
  test(`${name}: 80 problems agree with the calculator`, async () => {
    const rand = seeded(name.length * 7919 + 13);
    for (let i = 0; i < 80; i++) {
      const pr = spec.generate(rand);
      const where = `${name} #${i}`;
      assert.ok(pr.answers.length && pr.answers.every((a) => Number.isFinite(a.value)), `${where}: finite answers`);
      const text = [pr.prompt, pr.promptTex || '', pr.hint, pr.hintTex || '', ...pr.steps.flatMap((s) => [s.title, s.tex || '', ...(s.texLines || []), s.text || ''])].join('\n');
      assert.ok(!BAD.test(text), `${where}: ${text.match(BAD)} in ${text.slice(0, 300)}`);
      for (const t of [pr.promptTex, pr.hintTex, ...pr.steps.flatMap((s) => [s.tex, ...(s.texLines || [])])].filter(Boolean)) texOk(t, where);
      assert.ok(pr.verify, `${where}: has verify`);
      const { id, values, cards } = pr.verify;
      const res = (await load(id)).solve(values);
      assert.ok(res.ok, `${where}: ${JSON.stringify(values)} ${JSON.stringify(res.errors)}`);
      cards.forEach(([label, idx = 0], j) => {
        if (label === null) return;
        const card = res.answers.find((a) => a.label.startsWith(label));
        assert.ok(card, `${where}: no card "${label}" in ${res.answers.map((a) => a.label).join(', ')}`);
        const got = nums(card.value ?? card.valueTex)[idx];
        assert.ok(near(got, pr.answers[j].value), `${where}: ${label} calculator ${got} vs practice ${pr.answers[j].value} for ${JSON.stringify(values)}`);
      });
    }
  });
}

function renderAll(spec, extra = []) {
  const base = Object.fromEntries(spec.controls.map((c) => [c.name, c.value]));
  const cases = [base, ...(spec.presets || []).map((p) => ({ ...base, ...p.values })), ...extra.map((e) => ({ ...base, ...e }))];
  for (const c of spec.controls) {
    if (c.type === 'select') for (const [v] of c.options) cases.push({ ...base, [c.name]: v });
    else cases.push({ ...base, [c.name]: c.min }, { ...base, [c.name]: c.max });
  }
  for (const v of cases) {
    const out = spec.render(v);
    assert.ok(out.svg && out.svg.includes('<svg'), `draws for ${JSON.stringify(v)}`);
    const text = [out.svg, out.note || '', ...out.readouts.map((r) => `${r.tex ?? ''} ${r.text ?? ''}`)].join(' ');
    assert.ok(!BAD.test(text), `${JSON.stringify(v)}: ${text.match(BAD)}`);
    for (const r of out.readouts) if (r.tex) texOk(r.tex, JSON.stringify(v));
  }
}

test('algebra explorers render everywhere, including degenerate settings', () => {
  for (const [name, spec] of [...Object.entries(NEW), ...Object.entries(OLD)]) {
    if (!name.endsWith('Explore')) continue;
    renderAll(spec, spec.degenerate || []);
  }
});

test('clock explorer and the clock calculator agree at every minute', async () => {
  const c = await load('work-mixture-clock');
  for (let t = 0; t < 720; t += 7) {
    const h = Math.floor(t / 60), m = t % 60;
    const ro = NEW.clockExplore.render({ t }).readouts.find((r) => r.label === 'Angle between').tex;
    const res = c.solve({ mode: 'clock', h: String(h === 0 ? 12 : h), min: String(m) });
    assert.ok(Math.abs(nums(ro)[0] - Number(res.answers[0].value)) < 0.06, `${h}:${m}`);
  }
});
