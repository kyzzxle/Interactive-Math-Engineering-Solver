/**
 * Small exact-arithmetic toolkit for "nice" symbolic answers such as
 * 2√13, 98π/3 or (34 + 16√5)π. Every operation checks for safe integers and
 * returns null when an exact form cannot be produced reliably — callers then
 * show decimal approximations only.
 */

export function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

const safe = (...xs) => xs.every((x) => Number.isSafeInteger(x));

/** Largest square factor: n = a² · b with b squarefree. Returns [a, b] or null. */
export function simplifySqrt(n) {
  if (!Number.isSafeInteger(n) || n < 0 || n > 1e12) return null;
  if (n === 0) return [0, 1];
  let outside = 1;
  let inside = 1;
  let m = n;
  for (let p = 2; p * p <= m; p += p === 2 ? 1 : 2) {
    if (m % p !== 0) continue;
    let e = 0;
    while (m % p === 0) { m /= p; e++; }
    outside *= p ** Math.floor(e / 2);
    if (e % 2) inside *= p;
  }
  inside *= m;
  return safe(outside, inside) ? [outside, inside] : null;
}

/** Reduce p/q to lowest terms with a positive denominator. Returns [p, q] or null. */
export function reduceFraction(p, q) {
  if (!safe(p, q) || q === 0) return null;
  const g = gcd(p, q) || 1;
  let a = p / g;
  let b = q / g;
  if (b < 0) { a = -a; b = -b; }
  return [a, b];
}

/**
 * A sum of radical terms over an integer denominator:
 *   (c1·√r1 + c2·√r2 + …) / den
 * terms: array of [coefficient, radicand]. Radicands are simplified automatically.
 */
export function radicalExpr(terms, den = 1) {
  if (!safe(den) || den === 0) return null;
  const byRad = new Map();
  for (const [c, r] of terms) {
    if (!safe(c, r) || r < 0) return null;
    if (c === 0) continue;
    const s = simplifySqrt(r);
    if (!s) return null;
    const coef = c * s[0];
    if (!safe(coef)) return null;
    if (s[0] === 0) continue;
    byRad.set(s[1], (byRad.get(s[1]) || 0) + coef);
  }
  let list = [...byRad.entries()].filter(([, c]) => c !== 0).sort((x, y) => x[0] - y[0]).map(([r, c]) => [c, r]);
  let d = den;
  if (d < 0) { d = -d; list = list.map(([c, r]) => [-c, r]); }
  const g = list.reduce((acc, [c]) => gcd(acc, c), d) || 1;
  list = list.map(([c, r]) => [c / g, r]);
  d /= g;
  if (!list.every(([c]) => safe(c)) || !safe(d)) return null;
  return { terms: list, den: d };
}

export function radicalValue(expr) {
  return expr.terms.reduce((sum, [c, r]) => sum + c * Math.sqrt(r), 0) / expr.den;
}

export function isRational(expr) {
  return expr.terms.every(([, r]) => r === 1);
}

function termTex(c, r, first) {
  const sign = c < 0 ? '-' : first ? '' : '+';
  const a = Math.abs(c);
  let body;
  if (r === 1) body = String(a);
  else body = `${a === 1 ? '' : a}\\sqrt{${r}}`;
  return first ? `${sign}${body}` : ` ${sign} ${body}`;
}

/**
 * TeX for an expression, optionally multiplied by a symbolic factor such as \pi.
 * Examples: 98\pi, \frac{98\pi}{3}, 2\sqrt{13}\,\pi, \frac{34 + 16\sqrt{5}}{9}\,\pi
 */
export function radicalTex(expr, factor = '') {
  const { terms, den } = expr;
  if (!terms.length) return '0';
  if (terms.length === 1) {
    const [c, r] = terms[0];
    const neg = c < 0;
    const a = Math.abs(c);
    let num;
    if (r === 1) num = factor ? (a === 1 ? factor : `${a}${factor}`) : String(a);
    else num = `${a === 1 ? '' : a}\\sqrt{${r}}${factor ? `\\,${factor}` : ''}`;
    const body = den === 1 ? num : `\\frac{${num}}{${den}}`;
    return neg ? `-${body}` : body;
  }
  const num = terms.map(([c, r], i) => termTex(c, r, i === 0)).join('');
  if (den === 1) return factor ? `\\left(${num}\\right)${factor}` : num;
  return `\\frac{${num}}{${den}}${factor ? `\\,${factor}` : ''}`;
}

/** Plain-text version for copying, e.g. "(34 + 16√5)π/9". */
export function radicalText(expr, factor = '') {
  const { terms, den } = expr;
  if (!terms.length) return '0';
  const parts = terms.map(([c, r], i) => {
    const sign = c < 0 ? '-' : i === 0 ? '' : '+';
    const a = Math.abs(c);
    const body = r === 1 ? String(a) : `${a === 1 ? '' : a}√${r}`;
    return i === 0 ? `${sign}${body}` : ` ${sign} ${body}`;
  }).join('');
  let num;
  if (terms.length === 1) {
    const [c, r] = terms[0];
    num = factor && r === 1 && Math.abs(c) === 1 ? `${c < 0 ? '-' : ''}${factor}` : `${parts}${factor}`;
  } else {
    num = factor ? `(${parts})${factor}` : (den === 1 ? parts : `(${parts})`);
  }
  return den === 1 ? num : `${num}/${den}`;
}
