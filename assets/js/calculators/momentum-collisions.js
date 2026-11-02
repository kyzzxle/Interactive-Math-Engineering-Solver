/**
 * One-dimensional collisions of two bodies. Momentum is always conserved; the coefficient of
 * restitution e decides how much kinetic energy survives:
 *   v₁′ = (m₁v₁ + m₂v₂ + m₂e(v₂ − v₁)) / (m₁ + m₂),  v₂′ = (m₁v₁ + m₂v₂ + m₁e(v₁ − v₂)) / (m₁ + m₂)
 *   e = 1 elastic, e = 0 perfectly inelastic (they stick together), 0 < e < 1 partly elastic.
 */
import { validator, answer, tx, fmt } from '../lib/calc-kit.js';
import { q, rel, energyBars, svgWrap, arrow } from '../lib/physics-kit.js';
import { randInt, pick } from '../lib/learn.js';

export function collide(m1, v1, m2, v2, e) {
  const M = m1 + m2, p = m1 * v1 + m2 * v2;
  return { u1: (p + m2 * e * (v2 - v1)) / M, u2: (p + m1 * e * (v1 - v2)) / M, p };
}
const KE = (m, v) => 0.5 * m * v * v;

function track(x1, x2, m1, m2, v1, v2) {
  const W = 400, H = 120, X = (x) => 20 + ((x + 10) / 20) * (W - 40);
  const s1 = 18 + 6 * Math.cbrt(m1), s2 = 18 + 6 * Math.cbrt(m2);
  const body = [
    `<line class="d-ground" x1="10" y1="${H - 30}" x2="${W - 10}" y2="${H - 30}"/>`,
    `<rect class="d-body" x="${X(x1) - s1}" y="${H - 30 - s1}" width="${s1}" height="${s1}" rx="3"/>`,
    `<rect class="d-body" style="fill:color-mix(in srgb, var(--accent-bright) 25%, transparent);stroke:var(--accent-bright)" x="${X(x2)}" y="${H - 30 - s2}" width="${s2}" height="${s2}" rx="3"/>`,
    `<text class="d-label" x="${X(x1) - s1 / 2}" y="${H - 34 - s1}" text-anchor="middle">1</text><text class="d-label" x="${X(x2) + s2 / 2}" y="${H - 34 - s2}" text-anchor="middle">2</text>`,
    Math.abs(v1) > 0.05 ? arrow(X(x1) - s1 / 2, H - 12, X(x1) - s1 / 2 + 10 * v1, '', 'd-arrow') : '',
    Math.abs(v2) > 0.05 ? arrow(X(x2) + s2 / 2, H - 12, X(x2) + s2 / 2 + 10 * v2, '', 'd-arrow2') : '',
  ];
  return svgWrap(W, H, 'Two carts on a track', body.join(''));
}

