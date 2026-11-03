/* Explorers and practice problems for the engineering economy calculators. */
import { plot } from '../lib/plot.js';
import { randInt, pick } from '../lib/learn.js';
import { moneyTex, pctTex, dec, cashFlowDiagram } from '../lib/econ-kit.js';

const grow = (r, m, n) => (m === 'c' ? Math.exp(r * n) : (1 + r / m) ** (m * n));
const mOf = (x) => (x === 'c' ? 'c' : Number(x));
const M_OPTIONS = [['1', 'Annually'], ['2', 'Semi-annually'], ['4', 'Quarterly'], ['12', 'Monthly'], ['c', 'Continuously']];
const M_NAME = { 1: 'annually', 2: 'semi-annually', 4: 'quarterly', 12: 'monthly' };

// ---------------------------------------------------------------- simple interest
export const simplePractice = {
  title: 'Simple interest on a loan',
  generate(rand) {
    const P = randInt(rand, 2, 40) * 5000, rp = pick(rand, [4, 5, 6, 7.5, 8, 9, 10, 12]), months = pick(rand, [3, 6, 9, 15, 18, 24, 30]);
    const t = months / 12, I = P * (rp / 100) * t;
    return {
      prompt: `<p>A student borrows <strong>${P.toLocaleString('en-US')}</strong> at <strong>${rp}% simple interest</strong> per year for <strong>${months} months</strong>. Find the interest and the amount to repay.</p>`,
      answers: [{ label: 'Interest I', value: I, decimals: 2 }, { label: 'Amount F', value: P + I, decimals: 2 }],
      hint: 'Convert the months to years first (divide by 12), then use I = Prt and F = P + I.',
      hintTex: 'I = P\\,r\\,t \\qquad F = P + I',
      steps: [
        { title: 'Time in years', tex: `t = \\frac{${months}}{12} = ${dec(t)}` },
        { title: 'Interest', tex: `I = ${moneyTex(P)} \\times ${dec(rp / 100)} \\times ${dec(t)} = ${moneyTex(I)}` },
        { title: 'Amount to repay', tex: `F = ${moneyTex(P)} + ${moneyTex(I)} = ${moneyTex(P + I)}` },
      ],
    };
  },
};

// ---------------------------------------------------------------- compound interest
export const compoundExplore = {
  title: 'Watch interest earn interest',
  intro: 'Change the rate, the time and how often interest is added. The gap between the blue (compound) and green (simple) lines is the interest earned on interest.',
  controls: [
    { name: 'P', label: 'Present worth P', min: 1000, max: 100000, step: 1000, value: 10000 },
    { name: 'r', label: 'Nominal rate r', min: 1, max: 20, step: 0.5, value: 8, unit: '%' },
    { name: 'n', label: 'Years n', min: 1, max: 40, step: 1, value: 20, unit: 'yr' },
    { name: 'm', label: 'Compounded', type: 'select', options: M_OPTIONS, value: '12' },
  ],
  presets: [{ label: 'Rule of 72: 9% for 8 years', values: { r: 9, n: 8, m: '1' } }, { label: 'Long term: 6% for 40 years', values: { r: 6, n: 40 } }],
  render({ P, r, n, m }) {
    const mm = mOf(m), rr = r / 100;
    const F = P * grow(rr, mm, n), S = P * (1 + rr * n);
    const ER = mm === 'c' ? Math.expm1(rr) : (1 + rr / mm) ** mm - 1;
    return {
      svg: plot({ x: [0, n], y: [0, Math.max(F, S) * 1.08], width: 400, height: 240, title: 'Compound and simple interest', curves: [{ f: (t) => P * grow(rr, mm, t), samples: 240 }, { f: (t) => P * (1 + rr * t), cls: 'd-line2' }], points: [{ x: n, y: F }], xLabel: 'years', yLabel: 'balance' }),
      readouts: [
        { label: 'Future worth (compound)', tex: `F \\approx ${moneyTex(F)}`, tone: 'good' },
        { label: 'With simple interest', tex: `${moneyTex(S)}` },
        { label: 'Interest on interest', tex: `${moneyTex(F - S)}` },
        { label: 'Effective annual rate', tex: `ER \\approx ${pctTex(ER, 3)}` },
      ],
    };
  },
};
export const compoundPractice = {
  title: 'Future worth with compound interest',
  generate(rand) {
    const P = randInt(rand, 2, 50) * 2000, rp = pick(rand, [4, 6, 8, 10, 12]), m = pick(rand, [1, 2, 4, 12]), n = randInt(rand, 2, 12);
    const i = rp / 100 / m, N = m * n, F = P * (1 + i) ** N;
    return {
      prompt: `<p>Find the future worth of <strong>${P.toLocaleString('en-US')}</strong> invested for <strong>${n} years</strong> at <strong>${rp}% compounded ${M_NAME[m]}</strong>.</p>`,
      answers: [{ label: 'Future worth F', value: F, decimals: 2 }],
      hint: 'Divide the nominal rate by the number of periods per year, and multiply the years by it to get the number of periods.',
      hintTex: 'F = P\\,(1 + i)^{N},\\quad i = \\frac{r}{m},\\ N = m\\,n',
      steps: [
        { title: 'Rate per period and periods', tex: `i = \\frac{${dec(rp / 100)}}{${m}} = ${dec(i, 6)},\\quad N = ${m} \\times ${n} = ${N}` },
        { title: 'Future worth', tex: `F = ${moneyTex(P)}\\,(1 + ${dec(i, 6)})^{${N}} \\approx ${moneyTex(F)}` },
      ],
    };
  },
};

