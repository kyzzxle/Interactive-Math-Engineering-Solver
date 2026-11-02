/**
 * Newton's second law for motion along one line: F_net = m a. Solves for the net force,
 * the mass or the acceleration. Forces and accelerations are signed (+ = chosen positive
 * direction); mass must be positive.
 */
import { validator, answer } from '../lib/calc-kit.js';
import { q, qp, rel, fmtQ, blockDiagram, G_EARTH } from '../lib/physics-kit.js';
import { newtonExplore, newtonPractice } from '../explore/physics.js';

export const calculator = {
  id: 'newtons-second-law',
  explore: newtonExplore,
  practice: newtonPractice,
  fields: [
    { name: 'find', label: 'Solve for', type: 'radio', options: [['F', 'Net force F'], ['m', 'Mass m'], ['a', 'Acceleration a']] },
    { name: 'F', label: 'Net force F', type: 'number', placeholder: 'e.g. 120', suffix: 'N', showWhen: { find: ['m', 'a'] }, hint: 'The resultant of all forces: add forces in the positive direction, subtract the others.' },
    { name: 'm', label: 'Mass m', type: 'number', signed: false, placeholder: 'e.g. 40', suffix: 'kg', showWhen: { find: ['F', 'a'] } },
    { name: 'a', label: 'Acceleration a', type: 'number', placeholder: 'e.g. 3', suffix: 'm/s²', showWhen: { find: ['F', 'm'] } },
  ],
  examples: [
    { label: '1200 kg car accelerating at 2.5 m/s²', values: { find: 'F', m: '1200', a: '2.5' } },
    { label: '150 N on a 60 kg crate', values: { find: 'a', F: '150', m: '60' } },
    { label: 'Mass from F = 24 N, a = 8 m/s²', values: { find: 'm', F: '24', a: '8' } },
    { label: 'Braking force: 900 kg, a = −6 m/s²', values: { find: 'F', m: '900', a: '-6' } },
    { label: 'Impossible: force and acceleration opposite', values: { find: 'm', F: '50', a: '-2' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const find = ['F', 'm', 'a'].includes(values.find) ? values.find : 'F';
    const F = find !== 'F' ? v.number('F', 'the net force', { maxAbs: 1e12 }) : null;
    const m = find !== 'm' ? v.number('m', 'the mass', { positive: true, maxAbs: 1e12 }) : null;
    const a = find !== 'a' ? v.number('a', 'the acceleration', { maxAbs: 1e9, ...(find === 'm' ? { nonzero: true } : {}) }) : null;
    if (!v.ok()) return v.result();
    let FF = F, mm = m, aa = a;
    const steps = [];
    if (find === 'F') {
      FF = m * a;
      steps.push({ title: 'Known values', tex: `m = ${q(m, 'kg')},\\quad a = ${q(a, 'm/s²')}` });
      steps.push({ title: 'Formula', tex: 'F_{\\text{net}} = m\\,a' });
      steps.push({ title: 'Substitute and simplify', tex: `F_{\\text{net}} = ${q(m, 'kg')} \\times ${qp(a, 'm/s²')} ${rel(FF)} ${q(FF, 'N')}` });
    } else if (find === 'a') {
      aa = F / m;
      steps.push({ title: 'Known values', tex: `F_{\\text{net}} = ${q(F, 'N')},\\quad m = ${q(m, 'kg')}` });
      steps.push({ title: 'Formula (rearranged)', tex: 'a = \\frac{F_{\\text{net}}}{m}' });
      steps.push({ title: 'Substitute and simplify', tex: `a = \\frac{${q(F, 'N')}}{${q(m, 'kg')}} ${rel(aa)} ${q(aa, 'm/s²')}` });
    } else {
      if (F === 0 || Math.sign(F) !== Math.sign(a)) return { ok: false, errors: [{ field: ['F', 'a'], message: F === 0 ? 'A zero net force gives zero acceleration for any mass, so the mass cannot be found. Check the values.' : 'The net force and the acceleration must point the same way (have the same sign); otherwise the mass would be negative.' }] };
      mm = F / a;
      steps.push({ title: 'Known values', tex: `F_{\\text{net}} = ${q(F, 'N')},\\quad a = ${q(a, 'm/s²')}` });
      steps.push({ title: 'Formula (rearranged)', tex: 'm = \\frac{F_{\\text{net}}}{a}' });
      steps.push({ title: 'Substitute and simplify', tex: `m = \\frac{${q(F, 'N')}}{${q(a, 'm/s²')}} ${rel(mm)} ${q(mm, 'kg')}` });
    }
    if (![FF, mm, aa].every(Number.isFinite) || Math.abs(FF) > 1e300) return { ok: false, errors: [{ message: 'These values are too extreme to compute reliably.' }] };
    const W = mm * G_EARTH;
    steps.push({ title: 'Units check', tex: '1\\,\\text{N} = 1\\,\\text{kg}\\cdot\\text{m/s}^2' });
    const answers = [
      answer('Net force F', FF, { unit: 'N', primary: find === 'F' }),
      answer('Mass m', mm, { unit: 'kg', primary: find === 'm' }),
      answer('Acceleration a', aa, { unit: 'm/s²', primary: find === 'a' }),
      answer('Weight on Earth (mg)', W, { unit: 'N' }),
    ];
    const finalTex = { F: `F_{\\text{net}} ${rel(FF)} ${q(FF, 'N')}`, m: `m ${rel(mm)} ${q(mm, 'kg')}`, a: `a ${rel(aa)} ${q(aa, 'm/s²')}` }[find];
    return {
      ok: true,
      final: { tex: finalTex },
      answers,
      visual: { svg: blockDiagram({ forces: [{ value: FF, label: `F = ${fmtQ(FF, 'N', 2)}` }], accel: aa, mass: `m = ${fmtQ(mm, 'kg', 2)}`, title: 'Free-body diagram (horizontal forces)' }), caption: 'The acceleration always points the same way as the net force.' },
      formula: ['F_{\\text{net}} = m\\,a'],
      steps,
      notes: [{ kind: 'info', text: 'F is the net (resultant) force. If several forces act, add them with signs first. Assumes constant mass and speeds far below the speed of light.' }],
    };
  },
};
