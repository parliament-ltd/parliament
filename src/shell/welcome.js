// The welcome page's steps (refactor-plan.md, stage 5; welcome spec §4,
// welcome v9; C43, C119, C120, A1, A20). Pure, so it is tested without the
// app.
//
// Ten steps, each a real command, crossed off in any order when the thing
// itself happens, not when the command is typed. Their words are in the
// copy table (COPY.welcome); the commands stay English. Steps 9 and 10 came
// with editing in place (stage 11, piece 7; A7, C225): strike words in a
// reply, then send the edit with the next prompt.
//
// Progress is kept on this device only, as one setting (C121): which steps
// are done, whether the list is put away (tour:off), whether the ending was
// reached, and the chat the page started, so its card comes back.
//
// While the Lab waits for a later release, its step does too: nine (C279 (a)).
//
// tour:advanced shows the second list (welcome spec §13; A20), offered and
// never pushed: working with several sources, a collection, then the space.
// Its steps cross off the same way, in any order, and are kept in the same
// setting: which list is shown, and which of its steps are done.

import { LAB } from '../lib/release'

/**
 * @typedef {{ id: string, shows: string, writes: string|null }} Step
 *   shows: the command as the step prints it; writes: what a click on it
 *   writes into the field
 */

/** @type {ReadonlyArray<Step>} */
export const STEPS = Object.freeze([
  { id: 'command', shows: '>', writes: '>' },
  { id: 'bar', shows: 'bar:bottom', writes: '>bar:bottom' }, // C43
  { id: 'ask', shows: 'p>', writes: 'p>' },
  // records: brings the Records arrangement beside the card (C119, C125, C131).
  { id: 'almanac', shows: 'records:', writes: '>records:' },
  { id: 'name', shows: 'name:"…"', writes: '>name:""' },
  { id: 'pop', shows: 'pop:records', writes: '>pop:records' },
  // The Lab, where rooms are built (C265; it was the Library until then).
  { id: 'lab', shows: 'lab:', writes: '>lab:' },
  { id: 'key', shows: 'api:', writes: '>api:' }, // A1; crosses off on seeing the panel (C120)
  // Crossed off when an edit that strikes words is saved, however made (C225 (a)).
  { id: 'strike', shows: 'strikethrough:', writes: '>strikethrough:' },
  // Crossed off when a highlight is saved (30 October; C282): a step with no
  // key needed, where "send it with your next prompt" needed a model. No
  // command makes a highlight yet, so the line writes nothing in the bar.
  { id: 'highlight', shows: null, writes: null },
// The Lab's step waits with the Lab (C279 (a)).
].filter((s) => LAB || s.id !== 'lab').map((s) => Object.freeze(s)))

const IDS = new Set(STEPS.map((s) => s.id))

/**
 * @typedef {{ id: string, group: string, shows: string|null, writes: string|null }} AdvancedStep
 *   group: the short heading it sits under
 */

/**
 * The second list (welcome spec §13), under three short headings. Its
 * highlight is the first list's step too: one highlight crosses off both.
 * @type {ReadonlyArray<AdvancedStep>}
 */
export const ADVANCED_STEPS = Object.freeze([
  // Several at once make branches, one each (C172).
  { id: 'sources', group: 'sources', shows: 'p>', writes: 'p>' },
  // compare: takes notes, highlights and quotes for now, not branches
  // (C145 (i)): a quote of each answer (quote:reply) is what it compares.
  { id: 'compare', group: 'sources', shows: 'compare:', writes: '>compare:' },
  { id: 'highlight', group: 'collection', shows: null, writes: null },
  { id: 'collection', group: 'collection', shows: 'new:collection', writes: '>new:collection' },
  { id: 'noteQuotes', group: 'collection', shows: 'note:"…"', writes: '>note:""' },
  // The one step that spends tokens: optional, with a key (W §13).
  { id: 'summary', group: 'collection', shows: 'summarize:', writes: '>summarize:' },
  { id: 'arrange', group: 'space', shows: 'arrange:save "research"', writes: '>arrange:save "research"' },
  // Left out while what they need is hidden in this release (lib/release.js:
  // LAB and COLUMNS false; new:block is not built). They come back with the
  // Lab, as W §13 numbers them (7, 8, then 10 and 11 after arrange, which is
  // 9), the last under a fourth heading, Make:
  //   { id: 'column', group: 'space', shows: 'layout:"Three-panel"', writes: '>layout:"Three-panel"' },
  //   { id: 'block', group: 'space', shows: 'place:notes right', writes: '>place:notes right' },
  //   { id: 'labRoom', group: 'space', shows: 'edit:"Reading room"', writes: '>edit:"Reading room"' },
  //   { id: 'newBlock', group: 'make', shows: 'new:block', writes: '>new:block' },
].map((s) => Object.freeze(s)))

