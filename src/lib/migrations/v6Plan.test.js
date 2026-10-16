import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { planV6Migration } from './v6Plan'
import { contentsToFlatStores } from '../backupFormat'

const fixture = JSON.parse(readFileSync(new URL('../__fixtures__/backup-v1.json', import.meta.url), 'utf8'))

function counter() {
  let n = 0
  return () => `id-${++n}`
}

const conv = (id, createdAt, extra = {}) => ({
  id, title: id, model: 'claude-sonnet', parentId: null, branchPoint: null, room: 'writing-studio',
  pinned: false, storageBytes: 0, createdAt, updatedAt: createdAt, ...extra,
})
const msg = (id, conversationId, role, createdAt, extra = {}) => ({
  id, conversationId, role, content: `${role} ${id}`, tokenCount: 1, incomplete: false, createdAt, ...extra,
})

describe('planV6Migration on the fixture', () => {
  const flat = contentsToFlatStores(fixture.contents)
  const plan = planV6Migration(flat, { newId: counter(), now: '2026-09-23T00:00:00.000Z' })

  it('turns a branch family into one docket, root a and fork b, in run 1', () => {
    expect(plan.dockets).toHaveLength(1)
    const d = plan.dockets[0]
    expect(d.title).toBe('Water tower')
    expect(d.order).toEqual(['a', 'b'])
    expect(d.nextLetter).toBe(2)
    expect(d.branches[1].name).toBe('Water tower')
    const run = plan.runs[0]
    expect(run.n).toBe(1)
    expect(run.branches.a.chatId).toBe('conv-root')
    expect(run.branches.b.chatId).toBe('conv-fork')
    expect(run.branches.a.room).toBe('writing-studio')
  })

  it('records where the fork was taken, by chat number and step', () => {
    const b = plan.dockets[0].branches[1]
    const rootNum = plan.conversationUpdates.find((c) => c.id === 'conv-root').num
    expect(b.forkedFrom).toEqual({ chatNum: rootNum, step: 1 })
  })

  it('numbers everything once, from 201, docket before its first chat', () => {
    const nums = [
      plan.dockets[0].num,
      ...plan.conversationUpdates.map((c) => c.num),
      ...plan.noteUpdates.map((n) => n.num),
      ...plan.termUpdates.map((t) => t.num),
      ...plan.quoteUpdates.map((q) => q.num),
      ...plan.newNotes.map((n) => n.num),
    ]
    expect(new Set(nums).size).toBe(nums.length)
    expect(Math.min(...nums)).toBe(201)
    expect(plan.dockets[0].num).toBe(201)
    expect(plan.conversationUpdates.find((c) => c.id === 'conv-root').num).toBe(202)
    expect(plan.nextNum).toBe(201 + nums.length)
  })

  it('turns each user turn into a done step pointing at its message, with no condition', () => {
    expect(plan.runs[0].branches.a.steps).toEqual([{ status: 'done', model: 'claude-sonnet', messageId: 'm1', condition: null }])
    expect(plan.runs[0].branches.a.status).toBe('done')
  })

  it('turns today\'s highlights into numbered terms, unchanged', () => {
    expect(plan.termUpdates.length).toBe((flat.highlights || []).length)
    for (const t of plan.termUpdates) expect(t).toMatchObject({ kind: 'term' })
  })

  it('puts favourites into the built-in Favorites collection, and makes no highlights from them', () => {
    expect(plan.collections).toHaveLength(1)
    // A key, not an English word, so the name follows the interface language.
    expect(plan.collections[0].name).toBeNull()
    expect(plan.collections[0].builtIn).toBe('favorites')
    expect(plan.collections[0].items).toEqual([
      { kind: 'message', conversationId: 'conv-fork', messageId: 'm4', addedAt: '2026-08-02T09:06:00.000Z', fromFavorite: 'f1' },
    ])
    expect(plan.report.counts.favoritesToCollection).toBe(1)
    expect(plan.newHighlights).toBeUndefined()
  })
})

