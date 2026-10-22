import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openDB } from 'idb'
import { upgradeSchema } from './schema'
import * as C from './collections'

// Collections (stage 6, piece 6; C144): what they hold and the write path.

const NOW = '2026-10-21T10:00:00.000Z'
const LATER = '2026-10-21T11:00:00.000Z'
const empty = (extra = {}) => ({ ...C.newCollection({ id: 'c1', now: NOW }), ...extra })
const row = (num, kind, extra = {}) => ({
  num, kind, id: `${kind}${num}`, store: { chat: 'conversations', docket: 'dockets', note: 'notes', term: 'highlights', quote: 'pins' }[kind],
  chatId: kind === 'chat' ? `chat-${num}` : null, ...extra,
})

describe('what a collection holds', () => {
  it('keys each kind by what it points at', () => {
    expect(C.itemKey({ kind: 'chat', conversationId: 'x' })).toBe('chat:x')
    expect(C.itemKey({ kind: 'plan', docketId: 'd' })).toBe('plan:d')
    expect(C.itemKey({ kind: 'marking', store: 'notes', id: 'n1' })).toBe('mark:notes:n1')
    expect(C.itemKey({ kind: 'message', messageId: 'm1' })).toBe('msg:m1')
    expect(C.itemKey({ kind: 'other' })).toBeNull()
  })

  it('reads a stored one safely, as Favorites was stored before (C144 (j))', () => {
    const old = { id: 'fav', name: 'Favorites', builtIn: 'favorites', items: [{ kind: 'message', messageId: 'm1' }, { kind: 'odd' }] }
    expect(C.cleanCollection(old)).toMatchObject({ items: [{ kind: 'message', messageId: 'm1' }], headings: [], order: [] })
    expect(C.cleanCollection(null)).toBeNull()
  })

  it('cleans a name, or says why it cannot be one', () => {
    expect(C.cleanCollectionName('  Q2   evidence ')).toEqual({ name: 'Q2 evidence' })
    expect(C.cleanCollectionName('  ')).toEqual({ error: 'empty' })
    expect(C.cleanCollectionName('x'.repeat(81))).toEqual({ error: 'long' })
  })

  it('add: holds chats and plans whole, and puts a marking at the end of your order', () => {
    const r = C.withRows(empty(), [row(202, 'chat'), row(203, 'docket'), row(210, 'note')], LATER)
    expect(r.next.items).toEqual([
      { kind: 'chat', conversationId: 'chat-202', num: 202, addedAt: LATER },
      { kind: 'plan', docketId: 'docket203', num: 203, addedAt: LATER },
      { kind: 'marking', store: 'notes', id: 'note210', num: 210, addedAt: LATER },
    ])
    expect(r.next.order).toEqual(['mark:notes:note210'])
    expect(r.next.updatedAt).toBe(LATER)
    const again = C.withRows(r.next, [row(202, 'chat')], LATER)
    expect(again.added).toEqual([])
    expect(again.already.map((x) => x.num)).toEqual([202])
  })

  it('rm: takes out what was added, and names a card held by its chat (C144 (g))', () => {
    const c = C.withRows(empty(), [row(202, 'chat'), row(210, 'note')], NOW).next
    const holderOf = (r) => (r.num === 211 ? { num: 202 } : null)
    const r = C.withoutRows(c, [row(210, 'note'), row(211, 'note'), row(299, 'note')], holderOf, LATER)
    expect(r.removed.map((x) => x.num)).toEqual([210])
    expect(r.held).toEqual([{ row: row(211, 'note'), by: 202 }])
    expect(r.absent.map((x) => x.num)).toEqual([299])
    expect(r.next.items.map(C.itemKey)).toEqual(['chat:chat-202'])
    expect(r.next.order).toEqual([])
  })

  it('places a heading and moves a card in your order (C144 (e))', () => {
    const seq = ['mark:notes:a', 'mark:notes:b', 'mark:notes:c']
    const h = C.withHeading(empty(), { id: 'h1', text: 'Causes', where: 'before', target: 'mark:notes:b' }, seq, LATER)
    expect(h.headings).toEqual([{ id: 'h1', text: 'Causes' }])
    expect(h.order).toEqual(['mark:notes:a', 'head:h1', 'mark:notes:b', 'mark:notes:c'])
    expect(C.withHeading(empty(), { id: 'h1', text: 'End' }, seq, LATER).order).toEqual([...seq, 'head:h1'])
    const m = C.withMoved(h, 'mark:notes:c', 'after', 'mark:notes:a', h.order, LATER)
    expect(m.order).toEqual(['mark:notes:a', 'mark:notes:c', 'head:h1', 'mark:notes:b'])
    const gone = C.withoutHeading(m, 'causes', LATER)
    expect(gone.heading.text).toBe('Causes')
    expect(gone.next.order).toEqual(['mark:notes:a', 'mark:notes:c', 'mark:notes:b'])
    expect(C.withoutHeading(m, 'Effects', LATER)).toBeNull()
  })

  it('empties and names', () => {
    const c = C.withRows(empty({ headings: [{ id: 'h1', text: 'x' }] }), [row(210, 'note')], NOW).next
    expect(C.emptied(c, LATER)).toMatchObject({ items: [], headings: [], order: [], updatedAt: LATER })
    expect(C.named(c, 'Q2', LATER)).toMatchObject({ name: 'Q2', updatedAt: LATER })
  })

  it('finds one by name: the same name first, then the only one it starts', () => {
    const all = [{ id: 'a', name: 'Q2 evidence' }, { id: 'b', name: 'Q2 notes' }, { id: 'c', name: 'Owls' }]
    expect(C.findCollection(all, 'owls').found.id).toBe('c')
    expect(C.findCollection(all, 'Q2 n').found.id).toBe('b')
    expect(C.findCollection(all, 'Q2')).toEqual({ found: null, several: ['Q2 evidence', 'Q2 notes'] })
    expect(C.findCollection(all, '')).toEqual({ found: null, several: [] })
  })
})

