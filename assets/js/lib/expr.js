/**
 * Expression engine: parser, exact simplifier, evaluator, symbolic derivative,
 * rule-based integrator and TeX printer for functions of one variable.
 *
 * Node shapes (all coefficients are exact Frac values):
 *   { t: 'num', v: Frac }            { t: 'sym', n: 'x' | 'pi' | 'e' }
 *   { t: 'add', a: [nodes] }         { t: 'mul', a: [nodes] }
 *   { t: 'pow', b: node, e: node }   { t: 'fn', n: 'sin' | 'ln' | ..., a: node }
 * Subtraction is a + (-1)·b; division is a·b^(-1).
 */
import { Frac, parseFrac } from './fraction.js';

export class ExprError extends Error {}
export class UnsupportedError extends Error {}

// ------------------------------------------------------------------ constructors
export const num = (v) => ({ t: 'num', v: Frac.of(v) });
export const sym = (n) => ({ t: 'sym', n });
export const X = sym('x');
export const add = (...a) => ({ t: 'add', a });
export const mul = (...a) => ({ t: 'mul', a });
export const pow = (b, e) => ({ t: 'pow', b, e: typeof e === 'number' ? num(e) : e });
export const fn = (n, a) => ({ t: 'fn', n, a });
export const neg = (a) => mul(num(-1), a);
export const div = (a, b) => mul(a, pow(b, num(-1)));
export const sub = (a, b) => add(a, neg(b));

export const FUNCTIONS = ['sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'exp', 'ln', 'log', 'sqrt', 'cbrt', 'abs'];
const ALIASES = { arcsin: 'asin', arccos: 'acos', arctan: 'atan', cosec: 'csc', log10: 'log' };

// ------------------------------------------------------------------ tokenizer
function tokenize(src, vars) {
  const s = String(src)
    .replace(/[−–]/g, '-').replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/\*\*/g, '^')
    .replace(/²/g, '^2').replace(/³/g, '^3').replace(/π/g, ' pi ').replace(/θ/g, ' theta ').replace(/√/g, ' sqrt ');
  const names = [...FUNCTIONS, ...Object.keys(ALIASES), 'pi', 'theta'].sort((a, b) => b.length - a.length);
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    const m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(s.slice(i));
    if (m) { tokens.push({ k: 'num', v: m[0] }); i += m[0].length; continue; }
    if (/[a-zA-Z]/.test(c)) {
      const word = /^[a-zA-Z]+/.exec(s.slice(i))[0];
      let j = 0;
      while (j < word.length) {
        const rest = word.slice(j).toLowerCase();
        const name = names.find((n) => rest.startsWith(n));
        if (name) {
          j += name.length;
          if (name === 'pi') tokens.push({ k: 'sym', v: 'pi' });
          else if (name === 'theta') tokens.push({ k: 'sym', v: vars.includes('theta') ? 'theta' : 'x', raw: 'θ' });
          else tokens.push({ k: 'fn', v: ALIASES[name] || name });
          // log_b( ... ): base given after an underscore
          if (name === 'log' && s[i + j] === '_') {
            const b = /^_\{?(\d+\.?\d*)\}?/.exec(s.slice(i + j));
            if (b) { tokens[tokens.length - 1].base = b[1]; i += b[0].length; }
          }
          continue;
        }
        const ch = word[j];
        if (ch === 'e') tokens.push({ k: 'sym', v: 'e' });
        else if (vars.includes(ch)) tokens.push({ k: 'sym', v: ch });
        else throw new ExprError(`Unknown symbol "${ch}". Use ${vars.join(', ')} as the variable${vars.length > 1 ? 's' : ''}.`);
        j++;
      }
      i += word.length;
      continue;
    }
    if ('+-*/^(),|!'.includes(c) || c === '[' || c === ']') { tokens.push({ k: 'op', v: c === '[' ? '(' : c === ']' ? ')' : c }); i++; continue; }
    throw new ExprError(`Unexpected character "${c}".`);
  }
  return tokens;
}

// ------------------------------------------------------------------ parser
/**
 * Parse a math expression. Supports + − × ÷ ^, parentheses, implicit multiplication (2x, 3sin(x), x(x+1)),
 * functions (sin, cos, tan, sec, csc, cot, asin, acos, atan, sinh, cosh, tanh, exp, ln, log, log_b, sqrt, cbrt, abs),
 * |x| bars, pi/π and e.
 */
