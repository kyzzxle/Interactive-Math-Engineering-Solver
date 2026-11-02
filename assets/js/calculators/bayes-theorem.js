/**
 * Conditional probability and Bayes' theorem.
 *   bayes — from the prior P(A) and the likelihoods P(B|A), P(B|not A):
 *           P(B) = P(B|A)P(A) + P(B|A')P(A'),  P(A|B) = P(B|A)P(A) / P(B)
 *   joint — from P(A ∩ B) and P(B):  P(A|B) = P(A ∩ B) / P(B)
 * A probability tree and a "natural frequency" table (out of 10,000) make it concrete.
 */
import { validator, answer, fmt, tx } from '../lib/calc-kit.js';
import { parseFrac } from '../lib/fraction.js';

const pct = (x) => `${fmt(100 * x, 4)}%`;

function tree(pA, pBA, pBnA) {
  const W = 400, H = 240, r = (v) => Math.round(v * 10) / 10;
  const node = (x, y, t) => `<text class="d-label" x="${x}" y="${y}" text-anchor="start">${t}</text>`;
  const edge = (x1, y1, x2, y2, t) => `<line class="d-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><text class="d-text-muted" x="${r((x1 + x2) / 2)}" y="${r((y1 + y2) / 2 - 6)}" text-anchor="middle">${t}</text>`;
  const leaves = [[pA * pBA, 'A and B'], [pA * (1 - pBA), 'A, not B'], [(1 - pA) * pBnA, 'not A, B'], [(1 - pA) * (1 - pBnA), 'not A, not B']];
  const body = [
    edge(20, 120, 140, 60, `P(A) = ${fmt(pA, 4)}`), edge(20, 120, 140, 180, `P(A′) = ${fmt(1 - pA, 4)}`),
    node(146, 64, 'A'), node(146, 184, 'A′'),
    edge(170, 60, 270, 30, fmt(pBA, 4)), edge(170, 60, 270, 90, fmt(1 - pBA, 4)),
    edge(170, 180, 270, 150, fmt(pBnA, 4)), edge(170, 180, 270, 210, fmt(1 - pBnA, 4)),
    ...leaves.map(([p, t], i) => `<text class="${i === 0 || i === 2 ? 'd-label' : 'd-text-muted'}" x="276" y="${[34, 94, 154, 214][i]}">${t}: ${fmt(p, 5)}</text>`),
  ].join('');
  return `<svg class="diagram" viewBox="0 0 ${W} ${H}" role="img" aria-label="Probability tree"><title>Probability tree</title>${body}</svg>`;
}

