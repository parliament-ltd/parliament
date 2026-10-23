// The boards registry (refactor-plan.md §4 and stage 3; arrangements spec
// §1 to §4 and §8; editing spec, "Focus").
//
// A board is anything that can be opened, closed, moved or popped on its
// own. Every board sits in an arrangement: boards never go inside rooms, so
// a board needs no placement of its own (that is a block's question).
//
// Each board registers:
//   title     its name on the board strip, the word a command uses for it
//             (C131, ruled 21 October: full names, and Records, Plan, Room).
//             Commands stay English, so titles do too. null where no
//             document gives one.
//   resting   the field's resting mode while the board is addressed (C44)
//   can       what it may do: 'execute' runs things (rooms, dockets, and the
//             Almanac, which can run: C6, S11)
//   closable  false for a board an arrangement cannot do without
//   strip     its place on the strip; null for boards the strip leaves out
//
// Its name comes from the copy table (COPY.boards), and the verbs that work
// on it from the verb list (verbs.js, `on`). Its component comes with the
// drawing.

export const BOARDS = Object.freeze({
  room: { title: 'Room', resting: 'prompt', can: ['execute'], closable: true, strip: 1 },
  collection: { title: 'Collection', resting: 'search', can: [], closable: true, strip: 2 },
  reflection: { title: 'Reflection', resting: 'prompt', can: [], closable: true, strip: 3 },
  almanac: { title: 'Records', resting: 'search', can: ['execute'], closable: true, strip: 4 },
  library: { title: 'Library', resting: 'search', can: [], closable: true, strip: 5 },
  docket: { title: 'Plan', resting: 'prompt', can: ['execute'], closable: true, strip: 6 },
  settings: { title: null, resting: 'search', can: [], closable: true, strip: null },
  // The Lab's boards (Lab v7, A2).
  canvas: { title: null, resting: 'search', can: [], closable: true, strip: null },
  blocks: { title: null, resting: 'search', can: [], closable: true, strip: null },
  // The welcome page's card: not a board in the documents, but it sits in
  // the space like one. tour: brings it, close: takes it away (C125).
  welcome: { title: null, resting: 'search', can: [], closable: true, strip: null },
})

/**
 * Settings' sections, in order, with the alias typed after open:settings
 * and the other words that name them (settings spec §2; stage 9; C181).
 */
export const SECTIONS = Object.freeze([
  { id: 'keys', words: ['key', 'api', 'models', 'model', 'providers'] },
  { id: 'spending', words: ['spend', 'cost', 'budget', 'usage'] },
  { id: 'context', words: ['defaults', 'default'] },
  { id: 'data', words: ['backup', 'backups', 'storage'] },
  { id: 'appearance', words: ['look', 'text', 'desks'] },
  { id: 'about', words: ['security', 'network', 'privacy'] },
])

/** The Settings section a word names, or null. */
export function sectionOf(word) {
  const w = String(word ?? '').trim().toLowerCase()
  return SECTIONS.find((s) => s.id === w || s.words.includes(w))?.id ?? null
}

// Rooms (C175 (a), ruled 23 October: "the user can open any number of
// rooms"). The first room in the space is the board 'room', as before; each
// other is 'room-2', 'room-3' and so on, with its own chat. A space kept
// before reads as it did.
const MORE_ROOMS = /^room-([2-9]|[1-9]\d{1,2})$/

/** Whether a board is a room: 'room', 'room-2', 'room-3' … */
export const isRoom = (key) => key === 'room' || MORE_ROOMS.test(String(key ?? ''))

/** The registered board, or null. Every room is a room board. */
export const boardEntry = (key) => (Object.hasOwn(BOARDS, key) ? BOARDS[key] : MORE_ROOMS.test(String(key ?? '')) ? BOARDS.room : null)

// The words commands take for boards, where they differ from the board's id
// (C131): people read Records and Plan; inside the app, and in what is
// stored, the boards keep their ids, so nothing kept changes.
const WORDS = Object.freeze({ records: 'almanac', plan: 'docket' })

/** The board a command's word names, or null. */
export const boardFor = (word) => (word == null ? null : WORDS[word] ?? (boardEntry(word) ? word : null))

/** The word a command uses for a board: records for the Almanac's board. */
export const wordFor = (board) => Object.keys(WORDS).find((w) => WORDS[w] === board) ?? board

// The strip's short titles before C131, still taken by focus: (stage 14).
const OLD_TITLES = Object.freeze({ sym: 'room', col: 'collection', ref: 'reflection', alm: 'almanac', lib: 'library', dkt: 'docket' })

/** The board a strip title names, for focus:room collection; null if none. */
export function boardByTitle(word) {
  const w = String(word ?? '').toLowerCase().replace(/:$/, '')
  return Object.keys(BOARDS).find((key) => BOARDS[key].title?.toLowerCase() === w) ?? OLD_TITLES[w] ?? null
}

/**
 * The board strip: every board it lists, in its fixed order (editing spec,
 * "Focus"), marked when open on this screen or in a window, and when the bar
 * is pointed at it. `context` is what a title carries after it: a room's
 * name, a collection's name, a number.
 * @param {{ columns: string[][], popped: Array<{ board: string }>, addressed: string, context?: object }} arrangement
 */
export function strip(arrangement) {
  // Every room in the space counts as Room on the strip.
  const kind = (b) => (isRoom(b) ? 'room' : b)
  const here = new Set([...arrangement.columns.flat(), ...arrangement.popped.map((p) => p.board)].map(kind))
  return Object.entries(BOARDS)
    .filter(([, b]) => b.strip != null)
    .sort(([, a], [, b]) => a.strip - b.strip)
    .map(([key, b]) => ({ board: key, title: `${b.title}:`, context: arrangement.context?.[key] ?? null, here: here.has(key), addressed: kind(arrangement.addressed) === key }))
}