export function parse(src, { vars = ['x'], raw = false } = {}) {
  if (!String(src ?? '').trim()) throw new ExprError('Enter an expression.');
  const tokens = tokenize(src, vars);
  let p = 0;
  const peek = () => tokens[p];
  const isOp = (v) => peek() && peek().k === 'op' && peek().v === v;
  const expect = (v) => { if (!isOp(v)) throw new ExprError(v === ')' ? 'A closing parenthesis ")" is missing.' : `Expected "${v}".`); p++; };
  const startsFactor = () => { const t = peek(); return t && (t.k === 'num' || t.k === 'sym' || t.k === 'fn' || (t.k === 'op' && (t.v === '(' || t.v === '|'))); };

  function expression() {
    let left = term();
    while (isOp('+') || isOp('-')) {
      const op = tokens[p++].v;
      const right = term();
      left = op === '+' ? add(left, right) : sub(left, right);
    }
    return left;
  }
  function term() {
    let left = unary();
    for (;;) {
      if (isOp('*')) { p++; left = mul(left, unary()); }
      else if (isOp('/')) { p++; left = div(left, unary()); }
      else if (startsFactor() && !(isOp('|') && absDepth > 0)) left = mul(left, power());
      else break;
    }
    return left;
  }
  function unary() {
    if (isOp('-')) { p++; return neg(unary()); }
    if (isOp('+')) { p++; return unary(); }
    return power();
  }
  function power() {
    const base = postfix();
    if (isOp('^')) { p++; return pow(base, unary()); }
    return base;
  }
  function postfix() {
    const node = primary();
    if (isOp('!')) throw new ExprError('Factorials (!) are not supported in expressions here.');
    return node;
  }
  let absDepth = 0;
  function primary() {
    const t = peek();
    if (!t) throw new ExprError('The expression ends unexpectedly.');
    if (t.k === 'num') {
      p++;
      const f = parseFrac(t.v);
      if (!f) throw new ExprError(`"${t.v}" is not a valid number.`);
      return num(f);
    }
    if (t.k === 'sym') { p++; return sym(t.v); }
    if (t.k === 'op' && t.v === '(') { p++; const e = expression(); expect(')'); return e; }
    if (t.k === 'op' && t.v === '|') { p++; absDepth++; const e = expression(); absDepth--; expect('|'); return fn('abs', e); }
    if (t.k === 'fn') {
      p++;
      let exponent = null;
      if (isOp('^')) { p++; exponent = unary(); } // sin^2(x)
      let arg;
      if (isOp('(')) { p++; arg = expression(); expect(')'); }
      else if (peek() && (peek().k === 'num' || peek().k === 'sym')) {
        // sin x, sin 2x, ln x^2 → argument is a simple implicit product
        arg = power();
        while (peek() && peek().k === 'sym') arg = mul(arg, power());
      } else throw new ExprError(`Write the argument of ${t.v} in parentheses, for example ${t.v}(x).`);
      let node;
      if (t.v === 'log' && t.base) node = div(fn('ln', arg), fn('ln', num(parseFrac(t.base))));
      else if (t.v === 'sqrt') node = pow(arg, num(new Frac(1n, 2n)));
      else if (t.v === 'cbrt') node = pow(arg, num(new Frac(1n, 3n)));
      else if (t.v === 'exp') node = pow(sym('e'), arg);
      else node = fn(t.v, arg);
      return exponent ? pow(node, exponent) : node;
    }
    if (t.k === 'op' && t.v === ')') throw new ExprError('There is an extra closing parenthesis ")".');
    throw new ExprError(`Unexpected "${t.v}".`);
  }

  const tree = expression();
  if (p < tokens.length) throw new ExprError(tokens[p].v === ')' ? 'There is an extra closing parenthesis ")".' : `Unexpected "${tokens[p].v}" in the expression.`);
  return raw ? tree : simplify(tree);
}

// ------------------------------------------------------------------ inspection helpers
export const isNum = (n, v) => n.t === 'num' && (v === undefined || n.v.eq(v));
export function hasVar(n, v = 'x') {
  switch (n.t) {
    case 'num': return false;
    case 'sym': return n.n === v;
    case 'add': case 'mul': return n.a.some((c) => hasVar(c, v));
    case 'pow': return hasVar(n.b, v) || hasVar(n.e, v);
    case 'fn': return hasVar(n.a, v);
    default: return false;
  }
}
export function key(n) {
  switch (n.t) {
    case 'num': return n.v.toString();
    case 'sym': return n.n;
    case 'add': return `(+ ${n.a.map(key).join(' ')})`;
    case 'mul': return `(* ${n.a.map(key).join(' ')})`;
    case 'pow': return `(^ ${key(n.b)} ${key(n.e)})`;
    case 'fn': return `(${n.n} ${key(n.a)})`;
    default: return '?';
  }
}
export const equal = (a, b) => key(a) === key(b);
/** True if the node contains any variable symbol (not pi or e). */
function hasAnyVar(n) {
  switch (n.t) {
    case 'sym': return n.n !== 'pi' && n.n !== 'e';
    case 'add': case 'mul': return n.a.some(hasAnyVar);
    case 'pow': return hasAnyVar(n.b) || hasAnyVar(n.e);
    case 'fn': return hasAnyVar(n.a);
    default: return false;
  }
}

/** Split a product into [numeric coefficient, rest node or null]. */
export function splitCoef(n) {
  if (n.t === 'num') return [n.v, null];
  if (n.t === 'mul') {
    let c = Frac.of(1);
    const rest = [];
    for (const f of n.a) { if (f.t === 'num') c = c.mul(f.v); else rest.push(f); }
    return [c, rest.length === 0 ? null : rest.length === 1 ? rest[0] : { t: 'mul', a: rest }];
  }
  return [Frac.of(1), n];
}

// ------------------------------------------------------------------ simplifier
const MAX_EXP = 400;

function integerRoot(n, k) {
  // exact k-th root of a nonnegative BigInt, or null
  if (n < 0n) return null;
  if (n < 2n) return n;
  let x = BigInt(Math.round(Number(n) ** (1 / k)));
  for (const c of [x - 1n, x, x + 1n]) if (c >= 0n && c ** BigInt(k) === n) return c;
  return null;
}

