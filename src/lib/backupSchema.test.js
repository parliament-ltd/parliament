import { describe, it, expect } from 'vitest'
import { rebuildRecord, settingAllowed, renameSettingChats, cleanFlat } from './backupSchema'

describe('settings that may travel', () => {
  it('lets known settings through with values of the right kind', () => {
    expect(settingAllowed({ key: 'scratchpad-text', value: 'Buy stamps' })).toBe(true)
    expect(settingAllowed({ key: 'contextThreshold', value: 80 })).toBe(true)
    expect(settingAllowed({ key: 'tourCompleted_settings', value: true })).toBe(true)
    expect(settingAllowed({ key: 'sbrd-ripple-scope-1eac0041-c693', value: ['b95cda79-9de4'] })).toBe(true)
  })

  it('never lets the key through, nor this browser\'s own settings, nor anything unknown or of the wrong kind', () => {
    for (const key of ['parliament-api-key', 'browserFingerprint', 'backupLog', 'migration_v2_room_repair_done', 'providerUrl']) {
      expect(settingAllowed({ key, value: 'x' })).toBe(false)
    }
    expect(settingAllowed({ key: 'contextThreshold', value: '80' })).toBe(false)
    expect(settingAllowed({ key: 'sbrd-ripple-scope-c1', value: ['<script>'] })).toBe(false)
    expect(settingAllowed({ key: 'theme', value: 'x'.repeat(500) })).toBe(false)
  })

  it('renames a setting named after a chat, and the chats listed in it', () => {
    const conv = (id) => ({ a: 'A2', b: 'B2' })[id] || id
    expect(renameSettingChats({ key: 'sbrd-ripple-scope-a', value: ['b', 'c'] }, conv)).toEqual({ key: 'sbrd-ripple-scope-A2', value: ['B2', 'c'] })
    expect(renameSettingChats({ key: 'sbrd-ripple-manifest-a', value: { scannedDocs: 1 } }, conv)).toEqual({ key: 'sbrd-ripple-manifest-A2', value: { scannedDocs: 1 } })
    expect(renameSettingChats({ key: 'theme', value: 'light' }, conv)).toEqual({ key: 'theme', value: 'light' })
  })
})

describe('records rebuilt from their known fields', () => {
  it('drops any field that is not on the list', () => {
    expect(rebuildRecord('notes', { id: 'n1', text: 'x', createdAt: 't', onclick: 'alert(1)', __proto__x: 1 }))
      .toEqual({ id: 'n1', text: 'x', createdAt: 't' })
  })

  it('keeps room files whole', () => {
    const mode = { id: 'm', schema: 'parliament-mode/1.0', components: [], anything: 1 }
    expect(rebuildRecord('modes', mode)).toBe(mode)
  })
})

describe('cleanFlat', () => {
  const flat = {
    conversations: [{ id: 'c1' }, { id: 'c2', parentId: 'gone' }],
    messages: [{ id: 'm1', conversationId: 'c1' }, { id: 'm9', conversationId: 'gone' }],
    favorites: [{ id: 'f1', conversationId: 'c1', messageId: 'm1' }, { id: 'f2', conversationId: 'c1', messageId: 'deleted' }],
    notes: [{ id: 'n1', conversationId: 'c1', messageId: null }],
    pins: [{ id: 'p1', targetConversationId: 'c1', sourceConversationId: 'gone', sourceMessageId: 'gone' }],
    settings: [{ key: 'theme', value: 'light' }, { key: 'parliament-api-key', value: { ciphertext: [1] } }],
  }

  it('leaves out records pointing at what the file does not hold, and counts them', () => {
    const { flat: out, dropped } = cleanFlat(flat)
    expect(out.favorites.map((f) => f.id)).toEqual(['f1'])
    expect(out.messages.map((m) => m.id)).toEqual(['m1'])
    expect(out.notes).toHaveLength(1)
    expect(dropped).toMatchObject({ favorites: 1, messages: 1, settings: 1 })
  })

  it('keeps a note that belongs to no chat, like the one the scratchpad became', () => {
    const { flat: out, dropped } = cleanFlat({ conversations: [], notes: [{ id: 'n9', conversationId: null, messageId: null, text: 'free' }] })
    expect(out.notes).toHaveLength(1)
    expect(dropped.notes).toBe(0)
  })

  it('keeps a branch whose parent is gone, and a pinned reference whose source is gone', () => {
    const { flat: out } = cleanFlat(flat)
    expect(out.conversations.map((c) => c.id)).toEqual(['c1', 'c2'])
    expect(out.pins).toHaveLength(1)
  })
})
