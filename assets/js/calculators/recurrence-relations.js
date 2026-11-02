/**
 * Linear recurrences with constant coefficients and their closed forms.
 *   first order:   aₙ = r·aₙ₋₁ + d          →  aₙ = (a₀ − L)rⁿ + L, L = d/(1 − r)  (or a₀ + nd if r = 1)
 *   second order:  aₙ = c₁aₙ₋₁ + c₂aₙ₋₂    →  roots of x² − c₁x − c₂ = 0:
 *       distinct real roots:  A r₁ⁿ + B r₂ⁿ;  repeated root: (A + Bn)ρⁿ;  complex: ρⁿ(A cos nθ + B sin nθ)
 * Terms are computed exactly with fractions; the closed form is checked against them.
 */
import { validator, answer, fmt, tx, sqrtFrac } from '../lib/calc-kit.js';
import { simplifySqrt } from '../lib/exact.js';
import { Frac } from '../lib/fraction.js';
import { plot } from '../lib/plot.js';

const F = (x) => Frac.of(x);
const coefTex = (c, first = false) => (c.isOne() ? (first ? '' : '+ ') : c.eq(-1) ? '- ' : c.sign() < 0 ? `- ${c.abs().toTex()}` : `${first ? '' : '+ '}${c.toTex()}`);

