/**
 * Numerical methods: special functions for statistics, integration, root finding
 * and real polynomial roots. All functions are pure and unit-tested.
 */
import { Frac } from './fraction.js';
import { polyDeriv, polyEval, polyTrim, polyEvalFrac } from './expr.js';

// ------------------------------------------------------------------ special functions
/** erf(x) to ~1e-15: Taylor series for |x| < 2.5, continued fraction for erfc beyond. */
export function erf(x) {
  if (x < 0) return -erf(-x);
  if (x < 2.5) {
    let sum = x, term = x;
    for (let n = 1; n < 200; n++) {
      term *= -x * x / n;
      const add = term / (2 * n + 1);
      sum += add;
      if (Math.abs(add) < 1e-17 * Math.abs(sum)) break;
    }
    return (2 / Math.sqrt(Math.PI)) * sum;
  }
  return 1 - erfc(x);
}

/** erfc(x) for x ≥ 0 via Lentz's continued fraction (accurate in the tails). */
export function erfc(x) {
  if (x < 2.5) return 1 - erf(x);
  // erfc(x) = exp(-x²)/√π · 1/(x + 1/2/(x + 1/(x + 3/2/(x + ...))))
  const tiny = 1e-300;
  let f = x, C = x, D = 0;
  for (let n = 1; n < 500; n++) {
    const a = n / 2;
    D = x + a * D; D = Math.abs(D) < tiny ? tiny : D; D = 1 / D;
    C = x + a / C; C = Math.abs(C) < tiny ? tiny : C;
    const delta = C * D;
    f *= delta;
    if (Math.abs(delta - 1) < 1e-16) break;
  }
  return Math.exp(-x * x) / (Math.sqrt(Math.PI) * f);
}

/** Standard normal CDF Φ(z). */
export function normalCdf(z) {
  if (z < 0) return 0.5 * erfc(-z / Math.SQRT2);
  return 1 - 0.5 * erfc(z / Math.SQRT2);
}
export function normalPdf(z) { return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI); }

/** Inverse standard normal CDF (Acklam's approximation refined with Halley steps). */
export function normalInv(p) {
  if (!(p > 0 && p < 1)) throw new RangeError('Probability must be strictly between 0 and 1');
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  let x;
  if (p < lo) { const q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  else if (p > 1 - lo) { const q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  else { const q = p - 0.5, r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  for (let i = 0; i < 2; i++) {
    const e = normalCdf(x) - p;
    const u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2);
    x -= u / (1 + x * u / 2);
  }
  return x;
}

/** ln Γ(x) for x > 0 (Lanczos, g = 7). */
export function lgamma(x) {
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Regularized incomplete beta I_x(a, b) (Numerical Recipes continued fraction). */
export function incBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  const cf = (xx, aa, bb) => {
    const tiny = 1e-300;
    let c = 1, d = 1 - (aa + bb) * xx / (aa + 1);
    d = Math.abs(d) < tiny ? tiny : d; d = 1 / d;
    let h = d;
    for (let m = 1; m <= 300; m++) {
      const m2 = 2 * m;
      let aa1 = m * (bb - m) * xx / ((aa + m2 - 1) * (aa + m2));
      d = 1 + aa1 * d; d = Math.abs(d) < tiny ? tiny : d; c = 1 + aa1 / c; c = Math.abs(c) < tiny ? tiny : c; d = 1 / d; h *= d * c;
      aa1 = -(aa + m) * (aa + bb + m) * xx / ((aa + m2) * (aa + m2 + 1));
      d = 1 + aa1 * d; d = Math.abs(d) < tiny ? tiny : d; c = 1 + aa1 / c; c = Math.abs(c) < tiny ? tiny : c; d = 1 / d;
      const del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-15) break;
    }
    return h;
  };
  return x < (a + 1) / (a + b + 2) ? bt * cf(x, a, b) / a : 1 - bt * cf(1 - x, b, a) / b;
}

/** Student t CDF with df degrees of freedom. */
export function tCdf(t, df) {
  const x = df / (df + t * t);
  const tail = 0.5 * incBeta(x, df / 2, 0.5);
  return t >= 0 ? 1 - tail : tail;
}

/** Inverse Student t CDF by bisection (60+ correct bits). */
export function tInv(p, df) {
  if (!(p > 0 && p < 1)) throw new RangeError('Probability must be strictly between 0 and 1');
  let lo = -1e4, hi = 1e4;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (tCdf(mid, df) < p) lo = mid; else hi = mid;
    if (hi - lo < 1e-13 * Math.max(1, Math.abs(mid))) break;
  }
  return (lo + hi) / 2;
}

