// The Blocks board's commands (stage 13, piece 2; Lab v7; C238, C240).
// Pure, like lab.js: what each would do to the room on the Canvas, for the
// Enter line, and the room after. The shell saves it and keeps the room
// before for undo:.
//
//   add:keywords              into its first free place
//   rm:keywords               out of the room; the Library keeps it
//   place:keywords right      into a slot of the layout, by a word
//   place:keywords up         earlier in its slot (down: later)
//   set:notes order oldest    one of the settings something reads (C240 (a))
//
// The blocks the room can take come from the catalogue (screens.lab.blocks:
// { key, name }), where each fits from screens.lab.fitsOf.

import { nameOf, FEATURES } from './lab'

const STAYS = new Set(['messages', 'input'])

// The words for a block, as a command takes them, besides its name (C240 (b)).
const BLOCK_WORDS = Object.freeze({
  keywords: 'highlights', chart: 'chart-canvas', table: 'table-canvas', contents: 'toc', files: 'file-shelf',
  dashboard: 'summary-dashboard', inspector: 'column-inspector', document: 'document-canvas', comments: 'claude-comments',
  ripple: 'ripple-analysis', frameworks: 'collab-mode',
})

/**
 * The settings the Blocks board shows and set: takes: those something reads
 * (C240 (a)). Each: the block, its config key, the word set: takes, and its
 * kind: a switch (on, off), a choice (word → value) or a number (min, max).
 */
export const BLOCK_SETTINGS = Object.freeze([
  { block: 'branches', key: 'showParentLink', word: 'parent', kind: 'switch', fallback: true },
  { block: 'branches', key: 'defaultBranchMode', word: 'mode', kind: 'choice', choices: { full: 'full-history', summary: 'compressed-summary' }, fallback: 'full-history' },
  { block: 'branches', key: 'showCompressButton', word: 'compress', kind: 'switch', fallback: true },
  { block: 'branches', key: 'contextThreshold', word: 'threshold', kind: 'number', min: 10, max: 100, presets: [50, 75, 90], fallback: 75 },
  { block: 'chart-canvas', key: 'chartType', word: 'kind', kind: 'choice', choices: { bar: 'bar', line: 'line', area: 'area', scatter: 'scatter', pie: 'pie' }, fallback: 'bar' },
  { block: 'context', key: 'contextThreshold', word: 'threshold', kind: 'number', min: 10, max: 100, presets: [50, 75, 90], fallback: 75 },
  { block: 'context', key: 'displayMode', word: 'display', kind: 'choice', choices: { meter: 'meter', compact: 'compact', ambient: 'ambient' }, fallback: 'meter' },
  { block: 'notes', key: 'sortOrder', word: 'order', kind: 'choice', choices: { newest: 'newest', oldest: 'oldest', message: 'message-order' }, fallback: 'newest' },
  { block: 'steps', key: 'show', word: 'show', kind: 'choice', choices: { run: 'this run', all: 'all runs' }, fallback: 'this run' },
  { block: 'steps', key: 'follow', word: 'follow', kind: 'choice', choices: { chat: 'this chat', plan: 'a pinned plan' }, fallback: 'this chat' },
  { block: 'steps', key: 'plan', word: 'plan', kind: 'number', min: 1, max: 999_999, presets: [], fallback: 0 },
  { block: 'toc', key: 'mode', word: 'lists', kind: 'choice', choices: { prompts: 'user-prompts', headings: 'response-headings' }, fallback: 'user-prompts' },
  { block: 'toc', key: 'maxItems', word: 'most', kind: 'number', min: 5, max: 500, presets: [20, 50, 100], fallback: 50 },
  { block: 'toc', key: 'truncateAt', word: 'cut', kind: 'number', min: 20, max: 200, presets: [40, 60, 100], fallback: 60 },
].map((s) => Object.freeze(s)))

/** The settings a block shows, in order. */
export const settingsOf = (block) => BLOCK_SETTINGS.filter((s) => s.block === block)

/** A setting's value in a room's block, as it stands (its default when unset). */
export function valueOf(setting, config) {
  const v = config?.[setting.key]
  if (setting.kind === 'switch') return v === undefined ? setting.fallback : v !== false
  if (setting.kind === 'choice') return Object.values(setting.choices).includes(v) ? v : setting.fallback
  return typeof v === 'number' && Number.isFinite(v) ? v : setting.fallback
}

