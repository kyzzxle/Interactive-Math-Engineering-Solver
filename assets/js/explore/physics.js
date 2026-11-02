/**
 * Physics explorers (several animated, always started by the user) and practice problems.
 * All motion is shown under the same simplified assumptions as the calculators.
 */
import { plot } from '../lib/plot.js';
import { tx } from '../lib/calc-kit.js';
import { q, projectile, blockDiagram, energyBars, simpleCircuit, svgWrap, G_EARTH, fmtQ } from '../lib/physics-kit.js';
import { randInt, pick } from '../lib/learn.js';

const t2 = (v, d = 2) => tx(v, d);
const r2 = (v) => Math.round(v * 100) / 100;

/** A horizontal track from −L to L with a dot at x. */
function track(x, L, label = '') {
  const W = 380, X = (p) => 20 + ((p + L) / (2 * L)) * (W - 40);
  const ticks = [-L, -L / 2, 0, L / 2, L].map((p) => `<line class="d-grid" x1="${r2(X(p))}" y1="28" x2="${r2(X(p))}" y2="44"/><text class="d-tick" x="${r2(X(p))}" y="58" text-anchor="middle">${p} m</text>`).join('');
  return svgWrap(W, 66, 'Position on the track', `<line class="d-axis" x1="20" y1="36" x2="${W - 20}" y2="36"/>${ticks}<circle class="d-point" cx="${r2(X(Math.max(-L, Math.min(L, x))))}" cy="36" r="8"/><text class="d-label" x="${r2(X(Math.max(-L, Math.min(L, x))))}" y="18" text-anchor="middle">${label}</text>`);
}

// ------------------------------------------------------------------ motion
export const motionExplore = {
  title: 'Watch constant velocity',
  intro: 'Press Play to move the object. A constant velocity gives a straight position–time graph whose slope is the velocity. Try a negative velocity.',
  controls: [
    { name: 'v', label: 'Velocity v', min: -8, max: 8, step: 0.5, value: 3, unit: 'm/s' },
    { name: 'x0', label: 'Starting position x₀', min: -30, max: 30, step: 1, value: -20, unit: 'm' },
    { name: 't', label: 'Time t', min: 0, max: 10, step: 0.05, value: 0, unit: 's' },
  ],
  animate: { control: 't', seconds: 5 },
  render({ v, x0, t }) {
    const x = x0 + v * t;
    return {
      svg: plot({ x: [0, 10], y: [-60, 60], width: 400, height: 240, title: 'Position–time graph', curves: [{ f: (s) => x0 + v * s }], points: [{ x: t, y: x }], xLabel: 't (s)', yLabel: 'x (m)' }),
      html: track(x, 60, `${t2(x, 1)} m`),
      readouts: [
        { label: 'Position', tex: `x = x_0 + vt = ${t2(x0)} + (${t2(v)})(${t2(t)}) = ${q(x, 'm', 2)}` },
        { label: 'Displacement so far', tex: `\\Delta x = vt = ${q(v * t, 'm', 2)}` },
        { label: 'Distance travelled', tex: `|v|\\,t = ${q(Math.abs(v) * t, 'm', 2)}` },
      ],
    };
  },
};

export const motionPractice = {
  title: 'Average speed',
  generate(rand) {
    const km = randInt(rand, 2, 60) / 2, min = randInt(rand, 5, 90);
    const d = km * 1000, t = min * 60, v = d / t;
    return {
      prompt: `<p>A cyclist rides <strong>${km} km</strong> in <strong>${min} minutes</strong>. Find the average speed in m/s and in km/h.</p>`,
      answers: [{ label: 'Speed', value: v, unit: 'm/s' }, { label: 'Speed', value: v * 3.6, unit: 'km/h' }],
      hint: 'Convert to metres and seconds first (1 km = 1000 m, 1 min = 60 s). To go from m/s to km/h multiply by 3.6.',
      hintTex: 'v = \\frac{d}{t}',
      steps: [
        { title: 'Convert to SI units', tex: `d = ${km}\\,\\text{km} = ${d}\\,\\text{m},\\quad t = ${min}\\,\\text{min} = ${t}\\,\\text{s}` },
        { title: 'Average speed', tex: `v = \\frac{${d}}{${t}} \\approx ${t2(v, 3)}\\,\\text{m/s}` },
        { title: 'Convert to km/h', tex: `${t2(v, 3)} \\times 3.6 \\approx ${t2(v * 3.6, 2)}\\,\\text{km/h}` },
      ],
    };
  },
};