export const calculator = {
  id: 'momentum-collisions',
  explore: {
    title: 'Crash two carts',
    intro: 'Press Play. The carts move, collide at the centre and separate (or stick). Try e = 1 with equal masses: the carts swap velocities.',
    controls: [
      { name: 'm1', label: 'Mass of cart 1', min: 0.5, max: 10, step: 0.5, value: 2, unit: 'kg' },
      { name: 'v1', label: 'Velocity of cart 1', min: 0, max: 6, step: 0.5, value: 4, unit: 'm/s' },
      { name: 'm2', label: 'Mass of cart 2', min: 0.5, max: 10, step: 0.5, value: 4, unit: 'kg' },
      { name: 'v2', label: 'Velocity of cart 2', min: -6, max: 0, step: 0.5, value: -1, unit: 'm/s' },
      { name: 'e', label: 'Restitution e (0 = stick, 1 = elastic)', min: 0, max: 1, step: 0.05, value: 1 },
      { name: 't', label: 'Time', min: -2, max: 2, step: 0.01, value: -2, unit: 's' },
    ],
    animate: { control: 't', seconds: 4 },
    presets: [{ label: 'Equal masses, elastic', values: { m1: 3, m2: 3, v1: 4, v2: 0, e: 1, t: -2 } }, { label: 'Sticky (e = 0)', values: { e: 0, t: -2 } }],
    render({ m1, v1, m2, v2, e, t }) {
      const { u1, u2 } = collide(m1, v1, m2, v2, e);
      const x1 = t < 0 ? v1 * t : u1 * t, x2 = t < 0 ? v2 * t : u2 * t;
      const before = KE(m1, v1) + KE(m2, v2), after = KE(m1, u1) + KE(m2, u2);
      return {
        svg: track(x1, x2, m1, m2, t < 0 ? v1 : u1, t < 0 ? v2 : u2),
        readouts: [
          { label: 'Velocities after', tex: `v_1' \\approx ${tx(u1, 3)},\\ v_2' \\approx ${tx(u2, 3)}\\ \\text{m/s}`, tone: 'good' },
          { label: 'Momentum (conserved)', tex: `p = ${tx(m1 * v1 + m2 * v2, 3)}\\ \\text{kg m/s}` },
          { label: 'Kinetic energy', tex: `${tx(before, 2)} \\to ${tx(after, 2)}\\ \\text{J}` },
        ],
        note: t < 0 ? 'Before the collision.' : 'After the collision.',
      };
    },
  },
  practice: {
    title: 'Sticky collision',
    generate(rand) {
      const m1 = randInt(rand, 1, 10), m2 = randInt(rand, 1, 10), v1 = randInt(rand, 2, 12), v2 = pick(rand, [0, 0, -1, -2, 1]);
      const vf = (m1 * v1 + m2 * v2) / (m1 + m2);
      return {
        prompt: `<p>A <strong>${m1} kg</strong> cart moving at <strong>${v1} m/s</strong> hits a <strong>${m2} kg</strong> cart moving at <strong>${v2} m/s</strong>, and they stick together. Find their common velocity and the kinetic energy lost.</p>`,
        answers: [{ label: 'Velocity', value: vf, unit: 'm/s' }, { label: 'KE lost', value: KE(m1, v1) + KE(m2, v2) - KE(m1 + m2, vf), unit: 'J' }],
        hint: 'Momentum before = momentum after, with one combined mass after. Then compare ½mv² before and after.',
        hintTex: 'm_1 v_1 + m_2 v_2 = (m_1 + m_2) v',
        steps: [
          { title: 'Conservation of momentum', tex: `${m1}(${v1}) + ${m2}(${v2}) = ${m1 + m2}\\,v \\Rightarrow v = ${tx(vf, 4)}\\ \\text{m/s}` },
          { title: 'Energy lost', tex: `\\Delta KE = ${tx(KE(m1, v1) + KE(m2, v2), 4)} - ${tx(KE(m1 + m2, vf), 4)} = ${tx(KE(m1, v1) + KE(m2, v2) - KE(m1 + m2, vf), 4)}\\ \\text{J}` },
        ],
      };
    },
  },
  fields: [
    { name: 'm1', label: 'Mass m₁', type: 'number', signed: false, placeholder: 'e.g. 2', suffix: 'kg', row: 'b1' },
    { name: 'v1', label: 'Velocity v₁', type: 'number', placeholder: 'e.g. 4', suffix: 'm/s', row: 'b1' },
    { name: 'm2', label: 'Mass m₂', type: 'number', signed: false, placeholder: 'e.g. 3', suffix: 'kg', row: 'b2' },
    { name: 'v2', label: 'Velocity v₂', type: 'number', placeholder: 'e.g. -1', suffix: 'm/s', row: 'b2', hint: 'Right is positive; a body moving left has a negative velocity.' },
    { name: 'type', label: 'Collision', type: 'radio', options: [['elastic', 'Elastic (e = 1)'], ['inelastic', 'Perfectly inelastic (stick)'], ['e', 'Coefficient of restitution e']] },
    { name: 'e', label: 'e (0 to 1)', type: 'number', signed: false, placeholder: 'e.g. 0.6', showWhen: { type: ['e'] } },
  ],
  examples: [
    { label: 'Elastic: 2 kg at 4 m/s hits 3 kg at −1 m/s', values: { m1: '2', v1: '4', m2: '3', v2: '-1', type: 'elastic' } },
    { label: 'Sticky: 1200 kg car into a parked 800 kg car', values: { m1: '1200', v1: '15', m2: '800', v2: '0', type: 'inelastic' } },
    { label: 'e = 0.6 with a wall-like heavy body', values: { m1: '0.5', v1: '6', m2: '50', v2: '0', type: 'e', e: '0.6' } },
    { label: 'Impossible: they never meet', values: { m1: '2', v1: '1', m2: '2', v2: '3', type: 'elastic' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const m1 = v.number('m1', 'm₁', { positive: true, maxAbs: 1e9 }), v1 = v.number('v1', 'v₁', { maxAbs: 1e6 }), m2 = v.number('m2', 'm₂', { positive: true, maxAbs: 1e9 }), v2 = v.number('v2', 'v₂', { maxAbs: 1e6 });
    const type = ['elastic', 'inelastic', 'e'].includes(values.type) ? values.type : 'elastic';
    const e = type === 'elastic' ? 1 : type === 'inelastic' ? 0 : v.number('e', 'e', { min: 0, max: 1 });
    if (!v.ok()) return v.result();
    if (!(v1 > v2)) return { ok: false, errors: [{ field: 'v2', message: 'Body 1 (on the left) must be moving faster to the right than body 2, otherwise they never collide (v₁ > v₂).' }] };
    const { u1, u2, p } = collide(m1, v1, m2, v2, e);
    const K0 = KE(m1, v1) + KE(m2, v2), K1 = KE(m1, u1) + KE(m2, u2);
    const steps = [
      { title: 'Known values (right is positive)', tex: `m_1 = ${q(m1, 'kg')},\\ v_1 = ${q(v1, 'm/s')},\\ m_2 = ${q(m2, 'kg')},\\ v_2 = ${q(v2, 'm/s')},\\ e = ${tx(e)}` },
      { title: 'Momentum before the collision', tex: `p = m_1 v_1 + m_2 v_2 = ${tx(m1)}(${tx(v1)}) + ${tx(m2)}(${tx(v2)}) ${rel(p)} ${q(p, 'kg m/s')}` },
    ];
    if (e === 0) steps.push({ title: 'They stick together, so they share one velocity', tex: `v' = \\frac{p}{m_1 + m_2} = \\frac{${tx(p)}}{${tx(m1 + m2)}} ${rel(u1)} ${q(u1, 'm/s')}` });
    else {
      steps.push({ title: 'Two conditions: momentum is conserved, and the separation speed is e times the approach speed', texLines: ["m_1 v_1 + m_2 v_2 = m_1 v_1' + m_2 v_2'", "v_2' - v_1' = e\\,(v_1 - v_2)"] });
      steps.push({ title: 'Solve the two equations', texLines: [`v_1' = \\frac{p + m_2 e (v_2 - v_1)}{m_1 + m_2} ${rel(u1)} ${q(u1, 'm/s')}`, `v_2' = \\frac{p + m_1 e (v_1 - v_2)}{m_1 + m_2} ${rel(u2)} ${q(u2, 'm/s')}`] });
    }
    steps.push({ title: 'Kinetic energy before and after', tex: `KE: ${tx(K0)} \\to ${tx(K1)}\\ \\text{J}\\quad (\\text{lost: } ${tx(K0 - K1)}\\ \\text{J})` });
    steps.push({ title: 'Check: momentum after', tex: `m_1 v_1' + m_2 v_2' ${rel(m1 * u1 + m2 * u2)} ${q(m1 * u1 + m2 * u2, 'kg m/s')}\\ \\checkmark` });
    return {
      ok: true,
      final: { texLines: [`v_1' ${rel(u1)} ${q(u1, 'm/s')},\\quad v_2' ${rel(u2)} ${q(u2, 'm/s')}`] },
      answers: [answer('Velocity of body 1 after', u1, { unit: 'm/s', primary: true }), answer('Velocity of body 2 after', u2, { unit: 'm/s', primary: true }), answer('Total momentum', p, { unit: 'kg·m/s' }), answer('Kinetic energy lost', K0 - K1, { unit: 'J' }), answer('Share of KE lost', K0 ? (100 * (K0 - K1)) / K0 : 0, { unit: '%' })],
      visual: { svg: energyBars([{ label: 'KE before', value: K0 }, { label: 'KE after', value: K1, cls: 'd-bar-hi' }], 'Kinetic energy before and after'), caption: e === 1 ? 'Elastic: no kinetic energy is lost.' : 'The missing kinetic energy becomes heat, sound and deformation — momentum is still conserved.' },
      formula: ["m_1 v_1 + m_2 v_2 = m_1 v_1' + m_2 v_2' \\qquad e = \\frac{v_2' - v_1'}{v_1 - v_2}"],
      steps,
      notes: [{ kind: 'info', text: 'Model: a head-on collision along one line, no external forces (friction is ignored during the brief impact), bodies treated as particles.' }],
    };
  },
};
