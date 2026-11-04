/**
 * Classic word problems, solved exactly:
 *   work:      A alone in t_A, B alone in t_B. Together: rate 1/t_A + 1/t_B. Against (B undoes the work,
 *              like a drain): rate 1/t_A − 1/t_B. Optionally A works alone for t₀ first.
 *   mixture:   mix x₁ of c₁% with x₂ of c₂% → (x₁c₁ + x₂c₂)/(x₁ + x₂); or find how much of c₂%
 *              to add to x₁ of c₁% to reach a target c%.
 *   clock:     angle between the hands at h:m, θ = |30h − 5.5m| (reduced to at most 180°).
 *   clocktime: times between h and h + 1 o'clock when the hands make an angle θ: m = (30h ± θ)/5.5.
 */
import { validator, fp, fmt } from '../lib/calc-kit.js';
import { Frac } from '../lib/fraction.js';
import { plot } from '../lib/plot.js';
import { clockSvg, clockExplore, wordPractice } from '../explore/algebra-new.js';

const F = (x) => Frac.of(x);
const mixed = (f) => { if (f.isInt()) return f.toString(); const w = f.n / f.d, r = f.sub(F(w.toString())); return w === 0n ? f.toString() : `${w} ${r.n}/${r.d}`; };
const mixedTex = (f) => { if (f.isInt()) return f.toTex(); const w = f.n / f.d; if (w === 0n) return f.toTex(); const r = f.sub(F(w.toString())); return `${w}\\tfrac{${r.n}}{${r.d}}`; };
const mmss = (m) => { const tot = Math.round(m * 60); return `${Math.floor(tot / 60)} min ${String(tot % 60).padStart(2, '0')} s`; };

export const calculator = {
  id: 'work-mixture-clock',
  explore: clockExplore,
  practice: wordPractice,
  fields: [
    { name: 'mode', label: 'Type of problem', type: 'select', options: [['work', 'Work: two people, pipes or machines'], ['mixture', 'Mixture: concentrations'], ['clock', 'Clock: angle between the hands'], ['clocktime', 'Clock: when do the hands make an angle?']] },
    { name: 'tA', label: 'A alone takes (time)', type: 'number', placeholder: 'e.g. 6', row: 'w', showWhen: { mode: ['work'] }, rowShowWhen: { mode: ['work'] } },
    { name: 'tB', label: 'B alone takes (time)', type: 'number', placeholder: 'e.g. 4', row: 'w', showWhen: { mode: ['work'] } },
    { name: 'wkind', label: 'B', type: 'select', options: [['with', 'works with A'], ['against', 'works against A (e.g. a drain)']], showWhen: { mode: ['work'] }, row: 'w2' },
    { name: 't0', label: 'A works alone first for (optional)', type: 'number', placeholder: 'e.g. 1', showWhen: { mode: ['work'] }, row: 'w2' },
    { name: 'mkind', label: 'Find', type: 'select', options: [['mix', 'Concentration of the mixture'], ['find', 'Amount of solution 2 needed for a target']], showWhen: { mode: ['mixture'] } },
    { name: 'x1', label: 'Amount 1', type: 'number', placeholder: 'e.g. 10', row: 'm1', showWhen: { mode: ['mixture'] }, rowShowWhen: { mode: ['mixture'] } },
    { name: 'c1', label: 'Concentration 1 (%)', type: 'number', placeholder: 'e.g. 20', row: 'm1', showWhen: { mode: ['mixture'] } },
    { name: 'x2', label: 'Amount 2', type: 'number', placeholder: 'e.g. 15', row: 'm2', showWhen: { mode: ['mixture'], mkind: ['mix'] }, rowShowWhen: { mode: ['mixture'] } },
    { name: 'c2', label: 'Concentration 2 (%)', type: 'number', placeholder: 'e.g. 50', row: 'm2', showWhen: { mode: ['mixture'] } },
    { name: 'ct', label: 'Target concentration (%)', type: 'number', placeholder: 'e.g. 35', showWhen: { mode: ['mixture'], mkind: ['find'] } },
    { name: 'h', label: 'Hour', type: 'number', placeholder: 'e.g. 3', row: 'ck', showWhen: { mode: ['clock', 'clocktime'] }, rowShowWhen: { mode: ['clock', 'clocktime'] }, hint: 'For "between h and h + 1 o’clock", enter h.' },
    { name: 'min', label: 'Minutes', type: 'number', placeholder: 'e.g. 40', row: 'ck', showWhen: { mode: ['clock'] } },
    { name: 'theta', label: 'Angle (°)', type: 'number', placeholder: 'e.g. 90', row: 'ck', showWhen: { mode: ['clocktime'] }, hint: '0 = together, 90 = at right angles, 180 = opposite.' },
  ],
  examples: [
    { label: 'Work: A in 6 h, B in 4 h, together', values: { mode: 'work', tA: '6', tB: '4', wkind: 'with' } },
    { label: 'Work: fill in 3 h, drain in 5 h', values: { mode: 'work', tA: '3', tB: '5', wkind: 'against' } },
    { label: 'Work: A starts alone for 2 h', values: { mode: 'work', tA: '10', tB: '15', wkind: 'with', t0: '2' } },
    { label: 'Mixture: 10 L of 20% + 15 L of 50%', values: { mode: 'mixture', mkind: 'mix', x1: '10', c1: '20', x2: '15', c2: '50' } },
    { label: 'Mixture: add 60% to 8 L of 25% for 40%', values: { mode: 'mixture', mkind: 'find', x1: '8', c1: '25', c2: '60', ct: '40' } },
    { label: 'Clock: angle at 3:40', values: { mode: 'clock', h: '3', min: '40' } },
    { label: 'Clock: hands at right angles after 4:00', values: { mode: 'clocktime', h: '4', theta: '90' } },
    { label: 'Clock: hands together after 2:00', values: { mode: 'clocktime', h: '2', theta: '0' } },
  ],
  solve(values) {
    const mode = ['work', 'mixture', 'clock', 'clocktime'].includes(values.mode) ? values.mode : 'work';
    return { work: solveWork, mixture: solveMixture, clock: solveClock, clocktime: solveClockTime }[mode](values);
  },
};

