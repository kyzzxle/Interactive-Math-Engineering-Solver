/**
 * Thermal expansion and calorimetry (no phase changes):
 *   linear expansion   ΔL = α L₀ ΔT          volume expansion  ΔV = β V₀ ΔT (β ≈ 3α for solids)
 *   heat               Q = m c ΔT
 *   mixing             two substances reach T_f = (m₁c₁T₁ + m₂c₂T₂)/(m₁c₁ + m₂c₂) in an insulated container
 * Typical α and c values are provided for common materials.
 */
import { validator, answer, tx, fmt } from '../lib/calc-kit.js';
import { q, rel } from '../lib/physics-kit.js';
import { plot } from '../lib/plot.js';
import { randInt, pick } from '../lib/learn.js';

// [label, α (1/K), specific heat c (J/(kg·K)), β (1/K) for liquids]
const MATERIALS = {
  steel: ['Steel', 12e-6, 490], aluminium: ['Aluminium', 23e-6, 900], copper: ['Copper', 17e-6, 385], glass: ['Glass (ordinary)', 9e-6, 840], concrete: ['Concrete', 12e-6, 880],
  water: ['Water', null, 4186, 2.1e-4], ethanol: ['Ethanol', null, 2440, 1.1e-3], mercury: ['Mercury', null, 140, 1.82e-4], ice: ['Ice', 51e-6, 2100], custom: ['Custom value', null, null],
};
const SOLIDS = ['steel', 'aluminium', 'copper', 'glass', 'concrete', 'custom'];
const ALL = Object.keys(MATERIALS);
const opt = (keys) => keys.map((k) => [k, MATERIALS[k][0]]);

