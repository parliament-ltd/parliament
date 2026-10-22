// What Enter would do, for the field as it stands on this arrangement: the
// Enter line's sentence and the arrangement Enter would leave (bar
// reference, "The field"; C99). Pure, so it is tested without drawing.
//
// A line is planned whole before anything runs. If any command on it would
// refuse, the Enter line says why and Enter does nothing, so a line never
// stops half done.
//
// What is on screen is one space (C125, ruled 21 October). records:, room:
// and tour: bring their arrangement's boards into it beside what is there,
// like open: brings one board; nothing switches to another screen. So they
// share a line with the other layout commands (C99).
//
// A prompt goes to the room in the space (stage 4). Before Enter the
// line names who receives it and what it costs, worked out here from what
// the shell knows: no request is made to find out (C83).

import { enterLine } from '../commands/registry'
import { plan, planOpen, planBring, planRoom, planFocus, planFocusOff, roomOnScreen, address, ARRANGEMENT_VERBS } from '../shell/arrangement'
import { cleanRoomName, ROOM_NAME_MAX } from '../lib/roomNames'
import { CHARS_PER_TOKEN, inputCost, describeCost } from '../shell/estimate'
import { holdsKey } from '../commands/parse'
import { BOARD_NAMES } from '../commands/verbs'
import { FILTERS, EMPTY_VIEW, readFilter, readSort, nextView, clears, applyView, costUnknown, viewLine } from '../lib/recordsFilter'
import { findSaved, cleanSearchName, SEARCH_NAME_MAX } from '../lib/savedSearches'

// Verbs whose actions exist in the shell so far; the rest come with their
// stages.
// Verbs that bring an arrangement, or a board, into the space (C95, C125).
const BRINGS = Object.freeze(['records', 'room', 'library', 'plan'])
// Verbs that act on what the bar points at, rather than only on the space:
// name: (C40), tour:, which also shows the welcome steps (A20), and
// inspect:, which shows one thing in detail under the bar, and api:, which
// opens the key panel there (stage 5).
// save: and forget: keep and remove saved searches on Records (stage 6,
// piece 2; C140).
const ACTS = Object.freeze(['name', 'tour', 'inspect', 'api', 'save', 'forget'])
// focus: and focus:off, the first form (W §7; stage 5).
const FOCUS = 'focus'
// The filters, sort: and clear: change what Records shows (stage 6,
// piece 1; C132). They share a line with each other and with layout
// commands (C99).
const VIEW_VERBS = Object.freeze([...FILTERS, 'sort', 'clear'])
export const BUILT = new Set([...ARRANGEMENT_VERBS, ...BRINGS, ...ACTS, FOCUS, ...VIEW_VERBS])

/** A view as one line of commands, as a saved search keeps it (C140 (b)). */
export const lineOf = (view) => viewLine(view).map((f) => f.text).join(' ')

/**
 * The view a saved search makes today: its filters read again, so since:7d
 * is the last seven days now, and a name is found again (C140 (b), (d)).
 * @returns {{ view: object }|{ bad: { message: string, values?: object } }}
 */
export function viewFromSaved(saved, records = {}) {
  const changes = []
  if (saved.line) {
    const answer = enterLine(`>${saved.line}`, { mode: 'command', board: 'almanac', built: BUILT })
    if (answer.state !== 'ready') return { bad: { message: answer.message, values: answer.values } }
    for (const step of answer.steps) {
      const p = VIEW_VERBS.includes(step.verb) && step.verb !== 'clear' ? planViewStep(nextView(EMPTY_VIEW, changes), step, records) : null
      if (!p) return { bad: { message: 'later', values: { verb: `${step.verb}:` } } }
      if (p.bad) return { bad: p.bad }
      changes.push(p.change)
    }
  }
  return { view: { ...nextView(EMPTY_VIEW, changes), search: saved.search ?? '' } }
}

