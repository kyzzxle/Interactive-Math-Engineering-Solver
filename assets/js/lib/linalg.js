/**
 * Exact linear algebra with Frac entries: parsing, TeX, arithmetic, Gauss–Jordan
 * elimination with a log of row operations, determinants and inverses.
 */
import { Frac, parseFrac } from './fraction.js';

/** Parse rows like "1 2 3\n4 5 6" (spaces or commas; fractions/decimals allowed). */
export function parseMatrix(text, label = 'the matrix') {
  const rows = String(text ?? '').trim().split(/\n|;/).map((l) => l.trim()).filter(Boolean);
  if (!rows.length) return { error: `Enter ${label}: one row per line, entries separated by spaces or commas.` };
  const m = [];
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].split(/[\s,]+/).filter(Boolean);
    const row = [];
    for (const c of cells) {
      const f = parseFrac(c);
      if (!f) return { error: `"${c}" in row ${i + 1} of ${label} is not a number. Use numbers like 3, -1.5 or 2/3.` };
      row.push(f);
    }
    m.push(row);
  }
  const cols = m[0].length;
  if (m.some((r) => r.length !== cols)) return { error: `Every row of ${label} must have the same number of entries (row 1 has ${cols}).` };
  if (m.length > 6 || cols > 6) return { error: `${label.charAt(0).toUpperCase() + label.slice(1)} can be at most 6 × 6.` };
  return { matrix: m };
}

export const dims = (m) => [m.length, m[0].length];
export const clone = (m) => m.map((r) => r.slice());
export const identity = (n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => Frac.of(i === j ? 1 : 0)));

export function matrixTex(m, augmentAt = null) {
  const cols = m[0].length;
  const body = m.map((row) => row.map((v) => v.toTex()).join(' & ')).join(' \\\\ ');
  if (augmentAt !== null) {
    const spec = 'c'.repeat(augmentAt) + '|' + 'c'.repeat(cols - augmentAt);
    return `\\left[\\begin{array}{${spec}} ${body} \\end{array}\\right]`;
  }
  return `\\begin{bmatrix} ${body} \\end{bmatrix}`;
}
export function matrixText(m) { return m.map((r) => r.map((v) => v.toString()).join('\t')).join('\n'); }

export function addM(a, b, s = 1) { return a.map((r, i) => r.map((v, j) => (s === 1 ? v.add(b[i][j]) : v.sub(b[i][j])))); }
export function scaleM(a, k) { return a.map((r) => r.map((v) => v.mul(k))); }
export function transpose(a) { return a[0].map((_, j) => a.map((r) => r[j])); }
export function mulM(a, b) {
  return a.map((row) => b[0].map((_, j) => row.reduce((s, v, k) => s.add(v.mul(b[k][j])), Frac.of(0))));
}

/**
 * Gauss–Jordan elimination to reduced row echelon form.
 * Returns { rref, pivots, ops: [{ text, tex, matrix }] }. `augmentAt` is only used for display.
 */
export function rref(m0, augmentAt = null, limitCols = null) {
  const m = clone(m0);
  const rows = m.length, cols = limitCols ?? m[0].length;
  const ops = [];
  const pivots = [];
  let r = 0;
  const record = (text, tex) => ops.push({ text, tex, matrix: matrixTex(m, augmentAt) });
  for (let c = 0; c < cols && r < rows; c++) {
    let p = r;
    while (p < rows && m[p][c].isZero()) p++;
    if (p === rows) continue;
    if (p !== r) { [m[p], m[r]] = [m[r], m[p]]; record(`Swap rows ${r + 1} and ${p + 1}`, `R_{${r + 1}} \\leftrightarrow R_{${p + 1}}`); }
    const pv = m[r][c];
    if (!pv.isOne()) {
      m[r] = m[r].map((v) => v.div(pv));
      record(`Divide row ${r + 1} by ${pv.toString()} to make the pivot 1`, `R_{${r + 1}} \\to \\frac{1}{${pv.toTex()}}\\,R_{${r + 1}}`.replace('\\frac{1}{-', '-\\frac{1}{'));
    }
    for (let i = 0; i < rows; i++) {
      if (i === r || m[i][c].isZero()) continue;
      const f = m[i][c];
      m[i] = m[i].map((v, j) => v.sub(f.mul(m[r][j])));
      const sign = f.sign() > 0 ? '-' : '+';
      const coef = f.abs().isOne() ? '' : f.abs().toTex();
      record(`Row ${i + 1} ${sign === '-' ? 'minus' : 'plus'} ${f.abs().toString()} × row ${r + 1}`, `R_{${i + 1}} \\to R_{${i + 1}} ${sign} ${coef}R_{${r + 1}}`);
    }
    pivots.push(c);
    r++;
  }
  return { rref: m, pivots, ops };
}

