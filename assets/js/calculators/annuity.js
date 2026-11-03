/**
 * Annuities: equal payments A at equal intervals, interest i per payment period, N payments.
 *   Ordinary (end of each period):   P = A [1 − (1+i)^−N] / i,   F = A [(1+i)^N − 1] / i
 *   Due (start of each period):      both multiplied by (1 + i)
 *   Deferred (first payment at the end of period k+1):  P = A [1 − (1+i)^−N] / i · (1+i)^−k
 *   Perpetuity (payments forever):   P = A / i
 * The interest rate is a nominal annual rate compounded at the payment frequency.
 */
import { validator } from '../lib/calc-kit.js';
import { money, moneyTex, pct, pctTex, dec, moneyAnswer, rateAnswer, cashFlowDiagram, FREQUENCIES, freqName } from '../lib/econ-kit.js';
import { annuityExplore, annuityPractice } from '../explore/econ.js';

const TYPES = [['ordinary', 'Ordinary annuity (end of period)'], ['due', 'Annuity due (start of period)'], ['deferred', 'Deferred annuity'], ['perpetuity', 'Perpetuity (payments forever)']];

/** Present and future worth factors for an annuity of 1 per period. */
export function factors(type, i, N, k = 0) {
  // Below about 1e-10 per period the closed forms lose all precision; the limit is N.
  const tiny = Math.abs(i) < 1e-10;
  const pa = tiny ? N : -Math.expm1(-N * Math.log1p(i)) / i;
  const fa = tiny ? N : Math.expm1(N * Math.log1p(i)) / i;
  if (type === 'perpetuity') return { pa: 1 / i, fa: Infinity };
  if (type === 'due') return { pa: pa * (1 + i), fa: fa * (1 + i) };
  if (type === 'deferred') return { pa: pa * (1 + i) ** -k, fa };
  return { pa, fa };
}

