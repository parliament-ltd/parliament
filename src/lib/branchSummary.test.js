import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openDB } from 'idb'
import { setupI18n } from '@lingui/core'
import { messages as en } from '../locales/en/messages.mjs'
import { upgradeSchema } from './schema'
import * as R from './records'
import { planRestore } from './restorePlan'
import { validateBackup } from './validate'
import { summaryTurns, contextShare, planBranchSummary, BRANCH_SUMMARY_READS } from './branchSummary'
import { forModel, SUMMARY_LEAD } from '../stores/sendHistory'
import { preview } from '../chrome/preview'
import { say } from '../chrome/say'
import { shipped, planRoom } from '../shell/arrangement'

// A branch in its own room, and from a summary (stage 8, piece 4; C175).

const i18n = setupI18n({ locale: 'en', messages: { en } })
i18n.activate('en')
const words = (says) => [say(i18n, says.message, says.values), ...(says.also ?? []).map((x) => say(i18n, x.message, x.values))]

const haiku = { id: 'claude-haiku-5-5', group: 'model', name: 'Haiku 5.5', provider: 'anthropic', providerName: 'Anthropic', price: { type: 'metered', inputPerMillion: 1, outputPerMillion: 5 } }
const bonsai = { id: 'ollama:bonsai-2:9b', group: 'local', name: 'bonsai-2:9b', provider: 'ollama', providerName: 'Ollama', price: { type: 'free-local' } }
const sonnet = { name: 'Sonnet 5.5', group: 'model', window: 1_000_000 }
const facts = (over = {}) => ({ address: '203b', plan: 203, next: '203d', chatId: 'c2', chars: 40_000, sources: [], answerer: sonnet, helper: haiku, ...over })

describe('what the helper is given', () => {
  it('labels each turn with who wrote it, sources marked, invisible characters out', () => {
    const { turns, left } = summaryTurns([
      { role: 'user', content: 'What is a barn owl?' },
      { role: 'assistant', content: 'The barn owl​ is a bird.', source: { id: 'wikipedia', name: 'Wikipedia' } },
      { role: 'assistant', content: 'It hunts by sound.', model: 'claude-sonnet-5-5' },
      { role: 'assistant', content: '' },
    ], { modelName: (id) => (id === 'claude-sonnet-5-5' ? 'Sonnet 5.5' : null) })
    expect(turns).toEqual([
      { label: 'person', text: 'What is a barn owl?' },
      { label: 'source: Wikipedia', text: 'The barn owl is a bird.' },
      { label: 'model: Sonnet 5.5', text: 'It hunts by sound.' },
    ])
    expect(left).toBe(0)
  })

  it('reads the latest part of a chat longer than it reads', () => {
    const long = 'x'.repeat(BRANCH_SUMMARY_READS - 10)
    const { turns, left } = summaryTurns([{ role: 'user', content: 'first' }, { role: 'assistant', content: long }, { role: 'user', content: 'last one' }])
    expect(turns.map((t) => t.label)).toEqual(['model', 'person'])
    expect(left).toBe(1)
  })
})

