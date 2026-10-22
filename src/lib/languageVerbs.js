// reply:, helper: and translate: (refactor-plan.md, stage 7, piece 6; LPN
// §3 and §6; C84, C85, C166). Each is planned before Enter: what the Enter
// line says, and what Enter does. Pure: what they need comes from the shell
// in `screens`.
//
//   reply:swedish   replies come in Swedish, whatever language you write in
//   reply:off       no language is asked for
//   helper:haiku    the model that reads text from sources, and translates it
//   translate:      the last answer from a source, into your language
//   translate:on    questions to sources that read only English go translated

import { findLanguage, OFF } from './languages'
import { findAnswerers } from '../net/answerers'
import { translateCost, translateTokens } from '../shell/estimate'
import { instructionLike } from './injection'

const CENT = 0.01
const said = (args) => args.map((x) => (x.kind === 'text' ? x.value : x.text ?? String(x.value ?? ''))).join(' ').trim()

/**
 * reply: (C166 (a)). screens.reply: { setting, now: { tag, how }, locale, nameOf(tag) }:
 * the setting as stored, what replies are in now (languages.replyLanguageOf),
 * the interface's language and how a language is named in it.
 */
export function planReply(step, screens = {}) {
  const r = screens.reply
  if (!r) return { says: { message: 'later', values: { verb: 'reply:' } }, act: null }
  const args = step.match?.values ?? []
  const name = (tag) => r.nameOf(tag)
  if (!args.length) {
    const now = r.now
    if (now.how === 'set') return { says: { message: 'replyNowSet', values: { language: name(now.tag) } }, act: null }
    if (now.how === 'interface') return { says: { message: 'replyNowPage', values: { language: name(now.tag) } }, act: null }
    return { says: { message: 'replyNowNone' }, act: null }
  }
  const word = said(args)
  const before = r.setting ?? null
  if (word.toLocaleLowerCase() === OFF) {
    if (before === OFF) return { says: { message: 'replySameOff' }, act: null }
    return { says: { message: 'replyOff' }, act: { kind: 'setting', key: 'replyLanguage', value: OFF, before } }
  }
  const tag = findLanguage(word, r.locale)
  if (!tag) return { says: { message: 'replyNone', values: { word } }, act: null }
  if (before === tag) return { says: { message: 'replySame', values: { language: name(tag) } }, act: null }
  return { says: { message: 'replySet', values: { language: name(tag) } }, act: { kind: 'setting', key: 'replyLanguage', value: tag, before } }
}

/**
 * helper: (C166 (d)). screens.helping: { now, rows, stored }: the helper now
 * (helperOf), the picker's rows, and the choice as stored.
 */
export function planHelper(step, screens = {}) {
  const h = screens.helping
  if (!h) return { says: { message: 'later', values: { verb: 'helper:' } }, act: null }
  const args = step.match?.values ?? []
  if (!args.length) {
    if (!h.now) return { says: { message: 'helperNone' }, act: null }
    return { says: { message: h.now.chosen ? 'helperNowChosen' : 'helperNow', values: { name: h.now.name } }, act: null }
  }
  const word = said(args)
  if (word.toLocaleLowerCase() === OFF) {
    if (!h.stored) return { says: { message: 'helperSameOff' }, act: null }
    return { says: { message: 'helperOff' }, act: { kind: 'setting', key: 'helper', value: null, before: h.stored } }
  }
  const models = { model: h.rows.model, local: h.rows.local, source: [] }
  const found = findAnswerers(models, word)
  if (!found.length) {
    const isSource = findAnswerers({ model: [], local: [], source: h.rows.source }, word).length > 0
    return { says: { message: isSource ? 'helperSource' : 'helperNoModel', values: { word } }, act: null }
  }
  if (found.length > 1) return { says: { message: 'byWhich', values: { word, names: found.map((r) => r.name), example: `helper:"${found[0].name}"` } }, act: null }
  const row = found[0]
  if (row.later) return { says: { message: 'byLater', values: { name: row.name } }, act: null }
  if (row.unchecked) return { says: { message: 'helperUnchecked', values: { name: row.name, command: `api:${row.provider}` } }, act: null }
  if (row.needsKey) return { says: { message: 'byNeedsKey', values: { name: row.name, provider: row.providerName, command: `api:${row.provider}` } }, act: null }
  if (h.stored === row.id) return { says: { message: 'helperSame', values: { name: row.name } }, act: null }
  return { says: { message: 'helperSet', values: { name: row.name } }, act: { kind: 'setting', key: 'helper', value: row.id, before: h.stored ?? null } }
}

/**
 * What a translation by someone costs, said before Enter: by the browser,
 * on this device; by a model on this computer, free; by a hosted model,
 * with its tokens and cost.
 */
function byWhom(who, chars) {
  if (who.kind === 'browser') return { message: who.downloads ? 'translateByBrowserDownload' : 'translateByBrowser' }
  const h = who.helper
  if (h.group === 'local') return { message: 'translateByLocal', values: { name: h.name } }
  const tokens = translateTokens(chars)
  const cost = translateCost(chars, h.price)
  if (cost == null) return { message: 'translateByModelUnpriced', values: { name: h.name, tokens } }
  return cost < CENT
    ? { message: 'translateByModelCheap', values: { name: h.name, tokens, cost: CENT } }
    : { message: 'translateByModel', values: { name: h.name, tokens, cost } }
}

