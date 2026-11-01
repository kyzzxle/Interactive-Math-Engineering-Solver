/** Mean, median, mode(s) and range of a data set, with exact means for decimal data. */
import { fmt, tx } from '../lib/calc-kit.js';
import { Frac } from '../lib/fraction.js';
import { DATA_FIELD, parseData } from '../lib/stats-kit.js';
import { plot } from '../lib/plot.js';

export const calculator = {
  id: 'mean-median-mode-range',
  fields: [DATA_FIELD],
  examples: [
    { label: 'Test scores', values: { data: '72, 85, 90, 85, 64, 78, 85, 92, 70, 78' } },
    { label: 'Even count: 4, 8, 15, 16, 23, 42', values: { data: '4 8 15 16 23 42' } },
    { label: 'Two modes', values: { data: '3, 7, 7, 2, 9, 3, 5' } },
  ],
  solve(values) {
    const p = parseData(values.data);
    if (p.error) return { ok: false, errors: [{ field: 'data', message: p.error }] };
    const xs = p.values, n = xs.length;
    const sortedF = p.fracs.slice().sort((a, b) => a.cmp(b));
    const sorted = sortedF.map((f) => f.toNumber());
    const sumF = p.fracs.reduce((s, f) => s.add(f), new Frac(0n));
    const meanF = sumF.div(n);
    const mean = meanF.toNumber();
    let medianF;
    if (n % 2) medianF = sortedF[(n - 1) / 2];
    else medianF = sortedF[n / 2 - 1].add(sortedF[n / 2]).div(2);
    const counts = new Map();
    for (const f of sortedF) { const k = f.toString(); counts.set(k, { f, c: (counts.get(k)?.c || 0) + 1 }); }
    const maxC = Math.max(...[...counts.values()].map((x) => x.c));
    const modes = maxC === 1 || [...counts.values()].every((x) => x.c === maxC) ? [] : [...counts.values()].filter((x) => x.c === maxC).map((x) => x.f);
    const rangeF = sortedF[n - 1].sub(sortedF[0]);
    const show = (arr) => (arr.length > 30 ? `${arr.slice(0, 15).map((v) => fmt(v)).join(', ')}, …, ${arr.slice(-5).map((v) => fmt(v)).join(', ')}` : arr.map((v) => fmt(v)).join(', '));
    const exactTex = (f) => (f.isInt() ? f.toString() : f.toDecimal(6) ? f.toDecimal(6) : `${f.toTex()} \\approx ${tx(f.toNumber())}`);
    const steps = [
      { title: 'Sort the data', text: `${n} value${n === 1 ? '' : 's'} in increasing order: ${show(sorted)}` },
      { title: 'Mean: add the values and divide by n', texLines: ['\\bar{x} = \\frac{\\sum x_i}{n}', `\\bar{x} = \\frac{${exactTex(sumF)}}{${n}} = ${exactTex(meanF)}`] },
      { title: 'Median: the middle value', text: n % 2 ? `n = ${n} is odd, so the median is value number ${(n + 1) / 2} in the sorted list.` : `n = ${n} is even, so the median is the average of values ${n / 2} and ${n / 2 + 1}.`, tex: n % 2 ? `\\text{median} = ${exactTex(medianF)}` : `\\text{median} = \\frac{${tx(sorted[n / 2 - 1])} + ${tx(sorted[n / 2])}}{2} = ${exactTex(medianF)}` },
      { title: 'Mode: the most frequent value', text: modes.length ? `${modes.map((m) => fmt(m.toNumber())).join(' and ')} occur${modes.length === 1 ? 's' : ''} ${maxC} times, more than any other value.` : 'Every value occurs equally often, so the data set has no mode.' },
      { title: 'Range: largest minus smallest', tex: `\\text{range} = ${tx(sorted[n - 1])} - ${tx(sorted[0])} = ${exactTex(rangeF)}` },
    ];
    const freq = [...counts.values()];
    const distinct = freq.length;
    const lo = sorted[0], hi = sorted[n - 1], span = Math.max(hi - lo, 1);
    const w = distinct > 1 ? Math.min(...freq.slice(1).map((x, i) => x.f.toNumber() - freq[i].f.toNumber())) * 0.6 : span * 0.1;
    const svg = distinct <= 60
      ? plot({ x: [lo - span * 0.1 - w, hi + span * 0.1 + w], y: [0, maxC * 1.25], bars: freq.map((x) => ({ x: x.f.toNumber(), h: x.c, w, cls: modes.some((m) => m.eq(x.f)) ? 'd-bar-hi' : 'd-bar' })), vlines: [{ x: mean, cls: 'd-line', label: 'mean' }, { x: medianF.toNumber(), cls: 'd-line3', label: 'median' }], includeZero: false, title: 'Frequency of each value with the mean and median marked' })
      : plot({ x: [lo - span * 0.05, hi + span * 0.05], y: [0, 1], vlines: [{ x: mean, cls: 'd-line', label: 'mean' }, { x: medianF.toNumber(), cls: 'd-line3', label: 'median' }], points: sorted.filter((_, i) => i % Math.ceil(n / 300) === 0).map((x) => ({ x, y: 0.3, r: 2.5, cls: 'd-point' })), title: 'Data values on a number line with the mean and median marked' });
    return {
      ok: true,
      final: { texLines: [`\\bar{x} = ${exactTex(meanF)}, \\quad \\text{median} = ${exactTex(medianF)}`, `\\text{mode} = ${modes.length ? modes.map((m) => exactTex(m)).join(',\\ ') : '\\text{none}'}, \\quad \\text{range} = ${exactTex(rangeF)}`] },
      answers: [
        { label: 'Mean', value: fmt(mean), approx: !meanF.toDecimal(6), exactTex: meanF.toDecimal(6) ? undefined : meanF.toTex(), primary: true },
        { label: 'Median', value: fmt(medianF.toNumber()), primary: true },
        { label: modes.length > 1 ? 'Modes' : 'Mode', value: modes.length ? modes.map((m) => fmt(m.toNumber())).join(', ') : 'none', primary: true },
        { label: 'Range', value: fmt(rangeF.toNumber()), primary: true },
        { label: 'Count n', value: String(n) },
        { label: 'Sum', value: fmt(sumF.toNumber()) },
        { label: 'Minimum', value: fmt(lo) },
        { label: 'Maximum', value: fmt(hi) },
      ],
      visual: { svg, legend: '<div class="legend"><span><i></i>Mean</span><span><i class="l3"></i>Median</span><span><i class="l2"></i>Mode</span></div>', caption: mean > medianF.toNumber() ? 'The mean is above the median: the data are pulled to the right by large values (right-skewed).' : mean < medianF.toNumber() ? 'The mean is below the median: small values pull the data to the left (left-skewed).' : 'The mean equals the median: the data are balanced around the centre.' },
      formula: ['\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_i'],
      steps,
      rounding: 'The mean is computed exactly (as a fraction) and shown rounded to 6 decimal places if it does not terminate.',
    };
  },
};