export const calculator = {
  id: 'recurrence-relations',
  fields: [
    { name: 'order', label: 'Form', type: 'radio', options: [['2', 'aₙ = c₁aₙ₋₁ + c₂aₙ₋₂'], ['1', 'aₙ = r·aₙ₋₁ + d']] },
    { name: 'c1', label: 'c₁ (or r)', type: 'text', placeholder: 'e.g. 1', row: 'c' },
    { name: 'c2', label: 'c₂ (or d)', type: 'text', placeholder: 'e.g. 1', row: 'c' },
    { name: 'a0', label: 'a₀', type: 'text', placeholder: 'e.g. 0', row: 'init' },
    { name: 'a1', label: 'a₁', type: 'text', placeholder: 'e.g. 1', row: 'init', showWhen: { order: ['2'] } },
    { name: 'N', label: 'Show terms up to n =', type: 'number', inputmode: 'numeric', placeholder: '15', hint: 'Coefficients and starting values may be fractions. Up to n = 40.' },
  ],
  examples: [
    { label: 'Fibonacci: aₙ = aₙ₋₁ + aₙ₋₂', values: { order: '2', c1: '1', c2: '1', a0: '0', a1: '1', N: '15' } },
    { label: 'aₙ = 5aₙ₋₁ − 6aₙ₋₂, a₀ = 1, a₁ = 4', values: { order: '2', c1: '5', c2: '-6', a0: '1', a1: '4', N: '10' } },
    { label: 'Repeated root: aₙ = 4aₙ₋₁ − 4aₙ₋₂', values: { order: '2', c1: '4', c2: '-4', a0: '1', a1: '3', N: '10' } },
    { label: 'Loan balance: aₙ = 1.01aₙ₋₁ − 100', values: { order: '1', c1: '1.01', c2: '-100', a0: '5000', N: '12' } },
    { label: 'Complex roots: aₙ = aₙ₋₁ − aₙ₋₂', values: { order: '2', c1: '1', c2: '-1', a0: '1', a1: '1', N: '12' } },
    { label: 'Invalid: c₂ = 0 in the second-order form', values: { order: '2', c1: '3', c2: '0', a0: '1', a1: '3', N: '10' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const second = values.order !== '1';
    const c1 = v.frac('c1', second ? 'c₁' : 'r'), c2 = v.frac('c2', second ? 'c₂' : 'd'), a0 = v.frac('a0', 'a₀');
    const a1 = second ? v.frac('a1', 'a₁') : null;
    const N = String(values.N ?? '').trim() === '' ? 15 : v.whole('N', 'n', 40, 2);
    if (!v.ok()) return v.result();
    if ([c1, c2, a0, a1].filter(Boolean).some((f) => f.n.toString().length > 12 || f.d.toString().length > 12)) return { ok: false, errors: [{ field: 'c1', message: 'Please use coefficients with at most 12 digits.' }] };
    if (second && c2.isZero()) return { ok: false, errors: [{ field: 'c2', message: 'With c₂ = 0 this is a first-order recurrence aₙ = c₁aₙ₋₁. Choose the other form.' }] };
    // exact terms
    const terms = [a0];
    if (second) terms.push(a1);
    while (terms.length <= N) { const n = terms.length; terms.push(second ? c1.mul(terms[n - 1]).add(c2.mul(terms[n - 2])) : c1.mul(terms[n - 1]).add(c2)); }
    const huge = terms.some((t) => t.n.toString().length > 60);
    const steps = [];
    let closedTex, closed;
    if (!second) {
      const r = c1, d = c2;
      steps.push({ title: 'The recurrence', tex: `a_n = ${coefTex(r, true)}a_{n-1} ${d.isZero() ? '' : d.sign() < 0 ? `- ${d.abs().toTex()}` : `+ ${d.toTex()}`},\\quad a_0 = ${a0.toTex()}` });
      if (r.isOne()) {
        closedTex = `a_n = ${a0.toTex()} ${d.sign() < 0 ? '-' : '+'} ${d.abs().toTex()}n`;
        closed = (n) => a0.toNumber() + n * d.toNumber();
        steps.push({ title: 'r = 1: an arithmetic sequence', tex: closedTex });
      } else {
        const L = d.div(F(1).sub(r)), A = a0.sub(L);
        steps.push({ title: 'Fixed point (where aₙ = aₙ₋₁)', tex: `L = \\frac{d}{1 - r} = \\frac{${d.toTex()}}{1 - ${r.sign() < 0 ? `(${r.toTex()})` : r.toTex()}} = ${L.toTex()}` });
        steps.push({ title: 'The distance from L is multiplied by r each step', tex: `a_n - L = (a_0 - L)\\,r^n = ${A.toTex()}\\cdot \\left(${r.toTex()}\\right)^n` });
        closedTex = `a_n = ${A.isZero() ? '' : `${A.toTex()}\\left(${r.toTex()}\\right)^n`} ${L.isZero() ? '' : L.sign() < 0 ? `- ${L.abs().toTex()}` : `${A.isZero() ? '' : '+ '}${L.toTex()}`}`;
        closed = (n) => A.toNumber() * r.toNumber() ** n + L.toNumber();
      }
    } else {
      steps.push({ title: 'The recurrence', tex: `a_n = ${coefTex(c1, true)}a_{n-1} ${coefTex(c2)}a_{n-2},\\quad a_0 = ${a0.toTex()},\\ a_1 = ${a1.toTex()}` });
      steps.push({ title: 'Characteristic equation (try aₙ = xⁿ)', tex: `x^2 ${c1.isZero() ? '' : `${c1.sign() > 0 ? '-' : '+'} ${c1.abs().isOne() ? '' : c1.abs().toTex()}x`} ${c2.sign() > 0 ? '-' : '+'} ${c2.abs().toTex()} = 0` });
      const D = c1.pow(2).add(c2.mul(4));
      steps.push({ title: 'Discriminant', tex: `\\Delta = c_1^2 + 4c_2 = ${D.toTex()}` });
      if (D.sign() > 0) {
        const sq = sqrtFrac(D, simplifySqrt);
        const r1 = (c1.toNumber() + sq.value) / 2, r2 = (c1.toNumber() - sq.value) / 2;
        const B = (a1.toNumber() - a0.toNumber() * r1) / (r2 - r1), A = a0.toNumber() - B;
        const half = c1.div(2), rad = sqrtFrac(D.div(4), simplifySqrt);
        const r1T = rad.exact ? F(r1).toTex() : `${half.isZero() ? '' : `${half.toTex()} + `}${rad.tex}`;
        const r2T = rad.exact ? F(r2).toTex() : `${half.isZero() ? '-' : `${half.toTex()} - `}${rad.tex}`;
        let At = tx(A, 6), Bt = tx(B, 6);
        if (rad.exact) { const R1 = F(r1), R2 = F(r2); const Bf = a1.sub(a0.mul(R1)).div(R2.sub(R1)); At = a0.sub(Bf).toTex(); Bt = Bf.toTex(); }
        steps.push({ title: 'Two distinct real roots', tex: `r_1 = ${r1T},\\quad r_2 = ${r2T}` });
        steps.push({ title: 'General solution', tex: 'a_n = A\\,r_1^{\\,n} + B\\,r_2^{\\,n}' });
        steps.push({ title: 'Use a₀ and a₁ to find A and B', texLines: [`A + B = ${a0.toTex()},\\quad A r_1 + B r_2 = ${a1.toTex()}`, `A ${rad.exact ? '=' : '\\approx'} ${At},\\quad B ${rad.exact ? '=' : '\\approx'} ${Bt}`] });
        // 2·3ⁿ − 2ⁿ rather than 2(3)ⁿ + −1(2)ⁿ
        const pw = (t) => (/^\d+$/.test(t) ? `${t}^n` : `\\left(${t}\\right)^n`);
        const term = (c, base, first) => {
          const neg = c.startsWith('-'), mag = neg ? c.slice(1) : c;
          const coef = mag === '1' ? '' : `${mag}\\cdot `;
          return `${neg ? '- ' : first ? '' : '+ '}${coef}${pw(base)}`;
        };
        closedTex = `a_n ${rad.exact ? '=' : '\\approx'} ${term(At, r1T, true)} ${term(Bt, r2T, false)}`;
        closed = (n) => A * r1 ** n + B * r2 ** n;
      } else if (D.isZero()) {
        const rho = c1.div(2), A = a0, B = a1.div(rho).sub(a0);
        steps.push({ title: 'One repeated root', tex: `\\rho = \\frac{c_1}{2} = ${rho.toTex()}` });
        steps.push({ title: 'General solution (repeated root needs the extra factor n)', tex: 'a_n = (A + Bn)\\,\\rho^n' });
        steps.push({ title: 'Use a₀ and a₁', tex: `A = a_0 = ${A.toTex()},\\quad B = \\frac{a_1}{\\rho} - a_0 = ${B.toTex()}` });
        closedTex = `a_n = \\left(${A.toTex()} ${B.sign() < 0 ? '-' : '+'} ${B.abs().isOne() ? '' : B.abs().toTex()}n\\right)\\left(${rho.toTex()}\\right)^n`;
        closed = (n) => (A.toNumber() + B.toNumber() * n) * rho.toNumber() ** n;
      } else {
        const rho = Math.sqrt(-c2.toNumber()), th = Math.acos(Math.max(-1, Math.min(1, c1.toNumber() / (2 * rho))));
        const A = a0.toNumber(), B = (a1.toNumber() / rho - A * Math.cos(th)) / Math.sin(th);
        steps.push({ title: 'Complex roots', tex: `x = \\frac{c_1 \\pm i\\sqrt{${D.neg().toTex()}}}{2} = \\rho\\,e^{\\pm i\\theta},\\quad \\rho = \\sqrt{-c_2} \\approx ${tx(rho, 6)},\\ \\theta \\approx ${tx(th, 6)}` });
        steps.push({ title: 'Real form of the general solution', tex: 'a_n = \\rho^n\\left(A\\cos n\\theta + B\\sin n\\theta\\right)' });
        steps.push({ title: 'Use a₀ and a₁', tex: `A = a_0 = ${tx(A, 6)},\\quad B = \\frac{a_1/\\rho - A\\cos\\theta}{\\sin\\theta} \\approx ${tx(B, 6)}` });
        closedTex = `a_n \\approx ${tx(rho, 6)}^n\\left(${tx(A, 6)}\\cos(${tx(th, 6)}n) ${B < 0 ? '-' : '+'} ${tx(Math.abs(B), 6)}\\sin(${tx(th, 6)}n)\\right)`;
        closed = (n) => rho ** n * (A * Math.cos(n * th) + B * Math.sin(n * th));
      }
    }
    // check the closed form against the exact terms
    let maxErr = 0;
    terms.forEach((t, n) => { const e = Math.abs(closed(n) - t.toNumber()) / (1 + Math.abs(t.toNumber())); if (Number.isFinite(e)) maxErr = Math.max(maxErr, e); });
    steps.push({ title: 'Closed form', tex: closedTex });
    steps.push({ title: 'Check against the terms', text: maxErr < 1e-6 ? `The closed form reproduces every term a₀ … a${N} (largest relative difference ${maxErr.toExponential(1)}).` : 'The closed form drifts from the exact terms because of rounding in the constants; the table shows the exact terms.' });
    const nums = terms.map((t) => t.toNumber());
    const finite = nums.every((x) => Number.isFinite(x) && Math.abs(x) < 1e300);
    return {
      ok: true,
      final: { tex: closedTex },
      answers: [{ label: 'Closed form', valueTex: closedTex, primary: true, copy: '' }, huge ? { label: `a${N}`, value: `${terms[N].toString().slice(0, 20)}…`, copy: terms[N].toString() } : { label: `a${N}`, value: terms[N].isInt() ? terms[N].toString() : `${terms[N]} ≈ ${fmt(terms[N].toNumber())}`, copy: terms[N].toString() }],
      visual: finite ? { svg: plot({ x: [-0.8, N + 0.8], width: 380, height: 240, title: 'Terms of the sequence', bars: nums.map((y, n) => ({ x: n, w: 0.7, h: y })), curves: [{ f: (x) => (Number.isInteger(Math.round(x)) ? closed(x) : NaN), cls: 'd-hidden', samples: 300 }] }), caption: 'Bars: the exact terms. The dashed curve is the closed form evaluated between the integers.' } : undefined,
      formula: [second ? 'a_n = c_1 a_{n-1} + c_2 a_{n-2} \\;\\Rightarrow\\; x^2 - c_1 x - c_2 = 0' : 'a_n = r\\,a_{n-1} + d \\;\\Rightarrow\\; a_n = (a_0 - L)r^n + L'],
      steps,
      tables: [{ caption: 'Terms (exact)', headers: ['n', 'aₙ'], rows: terms.map((t, n) => [String(n), t.toString().length > 40 ? `${t.toString().slice(0, 38)}…` : t.toString()]) }],
      notes: [{ kind: 'info', text: 'Supported: first-order aₙ = r·aₙ₋₁ + d and second-order homogeneous aₙ = c₁aₙ₋₁ + c₂aₙ₋₂ with constant coefficients. Other recurrences (variable coefficients, non-constant extra terms) are not handled.' }],
    };
  },
};
