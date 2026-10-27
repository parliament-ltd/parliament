// The Lab (stage 13, piece 1; the arrangements spec §5; Lab v7; C238, ruled
// 27 October). Pure: what each command that changes a room would do, for
// the Enter line, and the room as it would be after. The shell saves it
// (every command saves, A10) and keeps the room before for undo:.
//
//   lab:                 the Lab, with the room on screen in it
//   edit:"Reading room"  a room by its name, in the Lab
//   new:room             a new room, in the Lab
//   done:                back to what was on screen before
//   layout:"Three panels"  the room's shape: each block keeps its place where
//                        it has room, else its next fit, else comes out
//   theme:"Deep calm"    its colours and type
//   device:mobile        what it is built for
//   name:"Essay room"    in the Lab, names the room there
//
// The layout manifests are the one list of slots and their capacity
// (refactor-plan.md §4; R36). Rooms, layouts and themes come from the
// screens the shell gives (screens.lab): { inLab, room, here, layouts,
// themes, rooms, fitsOf }.

import { cleanRoomName, ROOM_NAME_MAX } from './roomNames'

/** A block's or layout's name from its ref: 'messages@^1.0' → 'messages'. */
export const nameOf = (ref) => String(ref ?? '').split('@')[0]

// The conversation must have a place; the input block is the bar's dock and
// stays whatever the layout (C37), so it never comes out.
const KEPT = 'input'
const NEEDED = 'messages'

/**
 * A layout change (refactor-plan.md §4): each block keeps its slot when the
 * new layout has it and room in it, else takes its next fit, else comes out.
 * The conversation is placed first.
 * @param {{ components: Array<{ id: string, ref: string, slot: string, order?: number }> }} mode
 * @param {{ ref: string, slots: Array<{ id: string, capacity: string }> }} layout
 * @param {(block: string) => string[]} fitsOf a block's slots, its first choice first
 * @returns {{ components: object[], moved: Array<{ block: string, from: string, to: string }>, out: Array<{ block: string, from: string }> }|{ refused: string }}
 */
export function planLayoutChange(mode, layout, fitsOf) {
  const slots = new Map((layout?.slots ?? []).map((s) => [s.id, s]))
  const used = new Map()
  const hasRoom = (id) => slots.has(id) && (slots.get(id).capacity !== 'single' || !used.get(id))
  const comps = [...(mode?.components ?? [])].sort((a, b) => (nameOf(a.ref) === NEEDED ? -1 : 0) - (nameOf(b.ref) === NEEDED ? -1 : 0) || (a.order ?? 0) - (b.order ?? 0))
  const components = []
  const moved = []
  const out = []
  for (const c of comps) {
    const block = nameOf(c.ref)
    // A feature of input goes where the input goes: it is no block of its own.
    if (FEATURES.includes(block)) { components.push(c); continue }
    const to = [c.slot, ...(fitsOf(block) ?? []).filter((s) => s !== c.slot)].find(hasRoom)
    if (to) {
      used.set(to, (used.get(to) ?? 0) + 1)
      components.push(to === c.slot ? c : { ...c, slot: to })
      if (to !== c.slot) moved.push({ block, from: c.slot, to })
      continue
    }
    if (block === NEEDED) return { refused: 'layoutNoMessages' }
    if (block === KEPT) { components.push(c); continue }
    out.push({ block, from: c.slot })
  }
  // In each slot, the order they had.
  const order = new Map(comps.map((c, i) => [c.id, i]))
  components.sort((a, b) => order.get(a.id) - order.get(b.id))
  return { components: components.map((c, i) => ({ ...c, order: i })), moved, out }
}

/**
 * The room by slot, as the Canvas draws it: each slot of its layout with its
 * blocks, and whether there is room for more ("single" holds one); the
 * input's slot also with the features of input the room has.
 * @returns {Array<{ id: string, capacity: string, blocks: string[], full: boolean, features?: string[] }>}
 */
// Web search, voice input and attaching files are features of input, not
// blocks of their own (the arrangements spec §2; C128; R24), wherever an
// older room keeps them.
export const FEATURES = Object.freeze(['web-search', 'voice-input', 'file-attach'])

export function slotsOf(mode, layout) {
  const features = (mode?.components ?? []).map((c) => nameOf(c.ref)).filter((b) => FEATURES.includes(b))
  return (layout?.slots ?? []).map((s) => {
    const blocks = [...(mode?.components ?? [])].filter((c) => c.slot === s.id && !FEATURES.includes(nameOf(c.ref))).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((c) => nameOf(c.ref))
    return { id: s.id, capacity: s.capacity, blocks, full: s.capacity === 'single' && blocks.length > 0, ...(blocks.includes('input') ? { features } : {}) }
  })
}

