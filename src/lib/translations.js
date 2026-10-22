// Translations of answers from sources, and questions translated before
// they go (refactor-plan.md, stage 7, piece 6; LPN §6; C84, C85, C166).
//
// An answer from a source is translated on request, one answer at a time
// (LPN §6: "per card, on request"), and the translation is kept on its
// message beside the source's own words, which stay as they came:
//
//   translation: { lang, from, by, at, title?, text?, items? }
//     lang   the language it was translated into ('sv')
//     from   the language it was in, where known ('en')
//     by     who translated it: 'browser' (the browser's own translation, on
//            this device), or a model's id ('claude-haiku-5-5',
//            'ollama:bonsai-2:9b')
//     at     when
//     title, text   an article's (Wikipedia)
//     items  a list's (Hacker News, OpenAlex): each result's title and
//            passage, in the list's order
//
// A question translated before it went to a source keeps what was sent:
//
//   asked: { text, lang, by, at }
//
// Both are plain text from outside, shown as text, never as HTML, and never
// sent to a model unless the person acts on them. New optional fields on a
// message, shown at the stage 7 checkpoint; backups carry them and a
// restore checks them.
//
// Pure.

// Most of an article's text translated at once, and most pieces in one request.
export const TRANSLATE_MAX_CHARS = 12_000
export const TRANSLATE_MOST = 40

// Characters a person cannot see, which can hide instructions in text from
// outside: zero-width characters, direction marks used to hide text, the
// byte-order mark and Unicode tag characters (security notes §1.4). Taken
// out before text from a source goes to a model.
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]|\uDB40[\uDC00-\uDC7F]/g
export const withoutInvisible = (text) => String(text ?? '').replace(INVISIBLE, '')

export const BY_BROWSER = 'browser'
const LANG = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/
const BY = /^(browser|[A-Za-z0-9][A-Za-z0-9._:/-]{0,199})$/

const text = (v, max) => typeof v === 'string' && v.length <= max
const textOrNull = (v, max) => v == null || text(v, max)

/** Whether a message's translation is well formed, as a restore checks it. */
export function isTranslation(t) {
  if (!t || typeof t !== 'object' || Array.isArray(t)) return false
  if (!(typeof t.lang === 'string' && LANG.test(t.lang))) return false
  if (!(t.from == null || (typeof t.from === 'string' && LANG.test(t.from)))) return false
  if (!(typeof t.by === 'string' && BY.test(t.by))) return false
  if (!(typeof t.at === 'string' && !Number.isNaN(Date.parse(t.at)))) return false
  if (!textOrNull(t.title, 600) || !textOrNull(t.text, 20_000)) return false
  if (t.items != null && !(Array.isArray(t.items) && t.items.length <= 10
    && t.items.every((it) => it && typeof it === 'object' && !Array.isArray(it) && text(it.title, 600) && textOrNull(it.text, 4000)))) return false
  return true
}

/** Whether a prompt's translated question is well formed. */
export function isAsked(a) {
  return Boolean(a) && typeof a === 'object' && !Array.isArray(a)
    && text(a.text, 2000) && typeof a.lang === 'string' && LANG.test(a.lang)
    && typeof a.by === 'string' && BY.test(a.by) && typeof a.at === 'string' && !Number.isNaN(Date.parse(a.at))
}

// An article's text in paragraphs, so each is translated on its own; past
// the most a request takes, the rest go as one.
function paragraphs(body) {
  const parts = String(body ?? '').split(/\n+/).map((p) => p.trim()).filter(Boolean)
  if (parts.length <= TRANSLATE_MOST - 1) return parts
  return [...parts.slice(0, TRANSLATE_MOST - 2), parts.slice(TRANSLATE_MOST - 2).join('\n')]
}

/**
 * What of an answer from a source is translated, as pieces, and how the
 * translated pieces become its translation. null for a message that is not
 * an answer from a source, or holds nothing to translate.
 * @param {object} message
 * @returns {{ pieces: string[], chars: number, from: string|null, shape: 'list'|'article', build: (out: string[]) => object }|null}
 */
export function piecesOfAnswer(message) {
  const src = message?.source
  if (message?.role !== 'assistant' || !src || src.found === false) return null
  const from = typeof src.lang === 'string' && LANG.test(src.lang) ? src.lang : null
  const clean = (t) => withoutInvisible(t)
  if (src.shape === 'list') {
    const items = Array.isArray(src.items) ? src.items : []
    const pieces = []
    const map = items.map((it) => {
      const at = { title: pieces.push(clean(it.title ?? '')) - 1, text: null }
      if (it.text) at.text = pieces.push(clean(it.text)) - 1
      return at
    })
    if (!pieces.some(Boolean)) return null
    return {
      pieces, chars: count(pieces), from, shape: 'list',
      build: (out) => ({ items: map.map((at) => ({ title: out[at.title] ?? '', text: at.text == null ? null : out[at.text] ?? null })) }),
    }
  }
  const body = paragraphs(clean(String(message.content ?? '').slice(0, TRANSLATE_MAX_CHARS)))
  if (!body.length) return null
  const title = src.title ? clean(src.title) : null
  const pieces = title ? [title, ...body] : body
  return {
    pieces, chars: count(pieces), from, shape: 'article',
    build: (out) => ({ ...(title ? { title: out[0] } : {}), text: (title ? out.slice(1) : out).join('\n\n') }),
  }
}

const count = (pieces) => pieces.reduce((n, p) => n + p.length, 0)

/** The translation kept on a message, from the translated pieces. */
export function translationOf(parts, out, { lang, by, at = new Date().toISOString() }) {
  return { lang, ...(parts.from ? { from: parts.from } : {}), by, at, ...parts.build(out) }
}

/**
 * The last answer from a source in a chat's messages, with the question it
 * answered, or null.
 * @returns {{ message: object, question: string|null }|null}
 */
export function lastSourceAnswer(messages = []) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m?.role === 'assistant' && m.source && m.source.found !== false && m.content) {
      const asked = messages.slice(0, i).reverse().find((p) => p?.role === 'user')
      return { message: m, question: typeof asked?.content === 'string' ? asked.content : null }
    }
  }
  return null
}
