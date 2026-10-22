import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openDB } from 'idb'
import { upgradeSchema } from './schema'
import { readSaved, keepSearch, forgetSearch, cleanSaved, cleanSearchName, findSaved, SEARCH_NAME_MAX } from './savedSearches'
import { FIELDS } from './backupSchema'

// Saved searches on Records (stage 6, piece 2; C140).

describe('kept on this device', () => {
  let db
  let n = 0
  const newId = () => `s${++n}`
  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory()
    db = await openDB('saved-test', 6, { upgrade: upgradeSchema })
  })
  afterEach(() => db.close())

  it('keeps the search and the filters as commands, the newest first', async () => {
    await keepSearch(db, { name: 'Owls', search: 'owl', line: 'type:chat', now: '2026-10-21T10:00:00Z', newId })
    await keepSearch(db, { name: 'This week', search: '', line: 'since:7d sort:oldest', now: '2026-10-21T11:00:00Z', newId })
    expect((await readSaved(db)).map((s) => [s.name, s.search, s.line])).toEqual([['This week', '', 'since:7d sort:oldest'], ['Owls', 'owl', 'type:chat']])
  })

  it('replaces one of the same name, in any case, keeping its id and first day', async () => {
    const first = await keepSearch(db, { name: 'Owls', search: 'owl', line: '', now: '2026-10-20T10:00:00Z', newId })
    const again = await keepSearch(db, { name: 'owls', search: 'barn owl', line: 'type:chat', now: '2026-10-21T10:00:00Z', newId })
    expect(again).toMatchObject({ id: first.id, name: 'owls', search: 'barn owl', createdAt: '2026-10-20T10:00:00Z', updatedAt: '2026-10-21T10:00:00Z' })
    expect(await readSaved(db)).toHaveLength(1)
  })

  it('forgets one; what it found is untouched', async () => {
    const s = await keepSearch(db, { name: 'Owls', search: 'owl', newId })
    await forgetSearch(db, s.id)
    expect(await readSaved(db)).toEqual([])
  })

  it('never travels in a backup', () => {
    expect(Object.keys(FIELDS)).not.toContain('savedSearches')
  })
})

describe('checked when read back', () => {
  it('leaves out a record that cannot be made sense of', () => {
    expect(cleanSaved(null)).toBeNull()
    expect(cleanSaved({ id: 's1', name: '   ' })).toBeNull()
    expect(cleanSaved({ id: 's1', name: 'Owls', line: 7 })).toBeNull()
    expect(cleanSaved({ id: 's1', name: ' Owls  this  week ', search: ' owl ', line: 'type:chat', createdAt: 'never' }))
      .toEqual({ id: 's1', name: 'Owls this week', search: 'owl', line: 'type:chat', createdAt: null, updatedAt: null })
  })

  it('takes a name of up to so many characters', () => {
    expect(cleanSearchName('x'.repeat(SEARCH_NAME_MAX))).toEqual({ name: 'x'.repeat(SEARCH_NAME_MAX) })
    expect(cleanSearchName('x'.repeat(SEARCH_NAME_MAX + 1))).toEqual({ error: 'long' })
    expect(cleanSearchName('')).toEqual({ error: 'empty' })
  })
})

describe('finding one by name', () => {
  const saved = [{ id: 'a', name: 'Owls' }, { id: 'b', name: 'Owls this week' }, { id: 'c', name: 'Essays' }]
  it('takes the same name first, then the only one that starts with it', () => {
    expect(findSaved(saved, 'owls').found.id).toBe('a')
    expect(findSaved(saved, 'ess').found.id).toBe('c')
    expect(findSaved(saved, 'ow')).toEqual({ found: null, several: ['Owls', 'Owls this week'] })
    expect(findSaved(saved, 'attic')).toEqual({ found: null, several: [] })
  })
})
