/**
 * Angle between two lines, from slopes, general-form coefficients or 3D direction vectors.
 *   slopes:  tan θ = |(m₂ − m₁)/(1 + m₁m₂)|  (perpendicular when m₁m₂ = −1, parallel when m₁ = m₂)
 *   vectors: cos θ = |u·v| / (|u||v|)
 * The acute angle and its supplement (the obtuse angle) are both reported.
 */
import { validator, answer, fmt, tx } from '../lib/calc-kit.js';
import { plot } from '../lib/plot.js';
import { twoLinesExplore } from '../explore/geometry.js';

const deg = (r) => (r * 180) / Math.PI;
const niceDeg = (x) => (Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.round(x)) : tx(x, 4));

function angleSketch(theta) {
  const r = (theta * Math.PI) / 180;
  const arc = (t) => [0.9 * Math.cos(t), 0.9 * Math.sin(t)];
  const pts = Array.from({ length: 30 }, (_, i) => arc((r * i) / 29));
  return plot({
    x: [-1.6, 2.6], y: [-0.6, 2.2], equal: true, width: 340, height: 230, includeZero: false, title: `Two lines meeting at ${niceDeg(theta)} degrees`,
    segments: [{ x1: -1.5, y1: 0, x2: 2.5, y2: 0, cls: 'd-line' }, { x1: -1.5 * Math.cos(r), y1: -1.5 * Math.sin(r), x2: 2.2 * Math.cos(r), y2: 2.2 * Math.sin(r), cls: 'd-line2' },
      ...pts.slice(1).map((p, i) => ({ x1: pts[i][0], y1: pts[i][1], x2: p[0], y2: p[1], cls: 'd-line3' }))],
    points: [{ x: 0, y: 0, label: '' }, { x: 1.1 * Math.cos(r / 2), y: 1.1 * Math.sin(r / 2), label: `θ = ${niceDeg(theta)}°`, r: 0.1 }],
  });
}