// ------------------------------------------------------------------ integration
/** Adaptive Simpson's rule. Throws if the function is not finite on [a, b]. */
export function adaptiveSimpson(f, a, b, tol = 1e-10, maxDepth = 40) {
  let evaluations = 0;
  const F = (x) => {
    const y = f(x);
    evaluations++;
    if (!Number.isFinite(y)) throw new RangeError(`The function is undefined or infinite at x = ${+x.toPrecision(6)}.`);
    return y;
  };
  const simpson = (x0, x2, f0, f1, f2) => ((x2 - x0) / 6) * (f0 + 4 * f1 + f2);
  const rec = (x0, x2, f0, f1, f2, whole, eps, depth) => {
    const x1 = (x0 + x2) / 2;
    const xl = (x0 + x1) / 2, xr = (x1 + x2) / 2;
    const fl = F(xl), fr = F(xr);
    const left = simpson(x0, x1, f0, fl, f1), right = simpson(x1, x2, f1, fr, f2);
    const diff = left + right - whole;
    if (depth <= 0 || Math.abs(diff) <= 15 * eps) return left + right + diff / 15;
    return rec(x0, x1, f0, fl, f1, left, eps / 2, depth - 1) + rec(x1, x2, f1, fr, f2, right, eps / 2, depth - 1);
  };
  if (a === b) return { value: 0, evaluations: 0 };
  const sign = a < b ? 1 : -1;
  const [lo, hi] = a < b ? [a, b] : [b, a];
  // split into 16 panels so narrow features are not missed
  let total = 0;
  const panels = 16;
  for (let i = 0; i < panels; i++) {
    const x0 = lo + ((hi - lo) * i) / panels, x2 = lo + ((hi - lo) * (i + 1)) / panels;
    const f0 = F(x0), f2 = F(x2), f1 = F((x0 + x2) / 2);
    total += rec(x0, x2, f0, f1, f2, simpson(x0, x2, f0, f1, f2), tol / panels, maxDepth);
  }
  return { value: sign * total, evaluations };
}

/** Composite trapezoidal and Simpson's rules with the table of points. */
export function trapezoid(f, a, b, n) {
  const h = (b - a) / n;
  const pts = Array.from({ length: n + 1 }, (_, i) => { const x = a + i * h; return { i, x, y: f(x), w: i === 0 || i === n ? 1 : 2 }; });
  const sum = pts.reduce((s, p) => s + p.w * p.y, 0);
  return { h, points: pts, sum, value: (h / 2) * sum };
}
export function simpson(f, a, b, n) {
  const h = (b - a) / n;
  const pts = Array.from({ length: n + 1 }, (_, i) => { const x = a + i * h; return { i, x, y: f(x), w: i === 0 || i === n ? 1 : i % 2 ? 4 : 2 }; });
  const sum = pts.reduce((s, p) => s + p.w * p.y, 0);
  return { h, points: pts, sum, value: (h / 3) * sum };
}

// ------------------------------------------------------------------ roots
/** Find sign changes of f on [a, b] using a grid, then refine each by bisection. */
export function findRoots(f, a, b, { samples = 2000, tol = 1e-13 } = {}) {
  const roots = [];
  let x0 = a, y0 = f(a);
  if (Math.abs(y0) < 1e-14) roots.push(a);
  for (let i = 1; i <= samples; i++) {
    const x1 = a + ((b - a) * i) / samples;
    const y1 = f(x1);
    if (Number.isFinite(y0) && Number.isFinite(y1)) {
      if (Math.abs(y1) < 1e-14) roots.push(x1);
      else if (y0 * y1 < 0 && Math.abs(y0) > 1e-14) {
        const r = bisect(f, x0, x1, tol).root;
        // reject sign changes caused by poles (|f| grows instead of shrinking)
        if (Math.abs(f(r)) < 1e-6 * Math.max(1, Math.abs(y0), Math.abs(y1))) roots.push(r);
      }
    }
    x0 = x1; y0 = y1;
  }
  return dedupe(roots, (b - a) * 1e-9);
}

function dedupe(xs, eps) {
  const out = [];
  xs.sort((p, q) => p - q).forEach((x) => { if (!out.length || Math.abs(x - out[out.length - 1]) > eps) out.push(x); });
  return out;
}

