// What a write has to keep true at version 6 (refactor-plan.md, stage 2):
// dockets and their runs, each branch's steps, and the Favorites collection.
// Pure, so it is tested without a database; records.js applies it inside
// each write's transaction. Numbers come from the counter in records.js.
//
// Rules, from the rulings in docs/spec/conflicts.md:
// - Every chat belongs to a docket (C18). A new chat starts one, as branch a.
//   A chat made from another (a fork, a document's branch) is the next
//   letter in that chat's docket, in the same run.
// - Letters are never reissued (C17), so removing a branch keeps nextLetter.
// - A docket with no branches left goes with its last one: deleting means
//   deleted, and its name is the chat's title.
// - A docket and a branch take their name from the chat (chatTitles.js) and
//   follow it when the chat is renamed, unless they were named otherwise.

import { letterAt } from './addresses'
import { STATUS, branchStatus } from './docketModel'
import { nameFromChat } from './chatTitles'

/** A docket and its first run for a chat that starts one; the chat is branch a. */
export function newDocket({ id, runId, num, chat, now }) {
  const name = nameFromChat(chat)
  return {
    docket: {
      id, num, title: name, createdAt: now, updatedAt: now,
      pinned: false, tags: [], archived: false,
      branches: [{ letter: 'a', name, createdAt: now }],
      order: ['a'], nextLetter: 1,
    },
    run: {
      id: runId, docketId: id, n: 1, createdAt: now, cost: null,
      branches: { a: { status: STATUS.READY, room: chat.room ?? null, chatId: chat.id, steps: [] } },
    },
  }
}

/** The chat as the next branch of a docket, in the given run. */
export function addBranch(docket, run, { chat, forkedFrom = null, steps = [], now }) {
  const letter = letterAt(docket.nextLetter)
  const branch = { letter, name: nameFromChat(chat), createdAt: now, ...(forkedFrom ? { forkedFrom } : {}) }
  return {
    letter,
    docket: {
      ...docket,
      branches: [...docket.branches, branch],
      order: [...docket.order, letter],
      nextLetter: docket.nextLetter + 1,
      updatedAt: now,
    },
    run: {
      ...run,
      branches: { ...run.branches, [letter]: { status: branchStatus(steps), room: chat.room ?? null, chatId: chat.id, steps } },
    },
  }
}

/**
 * A branch taken out of its docket and every run. Returns the docket and runs
 * to keep, or docket null and every run id to remove when it was the last.
 */
export function removeBranch(docket, runs, letter, now) {
  const branches = docket.branches.filter((b) => b.letter !== letter)
  if (!branches.length) return { docket: null, runs: [], removeRunIds: runs.map((r) => r.id) }
  return {
    docket: { ...docket, branches, order: docket.order.filter((l) => l !== letter), updatedAt: now },
    runs: runs.map((r) => {
      const kept = { ...r.branches }
      delete kept[letter]
      return { ...r, branches: kept }
    }),
    removeRunIds: [],
  }
}

/**
 * After a chat is renamed: the docket (if this is its first branch) and the
 * branch follow, unless they had been named otherwise. Null when nothing
 * changes.
 */
export function renameInDocket(docket, letter, before, after, now) {
  const was = nameFromChat(before)
  const is = nameFromChat(after)
  if (was === is) return null
  let changed = false
  const next = { ...docket }
  if (docket.order[0] === letter && docket.title === was) {
    next.title = is
    changed = true
  }
  next.branches = docket.branches.map((b) => {
    if (b.letter !== letter || b.name !== was) return b
    changed = true
    return { ...b, name: is }
  })
  return changed ? { ...next, updatedAt: now } : null
}

/**
 * A run's branch with its steps brought up to date from the chat's turns
 * (v6Plan.stepsFromTurns). A step keeps what it already carried (its model,
 * its condition); only its status follows the messages.
 */
export function withSteps(runBranch, fresh) {
  const before = new Map((runBranch.steps || []).map((s) => [s.messageId, s]))
  const steps = fresh.map((s) => {
    const old = before.get(s.messageId)
    return old ? { ...old, status: s.status } : s
  })
  return { ...runBranch, steps, status: branchStatus(steps) }
}

/** The Favorites collection with one more favourite, made if there is none. */
export function favoritesWith(collection, favorite, { id, now }) {
  const item = {
    kind: 'message',
    conversationId: favorite.conversationId,
    messageId: favorite.messageId,
    addedAt: favorite.createdAt,
    fromFavorite: favorite.id,
  }
  if (!collection) {
    return {
      id, name: null, builtIn: 'favorites', description: '', items: [item], headings: [],
      pinned: false, createdAt: now, updatedAt: now,
    }
  }
  if (collection.items.some((i) => i.fromFavorite === favorite.id)) return collection
  return { ...collection, items: [...collection.items, item], updatedAt: now }
}

/** The Favorites collection without the given favourites, or a chat's. Null when nothing changes. */
export function favoritesWithout(collection, { favoriteIds = [], conversationId = null }, now) {
  if (!collection) return null
  const items = collection.items.filter((i) =>
    !favoriteIds.includes(i.fromFavorite) && (conversationId === null || i.conversationId !== conversationId))
  return items.length === collection.items.length ? null : { ...collection, items, updatedAt: now }
}
