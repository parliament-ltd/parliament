// Saved arrangements (stage 14, piece 3; C253, C257): a desk kept by name on
// this device. Pure: what arrange:save, arrange:"name" and forget: would do,
// for the Enter line, and the space or the record after.
//
//   arrange:save "Review desk"     keep what is on screen under that name
//   arrange:"Review desk"          switch to it; its room shows the chat now
//   arrange:"Review desk" 207      switch to it with 207 in its room
//   arrange:                       the screens map (piece 4; C259)
//   name:"Review desk" "Two screens" rename one (C259 (h))
//
// What one keeps (C257 (a)): the boards and columns, popped windows with
// their screen and side, the widths, the bar, the board it points at,
// Records' columns, and what non-room boards show. Not which chats rooms
// show: a desk, not a session.

import { isRoom } from '../shell/boards'
import { SPACE, settle } from '../shell/arrangement'
import { SAVED, NAME_MAX } from './arrangements'
import { mustAsk } from '../shell/screens'

const words = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const lower = (s) => words(s).toLocaleLowerCase()
const typed = (v) => words(v?.kind === 'text' ? v.value : v?.text ?? v?.value ?? '')

/** One of the saved by what was typed: its name exactly, else by its start. */
export function findSaved(saved, name) {
  const w = lower(name)
  if (!w) return { none: true }
  const exact = saved.filter((s) => lower(s.name) === w)
  if (exact.length) return { found: exact[0] }
  const start = saved.filter((s) => lower(s.name).startsWith(w))
  if (start.length === 1) return { found: start[0] }
  return start.length ? { many: start } : { none: true }
}

/** The space as a saved record: rooms' chats left out (C257 (a)). */
export function savedOf(a, id, name, now = null) {
  const context = Object.fromEntries(Object.entries(a.context ?? {}).filter(([k]) => !isRoom(k)))
  return {
    id: `${SAVED}:${id}`,
    name,
    columns: a.columns.map((c) => [...c]),
    popped: a.popped.map((p) => ({ ...p })),
    addressed: a.addressed,
    bar: { ...a.bar },
    resting: a.resting ?? null,
    context,
    widths: { ...(a.widths ?? {}) },
    ...(Array.isArray(a.recordsCols) ? { recordsCols: [...a.recordsCols] } : {}),
    ...(now ? { updatedAt: now } : {}),
  }
}

/** The space after switching to a saved arrangement, with this chat in its room. */
export function spaceFrom(saved, a, chat = null) {
  const rooms = [...saved.columns.flat(), ...saved.popped.map((p) => p.board)].filter(isRoom)
  const context = { ...saved.context }
  if (chat && rooms.length) context[rooms[0]] = chat
  const next = {
    id: SPACE,
    columns: saved.columns.map((c) => [...c]),
    popped: saved.popped.map((p) => ({ ...p })),
    addressed: saved.addressed,
    bar: { ...saved.bar },
    resting: saved.resting ?? null,
    context,
    widths: { ...(saved.widths ?? {}) },
    ...(Array.isArray(saved.recordsCols) ? { recordsCols: [...saved.recordsCols] } : {}),
  }
  return settle(next)
}

/**
 * arrange:, arrange:save "name", arrange:"name" [address].
 * screens.arrangements: { saved: [{ id, name, … }] }; screens.records.rows
 * for a number; screens.roomChat: the chat the bar points at.
 */
export function planArrange(a, step, screens = {}, newId = () => crypto.randomUUID()) {
  const saved = screens.arrangements?.saved ?? []
  const vals = step.match?.values ?? []
  // Bare, the map of your screens (C259 (b)); in the Lab too, where it only shows.
  if (!vals.length) {
    const d = screens.displays ?? null
    const ask = mustAsk(d)
    const two = d?.list ? d.list.length > 1 : Boolean(d?.can && d.extended && d.permission !== 'denied')
    return { says: { message: ask ? 'arrangeMapAsk' : two ? 'arrangeMap' : 'arrangeMapOne' }, act: { kind: 'map', ask } }
  }
  if (a.lab) return { says: { message: 'arrangeInLab' }, act: null }
  if (vals[0].kind === 'word' && vals[0].value === 'save') {
    const name = typed(vals[1])
    if (!name) return { says: { message: 'arrangeSaveName' }, act: null }
    if (Array.from(name).length > NAME_MAX) return { says: { message: 'arrangeLong', values: { max: NAME_MAX } }, act: null }
    const there = saved.find((s) => lower(s.name) === lower(name)) ?? null
    const record = savedOf(a, there ? there.id.slice(SAVED.length + 1) : newId(), name)
    return {
      says: { message: there ? 'arrangeReplace' : 'arrangeSave', values: { name } },
      act: { kind: 'arrangeSave', record, before: there },
    }
  }
  const name = typed(vals[0])
  const got = findSaved(saved, name)
  if (got.many) return { says: { message: 'arrangeMany', values: { names: got.many.map((s) => s.name) } }, act: null }
  if (!got.found) return { says: saved.length ? { message: 'arrangeNotFound', values: { said: name, names: saved.map((s) => s.name) } } : { message: 'arrangeNone' }, act: null }
  let chat = typeof screens.roomChat === 'string' ? screens.roomChat : null
  if (vals[1]) {
    const num = vals[1].num ?? vals[1].value
    const row = (screens.records?.rows ?? []).find((r) => r.kind === 'chat' && r.num === num)
    if (!row) return { says: { message: 'numNone', values: { num: String(vals[1].text ?? num) } }, act: null }
    chat = row.chatId
  }
  const next = spaceFrom(got.found, a, chat)
  return { says: { message: a.focus ? 'arrangeGoFocus' : 'arrangeGo', values: { name: got.found.name } }, next, act: null }
}

/**
 * name:"Review desk" "Two screens" (C259 (h)): the arrangement keeps its id
 * and everything in it, under the new name. undo: names it back. null when
 * the line is not two names, so name: goes on to what the bar points at.
 */
export function planNameArrangement(step, screens = {}) {
  const vals = step.match?.values ?? []
  if (vals.length !== 2 || vals.some((v) => v.kind !== 'text')) return null
  const saved = screens.arrangements?.saved ?? []
  const name = typed(vals[0])
  const to = typed(vals[1])
  const got = findSaved(saved, name)
  if (got.many) return { says: { message: 'arrangeMany', values: { names: got.many.map((s) => s.name) } }, act: null }
  if (!got.found) return { says: saved.length ? { message: 'arrangeNotFound', values: { said: name, names: saved.map((s) => s.name) } } : { message: 'arrangeNone' }, act: null }
  if (!to) return { says: { message: 'arrangeSaveName' }, act: null }
  if (Array.from(to).length > NAME_MAX) return { says: { message: 'arrangeLong', values: { max: NAME_MAX } }, act: null }
  if (got.found.name === to) return { says: { message: 'arrangeNameSame', values: { to } }, act: null }
  if (saved.some((s) => s !== got.found && lower(s.name) === lower(to))) return { says: { message: 'arrangeNameTaken', values: { to } }, act: null }
  const { updatedAt: _was, ...kept } = got.found
  return {
    says: { message: 'arrangeName', values: { name: got.found.name, to } },
    act: { kind: 'arrangeSave', record: { ...kept, name: to }, before: got.found },
  }
}

/** forget:"Review desk" for a saved arrangement: the record goes, undo: brings it back. */
export const planForgetArrangement = (s) => ({ says: { message: 'arrangeForget', values: { name: s.name } }, act: { kind: 'arrangeForget', id: s.id, before: s } })
