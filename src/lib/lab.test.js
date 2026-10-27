import { describe, it, expect } from 'vitest'
import { setupI18n } from '@lingui/core'
import { planLayoutChange, slotsOf, nameOf } from './lab'
import { preview } from '../chrome/preview'
import { say } from '../chrome/say'
import { shipped, planLabOpen, planLabDone } from '../shell/arrangement'
import { cleanArrangement } from './arrangements'
import { messages as en } from '../locales/en/messages.mjs'

// The Lab, piece 1 (stage 13; C238).

const i18n = setupI18n({ locale: 'en', messages: { en } })
const NAMES = { 'three-panel': 'Three panels', 'canvas-centric': 'Canvas in the middle', 'document-centric': 'Document in the middle', 'single-column-with-sheet': 'One column and a sheet' }
// The four room layouts' slots, as their manifests declare them (src/catalog/layouts).
const SLOTS = {
  'three-panel': [['left-rail', 'stack'], ['msg-area', 'single'], ['input-dock', 'single'], ['right-rail', 'stack'], ['right-rail-extra', 'stack']],
  'canvas-centric': [['left-rail', 'stack'], ['canvas', 'stack'], ['chat-panel', 'stack'], ['inspector', 'stack'], ['input-dock', 'single']],
  'document-centric': [['outline', 'single'], ['document', 'single'], ['margin', 'stack'], ['chat-panel', 'stack']],
  'single-column-with-sheet': [['msg-area', 'single'], ['input-dock', 'single'], ['sheet', 'stack']],
}
const layouts = Object.entries(SLOTS).map(([key, slots]) => ({ ref: `${key}@1.0`, key, name: NAMES[key], slots: slots.map(([id, capacity]) => ({ id, capacity })) }))
const layout = (key) => layouts.find((l) => l.key === key)
// Where these blocks fit, their first choice first, as their manifests say (src/catalog/entries).
const fits = new Map(Object.entries({
  messages: ['msg-area', 'chat-panel'],
  input: ['input-dock', 'msg-area', 'sheet'],
  notes: ['left-rail', 'right-rail', 'right-rail-extra', 'margin', 'sheet'],
  branches: ['left-rail', 'right-rail', 'right-rail-extra', 'margin', 'sheet'],
  context: ['right-rail', 'right-rail-extra', 'left-rail', 'sheet'],
  'chart-canvas': ['canvas', 'msg-area'],
}))
const fitsOf = (b) => fits.get(b) ?? []
const comp = (id, ref, slot, order) => ({ id, ref, slot, order, config: {} })
const studio = {
  id: 'mode_1', scope: 'room', meta: { name: 'Essay room' }, deviceClass: 'visual-pointer',
  layout: { ref: 'three-panel@^1.0' }, scheme: { ref: 'parliament@1.0' },
  components: [
    comp('c1', 'messages@^1.0', 'msg-area', 0), comp('c2', 'input@^1.0', 'input-dock', 1),
    comp('c3', 'notes@^1.0', 'left-rail', 2), comp('c4', 'branches@^1.0', 'right-rail', 3), comp('c5', 'context@^1.0', 'right-rail', 4),
  ],
}

describe('a layout change (refactor-plan.md §4; C238 piece 1)', () => {
  it('keeps each block where the new layout has its place, else its next fit, else takes it out', () => {
    const p = planLayoutChange(studio, layout('single-column-with-sheet'), fitsOf)
    const where = Object.fromEntries(p.components.map((c) => [nameOf(c.ref), c.slot]))
    expect(where).toMatchObject({ messages: 'msg-area', input: 'input-dock', notes: 'sheet', branches: 'sheet', context: 'sheet' })
    expect(p.moved).toEqual([
      { block: 'notes', from: 'left-rail', to: 'sheet' },
      { block: 'branches', from: 'right-rail', to: 'sheet' },
      { block: 'context', from: 'right-rail', to: 'sheet' },
    ])
    expect(p.out).toEqual([])
  })
  it('places the conversation first, in its fallback, and takes out what has no place', () => {
    const p = planLayoutChange(studio, layout('document-centric'), fitsOf)
    const where = Object.fromEntries(p.components.map((c) => [nameOf(c.ref), c.slot]))
    expect(where.messages).toBe('chat-panel')
    // The input block is the bar's dock (C37): it stays, whatever the layout.
    expect(where.input).toBe('input-dock')
    expect(p.out).toEqual([{ block: 'context', from: 'right-rail' }])
  })
  it('fills a slot that holds one only once', () => {
    const two = { ...studio, components: [comp('a', 'messages@^1.0', 'msg-area', 0), comp('b', 'chart-canvas@^1.0', 'msg-area', 1)] }
    const p = planLayoutChange(two, layout('three-panel'), fitsOf)
    expect(p.out).toEqual([{ block: 'chart-canvas', from: 'msg-area' }])
  })
  it('draws the room by slot, with room left', () => {
    const s = slotsOf(studio, layout('three-panel'))
    expect(s.find((x) => x.id === 'right-rail')).toEqual({ id: 'right-rail', capacity: 'stack', blocks: ['branches', 'context'], full: false })
    expect(s.find((x) => x.id === 'msg-area').full).toBe(true)
  })
})

