/**
 * Explorers for statistics, combinatorics and numerical methods: distributions with a
 * highlighted probability region, listed arrangements/selections, and root-finding iterations.
 */
import { plot } from '../lib/plot.js';
import { tx } from '../lib/calc-kit.js';
import { normalCdf, normalPdf, lgamma } from '../lib/numeric.js';
import { parse, derivative, texOf, compile } from '../lib/expr.js';
import { escapeHtml } from '../lib/ui.js';
import { randInt, pick } from '../lib/learn.js';

const t = (v, d = 4) => tx(v, d);

// ------------------------------------------------------------------ statistics
export const normalExplore = {
  title: 'Shade a normal probability',
  intro: 'The shaded area is P(a < X < b). Changing μ slides the curve; changing σ makes it wider and flatter, but the total area stays 1.',
  controls: [
    { name: 'mu', label: 'Mean μ', min: -4, max: 4, step: 0.1, value: 0 },
    { name: 'sigma', label: 'Standard deviation σ', min: 0.4, max: 3, step: 0.1, value: 1 },
    { name: 'a', label: 'From a', min: -10, max: 10, step: 0.1, value: -1 },
    { name: 'b', label: 'To b', min: (v) => v.a, max: 10, step: 0.1, value: 1 },
  ],
  presets: [{ label: 'μ ± 1σ (68%)', values: { mu: 0, sigma: 1, a: -1, b: 1 } }, { label: 'μ ± 2σ (95%)', values: { mu: 0, sigma: 1, a: -2, b: 2 } }, { label: 'Upper tail', values: { mu: 0, sigma: 1, a: 1.5, b: 10 } }],
  render({ mu, sigma, a, b }) {
    const pdf = (x) => normalPdf((x - mu) / sigma) / sigma;
    const za = (a - mu) / sigma, zb = (b - mu) / sigma;
    const p = normalCdf(zb) - normalCdf(za);
    return {
      svg: plot({ x: [-10, 10], y: [0, 1.05], width: 400, height: 260, title: 'Normal curve with shaded probability', curves: [{ f: pdf }], shade: [{ f: pdf, a: Math.max(a, -10), b: Math.min(b, 10) }], vlines: [{ x: mu, cls: 'd-line3', label: 'μ' }] }),
      readouts: [
        { label: 'z-scores', tex: `z_a = \\frac{a - \\mu}{\\sigma} \\approx ${t(za, 3)},\\ z_b \\approx ${t(zb, 3)}` },
        { label: 'Probability (shaded)', tex: `P(a < X < b) \\approx ${t(p)}`, tone: 'good' },
        { label: 'As a percentage', text: `${(p * 100).toFixed(2)}%` },
      ],
    };
  },
};

function binomPmf(n, p, k) {
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  return Math.exp(lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1) + k * Math.log(p) + (n - k) * Math.log(1 - p));
}
export const binomialExplore = {
  title: 'Shape a binomial distribution',
  intro: 'Each bar is P(X = k) for n independent trials with success probability p. The highlighted bars add up to the probability shown.',
  controls: [
    { name: 'n', label: 'Trials n', min: 1, max: 40, step: 1, value: 10 },
    { name: 'p', label: 'Success probability p', min: 0, max: 1, step: 0.01, value: 0.5 },
    { name: 'lo', label: 'From k =', min: 0, max: (v) => v.n, step: 1, value: 4 },
    { name: 'hi', label: 'To k =', min: (v) => v.lo, max: (v) => v.n, step: 1, value: 6 },
  ],
  presets: [{ label: 'Fair coin, 10 tosses', values: { n: 10, p: 0.5, lo: 4, hi: 6 } }, { label: 'Skewed (p = 0.15)', values: { n: 20, p: 0.15, lo: 0, hi: 2 } }],
  render({ n, p, lo, hi }) {
    const pm = Array.from({ length: n + 1 }, (_, k) => binomPmf(n, p, k));
    const prob = pm.slice(lo, hi + 1).reduce((s, v) => s + v, 0);
    const bars = pm.map((h, k) => ({ x: k, w: 0.8, h, cls: k >= lo && k <= hi ? 'd-bar-hi' : 'd-bar' }));
    return {
      svg: plot({ x: [-0.8, n + 0.8], width: 400, height: 260, title: 'Binomial probabilities', bars, xTicks: n <= 20 ? pm.map((_, k) => ({ x: k, label: String(k) })).filter((_, k) => n <= 12 || k % 2 === 0) : undefined }),
      readouts: [
        { label: 'Probability (highlighted)', tex: `P(${lo} \\le X \\le ${hi}) \\approx ${t(prob)}`, tone: 'good' },
        { label: 'Mean and spread', tex: `\\mu = np = ${t(n * p, 3)},\\ \\sigma = \\sqrt{np(1-p)} \\approx ${t(Math.sqrt(n * p * (1 - p)), 3)}` },
        { label: 'Most likely value', text: `k = ${pm.indexOf(Math.max(...pm))}` },
      ],
    };
  },
};

