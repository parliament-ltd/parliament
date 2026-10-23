// The privacy filter for fixed formats (refactor-plan.md, stage 7, piece 7;
// security notes §4.1; S3; C167). Plain code, on this device, offered to
// everyone.
//
// Before a request goes to a provider, email addresses, phone numbers, bank
// account numbers (IBAN) and card numbers in it are swapped for
// placeholders like [EMAIL_1]; in the reply, the placeholders are swapped
// back, still on this device. The same value is the same placeholder all
// through one request, numbered by where it first appears, so a chat's
// history reads the same from one request to the next.
//
// Each format is checked so that ordinary numbers are left alone: an IBAN
// by its check digits, a card number by its Luhn digit, a phone number by
// its shape and how many digits it has. Names, addresses and other free
// text need a model to find, and come only through a model on this computer
// (S3; piece 8).
//
// Pure.

export const KINDS = Object.freeze(['email', 'phone', 'iban', 'card'])
const LABEL = { email: 'EMAIL', phone: 'PHONE', iban: 'IBAN', card: 'CARD', name: 'NAME' }

const EMAIL = /(?<![\w.%+-])[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,62}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,62}[A-Za-z0-9])?)*\.[A-Za-z]{2,24}(?![\w-])/g
// International: a plus, a country code, and groups with spaces, hyphens,
// dots or brackets between them.
const PHONE_INTL = /(?<![\w+])\+\d{1,3}(?:[ .-]?\(?\d{1,5}\)?){1,6}(?![\w])/g
// National, starting with the trunk 0: 070-123 45 67, 020 7946 0958,
// 06 12 34 56 78. Dots are left out, so versions and dates are not read.
const PHONE_NATIONAL = /(?<![\w.\-/:])0\d{1,4}(?:[ -]\d{2,4}){1,4}(?![\w\-/:]|\.\d)/g
// North American: (555) 123-4567 and 555-123-4567.
const PHONE_NANP = /(?<![\w(])(?:\(\d{3}\)\s?|\d{3}-)\d{3}-\d{4}(?![\w-])/g
const IBAN = /(?<![A-Za-z0-9])[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,3})?(?![A-Za-z0-9])/g
const CARD = /(?<![\d-])\d(?:[ -]?\d){12,18}(?![\d-])/g

const digits = (s) => s.replace(/\D/g, '')

function ibanValid(raw) {
  const s = raw.replace(/ /g, '')
  if (s.length < 15 || s.length > 34) return false
  const moved = s.slice(4) + s.slice(0, 4)
  let rest = 0
  for (const ch of moved) {
    const v = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55)
    for (const d of v) rest = (rest * 10 + Number(d)) % 97
  }
  return rest === 1
}

function luhn(raw) {
  const s = digits(raw)
  if (s.length < 13 || s.length > 19 || /^(\d)\1+$/.test(s)) return false
  let sum = 0
  for (let i = 0; i < s.length; i++) {
    let d = Number(s[s.length - 1 - i])
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9 }
    sum += d
  }
  return sum % 10 === 0
}

const CHECKS = [
  { kind: 'email', re: EMAIL, ok: () => true },
  { kind: 'iban', re: IBAN, ok: ibanValid },
  { kind: 'card', re: CARD, ok: luhn },
  { kind: 'phone', re: PHONE_INTL, ok: (v) => { const n = digits(v).length; return n >= 8 && n <= 15 } },
  { kind: 'phone', re: PHONE_NANP, ok: () => true },
  { kind: 'phone', re: PHONE_NATIONAL, ok: (v) => { const n = digits(v).length; return n >= 8 && n <= 12 } },
]

/**
 * The fixed formats in a text, in order, none overlapping: each
 * { kind, value, start, end }.
 */
export function findPrivate(text) {
  const t = String(text ?? '')
  const found = []
  const taken = (s, e) => found.some((f) => s < f.end && e > f.start)
  for (const { kind, re, ok } of CHECKS) {
    re.lastIndex = 0
    for (const m of t.matchAll(re)) {
      const value = m[0].trim()
      const start = m.index + m[0].indexOf(value)
      const end = start + value.length
      if (!ok(value) || taken(start, end)) continue
      found.push({ kind, value, start, end })
    }
  }
  return found.sort((a, b) => a.start - b.start)
}

/** How many of each kind some texts hold, counting a value once: { email: 1, phone: 0, iban: 0, card: 0 }. */
export function countPrivate(texts) {
  const seen = new Map()
  for (const t of texts) for (const f of findPrivate(t)) seen.set(`${f.kind}:${f.value}`, f.kind)
  const out = Object.fromEntries(KINDS.map((k) => [k, 0]))
  for (const kind of seen.values()) out[kind] += 1
  return out
}

