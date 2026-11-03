/**
 * Compound interest: F = P (1 + r/m)^(m n), or F = P e^(r n) for continuous compounding.
 * Solves for the future amount, the present amount, the nominal rate or the number of years,
 * and reports the effective annual rate and a year-by-year balance table.
 */
import { validator } from '../lib/calc-kit.js';
import { money, moneyTex, pct, pctTex, dec, moneyAnswer, rateAnswer, COMPOUNDING, freqName } from '../lib/econ-kit.js';
import { formatNumber } from '../lib/format.js';
import { plot } from '../lib/plot.js';
import { compoundExplore, compoundPractice } from '../explore/econ.js';

/** Future value factor for a nominal rate r compounded m times a year ('c' = continuously) over n years. */
export function growth(r, m, n) {
  return m === 'c' ? Math.exp(r * n) : (1 + r / m) ** (m * n);
}
export function effectiveRate(r, m) {
  return m === 'c' ? Math.expm1(r) : (1 + r / m) ** m - 1;
}

export const calculator = {
  id: 'compound-interest',
  explore: compoundExplore,
  practice: compoundPractice,
  fields: [
    { name: 'find', label: 'Solve for', type: 'radio', options: [['F', 'Future worth F'], ['P', 'Present worth P'], ['r', 'Nominal rate r'], ['n', 'Years n']] },
    { name: 'P', label: 'Present worth P', type: 'number', signed: false, placeholder: 'e.g. 100000', showWhen: { find: ['F', 'r', 'n'] }, hint: 'Amounts work in any currency. Type them without commas.' },
    { name: 'F', label: 'Future worth F', type: 'number', signed: false, placeholder: 'e.g. 150000', showWhen: { find: ['P', 'r', 'n'] } },
    { name: 'r', label: 'Nominal annual rate r', type: 'number', signed: false, placeholder: 'e.g. 6', suffix: '%', showWhen: { find: ['F', 'P', 'n'] } },
    { name: 'n', label: 'Number of years n', type: 'number', signed: false, placeholder: 'e.g. 5', suffix: 'yr', showWhen: { find: ['F', 'P', 'r'] } },
    { name: 'm', label: 'Compounded', type: 'select', options: COMPOUNDING, hint: 'How many times a year interest is added to the balance.' },
  ],
  examples: [
    { label: '100,000 at 6% compounded quarterly for 5 years', values: { find: 'F', P: '100000', r: '6', n: '5', m: '4' } },
    { label: 'Present worth of 500,000 due in 10 years at 8% monthly', values: { find: 'P', F: '500000', r: '8', n: '10', m: '12' } },
    { label: 'Continuous compounding: 20,000 at 5% for 7 years', values: { find: 'F', P: '20000', r: '5', n: '7', m: 'c' } },
    { label: 'Nominal rate that doubles money in 8 years (semi-annual)', values: { find: 'r', P: '1', F: '2', n: '8', m: '2' } },
    { label: 'Years for 50,000 to grow to 80,000 at 9% annually', values: { find: 'n', P: '50000', F: '80000', r: '9', m: '1' } },
    { label: 'Impossible: future worth below present worth', values: { find: 'n', P: '1000', F: '900', r: '5', m: '1' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const find = ['F', 'P', 'r', 'n'].includes(values.find) ? values.find : 'F';
    const m = values.m === 'c' ? 'c' : [1, 2, 4, 12, 365].includes(Number(values.m)) ? Number(values.m) : 1;
    const P = find !== 'P' ? v.number('P', 'the present worth', { positive: true, maxAbs: 1e13 }) : null;
    const F = find !== 'F' ? v.number('F', 'the future worth', { positive: true, maxAbs: 1e13 }) : null;
    const rPct = find !== 'r' ? v.number('r', 'the nominal rate', { positive: true, max: 500 }) : null;
    const n = find !== 'n' ? v.number('n', 'the number of years', { positive: true, max: 500 }) : null;
    if (!v.ok()) return v.result();
    if ((find === 'r' || find === 'n') && !(F > P)) return { ok: false, errors: [{ field: 'F', message: F === P ? 'The future worth equals the present worth, so the rate or time would be 0. Enter a larger future worth.' : 'At a positive interest rate money grows, so the future worth must be larger than the present worth.' }] };
    const cont = m === 'c';
    const r = rPct === null ? null : rPct / 100;
    const steps = [];
    const i = cont ? null : r !== null ? r / m : null;
    const formulaTex = cont ? 'F = P\\,e^{r n}' : 'F = P\\left(1 + \\frac{r}{m}\\right)^{m n}';
    steps.push({ title: 'Compounding', text: `Interest is compounded ${freqName(m)}${cont ? '' : `, so m = ${m} periods per year`}.`, tex: formulaTex });
    let PP = P, FF = F, rr = r, nn = n;
    if (find === 'F' || find === 'P') {
      const g = growth(r, m, n);
      if (!Number.isFinite(g) || g > 1e15) return { ok: false, errors: [{ field: 'n', message: 'The amount grows too large to compute accurately. Use a shorter time or a lower rate.' }] };
      if (!cont) steps.push({ title: 'Rate per period and number of periods', tex: `i = \\frac{r}{m} = \\frac{${dec(r)}}{${m}} = ${dec(i, 8)},\\qquad N = m\\,n = ${m} \\times ${dec(n)} = ${dec(m * n)}` });
      const gTex = cont ? `e^{${dec(r)} \\times ${dec(n)}}` : `(1 + ${dec(i, 8)})^{${dec(m * n)}}`;
      steps.push({ title: 'Growth factor', tex: `${gTex} \\approx ${dec(g, 8)}` });
      if (find === 'F') { FF = P * g; steps.push({ title: 'Future worth', tex: `F = ${moneyTex(P)} \\times ${dec(g, 8)} \\approx ${moneyTex(FF)}` }); }
      else { PP = F / g; steps.push({ title: 'Present worth (discount the future amount)', texLines: [cont ? 'P = F\\,e^{-r n}' : 'P = \\frac{F}{(1 + i)^{N}}', `P = \\frac{${moneyTex(F)}}{${dec(g, 8)}} \\approx ${moneyTex(PP)}`] }); }
    } else if (find === 'r') {
      const ratio = F / P;
      if (cont) { rr = Math.log(ratio) / n; steps.push({ title: 'Solve for r', texLines: [`e^{r n} = \\frac{F}{P} = ${dec(ratio, 8)}`, `r = \\frac{\\ln(F/P)}{n} = \\frac{\\ln ${dec(ratio, 8)}}{${dec(n)}} \\approx ${dec(rr, 8)}`] }); }
      else {
        const ip = ratio ** (1 / (m * n)) - 1; rr = ip * m;
        steps.push({ title: 'Solve for the rate per period', texLines: [`(1 + i)^{${dec(m * n)}} = \\frac{F}{P} = ${dec(ratio, 8)}`, `i = ${dec(ratio, 8)}^{1/${dec(m * n)}} - 1 \\approx ${dec(ip, 8)}`] });
        steps.push({ title: 'Nominal annual rate', tex: `r = m\\,i = ${m} \\times ${dec(ip, 8)} \\approx ${dec(rr, 8)} = ${pctTex(rr)}` });
      }
    } else {
      const ratio = F / P;
      const lnStep = cont ? r : m * Math.log1p(r / m);
      nn = Math.log(ratio) / lnStep;
      steps.push({ title: 'Take logarithms of both sides', texLines: cont
        ? [`e^{r n} = \\frac{F}{P} = ${dec(ratio, 8)}`, `n = \\frac{\\ln(F/P)}{r} = \\frac{\\ln ${dec(ratio, 8)}}{${dec(r)}} \\approx ${dec(nn, 6)}\\ \\text{years}`]
        : [`\\left(1 + \\frac{${dec(r)}}{${m}}\\right)^{${m} n} = ${dec(ratio, 8)}`, `n = \\frac{\\ln(F/P)}{${m}\\,\\ln(1 + ${dec(r / m, 8)})} \\approx ${dec(nn, 6)}\\ \\text{years}`] });
      if (!cont) steps.push({ title: 'Number of compounding periods', tex: `N = m\\,n \\approx ${dec(m * nn, 4)}`, text: 'In practice interest is added only at the end of each period, so the target is first reached at the next whole period.' });
    }
    if (![PP, FF, rr, nn].every(Number.isFinite) || PP <= 0 || FF <= 0) return { ok: false, errors: [{ message: 'These values are too extreme to compute reliably. Check the inputs.' }] };
    const er = effectiveRate(rr, m);
    steps.push({ title: 'Effective annual rate', tex: cont ? `ER = e^{r} - 1 = e^{${dec(rr, 8)}} - 1 \\approx ${pctTex(er)}` : `ER = \\left(1 + \\frac{r}{m}\\right)^{m} - 1 = (1 + ${dec(rr / m, 8)})^{${m}} - 1 \\approx ${pctTex(er)}`, text: 'The effective rate is the rate that, compounded once a year, gives the same growth.' });
    // Year-by-year balance (whole years up to n, at most 40 rows).
    const rows = [];
    const yearsShown = Math.min(40, Math.floor(nn));
    for (let y = 0; y <= yearsShown; y++) rows.push([String(y), money(PP * growth(rr, m, y)), money(PP * growth(rr, m, y) - PP)]);
    if (nn !== Math.floor(nn) || nn > 40) rows.push([formatNumber(nn, { decimals: 4 }), money(FF), money(FF - PP)]);
    const simple = (t) => PP * (1 + rr * t);
    const final = { F: `F \\approx ${moneyTex(FF)}`, P: `P \\approx ${moneyTex(PP)}`, r: `r \\approx ${pctTex(rr)}\\ \\text{compounded ${freqName(m)}}`, n: `n \\approx ${dec(nn, 4)}\\ \\text{years}` }[find];
    return {
      ok: true,
      final: { tex: final },
      answers: [
        moneyAnswer('Future worth F', FF, { primary: find === 'F' }),
        moneyAnswer('Present worth P', PP, { primary: find === 'P' }),
        moneyAnswer('Interest earned F − P', FF - PP),
        rateAnswer('Nominal rate r', rr, { primary: find === 'r' }),
        rateAnswer('Effective annual rate', er),
        { label: 'Years n', value: `${formatNumber(nn, { decimals: 4 })} years`, primary: find === 'n', copy: `Years: ${formatNumber(nn, { decimals: 4 })}` },
      ],
      tables: [{ caption: 'Balance at the end of each year', headers: ['Year', 'Balance', 'Interest so far'], rows }],
      visual: { svg: plot({ x: [0, nn], y: [0, Math.max(FF, simple(nn)) * 1.08], width: 400, height: 250, title: 'Balance over time', curves: [{ f: (t) => PP * growth(rr, m, t), samples: 300 }, { f: simple, cls: 'd-line2' }], points: [{ x: nn, y: FF }], xLabel: 'years', yLabel: 'balance' }), caption: `Blue: compound interest, ${freqName(m)}. Green: simple interest at the same rate, for comparison. The blue curve is drawn smoothly; real balances step up at each compounding date.` },
      formula: [cont ? 'F = P\\,e^{r n} \\qquad ER = e^{r} - 1' : 'F = P\\left(1 + \\frac{r}{m}\\right)^{m n} \\qquad ER = \\left(1 + \\frac{r}{m}\\right)^{m} - 1'],
      steps,
      notes: [{ kind: 'info', text: `Compound interest adds interest to the balance, so interest earns interest. ${cont ? 'Continuous compounding is the limit as m grows without bound.' : `The nominal rate ${pct(rr)} is split into ${m} periods of ${pct(rr / m)} each.`} Amounts are rounded to the cent.` }],
    };
  },
};
