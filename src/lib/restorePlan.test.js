import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { planRestore } from './restorePlan'
import { contentsToFlatStores } from './backupFormat'

const fixture = JSON.parse(readFileSync(new URL('./__fixtures__/backup-v1.json', import.meta.url), 'utf8'))

function counter() {
  let n = 0
  return () => `new-${++n}`
}

describe('planRestore', () => {
  const flat = contentsToFlatStores(fixture.contents)

  it('writes everything unchanged into an empty database', () => {
    const { writes, renamedConvIds } = planRestore(flat, { strategy: 'merge', existing: {}, newId: counter() })
    expect(renamedConvIds.size).toBe(0)
    expect(writes.conversations.map((c) => c.id)).toEqual(['conv-root', 'conv-fork'])
    expect(writes.messages).toHaveLength(4)
    expect(writes.notes[0].messageId).toBe('m2')
  })

  it('keeps every reference pointing at the renamed copies when both chats collide', () => {
    const existing = {
      conversations: new Set(['conv-root', 'conv-fork']),
      messages: new Set(['m1', 'm2', 'm3', 'm4']),
      notes: new Set(['n1']), highlights: new Set(['h1']), favorites: new Set(['f1']), pins: new Set(['p1']),
    }
    const { writes, renamedConvIds, renamedMsgIds } = planRestore(flat, { strategy: 'merge', existing, newId: counter() })

    const root = writes.conversations.find((c) => c.title === 'Water tower (from backup)')
    const fork = writes.conversations.find((c) => c.title === 'Branch: Water tower (from backup)')
    expect(root.id).toBe(renamedConvIds.get('conv-root'))
    expect(fork.id).toBe(renamedConvIds.get('conv-fork'))

    // The fork points at the copied root and at the copied message it branched from.
    expect(fork.parentId).toBe(root.id)
    expect(fork.familyId).toBe(root.id)
    expect(root.familyId).toBe(root.id)
    expect(fork.branchPoint).toBe(renamedMsgIds.get('m2'))

    // Every message was copied under a new id, and none were skipped.
    expect(writes.messages).toHaveLength(4)
    const msgIds = new Set(writes.messages.map((m) => m.id))
    for (const old of ['m1', 'm2', 'm3', 'm4']) expect(msgIds.has(renamedMsgIds.get(old))).toBe(true)

    // Annotations follow their message and conversation.
    expect(writes.notes[0]).toMatchObject({ conversationId: root.id, messageId: renamedMsgIds.get('m2') })
    expect(writes.highlights[0]).toMatchObject({ conversationId: root.id, messageId: renamedMsgIds.get('m2') })
    expect(writes.favorites[0]).toMatchObject({ conversationId: fork.id, messageId: renamedMsgIds.get('m4') })
    expect(writes.pins[0]).toMatchObject({
      targetConversationId: fork.id, sourceConversationId: root.id, sourceMessageId: renamedMsgIds.get('m2'),
    })
    for (const store of ['notes', 'highlights', 'favorites', 'pins']) {
      expect(writes[store][0].id).not.toBe(fixture.contents.annotations[store][0].id)
    }
  })

  it('follows a renamed parent even when the child does not collide', () => {
    const existing = { conversations: new Set(['conv-root']), messages: new Set(['m1', 'm2']) }
    const { writes, renamedConvIds, renamedMsgIds } = planRestore(flat, { strategy: 'merge', existing, newId: counter() })
    const fork = writes.conversations.find((c) => c.id === 'conv-fork')
    expect(fork.parentId).toBe(renamedConvIds.get('conv-root'))
    expect(fork.branchPoint).toBe(renamedMsgIds.get('m2'))
    expect(writes.messages.filter((m) => m.conversationId === 'conv-fork').map((m) => m.id)).toEqual(['m3', 'm4'])
  })

  it('skips records that already exist when their chat did not collide', () => {
    const existing = { messages: new Set(['m1']), notes: new Set(['n1']) }
    const { writes, skipped } = planRestore(flat, { strategy: 'merge', existing, newId: counter() })
    expect(skipped.messages).toBe(1)
    expect(skipped.annotations).toBe(1)
    expect(writes.messages.map((m) => m.id)).not.toContain('m1')
  })

  it('ignores existing ids when replacing', () => {
    const existing = { conversations: new Set(['conv-root']) }
    const { writes, renamedConvIds } = planRestore(flat, { strategy: 'replace', existing, newId: counter() })
    expect(renamedConvIds.size).toBe(0)
    expect(writes.conversations.map((c) => c.id)).toEqual(['conv-root', 'conv-fork'])
  })
})
