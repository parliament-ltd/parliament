import { describe, it, expect } from 'vitest'
import { waitingByChat, goingIn, chatsWaiting, spansBranches, withWaiting, listOf, goesTo } from './sendList'

// What Enter sends, by branch (C301 (d), the list).

const ask = (num, chatId, extra = {}) => ({ kind: 'ask', num, chatId, change: { kind: 'ask', question: `q${num}`, passage: `p${num}`, point: false, state: 'open', held: false, sent: null, ...extra } })
const edit = (num, chatId, extra = {}) => ({ kind: 'edit', num, chatId, change: { kind: 'edit', struck: 'three', added: 'four', held: false, sent: null, ...extra } })
const rows = [
  ask(242, 'a'), ask(241, 'a'), edit(243, 'a'),
  ask(250, 'b'), ask(251, 'b', { held: true }),
  // Gone, answered, or in another chat: not waiting here.
  ask(260, 'a', { sent: { to: 'm' } }), ask(261, 'a', { state: 'answered' }), edit(262, 'z'),
  { kind: 'chat', num: 201, chatId: 'a' },
]

describe('what waits in each branch', () => {
  const by = waitingByChat(rows, ['a', 'b', 'c'])
  it('lists each branch\'s prompts and edits not yet sent, held ones too, in number order', () => {
    expect(by.get('a').prompts.map((p) => p.num)).toEqual([241, 242])
    expect(by.get('a').edits.map((e) => e.num)).toEqual([243])
    expect(by.get('b').prompts).toEqual([{ num: 250, question: 'q250', passage: 'p250', point: false, held: false }, { num: 251, question: 'q251', passage: 'p251', point: false, held: true }])
    expect(by.get('c')).toEqual({ prompts: [], edits: [] })
  })
  it('counts what goes, leaving out what is held back', () => {
    expect(goingIn(by.get('b'))).toEqual({ prompts: 1, edits: 0 })
    expect(chatsWaiting(by)).toEqual(['a', 'b'])
    expect(spansBranches(by)).toBe(true)
    expect(spansBranches(waitingByChat(rows, ['a', 'c']))).toBe(false)
  })
})

describe('where Enter sends, among the branches', () => {
  it('adds every branch with something going to the one viewed, in the branches\' order', () => {
    expect(withWaiting({ chats: ['b'], why: 'viewed' }, ['a', 'b', 'c'], ['a'])).toEqual({ chats: ['a', 'b'], why: 'waiting' })
    expect(withWaiting({ chats: ['a'], why: 'line' }, ['a', 'b'], ['a'])).toEqual({ chats: ['a'], why: 'line' })
  })
  it('leaves the branches to: chose as they are', () => {
    expect(withWaiting({ chats: ['c'], why: 'held' }, ['a', 'b', 'c'], ['a', 'b'])).toEqual({ chats: ['c'], why: 'held' })
    expect(withWaiting(null, ['a'], ['a'])).toBeNull()
  })
})

describe('the list and its line', () => {
  const by = waitingByChat(rows, ['a', 'b', 'c'])
  const members = [{ chatId: 'a', address: '201a', name: 'Sonnet 5.5' }, { chatId: 'b', address: '201b', name: 'Haiku 4.5' }, { chatId: 'c', address: '201c', name: 'Mistral Medium' }]
  const list = listOf({ members, targets: ['a', 'b'], by, room: 'a' })
  it('has a row for each branch, ticked when Enter sends to it', () => {
    expect(list.map((b) => [b.address, b.ticked, b.here])).toEqual([['201a', true, true], ['201b', true, false], ['201c', false, false]])
  })
  it('says what goes to each branch ticked, and who answers it', () => {
    expect(goesTo(list)).toEqual([
      { chatId: 'a', address: '201a', name: 'Sonnet 5.5', prompts: 2, edits: 1, chars: 8 + 8 + 9 + 3 * 80 },
      { chatId: 'b', address: '201b', name: 'Haiku 4.5', prompts: 1, edits: 0, chars: 8 + 80 },
    ])
  })
})
