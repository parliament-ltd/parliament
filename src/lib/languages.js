// Languages for replies (refactor-plan.md, stage 7, piece 6; LPN §3; C87,
// the 16 October suggestions under "How people switch language"; C166).
//
// The reply language is separate from the interface's. `reply:swedish`
// sets it; until it is set, replies follow the interface's language, where
// the browser says the person reads that language (C166 (b)). The choice
// is sent to every provider as one line of the system prompt, in English,
// since it is an instruction to a model and not a word of the interface.
//
// A language is kept as its tag ('sv', 'zh-Hant'), never as a name, so a
// choice made in one interface language reads the same in another (C86).
// Names come from the browser's own list of language names (Intl), in the
// language the person reads, in English and in the language itself, so
// `reply:sv`, `reply:swedish` and `reply:svenska` all find Swedish.
//
// Pure.

// The languages a reply can be asked for: most of the world's written
// languages with a two-letter code, and the variants a reply has to tell
// apart (Chinese in its two scripts, Portuguese of Brazil and of Portugal).
// A model may write some of them poorly; the picker says what is published.
export const REPLY_LANGUAGES = Object.freeze([
  'af', 'am', 'ar', 'az', 'be', 'bg', 'bn', 'bs', 'ca', 'cs', 'cy', 'da', 'de', 'el', 'en', 'eo', 'es', 'et', 'eu',
  'fa', 'fi', 'fo', 'fr', 'ga', 'gd', 'gl', 'gu', 'ha', 'he', 'hi', 'hr', 'hu', 'hy', 'id', 'ig', 'is', 'it', 'ja',
  'ka', 'kk', 'km', 'kn', 'ko', 'ku', 'ky', 'lb', 'lo', 'lt', 'lv', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my',
  'nb', 'ne', 'nl', 'nn', 'pa', 'pl', 'ps', 'pt', 'ro', 'ru', 'se', 'si', 'sk', 'sl', 'so', 'sq', 'sr', 'sv', 'sw',
  'ta', 'te', 'tg', 'th', 'tk', 'tl', 'tr', 'tt', 'ug', 'uk', 'ur', 'uz', 'vi', 'xh', 'yi', 'yo', 'zh', 'zu',
  'zh-Hans', 'zh-Hant', 'pt-BR', 'pt-PT',
])

// The word that turns the reply language off: nothing is asked, and a model
// answers in the language it is written to.
export const OFF = 'off'

const KNOWN = new Map(REPLY_LANGUAGES.map((t) => [t.toLowerCase(), t]))

// Test languages are English underneath (i18n.js), so they reply in English.
const TEST = /-(XA|XB)$/i

/** The base of a language tag: 'sv-FI' -> 'sv'. The test languages are English. */
export function baseOf(tag) {
  const t = String(tag ?? '')
  if (TEST.test(t)) return 'en'
  return t.split('-')[0].toLowerCase()
}

// A tag as Parliament keeps it, from one a browser or a person gives:
// 'sv-SE' is Swedish, 'zh-TW' is Chinese in its traditional script.
function keptTag(tag) {
  const t = String(tag ?? '').trim()
  if (!t) return null
  const exact = KNOWN.get(t.toLowerCase())
  if (exact) return exact
  if (/^zh-(tw|hk|mo|hant)/i.test(t)) return 'zh-Hant'
  if (/^zh-(cn|sg|hans)/i.test(t)) return 'zh-Hans'
  if (/^no(-|$)/i.test(t)) return 'nb'
  const base = KNOWN.get(baseOf(t))
  return base ?? null
}

function displayNames(locale) {
  try {
    return new Intl.DisplayNames([locale], { type: 'language', fallback: 'none' })
  } catch {
    return null
  }
}

/** A language's name in a language: nameOf('sv', 'en') is "Swedish". Falls back to the tag. */
export function nameOf(tag, locale = 'en') {
  if (!tag) return ''
  const names = displayNames(TEST.test(locale) ? 'en' : locale)
  return names?.of(tag) ?? tag
}

/** A language's name in the language itself: "svenska", "日本語". */
export const ownNameOf = (tag) => nameOf(tag, tag)

/** A language's English name, for the line sent to a model. */
export const englishNameOf = (tag) => nameOf(tag, 'en')

const fold = (s) => String(s ?? '').normalize('NFKC').toLocaleLowerCase().trim().replace(/\s+/g, ' ')

/**
 * The language some words name: its tag, its name in English, in the
 * language itself, or in the interface's language (`locale`). Returns the
 * tag kept, or null.
 * @param {string} words
 * @param {string} [locale] the interface's language
 * @returns {string|null}
 */
export function findLanguage(words, locale = 'en') {
  const w = fold(words)
  if (!w) return null
  const byTag = KNOWN.get(w)
  if (byTag) return byTag
  for (const tag of REPLY_LANGUAGES) {
    if (fold(englishNameOf(tag)) === w || fold(ownNameOf(tag)) === w || fold(nameOf(tag, locale)) === w) return tag
  }
  return null
}

/**
 * What replies are in, and why (C166).
 * @param {{ setting?: string|null, locale?: string, browser?: readonly string[], chosen?: boolean }} input
 *   setting: the person's choice (a tag, 'off', or none); locale: the
 *   interface's language; browser: the languages the browser says its
 *   person reads (navigator.languages); chosen: the interface's language was
 *   chosen with language:, so replies follow it whatever the browser lists
 *   (C166 (b); C184)
 * @returns {{ tag: string|null, how: 'set'|'interface'|'off'|'unread' }}
 *   set: chosen with reply:; interface: following the interface's language;
 *   off: nothing asked (reply:off); unread: following the interface, but the
 *   browser does not list its language, so nothing is asked
 */
export function replyLanguageOf({ setting = null, locale = 'en', browser = [], chosen: pageChosen = false } = {}) {
  if (setting === OFF) return { tag: null, how: 'off' }
  const chosen = setting ? keptTag(setting) : null
  if (chosen) return { tag: chosen, how: 'set' }
  const page = baseOf(locale)
  const read = pageChosen || (browser ?? []).some((b) => baseOf(b) === page) || TEST.test(String(locale ?? ''))
  return read ? { tag: keptTag(locale) ?? keptTag(page) ?? page, how: 'interface' } : { tag: null, how: 'unread' }
}

/**
 * The line a model is sent for a reply language, in English: '' when none.
 * It asks for the language whatever the prompt is written in, and leaves
 * room for a prompt that asks for another (a translation, say).
 */
export function replyInstruction(tag) {
  if (!tag) return ''
  return `Write your replies in ${englishNameOf(tag)}, whatever language I write in, unless I ask for another language.`
}

/** The system prompt: the frameworks' instructions, then the reply language, each a paragraph. */
export function withReplyLanguage(system, tag) {
  const line = replyInstruction(tag)
  return [String(system ?? '').trim(), line].filter(Boolean).join('\n\n')
}

/**
 * The language a source is asked in (C166 (e)): the reply language when the
 * person chose one, else the interface's, as before.
 */
export function sourceAskLanguage(reply, locale) {
  if (reply?.how === 'set' && reply.tag) return baseOf(reply.tag)
  return baseOf(locale)
}

/** The language translations go into: the reply language, else the interface's. */
export function translateInto(reply, locale) {
  return reply?.tag ?? keptTag(baseOf(locale)) ?? 'en'
}