// ---------------------------------------------------------------- effective rate
export const effectivePractice = {
  title: 'Compare two rates',
  generate(rand) {
    const rp = pick(rand, [6, 8, 9, 10, 12, 15, 18]), m = pick(rand, [2, 4, 12]);
    const er = (1 + rp / 100 / m) ** m - 1;
    return {
      prompt: `<p>A bank quotes <strong>${rp}% compounded ${M_NAME[m]}</strong>. What is the effective annual rate, as a percentage?</p>`,
      answers: [{ label: 'Effective rate', value: er * 100, unit: '%', decimals: 2 }],
      hint: 'Grow 1 for one year at the rate per period, then subtract 1.',
      hintTex: 'ER = \\left(1 + \\frac{r}{m}\\right)^{m} - 1',
      steps: [
        { title: 'Rate per period', tex: `i = \\frac{${dec(rp / 100)}}{${m}} = ${dec(rp / 100 / m, 6)}` },
        { title: 'Effective rate', tex: `ER = (1 + ${dec(rp / 100 / m, 6)})^{${m}} - 1 \\approx ${dec(er, 6)} = ${pctTex(er, 2)}` },
      ],
    };
  },
};

// ---------------------------------------------------------------- annuity
const pa = (i, N) => (Math.abs(i) < 1e-10 ? N : (1 - (1 + i) ** -N) / i);
const fa = (i, N) => (Math.abs(i) < 1e-10 ? N : ((1 + i) ** N - 1) / i);
export const annuityExplore = {
  title: 'Many small payments, one equivalent amount',
  intro: 'Each payment A is worth less the further away it is. The present worth P adds up every payment discounted to today; the future worth F adds them all up at the end.',
  controls: [
    { name: 'A', label: 'Payment A', min: 500, max: 20000, step: 500, value: 5000 },
    { name: 'r', label: 'Rate per year', min: 0, max: 20, step: 0.5, value: 10, unit: '%' },
    { name: 'N', label: 'Number of yearly payments N', min: 1, max: 30, step: 1, value: 10 },
    { name: 'type', label: 'Payments at', type: 'select', options: [['ordinary', 'End of each year'], ['due', 'Start of each year']], value: 'ordinary' },
  ],
  presets: [{ label: 'No interest', values: { r: 0 } }, { label: 'High rate, long term', values: { r: 18, N: 30 } }],
  render({ A, r, N, type }) {
    const i = r / 100, k = type === 'due' ? 1 + i : 1;
    const P = A * pa(i, N) * k, F = A * fa(i, N) * k;
    const start = type === 'due' ? 0 : 1;
    const flows = Array.from({ length: N }, (_, j) => ({ t: start + j, amount: A, label: j === 0 ? 'A' : '' }));
    return {
      svg: cashFlowDiagram(flows, N, { title: 'Payments over time', unitLabel: 'year' }),
      readouts: [
        { label: 'Present worth', tex: `P \\approx ${moneyTex(P)}`, tone: 'good' },
        { label: 'Future worth', tex: `F \\approx ${moneyTex(F)}` },
        { label: 'Sum of the payments', tex: `N A = ${moneyTex(N * A)}` },
      ],
    };
  },
};
export const annuityPractice = {
  title: 'Monthly loan payment',
  generate(rand) {
    const P = randInt(rand, 10, 100) * 10000, rp = pick(rand, [6, 8, 9, 10, 12, 15]), n = randInt(rand, 2, 6);
    const i = rp / 100 / 12, N = 12 * n, A = P / pa(i, N);
    return {
      prompt: `<p>A loan of <strong>${P.toLocaleString('en-US')}</strong> is repaid in equal monthly payments over <strong>${n} years</strong> at <strong>${rp}% compounded monthly</strong>, the first payment one month from now. Find the monthly payment.</p>`,
      answers: [{ label: 'Monthly payment A', value: A, decimals: 2 }],
      hint: 'This is an ordinary annuity. Find i = r/12 and N = 12n, then divide P by the present worth factor.',
      hintTex: 'A = P\\,\\frac{i}{1 - (1 + i)^{-N}}',
      steps: [
        { title: 'Rate per month and number of payments', tex: `i = \\frac{${dec(rp / 100)}}{12} \\approx ${dec(i, 8)},\\quad N = 12 \\times ${n} = ${N}` },
        { title: 'Payment', tex: `A = ${moneyTex(P)} \\times \\frac{${dec(i, 8)}}{1 - (1 + ${dec(i, 8)})^{-${N}}} \\approx ${moneyTex(A)}` },
      ],
    };
  },
};

