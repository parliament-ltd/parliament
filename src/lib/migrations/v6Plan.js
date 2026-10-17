// Schema v6 migration plan (refactor-plan.md, stage 2).
//
// Pure: takes a snapshot of the v5 data and returns every record v6 would
// write, plus a report for the dry run. Nothing here touches IndexedDB, so the
// same function drives the dry-run screen (on a backup file or on this
// browser's data, read-only) and, once approved, the real upgrade.
//
// What it does, per the rulings in docs/spec/conflicts.md:
//   1. Every chat joins a docket (C18). A branch family (chats linked by
//      parentId or familyId) becomes one docket: the root is branch a and each
//      fork takes the next letter by creation time, all in run 1. A chat with
//      no family becomes a docket of its own with that chat as branch a.
//      Letters are lower case (C49).
//   2. Numbers from 201 in one counter, in creation order, across dockets,
//      chats, notes, terms and quotes (C17, C56, A19). A docket is numbered
//      just before its first chat.
//   3. Each user turn in a chat becomes a step of its branch in run 1 (C19):
//      done if it got a complete reply, paused if the reply was cut off or
//      never came. Steps carry an empty condition (A15).
//   4. Today's highlights are words or phrases lit wherever they appear, so
//      they become terms, unchanged (C57). "Pin for reference" records become
//      quotes of a whole message, unchanged (A23).
//   5. Favourites become one collection called Favorites, in the order they
//      were made (C20, ruled 11 October). The favourites records stay.
//   6. The homepage scratchpad text, if any, becomes a note.
//   7. Saved personas become collabs of your own, switched off (A13).
//   8. Tags on chats were all written by the model, and are marked so.
//   9. A saved API key moves out of the settings into the key store. Backups
//      never contain keys, so this shows only when planning this browser.
//  10. A room made from a built-in template records the template's key
//      (C90). Its stored name stays, because today's screens read it.
//
// Stored data holds keys and ids, never words of the interface, so a backup
// made in one language restores correctly in another (languages document
// §5, 16 October). A built-in name is a key (builtIn: 'favorites'), and a
// missing title or name is null for the interface to fill in.

import { FIRST_NUM, letterAt } from '../addresses'
import { STATUS, branchStatus } from '../docketModel'

// The old code titled a fork "Branch: <parent title>", so a fork of a fork
// reads "Branch: Branch: …". All of them come off a branch's name.
const BRANCH_PREFIX = /^(?:(?:Branch|Summary):\s*)+/
// What the old code stored in place of a title (SelectorLayout's new chat).
// It means "no title", so it is read as none (C86, C90).
const NO_TITLE = new Set(['New conversation'])
const API_KEY_SETTING = 'parliament-api-key'

/**
 * @param {object} snap  { conversations, messages, notes, highlights, favorites, pins, settings,
 *   modes, sbrd_documents, libraryRooms }
 *   Arrays of v5 records, as read from IndexedDB or flattened from a backup.
 *   Rooms, documents and the template list are read to report and to record
 *   each room's template; documents are never changed.
 * @param {object} [opts]
 * @param {() => string} [opts.newId]  id generator, injectable for tests
 * @param {string} [opts.now]          ISO time for records created by the migration
 */