// ------------------------------------------------------------------ kinematics
export const kinematicsExplore = {
  title: 'Velocity–time graph',
  intro: 'The slope is the acceleration and the shaded area is the displacement. Give u and a opposite signs to see the object stop and turn back.',
  controls: [
    { name: 'u', label: 'Initial velocity u', min: -10, max: 20, step: 0.5, value: 12, unit: 'm/s' },
    { name: 'a', label: 'Acceleration a', min: -5, max: 5, step: 0.1, value: -2, unit: 'm/s²' },
    { name: 't', label: 'Time t', min: 0, max: 10, step: 0.05, value: 4, unit: 's' },
  ],
  animate: { control: 't', seconds: 5 },
  presets: [{ label: 'Speeding up', values: { u: 2, a: 1.5, t: 4 } }, { label: 'Braking to a stop', values: { u: 15, a: -3, t: 5 } }, { label: 'Ball thrown up', values: { u: 12, a: -9.8, t: 2 } }],
  render({ u, a, t }) {
    const v = u + a * t, s = u * t + 0.5 * a * t * t;
    const tStop = a !== 0 ? -u / a : -1;
    const turned = tStop > 0 && tStop < t;
    const dist = turned ? Math.abs(u * tStop + 0.5 * a * tStop * tStop) + Math.abs(s - (u * tStop + 0.5 * a * tStop * tStop)) : Math.abs(s);
    return {
      svg: plot({ x: [0, 10], y: [-30, 30], width: 400, height: 260, title: 'Velocity–time graph', curves: [{ f: (x) => u + a * x }], shade: t > 0 ? [{ f: (x) => u + a * x, a: 0, b: t }] : [], points: [{ x: t, y: v, label: `v = ${t2(v, 1)}` }], xLabel: 't (s)', yLabel: 'v (m/s)' }),
      readouts: [
        { label: 'Velocity', tex: `v = u + at = ${q(v, 'm/s', 2)}` },
        { label: 'Displacement (shaded area)', tex: `s = ut + \\tfrac{1}{2}at^2 = ${q(s, 'm', 2)}`, tone: 'good' },
        { label: 'Distance travelled', tex: `${q(dist, 'm', 2)}` },
      ],
      note: turned ? `The velocity reached 0 at t ≈ ${t2(tStop)} s and the object turned back, so the distance travelled is larger than the size of the displacement.` : '',
    };
  },
};

export const kinematicsPractice = {
  title: 'Constant acceleration',
  generate(rand) {
    const u = randInt(rand, 0, 10), t = randInt(rand, 2, 10), a = randInt(rand, 1, 12) / 2;
    const v = u + a * t, s = u * t + 0.5 * a * t * t;
    return {
      prompt: `<p>A car travelling at <strong>${u} m/s</strong> accelerates uniformly to <strong>${v} m/s</strong> in <strong>${t} s</strong>. Find its acceleration and the distance it covers.</p>`,
      answers: [{ label: 'Acceleration', value: a, unit: 'm/s²' }, { label: 'Distance', value: s, unit: 'm' }],
      hint: 'You know u, v and t. Use v = u + at for a, and s = ½(u + v)t for the distance (it does not need a).',
      steps: [
        { title: 'Known values', tex: `u = ${u}\\,\\text{m/s},\\ v = ${v}\\,\\text{m/s},\\ t = ${t}\\,\\text{s}` },
        { title: 'Acceleration', tex: `a = \\frac{v - u}{t} = \\frac{${v} - ${u}}{${t}} = ${t2(a)}\\,\\text{m/s}^2` },
        { title: 'Distance', tex: `s = \\tfrac{1}{2}(u + v)t = \\tfrac{1}{2}(${u} + ${v})(${t}) = ${t2(s)}\\,\\text{m}` },
      ],
    };
  },
};

