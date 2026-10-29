// What this release offers (C279 (a)). The first public release is the
// default room, Writing Studio, with everything it holds, and the boards; the
// Lab and the other rooms wait until they are designed. Nothing is deleted:
// anything someone has already made still opens, and only making new rooms
// waits. LAB = true brings the Lab, its commands and every room back.

export const LAB = false

// A room is its chat only, for now (C280 (a); Stefan, 29 October: "I've
// changed my mind on columns, let's hide those for now"). Its side columns,
// and the buttons that open them, are not drawn in any form: alone, sharing
// the screen, narrow or on a phone. Their blocks stay in the room file and
// their code stays; COLUMNS = true brings them back as C279 (b) built them.
// A column that holds the chat itself (the chat panel of the Data Workspace
// and the Drafting Desk) still draws, with only the chat in it.
export const COLUMNS = false

// The strip along the top of each prompt and reply card (C280 (b); Stefan,
// 29 October: "hide the top bar on the reply that has the old favorite and
// branch icons"): its number, the favourite and note marks, and the buttons
// for favourite, note, branch from here, delete, and a menu of hide, send to
// branch, quote and copy. CARD_HEAD = true draws it again.
export const CARD_HEAD = false

/** The room people start in, the one template the Library offers meanwhile. */
export const DEFAULT_TEMPLATE = 'writing-studio@1.0'

/** The commands that build rooms or open the Lab ("Building rooms", and lab:). */
export const LAB_VERBS = Object.freeze(['lab', 'edit', 'done', 'place', 'layout', 'theme', 'device', 'local', 'duplicate'])

/** The Library's shelves that only serve building rooms. */
export const LAB_SHELVES = Object.freeze(['layout', 'block', 'theme'])

/** Whether this release offers a command. */
export const offered = (verb, lab = LAB) => lab || !LAB_VERBS.includes(verb)

/** Whether this release shows an item of the Library's catalogue. */
export const shownInLibrary = (item, lab = LAB) => lab
  || (!LAB_SHELVES.includes(item?.shelf) && (!item?.template || item.template === DEFAULT_TEMPLATE))