function powNum(b, e) {
  // b, e: Frac. Returns Frac when exact, else null.
  if (e.isInt()) {
    const k = Number(e.n);
    if (Math.abs(k) > MAX_EXP) return null;
    if (b.isZero() && k < 0) throw new ExprError('Division by zero (0 raised to a negative power).');
    return b.pow(k);
  }
  const q = Number(e.d);
  if (q > 12) return null;
  const sign = b.sign();
  if (sign < 0 && q % 2 === 0) return null;
  const rn = integerRoot(sign < 0 ? -b.n : b.n, q);
  const rd = integerRoot(b.d, q);
  if (rn === null || rd === null) return null;
  const root = new Frac(sign < 0 ? -rn : rn, rd);
  const k = Number(e.n);
  if (Math.abs(k) > MAX_EXP) return null;
  if (root.isZero() && k < 0) throw new ExprError('Division by zero.');
  return root.pow(k);
}

export function simplify(n) {
  switch (n.t) {
    case 'num': case 'sym': return n;
    case 'fn': return simplifyFn(n.n, simplify(n.a));
    case 'pow': return simplifyPow(simplify(n.b), simplify(n.e));
    case 'mul': return simplifyMul(n.a.map(simplify));
    case 'add': return simplifyAdd(n.a.map(simplify));
    default: return n;
  }
}

function simplifyFn(name, a) {
  if (a.t === 'num') {
    const v = a.v;
    if (v.isZero() && ['sin', 'tan', 'asin', 'atan', 'sinh', 'tanh'].includes(name)) return num(0);
    if (v.isZero() && ['cos', 'sec', 'cosh'].includes(name)) return num(1);
    if (name === 'ln' && v.isOne()) return num(0);
    if (name === 'abs') return num(v.abs());
    if (name === 'log' && v.sign() > 0) {
      // log10 of an exact power of ten
      const s = v.toString();
      if (/^10*$/.test(s)) return num(s.length - 1);
      if (/^1\/10*$/.test(s)) return num(-(s.length - 2));
    }
  }
  if (name === 'ln' && a.t === 'sym' && a.n === 'e') return num(1);
  if (name === 'ln' && a.t === 'pow' && a.b.t === 'sym' && a.b.n === 'e') return a.e; // ln(e^u) = u
  if (name === 'abs' && a.t === 'fn' && a.n === 'abs') return a;
  return fn(name, a);
}

function simplifyPow(b, e) {
  if (isNum(e, 0)) return num(1);
  if (isNum(e, 1)) return b;
  if (b.t === 'num' && e.t === 'num') {
    const r = powNum(b.v, e.v);
    if (r) return num(r);
    // pull perfect powers out of roots: 12^(1/2) = 2·3^(1/2)
    if (!e.v.isInt() && b.v.isInt() && b.v.sign() > 0 && e.v.n === 1n) {
      const q = Number(e.v.d);
      let outside = 1n, inside = b.v.n;
      for (let p = 2n; p ** BigInt(q) <= inside && p < 100000n; p++) {
        const pk = p ** BigInt(q);
        while (inside % pk === 0n) { inside /= pk; outside *= p; }
      }
      if (outside > 1n) return simplifyMul([num(outside), { t: 'pow', b: num(inside), e }]);
    }
  }
  if (isNum(b, 1)) return num(1);
  if (isNum(b, 0) && e.t === 'num' && e.v.sign() > 0) return num(0);
  if (b.t === 'pow' && e.t === 'num' && e.v.isInt()) return simplifyPow(b.b, simplifyMul([b.e, e]));
  if (b.t === 'pow' && e.t === 'num' && b.e.t === 'num' && b.e.v.isInt() && Number(b.e.v.n) % 2 === 1) {
    // (x^3)^(1/3) = x for odd integer inner powers (real roots)
    return simplifyPow(b.b, simplifyMul([b.e, e]));
  }
  if (b.t === 'mul' && e.t === 'num' && e.v.isInt()) return simplifyMul(b.a.map((f) => simplifyPow(f, e)));
  if (b.t === 'sym' && b.n === 'e' && e.t === 'fn' && e.n === 'ln') return e.a; // e^(ln u) = u
  return { t: 'pow', b, e };
}

function baseExp(f) { return f.t === 'pow' ? [f.b, f.e] : [f, num(1)]; }

function factorRank(f) {
  if (f.t === 'pow' && f.b.t === 'sym' && f.b.n === 'e' && hasAnyVar(f.e)) return 2.5; // e^x after variables, before functions
  const b = f.t === 'pow' ? f.b : f;
  if (b.t === 'num') return 0;
  if (b.t === 'sym') return b.n === 'pi' || b.n === 'e' ? 1 : 2; // constants first, then variables alphabetically
  if (b.t === 'fn') return 3;
  return 4;
}

