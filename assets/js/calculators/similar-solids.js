/**
 * Similar solids: if corresponding lengths are in the ratio k, areas are in the ratio k² and
 * volumes in the ratio k³. Given any one ratio (or two corresponding lengths) the others are
 * found, exactly when the roots are rational; known areas or volumes are then scaled.
 */
import { validator, answer, tx, fmt } from '../lib/calc-kit.js';
import { parseFrac, Frac } from '../lib/fraction.js';
import { plot } from '../lib/plot.js';
import { randInt, pick } from '../lib/learn.js';
import { similarExplore } from '../explore/solids-practice.js';

/** Exact n-th root of a positive fraction when both parts are perfect powers, else null. */
function exactRoot(f, n) {
  const root = (big) => {
    if (big < 0n) return null;
    let x = BigInt(Math.round(Number(big) ** (1 / n)));
    for (const c of [x - 1n, x, x + 1n]) if (c >= 0n && c ** BigInt(n) === big) return c;
    return null;
  };
  const a = root(f.n), b = root(f.d);
  return a !== null && b !== null ? new Frac(a, b) : null;
}

export const calculator = {
  id: 'similar-solids',
  explore: similarExplore,
  practice: {
    title: 'Scale a similar solid',
    generate(rand) {
      const k = pick(rand, [2, 3, 4, 0.5, 1.5, 2.5]), V1 = randInt(rand, 2, 60), A1 = randInt(rand, 10, 90);
      return {
        prompt: `<p>Two similar statues have heights in the ratio <strong>1 : ${k}</strong>. The smaller one has volume <strong>${V1} cm³</strong> and surface area <strong>${A1} cm²</strong>. Find the volume and surface area of the larger one.</p>`,
        answers: [{ label: 'Larger volume', value: V1 * k ** 3, unit: 'cm³' }, { label: 'Larger area', value: A1 * k ** 2, unit: 'cm²' }],
        hint: 'Lengths scale by k, areas by k², volumes by k³.',
        hintTex: '\\frac{V_2}{V_1} = k^3 \\qquad \\frac{A_2}{A_1} = k^2',
        steps: [
          { title: 'Scale factor', tex: `k = ${k}` },
          { title: 'Volume', tex: `V_2 = V_1 k^3 = ${V1} \\times ${k}^3 = ${tx(V1 * k ** 3)}\\,\\text{cm}^3` },
          { title: 'Area', tex: `A_2 = A_1 k^2 = ${A1} \\times ${k}^2 = ${tx(A1 * k ** 2)}\\,\\text{cm}^2` },
        ],
      };
    },
  },
  fields: [
    { name: 'given', label: 'What do you know?', type: 'select', options: [['lengths', 'Two corresponding lengths'], ['k', 'The length ratio (scale factor) k'], ['area', 'The ratio of surface areas'], ['volume', 'The ratio of volumes']] },
    { name: 'L1', label: 'Length on solid 1', type: 'number', signed: false, placeholder: 'e.g. 4', row: 'L', showWhen: { given: ['lengths'] }, rowShowWhen: { given: ['lengths'] } },
    { name: 'L2', label: 'Matching length on solid 2', type: 'number', signed: false, placeholder: 'e.g. 6', row: 'L', showWhen: { given: ['lengths'] } },
    { name: 'ratio', label: 'Ratio (solid 2 ÷ solid 1)', type: 'text', placeholder: 'e.g. 3/2 or 8', showWhen: { given: ['k', 'area', 'volume'] }, hint: 'A number or a fraction such as 27/8.' },
    { name: 'A1', label: 'Surface area of solid 1 (optional)', type: 'number', signed: false, placeholder: 'optional', row: 'known' },
    { name: 'V1', label: 'Volume of solid 1 (optional)', type: 'number', signed: false, placeholder: 'optional', row: 'known' },
  ],
  examples: [
    { label: 'Heights 4 cm and 6 cm, V₁ = 64 cm³', values: { given: 'lengths', L1: '4', L2: '6', A1: '', V1: '64' } },
    { label: 'Volume ratio 27/8, area 40', values: { given: 'volume', ratio: '27/8', A1: '40', V1: '' } },
    { label: 'Area ratio 2 (irrational k)', values: { given: 'area', ratio: '2', A1: '', V1: '10' } },
    { label: 'Invalid: negative ratio', values: { given: 'k', ratio: '-2', A1: '', V1: '' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const given = ['lengths', 'k', 'area', 'volume'].includes(values.given) ? values.given : 'lengths';
    let given1 = null;
    if (given === 'lengths') {
      const L1 = v.number('L1', 'the first length', { positive: true, maxAbs: 1e9 }), L2 = v.number('L2', 'the second length', { positive: true, maxAbs: 1e9 });
      if (v.ok() && !(L2 / L1 <= 1e12 && L2 / L1 >= 1e-12)) v.fail('L2', 'The two lengths differ by more than a factor of 10¹²; please check them.');
      if (v.ok()) { const f1 = parseFrac(values.L1), f2 = parseFrac(values.L2); given1 = { value: L2 / L1, frac: f1 && f2 ? f2.div(f1) : null, L1, L2 }; }
    } else {
      const f = v.frac('ratio', 'the ratio');
      if (f && f.sign() <= 0) v.fail('ratio', 'The ratio must be greater than 0.');
      else if (f && (f.toNumber() > 1e12 || f.toNumber() < 1e-12)) v.fail('ratio', 'Please keep the ratio between 10⁻¹² and 10¹².');
      else if (f) given1 = { value: f.toNumber(), frac: f };
    }
    const optional = (name, label) => (String(values[name] ?? '').trim() === '' ? null : v.number(name, label, { positive: true, maxAbs: 1e12 }));
    const A1 = optional('A1', 'the surface area'), V1 = optional('V1', 'the volume');
    if (!v.ok()) return v.result();
    const n = { lengths: 1, k: 1, area: 2, volume: 3 }[given];
    const kFrac = given1.frac ? (n === 1 ? given1.frac : exactRoot(given1.frac, n)) : null;
    const k = given1.value ** (1 / n);
    const sym = { 1: 'k', 2: 'k^2', 3: 'k^3' }[n];
    const kTex = kFrac ? kFrac.toTex() : tx(k);
    const rel = kFrac ? '=' : '\\approx';
    const steps = [{ title: 'Similar solids', text: 'Every length of solid 2 is k times the matching length of solid 1, so areas are multiplied by k² and volumes by k³.' }];
    if (given === 'lengths') steps.push({ title: 'Scale factor from the lengths', tex: `k = \\frac{L_2}{L_1} = \\frac{${tx(given1.L2)}}{${tx(given1.L1)}} ${rel} ${kTex}` });
    else steps.push({ title: `Undo the power: the given ratio is ${sym}`, tex: `${sym} = ${given1.frac.toTex()} \\;\\Rightarrow\\; k = ${n === 1 ? '' : n === 2 ? `\\sqrt{${given1.frac.toTex()}}` : `\\sqrt[3]{${given1.frac.toTex()}}`} ${n === 1 ? kTex : `${rel} ${kTex}`}`.replace('k =  ', 'k = ') });
    const k2 = kFrac ? kFrac.pow(2) : null, k3 = kFrac ? kFrac.pow(3) : null;
    steps.push({ title: 'Area and volume ratios', texLines: [`\\frac{A_2}{A_1} = k^2 ${k2 ? `= ${k2.toTex()}` : `\\approx ${tx(k * k)}`}`, `\\frac{V_2}{V_1} = k^3 ${k3 ? `= ${k3.toTex()}` : `\\approx ${tx(k ** 3)}`}`] });
    const answers = [
      answer('Length ratio k', k, { primary: true, exactTex: kFrac && !kFrac.isInt() ? kFrac.toTex() : undefined, irrational: !kFrac }),
      answer('Area ratio k²', k * k, { exactTex: k2 && !k2.isInt() ? k2.toTex() : undefined, irrational: !k2 }),
      answer('Volume ratio k³', k ** 3, { exactTex: k3 && !k3.isInt() ? k3.toTex() : undefined, irrational: !k3 }),
    ];
    if (A1 !== null) { answers.push(answer('Surface area of solid 2', A1 * k * k, { primary: true, irrational: !k2 })); steps.push({ title: 'Scale the surface area', tex: `A_2 = A_1 k^2 = ${tx(A1)} \\times ${k2 ? k2.toTex() : tx(k * k)} ${k2 ? '=' : '\\approx'} ${tx(A1 * k * k)}` }); }
    if (V1 !== null) { answers.push(answer('Volume of solid 2', V1 * k ** 3, { primary: true, irrational: !k3 })); steps.push({ title: 'Scale the volume', tex: `V_2 = V_1 k^3 = ${tx(V1)} \\times ${k3 ? k3.toTex() : tx(k ** 3)} ${k3 ? '=' : '\\approx'} ${tx(V1 * k ** 3)}` }); }
    if (steps.length < 4) steps.push({ title: 'Using the ratios', text: 'Enter a surface area or volume of solid 1 to scale it to solid 2.' });
    // two similar cubes, side by side, drawn to scale
    const s1 = 1, s2 = Math.min(k, 6), off = s1 + 0.6;
    const box = (x0, s, cls) => [[x0, 0, x0 + s, 0], [x0 + s, 0, x0 + s, s], [x0 + s, s, x0, s], [x0, s, x0, 0], [x0, s, x0 + 0.4 * s, 1.4 * s], [x0 + s, s, x0 + 1.4 * s, 1.4 * s], [x0 + 0.4 * s, 1.4 * s, x0 + 1.4 * s, 1.4 * s], [x0 + s, 0, x0 + 1.4 * s, 0.4 * s], [x0 + 1.4 * s, 0.4 * s, x0 + 1.4 * s, 1.4 * s]].map(([x1, y1, x2, y2]) => ({ x1, y1, x2, y2, cls }));
    const W = off + 1.5 * s2 + 0.3;
    const svg = plot({ x: [-0.3, W], y: [-0.3, Math.max(1.6, 1.5 * s2)], equal: true, width: 360, height: 220, includeZero: false, title: 'Two similar cubes', segments: [...box(0, s1, 'd-line'), ...box(off, s2, 'd-line2')], points: [{ x: 0.5, y: -0.05, label: 'solid 1', r: 0.1 }, { x: off + s2 / 2, y: -0.05, label: `solid 2 (×${fmt(k, 3)})`, r: 0.1 }] });
    return {
      ok: true,
      final: { texLines: [`k ${rel} ${kTex},\\quad k^2 ${k2 ? '=' : '\\approx'} ${k2 ? k2.toTex() : tx(k * k)},\\quad k^3 ${k3 ? '=' : '\\approx'} ${k3 ? k3.toTex() : tx(k ** 3)}`] },
      answers,
      visual: { svg, caption: k > 6 ? 'Solid 2 is drawn at 6 times the size so it fits; the true scale factor is larger.' : 'Every edge of the green cube is k times the matching edge of the blue cube.' },
      formula: ['\\frac{L_2}{L_1} = k \\qquad \\frac{A_2}{A_1} = k^2 \\qquad \\frac{V_2}{V_1} = k^3'],
      steps,
      notes: [{ kind: 'info', text: 'This works only for similar solids: every length must scale by the same factor (same shape, different size). Ratios are solid 2 divided by solid 1.' }],
    };
  },
};
