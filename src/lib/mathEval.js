// Safe math expression evaluator.
//
// Replaces `new Function()` for the `calculate` tool. Supports:
//   - Numeric literals (integer, decimal, scientific notation)
//   - Binary operators: + - * / % ^
//   - Unary minus/plus
//   - Parentheses
//   - A whitelisted set of Math.* constants and single-/multi-arg functions
//
// Does NOT support: assignment, property access, identifiers outside the
// whitelist, string/template literals, function declarations, comments.

const CONSTANTS = {
  PI: Math.PI,
  E: Math.E,
  LN2: Math.LN2,
  LN10: Math.LN10,
  LOG2E: Math.LOG2E,
  LOG10E: Math.LOG10E,
  SQRT2: Math.SQRT2,
  SQRT1_2: Math.SQRT1_2,
}

const FUNCTIONS = {
  abs: Math.abs,
  acos: Math.acos,
  acosh: Math.acosh,
  asin: Math.asin,
  asinh: Math.asinh,
  atan: Math.atan,
  atan2: Math.atan2,
  atanh: Math.atanh,
  cbrt: Math.cbrt,
  ceil: Math.ceil,
  cos: Math.cos,
  cosh: Math.cosh,
  exp: Math.exp,
  expm1: Math.expm1,
  floor: Math.floor,
  hypot: Math.hypot,
  log: Math.log,
  log2: Math.log2,
  log10: Math.log10,
  log1p: Math.log1p,
  max: Math.max,
  min: Math.min,
  pow: Math.pow,
  round: Math.round,
  sign: Math.sign,
  sin: Math.sin,
  sinh: Math.sinh,
  sqrt: Math.sqrt,
  tan: Math.tan,
  tanh: Math.tanh,
  trunc: Math.trunc,
}

function tokenize(input) {
  const tokens = []
  let i = 0
  while (i < input.length) {
    const c = input[i]
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue }
    if ((c >= '0' && c <= '9') || c === '.') {
      let j = i
      while (j < input.length && /[0-9.]/.test(input[j])) j++
      // scientific notation (e.g. 1e5, 2.5e-3)
      if (j < input.length && (input[j] === 'e' || input[j] === 'E')) {
        j++
        if (input[j] === '+' || input[j] === '-') j++
        while (j < input.length && /[0-9]/.test(input[j])) j++
      }
      const num = Number(input.slice(i, j))
      if (!Number.isFinite(num)) throw new Error(`Invalid number at position ${i}`)
      tokens.push({ type: 'num', value: num })
      i = j
      continue
    }
    if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_') {
      let j = i
      while (j < input.length && /[a-zA-Z0-9_]/.test(input[j])) j++
      tokens.push({ type: 'ident', value: input.slice(i, j) })
      i = j
      continue
    }
    if ('+-*/%^(),'.includes(c)) {
      tokens.push({ type: 'op', value: c })
      i++
      continue
    }
    throw new Error(`Unexpected character '${c}' at position ${i}`)
  }
  return tokens
}

// Recursive-descent parser/evaluator.
// Grammar (precedence low → high):
//   expr    := term (('+' | '-') term)*
//   term    := power (('*' | '/' | '%') power)*
//   power   := unary ('^' unary)*        // right-assoc
//   unary   := ('+' | '-') unary | primary
//   primary := NUMBER | IDENT | IDENT '(' args? ')' | '(' expr ')'
//   args    := expr (',' expr)*
class Parser {
  constructor(tokens) {
    this.tokens = tokens
    this.pos = 0
  }
  peek() { return this.tokens[this.pos] }
  consume() { return this.tokens[this.pos++] }
  expect(type, value) {
    const t = this.peek()
    if (!t || t.type !== type || (value !== undefined && t.value !== value)) {
      throw new Error(`Expected ${value || type}`)
    }
    return this.consume()
  }

  parseExpr() {
    let left = this.parseTerm()
    while (this.peek() && this.peek().type === 'op' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.consume().value
      const right = this.parseTerm()
      left = op === '+' ? left + right : left - right
    }
    return left
  }

  parseTerm() {
    let left = this.parsePower()
    while (this.peek() && this.peek().type === 'op' && (this.peek().value === '*' || this.peek().value === '/' || this.peek().value === '%')) {
      const op = this.consume().value
      const right = this.parsePower()
      if (op === '*') left = left * right
      else if (op === '/') left = left / right
      else left = left % right
    }
    return left
  }

  parsePower() {
    const base = this.parseUnary()
    if (this.peek() && this.peek().type === 'op' && this.peek().value === '^') {
      this.consume()
      const exp = this.parsePower() // right-assoc
      return Math.pow(base, exp)
    }
    return base
  }

  parseUnary() {
    const t = this.peek()
    if (t && t.type === 'op' && (t.value === '+' || t.value === '-')) {
      this.consume()
      const val = this.parseUnary()
      return t.value === '-' ? -val : val
    }
    return this.parsePrimary()
  }

  parsePrimary() {
    const t = this.peek()
    if (!t) throw new Error('Unexpected end of expression')
    if (t.type === 'num') {
      this.consume()
      return t.value
    }
    if (t.type === 'op' && t.value === '(') {
      this.consume()
      const val = this.parseExpr()
      this.expect('op', ')')
      return val
    }
    if (t.type === 'ident') {
      this.consume()
      // Function call
      if (this.peek() && this.peek().type === 'op' && this.peek().value === '(') {
        this.consume()
        const args = []
        if (!(this.peek() && this.peek().type === 'op' && this.peek().value === ')')) {
          args.push(this.parseExpr())
          while (this.peek() && this.peek().type === 'op' && this.peek().value === ',') {
            this.consume()
            args.push(this.parseExpr())
          }
        }
        this.expect('op', ')')
        const fn = FUNCTIONS[t.value]
        if (!fn) throw new Error(`Unknown function '${t.value}'`)
        return fn(...args)
      }
      // Constant
      if (Object.prototype.hasOwnProperty.call(CONSTANTS, t.value)) {
        return CONSTANTS[t.value]
      }
      throw new Error(`Unknown identifier '${t.value}'`)
    }
    throw new Error(`Unexpected token '${t.value}'`)
  }
}

/**
 * Evaluate a math expression string safely.
 * Accepts forms like "2 + 3 * 4", "sqrt(16)", "pow(2, 10)", "PI * 2".
 * Also accepts "Math.sqrt(16)" / "Math.PI" style — the "Math." prefix is stripped.
 *
 * @param {string} expression
 * @returns {number}
 * @throws {Error} on invalid / disallowed input
 */
export function evalMath(expression) {
  if (typeof expression !== 'string') throw new Error('Expression must be a string')
  if (expression.length > 500) throw new Error('Expression too long')
  // Accept "Math.foo" / "Math.PI" as a convenience — strip the namespace.
  const normalized = expression.replace(/\bMath\./g, '')
  const tokens = tokenize(normalized)
  if (tokens.length === 0) throw new Error('Empty expression')
  const parser = new Parser(tokens)
  const result = parser.parseExpr()
  if (parser.pos !== tokens.length) {
    throw new Error('Unexpected trailing input')
  }
  return result
}