const words = (s) => String(s ?? '').trim().toLocaleLowerCase()
const said = (step) => {
  const v = step.match?.values?.[0]
  return v == null ? '' : String(v.text ?? v.value ?? '').replace(/^"([\s\S]*)"$/, '$1').trim()
}
// One of a list by what was typed: its key ('three-panel'), or its name in
// the reader's language, exactly or by its start.
function pick(list, typed) {
  const w = words(typed)
  if (!w) return { none: true }
  const exact = list.filter((x) => words(x.key) === w || words(x.name) === w)
  if (exact.length === 1) return { found: exact[0] }
  const start = list.filter((x) => words(x.name).startsWith(w) || words(x.key).startsWith(w))
  if (start.length === 1) return { found: start[0] }
  return start.length ? { many: start } : { none: true }
}

const roomOf = (screens) => screens.lab?.room ?? null
const change = (room, after) => ({ kind: 'roomChange', modeId: room.id, before: room.mode, after })

/** lab: (C238 (a)): the Lab, with the room on screen in it, or empty. */
export function planLab(step, screens = {}) {
  const l = screens.lab ?? {}
  if (l.inLab) return { says: { message: 'labAlready' }, act: null }
  return { says: l.here ? { message: 'labOpen', values: { name: l.here.name } } : { message: 'labEmpty' }, act: { kind: 'lab', modeId: l.here?.id ?? null } }
}

/** edit:"Reading room": a room by its name, in the Lab; edit: alone, the room on screen. */
export function planEdit(step, screens = {}) {
  const l = screens.lab ?? {}
  const typed = said(step)
  if (!typed) {
    if (!l.here) return { says: { message: 'editWhich' }, act: null }
    return { says: { message: 'labOpen', values: { name: l.here.name } }, act: { kind: 'lab', modeId: l.here.id } }
  }
  if (/^\d+[a-z]?$/i.test(typed)) return { says: { message: 'editNotRoom', values: { said: typed } }, act: null }
  const got = pick(l.rooms ?? [], typed)
  if (got.many) return { says: { message: 'editMany', values: { said: typed, names: got.many.map((r) => r.name) } }, act: null }
  if (!got.found) return { says: { message: 'editNone', values: { said: typed } }, act: null }
  if (l.inLab && l.room?.id === got.found.id) return { says: { message: 'editHere', values: { name: got.found.name } }, act: null }
  return { says: { message: 'labOpen', values: { name: got.found.name } }, act: { kind: 'lab', modeId: got.found.id } }
}

/** done: (C238 (c)): back to what was on screen; every command saved already. */
export function planDone(step, screens = {}) {
  if (!screens.lab?.inLab) return { says: { message: 'doneNotLab' }, act: null }
  return { says: { message: 'doneGo' }, act: { kind: 'labDone' } }
}

/** new:room: a room with the conversation and nothing else, in three panels, in the Lab. */
export const planNewRoom = () => ({ says: { message: 'newRoomGo' }, act: { kind: 'newRoom' } })

/** layout:"Three panels" (C238 piece 1). */
export function planLayout(step, screens = {}) {
  const room = roomOf(screens)
  if (!room) return { says: { message: 'labNoRoom' }, act: null }
  const l = screens.lab
  const got = pick(l.layouts ?? [], said(step))
  if (got.many) return { says: { message: 'layoutMany', values: { names: got.many.map((x) => x.name) } }, act: null }
  if (!got.found) return { says: { message: 'layoutNone', values: { said: said(step), choices: (l.layouts ?? []).map((x) => x.name) } }, act: null }
  if (nameOf(room.mode.layout?.ref) === got.found.key) return { says: { message: 'layoutSame', values: { name: got.found.name } }, act: null }
  const p = planLayoutChange(room.mode, got.found, l.fitsOf ?? (() => []))
  if (p.refused) return { says: { message: p.refused, values: { name: got.found.name } }, act: null }
  const also = [
    ...p.moved.map((m) => ({ message: 'layoutMoves', values: { block: m.block, fromSlot: m.from, toSlot: m.to } })),
    ...p.out.map((o) => ({ message: 'layoutOut', values: { block: o.block } })),
  ]
  return {
    says: { message: 'layoutGo', values: { room: room.name, name: got.found.name }, ...(also.length ? { also } : {}) },
    act: change(room, { ...room.mode, layout: { ref: got.found.ref }, components: p.components }),
  }
}

