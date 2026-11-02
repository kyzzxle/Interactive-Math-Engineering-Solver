/**
 * Eigenvalues and eigenvectors of real 2 × 2 and 3 × 3 matrices.
 *   2 × 2:  λ² − (tr A)λ + det A = 0
 *   3 × 3:  λ³ − (tr A)λ² + (sum of principal 2 × 2 minors)λ − det A = 0
 * Rational eigenvalues are found exactly (rational root theorem) and their eigenvectors by exact
 * row reduction of A − λI. Irrational real eigenvalues use exact radicals (from a quadratic) or
 * decimals; complex eigenvalues are reported as a ± bi without eigenvectors.
 */
import { answer, sqrtFrac, fmt, tx } from '../lib/calc-kit.js';
import { simplifySqrt } from '../lib/exact.js';
import { parseMatrix, matrixTex, det, rref, identity } from '../lib/linalg.js';
import { rationalRoots, synthDiv, polyRealRoots } from '../lib/numeric.js';
import { polyTex, degree } from '../lib/poly-kit.js';
import { Frac } from '../lib/fraction.js';
import { plot } from '../lib/plot.js';

const F = (x) => Frac.of(x);
const sub = (A, lam) => A.map((r, i) => r.map((v, j) => (i === j ? v.sub(lam) : v)));

/** Exact null-space basis of a Frac matrix (vectors scaled to coprime integers). */
function nullspace(M) {
  const n = M[0].length;
  const { rref: R, pivots } = rref(M);
  const free = [...Array(n).keys()].filter((j) => !pivots.includes(j));
  return free.map((fv) => {
    const vec = Array(n).fill(F(0));
    vec[fv] = F(1);
    pivots.forEach((pc, row) => { vec[pc] = R[row][fv].neg(); });
    let l = 1n; for (const x of vec) l = (l * x.d) / gcdB(l, x.d);
    let ints = vec.map((x) => (x.n * l) / x.d);
    let g = 0n; for (const x of ints) g = gcdB(g, x);
    if (g > 1n) ints = ints.map((x) => x / g);
    if (ints.find((x) => x !== 0n) < 0n) ints = ints.map((x) => -x);
    return ints.map((x) => F(x));
  });
}
function gcdB(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a || 1n; }

/** Numeric eigenvector for a real eigenvalue (decimal): cross product of rows (3 × 3) or a row swap (2 × 2). */
function numericVector(A, lam) {
  const M = A.map((r, i) => r.map((v, j) => v.toNumber() - (i === j ? lam : 0)));
  let v;
  if (M.length === 2) v = Math.abs(M[0][1]) + Math.abs(M[0][0]) > Math.abs(M[1][0]) + Math.abs(M[1][1]) ? [-M[0][1], M[0][0]] : [-M[1][1], M[1][0]];
  else {
    const c = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const cands = [c(M[0], M[1]), c(M[0], M[2]), c(M[1], M[2])];
    v = cands.reduce((best, x) => (Math.hypot(...x) > Math.hypot(...best) ? x : best));
  }
  const L = Math.hypot(...v) || 1;
  v = v.map((x) => x / L);
  if (v.find((x) => Math.abs(x) > 1e-12) < 0) v = v.map((x) => -x);
  return v;
}

