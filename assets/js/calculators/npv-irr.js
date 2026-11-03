/**
 * Present worth analysis of a cash-flow series C₀, C₁, …, Cₙ (one per period):
 *   NPV = Σ Cₜ / (1 + i)^t,   IRR = the rate where NPV = 0,   simple payback period.
 * The IRR is found by scanning for a sign change of NPV and refining it by bisection, and the
 * calculator warns when a series has more than one sign change (possible multiple IRRs).
 */
import { moneyTex, pct, pctTex, dec, moneyAnswer, rateAnswer, cashFlowDiagram, money } from '../lib/econ-kit.js';
import { parseDecimal } from '../lib/parse.js';
import { formatNumber } from '../lib/format.js';
import { plot } from '../lib/plot.js';
import { npvExplore, npvPractice } from '../explore/econ.js';

export const npv = (flows, i) => flows.reduce((s, c, t) => s + c / (1 + i) ** t, 0);

/** Every rate in (−0.99, 10] where NPV changes sign, refined to about 1e-10. */
export function irrs(flows) {
  const roots = [];
  const grid = [];
  for (let x = -0.99; x < 1; x += 0.005) grid.push(x);
  for (let x = 1; x <= 10.0001; x += 0.05) grid.push(x);
  let a = grid[0], fa = npv(flows, a);
  for (let k = 1; k < grid.length; k++) {
    const b = grid[k], fb = npv(flows, b);
    if (fa === 0) roots.push(a);
    else if (Number.isFinite(fa) && Number.isFinite(fb) && fa * fb < 0) {
      let lo = a, hi = b, flo = fa;
      for (let it = 0; it < 200 && hi - lo > 1e-12; it++) {
        const mid = (lo + hi) / 2, fm = npv(flows, mid);
        if (flo * fm <= 0) hi = mid; else { lo = mid; flo = fm; }
      }
      roots.push((lo + hi) / 2);
    }
    a = b; fa = fb;
  }
  return roots.filter((r, idx) => idx === 0 || Math.abs(r - roots[idx - 1]) > 1e-7);
}

/** Parse "−10000, 3000, 4000" (commas, spaces, semicolons or new lines). */
export function parseFlows(raw) {
  const parts = String(raw ?? '').replace(/−/g, '-').split(/[\s,;]+/).filter(Boolean);
  if (!parts.length) return { error: 'Enter the cash flows, starting with period 0, for example −10000, 3000, 4000, 5000.' };
  if (parts.length > 61) return { error: 'Please enter at most 61 cash flows (periods 0 to 60).' };
  const flows = [];
  for (const [k, s] of parts.entries()) {
    const p = parseDecimal(s, `cash flow ${k}`);
    if (!p.ok) return { error: `Cash flow ${k} (“${s.slice(0, 20)}”) is not a number. Separate the amounts with commas or spaces, and leave out thousands separators.` };
    if (Math.abs(p.value) > 1e13) return { error: `Cash flow ${k} is too large. Keep amounts below 10¹³.` };
    flows.push(p.value);
  }
  if (flows.length < 2) return { error: 'Enter at least two cash flows: the amount at period 0 and at least one later amount.' };
  if (flows.every((c) => c === 0)) return { error: 'All the cash flows are 0, so there is nothing to analyse.' };
  return { flows };
}

