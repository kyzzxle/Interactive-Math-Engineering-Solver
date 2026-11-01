/**
 * Circular permutations: arrangements of n distinct objects around a circle, where rotations of the
 * same arrangement are identical — (n − 1)!. If mirror images are also identical (a necklace or key
 * ring that can be flipped), divide by 2 for n ≥ 3. Choosing r of n objects for the circle: P(n, r)/r.
 */
import { validator } from '../lib/calc-kit.js';
import { factorial, fallingFactorial, groupDigits, scientificFromBigInt } from '../lib/bigint.js';
import { plot } from '../lib/plot.js';

export const calculator = {
  id: 'circular-permutations',
  fields: [
    { name: 'n', label: 'Number of distinct objects n', type: 'number', inputmode: 'numeric', placeholder: 'e.g. 6', row: 'nr' },
    { name: 'r', label: 'Placed around the circle r (optional)', type: 'number', inputmode: 'numeric', placeholder: 'all n', row: 'nr' },
    { name: 'flip', label: 'Are mirror images the same?', type: 'radio', options: [['no', 'No — e.g. people at a table'], ['yes', 'Yes — e.g. beads on a necklace']] },
  ],
  examples: [
    { label: '6 people at a round table', values: { n: '6', r: '', flip: 'no' } },
    { label: 'Necklace of 8 different beads', values: { n: '8', r: '', flip: 'yes' } },
    { label: 'Seat 4 of 10 people at a round table', values: { n: '10', r: '4', flip: 'no' } },
  ],
  solve(values) {
    const v = validator(values);
    const n = v.whole('n', 'n', 20000, 1);
    const rRaw = String(values.r ?? '').trim();
    const r = rRaw ? v.whole('r', 'r', 20000, 1) : n;
    if (!v.ok()) return v.result();
    if (r > n) return { ok: false, errors: [{ field: 'r', message: `You cannot place ${r} objects when only ${n} are available.` }] };
    const flip = values.flip === 'yes';
    const steps = [{ title: 'Identify the problem', text: `Arrange ${r === n ? 'all ' : ''}${r} of ${n} distinct objects around a circle${flip ? ' that can be turned over (a necklace or key ring)' : ''}. Only the order around the circle matters, not where the circle starts.`, tex: `n = ${n},\\quad r = ${r}` }];
    let count, formulaTex;
    if (r === n) {
      count = n === 1 ? 1n : factorial(n - 1);
      steps.push({ title: 'Fix one object to remove rotations', text: `Rotating everyone one seat gives the same circular arrangement. Fix one object in place; the remaining ${n - 1} can then be arranged in a row.`, tex: `(n - 1)! = ${n - 1}! ${count.toString().length <= 24 ? `= ${groupDigits(count.toString()).replace(/,/g, '{,}')}` : ''}` });
      formulaTex = '(n - 1)!';
    } else {
      const P = fallingFactorial(n, r);
      count = P / BigInt(r);
      steps.push({ title: 'Choose and order r objects in a row', tex: `P(${n}, ${r}) = \\frac{${n}!}{${n - r}!} ${P.toString().length <= 24 ? `= ${groupDigits(P.toString()).replace(/,/g, '{,}')}` : ''}` });
      steps.push({ title: 'Divide by r for the rotations', text: `Each circular arrangement of ${r} objects appears ${r} times among the row arrangements (once for each rotation).`, tex: `\\frac{P(${n}, ${r})}{${r}} ${count.toString().length <= 24 ? `= ${groupDigits(count.toString()).replace(/,/g, '{,}')}` : ''}` });
      formulaTex = '\\frac{P(n, r)}{r}';
    }
    if (flip) {
      if (r >= 3) {
        count /= 2n;
        steps.push({ title: 'Divide by 2 for mirror images', text: 'Turning a necklace over reverses the order, so each arrangement and its mirror image are the same. For 3 or more objects they are always different arrangements of the circle, so every necklace was counted twice.', tex: `\\text{result} = ${count.toString().length <= 24 ? groupDigits(count.toString()).replace(/,/g, '{,}') : '\\dots'}` });
        formulaTex = `\\frac{${formulaTex}}{2}`;
      } else {
        steps.push({ title: 'Mirror images', text: 'With fewer than 3 objects an arrangement is its own mirror image, so there is nothing to divide by.' });
      }
    }
    const s = count.toString();
    const short = s.length <= 24;
    const sci = scientificFromBigInt(count, 6);
    // diagram of a seating
    let visual;
    if (r <= 12) {
      const pts = Array.from({ length: r }, (_, i) => { const t = Math.PI / 2 - (2 * Math.PI * i) / r; return { x: Math.cos(t), y: Math.sin(t), label: String.fromCharCode(65 + i), cls: i === 0 ? 'd-foot' : 'd-point' }; });
      visual = { svg: plot({ x: [-1.5, 1.5], y: [-1.4, 1.4], equal: true, circles: [{ cx: 0, cy: 0, r: 1, cls: 'd-line' }], points: pts, title: 'One circular arrangement; the highlighted object is the fixed reference' }), caption: 'Rotating the labels around the circle does not create a new arrangement — that is why one object can be fixed.' };
    }
    return {
      ok: true,
      final: { tex: short ? `${formulaTex} = ${groupDigits(s).replace(/,/g, '{,}')}` : `${formulaTex} \\approx ${sci.mantissa} \\times 10^{${sci.exponent}}` },
      answers: [
        { label: 'Circular arrangements', value: short ? groupDigits(s) : `≈ ${sci.mantissa} × 10^${sci.exponent}`, approx: !short, primary: true, copy: s },
        { label: 'Formula used', valueTex: formulaTex },
        { label: 'Arrangements in a straight line', value: (() => { const line = r === n ? factorial(n) : fallingFactorial(n, r); const t = line.toString(); return t.length <= 24 ? groupDigits(t) : `${t.length} digits`; })() },
      ],
      visual, steps,
      formula: ['(n - 1)! \\qquad \\frac{(n - 1)!}{2} \\text{ (mirror images identical)} \\qquad \\frac{P(n, r)}{r}'],
      rounding: short ? 'Exact whole-number answer.' : 'Exact value available with the Copy button.',
    };
  },
};
