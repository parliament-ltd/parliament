import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openDB } from 'idb'
import { upgradeSchema } from './schema'
import { cleanArrangement, loadArrangement, saveArrangement } from './arrangements'
import { shipped, planOpen, planPop, planBar } from '../shell/arrangement'
import { FIELDS } from './backupSchema'

const open = (version) => openDB('arrangements-test', version, { upgrade: upgradeSchema })

beforeEach(() => { globalThis.indexedDB = new IDBFactory() })

describe('reading an arrangement back', () => {
  it('keeps a good one as it was', () => {
    let a = shipped('almanac', { collection: 'Q2 evidence' })
    a = planOpen(a, 'library').next
    a = planPop(a, 'library', 2).next
    expect(cleanArrangement(a)).toEqual(a)
  })

  it('drops unknown boards, places and fields, and boards listed twice', () => {
    const a = cleanArrangement({
      id: 'almanac',
      columns: [['almanac', 'nonsense'], ['collection', 'almanac'], 'x', []],
      popped: [{ board: 'library', display: 2, side: 'up', from: -3 }, { board: 'evil' }],
      addressed: 'nonsense',
      bar: { at: 'sideways', popped: 'yes' },
      resting: 'shout',
      context: { collection: 'Q2', library: { html: '<b>' }, nonsense: 'x' },
      widths: { almanac: 2.5, collection: 'wide', nonsense: 1, library: -1, docket: 1e9 },
      extra: 'dropped',
    })
    expect(a).toEqual({
      id: 'almanac',
      columns: [['almanac'], ['collection']],
      popped: [{ board: 'library', display: 2, side: null, from: 2 }],
      addressed: 'almanac',
      bar: { at: 'top', side: 'center', popped: false },
      resting: null,
      context: { collection: 'Q2' },
      widths: { almanac: 2.5 },
    })
  })

  it('keeps the space as it was before focus:, checked like the space itself', () => {
    const a = cleanArrangement({
      id: 'space', columns: [['room']], popped: [], addressed: 'room', bar: { at: 'bottom' }, context: { room: 'c1' },
      focus: { columns: [['welcome'], ['almanac', 'nonsense']], popped: [], addressed: 'almanac', bar: { at: 'card' } },
    })
    expect(a.focus).toEqual({ columns: [['welcome'], ['almanac']], popped: [], addressed: 'almanac', bar: { at: 'card', side: 'center', popped: false } })
    expect(cleanArrangement({ ...a, focus: { columns: [['nonsense']] } }).focus).toBeUndefined()
  })

  it('reads a space kept before widths with the usual shares (C126)', () => {
    const a = cleanArrangement({ id: 'space', columns: [['almanac'], ['collection']], popped: [], addressed: 'almanac', bar: { at: 'top' }, context: {} })
    expect(a.widths).toEqual({})
    expect(cleanArrangement({ ...a, widths: { almanac: 3.25 } }).widths).toEqual({ almanac: 3.25 })
  })

  it('gives up on what it cannot make sense of', () => {
    expect(cleanArrangement(null)).toBeNull()
    expect(cleanArrangement({ id: 'nowhere', columns: [['almanac']] })).toBeNull()
    expect(cleanArrangement({ id: 'almanac', columns: [['nonsense']] })).toBeNull()
    expect(cleanArrangement({ id: 'room:<script>', columns: [['room']] })).toBeNull()
  })
})

describe('arrangements at version 6', () => {
  let db
  beforeEach(async () => { db = await open(6) })
  afterEach(() => db.close())

  it('come back as this device left them', async () => {
    const a = planBar(planOpen(shipped('almanac'), 'library').next, 'bottom').next
    await saveArrangement(db, a, { now: '2026-10-20T12:00:00.000Z' })
    const back = await loadArrangement(db, 'almanac')
    expect(back).toMatchObject({ columns: [['almanac'], ['collection'], ['library']], bar: { at: 'bottom' } })
  })

  it('start from the shipped default when none is kept', async () => {
    expect(await loadArrangement(db, 'lab')).toEqual(shipped('lab'))
    expect(await loadArrangement(db, 'room:mode_1', { room: 'mode_1' })).toEqual(shipped('room:mode_1', { room: 'mode_1' }))
  })

  it('each keep their own: one per shipped arrangement, one per room', async () => {
    await saveArrangement(db, planBar(shipped('room:a'), 'top').next)
    expect((await loadArrangement(db, 'room:a')).bar.at).toBe('top')
    expect((await loadArrangement(db, 'room:b')).bar.at).toBe('bottom')
  })

  it('fall back to the default when what is kept is damaged', async () => {
    await db.put('arrangements', { id: 'almanac', columns: 'broken' })
    expect(await loadArrangement(db, 'almanac')).toEqual(shipped('almanac'))
  })

  it('refuse to keep what is not an arrangement', async () => {
    await expect(saveArrangement(db, { id: 'almanac', columns: [] })).rejects.toThrow()
  })
})

describe('at version 5', () => {
  it('use the shipped default and keep nothing', async () => {
    const db = await open(5)
    expect(await loadArrangement(db, 'almanac')).toEqual(shipped('almanac'))
    expect(await saveArrangement(db, shipped('almanac'))).toBeNull()
    db.close()
  })
})

describe('backups', () => {
  it('do not carry arrangements yet: stage 9 adds them as a choice', () => {
    expect(Object.keys(FIELDS)).not.toContain('arrangements')
  })
})