export const calculator = {
  id: 'annuity',
  explore: annuityExplore,
  practice: annuityPractice,
  fields: [
    { name: 'type', label: 'Type of annuity', type: 'select', options: TYPES },
    { name: 'find', label: 'Solve for', type: 'radio', options: [['P', 'Present worth P'], ['F', 'Future worth F'], ['AP', 'Payment from P'], ['AF', 'Payment from F']] },
    { name: 'A', label: 'Payment per period A', type: 'number', signed: false, placeholder: 'e.g. 5000', showWhen: { find: ['P', 'F'] }, hint: 'Amounts work in any currency. Type them without commas.' },
    { name: 'P', label: 'Present worth P (e.g. a loan)', type: 'number', signed: false, placeholder: 'e.g. 250000', showWhen: { find: ['AP'] } },
    { name: 'F', label: 'Future worth F (e.g. a savings goal)', type: 'number', signed: false, placeholder: 'e.g. 1000000', showWhen: { find: ['AF'] } },
    { name: 'r', label: 'Nominal annual rate r', type: 'number', signed: false, placeholder: 'e.g. 12', suffix: '%', row: 'rate' },
    { name: 'm', label: 'Payments per year', type: 'select', options: FREQUENCIES, row: 'rate', hint: 'Interest is compounded at the same frequency as the payments.' },
    { name: 'n', label: 'Term n', type: 'number', signed: false, placeholder: 'e.g. 5', suffix: 'yr', showWhen: { type: ['ordinary', 'due', 'deferred'] } },
    { name: 'k', label: 'Deferred periods k', type: 'number', signed: false, placeholder: 'e.g. 4', showWhen: { type: ['deferred'] }, hint: 'Payment periods with no payment before the first one. The first payment is at the end of period k + 1.' },
  ],
  examples: [
    { label: 'Car loan: 500,000 over 5 years at 12% monthly', values: { type: 'ordinary', find: 'AP', P: '500000', r: '12', m: '12', n: '5', k: '0' } },
    { label: 'Saving 5,000 a quarter for 10 years at 6%', values: { type: 'ordinary', find: 'F', A: '5000', r: '6', m: '4', n: '10', k: '0' } },
    { label: 'Rent of 20,000 paid at the start of each year, 8 years at 7%', values: { type: 'due', find: 'P', A: '20000', r: '7', m: '1', n: '8', k: '0' } },
    { label: 'Deferred: 10 yearly payments of 15,000 starting in year 4, at 9%', values: { type: 'deferred', find: 'P', A: '15000', r: '9', m: '1', n: '10', k: '3' } },
    { label: 'Perpetuity: scholarship of 50,000 a year at 5%', values: { type: 'perpetuity', find: 'P', A: '50000', r: '5', m: '1', n: '', k: '0' } },
    { label: 'Not possible: future worth of a perpetuity', values: { type: 'perpetuity', find: 'F', A: '1000', r: '5', m: '1', n: '', k: '0' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const type = TYPES.some(([k]) => k === values.type) ? values.type : 'ordinary';
    const find = ['P', 'F', 'AP', 'AF'].includes(values.find) ? values.find : 'P';
    const m = [1, 2, 4, 12].includes(Number(values.m)) ? Number(values.m) : 1;
    if (type === 'perpetuity' && (find === 'F' || find === 'AF')) return { ok: false, errors: [{ field: 'find', message: 'A perpetuity never ends, so it has no future worth. Choose present worth, or a payment from a present worth.' }] };
    const A = find === 'P' || find === 'F' ? v.number('A', 'the payment', { positive: true, maxAbs: 1e12 }) : null;
    const P = find === 'AP' ? v.number('P', 'the present worth', { positive: true, maxAbs: 1e13 }) : null;
    const F = find === 'AF' ? v.number('F', 'the future worth', { positive: true, maxAbs: 1e13 }) : null;
    const rPct = v.number('r', 'the interest rate', type === 'perpetuity' ? { positive: true, max: 500 } : { nonneg: true, max: 500 });
    const n = type !== 'perpetuity' ? v.number('n', 'the term', { positive: true, max: 200 }) : null;
    const k = type === 'deferred' ? v.whole('k', 'the number of deferred periods', 2400, 0) : 0;
    if (!v.ok()) return v.result();
    const i = rPct / 100 / m;
    const N = type === 'perpetuity' ? Infinity : Math.round(n * m);
    if (type !== 'perpetuity' && (N < 1 || Math.abs(n * m - N) > 1e-9)) return { ok: false, errors: [{ field: 'n', message: `The term must be a whole number of payment periods. With ${m} payment${m === 1 ? '' : 's'} a year, try ${Math.max(1, N) / m} years.` }] };
    const f = factors(type, i, N, k);
    if (!Number.isFinite(f.pa) || f.pa > 1e15 || (type !== 'perpetuity' && (!Number.isFinite(f.fa) || f.fa > 1e15))) return { ok: false, errors: [{ field: 'n', message: 'These values grow too large to compute accurately. Use a shorter term or a lower rate.' }] };
    const steps = [{ title: 'Rate per period and number of payments', tex: type === 'perpetuity' ? `i = \\frac{r}{m} = \\frac{${dec(rPct / 100)}}{${m}} = ${dec(i, 8)}` : `i = \\frac{r}{m} = \\frac{${dec(rPct / 100)}}{${m}} = ${dec(i, 8)},\\qquad N = m\\,n = ${m} \\times ${dec(n)} = ${N}` }];
    const iT = dec(i, 8);
    const paTex = {
      ordinary: `\\frac{1 - (1 + ${iT})^{-${N}}}{${iT}}`,
      due: `\\frac{1 - (1 + ${iT})^{-${N}}}{${iT}}\\,(1 + ${iT})`,
      deferred: `\\frac{1 - (1 + ${iT})^{-${N}}}{${iT}}\\,(1 + ${iT})^{-${k}}`,
      perpetuity: `\\frac{1}{${iT}}`,
    }[type];
    const faTex = type === 'due' ? `\\frac{(1 + ${iT})^{${N}} - 1}{${iT}}\\,(1 + ${iT})` : `\\frac{(1 + ${iT})^{${N}} - 1}{${iT}}`;
    const paFormula = { ordinary: 'P = A\\,\\frac{1 - (1 + i)^{-N}}{i}', due: 'P = A\\,\\frac{1 - (1 + i)^{-N}}{i}\\,(1 + i)', deferred: 'P = A\\,\\frac{1 - (1 + i)^{-N}}{i}\\,(1 + i)^{-k}', perpetuity: 'P = \\frac{A}{i}' }[type];
    const faFormula = type === 'due' ? 'F = A\\,\\frac{(1 + i)^{N} - 1}{i}\\,(1 + i)' : 'F = A\\,\\frac{(1 + i)^{N} - 1}{i}';
    const zero = Math.abs(i) < 1e-10;
    let AA = A, PP, FF;
    if (find === 'P' || find === 'AP') {
      steps.push({ title: 'Present worth factor', texLines: [paFormula, zero ? `\\text{with } i = 0:\\ P/A = N = ${N}` : `\\frac{P}{A} = ${paTex} \\approx ${dec(f.pa, 6)}`] });
    }
    if (find === 'F' || find === 'AF') {
      steps.push({ title: 'Future worth factor', texLines: [faFormula, zero ? `\\text{with } i = 0:\\ F/A = N = ${N}` : `\\frac{F}{A} = ${faTex} \\approx ${dec(f.fa, 6)}`] });
    }
    if (find === 'P') { PP = A * f.pa; steps.push({ title: 'Present worth', tex: `P = ${moneyTex(A)} \\times ${dec(f.pa, 6)} \\approx ${moneyTex(PP)}` }); }
    if (find === 'F') { FF = A * f.fa; steps.push({ title: 'Future worth', tex: `F = ${moneyTex(A)} \\times ${dec(f.fa, 6)} \\approx ${moneyTex(FF)}` }); }
    if (find === 'AP') { PP = P; AA = P / f.pa; steps.push({ title: 'Payment needed', tex: `A = \\frac{P}{P/A} = \\frac{${moneyTex(P)}}{${dec(f.pa, 6)}} \\approx ${moneyTex(AA)}` }); }
    if (find === 'AF') { FF = F; AA = F / f.fa; steps.push({ title: 'Payment needed', tex: `A = \\frac{F}{F/A} = \\frac{${moneyTex(F)}}{${dec(f.fa, 6)}} \\approx ${moneyTex(AA)}` }); }
    if (PP === undefined) PP = AA * f.pa;
    if (FF === undefined && type !== 'perpetuity') FF = AA * f.fa;
    if (![AA, PP].every(Number.isFinite) || (type !== 'perpetuity' && !Number.isFinite(FF))) return { ok: false, errors: [{ message: 'These values are too extreme to compute reliably. Check the inputs.' }] };
    const answers = [moneyAnswer('Payment per period A', AA, { primary: find === 'AP' || find === 'AF' }), moneyAnswer('Present worth P', PP, { primary: find === 'P' })];
    if (type !== 'perpetuity') {
      answers.push(moneyAnswer('Future worth F', FF, { primary: find === 'F' }));
      answers.push(moneyAnswer(`Total of all ${N} payments`, AA * N));
      if (find === 'AP' || find === 'P') answers.push(moneyAnswer('Total interest (payments − present worth)', AA * N - PP));
      else answers.push(moneyAnswer('Interest earned (future worth − payments)', FF - AA * N));
    }
    answers.push(rateAnswer('Rate per period i', i));
    if (type === 'deferred' && find !== 'F' && find !== 'AF') steps.push({ title: 'Why the extra factor', text: `No payments are made for the first ${k} period${k === 1 ? '' : 's'}, so the ordinary-annuity present worth (found at period ${k}) is discounted back ${k} more period${k === 1 ? '' : 's'} with (1 + i)^−${k}.` });
    // Loan amortisation table for P-based problems with a finite term.
    const tables = [];
    if ((find === 'AP' || find === 'P') && type === 'ordinary' && N <= 600) {
      const rows = []; let bal = PP;
      const show = N <= 24 ? [...Array(N).keys()].map((x) => x + 1) : [1, 2, 3, 4, 5, 6, null, N - 2, N - 1, N];
      for (let p = 1; p <= N; p++) {
        const int = bal * i, princ = AA - int; bal -= princ;
        if (show.includes(p)) rows.push([String(p), money(AA), money(int), money(princ), money(Math.abs(bal) < 0.005 ? 0 : bal)]);
        else if (p === 7 && show.includes(null)) rows.push(['…', '', '', '', '']);
      }
      tables.push({ caption: 'Amortisation schedule (each payment splits into interest and principal)', headers: ['Period', 'Payment', 'Interest', 'Principal repaid', 'Balance'], rows });
    }
    // Cash-flow diagram.
    const shownN = type === 'perpetuity' ? 12 : k + N;
    const flows = [];
    const first = type === 'due' ? 0 : type === 'deferred' ? k + 1 : 1;
    const last = type === 'perpetuity' ? shownN : first + N - 1;
    for (let t = first; t <= last; t++) flows.push({ t, amount: AA, label: t === first ? `A = ${money(AA)}` : '' });
    flows.push({ t: 0, amount: -PP, label: `P = ${money(PP)}` });
    const final = { P: `P \\approx ${moneyTex(PP)}`, F: `F \\approx ${moneyTex(FF ?? 0)}`, AP: `A \\approx ${moneyTex(AA)}\\ \\text{per period}`, AF: `A \\approx ${moneyTex(AA)}\\ \\text{per period}` }[find];
    return {
      ok: true,
      final: { tex: final },
      answers,
      tables,
      visual: { svg: cashFlowDiagram(flows, type === 'due' ? Math.max(shownN, N) : shownN, { title: 'Cash-flow diagram of the annuity', unitLabel: 'period' }), caption: `Up arrows: the payments A${type === 'perpetuity' ? ', which continue forever' : ''}. Down arrow: their single equivalent value P at time 0. ${type === 'due' ? 'In an annuity due each payment is at the start of its period.' : type === 'deferred' ? `The first ${k} periods have no payment.` : 'Each payment is at the end of its period.'}` },
      formula: [type === 'perpetuity' ? 'P = \\frac{A}{i}' : `${paFormula} \\qquad ${faFormula}`],
      steps,
      notes: [{ kind: 'info', text: `The rate per period is the nominal rate divided by the payments per year: ${pct(rPct / 100)} ÷ ${m} = ${pct(i)}. This assumes interest is compounded ${freqName(m)}, the same as the payments. Amounts are rounded to the cent.` }],
    };
  },
};
