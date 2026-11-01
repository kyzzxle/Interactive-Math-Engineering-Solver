/**
 * Permutations and combinations.
 *
 *   P(n, r) = n! / (n − r)!          (order matters)
 *   C(n, r) = n! / [r! (n − r)!]     (order does not matter)
 *
 * Results are exact BigInt values whenever that is fast enough in a browser.
 * For astronomically large results (more than EXACT_DIGIT_LIMIT digits, or more than
 * EXACT_STEP_LIMIT multiplications) an approximation in scientific notation is
 * returned instead, clearly flagged as approximate.
 */
import { parseWhole } from '../lib/parse.js';
import { fallingFactorial, binomial, log10Factorial, scientificFromLog10, scientificFromBigInt, groupDigits } from '../lib/bigint.js';

export const MAX_N = 1_000_000_000;
export const EXACT_DIGIT_LIMIT = 200_000;
export const EXACT_STEP_LIMIT = 50_000;

/** log10 of n·(n−1)·…·(n−r+1) — summed directly when practical for best accuracy. */
export function log10Falling(n, r) {
  if (r === 0) return 0;
  if (r <= 200_000) {
    let s = 0;
    for (let i = 0; i < r; i++) s += Math.log10(n - i);
    return s;
  }
  return log10Factorial(n) - log10Factorial(n - r);
}

export function solveCombinatorics(input) {
  const errors = [];
  const pn = parseWhole(input.n, 'n (the total number of items)', MAX_N);
  const pr = parseWhole(input.r, 'r (the number of items chosen)', MAX_N);
  if (!pn.ok) errors.push({ field: 'n', message: pn.error });
  if (!pr.ok) errors.push({ field: 'r', message: pr.error });
  if (errors.length) return { ok: false, errors };
  const n = pn.value;
  const r = pr.value;
  if (r > n) {
    return { ok: false, errors: [{ field: 'r', message: `r cannot be larger than n: you cannot choose ${r.toLocaleString('en-US')} items from only ${n.toLocaleString('en-US')}. (For r > n, both P(n, r) and C(n, r) would count 0 ways, and the factorial formula breaks down because (n − r)! is undefined for negative numbers.)` }] };
  }

  const k = Math.min(r, n - r);
  const logP = log10Falling(n, r);
  const logRFact = log10Falling(r, r);
  const logC = log10Falling(n, k) - log10Falling(k, k);

  const pExact = r <= EXACT_STEP_LIMIT && logP < EXACT_DIGIT_LIMIT;
  const cExact = k <= EXACT_STEP_LIMIT && logC < EXACT_DIGIT_LIMIT;
  const rFactExact = r <= EXACT_STEP_LIMIT && logRFact < EXACT_DIGIT_LIMIT;

  const P = pExact ? fallingFactorial(n, r) : null;
  const C = cExact ? binomial(n, r) : null;
  const rFact = rFactExact ? fallingFactorial(r, r) : null;

  const values = {
    n, r,
    P, C, rFact,
    permutation: describe(P, logP),
    combination: describe(C, logC),
    rFactorial: describe(rFact, logRFact),
  };
  const notes = [];
  if (r === 0) notes.push({ kind: 'info', text: 'Choosing 0 items can be done in exactly one way — choose nothing — so P(n, 0) = C(n, 0) = 1. This is also why 0! is defined as 1.' });
  if (r === n && n > 0) notes.push({ kind: 'info', text: `With r = n you are arranging all ${n} items, so P(n, n) = n! while C(n, n) = 1 (there is only one way to take everything).` });
  if (r > n / 2 && r < n) notes.push({ kind: 'info', text: `Shortcut: C(${n}, ${r}) = C(${n}, ${n - r}). Choosing ${r} items to keep is the same as choosing ${n - r} items to leave out.` });
  if (!pExact || !cExact) notes.push({ kind: 'warn', text: `Part of this result has more than ${EXACT_DIGIT_LIMIT.toLocaleString('en-US')} digits (or needs more than ${EXACT_STEP_LIMIT.toLocaleString('en-US')} multiplications), so it is shown as a scientific-notation approximation instead of an exact integer.` });

  return { ok: true, values, steps: buildSteps(values), notes, enumeration: enumerate(n, r, P) };
}

function describe(big, log10Value) {
  if (big !== null) {
    const s = big.toString();
    const sci = scientificFromBigInt(big, 6);
    return { exact: true, digits: s.length, full: s, grouped: groupDigits(s), sci };
  }
  const sci = scientificFromLog10(log10Value, 6);
  return { exact: false, digits: Math.floor(log10Value) + 1, full: null, grouped: null, sci };
}

/** TeX for a value: grouped digits when short, scientific notation otherwise. */
export function valueTex(d) {
  if (isShort(d)) return d.grouped.replace(/,/g, '{,}');
  return `${d.sci.mantissa} \\times 10^{${d.sci.exponent.toLocaleString('en-US').replace(/,/g, '{,}')}}`;
}