export function planV6Migration(snap, { newId = () => crypto.randomUUID(), now = new Date().toISOString() } = {}) {
  const conversations = [...(snap.conversations || [])]
  const messages = snap.messages || []
  const settings = snap.settings || []
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
  if (orphanMessages) warnings.push(orphanMessages === 1
    ? 'One message belongs to no chat and is left as it is.'
    : `${orphanMessages} messages belong to no chat and are left as they are.`)

  // ── 1. Families ───────────────────────────────────────
  const families = groupFamilies(conversations, convById, warnings)

  const dockets = []
  const runs = []
  const convUpdates = new Map() // conv id -> { docketId, branch, run }

  for (const members of families) {
    members.sort(byCreated)
    const root = pickRoot(members, convById)
    const ordered = [root, ...members.filter((c) => c !== root)]
    const docketId = newId()
    const letterOf = new Map(ordered.map((c, i) => [c.id, letterAt(i)]))

    const branches = ordered.map((c, i) => {
      const b = { letter: letterAt(i), name: branchName(c), createdAt: c.createdAt }
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
    }

    dockets.push({
      id: docketId,
      num: null,
      // A root that was itself forked from a chat now gone still carries
      // "Branch:" in its title; the docket's title does not.
      title: branchName(root),
      createdAt: root.createdAt,
      updatedAt: ordered.reduce((max, c) => (c.updatedAt > max ? c.updatedAt : max), root.updatedAt || root.createdAt),
      pinned: false,
      tags: [],
      archived: false,
      branches,
      order: branches.map((b) => b.letter),
      nextLetter: branches.length,
    })
    runs.push({ id: newId(), docketId, n: 1, createdAt: root.createdAt, cost: null, branches: runBranches })
  }

  // ── 5. Favourites become the Favorites collection ──────
  const msgById = new Map(messages.map((m) => [m.id, m]))
  const favoritesSkipped = []
  const favoriteItems = []
  for (const f of [...(snap.favorites || [])].sort(byCreated)) {
    if (!msgById.has(f.messageId) || !convById.has(f.conversationId)) {
      favoritesSkipped.push(f.id)
      continue
    }
    favoriteItems.push({
      kind: 'message',
      conversationId: f.conversationId,
      messageId: f.messageId,
      addedAt: f.createdAt,
      fromFavorite: f.id,
    })
  }
  if (favoritesSkipped.length) {
    warnings.push(favoritesSkipped.length === 1
      ? 'One favourite points at a message that no longer exists and is not carried into the collection.'
      : `${favoritesSkipped.length} favourites point at a message that no longer exists and are not carried into the collection.`)
  }
  const collections = favoriteItems.length
    ? [{
        id: newId(),
        name: null,
        builtIn: 'favorites',
        description: '',
        items: favoriteItems,
        headings: [],
        pinned: false,
        createdAt: favoriteItems[0].addedAt,
        updatedAt: now,
        fromFavorites: true,
      }]
    : []

  // ── 6. The scratchpad becomes a note ────────────────────
  const newNotes = []
  const scratch = settings.find((s) => s.key === 'scratchpad-text')
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

  // ── 7. Personas become collabs of your own, switched off ─
  const { collabs, personasSkipped } = collabsFromPersonas(settings, { newId, now })
  if (personasSkipped) {
    warnings.push(personasSkipped === 1
      ? 'One saved persona has no instruction text and is not carried over.'
      : `${personasSkipped} saved personas have no instruction text and are not carried over.`)
  }

  // ── 10. Rooms record the built-in template they came from (C90) ──
  // A room made from a template stores the template's English name as its
  // own. Today's screens read that name, so it stays; the room also records
  // the template's key, so the new screens can show the template's name in
  // the reader's language while the stored name is still the template's.
  const templateByName = new Map((snap.libraryRooms || [])
    .filter((t) => t?.author?.handle === 'parliament' && t.displayName)
    .map((t) => [t.displayName, t.id]))
  const roomUpdates = (snap.modes || [])
    .filter((m) => m.scope === 'room' && !m.meta?.template && templateByName.has(m.meta?.name))
    .map((m) => ({ id: m.id, template: templateByName.get(m.meta.name) }))

  // ── 9. The key moves to the key store ───────────────────
  const keyMove = settings.some((s) => s.key === API_KEY_SETTING)
    ? { provider: 'anthropic', fromSetting: API_KEY_SETTING }
    : null

  // ── 2. Numbers ─────────────────────────────────────────
  // One pass in creation order. A docket sorts just before its first chat,
  // so it is always the lower number of the two.
  const rows = []
  for (const d of dockets) rows.push({ kind: 'docket', id: d.id, createdAt: d.createdAt, tie: 0 })
  for (const c of conversations) rows.push({ kind: 'chat', id: c.id, createdAt: c.createdAt, tie: 1 })
  for (const n of [...(snap.notes || []), ...newNotes]) rows.push({ kind: 'note', id: n.id, createdAt: n.createdAt, tie: 2 })
  for (const h of snap.highlights || []) rows.push({ kind: 'term', id: h.id, createdAt: h.createdAt, tie: 2 })
  for (const p of snap.pins || []) rows.push({ kind: 'quote', id: p.id, createdAt: p.createdAt, tie: 2 })
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

  const conversationUpdates = conversations.map((c) => {
    const u = { id: c.id, num: numOf.get(`chat:${c.id}`), ...convUpdates.get(c.id) }
    // ── 8. Every tag on a chat today came from the model.
    if (Array.isArray(c.tags) && c.tags.length) u.tagsBy = 'model'
    return u
  })
  const noteUpdates = (snap.notes || []).map((n) => ({ id: n.id, num: numOf.get(`note:${n.id}`), pinned: false, tags: [] }))
  const termUpdates = (snap.highlights || []).map((h) => ({ id: h.id, num: numOf.get(`term:${h.id}`), kind: 'term', pinned: false, tags: [] }))
  const quoteUpdates = (snap.pins || []).map((p) => ({ id: p.id, num: numOf.get(`quote:${p.id}`), kind: 'quote' }))
  for (const n of newNotes) n.num = numOf.get(`note:${n.id}`)

  const plan = {
    dockets, runs, conversationUpdates, noteUpdates, termUpdates, quoteUpdates,
    collections, collabs, newNotes, roomUpdates, keyMove, nextNum,
  }
  plan.report = buildReport(plan, { snap, conversations, convById, msgById, numOf, favoritesSkipped, warnings })
  return plan
}

// ── Personas ─────────────────────────────────────────────

function collabsFromPersonas(settings, { newId, now }) {
  const raw = settings.find((s) => s.key === 'parrotPersonas')?.value
  let list = []
  if (Array.isArray(raw)) list = raw
  else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) list = parsed
    } catch { /* unreadable: nothing to carry over */ }
  }
  const collabs = []
  let personasSkipped = 0
  for (const p of list) {
    const instruction = typeof p?.instruction === 'string' ? p.instruction.trim() : ''
    if (!instruction) {
      personasSkipped++
      continue
    }
    collabs.push({
      id: newId(),
      name: String(p.title || '').trim().slice(0, 120) || null,
      instruction,
      builtIn: false,
      on: false,
      fromPersona: p.id ?? null,
      createdAt: now,
    })
  }
  return { collabs, personasSkipped }
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
    warnings.push(missingParents === 1
      ? 'One branch points at a parent chat that no longer exists. It becomes branch a of its own docket.'
      : `${missingParents} branches point at a parent chat that no longer exists. Each becomes branch a of its own docket.`)
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

