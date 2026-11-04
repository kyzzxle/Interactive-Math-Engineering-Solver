/**
 * Linear equation in one variable, e.g. 3x + 5 = 2x − 7 or 2(x − 3) + 4 = 5x − 1/2.
 * Both sides are expanded exactly; the equation must reduce to a·x + b = 0.
 */
import { validator, fp, formatNumber } from '../lib/calc-kit.js';
import { parse, toPoly, polyToNode, texOf, textOf, ExprError } from '../lib/expr.js';
import { Frac } from '../lib/fraction.js';
import { plot, windowAround } from '../lib/plot.js';
import { linearExplore, linearPractice } from '../explore/algebra-practice.js';
import { withNotes } from '../lib/step-notes.js';

export const calculator = {
  id: 'linear-equation-solver',
  explore: linearExplore,
  practice: linearPractice,
  fields: [
    { name: 'eq', label: 'Equation in x', type: 'text', placeholder: 'e.g. 3x + 5 = 2x - 7', hint: 'Use x as the variable. Brackets, fractions (1/2) and decimals are allowed.' },
  ],
  examples: [
    { label: '3x + 5 = 2x − 7', values: { eq: '3x + 5 = 2x - 7' } },
    { label: '2(x − 3) + 4 = 5x − 11', values: { eq: '2(x - 3) + 4 = 5x - 11' } },
    { label: 'x/2 + 1/3 = 3/4', values: { eq: 'x/2 + 1/3 = 3/4' } },
    { label: 'No solution: 2(x + 1) = 2x + 5', values: { eq: '2(x + 1) = 2x + 5' } },
  ],
  solve(values) {
    const v = validator(values);
    const src = v.text('eq', 'an equation');
    if (!v.ok()) return v.result();
    const sides = src.split('=');
    if (sides.length !== 2 || !sides[0].trim() || !sides[1].trim()) return { ok: false, errors: [{ field: 'eq', message: 'Write one equation with a single "=" sign and an expression on each side, for example 3x + 5 = 2x - 7.' }] };
    let L, R;
    try { L = parse(sides[0]); R = parse(sides[1]); } catch (e) {
      if (e instanceof ExprError) return { ok: false, errors: [{ field: 'eq', message: e.message }] };
      throw e;
    }
    const pl = toPoly(L), pr = toPoly(R);
    if (!pl || !pr) return { ok: false, errors: [{ field: 'eq', message: 'Each side must be a polynomial in x (no x in denominators, roots or functions). This solver handles linear equations.' }] };
    const zero = new Frac(0n);
    const a1 = pl[1] || zero, b1 = pl[0] || zero, a2 = pr[1] || zero, b2 = pr[0] || zero;
    if (pl.length > 2 || pr.length > 2) {
      const diff = Math.max(pl.length, pr.length);
      let cancels = true;
      for (let i = 2; i < diff; i++) if (!(pl[i] || zero).eq(pr[i] || zero)) cancels = false;
      if (!cancels) return { ok: false, errors: [{ field: 'eq', message: 'This equation contains x² or a higher power that does not cancel, so it is not linear. Try the quadratic equation solver.' }] };
    }
    const a = a1.sub(a2), b = b2.sub(b1);
    const lt = texOf(polyToNode([b1, a1])), rt = texOf(polyToNode([b2, a2]));
    const steps = [
      { title: 'Write the equation', tex: `${texOf(L)} = ${texOf(R)}` },
      { title: 'Expand and simplify each side', tex: `${lt} = ${rt}` },
      { title: 'Collect x-terms on the left and numbers on the right', text: 'Subtract the right-hand x-term from both sides and the left-hand constant from both sides.', texLines: [`${fp(a1)}x - ${fp(a2)}x = ${fp(b2)} - ${fp(b1)}`, `${a.isZero() ? '0' : `${a.isOne() ? '' : a.eq(-1) ? '-' : a.toTex()}x`} = ${b.toTex()}`] },
    ];
    const graph = (sol) => plot({
      x: windowAround(sol !== null ? [sol.toNumber(), 0] : [0], 5),
      curves: [{ f: (x) => a1.toNumber() * x + b1.toNumber(), cls: 'd-line' }, { f: (x) => a2.toNumber() * x + b2.toNumber(), cls: 'd-line2' }],
      points: sol !== null ? [{ x: sol.toNumber(), y: a1.toNumber() * sol.toNumber() + b1.toNumber(), label: `x = ${sol}`, cls: 'd-foot' }] : [],
      title: 'Each side of the equation graphed as a line',
    });
    const legend = '<div class="legend"><span><i></i>Left side</span><span><i class="l2"></i>Right side</span></div>';
    if (a.isZero()) {
      const all = b.isZero();
      steps.push({ title: all ? 'Identity: true for every x' : 'Contradiction: no x works', text: all ? 'Both sides are the same expression, so every real number is a solution.' : `The x-terms cancel and leave 0 = ${b}, which is false. The equation has no solution.` });
      return {
        ok: true,
        final: { text: all ? 'Infinitely many solutions: every real number x satisfies the equation.' : 'No solution: the equation is never true.' },
        answers: [{ label: 'Solution', value: all ? 'All real numbers' : 'No solution', primary: true }],
        visual: { svg: graph(null), legend, caption: all ? 'The two sides are the same line.' : 'The two sides are parallel lines that never meet.' },
        steps,
        formula: ['ax + b = cx + d \\;\\Rightarrow\\; x = \\frac{d - b}{a - c}'],
        rounding: false,
      };
    }
    const x = b.div(a);
    steps.push({ title: `Divide both sides by ${a}`, texLines: [`x = \\frac{${b.toTex()}}{${a.toTex()}}`, `x = ${x.toTex()}`] });
    const chk = (p) => polyToNode([p[0] || zero, p[1] || zero]);
    const lv = (pl[0] || zero).add((pl[1] || zero).mul(x)), rv = (pr[0] || zero).add((pr[1] || zero).mul(x));
    steps.push({ title: 'Check by substituting into the original equation', texLines: [`\\text{Left: } ${texOf(chk(pl)).replace(/x/g, `(${x.toTex()})`)} = ${lv.toTex()}`, `\\text{Right: } ${texOf(chk(pr)).replace(/x/g, `(${x.toTex()})`)} = ${rv.toTex()} \\;\\checkmark`] });
    const dec = x.toDecimal(10);
    return {
      ok: true,
      final: { tex: `x = ${x.toTex()}${!x.isInt() && dec ? ` = ${dec}` : !dec ? ` \\approx ${formatNumber(x.toNumber())}` : ''}` },
      answers: [{ label: 'Solution x', value: dec || formatNumber(x.toNumber()), approx: !dec, exactTex: x.isInt() ? undefined : x.toTex(), primary: true, copy: `x = ${x}` }, { label: 'Simplified equation', valueTex: `${lt} = ${rt}`, copy: `${textOf(polyToNode([b1, a1]))} = ${textOf(polyToNode([b2, a2]))}` }],
      visual: { svg: graph(x), legend, caption: 'The solution is the x-value where the two sides are equal (where the lines cross).' },
      formula: ['ax + b = cx + d \\;\\Rightarrow\\; (a - c)x = d - b \\;\\Rightarrow\\; x = \\frac{d - b}{a - c}'],
      steps,
      rounding: 'The solution is exact; a decimal is shown when the fraction terminates.',
    };
  },
};

// Explanations for each step.
withNotes(calculator, {
  'Write the equation': 'A linear equation has x only to the first power. The aim is to get x by itself on one side.',
  'Expand and simplify each side': 'Remove brackets with the distributive law, then combine like terms on each side separately.',
  'Collect x-terms': 'Doing the same thing to both sides keeps the equation balanced, so its solution does not change.',
  'Divide both sides by': 'Dividing both sides by the coefficient of x leaves x by itself.',
  'Check by substituting': 'Both sides give the same number, so the solution is correct.',
  'Contradiction': 'The x-terms cancelled and left a false statement, so no value of x can work.',
  'Identity': 'The x-terms cancelled and left a true statement, so every value of x works.',
});