export const calculator = {
  id: 'npv-irr',
  explore: npvExplore,
  practice: npvPractice,
  fields: [
    { name: 'flows', label: 'Cash flows by period (0, 1, 2, …)', type: 'textarea', rows: 3, placeholder: 'e.g. -100000, 30000, 35000, 40000, 45000', hint: 'Negative for money spent (the investment), positive for money received. Separate with commas or spaces; no thousands separators.' },
    { name: 'i', label: 'Interest rate (MARR) per period', type: 'number', signed: true, placeholder: 'e.g. 10', suffix: '%', hint: 'The minimum attractive rate of return used to discount the cash flows.' },
  ],
  examples: [
    { label: 'Investment of 100,000 returning 30k–45k over 4 years at 10%', values: { flows: '-100000, 30000, 35000, 40000, 45000', i: '10' } },
    { label: 'Equipment: 250,000 now, 60,000 a year for 6 years, at 12%', values: { flows: '-250000 60000 60000 60000 60000 60000 60000', i: '12' } },
    { label: 'Rejected project: returns too small at 15%', values: { flows: '-50000, 12000, 12000, 12000, 12000', i: '15' } },
    { label: 'Two sign changes (possible multiple IRRs)', values: { flows: '-1000, 2300, -1320', i: '5' } },
  ],
  solve(values) {
    const parsed = parseFlows(values.flows);
    if (parsed.error) return { ok: false, errors: [{ field: 'flows', message: parsed.error }] };
    const flows = parsed.flows;
    const iP = parseDecimal(values.i, 'the interest rate');
    if (!iP.ok) return { ok: false, errors: [{ field: 'i', message: iP.error }] };
    if (iP.value <= -99 || iP.value > 1000) return { ok: false, errors: [{ field: 'i', message: 'The interest rate must be greater than −99% and at most 1000%.' }] };
    const i = iP.value / 100;
    const n = flows.length - 1;
    const pv = flows.map((c, t) => c / (1 + i) ** t);
    const NPV = pv.reduce((a, b) => a + b, 0);
    if (!pv.every(Number.isFinite) || !Number.isFinite(NPV)) return { ok: false, errors: [{ field: 'i', message: 'These values are too extreme to discount reliably. Check the rate and amounts.' }] };
    const terms = flows.map((c, t) => (t === 0 ? moneyTex(c) : `\\frac{${moneyTex(c)}}{(1 + ${dec(i)})^{${t}}}`));
    const shown = terms.length > 6 ? [...terms.slice(0, 3), '\\cdots', ...terms.slice(-2)] : terms;
    const steps = [
      { title: 'Discount each cash flow to period 0', texLines: ['NPV = \\sum_{t=0}^{n} \\frac{C_t}{(1 + i)^t}', `NPV = ${shown.join(' + ').replace(/\+ -/g, '- ')}`] },
      { title: 'Add the present worths', tex: `NPV = ${pv.length > 6 ? `${pv.slice(0, 3).map(moneyTex).join(' + ')} + \\cdots` : pv.map(moneyTex).join(' + ')} \\approx ${moneyTex(NPV)}`.replace(/\+ -/g, '- ') },
    ];
    const roots = irrs(flows);
    const signChanges = flows.filter((c) => c !== 0).reduce((acc, c, k, arr) => acc + (k > 0 && Math.sign(c) !== Math.sign(arr[k - 1]) ? 1 : 0), 0);
    const answers = [moneyAnswer('Net present worth NPV', NPV, { primary: true })];
    const notes = [{ kind: 'info', text: `Decision rule: accept the project if NPV ≥ 0 at the MARR (${pct(i)}), equivalently if IRR ≥ MARR for a simple investment (one sign change). The rate is per period, matching the spacing of the cash flows.` }];
    if (roots.length === 1) {
      answers.push(rateAnswer('Internal rate of return IRR', roots[0], { primary: true }));
      steps.push({ title: 'Internal rate of return', tex: `NPV(i^*) = 0 \\Rightarrow i^* \\approx ${pctTex(roots[0])}`, text: `Found numerically: NPV is ${roots[0] > i ? 'positive at the MARR and falls' : 'negative at the MARR'} to 0 at about ${pct(roots[0])}.` });
    } else if (roots.length > 1) {
      answers.push({ label: 'Internal rates of return', value: roots.map((r) => pct(r)).join(' and '), primary: true, copy: roots.map((r) => pct(r)).join(', ') });
      steps.push({ title: 'Internal rates of return', text: `NPV is 0 at ${roots.length} different rates: ${roots.map((r) => pct(r)).join(', ')}. With more than one sign change in the cash flows the IRR is not unique, so judge the project by its NPV.` });
      notes.push({ kind: 'warn', text: 'This series has more than one IRR. Use the NPV, or an external rate of return, to decide.' });
    } else {
      answers.push({ label: 'Internal rate of return IRR', value: 'none between −99% and 1000%', copy: '' });
      steps.push({ title: 'Internal rate of return', text: 'NPV never reaches 0 between −99% and 1000%, so there is no IRR in that range (for example, when every flow has the same sign).' });
    }
    if (signChanges > 1 && roots.length <= 1) notes.push({ kind: 'warn', text: `The cash flows change sign ${signChanges} times, so there may be more than one IRR. Check the NPV curve.` });
    // Simple (undiscounted) payback period, interpolated within the year.
    let cum = 0, payback = null;
    for (let t = 0; t <= n; t++) {
      const before = cum; cum += flows[t];
      if (payback === null && t > 0 && before < 0 && cum >= 0) payback = t - 1 + -before / flows[t];
    }
    if (flows[0] < 0) {
      answers.push(payback !== null ? { label: 'Simple payback period', value: `${formatNumber(payback, { decimals: 2 })} periods`, copy: `${formatNumber(payback, { decimals: 2 })} periods` } : { label: 'Simple payback period', value: 'not reached', copy: '' });
      if (payback !== null) steps.push({ title: 'Simple payback period', text: `Adding the cash flows without interest, the running total turns positive during period ${Math.ceil(payback)}: payback ≈ ${formatNumber(payback, { decimals: 2 })} periods. Payback ignores the time value of money and everything after it.` });
    }
    answers.push(moneyAnswer('Present worth of receipts', pv.filter((x) => x > 0).reduce((a, b) => a + b, 0)), moneyAnswer('Present worth of payments', -pv.filter((x) => x < 0).reduce((a, b) => a + b, 0)));
    const rows = flows.map((c, t) => [String(t), money(c), formatNumber(1 / (1 + i) ** t, { decimals: 6 }), money(pv[t])]);
    rows.push(['Total', money(flows.reduce((a, b) => a + b, 0)), '', money(NPV)]);
    const lo = Math.max(-0.5, Math.min(0, ...roots) - 0.05), hi = Math.max(0.3, i * 1.5, ...roots.map((r) => r * 1.3));
    const curve = plot({ x: [lo * 100, hi * 100], width: 400, height: 240, title: 'NPV against the interest rate', curves: [{ f: (x) => npv(flows, x / 100), samples: 300 }], points: [{ x: i * 100, y: NPV }, ...roots.filter((r) => r >= lo && r <= hi).map((r) => ({ x: r * 100, y: 0, cls: 'd-point2' }))], xLabel: 'rate %', yLabel: 'NPV' });
    return {
      ok: true,
      final: { tex: `NPV \\approx ${moneyTex(NPV)}${roots.length === 1 ? `,\\quad IRR \\approx ${pctTex(roots[0])}` : ''}`, text: NPV >= 0 ? `NPV ≥ 0 at ${pct(i)}: the project earns at least the MARR.` : `NPV < 0 at ${pct(i)}: the project earns less than the MARR.` },
      answers,
      tables: [{ caption: 'Present worth of each cash flow', headers: ['Period', 'Cash flow', 'Discount factor', 'Present worth'], rows }],
      visual: { svg: `${cashFlowDiagram(flows.map((c, t) => ({ t, amount: c, label: n <= 6 && c !== 0 ? money(c) : '' })), n, { title: 'Cash-flow diagram', unitLabel: 'period' })}${curve}`, caption: 'Top: the cash flows (up = received, down = spent). Bottom: NPV at each interest rate; the marked point is your MARR, and the curve crosses zero at the IRR.' },
      formula: ['NPV = \\sum_{t=0}^{n} \\frac{C_t}{(1 + i)^t} \\qquad NPV(i^*) = 0 \\text{ defines the IRR } i^*'],
      steps,
      notes,
    };
  },
};
