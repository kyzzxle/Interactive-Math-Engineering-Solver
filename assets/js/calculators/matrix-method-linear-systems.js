/**
 * Linear systems Ax = b by matrix methods (exact fractions), for 2 to 6 unknowns:
 *   Gauss–Jordan elimination on [A | b], Cramer's rule (xᵢ = det Aᵢ / det A), or x = A⁻¹b.
 */
import { validator, fmt } from '../lib/calc-kit.js';
import { matrixTex, det, inverse, mulM, parseMatrix } from '../lib/linalg.js';
import { eliminate, VARS, systemTex } from '../lib/linsys.js';

const NAMES = ['x', 'y', 'z', 'w', 'u', 'v'];

export const calculator = {
  id: 'matrix-method-linear-systems',
  fields: [
    { name: 'method', label: 'Method', type: 'select', options: [['gauss', 'Gauss–Jordan elimination'], ['cramer', "Cramer's rule"], ['inverse', 'Inverse matrix x = A⁻¹b']] },
    { name: 'aug', label: 'Augmented matrix [A | b]', type: 'textarea', rows: 4, placeholder: '2 1 -1 | 8\n-3 -1 2 | -11\n-2 1 2 | -3', hint: 'One equation per line: the coefficients, then the right-hand side (a "|" before it is optional).' },
  ],
  examples: [
    { label: '3×3 by Gauss–Jordan', values: { method: 'gauss', aug: '2 1 -1 | 8\n-3 -1 2 | -11\n-2 1 2 | -3' } },
    { label: "2×2 by Cramer's rule", values: { method: 'cramer', aug: '3 2 | 16\n4 -1 | 3' } },
    { label: '3×3 by inverse matrix', values: { method: 'inverse', aug: '1 1 1 | 6\n0 2 5 | -4\n2 5 -1 | 27' } },
    { label: 'Singular system', values: { method: 'gauss', aug: '1 2 3 | 6\n2 4 6 | 12\n1 1 1 | 3' } },
  ],
  solve(values) {
    const v = validator(values);
    const method = ['gauss', 'cramer', 'inverse'].includes(values.method) ? values.method : 'gauss';
    const raw = String(values.aug ?? '').replace(/\|/g, ' ');
    const pm = parseMatrix(raw, 'the augmented matrix');
    if (pm.error) v.fail('aug', pm.error);
    if (!v.ok()) return v.result();
    const M = pm.matrix;
    const n = M.length;
    if (M[0].length !== n + 1) return { ok: false, errors: [{ field: 'aug', message: `With ${n} equation${n === 1 ? '' : 's'} each line needs ${n} coefficients and 1 right-hand side (${n + 1} numbers); you entered ${M[0].length}. This calculator handles square systems (as many equations as unknowns).` }] };
    if (n < 2) return { ok: false, errors: [{ field: 'aug', message: 'Enter at least 2 equations.' }] };
    const A = M.map((r) => r.slice(0, n)), b = M.map((r) => r[n]);
    const vars = n <= 4 ? VARS.slice(0, n) : NAMES.slice(0, n);
    const steps = [{ title: 'Write the system and its matrix form', texLines: [systemTex(A, b, vars), `A = ${matrixTex(A)}, \\quad \\mathbf{b} = ${matrixTex(b.map((x) => [x]))}`] }];
    const D = det(A);
    let x = null, status = 'unique', finalExtra;
    if (method === 'gauss') {
      const res = eliminate(A, b, vars);
      steps.push(...res.steps);
      status = res.status;
      x = res.x || null;
      finalExtra = res;
    } else {
      steps.push({ title: 'Determinant of the coefficient matrix', tex: `\\det A = ${D.toTex()}` });
      if (D.isZero()) {
        steps.push({ title: `${method === 'cramer' ? "Cramer's rule" : 'The inverse matrix'} cannot be used`, text: 'det A = 0, so A has no inverse and the system has either no solution or infinitely many. Use Gauss–Jordan elimination to find out which.' });
        const res = eliminate(A, b, vars);
        status = res.status;
        finalExtra = res;
        steps.push({ title: 'Gauss–Jordan elimination decides the case', text: res.status === 'none' ? 'The equations are inconsistent: no solution.' : 'The equations are dependent: infinitely many solutions.', texLines: res.finalTex || [] });
      } else if (method === 'cramer') {
        x = [];
        for (let j = 0; j < n; j++) {
          const Aj = A.map((r, i) => r.map((c, k) => (k === j ? b[i] : c)));
          const Dj = det(Aj);
          x.push(Dj.div(D));
          steps.push({ title: `Replace column ${j + 1} by b`, texLines: [`A_{${vars[j]}} = ${matrixTex(Aj)}, \\quad \\det A_{${vars[j]}} = ${Dj.toTex()}`, `${vars[j]} = \\frac{\\det A_{${vars[j]}}}{\\det A} = \\frac{${Dj.toTex()}}{${D.toTex()}} = ${x[j].toTex()}`] });
        }
      } else {
        const inv = inverse(A).inv;
        steps.push({ title: 'Find the inverse of A (Gauss–Jordan on [A | I])', tex: `A^{-1} = ${matrixTex(inv)}` });
        x = mulM(inv, b.map((t) => [t])).map((r) => r[0]);
        steps.push({ title: 'Multiply: x = A⁻¹b', tex: `\\mathbf{x} = A^{-1}\\mathbf{b} = ${matrixTex(inv)}${matrixTex(b.map((t) => [t]))} = ${matrixTex(x.map((t) => [t]))}` });
      }
    }
    if (x && method !== 'gauss') steps.push({ title: 'Check: A x = b', tex: `${matrixTex(A)}${matrixTex(x.map((t) => [t]))} = ${matrixTex(mulM(A, x.map((t) => [t])))} \\;\\checkmark` });
    const answers = x
      ? x.map((val, j) => ({ label: vars[j], value: val.toDecimal(8) || fmt(val.toNumber()), approx: !val.toDecimal(8), exactTex: val.isInt() ? undefined : val.toTex(), primary: true, copy: `${vars[j]} = ${val}` }))
      : [{ label: 'Solution', value: status === 'none' ? 'No solution (inconsistent)' : 'Infinitely many solutions', primary: true }];
    answers.push({ label: 'det A', value: D.toString() });
    return {
      ok: true,
      final: x ? { tex: x.map((val, j) => `${vars[j]} = ${val.toTex()}`).join(', \\quad ') } : { text: finalExtra.finalText, texLines: finalExtra.finalTex },
      answers, steps,
      formula: [method === 'cramer' ? 'x_j = \\frac{\\det A_j}{\\det A}' : method === 'inverse' ? '\\mathbf{x} = A^{-1}\\mathbf{b}' : '[A \\mid \\mathbf{b}] \\to [I \\mid \\mathbf{x}]'],
      notes: [{ kind: 'info', text: method === 'cramer' ? "Cramer's rule is elegant for 2×2 and 3×3 systems, but needs n + 1 determinants, so elimination is preferred for large systems." : method === 'inverse' ? 'The inverse method is convenient when solving A x = b for many different b with the same A.' : 'Gauss–Jordan elimination works for every square system and also identifies inconsistent and dependent systems.' }],
      rounding: 'All arithmetic is exact (fractions).',
    };
  },
};
