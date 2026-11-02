/**
 * Exact polynomial tools on Frac coefficients (lowest degree first): parsing from a form
 * field, TeX, long division with recorded steps, GCD, rational-root factoring and partial
 * fractions. Used by the algebra calculators and the inverse Laplace transform.
 */
import { Frac } from './fraction.js';
import { parse, toPoly, polyToNode, texOf, textOf, polyTrim, polyMul, polyAdd, polyEvalFrac, ExprError } from './expr.js';
import { rationalRoots, synthDiv } from './numeric.js';
import { solveLinear } from './linalg.js';

const F = (x) => Frac.of(x);
export const degree = (p) => polyTrim(p).length - 1;
export const isZeroPoly = (p) => polyTrim(p).every((c) => c.isZero());
export const polyTex = (p, v = 'x') => texOf(polyToNode(polyTrim(p), v));
export const polyText = (p, v = 'x') => textOf(polyToNode(polyTrim(p), v));
export const lead = (p) => polyTrim(p)[polyTrim(p).length - 1];
export const scalePoly = (p, k) => p.map((c) => c.mul(k));
export const subPoly = (a, b) => polyTrim(polyAdd(a, b.map((c) => c.neg())));
export const monic = (p) => scalePoly(polyTrim(p), lead(p).inv());

/** Read a polynomial from a field. Returns { p } or { error } (an error result object). */
export function parsePolyField(values, field, label, { maxDeg = 6, v = 'x', allowZero = false } = {}) {
  const src = String(values[field] ?? '').trim();
  const err = (message) => ({ error: { ok: false, errors: [{ field, message }] } });
  if (!src) return err(`Enter ${label}.`);
  if (src.length > 200) return err(`${label.charAt(0).toUpperCase() + label.slice(1)} is too long.`);
  let node;
  try { node = parse(src, { vars: [v] }); } catch (e) { if (e instanceof ExprError) return err(e.message); throw e; }
  let p;
  try { p = toPoly(node, v); } catch { p = null; }
  if (!p) return err(`${label.charAt(0).toUpperCase() + label.slice(1)} must be a polynomial in ${v} with number coefficients, for example 2${v}^3 - ${v} + 5 (no division by ${v}, roots or functions).`);
  p = polyTrim(p);
  if (p.some((c) => c.n.toString().length > 18 || c.d.toString().length > 18)) return err(`The coefficients of ${label} are too large.`);
  if (degree(p) > maxDeg) return err(`${label.charAt(0).toUpperCase() + label.slice(1)} can have degree at most ${maxDeg}.`);
  if (!allowZero && isZeroPoly(p)) return err(`${label.charAt(0).toUpperCase() + label.slice(1)} cannot be 0.`);
  return { p };
}

/** Long division a ÷ b. Returns { q, r, steps: [{ term, product, remainder }] }. */
export function polyDivide(a, b) {
  b = polyTrim(b);
  let r = polyTrim(a);
  const db = degree(b), lb = lead(b);
  const q = Array.from({ length: Math.max(1, degree(r) - db + 1) }, () => F(0));
  const steps = [];
  while (!isZeroPoly(r) && degree(r) >= db) {
    const k = degree(r) - db;
    const c = lead(r).div(lb);
    q[k] = c;
    const term = Array.from({ length: k + 1 }, (_, i) => (i === k ? c : F(0)));
    const product = polyTrim(polyMul(term, b));
    r = subPoly(r, product);
    steps.push({ term, product, remainder: r });
    if (steps.length > 40) break;
  }
  return { q: polyTrim(q), r: isZeroPoly(r) ? [F(0)] : r, steps };
}

/** Monic greatest common divisor (Euclid over the rationals). */
export function polyGcd(a, b) {
  let x = polyTrim(a), y = polyTrim(b);
  if (isZeroPoly(y)) return monic(x);
  for (let i = 0; i < 40 && !isZeroPoly(y); i++) { const { r } = polyDivide(x, y); x = y; y = r; }
  return monic(x);
}

/**
 * Factor p = lc · Π (x − rᵢ) · rest, with rational roots rᵢ (repeated as often as they occur)
 * and `rest` monic with no rational roots.
 */
export function factorRational(p) {
  p = polyTrim(p);
  const lc = lead(p);
  let rest = monic(p);
  const roots = rationalRoots(rest);
  for (const r of roots) rest = polyTrim(synthDiv(rest, r));
  return { lc, roots, rest };
}

