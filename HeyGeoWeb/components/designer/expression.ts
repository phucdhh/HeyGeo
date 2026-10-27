/**
 * The arithmetic behind a Calculate measurement.
 *
 * GSP's Number → Calculate keeps what you typed — "(AB)/(CD)" — as the left
 * hand side of the caption, and the number on the right is that expression
 * re-evaluated whenever anything inside it moves. The desktop app stores its
 * formula as KFormula box codepoints; the document stores the same shape as
 * infix text, which is data about a calculation, not code to run.
 *
 * So this file is the interpreter: a tokenizer and a recursive-descent
 * evaluator over an explicitly whitelisted grammar. There is no eval and no
 * new Function here — a model from the database, a share link or the desktop
 * exporter cannot make the page execute anything, only do arithmetic.
 *
 * References to other measurements are written `#0`, `#1` … and index the
 * measurement's args, so an expression cannot name an element the document
 * does not already list as a dependency.
 */

/** The value of `#i`, or null when that operand is missing or undefined. */
export type Operand = (index: number) => number | null;

/**
 * The value of a name the caller owns — a plot's `x` or `t`. Returning a number
 * or null says "this is mine, and here is what it is worth at this point";
 * returning undefined says the name is not the caller's and the evaluator decides.
 */
export type Variable = (name: string) => number | null | undefined;

type Token =
  | { k: 'num'; v: number }
  | { k: 'ref'; i: number }
  | { k: 'op'; v: string }
  | { k: 'name'; v: string };

const OPERATORS = '+-*/^(),';

/**
 * The functions the desktop formula evaluator knows, with the same spellings
 * and the same conventions: `log` is the natural logarithm and `ln` its alias,
 * base ten is `log10`, and trigonometry takes radians. `sqrt(x)` is the square
 * root; the desktop's nth root is the stacked radical, which never survives the
 * trip into plain text.
 */
const FUNCTIONS: Record<string, (a: number) => number> = {
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log,
  log10: Math.log10,
  log2: Math.log2,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  asinh: Math.asinh,
  acosh: Math.acosh,
  atanh: Math.atanh,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  trunc: Math.trunc,
  sgn: Math.sign,
  sign: Math.sign,
};

/** Two-argument calls the desktop's function table also answers to. */
const BINARY: Record<string, (a: number, b: number) => number> = {
  pow: Math.pow,
  atan2: Math.atan2,
  min: Math.min,
  max: Math.max,
};

/**
 * Named numbers the desktop hands the evaluator as unit variables: "cm" and
 * "deg" count as one, an inch is 2.54 cm and a radian is 180/π of a degree.
 * "px" is left out — it depends on the DPI of the machine that exported the
 * file, which a browser cannot know.
 */
const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  cm: 1,
  deg: 1,
  in: 2.54,
  rad: 180 / Math.PI,
};