function solveWork(values) {
  const v = validator(values);
  const tA = v.frac('tA', 'A’s time'), tB = v.frac('tB', 'B’s time');
  const has0 = String(values.t0 ?? '').trim() !== '';
  const t0 = has0 ? v.frac('t0', 'the head start') : F(0);
  if (!v.ok()) return v.result();
  if (tA.sign() <= 0 || tB.sign() <= 0) return { ok: false, errors: [{ field: ['tA', 'tB'], message: 'Both times must be greater than 0.' }] };
  if (t0.sign() < 0) return { ok: false, errors: [{ field: 't0', message: 'The head start cannot be negative.' }] };
  const against = values.wkind === 'against';
  const rA = F(1).div(tA), rB = F(1).div(tB), rate = against ? rA.sub(rB) : rA.add(rB);
  const done0 = rA.mul(t0);
  if (done0.cmp(F(1)) >= 0) return { ok: false, errors: [{ field: 't0', message: `A finishes the whole job alone within ${tA} time units, before B starts. Use a shorter head start.` }] };
  if (rate.sign() <= 0) return { ok: true, final: { text: 'The job is never finished: B undoes the work at least as fast as A does it.' }, answers: [{ label: 'Time to finish', value: 'never', primary: true }], steps: [{ title: 'Rates', texLines: [`r_A = \\frac{1}{${tA.toTex()}},\\quad r_B = \\frac{1}{${tB.toTex()}}`, `r_A - r_B = ${rate.toTex()} \\le 0`], note: 'The net rate is not positive, so the amount of work done never reaches one whole job.' }], formula: ['\\text{rate} = \\frac{1}{\\text{time}}'] };
  const left = F(1).sub(done0), tTog = left.div(rate), total = t0.add(tTog);
  const steps = [
    { title: 'Rates of work', texLines: [`r_A = \\frac{1}{${tA.toTex()}} \\text{ job per unit time}, \\qquad r_B = \\frac{1}{${tB.toTex()}}`], note: 'If a job takes t hours, the worker does 1/t of it each hour. Rates add, times do not.' },
    { title: against ? 'Net rate (B works against A)' : 'Combined rate', tex: `r = \\frac{1}{${tA.toTex()}} ${against ? '-' : '+'} \\frac{1}{${tB.toTex()}} = ${rate.toTex()} \\text{ job per unit time}` },
  ];
  if (has0 && !t0.isZero()) steps.push({ title: 'Work A does alone first', tex: `${t0.toTex()} \\times \\frac{1}{${tA.toTex()}} = ${done0.toTex()} \\text{ of the job, leaving } ${left.toTex()}`, note: 'Work done = rate × time.' });
  steps.push({ title: 'Time for the remaining work', texLines: [`t = \\frac{\\text{work}}{\\text{rate}} = \\frac{${left.toTex()}}{${rate.toTex()}} = ${tTog.toTex()}`, ...(tTog.isInt() ? [] : [`= ${mixedTex(tTog)} \\approx ${fmt(tTog.toNumber(), 4)}`])] });
  if (has0 && !t0.isZero()) steps.push({ title: 'Total time', tex: `${t0.toTex()} + ${tTog.toTex()} = ${total.toTex()}` });
  steps.push({ title: 'Check: the work adds up to one job', tex: `${has0 && !t0.isZero() ? `${t0.toTex()}\\left(\\frac{1}{${tA.toTex()}}\\right) + ` : ''}${tTog.toTex()}\\left(${rate.toTex()}\\right) = ${done0.add(tTog.mul(rate)).toTex()}\\ \\checkmark` });
  const tN = total.toNumber();
  return {
    ok: true,
    final: { tex: `t = ${tTog.toTex()}${tTog.isInt() ? '' : ` \\approx ${fmt(tTog.toNumber(), 4)}`}${has0 && !t0.isZero() ? `,\\quad \\text{total } ${total.toTex()}` : ''}` },
    answers: [
      { label: has0 && !t0.isZero() ? 'Time working together' : against ? 'Time to finish' : 'Time working together', value: fmt(tTog.toNumber()), approx: !tTog.toDecimal(8), exactTex: tTog.isInt() ? undefined : tTog.toTex(), primary: true },
      ...(has0 && !t0.isZero() ? [{ label: 'Total time', value: fmt(tN), approx: !total.toDecimal(8), exactTex: total.isInt() ? undefined : total.toTex(), primary: true }] : []),
      { label: against ? 'Net rate' : 'Combined rate', value: fmt(rate.toNumber()), approx: !rate.toDecimal(8), exactTex: rate.toTex(), copy: '' },
    ],
    steps,
    visual: { svg: plot({ x: [0, tN * 1.15], y: [0, 1.15], width: 380, height: 240, title: 'Fraction of the job done over time', segments: [{ x1: 0, y1: 0, x2: t0.toNumber(), y2: done0.toNumber(), cls: 'd-line2' }, { x1: t0.toNumber(), y1: done0.toNumber(), x2: tN, y2: 1, cls: 'd-line' }], hlines: [{ y: 1, cls: 'd-line3', label: 'job done' }], points: [{ x: tN, y: 1, label: `t = ${fmt(tN, 3)}`, cls: 'd-foot' }] }), caption: 'The slope of each segment is the rate of work.' },
    formula: [against ? '\\frac{1}{t} = \\frac{1}{t_A} - \\frac{1}{t_B}' : '\\frac{1}{t} = \\frac{1}{t_A} + \\frac{1}{t_B} \\;\\Rightarrow\\; t = \\frac{t_A t_B}{t_A + t_B}'],
  };
}

