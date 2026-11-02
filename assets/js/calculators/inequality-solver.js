/**
 * Linear and quadratic inequalities in one variable: move everything to one side,
 * p(x) = LHS − RHS (degree ≤ 2), find the boundary points, then test the sign of p on each
 * interval. Exact boundaries (fractions or simplest radicals) and interval notation.
 */
import { answer, sqrtFrac, fmt } from '../lib/calc-kit.js';
import { simplifySqrt } from '../lib/exact.js';
import { parsePolyField, polyTex, degree, subPoly } from '../lib/poly-kit.js';
import { Frac } from '../lib/fraction.js';
import { randInt } from '../lib/learn.js';

const OPS = { lt: ['<', '<'], le: ['\\le', '≤'], gt: ['>', '>'], ge: ['\\ge', '≥'] };
const flip = { lt: 'gt', le: 'ge', gt: 'lt', ge: 'le' };
function isqrt(n) { if (n < 2n) return n; let x = BigInt(Math.floor(Math.sqrt(Number(n)))); while (x * x > n) x--; while ((x + 1n) * (x + 1n) <= n) x++; return x; }

/** Number line SVG. pieces: [{ from, to }] (±Infinity allowed), points: [{ x, closed }]. */
function numberLine(pieces, points, marks) {
  const xs = marks.map((m) => m.x);
  const lo = xs.length ? Math.min(...xs) : 0, hi = xs.length ? Math.max(...xs) : 0;
  const span = Math.max(hi - lo, 2), a = lo - span * 0.6, b = hi + span * 0.6;
  const W = 380, X = (x) => 20 + ((Math.max(a, Math.min(b, x)) - a) / (b - a)) * (W - 40);
  const r = (v) => Math.round(v * 10) / 10;
  const segs = pieces.map((p) => `<line class="d-arrow" x1="${r(X(p.from))}" y1="40" x2="${r(X(p.to))}" y2="40" style="stroke-width:6;opacity:.8"/>` + (p.to === Infinity ? `<polygon class="d-arrow-head" points="${W - 12},40 ${W - 24},33 ${W - 24},47"/>` : '') + (p.from === -Infinity ? `<polygon class="d-arrow-head" points="12,40 24,33 24,47"/>` : '')).join('');
  const dots = points.map((p) => `<circle cx="${r(X(p.x))}" cy="40" r="7" style="fill:${p.closed ? 'var(--accent-bright)' : 'var(--surface)'};stroke:var(--accent-bright);stroke-width:2.5"/>`).join('');
  const labels = marks.map((m) => `<text class="d-label" x="${r(X(m.x))}" y="72" text-anchor="middle">${m.label}</text>`).join('');
  return `<svg class="diagram" viewBox="0 0 ${W} 86" role="img" aria-label="Solution on a number line"><title>Solution on a number line</title><line class="d-axis" x1="10" y1="40" x2="${W - 10}" y2="40"/>${segs}${dots}${labels}</svg>`;
}