export const calculator = {
  id: 'thermal-expansion-calorimetry',
  practice: {
    title: 'Heating water',
    generate(rand) {
      const m = pick(rand, [0.25, 0.5, 1, 1.5, 2]), T1 = randInt(rand, 10, 25), T2 = randInt(rand, 40, 95);
      const Q = m * 4186 * (T2 - T1);
      return {
        prompt: `<p>How much heat is needed to warm <strong>${m} kg</strong> of water from <strong>${T1} °C</strong> to <strong>${T2} °C</strong>? (c = 4186 J/(kg·K)). Give the answer in kilojoules.</p>`,
        answers: [{ label: 'Heat', value: Q / 1000, unit: 'kJ' }],
        hint: 'Q = m c ΔT, then divide joules by 1000.',
        hintTex: 'Q = m\\,c\\,\\Delta T',
        steps: [{ title: 'Temperature change', tex: `\\Delta T = ${T2} - ${T1} = ${T2 - T1}\\ \\text{K}` }, { title: 'Heat', tex: `Q = ${m}(4186)(${T2 - T1}) = ${Q}\\ \\text{J} = ${tx(Q / 1000, 3)}\\ \\text{kJ}` }],
      };
    },
  },
  fields: [
    { name: 'mode', label: 'Calculation', type: 'select', options: [['linear', 'Linear expansion of a rod (ΔL = αL₀ΔT)'], ['volume', 'Volume expansion (ΔV = βV₀ΔT)'], ['heat', 'Heat to change temperature (Q = mcΔT)'], ['mix', 'Final temperature when two substances mix']] },
    { name: 'mat', label: 'Material', type: 'select', options: opt(SOLIDS), showWhen: { mode: ['linear'] } },
    { name: 'matV', label: 'Material', type: 'select', options: opt(['water', 'ethanol', 'mercury', 'steel', 'aluminium', 'copper', 'glass', 'custom']), showWhen: { mode: ['volume'] } },
    { name: 'coef', label: 'Custom coefficient (1/K)', type: 'number', signed: false, placeholder: 'e.g. 1.2e-5', showWhen: { mode: ['linear', 'volume'] }, hint: 'Only used when the material is "Custom value".' },
    { name: 'L0', label: 'Original size (length L₀ in m, or volume V₀ in m³)', type: 'number', signed: false, placeholder: 'e.g. 20', showWhen: { mode: ['linear', 'volume'] } },
    { name: 'dT', label: 'Temperature change ΔT', type: 'number', placeholder: 'e.g. 35', suffix: 'K or °C', showWhen: { mode: ['linear', 'volume'] } },
    { name: 'matH', label: 'Substance', type: 'select', options: opt(ALL), showWhen: { mode: ['heat'] } },
    { name: 'c', label: 'Custom specific heat c', type: 'number', signed: false, placeholder: 'e.g. 4186', suffix: 'J/(kg·K)', showWhen: { mode: ['heat'] } },
    { name: 'm', label: 'Mass m', type: 'number', signed: false, placeholder: 'e.g. 2', suffix: 'kg', showWhen: { mode: ['heat'] } },
    { name: 'T1', label: 'Initial temperature', type: 'number', placeholder: 'e.g. 20', suffix: '°C', row: 'tt', showWhen: { mode: ['heat'] }, rowShowWhen: { mode: ['heat'] } },
    { name: 'T2', label: 'Final temperature', type: 'number', placeholder: 'e.g. 80', suffix: '°C', row: 'tt', showWhen: { mode: ['heat'] } },
    { name: 'mat1', label: 'Substance 1', type: 'select', options: opt(ALL.filter((k) => k !== 'custom')), row: 's1', showWhen: { mode: ['mix'] }, rowShowWhen: { mode: ['mix'] } },
    { name: 'm1', label: 'Mass 1 (kg)', type: 'number', signed: false, placeholder: 'e.g. 0.2', row: 's1', showWhen: { mode: ['mix'] } },
    { name: 't1', label: 'Temperature 1 (°C)', type: 'number', placeholder: 'e.g. 90', row: 's1', showWhen: { mode: ['mix'] } },
    { name: 'mat2', label: 'Substance 2', type: 'select', options: opt(ALL.filter((k) => k !== 'custom')), default: 'water', row: 's2', showWhen: { mode: ['mix'] }, rowShowWhen: { mode: ['mix'] } },
    { name: 'm2', label: 'Mass 2 (kg)', type: 'number', signed: false, placeholder: 'e.g. 0.5', row: 's2', showWhen: { mode: ['mix'] } },
    { name: 't2', label: 'Temperature 2 (°C)', type: 'number', placeholder: 'e.g. 20', row: 's2', showWhen: { mode: ['mix'] } },
  ],
  examples: [
    { label: '20 m steel rail warms by 35 °C', values: { mode: 'linear', mat: 'steel', L0: '20', dT: '35' } },
    { label: '2 kg of water from 20 °C to 80 °C', values: { mode: 'heat', matH: 'water', m: '2', T1: '20', T2: '80' } },
    { label: 'Hot copper (0.2 kg, 90 °C) into water (0.5 kg, 20 °C)', values: { mode: 'mix', mat1: 'copper', m1: '0.2', t1: '90', mat2: 'water', m2: '0.5', t2: '20' } },
    { label: '1 L of ethanol warms by 30 °C', values: { mode: 'volume', matV: 'ethanol', L0: '0.001', dT: '30' } },
    { label: 'Invalid: custom material without a value', values: { mode: 'heat', matH: 'custom', c: '', m: '1', T1: '20', T2: '30' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const mode = ['linear', 'volume', 'heat', 'mix'].includes(values.mode) ? values.mode : 'linear';
    if (mode === 'linear' || mode === 'volume') {
      const key = mode === 'linear' ? (SOLIDS.includes(values.mat) ? values.mat : 'steel') : (MATERIALS[values.matV] ? values.matV : 'water');
      const M = MATERIALS[key];
      let coef = key === 'custom' ? v.number('coef', 'the coefficient', { positive: true, maxAbs: 1 }) : mode === 'linear' ? M[1] : M[3] ?? 3 * M[1];
      const L0 = v.number('L0', 'the original size', { positive: true, maxAbs: 1e9 }), dT = v.number('dT', 'ΔT', { maxAbs: 5000 });
      if (!v.ok()) return v.result();
      const d = coef * L0 * dT, sym = mode === 'linear' ? 'L' : 'V', unit = mode === 'linear' ? 'm' : 'm³', g = mode === 'linear' ? '\\alpha' : '\\beta';
      const steps = [
        { title: 'Known values', tex: `${g} = ${tx(coef, 8)}\\ \\text{K}^{-1}\\ (${M[0]}),\\quad ${sym}_0 = ${q(L0, unit)},\\quad \\Delta T = ${q(dT, 'K')}` },
        { title: 'Formula', tex: `\\Delta ${sym} = ${g}\\,${sym}_0\\,\\Delta T` },
        { title: 'Substitute', tex: `\\Delta ${sym} = (${tx(coef, 8)})(${tx(L0)})(${tx(dT)}) ${rel(d, 8)} ${q(d, unit, 8)}` },
        { title: 'New size', tex: `${sym} = ${sym}_0 + \\Delta ${sym} ${rel(L0 + d, 8)} ${q(L0 + d, unit, 8)}` },
      ];
      if (mode === 'volume' && M[3] === undefined && key !== 'custom') steps.splice(1, 0, { title: 'Solid: use β ≈ 3α', tex: `\\beta \\approx 3 \\times ${tx(M[1], 8)} = ${tx(coef, 8)}\\ \\text{K}^{-1}` });
      return {
        ok: true,
        final: { tex: `\\Delta ${sym} ${rel(d, 8)} ${q(d, unit, 8)}` },
        answers: [answer(`Change in ${mode === 'linear' ? 'length' : 'volume'}`, d, { unit, primary: true, decimals: 9 }), answer(mode === 'linear' ? 'In millimetres' : 'In litres', mode === 'linear' ? d * 1000 : d * 1000, { unit: mode === 'linear' ? 'mm' : 'L', decimals: 6 }), answer(`New ${mode === 'linear' ? 'length' : 'volume'}`, L0 + d, { unit, decimals: 9 }), answer('Percentage change', 100 * coef * dT, { unit: '%', decimals: 6 })],
        visual: { svg: plot({ x: [0, Math.max(10, Math.abs(dT) * 1.3)], width: 380, height: 220, title: 'Expansion grows in proportion to the temperature change', curves: [{ f: (t) => coef * L0 * t * (mode === 'linear' ? 1000 : 1000) }], points: [{ x: Math.abs(dT), y: Math.abs(d) * 1000, label: `${fmt(Math.abs(d) * 1000, 4)} ${mode === 'linear' ? 'mm' : 'L'}`, cls: 'd-point3' }], xLabel: 'ΔT (K)', yLabel: mode === 'linear' ? 'ΔL (mm)' : 'ΔV (L)' }), caption: 'The change is tiny compared with the original size, but it is why bridges and rails need expansion gaps.' },
        formula: [mode === 'linear' ? '\\Delta L = \\alpha L_0 \\Delta T' : '\\Delta V = \\beta V_0 \\Delta T'],
        steps,
        notes: [{ kind: 'info', text: 'Coefficients are typical room-temperature values (real materials vary) and assumed constant over the temperature range. A temperature change of 1 °C equals 1 K. Negative ΔT gives contraction.' }],
      };
    }
    if (mode === 'heat') {
      const key = MATERIALS[values.matH] ? values.matH : 'water';
      const c = key === 'custom' ? v.number('c', 'the specific heat', { positive: true, maxAbs: 1e6 }) : MATERIALS[key][2];
      const m = v.number('m', 'the mass', { positive: true, maxAbs: 1e9 }), T1 = v.number('T1', 'the initial temperature', { min: -273.15, maxAbs: 1e5 }), T2 = v.number('T2', 'the final temperature', { min: -273.15, maxAbs: 1e5 });
      if (!v.ok()) return v.result();
      const dT = T2 - T1, Q = m * c * dT;
      const notes = [{ kind: 'info', text: 'No phase change is included: water must stay liquid (between 0 °C and 100 °C at normal pressure). Melting or boiling needs latent heat as well.' }];
      if (key === 'water' && (Math.min(T1, T2) < 0 || Math.max(T1, T2) > 100)) notes.unshift({ kind: 'warn', text: 'This temperature range crosses 0 °C or 100 °C, where water freezes or boils. The latent heat of that change is not included, so the real heat needed is much larger.' });
      return {
        ok: true,
        final: { tex: `Q ${rel(Q)} ${q(Q, 'J')}` },
        answers: [answer('Heat Q', Q, { unit: 'J', primary: true }), answer('In kilojoules', Q / 1000, { unit: 'kJ' }), answer('In kilowatt-hours', Q / 3.6e6, { unit: 'kWh', irrational: true })],
        visual: { svg: plot({ x: [0, Math.max(1, Math.abs(Q)) * 1.2 / 1000], width: 380, height: 220, title: 'Temperature against heat added', curves: [{ f: (kJ) => (kJ * 1000 <= Math.abs(Q) * 1.2 ? T1 + Math.sign(dT || 1) * (kJ * 1000) / (m * c) : NaN) }], points: [{ x: Math.abs(Q) / 1000, y: T2, label: `${fmt(T2)} °C`, cls: 'd-point3' }], xLabel: 'heat (kJ)', yLabel: 'T (°C)' }), caption: 'Without a phase change the temperature rises in a straight line; the slope is 1/(mc).' },
        formula: ['Q = m\\,c\\,\\Delta T'],
        steps: [
          { title: 'Known values', tex: `m = ${q(m, 'kg')},\\quad c = ${q(c, 'J/(kg K)')}\\ (${MATERIALS[key][0]}),\\quad \\Delta T = ${tx(T2)} - ${tx(T1)} = ${q(dT, 'K')}` },
          { title: 'Formula', tex: 'Q = m\\,c\\,\\Delta T' },
          { title: 'Substitute', tex: `Q = (${tx(m)})(${tx(c)})(${tx(dT)}) ${rel(Q)} ${q(Q, 'J')}` },
        ],
        notes: dT < 0 ? [{ kind: 'info', text: 'Q is negative: heat is given out as the substance cools.' }, ...notes] : notes,
      };
    }
    const k1 = MATERIALS[values.mat1] && values.mat1 !== 'custom' ? values.mat1 : 'copper', k2 = MATERIALS[values.mat2] && values.mat2 !== 'custom' ? values.mat2 : 'water';
    const c1 = MATERIALS[k1][2], c2 = MATERIALS[k2][2];
    const m1 = v.number('m1', 'mass 1', { positive: true, maxAbs: 1e9 }), t1 = v.number('t1', 'temperature 1', { min: -273.15, maxAbs: 1e5 }), m2 = v.number('m2', 'mass 2', { positive: true, maxAbs: 1e9 }), t2 = v.number('t2', 'temperature 2', { min: -273.15, maxAbs: 1e5 });
    if (!v.ok()) return v.result();
    const C1 = m1 * c1, C2 = m2 * c2, Tf = (C1 * t1 + C2 * t2) / (C1 + C2);
    const Q1 = C1 * (Tf - t1), Q2 = C2 * (Tf - t2);
    return {
      ok: true,
      final: { tex: `T_f ${rel(Tf, 4)} ${tx(Tf, 4)}\\ ^\\circ\\text{C}` },
      answers: [answer('Final temperature', Tf, { unit: '°C', primary: true, decimals: 4 }), answer(`Heat lost by ${MATERIALS[t1 >= t2 ? k1 : k2][0].toLowerCase()}`, Math.abs(t1 >= t2 ? Q1 : Q2), { unit: 'J' }), answer('Heat gained by the other', Math.abs(t1 >= t2 ? Q2 : Q1), { unit: 'J' })],
      visual: { svg: plot({ x: [0, 1], y: [Math.min(t1, t2) - 5, Math.max(t1, t2) + 5], width: 380, height: 220, title: 'Temperatures approach the same final value', curves: [{ f: (s) => Tf + (t1 - Tf) * Math.exp(-5 * s) }, { f: (s) => Tf + (t2 - Tf) * Math.exp(-5 * s), cls: 'd-line2' }], hlines: [{ y: Tf, cls: 'd-line3', label: `T_f ≈ ${fmt(Tf, 2)} °C` }], xLabel: 'time →' }), caption: 'Illustration only: the final temperature is exact (from conservation of energy), but how fast they get there depends on the container and stirring.' },
      formula: ['m_1 c_1 (T_f - T_1) + m_2 c_2 (T_f - T_2) = 0'],
      steps: [
        { title: 'Known values', texLines: [`\\text{${MATERIALS[k1][0]}: } m_1 = ${q(m1, 'kg')},\\ c_1 = ${tx(c1)},\\ T_1 = ${tx(t1)}\\ ^\\circ\\text{C}`, `\\text{${MATERIALS[k2][0]}: } m_2 = ${q(m2, 'kg')},\\ c_2 = ${tx(c2)},\\ T_2 = ${tx(t2)}\\ ^\\circ\\text{C}`] },
        { title: 'Heat lost by the hot one = heat gained by the cold one', tex: 'm_1 c_1 (T_f - T_1) + m_2 c_2 (T_f - T_2) = 0' },
        { title: 'Solve for the final temperature', tex: `T_f = \\frac{m_1 c_1 T_1 + m_2 c_2 T_2}{m_1 c_1 + m_2 c_2} = \\frac{${tx(C1, 4)}(${tx(t1)}) + ${tx(C2, 4)}(${tx(t2)})}{${tx(C1, 4)} + ${tx(C2, 4)}} ${rel(Tf, 4)} ${tx(Tf, 4)}\\ ^\\circ\\text{C}` },
        { title: 'Check the energy balance', tex: `Q_1 ${rel(Q1)} ${q(Q1, 'J')},\\quad Q_2 ${rel(Q2)} ${q(Q2, 'J')},\\quad Q_1 + Q_2 = 0\\ \\checkmark` },
      ],
      notes: [{ kind: 'info', text: 'Assumes an insulated container that absorbs no heat, no heat lost to the surroundings, and no melting or boiling. Specific heats are typical values.' }],
    };
  },
};
