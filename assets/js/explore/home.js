/**
 * Small "Try it now" demos for the homepage. Readouts are plain text so the homepage does not
 * need to load the math renderer; each demo links to the full calculator.
 */
import { plot } from '../lib/plot.js';
import { projectile, G_EARTH } from '../lib/physics-kit.js';
import { frustumMesh, renderSolid } from '../lib/solid3d.js';

const n = (x, d = 2) => (Math.abs(x) < 1e-9 ? '0' : Number(x.toFixed(d)).toString()).replace('-', '−');

const flight = (v) => projectile(v.v0, v.angle, 0, G_EARTH);
const projectileDemo = {
  title: 'Projectile',
  controls: [
    { name: 'v0', label: 'Launch speed', min: 5, max: 30, step: 0.5, value: 25, unit: 'm/s' },
    { name: 'angle', label: 'Launch angle', min: 5, max: 85, step: 1, value: 55, unit: '°' },
    { name: 't', label: 'Time', min: 0, max: (v) => Math.max(0.01, flight(v).T), step: 0.01, value: 0, unit: 's' },
  ],
  animate: { control: 't', seconds: 2.5 },
  render(v) {
    const P = flight(v), t = Math.min(v.t, P.T);
    const path = (x) => { const tt = x / P.vx; return tt >= 0 && tt <= P.T ? P.y(tt) : NaN; };
    return {
      svg: plot({ x: [-2, 95], y: [0, 50], width: 400, height: 220, title: 'Projectile path', curves: [{ f: path }], points: [{ x: P.x(t), y: Math.max(0, P.y(t)), cls: 'd-point3' }, { x: P.vx * P.tTop, y: P.H, cls: 'd-point2' }], xLabel: 'x (m)', yLabel: 'y (m)' }),
      readouts: [
        { label: 'Range', text: `${n(P.R, 1)} m`, tone: 'good' },
        { label: 'Max height', text: `${n(P.H, 1)} m` },
        { label: 'Flight time', text: `${n(P.T)} s` },
      ],
    };
  },
};

const parabolaDemo = {
  title: 'Parabola',
  controls: [
    { name: 'a', label: 'a', min: -3, max: 3, step: 0.1, value: 1 },
    { name: 'b', label: 'b', min: -8, max: 8, step: 0.5, value: -2 },
    { name: 'c', label: 'c', min: -8, max: 8, step: 0.5, value: -3 },
  ],
  render({ a, b, c }) {
    const f = (x) => a * x * x + b * x + c;
    const D = b * b - 4 * a * c;
    if (a === 0) return { svg: plot({ x: [-8, 8], y: [-10, 10], width: 400, height: 220, title: 'Line', curves: [{ f }] }), readouts: [{ label: 'Note', text: 'a = 0 gives a straight line, not a parabola.', tone: 'warn' }] };
    const h = -b / (2 * a);
    const roots = D > 1e-12 ? [(-b - Math.sqrt(D)) / (2 * a), (-b + Math.sqrt(D)) / (2 * a)].sort((p, q) => p - q) : Math.abs(D) <= 1e-12 ? [h] : [];
    return {
      svg: plot({ x: [-8, 8], y: [-10, 10], width: 400, height: 220, title: `y = ${a}x² + ${b}x + ${c}`, curves: [{ f }], points: [{ x: h, y: f(h), cls: 'd-point2' }, ...roots.map((x) => ({ x, y: 0, cls: 'd-point3' }))] }),
      readouts: [
        { label: 'Discriminant', text: n(D), tone: D < -1e-12 ? 'warn' : 'good' },
        { label: 'Roots', text: roots.length ? roots.map((r) => n(r)).join(', ') : 'none (complex)' },
        { label: 'Vertex', text: `(${n(h)}, ${n(f(h))})` },
      ],
    };
  },
};

const circleDemo = {
  title: 'Unit circle',
  controls: [{ name: 'deg', label: 'Angle θ (or drag the point)', min: 0, max: 360, step: 1, value: 40, unit: '°' }],
  drag: { P: (g) => ({ deg: ((Math.atan2(g.y, g.x) * 180) / Math.PI + 360) % 360 }) },
  render({ deg }) {
    const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
    return {
      svg: plot({ x: [-1.5, 1.5], y: [-1.2, 1.2], width: 400, height: 220, equal: true, title: 'Unit circle', circles: [{ cx: 0, cy: 0, r: 1 }], segments: [{ x1: 0, y1: 0, x2: c, y2: s, cls: 'd-line' }, { x1: c, y1: 0, x2: c, y2: s, cls: 'd-perp' }, { x1: 0, y1: 0, x2: c, y2: 0, cls: 'd-line3' }], points: [{ x: c, y: s, drag: 'P' }] }),
      readouts: [
        { label: 'cos θ (amber)', text: n(c, 4) },
        { label: 'sin θ (green)', text: n(s, 4) },
        { label: 'tan θ', text: Math.abs(c) < 1e-12 ? 'undefined' : n(s / c, 4) },
      ],
    };
  },
};

const coneDemo = {
  title: '3D cone',
  controls: [
    { name: 'r', label: 'Radius r', min: 1, max: 6, step: 0.1, value: 3 },
    { name: 'h', label: 'Height h', min: 1, max: 8, step: 0.1, value: 5 },
    { name: 'yaw', label: 'Turn (or drag the cone)', min: 0, max: 360, step: 1, value: 30, unit: '°' },
    { name: 'pitch', label: 'Tilt', min: 0, max: 50, step: 1, value: 22, unit: '°' },
  ],
  rotate: { yaw: 'yaw', pitch: 'pitch' },
  render({ r, h, yaw, pitch }) {
    const s = Math.hypot(r, h);
    return {
      svg: renderSolid(frustumMesh(r, 0, h, 40, { smooth: true }), { yaw, pitch, scale: 20, width: 400, height: 220, title: `Cone with radius ${r} and height ${h}` }),
      readouts: [
        { label: 'Volume', text: n((Math.PI * r * r * h) / 3) },
        { label: 'Surface area', text: n(Math.PI * r * (r + s)) },
        { label: 'Slant height', text: n(s) },
      ],
    };
  },
};

export const HOME_DEMOS = {
  projectile: { spec: projectileDemo, href: 'calculators/projectile-motion/', link: 'Open the projectile simulator' },
  parabola: { spec: parabolaDemo, href: 'calculators/quadratic-equation-solver/', link: 'Open the quadratic solver' },
  circle: { spec: circleDemo, href: 'calculators/degrees-radians-unit-circle/', link: 'Open the unit-circle calculator' },
  cone: { spec: coneDemo, href: 'calculators/cone/', link: 'Open the cone calculator' },
};