/** save:"…" keeps the search and filters on Records under a name (C140 (c)). */
function planSave(a, step, screens = {}) {
  if (a.addressed !== 'almanac') return null
  const records = screens.records ?? {}
  const view = records.view ?? EMPTY_VIEW
  const search = String(view.search ?? '').trim()
  const line = lineOf(view)
  if (!search && !line) return { says: { message: 'saveNothing' }, act: null }
  // A search can hold anything typed; one that holds a key is never kept.
  if (holdsKey(search)) return { says: { message: 'saveKey' }, act: null }
  const named = cleanSearchName(typed(step.match?.values?.[0]))
  if (named.error === 'empty') return { says: { message: 'saveName' }, act: null }
  if (named.error === 'long') return { says: { message: 'saveLong', values: { max: SEARCH_NAME_MAX } }, act: null }
  const before = (records.saved ?? []).find((x) => x.name.toLocaleLowerCase() === named.name.toLocaleLowerCase())
  if (before && before.line === line && before.search === search) return { says: { message: 'saveSame', values: { name: before.name } }, act: null }
  return {
    says: { message: before ? 'saveReplace' : 'saveKeep', values: { name: named.name } },
    act: { kind: 'saveSearch', name: named.name, search, line },
  }
}

/** forget:"…" removes a saved search; what it found is untouched (C140 (f)). */
function planForget(a, step, screens = {}) {
  const { found, several } = findSaved(screens.records?.saved ?? [], typed(step.match?.values?.[0]))
  if (several.length) return { says: { message: 'forgetWhich', values: { words: several } }, act: null }
  if (!found) return { says: { message: 'forgetNone', values: { name: typed(step.match?.values?.[0]) } }, act: null }
  return { says: { message: 'forgetSearch', values: { name: found.name } }, act: { kind: 'forgetSearch', id: found.id } }
}

// open:"Water tower": a saved search by name (C140 (e)), or null when the
// name is no saved search's, for open: to answer otherwise.
function openSaved(a, step, screens = {}) {
  const args = step.match?.values ?? []
  if (args.length !== 1 || (args[0].kind !== 'text' && args[0].kind !== 'word')) return null
  // A board's name opens the board, whatever a saved search is called.
  if (args[0].kind === 'word' && (BOARD_NAMES.includes(args[0].value) || args[0].value === 'lab')) return null
  const records = screens.records ?? {}
  const { found, several } = findSaved(records.saved ?? [], typed(args[0]))
  if (several.length) return { bad: { message: 'openWhichSaved', values: { words: several } } }
  if (!found) return null
  const r = viewFromSaved(found, records)
  if (r.bad) return { bad: { ...r.bad, also: [{ message: 'savedStale', values: { name: found.name } }] } }
  const here = a.columns.flat().includes('almanac') || a.popped.some((p) => p.board === 'almanac')
  return { next: here ? address(a, 'almanac') : planOpen(a, 'almanac').next, view: r.view, says: { message: 'openSaved', values: { name: found.name } } }
}

/**
 * One filter, sort: or clear: on Records, against the view as the line has
 * left it so far. clear: alone empties the collection, which comes with the
 * Collection (piece 6).
 * @returns {{ change: object, says?: object, also?: object[] }|{ bad: object }|null}
 */
function planViewStep(view, step, records = {}) {
  const [arg] = step.match?.values ?? []
  if (step.verb === 'clear') {
    if (!arg) return null
    const word = arg.value
    const gone = clears(view, word)
    if (!gone) {
      const message = word === 'filters' ? 'clearNothing' : word === 'search' ? 'clearNoSearch' : word === 'sort' ? 'clearNoSort' : 'clearNoFilter'
      return { bad: { message, values: { verb: `${word}:` } } }
    }
    const says = gone.what === 'filter' ? { message: 'clearFilter', values: { filters: gone.filters } }
      : { message: { filters: 'clearFilters', search: 'clearSearch', sort: 'clearSort' }[gone.what] }
    return { change: { clear: word }, says }
  }
  if (step.verb === 'sort') return { change: { sort: readSort(arg.value, view.sort) } }
  const read = readFilter(step, records)
  if (read.bad) return { bad: read.bad }
  const { filter } = read
  // The day a date was read as, so a misreading shows before Enter (C132 (e)).
  const also = filter.k === 'since' || filter.k === 'until'
    ? filter.v.map((d) => ({ message: filter.k === 'since' ? 'filterSince' : 'filterUntil', values: { day: d.day } }))
    : []
  return { change: { filter }, also }
}

