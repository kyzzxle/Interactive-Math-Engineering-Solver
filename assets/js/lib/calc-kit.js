/**
 * Shared helpers for calculator modules: input validation that collects every error at once,
 * consistent number formatting, and answer-card builders.
 */
import { parseDecimal, parseWhole } from './parse.js';
import { formatNumber, texNumber, isDisplayExact, unitLabels } from './format.js';
import { parseFrac } from './fraction.js';

/** Collects validation errors; read values with number()/whole()/frac(), then check ok(). */
export function validator(values) {
  const errors = [];
  const fail = (field, message) => { errors.push({ field, message }); return undefined; };
  return {
    errors,
    fail,
    ok: () => errors.length === 0,
    result: () => ({ ok: false, errors }),
    /**
     * opts: { positive, nonneg, nonzero, min, max, integer, maxAbs }
     */
    number(name, label, opts = {}) {
      const p = parseDecimal(values[name], label);
      if (!p.ok) return fail(name, p.error);
      const v = p.value;
      const maxAbs = opts.maxAbs ?? 1e12;
      if (Math.abs(v) > maxAbs) return fail(name, `Please keep ${label} between −${maxAbs.toExponential(0)} and ${maxAbs.toExponential(0)} so the result stays accurate.`);
      if (opts.positive && !(v > 0)) return fail(name, `${cap(label)} must be greater than 0.`);
      if (opts.nonneg && v < 0) return fail(name, `${cap(label)} cannot be negative.`);
      if (opts.nonzero && v === 0) return fail(name, `${cap(label)} cannot be 0.`);
      if (opts.min !== undefined && v < opts.min) return fail(name, `${cap(label)} must be at least ${opts.min}.`);
      if (opts.max !== undefined && v > opts.max) return fail(name, `${cap(label)} must be at most ${opts.max}.`);
      if (opts.integer && !Number.isInteger(v)) return fail(name, `${cap(label)} must be a whole number.`);
      return v;
    },
    whole(name, label, max = 1e9, min = 0) {
      const p = parseWhole(values[name], label, max);
      if (!p.ok) return fail(name, p.error);
      if (p.value < min) return fail(name, `${cap(label)} must be at least ${min}.`);
      return p.value;
    },
    frac(name, label, opts = {}) {
      const raw = String(values[name] ?? '').trim();
      if (!raw) return fail(name, `Enter a value for ${label}.`);
      const f = parseFrac(raw);
      if (!f) return fail(name, `${cap(label)} must be a number or fraction, for example 3, -2.5 or 3/4.`);
      if (opts.nonzero && f.isZero()) return fail(name, `${cap(label)} cannot be 0.`);
      if (f.n.toString().length > 30 || f.d.toString().length > 30) return fail(name, `${cap(label)} has too many digits.`);
      return f;
    },
    text(name, label) {
      const raw = String(values[name] ?? '').trim();
      if (!raw) return fail(name, `Please enter a value for ${label}.`);
      return raw;
    },
  };
}