// ------------------------------------------------------------------ projectile
const flight = (v) => projectile(v.v0, v.angle, v.h0, G_EARTH);
export const projectileExplore = {
  title: 'Launch a projectile',
  intro: 'Set the launch speed, angle and height, then press Play. The dashed curve is a 45° launch at the same speed for comparison. Air resistance is ignored.',
  controls: [
    { name: 'v0', label: 'Launch speed v₀', min: 5, max: 40, step: 0.5, value: 20, unit: 'm/s' },
    { name: 'angle', label: 'Launch angle θ', min: 0, max: 90, step: 1, value: 60, unit: '°' },
    { name: 'h0', label: 'Launch height h₀', min: 0, max: 30, step: 0.5, value: 0, unit: 'm' },
    { name: 't', label: 'Time t', min: 0, max: (v) => Math.max(0.01, flight(v).T), step: 0.01, value: 0, unit: 's' },
  ],
  animate: { control: 't', seconds: 3 },
  presets: [{ label: '45° (maximum range)', values: { angle: 45, h0: 0 } }, { label: '30° and 60° compare', values: { angle: 30, h0: 0 } }, { label: 'Horizontal from a cliff', values: { angle: 0, h0: 25 } }],
  render(vals) {
    const P = flight(vals);
    const ref = projectile(vals.v0, 45, vals.h0, G_EARTH);
    const span = Math.max(P.R, ref.R, P.H * 1.6, 10) * 1.08;
    const t = Math.min(vals.t, P.T);
    const x = P.x(t), y = Math.max(0, P.y(t));
    const vy = P.vy - G_EARTH * t;
    const pathFn = (Q) => (xx) => {
      if (Q.vx < 1e-9) return NaN;
      const tt = xx / Q.vx;
      return tt >= 0 && tt <= Q.T ? Q.y(tt) : NaN;
    };
    const vertical = P.vx < 1e-6;
    return {
      svg: plot({
        x: [-span * 0.03, span], y: [0, span * 0.62], width: 400, height: 260, title: 'Projectile trajectory',
        curves: [...(vertical ? [] : [{ f: pathFn(P) }]), { f: pathFn(ref), cls: 'd-hidden' }],
        segments: vertical ? [{ x1: 0, y1: vals.h0, x2: 0, y2: P.H, cls: 'd-line' }] : [],
        points: [{ x, y, label: `t = ${t2(t)} s`, cls: 'd-point3' }, { x: P.vx * P.tTop, y: P.H, cls: 'd-point2' }],
        xLabel: 'x (m)', yLabel: 'y (m)',
      }),
      readouts: [
        { label: 'Flight time', tex: `T \\approx ${q(P.T, 's', 2)}` },
        { label: 'Maximum height', tex: `H \\approx ${q(P.H, 'm', 2)}` },
        { label: 'Range', tex: `R \\approx ${q(P.R, 'm', 2)}`, tone: 'good' },
        { label: `Now (t = ${t2(t)} s)`, tex: `x \\approx ${t2(x, 1)},\\ y \\approx ${t2(y, 1)}\\ \\text{m}` },
        { label: 'Velocity now', tex: `v_x = ${t2(P.vx, 1)},\\ v_y = ${t2(vy, 1)}\\ \\text{m/s}` },
      ],
      note: vals.h0 === 0 && vals.angle > 0 && vals.angle < 90 ? `From ground level, ${vals.angle}° and ${90 - vals.angle}° give the same range (${t2(P.R, 1)} m).` : '',
    };
  },
};

