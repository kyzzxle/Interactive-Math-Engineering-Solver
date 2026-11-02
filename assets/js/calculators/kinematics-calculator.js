/**
 * Constant-acceleration (SUVAT) solver. Enter any three of u, v, a, t, s and the other two
 * are found with the equation that does not contain the quantity you are not interested in:
 *   v = u + at,  s = ut + ½at²,  v² = u² + 2as,  s = ½(u + v)t,  s = vt − ½at².
 * Some combinations have two valid times (e.g. a ball passing the same height going up and
 * coming down); both are shown.
 */
import { answer, tx, fmt } from '../lib/calc-kit.js';
import { q, qp, rel, readOptionalNumbers } from '../lib/physics-kit.js';
import { plot } from '../lib/plot.js';
import { kinematicsExplore, kinematicsPractice } from '../explore/physics.js';

const NAMES = { u: 'initial velocity u', v: 'final velocity v', a: 'acceleration a', t: 'time t', s: 'displacement s' };
const UNITS = { u: 'm/s', v: 'm/s', a: 'm/s²', t: 's', s: 'm' };
const EQ = {
  1: 'v = u + at',
  2: 's = ut + \\tfrac{1}{2}at^2',
  3: 'v^2 = u^2 + 2as',
  4: 's = \\tfrac{1}{2}(u + v)\\,t',
  5: 's = vt - \\tfrac{1}{2}at^2',
};
const fail = (field, message) => ({ ok: false, errors: [{ field, message }] });
const positiveRoots = (A, B, C) => {
  // roots of A t² + B t + C = 0 with t > 0, smallest first
  let disc = B * B - 4 * A * C;
  const tol = 1e-10 * Math.max(B * B, Math.abs(4 * A * C), 1e-300);
  if (disc < -tol) return null;
  if (Math.abs(disc) <= tol) disc = 0; // a repeated root, not two nearly equal ones
  const sq = Math.sqrt(disc);
  const r = [(-B - sq) / (2 * A), (-B + sq) / (2 * A)].filter((x) => x > 1e-12);
  return [...new Set(r.map((x) => +x.toPrecision(14)))].sort((x, y) => x - y);
};

