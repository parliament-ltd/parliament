import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { planRestore, chatSignature } from './restorePlan'
import { contentsToFlatStores } from './backupFormat'

const fixture = JSON.parse(readFileSync(new URL('./__fixtures__/backup-v1.json', import.meta.url), 'utf8'))
const now = '2026-10-19T12:00:00.000Z'

function counter() {
  let n = 0
  return () => `new-${++n}`
}

describe('planRestore', () => {
  const flat = contentsToFlatStores(fixture.contents)
  const msgsOf = (id) => flat.messages.filter((m) => m.conversationId === id)
  const here = (id, change = {}) => ({ chat: { ...flat.conversations.find((c) => c.id === id), ...change }, messages: msgsOf(id), document: null })

  it('writes everything unchanged into an empty database', () => {
    const { writes, renamedConvIds, summary } = planRestore(flat, { strategy: 'merge', existing: {}, newId: counter(), now })
    expect(renamedConvIds.size).toBe(0)
    expect(writes.conversations.map((c) => c.id)).toEqual(['conv-root', 'conv-fork'])
    expect(writes.messages).toHaveLength(4)
    expect(writes.notes[0].messageId).toBe('m2')
    expect(summary.chats).toEqual({ added: 2, copied: 0, skipped: 0 })
  })

  it('skips a chat that is here with the same content, and everything that is its own', () => {
    const existing = {
      chats: new Map([['conv-root', here('conv-root', { updatedAt: 'later', storageBytes: 999, num: 207 })]]),
      messages: new Set(['m1', 'm2']),
      notes: new Map([['n1', fixture.contents.annotations.notes[0]]]),
    }
    const { writes, summary, decision } = planRestore(flat, { strategy: 'merge', existing, newId: counter(), now })
    expect(decision.get('conv-root')).toBe('same')
    expect(writes.conversations.map((c) => c.id)).toEqual(['conv-fork'])
    expect(writes.messages.map((m) => m.id)).toEqual(['m3', 'm4'])
    expect(writes.notes).toEqual([])
    expect(summary).toMatchObject({ chats: { added: 1, copied: 0, skipped: 1 }, messages: { added: 2, skipped: 2 }, annotations: { skipped: 1 } })
  })

  it('brings a changed chat in as a copy, with every reference following it', () => {
    const existing = {
      chats: new Map([['conv-root', here('conv-root', { title: 'Renamed here' })], ['conv-fork', here('conv-fork', { title: 'Also renamed' })]]),
      messages: new Set(['m1', 'm2', 'm3', 'm4']),
      notes: new Map(), highlights: new Map(), favorites: new Map(), pins: new Map(),
    }
    const { writes, renamedConvIds, renamedMsgIds, summary } = planRestore(flat, { strategy: 'merge', existing, newId: counter(), now })
    const root = writes.conversations.find((c) => c.id === renamedConvIds.get('conv-root'))
    const fork = writes.conversations.find((c) => c.id === renamedConvIds.get('conv-fork'))
    expect(root.title).toBe('Water tower (from backup)')
    expect(root.restoredFrom).toEqual({ at: now })
    expect([fork.parentId, fork.familyId, root.familyId]).toEqual([root.id, root.id, root.id])
    expect(fork.branchPoint).toBe(renamedMsgIds.get('m2'))
    expect(writes.messages).toHaveLength(4)
    expect(writes.notes[0]).toMatchObject({ conversationId: root.id, messageId: renamedMsgIds.get('m2'), restoredFrom: { at: now } })
    expect(writes.pins[0]).toMatchObject({ targetConversationId: fork.id, sourceConversationId: root.id, sourceMessageId: renamedMsgIds.get('m2') })
    expect(writes.favorites[0]).toMatchObject({ conversationId: fork.id, messageId: renamedMsgIds.get('m4') })
    expect(summary.chats).toEqual({ added: 0, copied: 2, skipped: 0 })
  })

  it('copies a note whose id is here with other text, and skips one that is the same', () => {
    const note = fixture.contents.annotations.notes[0]
    const same = planRestore(flat, { strategy: 'merge', existing: { notes: new Map([['n1', note]]) }, newId: counter(), now })
    expect(same.writes.notes).toEqual([])
    const other = planRestore(flat, { strategy: 'merge', existing: { notes: new Map([['n1', { ...note, text: 'Changed here' }]]) }, newId: counter(), now })
    expect(other.writes.notes[0]).toMatchObject({ id: 'new-1', text: note.text })
    expect(other.summary.annotations.copied).toBe(1)
  })

  it('takes docket fields off what comes in and remembers the number, unless the numbers are kept', () => {
    const numbered = { ...flat, conversations: flat.conversations.map((c, i) => ({ ...c, num: 202 + i, docketId: 'd1', branch: 'ab'[i], run: 1 })) }
    const merged = planRestore(numbered, { strategy: 'merge', newId: counter(), now })
    expect(merged.writes.conversations[0]).not.toHaveProperty('num')
    expect(merged.writes.conversations[0]).not.toHaveProperty('docketId')
    expect(merged.writes.conversations[0].restoredFrom).toEqual({ at: now, num: 202 })
    const kept = planRestore(numbered, { strategy: 'replace', keepNumbers: true, newId: counter(), now })
    expect(kept.writes.conversations[0]).toMatchObject({ num: 202, docketId: 'd1', branch: 'a' })
    expect(kept.writes.conversations[0]).not.toHaveProperty('restoredFrom')
  })

  it('renames a setting that names a copied chat, and skips settings already here', () => {
    const withSettings = { ...flat, settings: [{ key: 'sbrd-ripple-scope-conv-root', value: ['conv-fork'] }, { key: 'theme', value: 'light' }] }
    const existing = { chats: new Map([['conv-root', here('conv-root', { title: 'x' })]]), settings: new Set(['theme']) }
    const { writes, renamedConvIds } = planRestore(withSettings, { strategy: 'merge', existing, newId: counter(), now })
    expect(writes.settings).toEqual([{ key: `sbrd-ripple-scope-${renamedConvIds.get('conv-root')}`, value: ['conv-fork'] }])
  })

  it('brings collabs in switched off', () => {
    const { writes } = planRestore({ ...flat, collabs: [{ id: 'k1', name: 'Skeptic', instruction: 'Question it.', on: true }] }, { strategy: 'merge', newId: counter(), now })
    expect(writes.collabs).toEqual([{ id: 'k1', name: 'Skeptic', instruction: 'Question it.', on: false }])
  })

  it('ignores what is here when replacing', () => {
    const existing = { chats: new Map([['conv-root', here('conv-root', { title: 'x' })]]) }
    const { writes, renamedConvIds } = planRestore(flat, { strategy: 'replace', existing, newId: counter(), now })
    expect(renamedConvIds.size).toBe(0)
    expect(writes.conversations.map((c) => c.id)).toEqual(['conv-root', 'conv-fork'])
  })

  it('compares what a person sees: title, messages in order, document; not dates or sizes', () => {
    const c = { title: 'A', pinned: false, updatedAt: '1', storageBytes: 1 }
    const m = [{ role: 'user', content: 'hi', createdAt: '1' }]
    expect(chatSignature(c, m)).toBe(chatSignature({ ...c, updatedAt: '2', storageBytes: 5, num: 207 }, m))
    expect(chatSignature(c, m)).not.toBe(chatSignature({ ...c, title: 'B' }, m))
    expect(chatSignature(c, m, { paragraphs: [{ text: 'x' }] })).not.toBe(chatSignature(c, m, { paragraphs: [{ text: 'y' }] }))
    expect(chatSignature(c, m, { paragraphs: [], updatedAt: '1' })).toBe(chatSignature(c, m, { paragraphs: [], updatedAt: '2', suggestionStates: {} }))
  })
})
