// The welcome page's steps (refactor-plan.md, stage 5; welcome spec §4,
// welcome v9; C43, C119, C120, A1, A20). Pure, so it is tested without the
// app.
//
// Eight steps, each a real command, crossed off in any order when the
// thing itself happens, not when the command is typed. Their words are in
// the copy table (COPY.welcome); the commands stay English. Steps 9 and 10
// of welcome v9 (strike a line, leave the AI a note) come with editing in
// place (stage 11, A7).
//
// Progress is kept on this device only, as one setting (C121): which steps
// are done, whether the list is put away (tour:off), whether the ending was
// reached, and the chat the page started, so its card comes back.

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
  { id: 'almanac', shows: 'alm:', writes: '>alm:' }, // C119
  { id: 'name', shows: 'name:"…"', writes: '>name:""' },
  { id: 'pop', shows: 'pop:almanac', writes: '>pop:almanac' },
  { id: 'library', shows: 'library:', writes: '>library:' },
  { id: 'key', shows: 'api:', writes: '>api:' }, // A1; crosses off on seeing the panel (C120)
].map((s) => Object.freeze(s)))

const IDS = new Set(STEPS.map((s) => s.id))

/** The setting the progress is kept in, on this device only. */
export const WELCOME_SETTING = 'welcomeSteps'

/** @typedef {{ done: string[], off: boolean, finished: boolean, chat: string|null }} Welcome */

/** @returns {Welcome} */
export const freshWelcome = () => ({ done: [], off: false, finished: false, chat: null })

/** Progress read back from storage, made safe: unknown steps dropped. */
export function cleanWelcome(raw) {
  if (!raw || typeof raw !== 'object') return freshWelcome()
  const done = Array.isArray(raw.done) ? [...new Set(raw.done.filter((id) => IDS.has(id)))] : []
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

/** The chat the page started, so its card comes back. */
export const withChat = (w, chat) => (w.chat === chat ? w : { ...w, chat })

/**
 * Which steps an arrangement of the welcome screen shows as done: the bar
 * at the foot (step 2), a board in a window of its own (6), the Almanac
 * and the Library open (4, 7), the key panel seen (8).
 * @param {{ columns: string[][], popped: Array<{ board: string }>, bar: { at: string, popped: boolean } }} a
 */
export function stepsShown(a) {
  const here = new Set([...a.columns.flat(), ...a.popped.map((p) => p.board)])
  const out = []
  if (a.bar.at === 'bottom') out.push('bar')
  if (here.has('almanac')) out.push('almanac')
  if (a.popped.length) out.push('pop')
  if (here.has('library')) out.push('library')
  if (here.has('settings')) out.push('key')
  return out
}
