// The boards registry (refactor-plan.md §4 and stage 3; arrangements spec
// §1 to §4 and §8; editing spec, "Focus").
//
// A board is anything that can be opened, closed, moved or popped on its
// own. Every board sits in an arrangement: boards never go inside rooms, so
// a board needs no placement of its own (that is a block's question).
//
// Each board registers:
//   title     its short title on the board strip, also a word focus: takes
//             (focus:sym col). Commands stay English, so titles do too.
//             null where no document gives one.
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
  room: { title: 'Sym', resting: 'prompt', can: ['execute'], closable: true, strip: 1 },
  collection: { title: 'Col', resting: 'search', can: [], closable: true, strip: 2 },
  reflection: { title: 'Ref', resting: 'prompt', can: [], closable: true, strip: 3 },
  almanac: { title: 'Alm', resting: 'search', can: ['execute'], closable: true, strip: 4 },
  library: { title: 'Lib', resting: 'search', can: [], closable: true, strip: 5 },
  docket: { title: 'Dkt', resting: 'prompt', can: ['execute'], closable: true, strip: 6 },
  settings: { title: null, resting: 'search', can: [], closable: true, strip: null },
  // The Lab's boards (Lab v7, A2).
  canvas: { title: null, resting: 'search', can: [], closable: true, strip: null },
  blocks: { title: null, resting: 'search', can: [], closable: true, strip: null },
  // The welcome page's card: not a board in the documents, but it sits in
  // the space like one. tour: brings it, close: takes it away (C125).
  welcome: { title: null, resting: 'search', can: [], closable: true, strip: null },
})

/** The registered board, or null. */
export const boardEntry = (key) => (Object.hasOwn(BOARDS, key) ? BOARDS[key] : null)

/** The board a short title names, for focus:sym col; null if none. */
export function boardByTitle(word) {
  const w = String(word ?? '').toLowerCase().replace(/:$/, '')
  return Object.keys(BOARDS).find((key) => BOARDS[key].title?.toLowerCase() === w) ?? null
}

/**
 * The board strip: every board it lists, in its fixed order (editing spec,
 * "Focus"), marked when open on this screen or in a window, and when the bar
 * is pointed at it. `context` is what a title carries after it: a room's
 * name, a collection's name, a number.
 * @param {{ columns: string[][], popped: Array<{ board: string }>, addressed: string, context?: object }} arrangement
 */
export function strip(arrangement) {
  const here = new Set([...arrangement.columns.flat(), ...arrangement.popped.map((p) => p.board)])
  return Object.entries(BOARDS)
    .filter(([, b]) => b.strip != null)
    .sort(([, a], [, b]) => a.strip - b.strip)
    .map(([key, b]) => ({ board: key, title: `${b.title}:`, context: arrangement.context?.[key] ?? null, here: here.has(key), addressed: arrangement.addressed === key }))
}