export const zScorePractice = {
  title: 'Standardise a value',
  generate(rand) {
    const mu = pick(rand, [50, 60, 70, 100, 170, 500]);
    const sigma = pick(rand, [4, 5, 8, 10, 12, 15]);
    const x = mu + randInt(rand, -25, 25) / 10 * sigma;
    const z = (x - mu) / sigma;
    const pBelow = normalCdf(z);
    return {
      prompt: `<p>Scores are normally distributed with mean <strong>μ = ${mu}</strong> and standard deviation <strong>σ = ${sigma}</strong>. A student scores <strong>x = ${Number(x.toFixed(2))}</strong>. Find the z-score and the proportion of students who scored lower.</p>`,
      answers: [{ label: 'z-score', value: z }, { label: 'P(X < x)', value: pBelow, decimals: 2 }],
      hint: 'The z-score counts how many standard deviations x is from the mean. Then use the standard normal table or Φ(z).',
      hintTex: 'z = \\frac{x - \\mu}{\\sigma}',
      steps: [
        { title: 'Known values', tex: `x = ${Number(x.toFixed(2))},\\ \\mu = ${mu},\\ \\sigma = ${sigma}` },
        { title: 'z-score', tex: `z = \\frac{${Number(x.toFixed(2))} - ${mu}}{${sigma}} = ${t(z, 2)}` },
        { title: 'Area to the left', tex: `P(X < x) = \\Phi(${t(z, 2)}) \\approx ${t(pBelow, 4)}` },
      ],
    };
  },
};

// ------------------------------------------------------------------ combinatorics
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
function perms(items, r) {
  if (r === 0) return [[]];
  const out = [];
  items.forEach((it, i) => { for (const rest of perms(items.filter((_, j) => j !== i), r - 1)) out.push([it, ...rest]); });
  return out;
}
function combs(items, r, start = 0) {
  if (r === 0) return [[]];
  const out = [];
  for (let i = start; i <= items.length - r; i++) for (const rest of combs(items, r - 1, i + 1)) out.push([items[i], ...rest]);
  return out;
}
const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));

export const arrangementsExplore = {
  title: 'List every arrangement',
  intro: 'With small numbers you can see every case. Order matters for permutations (AB ≠ BA) but not for combinations, so each combination appears r! times among the permutations.',
  controls: [
    { name: 'n', label: 'Items to choose from n', min: 2, max: 6, step: 1, value: 4 },
    { name: 'r', label: 'Items chosen r', min: 1, max: (v) => v.n, step: 1, value: 2 },
    { name: 'mode', label: 'Show', type: 'select', options: [['perm', 'Permutations (order matters)'], ['comb', 'Combinations (order does not matter)']], value: 'perm' },
  ],
  presets: [{ label: '3 of 3 (3! = 6)', values: { n: 3, r: 3 } }, { label: '2 of 5', values: { n: 5, r: 2 } }],
  render({ n, r, mode }) {
    const items = LETTERS.slice(0, n);
    const nPr = fact(n) / fact(n - r), nCr = nPr / fact(r);
    let html;
    if (mode === 'perm') {
      // group the permutations by the set they use, so the r! orderings sit together
      const groups = combs(items, r).map((c) => perms(c, r));
      html = `<p class="combo-head">${nPr} permutations of ${r} from {${items.join(', ')}}${r > 1 ? ` — grouped by which letters are used (${fact(r)} orderings each)` : ''}</p>
        <ul class="combo-list">${groups.map((g) => g.map((p, i) => `<li${i === 0 && r > 1 ? ' class="is-group-start"' : ''}>${p.join('')}</li>`).join('')).join('')}</ul>`;
    } else {
      html = `<p class="combo-head">${nCr} combinations of ${r} from {${items.join(', ')}}</p>
        <ul class="combo-list">${combs(items, r).map((c) => `<li>{${c.join(', ')}}</li>`).join('')}</ul>`;
    }
    return {
      html: `<div class="p-2" role="img" aria-label="${escapeHtml(`List of ${mode === 'perm' ? nPr + ' permutations' : nCr + ' combinations'}`)}">${html}</div>`,
      readouts: [
        { label: 'Permutations', tex: `{}_{${n}}P_{${r}} = \\frac{${n}!}{(${n} - ${r})!} = ${nPr}`, tone: mode === 'perm' ? 'good' : undefined },
        { label: 'Combinations', tex: `\\binom{${n}}{${r}} = \\frac{${n}!}{${r}!\\,(${n} - ${r})!} = ${nCr}`, tone: mode === 'comb' ? 'good' : undefined },
        { label: 'Link between them', tex: `{}_{${n}}P_{${r}} = \\binom{${n}}{${r}} \\cdot ${r}! = ${nCr} \\cdot ${fact(r)}` },
      ],
    };
  },
};

