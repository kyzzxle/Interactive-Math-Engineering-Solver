/**
 * Prismatoid (prismoidal) formula: V = (h/6)(A₁ + 4Aₘ + A₂), exact for any solid whose
 * cross-section area is a quadratic (or cubic) function of height — prisms, pyramids,
 * frustums, wedges, obelisks and earthwork sections. Modes:
 *   general — the three areas are given
 *   obelisk — rectangular ends L₁×W₁ and L₂×W₂ (need not be similar)
 *   wedge   — rectangular base l×w with a top edge e parallel to l
 */
import { validator, answer, tx, units, UNIT_FIELD } from '../lib/calc-kit.js';
import { plot } from '../lib/plot.js';
import { renderSolid } from '../lib/solid3d.js';
import { obeliskMesh, prismoidal, prismatoidExplore, prismatoidPractice } from '../explore/solids-new.js';

const MODES = [['general', 'Any prismatoid: enter the three areas'], ['obelisk', 'Rectangular ends (obelisk, earthwork)'], ['wedge', 'Wedge (top is an edge)']];

export const calculator = {
  id: 'prismatoid',
  explore: prismatoidExplore,
  practice: prismatoidPractice,
  fields: [
    { name: 'mode', label: 'Solid', type: 'select', options: MODES },
    { name: 'A1', label: 'Lower base area A₁', type: 'number', signed: false, placeholder: 'e.g. 48', affix: 'area', showWhen: { mode: ['general'] }, row: 'areas' },
    { name: 'Am', label: 'Middle section area Aₘ', type: 'number', signed: false, placeholder: 'e.g. 30', affix: 'area', showWhen: { mode: ['general'] }, row: 'areas' },
    { name: 'A2', label: 'Upper base area A₂', type: 'number', signed: false, placeholder: 'e.g. 15', affix: 'area', showWhen: { mode: ['general'] }, row: 'areas', hint: 'Aₘ is the section halfway up. It is not the average of A₁ and A₂ in general.' },
    { name: 'L1', label: 'Bottom length L₁', type: 'number', signed: false, placeholder: 'e.g. 12', affix: 'len', showWhen: { mode: ['obelisk'] }, row: 'b1' },
    { name: 'W1', label: 'Bottom width W₁', type: 'number', signed: false, placeholder: 'e.g. 8', affix: 'len', showWhen: { mode: ['obelisk'] }, row: 'b1' },
    { name: 'L2', label: 'Top length L₂', type: 'number', signed: false, placeholder: 'e.g. 6', affix: 'len', showWhen: { mode: ['obelisk'] }, row: 'b2' },
    { name: 'W2', label: 'Top width W₂', type: 'number', signed: false, placeholder: 'e.g. 5', affix: 'len', showWhen: { mode: ['obelisk'] }, row: 'b2' },
    { name: 'l', label: 'Base length l', type: 'number', signed: false, placeholder: 'e.g. 10', affix: 'len', showWhen: { mode: ['wedge'] }, row: 'wb' },
    { name: 'w', label: 'Base width w', type: 'number', signed: false, placeholder: 'e.g. 6', affix: 'len', showWhen: { mode: ['wedge'] }, row: 'wb' },
    { name: 'e', label: 'Top edge e (parallel to l)', type: 'number', signed: false, placeholder: 'e.g. 4', affix: 'len', showWhen: { mode: ['wedge'] } },
    { name: 'h', label: 'Height h (between the parallel ends)', type: 'number', signed: false, placeholder: 'e.g. 5', affix: 'len' },
    UNIT_FIELD,
  ],
  examples: [
    { label: 'Obelisk: 12 × 8 base, 6 × 5 top, 5 m high', values: { mode: 'obelisk', L1: '12', W1: '8', L2: '6', W2: '5', h: '5', unit: 'm' } },
    { label: 'Wedge: 10 × 6 base, top edge 4, height 5', values: { mode: 'wedge', l: '10', w: '6', e: '4', h: '5', unit: 'cm' } },
    { label: 'Earthwork from three section areas', values: { mode: 'general', A1: '48', Am: '30', A2: '15', h: '20', unit: 'm' } },
    { label: 'Check: a square pyramid as a prismatoid', values: { mode: 'obelisk', L1: '6', W1: '6', L2: '0', W2: '0', h: '9', unit: '' } },
    { label: 'Impossible: middle section too small for these ends', values: { mode: 'general', A1: '100', Am: '4', A2: '100', h: '3', unit: '' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const mode = MODES.some(([k]) => k === values.mode) ? values.mode : 'general';
    const h = v.number('h', 'the height', { positive: true, maxAbs: 1e7 });
    let A1, Am, A2, dims = {};
    if (mode === 'general') {
      A1 = v.number('A1', 'the lower base area', { nonneg: true, maxAbs: 1e12 });
      Am = v.number('Am', 'the middle section area', { positive: true, maxAbs: 1e12 });
      A2 = v.number('A2', 'the upper base area', { nonneg: true, maxAbs: 1e12 });
    } else if (mode === 'obelisk') {
      dims = { L1: v.number('L1', 'the bottom length', { positive: true, maxAbs: 1e6 }), W1: v.number('W1', 'the bottom width', { positive: true, maxAbs: 1e6 }), L2: v.number('L2', 'the top length', { nonneg: true, maxAbs: 1e6 }), W2: v.number('W2', 'the top width', { nonneg: true, maxAbs: 1e6 }) };
    } else {
      dims = { l: v.number('l', 'the base length', { positive: true, maxAbs: 1e6 }), w: v.number('w', 'the base width', { positive: true, maxAbs: 1e6 }), e: v.number('e', 'the top edge', { nonneg: true, maxAbs: 1e6 }) };
    }
    if (!v.ok()) return v.result();
    const u = units(values.unit);
    const steps = [];
    let lateral = null, mesh = null, extra = [];
    if (mode === 'general') {
      // Brunn–Minkowski: for a convex solid √A grows concavely with height, so the middle
      // section can never be smaller than ((√A₁ + √A₂)/2)². (It may be larger than both ends.)
      const least = ((Math.sqrt(A1) + Math.sqrt(A2)) / 2) ** 2;
      if (Am < least * (1 - 1e-9)) return { ok: false, errors: [{ field: 'Am', message: `With ends of ${tx(A1)} and ${tx(A2)}, the middle section of a convex solid must be at least ((√A₁ + √A₂)/2)² ≈ ${tx(least, 4)}. Check Aₘ: it is the section halfway up, not an average of the areas.` }] };
      steps.push({ title: 'Known areas', tex: `A_1 = ${tx(A1)},\\quad A_m = ${tx(Am)},\\quad A_2 = ${tx(A2)}${u.texArea},\\quad h = ${tx(h)}${u.texLen}` });
    } else if (mode === 'obelisk') {
      const { L1, W1, L2, W2 } = dims;
      if ((L2 === 0) !== (W2 === 0) && !(L2 > 0 && W2 === 0)) return { ok: false, errors: [{ field: 'L2', message: 'For a top that is a single edge, give its length L₂ and set the width W₂ to 0 (or use the wedge mode).' }] };
      A1 = L1 * W1; A2 = L2 * W2; Am = ((L1 + L2) / 2) * ((W1 + W2) / 2);
      steps.push({ title: 'End areas', tex: `A_1 = L_1 W_1 = ${tx(L1)} \\times ${tx(W1)} = ${tx(A1)},\\qquad A_2 = L_2 W_2 = ${tx(L2)} \\times ${tx(W2)} = ${tx(A2)}` });
      steps.push({ title: 'Middle section: average the sides, not the areas', tex: `A_m = \\frac{L_1 + L_2}{2} \\cdot \\frac{W_1 + W_2}{2} = ${tx((L1 + L2) / 2)} \\times ${tx((W1 + W2) / 2)} = ${tx(Am)}` });
      const sL = Math.hypot(h, (W1 - W2) / 2), sW = Math.hypot(h, (L1 - L2) / 2);
      lateral = (L1 + L2) * sL + (W1 + W2) * sW;
      steps.push({ title: 'Lateral area (four trapezoids, top centred over the base)', texLines: [`s_L = \\sqrt{h^2 + \\left(\\tfrac{W_1 - W_2}{2}\\right)^2} \\approx ${tx(sL)},\\quad s_W = \\sqrt{h^2 + \\left(\\tfrac{L_1 - L_2}{2}\\right)^2} \\approx ${tx(sW)}`, `L = (L_1 + L_2)\\,s_L + (W_1 + W_2)\\,s_W \\approx ${tx(lateral)}`] });
      mesh = obeliskMesh(L1, W1, L2, W2, h);
      const similar = L2 > 0 && W2 > 0 && Math.abs(L2 / L1 - W2 / W1) < 1e-9;
      extra.push({ kind: 'info', text: similar ? 'The two ends are similar, so this is also a frustum of a pyramid: the frustum formula (h/3)(A₁ + A₂ + √(A₁A₂)) gives the same volume.' : 'The ends are not similar, so this is not a frustum of a pyramid and the frustum formula would be wrong. The prismoidal formula is still exact.' });
    } else {
      const { l, w, e } = dims;
      A1 = l * w; A2 = 0; Am = ((l + e) / 2) * (w / 2);
      steps.push({ title: 'Sections of the wedge', tex: `A_1 = l w = ${tx(A1)},\\qquad A_m = \\frac{l + e}{2} \\cdot \\frac{w}{2} = ${tx(Am)},\\qquad A_2 = 0` });
      const sT = Math.hypot(h, w / 2), sE = Math.hypot(h, (l - e) / 2);
      lateral = (l + e) * sT + w * sE;
      steps.push({ title: 'Lateral area: two trapezoids and two triangles (edge centred above the base)', tex: `L = (l + e)\\sqrt{h^2 + (w/2)^2} + w\\sqrt{h^2 + \\left(\\tfrac{l - e}{2}\\right)^2} \\approx ${tx(lateral)}` });
      mesh = obeliskMesh(l, w, e, 0, h);
      extra.push({ kind: 'info', text: `Short form for a wedge: V = (wh/6)(2l + e) = ${tx((w * h * (2 * l + e)) / 6)}.` });
    }
    const V = prismoidal(A1, Am, A2, h);
    steps.push({ title: 'Prismoidal formula', texLines: ['V = \\frac{h}{6}\\left(A_1 + 4A_m + A_2\\right)', `V = \\frac{${tx(h)}}{6}\\left(${tx(A1)} + 4(${tx(Am)}) + ${tx(A2)}\\right) = ${tx(V)}${u.texVol}`] });
    const avg = ((A1 + A2) / 2) * h;
    if (Math.abs(avg - V) > 1e-9 * Math.max(1, V)) steps.push({ title: 'Compare: the average-end-area method', tex: `\\frac{A_1 + A_2}{2}\\,h = ${tx(avg)}`, text: `This common shortcut is ${avg > V ? 'too large' : 'too small'} by ${tx(Math.abs(avg - V), 4)}, because it ignores how the section changes in between.` });
    if (!Number.isFinite(V)) return { ok: false, errors: [{ message: 'These values are too extreme to compute reliably.' }] };
    const answers = [answer('Volume V', V, { unit: u.vol, primary: true }), answer('Lower base area A₁', A1, { unit: u.area }), answer('Middle section area Aₘ', Am, { unit: u.area }), answer('Upper base area A₂', A2, { unit: u.area })];
    if (lateral !== null) { answers.push(answer('Lateral area', lateral, { unit: u.area })); answers.push(answer('Total surface area', lateral + A1 + A2, { unit: u.area })); }
    answers.push(answer('Average-end-area estimate (for comparison)', avg, { unit: u.vol }));
    const visual = mesh
      ? { svg: renderSolid(mesh, { yaw: 35, pitch: 22, scale: 170 / Math.max(h, ...Object.values(dims).filter(Number.isFinite)), title: mode === 'wedge' ? 'Wedge' : 'Prismatoid with rectangular ends' }), caption: 'Drawn with the top centred over the base. Volume depends only on the three section areas, so it holds even when the top is off-centre.' }
      : { svg: plot({ x: [-1.2, 1.2], y: [-0.15, 1.15], width: 360, height: 220, title: 'Three parallel sections', segments: [{ x1: -Math.sqrt(A1) / Math.sqrt(Math.max(A1, Am, A2)), y1: 0, x2: Math.sqrt(A1) / Math.sqrt(Math.max(A1, Am, A2)), y2: 0, cls: 'd-line' }, { x1: -Math.sqrt(Am) / Math.sqrt(Math.max(A1, Am, A2)), y1: 0.5, x2: Math.sqrt(Am) / Math.sqrt(Math.max(A1, Am, A2)), y2: 0.5, cls: 'd-line2' }, { x1: -Math.sqrt(A2) / Math.sqrt(Math.max(A1, Am, A2)), y1: 1, x2: Math.sqrt(A2) / Math.sqrt(Math.max(A1, Am, A2)), y2: 1, cls: 'd-line' }], xTicks: [], points: [], xLabel: '', yLabel: '' }), caption: 'Blue: the two ends (A₁ at the bottom, A₂ at the top). Green: the middle section halfway up, which the formula weights four times. Widths are drawn in proportion to √area.' };
    return {
      ok: true,
      final: { tex: `V = \\frac{h}{6}\\left(A_1 + 4A_m + A_2\\right) = ${tx(V)}${u.texVol}` },
      answers,
      visual,
      formula: ['V = \\frac{h}{6}\\left(A_1 + 4A_m + A_2\\right)'],
      steps,
      notes: [{ kind: 'info', text: 'A prismatoid has all its vertices in two parallel planes. The prismoidal formula is exact for prisms, pyramids, frustums, wedges and obelisks, and is Simpson’s rule applied to the cross-section area.' }, ...extra],
    };
  },
};