/** focus: clears the space to the chat alone; focus:off brings it back. Your own sets come with stage 14. */
function planFocusStep(a, step, screens = {}) {
  const [arg, ...more] = step.match?.values ?? []
  if (!arg) return planFocus(a, screens.lastRoom?.id ?? null)
  if (arg.kind === 'word' && arg.value === 'off' && !more.length) return planFocusOff(a)
  return null
}

// records: brings the Records arrangement, the Records board and the
// Collection, or whatever its owner has made it (C125, C131). room: brings
// the last room, or an empty room when there is no chat yet. library: and
// plan: are open:library and open:plan (C95). A room or a shelf by name
// comes later.
function bring(a, step, screens = {}) {
  const named = Boolean(step.match?.values?.length)
  if (step.verb === 'records') return planBring(a, 'almanac')
  if (step.verb === 'room') return named ? null : planRoom(a, screens.lastRoom?.id ?? null)
  if (step.verb === 'library') return named ? null : planOpen(a, 'library')
  if (step.verb === 'plan') return planOpen(a, 'docket')
  return null
}

const hasWelcome = (a) => a.columns.some((c) => c.includes('welcome'))

/**
 * tour: brings the welcome card back and shows its steps, from anywhere;
 * tour:off puts the steps away (A20). tour:advanced, the second list,
 * comes later. screens.stepsOff says whether the steps are put away now.
 * @returns {{ says: object, next?: object|null, act?: object|null }|null}
 */
function planTour(a, step, screens = {}) {
  const word = step.match?.values?.[0]?.value ?? null
  if (word === 'advanced') return null
  if (word === 'off') {
    if (!hasWelcome(a) || screens.stepsOff) return { says: { message: 'tourOffAlready' }, act: null }
    return { says: { message: 'tourOff' }, act: { kind: 'tourOff' } }
  }
  if (!hasWelcome(a)) return { says: { message: 'goWelcome' }, next: planBring(a, 'welcome').next, act: { kind: 'tourOn' } }
  if (screens.stepsOff) return { says: { message: 'tourOn' }, act: { kind: 'tourOn' } }
  return { says: { message: 'tourHere' }, act: null }
}

// open: and inspect: by number (stage 5, piece 3). screens.numbered holds
// every numbered thing the Almanac lists, by number. A branch (201a) and a
// thing by name come later.
const numberOf = (step) => {
  const [arg] = step.match?.values ?? []
  return arg?.kind === 'address' && !arg.letter && (step.match.values.length === 1) ? arg.num : null
}

// What planRoom says, said of a numbered chat.
const OPENED = {
  goRoom: 'openChat', showRoom: 'openChatHere', roomHere: 'openChatThere',
}
const OPENED_DOCKET = { goRoom: 'openDocket', showRoom: 'openDocketHere', roomHere: 'openChatThere' }

/**
 * open:204. A chat opens in the space's room, or in a room brought beside
 * what is here; a docket opens its first branch. Opening a note, a term or a
 * quote (a chat about it) comes later; inspect: shows it now.
 * @returns {{ next: object|null, says: object }|null}
 */
function openNumber(a, step, screens = {}) {
  const num = numberOf(step)
  if (num == null) return null
  const row = screens.numbered?.get(num)
  if (!row) return { next: null, says: { message: 'numNone', values: { num } } }
  if ((row.kind !== 'chat' && row.kind !== 'docket') || !row.chatId) return { next: null, says: { message: 'openNotYet', values: { num } } }
  const p = planRoom(a, row.chatId)
  const words = row.kind === 'docket' ? OPENED_DOCKET : OPENED
  const shown = row.kind === 'docket' ? row.chatNum ?? num : num
  return { next: p.next, says: { message: words[p.says.message] ?? p.says.message, values: { num: shown } } }
}

/** inspect:204 shows it in detail under the bar. */
function planInspect(a, step, screens = {}) {
  const num = numberOf(step)
  if (num == null) return null
  if (!screens.numbered?.get(num)) return { says: { message: 'numNone', values: { num } }, act: null }
  return { says: { message: 'inspectOne', values: { num } }, act: { kind: 'inspect', num } }
}

