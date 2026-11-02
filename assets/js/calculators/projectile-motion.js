/**
 * Projectile motion without air resistance: launch speed v₀ at angle θ above the horizontal
 * from height h₀ above level ground, constant gravitational acceleration g.
 *   x(t) = v₀ cosθ · t,   y(t) = h₀ + v₀ sinθ · t − ½ g t²
 */
import { validator, answer, tx } from '../lib/calc-kit.js';
import { q, rel, G_EARTH, projectile } from '../lib/physics-kit.js';
import { plot } from '../lib/plot.js';
import { projectileExplore, projectilePractice } from '../explore/physics.js';

export const calculator = {
  id: 'projectile-motion',
  explore: projectileExplore,
  practice: projectilePractice,
  fields: [
    { name: 'v0', label: 'Launch speed v₀', type: 'number', signed: false, placeholder: 'e.g. 20', suffix: 'm/s', row: 'launch' },
    { name: 'angle', label: 'Launch angle θ', type: 'number', signed: false, placeholder: 'e.g. 45', suffix: '°', row: 'launch', hint: 'Angle above the horizontal, from 0° (horizontal) to 90° (straight up).' },
    { name: 'h0', label: 'Launch height h₀ above the landing level', type: 'number', signed: false, placeholder: '0', suffix: 'm', default: '0' },
    { name: 'g', label: 'Gravitational acceleration g', type: 'number', signed: false, placeholder: '9.81', suffix: 'm/s²', default: '9.81', hint: 'Earth: 9.81 m/s². Moon: 1.62 m/s². Mars: 3.71 m/s².' },
  ],
  examples: [
    { label: 'Ball kicked at 20 m/s, 45°', values: { v0: '20', angle: '45', h0: '0', g: '9.81' } },
    { label: 'Thrown from a 30 m cliff at 15 m/s, 30°', values: { v0: '15', angle: '30', h0: '30', g: '9.81' } },
    { label: 'Horizontal launch from 1.2 m at 8 m/s', values: { v0: '8', angle: '0', h0: '1.2', g: '9.81' } },
    { label: 'Same kick on the Moon', values: { v0: '20', angle: '45', h0: '0', g: '1.62' } },
    { label: 'Impossible: horizontal launch at ground level', values: { v0: '10', angle: '0', h0: '0', g: '9.81' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const v0 = v.number('v0', 'the launch speed', { positive: true, maxAbs: 1e5 });
    const deg = v.number('angle', 'the launch angle', { nonneg: true, max: 90, maxAbs: 1e5 });
    const h0 = String(values.h0 ?? '').trim() === '' ? 0 : v.number('h0', 'the launch height', { nonneg: true, maxAbs: 1e6 });
    const g = String(values.g ?? '').trim() === '' ? G_EARTH : v.number('g', 'g', { positive: true, maxAbs: 1e4 });
    if (!v.ok()) return v.result();
    if (g < 0.01) return { ok: false, errors: [{ field: 'g', message: 'g must be at least 0.01 m/s², otherwise the flight would last practically forever.' }] };
    const P = projectile(v0, deg, h0, g);
    if (!(P.T > 1e-12)) return { ok: false, errors: [{ field: 'angle', message: 'Launched horizontally from ground level, the projectile lands immediately. Give it an upward angle or a launch height above 0.' }] };
    const deg90 = deg === 90;
    const steps = [
      { title: 'Known values', tex: `v_0 = ${q(v0, 'm/s')},\\quad \\theta = ${tx(deg, 4)}^\\circ,\\quad h_0 = ${q(h0, 'm')},\\quad g = ${q(g, 'm/s²')}` },
      { title: 'Split the launch velocity into components', texLines: [`v_x = v_0\\cos\\theta = ${tx(v0, 4)}\\cos ${tx(deg, 4)}^\\circ ${rel(P.vx)} ${q(P.vx, 'm/s')}`, `v_y = v_0\\sin\\theta = ${tx(v0, 4)}\\sin ${tx(deg, 4)}^\\circ ${rel(P.vy)} ${q(P.vy, 'm/s')}`] },
      { title: 'Time to the highest point (where v_y = 0)', tex: `t_{\\text{top}} = \\frac{v_y}{g} = \\frac{${tx(P.vy, 4)}}{${tx(g, 4)}} ${rel(P.tTop)} ${q(P.tTop, 's')}` },
      { title: 'Maximum height', tex: `H = h_0 + \\frac{v_y^2}{2g} = ${tx(h0, 4)} + \\frac{(${tx(P.vy, 4)})^2}{2(${tx(g, 4)})} ${rel(P.H)} ${q(P.H, 'm')}` },
      { title: 'Time of flight: solve y(t) = 0', texLines: [`h_0 + v_y t - \\tfrac{1}{2} g t^2 = 0`, `T = \\frac{v_y + \\sqrt{v_y^2 + 2 g h_0}}{g} ${rel(P.T)} ${q(P.T, 's')}`] },
      { title: 'Horizontal range', tex: `R = v_x T = ${tx(P.vx, 4)} \\times ${tx(P.T, 4)} ${rel(P.R)} ${q(P.R, 'm')}` },
      { title: 'Impact velocity', texLines: [`v_{y,\\text{end}} = v_y - gT ${rel(P.vyEnd)} ${q(P.vyEnd, 'm/s')}`, `|v| = \\sqrt{v_x^2 + v_{y,\\text{end}}^2} ${rel(P.vEnd)} ${q(P.vEnd, 'm/s')}`] },
    ];
    const n = 120, xs = [], ys = [];
    for (let i = 0; i <= n; i++) { const t = (P.T * i) / n; xs.push(P.x(t)); ys.push(P.y(t)); }
    const span = Math.max(P.R, P.H, 1e-9);
    const xr = deg90 ? [-span * 0.5, span * 0.5] : [-span * 0.04, Math.max(P.R, P.H) * 1.06];
    // the path as a function of x (vx > 0), or a vertical segment for a straight-up launch
    const svg = deg90
      ? plot({ x: xr, y: [0, P.H * 1.12], width: 380, height: 260, title: 'Vertical launch', segments: [{ x1: 0, y1: h0, x2: 0, y2: P.H, cls: 'd-line' }], points: [{ x: 0, y: P.H, label: `max ${tx(P.H, 2)} m`, cls: 'd-point2' }], xLabel: 'x (m)', yLabel: 'y (m)' })
      : plot({ x: xr, y: [0, Math.max(P.H, 1e-9) * 1.15], width: 380, height: 260, equal: P.R < 6 * P.H && P.H < 6 * P.R, title: 'Trajectory', curves: [{ f: (x) => (x >= 0 && x <= P.R ? P.y(x / P.vx) : NaN) }], points: [{ x: 0, y: h0, label: 'launch' }, { x: P.vx * P.tTop, y: P.H, label: `max ${tx(P.H, 2)} m`, cls: 'd-point2' }, { x: P.R, y: 0, label: `${tx(P.R, 2)} m`, cls: 'd-point3' }], xLabel: 'x (m)', yLabel: 'y (m)' });
    const notes = [{ kind: 'info', text: 'Model: no air resistance, constant g, flat landing surface at height 0, and a projectile small enough to treat as a point. Real balls fall short of these ranges, especially at high speeds.' }];
    if (h0 === 0 && !deg90) notes.push({ kind: 'info', text: `From ground level the range is v₀² sin 2θ / g, largest at 45°. Complementary angles (such as ${tx(deg, 2)}° and ${tx(90 - deg, 2)}°) give the same range.` });
    return {
      ok: true,
      final: { texLines: [`T ${rel(P.T)} ${q(P.T, 's')}`, `H ${rel(P.H)} ${q(P.H, 'm')}`, `R ${rel(P.R)} ${q(P.R, 'm')}`] },
      answers: [
        answer('Time of flight T', P.T, { unit: 's', primary: true }),
        answer('Maximum height H', P.H, { unit: 'm', primary: true }),
        answer('Horizontal range R', P.R, { unit: 'm', primary: true }),
        answer('Time to highest point', P.tTop, { unit: 's' }),
        answer('Horizontal velocity', P.vx, { unit: 'm/s' }),
        answer('Vertical launch velocity', P.vy, { unit: 'm/s' }),
        answer('Impact speed', P.vEnd, { unit: 'm/s' }),
        answer('Impact angle below horizontal', P.angleEnd, { unit: '°' }),
      ],
      visual: { svg, caption: 'The horizontal velocity stays constant; gravity only changes the vertical velocity, which is why the path is a parabola.' },
      formula: ['x = v_0\\cos\\theta\\, t \\qquad y = h_0 + v_0\\sin\\theta\\, t - \\tfrac{1}{2} g t^2'],
      steps,
      notes,
    };
  },
};