export const projectilePractice = {
  title: 'Range and height',
  generate(rand) {
    const v0 = randInt(rand, 8, 30), deg = pick(rand, [15, 20, 30, 37, 40, 45, 50, 53, 60, 70]);
    const P = projectile(v0, deg, 0, G_EARTH);
    return {
      prompt: `<p>A ball is kicked from level ground at <strong>${v0} m/s</strong> and <strong>${deg}°</strong> above the horizontal. Ignoring air resistance (g = 9.81 m/s²), find its maximum height and horizontal range.</p>`,
      answers: [{ label: 'Maximum height', value: P.H, unit: 'm' }, { label: 'Range', value: P.R, unit: 'm' }],
      hint: 'Split v₀ into components. Height uses only the vertical part; range = horizontal speed × flight time, with flight time 2v_y/g from level ground.',
      hintTex: 'H = \\frac{(v_0\\sin\\theta)^2}{2g} \\qquad R = \\frac{v_0^2 \\sin 2\\theta}{g}',
      steps: [
        { title: 'Components', tex: `v_x = ${v0}\\cos ${deg}^\\circ \\approx ${t2(P.vx, 3)},\\quad v_y = ${v0}\\sin ${deg}^\\circ \\approx ${t2(P.vy, 3)}\\ \\text{m/s}` },
        { title: 'Maximum height', tex: `H = \\frac{v_y^2}{2g} = \\frac{(${t2(P.vy, 3)})^2}{2(9.81)} \\approx ${t2(P.H)}\\,\\text{m}` },
        { title: 'Flight time', tex: `T = \\frac{2 v_y}{g} \\approx ${t2(P.T, 3)}\\,\\text{s}` },
        { title: 'Range', tex: `R = v_x T \\approx ${t2(P.vx, 3)} \\times ${t2(P.T, 3)} \\approx ${t2(P.R)}\\,\\text{m}` },
      ],
    };
  },
};

// ------------------------------------------------------------------ forces
export const newtonExplore = {
  title: 'Balance the forces',
  intro: 'Two people pull a cart in opposite directions. The acceleration depends only on the net force and the mass.',
  controls: [
    { name: 'F1', label: 'Pull to the right F₁', min: 0, max: 100, step: 1, value: 60, unit: 'N' },
    { name: 'F2', label: 'Pull to the left F₂', min: 0, max: 100, step: 1, value: 20, unit: 'N' },
    { name: 'm', label: 'Mass m', min: 1, max: 50, step: 0.5, value: 10, unit: 'kg' },
  ],
  presets: [{ label: 'Balanced', values: { F1: 50, F2: 50 } }, { label: 'Double the mass', values: { F1: 60, F2: 20, m: 20 } }],
  render({ F1, F2, m }) {
    const Fn = F1 - F2, a = Fn / m;
    return {
      svg: blockDiagram({ forces: [{ value: F1, label: `F₁ = ${F1} N` }, { value: -F2, label: `F₂ = ${F2} N` }], accel: a, mass: `${m} kg`, title: 'Two opposing forces on a cart' }),
      readouts: [
        { label: 'Net force (right positive)', tex: `F_{\\text{net}} = F_1 - F_2 = ${q(Fn, 'N', 2)}` },
        { label: 'Acceleration', tex: `a = \\frac{F_{\\text{net}}}{m} = ${q(a, 'm/s²', 3)}`, tone: Fn === 0 ? 'warn' : 'good' },
      ],
      note: Fn === 0 ? 'Balanced forces: zero acceleration. The cart stays at rest or keeps moving at constant velocity (Newton’s first law).' : '',
    };
  },
};

