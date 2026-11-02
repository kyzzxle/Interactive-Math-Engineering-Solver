/**
 * Uniform circular motion: an object moves around a circle of radius r at constant speed v.
 *   ω = v/r,  T = 2πr/v,  f = 1/T,  a_c = v²/r = ω²r (towards the centre),  F_c = m a_c
 * The speed can be given directly, as a period or as revolutions per minute.
 */
import { validator, answer, tx } from '../lib/calc-kit.js';
import { q, rel, svgWrap, arrowTo } from '../lib/physics-kit.js';
import { randInt } from '../lib/learn.js';

function circleSvg(theta, vLen = 70, aLen = 50) {
  const W = 340, H = 300, cx = 170, cy = 150, R = 100, r2 = (v) => Math.round(v * 10) / 10;
  const x = cx + R * Math.cos(theta), y = cy - R * Math.sin(theta);
  const tx_ = -Math.sin(theta), ty_ = -Math.cos(theta); // velocity direction (counter-clockwise, screen coords)
  return svgWrap(W, H, 'Object in uniform circular motion', `<circle cx="${cx}" cy="${cy}" r="${R}" class="d-line" style="fill:none;stroke-dasharray:4 4"/><line class="d-perp" x1="${cx}" y1="${cy}" x2="${r2(x)}" y2="${r2(y)}"/>${arrowTo(x, y, x + vLen * tx_, y + vLen * ty_, 'v', 'd-arrow')}${arrowTo(x, y, x + (aLen * (cx - x)) / R, y + (aLen * (cy - y)) / R, 'a', 'd-arrow2')}<circle cx="${r2(x)}" cy="${r2(y)}" r="9" class="d-point"/><circle cx="${cx}" cy="${cy}" r="3" class="d-point"/>`);
}

