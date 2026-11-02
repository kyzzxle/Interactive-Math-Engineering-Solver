/**
 * Related rates for five classic scenarios. Each relates two changing quantities by an
 * equation, differentiates it with respect to time t (chain rule), then substitutes the
 * values at the instant of interest.
 */
import { validator, answer, tx, fmt } from '../lib/calc-kit.js';
import { plot } from '../lib/plot.js';

const SC = [
  ['ladder', 'Sliding ladder (base moves out, top slides down)'],
  ['circle', 'Expanding circle (ripple)'],
  ['balloon', 'Inflating spherical balloon'],
  ['cone', 'Filling a cone-shaped tank (point down)'],
  ['shadow', 'Shadow of a person walking away from a lamp'],
];
const PI = Math.PI;

export const calculator = {
  id: 'related-rates',
  explore: {
    title: 'Watch a ladder slide',
    intro: 'The base moves out at a steady 0.5 m/s, but the top slides down faster and faster — dy/dt grows without bound as the top nears the ground.',
    controls: [
      { name: 'L', label: 'Ladder length L', min: 3, max: 10, step: 0.5, value: 5, unit: 'm' },
      { name: 't', label: 'Time t', min: 0, max: (v) => Math.max(0.01, (v.L * 0.995 - 1) / 0.5), step: 0.01, value: 2, unit: 's' },
    ],
    animate: { control: 't', seconds: 6 },
    render({ L, t }) {
      const x = 1 + 0.5 * t, y = Math.sqrt(Math.max(0, L * L - x * x));
      const dydt = y > 1e-9 ? (-x * 0.5) / y : -Infinity;
      return {
        svg: plot({ x: [-0.5, 10.5], y: [-0.5, 10.5], equal: true, width: 360, height: 320, title: 'Ladder against a wall', segments: [{ x1: 0, y1: 0, x2: 0, y2: 10.5, cls: 'd-axis' }, { x1: 0, y1: 0, x2: 10.5, y2: 0, cls: 'd-axis' }, { x1: x, y1: 0, x2: 0, y2: y, cls: 'd-line' }], points: [{ x, y: 0, label: `x = ${x.toFixed(2)}` }, { x: 0, y, label: `y = ${y.toFixed(2)}`, cls: 'd-point3' }] }),
        readouts: [
          { label: 'Base speed', tex: '\\frac{dx}{dt} = 0.5\\ \\text{m/s}' },
          { label: 'Top speed', tex: Number.isFinite(dydt) ? `\\frac{dy}{dt} = -\\frac{x}{y}\\frac{dx}{dt} \\approx ${tx(dydt, 3)}\\ \\text{m/s}` : '\\text{the top has reached the ground}', tone: 'good' },
        ],
      };
    },
  },
  fields: [
    { name: 'sc', label: 'Scenario', type: 'select', options: SC },
    { name: 'L', label: 'Ladder length L', type: 'number', signed: false, placeholder: 'e.g. 5', suffix: 'm', row: 'l', showWhen: { sc: ['ladder'] }, rowShowWhen: { sc: ['ladder'] } },
    { name: 'x', label: 'Base distance x', type: 'number', signed: false, placeholder: 'e.g. 3', suffix: 'm', row: 'l', showWhen: { sc: ['ladder'] } },
    { name: 'dx', label: 'Base speed dx/dt', type: 'number', placeholder: 'e.g. 0.5', suffix: 'm/s', showWhen: { sc: ['ladder'] } },
    { name: 'r', label: 'Radius r', type: 'number', signed: false, placeholder: 'e.g. 4', suffix: 'cm', showWhen: { sc: ['circle', 'balloon'] } },
    { name: 'dr', label: 'Rate dr/dt', type: 'number', placeholder: 'e.g. 2', suffix: 'cm/s', showWhen: { sc: ['circle'] } },
    { name: 'dV', label: 'Volume rate dV/dt', type: 'number', placeholder: 'e.g. 100', suffix: 'cm³/s', showWhen: { sc: ['balloon', 'cone'] } },
    { name: 'R', label: 'Tank top radius R', type: 'number', signed: false, placeholder: 'e.g. 2', suffix: 'm', row: 'tank', showWhen: { sc: ['cone'] }, rowShowWhen: { sc: ['cone'] } },
    { name: 'H', label: 'Tank height H', type: 'number', signed: false, placeholder: 'e.g. 4', suffix: 'm', row: 'tank', showWhen: { sc: ['cone'] } },
    { name: 'h', label: 'Water depth h', type: 'number', signed: false, placeholder: 'e.g. 3', suffix: 'm', showWhen: { sc: ['cone'] } },
    { name: 'lamp', label: 'Lamp height', type: 'number', signed: false, placeholder: 'e.g. 6', suffix: 'm', row: 'sh', showWhen: { sc: ['shadow'] }, rowShowWhen: { sc: ['shadow'] } },
    { name: 'p', label: 'Person height', type: 'number', signed: false, placeholder: 'e.g. 1.8', suffix: 'm', row: 'sh', showWhen: { sc: ['shadow'] } },
    { name: 'v', label: 'Walking speed', type: 'number', signed: false, placeholder: 'e.g. 1.5', suffix: 'm/s', showWhen: { sc: ['shadow'] } },
  ],
  examples: [
    { label: 'Ladder 5 m, base 3 m out, moving 0.5 m/s', values: { sc: 'ladder', L: '5', x: '3', dx: '0.5' } },
    { label: 'Ripple: r = 4 cm growing 2 cm/s', values: { sc: 'circle', r: '4', dr: '2' } },
    { label: 'Balloon: r = 5 cm, 100 cm³/s', values: { sc: 'balloon', r: '5', dV: '100' } },
    { label: 'Cone tank R = 2, H = 4, h = 3 m, 0.5 m³/s', values: { sc: 'cone', R: '2', H: '4', h: '3', dV: '0.5' } },
    { label: 'Shadow: lamp 6 m, person 1.8 m, 1.5 m/s', values: { sc: 'shadow', lamp: '6', p: '1.8', v: '1.5' } },
    { label: 'Impossible: base farther than the ladder length', values: { sc: 'ladder', L: '5', x: '6', dx: '0.5' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const sc = SC.some(([k]) => k === values.sc) ? values.sc : 'ladder';
    const steps = [];
    let final, answers, svg, caption, formula;
    if (sc === 'ladder') {
      const L = v.number('L', 'the ladder length', { positive: true, maxAbs: 1e6 }), x = v.number('x', 'the base distance', { nonneg: true, maxAbs: 1e6 }), dx = v.number('dx', 'the base speed', { maxAbs: 1e6 });
      if (!v.ok()) return v.result();
      if (x >= L) return { ok: false, errors: [{ field: 'x', message: 'The base distance must be less than the ladder length (otherwise the top is on the ground).' }] };
      const y = Math.sqrt(L * L - x * x), dy = (-x * dx) / y;
      formula = 'x^2 + y^2 = L^2';
      steps.push({ title: 'Relate the quantities (Pythagoras)', tex: formula });
      steps.push({ title: 'Find y at this instant', tex: `y = \\sqrt{L^2 - x^2} = \\sqrt{${tx(L)}^2 - ${tx(x)}^2} ${Number.isInteger(y) ? '=' : '\\approx'} ${tx(y)}\\ \\text{m}` });
      steps.push({ title: 'Differentiate with respect to t (L is constant)', tex: '2x\\frac{dx}{dt} + 2y\\frac{dy}{dt} = 0 \\;\\Rightarrow\\; \\frac{dy}{dt} = -\\frac{x}{y}\\frac{dx}{dt}' });
      steps.push({ title: 'Substitute', tex: `\\frac{dy}{dt} = -\\frac{${tx(x)}}{${tx(y, 6)}}(${tx(dx)}) ${Math.abs(dy * 1e6 - Math.round(dy * 1e6)) < 1e-6 ? '=' : '\\approx'} ${tx(dy)}\\ \\text{m/s}` });
      final = `\\frac{dy}{dt} \\approx ${tx(dy)}\\ \\text{m/s}`;
      answers = [answer('Top of ladder: dy/dt', dy, { unit: 'm/s', primary: true }), answer('Height of the top y', y, { unit: 'm' })];
      svg = plot({ x: [-0.3 * L, 1.2 * L], y: [-0.2 * L, 1.15 * L], equal: true, width: 340, height: 300, title: 'Ladder against a wall', segments: [{ x1: 0, y1: 0, x2: 0, y2: 1.1 * L, cls: 'd-axis' }, { x1: 0, y1: 0, x2: 1.15 * L, y2: 0, cls: 'd-axis' }, { x1: x, y1: 0, x2: 0, y2: y, cls: 'd-line' }], points: [{ x, y: 0, label: 'x' }, { x: 0, y, label: 'y', cls: 'd-point3' }] });
      caption = dy < 0 ? 'The negative sign means the top is moving down.' : 'The ladder is being pushed in, so the top rises.';
    } else if (sc === 'circle') {
      const r = v.number('r', 'the radius', { positive: true, maxAbs: 1e6 }), dr = v.number('dr', 'dr/dt', { maxAbs: 1e6 });
      if (!v.ok()) return v.result();
      const dA = 2 * PI * r * dr;
      formula = 'A = \\pi r^2';
      steps.push({ title: 'Relate the quantities', tex: formula });
      steps.push({ title: 'Differentiate with respect to t', tex: '\\frac{dA}{dt} = 2\\pi r \\frac{dr}{dt}' });
      steps.push({ title: 'Substitute', tex: `\\frac{dA}{dt} = 2\\pi(${tx(r)})(${tx(dr)}) = ${tx(2 * r * dr)}\\pi \\approx ${tx(dA)}\\ \\text{cm}^2\\text{/s}` });
      steps.push({ title: 'Circumference rate too', tex: `\\frac{dC}{dt} = 2\\pi\\frac{dr}{dt} \\approx ${tx(2 * PI * dr)}\\ \\text{cm/s}` });
      final = `\\frac{dA}{dt} = ${tx(2 * r * dr)}\\pi \\approx ${tx(dA)}\\ \\text{cm}^2\\text{/s}`;
      answers = [answer('dA/dt', dA, { unit: 'cm²/s', primary: true, irrational: true }), answer('dC/dt', 2 * PI * dr, { unit: 'cm/s', irrational: true })];
      svg = plot({ x: [-1.6 * r, 1.6 * r], y: [-1.3 * r, 1.3 * r], equal: true, width: 340, height: 280, title: 'Expanding circle', circles: [{ cx: 0, cy: 0, r }, { cx: 0, cy: 0, r: r * 1.25, cls: 'd-hidden' }], segments: [{ x1: 0, y1: 0, x2: r, y2: 0, cls: 'd-perp' }] });
      caption = 'The area grows faster as the circle gets bigger, even though r grows at a steady rate.';
    } else if (sc === 'balloon') {
      const r = v.number('r', 'the radius', { positive: true, maxAbs: 1e6 }), dV = v.number('dV', 'dV/dt', { maxAbs: 1e9 });
      if (!v.ok()) return v.result();
      const dr = dV / (4 * PI * r * r), dS = 8 * PI * r * dr;
      formula = 'V = \\tfrac{4}{3}\\pi r^3';
      steps.push({ title: 'Relate the quantities', tex: formula });
      steps.push({ title: 'Differentiate with respect to t', tex: '\\frac{dV}{dt} = 4\\pi r^2 \\frac{dr}{dt} \\;\\Rightarrow\\; \\frac{dr}{dt} = \\frac{dV/dt}{4\\pi r^2}' });
      steps.push({ title: 'Substitute', tex: `\\frac{dr}{dt} = \\frac{${tx(dV)}}{4\\pi(${tx(r)})^2} \\approx ${tx(dr)}\\ \\text{cm/s}` });
      steps.push({ title: 'Surface area rate', tex: `\\frac{dS}{dt} = 8\\pi r \\frac{dr}{dt} \\approx ${tx(dS)}\\ \\text{cm}^2\\text{/s}` });
      final = `\\frac{dr}{dt} \\approx ${tx(dr)}\\ \\text{cm/s}`;
      answers = [answer('dr/dt', dr, { unit: 'cm/s', primary: true, irrational: true }), answer('dS/dt', dS, { unit: 'cm²/s', irrational: true })];
      svg = plot({ x: [-1.6 * r, 1.6 * r], y: [-1.3 * r, 1.3 * r], equal: true, width: 340, height: 280, title: 'Balloon cross-section', circles: [{ cx: 0, cy: 0, r }], segments: [{ x1: 0, y1: 0, x2: r, y2: 0, cls: 'd-perp' }] });
      caption = 'For the same inflow, the radius grows more slowly as the balloon gets bigger.';
    } else if (sc === 'cone') {
      const R = v.number('R', 'the tank radius', { positive: true, maxAbs: 1e6 }), H = v.number('H', 'the tank height', { positive: true, maxAbs: 1e6 }), h = v.number('h', 'the water depth', { positive: true, maxAbs: 1e6 }), dV = v.number('dV', 'dV/dt', { maxAbs: 1e9 });
      if (!v.ok()) return v.result();
      if (h > H) return { ok: false, errors: [{ field: 'h', message: 'The water cannot be deeper than the tank height H.' }] };
      const k = R / H, rr = k * h, dh = dV / (PI * rr * rr);
      formula = 'V = \\tfrac{1}{3}\\pi r^2 h,\\quad \\frac{r}{h} = \\frac{R}{H}';
      steps.push({ title: 'Similar triangles: the water surface radius', tex: `r = \\frac{R}{H}h = \\frac{${tx(R)}}{${tx(H)}}h \\;\\Rightarrow\\; r = ${tx(rr)}\\ \\text{m now}` });
      steps.push({ title: 'Volume in terms of h only', tex: `V = \\tfrac{1}{3}\\pi\\left(\\frac{R}{H}\\right)^2 h^3` });
      steps.push({ title: 'Differentiate with respect to t', tex: '\\frac{dV}{dt} = \\pi\\left(\\frac{R}{H}\\right)^2 h^2 \\frac{dh}{dt} = \\pi r^2 \\frac{dh}{dt}' });
      steps.push({ title: 'Substitute', tex: `\\frac{dh}{dt} = \\frac{${tx(dV)}}{\\pi(${tx(rr)})^2} \\approx ${tx(dh)}\\ \\text{m/s}` });
      final = `\\frac{dh}{dt} \\approx ${tx(dh)}\\ \\text{m/s}`;
      answers = [answer('dh/dt', dh, { unit: 'm/s', primary: true, irrational: true }), answer('Surface radius r', rr, { unit: 'm' })];
      svg = plot({ x: [-1.4 * R, 1.4 * R], y: [-0.1 * H, 1.15 * H], equal: true, width: 340, height: 300, title: 'Cone-shaped tank', segments: [{ x1: 0, y1: 0, x2: R, y2: H, cls: 'd-line' }, { x1: 0, y1: 0, x2: -R, y2: H, cls: 'd-line' }, { x1: -R, y1: H, x2: R, y2: H, cls: 'd-line' }, { x1: -rr, y1: h, x2: rr, y2: h, cls: 'd-line2' }], shade: [{ f: () => h, g: (xx) => (H / R) * Math.abs(xx), a: -rr, b: rr, cls: 'd-shade2' }] });
      caption = 'The water surface widens as it rises, so the level climbs more slowly over time.';
    } else {
      const lamp = v.number('lamp', 'the lamp height', { positive: true, maxAbs: 1e6 }), p = v.number('p', 'the person height', { positive: true, maxAbs: 1e6 }), sp = v.number('v', 'the walking speed', { maxAbs: 1e6 });
      if (!v.ok()) return v.result();
      if (p >= lamp) return { ok: false, errors: [{ field: 'p', message: 'The lamp must be higher than the person; otherwise the shadow is infinitely long.' }] };
      const ds = (p * sp) / (lamp - p), tip = (lamp * sp) / (lamp - p);
      formula = '\\frac{s}{p} = \\frac{x + s}{\\text{lamp}}';
      steps.push({ title: 'Similar triangles (x = distance from the lamp, s = shadow length)', tex: formula });
      steps.push({ title: 'Solve for s', tex: '\\text{lamp}\\cdot s = p(x + s) \\;\\Rightarrow\\; s = \\frac{p}{\\text{lamp} - p}\\,x' });
      steps.push({ title: 'Differentiate (s is proportional to x)', tex: `\\frac{ds}{dt} = \\frac{p}{\\text{lamp} - p}\\frac{dx}{dt} = \\frac{${tx(p)}}{${tx(lamp)} - ${tx(p)}}(${tx(sp)}) \\approx ${tx(ds)}\\ \\text{m/s}` });
      steps.push({ title: 'Speed of the shadow’s tip', tex: `\\frac{d(x + s)}{dt} = ${tx(sp)} + ${tx(ds, 6)} \\approx ${tx(tip)}\\ \\text{m/s}` });
      final = `\\frac{ds}{dt} \\approx ${tx(ds)}\\ \\text{m/s}`;
      answers = [answer('Shadow length grows at ds/dt', ds, { unit: 'm/s', primary: true }), answer('Tip of the shadow moves at', tip, { unit: 'm/s' })];
      const X = 3, S = (p / (lamp - p)) * X;
      svg = plot({ x: [-0.5, X + S + 1], y: [-0.3, lamp * 1.15], equal: true, width: 340, height: 280, title: 'Lamp, person and shadow', segments: [{ x1: 0, y1: 0, x2: 0, y2: lamp, cls: 'd-line' }, { x1: X, y1: 0, x2: X, y2: p, cls: 'd-line2' }, { x1: 0, y1: lamp, x2: X + S, y2: 0, cls: 'd-hidden' }, { x1: X, y1: 0, x2: X + S, y2: 0, cls: 'd-line3' }], points: [{ x: 0, y: lamp, label: 'lamp', cls: 'd-point3' }] });
      caption = 'The shadow length grows at a constant rate, whatever the distance from the lamp.';
    }
    return {
      ok: true,
      final: { tex: final },
      answers,
      visual: { svg, caption },
      formula: [formula],
      steps,
      notes: [{ kind: 'info', text: 'Substitute the numbers only after differentiating — plugging in values first turns changing quantities into constants. The rate is the instantaneous rate at this moment.' }],
    };
  },
};