/**
 * api: opens the key panel under the field (settings spec §6; stage 5,
 * piece 5). A key goes only into the panel's password field, never into the
 * bar, so a key-shaped line is refused before this (registry). api:<provider>
 * opens that provider's field, for adding or replacing; api:new the first
 * without a key. screens.keys is each built provider that takes a key, with
 * whether it has one and its last four characters; screens.noKey names the
 * sources that need none.
 */
function planApi(a, step, screens = {}) {
  const status = screens.keys ?? []
  const [arg] = step.match?.values ?? []
  if (!arg) return { says: { message: 'apiList' }, act: { kind: 'keys', focus: null } }
  const word = String(arg.value ?? '').toLowerCase()
  if (word === 'new') {
    const free = status.find((k) => !k.has)
    if (!free) return { says: { message: 'apiAllKeyed', values: { words: status.map((k) => `api:${k.id}`) } }, act: null }
    return { says: { message: 'apiNew', values: { provider: free.name } }, act: { kind: 'keys', focus: free.id } }
  }
  const p = status.find((k) => k.id === word || k.name.toLowerCase() === word)
  if (p) {
    return p.has
      ? { says: { message: 'apiReplace', values: { provider: p.name, ending: p.ending } }, act: { kind: 'keys', focus: p.id } }
      : { says: { message: 'apiAdd', values: { provider: p.name } }, act: { kind: 'keys', focus: p.id } }
  }
  const keyless = (screens.noKey ?? []).find((n) => n.toLowerCase() === word)
  if (keyless) return { says: { message: 'apiNoKey', values: { provider: keyless } }, act: null }
  return { says: { message: 'apiUnknown', values: { word, words: [...status.map((k) => `api:${k.id}`), 'api:new'] } }, act: null }
}

// The words of an argument as typed: quoted text without its quotes, or a
// word as written (the parser lower-cases words).
const typed = (arg) => (arg?.kind === 'text' ? arg.value : arg?.text ?? '')

/**
 * name:"…" names what the bar points at (C40). Built for a room: its name
 * is the person's own words, kept on the room. A chat by number
 * (name:207 "…") and collections come with the Almanac and the Collection
 * (stage 6). screens.roomName is what the room on screen is called now.
 * @returns {{ says: object, act: object|null }|null}
 */
function planName(a, step, screens = {}) {
  const args = step.match?.values ?? []
  if (args.length !== 1 || a.addressed !== 'room') return null
  const chat = roomOnScreen(a)
  if (chat === undefined) return null
  if (chat === null) return { says: { message: 'nameNoChat' }, act: null }
  const clean = cleanRoomName(typed(args[0]))
  if (clean.error === 'empty') return { says: { message: 'nameEmpty' }, act: null }
  if (clean.error === 'long') return { says: { message: 'nameLong', values: { max: ROOM_NAME_MAX } }, act: null }
  if (screens.roomName?.own === clean.name) return { says: { message: 'nameSame' }, act: null }
  return { says: { message: 'nameRoom', values: { name: clean.name } }, act: { kind: 'nameRoom', chatId: chat, name: clean.name } }
}

/**
 * @param {string} value the whole field, leader included
 * @param {{ mode: string, arrangement: import('../shell/arrangement').Arrangement, built?: Set<string>,
 *   screens?: { lastRoom?: { id: string, num?: number|null }|null, roomName?: object|null, stepsOff?: boolean,
 *     measure?: () => object|null, numbered?: Map<number, object>, keys?: object[], noKey?: string[],
 *     records?: { rows: object[], view: object, rooms?: object[], collections?: object[], now?: number, locale?: string, ctx?: object } } }} ctx
 *   measure: the space as drawn, for width: (C126); numbered: the Almanac's rows by number, for open: and
 *   inspect:; keys and noKey: for api: (planApi); records: Records' rows, the view in force and the names
 *   filters read (C132)
 * @returns {{ answer: object, says: { message: string, values?: object }, next: object|null, act?: object|null }}
 *   next is the space after Enter, or null when Enter changes none of it;
 *   act is what Enter does besides, to what the bar points at (name:), to
 *   the welcome steps (tour:), or to what Records shows (filters)
 */
