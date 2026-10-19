import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { openDB } from 'idb'
import { upgradeSchema } from '../schema'
import { contentsToFlatStores } from '../backupFormat'
import { runV6Trial } from './v6Trial'
import { V6_NEW_STORES } from './v6Upgrade'

// The version 6 upgrade against a real IndexedDB implementation in memory.

const sample = JSON.parse(readFileSync(new URL('../__fixtures__/sample-v5.json', import.meta.url), 'utf8'))

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

describe('the version 6 upgrade', () => {
  it('passes every check of the trial on the sample backup', async () => {
    const { checks, counts } = await runV6Trial(contentsToFlatStores(sample.contents))
    expect(checks.filter((c) => !c.ok)).toEqual([])
    expect(counts.dockets).toEqual([null, 6])
    expect(counts.messages).toEqual([27, 27])
  })

  it('makes every list on a fresh install, with the counter at 201', async () => {
    const db = await openDB('fresh', 6, { upgrade: upgradeSchema })
    for (const name of Object.keys(V6_NEW_STORES)) expect(db.objectStoreNames.contains(name)).toBe(true)
    expect(await db.get('counters', 'num')).toEqual({ name: 'num', next: 201 })
    db.close()
  })

  it('does nothing to a database opened at version 5', async () => {
    const db = await openDB('five', 5, { upgrade: upgradeSchema })
    expect(db.objectStoreNames.contains('dockets')).toBe(false)
    expect(db.objectStoreNames.contains('counters')).toBe(false)
    db.close()
  })
})
