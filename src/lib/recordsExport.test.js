import { describe, it, expect } from 'vitest'
import { exportItems, chatsOf, gatherExport, exportMarkdown, itemsMarkdown, exportJsonl, exportName, exportType } from './recordsExport'

// Export from Records (stage 6, piece 5; C138).

const row = (num, kind, extra = {}) => ({
  num, kind, id: `${kind}${num}`, chatId: kind === 'chat' ? `c${num}` : null, title: `${kind} ${num}`, text: null,
  tags: [], pinned: false, archived: false, room: null, createdAt: '2026-10-21T10:00:00Z', activeAt: '2026-10-21T11:00:00Z',
  docketNum: null, branch: null, chatNum: null, erasedFrom: null, ...extra,
})
const rows = [
  row(204, 'chat', { title: 'barn owl', docketNum: 203, branch: 'a', tags: ['owls'] }),
  row(206, 'chat', { title: 'Essay plan', docketNum: 203, branch: 'b' }),
  row(203, 'docket', { title: 'barn owl', branches: 2, docketNum: 203 }),
  row(202, 'chat', { title: 'Shortcut test', docketNum: 201, branch: 'a' }),
  row(210, 'note', { chatId: 'c204', chatNum: 204, text: 'Check the range map' }),
  row(212, 'quote', { chatId: null, text: 'Hunts by sound', erasedFrom: 199 }),
]
const by = (n) => rows.find((r) => r.num === n)

describe('what an export holds', () => {
  it('holds each thing once: a plan with its chats, a chat with its markings, a marking only when its chat is not there', () => {
    const items = exportItems([by(203), by(204), by(210), by(202), by(212)], rows)
    expect(items.map((i) => i.row.num)).toEqual([203, 202, 212])
    expect(items[0].chats.map((c) => c.num)).toEqual([204, 206])
    expect(exportItems([by(210)], rows).map((i) => i.row.num)).toEqual([210])
    expect(chatsOf(items).map((c) => c.num)).toEqual([204, 206, 202])
  })
})

describe('reading it', () => {
  const messages = {
    c204: [
      { id: 'm1', role: 'user', content: 'barn owl', createdAt: '2026-10-21T10:00:00Z', attachmentMeta: [{ name: 'owls.csv' }] },
      { id: 'm2', role: 'assistant', content: 'The barn owl hunts by sound.', source: { id: 'wikipedia', name: 'Wikipedia', title: 'Barn owl', url: 'https://en.wikipedia.org/wiki/Barn_owl', revision: '1380781076', licence: { name: 'CC BY-SA 4.0' } } },
      { id: 'm3', role: 'user', content: 'hidden one' },
    ],
    c206: [{ id: 'm4', role: 'assistant', content: 'A plan', model: 'claude-sonnet' }],
    c202: [],
  }
  const read = {
    messagesOf: async (id) => messages[id] ?? [],
    documentOf: async (id) => (id === 'c206' ? { paragraphs: [{ text: 'Draft' }] } : null),
    hiddenOf: (id) => (id === 'c204' ? new Set(['m3']) : new Set()),
  }
  const words = {
    you: 'You', untitled: 'Untitled', by: (m) => (m.source ? m.source.name : 'Claude Sonnet'),
    heading: { note: 'Notes', term: 'Keywords', quote: 'Quotes', document: 'The document' },
    kind: (k) => ({ note: 'Note', term: 'Keyword', quote: 'Quote', docket: 'Plan' })[k], from: (n) => `from ${n}`, fromErased: (n) => `from ${n}, erased`,
    revision: (r) => `revision ${r}`, attached: (names) => `Attached: ${names.join(', ')}`,
    facts: (r) => (r.kind === 'docket' ? [`Plan ${r.num}`, `${r.branches} branches`] : [String(r.num)]),
    exported: 'Exported from Parliament on 21 October 2026. For reading elsewhere: it cannot be brought back in.',
    room: () => '',
  }

  it('leaves hidden messages out, and counts them', async () => {
    const { data, hidden } = await gatherExport(exportItems([by(204)], rows), rows, read)
    expect(hidden).toBe(1)
    expect(data[0].messages.map((m) => m.id)).toEqual(['m1', 'm2'])
    expect(data[0].markings.map((m) => m.num)).toEqual([210])
  })

  it('writes Markdown: a line saying what it is, a plan over its chats, footnotes numbered across the file', async () => {
    const { data } = await gatherExport(exportItems([by(203), by(212)], rows), rows, read)
    const text = exportMarkdown(data, words)
    expect(text.startsWith('*Exported from Parliament on 21 October 2026. For reading elsewhere: it cannot be brought back in.*\n\n---\n\n# barn owl\n\nPlan 203 · 2 branches\n\n## barn owl')).toBe(true)
    expect(text).toContain('*Attached: owls.csv*')
    expect(text).toContain('**Wikipedia[^1]**')
    expect(text).toContain('[^1]: Wikipedia, “Barn owl”, revision 1380781076, CC BY-SA 4.0. <https://en.wikipedia.org/wiki/Barn_owl>')
    expect(text).toContain('### Notes\n\n- 210: Check the range map')
    expect(text).toContain('## Essay plan')
    expect(text).toContain('### The document\n\nDraft')
    expect(text).toContain('> Hunts by sound\n\nQuote 212 · from 199, erased')
    expect(text).not.toContain('hidden one')
    expect(itemsMarkdown(data, words).startsWith('# barn owl')).toBe(true)
  })

  it('writes JSONL: one line per thing, the person\'s words as written, sources and attachments by name', async () => {
    const { data } = await gatherExport(exportItems([by(204), by(212)], rows), rows, read)
    const lines = exportJsonl(data, words).trimEnd().split('\n').map((l) => JSON.parse(l))
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatchObject({
      num: 204, kind: 'chat', title: 'barn owl', tags: ['owls'], plan: 203, branch: 'a',
      messages: [
        { role: 'user', by: null, text: 'barn owl', attachments: ['owls.csv'] },
        { role: 'assistant', by: 'Wikipedia', source: { name: 'Wikipedia', page: 'Barn owl', revision: '1380781076', licence: 'CC BY-SA 4.0' } },
      ],
      markings: [{ num: 210, kind: 'note', text: 'Check the range map' }],
    })
    expect(lines[1]).toEqual({ num: 212, kind: 'quote', text: 'Hunts by sound', room: null, created: '2026-10-21T10:00:00Z', active: '2026-10-21T11:00:00Z', tags: [], pinned: false, archived: false, erasedFrom: 199 })
  })
})

describe('the file', () => {
  it('is named with numbers and a day, never a title', () => {
    expect(exportName({ format: 'md', nums: [204, 206], scope: 'numbers', day: '2026-10-21' })).toBe('parliament-204-206-2026-10-21.md')
    expect(exportName({ format: 'jsonl', nums: [1, 2, 3, 4, 5], scope: 'numbers', day: '2026-10-21' })).toBe('parliament-1-and-4-more-2026-10-21.jsonl')
    expect(exportName({ format: 'md', scope: 'records', day: '2026-10-21' })).toBe('parliament-records-2026-10-21.md')
    expect(exportName({ format: 'md', nums: [204], scope: 'shown', day: '2026-10-21' })).toBe('parliament-records-shown-2026-10-21.md')
    expect(exportType('jsonl')).toBe('application/x-ndjson;charset=utf-8')
  })
})
