/**
 * Factoring polynomials in x with rational coefficients, degree 2 to 6, over the integers/rationals.
 *   1. Greatest common factor (numbers and powers of x)
 *   2. Rational root theorem → linear factors (qx − p), found and divided out exactly
 *   3. Remaining factor of degree ≥ 4: quadratic or cubic integer factors, found by grouping its
 *      numerically computed complex roots and confirmed by exact polynomial division
 * Anything left is irreducible over the rationals (checked, not assumed, for degree ≤ 6).
 */
import { validator } from '../lib/calc-kit.js';
import { parse, toPoly, polyToNode, polyMul, texOf, textOf, ExprError } from '../lib/expr.js';
import { Frac, bgcd, lcmBig } from '../lib/fraction.js';
import { rationalRoots, synthDiv } from '../lib/numeric.js';
import { factoringExplore, factoringPractice } from '../explore/algebra-practice.js';
import { withNotes } from '../lib/step-notes.js';

const Z = () => new Frac(0n);

/** Exact polynomial division (coefficients low → high). Returns { q, r } with Frac coefficients. */
function polyDiv(num, den) {
  const n = num.slice(), d = den;
  const q = Array.from({ length: Math.max(n.length - d.length + 1, 1) }, Z);
  for (let i = n.length - d.length; i >= 0; i--) {
    const coef = n[i + d.length - 1].div(d[d.length - 1]);
    q[i] = coef;
    for (let j = 0; j < d.length; j++) n[i + j] = n[i + j].sub(coef.mul(d[j]));
  }
  const r = n.slice(0, d.length - 1);
  return { q, r };
}
const isZeroPoly = (p) => p.every((c) => c.isZero());

/** All complex roots by the Durand–Kerner iteration (degree ≤ 6). Roots as [re, im]. */
function complexRoots(p) {
  const deg = p.length - 1;
  const lead = p[deg].toNumber();
  const c = p.map((x) => x.toNumber() / lead);
  const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const div = (a, b) => { const den = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / den, (a[1] * b[0] - a[0] * b[1]) / den]; };
  const evalP = (z) => { let s = [1, 0]; for (let i = deg - 1; i >= 0; i--) { s = mul(s, z); s = [s[0] + c[i], s[1]]; } return s; };
  let roots = Array.from({ length: deg }, (_, k) => { let z = [1, 0]; for (let i = 0; i < k; i++) z = mul(z, [0.4, 0.9]); return z; });
  for (let it = 0; it < 2000; it++) {
    let change = 0;
    roots = roots.map((z, i) => {
      let den = [1, 0];
      roots.forEach((w, j) => { if (j !== i) den = mul(den, [z[0] - w[0], z[1] - w[1]]); });
      const dz = div(evalP(z), den);
      change = Math.max(change, Math.hypot(dz[0], dz[1]));
      return [z[0] - dz[0], z[1] - dz[1]];
    });
    if (change < 1e-14) break;
  }
  return roots;
}

/** Try to split an integer polynomial into integer factors of degree 2 or 3 (exactly verified). */
function splitHigher(p) {
  const deg = p.length - 1;
  if (deg < 4) return null;
  const roots = complexRoots(p);
  const lead = p[deg];
  const subsets = [];
  for (let i = 0; i < deg; i++) for (let j = i + 1; j < deg; j++) {
    subsets.push([i, j]);
    for (let k = j + 1; k < deg; k++) subsets.push([i, j, k]);
  }
  for (const s of subsets) {
    if (deg - s.length < 2) continue;
    // monic factor from these roots
    let f = [[1, 0]];
    for (const idx of s) {
      const r = roots[idx];
      const next = Array.from({ length: f.length + 1 }, () => [0, 0]);
      f.forEach((c, k) => { next[k + 1][0] += c[0]; next[k + 1][1] += c[1]; next[k][0] -= c[0] * r[0] - c[1] * r[1]; next[k][1] -= c[0] * r[1] + c[1] * r[0]; });
      f = next;
    }
    if (f.some((c) => Math.abs(c[1]) > 1e-6)) continue;
    // scale by divisors of the leading coefficient to reach integer coefficients
    const L = Number(lead.n < 0n ? -lead.n : lead.n);
    for (let a = 1; a <= L; a++) {
      if (L % a) continue;
      const cand = f.map((c) => c[0] * a);
      if (cand.some((v) => Math.abs(v - Math.round(v)) > 1e-6)) continue;
      const fac = cand.map((v) => new Frac(BigInt(Math.round(v))));
      const { q, r } = polyDiv(p, fac);
      if (isZeroPoly(r) && q.every((x) => x.isInt())) return [fac, q];
    }
  }
  return null;
}