export function cap(s) { return /^[a-z]{2,}/.test(s) ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

export const fmt = (x, d = 6) => formatNumber(x, { decimals: d });
export const tx = (x, d = 6) => texNumber(x, { decimals: d });
/** TeX number wrapped in parentheses when negative (for substitutions). */
export const txp = (x, d = 6) => (x < 0 ? `(${tx(x, d)})` : tx(x, d));
export const approxRel = (x) => (isDisplayExact(x) ? '=' : '\\approx');
export const isExact = isDisplayExact;

/** Answer card for a decimal value. */
export function answer(label, x, { unit = '', primary = false, exactTex, irrational = false, decimals = 6 } = {}) {
  const approx = irrational || !isDisplayExact(x, decimals);
  const value = `${formatNumber(x, { decimals })}${unit ? ` ${unit}` : ''}`;
  return { label, value, approx, primary, exactTex, copy: `${label}: ${approx ? '≈ ' : ''}${value}` };
}

/** Units for length/area/volume given a chosen length unit ('' = none). */
export function units(u) {
  const l = unitLabels(u);
  return { len: u ? l.length : '', area: u ? l.area : '', vol: u ? l.volume : '', texLen: l.tex.length, texArea: l.tex.area, texVol: l.tex.volume };
}

/** Standard length-unit field definition. */
export const UNIT_FIELD = {
  name: 'unit', label: 'Unit of length (optional)', type: 'select',
  options: [['', 'No unit'], ['mm', 'millimetres (mm)'], ['cm', 'centimetres (cm)'], ['m', 'metres (m)'], ['km', 'kilometres (km)'], ['in', 'inches (in)'], ['ft', 'feet (ft)'], ['yd', 'yards (yd)']],
};

export const ANGLE_UNIT_FIELD = {
  name: 'angleUnit', label: 'Angle unit', type: 'radio', options: [['deg', 'Degrees'], ['rad', 'Radians']],
};

export const toRad = (x, unit) => (unit === 'rad' ? x : (x * Math.PI) / 180);
export const fromRad = (x, unit) => (unit === 'rad' ? x : (x * 180) / Math.PI);
export const angleSym = (unit) => (unit === 'rad' ? ' rad' : '°');
export const angleTex = (unit) => (unit === 'rad' ? '\\text{ rad}' : '^\\circ');

export { formatNumber, texNumber, isDisplayExact };

/** TeX for a rational multiple of π, e.g. 228π or 196π/3. f is a Frac. */
export function piTex(f) {
  if (f.isZero()) return '0';
  const s = f.sign() < 0 ? '-' : '';
  const a = f.abs();
  const top = `${a.n === 1n ? '' : a.n}\\pi`;
  return a.d === 1n ? `${s}${top}` : `${s}\\frac{${top}}{${a.d}}`;
}
export function piText(f) {
  if (f.isZero()) return '0';
  const s = f.sign() < 0 ? '-' : '';
  const a = f.abs();
  return `${s}${a.n === 1n ? '' : a.n}π${a.d === 1n ? '' : `/${a.d}`}`;
}
/** Answer card for a value k·π with exact coefficient k (Frac or null). */
export function piAnswer(label, coef, x, unit = '', primary = false) {
  const a = answer(label, x, { unit, primary, irrational: true, exactTex: coef ? piTex(coef) : undefined });
  if (coef) a.copy = `${label}: ${piText(coef)} ≈ ${a.value}`;
  return a;
}
/** TeX of an exact fraction, in parentheses when negative (for substitutions). */
export const fp = (f) => (f.sign() < 0 ? `\\left(${f.toTex()}\\right)` : f.toTex());
/** Readable text of an exact fraction: "3/4 (0.75)" or "1/3 (≈ 0.333333)". */
export function fracText(f) {
  if (f.isInt()) return f.toString();
  const dec = f.toDecimal(8);
  return dec ? `${f.toString()} = ${dec}` : `${f.toString()} ≈ ${formatNumber(f.toNumber())}`;
}
/** Answer card for an exact fraction. */
export function fracAnswer(label, f, { unit = '', primary = false } = {}) {
  const dec = f.isInt() ? f.toString() : f.toDecimal(8);
  const u = unit ? ` ${unit}` : '';
  if (dec) return { label, value: `${dec}${u}`, approx: false, primary, exactTex: f.isInt() ? undefined : f.toTex(), copy: `${label}: ${dec}${u}` };
  return { label, value: `${formatNumber(f.toNumber())}${u}`, approx: true, primary, exactTex: f.toTex(), copy: `${label}: ${f.toString()} ≈ ${formatNumber(f.toNumber())}${u}` };
}
/** TeX for a point with exact coordinates. */
export const pointTex = (x, y) => `\\left(${x.toTex()},\\ ${y.toTex()}\\right)`;
/** √(f) for a nonnegative Frac in simplest radical form, as { tex, text, value }. */
export function sqrtFrac(f, simplifySqrt) {
  // √(p/q) = √(p·q)/q
  const value = Math.sqrt(f.toNumber());
  const pq = f.n * f.d;
  if (pq > 10n ** 12n) return { tex: `\\sqrt{${f.toTex()}}`, text: `√(${f})`, value, exact: false };
  const [a, b] = simplifySqrt(Number(pq));
  const g = gcdNum(a, Number(f.d));
  const A = a / g, D = Number(f.d) / g;
  const top = b === 1 ? `${A}` : `${A === 1 ? '' : A}\\sqrt{${b}}`;
  const topText = b === 1 ? `${A}` : `${A === 1 ? '' : A}√${b}`;
  return { tex: D === 1 ? top : `\\frac{${top}}{${D}}`, text: D === 1 ? topText : `${topText}/${D}`, value, exact: b === 1 };
}
function gcdNum(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; }

/** "= 12" or "\\approx 3.141593" depending on whether the shown decimal is exact. */
export const eq = (x, d = 6) => `${isDisplayExact(x, d) ? '=' : '\\approx'} ${texNumber(x, { decimals: d })}`;