export function preview(value, { mode, arrangement, built = BUILT, screens = {} }) {
  const answer = enterLine(value, { mode, board: arrangement.addressed, built })
  if (answer.state !== 'ready') return { answer, says: { message: answer.message, values: answer.values }, next: null }

  const acts = answer.steps.filter((s) => ACTS.includes(s.verb))
  if (acts.length) {
    if (answer.steps.length > 1) return { answer, says: { message: 'aloneNow', values: { verb: `${acts[0].verb}:` } }, next: null }
    const step = answer.steps[0]
    const plans = { tour: planTour, name: planName, inspect: planInspect, api: planApi, save: planSave, forget: planForget }
    const p = plans[step.verb](arrangement, step, screens)
    if (!p) return { answer, says: { message: 'later', values: { verb: `${step.verb}:` } }, next: null }
    return { answer, says: p.says, next: p.next ?? null, act: p.act ?? null }
  }

  let a = arrangement
  let last = null
  // What the line does to Records: its filters, sort: and clear:, in order.
  const records = screens.records ?? {}
  const start = records.view ?? EMPTY_VIEW
  const changes = []
  const viewAlso = []
  let viewSays = null
  let onlyClears = true
  let opened = false // open:"…" showed a saved search
  for (const step of answer.steps) {
    const saved = step.verb === 'open' ? openSaved(a, step, screens) : null
    if (saved) {
      if (saved.bad) return { answer, says: saved.bad, next: null }
      changes.push({ replace: saved.view })
      viewSays = viewSays ?? saved.says
      a = saved.next
      opened = true
      continue
    }
    if (VIEW_VERBS.includes(step.verb)) {
      // The Collection's own search and filters come with it (piece 6).
      const p = arrangement.addressed === 'almanac' ? planViewStep(nextView(start, changes), step, records) : null
      if (!p) return { answer, says: { message: 'later', values: { verb: `${step.verb}:` } }, next: null }
      if (p.bad) return { answer, says: p.bad, next: null }
      changes.push(p.change)
      viewSays = viewSays ?? p.says ?? null
      if (!p.change.clear) onlyClears = false
      viewAlso.push(...(p.also ?? []))
      continue
    }
    const p = BRINGS.includes(step.verb) ? bring(a, step, screens)
      : step.verb === 'open' && numberOf(step) != null ? openNumber(a, step, screens)
        : step.verb === FOCUS ? planFocusStep(a, step, screens)
          : plan(a, step, screens.measure?.() ?? null)
    if (!p) return { answer, says: { message: 'later', values: { verb: `${step.verb}:` } }, next: null }
    if (!p.next) return { answer, says: p.says, next: null }
    a = p.next
    last = p.says
  }

  // Records after the line: how many rows it will show, said before Enter.
  let act = null
  let viewWords = null
  let viewParts = null
  if (changes.length) {
    const view = nextView(start, changes)
    const rows = records.rows ?? []
    const shows = { message: 'filterShows', values: { count: applyView(rows, view, records.ctx).length } }
    const unknown = costUnknown(rows, view, records.ctx)
    const also = [...viewAlso, ...(unknown ? [{ message: 'filterCostUnknown', values: { count: unknown } }] : [])]
    viewParts = [shows, ...also]
    viewWords = onlyClears && viewSays ? { ...viewSays, also: viewParts } : { ...shows, also }
    act = { kind: 'records', view }
  }
  const layout = answer.steps.length - answer.steps.filter((s) => VIEW_VERBS.includes(s.verb)).length
  const says = !layout || (opened && answer.steps.length === 1) ? viewWords
    : answer.steps.length > 1 ? { message: answer.message, values: answer.values, ...(viewParts ? { also: viewParts } : {}) }
      : last
  // After focus: the field turns to prompt mode, under the chat (W §7).
  const last1 = answer.steps[answer.steps.length - 1]
  const after = last1?.verb === FOCUS && !(last1.match?.values ?? []).length ? 'prompt' : null
  return { answer, says, next: layout ? a : null, act, after }
}

// Below a cent, the line says "under" a cent rather than a fraction of one.
const CENT = 0.01