function solveMixture(values) {
  const v = validator(values);
  const find = values.mkind === 'find';
  const x1 = v.frac('x1', 'amount 1'), c1 = v.frac('c1', 'concentration 1'), c2 = v.frac('c2', 'concentration 2');
  const x2 = find ? null : v.frac('x2', 'amount 2'), ct = find ? v.frac('ct', 'the target concentration') : null;
  if (!v.ok()) return v.result();
  if (x1.sign() <= 0 || (x2 && x2.sign() < 0)) return { ok: false, errors: [{ field: ['x1', 'x2'], message: 'Amounts must be positive.' }] };
  for (const [nm, c] of [['c1', c1], ['c2', c2], ['ct', ct]]) if (c && (c.sign() < 0 || c.cmp(F(100)) > 0)) return { ok: false, errors: [{ field: nm, message: 'A concentration must be between 0% and 100%.' }] };
  const p = (x, c) => x.mul(c).div(100);
  if (!find) {
    const tot = x1.add(x2), pure = p(x1, c1).add(p(x2, c2)), c = pure.div(tot).mul(100);
    const steps = [
      { title: 'Pure substance in each part', texLines: [`${x1.toTex()} \\times ${c1.toTex()}\\% = ${p(x1, c1).toTex()}`, `${x2.toTex()} \\times ${c2.toTex()}\\% = ${p(x2, c2).toTex()}`], note: 'Track the amount of the pure substance: it is conserved when the solutions are mixed.' },
      { title: 'Totals', texLines: [`\\text{pure substance} = ${pure.toTex()}`, `\\text{mixture} = ${x1.toTex()} + ${x2.toTex()} = ${tot.toTex()}`] },
      { title: 'Concentration of the mixture', tex: `\\frac{${pure.toTex()}}{${tot.toTex()}} \\times 100\\% = ${c.toTex()}\\%${c.isInt() ? '' : ` \\approx ${fmt(c.toNumber(), 4)}\\%`}` },
      { title: 'Check', tex: `${fmt(Math.min(c1.toNumber(), c2.toNumber()))}\\% \\le ${fmt(c.toNumber(), 4)}\\% \\le ${fmt(Math.max(c1.toNumber(), c2.toNumber()))}\\%\\ \\checkmark`, note: 'A mixture is always between the two concentrations, closer to the one there is more of.' },
    ];
    return { ok: true, final: { tex: `c = ${c.toTex()}\\%` }, answers: [{ label: 'Concentration of the mixture (%)', value: fmt(c.toNumber()), approx: !c.toDecimal(8), exactTex: c.isInt() ? undefined : c.toTex(), primary: true }, { label: 'Total amount', value: fmt(tot.toNumber()), copy: '' }, { label: 'Pure substance', value: fmt(pure.toNumber()), copy: '' }], steps, formula: ['c = \\frac{x_1 c_1 + x_2 c_2}{x_1 + x_2}'] };
  }
  const lo = c1.cmp(c2) < 0 ? c1 : c2, hi = c1.cmp(c2) < 0 ? c2 : c1;
  if (c1.eq(c2) || ct.cmp(lo) <= 0 || ct.cmp(hi) >= 0) {
    if (!ct.eq(c1)) return { ok: false, errors: [{ field: 'ct', message: `The target must lie strictly between ${c1}% and ${c2}%: mixing can never go outside the two concentrations.` }] };
  }
  const x2f = ct.eq(c1) ? F(0) : x1.mul(ct.sub(c1)).div(c2.sub(ct));
  const tot = x1.add(x2f);
  const steps = [
    { title: 'Set up the equation for the pure substance', tex: `${x1.toTex()}\\left(${c1.toTex()}\\%\\right) + x\\left(${c2.toTex()}\\%\\right) = (${x1.toTex()} + x)\\left(${ct.toTex()}\\%\\right)`, note: 'Pure substance before mixing = pure substance after mixing. Let x be the amount of solution 2.' },
    { title: 'Multiply by 100 and collect x', texLines: [`${x1.mul(c1).toTex()} + ${c2.toTex()}x = ${x1.mul(ct).toTex()} + ${ct.toTex()}x`, `${c2.sub(ct).toTex()}\\,x = ${x1.mul(ct.sub(c1)).toTex()}`] },
    { title: 'Solve', tex: `x = \\frac{${x1.mul(ct.sub(c1)).toTex()}}{${c2.sub(ct).toTex()}} = ${x2f.toTex()}${x2f.isInt() ? '' : ` \\approx ${fmt(x2f.toNumber(), 4)}`}` },
    { title: 'Check', tex: `\\frac{${p(x1, c1).toTex()} + ${p(x2f, c2).toTex()}}{${tot.toTex()}} \\times 100\\% = ${p(x1, c1).add(p(x2f, c2)).div(tot).mul(100).toTex()}\\%\\ \\checkmark` },
  ];
  return { ok: true, final: { tex: `x = ${x2f.toTex()}` }, answers: [{ label: 'Amount of solution 2', value: fmt(x2f.toNumber()), approx: !x2f.toDecimal(8), exactTex: x2f.isInt() ? undefined : x2f.toTex(), primary: true }, { label: 'Total amount', value: fmt(tot.toNumber()), copy: '' }], steps, formula: ['x_1 c_1 + x\\,c_2 = (x_1 + x)\\,c'] };
}

