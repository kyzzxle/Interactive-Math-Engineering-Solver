/** Shared helpers for the calculus calculators. */
import { parse, ExprError, compile, derivative, hasVar } from './expr.js';
import { parseValue } from './trig.js';

export const FUNCTION_HINT = 'Use x as the variable. Examples: 3x^2 - 2x + 1, sin(2x), e^x, ln(x), sqrt(x), x^3/(x+1). Use * or brackets when in doubt.';

/** Parse a function of x from a form field; returns { node } or { error } (an error result object). */
export function parseFunction(values, field, label = 'the function') {
  const src = String(values[field] ?? '').trim();
  if (!src) return { error: { ok: false, errors: [{ field, message: `Please enter a value for ${label}.` }] } };
  if (src.includes('=')) return { error: { ok: false, errors: [{ field, message: `Enter only the expression for ${label} (without "f(x) =" or "y =").` }] } };
  try {
    return { node: parse(src) };
  } catch (e) {
    if (e instanceof ExprError) return { error: { ok: false, errors: [{ field, message: e.message }] } };
    throw e;
  }
}

/** Parse a number or constant expression (pi/2, e, sqrt(2)) from a field. */
export function parseNumberExpr(values, field, label) {
  const p = parseValue(values[field], label);
  if (p.error) return { error: { ok: false, errors: [{ field, message: p.error }] } };
  if (Math.abs(p.value) > 1e6) return { error: { ok: false, errors: [{ field, message: `${label.charAt(0).toUpperCase() + label.slice(1)} must be between −1,000,000 and 1,000,000.` }] } };
  return { value: p.value, node: p.node };
}

/** Check a symbolic derivative against central differences at several points. */
export function verifyDerivative(node, dnode, points) {
  const f = compile(node), df = compile(dnode);
  let checked = 0;
  for (const x of points) {
    const h = 1e-5 * Math.max(1, Math.abs(x));
    const num = (f(x + h) - f(x - h)) / (2 * h);
    const sym = df(x);
    if (!Number.isFinite(num) || !Number.isFinite(sym) || Math.abs(sym) > 1e6) continue;
    if (Math.abs(num - sym) > 1e-4 * Math.max(1, Math.abs(sym))) return { ok: false, x, num, sym };
    checked++;
  }
  return { ok: true, checked };
}

export { compile, derivative, hasVar };