function simplifyMul(items) {
  let coef = Frac.of(1);
  const flat = [];
  for (const it of items) {
    if (it.t === 'mul') flat.push(...it.a); else flat.push(it);
  }
  const groups = new Map();
  for (const f of flat) {
    if (f.t === 'num') { coef = coef.mul(f.v); continue; }
    const [b, e] = baseExp(f);
    const k = key(b);
    if (groups.has(k)) groups.get(k).e.push(e); else groups.set(k, { b, e: [e] });
  }
  if (coef.isZero()) return num(0);
  const factors = [];
  for (const { b, e } of groups.values()) {
    const exp = e.length === 1 ? e[0] : simplifyAdd(e);
    const p = simplifyPow(b, exp);
    if (p.t === 'num') coef = coef.mul(p.v);
    else if (p.t === 'mul') {
      for (const q of p.a) { if (q.t === 'num') coef = coef.mul(q.v); else factors.push(q); }
    } else factors.push(p);
  }
  if (coef.isZero()) return num(0);
  const baseKey = (f) => key(f.t === 'pow' ? f.b : f);
  factors.sort((a, b) => factorRank(a) - factorRank(b) || (baseKey(a) < baseKey(b) ? -1 : baseKey(a) > baseKey(b) ? 1 : key(a) < key(b) ? -1 : 1));
  if (!factors.length) return num(coef);
  if (coef.isOne() && factors.length === 1) return factors[0];
  return { t: 'mul', a: coef.isOne() ? factors : [num(coef), ...factors] };
}

/** Degree of a monomial in x (for ordering terms); -1 if not a monomial in x. */
function monoDegree(rest) {
  if (!rest) return 0;
  if (!hasVar(rest)) return 0;
  if (rest.t === 'sym') return 1;
  if (rest.t === 'pow' && rest.b.t === 'sym' && rest.e.t === 'num') return rest.e.v.toNumber();
  if (rest.t === 'mul') {
    let d = 0;
    for (const f of rest.a) { const k = monoDegree(f); if (k < 0) return -1; d += k; }
    return d;
  }
  return -1;
}

function simplifyAdd(items) {
  const flat = [];
  for (const it of items) { if (it.t === 'add') flat.push(...it.a); else flat.push(it); }
  let constant = Frac.of(0);
  const groups = new Map();
  const order = [];
  for (const term of flat) {
    if (term.t === 'num') { constant = constant.add(term.v); continue; }
    const [c, rest] = splitCoef(term);
    const k = key(rest);
    if (groups.has(k)) groups.get(k).c = groups.get(k).c.add(c);
    else { groups.set(k, { c, rest }); order.push(k); }
  }
  const terms = [];
  for (const k of order) {
    const { c, rest } = groups.get(k);
    if (c.isZero()) continue;
    terms.push(c.isOne() ? rest : simplifyMul([num(c), rest]));
  }
  terms.sort((a, b) => {
    const da = monoDegree(splitCoef(a)[1]), db = monoDegree(splitCoef(b)[1]);
    if (da >= 0 && db >= 0) return db - da;
    if (da >= 0) return -1;
    if (db >= 0) return 1;
    return 0;
  });
  if (!constant.isZero()) terms.push(num(constant));
  if (!terms.length) return num(0);
  if (terms.length === 1) return terms[0];
  return { t: 'add', a: terms };
}

// ------------------------------------------------------------------ evaluation
const SPECIAL = { pi: Math.PI, e: Math.E };
export function evaluate(n, scope = {}) {
  switch (n.t) {
    case 'num': return n.v.toNumber();
    case 'sym': {
      if (n.n in scope) return scope[n.n];
      if (n.n in SPECIAL) return SPECIAL[n.n];
      throw new ExprError(`No value for ${n.n}.`);
    }
    case 'add': return n.a.reduce((s, c) => s + evaluate(c, scope), 0);
    case 'mul': return n.a.reduce((s, c) => s * evaluate(c, scope), 1);
    case 'pow': {
      const b = evaluate(n.b, scope);
      if (n.e.t === 'num' && b < 0 && !n.e.v.isInt()) {
        // real odd roots of negative numbers, e.g. (-8)^(1/3) = -2
        if (n.e.v.d % 2n === 1n) {
          const r = -Math.pow(-b, n.e.v.toNumber());
          return n.e.v.n % 2n === 0n ? -r : r;
        }
        return NaN;
      }
      return Math.pow(b, evaluate(n.e, scope));
    }
    case 'fn': {
      const a = evaluate(n.a, scope);
      switch (n.n) {
        case 'sin': return Math.sin(a);
        case 'cos': return Math.cos(a);
        case 'tan': return Math.abs(Math.cos(a)) < 1e-15 ? NaN : Math.tan(a);
        case 'sec': return 1 / Math.cos(a);
        case 'csc': return 1 / Math.sin(a);
        case 'cot': return Math.cos(a) / Math.sin(a);
        case 'asin': return Math.asin(a);
        case 'acos': return Math.acos(a);
        case 'atan': return Math.atan(a);
        case 'sinh': return Math.sinh(a);
        case 'cosh': return Math.cosh(a);
        case 'tanh': return Math.tanh(a);
        case 'ln': return a > 0 ? Math.log(a) : NaN;
        case 'log': return a > 0 ? Math.log10(a) : NaN;
        case 'abs': return Math.abs(a);
        default: throw new ExprError(`Unknown function ${n.n}.`);
      }
    }
    default: return NaN;
  }
}

/** Compile to a fast JS function f(x). Non-real results become NaN. */
export function compile(n, v = 'x') {
  return (x) => {
    try {
      const r = evaluate(n, { [v]: x });
      return Number.isFinite(r) ? r : NaN;
    } catch (e) {
      return NaN;
    }
  };
}

