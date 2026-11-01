/**
 * Exact integer helpers for counting problems (BigInt) plus a log-factorial
 * approximation for results too large to compute exactly in a browser.
 */

/**
 * Product of all integers lo..hi (inclusive) by binary splitting. Multiplying
 * numbers of similar size lets the engine use fast multiplication, which is far
 * quicker than multiplying one growing number by small factors.
 */
export function productRange(lo, hi) {
  if (lo > hi) return 1n;
  if (hi - lo < 16) {
    let p = BigInt(lo);
    for (let i = lo + 1; i <= hi; i++) p *= BigInt(i);
    return p;
  }
  const mid = Math.floor((lo + hi) / 2);
  return productRange(lo, mid) * productRange(mid + 1, hi);
}

/** n · (n-1) · … · (n-r+1)  — the falling factorial, equal to P(n, r). */
export function fallingFactorial(n, r) {
  if (r === 0) return 1n;
  return productRange(n - r + 1, n);
}

export function factorial(n) {
  return productRange(1, n);
}

/** C(n, r) = [n · (n-1) · … · (n-k+1)] / k!  with k = min(r, n - r). The division is exact. */
export function binomial(n, r) {
  if (r < 0 || r > n) return 0n;
  const k = Math.min(r, n - r);
  if (k === 0) return 1n;
  return productRange(n - k + 1, n) / productRange(1, k);
}

/** log10(n!) — exact summation for small n, Stirling series with correction terms otherwise. */
export function log10Factorial(n) {
  if (n < 0) return NaN;
  if (n < 50) {
    let s = 0;
    for (let i = 2; i <= n; i++) s += Math.log10(i);
    return s;
  }
  const x = n + 1; // ln Γ(x) with x = n + 1
  const lnGamma = (x - 0.5) * Math.log(x) - x + 0.5 * Math.log(2 * Math.PI)
    + 1 / (12 * x) - 1 / (360 * x ** 3) + 1 / (1260 * x ** 5) - 1 / (1680 * x ** 7);
  return lnGamma / Math.LN10;
}

/** Number of decimal digits of a nonnegative BigInt. */
export function digitCount(big) {
  return big.toString().length;
}

/**
 * Scientific notation from a base-10 logarithm: returns { mantissa, exponent }.
 * The number of significant digits is reduced automatically when the exponent is so
 * large that double precision cannot support more.
 */
export function scientificFromLog10(log10Value, wantDigits = 6) {
  const exponent = Math.floor(log10Value);
  const usable = Math.max(3, Math.min(wantDigits, 14 - String(Math.abs(exponent)).length));
  const mantissa = 10 ** (log10Value - exponent);
  let m = mantissa.toFixed(usable - 1);
  let e = exponent;
  if (Number(m) >= 10) { m = (Number(m) / 10).toFixed(usable - 1); e += 1; }
  return { mantissa: m, exponent: e, digits: usable };
}

/** Scientific notation of an exact BigInt (rounded half-up). */
export function scientificFromBigInt(big, sig = 6) {
  const s = big.toString();
  if (s.length <= sig) {
    const m = s.length > 1 ? `${s[0]}.${s.slice(1)}`.replace(/\.?0+$/, '') : s;
    return { mantissa: m, exponent: s.length - 1 };
  }
  let head = BigInt(s.slice(0, sig));
  if (Number(s[sig]) >= 5) head += 1n;
  let hs = head.toString();
  let exponent = s.length - 1;
  if (hs.length > sig) { hs = hs.slice(0, sig); exponent += 1; }
  return { mantissa: `${hs[0]}.${hs.slice(1)}`.replace(/\.?0+$/, ''), exponent };
}

/** Group digits with commas: 1234567 -> "1,234,567". */
export function groupDigits(s) {
  // Linear-time grouping (a look-ahead regex is quadratic on 100,000-digit strings).
  const neg = s.startsWith('-');
  const digits = neg ? s.slice(1) : s;
  const head = digits.length % 3 || 3;
  const parts = [digits.slice(0, head)];
  for (let i = head; i < digits.length; i += 3) parts.push(digits.slice(i, i + 3));
  return (neg ? '-' : '') + parts.join(',');
}