/** The word set: takes for a value, the inverse of a choice. */
export const wordOfValue = (setting, value) => (setting.kind === 'switch' ? (value ? 'on' : 'off')
  : setting.kind === 'choice' ? Object.entries(setting.choices).find(([, v]) => v === value)?.[0] ?? String(value)
    : String(value))

// Where a word places a block, in the room's layout: the first of its slots there (C240 (c)).
const WHERE = Object.freeze({
  left: ['left-rail', 'outline'], right: ['right-rail', 'margin', 'chat-panel'], extra: ['right-rail-extra'],
  middle: ['msg-area', 'canvas', 'document'], bottom: ['input-dock', 'sheet'], panel: ['chat-panel'], margin: ['margin'],
  sheet: ['sheet'], outline: ['outline'], canvas: ['canvas'], document: ['document'], inspector: ['inspector'],
})
const SLOT_WORD = Object.freeze({
  'left-rail': 'left', 'right-rail': 'right', 'right-rail-extra': 'extra', 'msg-area': 'middle', 'input-dock': 'bottom',
  canvas: 'canvas', 'chat-panel': 'panel', inspector: 'inspector', outline: 'outline', document: 'document', margin: 'margin', sheet: 'sheet',
})

/** The slot a word names in a layout, or null. */
export const slotForWord = (word, layout) => (WHERE[word] ?? []).find((id) => (layout?.slots ?? []).some((s) => s.id === id)) ?? null

/** The word place: takes for a slot. */
export const wordForSlot = (slot) => SLOT_WORD[slot] ?? slot

const words = (s) => String(s ?? '').trim().toLocaleLowerCase()
const room = (screens) => screens.lab?.room ?? null
const layoutOf = (screens) => {
  const r = room(screens)
  return (screens.lab?.layouts ?? []).find((l) => l.key === nameOf(r?.mode?.layout?.ref)) ?? null
}
const blocksIn = (mode) => (mode?.components ?? []).map((c) => nameOf(c.ref))
const change = (r, after) => ({ kind: 'roomChange', modeId: r.id, before: r.mode, after })

/** The short word a command takes for a block: keywords, chart, contents; else its key. */
export const wordOfBlock = (key) => Object.entries(BLOCK_WORDS).find(([, k]) => k === key)?.[0] ?? key

/** A block by what was typed: its word, its key or its name, exactly or by its start. */
export function findBlock(typed, blocks) {
  const w = words(typed)
  if (!w) return { none: true }
  const list = (blocks ?? []).filter((b) => !FEATURES.includes(b.key))
  const exact = list.filter((b) => b.key === w || BLOCK_WORDS[w] === b.key || words(b.name) === w)
  if (exact.length) return { found: exact[0] }
  const start = list.filter((b) => words(b.name).startsWith(w) || b.key.startsWith(w))
  if (start.length === 1) return { found: start[0] }
  return start.length ? { many: start } : { none: true }
}

const said = (v) => String(v?.text ?? v?.value ?? '').replace(/^"([\s\S]*)"$/, '$1').trim()
const listOf = (vals) => vals.flatMap((v) => (v?.kind === 'list' ? v.items : [v]))

// The room, its layout and the block named, or why not.
function named(step, screens, at = 0) {
  const r = room(screens)
  if (!r) return { bad: { message: 'labNoRoom' } }
  const layout = layoutOf(screens)
  if (!layout) return { bad: { message: 'blocksNoLayout' } }
  const typed = said(listOf(step.match?.values ?? [])[at])
  const got = findBlock(typed, screens.lab.blocks)
  if (got.many) return { bad: { message: 'blockMany', values: { names: got.many.map((b) => b.name) } } }
  if (!got.found) return { bad: { message: 'blockNone', values: { said: typed } } }
  return { r, layout, block: got.found }
}

// The room's components with the block in a slot, at the end of it, orders renumbered.
function withBlockIn(mode, comp, slot) {
  const rest = (mode.components ?? []).filter((c) => c.id !== comp.id)
  const placed = { ...comp, slot }
  return [...rest, placed].map((c, i) => ({ ...c, order: i }))
}

