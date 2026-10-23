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
 * (v6Plan.stepsFromTurns). A step that produced a turn keeps what it already
 * carried (its model, its condition); its status follows the messages. A
 * step planned ahead becomes the turn whose message names it (`stepId`), and
 * the ones not sent yet stay, after those that were (stage 10, piece 1;
 * C196). A step the runner marked running stays so while its reply is still
 * arriving; the runner says when it ended (C196 (d)).
 */
export function withSteps(runBranch, fresh) {
  const old = runBranch.steps || []
  const byMessage = new Map(old.filter((s) => s.messageId).map((s) => [s.messageId, s]))
  const planned = old.filter((s) => !s.messageId)
  const plannedById = new Map(planned.filter((s) => s.id).map((s) => [s.id, s]))
  const sent = new Set()
  const ran = fresh.map(({ stepId, byReply, ...turn }) => {
    let was = byMessage.get(turn.messageId)
    if (!was && stepId && plannedById.has(stepId) && !sent.has(stepId)) {
      was = plannedById.get(stepId)
      sent.add(stepId)
    }
    if (!was) return turn
    const status = was.status === STATUS.RUNNING && turn.status === STATUS.PAUSED ? STATUS.RUNNING : turn.status
    // The model a reply names is the one that wrote it; until then, the one planned.
    return { ...was, messageId: turn.messageId, status, model: byReply ? turn.model : (was.model ?? turn.model ?? null) }
  })
  const rest = planned.filter((s) => !sent.has(s.id))
  // A step that waited because its condition was not met is settled: it
  // keeps its place after the step before it that ran (C201). The others
  // planned ahead follow every step that started.
  const settled = (s) => s.status === STATUS.WAITING && s.ended === 'unmet'
  const steps = [...ran]
  for (const u of rest.filter(settled)) {
    let at = -1
    for (let k = old.indexOf(u) - 1; k >= 0 && at < 0; k--) {
      const o = old[k]
      at = steps.findIndex((s) => s !== u && ((o.messageId && s.messageId === o.messageId) || (o.id && s.id === o.id)))
    }
    steps.splice(at + 1, 0, u)
  }
  steps.push(...rest.filter((s) => !settled(s)))
  return { ...runBranch, steps, status: branchStatus(steps) }
}

/** The number of a run's steps in a branch that have started, which planned ones come after. */
export const startedCount = (steps) => steps.filter((s) => s.messageId).length

/**
 * A run of a plan made from the run before (`new:run`; docket spec §5,
 * v12): each branch's steps copied forward as planned steps, ready unless
 * held, with their prompts (a sent step's prompt is its message's text),
 * models, rooms and conditions; no chat until the branch runs. promptOf:
 * messageId -> the text that was sent.
 */
export function runFromRun(prev, { id, n, now, newId, promptOf, order }) {
  const branches = {}
  for (const letter of order ?? Object.keys(prev.branches)) {
    const b = prev.branches[letter]
    if (!b) continue
    const steps = (b.steps || []).map((s) => ({
      id: newId(),
      status: s.status === STATUS.WAITING ? STATUS.WAITING : STATUS.READY,
      prompt: s.messageId ? String(promptOf(s.messageId) ?? s.prompt ?? '') : String(s.prompt ?? ''),
      model: s.model ?? null,
      ...(s.room ? { room: s.room } : {}),
      condition: s.condition ?? null,
      addedAt: now,
    }))
    branches[letter] = { status: branchStatus(steps), room: b.room ?? null, chatId: null, steps }
  }
  return { id, docketId: prev.docketId, n, createdAt: now, cost: null, branches }
}

/** A plan with no chat yet: branch a, named for the plan, in run 1 (`new:plan`). */
export function emptyPlan({ id, runId, num, title = '', now }) {
  return {
    docket: {
      id, num, title, createdAt: now, updatedAt: now, pinned: false, tags: [], archived: false,
      branches: [{ letter: 'a', name: title, createdAt: now }], order: ['a'], nextLetter: 1,
    },
    run: { id: runId, docketId: id, n: 1, createdAt: now, cost: null, branches: { a: { status: STATUS.READY, room: null, chatId: null, steps: [] } } },
  }
}

/** A branch with no chat yet, added to a plan and to one of its runs. */
export function plannedBranch(docket, run, { name = '', room = null, now }) {
  const letter = letterAt(docket.nextLetter)
  return {
    letter,
    docket: {
      ...docket,
      branches: [...docket.branches, { letter, name, createdAt: now }],
      order: [...docket.order, letter],
      nextLetter: docket.nextLetter + 1,
      updatedAt: now,
    },
    run: { ...run, branches: { ...run.branches, [letter]: { status: STATUS.READY, room, chatId: null, steps: [] } } },
  }
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