/** Bisection with an iteration log. f(a) and f(b) must have opposite signs. */
export function bisect(f, a, b, tol = 1e-12, maxIter = 200) {
  let fa = f(a);
  const log = [];
  let m = a;
  for (let i = 1; i <= maxIter; i++) {
    m = (a + b) / 2;
    const fm = f(m);
    log.push({ i, a, b, m, fm, width: b - a });
    if (fm === 0 || (b - a) / 2 < tol) return { root: m, iterations: i, log, converged: true };
    if (fa * fm < 0) b = m; else { a = m; fa = fm; }
  }
  return { root: m, iterations: maxIter, log, converged: false };
}

/** Real roots of a polynomial with Frac or number coefficients [c0, c1, ...], sorted ascending. */
export function polyRealRoots(coeffs) {
  const p = polyTrim(coeffs.map((c) => (c instanceof Frac ? c : Frac.of(c))));
  const deg = p.length - 1;
  if (deg < 1) return [];
  const pn = p.map((c) => c.toNumber());
  if (deg === 1) return [-pn[0] / pn[1]];
  // Cauchy bound
  const lead = Math.abs(pn[deg]);
  const bound = 1 + Math.max(...pn.slice(0, deg).map((c) => Math.abs(c) / lead));
  const crit = polyRealRoots(polyDeriv(p)).filter((c) => Math.abs(c) <= bound);
  const pts = [-bound, ...crit, bound];
  const f = (x) => polyEval(p, x);
  const roots = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const fa = f(a), fb = f(b);
    if (fa === 0) roots.push(a);
    if (fa * fb < 0) roots.push(bisect(f, a, b, 1e-15 * Math.max(1, Math.abs(a), Math.abs(b))).root);
  }
  if (f(pts[pts.length - 1]) === 0) roots.push(pts[pts.length - 1]);
  // repeated roots touch zero at a critical point without a sign change
  const scale = Math.max(...pn.map(Math.abs));
  for (const c of crit) if (Math.abs(f(c)) <= 1e-10 * scale * Math.max(1, Math.abs(c) ** deg)) roots.push(c);
  return dedupe(roots, 1e-9 * Math.max(1, bound));
}

/** Exact rational roots of an integer-coefficient polynomial via the rational root theorem. */
export function rationalRoots(coeffs) {
  let p = polyTrim(coeffs.map((c) => Frac.of(c)));
  // scale to integers
  let l = 1n;
  for (const c of p) l = (l * c.d) / gcdBig(l, c.d);
  let ints = p.map((c) => (c.n * l) / c.d);
  const roots = [];
  // zero roots
  while (ints.length > 1 && ints[0] === 0n) { roots.push(Frac.of(0)); ints = ints.slice(1); }
  if (ints.length < 2) return roots;
  const a0 = absBig(ints[0]), an = absBig(ints[ints.length - 1]);
  if (a0 > 10n ** 12n || an > 10n ** 12n) return roots;
  const divs = (n) => { const out = []; for (let d = 1n; d * d <= n; d++) if (n % d === 0n) { out.push(d); if (d * d !== n) out.push(n / d); } return out; };
  const P = divs(a0), Q = divs(an);
  const seen = new Set();
  let poly = ints.map((c) => Frac.of(c));
  for (const q of Q) for (const pp of P) for (const s of [1n, -1n]) {
    const r = new Frac(s * pp, q);
    const k = r.toString();
    if (seen.has(k)) continue;
    seen.add(k);
    while (poly.length > 1 && polyEvalFrac(poly, r).isZero()) { roots.push(r); poly = synthDiv(poly, r); }
  }
  return roots.sort((a, b) => a.cmp(b));
}

/** Divide polynomial by (x - r) exactly (r must be a root). Coefficients low → high. */
export function synthDiv(p, r) {
  const n = p.length - 1;
  const out = new Array(n);
  let carry = Frac.of(0);
  for (let i = n; i >= 1; i--) { carry = p[i].add(carry.mul(r)); out[i - 1] = carry; }
  return out;
}

function gcdBig(a, b) { a = absBig(a); b = absBig(b); while (b) [a, b] = [b, a % b]; return a || 1n; }
function absBig(a) { return a < 0n ? -a : a; }

/** Numerical derivative (central difference, used for checks). */
export function numDeriv(f, x, h = 1e-5) { return (f(x + h) - f(x - h)) / (2 * h); }