// Only a chat that was forked has the prefix taken off, so a chat you titled
// "Summary: Q3" yourself keeps its title.
function branchName(c) {
  if (!c.title) return null
  const name = c.parentId ? c.title.replace(BRANCH_PREFIX, '') || c.title : c.title
  return NO_TITLE.has(name.trim()) ? null : name
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
      condition: null,
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

function buildReport(plan, { snap, conversations, convById, msgById, numOf, favoritesSkipped, warnings }) {
  const runOf = new Map(plan.runs.map((r) => [r.docketId, r]))
  // A chat's room is a room record's id. The report shows its name; the plan
  // keeps the id. A room missing from the data (a backup without rooms) has
  // no name to show.
  const roomName = new Map((snap.modes || []).map((m) => [m.id, m.meta?.name || null]))
  // A chat with no prompts is a document (Secretarybird keeps its text in a
  // document record, not in messages), an empty chat, or a chat holding only
  // replies. The report tells them apart; the plan treats them alike.
  const withMessages = new Set((snap.messages || []).map((m) => m.conversationId))
  const withText = new Set((snap.sbrd_documents || [])
    .filter((d) => Array.isArray(d.paragraphs) && d.paragraphs.some((p) => String(p?.text ?? '').trim()))
    .map((d) => d.conversationId))
  const noStepsKind = (chatId) => (withText.has(chatId) ? 'document' : withMessages.has(chatId) ? 'replies' : 'empty')
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
            roomName: roomName.get(rb.room) ?? null,
            steps: rb.steps.length,
            noSteps: rb.steps.length ? null : noStepsKind(rb.chatId),
            paused: rb.steps.filter((s) => s.status === STATUS.PAUSED).length,
            status: rb.status,
            forkedFrom: b.forkedFrom || null,
            parentGone: Boolean(convById.get(rb.chatId)?.parentId && !convById.has(convById.get(rb.chatId).parentId)),
          }
        }),
      }
    })

  const noSteps = docketRows.flatMap((d) => d.branches).filter((b) => b.noSteps)
  const tally = (kind) => noSteps.filter((b) => b.noSteps === kind).length
  const documents = tally('document')
  const emptyChats = tally('empty')
  const repliesOnly = tally('replies')
  // Comments (a passage, a question, the model's answer) and the model's
  // suggestions live inside each document's paragraphs. They stay there.
  let documentComments = 0
  let documentSuggestions = 0
  for (const d of snap.sbrd_documents || []) {
    if (!convById.has(d.conversationId)) continue
    for (const p of Array.isArray(d.paragraphs) ? d.paragraphs : []) {
      if (Array.isArray(p?.comments)) documentComments += p.comments.length
      if (Array.isArray(p?.claudeSuggestions)) documentSuggestions += p.claudeSuggestions.length
    }
  }
  if (documents) {
    const n = (k, one, many) => `${k} ${k === 1 ? one : many}`
    const kept = documentComments || documentSuggestions
      ? ` ${documents === 1 ? 'Its' : 'Their'} ${n(documentComments, 'comment', 'comments')} and ${n(documentSuggestions, 'suggestion', 'suggestions')} from the model stay in ${documents === 1 ? 'the document' : 'the documents'} too.`
      : ''
    warnings.push((documents === 1
      ? 'One chat is a document: its text is kept in the document, not in messages, so it has no steps. The text is not touched.'
      : `${documents} chats are documents: their text is kept in the document, not in messages, so they have no steps. The text is not touched.`) + kept)
  }
  if (emptyChats) {
    warnings.push(emptyChats === 1
      ? 'One chat is empty, with no messages and no text. It becomes a branch with no steps. Nothing is removed.'
      : `${emptyChats} chats are empty, with no messages and no text. Each becomes a branch with no steps. Nothing is removed.`)
  }
  if (repliesOnly) {
    warnings.push(repliesOnly === 1
      ? 'One chat holds replies but no prompts of yours, so it has no steps.'
      : `${repliesOnly} chats hold replies but no prompts of yours, so they have no steps.`)
  }
  const models = new Set(conversations.map((c) => c.model).filter(Boolean))
  if (docketRows.some((d) => d.branches.some((b) => b.steps > 0))) {
    warnings.push('Old chats do not record which model answered each turn, only the last one used. Every step takes its chat\'s last model.')
  }

  const favorites = plan.collections[0]?.items || []
  return {
    counts: {
      chats: conversations.length,
      dockets: plan.dockets.length,
      multiBranchDockets: plan.dockets.filter((d) => d.branches.length > 1).length,
      branches: plan.dockets.reduce((n, d) => n + d.branches.length, 0),
      steps: plan.runs.reduce((n, r) => n + Object.values(r.branches).reduce((m, b) => m + b.steps.length, 0), 0),
      notes: plan.noteUpdates.length,
      terms: plan.termUpdates.length,
      quotes: plan.quoteUpdates.length,
      favoritesToCollection: favorites.length,
      favoritesSkipped: favoritesSkipped.length,
      documents,
      documentComments,
      documentSuggestions,
      emptyChats,
      scratchpadToNote: plan.newNotes.length,
      collabs: plan.collabs.length,
      chatsWithModelTags: plan.conversationUpdates.filter((u) => u.tagsBy === 'model').length,
      keyMoves: plan.keyMove ? 1 : 0,
      firstNum: FIRST_NUM,
      lastNum: plan.nextNum - 1,
      nextNum: plan.nextNum,
      models: [...models],
      branchStatus: statusCounts,
    },
    dockets: docketRows,
    favorites: favorites.map((item) => ({
      chatNum: numOf.get(`chat:${item.conversationId}`),
      chatTitle: convById.get(item.conversationId)?.title || '',
      excerpt: excerpt(msgById.get(item.messageId)?.content),
    })),
    terms: (snap.highlights || []).map((h) => ({
      num: numOf.get(`term:${h.id}`),
      chatNum: numOf.get(`chat:${h.conversationId}`),
      text: excerpt(h.text, 60),
    })),
    quotes: (snap.pins || []).map((p) => ({
      num: numOf.get(`quote:${p.id}`),
      inChatNum: numOf.get(`chat:${p.targetConversationId}`),
      fromChatNum: numOf.get(`chat:${p.sourceConversationId}`),
      excerpt: excerpt(p.content),
    })),
    collabs: plan.collabs.map((c) => ({ name: c.name, excerpt: excerpt(c.instruction) })),
    roomTemplates: Object.entries(plan.roomUpdates.reduce((acc, u) => {
      acc[u.template] = (acc[u.template] || 0) + 1
      return acc
    }, {})).map(([template, rooms]) => ({ template, name: (snap.libraryRooms || []).find((t) => t.id === template)?.displayName || template, rooms })),
    newNotes: plan.newNotes.map((n) => ({ num: n.num, excerpt: excerpt(n.text), from: 'scratchpad' })),
    warnings,
  }
}

function excerpt(text, n = 90) {
  const t = String(text || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n - 1)}…` : t
}
