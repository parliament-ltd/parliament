import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openDB } from 'idb'
import { upgradeSchema } from './schema'
import { cleanArrangement, loadArrangement, saveArrangement, loadSpace, openSpace } from './arrangements'
import { shipped, planOpen, planPop, planBar, planCols, SPACE } from '../shell/arrangement'
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

describe('the columns Records keeps (C141)', () => {
  it('reads them back, checked: known columns once each, in order, with the title and number', () => {
    const a = planCols(shipped(SPACE), ['-room']).next
    expect(cleanArrangement(a).recordsCols).toEqual(['type', 'id', 'title', 'tags', 'created', 'active'])
    expect(cleanArrangement({ ...a, recordsCols: ['active', 'title', 'id', 'title', 'colour'] }).recordsCols).toEqual(['id', 'title', 'active'])
    expect(cleanArrangement({ ...a, recordsCols: ['type', 'active'] }).recordsCols).toBeUndefined()
    expect(cleanArrangement({ ...a, recordsCols: 'room' }).recordsCols).toBeUndefined()
  })

  it('reads a space kept without them as before', () => {
    expect(cleanArrangement(shipped(SPACE)).recordsCols).toBeUndefined()
  })
})

// What the start reads, for the birds on first load (C279 (e)).
describe('the space to start on', () => {
  let db
  beforeEach(async () => { db = await open(6) })
  afterEach(() => db.close())

  it('is the welcome page on the very first start, with nothing kept yet', async () => {
    const first = await openSpace(db, { fresh: true })
    expect(first).toEqual({ space: { ...shipped('welcome'), id: SPACE }, kept: false, canKeep: true })
    expect(await loadSpace(db, { fresh: true })).toEqual(first.space)
    expect((await openSpace(db, { fresh: false })).space).toEqual(shipped(SPACE))
  })

  it('is kept once the first space is, so the next start is not a first', async () => {
    const { space } = await openSpace(db, { fresh: true })
    await saveArrangement(db, space)
    const next = await openSpace(db, { fresh: true })
    expect(next.kept).toBe(true)
    expect(next.space.columns).toEqual([['welcome']])
  })

  it('counts a damaged space as kept, though it starts from the default', async () => {
    await db.put('arrangements', { id: SPACE, columns: 'broken' })
    const next = await openSpace(db, { fresh: true })
    expect(next.kept).toBe(true)
    expect(next.space).toEqual({ ...shipped('welcome'), id: SPACE })
  })

  it('changes nothing stored', async () => {
    await openSpace(db, { fresh: true })
    expect(await db.getAll('arrangements')).toEqual([])
  })
})

describe('the space to start on, at version 5', () => {
  it('says it cannot be kept', async () => {
    const db = await open(5)
    expect(await openSpace(db, { fresh: true })).toMatchObject({ kept: false, canKeep: false })
    db.close()
  })
})
