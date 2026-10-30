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

/** The setting the progress is kept in, on this device only. */
export const WELCOME_SETTING = 'welcomeSteps'

/** @typedef {{ done: string[], off: boolean, finished: boolean, chat: string|null }} Welcome */

/** @returns {Welcome} */
export const freshWelcome = () => ({ done: [], off: false, finished: false, chat: null })

/** Progress read back from storage, made safe: unknown steps dropped. */
export function cleanWelcome(raw) {
  if (!raw || typeof raw !== 'object') return freshWelcome()
  // The Library's step, ticked before C265, counts as the Lab's.
  const done = Array.isArray(raw.done) ? [...new Set(raw.done.map((id) => (id === 'library' ? 'lab' : id)).filter((id) => IDS.has(id)))] : []
  return {
    done: STEPS.map((s) => s.id).filter((id) => done.includes(id)),
    off: raw.off === true,
    finished: raw.finished === true || done.length === STEPS.length,
    chat: typeof raw.chat === 'string' && raw.chat.length <= 128 ? raw.chat : null,
  }
}

export const isDone = (w, id) => w.done.includes(id)

/** The first step not done, in order, or null when all are. */
export const nextStep = (w) => STEPS.find((s) => !w.done.includes(s.id)) ?? null

/**
 * The progress after a step happened. The same object when nothing changed,
 * so callers can skip saving. The last step done finishes the page.
 */
export function tick(w, id) {
  if (!IDS.has(id) || w.done.includes(id)) return w
  const done = STEPS.map((s) => s.id).filter((s) => s === id || w.done.includes(s))
  return { ...w, done, finished: w.finished || done.length === STEPS.length }
}

/** The list shown again, or put away (tour:, tour:off; A20). */
export const showSteps = (w, on) => (w.off === !on ? w : { ...w, off: !on })

/**
 * Which steps the numbered rows show as done (C225): an edit that strikes
 * words (8), a highlight (9; C282). An edit or ask that went with a prompt
 * is still read as send, which is no longer a step and ticks nothing.
 * @param {Array<{ kind: string, change?: { struck?: string, sent?: object|null } }>} rows
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
  return out
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
