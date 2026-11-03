/**
 * Nominal and effective interest rates.
 *   ER = (1 + r/m)^m − 1           (m compounding periods a year)
 *   ER = e^r − 1                    (continuous compounding)
 * Converts nominal → effective, effective → nominal, and one compounding frequency to another.
 */
import { validator } from '../lib/calc-kit.js';
import { pct, pctTex, dec, rateAnswer, COMPOUNDING, freqName } from '../lib/econ-kit.js';
import { effectivePractice } from '../explore/econ.js';

const readM = (x) => (x === 'c' ? 'c' : [1, 2, 4, 12, 365].includes(Number(x)) ? Number(x) : 1);
export const toEffective = (r, m) => (m === 'c' ? Math.expm1(r) : (1 + r / m) ** m - 1);
export const toNominal = (er, m) => (m === 'c' ? Math.log1p(er) : m * ((1 + er) ** (1 / m) - 1));
const erTex = (m, rTex) => (m === 'c' ? `e^{${rTex}} - 1` : `\\left(1 + \\frac{${rTex}}{${m}}\\right)^{${m}} - 1`);

export const calculator = {
  id: 'effective-interest-rate',
  practice: effectivePractice,
  fields: [
    { name: 'mode', label: 'What do you want to do?', type: 'radio', options: [['toER', 'Nominal → effective'], ['toNom', 'Effective → nominal'], ['convert', 'Change compounding']] },
    { name: 'r', label: 'Nominal annual rate r', type: 'number', signed: false, placeholder: 'e.g. 12', suffix: '%', showWhen: { mode: ['toER', 'convert'] } },
    { name: 'er', label: 'Effective annual rate ER', type: 'number', signed: false, placeholder: 'e.g. 12.68', suffix: '%', showWhen: { mode: ['toNom'] } },
    { name: 'm', label: 'Compounded', type: 'select', options: COMPOUNDING },
    { name: 'm2', label: 'Convert to compounding', type: 'select', options: COMPOUNDING, showWhen: { mode: ['convert'] }, hint: 'The calculator finds the nominal rate with this compounding that has the same effective rate.' },
  ],
  examples: [
    { label: '12% compounded monthly', values: { mode: 'toER', r: '12', m: '12', m2: '4' } },
    { label: '8% compounded continuously', values: { mode: 'toER', r: '8', m: 'c', m2: '4' } },
    { label: 'Nominal rate, quarterly, for an effective 10%', values: { mode: 'toNom', er: '10', m: '4', m2: '4' } },
    { label: '6% semi-annual as an equivalent monthly rate', values: { mode: 'convert', r: '6', m: '2', m2: '12' } },
  ],
  solve(values) {
    const v = validator(values);
    const mode = ['toER', 'toNom', 'convert'].includes(values.mode) ? values.mode : 'toER';
    const m = readM(values.m), m2 = readM(values.m2);
    const rPct = mode !== 'toNom' ? v.number('r', 'the nominal rate', { positive: true, max: 500 }) : null;
    const erPct = mode === 'toNom' ? v.number('er', 'the effective rate', { positive: true, max: 10000 }) : null;
    if (!v.ok()) return v.result();
    const steps = [];
    let r, er;
    if (mode === 'toNom') {
      er = erPct / 100; r = toNominal(er, m);
      steps.push({ title: 'Start from the definition of the effective rate', tex: `ER = ${erTex(m, 'r')}` });
      steps.push(m === 'c'
        ? { title: 'Solve for r', tex: `r = \\ln(1 + ER) = \\ln(1 + ${dec(er)}) \\approx ${dec(r, 8)} = ${pctTex(r)}` }
        : { title: 'Solve for r', texLines: [`1 + \\frac{r}{${m}} = (1 + ER)^{1/${m}} = (1 + ${dec(er)})^{1/${m}} \\approx ${dec((1 + er) ** (1 / m), 8)}`, `r = ${m}\\left(${dec((1 + er) ** (1 / m), 8)} - 1\\right) \\approx ${dec(r, 8)} = ${pctTex(r)}`] });
    } else {
      r = rPct / 100; er = toEffective(r, m);
      steps.push({ title: m === 'c' ? 'Continuous compounding' : 'Rate per period', tex: m === 'c' ? `ER = e^{r} - 1` : `i = \\frac{r}{m} = \\frac{${dec(r)}}{${m}} = ${dec(r / m, 8)}` });
      steps.push({ title: 'Effective annual rate', tex: `ER = ${erTex(m, dec(r))} \\approx ${dec(er, 8)} = ${pctTex(er)}` });
    }
    if (!Number.isFinite(er) || !Number.isFinite(r) || er > 1e9) return { ok: false, errors: [{ field: mode === 'toNom' ? 'er' : 'r', message: 'That rate is too large to compute reliably. Enter a smaller rate.' }] };
    const answers = [rateAnswer('Effective annual rate ER', er, { primary: mode === 'toER' }), rateAnswer(`Nominal rate, compounded ${freqName(m)}`, r, { primary: mode === 'toNom' })];
    if (m !== 'c') answers.push(rateAnswer('Rate per period i = r/m', r / m));
    let final = mode === 'toER' ? `ER \\approx ${pctTex(er)}` : `r \\approx ${pctTex(r)}\\ \\text{compounded ${freqName(m)}}`;
    if (mode === 'convert') {
      const r2 = toNominal(er, m2);
      steps.push({ title: `Nominal rate compounded ${freqName(m2)} with the same ER`, tex: m2 === 'c' ? `r_2 = \\ln(1 + ER) \\approx ${pctTex(r2)}` : `r_2 = ${m2}\\left[(1 + ${dec(er, 8)})^{1/${m2}} - 1\\right] \\approx ${pctTex(r2)}` });
      answers.unshift(rateAnswer(`Equivalent nominal rate, ${freqName(m2)}`, r2, { primary: true }));
      final = `${pctTex(r)}\\ \\text{(${freqName(m)})} \\equiv ${pctTex(r2)}\\ \\text{(${freqName(m2)})}`;
    }
    // How the effective rate changes with compounding, for the same nominal rate.
    const rows = COMPOUNDING.map(([k, label]) => { const mk = readM(k); return [label, pct(toEffective(r, mk))]; });
    return {
      ok: true,
      final: { tex: final },
      answers,
      tables: [{ caption: `Effective rate of a ${pct(r)} nominal rate for each compounding frequency`, headers: ['Compounded', 'Effective annual rate'], rows }],
      formula: ['ER = \\left(1 + \\frac{r}{m}\\right)^{m} - 1 \\qquad ER_{\\text{continuous}} = e^{r} - 1'],
      steps,
      notes: [{ kind: 'info', text: 'Two rates are equivalent when they have the same effective annual rate: they grow money by the same amount in a year. Compare loans and deposits by their effective rates, not their nominal rates.' }],
    };
  },
};
