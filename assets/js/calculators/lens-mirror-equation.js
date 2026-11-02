/**
 * Thin lenses and spherical mirrors: 1/f = 1/d_o + 1/d_i, magnification m = −d_i/d_o = h_i/h_o.
 * Sign convention ("real is positive"): f > 0 for converging lenses and concave mirrors, f < 0 for
 * diverging lenses and convex mirrors; d_i > 0 for a real image (behind a lens, in front of a
 * mirror), d_i < 0 for a virtual image; positive m means upright.
 * A ray diagram is drawn to scale with the three principal rays.
 */
import { validator, answer, tx, fmt } from '../lib/calc-kit.js';
import { q, rel, svgWrap } from '../lib/physics-kit.js';
import { randInt } from '../lib/learn.js';

const TYPES = [['convex-lens', 'Converging (convex) lens'], ['concave-lens', 'Diverging (concave) lens'], ['concave-mirror', 'Concave mirror'], ['convex-mirror', 'Convex mirror']];

export function image(type, fmag, d_o) {
  const f = type === 'convex-lens' || type === 'concave-mirror' ? fmag : -fmag;
  if (Math.abs(d_o - f) < 1e-12 * Math.max(1, Math.abs(f))) return { f, atInfinity: true };
  const d_i = (f * d_o) / (d_o - f);
  return { f, d_i, m: -d_i / d_o };
}

/** Ray diagram (object on the left; lens or mirror at x = 0). */
export function rayDiagram(type, fmag, d_o, h_o) {
  const { f, d_i, m, atInfinity } = image(type, fmag, d_o);
  const mirror = type.endsWith('mirror');
  const W = 400, H = 240, cy = 120;
  const reach = Math.max(d_o, 2 * fmag, atInfinity ? 0 : Math.abs(d_i)) * 1.15;
  const sx = (W / 2 - 20) / reach, hi = atInfinity ? h_o : Math.abs(m * h_o);
  const sy = Math.min(70 / Math.max(h_o, hi, 1e-9), 3 * sx);
  const cx = mirror ? W - 60 : W / 2;
  const X = (x) => cx - x * sx; // object side is to the left: object distance d → x = cx − d·sx
  const Ximg = (d) => (mirror ? cx - d * sx : cx + d * sx); // real image: left of a mirror, right of a lens
  const Y = (y) => cy - y * sy;
  const r = (v) => Math.round(v * 10) / 10;
  const lines = [];
  const L = (x1, y1, x2, y2, cls = 'd-line', dash = false) => lines.push(`<line class="${cls}" x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}"${dash ? ' stroke-dasharray="5 4"' : ''}/>`);
  L(0, cy, W, cy, 'd-axis');
  // optical element
  if (mirror) lines.push(`<path class="d-edge" d="M ${cx} ${cy - 95} Q ${type === 'concave-mirror' ? cx + 22 : cx - 22} ${cy} ${cx} ${cy + 95}"/>`);
  else lines.push(`<path class="d-edge" d="M ${cx} ${cy - 95} Q ${type === 'convex-lens' ? cx + 14 : cx - 14} ${cy} ${cx} ${cy + 95} Q ${type === 'convex-lens' ? cx - 14 : cx + 14} ${cy} ${cx} ${cy - 95}"/>`);
  // focal points
  const fpts = mirror ? [X(Math.abs(f))] : [X(fmag), cx + fmag * sx];
  fpts.forEach((x) => lines.push(`<circle class="d-point2" cx="${r(x)}" cy="${cy}" r="3.5"/><text class="d-text-muted" x="${r(x)}" y="${cy + 16}" text-anchor="middle">F</text>`));
  // object
  const ox = X(d_o), oy = Y(h_o);
  lines.push(`<line class="d-arrow" x1="${r(ox)}" y1="${cy}" x2="${r(ox)}" y2="${r(oy + 8)}"/><polygon class="d-arrow-head" points="${r(ox)},${r(oy)} ${r(ox - 5)},${r(oy + 9)} ${r(ox + 5)},${r(oy + 9)}"/>`);
  // rays: 1) parallel to the axis, then through (or from) the focal point; 2) through the centre / pole
  const ext = (x1, y1, x2, y2, toX) => [toX, y1 + ((y2 - y1) * (toX - x1)) / (x2 - x1)];
  const farX = mirror ? 0 : W;
  // ray 1
  L(ox, oy, cx, oy, 'd-line3');
  const focusSide = mirror ? (f > 0 ? X(f) : X(f)) : (f > 0 ? cx + f * sx : cx + f * sx);
  const [x1e, y1e] = ext(cx, oy, focusSide, cy, farX);
  L(cx, oy, x1e, y1e, 'd-line3', false);
  if (f < 0 || (!atInfinity && d_i < 0)) { const [bx, by] = ext(cx, oy, focusSide, cy, mirror ? W : 0); L(cx, oy, bx, by, 'd-line3', true); }
  // ray 2 through the centre (lens) or to the pole, reflecting symmetrically (mirror)
  if (!mirror) { const [x2e, y2e] = ext(ox, oy, cx, cy, W); L(ox, oy, x2e, y2e, 'd-line2'); if (!atInfinity && d_i < 0) { const [bx, by] = ext(ox, oy, cx, cy, 0); L(cx, cy, bx, by, 'd-line2', true); } }
  else { L(ox, oy, cx, cy, 'd-line2'); const [x2e, y2e] = ext(cx, cy, ox, 2 * cy - oy, 0); L(cx, cy, x2e, y2e, 'd-line2'); if (!atInfinity && d_i < 0) { const [bx, by] = ext(cx, cy, ox, 2 * cy - oy, W); L(cx, cy, bx, by, 'd-line2', true); } }
  // image
  if (!atInfinity && Number.isFinite(d_i)) {
    const ix = Ximg(d_i), iy = Y(m * h_o);
    if (ix > -50 && ix < W + 50) lines.push(`<line class="d-arrow2" x1="${r(ix)}" y1="${cy}" x2="${r(ix)}" y2="${r(iy + (m > 0 ? 8 : -8))}"${d_i < 0 ? ' stroke-dasharray="5 4"' : ''}/><polygon class="d-arrow2-head" points="${r(ix)},${r(iy)} ${r(ix - 5)},${r(iy + (m > 0 ? 9 : -9))} ${r(ix + 5)},${r(iy + (m > 0 ? 9 : -9))}"/><text class="d-label" x="${r(ix + 8)}" y="${r(iy)}">image</text>`);
  }
  lines.push(`<text class="d-label" x="${r(ox - 6)}" y="${r(oy - 6)}" text-anchor="end">object</text>`);
  return svgWrap(W, H, 'Ray diagram', lines.join(''));
}

