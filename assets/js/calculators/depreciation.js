/**
 * Depreciation of an asset with first cost C, salvage value S and life n years, by
 *   straight line, sinking fund, declining balance (Matheson), double declining balance and
 *   sum-of-the-years'-digits. Gives the depreciation in year m, the accumulated depreciation,
 *   the book value, a full schedule and a chart comparing every method.
 */
import { validator } from '../lib/calc-kit.js';
import { money, moneyTex, pctTex, dec, moneyAnswer, rateAnswer } from '../lib/econ-kit.js';
import { plot } from '../lib/plot.js';
import { depreciationExplore, depreciationPractice } from '../explore/econ.js';

export const METHODS = [['sl', 'Straight line'], ['sf', 'Sinking fund'], ['db', 'Declining balance (Matheson)'], ['ddb', 'Double declining balance'], ['syd', "Sum of the years' digits"]];

/** Book value at the end of year t (0 ≤ t ≤ n) for each method. */
export function bookValue(method, C, S, n, t, i = 0) {
  if (method === 'sf') {
    if (Math.abs(i) < 1e-10) return C - ((C - S) * t) / n;
    return C - (C - S) * (Math.expm1(t * Math.log1p(i)) / Math.expm1(n * Math.log1p(i)));
  }
  if (method === 'db') return C * (S / C) ** (t / n);
  if (method === 'ddb') return C * (1 - 2 / n) ** t;
  if (method === 'syd') { const syd = (n * (n + 1)) / 2; return C - ((C - S) * (t * (2 * n - t + 1)) / 2) / syd; }
  return C - ((C - S) * t) / n;
}