describe('the Lab on the Enter line (C238 piece 1)', () => {
  const lab = { inLab: true, room: { id: 'mode_1', mode: studio, name: 'Essay room' }, here: null, layouts, themes: [{ ref: 'deep-calm@1.0', key: 'deep-calm', name: 'Deep calm' }, { ref: 'parliament@1.0', key: 'parliament', name: 'Parliament' }], rooms: [{ id: 'mode_1', key: 'mode_1', name: 'Essay room' }, { id: 'mode_2', key: 'mode_2', name: 'Writing studio' }], fitsOf }
  const inLab = { ...shipped('lab'), lab: { columns: [['almanac']], popped: [], addressed: 'almanac', bar: { at: 'top', side: 'center', popped: false } } }
  const at = (value, a = inLab, screens = { lab }) => {
    const p = preview(value, { mode: 'command', arrangement: a, screens })
    return { ...p, text: p.says ? say(i18n, p.says.message, p.says.values) : '', also: (p.says?.also ?? []).map((x) => say(i18n, x.message, x.values)) }
  }
  it('changes the layout, saying what moves and what comes out', () => {
    const p = at('>layout:"Document in the middle"')
    expect(p.text).toBe('Enter gives Essay room the layout Document in the middle')
    expect(p.also).toContain('Messages moves from the conversation to the chat panel')
    expect(p.also.some((t) => t.endsWith('has no place in it and comes out of the room; undo: puts it back'))).toBe(true)
    expect(p.act).toMatchObject({ kind: 'roomChange', modeId: 'mode_1', after: { layout: { ref: 'document-centric@1.0' } } })
    expect(at('>layout:"Three panels"').text).toBe('Its layout is Three panels already')
    expect(at('>layout:"Nothing"').text).toBe('No layout is called Nothing. The layouts are Three panels, Canvas in the middle, Document in the middle, and One column and a sheet')
  })
  it('paints it, builds it for a phone, and names it', () => {
    expect(at('>theme:"Deep calm"')).toMatchObject({ text: 'Enter paints Essay room in Deep calm', act: { after: { scheme: { ref: 'deep-calm@1.0' } } } })
    expect(at('>device:mobile')).toMatchObject({ text: 'Enter builds Essay room for a phone: its side panels fold into a sheet', act: { after: { deviceClass: 'visual-touch-phone' } } })
    expect(at('>device:desktop').text).toBe('It is built for a computer already')
    expect(at('>name:"Long essays"')).toMatchObject({ act: { kind: 'roomChange', after: { meta: { name: 'Long essays' } } } })
  })
  it('opens a room by name, makes one, and leaves', () => {
    const out = { ...shipped('almanac') }
    expect(at('>edit:"Writing"', out, { lab: { ...lab, inLab: false } })).toMatchObject({ act: { kind: 'lab', modeId: 'mode_2' } })
    expect(at('>edit:"Nowhere"', out, { lab: { ...lab, inLab: false } }).text).toBe('No room is called Nowhere')
    expect(at('>edit:207', out, { lab: { ...lab, inLab: false } }).act).toBeNull()
    expect(at('>new:room', out, { lab }).act).toEqual({ kind: 'newRoom' })
    expect(at('>done:')).toMatchObject({ act: { kind: 'labDone' } })
    expect(at('>lab:').text).toBe('The Lab is open already')
  })
  it('says the building commands need a room in the Lab', () => {
    expect(at('>theme:"Deep calm"', inLab, { lab: { ...lab, room: null } }).text).toBe('Put a room in the Lab first: edit:"Writing studio" or new:room')
  })
})

