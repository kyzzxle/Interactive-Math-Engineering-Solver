/**
 * Poisson distribution: the number of events X in a fixed interval when events happen
 * independently at an average rate λ.
 *   P(X = k) = e^{−λ} λ^k / k!,  mean = variance = λ
 * Probabilities for =, ≤, ≥, <, > and a range, summed term by term (computed in log space
 * so large λ stays accurate).
 */
import { validator, answer, fmt, tx } from '../lib/calc-kit.js';
import { lgamma } from '../lib/numeric.js';
import { plot } from '../lib/plot.js';
import { randInt, pick } from '../lib/learn.js';

export const pmf = (lam, k) => (lam === 0 ? (k === 0 ? 1 : 0) : Math.exp(-lam + k * Math.log(lam) - lgamma(k + 1)));
const OPS = [['eq', 'P(X = k)'], ['le', 'P(X ≤ k)'], ['lt', 'P(X < k)'], ['ge', 'P(X ≥ k)'], ['gt', 'P(X > k)'], ['between', 'P(k₁ ≤ X ≤ k₂)']];

function range(op, k, k2) {
  switch (op) {
    case 'eq': return [k, k];
    case 'le': return [0, k];
    case 'lt': return [0, k - 1];
    case 'ge': return [k, Infinity];
    case 'gt': return [k + 1, Infinity];
    default: return [k, k2];
  }
}
function prob(lam, lo, hi) {
  if (hi < lo) return 0;
  if (hi === Infinity) { let s = 0; for (let j = 0; j < lo; j++) s += pmf(lam, j); return Math.max(0, 1 - s); }
  let s = 0; for (let j = lo; j <= hi; j++) s += pmf(lam, j); return Math.min(1, s);
}