/** Values short enough to print in full inside a formula. */
export function isShort(d) {
  return d.exact && d.digits <= 24;
}

/** "=" when every value involved is printed exactly, "\approx" otherwise. */
function rel(...ds) {
  return ds.every(isShort) ? '=' : '\\approx';
}

/** Product written out: 10 × 9 × 8, or 50 × 49 × 48 × ⋯ × 31 for long products. */
export function productTex(top, count) {
  if (count === 0) return '1';
  if (count <= 8) return Array.from({ length: count }, (_, i) => top - i).join(' \\times ');
  return `${top} \\times ${top - 1} \\times ${top - 2} \\times \\cdots \\times ${top - count + 1}`;
}

function factorialTex(m, d) {
  if (m <= 1) return `${m}! = 1`;
  return `${m}! = ${productTex(m, m)} ${rel(d)} ${valueTex(d)}`;
}

function buildSteps(v) {
  const { n, r } = v;
  const steps = [];
  steps.push({
    title: 'Check the inputs',
    tex: `n = ${n}, \\quad r = ${r}, \\qquad 0 \\le r \\le n \\;\\checkmark`,
    note: 'Both formulas need whole numbers with r no larger than n.',
  });

  const nmr = n - r;
  const cancel = r === 0
    ? `P(${n}, 0) = \\frac{${n}!}{${n}!} = 1`
    : nmr <= 1
      ? `P(${n}, ${r}) = \\frac{${n}!}{${nmr}!} = \\frac{${n}!}{1} = ${productTex(n, r)}`
      : `P(${n}, ${r}) = \\frac{${n}!}{${nmr}!} = \\frac{${productTex(n, r)} \\times \\textcolor{#94a3b8}{${nmr}!}}{\\textcolor{#94a3b8}{${nmr}!}} = ${productTex(n, r)}`;
  steps.push({
    title: 'Permutations: cancel (n − r)! from n!',
    texLines: [
      `P(n, r) = \\frac{n!}{(n - r)!}`,
      cancel,
      `P(${n}, ${r}) ${rel(v.permutation)} ${valueTex(v.permutation)}`,
    ],
    note: r > 0
      ? `Only the top ${r} factor${r === 1 ? '' : 's'} of ${n}! survive${r === 1 ? 's' : ''}: there are ${n} choices for the first position, ${n - 1} for the second, and so on for ${r} position${r === 1 ? '' : 's'}.`
      : 'An empty product equals 1.',
  });

  steps.push({
    title: `Factorial of r (the number of orderings of each selection)`,
    tex: factorialTex(r, v.rFactorial),
    note: r <= 1 ? 'By definition 0! = 1 and 1! = 1.' : `Any group of ${r} chosen items can be lined up in ${r}! different orders.`,
  });

  steps.push({
    title: 'Combinations: divide the permutations by r!',
    texLines: [
      `C(n, r) = \\frac{n!}{r!\\,(n - r)!} = \\frac{P(n, r)}{r!}`,
      `C(${n}, ${r}) ${rel(v.permutation, v.rFactorial)} \\frac{${valueTex(v.permutation)}}{${valueTex(v.rFactorial)}}`,
      `C(${n}, ${r}) ${rel(v.combination)} ${valueTex(v.combination)}`,
    ],
    note: 'Dividing by r! removes the repeated counting of the same group in different orders.',
  });

  if (v.P !== null && v.C !== null && v.rFact !== null) {
    const verified = v.C * v.rFact === v.P;
    steps.push({
      title: 'Check: permutations = combinations × r!',
      tex: rel(v.combination, v.rFactorial, v.permutation) === '='
        ? `C(${n}, ${r}) \\times ${r}! = ${valueTex(v.combination)} \\times ${valueTex(v.rFactorial)} ${verified ? '=' : '\\neq'} ${valueTex(v.permutation)} \\;${verified ? '\\checkmark' : ''}`
        : `C(${n}, ${r}) \\times ${r}! ${verified ? '=' : '\\neq'} P(${n}, ${r}) \\;${verified ? '\\checkmark' : ''}`,
      note: verified ? 'This check was carried out with exact integer arithmetic.' : undefined,
    });
  }
  return steps;
}

/** List every arrangement and selection for small cases (helps build intuition). */
export function enumerate(n, r, P) {
  if (P === null || r === 0 || n > 26 || P > 120n) return null;
  const items = Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
  const perms = [];
  const combos = [];
  const used = new Array(n).fill(false);
  const cur = [];
  (function permute() {
    if (cur.length === r) { perms.push(cur.join('')); return; }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true; cur.push(items[i]);
      permute();
      cur.pop(); used[i] = false;
    }
  })();
  (function choose(start, acc) {
    if (acc.length === r) { combos.push(acc.join('')); return; }
    for (let i = start; i < n; i++) choose(i + 1, [...acc, items[i]]);
  })(0, []);
  return { items, perms, combos };
}