export const calculator = {
  id: 'depreciation',
  explore: depreciationExplore,
  practice: depreciationPractice,
  fields: [
    { name: 'method', label: 'Method', type: 'select', options: METHODS },
    { name: 'C', label: 'First cost C', type: 'number', signed: false, placeholder: 'e.g. 800000', hint: 'Purchase price plus installation. Amounts work in any currency; type them without commas.', row: 'cs' },
    { name: 'S', label: 'Salvage value S', type: 'number', signed: false, placeholder: 'e.g. 80000', row: 'cs' },
    { name: 'n', label: 'Useful life n', type: 'number', signed: false, placeholder: 'e.g. 10', suffix: 'yr', row: 'nm' },
    { name: 'm', label: 'Year m', type: 'number', signed: false, placeholder: 'e.g. 4', row: 'nm', hint: 'The year whose depreciation and book value you want.' },
    { name: 'i', label: 'Interest rate i (sinking fund)', type: 'number', signed: false, placeholder: 'e.g. 6', suffix: '%', showWhen: { method: ['sf'] } },
  ],
  examples: [
    { label: 'Straight line: 800,000 machine, 80,000 salvage, 10 years', values: { method: 'sl', C: '800000', S: '80000', n: '10', m: '4', i: '6' } },
    { label: 'Sinking fund at 6%', values: { method: 'sf', C: '800000', S: '80000', n: '10', m: '4', i: '6' } },
    { label: 'Declining balance (Matheson)', values: { method: 'db', C: '800000', S: '80000', n: '10', m: '4', i: '6' } },
    { label: 'Double declining balance, year 2', values: { method: 'ddb', C: '120000', S: '10000', n: '5', m: '2', i: '6' } },
    { label: "Sum of the years' digits, year 3", values: { method: 'syd', C: '150000', S: '15000', n: '6', m: '3', i: '6' } },
    { label: 'Impossible: salvage above the first cost', values: { method: 'sl', C: '50000', S: '60000', n: '5', m: '1', i: '6' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const method = METHODS.some(([k]) => k === values.method) ? values.method : 'sl';
    const C = v.number('C', 'the first cost', { positive: true, maxAbs: 1e13 });
    const S = v.number('S', 'the salvage value', { nonneg: true, maxAbs: 1e13 });
    const n = v.whole('n', 'the useful life', 100, 1);
    const m = v.whole('m', 'the year', 100, 1);
    const iPct = method === 'sf' ? v.number('i', 'the interest rate', { nonneg: true, max: 100 }) : 0;
    if (!v.ok()) return v.result();
    if (!(S < C)) return { ok: false, errors: [{ field: 'S', message: 'The salvage value must be less than the first cost; otherwise there is nothing to depreciate.' }] };
    if (m > n) return { ok: false, errors: [{ field: 'm', message: `Year m must be between 1 and the useful life (${n} years).` }] };
    if (method === 'db' && S === 0) return { ok: false, errors: [{ field: 'S', message: 'The Matheson (declining balance) formula needs a salvage value above 0. Use double declining balance or another method for a zero salvage value.' }] };
    if (method === 'ddb' && n < 2) return { ok: false, errors: [{ field: 'n', message: 'Double declining balance needs a life of at least 2 years (its rate is 2/n).' }] };
    const i = iPct / 100;
    const BV = (t) => bookValue(method, C, S, n, t, i);
    const bvm = BV(m), bvPrev = BV(m - 1), dm = bvPrev - bvm, Dm = C - bvm;
    const steps = [{ title: 'Depreciable amount', tex: `C - S = ${moneyTex(C)} - ${moneyTex(S)} = ${moneyTex(C - S)}` }];
    const answers = [];
    if (method === 'sl') {
      const d = (C - S) / n;
      steps.push({ title: 'Equal depreciation every year', tex: `d = \\frac{C - S}{n} = \\frac{${moneyTex(C - S)}}{${n}} = ${moneyTex(d)}` });
      steps.push({ title: `Accumulated depreciation after ${m} years`, tex: `D_{${m}} = m\\,d = ${m} \\times ${moneyTex(d)} = ${moneyTex(Dm)}` });
    } else if (method === 'sf') {
      if (i < 1e-10) steps.push({ title: 'With i = 0 the sinking fund method is the same as straight line', tex: `d = \\frac{C - S}{n} = ${moneyTex((C - S) / n)}` });
      else {
        const sff = i / Math.expm1(n * Math.log1p(i));
        const d = (C - S) * sff;
        steps.push({ title: 'Annual deposit into the sinking fund', tex: `d = (C - S)\\,\\frac{i}{(1 + i)^{n} - 1} = ${moneyTex(C - S)} \\times \\frac{${dec(i)}}{(1 + ${dec(i)})^{${n}} - 1} \\approx ${moneyTex(d)}` });
        steps.push({ title: `Fund (accumulated depreciation) after ${m} years`, tex: `D_{${m}} = d\\,\\frac{(1 + i)^{${m}} - 1}{i} \\approx ${moneyTex(Dm)}` });
        answers.push(moneyAnswer('Annual sinking-fund deposit d', d));
      }
    } else if (method === 'db') {
      const k = 1 - (S / C) ** (1 / n);
      steps.push({ title: 'Constant rate of depreciation', tex: `k = 1 - \\sqrt[${n}]{\\frac{S}{C}} = 1 - \\sqrt[${n}]{\\frac{${moneyTex(S)}}{${moneyTex(C)}}} \\approx ${dec(k, 6)} = ${pctTex(k)}` });
      steps.push({ title: `Book value after ${m} years`, tex: `BV_{${m}} = C\\,(1 - k)^{${m}} \\approx ${moneyTex(C)} \\times ${dec(1 - k, 6)}^{${m}} \\approx ${moneyTex(bvm)}` });
      steps.push({ title: `Depreciation in year ${m}`, tex: `d_{${m}} = k\\,BV_{${m - 1}} \\approx ${dec(k, 6)} \\times ${moneyTex(bvPrev)} \\approx ${moneyTex(dm)}` });
      answers.push(rateAnswer('Depreciation rate k', k));
    } else if (method === 'ddb') {
      const k = 2 / n;
      steps.push({ title: 'Rate: twice the straight-line rate', tex: `k = \\frac{2}{n} = \\frac{2}{${n}} = ${dec(k, 6)}` });
      steps.push({ title: `Book value after ${m} years`, tex: `BV_{${m}} = C\\,(1 - k)^{${m}} = ${moneyTex(C)} \\times ${dec(1 - k, 6)}^{${m}} \\approx ${moneyTex(bvm)}` });
      steps.push({ title: `Depreciation in year ${m}`, tex: `d_{${m}} = k\\,BV_{${m - 1}} = ${dec(k, 6)} \\times ${moneyTex(bvPrev)} \\approx ${moneyTex(dm)}` });
      answers.push(rateAnswer('Depreciation rate k', k));
    } else {
      const syd = (n * (n + 1)) / 2;
      steps.push({ title: "Sum of the years' digits", tex: `SYD = \\frac{n(n + 1)}{2} = \\frac{${n}(${n + 1})}{2} = ${syd}` });
      steps.push({ title: `Depreciation in year ${m}`, tex: `d_{${m}} = (C - S)\\,\\frac{n - m + 1}{SYD} = ${moneyTex(C - S)} \\times \\frac{${n - m + 1}}{${syd}} \\approx ${moneyTex(dm)}` });
      steps.push({ title: `Accumulated depreciation after ${m} years`, tex: `D_{${m}} = (C - S)\\,\\frac{${Array.from({ length: m }, (_, j) => n - j).join(' + ')}}{${syd}} \\approx ${moneyTex(Dm)}` });
    }
    steps.push({ title: `Book value at the end of year ${m}`, tex: `BV_{${m}} = C - D_{${m}} = ${moneyTex(C)} - ${moneyTex(Dm)} \\approx ${moneyTex(bvm)}` });
    if (![bvm, dm, Dm].every(Number.isFinite)) return { ok: false, errors: [{ message: 'These values are too extreme to compute reliably. Check the inputs.' }] };
    const bvEnd = BV(n);
    const notes = [{ kind: 'info', text: 'Book value is the value on the accounting records, not necessarily what the asset would sell for. Amounts are rounded to the cent.' }];
    if (method === 'ddb' && Math.abs(bvEnd - S) > 0.005) notes.push({ kind: 'warn', text: `Double declining balance ignores the salvage value, so after ${n} years the book value is ${money(bvEnd)}, not ${money(S)}. In practice firms switch to straight line or stop depreciating at the salvage value.` });
    const rows = [];
    for (let t = 1; t <= n; t++) rows.push([String(t), money(BV(t - 1) - BV(t)), money(C - BV(t)), money(BV(t))]);
    const curves = METHODS.filter(([k]) => k !== 'sf' || i > 0).map(([k], idx) => ({ f: (t) => bookValue(k, C, S, n, t, i), cls: k === method ? 'd-line' : idx % 2 ? 'd-line2' : 'd-line3', samples: Math.max(2, n * 8) }));
    return {
      ok: true,
      final: { texLines: [`d_{${m}} \\approx ${moneyTex(dm)},\\quad BV_{${m}} \\approx ${moneyTex(bvm)}`] },
      answers: [
        moneyAnswer(`Depreciation in year ${m}`, dm, { primary: true }),
        moneyAnswer(`Book value at the end of year ${m}`, bvm, { primary: true }),
        moneyAnswer(`Accumulated depreciation after ${m} years`, Dm),
        moneyAnswer(`Book value at the end of the life (year ${n})`, bvEnd),
        ...answers,
      ],
      tables: [{ caption: `${METHODS.find(([k]) => k === method)[1]} schedule`, headers: ['Year', 'Depreciation', 'Accumulated', 'Book value'], rows }],
      visual: { svg: plot({ x: [0, n], y: [0, C * 1.05], width: 400, height: 250, title: 'Book value by method', curves: [...curves.filter((c) => c.cls !== 'd-line'), ...curves.filter((c) => c.cls === 'd-line')], points: [{ x: m, y: bvm }], hlines: [{ y: S, label: 'S', cls: 'd-ground' }], xLabel: 'year', yLabel: 'book value' }), caption: `Blue: ${METHODS.find(([k]) => k === method)[1]} method, with year ${m} marked. The other lines are the remaining methods for comparison; the horizontal line labelled S is the salvage value. Faster methods (declining balance, SYD) drop steeply in the early years.` },
      formula: ['BV_m = C - D_m \\qquad d_{SL} = \\frac{C - S}{n}'],
      steps,
      notes,
    };
  },
};
