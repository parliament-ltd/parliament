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

  it('turns a branch family into one docket, root A and fork B, in run 1', () => {
    expect(plan.dockets).toHaveLength(1)
    const d = plan.dockets[0]
    expect(d.title).toBe('Water tower')
    expect(d.order).toEqual(['A', 'B'])
    expect(d.nextLetter).toBe(2)
    expect(d.branches[1].name).toBe('Water tower')
    const run = plan.runs[0]
    expect(run.n).toBe(1)
    expect(run.branches.A.chatId).toBe('conv-root')
    expect(run.branches.B.chatId).toBe('conv-fork')
    expect(run.branches.A.room).toBe('writing-studio')
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
      ...plan.highlightUpdates.map((h) => h.num),
      ...plan.newHighlights.map((h) => h.num),
    ]
    expect(new Set(nums).size).toBe(nums.length)
    expect(Math.min(...nums)).toBe(201)
    expect(plan.dockets[0].num).toBe(201)
    expect(plan.conversationUpdates.find((c) => c.id === 'conv-root').num).toBe(202)
    expect(plan.nextNum).toBe(201 + nums.length)
  })

  it('turns each user turn into a done step pointing at its message', () => {
    expect(plan.runs[0].branches.A.steps).toEqual([{ status: 'done', model: 'claude-sonnet', messageId: 'm1' }])
    expect(plan.runs[0].branches.A.status).toBe('done')
  })

  it('turns a favorite into a pinned highlight of the whole message', () => {
    expect(plan.newHighlights).toHaveLength(1)
    expect(plan.newHighlights[0]).toMatchObject({
      conversationId: 'conv-fork', messageId: 'm4', text: 'Here is a draft.', pinned: true, fromFavorite: 'f1',
    })
  })
})

describe('planV6Migration edge cases', () => {
  it('gives a lone chat its own docket', () => {
    const plan = planV6Migration({ conversations: [conv('a', '2026-01-01')], messages: [] }, { newId: counter() })
    expect(plan.dockets).toHaveLength(1)
    expect(plan.dockets[0].order).toEqual(['A'])
    expect(plan.runs[0].branches.A.status).toBe('ready')
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
    expect(plan.runs[0].branches.A.steps.map((s) => s.status)).toEqual(['paused', 'paused'])
    expect(plan.runs[0].branches.A.status).toBe('paused')
  })

  it('orders letters by creation, skipping I, and keeps forks of forks in the same docket', () => {
    const convs = [conv('root', '2026-01-01')]
    for (let i = 1; i <= 9; i++) convs.push(conv(`f${i}`, `2026-01-0${i + 1 > 9 ? 9 : i + 1}T0${i}:00:00Z`, { parentId: i === 9 ? 'f8' : 'root' }))
    const plan = planV6Migration({ conversations: convs, messages: [] }, { newId: counter() })
    expect(plan.dockets).toHaveLength(1)
    expect(plan.dockets[0].order).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'])
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

  it('does not touch anything when there is nothing to migrate', () => {
    const plan = planV6Migration({}, { newId: counter() })
    expect(plan.dockets).toEqual([])
    expect(plan.nextNum).toBe(201)
  })
})