/** The second list's headings, in order. */
export const ADVANCED_GROUPS = Object.freeze([...new Set(ADVANCED_STEPS.map((s) => s.group))])

const ADVANCED_IDS = new Set(ADVANCED_STEPS.map((s) => s.id))

/** The setting the progress is kept in, on this device only. */
export const WELCOME_SETTING = 'welcomeSteps'

/**
 * @typedef {{ done: string[], off: boolean, finished: boolean, chat: string|null,
 *   advanced: boolean, advancedDone: string[] }} Welcome
 *   advanced: the second list is the one shown (tour:advanced); advancedDone: its steps done
 */

/** @returns {Welcome} */
export const freshWelcome = () => ({ done: [], off: false, finished: false, chat: null, advanced: false, advancedDone: [] })

/**
 * Progress read back from storage, made safe: unknown steps dropped. Kept
 * before the second list, it reads as that list not shown and none of it done.
 */
export function cleanWelcome(raw) {
  if (!raw || typeof raw !== 'object') return freshWelcome()
  // The Library's step, ticked before C265, counts as the Lab's.
  const done = Array.isArray(raw.done) ? [...new Set(raw.done.map((id) => (id === 'library' ? 'lab' : id)).filter((id) => IDS.has(id)))] : []
  const further = Array.isArray(raw.advancedDone) ? raw.advancedDone : []
  return {
    done: STEPS.map((s) => s.id).filter((id) => done.includes(id)),
    off: raw.off === true,
    finished: raw.finished === true || done.length === STEPS.length,
    chat: typeof raw.chat === 'string' && raw.chat.length <= 128 ? raw.chat : null,
    advanced: raw.advanced === true,
    advancedDone: ADVANCED_STEPS.map((s) => s.id).filter((id) => further.includes(id)),
  }
}

export const isDone = (w, id) => w.done.includes(id)

/** The first step not done, in order, or null when all are. */
export const nextStep = (w) => STEPS.find((s) => !w.done.includes(s.id)) ?? null

/** The second list's first step not done, in order, or null when all are. */
export const nextAdvanced = (w) => ADVANCED_STEPS.find((s) => !(w.advancedDone ?? []).includes(s.id)) ?? null

/**
 * The progress after a step happened, in whichever list holds it, or both.
 * The same object when nothing changed, so callers can skip saving. The
 * first list's last step done finishes the page; the second list finishes
 * nothing.
 */
export function tick(w, id) {
  let next = w
  if (IDS.has(id) && !w.done.includes(id)) {
    const done = STEPS.map((s) => s.id).filter((s) => s === id || w.done.includes(s))
    next = { ...next, done, finished: w.finished || done.length === STEPS.length }
  }
  const further = w.advancedDone ?? []
  if (ADVANCED_IDS.has(id) && !further.includes(id)) {
    next = { ...next, advancedDone: ADVANCED_STEPS.map((s) => s.id).filter((s) => s === id || further.includes(s)) }
  }
  return next
}

/**
 * A list shown again, or put away (tour:, tour:advanced, tour:off; A20).
 * Shown, it is the first list, or the second when advanced; put away, the
 * steps go, whichever list was shown.
 */
export function showSteps(w, on, advanced = false) {
  const want = on ? { off: false, advanced: Boolean(advanced) } : { off: true }
  return Object.entries(want).every(([k, v]) => w[k] === v) ? w : { ...w, ...want }
}

/**
 * Which steps the numbered rows show as done (C225): an edit that strikes
 * words (8), a highlight (9; C282). An edit or ask that went with a prompt
 * is still read as send, which is no longer a step and ticks nothing. In
 * the second list: the highlight, a note that quotes what it names (C145
 * (e)), and a summary note (C145 (g)).
 * @param {Array<{ kind: string, change?: { struck?: string, sent?: object|null }, quotes?: number[], summarized?: object|null }>} rows
 */
