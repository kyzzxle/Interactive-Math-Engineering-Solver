/** Trigonometry helpers: exact values at multiples of 15°, π-fractions and angle parsing. */
import { Frac } from './fraction.js';
import { parse, evaluate, hasVar, ExprError } from './expr.js';

/** Best rational approximation p/q of x with q ≤ maxDen (continued fractions). */
export function rationalApprox(x, maxDen = 360) {
  if (!Number.isFinite(x)) return null;
  let h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = x;
  for (let i = 0; i < 40; i++) {
    const a = Math.floor(b);
    const h2 = a * h1 + h0, k2 = a * k1 + k0;
    if (k2 > maxDen) break;
    h0 = h1; h1 = h2; k0 = k1; k1 = k2;
    if (Math.abs(b - a) < 1e-15) break;
    b = 1 / (b - a);
  }
  return k1 ? new Frac(BigInt(h1), BigInt(k1)) : null;
}

/** x/π as an exact fraction when x is a rational multiple of π (denominator ≤ 360), else null. */
export function piMultiple(x) {
  const f = rationalApprox(x / Math.PI, 360);
  return f && Math.abs(f.toNumber() * Math.PI - x) < 1e-10 * Math.max(1, Math.abs(x)) ? f : null;
}

export function piFracTex(f) {
  if (f.isZero()) return '0';
  const s = f.sign() < 0 ? '-' : '';
  const a = f.abs();
  const top = `${a.n === 1n ? '' : a.n}\\pi`;
  return a.d === 1n ? `${s}${top}` : `${s}\\frac{${top}}{${a.d}}`;
}
export function piFracText(f) {
  if (f.isZero()) return '0';
  const a = f.abs();
  return `${f.sign() < 0 ? '−' : ''}${a.n === 1n ? '' : a.n}π${a.d === 1n ? '' : `/${a.d}`}`;
}

// exact sin and cos of the reference angles 0°, 15°, …, 90° as [tex, text]
const SIN = {
  0: ['0', '0'], 15: ['\\frac{\\sqrt{6} - \\sqrt{2}}{4}', '(√6 − √2)/4'], 30: ['\\frac{1}{2}', '1/2'], 45: ['\\frac{\\sqrt{2}}{2}', '√2/2'],
  60: ['\\frac{\\sqrt{3}}{2}', '√3/2'], 75: ['\\frac{\\sqrt{6} + \\sqrt{2}}{4}', '(√6 + √2)/4'], 90: ['1', '1'],
};
const TAN = { 0: ['0', '0'], 15: ['2 - \\sqrt{3}', '2 − √3'], 30: ['\\frac{\\sqrt{3}}{3}', '√3/3'], 45: ['1', '1'], 60: ['\\sqrt{3}', '√3'], 75: ['2 + \\sqrt{3}', '2 + √3'], 90: null };

/**
 * Exact sin, cos, tan for an angle that is a multiple of 15°, given in degrees (any size).
 * Returns null if the angle is not a multiple of 15°.
 */
export function exactTrig(deg) {
  const r = Math.round(deg);
  if (Math.abs(deg - r) > 1e-9 || r % 15 !== 0) return null;
  const t = ((r % 360) + 360) % 360;
  const quadrant = t === 0 || t === 90 || t === 180 || t === 270 ? 0 : Math.floor(t / 90) + 1;
  const ref = t <= 90 ? t : t <= 180 ? 180 - t : t <= 270 ? t - 180 : 360 - t;
  const sSign = t > 180 && t < 360 ? -1 : 1;
  const cSign = t > 90 && t < 270 ? -1 : 1;
  const sign = (pair, s) => (pair[0] === '0' || s > 0 ? pair : [`-${pair[0]}`, `−${pair[1]}`]);
  const sin = sign(SIN[ref], sSign);
  const cos = sign(SIN[90 - ref], cSign);
  const tanPair = TAN[ref];
  const tan = tanPair ? sign(tanPair, sSign * cSign) : null;
  return { sin, cos, tan, ref, quadrant, t };
}

/** Parse an angle/number expression such as "2pi/3", "sqrt(3)/2" or "45". */
export function parseValue(raw, label) {
  const s = String(raw ?? '').trim();
  if (!s) return { error: `Please enter a value for ${label}.` };
  try {
    const node = parse(s);
    if (hasVar(node)) return { error: `${label.charAt(0).toUpperCase() + label.slice(1)} must be a number or a constant expression such as pi/4 (no x).` };
    const v = evaluate(node);
    if (!Number.isFinite(v)) return { error: `${label.charAt(0).toUpperCase() + label.slice(1)} is not a finite real number.` };
    return { value: v, node };
  } catch (e) {
    if (e instanceof ExprError) return { error: `${label}: ${e.message}` };
    throw e;
  }
}