// ---------------------------------------------------------------- depreciation
const BV = (k, C, S, n, t) => {
  if (k === 'db') return C * (S / C) ** (t / n);
  if (k === 'ddb') return C * (1 - 2 / n) ** t;
  if (k === 'syd') return C - ((C - S) * (t * (2 * n - t + 1)) / 2) / ((n * (n + 1)) / 2);
  return C - ((C - S) * t) / n;
};
export const depreciationExplore = {
  title: 'Compare depreciation methods',
  intro: 'Every method starts at the first cost and ends near the salvage value. Accelerated methods write off more in the early years, which lowers taxes sooner.',
  controls: [
    { name: 'C', label: 'First cost C', min: 10000, max: 1000000, step: 10000, value: 500000 },
    { name: 'S', label: 'Salvage value S', min: 1000, max: (vals) => Math.max(1000, vals.C - 1000), step: 1000, value: 50000 },
    { name: 'n', label: 'Life n', min: 2, max: 25, step: 1, value: 8, unit: 'yr' },
    { name: 'year', label: 'Year', min: 0, max: (vals) => vals.n, step: 1, value: 3 },
  ],
  render({ C, S, n, year }) {
    const SS = Math.min(S, C - 1000), y = Math.min(year, n);
    const methods = [['sl', 'Straight line', 'd-line', 'blue'], ['syd', "Sum of the years' digits", 'd-line2', 'green'], ['db', 'Declining balance', 'd-line3', 'orange'], ['ddb', 'Double declining', 'd-hidden', 'dashed blue']];
    return {
      svg: plot({ x: [0, n], y: [0, C * 1.05], width: 400, height: 240, title: 'Book value by method', curves: methods.map(([k, , cls]) => ({ f: (t) => BV(k, C, SS, n, t), cls, samples: n * 8 })), vlines: [{ x: y, label: `year ${y}` }], hlines: [{ y: SS, cls: 'd-ground' }], xLabel: 'year', yLabel: 'book value' }),
      readouts: methods.map(([k, name, , colour]) => ({ label: `${name} (${colour})`, tex: `BV_{${y}} \\approx ${moneyTex(BV(k, C, SS, n, y))}` })),
    };
  },
};
export const depreciationPractice = {
  title: 'Book value by straight line',
  generate(rand) {
    const C = randInt(rand, 10, 90) * 10000, S = Math.round(C * pick(rand, [0.05, 0.1, 0.15, 0.2]) / 1000) * 1000, n = randInt(rand, 4, 15), m = randInt(rand, 1, n - 1);
    const d = (C - S) / n, bv = C - m * d;
    return {
      prompt: `<p>A machine costs <strong>${C.toLocaleString('en-US')}</strong>, lasts <strong>${n} years</strong> and has a salvage value of <strong>${S.toLocaleString('en-US')}</strong>. Using straight-line depreciation, find the yearly depreciation and the book value after <strong>${m} years</strong>.</p>`,
      answers: [{ label: 'Yearly depreciation d', value: d, decimals: 2 }, { label: `Book value after ${m} years`, value: bv, decimals: 2 }],
      hint: 'Spread C − S evenly over the life, then subtract m years of depreciation from C.',
      hintTex: 'd = \\frac{C - S}{n} \\qquad BV_m = C - m\\,d',
      steps: [
        { title: 'Yearly depreciation', tex: `d = \\frac{${moneyTex(C)} - ${moneyTex(S)}}{${n}} \\approx ${moneyTex(d)}` },
        { title: 'Book value', tex: `BV_{${m}} = ${moneyTex(C)} - ${m} \\times ${moneyTex(d)} \\approx ${moneyTex(bv)}` },
      ],
    };
  },
};

