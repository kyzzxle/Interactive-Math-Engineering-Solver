/**
 * Arithmetic and geometric sequences and series.
 *   arithmetic: aₙ = a₁ + (n − 1)d,  Sₙ = n(a₁ + aₙ)/2
 *   geometric:  aₙ = a₁ rⁿ⁻¹,  Sₙ = a₁(1 − rⁿ)/(1 − r) (r ≠ 1),  S∞ = a₁/(1 − r) for |r| < 1
 * Exact with fractions where the numbers stay manageable.
 */
import { validator, answer, fracAnswer, fmt, tx } from '../lib/calc-kit.js';
import { plot } from '../lib/plot.js';
import { randInt } from '../lib/learn.js';
import { withNotes } from '../lib/step-notes.js';
import { Frac as __F } from '../lib/fraction.js';

export const calculator = {
  id: 'arithmetic-geometric-sequences',
  explore: {
    title: 'Watch a series add up',
    intro: 'Bars are the terms; the line is the running total. For a geometric series with |r| < 1 the total levels off at a₁/(1 − r).',
    controls: [
      { name: 'type', label: 'Sequence', type: 'select', options: [['geo', 'Geometric'], ['ari', 'Arithmetic']], value: 'geo' },
      { name: 'a1', label: 'First term a₁', min: -5, max: 10, step: 0.5, value: 8 },
      { name: 'k', label: 'Ratio r (geometric) or difference d (arithmetic)', min: -2, max: 2, step: 0.05, value: 0.5 },
      { name: 'n', label: 'Number of terms n', min: 1, max: 20, step: 1, value: 10 },
    ],
    presets: [{ label: 'Halving: 8, 4, 2, …', values: { type: 'geo', a1: 8, k: 0.5 } }, { label: 'Alternating r = −0.8', values: { type: 'geo', a1: 8, k: -0.8 } }, { label: 'Growing r = 1.3', values: { type: 'geo', a1: 1, k: 1.3 } }],
    render({ type, a1, k, n }) {
      const terms = Array.from({ length: n }, (_, i) => (type === 'geo' ? a1 * k ** i : a1 + i * k));
      let s = 0; const sums = terms.map((t) => (s += t));
      const conv = type === 'geo' && Math.abs(k) < 1;
      return {
        svg: plot({ x: [0, n + 1], width: 400, height: 260, title: 'Terms and partial sums', bars: terms.map((t, i) => ({ x: i + 1, w: 0.7, h: t })), segments: sums.slice(1).map((v, i) => ({ x1: i + 1, y1: sums[i], x2: i + 2, y2: v, cls: 'd-line2' })), hlines: conv ? [{ y: a1 / (1 - k), cls: 'd-line3', label: 'S∞' }] : [], points: [{ x: n, y: sums[n - 1], cls: 'd-point2' }] }),
        readouts: [
          { label: `Term a${n}`.replace(/\d+$/, (d) => d.split('').map((c) => '₀₁₂₃₄₅₆₇₈₉'[c]).join('')), tex: `${tx(terms[n - 1], 4)}` },
          { label: 'Sum of these terms', tex: `S_{${n}} \\approx ${tx(sums[n - 1], 4)}`, tone: 'good' },
          { label: 'Infinite sum', text: conv ? `converges to ${fmt(a1 / (1 - k), 4)}` : type === 'geo' ? 'diverges (|r| ≥ 1)' : (a1 === 0 && k === 0 ? 'every term is 0' : 'diverges') },
        ],
      };
    },
  },
  practice: {
    title: 'Arithmetic sequence',
    generate(rand) {
      const a1 = randInt(rand, -10, 15), d = randInt(rand, -6, 8) || 3, n = randInt(rand, 8, 40);
      const an = a1 + (n - 1) * d;
      return {
        prompt: `<p>An arithmetic sequence starts <strong>${a1}, ${a1 + d}, ${a1 + 2 * d}, …</strong> Find the ${n}th term and the sum of the first ${n} terms.</p>`,
        answers: [{ label: `a${n}`, value: an, int: true }, { label: `S${n}`, value: (n * (a1 + an)) / 2, int: true }],
        hint: 'The common difference is the second term minus the first. Then use aₙ = a₁ + (n − 1)d and Sₙ = n(a₁ + aₙ)/2.',
        steps: [
          { title: 'Common difference', tex: `d = ${a1 + d} - ${a1 < 0 ? `(${a1})` : a1} = ${d}` },
          { title: 'nth term', tex: `a_{${n}} = ${a1} + (${n} - 1)(${d}) = ${an}` },
          { title: 'Sum', tex: `S_{${n}} = \\frac{${n}(${a1} + ${an})}{2} = ${(n * (a1 + an)) / 2}` },
        ],
      };
    },
  },
  fields: [
    { name: 'type', label: 'Sequence type', type: 'radio', options: [['ari', 'Arithmetic (add d)'], ['geo', 'Geometric (multiply by r)']] },
    { name: 'a1', label: 'First term a₁', type: 'text', placeholder: 'e.g. 3' },
    { name: 'd', label: 'Common difference d', type: 'text', placeholder: 'e.g. 4', showWhen: { type: ['ari'] } },
    { name: 'r', label: 'Common ratio r', type: 'text', placeholder: 'e.g. 1/2', showWhen: { type: ['geo'] } },
    { name: 'n', label: 'Number of terms n', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 10', hint: 'A whole number from 1 to 100,000.' },
  ],
  examples: [
    { label: 'Arithmetic: 3, 7, 11, … (n = 20)', values: { type: 'ari', a1: '3', d: '4', n: '20' } },
    { label: 'Geometric: 5, 10, 20, … (n = 8)', values: { type: 'geo', a1: '5', r: '2', n: '8' } },
    { label: 'Geometric with r = 1/2 (converges)', values: { type: 'geo', a1: '8', r: '1/2', n: '6' } },
    { label: 'Geometric with r = 1', values: { type: 'geo', a1: '4', r: '1', n: '10' } },
    { label: 'Invalid: n = 0', values: { type: 'ari', a1: '3', d: '4', n: '0' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const geo = values.type === 'geo';
    const a1 = v.frac('a1', 'the first term');
    const k = geo ? v.frac('r', 'the common ratio') : v.frac('d', 'the common difference');
    const n = v.whole('n', 'n', 100000, 1);
    if (!v.ok()) return v.result();
    const steps = [{ title: 'Known values', tex: `a_1 = ${a1.toTex()},\\quad ${geo ? 'r' : 'd'} = ${k.toTex()},\\quad n = ${n}` }];
    const show = Math.min(n, 8);
    const first = [];
    if (!geo) {
      for (let i = 0; i < show; i++) first.push(a1.add(k.mul(i)));
      const an = a1.add(k.mul(n - 1));
      const Sn = an.add(a1).mul(n).div(2);
      steps.push({ title: 'nth term', texLines: ['a_n = a_1 + (n - 1)d', `a_{${n}} = ${a1.toTex()} + (${n} - 1)(${k.toTex()}) = ${an.toTex()}`] });
      steps.push({ title: 'Sum of n terms (average of first and last, times n)', texLines: ['S_n = \\frac{n\\,(a_1 + a_n)}{2}', `S_{${n}} = \\frac{${n}\\,(${a1.toTex()} + ${an.toTex()})}{2} = ${Sn.toTex()}`] });
      return out(an, Sn, null, 'The sum of an infinite arithmetic series diverges unless every term is 0.');
    }
    const ratio = k.toNumber();
    if (a1.isZero()) steps.push({ title: 'First term is 0', text: 'Every term is 0.' });
    const exactOk = n <= 200 && k.n.toString().length * n < 2000 && k.d.toString().length * n < 2000;
    for (let i = 0; i < show; i++) first.push(exactOk ? a1.mul(k.pow(i)) : null);
    if (exactOk) {
      const an = a1.mul(k.pow(n - 1));
      const Sn = k.isOne() ? a1.mul(n) : a1.mul(k.pow(n).neg().add(1)).div(k.neg().add(1));
      steps.push({ title: 'nth term', texLines: ['a_n = a_1\\, r^{\\,n - 1}', `a_{${n}} = ${a1.toTex()} \\cdot \\left(${k.toTex()}\\right)^{${n - 1}} = ${an.toTex()}`] });
      steps.push(k.isOne() ? { title: 'Sum with r = 1 (every term equals a₁)', tex: `S_{${n}} = n\\,a_1 = ${Sn.toTex()}` } : { title: 'Sum of n terms', texLines: ['S_n = \\frac{a_1\\,(1 - r^n)}{1 - r}', `S_{${n}} = \\frac{${a1.toTex()}\\left(1 - \\left(${k.toTex()}\\right)^{${n}}\\right)}{1 - ${k.sign() < 0 ? `(${k.toTex()})` : k.toTex()}} = ${Sn.toTex()}`] });
      return out(an, Sn, ratio);
    }
    const anN = a1.toNumber() * ratio ** (n - 1);
    const SnN = ratio === 1 ? a1.toNumber() * n : (a1.toNumber() * (1 - ratio ** n)) / (1 - ratio);
    if (!Number.isFinite(anN) || !Number.isFinite(SnN) || Math.abs(SnN) > 1e300) return { ok: false, errors: [{ field: 'n', message: 'The terms grow too large to compute for this many terms. Try a smaller n.' }] };
    steps.push({ title: 'nth term (decimal: the exact fraction is too long)', tex: `a_{${n}} = a_1 r^{${n - 1}} \\approx ${tx(anN)}` });
    steps.push({ title: 'Sum of n terms', tex: `S_{${n}} = \\frac{a_1 (1 - r^{${n}})}{1 - r} \\approx ${tx(SnN)}` });
    return out(null, null, ratio, '', anN, SnN);

    function out(an, Sn, r, note, anN2, SnN2) {
      const answers = [
        an ? fracAnswer(`Term a${n}`, an, { primary: true }) : answer(`Term a${n}`, anN2, { primary: true, irrational: true }),
        Sn ? fracAnswer(`Sum S${n}`, Sn, { primary: true }) : answer(`Sum S${n}`, SnN2, { primary: true, irrational: true }),
      ];
      const notes = [];
      if (r !== null && geo) {
        if (Math.abs(r) < 1) {
          const Sinf = a1.div(k.neg().add(1));
          steps.push({ title: 'Infinite sum (|r| < 1, so rⁿ → 0)', texLines: ['S_\\infty = \\frac{a_1}{1 - r}', `S_\\infty = \\frac{${a1.toTex()}}{1 - ${k.sign() < 0 ? `(${k.toTex()})` : k.toTex()}} = ${Sinf.toTex()}`] });
          answers.push(fracAnswer('Infinite sum S∞', Sinf));
        } else notes.push({ kind: 'info', text: '|r| ≥ 1, so the infinite geometric series does not converge.' });
      }
      if (note) notes.push({ kind: 'info', text: note });
      const shown = first.filter((x) => x !== null);
      const nums = shown.map((x) => x.toNumber());
      let s = 0; const sums = nums.map((t) => (s += t));
      return {
        ok: true,
        final: { texLines: [`a_{${n}} ${an ? `= ${an.toTex()}` : `\\approx ${tx(anN2)}`}`, `S_{${n}} ${Sn ? `= ${Sn.toTex()}` : `\\approx ${tx(SnN2)}`}`] },
        answers,
        visual: nums.length ? { svg: plot({ x: [0, nums.length + 1], width: 380, height: 240, title: 'First terms (bars) and running total (line)', bars: nums.map((t, i) => ({ x: i + 1, w: 0.7, h: t })), segments: sums.slice(1).map((y, i) => ({ x1: i + 1, y1: sums[i], x2: i + 2, y2: y, cls: 'd-line2' })) }), caption: `The first ${nums.length} terms: ${shown.map((x) => x.toString()).join(', ')}${n > nums.length ? ', …' : ''}` } : undefined,
        formula: [geo ? 'a_n = a_1 r^{\\,n-1} \\qquad S_n = \\frac{a_1(1 - r^n)}{1 - r} \\qquad S_\\infty = \\frac{a_1}{1 - r}\\ (|r| < 1)' : 'a_n = a_1 + (n - 1)d \\qquad S_n = \\frac{n(a_1 + a_n)}{2}'],
        steps,
        notes,
      };
    }
  },
};

// Explanations for each step, and a final check.
withNotes(calculator, {
  'Known values': 'Arithmetic: add the same difference d each time. Geometric: multiply by the same ratio r.',
  'nth term': 'The first term is a₁, so the nth term is n − 1 steps further on.',
  'Sum of n terms (average': 'Pair the first and last terms, the second and second-to-last, and so on: every pair has the same sum.',
  'Sum of n terms': 'Multiply the sum by r and subtract it from the original: almost every term cancels.',
  'Infinite sum': 'When |r| < 1 the terms shrink towards 0 and the partial sums approach a limit.',
  'Sum with r = 1': 'Every term equals a₁, so the sum is n copies of it.',
}, (r, values) => {
  const n = Number(values.n); if (!Number.isInteger(n) || n < 2 || n > 2000) return;
  const geo = values.type === 'geo', a1 = __F.of(String(values.a1).trim()), k = __F.of(String(geo ? values.r : values.d).trim());
  const an = geo ? a1.mul(k.pow(n - 1)) : a1.add(k.mul(n - 1));
  if (an.n.toString().length > 40 || an.d.toString().length > 40) return;
  if (!geo) { const S = a1.mul(2).add(k.mul(n - 1)).mul(n).div(2); r.steps.push({ title: 'Check with the other sum formula', tex: `S_{${n}} = \\frac{n}{2}\\left[2a_1 + (n - 1)d\\right] = \\frac{${n}}{2}\\left[2(${a1.toTex()}) + ${n - 1}(${k.toTex()})\\right] = ${S.toTex()}\\ \\checkmark`, note: 'Substituting aₙ = a₁ + (n − 1)d into the pairing formula gives this version; both must agree.' }); return; }
  if (k.isOne()) return;
  const S = a1.sub(an.mul(k)).div(__F.of(1).sub(k));
  r.steps.push({ title: 'Check with the other sum formula', tex: `S_{${n}} = \\frac{a_1 - a_n r}{1 - r} = \\frac{${a1.toTex()} - \\left(${an.toTex()}\\right)\\left(${k.toTex()}\\right)}{1 - \\left(${k.toTex()}\\right)} = ${S.toTex()}\\ \\checkmark`, note: 'This version uses the last term instead of rⁿ; both formulas must agree.' });
});