/** Solve A x = b exactly. Returns { status: 'unique' | 'none' | 'infinite', x?, rref, ops, freeVars }. */
export function solveLinear(A, b) {
  const aug = A.map((row, i) => [...row, b[i]]);
  const n = A[0].length;
  const { rref: R, pivots, ops } = rref(aug, n, n);
  for (const row of R) {
    if (row.slice(0, n).every((v) => v.isZero()) && !row[n].isZero()) return { status: 'none', rref: R, ops, pivots };
  }
  if (pivots.length < n) {
    const freeVars = [...Array(n).keys()].filter((j) => !pivots.includes(j));
    return { status: 'infinite', rref: R, ops, pivots, freeVars };
  }
  return { status: 'unique', x: pivots.map((_, i) => R[i][n]), rref: R, ops, pivots };
}

/** Determinant by fraction-exact elimination. */
export function det(m0) {
  const m = clone(m0);
  const n = m.length;
  let d = Frac.of(1);
  for (let c = 0; c < n; c++) {
    let p = c;
    while (p < n && m[p][c].isZero()) p++;
    if (p === n) return Frac.of(0);
    if (p !== c) { [m[p], m[c]] = [m[c], m[p]]; d = d.neg(); }
    d = d.mul(m[c][c]);
    for (let i = c + 1; i < n; i++) {
      const f = m[i][c].div(m[c][c]);
      if (!f.isZero()) m[i] = m[i].map((v, j) => v.sub(f.mul(m[c][j])));
    }
  }
  return d;
}

/** Minor matrix without row i and column j. */
export function minor(m, i, j) { return m.filter((_, r) => r !== i).map((row) => row.filter((_, c) => c !== j)); }

/** Cofactor expansion along the first row (for showing work on 2×2 and 3×3). */
export function detSteps(m) {
  const n = m.length;
  if (n === 1) return { value: m[0][0], lines: [`\\det = ${m[0][0].toTex()}`] };
  if (n === 2) {
    const [[a, b], [c, d]] = m;
    const v = a.mul(d).sub(b.mul(c));
    return { value: v, lines: [`\\det = ad - bc = (${a.toTex()})(${d.toTex()}) - (${b.toTex()})(${c.toTex()})`, `= ${a.mul(d).toTex()} - (${b.mul(c).toTex()}) = ${v.toTex()}`] };
  }
  const terms = [], values = [];
  for (let j = 0; j < n; j++) {
    const sign = j % 2 === 0 ? '+' : '-';
    const md = det(minor(m, 0, j));
    values.push((j % 2 === 0 ? m[0][j] : m[0][j].neg()).mul(md));
    terms.push(`${j === 0 ? '' : sign} (${m[0][j].toTex()})\\,${matrixTex(minor(m, 0, j)).replace('bmatrix', 'vmatrix').replace('bmatrix', 'vmatrix')}`);
  }
  const value = values.reduce((s, v) => s.add(v), Frac.of(0));
  return { value, lines: [`\\det = ${terms.join(' ')}`, `= ${values.map((v, i) => (i === 0 ? v.toTex() : v.sign() < 0 ? `- ${v.abs().toTex()}` : `+ ${v.toTex()}`)).join(' ')} = ${value.toTex()}`] };
}

export function inverse(m) {
  const n = m.length;
  const aug = m.map((row, i) => [...row, ...identity(n)[i]]);
  const { rref: R, pivots, ops } = rref(aug, n, n);
  if (pivots.length < n) return { singular: true, ops };
  return { singular: false, inv: R.map((row) => row.slice(n)), ops };
}