// ---------------------------------------------------------------- break-even
export const breakEvenExplore = {
  title: 'Move the break-even point',
  intro: 'Raise the price or cut the variable cost and the lines cross sooner. A larger fixed cost pushes the break-even point to the right.',
  controls: [
    { name: 'FC', label: 'Fixed cost', min: 0, max: 500000, step: 10000, value: 200000 },
    { name: 'v', label: 'Variable cost per unit', min: 0, max: 190, step: 5, value: 60 },
    { name: 'p', label: 'Price per unit', min: 10, max: 200, step: 5, value: 100 },
  ],
  render({ FC, v, p }) {
    const cm = p - v;
    if (cm <= 0) {
      return {
        svg: plot({ x: [0, 10000], y: [0, Math.max(FC + v * 10000, p * 10000) * 1.05], width: 400, height: 240, title: 'Break-even chart', curves: [{ f: (x) => FC + v * x, cls: 'd-line3' }, { f: (x) => p * x }], xLabel: 'units', yLabel: 'amount' }),
        readouts: [{ label: 'Break-even', text: 'Never: the price does not cover the variable cost, so every unit loses money.', tone: 'warn' }],
      };
    }
    const be = FC / cm, xMax = Math.max(be * 2, 100);
    return {
      svg: plot({ x: [0, xMax], y: [0, p * xMax * 1.05], width: 400, height: 240, title: 'Break-even chart', curves: [{ f: (x) => FC + v * x, cls: 'd-line3' }, { f: (x) => p * x }], points: [{ x: be, y: be * p }], xLabel: 'units', yLabel: 'amount' }),
      readouts: [
        { label: 'Break-even volume', tex: `Q_{BE} = \\frac{FC}{p - v} \\approx ${dec(be, 1)}\\ \\text{units}`, tone: 'good' },
        { label: 'Break-even revenue', tex: `${moneyTex(be * p)}` },
        { label: 'Margin per unit', tex: `p - v = ${moneyTex(cm)}` },
      ],
    };
  },
};
export const breakEvenPractice = {
  title: 'Break-even volume',
  generate(rand) {
    const v = randInt(rand, 5, 60) * 5, p = v + randInt(rand, 2, 30) * 5, FC = randInt(rand, 5, 80) * 10000;
    const be = FC / (p - v);
    return {
      prompt: `<p>A product sells for <strong>${p}</strong> per unit and costs <strong>${v}</strong> per unit to make. Fixed costs are <strong>${FC.toLocaleString('en-US')}</strong> a month. How many units must be sold each month to break even?</p>`,
      answers: [{ label: 'Break-even units', value: be, decimals: 2 }],
      hint: 'Each unit contributes p − v towards the fixed cost. How many contributions cover FC?',
      hintTex: 'Q_{BE} = \\frac{FC}{p - v}',
      steps: [
        { title: 'Contribution margin per unit', tex: `p - v = ${p} - ${v} = ${p - v}` },
        { title: 'Break-even volume', tex: `Q_{BE} = \\frac{FC}{p - v} = \\frac{${moneyTex(FC)}}{${p - v}} \\approx ${dec(be, 2)}\\ \\text{units}` },
      ],
    };
  },
};

