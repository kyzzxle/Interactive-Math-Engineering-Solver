/**
 * Vectors in the plane given by magnitude and direction (angle from the positive x-axis,
 * counter-clockwise). Components Vx = |V|cos θ, Vy = |V|sin θ; the resultant is the sum of the
 * components, with magnitude √(Rx² + Ry²) and direction atan2(Ry, Rx) (correct in every quadrant).
 */
import { answer, tx, fmt } from '../lib/calc-kit.js';
import { parseDecimal } from '../lib/parse.js';
import { plot } from '../lib/plot.js';

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const norm360 = (d) => ((d % 360) + 360) % 360;
const r6 = (x) => (Math.abs(x) < 1e-12 ? 0 : x);

function tipToTail(vecs, R) {
  const pts = [[0, 0]];
  vecs.forEach(([x, y]) => pts.push([pts[pts.length - 1][0] + x, pts[pts.length - 1][1] + y]));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1);
  const pad = span * 0.18;
  const cls = ['d-line', 'd-line2', 'd-line3', 'd-hidden'];
  return plot({ x: [Math.min(...xs) - pad, Math.max(...xs) + pad], y: [Math.min(...ys) - pad, Math.max(...ys) + pad], equal: true, width: 360, height: 300, title: 'Vectors placed tip to tail and their resultant', segments: [...vecs.map((_, i) => ({ x1: pts[i][0], y1: pts[i][1], x2: pts[i + 1][0], y2: pts[i + 1][1], cls: cls[i % 4] })), { x1: 0, y1: 0, x2: R[0], y2: R[1], cls: 'd-perp' }], points: [...pts.slice(1, -1).map((p, i) => ({ x: p[0], y: p[1], label: '', r: 3 })), { x: R[0], y: R[1], label: 'R', cls: 'd-foot' }, { x: 0, y: 0, label: 'O', r: 3 }] });
}