// ------------------------------------------------------------------ polynomials
/** Convert to polynomial coefficients [c0, c1, ...] (Frac) in x, or null if not a polynomial. */
export function toPoly(n, v = 'x') {
  switch (n.t) {
    case 'num': return [n.v];
    case 'sym': return n.n === v ? [Frac.of(0), Frac.of(1)] : null;
    case 'add': {
      let acc = [Frac.of(0)];
      for (const c of n.a) { const p = toPoly(c, v); if (!p) return null; acc = polyAdd(acc, p); }
      return polyTrim(acc);
    }
    case 'mul': {
      let acc = [Frac.of(1)];
      for (const c of n.a) { const p = toPoly(c, v); if (!p) return null; acc = polyMul(acc, p); if (acc.length > 61) return null; }
      return polyTrim(acc);
    }
    case 'pow': {
      if (n.e.t !== 'num' || !n.e.v.isInt() || n.e.v.sign() < 0) return hasVar(n, v) ? null : null;
      const k = Number(n.e.v.n);
      if (k > 60) return null;
      const base = toPoly(n.b, v);
      if (!base) return null;
      let acc = [Frac.of(1)];
      for (let i = 0; i < k; i++) acc = polyMul(acc, base);
      return polyTrim(acc);
    }
    default: return null;
  }
}
export function polyTrim(p) {
  const q = p.slice();
  while (q.length > 1 && q[q.length - 1].isZero()) q.pop();
  return q;
}
export function polyAdd(a, b) {
  const out = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) out.push((a[i] || Frac.of(0)).add(b[i] || Frac.of(0)));
  return out;
}
export function polyMul(a, b) {
  const out = Array.from({ length: a.length + b.length - 1 }, () => Frac.of(0));
  a.forEach((x, i) => b.forEach((y, j) => { out[i + j] = out[i + j].add(x.mul(y)); }));
  return out;
}
export function polyDeriv(p) {
  if (p.length <= 1) return [Frac.of(0)];
  return p.slice(1).map((c, i) => c.mul(i + 1));
}
export function polyEval(p, x) { let s = 0; for (let i = p.length - 1; i >= 0; i--) s = s * x + p[i].toNumber(); return s; }
export function polyEvalFrac(p, x) { let s = Frac.of(0); for (let i = p.length - 1; i >= 0; i--) s = s.mul(x).add(p[i]); return s; }
export function polyToNode(p, v = 'x') {
  const terms = [];
  p.forEach((c, i) => { if (!c.isZero()) terms.push(simplifyMul([num(c), i === 0 ? num(1) : i === 1 ? sym(v) : pow(sym(v), num(i))])); });
  return simplifyAdd(terms.length ? terms : [num(0)]);
}

// ------------------------------------------------------------------ TeX printer
const FN_TEX = {
  sin: '\\sin', cos: '\\cos', tan: '\\tan', sec: '\\sec', csc: '\\csc', cot: '\\cot', asin: '\\arcsin', acos: '\\arccos',
  atan: '\\arctan', sinh: '\\sinh', cosh: '\\cosh', tanh: '\\tanh', ln: '\\ln', log: '\\log',
};
const isNegative = (n) => (n.t === 'num' && n.v.sign() < 0) || (n.t === 'mul' && n.a[0].t === 'num' && n.a[0].v.sign() < 0);

function symTex(n) { return n.n === 'pi' ? '\\pi' : n.n === 'theta' ? '\\theta' : n.n; }

function argTex(a) {
  if (a.t === 'fn' && a.n === 'abs') return texOf(a); // ln|x| rather than ln(|x|)
  return a.t === 'sym' || (a.t === 'num' && a.v.isInt() && a.v.sign() >= 0) ? ` ${texOf(a)}` : `\\left(${texOf(a)}\\right)`;
}

function wrapBase(b) {
  const t = texOf(b);
  if (b.t === 'sym' || (b.t === 'num' && b.v.isInt() && b.v.sign() > 0)) return t;
  if (b.t === 'fn' && b.n === 'abs') return t;
  return `\\left(${t}\\right)`;
}

function powTex(b, e) {
  if (e.t === 'num' && !e.v.isInt() && e.v.n === 1n) return e.v.d === 2n ? `\\sqrt{${texOf(b)}}` : `\\sqrt[${e.v.d}]{${texOf(b)}}`;
  if (b.t === 'sym' && b.n === 'e') return `e^{${texOf(e)}}`;
  if (b.t === 'fn' && b.n !== 'abs' && e.t === 'num' && e.v.isInt() && e.v.sign() > 0) {
    return `${FN_TEX[b.n] || `\\operatorname{${b.n}}`}^{${texOf(e)}}${argTex(b.a)}`;
  }
  return `${wrapBase(b)}^{${texOf(e)}}`;
}

function factorTex(f) {
  if (f.t === 'add') return `\\left(${texOf(f)}\\right)`;
  return texOf(f);
}

function joinFactors(list) {
  let out = '';
  list.forEach((t, i) => {
    if (i > 0 && /^[\d.]/.test(t)) out += ' \\cdot ';
    else if (i > 0) out += ' ';
    out += t;
  });
  return out;
}

