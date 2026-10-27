import { describe, it, expect } from 'vitest'
import { setupI18n } from '@lingui/core'
import { nameOf } from './lab'
import { BLOCK_SETTINGS, findBlock, valueOf, wordOfBlock, slotForWord } from './labBlocks'
import { preview } from '../chrome/preview'
import { say } from '../chrome/say'
import { shipped } from '../shell/arrangement'
import { messages as en } from '../locales/en/messages.mjs'

// The Blocks board's commands (stage 13, piece 2; C240). Fixture layouts and
// fits, as the manifests declare them; the catalogue cannot load in tests.

const i18n = setupI18n({ locale: 'en', messages: { en } })
const SLOTS = {
  'three-panel': [['left-rail', 'stack'], ['msg-area', 'single'], ['input-dock', 'single'], ['right-rail', 'stack'], ['right-rail-extra', 'stack']],
  'document-centric': [['outline', 'single'], ['document', 'single'], ['margin', 'stack'], ['chat-panel', 'stack']],
}
const layouts = Object.entries(SLOTS).map(([key, slots]) => ({ ref: `${key}@1.0`, key, name: key === 'three-panel' ? 'Three panels' : 'Document in the middle', slots: slots.map(([id, capacity]) => ({ id, capacity })) }))
const fits = new Map(Object.entries({
  messages: ['msg-area', 'chat-panel'],
  input: ['input-dock', 'msg-area', 'sheet'],
  notes: ['left-rail', 'right-rail', 'right-rail-extra', 'margin', 'sheet'],
  highlights: ['left-rail', 'right-rail', 'right-rail-extra', 'margin', 'sheet'],
  branches: ['left-rail', 'right-rail', 'right-rail-extra', 'margin', 'sheet'],
  context: ['right-rail', 'right-rail-extra', 'left-rail', 'sheet'],
  toc: ['left-rail', 'right-rail', 'right-rail-extra', 'sheet', 'margin'],
  steps: ['right-rail', 'left-rail', 'right-rail-extra', 'sheet'],
  'chart-canvas': ['canvas', 'msg-area'],
  'document-canvas': ['document'],
}))
const fitsOf = (b) => fits.get(b) ?? []
const blocks = [...fits.keys(), 'web-search'].map((key) => ({ key, name: { highlights: 'Keywords', toc: 'Table of contents', context: 'Context health', 'chart-canvas': 'Chart canvas', 'document-canvas': 'Document canvas' }[key] ?? key[0].toUpperCase() + key.slice(1) }))
const comp = (id, ref, slot, order, config = {}) => ({ id, ref, slot, order, config })
const studio = {
  id: 'mode_1', scope: 'room', meta: { name: 'Essay room' }, layout: { ref: 'three-panel@^1.0' }, scheme: { ref: 'parliament@1.0' },
  components: [
    comp('c1', 'messages@^1.0', 'msg-area', 0), comp('c2', 'input@^1.0', 'input-dock', 1),
    comp('c3', 'notes@^1.0', 'left-rail', 2), comp('c4', 'branches@^1.0', 'right-rail', 3), comp('c5', 'context@^1.0', 'right-rail', 4, { displayMode: 'compact' }),
  ],
}
const labOf = (mode = studio) => ({ inLab: true, room: { id: 'mode_1', mode, name: 'Essay room' }, layouts, themes: [], rooms: [], fitsOf, blocks })
const inLab = (addressed = 'blocks') => ({ ...shipped('lab'), addressed, lab: { columns: [['almanac']], popped: [], addressed: 'almanac', bar: { at: 'top', side: 'center', popped: false } } })
const at = (value, { mode = studio, a = inLab() } = {}) => {
  const p = preview(value, { mode: 'command', arrangement: a, screens: { lab: labOf(mode) } })
  return { ...p, text: p.says ? say(i18n, p.says.message, p.says.values) : '', also: (p.says?.also ?? []).map((x) => say(i18n, x.message, x.values)) }
}
const where = (m) => Object.fromEntries(m.components.map((c) => [nameOf(c.ref), c.slot]))

describe('naming a block (C240 (b))', () => {
  it('takes its short word, its name or its start', () => {
    expect(findBlock('keywords', blocks).found.key).toBe('highlights')
    expect(findBlock('contents', blocks).found.key).toBe('toc')
    expect(findBlock('Table of contents', blocks).found.key).toBe('toc')
    expect(findBlock('chart', blocks).found.key).toBe('chart-canvas')
    expect(findBlock('web-search', blocks).none).toBe(true)
    expect(wordOfBlock('highlights')).toBe('keywords')
    expect(wordOfBlock('notes')).toBe('notes')
  })
  it('reads a place by its word in the layout', () => {
    expect(slotForWord('right', layouts[0])).toBe('right-rail')
    expect(slotForWord('right', layouts[1])).toBe('margin')
    expect(slotForWord('left', layouts[1])).toBe('outline')
    expect(slotForWord('canvas', layouts[0])).toBeNull()
  })
  it('shows the fourteen settings something reads', () => {
    expect(BLOCK_SETTINGS).toHaveLength(14)
    expect(valueOf(BLOCK_SETTINGS.find((s) => s.key === 'displayMode'), { displayMode: 'nonsense' })).toBe('meter')
  })
})

