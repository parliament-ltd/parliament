import { describe, it, expect } from 'vitest'
import { askToKeepStorage, isStorageKept, ASKED_SETTING } from './storageKeep'
import { settingAllowed } from './backupSchema'

function fakes({ persisted = false, grants = true } = {}) {
  const settings = new Map()
  let asked = 0
  const storage = {
    persisted: async () => persisted,
    persist: async () => { asked++; persisted = grants; return grants },
  }
  return {
    storage,
    getSetting: async (k) => settings.get(k) ?? null,
    setSetting: async (k, v) => { settings.set(k, v) },
    settings,
    asked: () => asked,
  }
}

describe('asking the browser to keep storage', () => {
  it('asks once and remembers the answer', async () => {
    const f = fakes({ grants: false })
    expect(await askToKeepStorage({ ...f, now: () => 't' })).toBe('not-kept')
    expect(f.settings.get(ASKED_SETTING)).toEqual({ at: 't', kept: false })
    expect(await askToKeepStorage(f)).toBe('asked-before')
    expect(f.asked()).toBe(1)
  })

  it('asks again only when told to, as the Settings button does', async () => {
    const f = fakes({ grants: false })
    await askToKeepStorage(f)
    await askToKeepStorage({ ...f, again: true })
    expect(f.asked()).toBe(2)
  })

  it('does not ask when the storage is already kept, or the browser cannot keep it', async () => {
    const kept = fakes({ persisted: true })
    expect(await askToKeepStorage(kept)).toBe('kept')
    expect(kept.asked()).toBe(0)
    expect(await askToKeepStorage({ storage: {}, getSetting: async () => null, setSetting: async () => {} })).toBe('unsupported')
    expect(await isStorageKept({})).toBeNull()
  })

  it('keeps its answer out of backups, since it describes this browser', () => {
    expect(settingAllowed({ key: ASKED_SETTING, value: { at: 't', kept: true } })).toBe(false)
  })
})