export function texOf(n) {
  switch (n.t) {
    case 'num': return n.v.toTex();
    case 'sym': return symTex(n);
    case 'fn':
      if (n.n === 'abs') return `\\left|${texOf(n.a)}\\right|`;
      return `${FN_TEX[n.n] || `\\operatorname{${n.n}}`}${argTex(n.a)}`;
    case 'pow':
      if (n.e.t === 'num' && n.e.v.sign() < 0) return texOf({ t: 'mul', a: [num(1), n] });
      return powTex(n.b, n.e);
    case 'add': {
      let out = '';
      n.a.forEach((term, i) => {
        if (i === 0) { out += texOf(term); return; }
        if (isNegative(term)) out += ` - ${texOf(simplifyMul([num(-1), term]))}`;
        else out += ` + ${texOf(term)}`;
      });
      return out;
    }
    case 'mul': {
      let coef = Frac.of(1);
      const top = [], bottom = [];
      for (const f of n.a) {
        if (f.t === 'num') { coef = coef.mul(f.v); continue; }
        if (f.t === 'pow' && f.e.t === 'num' && f.e.v.sign() < 0) {
          const inv = simplifyPow(f.b, num(f.e.v.neg()));
          bottom.push(inv);
        } else top.push(f);
      }
      const sign = coef.sign() < 0 ? '-' : '';
      const c = coef.abs();
      const inFraction = bottom.length > 0 || c.d !== 1n;
      const paren = (f) => `\\left(${texOf(f)}\\right)`;
      // A sum needs brackets unless it is the only thing in a numerator or denominator.
      const topTex = top.map((f) => (f.t === 'add' && (top.length > 1 || c.n !== 1n || !inFraction) ? paren(f) : texOf(f)));
      const bottomTex = bottom.map((f) => (f.t === 'add' && (bottom.length > 1 || c.d !== 1n) ? paren(f) : texOf(f)));
      const cn = c.n.toString(), cd = c.d.toString();
      if (!bottom.length && c.d === 1n) {
        const parts = cn === '1' && topTex.length ? topTex : [cn, ...topTex];
        return sign + joinFactors(parts);
      }
      const numParts = cn === '1' && topTex.length ? topTex : [cn, ...topTex];
      const denParts = cd === '1' ? bottomTex : [cd, ...bottomTex];
      return `${sign}\\frac{${joinFactors(numParts)}}{${joinFactors(denParts)}}`;
    }
    default: return '?';
  }
}

