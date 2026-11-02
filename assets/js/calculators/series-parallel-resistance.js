/**
 * Equivalent resistance of resistors in series, in parallel, or as parallel branches that
 * each contain resistors in series. Optionally a supply voltage gives the total current and
 * the current and voltage for every resistor.
 *   series:   R = R₁ + R₂ + …        parallel:  1/R = 1/R₁ + 1/R₂ + …
 */
import { answer, fmt, tx } from '../lib/calc-kit.js';
import { parseDecimal } from '../lib/parse.js';
import { q, rel, networkDiagram } from '../lib/physics-kit.js';
import { resistorPractice } from '../explore/physics.js';

const ohm = (x) => `${fmt(x, 4)} Ω`;

function parseBranches(raw, config) {
  const text = String(raw ?? '').trim();
  if (!text) return { error: 'Enter the resistances, for example 10, 20, 30.' };
  const groups = config === 'mixed' ? text.split(';') : [text];
  const branches = [];
  let count = 0;
  for (const g of groups) {
    const parts = g.split(/[\s,]+/).filter(Boolean);
    if (!parts.length) return { error: 'One of the branches is empty. Remove the extra semicolon or add a resistance.' };
    const br = [];
    for (const p of parts) {
      const r = parseDecimal(p.replace(/(Ω|ohms?)$/i, ''), 'each resistance');
      if (!r.ok) return { error: `“${p}” is not a resistance. Use numbers in ohms separated by commas${config === 'mixed' ? ', with semicolons between branches' : ''}.` };
      if (!(r.value > 0)) return { error: 'Every resistance must be greater than 0 Ω.' };
      if (r.value < 1e-9) return { error: 'Please keep each resistance at least 10⁻⁹ Ω; smaller values are effectively a short circuit.' };
      if (r.value > 1e12) return { error: 'Please keep each resistance below 10¹² Ω.' };
      br.push(r.value);
      count++;
    }
    branches.push(br);
  }
  if (count > 20) return { error: 'Please enter at most 20 resistors.' };
  if (config === 'mixed' && branches.length < 2) return { error: 'For parallel branches, separate at least two branches with a semicolon, for example 10, 20; 30.' };
  if (config !== 'mixed' && count < 2 && config === 'parallel') return { error: 'Enter at least two resistances to connect in parallel.' };
  return { branches: config === 'parallel' ? branches[0].map((r) => [r]) : config === 'series' ? [branches[0]] : branches };
}

