/** Right circular cone: s = √(r² + h²), LSA = πrs, TSA = πr² + πrs, V = (1/3)πr²h. */
import { validator, answer, fmt, tx, units, UNIT_FIELD } from '../lib/calc-kit.js';
import { toCommonScale } from '../lib/parse.js';
import { radicalExpr, radicalTex, radicalText, simplifySqrt, isRational } from '../lib/exact.js';
import { coneSketch } from '../lib/diagrams.js';

import { coneExplore } from '../explore/solids.js';
function exactForms(rText, kText, known) {
  const sc = toCommonScale([rText, kText]);
  if (!sc) return null;
  const [r, k] = sc.ints, S = sc.scale;
  if (known === 'h') {
    const root = simplifySqrt(r * r + k * k); if (!root) return null;
    const [a, b] = root; // s = a√b / S
    return { base: radicalExpr([[r * r, 1]], S * S), s: radicalExpr([[a, b]], S), h: radicalExpr([[k, 1]], S), lsa: radicalExpr([[r * a, b]], S * S), tsa: radicalExpr([[r * r, 1], [r * a, b]], S * S), vol: radicalExpr([[r * r * k, 1]], 3 * S ** 3) };
  }
  const root = simplifySqrt(k * k - r * r); if (!root) return null;
  const [c, d] = root; // h = c√d / S
  return { base: radicalExpr([[r * r, 1]], S * S), h: radicalExpr([[c, d]], S), s: radicalExpr([[k, 1]], S), lsa: radicalExpr([[r * k, 1]], S * S), tsa: radicalExpr([[r * r + r * k, 1]], S * S), vol: radicalExpr([[r * r * c, d]], 3 * S ** 3) };
}

const piCard = (label, expr, x, unit, primary) => {
  const a = answer(label, x, { unit, primary, irrational: true, exactTex: expr ? radicalTex(expr, '\\pi') : undefined });
  if (expr) a.copy = `${label}: ${radicalText(expr, 'π')} ≈ ${a.value}`;
  return a;
};

export const calculator = {
  id: 'cone',
  explore: coneExplore,
  fields: [
    { name: 'known', label: 'Which height do you know?', type: 'radio', options: [['h', 'Height h'], ['s', 'Slant height s']] },
    { name: 'r', label: 'Base radius r', type: 'number', signed: false, placeholder: 'e.g. 3', affix: 'len', row: 'a' },
    { name: 'h', label: 'Perpendicular height h', type: 'number', signed: false, placeholder: 'e.g. 4', affix: 'len', row: 'a', showWhen: { known: ['h'] } },
    { name: 's', label: 'Slant height s', type: 'number', signed: false, placeholder: 'e.g. 5', affix: 'len', row: 'a', showWhen: { known: ['s'] } },
    UNIT_FIELD,
  ],
  examples: [
    { label: 'r = 3, h = 4', values: { known: 'h', r: '3', h: '4', unit: 'cm' } },
    { label: 'r = 5, s = 13', values: { known: 's', r: '5', s: '13', unit: 'm' } },
  ],
  solve(values) {
    const v = validator(values);
    const known = values.known === 's' ? 's' : 'h';
    const r = v.number('r', 'the radius', { positive: true });
    const k = v.number(known, known === 'h' ? 'the height' : 'the slant height', { positive: true });
    if (!v.ok()) return v.result();
    if (known === 's' && k <= r) return { ok: false, errors: [{ field: 's', message: `The slant height (${fmt(k)}) must be longer than the radius (${fmt(r)}), because it is the hypotenuse of the right triangle formed by r, h and s.` }] };
    const u = units(values.unit);
    const h = known === 'h' ? k : Math.sqrt((k - r) * (k + r));
    const s = known === 's' ? k : Math.hypot(r, h);
    const base = Math.PI * r * r, lsa = Math.PI * r * s, tsa = base + lsa, V = (base * h) / 3;
    const ex = exactForms(values.r, values[known], known);
    const ext = (e) => (e ? ` = ${radicalTex(e, '\\pi')}` : '');
    const steps = [{ title: 'Identify the known values', tex: `r = ${tx(r)}, \\quad ${known} = ${tx(k)}` }];
    if (known === 'h') steps.push({ title: 'Slant height (Pythagorean theorem)', texLines: ['s = \\sqrt{r^2 + h^2}', `s = \\sqrt{${tx(r)}^2 + ${tx(h)}^2} = \\sqrt{${tx(r * r + h * h)}}`, `s${ex && !isRational(ex.s) ? ` = ${radicalTex(ex.s)}` : ''} ${Number.isInteger(s) ? '=' : '\\approx'} ${tx(s)}`] });
    else steps.push({ title: 'Height (Pythagorean theorem)', texLines: ['h = \\sqrt{s^2 - r^2}', `h = \\sqrt{${tx(s)}^2 - ${tx(r)}^2} = \\sqrt{${tx(s * s - r * r)}}`, `h${ex && !isRational(ex.h) ? ` = ${radicalTex(ex.h)}` : ''} ${Number.isInteger(h) ? '=' : '\\approx'} ${tx(h)}`] });
    steps.push(
      { title: 'Lateral (curved) surface area', texLines: ['LSA = \\pi r s', `LSA = \\pi (${tx(r)})(${tx(s)})`, `LSA${ext(ex && ex.lsa)} \\approx ${tx(lsa)}`] },
      { title: 'Total surface area (add the base)', texLines: ['TSA = \\pi r^2 + \\pi r s', `TSA \\approx ${tx(base)} + ${tx(lsa)}`, `TSA${ext(ex && ex.tsa)} \\approx ${tx(tsa)}`] },
      { title: 'Volume (one third of the matching cylinder)', texLines: ['V = \\frac{1}{3}\\pi r^2 h', `V = \\frac{1}{3}\\pi (${tx(r)})^2 (${tx(h)})`, `V${ext(ex && ex.vol)} \\approx ${tx(V)}`] },
    );
    const missing = known === 'h' ? answer('Slant height s', s, { unit: u.len, exactTex: ex && !isRational(ex.s) ? radicalTex(ex.s) : undefined }) : answer('Height h', h, { unit: u.len, exactTex: ex && !isRational(ex.h) ? radicalTex(ex.h) : undefined });
    return {
      ok: true,
      final: { texLines: [`V${ext(ex && ex.vol)} \\approx ${tx(V)}${u.texVol}`, `TSA${ext(ex && ex.tsa)} \\approx ${tx(tsa)}${u.texArea}`] },
      answers: [piCard('Volume V', ex && ex.vol, V, u.vol, true), piCard('Total surface area', ex && ex.tsa, tsa, u.area, true), piCard('Lateral surface area', ex && ex.lsa, lsa, u.area), missing, piCard('Base area πr²', ex && ex.base, base, u.area)],
      visual: { svg: coneSketch({ r: `r = ${fmt(r, 4)}`, h: known === 'h' ? `h = ${fmt(h, 4)}` : { t: `h ≈ ${fmt(h, 4)}`, unknown: true }, s: known === 's' ? `s = ${fmt(s, 4)}` : { t: `s ≈ ${fmt(s, 4)}`, unknown: true } }), caption: 'The calculated measurement is highlighted. Sketch not to scale.' },
      formula: ['s = \\sqrt{r^2 + h^2} \\qquad LSA = \\pi r s \\qquad V = \\frac{1}{3}\\pi r^2 h'],
      steps,
      notes: [{ kind: 'info', text: 'A cone holds exactly one third of the volume of a cylinder with the same base and height.' }],
    };
  },
};