describe('writing collections', () => {
  let db
  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory()
    db = await openDB('collections-test', 6, { upgrade: upgradeSchema })
  })
  afterEach(() => db.close())

  it('makes, changes and removes one, newest first when read', async () => {
    const a = empty()
    await C.writeCollection(db, { id: 'c1', before: null, after: a })
    const b = { ...C.newCollection({ id: 'c2', now: LATER }), name: 'Later' }
    await C.writeCollection(db, { id: 'c2', before: null, after: b })
    expect((await C.readCollections(db)).map((c) => c.id)).toEqual(['c2', 'c1'])
    const named = C.named(a, 'Q2', LATER)
    await C.writeCollection(db, { id: 'c1', before: a, after: named })
    expect((await db.get('collections', 'c1')).name).toBe('Q2')
    await C.writeCollection(db, { id: 'c1', before: named, after: null })
    expect(await db.get('collections', 'c1')).toBeUndefined()
  })

  it('writes nothing when the stored one is not what it expects', async () => {
    const a = empty()
    await C.writeCollection(db, { id: 'c1', before: null, after: a })
    await C.writeCollection(db, { id: 'c1', before: a, after: C.named(a, 'Elsewhere', LATER) })
    await expect(C.writeCollection(db, { id: 'c1', before: a, after: C.named(a, 'Here', LATER) })).rejects.toMatchObject({ name: 'Changed' })
    expect((await db.get('collections', 'c1')).name).toBe('Elsewhere')
  })

  it('takes a change back by swapping before and after, as undo: does', async () => {
    const a = empty()
    await C.writeCollection(db, { id: 'c1', before: null, after: a })
    const b = C.withRows(a, [row(210, 'note')], LATER).next
    await C.writeCollection(db, { id: 'c1', before: a, after: b })
    await C.writeCollection(db, { id: 'c1', before: b, after: a })
    expect((await db.get('collections', 'c1')).items).toEqual([])
  })
})
