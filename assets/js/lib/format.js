/**
 * Number formatting for plain text and TeX.
 * Decimal results are rounded for display; `isDisplayExact` tells whether the
 * rounded text represents the value exactly (within floating-point noise).
 */

const SCI_UPPER = 1e15;
const SCI_LOWER = 1e-6;

/** Round and trim a number for display, e.g. 3.1400000 -> "3.14". */
export function formatNumber(x, { decimals = 6, group = false } = {}) {
  if (!Number.isFinite(x)) throw new RangeError('Cannot format a non-finite number');
  if (x === 0) return '0';
  const ax = Math.abs(x);
  if (ax >= SCI_UPPER || ax < SCI_LOWER) {
    const [m, e] = x.toExponential(decimals).split('e');
    return `${trimZeros(m)} × 10^${Number(e)}`;
  }
  let s = trimZeros(x.toFixed(decimals));
  if (s === '-0') s = '0';
  return group ? groupThousands(s) : s;
}

/** Same as formatNumber but as TeX (scientific notation uses \times 10^{n}). */
export function texNumber(x, opts = {}) {
  if (!Number.isFinite(x)) throw new RangeError('Cannot format a non-finite number');
  if (x === 0) return '0';
  const ax = Math.abs(x);
  const decimals = opts.decimals ?? 6;
  if (ax >= SCI_UPPER || ax < SCI_LOWER) {
    const [m, e] = x.toExponential(decimals).split('e');
    return `${trimZeros(m)} \\times 10^{${Number(e)}}`;
  }
  let s = trimZeros(x.toFixed(decimals));
  if (s === '-0') s = '0';
  return opts.group ? groupThousands(s).replace(/,/g, '{,}') : s;
}

/** Wrap negative numbers in parentheses for substitutions: (-4). */
export function texSigned(x, opts) {
  const t = texNumber(x, opts);
  return x < 0 ? `(${t})` : t;
}

/** True if the rounded display equals the value up to floating-point noise. */
export function isDisplayExact(x, decimals = 6) {
  if (x === 0) return true;
  const ax = Math.abs(x);
  if (ax >= SCI_UPPER || ax < SCI_LOWER) return false;
  const shown = Number(x.toFixed(decimals));
  // Allow only floating-point noise (≈1e-16 relative per operation), not genuine rounding.
  return Math.abs(shown - x) <= 1e-12 * Math.max(1, ax);
}

/** "=" when the display is exact, "\approx" otherwise. Pass irrational = true for values known to be irrational (π multiples). */
export function texRel(x, decimals = 6, irrational = false) {
  return !irrational && isDisplayExact(x, decimals) ? '=' : '\\approx';
}

export function trimZeros(s) {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

export function groupThousands(s) {
  const neg = s.startsWith('-');
  const body = neg ? s.slice(1) : s;
  const [i, f] = body.split('.');
  const grouped = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (neg ? '-' : '') + grouped + (f !== undefined ? '.' + f : '');
}

/** Length / area / volume unit labels for a chosen base unit. */
export function unitLabels(unit) {
  if (!unit) return { length: 'units', area: 'square units', volume: 'cubic units', tex: { length: '', area: '', volume: '' } };
  return {
    length: unit,
    area: `${unit}²`,
    volume: `${unit}³`,
    tex: { length: `\\text{ ${unit}}`, area: `\\text{ ${unit}}^2`, volume: `\\text{ ${unit}}^3` },
  };
}