describe('the Enter line of open:203b summary', () => {
  it('names the call, its cost, and the room it frees', () => {
    expect(words(planBranchSummary(facts()).says)).toEqual([
      'Enter starts 203d from a summary of 203b: one call to Haiku 5.5, about 10,250 tokens, $0.01',
      'Context 1% → under 1% of what Sonnet 5.5 reads at once',
    ])
    const small = planBranchSummary(facts({ answerer: { name: 'Mistral Small 4', group: 'model', window: 256_000 }, chars: 400_000 }))
    expect(words(small.says)[1]).toBe('Context 39% → under 1% of what Mistral Small 4 reads at once')
  })

  it('says what a model on this computer reads, and that nothing leaves it', () => {
    const p = planBranchSummary(facts({ helper: bonsai, answerer: { name: 'bonsai-2:9b', group: 'local', window: 4000 }, chars: 20_000, localReads: 4000 }))
    expect(words(p.says)).toEqual([
      'Enter starts 203d from a summary of 203b, written by bonsai-2:9b on this computer. Nothing leaves it',
      'It is longer than bonsai-2:9b reads at once. From a summary, about 10%',
      'This chat is about 5,250 tokens. bonsai-2:9b may read only the last 4,000 or so, unless Ollama is set to read more',
    ])
    expect(p.act).toMatchObject({ kind: 'branchSummary', chatId: 'c2', address: '203b', plan: 203, helper: { id: 'ollama:bonsai-2:9b', provider: 'ollama' } })
  })

  it('says when sources go into it, and when the filter swaps first', () => {
    const p = planBranchSummary(facts({ sources: ['Wikipedia'], privacy: 'patterns' }))
    expect(words(p.says).slice(2)).toEqual([
      'The answers from Wikipedia go into it too, marked as from a source',
      'The privacy filter swaps what it finds for placeholders before it goes',
    ])
  })

  it('refuses with nothing to write it, or nothing to summarize', () => {
    expect(words(planBranchSummary(facts({ helper: null })).says)[0]).toBe('Nothing here can write a summary of 203b. A model on this computer, or a key for a provider, would: api: adds one')
    expect(words(planBranchSummary(facts({ helper: { ...haiku, needsKey: true } })).says)[0]).toBe('Haiku 5.5 needs a key for Anthropic. api:anthropic adds one')
    expect(planBranchSummary(facts({ chars: 0 })).act).toBeNull()
  })

  it('works the share out from characters, four to a token', () => {
    expect(contextShare(800_000, 1_000_000)).toEqual({ tokens: 200_000, share: 20, after: 0.04 })
    expect(contextShare(100, null)).toBeNull()
  })
})

describe('open: on a branch, from the bar', () => {
  const rows = [
    { kind: 'chat', num: 204, chatId: 'c1', docketNum: 203, branch: 'a', words: 'a'.repeat(4000), sources: [] },
    { kind: 'chat', num: 205, chatId: 'c2', docketNum: 203, branch: 'b', words: 'b'.repeat(4000), sources: ['wikipedia'] },
  ]
  const screens = {
    records: { rows },
    summarizing: { helper: haiku, privacy: 'off', factsOf: (id) => (id === 'c2' ? facts({ chars: 4000, sources: ['Wikipedia'] }) : null) },
  }
  const line = (value, arrangement = shipped('almanac')) => {
    const p = preview(value, { mode: 'command', arrangement, screens })
    return { ...p, text: p.says ? words(p.says) : [] }
  }

  it('shows the branch with its history, keeping its letter', () => {
    expect(line('>open:203b').text[0]).toBe('Enter opens 203b in a room beside what is here, with its whole history. No call, and it keeps its letter')
    const withRoom = planRoom(shipped('almanac'), 'c1').next
    // In a room of its own beside the one here (C175 (a), ruled 23 October).
    const beside = line('>open:203b', withRoom)
    expect(beside.text[0]).toBe('Enter opens 203b in a room beside what is here, with its whole history. No call, and it keeps its letter')
    expect(beside.next.context['room-2']).toBe('c2')
    const empty = planRoom(shipped('almanac'), null).next
    expect(line('>open:203b', empty).text[0]).toBe('Enter shows 203b in the room here, with its whole history. No call, and it keeps its letter')
    expect(line('>open:203a', withRoom).text[0]).toBe('203a is in the room here already')
    expect(line('>open:203c').text[0]).toBe('Nothing here has the number 203c')
  })

  it('plans the summary as an act, alone on its line', () => {
    const p = line('>open:203b summary')
    expect(p.text[0]).toBe('Enter starts 203d from a summary of 203b: one call to Haiku 5.5, about 1,250 tokens, under $0.01')
    expect(p.act).toMatchObject({ kind: 'branchSummary', chatId: 'c2', next: '203d' })
    expect(line('>open:203b summary records:').text[0]).toBe('open:203b summary runs on a line of its own, so its Enter line can name who receives it and what it costs')
  })
})

describe('what a model is sent of a branch that starts from a summary', () => {
  it('goes on the person’s side, said to be a summary, with the next prompt', () => {
    const turns = forModel([
      { role: 'assistant', content: 'They asked about barn owls.', summary: { of: 'c2', upTo: 'm9' } },
      { role: 'user', content: 'And their calls?' },
    ])
    expect(turns).toEqual([{ role: 'user', content: `${SUMMARY_LEAD}\n\n<summary>\nThey asked about barn owls.\n</summary>\n\nAnd their calls?` }])
  })
})

