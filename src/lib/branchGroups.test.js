import { describe, it, expect, beforeEach } from 'vitest'
import { lineItems, membersOf, segmentOf, stepFrom } from './branchGroups'
import * as view from '../stores/branchView'
import { watch, watched, _reset } from '../stores/chatStore'

// The slider of branches (stage 8, piece 2; C173).

const g = { id: 'g1', chats: ['a', 'b', 'c'] }
const m = (id, role, content, extra = {}) => ({ id, role, content, createdAt: id, ...extra })
const shared = [m('1', 'user', 'Hi'), m('2', 'assistant', 'Hello')]
const line = [...shared, m('3', 'user', 'Why?', { group: g }), m('4', 'assistant', 'A says')]
const b = [...shared, m('3b', 'user', 'Why?', { group: g }), m('4b', 'assistant', 'B says', { source: { id: 'wikipedia', name: 'Wikipedia' } })]
const c = [...shared, m('3c', 'user', 'Why?', { group: g }), m('4c', 'assistant', 'C says')]

describe('what a room draws for a prompt sent to several', () => {
  it('names the other branches to read', () => {
    expect(membersOf(line, 'a')).toEqual(['b', 'c'])
    expect(membersOf(shared, 'a')).toEqual([])
  })

  it('puts a slider in place of the replies, one tab each, in the order chosen', () => {
    const items = lineItems(line, 'a', new Map([['b', b], ['c', c]]))
    expect(items.slice(0, 3).map((x) => x.id)).toEqual(['1', '2', '3'])
    const s = items[3]
    expect(s).toMatchObject({ kind: 'slider', groupId: 'g1', mode: 'below' })
    expect(s.tabs.map((t) => [t.chatId, t.line, t.reply.map((r) => r.id)])).toEqual([['a', true, ['4']], ['b', false, ['4b']], ['c', false, ['4c']]])
    expect(items).toHaveLength(4)
  })

  it('draws a branch not read yet as waiting, and leaves out one removed since', () => {
    const items = lineItems(line, 'a', new Map([['c', [...shared]]]))
    expect(items[3].tabs.map((t) => [t.chatId, t.loaded])).toEqual([['a', true], ['b', false]])
  })

  it('carries the line on below the tabs while only it goes on', () => {
    const more = [...line, m('5', 'user', 'And then?'), m('6', 'assistant', 'Then A says')]
    const items = lineItems(more, 'a', new Map([['b', b], ['c', c]]))
    expect(items[3].mode).toBe('below')
    expect(items.slice(4).map((x) => x.id)).toEqual(['5', '6'])
  })

  it('holds each branch’s whole thread in its tab once more than one goes on', () => {
    const more = [...line, m('5', 'user', 'And then?'), m('6', 'assistant', 'Then A says')]
    const bMore = [...b, m('5b', 'user', 'And then?'), m('6b', 'assistant', 'Then B says')]
    const items = lineItems(more, 'a', new Map([['b', bMore], ['c', c]]))
    expect(items[3].mode).toBe('tabs')
    expect(items[3].tabs[1].after.map((x) => x.id)).toEqual(['5b', '6b'])
    expect(items).toHaveLength(4)
  })

  it('draws an older group the line is not part of as plain messages', () => {
    const copy = [m('1', 'user', 'Why?', { group: { id: 'g0', chats: ['x', 'y'] } }), m('2', 'assistant', 'X says')]
    expect(lineItems(copy, 'z').map((x) => x.id)).toEqual(['1', '2'])
  })

  it('finds a branch’s part from its prompt', () => {
    expect(segmentOf(b, 'g1')).toMatchObject({ prompt: { id: '3b' }, reply: [{ id: '4b' }], after: [] })
    expect(segmentOf(shared, 'g1')).toBeNull()
  })
})

describe('stepping through tabs', () => {
  beforeEach(() => view._reset())

  it('steps the slider on screen, and stops at either end', () => {
    expect(view.step(1)).toBe(false)
    const off = view.onScreen('g1', ['a', 'b', 'c'])
    expect(view.step(1)).toBe(true)
    expect(view.viewedIn('g1')).toBe('b')
    view.step(1); view.step(1)
    expect(view.viewedIn('g1')).toBe('c')
    view.step(-1)
    expect(view.viewedIn('g1')).toBe('b')
    off()
    expect(view.lastShown()).toBeNull()
    expect(stepFrom(['a', 'b'], 'a', -1)).toBeNull()
  })
})

describe('a chat is left only when nothing shows it (C173)', () => {
  beforeEach(() => _reset())

  it('stays shown while a room or a slider still shows it', () => {
    const room = watch('a')
    const slider = watch('a')
    room()
    expect(watched('a')).toBe(true)
    slider()
    expect(watched('a')).toBe(false)
    slider()
    expect(watched('a')).toBe(false)
  })
})
