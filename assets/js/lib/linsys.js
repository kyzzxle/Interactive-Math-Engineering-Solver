/** Shared presentation of linear-system solutions (used by the algebra and engineering calculators). */
import { Frac } from './fraction.js';
import { solveLinear, matrixTex } from './linalg.js';
import { linearTex, linearText } from './lines.js';

export const VARS = ['x', 'y', 'z', 'w'];

export function equationTex(row, rhs, vars) { return `${linearTex(row.map((c, j) => [c, vars[j]]))} = ${rhs.toTex()}`; }
export function equationText(row, rhs, vars) { return `${linearText(row.map((c, j) => [c, vars[j]]))} = ${rhs.toString()}`; }
export function systemTex(A, b, vars) {
  return `\\begin{cases} ${A.map((row, i) => equationTex(row, b[i], vars)).join(' \\\\ ')} \\end{cases}`;
}

/**
 * Gauss–Jordan elimination with one step per row operation.
 * Returns { status, x, steps, finalTex, answers, paramTex }.
 */
export function eliminate(A, b, vars) {
  const n = A[0].length;
  const sol = solveLinear(A, b);
  const steps = [];
  steps.push({ title: 'Write the augmented matrix [A | b]', text: 'Each row holds the coefficients of one equation; the last column holds the right-hand sides.', tex: matrixTex(A.map((r, i) => [...r, b[i]]), n) });
  sol.ops.forEach((op, i) => steps.push({ title: `Row operation ${i + 1}: ${op.text}`, texLines: [op.tex, op.matrix] }));
  if (sol.status === 'none') {
    const bad = sol.rref.find((row) => row.slice(0, n).every((v) => v.isZero()) && !row[n].isZero());
    steps.push({ title: 'Read off the result', text: `One row became 0 = ${bad[n]}, which is impossible. The system is inconsistent: no solution exists.` });
    return { status: 'none', steps, finalText: 'No solution: the equations contradict each other (inconsistent system).' };
  }
  if (sol.status === 'infinite') {
    const free = sol.freeVars;
    const params = free.map((j, k) => ({ j, name: ['t', 's', 'u'][k] }));
    const lines = [];
    sol.pivots.forEach((pc, i) => {
      const row = sol.rref[i];
      const terms = [[row[n], '']];
      for (const { j, name } of params) if (!row[j].isZero()) terms.push([row[j].neg(), name]);
      lines.push(`${vars[pc]} = ${linearTex(terms)}`);
    });
    params.forEach(({ j, name }) => lines.push(`${vars[j]} = ${name}`));
    steps.push({ title: 'Read off the result', text: `There are fewer pivots than unknowns, so ${params.map((p) => vars[p.j]).join(', ')} ${params.length === 1 ? 'is a free variable' : 'are free variables'}. Writing ${params.length === 1 ? 'it' : 'them'} as a parameter gives infinitely many solutions:`, texLines: lines });
    return { status: 'infinite', steps, finalTex: lines, finalText: `Infinitely many solutions (${params.length} free parameter${params.length > 1 ? 's' : ''}).` };
  }
  const x = sol.x;
  steps.push({ title: 'Read the solution from the reduced matrix', text: 'The left part is now the identity matrix, so the last column is the solution.', texLines: x.map((v, j) => `${vars[j]} = ${v.toTex()}`) });
  steps.push({ title: 'Check in every original equation', texLines: A.map((row, i) => `${row.map((c, j) => `${c.sign() < 0 || j === 0 ? '' : '+ '}${c.toTex()}(${x[j].toTex()})`).join(' ')} = ${row.reduce((s, c, j) => s.add(c.mul(x[j])), new Frac(0n)).toTex()} \\;\\checkmark`) });
  return { status: 'unique', x, steps };
}

/** Parse coefficient fields e{i}{var} and e{i}r from a validator for an n×n system. */
export function readSystem(v, n, varNames) {
  const A = [], b = [];
  for (let i = 1; i <= n; i++) {
    const row = [];
    for (let j = 0; j < n; j++) row.push(v.frac(`e${i}${varNames[j]}`, `the ${varNames[j]}-coefficient in equation ${i}`));
    A.push(row);
    b.push(v.frac(`e${i}r`, `the right-hand side of equation ${i}`));
  }
  return { A, b };
}
