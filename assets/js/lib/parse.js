/**
 * Strict input parsing shared by all calculators.
 * Returns plain objects so results are easy to test and to show as messages.
 */

const DECIMAL_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const WHOLE_RE = /^\+?\d+$/;

/** Normalise what people commonly type: spaces, Unicode minus signs, a leading "+". */
function clean(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/[−‒–—]/g, '-') // − ‒ – —  → -
    .replace(/\s+/g, '');
}

/**
 * Parse a real number written in decimal or scientific notation.
 * @returns {{ok: true, value: number, text: string} | {ok: false, error: string}}
 */
export function parseDecimal(raw, label) {
  const text = clean(raw);
  if (text === '') return { ok: false, error: `Enter a value for ${label}.` };
  if (/,/.test(text)) return { ok: false, error: `Remove the comma from ${label}. Use a dot for decimals (for example 2.5).` };
  if (!DECIMAL_RE.test(text)) return { ok: false, error: `${capitalise(label)} must be a number, for example 4 or 2.75.` };
  const value = Number(text);
  if (!Number.isFinite(value)) return { ok: false, error: `${capitalise(label)} is too large to handle.` };
  return { ok: true, value: Object.is(value, -0) ? 0 : value, text };
}

/**
 * Parse a nonnegative whole number (used for counting problems).
 * @returns {{ok: true, value: number} | {ok: false, error: string}}
 */
export function parseWhole(raw, label, max = Number.MAX_SAFE_INTEGER) {
  const text = clean(raw);
  if (text === '') return { ok: false, error: `Enter a value for ${label}.` };
  if (/^-/.test(text) && DECIMAL_RE.test(text)) return { ok: false, error: `${capitalise(label)} cannot be negative — you cannot choose a negative number of items.` };
  if (!WHOLE_RE.test(text)) {
    if (DECIMAL_RE.test(text)) return { ok: false, error: `${capitalise(label)} must be a whole number (0, 1, 2, …). Fractions of an item cannot be counted.` };
    return { ok: false, error: `${capitalise(label)} must be a whole number such as 5 or 12.` };
  }
  const value = Number(text.replace(/^\+/, ''));
  if (!Number.isSafeInteger(value) || value > max) {
    return { ok: false, error: `${capitalise(label)} must be at most ${max.toLocaleString('en-US')}.` };
  }
  return { ok: true, value };
}

/**
 * Express several decimal strings as integers over a common power of ten,
 * so exact (symbolic) answers can be produced. Returns null when that is not
 * possible safely (scientific notation, too many decimals, very large values).
 * Example: ["1.5", "2", "0.25"] -> { ints: [150, 200, 25], scale: 100 }
 */
export function toCommonScale(texts, { maxDecimals = 4, maxInt = 1e7 } = {}) {
  const parts = [];
  for (const raw of texts) {
    const t = clean(raw).replace(/^\+/, '');
    if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(t)) return null;
    const neg = t.startsWith('-');
    const body = neg ? t.slice(1) : t;
    const [intPart, fracPart = ''] = body.split('.');
    const frac = fracPart.replace(/0+$/, '');
    if (frac.length > maxDecimals) return null;
    parts.push({ neg, digits: (intPart || '0') + frac, decimals: frac.length });
  }
  const k = Math.max(0, ...parts.map((p) => p.decimals));
  const scale = 10 ** k;
  const ints = [];
  for (const p of parts) {
    const v = Number(p.digits) * 10 ** (k - p.decimals);
    if (!Number.isSafeInteger(v) || v > maxInt) return null;
    ints.push(p.neg && v !== 0 ? -v : v);
  }
  return { ints, scale };
}

/** Capitalise "the top radius" -> "The top radius", but keep variable names such as "n (…)" as typed. */
function capitalise(s) {
  return /^[a-z]{2,}/.test(s) ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
