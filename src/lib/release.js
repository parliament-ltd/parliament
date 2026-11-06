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

// Boards that wait with the Lab (C295; Stefan, 5 November: "let's hide
// library for now until lab is ready"). The Library offers rooms, layouts,
// blocks and themes to build with, and with the Lab away it held one room.
// It leaves the strip, library: and any line that names it say it comes in
// a later release, and a screen kept with it open opens without it. Its
// board, its catalogue and everything stored stay; LAB = true brings it back.
export const WAITING_BOARDS = Object.freeze(['library'])

/** Whether this release offers a board. */
export const boardOffered = (board, lab = LAB) => lab || !WAITING_BOARDS.includes(board)

/** Whether this release offers a command. library: waits with its board. */
export const offered = (verb, lab = LAB) => lab || (!LAB_VERBS.includes(verb) && !WAITING_BOARDS.includes(verb))

// Rooms hidden though someone made them (C288 (a); Stefan, 2 November:
// "let's hide drafting desk for now"): Drafting Desk waits for a room design
// that brings a document back (R39). Its chats still open, as their chat,
// and nothing of it is deleted.
export const HIDDEN_TEMPLATES = Object.freeze(['drafting-desk@1.0'])

/** The template a room someone made came from, as far as its name or description tells. */
const madeFrom = (item) => item?.name?.template ?? item?.aboutTemplate ?? null

/** Whether this release shows an item of the Library's catalogue. */
export const shownInLibrary = (item, lab = LAB) => lab
  || (!LAB_SHELVES.includes(item?.shelf) && (!item?.template || item.template === DEFAULT_TEMPLATE)
    && !(item?.mine && HIDDEN_TEMPLATES.includes(madeFrom(item))))

/**
 * The template a new chat starts in: the one chosen in Settings while this
 * release offers it, else the default room (C288 (a)). A choice kept from
 * before stays stored, and counts again once the Lab is back.
 */
export const newChatTemplate = (chosen, lab = LAB) => (typeof chosen === 'string' && chosen && (lab || chosen === DEFAULT_TEMPLATE) ? chosen : undefined)