const hasRoom = (layout, mode, slot, except = null) => {
  const s = layout.slots.find((x) => x.id === slot)
  if (!s) return false
  if (s.capacity !== 'single') return true
  return !(mode.components ?? []).some((c) => c.slot === slot && c.id !== except && !FEATURES.includes(nameOf(c.ref)))
}

// Each block a command names, in order, or why not.
function namedAll(step, screens) {
  const r = room(screens)
  if (!r) return { bad: { message: 'labNoRoom' } }
  const layout = layoutOf(screens)
  if (!layout) return { bad: { message: 'blocksNoLayout' } }
  const found = []
  for (const v of listOf(step.match?.values ?? [])) {
    const typed = said(v)
    const got = findBlock(typed, screens.lab.blocks)
    if (got.many) return { bad: { message: 'blockMany', values: { names: got.many.map((b) => b.name) } } }
    if (!got.found) return { bad: { message: 'blockNone', values: { said: typed } } }
    if (!found.includes(got.found)) found.push(got.found)
  }
  return { r, layout, blocks: found }
}

const one = (list, message) => (list.length === 1 ? { message, values: { block: list[0] } } : { message: `${message}Many`, values: { blocks: list } })

/** add:keywords, add:highlights, notes: each into its first free place (C63: one of each). */
export function planAddBlock(step, screens = {}) {
  const n = namedAll(step, screens)
  if (n.bad) return { says: n.bad, act: null }
  const { r, layout, blocks } = n
  let mode = r.mode
  const added = []
  for (const block of blocks) {
    if (blocksIn(mode).includes(block.key)) return { says: { message: 'blockThere', values: { block: block.key } }, act: null }
    const slot = (screens.lab.fitsOf?.(block.key) ?? []).find((s) => hasRoom(layout, mode, s))
    if (!slot) return { says: { message: 'blockNoPlace', values: { block: block.key, name: layout.name } }, act: null }
    const comp = { id: `comp_${crypto.randomUUID()}`, ref: `${block.key}@^1.0`, slot, order: 0, config: {} }
    mode = { ...mode, components: withBlockIn(mode, comp, slot) }
    added.push({ block: block.key, toSlot: slot })
  }
  const says = added.length === 1 ? { message: 'blockAdd', values: added[0] }
    : { message: 'blockAddMany', values: { blocks: added.map((x) => x.block) }, also: added.map((x) => ({ message: 'blockGoesTo', values: x })) }
  return { says, act: change(r, mode) }
}

/** rm:keywords: out of the room, the Library keeping it; messages and input stay. */
export function planRmBlock(step, screens = {}) {
  const n = namedAll(step, screens)
  if (n.bad) return { says: n.bad, act: null }
  const { r, blocks } = n
  for (const block of blocks) {
    if (STAYS.has(block.key)) return { says: { message: 'blockStays', values: { block: block.key } }, act: null }
    if (!blocksIn(r.mode).includes(block.key)) return { says: { message: 'blockNotThere', values: { block: block.key } }, act: null }
  }
  const out = new Set(blocks.map((b) => b.key))
  const components = (r.mode.components ?? []).filter((c) => !out.has(nameOf(c.ref))).map((c, i) => ({ ...c, order: i }))
  return { says: one(blocks.map((b) => b.key), 'blockRm'), act: change(r, { ...r.mode, components }) }
}

