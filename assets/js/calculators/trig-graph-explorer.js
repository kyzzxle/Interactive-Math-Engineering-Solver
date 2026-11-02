/**
 * Transformations of y = A·f(B(x − C)) + D with f = sin, cos or tan (x in radians):
 *   amplitude |A| (sin, cos), period 2π/|B| (π/|B| for tan), phase shift C, vertical shift D,
 *   range [D − |A|, D + |A|]; key points of one period and, for tan, the asymptotes.
 */
import { validator, answer, tx, fmt } from '../lib/calc-kit.js';
import { piMultiple, piFracTex } from '../lib/trig.js';
import { plot } from '../lib/plot.js';
import { pick, randInt } from '../lib/learn.js';

const FN = { sin: Math.sin, cos: Math.cos, tan: Math.tan };
const pt = (x) => { const m = piMultiple(x); return m ? piFracTex(m) : tx(x, 4); };
/** y = A f(B(x − C)) + D written without 1×, (x − 0) or + 0. */
function eqTex(fn, A, B, C, D, cTex) {
  const a = A === 1 ? '' : A === -1 ? '-' : tx(A, 4);
  const inner = C === 0 ? 'x' : `x ${C < 0 ? '+' : '-'} ${cTex}`;
  const arg = B === 1 ? inner : C === 0 ? `${tx(B, 4)}x` : `${tx(B, 4)}\\left(${inner}\\right)`;
  return `y = ${a}\\${fn}\\left(${arg}\\right)${D === 0 ? '' : ` ${D < 0 ? '-' : '+'} ${tx(Math.abs(D), 4)}`}`;
}

function graph(fn, A, B, C, D, title) {
  const P = (fn === 'tan' ? Math.PI : 2 * Math.PI) / Math.abs(B);
  const x0 = C, x1 = C + 2 * P;
  const f = (x) => A * FN[fn](B * (x - C)) + D;
  const base = (x) => FN[fn](x);
  const yspan = fn === 'tan' ? [D - 6, D + 6] : [Math.min(-1.3, D - Math.abs(A) - 0.5), Math.max(1.3, D + Math.abs(A) + 0.5)];
  const asym = fn === 'tan' ? Array.from({ length: 6 }, (_, i) => C + (Math.PI / (2 * Math.abs(B))) * (2 * i - 3)).filter((x) => x > x0 - P * 0.25 && x < x1 + P * 0.25) : [];
  return plot({ x: [Math.min(x0 - P * 0.25, -0.5), x1 + P * 0.25], y: yspan, width: 400, height: 260, title, curves: [{ f, samples: 900 }, { f: base, cls: 'd-hidden', samples: 900 }], hlines: fn === 'tan' ? [{ y: D, cls: 'd-line3' }] : [{ y: D, cls: 'd-line3', label: 'midline' }], vlines: asym.map((x) => ({ x, cls: 'd-perp' })) });
}