export const calculator = {
  id: 'vector-resultant',
  explore: {
    title: 'Add two vectors',
    intro: 'Change the magnitudes and directions. The resultant (dashed) runs from the tail of the first vector to the tip of the second — and its components are just the sums of the components.',
    controls: [
      { name: 'm1', label: '|A|', min: 0, max: 10, step: 0.5, value: 6 },
      { name: 'a1', label: 'Direction of A', min: 0, max: 360, step: 1, value: 20, unit: '°' },
      { name: 'm2', label: '|B|', min: 0, max: 10, step: 0.5, value: 5 },
      { name: 'a2', label: 'Direction of B', min: 0, max: 360, step: 1, value: 110, unit: '°' },
    ],
    presets: [{ label: 'Same direction', values: { a1: 30, a2: 30 } }, { label: 'Opposite', values: { a1: 0, a2: 180 } }, { label: 'Perpendicular', values: { a1: 0, a2: 90, m1: 3, m2: 4 } }],
    render({ m1, a1, m2, a2 }) {
      const A = [m1 * Math.cos(rad(a1)), m1 * Math.sin(rad(a1))], B = [m2 * Math.cos(rad(a2)), m2 * Math.sin(rad(a2))];
      const R = [A[0] + B[0], A[1] + B[1]].map((x) => (Math.abs(x) < 1e-9 ? 0 : x)), mag = Math.hypot(...R);
      return {
        svg: plot({ x: [-16, 16], y: [-12, 12], equal: true, width: 400, height: 300, title: 'Vector addition', segments: [{ x1: 0, y1: 0, x2: A[0], y2: A[1], cls: 'd-line' }, { x1: A[0], y1: A[1], x2: R[0], y2: R[1], cls: 'd-line2' }, { x1: 0, y1: 0, x2: R[0], y2: R[1], cls: 'd-perp' }], points: [{ x: R[0], y: R[1], label: 'R', cls: 'd-foot' }] }),
        readouts: [
          { label: 'Components of R', tex: `R_x \\approx ${tx(r6(R[0]), 2)},\\ R_y \\approx ${tx(r6(R[1]), 2)}` },
          { label: 'Magnitude', tex: `|R| \\approx ${tx(mag, 3)}`, tone: 'good' },
          { label: 'Direction', tex: mag < 1e-9 ? '\\text{none (zero vector)}' : `\\theta \\approx ${tx(norm360(deg(Math.atan2(R[1], R[0]))), 1)}^\\circ` },
        ],
      };
    },
  },
  fields: [
    { name: 'vecs', label: 'Vectors: magnitude, direction (°)', type: 'textarea', rows: 4, placeholder: '10, 30\n6, 120', hint: 'One vector per line: magnitude, then direction in degrees measured counter-clockwise from the positive x-axis. Up to 6 vectors.' },
  ],
  examples: [
    { label: '10 at 30° plus 6 at 120°', values: { vecs: '10, 30\n6, 120' } },
    { label: 'Three forces: 50 at 0°, 40 at 90°, 30 at 225°', values: { vecs: '50, 0\n40, 90\n30, 225' } },
    { label: 'Balanced: 5 at 0° and 5 at 180°', values: { vecs: '5, 0\n5, 180' } },
    { label: 'Invalid: missing direction', values: { vecs: '10\n6, 120' }, expectError: true },
  ],
  solve(values) {
    const lines = String(values.vecs ?? '').split(/\n|;/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return { ok: false, errors: [{ field: 'vecs', message: 'Enter at least one vector as magnitude, direction.' }] };
    if (lines.length > 6) return { ok: false, errors: [{ field: 'vecs', message: 'Please enter at most 6 vectors.' }] };
    const vs = [];
    for (const [i, line] of lines.entries()) {
      const parts = line.replace(/[()°]/g, ' ').split(/[\s,]+/).filter(Boolean);
      if (parts.length !== 2) return { ok: false, errors: [{ field: 'vecs', message: `Line ${i + 1} should have exactly two numbers: magnitude, direction.` }] };
      const m = parseDecimal(parts[0], 'the magnitude'), a = parseDecimal(parts[1], 'the direction');
      if (!m.ok) return { ok: false, errors: [{ field: 'vecs', message: `Line ${i + 1}: ${m.error}` }] };
      if (!a.ok) return { ok: false, errors: [{ field: 'vecs', message: `Line ${i + 1}: ${a.error}` }] };
      if (m.value < 0) return { ok: false, errors: [{ field: 'vecs', message: `Line ${i + 1}: a magnitude cannot be negative (reverse the direction by 180° instead).` }] };
      if (m.value > 1e12 || Math.abs(a.value) > 1e6) return { ok: false, errors: [{ field: 'vecs', message: `Line ${i + 1}: please use a magnitude below 10¹² and an angle below 10⁶°.` }] };
      vs.push({ m: m.value, a: a.value });
    }
    const comps = vs.map(({ m, a }) => [r6(m * Math.cos(rad(a))), r6(m * Math.sin(rad(a)))]);
    const R = [r6(comps.reduce((s, c) => s + c[0], 0)), r6(comps.reduce((s, c) => s + c[1], 0))];
    const scale = Math.max(...vs.map((x) => x.m), 1e-300);
    if (Math.abs(R[0]) < scale * 1e-12) R[0] = 0;
    if (Math.abs(R[1]) < scale * 1e-12) R[1] = 0;
    const mag = Math.hypot(...R);
    const dir = mag ? norm360(deg(Math.atan2(R[1], R[0]))) : null;
    const rows = vs.map(({ m, a }, i) => [`V${i + 1}`, fmt(m), `${fmt(a)}°`, fmt(comps[i][0]), fmt(comps[i][1])]);
    rows.push(['Resultant R', fmt(mag), dir === null ? '—' : `${fmt(dir, 4)}°`, fmt(R[0]), fmt(R[1])]);
    const steps = [
      { title: 'Resolve each vector into components', texLines: vs.map(({ m, a }, i) => `V_{${i + 1}}: \\ ${tx(m)}\\cos ${tx(a)}^\\circ \\approx ${tx(comps[i][0], 4)},\\quad ${tx(m)}\\sin ${tx(a)}^\\circ \\approx ${tx(comps[i][1], 4)}`) },
      { title: 'Add the components', texLines: [`R_x = ${comps.map((c) => tx(c[0], 4)).join(' + ').replace(/\+ -/g, '- ')} \\approx ${tx(R[0], 4)}`, `R_y = ${comps.map((c) => tx(c[1], 4)).join(' + ').replace(/\+ -/g, '- ')} \\approx ${tx(R[1], 4)}`] },
      { title: 'Magnitude (Pythagoras)', tex: `|R| = \\sqrt{R_x^2 + R_y^2} = \\sqrt{(${tx(R[0], 4)})^2 + (${tx(R[1], 4)})^2} \\approx ${tx(mag, 6)}` },
      mag ? { title: 'Direction: use the quadrant of (Rx, Ry)', text: `tan θ = Ry/Rx, but the inverse tangent alone only gives angles between −90° and 90°. The point (${fmt(R[0], 4)}, ${fmt(R[1], 4)}) is in ${R[0] >= 0 && R[1] >= 0 ? 'quadrant I' : R[0] < 0 && R[1] >= 0 ? 'quadrant II' : R[0] < 0 ? 'quadrant III' : 'quadrant IV'}, so θ ≈ ${fmt(dir, 4)}°.`, tex: `\\theta = \\operatorname{atan2}(R_y, R_x) \\approx ${tx(dir, 4)}^\\circ` } : { title: 'Direction', text: 'The resultant is the zero vector, so it has no direction: the vectors balance.' },
    ];
    return {
      ok: true,
      final: { tex: mag ? `|R| \\approx ${tx(mag, 6)},\\quad \\theta \\approx ${tx(dir, 4)}^\\circ` : '|R| = 0\\ \\text{(the vectors balance)}' },
      answers: [answer('Magnitude |R|', mag, { primary: true, irrational: true }), dir === null ? { label: 'Direction', value: 'none (zero vector)', copy: '' } : answer('Direction θ', dir, { unit: '°', primary: true, decimals: 4, irrational: true }), answer('Rx', R[0]), answer('Ry', R[1])],
      visual: { svg: tipToTail(comps, R), caption: 'Each vector starts where the previous one ends; the dashed resultant joins the start to the finish.' },
      formula: ['V_x = |V|\\cos\\theta,\\quad V_y = |V|\\sin\\theta \\qquad |R| = \\sqrt{R_x^2 + R_y^2},\\quad \\theta = \\operatorname{atan2}(R_y, R_x)'],
      steps,
      tables: [{ caption: 'Components', headers: ['Vector', 'Magnitude', 'Direction', 'x-component', 'y-component'], rows }],
      notes: [{ kind: 'info', text: 'Directions are measured counter-clockwise from the positive x-axis (east). Bearings measured clockwise from north must be converted first: θ = 90° − bearing.' }],
    };
  },
};