// ---------------------------------------------------------------- NPV
export const npvExplore = {
  title: 'Find the rate where NPV is zero',
  intro: 'An investment of 100,000 returns the same amount every year. Raise the interest rate and the future receipts are worth less today; the IRR is where the curve crosses zero.',
  controls: [
    { name: 'R', label: 'Yearly return', min: 10000, max: 50000, step: 1000, value: 28000 },
    { name: 'N', label: 'Years', min: 2, max: 15, step: 1, value: 5 },
    { name: 'i', label: 'Interest rate (MARR)', min: 0, max: 40, step: 0.5, value: 10, unit: '%' },
  ],
  render({ R, N, i }) {
    const f = (x) => -100000 + R * pa(x / 100, N);
    return {
      svg: plot({ x: [0, 40], width: 400, height: 240, title: 'NPV against the interest rate', curves: [{ f, samples: 200 }], points: [{ x: i, y: f(i) }], xLabel: 'rate %', yLabel: 'NPV' }),
      readouts: [
        { label: 'NPV at the MARR', tex: `NPV \\approx ${moneyTex(f(i))}`, tone: f(i) >= 0 ? 'good' : 'warn' },
        { label: 'Decision', text: f(i) >= 0 ? 'Accept: the project earns at least the MARR.' : 'Reject: the project earns less than the MARR.' },
      ],
    };
  },
};
export const npvPractice = {
  title: 'Net present worth of a project',
  generate(rand) {
    const I = randInt(rand, 5, 30) * 10000, R = Math.round((I * pick(rand, [0.25, 0.3, 0.35, 0.4])) / 1000) * 1000, N = randInt(rand, 3, 6), rp = pick(rand, [8, 10, 12, 15]);
    const i = rp / 100, npv = -I + R * pa(i, N);
    return {
      prompt: `<p>A project costs <strong>${I.toLocaleString('en-US')}</strong> now and returns <strong>${R.toLocaleString('en-US')}</strong> at the end of each year for <strong>${N} years</strong>. Find its net present worth at <strong>${rp}%</strong>.</p>`,
      answers: [{ label: 'NPV', value: npv, decimals: 2 }],
      hint: 'The equal returns form an ordinary annuity: find their present worth, then subtract the cost.',
      hintTex: 'NPV = -I + R\\,\\frac{1 - (1 + i)^{-N}}{i}',
      steps: [
        { title: 'Present worth of the returns', tex: `${moneyTex(R)} \\times \\frac{1 - (1 + ${dec(i)})^{-${N}}}{${dec(i)}} \\approx ${moneyTex(R * pa(i, N))}` },
        { title: 'Net present worth', tex: `NPV = ${moneyTex(R * pa(i, N))} - ${moneyTex(I)} \\approx ${moneyTex(npv)}` },
      ],
    };
  },
};