export function stepsMade(rows) {
  const out = []
  const changes = (rows ?? []).filter((r) => (r?.kind === 'edit' || r?.kind === 'ask') && r.change)
  if (changes.some((r) => r.kind === 'edit' && r.change.struck)) out.push('strike')
  if (changes.some((r) => r.change.sent && (r.change.sent.to || r.change.sent.into))) out.push('send')
  // A passage marked in a colour shows as a mark on its chat's row
  // (almanacRows.js): a term, as today's highlight is named (C57, C78), or
  // a highlight once those are built.
  const marked = (r) => ['highlight', 'term'].includes(r?.kind) || (r?.kind === 'chat' && Array.isArray(r.marks) && r.marks.some((m) => m === 'highlight' || m === 'term'))
  if ((rows ?? []).some(marked)) out.push('highlight')
  const notes = (rows ?? []).filter((r) => r?.kind === 'note')
  if (notes.some((r) => Array.isArray(r.quotes) && r.quotes.length)) out.push('noteQuotes')
  if (notes.some((r) => r.summarized)) out.push('summary')
  return out
}

/**
 * Which of the second list's steps what is kept shows as done: a collection
 * of one's own (new:collection; C144), not a built-in one, and an
 * arrangement saved by name (arrange:save; C257).
 * @param {{ collections?: Array<{ builtIn?: string|null }>, arrangements?: object[] }} kept
 */
export function stepsKept({ collections = [], arrangements = [] } = {}) {
  const out = []
  if ((collections ?? []).some((c) => c && !c.builtIn)) out.push('collection')
  if ((arrangements ?? []).length) out.push('arrange')
  return out
}

// What compare: and note: take besides notes (C145): highlights and quotes.
const KEPT_WORDS = new Set(['quote', 'term', 'highlight'])
const newestFirst = (a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')) || b.num - a.num

/**
 * The numbers the second list's commands are shown with, where they are
 * known, as the first list shows name: with the room's number. compare: the
 * newest highlight or quote in each of two branches of one plan, in the
 * branches' order (compare: takes those, not branches, for now; C145 (i));
 * note: the newest two highlights or quotes, to quote.
 * @param {Array<{ kind: string, num: number, archived?: boolean, docketNum?: number|null, branch?: string|null, createdAt?: string|null }>} rows
 * @returns {{ compare: number[]|null, quotes: number[] }}
 */
export function advancedNumbers(rows) {
  const kept = (rows ?? []).filter((r) => KEPT_WORDS.has(r?.kind) && Number.isInteger(r.num) && !r.archived).sort(newestFirst)
  let compare = null
  for (const r of kept) {
    if (r.docketNum == null || !r.branch) continue
    const other = kept.find((o) => o.docketNum === r.docketNum && o.branch && o.branch !== r.branch)
    if (other) {
      compare = [r, other].sort((x, y) => x.branch.localeCompare(y.branch)).map((x) => x.num)
      break
    }
  }
  return { compare, quotes: kept.slice(0, 2).map((r) => r.num).sort((a, b) => a - b) }
}

/**
 * Whether a prompt going out carries an edit, so its step crosses off at
 * once, without waiting for the stored marks to be read again (C225 (b);
 * Stefan, 29 October: it "didn't cross off"). From what the Enter line
 * counted: edits or asks that go with the prompt to a model that reads them,
 * the one answering or, on a source's branch, the one that reads edits there
 * (C218 (e)); or a prompt and reply joined with edits in them, whose words
 * are the prompt, to a model or a source (C214 (b), (c)). Edits that wait,
 * with a source answering and no model to read them, do not go with it.
 * @param {{ edits?: { count?: number, asks?: number }|null, read?: boolean, joined?: number }} [going]
 *   edits: what the line counted going; read: whether a model reads them;
 *   joined: the edits and asks in the joined words sent
 */
export function carriesEdit({ edits = null, read = false, joined = 0 } = {}) {
  if (joined > 0) return true
  return read && Boolean(edits) && ((edits.count ?? 0) > 0 || (edits.asks ?? 0) > 0)
}

/** The chat the page started, so its card comes back. */
export const withChat = (w, chat) => (w.chat === chat ? w : { ...w, chat })

/**
 * Which steps an arrangement of the welcome screen shows as done: the bar
 * at the foot (step 2), a board in a window of its own (6), the Almanac
 * open (4), the Lab open (7), the key panel seen (8).
 * @param {{ columns: string[][], popped: Array<{ board: string }>, bar: { at: string, popped: boolean } }} a
 */
export function stepsShown(a) {
  const here = new Set([...a.columns.flat(), ...a.popped.map((p) => p.board)])
  const out = []
  if (a.bar.at === 'bottom') out.push('bar')
  if (here.has('almanac')) out.push('almanac')
  if (a.popped.length) out.push('pop')
  if (a.lab) out.push('lab')
  if (here.has('settings')) out.push('key')
  return out
}
