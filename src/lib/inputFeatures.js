// Features of input (stage 13, piece 6; C248; R24): web search, voice and
// files, each on or off for a room as its input block's settings, carried
// by the bar in prompt mode. Pure.

import { formatTextAttachmentForMessage, attachmentToContentBlock } from './fileUpload'

const nameOf = (ref) => String(ref ?? '').split('@')[0]

/** The three, as the input block's config keys, with the old block that meant each. */
export const FEATURES = Object.freeze([
  { key: 'webSearch', word: 'web', legacy: 'web-search' },
  { key: 'voice', word: 'voice', legacy: 'voice-input' },
  { key: 'files', word: 'files', legacy: 'file-attach' },
])

/**
 * Which features a room has (C248 (a)): the input block's own setting where
 * it has one, else whether the room has the old block for it. With no room
 * yet (a new chat's first prompt), all three.
 * @param {object|null} mode
 * @returns {{ webSearch: boolean, voice: boolean, files: boolean }}
 */
export function featuresOf(mode) {
  if (!mode) return { webSearch: true, voice: true, files: true }
  const comps = mode.components ?? []
  const config = comps.find((c) => nameOf(c.ref) === 'input')?.config ?? {}
  const blocks = new Set(comps.map((c) => nameOf(c.ref)))
  return Object.fromEntries(FEATURES.map((f) => [f.key, typeof config[f.key] === 'boolean' ? config[f.key] : blocks.has(f.legacy)]))
}

/** Whether a feature is on where the input block has no setting of its own: the old block's being there. */
export const legacyOn = (key, mode) => {
  const f = FEATURES.find((x) => x.key === key)
  return Boolean(f) && (mode?.components ?? []).some((c) => nameOf(c.ref) === f.legacy)
}

/** Whether a file is text (it goes inside the prompt) or an image or PDF (a part of this send only). */
export const isTextFile = (file) => file?.category === 'text'

/**
 * A prompt's words and its held files, as one send to one answerer
 * (C248 (d)): text files inside the words, kept with the message; images
 * and PDFs as parts of this send only, to one who reads them; a source
 * the words alone.
 * @param {string} text
 * @param {object[]} files read by fileUpload.readUploadedFile
 * @param {{ source?: boolean, readsFiles?: boolean }} who
 * @returns {{ content: string, attachments: { parts: object[], meta: object[] }|null, out: string[] }}
 */
export function packFiles(text, files = [], { source = false, readsFiles = false } = {}) {
  if (source || !files.length) return { content: text, attachments: null, out: source ? files.map((f) => f.name) : [] }
  const texts = files.filter(isTextFile)
  const binary = files.filter((f) => !isTextFile(f))
  const going = readsFiles ? binary : []
  const blocks = texts.map((f) => formatTextAttachmentForMessage(f)).join('\n\n')
  const content = text ? (blocks ? `${text}\n\n${blocks}` : text) : blocks
  const sent = [...texts, ...going]
  const parts = going.map((f) => attachmentToContentBlock(f)).filter(Boolean)
  const meta = sent.map((f) => ({ id: f.id, name: f.name, category: f.category, mimeType: f.mimeType, size: f.size }))
  return { content, attachments: meta.length ? { parts, meta } : null, out: readsFiles ? [] : binary.map((f) => f.name) }
}

/** At most this many files held for one prompt, as today's composer allows. */
export { MAX_ATTACHMENTS_PER_MESSAGE as MOST_FILES } from './fileUpload'

/**
 * web: and web:off (C248 (b)): web search held for the next prompt only.
 * screens.input: { room, offered, canSearch, who, held: { web, files } }.
 */
export function planWeb(step, screens = {}) {
  const inp = screens.input
  if (!inp) return { says: { message: 'later', values: { verb: 'web:' } }, act: null }
  const off = step.match?.values?.[0]?.value === 'off'
  if (off) {
    if (!inp.held?.web) return { says: { message: 'webNoneHeld' }, act: null }
    return { says: { message: 'webDrop' }, act: { kind: 'webHold', on: false } }
  }
  if (!inp.offered?.webSearch) return { says: { message: 'webNotHere', values: { room: inp.room ?? '' } }, act: null }
  if (!inp.canSearch) return { says: { message: 'webCannot', values: { name: inp.who ?? '' } }, act: null }
  if (inp.held?.web) return { says: { message: 'webAlready' }, act: null }
  return { says: { message: 'webHoldGo', values: { name: inp.who ?? '' } }, act: { kind: 'webHold', on: true } }
}

/** attach: (C248 (d)): the file picker, the files held for the next prompt. */
export function planAttach(step, screens = {}, most = 10) {
  const inp = screens.input
  if (!inp) return { says: { message: 'later', values: { verb: 'attach:' } }, act: null }
  if (!inp.offered?.files) return { says: { message: 'attachNotHere', values: { room: inp.room ?? '' } }, act: null }
  if ((inp.held?.files ?? 0) >= most) return { says: { message: 'attachFull', values: { most } }, act: null }
  return { says: { message: 'attachGo' }, act: { kind: 'attachPick' } }
}
