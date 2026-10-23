import { describe, it, expect } from 'vitest'
import { setupI18n } from '@lingui/core'
import { messages as en } from '../locales/en/messages.mjs'
import { isRoom, boardEntry, strip } from './boards'
import {
  shipped, SPACE, planRoom, planShowInRoom, planClose, planFocus, planFocusOff, roomOnScreen, currentRoom, roomsIn, chatIn, address, settle,
} from './arrangement'
import { cleanArrangement } from '../lib/arrangements'
import { preview } from '../chrome/preview'
import { say } from '../chrome/say'

// Any number of rooms (stage 8, piece 7; C175 (a), ruled 23 October: "the
// user can open any number of rooms").

const i18n = setupI18n({ locale: 'en', messages: { en } })
i18n.activate('en')
const keep = (p) => { expect(p.next, p.says.message).not.toBeNull(); return p.next }
const three = () => keep(planRoom(keep(planRoom(keep(planRoom(shipped(SPACE), 'c1')), 'c2')), 'c3'))

describe('a room is any room board', () => {
  it('knows room, room-2, room-3 as rooms', () => {
    expect(['room', 'room-2', 'room-12'].map(isRoom)).toEqual([true, true, true])
    expect(['rooms', 'room-1', 'room-x', 'almanac'].map(isRoom)).toEqual([false, false, false, false])
    expect(boardEntry('room-2')).toBe(boardEntry('room'))
  })
})

describe('several rooms in the space', () => {
  it('opens each chat in a room of its own, beside the room it came from', () => {
    const a = three()
    expect(a.columns).toEqual([['almanac'], ['collection'], ['room'], ['room-2'], ['room-3']])
    expect(roomsIn(a).map((b) => chatIn(a, b))).toEqual(['c1', 'c2', 'c3'])
    // A fourth from the first room goes beside it.
    const b = keep(planRoom(address(a, 'room'), 'c4'))
    expect(b.columns).toEqual([['almanac'], ['collection'], ['room'], ['room-4'], ['room-2'], ['room-3']])
  })

  it('sends a prompt to the room the bar points at, else the one it pointed at last', () => {
    const a = three()
    expect([currentRoom(a), roomOnScreen(a)]).toEqual(['room-3', 'c3'])
    const b = address(a, 'room-2')
    expect(roomOnScreen(b)).toBe('c2')
    const c = address(b, 'almanac')
    expect([c.lastRoom, roomOnScreen(c)]).toEqual(['room-2', 'c2'])
  })

  it('points the bar at the room that shows a chat already, and fills an empty room here', () => {
    const a = three()
    expect(planRoom(a, 'c1')).toMatchObject({ says: { message: 'roomThere' }, next: { addressed: 'room' } })
    expect(planRoom(a, 'c3')).toMatchObject({ next: null, says: { message: 'roomHere' } })
    const empty = keep(planRoom(a, null))
    expect(empty.addressed).toBe('room-4')
    expect(keep(planRoom(empty, 'c9')).context['room-4']).toBe('c9')
  })

  it('moves the room here to another chat in place, as to: a branch does (C174 (b))', () => {
    const a = keep(planShowInRoom(three(), 'c7'))
    expect(roomsIn(a).map((b) => chatIn(a, b))).toEqual(['c1', 'c2', 'c7'])
  })

  it('closes one room, forgetting its chat, and gives a new room the free name', () => {
    const a = keep(planClose(three(), 'room-2'))
    expect(roomsIn(a)).toEqual(['room', 'room-3'])
    expect(a.context['room-2']).toBeUndefined()
    expect(roomsIn(keep(planRoom(a, 'c5')))).toContain('room-2')
  })

  it('keeps the room a prompt goes to alone with focus:, and brings the others back', () => {
    const a = three()
    const f = keep(planFocus(address(a, 'room-2')))
    expect(f.columns).toEqual([['room-2']])
    expect(roomOnScreen(f)).toBe('c2')
    expect(keep(planFocusOff(f)).columns).toEqual(a.columns)
  })

  it('marks Room on the strip for any room', () => {
    const s = strip(address(three(), 'room-2')).find((x) => x.board === 'room')
    expect([s.here, s.addressed]).toEqual([true, true])
  })
})

describe('the space kept on this device', () => {
  it('reads several rooms back, each with its chat, and the room pointed at last', () => {
    const a = settle(address(three(), 'almanac'))
    const back = cleanArrangement(JSON.parse(JSON.stringify(a)))
    expect(back.columns).toEqual(a.columns)
    expect([back.context.room, back.context['room-2'], back.context['room-3'], back.lastRoom]).toEqual(['c1', 'c2', 'c3', 'room-3'])
  })

  it('reads a space kept before as it did, and drops a room pointed at that is gone', () => {
    const old = { id: SPACE, columns: [['almanac'], ['room']], popped: [], addressed: 'almanac', bar: { at: 'top', side: 'center' }, context: { room: 'c1' } }
    const back = cleanArrangement(old)
    expect([back.columns, back.context.room, back.lastRoom]).toEqual([[['almanac'], ['room']], 'c1', undefined])
    expect(cleanArrangement({ ...old, lastRoom: 'room-5' }).lastRoom).toBeUndefined()
  })
})

describe('close:204 finds the room showing it', () => {
  const rows = [{ kind: 'chat', num: 204, chatId: 'c2', docketNum: 201, branch: 'b' }, { kind: 'chat', num: 203, chatId: 'c1', docketNum: 201, branch: 'a' }]
  const run = (value, a) => {
    const p = preview(value, { mode: 'command', arrangement: a, screens: { records: { rows } } })
    return { ...p, text: say(i18n, p.says.message, p.says.values) }
  }

  it('among several, by its chat, whichever room the bar points at', () => {
    const a = keep(planRoom(keep(planRoom(shipped(SPACE), 'c1')), 'c2'))
    const p = run('>close:204', address(a, 'room'))
    expect(p.text).toBe('Enter closes the room showing 204. Nothing is lost')
    expect(roomsIn(p.next)).toEqual(['room'])
    expect(roomOnScreen(p.next)).toBe('c1')
  })
})
