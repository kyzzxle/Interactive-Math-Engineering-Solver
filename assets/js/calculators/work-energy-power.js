/**
 * Work, energy and power:
 *   work by a constant force   W = F d cos θ
 *   kinetic energy             KE = ½ m v²
 *   gravitational PE           PE = m g h
 *   power                      P = W / t
 *   energy conservation        v = √(u² + 2 g h) after falling h without friction
 */
import { validator, answer, tx } from '../lib/calc-kit.js';
import { q, rel, energyBars, arrowTo, svgWrap, G_EARTH } from '../lib/physics-kit.js';
import { energyExplore, energyPractice } from '../explore/physics.js';

const gOf = (values, v) => (String(values.g ?? '').trim() === '' ? G_EARTH : v.number('g', 'g', { positive: true, maxAbs: 1e4 }));

export const calculator = {
  id: 'work-energy-power',
  explore: energyExplore,
  practice: energyPractice,
  fields: [
    { name: 'mode', label: 'What do you want to calculate?', type: 'select', options: [['work', 'Work done by a force (W = Fd cos θ)'], ['ke', 'Kinetic energy (½mv²)'], ['pe', 'Gravitational potential energy (mgh)'], ['power', 'Power (P = W/t)'], ['fall', 'Speed after a fall (energy conservation)']] },
    { name: 'F', label: 'Force F', type: 'number', signed: false, placeholder: 'e.g. 50', suffix: 'N', row: 'w', showWhen: { mode: ['work'] }, rowShowWhen: { mode: ['work'] } },
    { name: 'd', label: 'Displacement d', type: 'number', signed: false, placeholder: 'e.g. 10', suffix: 'm', row: 'w', showWhen: { mode: ['work'] } },
    { name: 'theta', label: 'Angle between force and displacement θ', type: 'number', signed: false, placeholder: '0', suffix: '°', showWhen: { mode: ['work'] }, hint: '0° when the force points along the motion; 90° does no work; 180° opposes the motion.' },
    { name: 'm', label: 'Mass m', type: 'number', signed: false, placeholder: 'e.g. 2', suffix: 'kg', showWhen: { mode: ['ke', 'pe'] } },
    { name: 'v', label: 'Speed v', type: 'number', signed: false, placeholder: 'e.g. 6', suffix: 'm/s', showWhen: { mode: ['ke'] } },
    { name: 'h', label: 'Height h', type: 'number', signed: false, placeholder: 'e.g. 5', suffix: 'm', showWhen: { mode: ['pe', 'fall'] } },
    { name: 'u', label: 'Initial speed u', type: 'number', signed: false, placeholder: '0', suffix: 'm/s', showWhen: { mode: ['fall'] } },
    { name: 'g', label: 'Gravitational acceleration g', type: 'number', signed: false, placeholder: '9.81', suffix: 'm/s²', showWhen: { mode: ['pe', 'fall'] } },
    { name: 'W', label: 'Work or energy W', type: 'number', signed: false, placeholder: 'e.g. 1500', suffix: 'J', row: 'p', showWhen: { mode: ['power'] }, rowShowWhen: { mode: ['power'] } },
    { name: 't', label: 'Time t', type: 'number', signed: false, placeholder: 'e.g. 12', suffix: 's', row: 'p', showWhen: { mode: ['power'] } },
  ],
  examples: [
    { label: 'Pushing a box: 50 N over 10 m at 30°', values: { mode: 'work', F: '50', d: '10', theta: '30' } },
    { label: 'Kinetic energy: 1200 kg car at 15 m/s', values: { mode: 'ke', m: '1200', v: '15' } },
    { label: 'Potential energy: 2 kg raised 5 m', values: { mode: 'pe', m: '2', h: '5', g: '9.81' } },
    { label: 'Power: 1500 J in 12 s', values: { mode: 'power', W: '1500', t: '12' } },
    { label: 'Speed after falling 20 m', values: { mode: 'fall', h: '20', u: '0', g: '9.81' } },
  ],
  solve(values) {
    const v = validator(values);
    const mode = ['work', 'ke', 'pe', 'power', 'fall'].includes(values.mode) ? values.mode : 'work';
    if (mode === 'work') {
      const F = v.number('F', 'the force', { nonneg: true, maxAbs: 1e12 });
      const d = v.number('d', 'the displacement', { nonneg: true, maxAbs: 1e12 });
      const th = String(values.theta ?? '').trim() === '' ? 0 : v.number('theta', 'the angle', { nonneg: true, max: 180, maxAbs: 1e6 });
      if (!v.ok()) return v.result();
      const c = Math.abs(Math.cos((th * Math.PI) / 180)) < 1e-12 ? 0 : Math.cos((th * Math.PI) / 180);
      const W = F * d * c;
      const L = 120, ang = (th * Math.PI) / 180;
      const svg = svgWrap(360, 170, 'Force at an angle to the displacement', `<line class="d-ground" x1="20" y1="130" x2="340" y2="130"/><rect class="d-body" x="70" y="90" width="60" height="40" rx="5"/>${arrowTo(100, 110, 100 + L * Math.cos(ang), 110 - L * Math.sin(ang), 'F')}${arrowTo(150, 150, 300, 150, 'd', 'd-arrow2')}<text class="d-text-muted" x="160" y="104">θ = ${tx(th, 2)}°</text>`);
      return {
        ok: true,
        final: { tex: `W ${rel(W)} ${q(W, 'J')}` },
        answers: [answer('Work done W', W, { unit: 'J', primary: true }), answer('Force component along the motion', F * c, { unit: 'N' }), answer('Work in kilojoules', W / 1000, { unit: 'kJ' })],
        visual: { svg, caption: 'Only the component of the force along the displacement (F cos θ) does work.' },
        formula: ['W = F\\,d\\cos\\theta'],
        steps: [
          { title: 'Known values', tex: `F = ${q(F, 'N')},\\quad d = ${q(d, 'm')},\\quad \\theta = ${tx(th, 4)}^\\circ` },
          { title: 'Formula', tex: 'W = F\\,d\\cos\\theta' },
          { title: 'Substitute and simplify', texLines: [`W = ${tx(F, 4)} \\times ${tx(d, 4)} \\times \\cos ${tx(th, 4)}^\\circ`, `W ${rel(W)} ${q(W, 'J')}`] },
        ],
        notes: [{ kind: 'info', text: W < 0 ? 'Negative work: the force opposes the motion and removes energy (like friction or braking).' : 'Assumes a constant force and straight-line displacement. 1 J = 1 N·m.' }],
      };
    }
    if (mode === 'ke') {
      const m = v.number('m', 'the mass', { positive: true, maxAbs: 1e12 });
      const sp = v.number('v', 'the speed', { nonneg: true, maxAbs: 1e7 });
      if (!v.ok()) return v.result();
      const KE = 0.5 * m * sp * sp;
      return {
        ok: true,
        final: { tex: `KE ${rel(KE)} ${q(KE, 'J')}` },
        answers: [answer('Kinetic energy KE', KE, { unit: 'J', primary: true }), answer('In kilojoules', KE / 1000, { unit: 'kJ' }), answer('Momentum p = mv', m * sp, { unit: 'kg·m/s' })],
        formula: ['KE = \\tfrac{1}{2} m v^2'],
        steps: [
          { title: 'Known values', tex: `m = ${q(m, 'kg')},\\quad v = ${q(sp, 'm/s')}` },
          { title: 'Formula', tex: 'KE = \\tfrac{1}{2} m v^2' },
          { title: 'Substitute and simplify', texLines: [`KE = \\tfrac{1}{2}(${tx(m, 4)})(${tx(sp, 4)})^2`, `KE ${rel(KE)} ${q(KE, 'J')}`] },
        ],
        notes: [{ kind: 'info', text: 'Kinetic energy grows with the square of speed: doubling the speed quadruples the energy (and the braking distance). Valid for speeds far below the speed of light.' }],
      };
    }
    if (mode === 'pe') {
      const m = v.number('m', 'the mass', { positive: true, maxAbs: 1e12 });
      const h = v.number('h', 'the height', { nonneg: true, maxAbs: 1e5 });
      const g = gOf(values, v);
      if (!v.ok()) return v.result();
      const PE = m * g * h;
      return {
        ok: true,
        final: { tex: `PE ${rel(PE)} ${q(PE, 'J')}` },
        answers: [answer('Potential energy PE', PE, { unit: 'J', primary: true }), answer('Weight mg', m * g, { unit: 'N' }), answer('In kilojoules', PE / 1000, { unit: 'kJ' })],
        formula: ['PE = m\\,g\\,h'],
        steps: [
          { title: 'Known values', tex: `m = ${q(m, 'kg')},\\quad g = ${q(g, 'm/s²')},\\quad h = ${q(h, 'm')}` },
          { title: 'Formula', tex: 'PE = m\\,g\\,h' },
          { title: 'Substitute and simplify', texLines: [`PE = ${tx(m, 4)} \\times ${tx(g, 4)} \\times ${tx(h, 4)}`, `PE ${rel(PE)} ${q(PE, 'J')}`] },
        ],
        notes: [{ kind: 'info', text: 'h is measured from a reference level you choose (often the ground); only changes in PE matter. Assumes g is constant, which is accurate for heights much smaller than Earth’s radius.' }],
      };
    }
    if (mode === 'power') {
      const W = v.number('W', 'the work or energy', { nonneg: true, maxAbs: 1e15 });
      const t = v.number('t', 'the time', { positive: true, maxAbs: 1e12 });
      if (!v.ok()) return v.result();
      const P = W / t;
      return {
        ok: true,
        final: { tex: `P ${rel(P)} ${q(P, 'W')}` },
        answers: [answer('Power P', P, { unit: 'W', primary: true }), answer('In kilowatts', P / 1000, { unit: 'kW' }), answer('In horsepower (745.7 W)', P / 745.7, { unit: 'hp' })],
        formula: ['P = \\frac{W}{t}'],
        steps: [
          { title: 'Known values', tex: `W = ${q(W, 'J')},\\quad t = ${q(t, 's')}` },
          { title: 'Formula', tex: 'P = \\frac{W}{t}' },
          { title: 'Substitute and simplify', tex: `P = \\frac{${q(W, 'J')}}{${q(t, 's')}} ${rel(P)} ${q(P, 'W')}` },
        ],
        notes: [{ kind: 'info', text: 'This is the average power over the time interval. 1 W = 1 J/s.' }],
      };
    }
    // fall
    const h = v.number('h', 'the height', { nonneg: true, maxAbs: 1e5 });
    const u = String(values.u ?? '').trim() === '' ? 0 : v.number('u', 'the initial speed', { nonneg: true, maxAbs: 1e5 });
    const g = gOf(values, v);
    if (!v.ok()) return v.result();
    const vEnd = Math.sqrt(u * u + 2 * g * h);
    const ePerKg = { pe: g * h, ke0: 0.5 * u * u };
    return {
      ok: true,
      final: { tex: `v ${rel(vEnd)} ${q(vEnd, 'm/s')}` },
      answers: [answer('Speed at the bottom v', vEnd, { unit: 'm/s', primary: true }), answer('In km/h', vEnd * 3.6, { unit: 'km/h' }), answer('Energy per kilogram converted', ePerKg.pe, { unit: 'J/kg' })],
      visual: { svg: energyBars([{ label: 'KE at top', value: ePerKg.ke0 }, { label: 'PE at top', value: ePerKg.pe }, { label: 'KE at bottom', value: ePerKg.ke0 + ePerKg.pe, cls: 'd-bar-hi' }], 'Energy per kilogram at the top and bottom'), caption: 'Values are per kilogram: the mass cancels, so every object falls with the same final speed in this model.' },
      formula: ['\\tfrac{1}{2} m u^2 + m g h = \\tfrac{1}{2} m v^2 \\;\\Rightarrow\\; v = \\sqrt{u^2 + 2 g h}'],
      steps: [
        { title: 'Known values', tex: `h = ${q(h, 'm')},\\quad u = ${q(u, 'm/s')},\\quad g = ${q(g, 'm/s²')}` },
        { title: 'Energy is conserved', tex: 'KE_{\\text{top}} + PE_{\\text{top}} = KE_{\\text{bottom}}' },
        { title: 'Divide by m and solve for v', tex: 'v = \\sqrt{u^2 + 2 g h}' },
        { title: 'Substitute and simplify', texLines: [`v = \\sqrt{(${tx(u, 4)})^2 + 2(${tx(g, 4)})(${tx(h, 4)})}`, `v ${rel(vEnd)} ${q(vEnd, 'm/s')}`] },
      ],
      notes: [{ kind: 'info', text: 'Assumes no air resistance or friction, so no energy is lost as heat. The direction of the initial speed does not matter for the final speed.' }],
    };
  },
};
