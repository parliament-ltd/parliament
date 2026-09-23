// Schema v6 migration plan (change-plan.md 1.6).
//
// Pure: takes a snapshot of the v5 data and returns every record v6 would
// write, plus a report for the dry run. Nothing here touches IndexedDB, so the
// same function drives the dry-run screen (on a backup file or on this
// browser's data, read-only) and, once approved, the real upgrade.
//
// What it does, per the rulings in docs/spec/conflicts.md:
//   1. Every chat joins a docket (C18). A branch family (chats linked by
//      parentId or familyId) becomes one docket: the root is branch A and each
//      fork takes the next letter by creation time, all in run 1. A chat with
//      no family becomes a docket of its own with that chat as branch A.
//   2. Numbers from 201, in creation order, across chats, notes, highlights
//      and dockets (C17). A docket is numbered just before its first chat.
//   3. Each user turn in a chat becomes a step of its branch in run 1
//      (C19): done if it got a complete reply, paused if the reply was cut
//      off or never came.
//   4. Each favorited message becomes a pinned highlight of the whole
//      message (C20). The favorites records are left in place.
//   5. The homepage scratchpad text, if any, becomes a note.

import { FIRST_NUM, letterAt } from '../addresses'
import { STATUS, branchStatus } from '../docketModel'

const BRANCH_PREFIX = /^(Branch|Summary):\s*/

/**
 * @param {object} snap  { conversations, messages, notes, highlights, favorites, settings }
 *   Arrays of v5 records, as read from IndexedDB or flattened from a backup.
 * @param {object} [opts]
 * @param {() => string} [opts.newId]  id generator, injectable for tests
 * @param {string} [opts.now]          ISO time for records created by the migration
 */
