/**
 * Adds explanations to solution steps after a calculator has solved a problem.
 *
 *   withNotes(calculator, notes, extra)
 *
 * notes: { 'Title prefix': 'explanation' | (step, values, result) => 'explanation' }.
 *        The first prefix that matches a step's title is used; steps that already have a note
 *        keep it.
 * extra: optional (result, values) => void, for appending extra steps such as a final check.
 */
export function withNotes(calculator, notes, extra) {
  const solve = calculator.solve.bind(calculator);
  calculator.solve = (values) => {
    const r = solve(values);
    if (!r || !r.ok || !Array.isArray(r.steps)) return r;
    for (const s of r.steps) {
      if (s.note) continue;
      const key = Object.keys(notes).find((k) => s.title.startsWith(k));
      if (!key) continue;
      const n = typeof notes[key] === 'function' ? notes[key](s, values, r) : notes[key];
      if (n) s.note = n;
    }
    if (extra) {
      try { extra(r, values); } catch (e) { /* a check that cannot be built is left out */ }
    }
    return r;
  };
  return calculator;
}
