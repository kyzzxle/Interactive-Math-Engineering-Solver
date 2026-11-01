/**
 * Frustum of a right circular cone.
 *
 *   s = √(h² + (R − r)²)          h = √(s² − (R − r)²)
 *   LSA = π(R + r)s
 *   TSA = π(R + r)s + πR² + πr²
 *   V   = (πh / 3)(R² + Rr + r²)
 *
 * Convention: R is the larger (bottom) radius, r the smaller (top) radius, R ≥ r ≥ 0.
 * solveFrustum() validates raw text input and returns either
 *   { ok: false, errors: [{ field, message }] }
 * or
 *   { ok: true, values, exact, steps, notes }.
 */
import { parseDecimal, toCommonScale } from '../lib/parse.js';
import { texNumber, texRel, formatNumber, isDisplayExact } from '../lib/format.js';
import { radicalExpr, radicalTex, radicalText, radicalValue, isRational, simplifySqrt } from '../lib/exact.js';

export const MAX_INPUT = 1e9;

export function solveFrustum(input) {
  const known = input.known === 's' ? 's' : 'h';
  const errors = [];

  const pr = parseDecimal(input.r, 'the top radius r');
  const pR = parseDecimal(input.R, 'the bottom radius R');
  const knownLabel = known === 'h' ? 'the perpendicular height h' : 'the slant height s';
  const pk = parseDecimal(input[known], knownLabel);

  if (!pr.ok) errors.push({ field: 'r', message: pr.error });
  if (!pR.ok) errors.push({ field: 'R', message: pR.error });
  if (!pk.ok) errors.push({ field: known, message: pk.error });
  if (errors.length) return { ok: false, errors };

  const r = pr.value;
  const R = pR.value;
  const k = pk.value;

  if (r < 0) errors.push({ field: 'r', message: 'The top radius r cannot be negative. Use 0 if the solid comes to a point (a full cone).' });
  if (R < 0) errors.push({ field: 'R', message: 'The bottom radius R cannot be negative.' });
  else if (R === 0) errors.push({ field: 'R', message: 'The bottom radius R must be greater than 0 — with R = 0 there is no solid.' });
  if (k <= 0) {
    errors.push({ field: known, message: known === 'h'
      ? 'The perpendicular height h must be greater than 0. A height of 0 gives a flat ring, not a solid.'
      : 'The slant height s must be greater than 0.' });
  }
  for (const [field, v] of [['r', r], ['R', R], [known, k]]) {
    if (Math.abs(v) > MAX_INPUT) errors.push({ field, message: `Please keep each measurement at or below ${MAX_INPUT.toLocaleString('en-US')} so the results stay accurate.` });
  }
  if (!errors.length && R < r) {
    errors.push({ field: ['R', 'r'], message: `The bottom radius R (${formatNumber(R)}) must be at least the top radius r (${formatNumber(r)}). This calculator always calls the larger base R — swap the two values.` });
  }
  const d = R - r;
  if (!errors.length && known === 's' && k <= d) {
    errors.push({ field: 's', message: k === d
      ? `With s = R − r = ${formatNumber(d)}, the height would be 0 and the frustum would be flat. The slant height must be longer than R − r.`
      : `Impossible frustum: the slant height s (${formatNumber(k)}) must be longer than R − r = ${formatNumber(d)}, because s is the hypotenuse of a right triangle whose legs are h and R − r.` });
  }
  if (errors.length) return { ok: false, errors };

  // ---------------------------------------------------------------- decimal values
  const h = known === 'h' ? k : Math.sqrt((k - d) * (k + d));
  const s = known === 's' ? k : Math.hypot(h, d);
  const lsa = Math.PI * (R + r) * s;
  const top = Math.PI * r * r;
  const bottom = Math.PI * R * R;
  const tsa = lsa + top + bottom;
  const volume = (Math.PI * h / 3) * (R * R + R * r + r * r);
  const values = { r, R, h, s, lsa, top, bottom, tsa, volume, known };

  if (![h, s, lsa, tsa, volume].every(Number.isFinite) || h <= 0) {
    return { ok: false, errors: [{ field: known, message: 'These values are outside the range that can be computed reliably. Try smaller measurements or a larger unit.' }] };
  }

  const exact = exactForms(input, known);
  const notes = [];
  if (r === 0) notes.push({ kind: 'info', text: 'The top radius is 0, so this solid is a complete cone rather than a truncated one. The frustum formulas still apply and reduce to the cone formulas.' });
  if (r === R) notes.push({ kind: 'info', text: 'Both radii are equal, so the "frustum" is actually a cylinder: the slant height equals the height and V = πR²h.' });
  if (r > 0 && r < R) {
    const apex = (R * h) / d;
    values.apexHeight = apex;
    notes.push({ kind: 'info', text: `If the sides were extended to a point, the complete cone would be ${formatNumber(apex)} tall; the frustum is what remains after removing a small cone of height ${formatNumber(apex - h)} from the top.` });
  }

  return { ok: true, values, exact, steps: buildSteps(values, exact, input), notes };
}

