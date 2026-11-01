/**
 * Exact rational numbers backed by BigInt. Used wherever an answer should be exact:
 * equation solving, matrices, polynomial factoring, symbolic calculus coefficients.
 */
const babs = (a) => (a < 0n ? -a : a);
export function bgcd(a, b) {
  a = babs(a); b = babs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export class Frac {
  constructor(n, d = 1n) {
    n = BigInt(n); d = BigInt(d);
    if (d === 0n) throw new RangeError('Division by zero');
    if (d < 0n) { n = -n; d = -d; }
    const g = bgcd(n, d) || 1n;
    this.n = n / g;
    this.d = d / g;
  }
  static of(x) {
    if (x instanceof Frac) return x;
    if (typeof x === 'bigint') return new Frac(x);
    if (typeof x === 'number') {
      if (Number.isInteger(x)) return new Frac(BigInt(x));
      const f = parseFrac(String(x));
      if (f) return f;
      throw new RangeError(`Cannot represent ${x} exactly`);
    }
    const f = parseFrac(String(x));
    if (!f) throw new RangeError(`Not a number: ${x}`);
    return f;
  }
  add(o) { o = Frac.of(o); return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { o = Frac.of(o); return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { o = Frac.of(o); return new Frac(this.n * o.n, this.d * o.d); }
  div(o) { o = Frac.of(o); if (o.n === 0n) throw new RangeError('Division by zero'); return new Frac(this.n * o.d, this.d * o.n); }
  neg() { return new Frac(-this.n, this.d); }
  abs() { return new Frac(babs(this.n), this.d); }
  inv() { return new Frac(this.d, this.n); }
  pow(k) {
    k = Number(k);
    if (!Number.isInteger(k)) throw new RangeError('Integer exponents only');
    if (k < 0) return this.inv().pow(-k);
    return new Frac(this.n ** BigInt(k), this.d ** BigInt(k));
  }
  cmp(o) { o = Frac.of(o); const x = this.n * o.d - o.n * this.d; return x > 0n ? 1 : x < 0n ? -1 : 0; }
  eq(o) { return this.cmp(o) === 0; }
  sign() { return this.n > 0n ? 1 : this.n < 0n ? -1 : 0; }
  isZero() { return this.n === 0n; }
  isInt() { return this.d === 1n; }
  isOne() { return this.n === 1n && this.d === 1n; }
  toNumber() {
    const n = Number(this.n), d = Number(this.d);
    if (Number.isFinite(n) && Number.isFinite(d) && Math.abs(n) < 2 ** 53 && d < 2 ** 53) return n / d;
    // very large values: scale before converting
    const shift = BigInt(Math.max(0, this.d.toString().length - 15));
    return Number(this.n / 10n ** shift) / Number(this.d / 10n ** shift);
  }
  toString() { return this.d === 1n ? this.n.toString() : `${this.n}/${this.d}`; }
  /** TeX: integers plain, fractions as \frac (sign in front). */
  toTex() {
    if (this.d === 1n) return this.n.toString();
    return `${this.n < 0n ? '-' : ''}\\frac{${babs(this.n)}}{${this.d}}`;
  }
  /** Decimal string if the fraction terminates within `max` places, otherwise null. */
  toDecimal(max = 12) {
    let d = this.d, twos = 0, fives = 0;
    while (d % 2n === 0n) { d /= 2n; twos++; }
    while (d % 5n === 0n) { d /= 5n; fives++; }
    if (d !== 1n) return null;
    const places = Math.max(twos, fives);
    if (places > max) return null;
    const scaled = (babs(this.n) * 10n ** BigInt(places)) / this.d;
    let s = scaled.toString().padStart(places + 1, '0');
    if (places) s = `${s.slice(0, -places)}.${s.slice(-places)}`;
    return (this.n < 0n ? '-' : '') + s;
  }
}

export const ZERO = new Frac(0n);
export const ONE = new Frac(1n);

/** Parse "3", "-2.75", ".5", "1e-3", "3/4", "-1.5/2" exactly. Returns Frac or null. */
export function parseFrac(raw) {
  const s = String(raw ?? '').trim().replace(/[−–]/g, '-').replace(/\s+/g, '');
  if (!s) return null;
  const parts = s.split('/');
  if (parts.length > 2) return null;
  const nums = parts.map(parseDecimalExact);
  if (nums.some((x) => x === null)) return null;
  if (parts.length === 2) return nums[1].isZero() ? null : nums[0].div(nums[1]);
  return nums[0];
}

function parseDecimalExact(s) {
  const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(s);
  if (!m || (m[2] === '' && (m[3] === undefined || m[3] === ''))) return null;
  const sign = m[1] === '-' ? -1n : 1n;
  const frac = m[3] || '';
  let n = BigInt((m[2] || '0') + frac) * sign;
  let d = 10n ** BigInt(frac.length);
  const e = m[4] ? Number(m[4]) : 0;
  if (Math.abs(e) > 400) return null;
  if (e > 0) n *= 10n ** BigInt(e); else if (e < 0) d *= 10n ** BigInt(-e);
  return new Frac(n, d);
}

/** Exact value as TeX: integer, terminating decimal is shown as a fraction only if requested. */
export function fracTex(f) { return Frac.of(f).toTex(); }

/** "= 3/4 ≈ 0.75" style helpers */
export function fracText(f) { return Frac.of(f).toString(); }

export function lcmBig(a, b) { return (babs(a) / (bgcd(a, b) || 1n)) * babs(b); }