describe('add: and rm: in the Lab (C240; C63)', () => {
  it('puts a block in its first free place, one of each', () => {
    const p = at('>add:keywords')
    expect(p.text).toBe('Enter puts Keywords in the left rail')
    expect(where(p.act.after).highlights).toBe('left-rail')
    expect(p.act.after.components.map((c) => c.order)).toEqual([0, 1, 2, 3, 4, 5])
    expect(at('>add:notes').text).toBe('Notes is in the room already. place: moves it')
    expect(at('>add:nothing').text).toBe('No block is called nothing. The Library lists them')
    const two = at('>add:keywords, contents')
    expect(two.text).toBe('Enter puts Keywords and Table of contents in the room')
    expect(two.also).toEqual(['Keywords goes in the left rail', 'Table of contents goes in the left rail'])
  })
  it('refuses a block with no free place', () => {
    expect(at('>add:chart').text).toBe('Chart canvas has no free place in Three panels')
  })
  it('takes a block out, but never messages or input', () => {
    const p = at('>rm:context')
    expect(p.text).toBe('Enter takes Context health out of the room. The Library keeps it')
    expect(p.act.after.components.some((c) => c.ref.startsWith('context'))).toBe(false)
    expect(at('>rm:messages').text).toBe('Messages stays: every room has it')
    expect(at('>rm:keywords').text).toBe('Keywords is not in the room. add: puts it there')
  })
  it('leaves the Collection its add: when the Lab is not addressed', () => {
    expect(at('>add:keywords', { a: inLab('almanac') }).act?.kind).not.toBe('roomChange')
  })
})

describe('place: (C240 (c))', () => {
  it('moves a block to a slot by a word', () => {
    const p = at('>place:notes right')
    expect(p.text).toBe('Enter moves Notes from the left rail to the right rail')
    expect(where(p.act.after).notes).toBe('right-rail')
  })
  it('allows a place it is not built for, saying so, and refuses a full one', () => {
    expect(at('>place:messages extra').text).toBe('Enter moves Messages from the conversation to the lower right rail. It is not built for there and may be cramped')
    expect(at('>place:notes middle').text).toBe('Only one block fits in the conversation, and it has one. Move that first')
    expect(at('>place:notes canvas').text).toBe('Three panels has no place called canvas. Its places are left, middle, bottom, right, and extra')
    expect(at('>place:notes left').text).toBe('Notes is in the left rail already')
  })
  it('reorders within a slot', () => {
    const p = at('>place:context up')
    expect(p.text).toBe('Enter moves Context health up in its slot')
    const right = p.act.after.components.filter((c) => c.slot === 'right-rail').sort((x, y) => x.order - y.order).map((c) => nameOf(c.ref))
    expect(right).toEqual(['context', 'branches'])
    expect(at('>place:context down').text).toBe('Context health is last in its slot already')
    expect(at('>place:branches up').text).toBe('Branches is first in its slot already')
  })
  it('needs the Lab', () => {
    const room = { ...shipped('almanac'), addressed: 'room-1' }
    expect(at('>place:notes right', { a: room }).act ?? null).toBeNull()
  })
})

describe('set: a block (C240 (a), (b))', () => {
  it('sets a choice, a switch and a number', () => {
    const p = at('>set:notes order oldest')
    expect(p.text).toBe('Enter sets order of Notes to oldest')
    expect(p.act.after.components.find((c) => c.id === 'c3').config).toEqual({ sortOrder: 'oldest' })
    expect(at('>set:branches parent off').act.after.components.find((c) => c.id === 'c4').config).toEqual({ showParentLink: false })
    expect(at('>set:context threshold 80').act.after.components.find((c) => c.id === 'c5').config).toEqual({ displayMode: 'compact', contextThreshold: 80 })
  })
  it('says what it takes', () => {
    expect(at('>set:context display compact').text).toBe('display of Context health is compact already')
    expect(at('>set:context threshold 5').text).toBe('threshold takes a whole number from 10 to 100')
    expect(at('>set:notes order sideways').text).toBe('order takes newest, oldest, or message')
    expect(at('>set:notes colour red').text).toBe('Which setting of Notes: order?')
    expect(at('>set:messages density tight').text).toBe('Messages has no settings to change')
  })
  it('pins the step list when it is given a plan', () => {
    const withSteps = { ...studio, components: [...studio.components, comp('c6', 'steps@^1.0', 'right-rail', 5)] }
    expect(at('>set:steps plan 201', { mode: withSteps }).act.after.components.find((c) => c.id === 'c6').config).toEqual({ follow: 'a pinned plan', plan: 201 })
  })
})