export function planV6Migration(snap, { newId = () => crypto.randomUUID(), now = new Date().toISOString() } = {}) {
  const conversations = [...(snap.conversations || [])]
  const messages = snap.messages || []
  const warnings = []

  const convById = new Map(conversations.map((c) => [c.id, c]))
  const msgsByConv = new Map()
  for (const m of messages) {
    if (!convById.has(m.conversationId)) continue
    let arr = msgsByConv.get(m.conversationId)
    if (!arr) msgsByConv.set(m.conversationId, (arr = []))
    arr.push(m)
  }
  for (const arr of msgsByConv.values()) arr.sort(byCreated)
  const orphanMessages = messages.filter((m) => !convById.has(m.conversationId)).length
  if (orphanMessages) warnings.push(`${orphanMessages} messages belong to no chat and are left as they are.`)

  // ── 1. Families ───────────────────────────────────────
  const families = groupFamilies(conversations, convById, warnings)

  const dockets = []
  const runs = []
  const convUpdates = new Map() // conv id -> { docketId, branch, run }
  const docketOfConv = new Map()

  for (const members of families) {
    members.sort(byCreated)
    const root = pickRoot(members, convById)
    const ordered = [root, ...members.filter((c) => c !== root)]
    const docketId = newId()
    const letterOf = new Map(ordered.map((c, i) => [c.id, letterAt(i)]))

    const branches = ordered.map((c, i) => {
      const b = { letter: letterAt(i), name: branchName(c, i === 0), createdAt: c.createdAt }
      if (i > 0 && c.parentId && convById.has(c.parentId)) {
        b.forkedFrom = { chatId: c.parentId, step: forkStep(c, msgsByConv.get(c.parentId) || []) }
      }
      return b
    })

    const runBranches = {}
    for (const c of ordered) {
      const steps = stepsFromTurns(c, msgsByConv.get(c.id) || [])
      runBranches[letterOf.get(c.id)] = {
        status: branchStatus(steps),
        room: c.room ?? null,
        chatId: c.id,
        steps,
      }
      convUpdates.set(c.id, { docketId, branch: letterOf.get(c.id), run: 1 })
      docketOfConv.set(c.id, docketId)
    }

    const docket = {
      id: docketId,
      num: null,
      title: root.title || 'Untitled',
      createdAt: root.createdAt,
      updatedAt: ordered.reduce((max, c) => (c.updatedAt > max ? c.updatedAt : max), root.updatedAt || root.createdAt),
      pinned: false,
      tags: [],
      archived: false,
      branches,
      order: branches.map((b) => b.letter),
      nextLetter: branches.length,
    }
    dockets.push(docket)
    runs.push({ id: newId(), docketId, n: 1, createdAt: root.createdAt, cost: null, branches: runBranches })
  }

  // ── 4, 5. New highlights and notes ─────────────────────
  const msgById = new Map(messages.map((m) => [m.id, m]))
  const newHighlights = []
  const favoritesSkipped = []
  for (const f of snap.favorites || []) {
    const m = msgById.get(f.messageId)
    if (!m || !convById.has(f.conversationId)) {
      favoritesSkipped.push(f.id)
      continue
    }
    newHighlights.push({
      id: newId(),
      conversationId: f.conversationId,
      messageId: f.messageId,
      text: m.content,
      color: '#B8A070',
      pinned: true,
      tags: [],
      fromFavorite: f.id,
      createdAt: f.createdAt,
    })
  }
  if (favoritesSkipped.length) {
    warnings.push(`${favoritesSkipped.length} favorites point at a message that no longer exists and are not converted.`)
  }

  const newNotes = []
  const scratch = (snap.settings || []).find((s) => s.key === 'scratchpad-text')
  if (typeof scratch?.value === 'string' && scratch.value.trim()) {
    newNotes.push({
      id: newId(),
      conversationId: null,
      messageId: null,
      text: scratch.value,
      pinned: false,
      tags: [],
      fromScratchpad: true,
      createdAt: now,
    })
  }

  // ── 2. Numbers ─────────────────────────────────────────
  // One pass in creation order. A docket sorts just before its first chat,
  // so it is always the lower number of the two.
  const rows = []
  for (const d of dockets) rows.push({ kind: 'docket', id: d.id, createdAt: d.createdAt, tie: 0 })
  for (const c of conversations) rows.push({ kind: 'chat', id: c.id, createdAt: c.createdAt, tie: 1 })
  for (const n of [...(snap.notes || []), ...newNotes]) rows.push({ kind: 'note', id: n.id, createdAt: n.createdAt, tie: 2 })
  for (const h of [...(snap.highlights || []), ...newHighlights]) rows.push({ kind: 'highlight', id: h.id, createdAt: h.createdAt, tie: 2 })
  rows.sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1
      : a.tie - b.tie || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

  const numOf = new Map()
  rows.forEach((r, i) => numOf.set(`${r.kind}:${r.id}`, FIRST_NUM + i))
  const nextNum = FIRST_NUM + rows.length

  for (const d of dockets) d.num = numOf.get(`docket:${d.id}`)
  // forkedFrom names the parent chat by number, which only exists now.
  for (const d of dockets) {
    for (const b of d.branches) {
      if (b.forkedFrom) b.forkedFrom = { chatNum: numOf.get(`chat:${b.forkedFrom.chatId}`), step: b.forkedFrom.step }
    }
  }

  const conversationUpdates = conversations.map((c) => ({
    id: c.id,
    num: numOf.get(`chat:${c.id}`),
    ...convUpdates.get(c.id),
  }))
  const noteUpdates = (snap.notes || []).map((n) => ({ id: n.id, num: numOf.get(`note:${n.id}`), pinned: false, tags: [] }))
  const highlightUpdates = (snap.highlights || []).map((h) => ({ id: h.id, num: numOf.get(`highlight:${h.id}`), pinned: false, tags: [] }))
  for (const n of newNotes) n.num = numOf.get(`note:${n.id}`)
  for (const h of newHighlights) h.num = numOf.get(`highlight:${h.id}`)

  const plan = {
    dockets, runs, conversationUpdates, noteUpdates, highlightUpdates, newHighlights, newNotes, nextNum,
  }
  plan.report = buildReport(plan, { conversations, convById, numOf, favoritesSkipped, warnings })
  return plan
}

// ── Families ─────────────────────────────────────────────

// Union chats linked by parentId or familyId. A parent that is missing from
// the data leaves the child as the root of its own docket; a cycle is broken.
function groupFamilies(conversations, convById, warnings) {
  const parent = new Map(conversations.map((c) => [c.id, c.id]))
  const find = (x) => {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)))
      x = parent.get(x)
    }
    return x
  }
  const union = (a, b) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }
  let missingParents = 0
  for (const c of conversations) {
    if (c.parentId) {
      if (convById.has(c.parentId)) union(c.id, c.parentId)
      else missingParents++
    }
    if (c.familyId && c.familyId !== c.id && convById.has(c.familyId)) union(c.id, c.familyId)
  }
  if (missingParents) {
    warnings.push(`${missingParents} branches point at a parent chat that no longer exists. Each becomes branch A of its own docket.`)
  }
  const groups = new Map()
  for (const c of conversations) {
    const r = find(c.id)
    if (!groups.has(r)) groups.set(r, [])
    groups.get(r).push(c)
  }
  return [...groups.values()]
}

