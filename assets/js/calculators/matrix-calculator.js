/**
 * Matrix calculator with exact fractions: A + B, A − B, AB, kA, transpose, determinant and inverse.
 * Matrices up to 6 × 6 are entered one row per line.
 */
import { validator, fmt } from '../lib/calc-kit.js';
import { parseMatrix, matrixTex, matrixText, addM, mulM, scaleM, transpose, det, detSteps, inverse, dims, identity } from '../lib/linalg.js';

export const calculator = {
  id: 'matrix-calculator',
  fields: [
    { name: 'op', label: 'Operation', type: 'select', options: [['mul', 'A × B (product)'], ['add', 'A + B'], ['sub', 'A − B'], ['scalar', 'k × A (scalar multiple)'], ['det', 'det(A) (determinant)'], ['inv', 'A⁻¹ (inverse)'], ['transpose', 'Aᵀ (transpose)']] },
    { name: 'A', label: 'Matrix A', type: 'textarea', rows: 3, placeholder: '1 2\n3 4', hint: 'One row per line; separate entries with spaces or commas. Fractions like 1/2 are allowed.' },
    { name: 'B', label: 'Matrix B', type: 'textarea', rows: 3, placeholder: '5 6\n7 8', showWhen: { op: ['mul', 'add', 'sub'] } },
    { name: 'k', label: 'Scalar k', type: 'number', placeholder: 'e.g. 3', showWhen: { op: ['scalar'] } },
  ],
  examples: [
    { label: '2×3 times 3×2', values: { op: 'mul', A: '1 2 3\n4 5 6', B: '7 8\n9 10\n11 12' } },
    { label: 'Determinant of a 3×3', values: { op: 'det', A: '2 -3 1\n2 0 -1\n1 4 5' } },
    { label: 'Inverse of a 3×3', values: { op: 'inv', A: '2 1 1\n1 3 2\n1 0 0' } },
    { label: 'Singular matrix (no inverse)', values: { op: 'inv', A: '1 2\n2 4' } },
  ],
  solve(values) {
    const v = validator(values);
    const op = ['mul', 'add', 'sub', 'scalar', 'det', 'inv', 'transpose'].includes(values.op) ? values.op : 'mul';
    const pa = parseMatrix(values.A, 'matrix A');
    if (pa.error) v.fail('A', pa.error);
    let B = null, k = null;
    if (['mul', 'add', 'sub'].includes(op)) { const pb = parseMatrix(values.B, 'matrix B'); if (pb.error) v.fail('B', pb.error); else B = pb.matrix; }
    if (op === 'scalar') k = v.frac('k', 'the scalar k');
    if (!v.ok()) return v.result();
    const A = pa.matrix;
    const [m, n] = dims(A);
    const steps = [{ title: 'Write the matrices', texLines: [`A = ${matrixTex(A)}`, ...(B ? [`B = ${matrixTex(B)}`] : [])] }];
    let result = null, final, answers = [];
    if (op === 'add' || op === 'sub') {
      const [p, q] = dims(B);
      if (p !== m || q !== n) return { ok: false, errors: [{ field: 'B', message: `A is ${m}×${n} but B is ${p}×${q}. Matrices must have the same size to be ${op === 'add' ? 'added' : 'subtracted'}.` }] };
      result = addM(A, B, op === 'add' ? 1 : -1);
      steps.push({ title: `${op === 'add' ? 'Add' : 'Subtract'} corresponding entries`, tex: `a_{ij} ${op === 'add' ? '+' : '-'} b_{ij}:\\quad ${matrixTex(result)}` });
    } else if (op === 'mul') {
      const [p, q] = dims(B);
      if (n !== p) return { ok: false, errors: [{ field: 'B', message: `A is ${m}×${n} and B is ${p}×${q}. For AB the number of columns of A (${n}) must equal the number of rows of B (${p}).` }] };
      result = mulM(A, B);
      steps.push({ title: 'Check the sizes', text: `(${m}×${n})(${p}×${q}): the inner sizes match, so AB exists and is ${m}×${q}.` });
      const c11 = A[0].map((a, j) => `(${a.toTex()})(${B[j][0].toTex()})`).join(' + ');
      steps.push({ title: 'Each entry is a row of A times a column of B', text: 'Entry (i, j) is the dot product of row i of A with column j of B. For example:', tex: `c_{11} = ${c11} = ${result[0][0].toTex()}` });
      steps.push({ title: 'Result', tex: `AB = ${matrixTex(result)}` });
    } else if (op === 'scalar') {
      result = scaleM(A, k);
      steps.push({ title: 'Multiply every entry by k', tex: `${k.toTex()}A = ${matrixTex(result)}` });
    } else if (op === 'transpose') {
      result = transpose(A);
      steps.push({ title: 'Swap rows and columns', text: 'Row i of A becomes column i of Aᵀ.', tex: `A^{T} = ${matrixTex(result)}` });
    } else {
      if (m !== n) return { ok: false, errors: [{ field: 'A', message: `A is ${m}×${n}. ${op === 'det' ? 'Determinants' : 'Inverses'} exist only for square matrices.` }] };
      const D = det(A);
      if (n <= 3) { const ds = detSteps(A); steps.push({ title: n === 3 ? 'Expand along the first row (cofactor expansion)' : 'Determinant', texLines: ds.lines }); }
      else steps.push({ title: 'Determinant by row reduction', text: 'Reduce A to upper-triangular form; the determinant is the product of the pivots, with a sign change for every row swap.', tex: `\\det A = ${D.toTex()}` });
      if (op === 'det') {
        final = { tex: `\\det A = ${D.toTex()}` };
        answers = [{ label: 'det(A)', value: D.toDecimal(8) || fmt(D.toNumber()), approx: !D.toDecimal(8), exactTex: D.isInt() ? undefined : D.toTex(), primary: true }, { label: 'Invertible?', value: D.isZero() ? 'No (det = 0)' : 'Yes (det ≠ 0)' }];
      } else {
        if (D.isZero()) {
          steps.push({ title: 'No inverse', text: 'The determinant is 0, so A is singular: its rows are linearly dependent and no inverse exists.' });
          return { ok: true, final: { text: 'A is singular (det A = 0), so A⁻¹ does not exist.' }, answers: [{ label: 'Inverse', value: 'Does not exist (det = 0)', primary: true }, { label: 'det(A)', value: '0' }], steps, formula: ['A^{-1} \\text{ exists} \\iff \\det A \\ne 0'], rounding: false };
        }
        const inv = inverse(A);
        steps.push({ title: 'Gauss–Jordan elimination on [A | I]', text: 'Row-reduce A to the identity; the same operations turn I into A⁻¹.', tex: matrixTex(A.map((r, i) => [...r, ...identity(n)[i]]), n) });
        inv.ops.slice(0, 25).forEach((o, i) => steps.push({ title: `Row operation ${i + 1}: ${o.text}`, texLines: [o.tex, o.matrix] }));
        if (inv.ops.length > 25) steps.push({ title: `… ${inv.ops.length - 25} more row operations`, text: 'Further operations continue in the same way until the left half is the identity.' });
        result = inv.inv;
        steps.push({ title: 'Read off the inverse', tex: `A^{-1} = ${matrixTex(result)}` });
        steps.push({ title: 'Check', text: 'Multiplying A by the result gives the identity matrix.', tex: `AA^{-1} = ${matrixTex(mulM(A, result))}` });
      }
    }
    if (result) {
      const label = { add: 'A + B', sub: 'A − B', mul: 'AB', scalar: 'kA', transpose: 'Aᵀ', inv: 'A⁻¹' }[op];
      const labelTex = { add: 'A + B', sub: 'A - B', mul: 'AB', scalar: 'kA', transpose: 'A^{T}', inv: 'A^{-1}' }[op];
      final = { tex: `${labelTex} = ${matrixTex(result)}` };
      answers = [{ label, valueTex: matrixTex(result), primary: true, copy: matrixText(result) }, { label: 'Size', value: `${result.length} × ${result[0].length}` }];
    }
    return {
      ok: true, final, answers, steps,
      formula: [op === 'mul' ? '(AB)_{ij} = \\sum_k a_{ik} b_{kj}' : op === 'det' || op === 'inv' ? '\\det\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix} = ad - bc \\qquad A^{-1} = \\frac{1}{\\det A}\\operatorname{adj}A' : '(A \\pm B)_{ij} = a_{ij} \\pm b_{ij}'],
      rounding: 'All entries are exact fractions.',
    };
  },
};
