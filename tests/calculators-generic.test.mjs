/*
 * Generic checks for every generated calculator:
 *  - every worked example solves without errors
 *  - every formula the result contains renders with KaTeX (strict, throwOnError)
 *  - no NaN, Infinity or "undefined" ever appears in what users would see
 *  - fuzzing each field with junk or edge-case input never throws and never yields NaN/Infinity
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { texToMathML } from '../tools/katex-node.mjs';

const registry = JSON.parse(readFileSync(new URL('../data/calculators.json', import.meta.url), 'utf8'));
const generated = registry.calculators.filter((c) => c.generated);

function collectTex(res) {
  const out = [];
  const add = (t) => { if (typeof t === 'string' && t) out.push(t); };
  if (res.final) { add(res.final.tex); (res.final.texLines || []).forEach(add); }
  for (const a of res.answers || []) { add(a.valueTex); add(a.exactTex); }
  for (const s of res.steps || []) { add(s.tex); (s.texLines || []).forEach(add); }
  (res.formula || []).forEach(add);
  for (const t of res.tables || []) for (const row of [t.headers, ...t.rows]) for (const c of row) if (c && typeof c === 'object') add(c.tex);
  return out;
}

function visibleText(res) {
  const parts = [];
  if (res.final) parts.push(res.final.text || '', res.final.tex || '', ...(res.final.texLines || []));
  for (const a of res.answers || []) parts.push(a.label, a.value ?? '', a.valueTex ?? '', a.exactTex ?? '', a.copy ?? '');
  for (const s of res.steps || []) parts.push(s.title, s.text || '', s.note || '', s.tex || '', ...(s.texLines || []));
  for (const n of res.notes || []) parts.push(n.text);
  for (const t of res.tables || []) parts.push(JSON.stringify(t));
  if (res.visual) parts.push(res.visual.svg || '', res.visual.caption || '');
  return parts.join('\n');
}

const BAD = /\bNaN\b|Infinity|\bundefined\b(?! \(vertical)|\[object Object\]/;

for (const entry of generated) {
  test(`${entry.id}: worked examples solve and render`, async () => {
    const { calculator } = await import(`../assets/js/calculators/${entry.id}.js`);
    assert.ok(calculator.examples && calculator.examples.length, 'has examples');
    for (const ex of calculator.examples) {
      const res = calculator.solve({ ...ex.values });
      if (ex.expectError) {
        assert.ok(!res.ok && res.errors.every((e) => e.message.length > 10), `${ex.label}: should explain why the input is impossible`);
        continue;
      }
      assert.ok(res.ok, `${ex.label}: ${JSON.stringify(res.errors)}`);
      const text = visibleText(res);
      const m = text.match(BAD);
      assert.ok(!m, `${ex.label}: output contains "${m && m[0]}" near: ${m && text.slice(Math.max(0, m.index - 80), m.index + 40)}`);
      for (const t of collectTex(res)) {
        assert.doesNotThrow(() => texToMathML(t, true), `${ex.label}: invalid TeX: ${t}`);
      }
      assert.ok(res.steps && res.steps.length >= 2, `${ex.label}: has a step-by-step solution`);
    }
  });

  test(`${entry.id}: fuzzed inputs never crash or show NaN`, async () => {
    const { calculator } = await import(`../assets/js/calculators/${entry.id}.js`);
    const base = { ...calculator.examples[0].values };
    const junk = ['', '   ', 'abc', '-1', '0', '1e400', '999999999999999', '1/0', ')(', '2,5', '-0', '0.0000001', 'NaN', '∞', '1e-300', '12345678901234567890', '3+', 'x', 'sin(', '1/2'];
    for (const f of calculator.fields) {
      const options = f.options ? f.options.map(([val]) => val) : junk;
      for (const val of options) {
        const values = { ...base, [f.name]: val };
        let res;
        assert.doesNotThrow(() => { res = calculator.solve(values); }, `${f.name} = ${JSON.stringify(val)} threw`);
        assert.equal(typeof res.ok, 'boolean');
        if (res.ok) {
          const text = visibleText(res);
          const m = text.match(BAD);
          assert.ok(!m, `${f.name} = ${JSON.stringify(val)}: output contains "${m && m[0]}" near: ${m && text.slice(Math.max(0, m.index - 80), m.index + 40)}`);
        } else {
          assert.ok(res.errors.length && res.errors.every((e) => typeof e.message === 'string' && e.message.length > 10), `${f.name} = ${JSON.stringify(val)}: error messages must be helpful`);
        }
      }
    }
  });
}