export const calculator = {
  id: 'series-parallel-resistance',
  practice: resistorPractice,
  fields: [
    { name: 'config', label: 'How are the resistors connected?', type: 'radio', options: [['series', 'Series'], ['parallel', 'Parallel'], ['mixed', 'Parallel branches']] },
    { name: 'list', label: 'Resistances (Ω)', type: 'text', placeholder: 'e.g. 10, 20, 30', hint: 'Separate values with commas. For parallel branches, put a semicolon between branches: "10, 20; 30" means (10 + 20) in parallel with 30.' },
    { name: 'V', label: 'Supply voltage (optional)', type: 'number', signed: false, placeholder: 'leave blank to skip', suffix: 'V' },
  ],
  examples: [
    { label: 'Series: 10, 20, 30 Ω on 12 V', values: { config: 'series', list: '10, 20, 30', V: '12' } },
    { label: 'Parallel: 6 Ω and 3 Ω on 12 V', values: { config: 'parallel', list: '6, 3', V: '12' } },
    { label: 'Branches: (10 + 20) ∥ 30 Ω', values: { config: 'mixed', list: '10, 20; 30', V: '9' } },
    { label: 'Three equal 300 Ω in parallel', values: { config: 'parallel', list: '300, 300, 300', V: '' } },
  ],
  solve(values) {
    const config = ['series', 'parallel', 'mixed'].includes(values.config) ? values.config : 'series';
    const P = parseBranches(values.list, config);
    if (P.error) return { ok: false, errors: [{ field: 'list', message: P.error }] };
    let V = null;
    if (String(values.V ?? '').trim() !== '') {
      const p = parseDecimal(values.V, 'the supply voltage');
      if (!p.ok) return { ok: false, errors: [{ field: 'V', message: p.error }] };
      if (p.value < 0 || p.value > 1e9) return { ok: false, errors: [{ field: 'V', message: 'The supply voltage must be between 0 and 1,000,000,000 V.' }] };
      V = p.value;
    }
    const { branches } = P;
    const branchR = branches.map((b) => b.reduce((s, r) => s + r, 0));
    const Req = 1 / branchR.reduce((s, r) => s + 1 / r, 0);
    if (!Number.isFinite(Req) || Req <= 0) return { ok: false, errors: [{ field: 'list', message: 'These resistances are too extreme to combine reliably.' }] };
    const steps = [];
    const all = branches.flat();
    const sub = (i) => `R_{${i + 1}}`;
    if (config === 'series') {
      steps.push({ title: 'Known values', tex: all.map((r, i) => `${sub(i)} = ${q(r, 'Ω')}`).join(',\\ ') });
      steps.push({ title: 'In series, resistances add', tex: `R_{\\text{eq}} = ${all.map((_, i) => sub(i)).join(' + ')}` });
      steps.push({ title: 'Substitute and simplify', tex: `R_{\\text{eq}} = ${all.map((r) => tx(r, 4)).join(' + ')} ${rel(Req)} ${q(Req, 'Ω')}` });
    } else if (config === 'parallel') {
      steps.push({ title: 'Known values', tex: all.map((r, i) => `${sub(i)} = ${q(r, 'Ω')}`).join(',\\ ') });
      steps.push({ title: 'In parallel, reciprocals add', tex: `\\frac{1}{R_{\\text{eq}}} = ${all.map((_, i) => `\\frac{1}{${sub(i)}}`).join(' + ')}` });
      steps.push({ title: 'Substitute', tex: `\\frac{1}{R_{\\text{eq}}} = ${all.map((r) => `\\frac{1}{${tx(r, 4)}}`).join(' + ')} ${rel(1 / Req, 6)} ${tx(1 / Req, 6)}\\,\\Omega^{-1}` });
      steps.push({ title: 'Take the reciprocal', tex: `R_{\\text{eq}} = \\frac{1}{${tx(1 / Req, 6)}} ${rel(Req)} ${q(Req, 'Ω')}` });
      if (all.length === 2) steps.push({ title: 'Shortcut for two resistors: product over sum', tex: `R_{\\text{eq}} = \\frac{R_1 R_2}{R_1 + R_2} = \\frac{${tx(all[0], 4)} \\times ${tx(all[1], 4)}}{${tx(all[0], 4)} + ${tx(all[1], 4)}} ${rel(Req)} ${q(Req, 'Ω')}` });
    } else {
      branches.forEach((b, i) => steps.push({ title: `Branch ${i + 1}: series resistances add`, tex: `R_{B${i + 1}} = ${b.map((r) => tx(r, 4)).join(' + ')} ${rel(branchR[i])} ${q(branchR[i], 'Ω')}` }));
      steps.push({ title: 'Branches in parallel: reciprocals add', tex: `\\frac{1}{R_{\\text{eq}}} = ${branchR.map((r) => `\\frac{1}{${tx(r, 4)}}`).join(' + ')} ${rel(1 / Req, 6)} ${tx(1 / Req, 6)}\\,\\Omega^{-1}` });
      steps.push({ title: 'Take the reciprocal', tex: `R_{\\text{eq}} ${rel(Req)} ${q(Req, 'Ω')}` });
    }
    const answers = [answer('Equivalent resistance', Req, { unit: 'Ω', primary: true })];
    const tables = [];
    const notes = [{ kind: 'info', text: 'Assumes ideal wires (no resistance) and ohmic resistors. Check: a series total is larger than every resistor; a parallel total is smaller than the smallest one.' }];
    if (V !== null) {
      const I = V / Req;
      answers.push(answer('Total current', I, { unit: 'A' }), answer('Total power', V * I, { unit: 'W' }));
      steps.push({ title: 'Total current from Ohm’s law', tex: `I = \\frac{V}{R_{\\text{eq}}} = \\frac{${q(V, 'V')}}{${q(Req, 'Ω')}} ${rel(I)} ${q(I, 'A')}` });
      const rows = [];
      let n = 0;
      branches.forEach((b, i) => {
        const Ib = V / branchR[i]; // every branch sees the full supply voltage
        b.forEach((r) => { n++; rows.push([`R${n}`, ohm(r), `${fmt(Ib, 6)} A`, `${fmt(Ib * r, 6)} V`, `${fmt(Ib * Ib * r, 6)} W`]); });
      });
      tables.push({ caption: 'Current, voltage and power for each resistor', headers: ['Resistor', 'R', 'Current', 'Voltage', 'Power'], rows });
      notes.push({ kind: 'info', text: config === 'series' ? 'In series the same current flows through every resistor, and their voltages add up to the supply voltage.' : 'Parallel branches all have the full supply voltage across them, and their currents add up to the total current.' });
    }
    return {
      ok: true,
      final: { tex: `R_{\\text{eq}} ${rel(Req)} ${q(Req, 'Ω')}` },
      answers,
      visual: { svg: networkDiagram(branches.map((b) => b.map(ohm)), 'Resistor network between A and B'), caption: 'The equivalent resistance is measured between terminals A and B.' },
      formula: ['R_{\\text{series}} = R_1 + R_2 + \\cdots \\qquad \\frac{1}{R_{\\text{parallel}}} = \\frac{1}{R_1} + \\frac{1}{R_2} + \\cdots'],
      steps,
      tables,
      notes,
    };
  },
};