/** theme:"Deep calm". */
export function planTheme(step, screens = {}) {
  const room = roomOf(screens)
  if (!room) return { says: { message: 'labNoRoom' }, act: null }
  const got = pick(screens.lab.themes ?? [], said(step))
  if (got.many) return { says: { message: 'themeMany', values: { names: got.many.map((x) => x.name) } }, act: null }
  if (!got.found) return { says: { message: 'themeNone', values: { said: said(step), choices: (screens.lab.themes ?? []).map((x) => x.name) } }, act: null }
  if (nameOf(room.mode.scheme?.ref) === got.found.key) return { says: { message: 'themeSame', values: { name: got.found.name } }, act: null }
  return { says: { message: 'themeGo', values: { room: room.name, name: got.found.name } }, act: change(room, { ...room.mode, scheme: { ref: got.found.ref } }) }
}

const DEVICES = { desktop: 'visual-pointer', mobile: 'visual-touch-phone' }

/** device:desktop or device:mobile (C238 (g)). */
export function planDevice(step, screens = {}) {
  const room = roomOf(screens)
  if (!room) return { says: { message: 'labNoRoom' }, act: null }
  const word = step.match?.values?.[0]?.value
  const cls = DEVICES[word]
  if (!cls) return { says: { message: 'deviceWhich' }, act: null }
  if ((room.mode.deviceClass ?? 'visual-pointer') === cls) return { says: { message: 'deviceSame', values: { device: word } }, act: null }
  return { says: { message: 'deviceGo', values: { room: room.name, device: word } }, act: change(room, { ...room.mode, deviceClass: cls }) }
}

/** name:"Essay room" with the Canvas addressed: names the room in the Lab. */
export function planLabName(step, screens = {}) {
  const room = roomOf(screens)
  if (!room) return { says: { message: 'labNoRoom' }, act: null }
  const clean = cleanRoomName(said(step))
  if (clean.error === 'empty') return { says: { message: 'nameEmpty' }, act: null }
  if (clean.error === 'long') return { says: { message: 'nameLong', values: { max: ROOM_NAME_MAX } }, act: null }
  if (room.mode.meta?.name === clean.name) return { says: { message: 'nameSame' }, act: null }
  return { says: { message: 'nameRoom', values: { name: clean.name } }, act: change(room, { ...room.mode, meta: { ...room.mode.meta, name: clean.name } }) }
}

/** What device a room is built for, as the Canvas says it. */
export const deviceOf = (mode) => (mode?.deviceClass === 'visual-touch-phone' ? 'mobile' : 'desktop')

/**
 * duplicate:"Writing studio" (C242 (e)): a copy of a room, yours or a
 * template, named with the next number free, opened in the Lab. Your room
 * by that name first; `duplicate:"Writing studio" template` takes the
 * template. With no name, the room on the Canvas, else the room on screen.
 * screens.lab.templates: [{ id, key, name, soon }].
 */
export function planDuplicate(step, screens = {}) {
  const l = screens.lab ?? {}
  const typed = said(step)
  const onlyTemplate = step.match?.values?.[1]?.value === 'template'
  let from
  if (!typed) {
    const r = l.inLab ? l.room : l.here
    if (!r) return { says: { message: 'duplicateWhich' }, act: null }
    from = { room: r.id, name: r.name }
  } else {
    const mine = onlyTemplate ? { none: true } : pick(l.rooms ?? [], typed)
    const tpl = pick(l.templates ?? [], typed)
    const got = mine.found ? mine : tpl.found ? tpl : mine.many ? mine : tpl
    if (got.many) return { says: { message: 'editMany', values: { said: typed, names: got.many.map((r) => r.name) } }, act: null }
    if (!got.found) return { says: { message: 'duplicateNone', values: { said: typed } }, act: null }
    if (got.found.soon) return { says: { message: 'duplicateSoon', values: { name: got.found.name } }, act: null }
    from = got === mine ? { room: got.found.id, name: got.found.name } : { template: got.found.id, name: got.found.name }
  }
  const taken = new Set((l.rooms ?? []).map((r) => words(r.name)))
  let n = 2
  while (taken.has(words(`${from.name} ${n}`))) n += 1
  const name = `${from.name} ${n}`
  return {
    says: { message: from.template ? 'duplicateTemplate' : 'duplicateGo', values: { name: from.name, copy: name } },
    act: { kind: 'duplicateRoom', ...(from.template ? { template: from.template } : { room: from.room }), name },
  }
}