export const calculator = {
  id: 'bayes-theorem',
  practice: {
    title: 'Medical test',
    generate(rand) {
      const prev = [0.01, 0.02, 0.05, 0.1][Math.floor(rand() * 4)], sens = [0.9, 0.95, 0.99][Math.floor(rand() * 3)], fp = [0.02, 0.05, 0.1][Math.floor(rand() * 3)];
      const pB = sens * prev + fp * (1 - prev), post = (sens * prev) / pB;
      return {
        prompt: `<p>A disease affects <strong>${prev * 100}%</strong> of people. A test detects it <strong>${sens * 100}%</strong> of the time, but also gives a positive result for <strong>${fp * 100}%</strong> of healthy people. If someone tests positive, what is the probability they have the disease? Give a decimal to 4 places.</p>`,
        answers: [{ label: 'P(disease | positive)', value: post, decimals: 4 }],
        hint: 'First find the total probability of a positive test (true positives + false positives), then divide the true positives by it.',
        hintTex: 'P(D \\mid +) = \\frac{P(+ \\mid D)P(D)}{P(+)}',
        steps: [
          { title: 'Total probability of a positive test', tex: `P(+) = ${sens}(${prev}) + ${fp}(${1 - prev}) = ${tx(pB, 6)}` },
          { title: 'Bayes’ theorem', tex: `P(D \\mid +) = \\frac{${sens}(${prev})}{${tx(pB, 6)}} \\approx ${tx(post, 4)}` },
        ],
      };
    },
  },
  fields: [
    { name: 'mode', label: 'What do you know?', type: 'radio', options: [['bayes', 'P(A), P(B | A) and P(B | not A)'], ['joint', 'P(A and B) and P(B)']] },
    { name: 'pA', label: 'P(A) — the prior', type: 'text', placeholder: 'e.g. 0.01 or 1%', showWhen: { mode: ['bayes'] }, hint: 'Decimals, fractions such as 1/100, or percentages such as 1%.' },
    { name: 'pBA', label: 'P(B | A)', type: 'text', placeholder: 'e.g. 0.95', row: 'lk', showWhen: { mode: ['bayes'] }, rowShowWhen: { mode: ['bayes'] } },
    { name: 'pBnA', label: 'P(B | not A)', type: 'text', placeholder: 'e.g. 0.05', row: 'lk', showWhen: { mode: ['bayes'] } },
    { name: 'pAB', label: 'P(A and B)', type: 'text', placeholder: 'e.g. 0.12', row: 'jt', showWhen: { mode: ['joint'] }, rowShowWhen: { mode: ['joint'] } },
    { name: 'pB', label: 'P(B)', type: 'text', placeholder: 'e.g. 0.3', row: 'jt', showWhen: { mode: ['joint'] } },
  ],
  examples: [
    { label: 'Medical test: 1% prevalence, 95% / 5%', values: { mode: 'bayes', pA: '1%', pBA: '0.95', pBnA: '0.05' } },
    { label: 'Spam filter: 40% spam, word in 30% / 2%', values: { mode: 'bayes', pA: '0.4', pBA: '0.3', pBnA: '0.02' } },
    { label: 'Joint: P(A and B) = 0.12, P(B) = 0.3', values: { mode: 'joint', pAB: '0.12', pB: '0.3' } },
    { label: 'Impossible: P(A and B) > P(B)', values: { mode: 'joint', pAB: '0.5', pB: '0.3' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const prob = (name, label) => {
      let raw = String(values[name] ?? '').trim();
      const percent = raw.endsWith('%');
      if (percent) raw = raw.slice(0, -1).trim();
      if (!raw) { v.fail(name, `Enter ${label}.`); return null; }
      const f = parseFrac(raw);
      if (!f) { v.fail(name, `${label} must be a number such as 0.25, a fraction such as 1/4, or a percentage such as 25%.`); return null; }
      let x = f.toNumber();
      if (percent) x /= 100;
      if (!(x >= 0 && x <= 1)) { v.fail(name, `${label} must be between 0 and 1 (or 0% and 100%).`); return null; }
      return x;
    };
    if (values.mode === 'joint') {
      const pAB = prob('pAB', 'P(A and B)'), pB = prob('pB', 'P(B)');
      if (!v.ok()) return v.result();
      if (pB === 0) return { ok: false, errors: [{ field: 'pB', message: 'P(B) cannot be 0: you cannot condition on an event that never happens.' }] };
      if (pAB > pB + 1e-12) return { ok: false, errors: [{ field: 'pAB', message: 'P(A and B) cannot be larger than P(B), because "A and B" is part of B.' }] };
      const r = pAB / pB;
      return {
        ok: true,
        final: { tex: `P(A \\mid B) = ${tx(r, 6)}` },
        answers: [answer('P(A | B)', r, { primary: true, decimals: 8 }), answer('As a percentage', 100 * r, { unit: '%', decimals: 6 })],
        formula: ['P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}'],
        steps: [
          { title: 'Known values', tex: `P(A \\cap B) = ${tx(pAB, 6)},\\quad P(B) = ${tx(pB, 6)}` },
          { title: 'Definition of conditional probability', tex: 'P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}' },
          { title: 'Substitute', tex: `P(A \\mid B) = \\frac{${tx(pAB, 6)}}{${tx(pB, 6)}} = ${tx(r, 6)}` },
        ],
        notes: [{ kind: 'info', text: 'Knowing that B happened shrinks the sample space to B; P(A | B) is the share of B in which A also happens.' }],
      };
    }
    const pA = prob('pA', 'P(A)'), pBA = prob('pBA', 'P(B | A)'), pBnA = prob('pBnA', 'P(B | not A)');
    if (!v.ok()) return v.result();
    const pB = pBA * pA + pBnA * (1 - pA);
    if (pB === 0) return { ok: false, errors: [{ field: 'pBA', message: 'With these values B can never happen (P(B) = 0), so P(A | B) is not defined.' }] };
    const post = (pBA * pA) / pB;
    const N = 10000;
    const tp = pA * N * pBA, fpN = (1 - pA) * N * pBnA;
    return {
      ok: true,
      final: { tex: `P(A \\mid B) = \\frac{${tx(pBA * pA, 6)}}{${tx(pB, 6)}} \\approx ${tx(post, 6)}` },
      answers: [answer('P(A | B) — the posterior', post, { primary: true, decimals: 8, irrational: true }), answer('P(B) — total probability', pB, { decimals: 8 }), answer('P(not A | B)', 1 - post, { decimals: 8, irrational: true })],
      visual: { svg: tree(pA, pBA, pBnA), caption: `Out of ${N.toLocaleString('en-US')} cases: about ${fmt(tp, 1)} are "A and B" and ${fmt(fpN, 1)} are "not A, but B". Only ${pct(post)} of the B cases are also A.` },
      formula: ['P(A \\mid B) = \\frac{P(B \\mid A)\\,P(A)}{P(B \\mid A)\\,P(A) + P(B \\mid A^\\prime)\\,P(A^\\prime)}'],
      steps: [
        { title: 'Known values', tex: `P(A) = ${tx(pA, 6)},\\quad P(B \\mid A) = ${tx(pBA, 6)},\\quad P(B \\mid A^\\prime) = ${tx(pBnA, 6)}` },
        { title: 'Complement', tex: `P(A^\\prime) = 1 - ${tx(pA, 6)} = ${tx(1 - pA, 6)}` },
        { title: 'Total probability of B (both branches of the tree)', tex: `P(B) = ${tx(pBA, 6)}(${tx(pA, 6)}) + ${tx(pBnA, 6)}(${tx(1 - pA, 6)}) = ${tx(pB, 6)}` },
        { title: 'Bayes’ theorem', tex: `P(A \\mid B) = \\frac{${tx(pBA, 6)}(${tx(pA, 6)})}{${tx(pB, 6)}} \\approx ${tx(post, 6)}` },
      ],
      tables: [{ caption: `Natural frequencies (out of ${N.toLocaleString('en-US')})`, headers: ['', 'B', 'not B', 'Total'], rows: [['A', fmt(tp, 2), fmt(pA * N - tp, 2), fmt(pA * N, 2)], ['not A', fmt(fpN, 2), fmt((1 - pA) * N - fpN, 2), fmt((1 - pA) * N, 2)], ['Total', fmt(tp + fpN, 2), fmt(N - tp - fpN, 2), String(N)]] }],
      notes: [{ kind: 'warn', text: 'Common mistake: confusing P(B | A) with P(A | B). A test that catches 95% of cases can still be wrong most of the time it says "positive" when the condition is rare.' }],
    };
  },
};
