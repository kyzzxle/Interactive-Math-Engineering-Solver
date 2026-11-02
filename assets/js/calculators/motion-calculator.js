/**
 * Constant motion: speed = distance / time, or velocity = displacement / time.
 * Solves for any one of the three. Speed uses non-negative distances; velocity allows
 * signed displacement along a straight line (negative = the opposite direction).
 */
import { validator, answer, tx } from '../lib/calc-kit.js';
import { q, qp, rel } from '../lib/physics-kit.js';
import { plot } from '../lib/plot.js';
import { motionExplore, motionPractice } from '../explore/physics.js';

export const calculator = {
  id: 'motion-calculator',
  explore: motionExplore,
  practice: motionPractice,
  fields: [
    { name: 'kind', label: 'Quantity', type: 'radio', options: [['speed', 'Speed and distance'], ['velocity', 'Velocity and displacement']] },
    { name: 'find', label: 'Solve for', type: 'radio', options: [['v', 'Speed / velocity'], ['d', 'Distance'], ['t', 'Time']] },
    { name: 'd', label: 'Distance or displacement d', type: 'number', placeholder: 'e.g. 150', suffix: 'm', showWhen: { find: ['v', 't'] }, hint: 'For velocity, a negative displacement means motion in the negative direction.' },
    { name: 'v', label: 'Speed or velocity v', type: 'number', placeholder: 'e.g. 12', suffix: 'm/s', showWhen: { find: ['d', 't'] } },
    { name: 't', label: 'Time t', type: 'number', signed: false, placeholder: 'e.g. 20', suffix: 's', showWhen: { find: ['v', 'd'] } },
  ],
  examples: [
    { label: 'Runner: 400 m in 50 s', values: { kind: 'speed', find: 'v', d: '400', t: '50' } },
    { label: 'Car at 25 m/s for 2 minutes', values: { kind: 'speed', find: 'd', v: '25', t: '120' } },
    { label: 'Velocity −3 m/s, displacement −45 m', values: { kind: 'velocity', find: 't', d: '-45', v: '-3' } },
    { label: 'Impossible: moving away from the target', values: { kind: 'velocity', find: 't', d: '20', v: '-4' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const kind = values.kind === 'velocity' ? 'velocity' : 'speed';
    const find = ['v', 'd', 't'].includes(values.find) ? values.find : 'v';
    const signed = kind === 'velocity';
    const dName = signed ? 'the displacement' : 'the distance';
    const vName = signed ? 'the velocity' : 'the speed';
    const opts = (o) => ({ maxAbs: 1e12, ...(signed ? {} : { nonneg: true }), ...o });
    const d = find !== 'd' ? v.number('d', dName, opts()) : null;
    const vel = find !== 'v' ? v.number('v', vName, opts(find === 't' ? { nonzero: true } : {})) : null;
    const t = find !== 't' ? v.number('t', 'the time', { positive: true, maxAbs: 1e12 }) : null;
    if (!v.ok()) return v.result();
    const sym = signed ? 'v' : 'v';
    const known = [];
    let D = d, V = vel, T = t;
    const steps = [];
    if (find === 'v') {
      V = d / t;
      known.push(`d = ${q(d, 'm')}`, `t = ${q(t, 's')}`);
      steps.push({ title: 'Known values', tex: known.join(',\\quad ') });
      steps.push({ title: 'Formula', tex: `${sym} = \\frac{d}{t}` });
      steps.push({ title: 'Substitute and simplify', tex: `${sym} = \\frac{${q(d, 'm')}}{${q(t, 's')}} ${rel(V)} ${q(V, 'm/s')}` });
    } else if (find === 'd') {
      D = vel * t;
      known.push(`${sym} = ${q(vel, 'm/s')}`, `t = ${q(t, 's')}`);
      steps.push({ title: 'Known values', tex: known.join(',\\quad ') });
      steps.push({ title: 'Formula (rearranged)', tex: `d = ${sym}\\,t` });
      steps.push({ title: 'Substitute and simplify', tex: `d = ${qp(vel, 'm/s')} \\times ${q(t, 's')} ${rel(D)} ${q(D, 'm')}` });
    } else {
      if (signed && Math.sign(d) !== Math.sign(vel) && d !== 0) {
        return { ok: false, errors: [{ field: 'v', message: 'The displacement and velocity point in opposite directions, so the object moves away from that position and never reaches it. Give them the same sign.' }] };
      }
      T = d / vel;
      known.push(`d = ${q(d, 'm')}`, `${sym} = ${q(vel, 'm/s')}`);
      steps.push({ title: 'Known values', tex: known.join(',\\quad ') });
      steps.push({ title: 'Formula (rearranged)', tex: `t = \\frac{d}{${sym}}` });
      steps.push({ title: 'Substitute and simplify', tex: `t = \\frac{${q(d, 'm')}}{${q(vel, 'm/s')}} ${rel(T)} ${q(T, 's')}` });
    }
    if (!Number.isFinite(D) || !Number.isFinite(V) || !Number.isFinite(T) || Math.abs(D) > 1e300) return { ok: false, errors: [{ message: 'These values are too extreme to compute reliably.' }] };
    steps.push({ title: 'Convert to everyday units', texLines: [`${q(V, 'm/s')} \\times 3.6 ${rel(V * 3.6)} ${q(V * 3.6, 'km/h')}`, `${q(T, 's')} ${rel(T / 60)} ${q(T / 60, 'min')}`] });
    const label = { v: signed ? 'Velocity v' : 'Speed v', d: signed ? 'Displacement d' : 'Distance d', t: 'Time t' };
    const answers = [
      answer(label.v, V, { unit: 'm/s', primary: find === 'v' }),
      answer(label.d, D, { unit: 'm', primary: find === 'd' }),
      answer(label.t, T, { unit: 's', primary: find === 't' }),
      answer(`${signed ? 'Velocity' : 'Speed'} in km/h`, V * 3.6, { unit: 'km/h' }),
    ];
    const finalTex = { v: `${sym} ${rel(V)} ${q(V, 'm/s')}`, d: `d ${rel(D)} ${q(D, 'm')}`, t: `t ${rel(T)} ${q(T, 's')}` }[find];
    const Tm = Math.max(T, 1e-12);
    return {
      ok: true,
      final: { tex: finalTex },
      answers,
      visual: {
        svg: plot({ x: [0, Tm * 1.1], width: 380, height: 240, title: 'Position–time graph', curves: [{ f: (x) => (x <= Tm ? V * x : NaN) }], points: [{ x: Tm, y: D, label: `(${tx(T, 2)} s, ${tx(D, 2)} m)` }], xLabel: 't (s)', yLabel: 'x (m)' }),
        caption: `A straight position–time graph means constant ${signed ? 'velocity' : 'speed'}; its slope is ${signed ? 'v' : 'the speed'}.`,
      },
      formula: [`${sym} = \\frac{d}{t} \\qquad d = ${sym}\\,t \\qquad t = \\frac{d}{${sym}}`],
      steps,
      notes: [{ kind: 'info', text: `Assumes the ${signed ? 'velocity' : 'speed'} is constant (or that you want the average ${signed ? 'velocity' : 'speed'}) over the whole time interval.` }],
    };
  },
};