/** Exact symbolic forms when all inputs are short decimals; otherwise null. */
function exactForms(input, known) {
  const sc = toCommonScale([input.r, input.R, input[known]]);
  if (!sc) return null;
  const [r, R, k] = sc.ints;
  const S = sc.scale;
  const d = R - r;
  const K = R * R + R * r + r * r; // scaled by S²
  const sum = R + r;
  const out = {};

  if (known === 'h') {
    const N = k * k + d * d; // s = √N / S
    const root = simplifySqrt(N);
    if (!root) return null;
    const [a, b] = root;
    out.s = radicalExpr([[a, b]], S);
    out.h = radicalExpr([[k, 1]], S);
    out.lsa = radicalExpr([[sum * a, b]], S * S);
    out.tsa = radicalExpr([[R * R + r * r, 1], [sum * a, b]], S * S);
    out.volume = radicalExpr([[k * K, 1]], 3 * S ** 3);
    out.sSquared = N;
  } else {
    const M = k * k - d * d; // h = √M / S
    const root = simplifySqrt(M);
    if (!root) return null;
    const [c, e] = root;
    out.h = radicalExpr([[c, e]], S);
    out.s = radicalExpr([[k, 1]], S);
    out.lsa = radicalExpr([[sum * k, 1]], S * S);
    out.tsa = radicalExpr([[R * R + r * r + sum * k, 1]], S * S);
    out.volume = radicalExpr([[c * K, e]], 3 * S ** 3);
    out.hSquared = M;
  }
  out.top = radicalExpr([[r * r, 1]], S * S);
  out.bottom = radicalExpr([[R * R, 1]], S * S);
  out.scale = S;
  if (Object.values(out).some((v) => v === null)) return null;
  return out;
}

/** TeX helpers */
const n = (x) => texNumber(x);
const piForm = (expr) => (expr ? radicalTex(expr, '\\pi') : null);
const rootForm = (expr) => (expr ? radicalTex(expr) : null);

function approxLine(prefix, exprTex, value) {
  // "= exact ≈ decimal" (omits the exact part when unavailable). Every value passed here
  // is a nonzero multiple of π, hence irrational, so the decimal is always approximate.
  const rel = texRel(value, 6, true);
  return exprTex ? `${prefix} = ${exprTex} ${rel} ${n(value)}` : `${prefix} ${rel} ${n(value)}`;
}