/**
 * What Enter would do with a prompt (stage 4; C83).
 * @param {string} text the prompt as typed
 * @param {{ room?: string|null, streaming?: boolean, keyed?: boolean|null, provider?: string, source?: string,
 *   historyChars?: number, systemChars?: number, perMillion?: number|null, hiddenOut?: number,
 *   sourcesOut?: { count: number, names: string[] }, resend?: boolean,
 *   describe?: { price: object|null }|null }} target
 *   room: the chat the screen's room shows, null for an empty room, undefined
 *   when no room is on the screen; keyed: whether there is a key for the
 *   provider, null while that is being checked; provider and source: names
 *   from the list; historyChars and systemChars: what would go along;
 *   perMillion: the model's input price; hiddenOut: messages of the chat
 *   that stay out, hidden or being deleted; sourcesOut: answers from
 *   sources that stay out, and the sources' names; describe: set when the first
 *   answer will be followed by the one request for its title, summary and
 *   tags (C62), with the price of the model it goes to; resend: the last
 *   reply here stalled, so an empty field offers to send it again without
 *   streaming (C114)
 * @returns {{ ready: boolean, says: { message: string, values?: object }|null }}
 *   ready: whether Enter sends; says: the line's sentence, null for none
 */
export function promptPreview(text, target = {}) {
  if (target.room === undefined) return { ready: false, says: { message: 'promptNoRoom' } }
  if (target.streaming) return { ready: false, says: { message: 'promptBusy' } }
  const prompt = String(text ?? '').trim()
  if (!prompt) {
    // The last reply here stalled: with nothing typed, Enter offers to send
    // it again without streaming, naming the cost. Never sent unasked (C114).
    if (target.resend && target.keyed) {
      const tokens = Math.ceil(((target.historyChars ?? 0) + (target.systemChars ?? 0)) / CHARS_PER_TOKEN)
      const cost = inputCost(tokens, target.perMillion)
      const offer = cost == null
        ? { message: 'promptResendUnpriced', values: { tokens } }
        : cost < CENT
          ? { message: 'promptResendCheap', values: { tokens, cost: CENT } }
          : { message: 'promptResend', values: { tokens, cost } }
      return { ready: true, resend: true, says: { message: 'promptStalled', also: [offer] } }
    }
    return { ready: false, says: null }
  }
  // A key in a prompt would go to the model, or to a source as a search.
  if (holdsKey(prompt)) return { ready: false, says: { message: 'promptKey' } }
  if (target.keyed == null) return { ready: false, says: { message: 'promptChecking' } }
  if (!target.keyed) return { ready: true, says: { message: 'promptSource', values: { source: target.source } } }

  const tokens = Math.ceil((prompt.length + (target.historyChars ?? 0) + (target.systemChars ?? 0)) / CHARS_PER_TOKEN)
  const cost = inputCost(tokens, target.perMillion)
  const values = { provider: target.provider, tokens }
  const also = []
  // After a chat's first answer, one request for its title, summary and
  // tags, unless turned off in Settings (C62).
  if (target.describe) {
    const extra = describeCost(prompt.length, target.describe.price)
    also.push(extra == null
      ? { message: 'promptDescribeUnpriced' }
      : extra < CENT
        ? { message: 'promptDescribeCheap', values: { cost: CENT } }
        : { message: 'promptDescribe', values: { cost: extra } })
  }
  // Answers from sources stay out unless the person acts on them (C115).
  if (target.sourcesOut?.count > 0) {
    also.push({ message: 'promptSourcesOut', values: { count: target.sourcesOut.count, sources: target.sourcesOut.names } })
  }
  // Hidden messages, and messages being deleted, stay out of what is sent.
  if (target.hiddenOut > 0) also.push({ message: 'promptHiddenOut', values: { count: target.hiddenOut } })
  const says = cost == null
    ? { message: 'promptSendUnpriced', values }
    : cost < CENT
      ? { message: 'promptSendCheap', values: { ...values, cost: CENT } }
      : { message: 'promptSend', values: { ...values, cost } }
  return { ready: true, says: also.length ? { ...says, also } : says }
}
