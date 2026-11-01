/**
 * Indefinite integral ∫ f(x) dx by linearity and a table of rules. Supported integrands are sums of
 * constant multiples of: polynomials (any expanded or factored form), xⁿ (n ≠ −1) and 1/x,
 * (ax + b)ⁿ and 1/(ax + b), e^(ax+b) and k^(ax+b), sin, cos, tan, cot, sec, csc, sec², csc², sec·tan,
 * csc·cot, sinh, cosh of (ax + b), 1/(x² + a²) and 1/√(a² − x²).
 * Products and quotients that need substitution or integration by parts are reported as unsupported.
 */
import { integrate, derivative, texOf, textOf, UnsupportedError } from '../lib/expr.js';
import { parseFunction, verifyDerivative } from '../lib/calculus-kit.js';

export const SUPPORTED_TEXT = 'Supported: polynomials, xⁿ, 1/x, (ax + b)ⁿ, e^(ax + b), aˣ, sin, cos, tan, sec, csc, cot, sec², csc², sinh and cosh of (ax + b), 1/(x² + a²) and 1/√(a² − x²), and sums and constant multiples of these. Products such as x·sin(x) need integration by parts and are not supported.';

export const calculator = {
  id: 'indefinite-integral',
  fields: [
    { name: 'f', label: 'Integrand f(x)', type: 'text', placeholder: 'e.g. 3x^2 + 4cos(2x) - 1/x', hint: 'Use x as the variable. ' + SUPPORTED_TEXT },
  ],
  examples: [
    { label: '3x² + 4cos(2x) − 1/x', values: { f: '3x^2 + 4cos(2x) - 1/x' } },
    { label: 'e^(3x) + (2x + 1)^4', values: { f: 'e^(3x) + (2x+1)^4' } },
    { label: '1/(x² + 9)', values: { f: '1/(x^2 + 9)' } },
    { label: 'sec²(x) − 5/√x', values: { f: 'sec(x)^2 - 5/sqrt(x)' } },
  ],
  solve(values) {
    const p = parseFunction(values, 'f', 'the integrand f(x)');
    if (p.error) return p.error;
    let res;
    try {
      res = integrate(p.node);
    } catch (e) {
      if (e instanceof UnsupportedError) return { ok: false, errors: [{ field: 'f', message: `${e.message} ${SUPPORTED_TEXT}` }] };
      throw e;
    }
    const check = verifyDerivative(res.result, p.node, [0.37, 0.83, 1.3, 1.7, 2.9, 3.6]);
    if (!check.ok || !check.checked) return { ok: false, errors: [{ field: 'f', message: 'The result could not be verified by differentiation, so it is not shown. ' + SUPPORTED_TEXT }] };
    const steps = [{ title: 'Write the integral', tex: `\\int ${texOf(p.node)}\\,dx` }];
    if (res.steps.length > 1) steps.push({ title: 'Integrate term by term (linearity)', text: 'The integral of a sum is the sum of the integrals, and constant factors can be taken outside.' });
    for (const s of res.steps) steps.push({ title: s.rule, tex: `\\int ${texOf(s.term)}\\,dx = ${texOf(s.result)}` });
    steps.push({ title: 'Add the constant of integration', tex: `\\int ${texOf(p.node)}\\,dx = ${texOf(res.result)} + C` });
    steps.push({ title: 'Check by differentiating', text: 'Differentiating the answer must give back the integrand.', tex: `\\frac{d}{dx}\\left[${texOf(res.result)}\\right] = ${texOf(derivative(res.result))}` });
    return {
      ok: true,
      final: { tex: `\\int ${texOf(p.node)}\\,dx = ${texOf(res.result)} + C` },
      answers: [{ label: 'Antiderivative', valueTex: `${texOf(res.result)} + C`, primary: true, copy: `${textOf(res.result)} + C` }],
      steps,
      notes: [{ kind: 'info', text: `Verified: the derivative of the answer matched the integrand at ${check.checked} test points. ln|u| is used where the argument may be negative.` }],
      formula: ['\\int x^n\\,dx = \\frac{x^{n+1}}{n+1} + C \\ (n \\ne -1) \\qquad \\int \\frac{dx}{x} = \\ln|x| + C \\qquad \\int e^{ax}\\,dx = \\frac{e^{ax}}{a} + C'],
      rounding: 'The antiderivative is exact. C is an arbitrary constant.',
    };
  },
};