export const newtonPractice = {
  title: 'Net force and acceleration',
  generate(rand) {
    const m = randInt(rand, 2, 40), F1 = randInt(rand, 20, 200), F2 = randInt(rand, 0, 150);
    const Fn = F1 - F2;
    return {
      prompt: `<p>A <strong>${m} kg</strong> box is pushed right with <strong>${F1} N</strong> while friction pulls it left with <strong>${F2} N</strong>. Taking right as positive, find the net force and the acceleration.</p>`,
      answers: [{ label: 'Net force', value: Fn, unit: 'N', int: true }, { label: 'Acceleration', value: Fn / m, unit: 'm/s²' }],
      hint: 'Subtract the opposing force first, then divide the net force by the mass.',
      hintTex: 'a = \\frac{F_{\\text{net}}}{m}',
      steps: [
        { title: 'Net force', tex: `F_{\\text{net}} = ${F1} - ${F2} = ${Fn}\\,\\text{N}` },
        { title: 'Newton’s second law', tex: `a = \\frac{${Fn}}{${m}} \\approx ${t2(Fn / m, 3)}\\,\\text{m/s}^2` },
      ],
    };
  },
};

// ------------------------------------------------------------------ energy
export const energyExplore = {
  title: 'Energy during a fall',
  intro: 'Drop a ball and watch potential energy turn into kinetic energy. Without air resistance the total never changes.',
  controls: [
    { name: 'm', label: 'Mass m', min: 0.5, max: 10, step: 0.5, value: 2, unit: 'kg' },
    { name: 'h0', label: 'Starting height h₀', min: 1, max: 20, step: 0.5, value: 10, unit: 'm' },
    { name: 'd', label: 'Distance fallen', min: 0, max: (v) => v.h0, step: 0.05, value: 0, unit: 'm' },
  ],
  animate: { control: 'd', seconds: 2.5 },
  render({ m, h0, d }) {
    const PE = m * G_EARTH * (h0 - d), KE = m * G_EARTH * d, total = m * G_EARTH * h0;
    return {
      svg: energyBars([{ label: 'PE', value: PE }, { label: 'KE', value: KE, cls: 'd-bar-hi' }, { label: 'Total', value: total }], 'Potential, kinetic and total energy', total),
      readouts: [
        { label: 'Height now', tex: `h = ${q(h0 - d, 'm', 2)}` },
        { label: 'Potential energy', tex: `mgh = ${q(PE, 'J', 1)}` },
        { label: 'Kinetic energy', tex: `\\tfrac{1}{2}mv^2 = ${q(KE, 'J', 1)}` },
        { label: 'Speed', tex: `v = \\sqrt{2 g \\cdot ${t2(d)}} \\approx ${q(Math.sqrt(2 * G_EARTH * d), 'm/s', 2)}`, tone: 'good' },
      ],
    };
  },
};

export const energyPractice = {
  title: 'Kinetic and potential energy',
  generate(rand) {
    const m = randInt(rand, 1, 80), v = randInt(rand, 2, 30), h = randInt(rand, 2, 50);
    const KE = 0.5 * m * v * v, PE = m * G_EARTH * h;
    return {
      prompt: `<p>A <strong>${m} kg</strong> object moves at <strong>${v} m/s</strong> at a height of <strong>${h} m</strong>. Find its kinetic energy and its gravitational potential energy (g = 9.81 m/s²).</p>`,
      answers: [{ label: 'Kinetic energy', value: KE, unit: 'J' }, { label: 'Potential energy', value: PE, unit: 'J' }],
      hint: 'Square the speed before multiplying for KE. PE is mass × g × height.',
      hintTex: 'KE = \\tfrac{1}{2} m v^2 \\qquad PE = m g h',
      steps: [
        { title: 'Kinetic energy', tex: `KE = \\tfrac{1}{2}(${m})(${v})^2 = ${t2(KE)}\\,\\text{J}` },
        { title: 'Potential energy', tex: `PE = (${m})(9.81)(${h}) = ${t2(PE)}\\,\\text{J}` },
      ],
    };
  },
};

