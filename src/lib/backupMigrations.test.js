import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { migrateContents, CURRENT_BACKUP_VERSION, MIGRATIONS } from './backupMigrations'
import { parseBackupFile, validateContents, liftToCurrent } from './backupFormat'

const fileFrom = (name) => {
  const text = readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8')
  return { text: async () => text }
}

describe('migrateContents', () => {
  it('lifts contents one version at a time, in order', () => {
    const migrations = {
      1: (c) => ({ ...c, trail: [...(c.trail || []), 1] }),
      2: (c) => ({ ...c, trail: [...c.trail, 2] }),
    }
    const out = migrateContents({}, 1, { to: 3, migrations })
    expect(out.contents.trail).toEqual([1, 2])
    expect(out.steps).toEqual([1, 2])
  })

  it('refuses a file from a newer version', () => {
    expect(() => migrateContents({}, CURRENT_BACKUP_VERSION + 1)).toThrow(/newer version/)
  })

  it('refuses a gap in the chain', () => {
    expect(() => migrateContents({}, 1, { to: 3, migrations: { 1: (c) => c } })).toThrow(/from backup format 2 to 3/)
  })

  it('has a step for every version below the current one', () => {
    for (let v = 1; v < CURRENT_BACKUP_VERSION; v++) expect(typeof MIGRATIONS[v]).toBe('function')
  })
})

// Every past format must stay restorable. Add a fixture per version.
describe('past backup files', () => {
  it('a file with no version reads as format 1 (C35)', async () => {
    const text = readFileSync(new URL('./__fixtures__/backup-v1.json', import.meta.url), 'utf8')
    const envelope = JSON.parse(text)
    delete envelope.version
    const parsed = await parseBackupFile({ text: async () => JSON.stringify(envelope) })
    expect(parsed.envelope.version).toBe(1)
    expect(liftToCurrent(parsed, parsed.envelope.contents).chats).toHaveLength(2)
  })

  it('refuses a file too large to be a backup without reading it', async () => {
    let read = false
    const huge = { size: 600 * 1024 * 1024, text: async () => { read = true; return '{}' } }
    await expect(parseBackupFile(huge)).rejects.toThrow(/too large/)
    expect(read).toBe(false)
  })

  it('version 1 parses, lifts to the current version, and validates', async () => {
    const parsed = await parseBackupFile(fileFrom('backup-v1.json'))
    expect(parsed.kind).toBe('v2')
    const contents = liftToCurrent(parsed, parsed.envelope.contents)
    expect(contents.chats).toHaveLength(2)
    const check = validateContents(contents)
    expect(check).toEqual({ valid: true })
  })
})