/** Group equal roots: [{ r, m }]. */
export function multiplicities(roots) {
  const out = [];
  for (const r of roots) { const g = out.find((x) => x.r.eq(r)); if (g) g.m++; else out.push({ r, m: 1 }); }
  return out;
}

const pow = (p, k) => { let acc = [F(1)]; for (let i = 0; i < k; i++) acc = polyMul(acc, p); return acc; };
export const linFactor = (r) => [r.neg(), F(1)]; // x − r

/** TeX for (x − r), written x + 3 when r = −3. */
export function linTex(r, v = 'x') {
  if (r.isZero()) return v;
  return `${v} ${r.sign() > 0 ? '-' : '+'} ${r.abs().toTex()}`;
}

/**
 * Partial fractions of N/D over the rationals. Supported denominators: linear factors with
 * rational roots (any multiplicity) and at most one remaining quadratic factor (power 1).
 * Returns { ok, poly, terms: [{ kind: 'lin', r, k, A } | { kind: 'quad', Q, B, C }], lc } or { ok: false, reason }.
 */
export function partialFractions(N, D) {
  N = polyTrim(N); D = polyTrim(D);
  let poly = [F(0)];
  let num = N;
  if (degree(N) >= degree(D)) { const d = polyDivide(N, D); poly = d.q; num = d.r; }
  const { lc, roots, rest } = factorRational(D);
  if (degree(rest) > 2) return { ok: false, reason: `The denominator has a factor of degree ${degree(rest)} with no rational roots (${polyText(rest)}). Only linear factors and one quadratic factor are supported.` };
  const groups = multiplicities(roots);
  const Dm = monic(D);
  const unknowns = []; // basis polynomials: Dm / factor
  for (const g of groups) {
    for (let k = 1; k <= g.m; k++) {
      // Dm / (x − r)^k
      let basis = Dm;
      for (let i = 0; i < k; i++) basis = polyTrim(synthDiv(basis, g.r));
      unknowns.push({ kind: 'lin', r: g.r, k, basis });
    }
  }
  if (degree(rest) === 2) {
    const base = polyDivide(Dm, rest).q;
    unknowns.push({ kind: 'quadB', Q: rest, basis: polyMul([F(0), F(1)], base) });
    unknowns.push({ kind: 'quadC', Q: rest, basis: base });
  }
  const n = degree(D);
  const target = scalePoly(num, lc.inv()); // N / lc so it matches the monic denominator
  const A = Array.from({ length: n }, (_, row) => unknowns.map((u) => u.basis[row] || F(0)));
  const b = Array.from({ length: n }, (_, row) => target[row] || F(0));
  const sol = solveLinear(A, b);
  if (sol.status !== 'unique') return { ok: false, reason: 'The coefficient equations could not be solved uniquely.' };
  const terms = [];
  unknowns.forEach((u, i) => {
    if (u.kind === 'lin') terms.push({ kind: 'lin', r: u.r, k: u.k, A: sol.x[i] });
    else if (u.kind === 'quadB') terms.push({ kind: 'quad', Q: u.Q, B: sol.x[i], C: sol.x[i + 1] });
  });
  return { ok: true, poly, num, terms, lc, groups, rest, system: { A, b, unknowns } };
}

/** TeX of one partial-fraction term. */
export function termTex(t, v = 'x') {
  if (t.kind === 'lin') {
    if (t.A.isZero()) return '0';
    const lin = linTex(t.r, v);
    const fac = t.k === 1 ? (t.A.d === 1n ? lin : `\\left(${lin}\\right)`) : `\\left(${lin}\\right)^{${t.k}}`;
    const n = t.A.abs().n, d = t.A.d;
    return `${t.A.sign() < 0 ? '-' : ''}\\frac{${n}}{${d === 1n ? '' : d}${fac}}`;
  }
  const top = polyTex([t.C, t.B], v);
  return `\\frac{${top}}{${polyTex(t.Q, v)}}`;
}

/** Sum of terms as TeX with proper signs (zero terms dropped). */
export function sumTex(parts) {
  const nz = parts.filter((p) => p && p !== '0');
  if (!nz.length) return '0';
  return nz.map((p, i) => (i === 0 ? p : p.startsWith('-') ? ` - ${p.slice(1)}` : ` + ${p}`)).join('').replace(/\+ \\frac\{-/g, '- \\frac{');
}

/** Evaluate a polynomial (Frac coefficients) at a number. */
export const evalNum = (p, x) => p.reduceRight((s, c) => s * x + c.toNumber(), 0);
export { polyEvalFrac, pow as polyPow };