export const calculator = {
  id: 'inequality-solver',
  practice: {
    title: 'Solve a quadratic inequality',
    generate(rand) {
      let r1 = randInt(rand, -6, 5), r2 = randInt(rand, r1 + 1, 8);
      const less = rand() < 0.5;
      const b = -(r1 + r2), c = r1 * r2;
      return {
        prompt: `<p>Solve the inequality below. Its solution ${less ? 'is a single interval a < x < b' : 'is x < a or x > b'}. Enter a and b.</p>`,
        promptTex: `x^2 ${b < 0 ? '-' : '+'} ${Math.abs(b)}x ${c < 0 ? '-' : '+'} ${Math.abs(c)} ${less ? '<' : '>'} 0`.replace('+ 0x ', '').replace(' + 0 ', ' '),
        answers: [{ label: 'a', value: r1, int: true }, { label: 'b', value: r2, int: true }],
        hint: 'Find where the quadratic equals 0 by factoring. The parabola opens upward, so it is negative between its roots and positive outside them.',
        steps: [
          { title: 'Factor', tex: `(x ${r1 < 0 ? '+' : '-'} ${Math.abs(r1)})(x ${r2 < 0 ? '+' : '-'} ${Math.abs(r2)}) ${less ? '<' : '>'} 0` },
          { title: 'Boundary points', tex: `x = ${r1},\\quad x = ${r2}` },
          { title: 'Sign of an upward parabola', tex: less ? `${r1} < x < ${r2}` : `x < ${r1} \\ \\text{or}\\ x > ${r2}` },
        ],
      };
    },
  },
  fields: [
    { name: 'lhs', label: 'Left side', type: 'text', placeholder: 'e.g. x^2 - 5x', row: 'ineq' },
    { name: 'op', label: 'Sign', type: 'select', options: [['lt', '<'], ['le', '≤'], ['gt', '>'], ['ge', '≥']], row: 'ineq' },
    { name: 'rhs', label: 'Right side', type: 'text', placeholder: 'e.g. -6', row: 'ineq', hint: 'Linear or quadratic expressions in x. Fractions are allowed.' },
  ],
  examples: [
    { label: 'x² − 5x < −6', values: { lhs: 'x^2 - 5x', op: 'lt', rhs: '-6' } },
    { label: '3 − 2x ≥ 7 (flip the sign)', values: { lhs: '3 - 2x', op: 'ge', rhs: '7' } },
    { label: 'x² − 2 > 0 (radical boundaries)', values: { lhs: 'x^2 - 2', op: 'gt', rhs: '0' } },
    { label: 'x² + 1 ≤ 0 (no solution)', values: { lhs: 'x^2 + 1', op: 'le', rhs: '0' } },
    { label: 'Not supported: cubic', values: { lhs: 'x^3', op: 'gt', rhs: '1' }, expectError: true },
  ],
  solve(values) {
    const L = parsePolyField(values, 'lhs', 'the left side', { maxDeg: 2, allowZero: true });
    if (L.error) return L.error;
    const R = parsePolyField(values, 'rhs', 'the right side', { maxDeg: 2, allowZero: true });
    if (R.error) return R.error;
    let op = OPS[values.op] ? values.op : 'lt';
    const p = subPoly(L.p, R.p);
    const deg = degree(p);
    const steps = [{ title: 'Move everything to one side', tex: `${polyTex(p)} ${OPS[op][0]} 0` }];
    const strict = op === 'lt' || op === 'gt';
    const wantPos = op === 'gt' || op === 'ge';
    let setTex, interval, pieces = [], points = [], marks = [];
    const done = (ans) => finish(ans);
    if (deg <= 0) {
      const c = p[0];
      const holds = { lt: c.sign() < 0, le: c.sign() <= 0, gt: c.sign() > 0, ge: c.sign() >= 0 }[op];
      steps.push({ title: 'No x remains', text: `The inequality reduces to ${c} ${OPS[op][1]} 0, which is ${holds ? 'always true' : 'never true'}.` });
      setTex = holds ? 'x \\in \\mathbb{R}' : '\\varnothing';
      interval = holds ? '(-\\infty,\\ \\infty)' : '\\varnothing';
      if (holds) pieces = [{ from: -Infinity, to: Infinity }];
      return done(holds ? 'All real numbers' : 'No solution');
    }
    if (deg === 1) {
      const [b, a] = p; // a x + b
      const x0 = b.neg().div(a);
      steps.push({ title: 'Subtract the constant', tex: `${a.isOne() ? '' : a.eq(-1) ? '-' : a.toTex()}x ${OPS[op][0]} ${b.neg().toTex()}` });
      if (a.sign() < 0) { steps.push({ title: 'Divide by a negative number: reverse the sign', tex: `x ${OPS[flip[op]][0]} ${x0.toTex()}` }); op = flip[op]; }
      else if (!a.isOne()) steps.push({ title: 'Divide by the positive coefficient', tex: `x ${OPS[op][0]} ${x0.toTex()}` });
      const right = op === 'gt' || op === 'ge';
      setTex = `x ${OPS[op][0]} ${x0.toTex()}`;
      interval = right ? `${strict ? '(' : '['}${x0.toTex()},\\ \\infty)` : `(-\\infty,\\ ${x0.toTex()}${strict ? ')' : ']'}`;
      pieces = [right ? { from: x0.toNumber(), to: Infinity } : { from: -Infinity, to: x0.toNumber() }];
      points = [{ x: x0.toNumber(), closed: !strict }];
      marks = [{ x: x0.toNumber(), label: x0.toString() }];
      return done(`x ${OPS[op][1]} ${x0}`);
    }
    const [c, b, a] = p;
    const D = b.pow(2).sub(a.mul(c).mul(4));
    steps.push({ title: 'Discriminant of the quadratic', tex: `\\Delta = b^2 - 4ac = (${b.toTex()})^2 - 4(${a.toTex()})(${c.toTex()}) = ${D.toTex()}` });
    const up = a.sign() > 0;
    if (D.sign() < 0) {
      steps.push({ title: 'No real roots', text: `The parabola never crosses the x-axis. It opens ${up ? 'upward, so it is always positive' : 'downward, so it is always negative'}.` });
      const holds = up === wantPos;
      setTex = holds ? 'x \\in \\mathbb{R}' : '\\varnothing'; interval = holds ? '(-\\infty,\\ \\infty)' : '\\varnothing';
      if (holds) pieces = [{ from: -Infinity, to: Infinity }];
      return done(holds ? 'All real numbers' : 'No solution');
    }
    const sq = sqrtFrac(D, simplifySqrt);
    const twoA = a.mul(2);
    let r1, r2, t1, t2;
    if (sq.exact) {
      // D = n/d with n·d a perfect square, so √D = √(n·d)/d exactly
      const sf = new Frac(isqrt(D.n * D.d), D.d);
      const x1 = b.neg().sub(sf).div(twoA), x2 = b.neg().add(sf).div(twoA);
      [r1, r2] = x1.cmp(x2) <= 0 ? [x1, x2] : [x2, x1];
      t1 = r1.toTex(); t2 = r2.toTex();
    } else {
      const v1 = (-b.toNumber() - sq.value) / twoA.toNumber(), v2 = (-b.toNumber() + sq.value) / twoA.toNumber();
      const mid = b.neg().div(twoA), half = sqrtFrac(D.div(twoA.pow(2)), simplifySqrt);
      t1 = mid.isZero() ? `-${half.tex}` : `${mid.toTex()} - ${half.tex}`;
      t2 = mid.isZero() ? half.tex : `${mid.toTex()} + ${half.tex}`;
      const lo = Math.min(v1, v2), hi = Math.max(v1, v2);
      r1 = { toNumber: () => lo, toString: () => fmt(lo, 4) }; r2 = { toNumber: () => hi, toString: () => fmt(hi, 4) };
    }
    const n1 = r1.toNumber(), n2 = r2.toNumber();
    if (D.isZero()) {
      steps.push({ title: 'One repeated root', tex: `x = ${t1}` });
      const touchesSign = up ? 'positive except at the root, where it is 0' : 'negative except at the root, where it is 0';
      steps.push({ title: 'Sign of the quadratic', text: `It is ${touchesSign}.` });
      let ans;
      if (up === wantPos) { ans = strict ? `x ≠ ${r1}` : 'All real numbers'; setTex = strict ? `x \\ne ${t1}` : 'x \\in \\mathbb{R}'; interval = strict ? `(-\\infty,\\ ${t1}) \\cup (${t1},\\ \\infty)` : '(-\\infty,\\ \\infty)'; pieces = [{ from: -Infinity, to: Infinity }]; points = strict ? [{ x: n1, closed: false }] : []; }
      else { ans = strict ? 'No solution' : `x = ${r1}`; setTex = strict ? '\\varnothing' : `x = ${t1}`; interval = strict ? '\\varnothing' : `\\{${t1}\\}`; points = strict ? [] : [{ x: n1, closed: true }]; }
      marks = [{ x: n1, label: r1.toString() }];
      return done(ans);
    }
    steps.push({ title: 'Boundary points (roots of the quadratic)', tex: `x_1 = ${t1} ${sq.exact ? '' : `\\approx ${fmt(n1, 4)}`},\\quad x_2 = ${t2} ${sq.exact ? '' : `\\approx ${fmt(n2, 4)}`}` });
    const between = up !== wantPos; // upward parabola is negative between its roots
    steps.push({ title: 'Test the sign on each interval', text: `The parabola opens ${up ? 'upward' : 'downward'}, so it is ${up ? 'negative' : 'positive'} between the roots and ${up ? 'positive' : 'negative'} outside them. We need it ${wantPos ? 'positive' : 'negative'}${strict ? '' : ' or zero'}.` });
    const lb = strict ? '(' : '[', rb = strict ? ')' : ']';
    if (between) { setTex = `${t1} ${OPS[strict ? 'lt' : 'le'][0]} x ${OPS[strict ? 'lt' : 'le'][0]} ${t2}`; interval = `${lb}${t1},\\ ${t2}${rb}`; pieces = [{ from: n1, to: n2 }]; }
    else { setTex = `x ${OPS[strict ? 'lt' : 'le'][0]} ${t1} \\ \\text{or}\\ x ${OPS[strict ? 'gt' : 'ge'][0]} ${t2}`; interval = `(-\\infty,\\ ${t1}${rb} \\cup ${lb}${t2},\\ \\infty)`; pieces = [{ from: -Infinity, to: n1 }, { from: n2, to: Infinity }]; }
    points = [{ x: n1, closed: !strict }, { x: n2, closed: !strict }];
    marks = [{ x: n1, label: sq.exact ? r1.toString() : fmt(n1, 3) }, { x: n2, label: sq.exact ? r2.toString() : fmt(n2, 3) }];
    return done(between ? `${r1} ${strict ? '<' : '≤'} x ${strict ? '<' : '≤'} ${r2}` : `x ${strict ? '<' : '≤'} ${r1} or x ${strict ? '>' : '≥'} ${r2}`);

    function finish(text) {
      steps.push({ title: 'Solution', texLines: [setTex, `\\text{Interval notation: } ${interval}`] });
      return {
        ok: true,
        final: { texLines: [setTex, interval] },
        answers: [{ label: 'Solution', valueTex: setTex, primary: true, copy: text }, { label: 'Interval notation', valueTex: interval, copy: '' }, answer('Number of boundary points', marks.length, { decimals: 0 })],
        visual: { svg: numberLine(pieces, points, marks), caption: 'Filled dots are included (≤ or ≥); open dots are excluded (< or >).' },
        formula: ['ax + b < 0 \\qquad ax^2 + bx + c < 0'],
        steps,
        notes: [{ kind: 'info', text: 'Supported: linear and quadratic inequalities in x. When multiplying or dividing both sides by a negative number, the inequality sign reverses.' }],
      };
    }
  },
};