// ------------------------------------------------------------------ circuits
export const ohmExplore = {
  title: 'Turn the voltage up',
  intro: 'For a fixed resistor, current is proportional to voltage: the I–V graph is a straight line with slope 1/R. A bigger resistance gives a flatter line.',
  controls: [
    { name: 'V', label: 'Voltage V', min: 0, max: 24, step: 0.5, value: 12, unit: 'V' },
    { name: 'R', label: 'Resistance R', min: 10, max: 200, step: 1, value: 40, unit: 'Ω' },
  ],
  render({ V, R }) {
    const I = V / R;
    return {
      svg: plot({ x: [0, 25], y: [0, 2.5], width: 400, height: 230, title: 'Current against voltage', curves: [{ f: (x) => x / R }], points: [{ x: V, y: I, label: `${t2(I, 3)} A` }], xLabel: 'V (volts)', yLabel: 'I (amps)' }),
      html: simpleCircuit({ V: fmtQ(V, 'V', 2), I: fmtQ(I, 'A', 3), R: fmtQ(R, 'Ω', 1) }),
      readouts: [
        { label: 'Current', tex: `I = \\frac{V}{R} = \\frac{${t2(V)}}{${t2(R)}} \\approx ${q(I, 'A', 4)}`, tone: 'good' },
        { label: 'Power', tex: `P = VI \\approx ${q(V * I, 'W', 3)}` },
      ],
    };
  },
};

export const ohmPractice = {
  title: 'Ohm’s law',
  generate(rand) {
    const V = pick(rand, [1.5, 3, 4.5, 6, 9, 12, 24]), R = pick(rand, [2, 4, 5, 8, 10, 12, 20, 47, 100, 220]);
    const I = V / R;
    return {
      prompt: `<p>A <strong>${V} V</strong> battery is connected across a <strong>${R} Ω</strong> resistor. Find the current (3 decimal places) and the power dissipated.</p>`,
      answers: [{ label: 'Current', value: I, unit: 'A', decimals: 3 }, { label: 'Power', value: V * I, unit: 'W', decimals: 3 }],
      hint: 'Rearrange V = IR for I. Then power is P = VI (or V²/R).',
      hintTex: 'I = \\frac{V}{R} \\qquad P = VI',
      steps: [
        { title: 'Current', tex: `I = \\frac{${V}}{${R}} \\approx ${t2(I, 4)}\\,\\text{A}` },
        { title: 'Power', tex: `P = VI = ${V} \\times ${t2(I, 4)} \\approx ${t2(V * I, 4)}\\,\\text{W}` },
      ],
    };
  },
};

export const resistorPractice = {
  title: 'Series and parallel',
  generate(rand) {
    const R1 = pick(rand, [2, 3, 4, 6, 8, 10, 12, 15, 20, 30, 60]), R2 = pick(rand, [3, 4, 5, 6, 12, 20, 30, 40, 60]);
    const s = R1 + R2, p = (R1 * R2) / (R1 + R2);
    return {
      prompt: `<p>Two resistors, <strong>${R1} Ω</strong> and <strong>${R2} Ω</strong>, are connected first in series and then in parallel. Find the equivalent resistance each time.</p>`,
      answers: [{ label: 'Series', value: s, unit: 'Ω' }, { label: 'Parallel', value: p, unit: 'Ω' }],
      hint: 'Series resistances add. For two in parallel, use product over sum — the answer must be smaller than both resistors.',
      hintTex: 'R_s = R_1 + R_2 \\qquad R_p = \\frac{R_1 R_2}{R_1 + R_2}',
      steps: [
        { title: 'Series', tex: `R_s = ${R1} + ${R2} = ${s}\\,\\Omega` },
        { title: 'Parallel', tex: `R_p = \\frac{${R1} \\times ${R2}}{${R1} + ${R2}} = \\frac{${R1 * R2}}{${s}} \\approx ${t2(p, 3)}\\,\\Omega` },
      ],
    };
  },
};