describe('opening and leaving the Lab (C238 (a), (c))', () => {
  it('keeps what was on screen, and done: brings it back, through a reload', () => {
    const a = shipped('almanac')
    const opened = planLabOpen(a, 'mode_1').next
    expect(opened.columns).toEqual([['library'], ['canvas'], ['blocks']])
    expect(opened.addressed).toBe('canvas')
    expect(opened.context.canvas).toBe('mode_1')
    const kept = cleanArrangement(JSON.parse(JSON.stringify(opened)))
    expect(kept.lab.columns).toEqual(a.columns)
    const back = planLabDone(kept).next
    expect(back.columns).toEqual(a.columns)
    expect(back.lab).toBeUndefined()
    expect(planLabDone(a).next).toBeNull()
    expect(planLabOpen(opened, 'mode_1').next).toBeNull()
    expect(planLabOpen(opened, 'mode_2').next.context.canvas).toBe('mode_2')
  })
})

describe('features of input in an older room (C238; R24)', () => {
  it('shows them with the input, never as blocks, and keeps them through a layout change', () => {
    const old = { ...studio, components: [...studio.components, comp('w', 'web-search@^1.0', 'input-dock', 9)] }
    const s = slotsOf(old, layout('three-panel'))
    expect(s.find((x) => x.id === 'input-dock')).toMatchObject({ blocks: ['input'], features: ['web-search'] })
    const p = planLayoutChange(old, layout('single-column-with-sheet'), fitsOf)
    expect(p.components.some((c) => c.id === 'w')).toBe(true)
    expect(p.moved.concat(p.out).some((m) => m.block === 'web-search')).toBe(false)
  })
})

describe('duplicate: (C242 (e))', () => {
  const lab = { inLab: false, room: null, here: { id: 'mode_1', name: 'Essay room' }, layouts, themes: [], fitsOf,
    rooms: [{ id: 'mode_1', key: 'mode_1', name: 'Writing studio' }, { id: 'mode_2', key: 'mode_2', name: 'Writing studio 2' }],
    templates: [{ id: 'writing-studio', key: 'writing-studio', name: 'Writing studio' }, { id: 'kingfisher', key: 'kingfisher', name: 'Kingfisher', soon: true }] }
  const at = (value) => {
    const p = preview(value, { mode: 'command', arrangement: shipped('almanac'), screens: { lab } })
    return { ...p, text: p.says ? say(i18n, p.says.message, p.says.values) : '' }
  }
  it('copies your room first, under the next number free', () => {
    expect(at('>duplicate:"Writing studio"')).toMatchObject({
      text: 'Enter copies Writing studio as Writing studio 3 and opens the copy in the Lab. Its chats stay with it',
      act: { kind: 'duplicateRoom', room: 'mode_1', name: 'Writing studio 3' },
    })
  })
  it('copies a template when told to, and not one coming soon', () => {
    expect(at('>duplicate:"Writing studio" template')).toMatchObject({ act: { kind: 'duplicateRoom', template: 'writing-studio', name: 'Writing studio 3' } })
    expect(at('>duplicate:"Kingfisher"').text).toBe('Kingfisher is coming soon, so there is nothing to copy yet')
    expect(at('>duplicate:"Nowhere"').text).toBe('No room or template is called Nowhere')
  })
  it('takes the room on screen when none is named', () => {
    expect(at('>duplicate:').act).toMatchObject({ room: 'mode_1', name: 'Essay room 2' })
  })
})

describe('a room tried in the Lab (C244 (b); C245)', () => {
  it('takes a board of its own, so done: brings back the room that was there', async () => {
    const { planRoom } = await import('../shell/arrangement')
    const a = { ...shipped('almanac'), columns: [['room'], ['almanac']], context: { room: 'chat_216' }, addressed: 'room' }
    const inLab = planLabOpen(a, 'mode_1').next
    const tried = planRoom(inLab, 'chat_225').next
    const board = tried.columns.flat().find((b) => b.startsWith('room'))
    expect(board).toBe('room-2')
    expect(planLabDone(tried).next.context.room).toBe('chat_216')
  })
})