function buildSteps(v, ex, input) {
  const steps = [];
  const { r, R, h, s, known } = v;
  const d = R - r;
  steps.push({
    title: 'Write down the given values',
    tex: `r = ${n(r)}, \\quad R = ${n(R)}, \\quad ${known} = ${n(known === 'h' ? h : s)}`,
    note: `The difference of the radii is R − r = ${formatNumber(d)}. It is the horizontal leg of the right triangle formed by h, R − r and s.`,
  });

  if (known === 'h') {
    const N = h * h + d * d;
    const lines = [
      `s = \\sqrt{h^2 + (R - r)^2}`,
      `s = \\sqrt{${n(h)}^2 + (${n(R)} - ${n(r)})^2} = \\sqrt{${n(h * h)} + ${n(d * d)}}`,
    ];
    const sExact = ex && !isRational(ex.s) ? rootForm(ex.s) : null;
    lines.push(`s = \\sqrt{${n(N)}}${sExact && sExact !== `\\sqrt{${n(N)}}` ? ` = ${sExact}` : ''} ${texRel(s)} ${n(s)}`);
    steps.push({ title: 'Find the slant height s (Pythagorean theorem)', texLines: lines });
  } else {
    const M = s * s - d * d;
    const lines = [
      `h = \\sqrt{s^2 - (R - r)^2}`,
      `h = \\sqrt{${n(s)}^2 - (${n(R)} - ${n(r)})^2} = \\sqrt{${n(s * s)} - ${n(d * d)}}`,
    ];
    const hExact = ex && !isRational(ex.h) ? rootForm(ex.h) : null;
    lines.push(`h = \\sqrt{${n(M)}}${hExact && hExact !== `\\sqrt{${n(M)}}` ? ` = ${hExact}` : ''} ${texRel(h)} ${n(h)}`);
    steps.push({ title: 'Find the perpendicular height h (Pythagorean theorem)', texLines: lines,
      note: 'The slant height is the hypotenuse, so subtract the square of R − r from s².' });
  }

  steps.push({
    title: 'Lateral (curved) surface area',
    texLines: [
      `LSA = \\pi (R + r)\\, s`,
      `LSA = \\pi (${n(R)} + ${n(r)})(${n(s)}) = \\pi (${n(R + r)})(${n(s)})`,
      approxLine('LSA', ex ? piForm(ex.lsa) : null, v.lsa),
    ],
    note: 'The value of s used here is the full-precision value, not the rounded one shown above.',
  });

  steps.push({
    title: 'Areas of the two circular bases',
    texLines: [
      approxLine(`\\pi R^2 = \\pi (${n(R)})^2`, ex ? piForm(ex.bottom) : null, v.bottom),
      approxLine(`\\pi r^2 = \\pi (${n(r)})^2`, ex ? piForm(ex.top) : null, v.top),
    ],
  });

  steps.push({
    title: 'Total surface area',
    texLines: [
      `TSA = \\pi (R + r) s + \\pi R^2 + \\pi r^2`,
      `TSA \\approx ${n(v.lsa)} + ${n(v.bottom)} + ${n(v.top)}`,
      approxLine('TSA', ex ? piForm(ex.tsa) : null, v.tsa),
    ],
  });

  const K = R * R + R * r + r * r;
  steps.push({
    title: 'Volume',
    texLines: [
      `V = \\frac{\\pi h}{3}\\left(R^2 + Rr + r^2\\right)`,
      `V = \\frac{\\pi (${n(h)})}{3}\\left(${n(R)}^2 + (${n(R)})(${n(r)}) + ${n(r)}^2\\right)`,
      `V = \\frac{\\pi (${n(h)})}{3}\\left(${n(R * R)} + ${n(R * r)} + ${n(r * r)}\\right) = \\frac{\\pi (${n(h)})(${n(K)})}{3}`,
      approxLine('V', ex ? piForm(ex.volume) : null, v.volume),
    ],
  });
  return steps;
}

/** Exact value text helpers exported for the page script and tests. */
export function exactTex(expr, withPi) {
  return expr ? radicalTex(expr, withPi ? '\\pi' : '') : null;
}
export function exactText(expr, withPi) {
  return expr ? radicalText(expr, withPi ? 'π' : '') : null;
}
export { radicalValue, isDisplayExact };