function linTex(q, p) {
  // factor (qx − p) written nicely
  const qs = q === 1n ? '' : q.toString();
  if (p === 0n) return `${qs}x`;
  return `${qs}x ${p > 0n ? '-' : '+'} ${p < 0n ? -p : p}`;
}

export const calculator = {
  id: 'polynomial-factoring',
  explore: factoringExplore,
  practice: factoringPractice,
  fields: [
    { name: 'poly', label: 'Polynomial in x', type: 'text', placeholder: 'e.g. x^3 - 6x^2 + 11x - 6', hint: 'Degree 2 to 6 with rational coefficients. Use ^ for powers, e.g. 2x^4 - 32.' },
  ],
  examples: [
    { label: 'x³ − 6x² + 11x − 6', values: { poly: 'x^3 - 6x^2 + 11x - 6' } },
    { label: 'Difference of squares: 4x² − 25', values: { poly: '4x^2 - 25' } },
    { label: 'GCF first: 2x⁴ − 32', values: { poly: '2x^4 - 32' } },
    { label: 'Two quadratics: x⁴ + 4', values: { poly: 'x^4 + 4' } },
    { label: 'Sum of cubes: x³ + 27', values: { poly: 'x^3 + 27' } },
  ],
  solve(values) {
    const v = validator(values);
    const src = v.text('poly', 'a polynomial');
    if (!v.ok()) return v.result();
    if (src.includes('=')) return { ok: false, errors: [{ field: 'poly', message: 'Enter an expression, not an equation (remove "=").' }] };
    let node;
    try { node = parse(src); } catch (e) { if (e instanceof ExprError) return { ok: false, errors: [{ field: 'poly', message: e.message }] }; throw e; }
    const poly = toPoly(node);
    if (!poly) return { ok: false, errors: [{ field: 'poly', message: 'This is not a polynomial in x: only +, −, ×, whole-number powers and numbers are allowed (no x in denominators, roots or functions).' }] };
    const deg = poly.length - 1;
    if (deg < 2) return { ok: false, errors: [{ field: 'poly', message: deg <= 0 ? 'A constant has nothing to factor. Enter a polynomial in x.' : 'A linear polynomial is already fully factored.' }] };
    if (deg > 6) return { ok: false, errors: [{ field: 'poly', message: 'This tool supports degree 2 to 6. Your polynomial has degree ' + deg + '.' }] };
    if (poly.some((c) => c.n.toString().length > 15 || c.d.toString().length > 15)) return { ok: false, errors: [{ field: 'poly', message: 'Coefficients are too large for exact factoring here.' }] };

    const steps = [{ title: 'Write the polynomial in standard form', tex: texOf(polyToNode(poly)) }];
    // 1. integer content and power of x
    let L = 1n;
    for (const c of poly) L = lcmBig(L, c.d);
    let ints = poly.map((c) => (c.n * L) / c.d);
    let g = ints.reduce((a, b) => bgcd(a, b), 0n);
    if (ints[ints.length - 1] < 0n) g = -g;
    ints = ints.map((x) => x / g);
    const K = new Frac(g, L);
    let k = 0;
    while (ints[k] === 0n) k++;
    let rest = ints.slice(k).map((x) => new Frac(x));
    const gcfParts = [];
    if (!K.isOne()) gcfParts.push(K.toTex());
    if (k) gcfParts.push(k === 1 ? 'x' : `x^{${k}}`);
    if (gcfParts.length) {
      steps.push({ title: 'Factor out the greatest common factor', text: `Every term shares the factor ${K.isOne() ? '' : K.toString()}${k ? (k === 1 ? 'x' : `x^${k}`) : ''}.`, tex: `${gcfParts.join('')}\\left(${texOf(polyToNode(rest))}\\right)` });
    } else steps.push({ title: 'Greatest common factor', text: 'The coefficients have no common factor other than 1, and there is a constant term, so no x can be factored out.' });

    // 2. rational roots
    const linear = [];
    const roots = rest.length > 2 || rest.length === 2 ? rationalRoots(rest) : [];
    if (rest.length > 1) {
      const a0 = rest[0].n < 0n ? -rest[0].n : rest[0].n, an = rest[rest.length - 1].n;
      steps.push({ title: 'Rational root theorem', text: `Any rational root p/q has p dividing the constant term ${a0} and q dividing the leading coefficient ${an}. Testing these candidates by substitution:`, tex: roots.length ? `\\text{roots found: } ${roots.map((r) => r.toTex()).join(',\\ ')}` : '\\text{no rational roots}' });
    }
    let divisor = 1n;
    for (const r of roots) {
      rest = synthDiv(rest, r);
      linear.push(r);
      divisor *= r.d;
    }
    rest = rest.map((c) => c.div(divisor));
    if (roots.length) steps.push({ title: 'Divide out each root (synthetic division)', text: 'Each rational root p/q gives a factor (qx − p). Dividing it out leaves a smaller polynomial.', tex: `${linear.map((r) => `\\left(${linTex(r.d, r.n)}\\right)`).join('')}${rest.length > 1 ? `\\left(${texOf(polyToNode(rest))}\\right)` : rest[0].isOne() ? '' : rest[0].toTex()}` });

    // 3. higher-degree remainder
    const others = [];
    const queue = [rest];
    while (queue.length) {
      const p = queue.pop();
      if (p.length <= 1) { if (!p[0].isOne()) others.push(p); continue; }
      const split = splitHigher(p);
      if (split) { queue.push(split[0], split[1]); continue; }
      others.push(p);
    }
    if (others.some((p) => p.length > 3) || others.filter((p) => p.length === 3).length > 1) {
      steps.push({ title: 'Look for quadratic or cubic factors', text: 'The remaining polynomial has no rational roots, so any further factor must have degree 2 or 3. These were searched for and confirmed by exact division.' });
    }
    const irreducibleNotes = [];
    for (const p of others) {
      if (p.length === 3) {
        const D = p[1].pow(2).sub(p[2].mul(p[0]).mul(4));
        irreducibleNotes.push(`${textOf(polyToNode(p))} does not factor over the rationals (discriminant ${D} ${D.sign() < 0 ? '< 0: its roots are complex' : 'is not a perfect square: its roots are irrational'}).`);
      } else if (p.length > 3) irreducibleNotes.push(`${textOf(polyToNode(p))} has no rational roots and no integer factors of lower degree, so it is irreducible over the rationals.`);
    }

    // assemble the factored form (group repeated linear factors)
    const counts = new Map();
    for (const r of linear) { const key = r.toString(); counts.set(key, { r, m: (counts.get(key)?.m || 0) + 1 }); }
    const parts = [];
    if (!K.isOne()) parts.push(K.eq(-1) ? '-' : K.toTex());
    if (k) parts.push(k === 1 ? 'x' : `x^{${k}}`);
    for (const { r, m } of counts.values()) parts.push(`\\left(${linTex(r.d, r.n)}\\right)${m > 1 ? `^{${m}}` : ''}`);
    for (const p of others) if (p.length > 1) parts.push(`\\left(${texOf(polyToNode(p))}\\right)`);
    // A single irreducible factor needs no brackets.
    const factored = parts.length === 1 && others.length === 1 ? texOf(polyToNode(others[0])) : parts.join('') || '1';
    // exact check: multiply everything back
    let prod = [K];
    for (let i = 0; i < k; i++) prod = polyMul(prod, [Z(), new Frac(1n)]);
    for (const r of linear) prod = polyMul(prod, [new Frac(-r.n), new Frac(r.d)]);
    for (const p of others) prod = polyMul(prod, p);
    const matches = prod.length === poly.length && prod.every((c, i) => c.eq(poly[i]));
    steps.push({ title: 'Check by multiplying the factors back out', text: matches ? 'Expanding the factored form gives the original polynomial exactly.' : 'The expansion did not match — please report this input.', tex: `${factored} = ${texOf(polyToNode(poly))}` });
    if (!matches) return { ok: false, errors: [{ field: 'poly', message: 'Internal check failed for this polynomial; no result is shown rather than a wrong one.' }] };

    const notes = [];
    const terms = poly.filter((c) => !c.isZero()).length;
    if (terms === 2 && deg === 2 && poly[1].isZero() && poly[0].sign() !== poly[2].sign() && linear.length === 2) notes.push({ kind: 'info', text: 'Pattern: difference of two squares, a² − b² = (a − b)(a + b).' });
    if (terms === 2 && deg === 3 && poly[1].isZero() && poly[2].isZero()) notes.push({ kind: 'info', text: 'Pattern: sum or difference of cubes, a³ ± b³ = (a ± b)(a² ∓ ab + b²).' });
    if (deg === 2 && counts.size === 1 && linear.length === 2) notes.push({ kind: 'info', text: 'Pattern: perfect square trinomial, a² ± 2ab + b² = (a ± b)².' });
    irreducibleNotes.forEach((t) => notes.push({ kind: 'info', text: t }));
    return {
      ok: true,
      final: { tex: `${texOf(polyToNode(poly))} = ${factored}` },
      answers: [
        { label: 'Factored form', valueTex: factored, primary: true, copy: factored.replace(/\\left|\\right/g, '').replace(/\^\{(\d+)\}/g, '^$1').replace(/\\frac\{(-?\d+)\}\{(\d+)\}/g, '($1/$2)') },
        { label: 'Rational roots', value: (() => {
          // every rational root in increasing order, including 0 when x^k was factored out
          const all = [...counts.values()].map(({ r, m }) => ({ r, m, x: Number(r.toNumber ? r.toNumber() : r) }));
          if (k) all.push({ r: '0', m: k, x: 0 });
          all.sort((p, q) => p.x - q.x);
          return all.length ? all.map(({ r, m }) => `${r}${m > 1 ? ` (multiplicity ${m})` : ''}`).join(', ') : 'none';
        })() },
        { label: 'Degree', value: String(deg) },
      ],
      notes, steps,
      formula: ['\\text{If } \\tfrac{p}{q} \\text{ is a root, then } (qx - p) \\text{ is a factor}'],
      rounding: 'All factoring is exact; no decimals are used in the final answer.',
    };
  },
};

// Explanations for each step.
withNotes(calculator, {
  'Write the polynomial in standard form': 'Order the terms from the highest power down, so the leading coefficient and the constant term are easy to read.',
  'Factor out the greatest common factor': 'Always take out common factors first: what is left is smaller and easier to factor.',
  'Greatest common factor': 'Always look for a common factor first.',
  'Rational root theorem': 'This limits the search for roots to a short list of candidates, each tested by substitution.',
  'Divide out each root': 'Dividing by (x − r) lowers the degree by one, so the next factor is easier to find.',
  'Look for quadratic or cubic factors': 'With no rational roots left, the polynomial may still split into higher-degree factors, or it may be irreducible over the rationals.',
  'Check by multiplying': 'Multiplying the factors back together must give the original polynomial.',
});