export const countingPractice = {
  title: 'Count the arrangements',
  generate(rand) {
    const n = randInt(rand, 5, 10), r = randInt(rand, 2, Math.min(4, n - 1));
    const nPr = fact(n) / fact(n - r), nCr = nPr / fact(r);
    const ctx = pick(rand, [['students', 'a president, a secretary', 'a committee'], ['runners', 'gold, silver', 'a relay squad'], ['books', 'shelf positions 1, 2', 'a bundle']]);
    return {
      prompt: `<p>There are <strong>${n} ${ctx[0]}</strong>. In how many ways can you choose <strong>${r}</strong> of them (a) when the order matters (for example ${ctx[1]}, …), and (b) when it does not (for example ${ctx[2]})?</p>`,
      answers: [{ label: '(a) Order matters', value: nPr, int: true }, { label: '(b) Order does not matter', value: nCr, int: true }],
      hint: 'Ordered choices: multiply n × (n − 1) × … for r factors. Unordered: divide that by r! because each group can be ordered r! ways.',
      hintTex: '{}_nP_r = \\frac{n!}{(n-r)!} \\qquad \\binom{n}{r} = \\frac{{}_nP_r}{r!}',
      steps: [
        { title: 'Ordered (permutations)', tex: `{}_{${n}}P_{${r}} = ${Array.from({ length: r }, (_, i) => n - i).join(' \\times ')} = ${nPr}` },
        { title: 'Unordered (combinations)', tex: `\\binom{${n}}{${r}} = \\frac{${nPr}}{${r}!} = \\frac{${nPr}}{${fact(r)}} = ${nCr}` },
      ],
    };
  },
};

// ------------------------------------------------------------------ numerical methods
const ROOT_FUNCS = {
  'x^3 - x - 2': { a: 1, b: 2, x0: 2, view: [0, 2.6] },
  'cos(x) - x': { a: 0, b: 1, x0: 1, view: [-0.3, 1.6] },
  'x^2 - 2': { a: 0, b: 2, x0: 2, view: [-0.3, 2.6] },
  'e^x - 3': { a: 0, b: 2, x0: 2, view: [-0.3, 2.4] },
};
const rootCache = new Map();
function rootRuns(src) {
  if (rootCache.has(src)) return rootCache.get(src);
  const node = parse(src), d = derivative(node);
  const f = compile(node), df = compile(d), cfg = ROOT_FUNCS[src];
  const bis = [];
  let a = cfg.a, b = cfg.b;
  for (let k = 0; k <= 15; k++) {
    const m = (a + b) / 2;
    bis.push({ a, b, x: m, fx: f(m) });
    if (f(a) * f(m) <= 0) b = m; else a = m;
  }
  const newt = [];
  let x = cfg.x0;
  for (let k = 0; k <= 15; k++) {
    const fx = f(x), dfx = df(x);
    newt.push({ x, fx, dfx });
    if (!dfx) break;
    x -= fx / dfx;
  }
  const res = { f, tex: texOf(node), bis, newt, cfg };
  rootCache.set(src, res);
  return res;
}