function describe(type, res) {
  if (res.atInfinity) return 'No image: the object is at the focal point, so the rays leave parallel (the image is at infinity).';
  const real = res.d_i > 0, upright = res.m > 0, size = Math.abs(res.m) > 1 + 1e-9 ? 'magnified' : Math.abs(res.m) < 1 - 1e-9 ? 'diminished' : 'same size';
  return `${real ? 'Real' : 'Virtual'}, ${upright ? 'upright' : 'inverted'}, ${size}; ${real ? (type.endsWith('mirror') ? 'in front of the mirror' : 'on the far side of the lens') : (type.endsWith('mirror') ? 'behind the mirror' : 'on the same side as the object')}.`;
}

export const calculator = {
  id: 'lens-mirror-equation',
  explore: {
    title: 'Move the object',
    intro: 'Slide the object towards the lens or mirror. Watch the image flip from real and inverted to virtual and upright as the object passes the focal point F.',
    controls: [
      { name: 'type', label: 'Optical element', type: 'select', options: TYPES, value: 'convex-lens' },
      { name: 'f', label: 'Focal length |f|', min: 5, max: 30, step: 1, value: 15, unit: 'cm' },
      { name: 'd', label: 'Object distance d₀', min: 2, max: 60, step: 0.5, value: 40, unit: 'cm' },
    ],
    presets: [{ label: 'Object beyond 2F', values: { d: 40 } }, { label: 'Between F and 2F', values: { d: 22 } }, { label: 'Inside F (magnifier)', values: { d: 8 } }],
    render({ type, f, d }) {
      const res = image(type, f, d);
      return {
        svg: rayDiagram(type, f, d, 4),
        readouts: res.atInfinity ? [{ label: 'Image', text: 'at infinity (object at F)', tone: 'warn' }] : [
          { label: 'Image distance', tex: `d_i = \\frac{f\\,d_o}{d_o - f} \\approx ${tx(res.d_i, 2)}\\ \\text{cm}` },
          { label: 'Magnification', tex: `m = -\\frac{d_i}{d_o} \\approx ${tx(res.m, 3)}`, tone: 'good' },
          { label: 'Image', text: describe(type, res) },
        ],
      };
    },
  },
  practice: {
    title: 'Where is the image?',
    generate(rand) {
      const f = randInt(rand, 5, 20), d = f + randInt(rand, 2, 30);
      const di = (f * d) / (d - f);
      return {
        prompt: `<p>An object stands <strong>${d} cm</strong> from a converging lens of focal length <strong>${f} cm</strong>. Find the image distance and the magnification.</p>`,
        answers: [{ label: 'Image distance', value: di, unit: 'cm' }, { label: 'Magnification', value: -di / d, decimals: 3 }],
        hint: 'Rearrange 1/f = 1/dₒ + 1/dᵢ for dᵢ. A real image behind the lens has dᵢ > 0 and a negative (inverted) magnification.',
        hintTex: '\\frac{1}{d_i} = \\frac{1}{f} - \\frac{1}{d_o}',
        steps: [{ title: 'Image distance', tex: `\\frac{1}{d_i} = \\frac{1}{${f}} - \\frac{1}{${d}} \\Rightarrow d_i \\approx ${tx(di, 4)}\\ \\text{cm}` }, { title: 'Magnification', tex: `m = -\\frac{${tx(di, 4)}}{${d}} \\approx ${tx(-di / d, 4)}` }],
      };
    },
  },
  fields: [
    { name: 'type', label: 'Optical element', type: 'select', options: TYPES },
    { name: 'f', label: 'Focal length |f|', type: 'number', signed: false, placeholder: 'e.g. 10', suffix: 'cm', hint: 'Enter the size; the sign is set from the type of lens or mirror.' },
    { name: 'do', label: 'Object distance dₒ', type: 'number', signed: false, placeholder: 'e.g. 30', suffix: 'cm', row: 'obj' },
    { name: 'ho', label: 'Object height hₒ', type: 'number', signed: false, placeholder: 'e.g. 2', suffix: 'cm', row: 'obj' },
  ],
  examples: [
    { label: 'Convex lens f = 10 cm, object at 30 cm', values: { type: 'convex-lens', f: '10', do: '30', ho: '2' } },
    { label: 'Magnifying glass: f = 10 cm, object at 6 cm', values: { type: 'convex-lens', f: '10', do: '6', ho: '1' } },
    { label: 'Concave mirror f = 15 cm, object at 20 cm', values: { type: 'concave-mirror', f: '15', do: '20', ho: '3' } },
    { label: 'Convex mirror f = 20 cm, object at 50 cm', values: { type: 'convex-mirror', f: '20', do: '50', ho: '5' } },
    { label: 'Diverging lens f = 12 cm, object at 24 cm', values: { type: 'concave-lens', f: '12', do: '24', ho: '4' } },
  ],
  solve(values) {
    const v = validator(values);
    const type = TYPES.some(([k]) => k === values.type) ? values.type : 'convex-lens';
    const fm = v.number('f', 'the focal length', { positive: true, maxAbs: 1e6 }), d_o = v.number('do', 'the object distance', { positive: true, maxAbs: 1e6 }), h_o = v.number('ho', 'the object height', { positive: true, maxAbs: 1e6 });
    if (!v.ok()) return v.result();
    const res = image(type, fm, d_o);
    const fT = tx(res.f);
    const steps = [
      { title: 'Sign convention', text: `${TYPES.find(([k]) => k === type)[1]}: f = ${fmt(res.f)} cm (${res.f > 0 ? 'positive: converging' : 'negative: diverging'}). Object distances are positive.` },
      { title: 'Lens / mirror equation', tex: '\\frac{1}{f} = \\frac{1}{d_o} + \\frac{1}{d_i} \\;\\Rightarrow\\; d_i = \\frac{f\\,d_o}{d_o - f}' },
    ];
    if (res.atInfinity) {
      steps.push({ title: 'Object at the focal point', tex: `d_o = f \\Rightarrow d_o - f = 0`, text: 'The refracted or reflected rays are parallel: no image forms (it is "at infinity").' });
      return { ok: true, final: { tex: 'd_i \\to \\infty\\ \\text{(no image)}' }, answers: [{ label: 'Image', value: 'at infinity — the rays leave parallel', primary: true, copy: '' }], visual: { svg: rayDiagram(type, fm, d_o, h_o), caption: 'Rays from the object leave parallel and never meet.' }, formula: ['\\frac{1}{f} = \\frac{1}{d_o} + \\frac{1}{d_i}'], steps, notes: [{ kind: 'info', text: 'Move the object slightly closer or further to get an image.' }] };
    }
    const { d_i, m } = res, h_i = m * h_o;
    steps.push({ title: 'Substitute', tex: `d_i = \\frac{(${fT})(${tx(d_o)})}{${tx(d_o)} - (${fT})} ${rel(d_i)} ${q(d_i, 'cm')}` });
    steps.push({ title: 'Magnification and image height', texLines: [`m = -\\frac{d_i}{d_o} = -\\frac{${tx(d_i, 6)}}{${tx(d_o)}} ${rel(m)} ${tx(m)}`, `h_i = m\\,h_o ${rel(h_i)} ${q(h_i, 'cm')}`] });
    steps.push({ title: 'Describe the image', text: describe(type, res) });
    return {
      ok: true,
      final: { texLines: [`d_i ${rel(d_i)} ${q(d_i, 'cm')},\\quad m ${rel(m)} ${tx(m)}`] },
      answers: [answer('Image distance dᵢ', d_i, { unit: 'cm', primary: true }), answer('Magnification m', m, { primary: true }), answer('Image height hᵢ', h_i, { unit: 'cm' }), { label: 'Image', value: describe(type, res), copy: '' }],
      visual: { svg: rayDiagram(type, fm, d_o, h_o), caption: 'Orange: the ray parallel to the axis passes through (or appears to come from) F. Green: the ray through the centre of the lens (or to the mirror’s centre) — dashed lines are extensions, used for virtual images.' },
      formula: ['\\frac{1}{f} = \\frac{1}{d_o} + \\frac{1}{d_i} \\qquad m = -\\frac{d_i}{d_o} = \\frac{h_i}{h_o}'],
      steps,
      notes: [{ kind: 'info', text: 'Thin-lens / paraxial approximation: rays close to the axis, lens thickness and mirror aberrations ignored. Other books use other sign conventions; check yours before comparing signs.' }],
    };
  },
};
