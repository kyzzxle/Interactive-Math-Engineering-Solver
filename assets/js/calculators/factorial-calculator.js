/**
 * n! exactly (BigInt, binary splitting) for n ≤ 40,000; larger n (up to 10⁹) in scientific notation
 * via Stirling's series. Also: number of digits, trailing zeros (Legendre's formula), Stirling estimate.
 */
import { validator } from '../lib/calc-kit.js';
import { factorial, log10Factorial, scientificFromBigInt, scientificFromLog10, groupDigits } from '../lib/bigint.js';
import { escapeHtml } from '../lib/ui.js';

import { arrangementsExplore, countingPractice } from '../explore/data.js';
export const EXACT_LIMIT = 40000;

export function trailingZeros(n) {
  let z = 0;
  for (let p = 5; p <= n; p *= 5) z += Math.floor(n / p);
  return z;
}

export const calculator = {
  id: 'factorial-calculator',
  explore: arrangementsExplore,
  practice: countingPractice,
  fields: [{ name: 'n', label: 'n', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 20', hint: 'A whole number from 0 to 1,000,000,000. Exact digits are shown up to n = 40,000.' }],
  examples: [
    { label: '5!', values: { n: '5' } },
    { label: '20!', values: { n: '20' } },
    { label: '100! (158 digits)', values: { n: '100' } },
    { label: '1,000,000! (approximate)', values: { n: '1000000' } },
  ],
  solve(values) {
    const v = validator(values);
    const n = v.whole('n', 'n', 1e9);
    if (!v.ok()) return v.result();
    const steps = [];
    const expansion = n <= 12 ? (n <= 1 ? '1' : Array.from({ length: n }, (_, i) => n - i).join(' \\times ')) : `${n} \\times ${n - 1} \\times ${n - 2} \\times \\cdots \\times 2 \\times 1`;
    steps.push({ title: 'Definition', text: n <= 1 ? `By definition ${n}! = 1 (0! = 1 because there is exactly one way to arrange nothing).` : `n! is the product of every whole number from ${n} down to 1.`, tex: `${n}! = ${expansion}` });
    const zeros = trailingZeros(n);
    let answers, final, extra = '';
    if (n <= EXACT_LIMIT) {
      const big = factorial(n);
      const s = big.toString();
      const sci = scientificFromBigInt(big, 6);
      const short = s.length <= 30;
      steps.push({ title: 'Multiply', text: short ? undefined : `The result has ${s.length.toLocaleString('en-US')} digits, so it is shown in scientific notation here; every digit is available below the results.`, tex: short ? `${n}! = ${groupDigits(s).replace(/,/g, '{,}')}` : `${n}! \\approx ${sci.mantissa} \\times 10^{${sci.exponent}}` });
      answers = [
        { label: `${n}!`, value: short ? groupDigits(s) : `≈ ${sci.mantissa} × 10^${sci.exponent}`, approx: !short, primary: true, copy: s },
        { label: 'Number of digits', value: s.length.toLocaleString('en-US') },
        { label: 'Trailing zeros', value: zeros.toLocaleString('en-US') },
      ];
      final = { tex: short ? `${n}! = ${groupDigits(s).replace(/,/g, '{,}')}` : `${n}! \\approx ${sci.mantissa} \\times 10^{${sci.exponent}}` };
      if (!short) extra = `<details class="mt-3"><summary class="cursor-pointer text-sm font-semibold text-indigo-600 dark:text-indigo-400">Show all ${s.length.toLocaleString('en-US')} digits</summary><div class="big-number mt-2">${escapeHtml(groupDigits(s))}</div></details>`;
    } else {
      const lg = log10Factorial(n);
      const sci = scientificFromLog10(lg, 6);
      steps.push({ title: "Estimate with Stirling's series", text: `n! has about ${Math.floor(lg + 1).toLocaleString('en-US')} digits — too many to compute exactly in a browser — so log₁₀(n!) is computed from Stirling's series and converted to scientific notation.`, texLines: ['\\ln n! \\approx n\\ln n - n + \\tfrac{1}{2}\\ln(2\\pi n) + \\frac{1}{12n} - \\cdots', `${n}! \\approx ${sci.mantissa} \\times 10^{${sci.exponent}}`] });
      answers = [
        { label: `${n}!`, value: `≈ ${sci.mantissa} × 10^${sci.exponent.toLocaleString('en-US')}`, approx: true, primary: true },
        { label: 'Number of digits', value: Math.floor(lg + 1).toLocaleString('en-US') },
        { label: 'Trailing zeros', value: zeros.toLocaleString('en-US') },
      ];
      final = { tex: `${n}! \\approx ${sci.mantissa} \\times 10^{${sci.exponent}}` };
    }
    if (n >= 5) steps.push({ title: "Trailing zeros (Legendre's formula)", text: 'Each trailing zero needs a factor 10 = 2 × 5, and factors of 5 are the scarcer ones, so count the multiples of 5, 25, 125, …', tex: `\\left\\lfloor \\frac{${n}}{5} \\right\\rfloor + \\left\\lfloor \\frac{${n}}{25} \\right\\rfloor + \\cdots = ${zeros}` });
    return {
      ok: true, final, answers, steps,
      visual: extra ? { svg: extra } : undefined,
      formula: ['n! = n \\times (n - 1) \\times \\cdots \\times 2 \\times 1, \\qquad 0! = 1'],
      notes: [{ kind: 'info', text: `${n}! counts the ways to arrange ${n} different objects in a row.` }],
      rounding: n <= EXACT_LIMIT ? 'The value is exact (computed with arbitrary-size integers).' : 'Shown in scientific notation; the mantissa is accurate to the digits displayed.',
    };
  },
};
