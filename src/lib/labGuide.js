// The guide (stage 13, piece 4; C244 (d), (e); Lab v7): five questions
// that build a room, each answer a command written into the field for
// Enter to run. Pure: the questions, and what each answer writes and
// whether the room has it already. Web search joins with piece 6.

import { nameOf } from './lab'
import { wordOfBlock } from './labBlocks'

/**
 * The questions in order. `verb` is the command that answers it: the guide
 * moves on when one runs on the room. Each option names what it sets.
 */
export const GUIDE = Object.freeze([
  { id: 'for', verb: 'layout', options: [
    { id: 'writing', layout: 'document-centric' },
    { id: 'talking', layout: 'three-panel' },
    { id: 'data', layout: 'canvas-centric' },
    { id: 'quick', layout: 'single-column-with-sheet' },
  ] },
  { id: 'where', verb: 'device', options: [{ id: 'desk', device: 'desktop' }, { id: 'phone', device: 'mobile' }] },
  { id: 'reach', verb: 'add', options: [
    { id: 'keywordsNotes', blocks: ['highlights', 'notes'] },
    { id: 'branches', blocks: ['branches'] },
    { id: 'context', blocks: ['context'] },
    { id: 'steps', blocks: ['steps'] },
  ] },
  { id: 'feel', verb: 'theme', options: [
    { id: 'soft-violet', theme: 'soft-violet' },
    { id: 'deep-calm', theme: 'deep-calm' },
    { id: 'fresh-teal', theme: 'fresh-teal' },
    { id: 'amber-glow', theme: 'amber-glow' },
  ] },
  { id: 'name', verb: 'name', options: [{ id: 'essay', name: true }, { id: 'thinking', name: true }, { id: 'dataDesk', name: true }, { id: 'own', own: true }] },
].map((q) => Object.freeze(q)))

const DEVICES = { desktop: 'visual-pointer', mobile: 'visual-touch-phone' }

/**
 * What an option writes in the field, and whether the room has it already.
 * @param {object} option
 * @param {{ mode: object, layouts: Array<{ key: string, name: string }>, themes: Array<{ key: string, name: string }>, nameWords?: string }} s
 *   nameWords: the option's name in the reader's language, for a name option
 * @returns {{ command: string|null, already: boolean }}
 */
export function optionOf(option, { mode, layouts = [], themes = [], nameWords = '' }) {
  if (option.layout) {
    const l = layouts.find((x) => x.key === option.layout)
    return { command: l ? `layout:"${l.name}"` : null, already: nameOf(mode?.layout?.ref) === option.layout }
  }
  if (option.device) return { command: `device:${option.device}`, already: (mode?.deviceClass ?? 'visual-pointer') === DEVICES[option.device] }
  if (option.blocks) {
    const here = new Set((mode?.components ?? []).map((c) => nameOf(c.ref)))
    return { command: `add:${option.blocks.map(wordOfBlock).join(', ')}`, already: option.blocks.every((b) => here.has(b)) }
  }
  if (option.theme) {
    const t = themes.find((x) => x.key === option.theme)
    return { command: t ? `theme:"${t.name}"` : null, already: nameOf(mode?.scheme?.ref) === option.theme }
  }
  if (option.own) return { command: 'name:"', already: false }
  return { command: `name:"${nameWords}"`, already: (mode?.meta?.name ?? '') === nameWords }
}

/** The verb a command line begins with: 'theme:"Deep calm"' → 'theme'. */
export const verbOf = (line) => /^\s*>?\s*-?([a-z]+):/i.exec(String(line ?? ''))?.[1]?.toLowerCase() ?? null

/** The guide after a command ran on its room: the next question when that one was answered. */
export function guideAfter(guide, modeId, line) {
  if (!guide || guide.room !== modeId) return guide
  const q = GUIDE[guide.step]
  return q && q.verb === verbOf(line) ? { ...guide, step: guide.step + 1 } : guide
}