export const calculator = {
  id: 'eigenvalues-eigenvectors',
  fields: [{ name: 'A', label: 'Matrix A (2 × 2 or 3 × 3)', type: 'textarea', rows: 3, placeholder: '4 1\n2 3', hint: 'One row per line, entries separated by spaces or commas. Fractions such as 1/2 are allowed.' }],
  examples: [
    { label: '[[4, 1], [2, 3]]', values: { A: '4 1\n2 3' } },
    { label: '3 × 3 with integer eigenvalues', values: { A: '2 0 0\n1 3 0\n4 -1 1' } },
    { label: 'Irrational eigenvalues [[1, 2], [3, 4]]', values: { A: '1 2\n3 4' } },
    { label: 'Rotation (complex eigenvalues)', values: { A: '0 -1\n1 0' } },
    { label: 'Repeated eigenvalue [[2, 1], [0, 2]]', values: { A: '2 1\n0 2' } },
    { label: 'Invalid: not square', values: { A: '1 2 3\n4 5 6' }, expectError: true },
  ],
  solve(values) {
    const p = parseMatrix(values.A, 'the matrix');
    if (p.error) return { ok: false, errors: [{ field: 'A', message: p.error }] };
    const A = p.matrix, n = A.length;
    if (A[0].length !== n) return { ok: false, errors: [{ field: 'A', message: `Eigenvalues need a square matrix; this one is ${n} × ${A[0].length}.` }] };
    if (n < 2 || n > 3) return { ok: false, errors: [{ field: 'A', message: 'Please enter a 2 × 2 or 3 × 3 matrix.' }] };
    if (A.flat().some((x) => x.n.toString().length > 9 || x.d.toString().length > 9)) return { ok: false, errors: [{ field: 'A', message: 'Please keep entries to at most 9 digits.' }] };
    const tr = A.reduce((s, r, i) => s.add(r[i]), F(0)), D = det(A);
    // characteristic polynomial, coefficients low → high in λ
    let cp;
    const steps = [{ title: 'The matrix', tex: `A = ${matrixTex(A)}` }];
    if (n === 2) {
      cp = [D, tr.neg(), F(1)];
      steps.push({ title: 'Characteristic equation det(A − λI) = 0', texLines: [`\\det\\begin{bmatrix} ${A[0][0].toTex()} - \\lambda & ${A[0][1].toTex()} \\\\ ${A[1][0].toTex()} & ${A[1][1].toTex()} - \\lambda \\end{bmatrix} = 0`, `\\lambda^2 - (\\operatorname{tr} A)\\lambda + \\det A = 0,\\quad \\operatorname{tr} A = ${tr.toTex()},\\ \\det A = ${D.toTex()}`] });
    } else {
      const m2 = (i, j) => A[i][i].mul(A[j][j]).sub(A[i][j].mul(A[j][i]));
      const S = m2(0, 1).add(m2(0, 2)).add(m2(1, 2));
      cp = [D.neg(), S, tr.neg(), F(1)];
      steps.push({ title: 'Characteristic equation det(A − λI) = 0', texLines: ['\\lambda^3 - (\\operatorname{tr} A)\\lambda^2 + S\\lambda - \\det A = 0', `\\operatorname{tr} A = ${tr.toTex()},\\quad S = \\text{sum of principal } 2 \\times 2 \\text{ minors} = ${S.toTex()},\\quad \\det A = ${D.toTex()}`] });
    }
    steps.push({ title: 'Characteristic polynomial', tex: `p(\\lambda) = ${polyTex(cp, '\\lambda')} = 0` });
    // eigenvalues
    const exact = rationalRoots(cp);
    let rest = cp;
    for (const r of exact) rest = synthDiv(rest, r);
    const eig = []; // { value, tex, exact (Frac|null), complex }
    const groups = [];
    for (const r of exact) { const g = groups.find((x) => x.r.eq(r)); if (g) g.m++; else groups.push({ r, m: 1 }); }
    groups.forEach((g) => eig.push({ value: g.r.toNumber(), tex: g.r.toTex(), frac: g.r, m: g.m }));
    if (degree(rest) === 2) {
      const [c, b, a] = rest; // a = 1
      const disc = b.pow(2).sub(a.mul(c).mul(4));
      const mid = b.neg().div(a.mul(2)), rad = sqrtFrac(disc.abs().div(a.pow(2).mul(4)), simplifySqrt);
      if (disc.sign() >= 0) {
        steps.push({ title: 'Solve the remaining quadratic', tex: `\\lambda = ${mid.isZero() ? '' : mid.toTex()} \\pm ${rad.tex}` });
        for (const s of [1, -1]) eig.push({ value: mid.toNumber() + s * rad.value, tex: `${mid.isZero() ? (s < 0 ? '-' : '') : `${mid.toTex()} ${s < 0 ? '-' : '+'} `}${rad.tex}`, frac: null, m: 1 });
      } else {
        steps.push({ title: 'The remaining quadratic has no real roots', tex: `\\lambda = ${mid.toTex()} \\pm ${rad.tex}\\,i` });
        for (const s of [1, -1]) eig.push({ value: NaN, re: mid.toNumber(), im: s * rad.value, tex: `${mid.isZero() ? '' : mid.toTex()} ${s < 0 ? '-' : mid.isZero() ? '' : '+'} ${rad.tex === '1' ? '' : rad.tex}\\,i`.trim(), frac: null, complex: true, m: 1 });
      }
    } else if (degree(rest) === 3) {
      const reals = polyRealRoots(rest);
      steps.push({ title: 'No rational roots: solve numerically', text: `The cubic has ${reals.length} real root${reals.length === 1 ? '' : 's'}.` });
      reals.forEach((x) => eig.push({ value: x, tex: `\\approx ${tx(x, 6)}`, frac: null, m: 1 }));
      if (reals.length === 1) {
        // deflate to get the complex pair
        const r = reals[0], c = rest.map((q) => q.toNumber());
        const b2 = c[3], b1 = c[2] + r * b2, b0 = c[1] + r * b1;
        const re = -b1 / (2 * b2), im = Math.sqrt(Math.max(0, b0 / b2 - re * re));
        for (const s of [1, -1]) eig.push({ value: NaN, re, im: s * im, tex: `\\approx ${tx(re, 6)} ${s < 0 ? '-' : '+'} ${tx(im, 6)}\\,i`, frac: null, complex: true, m: 1 });
      }
    } else if (degree(rest) === 1) {
      const r = rest[0].neg().div(rest[1]);
      eig.push({ value: r.toNumber(), tex: r.toTex(), frac: r, m: 1 });
    }
    if (exact.length) steps.splice(steps.length - (degree(rest) === 2 || degree(rest) === 3 ? 1 : 0), 0, { title: 'Rational roots (rational root theorem)', tex: `\\lambda = ${groups.map((g) => g.r.toTex() + (g.m > 1 ? `\\ (\\text{multiplicity } ${g.m})` : '')).join(',\\ ')}` });
    // eigenvectors
    const vecRows = [];
    const vecs = [];
    for (const e of eig) {
      if (e.complex) { vecRows.push([{ tex: e.tex }, 'complex — not shown', '']); continue; }
      if (e.frac) {
        const M = sub(A, e.frac);
        const basis = nullspace(M);
        const vt = basis.map((v) => `\\begin{bmatrix} ${v.map((x) => x.toTex()).join(' \\\\ ')} \\end{bmatrix}`).join(',\\ ');
        steps.push({ title: `Eigenvectors for λ = ${e.frac}`, texLines: [`(A - ${e.frac.toTex()}I)\\,v = 0`, `v = ${vt}${basis.length > 1 ? '\\ \\text{(and their combinations)}' : ''}`] });
        vecRows.push([{ tex: e.tex }, basis.map((v) => `(${v.map((x) => x.toString()).join(', ')})`).join(' and '), String(e.m)]);
        basis.forEach((v) => vecs.push({ lam: e.value, v: v.map((x) => x.toNumber()) }));
        if (basis.length < e.m) steps.push({ title: 'Defective eigenvalue', text: `λ = ${e.frac} is a repeated root (multiplicity ${e.m}) but has only ${basis.length} independent eigenvector${basis.length === 1 ? '' : 's'}, so A cannot be diagonalised.` });
      } else {
        const v = numericVector(A, e.value);
        steps.push({ title: `Eigenvector for λ ${e.tex.startsWith('\\approx') ? '' : '= '}${e.tex.replace('\\approx', '≈')}`.replace(/\\sqrt\{(\d+)\}/g, '√$1').replace(/\\frac\{(.+?)\}\{(.+?)\}/g, '$1/$2'), tex: `v \\approx \\begin{bmatrix} ${v.map((x) => tx(x, 5)).join(' \\\\ ')} \\end{bmatrix}\\ \\text{(unit length)}` });
        vecRows.push([{ tex: e.tex }, `(${v.map((x) => fmt(x, 5)).join(', ')})`, '1']);
        vecs.push({ lam: e.value, v });
      }
    }
    const listTex = eig.map((e) => (e.tex.startsWith('\\approx') ? `\\lambda ${e.tex}` : `\\lambda = ${e.tex}`)).join(',\\quad ');
    steps.push({ title: 'Checks', tex: `\\sum \\lambda = \\operatorname{tr} A = ${tr.toTex()},\\quad \\prod \\lambda = \\det A = ${D.toTex()}` });
    let svg, caption;
    if (n === 2 && vecs.length) {
      const An = A.map((r) => r.map((x) => x.toNumber()));
      const pts = Array.from({ length: 73 }, (_, i) => { const t = (2 * Math.PI * i) / 72; return [An[0][0] * Math.cos(t) + An[0][1] * Math.sin(t), An[1][0] * Math.cos(t) + An[1][1] * Math.sin(t)]; });
      const R = Math.max(1.2, ...pts.map((q) => Math.hypot(...q))) * 1.15;
      svg = plot({ x: [-R, R], y: [-R, R], equal: true, width: 340, height: 300, title: 'The unit circle and its image under A', circles: [{ cx: 0, cy: 0, r: 1, cls: 'd-hidden' }], segments: [...pts.slice(1).map((q, i) => ({ x1: pts[i][0], y1: pts[i][1], x2: q[0], y2: q[1], cls: 'd-line' })), ...vecs.flatMap(({ lam, v }) => [{ x1: -R * v[0], y1: -R * v[1], x2: R * v[0], y2: R * v[1], cls: 'd-line3' }, { x1: 0, y1: 0, x2: lam * v[0], y2: lam * v[1], cls: 'd-line2' }])] });
      caption = 'A turns the dashed unit circle into the solid ellipse. Along the orange eigenvector lines, A only stretches (by λ, green) — it does not rotate.';
    } else {
      const reals = eig.filter((e) => !e.complex).map((e) => e.value);
      const span = Math.max(2, ...reals.map(Math.abs)) * 1.4;
      const c = cp.map((q) => q.toNumber());
      svg = plot({ x: [-span, span], width: 380, height: 250, title: 'Characteristic polynomial', curves: [{ f: (x) => c.reduceRight((s, q) => s * x + q, 0) }], points: reals.map((x) => ({ x, y: 0, label: `λ = ${fmt(x, 3)}`, cls: 'd-point3' })) });
      caption = 'The real eigenvalues are where the characteristic polynomial crosses or touches the λ-axis.';
    }
    return {
      ok: true,
      final: { tex: listTex },
      answers: [{ label: 'Eigenvalues', valueTex: listTex, primary: true, copy: '' }, answer('Trace', tr.toNumber()), answer('Determinant', D.toNumber())],
      visual: { svg, caption },
      formula: ['A\\,v = \\lambda v \\iff \\det(A - \\lambda I) = 0'],
      steps,
      tables: [{ caption: 'Eigenvalues and eigenvectors', headers: ['λ', 'Eigenvector(s)', 'Multiplicity'], rows: vecRows }],
      notes: [{ kind: 'info', text: 'Supported: real 2 × 2 and 3 × 3 matrices. Eigenvectors are shown for real eigenvalues (exact for rational eigenvalues, unit-length decimals otherwise). Any non-zero multiple of an eigenvector is also an eigenvector.' }],
    };
  },
};
