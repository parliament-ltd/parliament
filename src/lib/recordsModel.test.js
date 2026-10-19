import { describe, it, expect } from 'vitest'
import { newDocket, addBranch, removeBranch, renameInDocket, withSteps, favoritesWith, favoritesWithout } from './recordsModel'
import { nameFromChat } from './chatTitles'

const now = '2026-10-19T10:00:00.000Z'
const chat = (id, title, extra = {}) => ({ id, title, room: 'mode_1', parentId: null, ...extra })

describe('nameFromChat', () => {
  it('takes every "Branch:" and "Summary:" off a forked chat, and reads the old defaults as no name', () => {
    expect(nameFromChat(chat('b', 'Branch: Branch: Tower', { parentId: 'a' }))).toBe('Tower')
    expect(nameFromChat(chat('a', 'Summary: Q3'))).toBe('Summary: Q3')
    expect(nameFromChat(chat('a', 'New conversation'))).toBeNull()
    expect(nameFromChat(chat('a', 'New Conversation'))).toBeNull()
    expect(nameFromChat(chat('a', ''))).toBeNull()
  })
})

describe('dockets', () => {
  const start = newDocket({ id: 'd1', runId: 'r1', num: 240, chat: chat('c1', 'Tower'), now })

  it('starts a docket with the chat as branch a in run 1', () => {
    expect(start.docket).toMatchObject({ id: 'd1', num: 240, title: 'Tower', order: ['a'], nextLetter: 1 })
    expect(start.run.branches.a).toEqual({ status: 'ready', room: 'mode_1', chatId: 'c1', steps: [] })
  })

  it('adds a chat made from another as the next letter, skipping i, l and o in time', () => {
    const fork = chat('c2', 'Branch: Tower', { parentId: 'c1' })
    const one = addBranch(start.docket, start.run, { chat: fork, forkedFrom: { chatNum: 241, step: 1 }, now })
    expect(one.letter).toBe('b')
    expect(one.docket.branches[1]).toEqual({ letter: 'b', name: 'Tower', createdAt: now, forkedFrom: { chatNum: 241, step: 1 } })
    expect(one.run.branches.b.chatId).toBe('c2')
    let d = { ...start.docket, nextLetter: 8 }
    expect(addBranch(d, start.run, { chat: fork, now }).letter).toBe('j')
    d = { ...start.docket, nextLetter: 10 }
    expect(addBranch(d, start.run, { chat: fork, now }).letter).toBe('m')
  })

  it('removes a branch without reissuing its letter, and the docket with its last branch', () => {
    const two = addBranch(start.docket, start.run, { chat: chat('c2', 'x', { parentId: 'c1' }), now })
    const left = removeBranch(two.docket, [two.run], 'b', now)
    expect(left.docket.order).toEqual(['a'])
    expect(left.docket.nextLetter).toBe(2)
    expect(Object.keys(left.runs[0].branches)).toEqual(['a'])
    expect(removeBranch(left.docket, left.runs, 'a', now)).toEqual({ docket: null, runs: [], removeRunIds: ['r1'] })
  })

  it('follows a rename, unless the docket or branch was named otherwise', () => {
    const renamed = renameInDocket(start.docket, 'a', chat('c1', 'Tower'), chat('c1', 'Water tower'), now)
    expect(renamed.title).toBe('Water tower')
    expect(renamed.branches[0].name).toBe('Water tower')
    const own = { ...start.docket, title: 'My plan' }
    expect(renameInDocket(own, 'a', chat('c1', 'Tower'), chat('c1', 'Water tower'), now).title).toBe('My plan')
    expect(renameInDocket(start.docket, 'a', chat('c1', 'Tower'), chat('c1', 'Tower'), now)).toBeNull()
  })

  it('names a docket from its first chat\'s title once the title arrives', () => {
    const blank = newDocket({ id: 'd2', runId: 'r2', num: 250, chat: chat('c9', 'New Conversation'), now })
    expect(blank.docket.title).toBeNull()
    expect(renameInDocket(blank.docket, 'a', chat('c9', 'New Conversation'), chat('c9', 'Grant'), now).title).toBe('Grant')
  })
})

describe('withSteps', () => {
  it('keeps what a step carried and takes its status from the messages', () => {
    const rb = { status: 'paused', chatId: 'c1', steps: [{ status: 'paused', model: 'old-model', messageId: 'u1', condition: null }] }
    const fresh = [
      { status: 'done', model: 'new-model', messageId: 'u1', condition: null },
      { status: 'paused', model: 'new-model', messageId: 'u2', condition: null },
    ]
    const next = withSteps(rb, fresh)
    expect(next.steps).toEqual([
      { status: 'done', model: 'old-model', messageId: 'u1', condition: null },
      { status: 'paused', model: 'new-model', messageId: 'u2', condition: null },
    ])
    expect(next.status).toBe('paused')
  })
})

describe('Favorites collection', () => {
  const fav = { id: 'f1', conversationId: 'c1', messageId: 'm1', createdAt: now }

  it('is made with the first favourite and keeps their order', () => {
    const made = favoritesWith(null, fav, { id: 'col1', now })
    expect(made).toMatchObject({ id: 'col1', name: null, builtIn: 'favorites' })
    const more = favoritesWith(made, { ...fav, id: 'f2', messageId: 'm2' }, { id: 'x', now })
    expect(more.items.map((i) => i.fromFavorite)).toEqual(['f1', 'f2'])
    expect(favoritesWith(more, fav, { id: 'x', now })).toBe(more)
  })

  it('loses a favourite, or every favourite of a removed chat', () => {
    const col = favoritesWith(favoritesWith(null, fav, { id: 'col1', now }), { id: 'f2', conversationId: 'c2', messageId: 'm2', createdAt: now }, { id: 'x', now })
    expect(favoritesWithout(col, { favoriteIds: ['f1'] }, now).items.map((i) => i.fromFavorite)).toEqual(['f2'])
    expect(favoritesWithout(col, { conversationId: 'c2' }, now).items.map((i) => i.fromFavorite)).toEqual(['f1'])
    expect(favoritesWithout(col, { favoriteIds: ['nope'] }, now)).toBeNull()
  })
})
