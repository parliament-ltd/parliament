import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { it, expect, vi } from 'vitest'
import { openDB } from 'idb'
import { upgradeSchema } from '../schema'

// The upgrade happens whole or not at all. Here the planner fails halfway
// (after the new lists are made, before any data is written): the database
// must be left at version 5, with no new list and the chats untouched.

vi.mock('./v6Plan', async (importOriginal) => ({
  ...(await importOriginal()),
  planV6Migration: () => { throw new Error('planner failed') },
}))

it('leaves the data at version 5 when the upgrade fails', async () => {
  globalThis.indexedDB = new IDBFactory()
  const chat = { id: 'c1', title: 'Kept', room: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
  const five = await openDB('rollback', 5, { upgrade: upgradeSchema })
  await five.put('conversations', chat)
  five.close()

  await expect(openDB('rollback', 6, { upgrade: upgradeSchema })).rejects.toThrow()

  const after = await openDB('rollback')
  expect(after.version).toBe(5)
  expect(after.objectStoreNames.contains('dockets')).toBe(false)
  expect(await after.get('conversations', 'c1')).toEqual(chat)
  after.close()
})
