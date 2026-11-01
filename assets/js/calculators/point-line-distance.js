/**
 * Distance from the point (x₁, y₁) to the line Ax + By + C = 0:
 *
 *   d = |Ax₁ + By₁ + C| / √(A² + B²)
 *
 * Also returns the foot of the perpendicular F = (x₁ − A·t, y₁ − B·t) with
 * t = (Ax₁ + By₁ + C) / (A² + B²), and exact forms when the inputs are short decimals.
 */
import { parseDecimal, toCommonScale } from '../lib/parse.js';
import { texNumber, texSigned, texRel, formatNumber } from '../lib/format.js';
import { radicalExpr, radicalTex, radicalText, reduceFraction, simplifySqrt, isRational } from '../lib/exact.js';

export const MAX_INPUT = 1e12;
const FIELDS = [
  ['x1', 'the x-coordinate x₁'],
  ['y1', 'the y-coordinate y₁'],
  ['A', 'coefficient A'],
  ['B', 'coefficient B'],
  ['C', 'constant C'],
];

export function solvePointLine(input) {
  const errors = [];
  const v = {};
  for (const [key, label] of FIELDS) {
    const p = parseDecimal(input[key], label);
    if (!p.ok) errors.push({ field: key, message: p.error });
    else if (Math.abs(p.value) > MAX_INPUT) errors.push({ field: key, message: `Please keep ${label} between −10¹² and 10¹² so the result stays accurate.` });
    else v[key] = p.value;
  }
  if (errors.length) return { ok: false, errors };

  const { x1, y1, A, B, C } = v;
  if (A === 0 && B === 0) {
    return { ok: false, errors: [{ field: ['A', 'B'], message: 'A and B cannot both be zero. Ax + By + C = 0 would then contain no x or y at all, so it does not describe a line.' }] };
  }

  const N = A * x1 + B * y1 + C;
  const D = A * A + B * B;
  const root = Math.sqrt(D);
  const distance = Math.abs(N) / root;
  const t = N / D;
  const foot = { x: x1 - A * t, y: y1 - B * t };
  if (![N, D, distance, foot.x, foot.y].every(Number.isFinite)) {
    return { ok: false, errors: [{ field: 'A', message: 'These values are too large to compute reliably. Try dividing every coefficient of the line by the same number.' }] };
  }

  const exact = exactForms(input);
  const values = { x1, y1, A, B, C, N, D, root, distance, foot, t };
  const notes = [];
  if (N === 0 || (exact && exact.numerator === 0)) {
    notes.push({ kind: 'info', text: 'The distance is 0, which means the point lies on the line: its coordinates satisfy Ax + By + C = 0.' });
  } else {
    notes.push({ kind: 'info', text: `Ax₁ + By₁ + C is ${N > 0 ? 'positive' : 'negative'}, so the point lies on the side of the line where Ax + By + C ${N > 0 ? '> 0' : '< 0'}. Taking the absolute value makes the distance positive either way.` });
  }
  return { ok: true, values, exact, line: describeLine(A, B, C), steps: buildSteps(values, exact), notes };
}

/** Human-friendly description of the line: slope-intercept form, vertical or horizontal. */
export function describeLine(A, B, C) {
  if (B === 0) return { kind: 'vertical', text: `a vertical line, x = ${formatNumber(-C / A)}`, tex: `x = ${texNumber(-C / A)}` };
  const m = -A / B;
  const b = -C / B;
  if (A === 0) return { kind: 'horizontal', text: `a horizontal line, y = ${formatNumber(b)}`, tex: `y = ${texNumber(b)}` };
  const bPart = b === 0 ? '' : b > 0 ? ` + ${texNumber(b)}` : ` - ${texNumber(-b)}`;
  const bText = b === 0 ? '' : b > 0 ? ` + ${formatNumber(b)}` : ` − ${formatNumber(-b)}`;
  return { kind: 'oblique', slope: m, intercept: b, text: `y = ${formatNumber(m)}x${bText}, with slope ${formatNumber(m)}`, tex: `y = ${texNumber(m)}x${bPart}` };
}

function exactForms(input) {
  const sc = toCommonScale([input.x1, input.y1, input.A, input.B, input.C], { maxDecimals: 4, maxInt: 1e6 });
  if (!sc) return null;
  const [x, y, a, b, c] = sc.ints;
  const S = sc.scale;
  // Scaled: N = n'/S², D = D'/S², so d = |n'| / (S·√D').
  const nPrime = a * x + b * y + c * S;
  const dPrime = a * a + b * b;
  if (!Number.isSafeInteger(nPrime) || !Number.isSafeInteger(dPrime)) return null;
  const root = simplifySqrt(dPrime);
  if (!root) return null;
  const [p, q] = root; // √D' = p√q
  // d = |n'| √q / (S p q)
  const distance = radicalExpr([[Math.abs(nPrime), q]], S * p * q);
  const sqrtD = radicalExpr([[p, q]], S); // √D in original units
  // Foot: xF = (x·D' − a·n') / (S·D'), yF = (y·D' − b·n') / (S·D')
  const fx = reduceFraction(x * dPrime - a * nPrime, S * dPrime);
  const fy = reduceFraction(y * dPrime - b * nPrime, S * dPrime);
  const numerator = reduceFraction(nPrime, S * S);
  const denomSquared = reduceFraction(dPrime, S * S);
  if (!distance || !sqrtD || !numerator || !denomSquared) return null;
  const footExact = fx && fy ? { x: fx, y: fy } : null; // may overflow for huge inputs; distance can still be exact
  return { distance, sqrtD, foot: footExact, numerator: nPrime, numeratorFrac: numerator, denomSquared };
}