export const calculator = {
  id: 'angle-between-lines',
  explore: { ...twoLinesExplore, title: 'Turn two lines and watch the angle' },
  fields: [
    { name: 'mode', label: 'Lines given as', type: 'radio', options: [['slopes', 'Slopes'], ['general', 'Ax + By + C = 0'], ['vectors', '3D direction vectors']] },
    { name: 'm1', label: 'Slope m₁', type: 'text', placeholder: 'e.g. 2', row: 'm', showWhen: { mode: ['slopes'] }, rowShowWhen: { mode: ['slopes'] } },
    { name: 'm2', label: 'Slope m₂', type: 'text', placeholder: 'e.g. -1/3', row: 'm', showWhen: { mode: ['slopes'] } },
    { name: 'A1', label: 'A₁', type: 'text', placeholder: 'e.g. 3', row: 'g1', showWhen: { mode: ['general'] }, rowShowWhen: { mode: ['general'] } },
    { name: 'B1', label: 'B₁', type: 'text', placeholder: 'e.g. -4', row: 'g1', showWhen: { mode: ['general'] } },
    { name: 'A2', label: 'A₂', type: 'text', placeholder: 'e.g. 1', row: 'g2', showWhen: { mode: ['general'] }, rowShowWhen: { mode: ['general'] } },
    { name: 'B2', label: 'B₂', type: 'text', placeholder: 'e.g. 1', row: 'g2', showWhen: { mode: ['general'] }, hint: 'C does not affect the angle, so it is not needed.' },
    { name: 'u', label: 'Direction u (x, y, z)', type: 'text', placeholder: 'e.g. 1, 2, 2', showWhen: { mode: ['vectors'] } },
    { name: 'w', label: 'Direction v (x, y, z)', type: 'text', placeholder: 'e.g. 2, -1, 2', showWhen: { mode: ['vectors'] } },
  ],
  examples: [
    { label: 'Slopes 2 and −1/3', values: { mode: 'slopes', m1: '2', m2: '-1/3' } },
    { label: '3x − 4y + 1 = 0 and x + y − 5 = 0', values: { mode: 'general', A1: '3', B1: '-4', A2: '1', B2: '1' } },
    { label: '3D: (1, 2, 2) and (2, −1, 2)', values: { mode: 'vectors', u: '1, 2, 2', w: '2, -1, 2' } },
    { label: 'Perpendicular slopes 2 and −1/2', values: { mode: 'slopes', m1: '2', m2: '-1/2' } },
    { label: 'Invalid: zero direction vector', values: { mode: 'vectors', u: '0, 0, 0', w: '1, 0, 0' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const mode = ['slopes', 'general', 'vectors'].includes(values.mode) ? values.mode : 'slopes';
    let u, w;
    const steps = [];
    if (mode === 'slopes') {
      const m1 = v.frac('m1', 'slope m₁'), m2 = v.frac('m2', 'slope m₂');
      if (!v.ok()) return v.result();
      steps.push({ title: 'Known values', tex: `m_1 = ${m1.toTex()},\\quad m_2 = ${m2.toTex()}` });
      steps.push({ title: 'Formula', tex: '\\tan\\theta = \\left\\lvert \\frac{m_2 - m_1}{1 + m_1 m_2} \\right\\rvert' });
      const top = m2.sub(m1), bot = m1.mul(m2).add(1);
      if (top.isZero()) {
        steps.push({ title: 'Equal slopes', tex: 'm_1 = m_2 \\Rightarrow \\tan\\theta = 0' });
        return finish(0, steps, 'The lines are parallel (or the same line): the angle between them is 0°.');
      }
      if (bot.isZero()) {
        steps.push({ title: 'The denominator is zero', tex: `1 + m_1 m_2 = 1 + (${m1.toTex()})(${m2.toTex()}) = 0` });
        return finish(90, steps, 'm₁m₂ = −1, so the lines are perpendicular.');
      }
      const t = top.div(bot).abs();
      steps.push({ title: 'Substitute', tex: `\\tan\\theta = \\left\\lvert \\frac{${top.toTex()}}{${bot.toTex()}} \\right\\rvert = ${t.toTex()}` });
      const th = deg(Math.atan(t.toNumber()));
      steps.push({ title: 'Take the inverse tangent', tex: `\\theta = \\tan^{-1}\\left(${t.toTex()}\\right) \\approx ${niceDeg(th)}^\\circ` });
      return finish(th, steps);
    }
    if (mode === 'general') {
      const [A1, B1, A2, B2] = ['A1', 'B1', 'A2', 'B2'].map((k) => v.frac(k, k.replace('1', '₁').replace('2', '₂')));
      if (!v.ok()) return v.result();
      if (A1.isZero() && B1.isZero()) return { ok: false, errors: [{ field: ['A1', 'B1'], message: 'A₁ and B₁ cannot both be 0.' }] };
      if (A2.isZero() && B2.isZero()) return { ok: false, errors: [{ field: ['A2', 'B2'], message: 'A₂ and B₂ cannot both be 0.' }] };
      u = [B1, A1.neg()]; w = [B2, A2.neg()];
      steps.push({ title: 'Direction of each line', text: 'A line Ax + By + C = 0 has normal (A, B) and direction (B, −A). The angle between the normals equals the angle between the lines.' });
      steps.push({ title: 'Normals', tex: `n_1 = (${A1.toTex()},\\ ${B1.toTex()}),\\quad n_2 = (${A2.toTex()},\\ ${B2.toTex()})` });
      u = [A1, B1]; w = [A2, B2];
    } else {
      const parse3 = (name, label) => {
        const parts = String(values[name] ?? '').split(/[\s,;]+/).filter(Boolean);
        if (parts.length !== 3) { v.fail(name, `Enter three components for ${label}, for example 1, 2, 2.`); return null; }
        const out = [];
        for (const p of parts) { const val = validator({ q: p }).frac('q', label); if (!val) { v.fail(name, `${label} must contain numbers or fractions, for example 1, -2, 3/2.`); return null; } out.push(val); }
        if (out.every((f) => f.isZero())) { v.fail(name, `${label} cannot be the zero vector.`); return null; }
        return out;
      };
      u = parse3('u', 'direction u'); w = parse3('w', 'direction v');
      if (!v.ok()) return v.result();
      steps.push({ title: 'Direction vectors', tex: `u = (${u.map((f) => f.toTex()).join(',\\ ')}),\\quad v = (${w.map((f) => f.toTex()).join(',\\ ')})` });
    }
    const dot = u.reduce((s, x, i) => s.add(x.mul(w[i])), u[0].mul(0));
    const nu = u.reduce((s, x) => s.add(x.pow(2)), u[0].mul(0)), nw = w.reduce((s, x) => s.add(x.pow(2)), w[0].mul(0));
    steps.push({ title: 'Formula', tex: '\\cos\\theta = \\frac{\\lvert u \\cdot v \\rvert}{\\lVert u \\rVert\\, \\lVert v \\rVert}' });
    steps.push({ title: 'Dot product and lengths', texLines: [`u \\cdot v = ${u.map((x, i) => `(${x.toTex()})(${w[i].toTex()})`).join(' + ')} = ${dot.toTex()}`, `\\lVert u \\rVert = \\sqrt{${nu.toTex()}},\\quad \\lVert v \\rVert = \\sqrt{${nw.toTex()}}`] });
    const c = Math.min(1, Math.abs(dot.toNumber()) / Math.sqrt(nu.toNumber() * nw.toNumber()));
    steps.push({ title: 'Substitute', tex: `\\cos\\theta = \\frac{${dot.abs().toTex()}}{\\sqrt{${nu.toTex()}}\\sqrt{${nw.toTex()}}} \\approx ${tx(c, 6)}` });
    const th = deg(Math.acos(c));
    steps.push({ title: 'Take the inverse cosine', tex: `\\theta = \\cos^{-1}(${tx(c, 6)}) \\approx ${niceDeg(th)}^\\circ` });
    return finish(th, steps, dot.isZero() ? 'The dot product is 0, so the lines are perpendicular.' : c > 1 - 1e-15 ? 'The directions are parallel: the angle is 0°.' : '');

    function finish(theta, st, msg) {
      const obtuse = 180 - theta;
      return {
        ok: true,
        final: { tex: `\\theta ${Math.abs(theta - Math.round(theta)) < 1e-9 ? '=' : '\\approx'} ${niceDeg(theta)}^\\circ` },
        answers: [
          answer('Acute angle θ', theta, { unit: '°', primary: true, decimals: 4, irrational: Math.abs(theta - Math.round(theta)) > 1e-9 }),
          answer('Obtuse angle 180° − θ', obtuse, { unit: '°', decimals: 4, irrational: Math.abs(theta - Math.round(theta)) > 1e-9 }),
          answer('Acute angle in radians', (theta * Math.PI) / 180, { unit: 'rad', irrational: theta !== 0 }),
        ],
        visual: { svg: angleSketch(theta), caption: mode === 'vectors' ? 'Drawn in the plane containing both directions (skew lines are moved to a common point).' : 'Two intersecting lines form two pairs of equal angles: θ and 180° − θ.' },
        formula: ['\\tan\\theta = \\left\\lvert \\frac{m_2 - m_1}{1 + m_1 m_2} \\right\\rvert \\qquad \\cos\\theta = \\frac{\\lvert u \\cdot v \\rvert}{\\lVert u \\rVert \\lVert v \\rVert}'],
        steps: st,
        notes: [{ kind: 'info', text: msg || `The angle between lines is taken as the acute one (${fmt(theta, 4)}°); its supplement ${fmt(obtuse, 4)}° is the other angle at the crossing.` }],
      };
    }
  },
};
