/**
 * Simple interest: I = P r t and F = P (1 + r t). Solves for the future amount, the principal,
 * the rate or the time. Time can be given in years, months or days; days use ordinary interest
 * (a 360-day year) or exact interest (a 365-day year), as in engineering economy textbooks.
 */
import { validator } from '../lib/calc-kit.js';
import { money, moneyTex, pct, pctTex, dec, moneyAnswer, rateAnswer, cashFlowDiagram } from '../lib/econ-kit.js';
import { formatNumber } from '../lib/format.js';
import { simplePractice } from '../explore/econ.js';

const UNITS = [['years', 'Years'], ['months', 'Months'], ['days', 'Days']];
const BASIS = [['360', 'Ordinary interest (360-day year)'], ['365', 'Exact interest (365-day year)']];

export const calculator = {
  id: 'simple-interest',
  practice: simplePractice,
  fields: [
    { name: 'find', label: 'Solve for', type: 'radio', options: [['F', 'Future amount F'], ['P', 'Principal P'], ['r', 'Rate r'], ['t', 'Time t']] },
    { name: 'P', label: 'Principal P', type: 'number', signed: false, placeholder: 'e.g. 50000', showWhen: { find: ['F', 'r', 't'] }, hint: 'Amounts work in any currency. Type them without commas.' },
    { name: 'F', label: 'Future amount F', type: 'number', signed: false, placeholder: 'e.g. 56000', showWhen: { find: ['P', 'r', 't'] } },
    { name: 'r', label: 'Interest rate r', type: 'number', signed: false, placeholder: 'e.g. 8', suffix: '% / yr', showWhen: { find: ['F', 'P', 't'] } },
    { name: 't', label: 'Time t', type: 'number', signed: false, placeholder: 'e.g. 18', showWhen: { find: ['F', 'P', 'r'] }, row: 'time' },
    { name: 'unit', label: 'Time unit', type: 'select', options: UNITS, row: 'time' },
    { name: 'basis', label: 'Days per year', type: 'select', options: BASIS, showWhen: { unit: ['days'] }, hint: 'Ordinary interest uses 360 days; exact interest uses 365 (366 in a leap year).' },
  ],
  examples: [
    { label: '₱50,000 at 8% for 18 months', values: { find: 'F', P: '50000', r: '8', t: '18', unit: 'months', basis: '360' } },
    { label: 'Ordinary vs exact: 120 days at 10%', values: { find: 'F', P: '20000', r: '10', t: '120', unit: 'days', basis: '365' } },
    { label: 'Rate that turns 12,000 into 13,500 in 2 years', values: { find: 'r', P: '12000', F: '13500', t: '2', unit: 'years', basis: '360' } },
    { label: 'Principal for 100,000 in 3 years at 6%', values: { find: 'P', F: '100000', r: '6', t: '3', unit: 'years', basis: '360' } },
    { label: 'Time to double at 5%', values: { find: 't', P: '1000', F: '2000', r: '5', unit: 'years', basis: '360' } },
    { label: 'Impossible: future amount below the principal', values: { find: 'r', P: '5000', F: '4000', t: '1', unit: 'years', basis: '360' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const find = ['F', 'P', 'r', 't'].includes(values.find) ? values.find : 'F';
    const unit = UNITS.some(([k]) => k === values.unit) ? values.unit : 'years';
    const basis = values.basis === '365' ? 365 : 360;
    const perYear = unit === 'years' ? 1 : unit === 'months' ? 12 : basis;
    const P = find !== 'P' ? v.number('P', 'the principal', { positive: true, maxAbs: 1e13 }) : null;
    const F = find === 'P' || find === 'r' || find === 't' ? v.number('F', 'the future amount', { positive: true, maxAbs: 1e13 }) : null;
    const rPct = find !== 'r' ? v.number('r', 'the interest rate', { positive: true, max: 1000 }) : null;
    const tIn = find !== 't' ? v.number('t', 'the time', { positive: true, maxAbs: 1e6 }) : null;
    if (!v.ok()) return v.result();
    if ((find === 'r' || find === 't') && !(F > P)) {
      return { ok: false, errors: [{ field: 'F', message: F === P ? 'The future amount equals the principal, so no interest was earned: the rate or time would be 0. Enter a larger future amount.' : 'With simple interest the amount only grows, so the future amount must be larger than the principal.' }] };
    }
    const r = rPct === null ? null : rPct / 100;
    const t = tIn === null ? null : tIn / perYear; // years
    const tTex = unit === 'years' ? dec(tIn ?? 0) : `\\frac{${dec(tIn ?? 0)}}{${perYear}}`;
    const steps = [];
    let PP = P, FF = F, rr = r, tt = t;
    if (unit !== 'years' && tIn !== null) steps.push({ title: 'Convert the time to years', tex: `t = ${tTex} = ${dec(t)}\\ \\text{years}`, text: unit === 'days' ? (basis === 360 ? 'Ordinary interest: one year is taken as 360 days (12 months of 30 days).' : 'Exact interest: one year is 365 days.') : '' });
    if (find === 'F') {
      const I = P * r * t; FF = P + I;
      steps.push({ title: 'Interest earned', texLines: ['I = P\\,r\\,t', `I = ${moneyTex(P)} \\times ${dec(r)} \\times ${dec(t)} = ${moneyTex(I)}`] });
      steps.push({ title: 'Future amount', texLines: ['F = P + I = P\\,(1 + r\\,t)', `F = ${moneyTex(P)} + ${moneyTex(I)} = ${moneyTex(FF)}`] });
    } else if (find === 'P') {
      PP = F / (1 + r * t);
      steps.push({ title: 'Rearrange F = P(1 + rt) for P', tex: 'P = \\frac{F}{1 + r\\,t}' });
      steps.push({ title: 'Substitute', tex: `P = \\frac{${moneyTex(F)}}{1 + ${dec(r)} \\times ${dec(t)}} = \\frac{${moneyTex(F)}}{${dec(1 + r * t)}} \\approx ${moneyTex(PP)}` });
    } else if (find === 'r') {
      rr = (F - P) / (P * t);
      steps.push({ title: 'Interest earned', tex: `I = F - P = ${moneyTex(F)} - ${moneyTex(P)} = ${moneyTex(F - P)}` });
      steps.push({ title: 'Rearrange I = Prt for r', tex: `r = \\frac{I}{P\\,t} = \\frac{${moneyTex(F - P)}}{${moneyTex(P)} \\times ${dec(t)}} \\approx ${dec(rr)} = ${pctTex(rr)}` });
    } else {
      tt = (F - P) / (P * r);
      steps.push({ title: 'Interest earned', tex: `I = F - P = ${moneyTex(F)} - ${moneyTex(P)} = ${moneyTex(F - P)}` });
      steps.push({ title: 'Rearrange I = Prt for t', tex: `t = \\frac{I}{P\\,r} = \\frac{${moneyTex(F - P)}}{${moneyTex(P)} \\times ${dec(r)}} \\approx ${dec(tt)}\\ \\text{years}` });
      if (unit !== 'years') steps.push({ title: `Convert to ${unit}`, tex: `${dec(tt)} \\times ${perYear} \\approx ${dec(tt * perYear, 4)}\\ \\text{${unit}}` });
    }
    if (![PP, FF, rr, tt].every(Number.isFinite) || PP <= 0) return { ok: false, errors: [{ message: 'These values are too extreme to compute reliably. Check the inputs.' }] };
    const I = FF - PP;
    const final = {
      F: `F \\approx ${moneyTex(FF)}`,
      P: `P \\approx ${moneyTex(PP)}`,
      r: `r \\approx ${pctTex(rr)}\\ \\text{per year}`,
      t: `t \\approx ${dec(tt, 4)}\\ \\text{years}${unit !== 'years' ? ` = ${dec(tt * perYear, 4)}\\ \\text{${unit}}` : ''}`,
    }[find];
    const answers = [
      moneyAnswer('Future amount F', FF, { primary: find === 'F' }),
      moneyAnswer('Principal P', PP, { primary: find === 'P' }),
      moneyAnswer('Interest earned I', I),
      rateAnswer('Rate r per year', rr, { primary: find === 'r' }),
      { label: 'Time t', value: `${formatNumber(tt, { decimals: 4 })} years`, primary: find === 't', copy: `Time: ${formatNumber(tt, { decimals: 4 })} years` },
    ];
    if (unit === 'days' && find !== 't') {
      const other = basis === 360 ? 365 : 360;
      const tOther = tIn / other;
      answers.push(moneyAnswer(`${other === 360 ? 'Ordinary' : 'Exact'} interest instead (${other}-day year)`, PP * rr * tOther));
      steps.push({ title: 'Compare ordinary and exact interest', text: `With a ${other}-day year the time would be ${formatNumber(tOther, { decimals: 6 })} years and the interest ${money(PP * rr * tOther)}. Ordinary interest (360 days) always gives slightly more.` });
    }
    const years = Math.max(1, Math.ceil(tt));
    return {
      ok: true,
      final: { tex: final },
      answers,
      visual: { svg: cashFlowDiagram([{ t: 0, amount: -PP, label: `P = ${money(PP)}` }, { t: years, amount: FF, label: `F = ${money(FF)}` }], years, { title: 'Cash-flow diagram for a simple-interest loan or deposit', unitLabel: 'year' }), caption: `Lend or deposit P now (down arrow) and receive F after ${formatNumber(tt, { decimals: 4 })} years (up arrow). The time line is in whole years.` },
      formula: ['I = P\\,r\\,t \\qquad F = P\\,(1 + r\\,t)'],
      steps,
      notes: [{ kind: 'info', text: `Simple interest is earned on the principal only; interest is never added to the balance and does not earn interest itself. The rate here is ${pct(rr)} per year. Amounts are rounded to the cent.` }],
    };
  },
};