export const rootFinderExplore = {
  title: 'Step through the iterations',
  intro: 'Bisection halves a bracket that must contain the root. Newton–Raphson follows the tangent line down to the x-axis. Step forward and compare how fast each one closes in.',
  controls: [
    { name: 'fn', label: 'Function', type: 'select', options: Object.keys(ROOT_FUNCS).map((k) => [k, `f(x) = ${k.replace('^3', '³').replace('^2', '²').replace('e^x', 'eˣ')}`]), value: 'x^3 - x - 2' },
    { name: 'method', label: 'Method', type: 'select', options: [['bisection', 'Bisection'], ['newton', 'Newton–Raphson']], value: 'bisection' },
    { name: 'k', label: 'Iteration k', min: 0, max: (v) => (v.method === 'newton' ? 6 : 15), step: 1, value: 0 },
  ],
  animate: { control: 'k', seconds: 6 },
  render({ fn, method, k }) {
    const R = rootRuns(fn);
    const [x0, x1] = R.cfg.view;
    const ys = Array.from({ length: 81 }, (_, i) => R.f(x0 + ((x1 - x0) * i) / 80)).filter(Number.isFinite);
    const ylo = Math.min(0, ...ys), yhi = Math.max(0, ...ys), pad = (yhi - ylo) * 0.1;
    const plotBase = { x: [x0, x1], y: [ylo - pad, yhi + pad], width: 400, height: 280, title: `Iteration ${k}`, curves: [{ f: R.f }] };
    let svg, rows, cur;
    if (method === 'bisection') {
      cur = R.bis[k];
      svg = plot({ ...plotBase, shade: [{ f: () => yhi + pad, g: () => ylo - pad, a: cur.a, b: cur.b, cls: 'd-shade2' }], vlines: [{ x: cur.a, cls: 'd-line3' }, { x: cur.b, cls: 'd-line3' }], points: [{ x: cur.x, y: 0, label: `x${k}`, cls: 'd-point3' }, { x: cur.x, y: cur.fx }] });
      rows = R.bis.slice(0, k + 1).map((r, i) => `<tr${i === k ? ' class="is-current"' : ''}><td>${i}</td><td>${r.a.toFixed(6)}</td><td>${r.b.toFixed(6)}</td><td>${r.x.toFixed(8)}</td><td>${r.fx.toExponential(2)}</td></tr>`);
      rows.unshift('<tr><th scope="col">k</th><th scope="col">a</th><th scope="col">b</th><th scope="col">midpoint</th><th scope="col">f(mid)</th></tr>');
    } else {
      const kk = Math.min(k, R.newt.length - 1);
      cur = R.newt[kk];
      const next = R.newt[kk + 1];
      svg = plot({ ...plotBase, curves: [{ f: R.f }, { f: (x) => cur.fx + cur.dfx * (x - cur.x), cls: 'd-line2' }], points: [{ x: cur.x, y: cur.fx, label: `x${kk}` }, ...(next ? [{ x: next.x, y: 0, label: `x${kk + 1}`, cls: 'd-point3' }] : [])] });
      rows = R.newt.slice(0, kk + 1).map((r, i) => `<tr${i === kk ? ' class="is-current"' : ''}><td>${i}</td><td>${r.x.toFixed(10)}</td><td>${r.fx.toExponential(2)}</td></tr>`);
      rows.unshift('<tr><th scope="col">k</th><th scope="col">x<sub>k</sub></th><th scope="col">f(x<sub>k</sub>)</th></tr>');
    }
    return {
      svg,
      html: `<div class="table-wrap iter-table mt-2"><table class="data-table">${rows.join('')}</table></div>`,
      readouts: [
        { label: 'Equation', tex: `f(x) = ${R.tex} = 0` },
        method === 'bisection'
          ? { label: 'Bracket width', tex: `b - a = ${t(cur.b - cur.a, 8)} = \\frac{${t(R.bis[0].b - R.bis[0].a, 2)}}{2^{${k}}}` }
          : { label: 'Newton step', tex: `x_{k+1} = x_k - \\frac{f(x_k)}{f'(x_k)}` },
        { label: `Estimate after ${method === 'bisection' ? k : Math.min(k, R.newt.length - 1)} steps`, tex: `x \\approx ${t(cur.x, 10)}`, tone: Math.abs(cur.fx) < 1e-8 ? 'good' : undefined },
      ],
    };
  },
};