// The root is the chat with no parent inside the family; the earliest if
// there are several (for example when two were joined only by familyId).
function pickRoot(members, convById) {
  const inFamily = new Set(members.map((c) => c.id))
  const roots = members.filter((c) => !c.parentId || !convById.has(c.parentId) || !inFamily.has(c.parentId))
  return (roots.length ? roots : members)[0]
}

function branchName(c, isRoot) {
  const title = c.title || 'Untitled'
  return isRoot ? title : title.replace(BRANCH_PREFIX, '') || title
}

// ── Steps ────────────────────────────────────────────────

// One step per user message. Done when a complete reply follows; paused when
// the reply is marked incomplete or never arrived.
function stepsFromTurns(conv, msgs) {
  const steps = []
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i]
    if (m.role !== 'user') continue
    const reply = msgs[i + 1]?.role === 'assistant' ? msgs[i + 1] : null
    steps.push({
      status: reply && !reply.incomplete ? STATUS.DONE : STATUS.PAUSED,
      model: conv.model || null,
      messageId: m.id,
    })
  }
  return steps
}

// The step a fork was taken at: the number of user turns in the parent up to
// and including the branch-point message. Null if it cannot be found.
function forkStep(child, parentMsgs) {
  if (!child.branchPoint) return null
  const at = parentMsgs.findIndex((m) => m.id === child.branchPoint)
  if (at < 0) return null
  return parentMsgs.slice(0, at + 1).filter((m) => m.role === 'user').length
}

function byCreated(a, b) {
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
}

// ── Report ───────────────────────────────────────────────

function buildReport(plan, { conversations, convById, numOf, favoritesSkipped, warnings }) {
  const runOf = new Map(plan.runs.map((r) => [r.docketId, r]))
  const statusCounts = {}
  const docketRows = plan.dockets
    .slice()
    .sort((a, b) => a.num - b.num)
    .map((d) => {
      const run = runOf.get(d.id)
      return {
        num: d.num,
        title: d.title,
        branches: d.order.map((letter) => {
          const b = d.branches.find((x) => x.letter === letter)
          const rb = run.branches[letter]
          statusCounts[rb.status] = (statusCounts[rb.status] || 0) + 1
          return {
            address: `${d.num}${letter}`,
            name: b.name,
            chatNum: numOf.get(`chat:${rb.chatId}`),
            room: rb.room,
            steps: rb.steps.length,
            paused: rb.steps.filter((s) => s.status === STATUS.PAUSED).length,
            status: rb.status,
            forkedFrom: b.forkedFrom || null,
          }
        }),
      }
    })

  const noSteps = docketRows.flatMap((d) => d.branches).filter((b) => b.steps === 0).length
  if (noSteps) warnings.push(`${noSteps} chats have no user turns (documents, or empty chats). Each becomes a branch with no steps, status ready.`)
  const models = new Set(conversations.map((c) => c.model).filter(Boolean))
  if (conversations.length) {
    warnings.push('Old chats do not record which model answered each turn, only the last one used. Every step takes its chat\'s last model.')
  }

  return {
    counts: {
      chats: conversations.length,
      dockets: plan.dockets.length,
      multiBranchDockets: plan.dockets.filter((d) => d.branches.length > 1).length,
      branches: plan.dockets.reduce((n, d) => n + d.branches.length, 0),
      steps: plan.runs.reduce((n, r) => n + Object.values(r.branches).reduce((m, b) => m + b.steps.length, 0), 0),
      notes: plan.noteUpdates.length,
      highlights: plan.highlightUpdates.length,
      favoritesToHighlights: plan.newHighlights.length,
      favoritesSkipped: favoritesSkipped.length,
      scratchpadToNote: plan.newNotes.length,
      firstNum: FIRST_NUM,
      lastNum: plan.nextNum - 1,
      nextNum: plan.nextNum,
      models: [...models],
      branchStatus: statusCounts,
    },
    dockets: docketRows,
    favorites: plan.newHighlights.map((h) => ({
      num: h.num,
      chatNum: numOf.get(`chat:${h.conversationId}`),
      chatTitle: convById.get(h.conversationId)?.title || '',
      excerpt: excerpt(h.text),
    })),
    newNotes: plan.newNotes.map((n) => ({ num: n.num, excerpt: excerpt(n.text), from: 'scratchpad' })),
    warnings,
  }
}

function excerpt(text, n = 90) {
  const t = String(text || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n - 1)}…` : t
}
