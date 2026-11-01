/**
 * Inclusion–exclusion for two or three finite sets:
 *   |A ∪ B| = |A| + |B| − |A ∩ B|
 *   |A ∪ B ∪ C| = |A| + |B| + |C| − |A∩B| − |A∩C| − |B∩C| + |A∩B∩C|
 * Every region of the Venn diagram is computed and must be ≥ 0, so inconsistent data are rejected.
 */
import { validator } from '../lib/calc-kit.js';
import { venn } from '../lib/diagrams.js';

const f = (name, label, show) => ({ name, label, type: 'number', inputmode: 'numeric', placeholder: '0', ...(show ? { showWhen: { sets: ['3'] } } : {}) });

export const calculator = {
  id: 'inclusion-exclusion',
  fields: [
    { name: 'sets', label: 'Number of sets', type: 'radio', options: [['2', 'Two sets (A, B)'], ['3', 'Three sets (A, B, C)']] },
    { ...f('A', '|A|'), row: 's' }, { ...f('B', '|B|'), row: 's' }, { ...f('C', '|C|', true), row: 's' },
    { ...f('AB', '|A ∩ B|'), row: 'p' }, { ...f('AC', '|A ∩ C|', true), row: 'p' }, { ...f('BC', '|B ∩ C|', true), row: 'p' },
    f('ABC', '|A ∩ B ∩ C|', true),
    { name: 'U', label: 'Total |U| (optional, to count "none of the sets")', type: 'number', inputmode: 'numeric', placeholder: 'leave blank if unknown' },
  ],
  examples: [
    { label: '30 study French, 25 Spanish, 10 both (of 50)', values: { sets: '2', A: '30', B: '25', AB: '10', U: '50' } },
    { label: 'Three clubs', values: { sets: '3', A: '40', B: '35', C: '30', AB: '12', AC: '10', BC: '8', ABC: '4', U: '100' } },
    { label: 'Numbers ≤ 100 divisible by 2, 3 or 5', values: { sets: '3', A: '50', B: '33', C: '20', AB: '16', AC: '10', BC: '6', ABC: '3', U: '100' } },
  ],
  solve(values) {
    const v = validator(values);
    const three = values.sets === '3';
    const g = (name, label) => v.whole(name, label, 1e12);
    const A = g('A', '|A|'), B = g('B', '|B|'), AB = g('AB', '|A ∩ B|');
    let C = 0, AC = 0, BC = 0, ABC = 0;
    if (three) { C = g('C', '|C|'); AC = g('AC', '|A ∩ C|'); BC = g('BC', '|B ∩ C|'); ABC = g('ABC', '|A ∩ B ∩ C|'); }
    const hasU = String(values.U ?? '').trim() !== '';
    const U = hasU ? g('U', '|U|') : null;
    if (!v.ok()) return v.result();
    // regions of the Venn diagram
    const r = three
      ? { ABC, AB: AB - ABC, AC: AC - ABC, BC: BC - ABC, A: A - AB - AC + ABC, B: B - AB - BC + ABC, C: C - AC - BC + ABC }
      : { AB, A: A - AB, B: B - AB };
    const names = { A: 'only A', B: 'only B', C: 'only C', AB: three ? 'A and B but not C' : 'both A and B', AC: 'A and C but not B', BC: 'B and C but not A', ABC: 'all three' };
    const bad = Object.entries(r).find(([, val]) => val < 0);
    if (bad) {
      const field = { A: ['A', 'AB'], B: ['B', 'AB'], C: ['C', 'AC'], AB: ['AB', 'ABC'], AC: ['AC', 'ABC'], BC: ['BC', 'ABC'], ABC: ['ABC'] }[bad[0]];
      return { ok: false, errors: [{ field, message: `These numbers are inconsistent: the region "${names[bad[0]]}" would contain ${bad[1]} elements. An intersection cannot be larger than the sets it belongs to.` }] };
    }
    const union = three ? A + B + C - AB - AC - BC + ABC : A + B - AB;
    if (hasU && union > U) return { ok: false, errors: [{ field: 'U', message: `The union has ${union} elements, which is more than the total |U| = ${U}.` }] };
    const steps = three
      ? [
        { title: 'Add the sizes of the three sets', text: 'Elements in two sets are now counted twice, and those in all three are counted three times.', tex: `|A| + |B| + |C| = ${A} + ${B} + ${C} = ${A + B + C}` },
        { title: 'Subtract the pairwise intersections', text: 'This removes the double counting, but elements in all three sets have now been subtracted three times.', tex: `- (|A \\cap B| + |A \\cap C| + |B \\cap C|) = -(${AB} + ${AC} + ${BC}) = -${AB + AC + BC}` },
        { title: 'Add back the triple intersection', tex: `+ |A \\cap B \\cap C| = +${ABC}` },
        { title: 'Result', tex: `|A \\cup B \\cup C| = ${A + B + C} - ${AB + AC + BC} + ${ABC} = ${union}` },
      ]
      : [
        { title: 'Add the sizes of the two sets', text: 'Elements in both sets are counted twice.', tex: `|A| + |B| = ${A} + ${B} = ${A + B}` },
        { title: 'Subtract the intersection once', tex: `|A \\cup B| = ${A + B} - ${AB} = ${union}` },
      ];
    const regions = { ...r, ...(hasU ? { none: U - union } : {}) };
    steps.push({ title: 'Count each region of the Venn diagram', text: Object.entries(r).map(([k, val]) => `${names[k]}: ${val}`).join('; ') + (hasU ? `; none of the sets: ${U} − ${union} = ${U - union}` : '') + '.' });
    const exactlyOne = r.A + r.B + (three ? r.C : 0);
    return {
      ok: true,
      final: { tex: `|${three ? 'A \\cup B \\cup C' : 'A \\cup B'}| = ${union}`, text: hasU ? `${U - union} element${U - union === 1 ? ' is' : 's are'} in none of the sets.` : undefined },
      answers: [
        { label: three ? '|A ∪ B ∪ C| (at least one set)' : '|A ∪ B| (at least one set)', value: String(union), primary: true },
        { label: 'In exactly one set', value: String(exactlyOne) },
        ...(three ? [{ label: 'In exactly two sets', value: String(r.AB + r.AC + r.BC) }] : []),
        ...(hasU ? [{ label: 'In none of the sets', value: String(U - union), primary: true }] : []),
      ],
      visual: { svg: venn(three ? ['A', 'B', 'C'] : ['A', 'B'], regions, 'Venn diagram with the number of elements in each region'), caption: 'Each number counts the elements in exactly that region.' },
      formula: [three ? '|A \\cup B \\cup C| = |A| + |B| + |C| - |A \\cap B| - |A \\cap C| - |B \\cap C| + |A \\cap B \\cap C|' : '|A \\cup B| = |A| + |B| - |A \\cap B|'],
      steps,
      rounding: false,
    };
  },
};