function solveClock(values) {
  const v = validator(values);
  const h = v.frac('h', 'the hour'), m = v.frac('min', 'the minutes');
  if (!v.ok()) return v.result();
  if (!h.isInt() || h.sign() <= 0 || h.cmp(F(12)) > 0) return { ok: false, errors: [{ field: 'h', message: 'The hour must be a whole number from 1 to 12.' }] };
  if (m.sign() < 0 || m.cmp(F(60)) >= 0) return { ok: false, errors: [{ field: 'min', message: 'Minutes must be from 0 up to (but not including) 60.' }] };
  const hh = h.eq(F(12)) ? F(0) : h;
  const H = hh.mul(30).add(m.div(2)), M = m.mul(6);
  let th = H.sub(M).abs();
  const reflex = th.cmp(F(180)) > 0;
  const small = reflex ? F(360).sub(th) : th;
  const steps = [
    { title: 'Position of the hour hand', tex: `30^\\circ \\times ${hh.toTex()} + 0.5^\\circ \\times ${m.toTex()} = ${H.toTex()}^\\circ`, note: 'The hour hand moves 30° per hour, and it keeps moving between the hours: 0.5° per minute.' },
    { title: 'Position of the minute hand', tex: `6^\\circ \\times ${m.toTex()} = ${M.toTex()}^\\circ`, note: 'The minute hand moves 360° in 60 minutes: 6° per minute. Both angles are measured clockwise from 12.' },
    { title: 'Difference', tex: `\\left|${H.toTex()}^\\circ - ${M.toTex()}^\\circ\\right| = ${th.toTex()}^\\circ`, note: reflex ? 'This is more than 180°, so the smaller angle is the other way round the clock.' : undefined },
    ...(reflex ? [{ title: 'Take the smaller angle', tex: `360^\\circ - ${th.toTex()}^\\circ = ${small.toTex()}^\\circ` }] : []),
    { title: 'Check with the formula', tex: `\\theta = \\left|30h - \\tfrac{11}{2}m\\right| = \\left|30(${hh.toTex()}) - \\tfrac{11}{2}(${m.toTex()})\\right| = ${hh.mul(30).sub(m.mul(11).div(2)).abs().toTex()}^\\circ\\ \\checkmark` },
  ];
  return {
    ok: true,
    final: { tex: `\\theta = ${small.toTex()}^\\circ${small.isInt() ? '' : ` \\approx ${fmt(small.toNumber(), 4)}^\\circ`}` },
    answers: [{ label: 'Angle between the hands (°)', value: fmt(small.toNumber()), approx: !small.toDecimal(8), exactTex: small.isInt() ? undefined : small.toTex(), primary: true }, { label: 'Reflex angle (°)', value: fmt(F(360).sub(small).toNumber()), copy: '' }],
    steps, formula: ['\\theta = \\left|30h - \\tfrac{11}{2}m\\right|'],
    visual: { svg: clockSvg(hh.toNumber(), m.toNumber()), caption: `At ${h}:${String(Math.floor(m.toNumber())).padStart(2, '0')} the hands are ${fmt(small.toNumber(), 4)}° apart.` },
  };
}