/** Plain-text form (for copying), e.g. "3x^2 - sin(x)/x". */
export function textOf(n) {
  const T = (m) => textOf(m);
  switch (n.t) {
    case 'num': return n.v.toString();
    case 'sym': return n.n === 'pi' ? 'π' : n.n === 'theta' ? 'θ' : n.n;
    case 'fn': return n.n === 'abs' ? `|${T(n.a)}|` : `${n.n}(${T(n.a)})`;
    case 'pow': {
      if (n.e.t === 'num' && n.e.v.eq(new Frac(1n, 2n))) return `sqrt(${T(n.b)})`;
      const b = n.b.t === 'sym' || (n.b.t === 'num' && n.b.v.isInt() && n.b.v.sign() > 0) || n.b.t === 'fn' ? T(n.b) : `(${T(n.b)})`;
      const e = n.e.t === 'num' && n.e.v.isInt() ? T(n.e) : `(${T(n.e)})`;
      return `${b}^${e}`;
    }
    case 'add': return n.a.map((t, i) => (i === 0 ? T(t) : isNegative(t) ? ` - ${T(simplifyMul([num(-1), t]))}` : ` + ${T(t)}`)).join('');
    case 'mul': {
      const parts = n.a.map((f) => (f.t === 'add' ? `(${T(f)})` : T(f)));
      return parts.join('*').replace(/^-1\*/, '-').replace(/^(\d+)\*(?=[a-zπθ(])/i, '$1');
    }
    default: return '?';
  }
}

// ------------------------------------------------------------------ derivative
const one = () => num(1);

/** Raw derivative (call simplify on the result). */
export function derivRaw(n, v = 'x') {
  if (!hasVar(n, v)) return num(0);
  switch (n.t) {
    case 'sym': return one();
    case 'add': return add(...n.a.map((c) => derivRaw(c, v)));
    case 'mul': {
      const consts = n.a.filter((f) => !hasVar(f, v));
      const vars = n.a.filter((f) => hasVar(f, v));
      const terms = vars.map((f, i) => mul(...consts, ...vars.map((g, j) => (i === j ? derivRaw(g, v) : g))));
      return add(...terms);
    }
    case 'pow': {
      const { b, e } = n;
      if (!hasVar(e, v)) return mul(e, pow(b, add(e, num(-1))), derivRaw(b, v));
      if (!hasVar(b, v)) {
        const lnb = b.t === 'sym' && b.n === 'e' ? one() : fn('ln', b);
        return mul(n, lnb, derivRaw(e, v));
      }
      return mul(n, add(mul(derivRaw(e, v), fn('ln', b)), mul(e, derivRaw(b, v), pow(b, num(-1)))));
    }
    case 'fn': {
      const u = n.a, du = derivRaw(u, v);
      const outer = {
        sin: () => fn('cos', u),
        cos: () => neg(fn('sin', u)),
        tan: () => pow(fn('sec', u), 2),
        sec: () => mul(fn('sec', u), fn('tan', u)),
        csc: () => neg(mul(fn('csc', u), fn('cot', u))),
        cot: () => neg(pow(fn('csc', u), 2)),
        asin: () => pow(sub(num(1), pow(u, 2)), num(new Frac(-1n, 2n))),
        acos: () => neg(pow(sub(num(1), pow(u, 2)), num(new Frac(-1n, 2n)))),
        atan: () => pow(add(num(1), pow(u, 2)), -1),
        sinh: () => fn('cosh', u),
        cosh: () => fn('sinh', u),
        tanh: () => sub(num(1), pow(fn('tanh', u), 2)),
        ln: () => pow(u, -1),
        log: () => pow(mul(u, fn('ln', num(10))), -1),
        abs: () => mul(u, pow(fn('abs', u), -1)),
      }[n.n];
      if (!outer) throw new UnsupportedError(`Cannot differentiate ${n.n}.`);
      return mul(outer(), du);
    }
    default: return num(0);
  }
}

export function derivative(n, v = 'x') { return simplify(derivRaw(n, v)); }

/** Name of the main rule used to differentiate a term (for step-by-step explanations). */
export function derivRuleName(n, v = 'x') {
  if (!hasVar(n, v)) return 'Constant rule: the derivative of a constant is 0';
  const [c, rest] = splitCoef(n);
  const prefix = c.isOne() ? '' : 'Constant multiple rule with the ';
  const r = rest || n;
  const describe = (f) => {
    if (f.t === 'sym') return 'rule d/dx[x] = 1';
    if (f.t === 'pow') {
      if (!hasVar(f.e, v)) return f.b.t === 'sym' ? 'power rule d/dx[xⁿ] = n·xⁿ⁻¹' : 'power rule combined with the chain rule';
      if (!hasVar(f.b, v)) return f.b.t === 'sym' && f.b.n === 'e' ? (f.e.t === 'sym' ? 'exponential rule d/dx[eˣ] = eˣ' : 'exponential rule with the chain rule') : 'exponential rule d/dx[aᵘ] = aᵘ·ln a·u′';
      return 'logarithmic differentiation (variable base and exponent)';
    }
    if (f.t === 'fn') return f.a.t === 'sym' ? `derivative of ${f.n}` : `chain rule (outer function ${f.n})`;
    if (f.t === 'mul') {
      const varFactors = f.a.filter((g) => hasVar(g, v));
      if (varFactors.length === 1) return `constant multiple rule with the ${describe(varFactors[0]).replace(/^./, (ch) => ch.toLowerCase())}`;
      const quotient = varFactors.some((g) => g.t === 'pow' && g.e.t === 'num' && g.e.v.sign() < 0 && hasVar(g.b, v));
      return quotient ? 'quotient rule (written as a product with a negative power)' : 'product rule';
    }
    if (f.t === 'add') return 'sum rule';
    return 'differentiation rules';
  };
  const d = describe(r);
  return prefix ? prefix + d : d.charAt(0).toUpperCase() + d.slice(1);
}

// ------------------------------------------------------------------ integration
/** If node is linear a·x + b (a ≠ 0) return {a, b} as Frac, else null. */
export function linearCoeffs(n, v = 'x') {
  const p = toPoly(n, v);
  if (!p || p.length !== 2 || p[1].isZero()) return null;
  return { a: p[1], b: p[0] };
}

function polyIntegralNode(p, v) {
  return polyToNode([Frac.of(0), ...p.map((c, i) => c.div(i + 1))], v);
}

/**
 * Integrate one term (without its numeric coefficient). Returns { result, rule } or throws UnsupportedError.
 */
function integrateBasic(r, v) {
  const x = sym(v);
  const isLinearPower = r.t === 'pow' && r.e.t === 'num' && linearCoeffs(r.b, v) && !(r.b.t === 'sym');
  const poly = isLinearPower ? null : toPoly(r, v);
  if (poly) return { result: polyIntegralNode(poly, v), rule: monoDegree(r) >= 0 ? 'Power rule ∫xⁿ dx = xⁿ⁺¹/(n+1)' : 'Expand into a polynomial, then use the power rule' };
  if (r.t === 'pow' && !hasVar(r.e, v)) {
    const L = linearCoeffs(r.b, v);
    if (L && r.e.t === 'num') {
      const n = r.e.v;
      if (n.eq(-1)) {
        const res = mul(num(L.a.inv()), fn('ln', fn('abs', r.b)));
        return { result: res, rule: L.a.isOne() && L.b.isZero() ? '∫(1/x) dx = ln|x|' : '∫ 1/(ax+b) dx = (1/a)·ln|ax+b| (linear substitution)' };
      }
      const k = n.add(1);
      return { result: mul(num(L.a.mul(k).inv()), pow(r.b, num(k))), rule: L.a.isOne() && L.b.isZero() ? 'Power rule ∫xⁿ dx = xⁿ⁺¹/(n+1)' : 'Power rule with linear substitution u = ax + b' };
    }
    // 1/(x^2 + c) and 1/sqrt(c - x^2)
    const bp = toPoly(r.b, v);
    if (bp && bp.length === 3 && bp[1].isZero() && r.e.t === 'num') {
      const a2 = bp[2], c = bp[0];
      if (r.e.v.eq(-1) && a2.isOne() && c.sign() > 0) {
        const root = simplify(pow(num(c), num(new Frac(1n, 2n))));
        return { result: simplify(mul(pow(root, -1), fn('atan', mul(x, pow(root, -1))))), rule: '∫ dx/(x² + a²) = (1/a)·arctan(x/a)' };
      }
      if (r.e.v.eq(new Frac(-1n, 2n)) && a2.eq(-1) && c.sign() > 0) {
        const root = simplify(pow(num(c), num(new Frac(1n, 2n))));
        return { result: simplify(fn('asin', mul(x, pow(root, -1)))), rule: '∫ dx/√(a² − x²) = arcsin(x/a)' };
      }
    }
  }
  if (r.t === 'pow' && !hasVar(r.b, v) && hasVar(r.e, v)) {
    const L = linearCoeffs(r.e, v);
    if (L) {
      if (r.b.t === 'sym' && r.b.n === 'e') return { result: mul(num(L.a.inv()), r), rule: L.a.isOne() ? '∫eˣ dx = eˣ' : '∫e^(ax+b) dx = (1/a)·e^(ax+b)' };
      if (r.b.t === 'num' && r.b.v.sign() > 0 && !r.b.v.isOne()) return { result: mul(num(L.a.inv()), r, pow(fn('ln', r.b), -1)), rule: '∫aᵘ dx = aᵘ/(ln a) (with linear u)' };
    }
  }
  if (r.t === 'pow' && r.b.t === 'fn' && isNum(r.e, 2)) {
    const L = linearCoeffs(r.b.a, v);
    if (L && r.b.n === 'sec') return { result: mul(num(L.a.inv()), fn('tan', r.b.a)), rule: '∫sec²(u) dx = tan(u)/a' };
    if (L && r.b.n === 'csc') return { result: mul(num(L.a.inv().neg()), fn('cot', r.b.a)), rule: '∫csc²(u) dx = −cot(u)/a' };
  }
  if (r.t === 'fn') {
    const L = linearCoeffs(r.a, v);
    if (L) {
      const k = num(L.a.inv());
      const u = r.a;
      const table = {
        sin: [neg(mul(k, fn('cos', u))), '∫sin(u) dx = −cos(u)/a'],
        cos: [mul(k, fn('sin', u)), '∫cos(u) dx = sin(u)/a'],
        tan: [neg(mul(k, fn('ln', fn('abs', fn('cos', u))))), '∫tan(u) dx = −ln|cos u|/a'],
        cot: [mul(k, fn('ln', fn('abs', fn('sin', u)))), '∫cot(u) dx = ln|sin u|/a'],
        sec: [mul(k, fn('ln', fn('abs', add(fn('sec', u), fn('tan', u))))), '∫sec(u) dx = ln|sec u + tan u|/a'],
        csc: [neg(mul(k, fn('ln', fn('abs', add(fn('csc', u), fn('cot', u)))))), '∫csc(u) dx = −ln|csc u + cot u|/a'],
        sinh: [mul(k, fn('cosh', u)), '∫sinh(u) dx = cosh(u)/a'],
        cosh: [mul(k, fn('sinh', u)), '∫cosh(u) dx = sinh(u)/a'],
      }[r.n];
      if (table) return { result: table[0], rule: table[1] };
    }
  }
  if (r.t === 'mul' && r.a.length === 2 && r.a.every((f) => f.t === 'fn')) {
    const [f, g] = r.a;
    const names = [f.n, g.n].sort().join(',');
    if (equal(f.a, g.a)) {
      const L = linearCoeffs(f.a, v);
      if (L && names === 'sec,tan') return { result: mul(num(L.a.inv()), fn('sec', f.a)), rule: '∫sec(u)tan(u) dx = sec(u)/a' };
      if (L && names === 'cot,csc') return { result: mul(num(L.a.inv().neg()), fn('csc', f.a)), rule: '∫csc(u)cot(u) dx = −csc(u)/a' };
    }
  }
  throw new UnsupportedError(`The term ${textOf(r)} is not one of the supported forms.`);
}

/**
 * Indefinite integral by linearity and a table of basic forms.
 * Returns { result (without +C), steps: [{ term, rule, result }] }.
 */
export function integrate(n, v = 'x') {
  const node = simplify(n);
  const terms0 = node.t === 'add' ? node.a : [node];
  const expanded = terms0.every((t) => monoDegree(splitCoef(t)[1]) >= 0);
  const poly = expanded ? toPoly(node, v) : null;
  if (poly) {
    const steps = poly.map((c, i) => (c.isZero() ? null : {
      term: polyToNode([...Array(i).fill(Frac.of(0)), c], v),
      rule: i === 0 ? 'Constant rule ∫k dx = kx' : 'Power rule ∫xⁿ dx = xⁿ⁺¹/(n+1)',
      result: polyToNode([...Array(i + 1).fill(Frac.of(0)), c.div(i + 1)], v),
    })).filter(Boolean);
    return { result: polyIntegralNode(poly, v), steps };
  }
  const terms = node.t === 'add' ? node.a : [node];
  const steps = [];
  const parts = [];
  for (const term of terms) {
    if (!hasVar(term, v)) {
      const res = simplify(mul(term, sym(v)));
      steps.push({ term, rule: 'Constant rule ∫k dx = kx', result: res });
      parts.push(res);
      continue;
    }
    const [c, rest] = splitCoef(term);
    // separate constant (x-free) factors such as pi or e
    let constPart = num(c);
    let varPart = rest;
    if (rest && rest.t === 'mul') {
      const k = rest.a.filter((f) => !hasVar(f, v));
      const w = rest.a.filter((f) => hasVar(f, v));
      if (k.length) { constPart = simplify(mul(num(c), ...k)); varPart = w.length === 1 ? w[0] : { t: 'mul', a: w }; }
    }
    const { result, rule } = integrateBasic(varPart, v);
    const res = simplify(mul(constPart, result));
    steps.push({ term, rule: isNum(constPart, 1) ? rule : `Constant multiple rule, then ${rule}`, result: res });
    parts.push(res);
  }
  return { result: simplify(add(...parts)), steps };
}
