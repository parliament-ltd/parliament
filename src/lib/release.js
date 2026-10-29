// What this release offers (C279 (a)). The first public release is the
// default room, Writing Studio, with everything it holds, and the boards; the
// Lab and the other rooms wait until they are designed. Nothing is deleted:
// anything someone has already made still opens, and only making new rooms
// waits. LAB = true brings the Lab, its commands and every room back.

export const LAB = false

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
