// Sums (C303 (c), ruled 16 November): calc: worked out on the line under the
// bar, and the figures of a selection added up there. A small reader of
// sums written for Parliament: the security policy forbids running text as
// code, so nothing typed is ever run. Exact with decimals: each number is a
// fraction of two whole numbers (BigInt), and only the answer is rounded.

const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a }
const frac = (n, d = 1n) => {
  if (d === 0n) throw new SumError('divideByZero')
  if (d < 0n) { n = -n; d = -d }
  const g = gcd(n, d) || 1n
  return { n: n / g, d: d / g }
}
const add = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d)
const sub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d)
const mul = (a, b) => frac(a.n * b.n, a.d * b.d)
const div = (a, b) => { if (b.n === 0n) throw new SumError('divideByZero'); return frac(a.n * b.d, a.d * b.n) }
function pow(a, b) {
  if (b.d !== 1n || b.n > 100n || b.n < -100n) throw new SumError('power')
  let e = b.n < 0n ? -b.n : b.n
  let r = frac(1n)
  let base = a
  while (e > 0n) { if (e & 1n) r = mul(r, base); base = mul(base, base); e >>= 1n }
  return b.n < 0n ? div(frac(1n), r) : r
}

export class SumError extends Error {
  constructor(code, at = null) { super(code); this.name = 'SumError'; this.code = code; this.at = at }
}

/** A decimal written as digits, a point and digits, as a fraction. */
export function fromDecimal(text) {
  const m = /^(-?)(\d*)(?:\.(\d+))?$/.exec(String(text))
  if (!m || (m[2] === '' && !m[3])) throw new SumError('number')
  const digits = BigInt((m[2] || '0') + (m[3] ?? ''))
  return frac(m[1] ? -digits : digits, 10n ** BigInt((m[3] ?? '').length))
}

// The bar's own way of writing a number: a point for decimals, a comma or a
// space between thousands (48,000.50).
function tokens(text) {
  const out = []
  const s = String(text)
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (/\s/.test(c)) { i++; continue }
    const num = /^(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?|^\.\d+/.exec(s.slice(i))
    if (num) { out.push({ t: 'n', v: fromDecimal(num[0].replace(/,/g, '')), at: i }); i += num[0].length; continue }
    const op = { '+': '+', '-': '-', '−': '-', '*': '*', '×': '*', '·': '*', '/': '/', '÷': '/', '^': '^', '%': '%', '(': '(', ')': ')' }[c]
    if (!op) throw new SumError('char', i)
    out.push({ t: op, at: i })
    i++
  }
  return out
}

/** A sum worked out: a fraction, or a SumError with what was wrong. */
export function evaluate(text) {
  const ts = tokens(text)
  if (!ts.length) throw new SumError('empty')
  let p = 0
  const peek = () => ts[p]?.t
  const take = (t) => { if (ts[p]?.t !== t) throw new SumError(t === ')' ? 'bracket' : 'syntax', ts[p]?.at ?? null); p++ }
  function primary() {
    const tok = ts[p]
    if (!tok) throw new SumError('end')
    if (tok.t === 'n') { p++; return tok.v }
    if (tok.t === '(') { p++; const v = expr(); take(')'); return v }
    throw new SumError('syntax', tok.at)
  }
  function postfix() {
    let v = primary()
    while (peek() === '%') { p++; v = div(v, frac(100n)) }
    return v
  }
  function unary() {
    if (peek() === '-') { p++; const v = unary(); return frac(-v.n, v.d) }
    if (peek() === '+') { p++; return unary() }
    return postfix()
  }
  function power() {
    const base = unary()
    if (peek() === '^') { p++; return pow(base, power()) }
    return base
  }
  function term() {
    let v = power()
    for (;;) {
      if (peek() === '*') { p++; v = mul(v, power()) } else if (peek() === '/') { p++; v = div(v, power()) } else if (peek() === '(') { v = mul(v, power()) } else return v
    }
  }
  function expr() {
    let v = term()
    for (;;) {
      if (peek() === '+') { p++; v = add(v, term()) } else if (peek() === '-') { p++; v = sub(v, term()) } else return v
    }
  }
  const v = expr()
  if (p < ts.length) throw new SumError(ts[p].t === ')' ? 'bracket' : 'syntax', ts[p].at)
  return v
}

/**
 * A fraction written in a language's own digits and separators, rounded to
 * `places` decimals at most; `exact` false when it was rounded.
 */
export function format(v, locale = 'en', places = 10) {
  const neg = v.n < 0n
  const n = neg ? -v.n : v.n
  const scale = 10n ** BigInt(places)
  const scaled = (n * scale * 2n + v.d) / (2n * v.d) // rounded half up
  const exact = (n * scale) % v.d === 0n
  const whole = scaled / scale
  let fraction = (scaled % scale).toString().padStart(places, '0').replace(/0+$/, '')
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
  const point = new Intl.NumberFormat(locale).formatToParts(1.5).find((x) => x.type === 'decimal')?.value ?? '.'
  const text = `${neg && (whole > 0n || fraction) ? '-' : ''}${nf.format(whole)}${fraction ? point + fraction : ''}`
  return { text, exact }
}

// A figure in text from a reply: thousands and decimals as its language
// writes them (31,000 and 31 000 and 31.000,50 each as meant).
const FIGURE = /[-−]?\d{1,3}(?:[,.\u00a0\u202f ]\d{3})+(?:[.,]\d+)?|[-−]?\d+(?:[.,]\d+)?/g

/** A figure as a fraction, its separators read with the reply's language's decimal mark (point or comma). */
export function readFigure(raw, point = '.') {
  let s = String(raw).replace(/−/g, '-').replace(/[\u00a0\u202f ]/g, '')
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma >= 0 && lastDot >= 0) {
    const dec = lastComma > lastDot ? ',' : '.'
    s = s.split(dec === ',' ? '.' : ',').join('').replace(dec, '.')
  } else if (lastComma >= 0 || lastDot >= 0) {
    const mark = lastComma >= 0 ? ',' : '.'
    const parts = s.split(mark)
    const grouped = parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && mark !== point)
    s = grouped ? parts.join('') : parts.join('.')
  }
  return fromDecimal(s)
}

/** The figures in a stretch of text, at most `most`. */
export function figuresIn(text, point = '.', most = 500) {
  const out = []
  for (const m of String(text ?? '').matchAll(FIGURE)) {
    // Not a part of a word or a code, as "v2" or "A4".
    const before = m.index > 0 ? text[m.index - 1] : ''
    if (/[\p{L}_]/u.test(before)) continue
    try { out.push(readFigure(m[0], point)) } catch { /* not a figure */ }
    if (out.length >= most) break
  }
  return out
}

/** Their count, sum and average, or null for fewer than two. */
export function sumOf(figures) {
  if (!figures || figures.length < 2) return null
  const sum = figures.reduce((a, b) => add(a, b), frac(0n))
  return { count: figures.length, sum, average: div(sum, frac(BigInt(figures.length))) }
}
