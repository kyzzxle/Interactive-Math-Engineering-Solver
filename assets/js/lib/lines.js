/** Helpers for writing exact linear equations: general form, slope–intercept, point–slope. */
import { Frac, bgcd, lcmBig } from './fraction.js';

/** Scale A, B, C (Frac) to coprime integers with A > 0 (or B > 0 when A = 0). Returns Frac triple. */
export function integerLine(A, B, C) {
  let l = 1n;
  for (const f of [A, B, C]) l = lcmBig(l, f.d);
  let ints = [A, B, C].map((f) => (f.n * l) / f.d);
  const g = ints.reduce((acc, x) => bgcd(acc, x), 0n) || 1n;
  ints = ints.map((x) => x / g);
  const lead = ints[0] !== 0n ? ints[0] : ints[1];
  if (lead < 0n) ints = ints.map((x) => -x);
  return ints.map((x) => new Frac(x));
}

/** TeX of a sum of terms [[coef: Frac, symbol: string], …], dropping zeros, e.g. "2x - y + 3". */
export function linearTex(terms) {
  let out = '';
  for (const [c, s] of terms) {
    if (c.isZero()) continue;
    const neg = c.sign() < 0;
    const a = c.abs();
    const body = s ? `${a.isOne() ? '' : a.toTex()}${s}` : a.toTex();
    if (!out) out = (neg ? '-' : '') + body;
    else out += neg ? ` - ${body}` : ` + ${body}`;
  }
  return out || '0';
}
export function linearText(terms) {
  let out = '';
  for (const [c, s] of terms) {
    if (c.isZero()) continue;
    const neg = c.sign() < 0;
    const a = c.abs();
    const body = s ? `${a.isOne() ? '' : a.toString()}${s}` : a.toString();
    if (!out) out = (neg ? '-' : '') + body;
    else out += neg ? ` − ${body}` : ` + ${body}`;
  }
  return out || '0';
}

export const generalTex = (A, B, C) => `${linearTex([[A, 'x'], [B, 'y'], [C, '']])} = 0`;
export const generalText = (A, B, C) => `${linearText([[A, 'x'], [B, 'y'], [C, '']])} = 0`;
export const slopeInterceptTex = (m, b) => `y = ${linearTex([[m, 'x'], [b, '']])}`;
export const slopeInterceptText = (m, b) => `y = ${linearText([[m, 'x'], [b, '']])}`;

/** y − y₁ = m(x − x₁) with signs simplified. */
export function pointSlopeTex(m, x1, y1) {
  const yPart = y1.isZero() ? 'y' : `y ${y1.sign() < 0 ? '+' : '-'} ${y1.abs().toTex()}`;
  const xPart = x1.isZero() ? 'x' : `x ${x1.sign() < 0 ? '+' : '-'} ${x1.abs().toTex()}`;
  const mTex = m.isOne() ? '' : m.eq(-1) ? '-' : m.toTex();
  return `${yPart} = ${mTex}${x1.isZero() ? xPart : `\\left(${xPart}\\right)`}`;
}
