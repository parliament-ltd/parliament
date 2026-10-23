import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { openDB } from 'idb'
import { upgradeSchema } from './schema'

// backup.js reaches the app's install prompt, which only the build provides.
vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: () => ({ needRefresh: [false, () => {}], offlineReady: [false, () => {}], updateServiceWorker: () => {} }) }))

beforeEach(() => { globalThis.indexedDB = new IDBFactory() })

describe('a backup with a password (audit T9; stage 9, piece 2; C182)', () => {
  it('is stretched 600,000 times, says so in its header, and opens again', async () => {
    const db = await openDB('stretched', 6, { upgrade: upgradeSchema })
    const { buildBackupFile, parseBackupFile, decryptBackup, BACKUP_PASSWORD_MIN } = await import('./backup')
    expect(BACKUP_PASSWORD_MIN).toBe(8)
    const { blob } = await buildBackupFile({ contents: { preferences: [{ key: 'fontSize', value: 'large' }] }, password: 'correct horse', db })
    const text = await blob.text()
    expect(JSON.parse(text).encryption.iterations).toBe(600000)
    expect(text).not.toContain('fontSize')
    const parsed = await parseBackupFile({ size: text.length, text: async () => text })
    expect((await decryptBackup(parsed, 'correct horse')).preferences).toEqual([{ key: 'fontSize', value: 'large' }])
    await expect(decryptBackup(parsed, 'wrong horse')).rejects.toThrow()
    db.close()
  }, 30000)
})
