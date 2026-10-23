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
import { plan, planOpen, planBring, planRoom, planFocus, planFocusOff, roomOnScreen, roomShowing, isRoom, address, ARRANGEMENT_VERBS } from '../shell/arrangement'
import { cleanRoomName, ROOM_NAME_MAX } from '../lib/roomNames'
import { CHARS_PER_TOKEN, inputCost, describeCost, LOCAL_READS } from '../shell/estimate'
import { holdsKey } from '../commands/parse'
import { BOARD_NAMES } from '../commands/verbs'
import { FILTERS, EMPTY_VIEW, readFilter, readSort, nextView, clears, applyView, costUnknown, viewLine } from '../lib/recordsFilter'
import { findSaved, cleanSearchName, SEARCH_NAME_MAX } from '../lib/savedSearches'
import { planNew, planAdd, planRm, planClear, planHeading, planMoveCard, planNameCollection, planForgetCollection, collectionNamed, planCollectionView } from '../lib/collectionVerbs'
import { ROW_VERBS, isRowStep, planRowLine, planCopy, planErase, targetsOf } from '../lib/rowVerbs'
import { planNote, planSummarize, planCompare, planJump } from '../lib/cardActs'
import { exportItems, chatsOf, exportName } from '../lib/recordsExport'
import { findAnswerers } from '../net/answerers'
import { readFrameworks, frameworksOf, cleanOwn, namesFrom, NAME_MAX, INSTRUCTION_MAX } from '../lib/frameworks'
import { planReply, planLanguage, planHelper, planTranslate, planPrivacy, planCheck, queryLines } from '../lib/languageVerbs'
import { planTo, planAgain, planNewBranch } from '../lib/branchVerbs'
import { planBranchSummary } from '../lib/branchSummary'
import { planInclude } from '../lib/included'
import { planSet } from '../lib/settingVerbs'
import { findPrivate, KINDS as PRIVATE_KINDS } from '../lib/privacyFilter'
import { searchWords } from '../lib/searchWords'

// Verbs whose actions exist in the shell so far; the rest come with their
// stages.
// Verbs that bring an arrangement, or a board, into the space (C95, C125).
const BRINGS = Object.freeze(['records', 'room', 'library', 'plan'])
// Verbs that act on what the bar points at, rather than only on the space:
// name: (C40), tour:, which also shows the welcome steps (A20), and
// inspect:, which shows one thing in detail under the bar, and api:, which
// opens the key panel there (stage 5).
// save: and forget: keep and remove saved searches on Records (stage 6,
// piece 2; C140). copy: puts one thing on the clipboard as Markdown, and
// undo: takes back the last command line (piece 3; C143 (f), C134).
// erase: removes things for good, by number, on a line of its own (C137).
// export: downloads rows as Markdown or JSONL (piece 5; C138).
// new:collection, add:, rm: and heading: change a collection (piece 6; C144).
// by: chooses who answers in the chat the room shows (stage 7; C149), and
// framework: the standing instructions that go with it (C164).
// reply:, helper: and translate: (piece 6; C166).
const ACTS = Object.freeze(['name', 'tour', 'inspect', 'api', 'save', 'forget', 'copy', 'undo', 'erase', 'export', 'new', 'add', 'rm', 'heading', 'note', 'summarize', 'compare', 'jump', 'by', 'framework', 'thinking', 'reply', 'helper', 'translate', 'privacy', 'check', 'to', 'include', 'again', 'set', 'backup', 'restore', 'import', 'language'])
// focus: and focus:off, the first form (W §7; stage 5).
const FOCUS = 'focus'
// The filters, sort: and clear: change what Records shows (stage 6,
// piece 1; C132). They share a line with each other and with layout
// commands (C99).
const VIEW_VERBS = Object.freeze([...FILTERS, 'sort', 'clear'])
// pin:, archive:, name: with a number and the tag verbs change rows (C143).
export const BUILT = new Set([...ARRANGEMENT_VERBS, ...BRINGS, ...ACTS, FOCUS, ...VIEW_VERBS, ...ROW_VERBS])

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

/** copy:207, one thing as Markdown (C143 (f)). The shell builds it from what is stored. */
function planCopyStep(a, step, screens = {}) {
  const p = planCopy(step.match?.values ?? [], screens.records?.rows ?? [])
  if (p.bad) return { says: p.bad, act: null }
  return { says: p.says, act: { kind: 'copy', num: p.row.num } }
}