export const calculator = {
  id: 'poisson-distribution',
  explore: {
    title: 'Change the rate λ',
    intro: 'For small λ the distribution is lopsided, piled up near 0. As λ grows it spreads out and becomes almost symmetric, like a normal curve centred at λ.',
    controls: [{ name: 'lam', label: 'Average rate λ', min: 0.2, max: 25, step: 0.1, value: 3 }, { name: 'k', label: 'Highlight X ≤ k', min: 0, max: 40, step: 1, value: 2 }],
    presets: [{ label: 'λ = 1', values: { lam: 1, k: 1 } }, { label: 'λ = 10', values: { lam: 10, k: 10 } }],
    render({ lam, k }) {
      const top = Math.max(10, Math.ceil(lam + 4 * Math.sqrt(lam)));
      const ks = Array.from({ length: top + 1 }, (_, j) => j);
      return {
        svg: plot({ x: [-0.8, top + 0.8], width: 400, height: 250, title: 'Poisson probabilities', bars: ks.map((j) => ({ x: j, w: 0.75, h: pmf(lam, j), cls: j <= k ? 'd-bar-hi' : 'd-bar' })), vlines: [{ x: lam, cls: 'd-line3', label: 'λ' }] }),
        readouts: [
          { label: 'P(X = k)', tex: `\\frac{e^{-${tx(lam, 2)}}\\,${tx(lam, 2)}^{${k}}}{${k}!} \\approx ${tx(pmf(lam, k), 4)}` },
          { label: 'P(X ≤ k) (highlighted)', tex: `\\approx ${tx(prob(lam, 0, k), 4)}`, tone: 'good' },
          { label: 'Mean and standard deviation', tex: `\\mu = ${tx(lam, 2)},\\ \\sigma = \\sqrt{\\lambda} \\approx ${tx(Math.sqrt(lam), 3)}` },
        ],
      };
    },
  },
  practice: {
    title: 'Calls per hour',
    generate(rand) {
      const lam = pick(rand, [1, 1.5, 2, 2.5, 3, 4, 5]), k = randInt(rand, 0, 5);
      const p = pmf(lam, k);
      return {
        prompt: `<p>A help desk receives on average <strong>${lam} calls per hour</strong>. Assuming a Poisson model, what is the probability of exactly <strong>${k}</strong> call${k === 1 ? '' : 's'} in an hour? Give 4 decimal places.</p>`,
        answers: [{ label: `P(X = ${k})`, value: p, decimals: 4 }],
        hint: 'Use the formula with λ equal to the average for the same time interval.',
        hintTex: 'P(X = k) = \\frac{e^{-\\lambda}\\lambda^k}{k!}',
        steps: [{ title: 'Substitute', tex: `P(X = ${k}) = \\frac{e^{-${lam}}\\,${lam}^{${k}}}{${k}!}` }, { title: 'Evaluate', tex: `\\approx ${tx(p, 6)}` }],
      };
    },
  },
  fields: [
    { name: 'lam', label: 'Average number of events λ', type: 'number', signed: false, placeholder: 'e.g. 3.5', hint: 'The mean number of events in the interval you care about (scale it if needed: 2 per minute = 120 per hour).' },
    { name: 'op', label: 'Probability', type: 'select', options: OPS },
    { name: 'k', label: 'k', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 2', row: 'k' },
    { name: 'k2', label: 'k₂', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 5', row: 'k', showWhen: { op: ['between'] } },
  ],
  examples: [
    { label: 'λ = 3, exactly 2 events', values: { lam: '3', op: 'eq', k: '2', k2: '' } },
    { label: 'λ = 4.5, at most 2', values: { lam: '4.5', op: 'le', k: '2', k2: '' } },
    { label: 'λ = 10, at least 15', values: { lam: '10', op: 'ge', k: '15', k2: '' } },
    { label: 'λ = 6, between 4 and 8', values: { lam: '6', op: 'between', k: '4', k2: '8' } },
    { label: 'Invalid: negative λ', values: { lam: '-2', op: 'eq', k: '1', k2: '' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const lam = v.number('lam', 'λ', { positive: true, maxAbs: 1e5 });
    const op = OPS.some(([o]) => o === values.op) ? values.op : 'eq';
    const k = v.whole('k', 'k', 1e6);
    const k2 = op === 'between' ? v.whole('k2', 'k₂', 1e6) : null;
    if (!v.ok()) return v.result();
    if (op === 'between' && k2 < k) return { ok: false, errors: [{ field: 'k2', message: 'k₂ must be at least k.' }] };
    const [lo, hi] = range(op, k, k2);
    const span = hi === Infinity ? lo : hi - lo;
    if (span > 200000) return { ok: false, errors: [{ field: 'k', message: 'That range is too wide to sum term by term; try a smaller k.' }] };
    const P = prob(lam, lo, hi);
    const label = { eq: `P(X = ${k})`, le: `P(X \\le ${k})`, lt: `P(X < ${k})`, ge: `P(X \\ge ${k})`, gt: `P(X > ${k})`, between: `P(${k} \\le X \\le ${k2})` }[op];
    const steps = [
      { title: 'Known values', tex: `\\lambda = ${tx(lam)}` },
      { title: 'Poisson formula', tex: 'P(X = j) = \\frac{e^{-\\lambda}\\lambda^{j}}{j!}' },
    ];
    if (op === 'eq') steps.push({ title: 'Substitute', tex: `P(X = ${k}) = \\frac{e^{-${tx(lam)}}\\,(${tx(lam)})^{${k}}}{${k}!} \\approx ${tx(P, 8)}` });
    else if (hi === Infinity) steps.push({ title: 'Use the complement (the list of j ≥ k never ends)', tex: `${label} = 1 - P(X \\le ${lo - 1}) = 1 - ${lo > 0 ? `\\sum_{j=0}^{${lo - 1}}` : '0'} P(X = j) \\approx ${tx(P, 8)}` });
    else steps.push({ title: 'Add the probabilities of each value', tex: `${label} = \\sum_{j=${lo}}^{${hi}} \\frac{e^{-${tx(lam)}}\\,${tx(lam)}^{j}}{j!} \\approx ${tx(P, 8)}` });
    const shown = hi === Infinity ? Math.min(lo + 5, lo + 5) : hi;
    const termRows = [];
    for (let j = lo; j <= Math.min(shown, lo + 9) && j <= (hi === Infinity ? -1 : hi); j++) termRows.push([String(j), fmt(pmf(lam, j), 8)]);
    if (hi === Infinity && lo > 0) for (let j = 0; j < Math.min(lo, 10); j++) termRows.push([String(j), fmt(pmf(lam, j), 8)]);
    const top = Math.max(10, Math.ceil(Math.max(lam + 4 * Math.sqrt(lam), k + 2, (k2 ?? 0) + 2)));
    const from = Math.max(0, Math.floor(lam - 4 * Math.sqrt(lam)) - 1);
    const xs = Array.from({ length: Math.min(top - from + 1, 120) }, (_, i) => from + i);
    return {
      ok: true,
      final: { tex: `${label} \\approx ${tx(P, 8)}` },
      answers: [answer('Probability', P, { primary: true, decimals: 8, irrational: true }), answer('Mean = variance = λ', lam), answer('Standard deviation √λ', Math.sqrt(lam), { irrational: true })],
      visual: { svg: plot({ x: [from - 0.8, from + xs.length - 0.2], width: 380, height: 240, title: 'Poisson distribution', bars: xs.map((j) => ({ x: j, w: 0.75, h: pmf(lam, j), cls: j >= lo && j <= hi ? 'd-bar-hi' : 'd-bar' })) }), caption: 'Highlighted bars are the outcomes included in the probability.' },
      formula: ['P(X = k) = \\frac{e^{-\\lambda}\\lambda^{k}}{k!},\\qquad E[X] = \\operatorname{Var}(X) = \\lambda'],
      steps,
      tables: termRows.length ? [{ caption: hi === Infinity ? 'Terms of the complement' : 'Terms added', headers: ['j', 'P(X = j)'], rows: termRows }] : [],
      notes: [{ kind: 'info', text: 'Assumptions: events happen one at a time, independently, at a constant average rate. λ must match the interval: if 2 calls per minute, then λ = 10 for five minutes.' }],
    };
  },
};