// ------------------------------------------------------------------ waves
export const waveExplore = {
  title: 'Make a travelling wave',
  intro: 'Press Play to set the wave moving. The orange buoy only moves up and down; the wave pattern travels to the right at v = fλ.',
  controls: [
    { name: 'f', label: 'Frequency f', min: 0.2, max: 2, step: 0.05, value: 0.5, unit: 'Hz' },
    { name: 'lambda', label: 'Wavelength λ', min: 0.5, max: 4, step: 0.1, value: 2, unit: 'm' },
    { name: 'A', label: 'Amplitude A', min: 0.2, max: 1, step: 0.05, value: 0.8, unit: 'm' },
    { name: 't', label: 'Time t', min: 0, max: 20, step: 0.02, value: 0, unit: 's' },
  ],
  animate: { control: 't', seconds: 20, loop: true },
  render({ f, lambda, A, t }) {
    const k = (2 * Math.PI) / lambda, w = 2 * Math.PI * f;
    const y = (x) => A * Math.sin(k * x - w * t);
    // a crest sits where kx − ωt = π/2 (+2πn); track the first one at or after x = 0
    let xc = (Math.PI / 2 + w * t) / k;
    xc -= Math.floor(xc / lambda) * lambda;
    return {
      svg: plot({ x: [0, 8], y: [-1.3, 1.3], width: 400, height: 220, title: 'Travelling wave', curves: [{ f: y, samples: 400 }], segments: [{ x1: xc, y1: A + 0.12, x2: xc + lambda, y2: A + 0.12, cls: 'd-line3' }], points: [{ x: xc, y: A, label: 'crest', cls: 'd-point2' }, { x: 6, y: y(6), label: 'buoy', cls: 'd-point3' }], xLabel: 'x (m)' }),
      readouts: [
        { label: 'Wave speed', tex: `v = f\\lambda = ${t2(f)} \\times ${t2(lambda)} = ${q(f * lambda, 'm/s', 3)}`, tone: 'good' },
        { label: 'Period', tex: `T = \\frac{1}{f} = ${q(1 / f, 's', 3)}` },
        { label: 'Amplitude', tex: `A = ${q(A, 'm', 2)}` },
      ],
      note: 'The amplitude changes how big the wave is, not how fast it travels.',
    };
  },
};

export const wavePractice = {
  title: 'The wave equation',
  generate(rand) {
    if (rand() < 0.5) {
      const f = pick(rand, [2, 4, 5, 10, 25, 50]), L = randInt(rand, 2, 40) / 4;
      return {
        prompt: `<p>Waves on a rope have frequency <strong>${f} Hz</strong> and wavelength <strong>${L} m</strong>. Find the wave speed and the period.</p>`,
        answers: [{ label: 'Wave speed', value: f * L, unit: 'm/s' }, { label: 'Period', value: 1 / f, unit: 's', decimals: 3 }],
        hint: 'Speed is frequency times wavelength. The period is the reciprocal of the frequency.',
        hintTex: 'v = f\\lambda \\qquad T = \\frac{1}{f}',
        steps: [
          { title: 'Wave speed', tex: `v = ${f} \\times ${L} = ${t2(f * L)}\\,\\text{m/s}` },
          { title: 'Period', tex: `T = \\frac{1}{${f}} = ${t2(1 / f, 3)}\\,\\text{s}` },
        ],
      };
    }
    const f = pick(rand, [128, 256, 262, 330, 440, 512, 880, 1000]);
    const L = 343 / f;
    return {
      prompt: `<p>A tuning fork vibrates at <strong>${f} Hz</strong> in air, where sound travels at <strong>343 m/s</strong>. Find the wavelength (3 decimal places) and the period in milliseconds.</p>`,
      answers: [{ label: 'Wavelength', value: L, unit: 'm', decimals: 3 }, { label: 'Period', value: 1000 / f, unit: 'ms', decimals: 3 }],
      hint: 'Rearrange v = fλ for λ. Then T = 1/f; multiply seconds by 1000 to get milliseconds.',
      hintTex: '\\lambda = \\frac{v}{f}',
      steps: [
        { title: 'Wavelength', tex: `\\lambda = \\frac{343}{${f}} \\approx ${t2(L, 4)}\\,\\text{m}` },
        { title: 'Period', tex: `T = \\frac{1}{${f}}\\,\\text{s} \\approx ${t2(1000 / f, 4)}\\,\\text{ms}` },
      ],
    };
  },
};