// The day, as a file name carries it: 2026-10-21, on this device's clock.
const dayStamp = (now = Date.now()) => {
  const d = new Date(now)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * export:md 204, 216, export:jsonl records, or export: alone for the table
 * as it is shown (C138). The Enter line names the file it will download;
 * the shell builds it on Enter. The Collection's export comes with it.
 */
function planExportStep(a, step, screens = {}) {
  if (a.addressed !== 'almanac') return null
  const records = screens.records ?? {}
  const rows = records.rows ?? []
  const args = step.match?.values ?? []
  const format = args[0]?.kind === 'word' && args[0].value === 'jsonl' ? 'jsonl' : 'md'
  const rest = args.slice(1)
  let picked
  let scope
  if (rest[0]?.kind === 'word' && rest[0].value === 'records') { picked = rows; scope = 'records' }
  else if (rest.length) {
    const t = targetsOf(rest, rows)
    if (t.bad) return { says: t.bad, act: null }
    picked = t.rows
    scope = 'numbers'
  } else { picked = applyView(rows, records.view ?? EMPTY_VIEW, records.ctx); scope = 'shown' }
  const items = exportItems(picked, rows)
  if (!items.length) return { says: { message: 'exportNothing' }, act: null }
  const hidden = chatsOf(items).reduce((n, c) => n + (screens.hiddenOf?.(c.chatId)?.size ?? 0), 0)
  const file = exportName({ format, nums: items.map((i) => i.row.num), scope, day: dayStamp(records.now) })
  const also = [...(hidden ? [{ message: 'exportHidden', values: { count: hidden } }] : []), { message: 'exportNoRestore' }]
  return {
    says: { message: 'exportItems', values: { count: items.length, format: format === 'jsonl' ? 'JSONL' : 'Markdown', file }, also },
    act: { kind: 'export', format, picked: picked.map((r) => r.num), file },
  }
}

/** erase:207, 216 (all): what goes for good, named before Enter (C137). */
function planEraseStep(a, step, screens = {}) {
  const p = planErase(step.match?.values ?? [], screens.records?.rows ?? [])
  if (p.bad) return { says: p.bad, act: null }
  return { says: p.says, act: { kind: 'erase', ...p.erase } }
}

/** undo: takes back the last command line of this tab (C134). undo:242, one edit, comes with editing. */
function planUndo(a, step, screens = {}) {
  if ((step.match?.values ?? []).length) return null
  return screens.undo
    ? { says: { message: 'undoLine', values: { line: screens.undo } }, act: { kind: 'undo' } }
    : { says: { message: 'undoNothing' }, act: null }
}

/** forget:"…" removes a saved search; what it found is untouched (C140 (f)). Or a framework of yours (C164). */
function planForget(a, step, screens = {}) {
  const [arg, which] = step.match?.values ?? []
  const name = typed(arg)
  const own = which && which.value !== 'framework' ? null
    : (screens.frameworks?.list ?? []).find((f) => !f.builtIn && (f.name ?? '').toLocaleLowerCase() === name.toLocaleLowerCase()) ?? null
  if (which?.value === 'framework') {
    return own ? planForgetFramework(own) : { says: { message: 'frameworkNone', values: { word: name } }, act: null }
  }
  const search = which?.value === 'collection' ? { found: null, several: [] } : findSaved(screens.records?.saved ?? [], name)
  const coll = which?.value === 'search' ? { found: null, several: [] } : collectionNamed(screens, name)
  if ([search.found, coll.found, own].filter(Boolean).length > 1) return { says: { message: 'nameWhichKind', values: { name, verb: 'forget:' } }, act: null }
  if (own) return planForgetFramework(own)
  if (coll.found) return planForgetCollection(coll.found, screens)
  const several = [...search.several, ...coll.several]
  if (several.length) return { says: { message: 'forgetWhich', values: { words: several } }, act: null }
  if (!search.found) return { says: { message: 'forgetNone', values: { name } }, act: null }
  return { says: { message: 'forgetSearch', values: { name: search.found.name } }, act: { kind: 'forgetSearch', id: search.found.id } }
}

// The Collection, brought here or pointed at, showing a collection (C144 (a)).
function showCollection(a, id) {
  const here = a.columns.flat().includes('collection') || a.popped.some((p) => p.board === 'collection')
  const next = here ? address(a, 'collection') : planOpen(a, 'collection').next
  return { ...next, context: { ...next.context, collection: id } }
}

const addStep = (a, step, screens) => planAdd(step, screens)
const rmStep = (a, step, screens) => planRm(step, screens)
const headingStep = (a, step, screens) => planHeading(step, screens)
const newStep = (a, step, screens) => {
  const what = step.match?.values?.[0]?.value
  if (what === 'framework') return planNewFramework(step, screens)
  // new:branch: a fork, the plan's next letter (C178).
  if (what === 'branch') return planNewBranch(step, screens)
  return planNew(step)
}

// open:"Water tower": a saved search by name (C140 (e)), or null when the
// name is no saved search's, for open: to answer otherwise.
function openSaved(a, step, screens = {}) {
  const args = step.match?.values ?? []
  const which = args.length === 2 && args[1].kind === 'word' ? args[1].value : null
  if (!(args.length === 1 || which) || (args[0].kind !== 'text' && args[0].kind !== 'word')) return null
  // A board's name opens the board, whatever a saved search is called.
  if (args[0].kind === 'word' && (BOARD_NAMES.includes(args[0].value) || args[0].value === 'lab')) return null
  const records = screens.records ?? {}
  const name = typed(args[0])
  const search = which === 'collection' ? { found: null, several: [] } : findSaved(records.saved ?? [], name)
  const coll = which === 'search' ? { found: null, several: [] } : collectionNamed(screens, name)
  if (search.found && coll.found) return { bad: { message: 'nameWhichKind', values: { name, verb: 'open:' } } }
  if (coll.found) {
    return { next: showCollection(a, coll.found.id), says: { message: 'openCollection', values: { name: screens.collection.label(coll.found) } } }
  }
  const several = [...search.several, ...coll.several]
  if (several.length) return { bad: { message: 'openWhichSaved', values: { words: several } } }
  const found = search.found
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
  if (step.verb === 'sort') {
    if (arg.value === 'yours' || arg.value === 'source') return { bad: { message: 'sortRecords', values: { board: 'almanac' } } }
    return { change: { sort: readSort(arg.value, view.sort) } }
  }
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
  goRoom: 'openChat', showRoom: 'openChatHere', roomHere: 'openChatThere', roomThere: 'openChatAddressed',
}
const OPENED_DOCKET = { goRoom: 'openDocket', showRoom: 'openDocketHere', roomHere: 'openChatThere', roomThere: 'openChatAddressed' }

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

// open:203b, a branch by its plan and letter (stage 8, piece 4; C175).
const branchOf = (step) => {
  const vals = step.match?.values ?? []
  return vals.length === 1 && vals[0]?.kind === 'address' && vals[0].letter ? vals[0] : null
}
// open:203b summary, or open:205 summary by the chat's own number.
const isSummaryOpen = (step) => {
  const vals = step.verb === 'open' ? step.match?.values ?? [] : []
  return vals.length === 2 && vals[0]?.kind === 'address' && vals[1]?.value === 'summary'
}
const OPENED_BRANCH = { goRoom: 'openBranch', showRoom: 'openBranchHere', roomHere: 'openChatThere', roomThere: 'openChatAddressed' }

/**
 * open:203b. The branch shows in the room here, or in a room brought
 * beside, with its whole history, keeping its letter. No call.
 */
function openBranch(a, step, screens = {}) {
  const arg = branchOf(step)
  const address = `${arg.num}${arg.letter}`
  const t = targetsOf([arg], screens.records?.rows ?? [])
  if (t.bad) return { next: null, says: t.bad }
  const row = t.rows[0]
  if (!row?.chatId) return { next: null, says: { message: 'numNone', values: { num: address } } }
  const p = planRoom(a, row.chatId)
  return { next: p.next, says: { message: OPENED_BRANCH[p.says.message] ?? p.says.message, values: { num: address, address } } }
}

/**
 * open:203b summary (C175): a new branch, the plan's next letter, from a
 * summary of this one, written by the helper. screens.summarizing:
 * { helper, privacy, factsOf(chatId) }: who writes it (net.helperOf), the
 * privacy filter as set, and, for a chat, its address, the next branch's,
 * how much it holds, the sources that answered in it, and who answers the
 * new branch with how much it reads at once.
 */
function openSummary(step, screens = {}) {
  const [arg] = step.match.values
  const said = arg.letter ? `${arg.num}${arg.letter}` : String(arg.num)
  const t = targetsOf([arg], screens.records?.rows ?? [])
  if (t.bad) return { says: t.bad, act: null }
  const row = t.rows[0]
  const chatId = row?.kind === 'chat' || row?.kind === 'docket' ? row.chatId : null
  if (!chatId) return { says: { message: 'openSummaryNotChat', values: { num: said } }, act: null }
  const s = screens.summarizing
  const f = s?.factsOf?.(chatId) ?? null
  if (!f) return { says: { message: 'later', values: { verb: 'open:' } }, act: null }
  return planBranchSummary({ ...f, chatId, helper: s.helper ?? null, privacy: s.privacy ?? 'off', localReads: LOCAL_READS })
}

/**
 * close:204 and width:204 40% name a room by the chat it shows (C146 (c)):
 * the step again with the room for the number, or why it cannot be.
 * @returns {{ step: object }|{ bad: object }|null} null when no number is given
 */
function roomByNumber(a, step, screens = {}) {
  const [arg, ...rest] = step.match?.values ?? []
  if (arg?.kind !== 'address') return null
  const t = targetsOf([arg], screens.records?.rows ?? [])
  if (t.bad) return { bad: t.bad }
  const row = t.rows[0]
  const chatId = row.kind === 'chat' || row.kind === 'docket' ? row.chatId : null
  if (!chatId) return { bad: { message: 'roomNumberNotChat', values: { num: arg.text ?? row.num } } }
  // Any room showing it, with several rooms open (C175 (a)).
  const board = roomShowing(a, chatId)
  if (!board) return { bad: { message: 'roomNumberNotHere', values: { num: arg.text ?? row.num } } }
  return { step: { ...step, exactBoard: true, match: { ...step.match, values: [{ kind: 'word', value: board }, ...rest] } } }
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
  // Models on this computer: the panel shows them and how to check (C163).
  if (screens.local && (word === screens.local.id || word === screens.local.name.toLowerCase())) {
    return { says: { message: 'apiLocal', values: { provider: screens.local.name } }, act: { kind: 'keys', focus: screens.local.id } }
  }
  const keyless = (screens.noKey ?? []).find((n) => n.toLowerCase() === word)
  if (keyless) return { says: { message: 'apiNoKey', values: { provider: keyless } }, act: null }
  return { says: { message: 'apiUnknown', values: { word, words: [...status.map((k) => `api:${k.id}`), 'api:new'] } }, act: null }
}

// The words of an argument as typed: quoted text without its quotes, or a
// word as written (the parser lower-cases words).
const typed = (arg) => (arg?.kind === 'text' ? arg.value : arg?.text ?? '')

/**
 * framework: the standing instructions that go with every prompt in the
 * chat the room shows, stacked in the order given (stage 7, piece 5; C164).
 * Alone, it says which are on and shows the picker. screens.frameworks:
 * { room, num, now, stored, list, nameOf }: the chat the room shows (null in
 * an empty room, held for the chat its next prompt starts; undefined with
 * no room), its number, its frameworks now, as stored, every framework
 * there is (lib/frameworks.frameworkList) and how each is named.
 */
function planFramework(a, step, screens = {}) {
  const fw = screens.frameworks
  if (!fw || fw.room === undefined) return { says: { message: 'promptNoRoom' }, act: null }
  const r = readFrameworks(step.match?.values ?? [], { list: fw.list, nameOf: fw.nameOf, now: fw.now })
  if (r.bad) {
    const values = r.bad.message === 'frameworkWhich' ? { ...r.bad.values, example: `framework:"${r.bad.values.names[0]}"` } : r.bad.values
    return { says: { message: r.bad.message, values }, act: null }
  }
  const names = (ids) => frameworksOf(ids, fw.list).map(fw.nameOf)
  if (r.show) return { says: { message: 'frameworkShow', values: { count: fw.now.length, frameworks: names(fw.now) } }, act: { kind: 'frameworkPicker' } }
  if (r.same) return { says: { message: 'frameworkSame' }, act: null }
  const act = { kind: 'frameworks', chatId: fw.room, ids: r.ids, before: fw.stored ?? null }
  if (!r.ids.length) return { says: { message: fw.room ? 'frameworkOff' : 'frameworkOffNext', values: { num: fw.num ?? '' } }, act }
  return { says: { message: fw.room ? 'frameworkSet' : 'frameworkSetNext', values: { count: r.ids.length, frameworks: names(r.ids), num: fw.num ?? '' } }, act }
}

/** thinking:on / thinking:off: whether models that can think do so first (C165). screens.thinking: { on }, off by default. */
function planThinking(a, step, screens = {}) {
  const on = screens.thinking?.on === true
  const word = step.match?.values?.[0]?.value ?? null
  if (!word) return { says: { message: 'thinkingNow', values: { on: on ? 'on' : 'off' } }, act: null }
  const want = word === 'on'
  if (want === on) return { says: { message: 'thinkingSame', values: { on: on ? 'on' : 'off' } }, act: null }
  return { says: { message: want ? 'thinkingOn' : 'thinkingOff' }, act: { kind: 'thinking', on: want, before: on } }
}

/** new:framework "Editor" "Make each sentence shorter": one of your own, or rewriting it (C164). */
function planNewFramework(step, screens = {}) {
  const [, nameArg, textArg] = step.match?.values ?? []
  if (!nameArg || !textArg) return { says: { message: 'frameworkNeeds' }, act: null }
  const c = cleanOwn(typed(nameArg), typed(textArg))
  if (c.error === 'name' || c.error === 'instruction') return { says: { message: 'frameworkNeeds' }, act: null }
  if (c.error) return { says: { message: 'frameworkLong', values: { name: NAME_MAX, instruction: INSTRUCTION_MAX } }, act: null }
  const list = screens.frameworks?.list ?? []
  const nameOf = screens.frameworks?.nameOf ?? ((f) => f.name ?? f.id)
  const same = (f) => String(nameOf(f) ?? '').toLocaleLowerCase() === c.name.toLocaleLowerCase()
  if (list.some((f) => f.builtIn && same(f))) return { says: { message: 'frameworkBuiltInName', values: { name: c.name } }, act: null }
  const before = list.find((f) => !f.builtIn && same(f)) ?? null
  if (before && before.instruction === c.instruction) return { says: { message: 'frameworkSameWords', values: { name: c.name } }, act: null }
  return {
    says: { message: before ? 'frameworkReplace' : 'frameworkKeep', values: { name: c.name } },
    act: { kind: 'ownFramework', name: c.name, instruction: c.instruction, before: before?.record ?? null },
  }
}

/** forget:"Editor": one of your own goes; chats it was on go on without it (C164). */
function planForgetFramework(f) {
  return { says: { message: 'frameworkForget', values: { name: f.name } }, act: { kind: 'forgetFramework', record: f.record } }
}

/**
 * by: chooses who answers in the chat the room shows (stage 7, piece 1;
 * C149, C150). Bare, it says who answers and shows the picker. One name at
 * a time: several at once is branches (stage 8). A model that needs a key
 * that is not here, or one not built yet, is refused before Enter.
 * screens.answering: { room, num, now, rows }: the chat the room shows (null
 * in an empty room, undefined with no room), its number, who answers it now
 * (answerers.answererFor) and the picker's rows (answerers.answererRows).
 */
// Most who can answer one prompt at once: each is a branch, a tab and a cost (C172).
export const MOST_AT_ONCE = 5

function planBy(a, step, screens = {}) {
  const ans = screens.answering
  if (!ans || ans.room === undefined) return { says: { message: 'promptNoRoom' }, act: null }
  const args = step.match?.values ?? []
  const held = ans.held?.length > 1 ? ans.held : null
  if (!args.length) {
    if (held) return { says: { message: 'byHereMany', values: { count: held.length, answering: held.map((h) => h.name) } }, act: { kind: 'picker' } }
    return { says: { message: 'byHere', values: { name: ans.now.name } }, act: { kind: 'picker' } }
  }
  // Names with commas between them are several answering at once, each a
  // branch (stage 8; C172 (c)); words with spaces are one name (by:mistral small).
  const rows = []
  for (const word of namesFrom(args)) {
    const found = findAnswerers(ans.rows, word)
    if (!found.length) return { says: { message: 'byNone', values: { word } }, act: null }
    if (found.length > 1) return { says: { message: 'byWhich', values: { word, names: found.map((r) => r.name), example: `by:"${found[0].name}"` } }, act: null }
    const r = found[0]
    if (r.later) return { says: { message: 'byLater', values: { name: r.name } }, act: null }
    if (r.needsKey) return { says: { message: 'byNeedsKey', values: { name: r.name, provider: r.providerName, command: `api:${r.provider}` } }, act: null }
    if (!rows.includes(r)) rows.push(r)
  }
  if (rows.length > MOST_AT_ONCE) return { says: { message: 'byMost', values: { count: MOST_AT_ONCE } }, act: null }
  if (rows.length > 1) {
    const ids = rows.map((r) => r.id)
    if (held && held.length === ids.length && held.every((h, i) => h.id === ids[i])) return { says: { message: 'bySameMany' }, act: null }
    return {
      says: { message: 'byMany', values: { count: rows.length, answering: rows.map((r) => r.name) } },
      act: { kind: 'answerers', room: ans.room, ids, before: held?.map((h) => h.id) ?? null },
    }
  }
  const r = rows[0]
  if (!held && ans.now.chosen && ans.now.id === r.id) return { says: { message: 'bySame', values: { name: r.name } }, act: null }
  return {
    says: ans.room ? { message: 'byChat', values: { name: r.name, num: ans.num ?? '' } } : { message: 'byNext', values: { name: r.name } },
    act: { kind: 'answerer', chatId: ans.room, id: r.id, before: ans.now.chosen ? ans.now.id : null },
  }
}

/**
 * name:"…" names what the bar points at (C40). Built for a room: its name
 * is the person's own words, kept on the room. A chat by number
 * (name:207 "…") and collections come with the Almanac and the Collection
 * (stage 6). screens.roomName is what the room on screen is called now.
 * @returns {{ says: object, act: object|null }|null}
 */
function planName(a, step, screens = {}) {
  const args = step.match?.values ?? []
  if (args.length !== 1 || !isRoom(a.addressed)) return null
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

  // On the Collection (C144): clear: alone empties it, move: places a card,
  // sort: and type: pick its order and tab.
  const only = answer.steps.length === 1 ? answer.steps[0] : null
  if (only?.verb === 'clear' && arrangement.addressed === 'collection' && !(only.match?.values ?? []).length) {
    const p = planClear(screens)
    return { answer, says: p.says, next: null, act: p.act }
  }
  if (only?.verb === 'move' && arrangement.addressed === 'collection' && only.match?.values?.[0]?.kind === 'address') {
    const p = planMoveCard(only, screens)
    return { answer, says: p.says, next: null, act: p.act }
  }
  if (arrangement.addressed === 'collection' && answer.steps.every((s) => s.verb === 'sort' || s.verb === 'type')) {
    let view = screens.collection?.view ?? {}
    let says = null
    for (const s of answer.steps) {
      const p = planCollectionView(s, view)
      if (!p.act) return { answer, says: p.says, next: null }
      view = p.act.view
      says = says ?? p.says
    }
    return { answer, says, next: null, act: { kind: 'collectionView', view } }
  }

  // Row commands (C143): they share a line with each other (C99), and
  // undo: takes the line back whole.
  const rowSteps = answer.steps.filter(isRowStep)
  if (rowSteps.length) {
    if (rowSteps.length !== answer.steps.length) return { answer, says: { message: 'rowsTogether', values: { verb: `${rowSteps[0].verb}:` } }, next: null }
    const p = planRowLine(answer.steps, screens.records?.rows ?? [])
    if (p.bad) return { answer, says: p.bad, next: null }
    const says = answer.steps.length > 1 ? { message: answer.message, values: answer.values, also: p.each } : p.says
    return { answer, says, next: null, act: { kind: 'rows', changes: p.changes } }
  }

  // open:203b summary spends one call, so it goes alone on its line (C175).
  const summaryStep = answer.steps.find(isSummaryOpen)
  if (summaryStep) {
    if (answer.steps.length > 1) {
      const [arg] = summaryStep.match.values
      return { answer, says: { message: 'aloneSpends', values: { verb: `open:${arg.num}${arg.letter ?? ''} summary` } }, next: null }
    }
    const p = openSummary(summaryStep, screens)
    return { answer, says: p.says, next: null, act: p.act }
  }

  const acts = answer.steps.filter((s) => ACTS.includes(s.verb))
  if (acts.length) {
    if (answer.steps.length > 1) return { answer, says: { message: 'aloneNow', values: { verb: `${acts[0].verb}:` } }, next: null }
    const step = answer.steps[0]
    const nameIt = (a1, s1, sc) => (a1.addressed === 'collection' ? planNameCollection(s1, sc) : planName(a1, s1, sc))
    const plans = {
      tour: planTour, name: nameIt, inspect: planInspect, api: planApi, save: planSave, forget: planForget, copy: planCopyStep, undo: planUndo,
      erase: planEraseStep, export: planExportStep, new: newStep, add: addStep, rm: rmStep, heading: headingStep,
      // The four acts, compare: and jump: (piece 7; C145).
      note: (a1, s1, sc) => planNote(s1, sc, a1.addressed),
      summarize: (a1, s1, sc) => planSummarize(s1, sc, a1.addressed),
      compare: (a1, s1, sc) => planCompare(s1, sc),
      jump: (a1, s1, sc) => planJump(s1, sc, a1.addressed),
      by: planBy,
      framework: planFramework,
      thinking: planThinking,
      reply: (a1, s1, sc) => planReply(s1, sc),
      language: (a1, s1, sc) => planLanguage(s1, sc),
      helper: (a1, s1, sc) => planHelper(s1, sc),
      translate: (a1, s1, sc) => planTranslate(s1, sc),
      privacy: (a1, s1, sc) => planPrivacy(s1, sc),
      check: (a1, s1, sc) => planCheck(s1, sc),
      to: (a1, s1, sc) => planTo(s1, sc),
      include: (a1, s1, sc) => planInclude(s1, sc),
      again: (a1, s1, sc) => planAgain(s1, sc),
      // set: on Settings (stage 9; C181); a block's settings come with the Lab.
      set: (a1, s1, sc) => (a1.addressed === 'settings' ? planSet(s1, sc) : null),
      // Backups from the bar (stage 9, piece 2; A21; C182): a panel under the
      // field, or a file picker first. Nothing changes before a choice there.
      backup: () => ({ says: { message: 'backupOpen' }, act: { kind: 'backupPanel' } }),
      restore: () => ({ says: { message: 'restoreOpen' }, act: { kind: 'filePick', then: 'restore' } }),
      import: () => ({ says: { message: 'importOpen' }, act: { kind: 'filePick', then: 'import' } }),
    }
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
      a = saved.next
      // A collection: only the space changes.
      if (!saved.view) { last = saved.says; continue }
      changes.push({ replace: saved.view })
      viewSays = viewSays ?? saved.says
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
    // close:204 and width:204 40%: the room showing that chat (C146 (c)).
    const byRoom = (step.verb === 'close' || step.verb === 'width') ? roomByNumber(a, step, screens) : null
    if (byRoom?.bad) return { answer, says: byRoom.bad, next: null }
    const planned = byRoom?.step ?? step
    const p = BRINGS.includes(step.verb) ? bring(a, step, screens)
      : step.verb === 'open' && numberOf(step) != null ? openNumber(a, step, screens)
        : step.verb === 'open' && branchOf(step) ? openBranch(a, step, screens)
        : step.verb === FOCUS ? planFocusStep(a, step, screens)
          : plan(a, planned, screens.measure?.() ?? null)
    if (!p) return { answer, says: { message: 'later', values: { verb: `${step.verb}:` } }, next: null }
    if (!p.next) return { answer, says: p.says, next: null }
    a = p.next
    // A room found by its chat is named by it, with several rooms open (C175 (a)).
    const num = byRoom ? step.match.values[0].text ?? String(step.match.values[0].num ?? '') : null
    last = byRoom && p.says.message === 'closeRoom' ? { message: 'closeRoomNum', values: { num } }
      : byRoom && p.says.message === 'widthRoom' ? { message: 'widthRoomNum', values: { ...p.says.values, num } } : p.says
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

/**
 * What the privacy filter would swap in a prompt to a model off this
 * computer, said before Enter (C167): the prompt's fixed formats with what
 * goes along (privacy.along: the history's, found once by the shell), each
 * value once. On, it says what is swapped; off, that it could be.
 */
function privacyLine(prompt, privacy) {
  if (!privacy) return null
  const seen = new Set(privacy.along ?? [])
  for (const f of findPrivate(prompt)) seen.add(`${f.kind}:${f.value}`)
  if (!seen.size) return null
  const found = Object.fromEntries(PRIVATE_KINDS.map((k) => [k, 0]))
  for (const key of seen) found[key.slice(0, key.indexOf(':'))] += 1
  return { message: privacy.on ? 'promptPrivacy' : 'promptPrivacyOffer', values: { found } }
}

/**
 * What Enter would do with a prompt to several at once (stage 8; C172):
 * each recipient, in the order chosen, with its cost, and the total. Every
 * one must be able to answer, or nothing goes.
 */
function manyPreview(text, target) {
  if (target.streaming) return { ready: false, says: { message: 'promptBusy' } }
  const prompt = String(text ?? '').trim()
  if (!prompt) return { ready: false, says: null }
  if (holdsKey(prompt)) return { ready: false, says: { message: 'promptKey' } }
  if (target.keyed == null) return { ready: false, says: { message: 'promptChecking' } }
  if (target.about) return { ready: false, says: { message: 'promptAboutMany' } }
  const tokens = Math.ceil((prompt.length + (target.historyChars ?? 0) + (target.systemChars ?? 0)) / CHARS_PER_TOKEN)
  let total = 0
  let priced = true
  const each = []
  for (const [i, who] of target.many.entries()) {
    const n = i + 1
    if (who.later) return { ready: false, says: { message: 'promptLater', values: { name: who.name } } }
    if (who.gone) return { ready: false, says: { message: 'promptGone', values: { name: who.name } } }
    if (who.needsKey) return { ready: false, says: { message: 'promptNeedsKey', values: { name: who.name, provider: who.providerName, command: `api:${who.provider}` } } }
    if (who.unchecked) return { ready: false, says: { message: 'promptLocalUnchecked', values: { name: who.name, provider: who.providerName, command: `api:${who.provider}` } } }
    if (who.group === 'source') { each.push({ message: 'promptManySource', values: { n, name: who.name } }); continue }
    if (who.group === 'local') { each.push({ message: 'promptManyLocal', values: { n, name: who.name } }); continue }
    const price = who.price?.over && tokens > who.price.over.promptTokens ? who.price.over : who.price
    const cost = inputCost(tokens, price?.inputPerMillion)
    if (cost == null) { priced = false; each.push({ message: 'promptManyUnpriced', values: { n, name: who.name, tokens } }); continue }
    total += cost
    each.push(cost < CENT
      ? { message: 'promptManyCheap', values: { n, name: who.name, tokens, cost: CENT } }
      : { message: 'promptManyModel', values: { n, name: who.name, tokens, cost } })
  }
  const also = [...each]
  if (target.frameworks?.length) also.push({ message: 'promptFrameworks', values: { count: target.frameworks.length, frameworks: target.frameworks } })
  if (target.replyIn) also.push({ message: 'promptReplyIn', values: { language: target.replyIn } })
  if (target.describe) also.push({ message: 'promptDescribeOnce' })
  if (target.sourcesOut?.count > 0) also.push({ message: 'promptSourcesOut', values: { count: target.sourcesOut.count, sources: target.sourcesOut.names } })
  if (target.hiddenOut > 0) also.push({ message: 'promptHiddenOut', values: { count: target.hiddenOut } })
  // To branches there already, each carrying its own on (C174); else new branches (C172).
  const to = Array.isArray(target.toMany) ? { nums: target.toMany } : null
  const head = !priced || total === 0
    ? { message: to ? 'promptToMany' : 'promptMany', values: { count: target.many.length, ...to } }
    : total < CENT
      ? { message: to ? 'promptToManyCheap' : 'promptManyTotalCheap', values: { count: target.many.length, cost: CENT, ...to } }
      : { message: to ? 'promptToManyTotal' : 'promptManyTotal', values: { count: target.many.length, cost: total, ...to } }
  return { ready: true, says: { ...head, also } }
}

// How much of a chat a model on this computer reads (C163 (e)): in estimate.js.
export { LOCAL_READS }

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
  const p = Array.isArray(target.many) && target.many.length > 1 ? manyPreview(text, target) : onePreview(text, target)
  // Among a prompt's branches (C174): which one it carries on, and that the
  // one being viewed is not it.
  if (!p.ready || !p.says) return p
  const lines = []
  if (target.toBranch) lines.push({ message: 'promptToBranch', values: { address: target.toBranch } })
  if (target.carriesOn) lines.push({ message: 'promptCarriesOn', values: target.carriesOn })
  const whos = Array.isArray(target.many) && target.many.length > 1 ? target.many : [target.answerer ?? { group: target.keyed ? 'model' : 'source' }]
  // The privacy filter on a search (C179): a source searches for words, so
  // what the filter finds is left out, or could be.
  const toSources = whos.filter((w) => w.group === 'source')
  if (target.privacySearch && toSources.length) {
    const seen = new Map()
    for (const f of findPrivate(String(text ?? ''))) seen.set(`${f.kind}:${f.value}`, f.kind)
    if (seen.size) {
      const found = Object.fromEntries(PRIVATE_KINDS.map((k) => [k, 0]))
      for (const k of seen.values()) found[k] += 1
      lines.push(target.privacySearch.on ? { message: 'promptPrivacySearch', values: { found } } : { message: 'promptPrivacySearchOffer', values: { found } })
    }
  }
  // Answers from sources include: holds for this prompt (C176): to models
  // only, as data; a source is sent the words alone.
  const inc = target.included ?? null
  if (inc?.count) {
    if (whos.some((w) => w.group !== 'source')) {
      lines.push({ message: 'promptIncluded', values: { count: inc.count, sources: inc.sources } })
      if (inc.flagged) lines.push({ message: 'promptIncludedFlagged' })
      if (whos.some((w) => w.group === 'source')) lines.push({ message: 'promptIncludedNotSources' })
    } else {
      lines.push({ message: 'promptIncludedKept', values: { count: inc.count } })
    }
  }
  return lines.length ? { ...p, says: { ...p.says, also: [...lines, ...(p.says.also ?? [])] } } : p
}

function onePreview(text, target) {
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
  // Who answers (stage 7; C150): the chat's choice, or the default. Without
  // one given, the default as stage 4 had it: the provider with a key, the
  // source without.
  const who = target.answerer ?? (target.keyed ? { group: 'model', name: target.provider } : { group: 'source', name: target.source })
  // About selected cards (C145 (h)): a model reads them, so a key is needed.
  const about = target.about ?? null
  if (about && (who.group === 'source' || who.needsKey)) return { ready: false, says: { message: 'promptAboutNoKey', values: { provider: target.provider } } }
  // Never sent to someone other than the line names (C150, C151).
  if (who.later) return { ready: false, says: { message: 'promptLater', values: { name: who.name } } }
  if (who.gone) return { ready: false, says: { message: 'promptGone', values: { name: who.name } } }
  if (who.needsKey) return { ready: false, says: { message: 'promptNeedsKey', values: { name: who.name, provider: who.providerName, command: `api:${who.provider}` } } }
  // A model on this computer: free, and nothing leaves it (C163). Until a
  // check has listed it, it is not sent to.
  if (who.group === 'local') {
    if (who.unchecked) return { ready: false, says: { message: 'promptLocalUnchecked', values: { name: who.name, provider: who.providerName, command: `api:${who.provider}` } } }
    const tokens = Math.ceil((prompt.length + (about?.chars ?? 0) + (target.historyChars ?? 0) + (target.systemChars ?? 0)) / CHARS_PER_TOKEN)
    const also = []
    if (target.frameworks?.length) also.push({ message: 'promptFrameworks', values: { count: target.frameworks.length, frameworks: target.frameworks } })
    if (target.replyIn) also.push({ message: 'promptReplyIn', values: { language: target.replyIn } })
    if (target.sourcesOut?.count > 0) also.push({ message: 'promptSourcesOut', values: { count: target.sourcesOut.count, sources: target.sourcesOut.names } })
    if (target.hiddenOut > 0) also.push({ message: 'promptHiddenOut', values: { count: target.hiddenOut } })
    if (who.thinks) also.unshift(target.thinking ? { message: 'promptThinks', values: { name: who.name } } : { message: 'promptThinksOff', values: { name: who.name } })
    // Longer than it is likely to read (C163 (e)).
    if (tokens > LOCAL_READS) also.push({ message: 'promptLocalLong', values: { name: who.name, tokens, reads: LOCAL_READS, provider: who.providerName ?? 'Ollama' } })
    const says = { message: 'promptSendLocal', values: { provider: who.name, tokens } }
    return { ready: true, says: also.length ? { ...says, also } : says }
  }
  if (who.group === 'source') {
    const says = { message: 'promptSource', values: { source: who.name } }
    const also = []
    // What it searches for, when that is not the question as typed (C168).
    if (!target.query && target.searchLang) {
      const words = searchWords(prompt, target.searchLang)
      if (words !== prompt.replace(/[?？!.]+$/u, '').trim()) also.push({ message: 'promptSearchFor', values: { search: words } })
    }
    // The edition asked, when it is the reply language's (C166 (e)).
    if (target.edition) also.push({ message: 'promptEdition', values: { language: target.edition } })
    // A question to a source that reads only English, translated first (C85).
    also.push(...queryLines(target.query ?? null, prompt.length, target.nameOf ?? ((t) => t)))
    // An answer in English for someone who reads another language: translate: comes after (C166 (f)).
    if (!target.query && target.translateLater) also.push({ message: 'promptTranslateLater', values: { language: target.translateLater } })
    // A source with a daily allowance says so before Enter (C156).
    if (who.perDay) also.push({ message: 'promptPerDay', values: { count: who.perDay } })
    return { ready: true, says: also.length ? { ...says, also } : says }
  }

  const tokens = Math.ceil((prompt.length + (about?.chars ?? 0) + (target.historyChars ?? 0) + (target.systemChars ?? 0)) / CHARS_PER_TOKEN)
  // A model priced higher for a long prompt (Haiku 5.5 above 100,000 tokens).
  const price = who.price?.over && tokens > who.price.over.promptTokens ? who.price.over : who.price
  const cost = inputCost(tokens, price?.inputPerMillion ?? target.perMillion)
  const values = { provider: who.name, tokens }
  const also = []
  // Where it is processed, when that costs more (Mistral's regions, C159),
  // and a model offered before general availability (security notes §3).
  if (target.region && target.region !== 'global') also.push({ message: 'promptRegion', values: { region: target.region } })
  // A preview, and one whose provider trains on all it is sent (C167).
  if (who.preview) also.push({ message: who.training === 'always' ? 'promptPreviewTrains' : 'promptPreviewModel', values: { name: who.name } })
  // The privacy filter: what it swaps, or what it would (C167).
  const veiled = privacyLine(about ? `${about.text}\n\n${prompt}` : prompt, target.privacy)
  if (veiled) also.push(veiled)
  // Names found first on this computer, and swapped too (C169).
  if (target.privacy?.names) also.push({ message: 'promptPrivacyNames', values: { name: target.privacy.names } })
  // The frameworks that go with it, in their order (C164). target.frameworks: their names.
  if (target.frameworks?.length) also.push({ message: 'promptFrameworks', values: { count: target.frameworks.length, frameworks: target.frameworks } })
  // The language replies come in, sent as a line of the system prompt (C166).
  if (target.replyIn) also.push({ message: 'promptReplyIn', values: { language: target.replyIn } })
  if (about) {
    also.push({ message: 'promptAbout', values: { count: about.nums.length } })
    if (about.quotes?.length) also.push({ message: 'promptAboutQuotes', values: { nums: about.quotes, count: about.quotes.length } })
  }
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
