/**
 * Break-even analysis: total cost = fixed cost + variable cost × units, revenue = price × units.
 *   Break-even units  Q = FC / (p − v)        Break-even revenue = Q · p
 * Optionally finds the units needed for a target profit and the profit at a planned volume.
 */
import { validator } from '../lib/calc-kit.js';
import { money, moneyTex, pct, moneyAnswer, rateAnswer, optionalNumber } from '../lib/econ-kit.js';
import { formatNumber, texNumber } from '../lib/format.js';
import { plot } from '../lib/plot.js';
import { breakEvenExplore, breakEvenPractice } from '../explore/econ.js';

const units = (x) => formatNumber(x, { decimals: 2, group: true });
const unitsTex = (x) => texNumber(x, { decimals: 2 });

export const calculator = {
  id: 'break-even',
  explore: breakEvenExplore,
  practice: breakEvenPractice,
  fields: [
    { name: 'FC', label: 'Fixed cost FC (per period)', type: 'number', signed: false, placeholder: 'e.g. 240000', hint: 'Rent, salaries, equipment payments: costs that do not change with output. Any currency; no commas.' },
    { name: 'v', label: 'Variable cost per unit v', type: 'number', signed: false, placeholder: 'e.g. 35', row: 'unit' },
    { name: 'p', label: 'Selling price per unit p', type: 'number', signed: false, placeholder: 'e.g. 75', row: 'unit' },
    { name: 'target', label: 'Target profit (optional)', type: 'number', signed: false, placeholder: 'e.g. 100000', row: 'opt' },
    { name: 'Q', label: 'Planned units (optional)', type: 'number', signed: false, placeholder: 'e.g. 8000', row: 'opt' },
  ],
  examples: [
    { label: 'Bakery: 240,000 fixed, 35 per unit, sells at 75', values: { FC: '240000', v: '35', p: '75', target: '100000', Q: '8000' } },
    { label: 'Workshop: 50,000 fixed, 120 per unit, sells at 200', values: { FC: '50000', v: '120', p: '200', target: '', Q: '' } },
    { label: 'Loss at a low volume', values: { FC: '90000', v: '18', p: '30', target: '', Q: '5000' } },
    { label: 'Impossible: price below the variable cost', values: { FC: '10000', v: '50', p: '40', target: '', Q: '' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const FC = v.number('FC', 'the fixed cost', { nonneg: true, maxAbs: 1e13 });
    const vc = v.number('v', 'the variable cost per unit', { nonneg: true, maxAbs: 1e12 });
    const p = v.number('p', 'the selling price', { positive: true, maxAbs: 1e12 });
    const errors = [...v.errors];
    const target = optionalNumber(values, 'target', 'the target profit', errors, { nonneg: true, maxAbs: 1e13 });
    const Q = optionalNumber(values, 'Q', 'the planned units', errors, { nonneg: true, maxAbs: 1e12 });
    if (errors.length) return { ok: false, errors };
    const cm = p - vc;
    if (!(cm > 0)) return { ok: false, errors: [{ field: 'p', message: cm === 0 ? 'The price equals the variable cost, so each unit adds nothing towards the fixed cost: the business can never break even. Raise the price or lower the variable cost.' : 'The price is below the variable cost, so every unit sold loses money and the business can never break even. Raise the price or lower the variable cost.' }] };
    const be = FC / cm, beRev = be * p;
    const steps = [
      { title: 'Contribution margin per unit', tex: `p - v = ${moneyTex(p)} - ${moneyTex(vc)} = ${moneyTex(cm)}`, text: 'Each unit sold contributes this much towards the fixed cost (and then profit).' },
      { title: 'At break-even, revenue equals total cost', texLines: ['p\\,Q = FC + v\\,Q', 'Q_{BE} = \\frac{FC}{p - v}', `Q_{BE} = \\frac{${moneyTex(FC)}}{${moneyTex(cm)}} \\approx ${unitsTex(be)}\\ \\text{units}`] },
      { title: 'Break-even revenue', tex: `R_{BE} = p\\,Q_{BE} = ${moneyTex(p)} \\times ${unitsTex(be)} \\approx ${moneyTex(beRev)}` },
    ];
    const whole = Math.ceil(be - 1e-9);
    const answers = [
      { label: 'Break-even volume', value: `${units(be)} units`, primary: true, copy: `Break-even volume: ${units(be)} units` },
      { label: 'Units to sell (whole units)', value: `${formatNumber(whole, { decimals: 0, group: true })} units`, copy: `${whole} units` },
      moneyAnswer('Break-even revenue', beRev, { primary: true }),
      moneyAnswer('Contribution margin per unit', cm),
      rateAnswer('Contribution margin ratio (p − v) / p', cm / p, { d: 2 }),
    ];
    if (target !== null) {
      const qt = (FC + target) / cm;
      steps.push({ title: 'Units for the target profit', tex: `Q = \\frac{FC + \\text{profit}}{p - v} = \\frac{${moneyTex(FC)} + ${moneyTex(target)}}{${moneyTex(cm)}} \\approx ${unitsTex(qt)}\\ \\text{units}` });
      answers.push({ label: `Units for a profit of ${money(target)}`, value: `${units(qt)} units`, copy: `${units(qt)} units` });
    }
    let profitQ = null;
    if (Q !== null) {
      profitQ = cm * Q - FC;
      steps.push({ title: `Profit at ${units(Q)} units`, tex: `\\text{profit} = (p - v)\\,Q - FC = ${moneyTex(cm)} \\times ${unitsTex(Q)} - ${moneyTex(FC)} = ${moneyTex(profitQ)}`, text: profitQ < 0 ? 'Negative: this volume is below break-even, so it makes a loss.' : Q > be ? `This volume is ${units(Q - be)} units above break-even (the margin of safety).` : '' });
      answers.push(moneyAnswer(profitQ < 0 ? `Loss at ${units(Q)} units` : `Profit at ${units(Q)} units`, Math.abs(profitQ)));
    }
    if (![be, beRev].every(Number.isFinite)) return { ok: false, errors: [{ message: 'These values are too extreme to compute reliably. Check the inputs.' }] };
    const xMax = Math.max(be * 2, Q ?? 0, 1) * 1.05;
    return {
      ok: true,
      final: { texLines: [`Q_{BE} \\approx ${unitsTex(be)}\\ \\text{units}`, `R_{BE} \\approx ${moneyTex(beRev)}`] },
      answers,
      visual: { svg: plot({ x: [0, xMax], y: [0, p * xMax * 1.05], width: 400, height: 250, title: 'Break-even chart', curves: [{ f: (x) => FC + vc * x, cls: 'd-line3' }, { f: (x) => p * x, cls: 'd-line' }], points: [{ x: be, y: beRev }], vlines: Q !== null ? [{ x: Q, label: 'planned' }] : [], xLabel: 'units', yLabel: 'amount' }), caption: 'Blue: revenue p·Q. Orange: total cost FC + v·Q. They cross at the break-even point; to the right of it the business makes a profit, to the left a loss.' },
      formula: ['Q_{BE} = \\frac{FC}{p - v} \\qquad R_{BE} = p\\,Q_{BE}'],
      steps,
      notes: [{ kind: 'info', text: `Assumes a constant price and variable cost per unit, fixed costs that do not change within the range considered, and that everything produced is sold. The contribution margin ratio is ${pct(cm / p, 2)}: that share of every sale covers fixed cost and profit.` }],
    };
  },
};