/** place:keywords right, place:keywords up. */
export function planPlace(step, screens = {}) {
  const vals = step.match?.values ?? []
  if (vals[0]?.kind === 'list') return { says: { message: 'placeOne' }, act: null }
  const n = named(step, screens)
  if (n.bad) return { says: n.bad, act: null }
  const { r, layout, block } = n
  const comp = (r.mode.components ?? []).find((c) => nameOf(c.ref) === block.key)
  if (!comp) return { says: { message: 'blockNotThere', values: { block: block.key } }, act: null }
  const where = vals.length > 1 ? String(vals[vals.length - 1]?.value ?? '') : ''
  if (!where) return { says: { message: 'placeWhere', values: { block: block.key } }, act: null }
  if (where === 'up' || where === 'down') {
    const same = (r.mode.components ?? []).filter((c) => c.slot === comp.slot).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    const i = same.findIndex((c) => c.id === comp.id)
    const j = where === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= same.length) return { says: { message: where === 'up' ? 'placeFirst' : 'placeLast', values: { block: block.key } }, act: null }
    const swapped = [...same]
    ;[swapped[i], swapped[j]] = [swapped[j], swapped[i]]
    // The slot's places in the room's order keep their places; the two swap.
    let k = 0
    const ordered = [...(r.mode.components ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((c) => (c.slot === comp.slot ? swapped[k++] : c))
    return { says: { message: where === 'up' ? 'placeUp' : 'placeDown', values: { block: block.key } }, act: change(r, { ...r.mode, components: ordered.map((c, k) => ({ ...c, order: k })) }) }
  }
  const slot = slotForWord(where, layout)
  if (!slot) return { says: { message: 'placeNoSlot', values: { where, name: layout.name, choices: layout.slots.map((s) => wordForSlot(s.id)) } }, act: null }
  if (slot === comp.slot) return { says: { message: 'placeSame', values: { block: block.key, toSlot: slot } }, act: null }
  if (!hasRoom(layout, r.mode, slot, comp.id)) return { says: { message: 'placeFull', values: { toSlot: slot } }, act: null }
  const built = (screens.lab.fitsOf?.(block.key) ?? []).includes(slot)
  return {
    says: { message: built ? 'placeGo' : 'placeCramped', values: { block: block.key, fromSlot: comp.slot, toSlot: slot } },
    act: change(r, { ...r.mode, components: withBlockIn(r.mode, comp, slot) }),
  }
}

/** set:notes order oldest: one setting of a block in the room (C240 (a), (b)). */
export function planSetBlock(step, screens = {}) {
  const vals = step.match?.values ?? []
  const n = named(step, screens)
  if (n.bad) return { says: n.bad, act: null }
  const { r, block } = n
  const comp = (r.mode.components ?? []).find((c) => nameOf(c.ref) === block.key)
  if (!comp) return { says: { message: 'blockNotThere', values: { block: block.key } }, act: null }
  const rest = vals.slice(1).map((v) => said(v)).join(' ').trim().split(/\s+/).filter(Boolean)
  const settings = settingsOf(block.key)
  if (!settings.length) return { says: { message: 'setBlockNone', values: { block: block.key } }, act: null }
  const setting = settings.find((s) => s.word === words(rest[0]))
  if (!setting) return { says: { message: 'setBlockWhich', values: { block: block.key, words: settings.map((s) => s.word) } }, act: null }
  const typed = words(rest.slice(1).join(' '))
  let value
  if (setting.kind === 'switch') {
    if (typed !== 'on' && typed !== 'off') return { says: { message: 'setBlockSwitch', values: { word: setting.word } }, act: null }
    value = typed === 'on'
  } else if (setting.kind === 'choice') {
    if (!Object.hasOwn(setting.choices, typed)) return { says: { message: 'setBlockChoice', values: { word: setting.word, words: Object.keys(setting.choices) } }, act: null }
    value = setting.choices[typed]
  } else {
    const num = Number(typed)
    if (!Number.isInteger(num) || num < setting.min || num > setting.max) return { says: { message: 'setBlockNumber', values: { word: setting.word, min: setting.min, max: setting.max } }, act: null }
    value = num
  }
  if (valueOf(setting, comp.config) === value) return { says: { message: 'setBlockSame', values: { block: block.key, word: setting.word, value: wordOfValue(setting, value) } }, act: null }
  // A pinned plan's number pins the step list to it (C202).
  const extra = block.key === 'steps' && setting.key === 'plan' ? { follow: 'a pinned plan' } : {}
  const components = (r.mode.components ?? []).map((c) => (c.id === comp.id ? { ...c, config: { ...(c.config ?? {}), ...extra, [setting.key]: value } } : c))
  return {
    says: { message: 'setBlockGo', values: { block: block.key, word: setting.word, value: wordOfValue(setting, value) } },
    act: change(r, { ...r.mode, components }),
  }
}