function solveClockTime(values) {
  const v = validator(values);
  const h = v.frac('h', 'the hour'), th = v.frac('theta', 'the angle');
  if (!v.ok()) return v.result();
  if (!h.isInt() || h.sign() <= 0 || h.cmp(F(12)) > 0) return { ok: false, errors: [{ field: 'h', message: 'The hour must be a whole number from 1 to 12.' }] };
  if (th.sign() < 0 || th.cmp(F(180)) > 0) return { ok: false, errors: [{ field: 'theta', message: 'The angle must be from 0° to 180°.' }] };
  const hh = h.eq(F(12)) ? F(0) : h;
  const cand = [hh.mul(30).sub(th), hh.mul(30).add(th)].map((q) => q.mul(2).div(11));
  const times = cand.filter((m) => m.sign() >= 0 && m.cmp(F(60)) < 0).sort((p, q) => p.cmp(q)).filter((m, i, arr) => i === 0 || !m.eq(arr[i - 1]));
  const steps = [
    { title: 'Set up the equation', tex: `\\left|30(${hh.toTex()}) - \\tfrac{11}{2}m\\right| = ${th.toTex()}`, note: 'The minute hand gains 5.5° per minute on the hour hand. The angle is the hour hand’s head start, 30h°, minus that gain (or the gain minus the head start).' },
    { title: 'Two cases', texLines: [`\\tfrac{11}{2}m = ${hh.mul(30).toTex()} - ${th.toTex()} \\;\\Rightarrow\\; m = ${cand[0].toTex()}`, `\\tfrac{11}{2}m = ${hh.mul(30).toTex()} + ${th.toTex()} \\;\\Rightarrow\\; m = ${cand[1].toTex()}`], note: 'Before the hands meet the minute hand is behind; after, it is ahead.' },
    { title: 'Keep the times within the hour', text: `Only values from 0 up to 60 minutes are between ${h}:00 and ${hh.add(1).toString() === '13' ? 1 : hh.add(1)}:00.`, tex: times.length ? times.map((m) => `m = ${mixedTex(m)} \\text{ min} \\approx ${mmss(m.toNumber())}`).join(',\\quad ') : '\\text{no time in this hour}' },
  ];
  if (times.length) steps.push({ title: 'Check', texLines: times.map((m) => { const d = hh.mul(30).add(m.div(2)).sub(m.mul(6)).abs(); const s = d.cmp(F(180)) > 0 ? F(360).sub(d) : d; return `m = ${mixedTex(m)}: \\quad \\text{angle} = ${s.toTex()}^\\circ\\ \\checkmark`; }) });
  const label = (m) => `${h}:${String(Math.floor(m.toNumber())).padStart(2, '0')}`;
  return {
    ok: true,
    final: times.length ? { tex: times.map((m) => `${h}\\!:\\!${mixedTex(m)}`).join(' \\quad\\text{and}\\quad ') } : { text: 'The hands never make this angle in this hour.' },
    answers: [{ label: 'Number of times', value: String(times.length), primary: true }, ...times.map((m, i) => ({ label: `Minutes after ${h}:00${times.length > 1 ? ` (${i + 1})` : ''}`, value: fmt(m.toNumber()), approx: !m.toDecimal(8), exactTex: m.isInt() ? undefined : mixedTex(m), primary: true, copy: `${mixed(m)} minutes past ${h}` }))],
    steps, formula: ['m = \\frac{2}{11}\\left(30h \\pm \\theta\\right)'],
    visual: times.length ? { svg: clockSvg(hh.toNumber(), times[0].toNumber()), caption: `The first time is about ${label(times[0])} (${mmss(times[0].toNumber())} past ${h}).` } : undefined,
  };
}