export const calculator = {
  id: 'circular-motion',
  explore: {
    title: 'Spin an object',
    intro: 'The velocity (green) always points along the circle; the acceleration (orange) always points to the centre. Double the speed and the centripetal acceleration quadruples.',
    controls: [
      { name: 'r', label: 'Radius r', min: 0.5, max: 5, step: 0.1, value: 2, unit: 'm' },
      { name: 'v', label: 'Speed v', min: 0.5, max: 10, step: 0.1, value: 4, unit: 'm/s' },
      { name: 't', label: 'Time', min: 0, max: 20, step: 0.02, value: 0, unit: 's' },
    ],
    animate: { control: 't', seconds: 20, loop: true },
    render({ r, v, t }) {
      const w = v / r, a = (v * v) / r;
      return {
        svg: circleSvg(w * t, 30 + 6 * v, 20 + Math.min(80, 2.5 * a)),
        readouts: [
          { label: 'Period', tex: `T = \\frac{2\\pi r}{v} \\approx ${q((2 * Math.PI * r) / v, 's', 3)}` },
          { label: 'Angular speed', tex: `\\omega = \\frac{v}{r} \\approx ${q(w, 'rad/s', 3)}` },
          { label: 'Centripetal acceleration', tex: `a_c = \\frac{v^2}{r} \\approx ${q(a, 'm/s²', 3)}`, tone: 'good' },
        ],
      };
    },
  },
  practice: {
    title: 'Car on a roundabout',
    generate(rand) {
      const m = randInt(rand, 800, 1800), v = randInt(rand, 5, 20), r = randInt(rand, 15, 60);
      return {
        prompt: `<p>A <strong>${m} kg</strong> car drives round a circular roundabout of radius <strong>${r} m</strong> at <strong>${v} m/s</strong>. Find the centripetal acceleration and the friction force needed.</p>`,
        answers: [{ label: 'Acceleration', value: (v * v) / r, unit: 'm/s²' }, { label: 'Force', value: (m * v * v) / r, unit: 'N' }],
        hint: 'a = v²/r points to the centre; friction must supply F = ma.',
        hintTex: 'a_c = \\frac{v^2}{r} \\qquad F_c = \\frac{m v^2}{r}',
        steps: [{ title: 'Acceleration', tex: `a_c = \\frac{${v}^2}{${r}} \\approx ${tx((v * v) / r, 4)}\\ \\text{m/s}^2` }, { title: 'Force', tex: `F_c = ${m} \\times ${tx((v * v) / r, 4)} \\approx ${tx((m * v * v) / r, 4)}\\ \\text{N}` }],
      };
    },
  },
  fields: [
    { name: 'r', label: 'Radius r', type: 'number', signed: false, placeholder: 'e.g. 2', suffix: 'm' },
    { name: 'given', label: 'Speed given as', type: 'radio', options: [['v', 'Speed v'], ['T', 'Period T'], ['rpm', 'Revolutions per minute']] },
    { name: 'val', label: 'Value', type: 'number', signed: false, placeholder: 'e.g. 4', hint: 'm/s for speed, seconds for the period, rev/min for rpm.' },
    { name: 'm', label: 'Mass m (optional)', type: 'number', signed: false, placeholder: 'e.g. 0.5', suffix: 'kg' },
  ],
  examples: [
    { label: 'Ball on a string: r = 1.2 m, v = 5 m/s, 0.3 kg', values: { r: '1.2', given: 'v', val: '5', m: '0.3' } },
    { label: 'Washing machine drum: r = 0.25 m, 1200 rpm', values: { r: '0.25', given: 'rpm', val: '1200', m: '' } },
    { label: 'Moon: r = 3.84×10⁸ m, T = 27.3 days', values: { r: '3.84e8', given: 'T', val: '2358720', m: '7.35e22' } },
    { label: 'Invalid: zero radius', values: { r: '0', given: 'v', val: '5', m: '' }, expectError: true },
  ],
  solve(values) {
    const v_ = validator(values);
    const r = v_.number('r', 'the radius', { positive: true, maxAbs: 1e12 });
    const given = ['v', 'T', 'rpm'].includes(values.given) ? values.given : 'v';
    const val = v_.number('val', given === 'v' ? 'the speed' : given === 'T' ? 'the period' : 'the rpm', { positive: true, maxAbs: 1e12 });
    const m = String(values.m ?? '').trim() === '' ? null : v_.number('m', 'the mass', { positive: true, maxAbs: 1e30 });
    if (!v_.ok()) return v_.result();
    let v, T;
    const steps = [{ title: 'Known values', tex: `r = ${q(r, 'm')},\\quad ${given === 'v' ? `v = ${q(val, 'm/s')}` : given === 'T' ? `T = ${q(val, 's')}` : `${tx(val)}\\ \\text{rev/min}`}` }];
    if (given === 'v') { v = val; T = (2 * Math.PI * r) / v; steps.push({ title: 'Period (one lap of length 2πr)', tex: `T = \\frac{2\\pi r}{v} = \\frac{2\\pi(${tx(r)})}{${tx(v)}} \\approx ${q(T, 's')}` }); }
    else {
      T = given === 'T' ? val : 60 / val;
      if (given === 'rpm') steps.push({ title: 'Period from rpm', tex: `T = \\frac{60}{${tx(val)}} ${rel(T)} ${q(T, 's')}` });
      v = (2 * Math.PI * r) / T;
      steps.push({ title: 'Speed (distance per lap ÷ time per lap)', tex: `v = \\frac{2\\pi r}{T} = \\frac{2\\pi(${tx(r)})}{${tx(T)}} \\approx ${q(v, 'm/s')}` });
    }
    const w = v / r, a = (v * v) / r;
    steps.push({ title: 'Angular speed and frequency', tex: `\\omega = \\frac{v}{r} \\approx ${q(w, 'rad/s')},\\quad f = \\frac{1}{T} \\approx ${q(1 / T, 'Hz')}` });
    steps.push({ title: 'Centripetal acceleration (towards the centre)', tex: `a_c = \\frac{v^2}{r} = \\frac{(${tx(v, 6)})^2}{${tx(r)}} \\approx ${q(a, 'm/s²')}` });
    const answers = [answer('Speed v', v, { unit: 'm/s', primary: given !== 'v', irrational: given !== 'v' }), answer('Period T', T, { unit: 's', irrational: given === 'v' }), answer('Angular speed ω', w, { unit: 'rad/s', irrational: true }), answer('Centripetal acceleration', a, { unit: 'm/s²', primary: true, irrational: given !== 'v' }), answer('In g (9.81 m/s²)', a / 9.81, { unit: 'g', irrational: true })];
    if (m !== null) { steps.push({ title: 'Centripetal force', tex: `F_c = m a_c = ${tx(m)} \\times ${tx(a, 6)} \\approx ${q(m * a, 'N')}` }); answers.push(answer('Centripetal force', m * a, { unit: 'N', primary: true, irrational: true })); }
    return {
      ok: true,
      final: { texLines: [`a_c \\approx ${q(a, 'm/s²')}${m !== null ? `,\\quad F_c \\approx ${q(m * a, 'N')}` : ''}`] },
      answers,
      visual: { svg: circleSvg(Math.PI / 5), caption: 'The velocity is tangent to the circle; the acceleration and the net force point to the centre.' },
      formula: ['v = \\frac{2\\pi r}{T} = \\omega r \\qquad a_c = \\frac{v^2}{r} = \\omega^2 r \\qquad F_c = m a_c'],
      steps,
      notes: [{ kind: 'info', text: 'Assumes constant speed on a circle. "Centripetal force" is not an extra force: it is the net inward force supplied by something real — tension, friction, gravity or a normal force.' }],
    };
  },
};