export function fractionTex([p, q]) {
  if (q === 1) return String(p);
  return `${p < 0 ? '-' : ''}\\frac{${Math.abs(p)}}{${q}}`;
}
export function fractionText([p, q]) {
  return q === 1 ? String(p) : `${p}/${q}`;
}

const n = (x) => texNumber(x);
const sn = (x) => texSigned(x);

function buildSteps(v, ex) {
  const { x1, y1, A, B, C, N, D, distance, foot, t } = v;
  const steps = [];
  steps.push({
    title: 'Identify the point and the line coefficients',
    texLines: [
      `(x_1, y_1) = (${n(x1)}, ${n(y1)})`,
      `A = ${n(A)}, \\quad B = ${n(B)}, \\quad C = ${n(C)}`,
    ],
    note: 'The formula needs the line in general form Ax + By + C = 0, with every term on one side and 0 on the other.',
  });

  const ax = A * x1;
  const by = B * y1;
  steps.push({
    title: 'Numerator: substitute the point into Ax + By + C',
    texLines: [
      `|Ax_1 + By_1 + C| = |${sn(A)} \\cdot ${sn(x1)} + ${sn(B)} \\cdot ${sn(y1)} + ${sn(C)}|`,
      `= |${n(ax)} ${by < 0 ? '-' : '+'} ${n(Math.abs(by))} ${C < 0 ? '-' : '+'} ${n(Math.abs(C))}| = |${n(N)}| = ${n(Math.abs(N))}`,
    ],
  });

  const rootExact = ex && !isRational(ex.sqrtD) ? radicalTex(ex.sqrtD) : null;
  steps.push({
    title: 'Denominator: length of the normal vector (A, B)',
    texLines: [
      `\\sqrt{A^2 + B^2} = \\sqrt{${sn(A)}^2 + ${sn(B)}^2} = \\sqrt{${n(A * A)} + ${n(B * B)}}`,
      `= \\sqrt{${n(D)}}${rootExact && rootExact !== `\\sqrt{${n(D)}}` ? ` = ${rootExact}` : ''} ${texRel(Math.sqrt(D))} ${n(Math.sqrt(D))}`,
    ],
    note: '(A, B) is perpendicular to the line, and dividing by its length converts |Ax₁ + By₁ + C| into an actual distance.',
  });

  const exactD = ex ? radicalTex(ex.distance) : null;
  const lines = [`d = \\frac{|Ax_1 + By_1 + C|}{\\sqrt{A^2 + B^2}} = \\frac{${n(Math.abs(N))}}{\\sqrt{${n(D)}}}`];
  if (exactD) lines.push(`d = ${exactD} ${texRel(distance)} ${n(distance)}`);
  else lines.push(`d ${texRel(distance)} ${n(distance)}`);
  steps.push({
    title: 'Divide to get the perpendicular distance',
    texLines: lines,
    note: ex && !isRational(ex.distance) ? 'The exact answer is written with a rational denominator (the square root moved to the numerator).' : undefined,
  });

  const exFoot = ex && ex.foot;
  const fx = exFoot ? fractionTex(exFoot.x) : null;
  const fy = exFoot ? fractionTex(exFoot.y) : null;
  const tLine = `t = \\frac{Ax_1 + By_1 + C}{A^2 + B^2} = \\frac{${n(N)}}{${n(D)}} ${texRel(t)} ${n(t)}`;
  const bothExact = texRel(foot.x) === '=' && texRel(foot.y) === '=';
  const footLines = [
    tLine,
    `F = (x_1 - At,\\; y_1 - Bt) = \\left(${n(x1)} - ${sn(A)}t,\\; ${n(y1)} - ${sn(B)}t\\right)`,
    exFoot && (exFoot.x[1] !== 1 || exFoot.y[1] !== 1)
      ? `F = \\left(${fx},\\; ${fy}\\right) ${bothExact ? '=' : '\\approx'} (${n(foot.x)},\\; ${n(foot.y)})`
      : `F ${bothExact ? '=' : '\\approx'} (${n(foot.x)},\\; ${n(foot.y)})`,
  ];
  steps.push({
    title: 'Bonus: the foot of the perpendicular (closest point on the line)',
    texLines: footLines,
    note: 'Moving from the point along the normal vector (A, B) by the amount t lands exactly on the line. The distance from the point to F equals d.',
  });
  return steps;
}

export function distanceText(ex) {
  return ex ? radicalText(ex.distance) : null;
}
