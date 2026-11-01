/**
 * Permutations of items with repeats (multinomial coefficient): n! / (n₁! n₂! ⋯ n_k!).
 * Input either a word (letters are the items) or a list of group sizes.
 */
import { validator } from '../lib/calc-kit.js';
import { factorial, groupDigits, scientificFromBigInt } from '../lib/bigint.js';

/** Distinct arrangements of a multiset (only for small totals). */
function listArrangements(chars, limit = 120) {
  const counts = new Map();
  for (const c of chars) counts.set(c, (counts.get(c) || 0) + 1);
  const keys = [...counts.keys()].sort();
  const out = [];
  const cur = [];
  (function rec() {
    if (out.length >= limit) return;
    if (cur.length === chars.length) { out.push(cur.join('')); return; }
    for (const k of keys) {
      if (!counts.get(k)) continue;
      counts.set(k, counts.get(k) - 1); cur.push(k);
      rec();
      cur.pop(); counts.set(k, counts.get(k) + 1);
    }
  })();
  return out;
}

export const calculator = {
  id: 'permutations-with-repetition',
  fields: [
    { name: 'mode', label: 'Describe the items as', type: 'radio', options: [['word', 'A word or string of letters'], ['counts', 'Group sizes']] },
    { name: 'word', label: 'Word', type: 'text', placeholder: 'e.g. MISSISSIPPI', hint: 'Letters only (case is ignored). Each letter is one item; equal letters are identical.', showWhen: { mode: ['word'] } },
    { name: 'counts', label: 'Sizes of the groups of identical items', type: 'text', placeholder: 'e.g. 3, 2, 2', hint: 'For example 5 red, 3 blue and 2 green balls → 5, 3, 2.', showWhen: { mode: ['counts'] } },
  ],
  examples: [
    { label: 'MISSISSIPPI', values: { mode: 'word', word: 'MISSISSIPPI' } },
    { label: 'LEVEL (lists all)', values: { mode: 'word', word: 'LEVEL' } },
    { label: 'Flags: 5 red, 3 blue, 2 green', values: { mode: 'counts', counts: '5, 3, 2' } },
  ],
  solve(values) {
    const v = validator(values);
    const mode = values.mode === 'counts' ? 'counts' : 'word';
    let groups = [], word = null;
    if (mode === 'word') {
      const raw = v.text('word', 'a word');
      if (!v.ok()) return v.result();
      word = raw.toUpperCase().replace(/\s+/g, '');
      if (!/^[A-Z]+$/.test(word)) return { ok: false, errors: [{ field: 'word', message: 'Use letters A–Z only (no digits, spaces or punctuation).' }] };
      if (word.length > 1000) return { ok: false, errors: [{ field: 'word', message: 'Please use at most 1,000 letters.' }] };
      const m = new Map();
      for (const c of word) m.set(c, (m.get(c) || 0) + 1);
      groups = [...m.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([c, k]) => ({ name: c, k }));
    } else {
      const raw = v.text('counts', 'the group sizes');
      if (!v.ok()) return v.result();
      const parts = raw.split(/[\s,;]+/).filter(Boolean);
      for (const p of parts) if (!/^\d+$/.test(p) || Number(p) < 1) return { ok: false, errors: [{ field: 'counts', message: `"${p}" is not a positive whole number. Enter group sizes such as 3, 2, 2.` }] };
      groups = parts.map((p, i) => ({ name: `group ${i + 1}`, k: Number(p) }));
    }
    const n = groups.reduce((s, g) => s + g.k, 0);
    if (n > 10000) return { ok: false, errors: [{ field: mode, message: 'The total number of items must be at most 10,000.' }] };
    const num = factorial(n);
    let den = 1n;
    for (const g of groups) den *= factorial(g.k);
    const result = num / den;
    const s = result.toString();
    const short = s.length <= 24;
    const sci = scientificFromBigInt(result, 6);
    const denTex = groups.map((g) => `${g.k}!`).join('\\,');
    const steps = [
      { title: 'Count the items and the repeats', text: `${n} items in total: ${groups.map((g) => `${g.name} × ${g.k}`).join(', ')}.` },
      { title: 'Arrange as if all items were different', tex: `${n}! = ${n <= 20 ? groupDigits(factorial(n).toString()).replace(/,/g, '{,}') : `\\text{(${factorial(n).toString().length} digits)}`}` },
      { title: 'Divide out the rearrangements of identical items', text: 'Swapping identical items does not create a new arrangement, so each group of k identical items was counted k! times too often.', texLines: [`\\frac{n!}{${groups.map((g, i) => `n_{${i + 1}}!`).join('\\,')}} = \\frac{${n}!}{${denTex}}`, short ? `= \\frac{${groupDigits(num.toString()).replace(/,/g, '{,}')}}{${groupDigits(den.toString()).replace(/,/g, '{,}')}} = ${groupDigits(s).replace(/,/g, '{,}')}` : `\\approx ${sci.mantissa} \\times 10^{${sci.exponent}}`] },
    ];
    const list = word && s.length <= 3 && Number(s) <= 120 ? listArrangements(word.split('')) : null;
    const answers = [
      { label: 'Distinct arrangements', value: short ? groupDigits(s) : `≈ ${sci.mantissa} × 10^${sci.exponent}`, approx: !short, primary: true, copy: s },
      { label: 'Total items n', value: String(n) },
      { label: 'Formula', valueTex: `\\frac{${n}!}{${denTex}}` },
      { label: 'Without identical items it would be', value: n <= 20 ? groupDigits(factorial(n).toString()) : `${factorial(n).toString().length} digits` },
    ];
    return {
      ok: true,
      final: { tex: short ? `\\frac{${n}!}{${denTex}} = ${groupDigits(s).replace(/,/g, '{,}')}` : `\\frac{${n}!}{${denTex}} \\approx ${sci.mantissa} \\times 10^{${sci.exponent}}` },
      answers,
      visual: list ? { svg: `<p class="text-sm font-semibold">All ${list.length} distinct arrangements</p><ul class="enum-list">${list.map((w) => `<li>${w}</li>`).join('')}</ul>` } : undefined,
      formula: ['\\frac{n!}{n_1!\\, n_2! \\cdots n_k!}, \\qquad n = n_1 + n_2 + \\cdots + n_k'],
      steps,
      tables: [{ caption: 'Repeated items', headers: [mode === 'word' ? 'Letter' : 'Group', 'Count k', 'k!'], rows: groups.map((g) => [g.name, String(g.k), g.k <= 20 ? groupDigits(factorial(g.k).toString()) : `${factorial(g.k).toString().length} digits`]) }],
      rounding: short ? 'The answer is exact.' : 'The exact answer is too long to display in full; copy it with the Copy button.',
    };
  },
};