let n = 0
const newId = () => `id-${++n}`
let clock = 0
const at = () => new Date(Date.UTC(2026, 9, 22, 10, 0, clock++)).toISOString()
const chat = (extra = {}) => {
  const now = at()
  return { id: newId(), title: 'Owls', model: 'claude-sonnet-5-5', parentId: null, branchPoint: null, createdInMode: null, room: 'mode_1', pinned: false, storageBytes: 0, createdAt: now, updatedAt: now, ...extra }
}
const message = (conversationId, role, content, extra = {}) => ({ id: newId(), conversationId, role, content, tokenCount: 1, incomplete: false, createdAt: at(), ...extra })

describe('the branch a summary starts', () => {
  let db
  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory()
    n = 0
    clock = 0
    db = await openDB('summary-test', 6, { upgrade: upgradeSchema })
  })
  afterEach(() => db.close())

  it('is the plan’s next letter, holding only the summary, which points at what it read', async () => {
    const c = await R.createChat(db, chat({ answerer: 'claude-sonnet-5-5' }))
    await R.addMessageRecord(db, message(c.id, 'user', 'barn owl'))
    const a = await R.addMessageRecord(db, message(c.id, 'assistant', 'It hunts by sound.'))
    const made = await R.createSummaryChat(db, { sourceId: c.id, text: 'They asked about barn owls.', by: 'claude-haiku-5-5', title: 'Owls', answerer: 'claude-sonnet-5-5', newId, now: at() })
    expect([made.branch, made.docketId, made.answerer, made.branchPoint]).toEqual(['b', c.docketId, 'claude-sonnet-5-5', a.id])
    const inside = await db.getAllFromIndex('messages', 'conversationId', made.id)
    expect(inside).toHaveLength(1)
    expect(inside[0]).toMatchObject({ role: 'assistant', content: 'They asked about barn owls.', model: 'claude-haiku-5-5', summary: { of: c.id, upTo: a.id } })
  })

  it('is refused for a chat with nothing in it', async () => {
    const c = await R.createChat(db, chat())
    await expect(R.createSummaryChat(db, { sourceId: c.id, text: 'x', newId, now: at() })).rejects.toThrow()
  })
})

describe('a restore keeps what a summary points at, and checks it', () => {
  it('rewrites the chat and message ids when they change', () => {
    const flat = {
      conversations: [{ id: 'c1', title: 'Owls' }, { id: 'c2', title: 'Owls', parentId: 'c1' }],
      messages: [
        { id: 'm1', conversationId: 'c1', role: 'user', content: 'owls', createdAt: '2026-10-22T10:00:00Z' },
        { id: 'm2', conversationId: 'c2', role: 'assistant', content: 'A summary', createdAt: '2026-10-22T10:01:00Z', summary: { of: 'c1', upTo: 'm1' } },
      ],
    }
    const here = { chat: { id: 'c1', title: 'Something else' }, messages: [{ id: 'm1', conversationId: 'c1', role: 'user', content: 'other', createdAt: '2026-10-21T10:00:00Z' }], document: null }
    const existing = { chats: new Map([['c1', here]]), messages: new Set(['m1']), notes: new Map(), highlights: new Map(), favorites: new Map(), pins: new Map() }
    let k = 0
    const plan = planRestore(flat, { strategy: 'merge', existing, newId: () => `new-${++k}`, now: '2026-10-22T12:00:00Z' })
    const s = plan.writes.messages.find((m) => m.conversationId === 'c2')
    expect(s.summary).toEqual({ of: plan.renamedConvIds.get('c1'), upTo: plan.renamedMsgIds.get('m1') })
  })

  it('accepts only a well-formed summary note', () => {
    const backup = (m) => ({
      conversations: [{ id: 'c1', title: 'Owls', model: 'x', pinned: false, storageBytes: 0, tags: [], createdAt: '2026-10-22T10:00:00Z', updatedAt: '2026-10-22T10:00:00Z' }],
      messages: [{ id: 'm1', conversationId: 'c1', role: 'assistant', content: 'x', tokenCount: 0, incomplete: false, createdAt: '2026-10-22T10:00:00Z', ...m }],
    })
    expect(validateBackup(backup({ summary: { of: 'c0', upTo: 'm0' } })).valid).toBe(true)
    expect(validateBackup(backup({ summary: { of: 'c0' } })).valid).toBe(false)
    expect(validateBackup(backup({ summary: { of: 'c0', upTo: 'm0', run: 'x' } })).valid).toBe(false)
  })
})
