/** Shared pieces for the triangle solvers: optional inputs, answer cards and the scaled diagram. */
import { parseDecimal } from './parse.js';
import { formatNumber, isDisplayExact } from './format.js';
import { triangle } from './diagrams.js';

export const SIDE_FIELDS = (prefix = '') => ['a', 'b', 'c'].map((s) => ({ name: s, label: `Side ${s}${prefix}`, type: 'number', signed: false, placeholder: 'unknown', row: 'sides' }));
export const ANGLE_FIELDS = ['A', 'B', 'C'].map((s) => ({ name: s, label: `Angle ${s}`, type: 'number', signed: false, placeholder: 'unknown', suffix: '°', row: 'angles' }));

/** Read optional fields: blank → null; otherwise a positive number (angles in degrees). */
export function readOptional(values, names, errors) {
  const out = {};
  for (const n of names) {
    const raw = String(values[n] ?? '').trim();
    if (!raw) { out[n] = null; continue; }
    const isAngle = n === n.toUpperCase();
    const p = parseDecimal(raw, isAngle ? `angle ${n}` : `side ${n}`);
    if (!p.ok) { errors.push({ field: n, message: p.error }); continue; }
    if (p.value <= 0) { errors.push({ field: n, message: `${isAngle ? `Angle ${n}` : `Side ${n}`} must be greater than 0.` }); continue; }
    if (isAngle && p.value >= 180) { errors.push({ field: n, message: `Angle ${n} must be less than 180°.` }); continue; }
    if (p.value > 1e9) { errors.push({ field: n, message: 'Please keep values below 1,000,000,000.' }); continue; }
    out[n] = p.value;
  }
  return out;
}

const deg = (r) => (r * 180) / Math.PI;
export const sinD = (d) => Math.sin((d * Math.PI) / 180);
export const cosD = (d) => Math.cos((d * Math.PI) / 180);
export const asinD = (x) => deg(Math.asin(Math.max(-1, Math.min(1, x))));
export const acosD = (x) => deg(Math.acos(Math.max(-1, Math.min(1, x))));

/** Answer cards and diagram for a solved triangle. known: Set of given names. */
export function triangleOutput(t, known, unit = '', title = 'Triangle') {
  const u = unit ? ` ${unit}` : '';
  const card = (name) => {
    const isAngle = name === name.toUpperCase();
    const val = t[name];
    return { label: `${isAngle ? 'Angle' : 'Side'} ${name}${known.has(name) ? ' (given)' : ''}`, value: `${formatNumber(val)}${isAngle ? '°' : u}`, approx: known.has(name) ? undefined : !isDisplayExact(val), primary: !known.has(name) };
  };
  const area = 0.5 * t.a * t.b * sinD(t.C);
  const answers = ['a', 'b', 'c', 'A', 'B', 'C'].map(card);
  answers.push({ label: 'Area', value: `${formatNumber(area)}${unit ? ` ${unit}²` : ''}`, approx: !isDisplayExact(area) }, { label: 'Perimeter', value: `${formatNumber(t.a + t.b + t.c)}${u}`, approx: !isDisplayExact(t.a + t.b + t.c) });
  const lab = (n, sym) => ({ t: `${n} = ${formatNumber(t[n], 3)}${sym}`, unknown: !known.has(n) });
  const svg = triangle({ a: t.a, b: t.b, c: t.c, labels: { a: lab('a', ''), b: lab('b', ''), c: lab('c', ''), A: lab('A', '°'), B: lab('B', '°'), C: lab('C', '°') }, rightAt: Math.abs(t.C - 90) < 1e-9 ? 'C' : Math.abs(t.A - 90) < 1e-9 ? 'A' : Math.abs(t.B - 90) < 1e-9 ? 'B' : null, title });
  return { answers, svg, area };
}
