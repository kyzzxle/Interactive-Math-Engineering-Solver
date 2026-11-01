/** Systems of 2 or 3 linear equations solved by elimination (Gauss–Jordan) with exact fractions. */
import { validator, fmt } from '../lib/calc-kit.js';
import { eliminate, readSystem, systemTex, equationText, VARS } from '../lib/linsys.js';
import { plot, windowAround } from '../lib/plot.js';

const row = (i) => ['x', 'y', 'z'].map((vn) => ({
  name: `e${i}${vn}`, label: `${vn}`, type: 'number', placeholder: '0', row: `r${i}`,
  ...(vn === 'z' ? { showWhen: { n: ['3'] } } : {}),
  ...(vn === 'x' && i === 3 ? { rowShowWhen: { n: ['3'] } } : {}),
})).concat([{ name: `e${i}r`, label: '= right side', type: 'number', placeholder: '0', row: `r${i}` }]);

export const calculator = {
  id: 'systems-of-linear-equations',
  fields: [
    { name: 'n', label: 'Number of unknowns', type: 'radio', options: [['2', 'Two (x, y)'], ['3', 'Three (x, y, z)']] },
    ...row(1), ...row(2), ...row(3),
  ],
  examples: [
    { label: '2x + 3y = 12, x − y = 1', values: { n: '2', e1x: '2', e1y: '3', e1r: '12', e2x: '1', e2y: '-1', e2r: '1' } },
    { label: '3 unknowns', values: { n: '3', e1x: '1', e1y: '1', e1z: '1', e1r: '6', e2x: '2', e2y: '-1', e2z: '1', e2r: '3', e3x: '1', e3y: '2', e3z: '-1', e3r: '2' } },
    { label: 'Dependent: infinitely many', values: { n: '2', e1x: '1', e1y: '2', e1r: '4', e2x: '2', e2y: '4', e2r: '8' } },
    { label: 'Inconsistent: no solution', values: { n: '3', e1x: '1', e1y: '1', e1z: '1', e1r: '1', e2x: '1', e2y: '1', e2z: '1', e2r: '2', e3x: '0', e3y: '1', e3z: '-1', e3r: '0' } },
  ],
  solve(values) {
    const v = validator(values);
    const n = values.n === '3' ? 3 : 2;
    const vars = VARS.slice(0, n);
    const { A, b } = readSystem(v, n, vars);
    if (!v.ok()) return v.result();
    for (let i = 0; i < n; i++) if (A[i].every((c) => c.isZero())) return { ok: false, errors: [{ field: `e${i + 1}x`, message: `Equation ${i + 1} has no unknowns (all coefficients are 0). Enter a real equation.` }] };
    const res = eliminate(A, b, vars);
    const steps = [{ title: 'Write the system', tex: systemTex(A, b, vars) }, ...res.steps];
    let visual;
    if (n === 2) {
      const f = (i) => (x) => (A[i][1].isZero() ? NaN : (b[i].toNumber() - A[i][0].toNumber() * x) / A[i][1].toNumber());
      const vl = (i, cls) => (A[i][1].isZero() ? [{ x: b[i].toNumber() / A[i][0].toNumber(), cls }] : []);
      const pt = res.status === 'unique' ? res.x.map((t) => t.toNumber()) : null;
      visual = {
        svg: plot({ x: windowAround(pt ? [pt[0], 0] : [0], 5), y: windowAround(pt ? [pt[1], 0] : [0], 5), equal: true, curves: [{ f: f(0), cls: 'd-line' }, { f: f(1), cls: 'd-line2' }], vlines: [...vl(0, 'd-line'), ...vl(1, 'd-line2')], points: pt ? [{ x: pt[0], y: pt[1], label: 'solution', cls: 'd-foot' }] : [], title: 'Each equation graphed as a line' }),
        legend: '<div class="legend"><span><i></i>Equation 1</span><span><i class="l2"></i>Equation 2</span></div>',
        caption: res.status === 'unique' ? 'The solution is where the two lines cross.' : res.status === 'none' ? 'Parallel lines never meet: no solution.' : 'The lines coincide: every point on them is a solution.',
      };
    }
    const answers = res.status === 'unique'
      ? res.x.map((val, j) => ({ label: vars[j], value: val.toDecimal(8) || fmt(val.toNumber()), approx: !val.toDecimal(8), exactTex: val.isInt() ? undefined : val.toTex(), primary: true, copy: `${vars[j]} = ${val}` }))
      : [{ label: 'Solution', value: res.status === 'none' ? 'No solution' : 'Infinitely many solutions', primary: true }];
    return {
      ok: true,
      final: res.status === 'unique' ? { tex: res.x.map((val, j) => `${vars[j]} = ${val.toTex()}`).join(', \\quad ') } : { text: res.finalText, texLines: res.finalTex },
      answers: [...answers, { label: 'System', value: A.map((r, i) => equationText(r, b[i], vars)).join('; ') }],
      visual, steps,
      formula: ['\\text{Elimination: } R_i \\to R_i - k R_j \\text{ never changes the solution set}'],
      notes: [{ kind: 'info', text: 'Elimination on the augmented matrix is the same as adding multiples of one equation to another — the method taught as "elimination" — written compactly.' }],
      rounding: 'All arithmetic is exact (fractions); decimals are shown only for convenience.',
    };
  },
};
