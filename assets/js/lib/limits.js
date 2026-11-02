/**
 * Numerical one-sided limits with honest classification. The function is sampled at
 * x = a ± 10⁻ᵏ; the estimate is accepted only when successive values agree, otherwise the
 * limit is reported as infinite or as not existing (oscillation). Close matches to simple
 * fractions are reported as "appears to equal", never as proven.
 */
import { rationalApprox } from './trig.js';

const H = [1e-1, 1e-2, 1e-3, 1e-4, 1e-5, 1e-6];

/**
 * Growing without bound: same sign, increasing size, and either fast growth (like 1/x) or
 * steps that do not shrink (like ln x, which grows by a constant amount per factor of 10).
 */
function diverges([a, b, c]) {
  if (![a, b, c].every(Number.isFinite) || Math.sign(a) !== Math.sign(c) || Math.sign(b) !== Math.sign(c) || !c) return false;
  if (!(Math.abs(c) > Math.abs(b) && Math.abs(b) > Math.abs(a))) return false;
  const fast = Math.abs(c) > 1e4 && Math.abs(c) > 3 * Math.abs(b);
  const steady = Math.abs(c) > 8 && Math.abs(c - b) >= 0.5 * Math.abs(b - a) && Math.abs(b - a) > 1e-3;
  return fast || steady;
}

/** side: −1 (from the left) or +1 (from the right). */
export function oneSided(f, a, side) {
  const rows = H.map((h) => { const x = a + side * h; let y; try { y = f(x); } catch { y = NaN; } return { x, y }; });
  const ys = rows.map((r) => r.y);
  const finite = ys.filter(Number.isFinite);
  if (finite.length < 4) {
    const big = ys.filter((y) => y === Infinity || y === -Infinity);
    if (big.length >= 3) return { kind: 'inf', sign: Math.sign(big[big.length - 1]), rows };
    return { kind: 'undefined', rows };
  }
  if (diverges(ys.slice(-3))) return { kind: 'inf', sign: Math.sign(ys[ys.length - 1]), rows };
  const [y3, y4, y5] = [ys[2], ys[3], ys[4]];
  if (![y3, y4, y5].every(Number.isFinite)) return { kind: 'none', rows };
  const tol = 1e-4 * (1 + Math.abs(y4));
  if (Math.abs(y4 - y5) < tol && Math.abs(y3 - y4) < 20 * tol) {
    let L = y5;
    if (Math.abs(L) < 2e-5 && Math.abs(y5) <= Math.abs(y3)) L = 0; // values shrinking towards 0
    return { kind: 'finite', L, rows, guess: guess(L) };
  }
  return { kind: 'none', rows };
}

/** Limit as x → +∞ (side = 1) or −∞ (side = −1). */
export function atInfinity(f, side) {
  const xs = [1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8].map((x) => side * x);
  const rows = xs.map((x) => { let y; try { y = f(x); } catch { y = NaN; } return { x, y }; });
  const ys = rows.map((r) => r.y);
  const last = ys.slice(-3);
  if (diverges(last)) return { kind: 'inf', sign: Math.sign(last[2]), rows };
  if (last.some((y) => y === Infinity || y === -Infinity)) return { kind: 'inf', sign: Math.sign(last[2]), rows };
  if (!last.every(Number.isFinite)) return { kind: 'none', rows };
  const tol = 1e-4 * (1 + Math.abs(last[2]));
  if (Math.abs(last[1] - last[2]) < tol) { let L = last[2]; if (Math.abs(L) < 1e-7) L = 0; return { kind: 'finite', L, rows, guess: guess(L) }; }
  return { kind: 'none', rows };
}

/** A simple fraction p/q (q ≤ 100) within 10⁻⁶ of L, or null. */
function guess(L) {
  if (Math.abs(L - Math.round(L)) < 1e-6) return { p: Math.round(L), q: 1 };
  const f = rationalApprox(L, 100);
  if (f && Math.abs(f.toNumber() - L) < 1e-6) return { p: Number(f.n), q: Number(f.d) };
  return null;
}

export const guessTex = (g) => (g.q === 1 ? String(g.p) : `${g.p < 0 ? '-' : ''}\\frac{${Math.abs(g.p)}}{${g.q}}`);

/** Combine two one-sided results into a two-sided verdict. */
export function twoSided(left, right) {
  if (left.kind === 'finite' && right.kind === 'finite') {
    const agree = Math.abs(left.L - right.L) < 1e-4 * (1 + Math.abs(left.L));
    return agree ? { kind: 'finite', L: (left.L + right.L) / 2, guess: left.guess } : { kind: 'jump' };
  }
  if (left.kind === 'inf' && right.kind === 'inf') return left.sign === right.sign ? { kind: 'inf', sign: left.sign } : { kind: 'inf-split' };
  if (left.kind === 'inf' || right.kind === 'inf') return { kind: 'inf-split' };
  return { kind: 'none' };
}