describe('planV6Migration edge cases', () => {
  it('gives a lone chat its own docket', () => {
    const plan = planV6Migration({ conversations: [conv('a', '2026-01-01')], messages: [] }, { newId: counter() })
    expect(plan.dockets).toHaveLength(1)
    expect(plan.dockets[0].order).toEqual(['a'])
    expect(plan.runs[0].branches.a.status).toBe('ready')
  })

  it('marks a turn whose reply was cut off, or never came, as paused', () => {
    const plan = planV6Migration({
      conversations: [conv('a', '2026-01-01')],
      messages: [
        msg('u1', 'a', 'user', '2026-01-01T00:00:01Z'),
        msg('r1', 'a', 'assistant', '2026-01-01T00:00:02Z', { incomplete: true }),
        msg('u2', 'a', 'user', '2026-01-01T00:00:03Z'),
      ],
    }, { newId: counter() })
    expect(plan.runs[0].branches.a.steps.map((s) => s.status)).toEqual(['paused', 'paused'])
    expect(plan.runs[0].branches.a.status).toBe('paused')
  })

  it('orders letters by creation, skipping i, and keeps forks of forks in the same docket', () => {
    const convs = [conv('root', '2026-01-01')]
    for (let i = 1; i <= 9; i++) convs.push(conv(`f${i}`, `2026-01-0${i + 1 > 9 ? 9 : i + 1}T0${i}:00:00Z`, { parentId: i === 9 ? 'f8' : 'root' }))
    const plan = planV6Migration({ conversations: convs, messages: [] }, { newId: counter() })
    expect(plan.dockets).toHaveLength(1)
    expect(plan.dockets[0].order).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'j', 'k'])
  })

  it('makes a branch whose parent is gone the root of its own docket, and says so', () => {
    const plan = planV6Migration({ conversations: [conv('x', '2026-01-01', { parentId: 'gone' })], messages: [] }, { newId: counter() })
    expect(plan.dockets).toHaveLength(1)
    expect(plan.dockets[0].branches[0].forkedFrom).toBeUndefined()
    expect(plan.report.warnings.some((w) => w.includes('no longer exists'))).toBe(true)
  })

  it('turns the scratchpad into a note', () => {
    const plan = planV6Migration({ conversations: [], messages: [], settings: [{ key: 'scratchpad-text', value: 'Buy stamps' }] }, { newId: counter(), now: '2026-09-23T00:00:00.000Z' })
    expect(plan.newNotes).toHaveLength(1)
    expect(plan.newNotes[0]).toMatchObject({ text: 'Buy stamps', num: 201, conversationId: null })
  })

  it('carries personas over as collabs of your own, all switched off', () => {
    const personas = JSON.stringify([
      { id: 'p1', title: 'Skeptic', instruction: 'Question every claim.' },
      { id: 'p2', title: 'Empty', instruction: '   ' },
    ])
    const plan = planV6Migration({ settings: [{ key: 'parrotPersonas', value: personas }] }, { newId: counter(), now: '2026-10-15T00:00:00.000Z' })
    expect(plan.collabs).toEqual([
      { id: 'id-1', name: 'Skeptic', instruction: 'Question every claim.', builtIn: false, on: false, fromPersona: 'p1', createdAt: '2026-10-15T00:00:00.000Z' },
    ])
    expect(plan.report.warnings.some((w) => w.includes('no instruction'))).toBe(true)
  })

  it('numbers pinned references as quotes, without changing them', () => {
    const plan = planV6Migration({
      conversations: [conv('a', '2026-01-01'), conv('b', '2026-01-02')],
      messages: [msg('m1', 'a', 'assistant', '2026-01-01T00:00:01Z')],
      pins: [{ id: 'pin1', targetConversationId: 'b', sourceConversationId: 'a', sourceMessageId: 'm1', content: 'kept', createdAt: '2026-01-03' }],
    }, { newId: counter() })
    expect(plan.quoteUpdates).toEqual([{ id: 'pin1', num: 205, kind: 'quote' }])
    expect(plan.report.quotes[0]).toMatchObject({ num: 205, excerpt: 'kept' })
  })

  it('marks tags on chats as made by the model', () => {
    const plan = planV6Migration({ conversations: [conv('a', '2026-01-01', { tags: ['travel'] }), conv('b', '2026-01-02')] }, { newId: counter() })
    expect(plan.conversationUpdates.find((u) => u.id === 'a').tagsBy).toBe('model')
    expect(plan.conversationUpdates.find((u) => u.id === 'b').tagsBy).toBeUndefined()
  })

  it('moves a saved key to the key store, and never shows its value', () => {
    const plan = planV6Migration({ settings: [{ key: 'parliament-api-key', value: { ciphertext: [1, 2, 3], iv: [4] } }] }, { newId: counter() })
    expect(plan.keyMove).toEqual({ provider: 'anthropic', fromSetting: 'parliament-api-key' })
    expect(JSON.stringify(plan.report)).not.toContain('ciphertext')
  })

  it('stores no interface words: a missing title stays empty for the interface to fill', () => {
    const plan = planV6Migration({ conversations: [conv('a', '2026-01-01', { title: '' })] }, { newId: counter() })
    expect(plan.dockets[0].title).toBeNull()
    expect(plan.dockets[0].branches[0].name).toBeNull()
    expect(JSON.stringify(plan)).not.toContain('Untitled')
  })

  it('does not touch anything when there is nothing to migrate', () => {
    const plan = planV6Migration({}, { newId: counter() })
    expect(plan.dockets).toEqual([])
    expect(plan.collections).toEqual([])
    expect(plan.collabs).toEqual([])
    expect(plan.keyMove).toBeNull()
    expect(plan.nextNum).toBe(201)
  })
})
