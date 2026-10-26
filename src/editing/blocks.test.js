import { describe, it, expect } from 'vitest'
import { EditorState } from 'prosemirror-state'
import { replyFromMarkdown } from './fromMarkdown'
import { toBlocks, fromBlocks } from './blocks'
import { editsIn } from './edits'
import { track, createIds, createEditIds } from './track'

const md = [
  '# The furnace',
  '',
  'It had not gone out in **eleven years**, said [the guild](https://example.org/guild).',
  '',
  '- one',
  '- [x] two',
  '',
  '| a | b |',
  '| --- | --- |',
  '| 1 | 2 |',
  '',
  '```chart',
  '{"type":"bar","title":"Glass","labels":["a"],"datasets":[{"values":[1]}]}',
  '```',
  '',
  '<script>alert(1)</script> and ![a picture](javascript:alert(1))',
].join('\n')

describe('a reply in its stored form (C212 (b))', () => {
  it('comes back the same after a round trip, edits and all', () => {
    const ids = createIds(240)
    const doc = replyFromMarkdown(md, ids.block, { anchors: 'msg-m1' })
    let state = EditorState.create({ doc })
    const from = 1 + doc.child(0).nodeSize + 'It had not gone out in '.length + 1
    state = state.apply(track(state, state.tr.insertText('nearly a century', from, from + 'eleven years'.length), { ids }))
    const stored = JSON.parse(JSON.stringify(toBlocks(state.doc)))
    const back = fromBlocks(stored, ids.block)
    expect(back.eq(state.doc)).toBe(true)
    expect([...editsIn(back).values()]).toEqual([...editsIn(state.doc).values()])
  })

  it('keeps the heading anchors the table of contents finds, and the chart\'s own text', () => {
    const ids = createIds(240)
    const blocks = toBlocks(replyFromMarkdown(md, ids.block, { anchors: 'msg-m1' }))
    expect(blocks[0]).toMatchObject({ type: 'heading', level: 1, anchor: 'msg-m1-h-0' })
    const chart = blocks.find((b) => b.type === 'chart')
    expect(JSON.parse(chart.data).title).toBe('Glass')
    expect(blocks.find((b) => b.type === 'table').rows).toEqual([['a', 'b'], ['1', '2']])
  })

  it('reads HTML in a reply as words, and never keeps an unsafe address', () => {
    const ids = createIds(240)
    const blocks = toBlocks(replyFromMarkdown(md, ids.block))
    const last = blocks[blocks.length - 1]
    expect(last.text.map((r) => r.text).join('')).toContain('<script>alert(1)</script>')
    expect(last.text.some((r) => r.link)).toBe(false)
  })

  it('takes only what it knows from stored blocks', () => {
    const ids = createEditIds()
    const doc = fromBlocks([
      { type: 'paragraph', id: 'b1', text: [{ text: 'ok', link: 'javascript:alert(1)', onclick: 'x' }, { text: '!', struck: 'e1', added: 'e2' }] },
      { type: 'script', id: 'b2', text: [{ text: 'gone' }] },
      { type: 'heading', id: 'b1', level: 9, anchor: '"><img src=x>', text: [{ text: 'H' }] },
      { type: 'table', rows: [[1, null], 'not a row'] },
      'nonsense',
    ], ids.block)
    const back = toBlocks(doc)
    expect(back).toHaveLength(3)
    expect(back[0].text).toEqual([{ text: 'ok' }, { text: '!', struck: 'e1' }])
    expect(back[1]).toMatchObject({ type: 'heading', level: 1 })
    expect(back[1].anchor).toBeUndefined()
    expect(back[1].id).not.toBe('b1')
    expect(back[2].rows).toEqual([['1', '']])
  })

  it('gives nothing for nothing usable', () => {
    expect(fromBlocks(null, () => 'b')).toBeNull()
    expect(fromBlocks([{ type: 'nope' }], () => 'b')).toBeNull()
  })
})

describe('edit ids for a reply on screen', () => {
  it('are short, and a new one comes only once the last is used', () => {
    const ids = createEditIds()
    const a = ids.peek()
    expect(a).toMatch(/^[0-9a-f]{10}$/)
    expect(ids.peek()).toBe(a)
    ids.commit(a)
    expect(ids.peek()).not.toBe(a)
  })
})