/** Why nothing can translate here, and what would let it. */
function noOne(helper) {
  if (helper?.needsKey) return { message: 'byNeedsKey', values: { name: helper.name, provider: helper.providerName, command: `api:${helper.provider}` } }
  if (helper?.unchecked) return { message: 'helperUnchecked', values: { name: helper.name, command: `api:${helper.provider}` } }
  return { message: 'translateNoOne' }
}

/**
 * translate: (C84, C85, C166 (f), (g)). screens.translating: { room, num,
 * last, to, who, queries, nameOf }: the chat the room shows (undefined with
 * no room), its number, its last answer from a source ({ messageId, source,
 * question, chars, from, translated }), the language to translate into, who
 * translates it (translate.translatorFor), whether questions are translated
 * before they go, and how a language is named.
 */
export function planTranslate(step, screens = {}) {
  const t = screens.translating
  if (!t) return { says: { message: 'later', values: { verb: 'translate:' } }, act: null }
  const word = step.match?.values?.[0]?.value ?? null
  if (word === 'on' || word === 'off') {
    const on = word === 'on'
    if (on === Boolean(t.queries)) return { says: { message: on ? 'translateQueriesSameOn' : 'translateQueriesSameOff' }, act: null }
    return {
      says: { message: on ? 'translateQueriesOn' : 'translateQueriesOff' },
      act: { kind: 'setting', key: 'translateQueries', value: on, before: Boolean(t.queries) },
    }
  }
  if (t.room === undefined) return { says: { message: 'translateNoRoom' }, act: null }
  const last = t.last
  if (!last) return { says: { message: 'translateNothing', values: { num: t.num ?? '' } }, act: null }
  const language = t.nameOf(t.to)
  if (last.from && last.from.split('-')[0] === t.to.split('-')[0]) return { says: { message: 'translateAlready', values: { source: last.source, language } }, act: null }
  if (last.translated === t.to) return { says: { message: 'translateDone', values: { source: last.source, language } }, act: null }
  if (t.who.kind === 'none') return { says: noOne(t.who.helper), act: null }
  // Without the language it is in, the browser's own translation cannot
  // start, and a model is told to work it out.
  if (t.who.kind === 'browser' && !last.from) return { says: noOne(null), act: null }
  const also = [byWhom(t.who, last.chars)]
  // Words that read like instructions to a model, going to one (C169).
  if (t.who.kind === 'model' && last.phrases?.length) also.push({ message: 'translateInstructions', values: { phrases: last.phrases.map((p) => `“${p}”`) } })
  const says = { message: 'translate', values: { source: last.source, question: last.question ?? '', language }, also }
  return { says, act: { kind: 'translate', chatId: t.room, messageId: last.messageId, from: last.from ?? null, to: t.to, who: t.who } }
}

/**
 * privacy:on, privacy:names, privacy:off (C167, C169). screens.privacy:
 * { mode, local }: the filter as set ('off', 'patterns' or 'names'), and the
 * model on this computer that would find names, by name, or null.
 */
export function planPrivacy(step, screens = {}) {
  const mode = screens.privacy?.mode ?? 'off'
  const local = screens.privacy?.local ?? null
  const word = step.match?.values?.[0]?.value ?? null
  if (!word) return { says: { message: 'privacyNow', values: { mode, name: local ?? '' } }, act: null }
  const want = word === 'on' ? 'patterns' : word
  if (want === 'names' && !local) return { says: { message: 'privacyNamesNeedsLocal', values: { command: 'api:ollama' } }, act: null }
  if (want === mode) return { says: { message: want === 'names' ? 'privacySameNames' : want === 'patterns' ? 'privacySameOn' : 'privacySameOff' }, act: null }
  const message = want === 'names' ? 'privacyNames' : want === 'patterns' ? 'privacyOn' : 'privacyOff'
  return { says: { message, values: { name: local ?? '' } }, act: { kind: 'setting', key: 'privacyFilter', value: want, before: mode } }
}

/**
 * check: (security notes §1.4 and §1.5; S3; C169): whether the last answer
 * from a source holds words that read like instructions to a model. The
 * free check, in plain code, says so before Enter; Enter asks a model on
 * this computer for a closer look, offered only when one is connected.
 * screens.checking: { room, num, last: { messageId, source, text }, local }.
 */
export function planCheck(step, screens = {}) {
  const c = screens.checking
  if (!c || c.room === undefined) return { says: { message: 'translateNoRoom' }, act: null }
  if (!c.last) return { says: { message: 'checkNothing' }, act: null }
  const phrases = instructionLike(c.last.text)
  const free = { message: 'checkFree', values: { count: phrases.length, source: c.last.source, phrases: phrases.map((p) => `“${p}”`) } }
  if (!c.local) return { says: { ...free, also: [{ message: 'checkNoLocal', values: { command: 'api:ollama' } }] }, act: null }
  return {
    says: { ...free, also: [{ message: 'checkLocal', values: { name: c.local.name } }] },
    act: { kind: 'check', chatId: c.room, messageId: c.last.messageId, model: c.local.id, name: c.local.name },
  }
}

/**
 * The lines for a question that goes translated to a source (C85): that it
 * is translated, and by whom at what cost. [] when it goes as typed.
 * query: { to, who } from the shell, or null.
 */
export function queryLines(query, chars, nameOf) {
  if (!query) return []
  if (query.who.kind === 'none') return [{ message: 'promptQueryUntranslated', values: { language: nameOf(query.to) } }]
  return [{ message: 'promptQueryTranslated', values: { language: nameOf(query.to) } }, byWhom(query.who, chars)]
}
