import { describe, it, expect } from 'vitest'
import { ROOM_CHAT, ROOM_OPEN, ROOM_EDGES, roomForm, bandWidth, columnsAt, toggleColumn, drawsColumn } from './roomForm'
import { COLUMNS } from './release'

describe("a room's columns (C279 (b))", () => {
  it('opens its columns when it is alone on screen and wide enough for them', () => {
    expect(roomForm({ width: 1400, alone: true })).toBe('open')
    expect(roomForm({ width: ROOM_OPEN, alone: true })).toBe('open')
  })

  it('draws them as strips when it shares the screen, however wide it is', () => {
    expect(roomForm({ width: 1400, alone: false })).toBe('strips')
    expect(roomForm({ width: 700 })).toBe('strips')
    expect(roomForm({ width: ROOM_CHAT, alone: false })).toBe('strips')
  })

  it('keeps a focused room, alone at 820px, to its strips rather than its narrow form', () => {
    expect(roomForm({ width: 820, alone: true })).toBe('strips')
    expect(roomForm({ width: ROOM_OPEN - 1, alone: true })).toBe('strips')
  })

  it('draws its narrow form only when there is no room for a chat, or on a phone', () => {
    expect(roomForm({ width: ROOM_CHAT - 1, alone: false })).toBe('narrow')
    expect(roomForm({ width: 400, alone: true })).toBe('narrow')
    expect(roomForm({ width: 1400, alone: true, phone: true })).toBe('narrow')
    expect(roomForm({ width: 0 })).toBe('narrow')
    expect(ROOM_CHAT).toBe(600)
  })

  it('reads a width band as the least width in it, so the band decides as the width would', () => {
    expect(ROOM_EDGES).toEqual([ROOM_CHAT, ROOM_OPEN])
    for (const [band, width] of [[0, 300], [1, 800], [2, 1200]]) {
      const edges = ROOM_EDGES.filter((px) => width >= px).length
      expect(edges).toBe(band)
      for (const alone of [true, false]) {
        expect(roomForm({ width: bandWidth(band), alone })).toBe(roomForm({ width, alone }))
      }
    }
  })

  it('starts each room as its form says, with nothing remembered', () => {
    expect(columnsAt('open')).toEqual({ left: true, right: true })
    expect(columnsAt('strips')).toEqual({ left: false, right: false })
    expect(columnsAt('narrow')).toEqual({ left: false, right: false })
  })

  it('opens one strip at a time, and the button again closes it', () => {
    const left = toggleColumn(columnsAt('strips'), 'left', 'strips')
    expect(left).toEqual({ left: true, right: false })
    expect(toggleColumn(left, 'right', 'strips')).toEqual({ left: false, right: true })
    expect(toggleColumn(left, 'left', 'strips')).toEqual({ left: false, right: false })
  })

  it('closes and opens each open column on its own', () => {
    const one = toggleColumn(columnsAt('open'), 'left', 'open')
    expect(one).toEqual({ left: false, right: true })
    expect(toggleColumn(one, 'left', 'open')).toEqual({ left: true, right: true })
  })
})

describe('the columns hidden for now (C280 (a))', () => {
  it('draws no side column with blocks while the columns are off', () => {
    expect(drawsColumn(true, { columns: false })).toBe(false)
    expect(drawsColumn(false, { columns: false })).toBe(false)
  })

  it('draws a column that holds the chat itself either way', () => {
    expect(drawsColumn(true, { chat: true, columns: false })).toBe(true)
    expect(drawsColumn(false, { chat: true, columns: false })).toBe(false)
  })

  it('draws every column with blocks when the columns are on, as C279 (b) built them', () => {
    expect(drawsColumn(true, { columns: true })).toBe(true)
    expect(drawsColumn(undefined, { columns: true })).toBe(false)
  })

  it('reads the release: off in this one', () => {
    expect(COLUMNS).toBe(false)
    expect(drawsColumn(true)).toBe(COLUMNS)
  })
})