/** Whether a count of kinds holds anything. */
export const anyFound = (found) => Boolean(found) && KINDS.some((k) => (found[k] ?? 0) > 0)

// The line a model is told when something was swapped, so it keeps the
// placeholders as they are.
export const SWAP_NOTE = 'Some details in this conversation are replaced by placeholders such as [EMAIL_1], [PHONE_1] or [NAME_1]. Keep each placeholder exactly as written wherever you need it, and do not guess what it stands for.'

/**
 * A veil for one request: swaps what it finds for placeholders on the way
 * out, and back on the way in. names: people's names a model on this
 * computer found ("patterns and names", S3), swapped wherever they appear
 * as whole words.
 * @returns {{ out: (text: string) => string, back: (text: string) => string, found: () => object, swapped: () => boolean }}
 */
export function createVeil({ names = [] } = {}) {
  const escape = (n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const nameRes = [...names].sort((a, b) => b.length - a.length)
    .map((n) => ({ value: n, re: new RegExp(`(?<![\\p{L}\\p{N}])${escape(n)}(?![\\p{L}\\p{N}])`, 'gu') }))
  const found = (t) => {
    const all = findPrivate(t)
    const taken = (s, e) => all.some((f) => s < f.end && e > f.start)
    for (const { value, re } of nameRes) {
      re.lastIndex = 0
      for (const m of t.matchAll(re)) if (!taken(m.index, m.index + value.length)) all.push({ kind: 'name', value, start: m.index, end: m.index + value.length })
    }
    return all.sort((a, b) => a.start - b.start)
  }
  const byValue = new Map() // value -> placeholder
  const byPlace = new Map() // placeholder -> value
  const counts = Object.fromEntries([...KINDS, 'name'].map((k) => [k, 0]))
  const placeFor = (kind, value) => {
    let p = byValue.get(value)
    if (!p) {
      counts[kind] += 1
      p = `[${LABEL[kind]}_${counts[kind]}]`
      byValue.set(value, p)
      byPlace.set(p, value)
    }
    return p
  }
  return {
    out(text) {
      const t = String(text ?? '')
      const here = found(t)
      if (!here.length) return t
      let s = ''
      let at = 0
      for (const f of here) {
        s += t.slice(at, f.start) + placeFor(f.kind, f.value)
        at = f.end
      }
      return s + t.slice(at)
    },
    back(text) {
      if (!byPlace.size) return String(text ?? '')
      return String(text ?? '').replace(/\[(EMAIL|PHONE|IBAN|CARD|NAME)_(\d{1,4})\]/g, (p) => byPlace.get(p) ?? p)
    },
    found: () => ({ ...counts }),
    swapped: () => byPlace.size > 0,
  }
}

/** A message's text parts through a function, its other parts as they are. */
function mapText(content, fn) {
  if (typeof content === 'string') return fn(content)
  if (!Array.isArray(content)) return content
  return content.map((p) => (p?.type === 'text' && typeof p.text === 'string' ? { ...p, text: fn(p.text) } : p))
}

/**
 * A request as it goes, with the fixed formats swapped out: the messages
 * and the system prompt, and the note telling the model of placeholders
 * when anything was swapped.
 * @param {{ messages: Array<{ role: string, content: any }>, system?: string|null }} request
 * @returns {{ messages: object[], system: string|null, veil: ReturnType<typeof createVeil> }}
 */
/**
 * A search with what the filter finds left out (C167 (e); C179): a source
 * searches for words, and a search for a placeholder finds nothing, so the
 * fixed formats, and the names given, are taken out instead.
 * @returns {{ text: string, cut: number }} the search, and how many values were taken out
 */
export function withoutPrivate(text, names = []) {
  const t = String(text ?? '')
  const veil = createVeil({ names })
  const swapped = veil.out(t)
  if (swapped === t) return { text: t, cut: 0 }
  const places = new RegExp(`\\[(${Object.values(LABEL).join('|')})_\\d+\\]`, 'g')
  const cut = (swapped.match(places) ?? []).length
  return { text: swapped.replace(places, ' ').replace(/\s{2,}/g, ' ').trim(), cut }
}

export function veilRequest({ messages = [], system = null }, veil = createVeil()) {
  // What a prompt brought in from sources is swapped too (C176).
  const out = messages.map((m) => ({
    ...m,
    content: mapText(m.content, veil.out),
    ...(Array.isArray(m.included) ? { included: m.included.map((i) => ({ ...i, text: veil.out(i.text) })) } : {}),
  }))
  const sys = system ? veil.out(system) : null
  const withNote = veil.swapped() ? [sys, SWAP_NOTE].filter(Boolean).join('\n\n') : sys
  return { messages: out, system: withNote || null, veil }
}
