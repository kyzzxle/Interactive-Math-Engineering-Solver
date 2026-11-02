/*
 * Checks for the "Explore" and "Try it" learning widgets attached to calculators:
 *  - every explorer renders at its default values, at every preset, at the ends of every
 *    slider and for every select option, without NaN/Infinity and with valid TeX
 *  - every practice generator produces finite answers, valid TeX and a worked solution
 *  - the answer checker accepts correct rounding and rejects wrong answers
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { texToMathML } from '../tools/katex-node.mjs';
import { parseAnswer, judge } from '../assets/js/lib/learn.js';

const registry = JSON.parse(readFileSync(new URL('../data/calculators.json', import.meta.url), 'utf8'));
const BAD = /NaN|Infinity|undefined|\[object Object\]/;

// learn.js renders TeX through ui.tex(); in Node, record the TeX so it can be validated.
const seen = [];
globalThis.window = { SolverMath: { tex: (s) => { seen.push(s); return `<math>${s}</math>`; } } };

function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

function checkTex(list, where) {
  for (const t of list) assert.doesNotThrow(() => texToMathML(t, true), `${where}: invalid TeX ${t}`);
}

function renderAll(spec, id) {
  const base = Object.fromEntries(spec.controls.map((c) => [c.name, c.value]));
  const cases = [base, ...(spec.presets || []).map((p) => ({ ...base, ...p.values }))];
  for (const c of spec.controls) {
    if (c.type === 'select') for (const [v] of c.options) cases.push({ ...base, [c.name]: v });
    else {
      const lo = typeof c.min === 'function' ? c.min(base) : c.min;
      const hi = typeof c.max === 'function' ? c.max(base) : c.max;
      cases.push({ ...base, [c.name]: lo }, { ...base, [c.name]: hi });
    }
  }
  for (const values of cases) {
    // keep dependent ranges consistent, as the page does
    for (const c of spec.controls) {
      if (c.type === 'select') continue;
      const lo = typeof c.min === 'function' ? c.min(values) : c.min;
      const hi = typeof c.max === 'function' ? c.max(values) : c.max;
      values[c.name] = Math.min(hi, Math.max(lo, values[c.name]));
    }
    const res = spec.render({ ...values });
    const text = [res.svg || '', res.html || '', res.note || '', ...(res.readouts || []).map((r) => `${r.label} ${r.tex ?? ''} ${r.text ?? ''}`)].join('\n');
    const m = text.match(BAD);
    assert.ok(!m, `${id} ${JSON.stringify(values)}: shows "${m && m[0]}" near ${m && text.slice(Math.max(0, m.index - 80), m.index + 30)}`);
    assert.ok(res.svg || res.html, `${id}: draws something`);
    checkTex((res.readouts || []).filter((r) => r.tex !== undefined).map((r) => r.tex), `${id} ${JSON.stringify(values)}`);
  }
}

const withLearning = [];
for (const entry of registry.calculators.filter((c) => c.generated)) {
  const { calculator } = await import(`../assets/js/calculators/${entry.id}.js`);
  if (calculator.explore || calculator.practice) withLearning.push([entry.id, calculator]);
}

test('learning widgets are attached to a good spread of calculators', () => {
  assert.ok(withLearning.length >= 20, `only ${withLearning.length} calculators have learning widgets`);
  const cats = new Set(withLearning.map(([id]) => registry.calculators.find((c) => c.id === id).category));
  for (const c of registry.categories) assert.ok(cats.has(c.id), `no learning widget in ${c.name}`);
});

for (const [id, calc] of withLearning) {
  if (calc.explore) {
    test(`${id}: explorer renders for defaults, presets and slider extremes`, () => {
      assert.ok(calc.explore.title && calc.explore.controls.length, 'has a title and controls');
      for (const c of calc.explore.controls) {
        if (c.type === 'select') assert.ok(c.options.some(([v]) => String(v) === String(c.value)), `${c.name}: default is an option`);
        else assert.ok(c.step > 0, `${c.name}: has a step`);
      }
      renderAll(calc.explore, id);
    });
  }
  if (calc.practice) {
    test(`${id}: practice problems are well formed`, () => {
      for (let i = 0; i < 60; i++) {
        seen.length = 0;
        const p = calc.practice.generate(seeded(i * 7919 + 13));
        assert.ok(p.prompt && p.hint && p.steps.length >= 2, 'prompt, hint and steps');
        for (const a of p.answers) {
          assert.ok(Number.isFinite(a.value), `${a.label}: finite answer`);
          if (a.int) assert.ok(Number.isInteger(a.value), `${a.label}: whole-number answer is a whole number`);
        }
        const text = JSON.stringify(p);
        assert.ok(!BAD.test(text), `problem text contains ${text.match(BAD)}`);
        const texs = [p.promptTex, p.hintTex, ...p.steps.flatMap((s) => [s.tex, ...(s.texLines || [])])].filter(Boolean);
        checkTex([...texs, ...seen], `${id} problem ${i}`);
        // the exact answer, rounded the way the page asks, must be accepted
        for (const a of p.answers) {
          const d = a.int ? 0 : a.decimals ?? 2;
          assert.equal(judge(Number(a.value.toFixed(d)), a.value, d), 'correct', `${a.label}: rounded answer accepted`);
        }
      }
    });
  }
}

test('homepage demos render for defaults, presets and slider extremes', async () => {
  const { HOME_DEMOS } = await import('../assets/js/explore/home.js');
  assert.ok(Object.keys(HOME_DEMOS).length >= 3);
  for (const [key, demo] of Object.entries(HOME_DEMOS)) {
    assert.ok(existsSync(new URL(`../${demo.href}index.html`, import.meta.url)), `${key}: links to a real page`);
    renderAll(demo.spec, `home:${key}`);
  }
});

test('answer parsing and judging', () => {
  assert.equal(parseAnswer('3/4'), 0.75);
  assert.equal(parseAnswer(' −2.5 '), -2.5);
  assert.equal(parseAnswer('1,5'), 1.5);
  assert.equal(parseAnswer('abc'), null);
  assert.equal(parseAnswer('1/0'), null);
  assert.equal(judge(113.1, 113.097), 'correct');
  assert.equal(judge(113.09, 113.097), 'correct');
  assert.equal(judge(110, 113.097), 'close');
  assert.equal(judge(50, 113.097), 'wrong');
  assert.equal(judge(-3, 3, 0), 'wrong');
  assert.equal(judge(0.7071, Math.SQRT1_2, 4), 'correct');
});