export const calculator = {
  id: 'kinematics-calculator',
  explore: kinematicsExplore,
  practice: kinematicsPractice,
  fields: [
    { name: 'u', label: 'Initial velocity u', type: 'number', placeholder: 'unknown', suffix: 'm/s', row: 'uv' },
    { name: 'v', label: 'Final velocity v', type: 'number', placeholder: 'unknown', suffix: 'm/s', row: 'uv' },
    { name: 'a', label: 'Acceleration a', type: 'number', placeholder: 'unknown', suffix: 'm/s²', row: 'at' },
    { name: 't', label: 'Time t', type: 'number', signed: false, placeholder: 'unknown', suffix: 's', row: 'at' },
    { name: 's', label: 'Displacement s', type: 'number', placeholder: 'unknown', suffix: 'm', hint: 'Enter exactly three values and leave two blank. Choose one direction as positive; values in the other direction are negative (for example g = −9.81 m/s² when up is positive).' },
  ],
  examples: [
    { label: 'Car: 0 → 27 m/s in 9 s', values: { u: '0', v: '27', a: '', t: '9', s: '' } },
    { label: 'Braking: 20 m/s, a = −4 m/s², to rest', values: { u: '20', v: '0', a: '-4', t: '', s: '' } },
    { label: 'Ball thrown up at 15 m/s reaches 10 m', values: { u: '15', v: '', a: '-9.81', t: '', s: '10' } },
    { label: 'Dropped from rest, falls 45 m', values: { u: '0', v: '', a: '9.81', t: '', s: '45' } },
    { label: 'Impossible: never reaches 20 m', values: { u: '10', v: '', a: '-9.81', t: '', s: '20' }, expectError: true },
  ],
  solve(values) {
    const errors = [];
    const k = readOptionalNumbers(values, {
      u: { label: 'the initial velocity', max: 1e8 }, v: { label: 'the final velocity', max: 1e8 }, a: { label: 'the acceleration', max: 1e8 },
      t: { label: 'the time', positive: true, max: 1e8 }, s: { label: 'the displacement', max: 1e12 },
    }, errors);
    if (errors.length) return { ok: false, errors };
    const given = Object.keys(NAMES).filter((n) => k[n] !== null);
    const missing = Object.keys(NAMES).filter((n) => k[n] === null);
    if (given.length !== 3) {
      return { ok: false, errors: [{ field: given.length > 3 ? given : missing, message: given.length > 3 ? `You entered ${given.length} values. Enter exactly three and leave the other two blank, so the problem is not over-determined.` : `Enter exactly three of u, v, a, t and s (you entered ${given.length}).` }] };
    }
    const { u, v, a, t, s } = k;
    const key = missing.join('');
    const steps = [
      { title: 'Known values', tex: given.map((n) => `${n} = ${q(k[n], UNITS[n])}`).join(',\\quad ') },
      { title: 'Unknowns', text: `Find ${missing.map((n) => NAMES[n]).join(' and ')}. Pick equations that contain only one unknown at a time.` },
    ];
    const sols = []; // each: complete { u, v, a, t, s }
    const use = (n, why) => steps.push({ title: `Use equation (${n}) — ${why}`, tex: EQ[n] });
    switch (key) {
      case 'vs': { // know u, a, t
        use(1, 'it has no s');
        const V = u + a * t; steps.push({ title: 'Final velocity', tex: `v = ${q(u, 'm/s')} + ${qp(a, 'm/s²')}(${q(t, 's')}) ${rel(V)} ${q(V, 'm/s')}` });
        use(2, 'it has no v');
        const S = u * t + 0.5 * a * t * t; steps.push({ title: 'Displacement', tex: `s = ${qp(u, 'm/s')}(${q(t, 's')}) + \\tfrac{1}{2}${qp(a, 'm/s²')}(${q(t, 's')})^2 ${rel(S)} ${q(S, 'm')}` });
        sols.push({ u, v: V, a, t, s: S });
        break;
      }
      case 'as': { // know u, v, t
        use(1, 'solve for a');
        const A = (v - u) / t; steps.push({ title: 'Acceleration', tex: `a = \\frac{v - u}{t} = \\frac{${q(v, 'm/s')} - ${qp(u, 'm/s')}}{${q(t, 's')}} ${rel(A)} ${q(A, 'm/s²')}` });
        use(4, 'it has no a');
        const S = 0.5 * (u + v) * t; steps.push({ title: 'Displacement', tex: `s = \\tfrac{1}{2}(${q(u, 'm/s')} + ${qp(v, 'm/s')})(${q(t, 's')}) ${rel(S)} ${q(S, 'm')}` });
        sols.push({ u, v, a: A, t, s: S });
        break;
      }
      case 'ts': { // know u, v, a
        if (a === 0) return fail(['a', 'v'], u === v ? 'With zero acceleration the velocity never changes, so u = v holds at every time: t and s cannot be determined. Enter the time or the displacement instead.' : 'With zero acceleration the velocity cannot change from u to v. Check the values.');
        use(1, 'solve for t');
        const T = (v - u) / a;
        if (!(T > 0)) return fail('a', `With this acceleration the velocity would have been ${tx(v, 4)} m/s ${tx(-T, 4)} s in the past, not in the future. Check the sign of a (it must point from u towards v).`);
        steps.push({ title: 'Time', tex: `t = \\frac{v - u}{a} = \\frac{${q(v, 'm/s')} - ${qp(u, 'm/s')}}{${q(a, 'm/s²')}} ${rel(T)} ${q(T, 's')}` });
        use(3, 'it has no t');
        const S = (v * v - u * u) / (2 * a); steps.push({ title: 'Displacement', tex: `s = \\frac{v^2 - u^2}{2a} = \\frac{(${q(v, 'm/s')})^2 - (${q(u, 'm/s')})^2}{2${qp(a, 'm/s²')}} ${rel(S)} ${q(S, 'm')}` });
        sols.push({ u, v, a, t: T, s: S });
        break;
      }
      case 'vt': { // know u, a, s
        use(2, 'it has no v, and gives t');
        let ts;
        if (a === 0) {
          if (u === 0) return fail('u', 'With u = 0 and a = 0 the object never moves, so it cannot reach that displacement.');
          ts = s / u > 0 ? [s / u] : [];
          steps.push({ title: 'With a = 0 the equation is linear', tex: `t = \\frac{s}{u} = \\frac{${q(s, 'm')}}{${q(u, 'm/s')}}` });
        } else {
          ts = positiveRoots(0.5 * a, u, -s);
          if (ts === null) return fail('s', `The object never reaches s = ${tx(s, 4)} m: its displacement turns back at ${tx(-u * u / (2 * a), 4)} m. Check the values or the sign convention.`);
          steps.push({ title: 'Rearrange into a quadratic in t', tex: `\\tfrac{1}{2}${qp(a, '')}\\,t^2 + ${qp(u, '')}\\,t - ${qp(s, '')} = 0` });
          steps.push({ title: 'Quadratic formula (keep positive times)', tex: `t = \\frac{-u \\pm \\sqrt{u^2 + 2as}}{a} \\Rightarrow ${ts.length ? ts.map((x) => `t ${rel(x)} ${q(x, 's')}`).join(' \\text{ or } ') : '\\text{no positive solution}'}` });
        }
        if (!ts.length) return fail('s', 'There is no positive time at which the object has that displacement. Check the signs of u, a and s.');
        use(1, 'final velocity at each time');
        for (const T of ts) { const V = u + a * T; sols.push({ u, v: V, a, t: T, s }); steps.push({ title: `At t ≈ ${tx(T, 4)} s`, tex: `v = ${q(u, 'm/s')} + ${qp(a, 'm/s²')}(${q(T, 's')}) ${rel(V)} ${q(V, 'm/s')}` }); }
        break;
      }
      case 'ut': { // know v, a, s
        use(5, 'it has no u, and gives t');
        let ts;
        if (a === 0) {
          if (v === 0) return fail('v', 'With v = 0 and a = 0 the object is at rest, so it cannot have moved that far.');
          ts = s / v > 0 ? [s / v] : [];
        } else {
          ts = positiveRoots(0.5 * a, -v, s);
          if (ts === null) return fail('s', 'No starting velocity gives these values: v² − 2as would be negative. Check the signs.');
          steps.push({ title: 'Rearrange into a quadratic in t', tex: `\\tfrac{1}{2}${qp(a, '')}\\,t^2 - ${qp(v, '')}\\,t + ${qp(s, '')} = 0` });
        }
        if (!ts.length) return fail('s', 'There is no positive time that fits these values. Check the signs of v, a and s.');
        steps.push({ title: 'Positive solutions', tex: ts.map((x) => `t ${rel(x)} ${q(x, 's')}`).join(' \\text{ or } ') });
        use(1, 'initial velocity u = v − at');
        for (const T of ts) { const U = v - a * T; sols.push({ u: U, v, a, t: T, s }); steps.push({ title: `At t ≈ ${tx(T, 4)} s`, tex: `u = ${q(v, 'm/s')} - ${qp(a, 'm/s²')}(${q(T, 's')}) ${rel(U)} ${q(U, 'm/s')}` }); }
        break;
      }
      case 'us': { // know v, a, t
        use(1, 'solve for u');
        const U = v - a * t; steps.push({ title: 'Initial velocity', tex: `u = v - at = ${q(v, 'm/s')} - ${qp(a, 'm/s²')}(${q(t, 's')}) ${rel(U)} ${q(U, 'm/s')}` });
        use(5, 'it has no u');
        const S = v * t - 0.5 * a * t * t; steps.push({ title: 'Displacement', tex: `s = ${qp(v, 'm/s')}(${q(t, 's')}) - \\tfrac{1}{2}${qp(a, 'm/s²')}(${q(t, 's')})^2 ${rel(S)} ${q(S, 'm')}` });
        sols.push({ u: U, v, a, t, s: S });
        break;
      }
      case 'ua': { // know v, t, s
        use(4, 'it has no a');
        const U = (2 * s) / t - v; steps.push({ title: 'Initial velocity', tex: `u = \\frac{2s}{t} - v = \\frac{2${qp(s, 'm')}}{${q(t, 's')}} - ${qp(v, 'm/s')} ${rel(U)} ${q(U, 'm/s')}` });
        use(1, 'solve for a');
        const A = (v - U) / t; steps.push({ title: 'Acceleration', tex: `a = \\frac{v - u}{t} ${rel(A)} ${q(A, 'm/s²')}` });
        sols.push({ u: U, v, a: A, t, s });
        break;
      }
      case 'va': { // know u, t, s
        use(2, 'it has no v');
        const A = (2 * (s - u * t)) / (t * t); steps.push({ title: 'Acceleration', tex: `a = \\frac{2(s - ut)}{t^2} = \\frac{2(${q(s, 'm')} - ${qp(u, 'm/s')}\\cdot ${q(t, 's')})}{(${q(t, 's')})^2} ${rel(A)} ${q(A, 'm/s²')}` });
        use(4, 'solve for v');
        const V = (2 * s) / t - u; steps.push({ title: 'Final velocity', tex: `v = \\frac{2s}{t} - u ${rel(V)} ${q(V, 'm/s')}` });
        sols.push({ u, v: V, a: A, t, s });
        break;
      }
      case 'at': { // know u, v, s
        if (u + v === 0) return fail(['u', 'v'], s === 0 ? 'With u = −v and s = 0 the object returns to its start, but the time cannot be found without the acceleration. Enter a or t instead.' : 'With u = −v the average velocity is 0, so the displacement after any time is 0, not the value given. Check the values.');
        use(4, 'it has no a');
        const T = (2 * s) / (u + v);
        if (!(T > 0)) return fail('s', 'This gives a time that is not positive: the average velocity (u + v)/2 and the displacement s must have the same sign.');
        steps.push({ title: 'Time', tex: `t = \\frac{2s}{u + v} = \\frac{2${qp(s, 'm')}}{${q(u, 'm/s')} + ${qp(v, 'm/s')}} ${rel(T)} ${q(T, 's')}` });
        use(3, 'solve for a');
        const A = (v * v - u * u) / (2 * s); steps.push({ title: 'Acceleration', tex: `a = \\frac{v^2 - u^2}{2s} ${rel(A)} ${q(A, 'm/s²')}` });
        sols.push({ u, v, a: A, t: T, s });
        break;
      }
      case 'uv': { // know a, t, s
        use(2, 'solve for u');
        const U = s / t - 0.5 * a * t; steps.push({ title: 'Initial velocity', tex: `u = \\frac{s}{t} - \\tfrac{1}{2}at ${rel(U)} ${q(U, 'm/s')}` });
        use(1, 'solve for v');
        const V = U + a * t; steps.push({ title: 'Final velocity', tex: `v = u + at ${rel(V)} ${q(V, 'm/s')}` });
        sols.push({ u: U, v: V, a, t, s });
        break;
      }
      default:
        return fail(null, 'Enter exactly three of u, v, a, t and s.');
    }
    if (sols.some((x) => Object.values(x).some((y) => !Number.isFinite(y) || Math.abs(y) > 1e200))) return fail(null, 'These values are too extreme to compute reliably.');
    // Remove floating-point noise such as u = −1.8 × 10⁻¹⁵ when the true value is 0.
    const scale = Math.max(...given.map((n) => Math.abs(k[n])), 1e-300);
    for (const x of sols) for (const n of Object.keys(x)) if (Math.abs(x[n]) < scale * 1e-12) x[n] = 0;
    const S1 = sols[0];
    const answers = Object.keys(NAMES).map((n) => answer(`${NAMES[n].charAt(0).toUpperCase()}${NAMES[n].slice(1)}${given.includes(n) ? ' (given)' : ''}`, S1[n], { unit: UNITS[n], primary: missing.includes(n) }));
    const tables = sols.length > 1 ? [{ caption: 'Both solutions', headers: ['Solution', 'u (m/s)', 'v (m/s)', 'a (m/s²)', 't (s)', 's (m)'], rows: sols.map((x, i) => [String(i + 1), ...['u', 'v', 'a', 't', 's'].map((n) => fmt(x[n], 4))]) }] : [];
    const notes = [{ kind: 'info', text: 'Assumes the acceleration is constant during the whole time interval and the motion is along one straight line.' }];
    if (sols.length > 1) notes.unshift({ kind: 'warn', text: `Two times fit: t ≈ ${tx(sols[0].t, 4)} s and t ≈ ${tx(sols[1].t, 4)} s (for example once on the way up and again on the way down). The cards show the first; the table shows both.` });
    const T = S1.t;
    return {
      ok: true,
      final: { texLines: missing.map((n) => `${n} ${rel(S1[n])} ${q(S1[n], UNITS[n])}`) },
      answers,
      visual: {
        svg: plot({ x: [0, T * 1.08], width: 380, height: 240, title: 'Velocity–time graph', curves: [{ f: (x) => (x <= T ? S1.u + S1.a * x : NaN) }], shade: [{ f: (x) => S1.u + S1.a * x, a: 0, b: T }], points: [{ x: 0, y: S1.u, label: 'u' }, { x: T, y: S1.v, label: 'v' }], xLabel: 't (s)', yLabel: 'v (m/s)' }),
        caption: 'The slope of the velocity–time graph is the acceleration; the shaded area (above minus below the axis) is the displacement.',
      },
      formula: [`${EQ[1]} \\qquad ${EQ[2]} \\qquad ${EQ[3]}`, `${EQ[4]} \\qquad ${EQ[5]}`],
      steps,
      tables,
      notes,
    };
  },
};