function tokenize(src: string): Token[] | null {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n') { i++; continue; }
    if (c === '#') {
      const m = /^#\d+/.exec(src.slice(i));
      if (!m) return null;
      out.push({ k: 'ref', i: Number(m[0].slice(1)) });
      i += m[0].length;
      continue;
    }
    if ((c >= '0' && c <= '9') || c === '.') {
      const m = /^\d*\.?\d*/.exec(src.slice(i))!;
      if (!/\d/.test(m[0])) return null;
      out.push({ k: 'num', v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[a-zπ]/i.test(c)) {
      const m = /^[a-zπ][a-z0-9π]*/i.exec(src.slice(i))!;
      out.push({ k: 'name', v: m[0].toLowerCase() });
      i += m[0].length;
      continue;
    }
    if (OPERATORS.includes(c)) { out.push({ k: 'op', v: c }); i++; continue; }
    return null;
  }
  return out;
}

/**
 * Evaluate the infix expression `src`, or null when any part of it is
 * unparseable, undefined (a division by zero, the square root of a negative) or
 * asks for an operand the document cannot supply.
 *
 * `variable` is what a plot passes its own `x` or `t` in as. A name the caller
 * does not claim and the evaluator does not know is still a failure.
 */
export function evalExpression(src: string, operand: Operand, variable?: Variable): number | null {
  const tokens = tokenize(src) ?? [];
  if (tokens.length === 0) return null;
  let at = 0;
  let failed = false;

  const peek = (): Token | undefined => tokens[at];
  function isOp(v: string): boolean {
    const t = tokens[at];
    return t !== undefined && t.k === 'op' && t.v === v;
  }
  const finite = (v: number | null | undefined): number | null =>
    (v === null || v === undefined || !Number.isFinite(v) ? null : v);

  // expr := term { ('+' | '-') term }
  function expr(): number | null {
    let v = term();
    for (;;) {
      if (!isOp('+') && !isOp('-')) return v;
      const minus = isOp('-');
      at++;
      const l = finite(v);
      const r = finite(term());
      v = l === null || r === null ? null : (minus ? l - r : l + r);
    }
  }

  // term := factor { ('*' | '/') factor | factor }  — the last form is the
  // juxtaposition the desktop's expression tree carries as a multiply box.
  function term(): number | null {
    let v = factor();
    for (;;) {
      if (isOp('/')) {
        at++;
        const l = finite(v);
        const r = finite(factor());
        if (l === null || r === null) return null;
        if (r === 0) { failed = true; return null; }
        v = l / r;
        continue;
      }
      const times = isOp('*');
      if (!times && !startsFactor()) return v;
      if (times) at++;
      const l = finite(v);
      const r = finite(factor());
      v = l === null || r === null ? null : l * r;
    }
  }

  function startsFactor(): boolean {
    const t = peek();
    if (!t) return false;
    // Any token can begin the next factor except an operator, and a name is
    // either a call or a constant — `2pi` and `3cm` are multiplications.
    return t.k !== 'op' || t.v === '(';
  }

  // unary := ('+' | '-') unary | power
  function factor(): number | null {
    if (isOp('-')) { at++; const v = finite(factor()); return v === null ? null : -v; }
    if (isOp('+')) { at++; return factor(); }
    return power();
  }

  // power := primary [ '^' unary ]  — right associative, and it binds tighter
  // than a leading minus, so -2^2 reads as -(2^2) the way the desktop prints it.
  function power(): number | null {
    const base = finite(primary());
    if (!isOp('^')) return base;
    at++;
    const exponent = finite(factor());
    if (base === null || exponent === null) return null;
    return finite(Math.pow(base, exponent));
  }

  function group(): number | null {
    at++;
    const v = expr();
    if (!isOp(')')) { failed = true; return null; }
    at++;
    return v;
  }

  function call(name: string): number | null {
    at++;
    const args: number[] = [];
    for (;;) {
      const v = finite(expr());
      if (v === null) return null;
      args.push(v);
      if (isOp(',')) { at++; continue; }
      break;
    }
    if (!isOp(')')) { failed = true; return null; }
    at++;
    const raw = args.length === 1
      ? FUNCTIONS[name]?.(args[0])
      : args.length === 2 ? BINARY[name]?.(args[0], args[1]) : undefined;
    return finite(raw);
  }

  function primary(): number | null {
    const t = peek();
    if (!t) { failed = true; return null; }
    if (t.k === 'num') { at++; return t.v; }
    if (t.k === 'ref') { at++; return finite(operand(t.i)); }
    if (t.k === 'op' && t.v === '(') return group();
    if (t.k === 'name') {
      at++;
      if (isOp('(')) return call(t.v);
      // A name on its own is a constant, not a function waiting for brackets.
      if (t.v in CONSTANTS) return CONSTANTS[t.v];
      // …unless the caller says it is the variable of the thing being drawn.
      // An undefined value there is one missing point, not a bad expression.
      const owned = variable?.(t.v);
      if (owned !== undefined) return finite(owned);
      failed = true;
      return null;
    }
    failed = true;
    return null;
  }

  const result = finite(expr());
  if (failed || at !== tokens.length) return null;
  return result;
}

/**
 * Every operand index an expression reads, in order of first appearance and
 * without repeats — what a document editor checks the args list against.
 */
export function expressionRefs(src: string): number[] {
  const tokens = tokenize(src);
  if (!tokens) return [];
  const out: number[] = [];
  for (const t of tokens) {
    if (t.k === 'ref' && !out.includes(t.i)) out.push(t.i);
  }
  return out;
}

/**
 * The bare names an expression reads that the evaluator has no number for —
 * what a plot's caller has to supply as its variable. A call like `sin(x)`
 * contributes its argument, not `sin`; `pi` and the unit names contribute
 * nothing, because the evaluator already knows them.
 */
export function expressionVariables(src: string): string[] {
  const tokens = tokenize(src);
  if (!tokens) return [];
  const known = (name: string): boolean =>
    Object.prototype.hasOwnProperty.call(CONSTANTS, name)
    || Object.prototype.hasOwnProperty.call(FUNCTIONS, name)
    || Object.prototype.hasOwnProperty.call(BINARY, name);
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.k !== 'name') continue;
    const next = tokens[i + 1];
    if (next?.k === 'op' && next.v === '(') continue;
    if (known(t.v)) continue;
    if (!out.includes(t.v)) out.push(t.v);
  }
  return out;
}