export const calculator = {
  id: 'trig-graph-explorer',
  explore: {
    title: 'Transform a trig graph',
    intro: 'The dashed curve is the parent function. A stretches vertically, B squeezes horizontally (changing the period), C slides it sideways and D moves it up or down.',
    controls: [
      { name: 'fn', label: 'Function', type: 'select', options: [['sin', 'sin'], ['cos', 'cos'], ['tan', 'tan']], value: 'sin' },
      { name: 'A', label: 'A (vertical stretch)', min: -3, max: 3, step: 0.1, value: 2 },
      { name: 'B', label: 'B (horizontal squeeze)', min: 0.25, max: 4, step: 0.05, value: 1 },
      { name: 'C', label: 'C (phase shift)', min: -3.14, max: 3.14, step: 0.01, value: 0 },
      { name: 'D', label: 'D (vertical shift)', min: -3, max: 3, step: 0.1, value: 0 },
    ],
    presets: [{ label: 'y = sin x', values: { fn: 'sin', A: 1, B: 1, C: 0, D: 0 } }, { label: 'Period π (B = 2)', values: { B: 2 } }, { label: 'cos is sin shifted by −π/2', values: { fn: 'sin', A: 1, B: 1, C: -1.57, D: 0 } }],
    render({ fn, A, B, C, D }) {
      const P = (fn === 'tan' ? Math.PI : 2 * Math.PI) / B;
      return {
        svg: graph(fn, A, B, C, D, `y = ${A} ${fn}(${B}(x − ${C})) + ${D}`),
        readouts: [
          { label: 'Equation', tex: eqTex(fn, A, B, C, D, tx(Math.abs(C), 2)) },
          { label: 'Period', tex: `\\frac{${fn === 'tan' ? '\\pi' : '2\\pi'}}{|B|} \\approx ${tx(P, 3)}` },
          { label: fn === 'tan' ? 'Vertical stretch' : 'Amplitude', tex: `|A| = ${tx(Math.abs(A), 2)}` },
          { label: 'Range', tex: fn === 'tan' ? '(-\\infty,\\ \\infty)' : `[${tx(D - Math.abs(A), 2)},\\ ${tx(D + Math.abs(A), 2)}]` },
        ],
      };
    },
  },
  practice: {
    title: 'Read amplitude and period',
    generate(rand) {
      const A = pick(rand, [2, 3, 4, -2, 0.5, 5]), B = pick(rand, [2, 3, 4, 0.5, 1, 6]), D = randInt(rand, -3, 3), fn = pick(rand, ['sin', 'cos']);
      const P = (2 * Math.PI) / B;
      return {
        prompt: '<p>Find the amplitude and the period (as a decimal, 2 decimal places) of the function below, and its maximum value.</p>',
        promptTex: `y = ${A}\\${fn}(${B}x) ${D < 0 ? '-' : '+'} ${Math.abs(D)}`,
        answers: [{ label: 'Amplitude', value: Math.abs(A) }, { label: 'Period', value: P }, { label: 'Maximum', value: D + Math.abs(A) }],
        hint: 'Amplitude is |A|. The period of sin(Bx) or cos(Bx) is 2π/B. The maximum is the midline D plus the amplitude.',
        steps: [
          { title: 'Amplitude', tex: `|A| = |${A}| = ${Math.abs(A)}` },
          { title: 'Period', tex: `\\frac{2\\pi}{${B}} \\approx ${tx(P, 4)}` },
          { title: 'Maximum', tex: `D + |A| = ${D} + ${Math.abs(A)} = ${D + Math.abs(A)}` },
        ],
      };
    },
  },
  fields: [
    { name: 'fn', label: 'Function f', type: 'radio', options: [['sin', 'sin'], ['cos', 'cos'], ['tan', 'tan']] },
    { name: 'A', label: 'A', type: 'number', placeholder: 'e.g. 3', row: 'p1' },
    { name: 'B', label: 'B', type: 'number', placeholder: 'e.g. 2', row: 'p1' },
    { name: 'C', label: 'C (phase shift, radians)', type: 'text', placeholder: 'e.g. pi/4', row: 'p2' },
    { name: 'D', label: 'D', type: 'number', placeholder: 'e.g. 1', row: 'p2', hint: 'y = A·f(B(x − C)) + D. C may be written with pi, e.g. pi/6.' },
  ],
  examples: [
    { label: 'y = 3 sin(2(x − π/4)) + 1', values: { fn: 'sin', A: '3', B: '2', C: 'pi/4', D: '1' } },
    { label: 'y = −2 cos(x/2)', values: { fn: 'cos', A: '-2', B: '0.5', C: '0', D: '0' } },
    { label: 'y = tan(2x)', values: { fn: 'tan', A: '1', B: '2', C: '0', D: '0' } },
    { label: 'Invalid: B = 0', values: { fn: 'sin', A: '1', B: '0', C: '0', D: '0' }, expectError: true },
  ],
  solve(values) {
    const v = validator(values);
    const fn = FN[values.fn] ? values.fn : 'sin';
    const A = v.number('A', 'A', { nonzero: true, maxAbs: 1e6 }), B = v.number('B', 'B', { nonzero: true, maxAbs: 1e4 }), D = v.number('D', 'D', { maxAbs: 1e6 });
    let C = 0;
    const raw = String(values.C ?? '').trim();
    if (raw) {
      const p = /^-?\s*(\d*\.?\d*)\s*\*?\s*pi\s*(\/\s*(\d+))?$/i.exec(raw.replace(/π/g, 'pi'));
      if (p) { const k = p[1] === '' ? 1 : Number(p[1]); C = (raw.trim().startsWith('-') ? -1 : 1) * k * Math.PI / (p[3] ? Number(p[3]) : 1); }
      else C = v.number('C', 'C', { maxAbs: 1e4 }) ?? 0;
    }
    if (!v.ok()) return v.result();
    if (!Number.isFinite(C)) return { ok: false, errors: [{ field: 'C', message: 'C must be a number such as 0.5 or a multiple of pi such as pi/4.' }] };
    if (Math.abs(B) < 1e-3) return { ok: false, errors: [{ field: 'B', message: 'Please use |B| ≥ 0.001; a smaller B makes the period too long to draw.' }] };
    const P = (fn === 'tan' ? Math.PI : 2 * Math.PI) / Math.abs(B);
    const eq = eqTex(fn, A, B, C, D, pt(Math.abs(C)));
    const steps = [
      { title: 'Read the parameters', tex: `A = ${tx(A)},\\quad B = ${tx(B)},\\quad C = ${pt(C)},\\quad D = ${tx(D)}` },
      { title: 'Period', tex: `T = \\frac{${fn === 'tan' ? '\\pi' : '2\\pi'}}{|B|} = \\frac{${fn === 'tan' ? '\\pi' : '2\\pi'}}{${tx(Math.abs(B))}} ${piMultiple(P) ? `= ${pt(P)}` : `\\approx ${tx(P, 6)}`}` },
      fn === 'tan' ? { title: 'Vertical stretch (tan has no amplitude)', tex: `|A| = ${tx(Math.abs(A))}` } : { title: 'Amplitude and midline', texLines: [`\\text{amplitude} = |A| = ${tx(Math.abs(A))}`, `\\text{midline: } y = D = ${tx(D)}`] },
      { title: 'Phase shift and vertical shift', text: `The graph of ${fn} x moves ${C === 0 ? 'no distance sideways' : `${fmt(Math.abs(C), 4)} ${C > 0 ? 'right' : 'left'}`} and ${D === 0 ? 'not up or down' : `${fmt(Math.abs(D), 4)} ${D > 0 ? 'up' : 'down'}`}.${A < 0 ? ' Because A < 0 it is also reflected in its midline.' : ''}` },
    ];
    const answers = [answer('Period', P, { primary: true, exactTex: piMultiple(P) && !Number.isInteger(P) ? pt(P) : undefined, irrational: !piMultiple(P) || true }), answer('Phase shift', C, { irrational: C !== 0 }), answer('Vertical shift', D)];
    if (fn !== 'tan') {
      answers.splice(0, 0, answer('Amplitude', Math.abs(A), { primary: true }));
      answers.push(answer('Maximum value', D + Math.abs(A)), answer('Minimum value', D - Math.abs(A)));
      const keys = [0, 0.25, 0.5, 0.75, 1].map((k) => C + (k * P));
      steps.push({ title: 'Key points over one period (start, quarter, half, three-quarter, end)', tex: keys.map((x) => `\\left(${pt(x)},\\ ${tx(A * FN[fn](B * (x - C)) + D, 4)}\\right)`).join(',\\ ') });
      steps.push({ title: 'Range', tex: `[D - |A|,\\ D + |A|] = [${tx(D - Math.abs(A))},\\ ${tx(D + Math.abs(A))}]` });
    } else {
      steps.push({ title: 'Vertical asymptotes', tex: `x = ${pt(C)} + \\frac{\\pi}{2|B|} + n\\cdot ${pt(P)},\\quad \\text{e.g. } x = ${pt(C + Math.PI / (2 * Math.abs(B)))}` });
    }
    return {
      ok: true,
      final: { texLines: [eq, fn === 'tan' ? `T = ${piMultiple(P) ? pt(P) : tx(P, 6)}` : `\\text{amplitude } ${tx(Math.abs(A))},\\quad T = ${piMultiple(P) ? pt(P) : tx(P, 6)}`] },
      answers,
      visual: { svg: graph(fn, A, B, C, D, 'Transformed graph and parent function'), caption: `Solid: the transformed function over two periods. Dashed: ${fn} x.${fn === 'tan' ? ' Vertical dotted lines are asymptotes.' : ''}` },
      formula: [`y = A\\,${'\\' + fn}\\big(B(x - C)\\big) + D`],
      steps,
      notes: [{ kind: 'info', text: 'x is in radians. Watch the form: in y = sin(2x − π/2) the phase shift is π/4 (factor out B first: 2(x − π/4)), not π/2.' }],
    };
  },
};
