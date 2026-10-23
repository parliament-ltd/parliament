// What goes into a backup, and how a backup comes back (C93, ruled 19 October).
//
// gatherContents builds format 2 contents from the allowlist
// (backupSchema.js): records rebuilt from their known fields, only allowed
// settings, never the saved key. restoreInto writes a backup back in one
// transaction, so all of it is stored or none of it, and no other tab can
// see or remove anything half-written.
//
// Kept free of app imports so it can be tested in Node. backup.js wraps both
// with the app's database.

import { cleanArrangement } from './arrangements'
import { arrayBufferToBase64, contentsToFlatStores } from './backupFormat'
import { rebuildRecord, settingAllowed, cleanFlat } from './backupSchema'
import { validateBackup } from './validate'
import { planRestore } from './restorePlan'
import { isV6, fileRestored, announce } from './records'
import { FIRST_NUM } from './addresses'

// Every category a backup can hold, in the order the backup window lists them.
export const CATEGORIES = ['chats', 'annotations', 'rooms', 'homepage', 'library', 'preferences', 'layouts']

// Window layouts kept on this device (ruled 20 October): in a backup only
// when ticked, off unless chosen (stage 9, piece 2; C182).
export const OFF_UNLESS_CHOSEN = Object.freeze(['preferences', 'layouts'])

// What a backup holds when nobody chose: everything but the window layouts,
// which go only when ticked (the upgrade copy, "back up everything").
export const UNASKED = Object.freeze(CATEGORIES.filter((c) => c !== 'layouts'))

const V5_STORES = ['conversations', 'messages', 'highlights', 'notes', 'favorites', 'pins', 'settings', 'files', 'file_data',
  'sbrd_documents', 'modes', 'libraryLayouts', 'libraryRooms', 'libraryComponents', 'librarySchemes', 'libraryResources']
const V6_STORES = ['dockets', 'runs', 'collections', 'collabs', 'counters']
// A "replace" restore keeps these settings, which belong to this browser.
const KEPT_ON_REPLACE = ['browserFingerprint', 'parliament-api-key', 'backupLog']

const byTime = (a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0)
const rebuildAll = (store, records) => records.map((r) => rebuildRecord(store, r))

// ── Backup ──────────────────────────────────────────────

/**
 * Format 2 contents for the categories asked for. Each category stands
 * alone. Dockets and their runs travel with chats; collections and collabs
 * with annotations.
 */
export async function gatherContents(db, categories = UNASKED) {
  const want = new Set(categories)
  const v6 = isV6(db)
  const contents = {}

  if (want.has('chats')) {
    const conversations = rebuildAll('conversations', await db.getAll('conversations'))
    const messagesByConv = new Map()
    for (const m of rebuildAll('messages', await db.getAll('messages'))) {
      if (!messagesByConv.has(m.conversationId)) messagesByConv.set(m.conversationId, [])
      messagesByConv.get(m.conversationId).push(m)
    }
    for (const list of messagesByConv.values()) list.sort(byTime)

    const filesByConv = new Map()
    for (const f of rebuildAll('files', await db.getAll('files'))) {
      if (!filesByConv.has(f.conversationId)) filesByConv.set(f.conversationId, [])
      filesByConv.get(f.conversationId).push(f)
    }
    const fileDataById = new Map()
    for (const fd of await db.getAll('file_data')) fileDataById.set(fd.fileId, arrayBufferToBase64(fd.data))
    const docByConv = new Map(rebuildAll('sbrd_documents', await db.getAll('sbrd_documents')).map((d) => [d.conversationId, d]))

    contents.chats = conversations.map((c) => {
      const chat = { ...c, messages: messagesByConv.get(c.id) || [] }
      const files = filesByConv.get(c.id)
      if (files?.length) {
        chat.files = files
        chat.fileData = Object.fromEntries(files.filter((f) => fileDataById.has(f.id)).map((f) => [f.id, fileDataById.get(f.id)]))
      }
      const doc = docByConv.get(c.id)
      if (doc) chat.sbrdDocument = doc
      return chat
    })
    if (v6) {
      contents.dockets = {
        dockets: rebuildAll('dockets', await db.getAll('dockets')),
        runs: rebuildAll('runs', await db.getAll('runs')),
      }
    }
  }

  if (want.has('annotations')) {
    contents.annotations = {
      notes: rebuildAll('notes', await db.getAll('notes')),
      highlights: rebuildAll('highlights', await db.getAll('highlights')),
      favorites: rebuildAll('favorites', await db.getAll('favorites')),
      pins: rebuildAll('pins', await db.getAll('pins')),
    }
    if (v6) {
      contents.collections = rebuildAll('collections', await db.getAll('collections'))
      contents.collabs = rebuildAll('collabs', await db.getAll('collabs'))
    }
  }

  if (want.has('rooms')) contents.rooms = await db.getAllFromIndex('modes', 'scope', 'room')
  // Window layouts, each checked as when read from this device.
  if (want.has('layouts') && db.objectStoreNames.contains('arrangements')) {
    contents.layouts = (await db.getAll('arrangements')).map(cleanArrangement).filter(Boolean)
  }
  if (want.has('homepage')) contents.homepage = (await db.getAllFromIndex('modes', 'scope', 'homepage'))[0] || null
  if (want.has('library')) {
    contents.library = {
      layouts: await db.getAll('libraryLayouts'),
      components: await db.getAll('libraryComponents'),
      schemes: await db.getAll('librarySchemes'),
      rooms: await db.getAll('libraryRooms'),
      resources: await db.getAll('libraryResources'),
    }
  }
  // Only settings on the allowlist; the saved key is never one of them.
  if (want.has('preferences')) contents.preferences = (await db.getAll('settings')).filter(settingAllowed)

  return contents
}

// ── Restore ─────────────────────────────────────────────

/**
 * Write a backup's contents into the database, in one transaction.
 *
 * The file is data: it is cleaned to the allowlist and checked before
 * anything is written, and a record pointing at something not in the file
 * is left out and counted. At version 6 what comes in gets numbers, dockets
 * and steps in the same transaction (records.js), unless a "replace"
 * restore of version 6 data keeps the file's own.
 *
 * @returns the summary: what was added, copied, skipped and left out
 */
export async function restoreInto(db, contents, { strategy = 'merge', newId = () => crypto.randomUUID(), now = new Date().toISOString() } = {}) {
  const { flat, dropped } = cleanFlat(contentsToFlatStores(contents))
  const check = validateBackup(flat)
  if (!check.valid) throw new Error(check.error)

  const v6 = isV6(db)
  const replace = strategy === 'replace'
  // A replace of version 6 data keeps its numbers and dockets, if they hang together.
  const keepNumbers = v6 && replace && hasConsistentDockets(flat)

  // Window layouts in the file, each checked as when read from this device
  // (C182); a window on a screen this computer lacks opens on its main one,
  // since windows are not placed by screen yet.
  const layouts = Array.isArray(contents.layouts) && db.objectStoreNames.contains('arrangements')
    ? contents.layouts.map(cleanArrangement).filter(Boolean)
    : []
  const stores = [...V5_STORES, ...(v6 ? V6_STORES : []), ...(layouts.length ? ['arrangements'] : [])]
  const tx = db.transaction(stores, 'readwrite')
  const done = tx.done
  let plan
  const layoutsDone = { added: 0, copied: 0, skipped: 0 }
  try {
    if (replace) {
      const kept = []
      for (const key of KEPT_ON_REPLACE) {
        const entry = await tx.objectStore('settings').get(key)
        if (entry) kept.push(entry)
      }
      for (const s of stores) await tx.objectStore(s).clear()
      for (const e of kept) await tx.objectStore('settings').put(e)
    }

    const existing = replace ? {} : await readExisting(tx, flat, v6)
    plan = planRestore(flat, { strategy, existing, keepNumbers, plans: v6, newId, now })
    const { writes } = plan

    for (const store of V5_STORES) {
      for (const record of writes[store]) await tx.objectStore(store).put(record)
    }
    if (v6) {
      for (const c of writes.collabs) await tx.objectStore('collabs').put(c)
      if (keepNumbers) {
        for (const store of ['dockets', 'runs', 'collections']) {
          for (const record of writes[store]) await tx.objectStore(store).put(record)
        }
        const nums = [...writes.dockets, ...writes.conversations, ...writes.notes, ...writes.highlights, ...writes.pins]
          .map((r) => r.num).filter(Number.isInteger)
        await tx.objectStore('counters').put({ name: 'num', next: nums.length ? Math.max(...nums) + 1 : FIRST_NUM })
      } else {
        await fileRestored(tx, writes, { now, newId })
      }
    }
    // Adding to what is here keeps this device's layouts; a replace brings
    // the file's (C182).
    for (const layout of layouts) {
      if (!replace && (await tx.objectStore('arrangements').getKey(layout.id)) !== undefined) { layoutsDone.skipped += 1; continue }
      await tx.objectStore('arrangements').put({ ...layout, updatedAt: now })
      layoutsDone.added += 1
    }
    await done
  } catch (err) {
    try {
      tx.abort()
    } catch { /* already finished */ }
    await done.catch(() => {})
    throw err
  }
  // Other tabs re-read everything; nothing of the content travels.
  announce([{ kind: 'all', op: 'restored' }])
  return { ...plan.summary, ...(layouts.length ? { layouts: layoutsDone } : {}), leftOut: dropped }
}

// What a merge needs to know about what is here: the chats and records the
// file names, and the ids and keys that would collide.
async function readExisting(tx, flat, v6) {
  const chats = new Map()
  for (const c of flat.conversations || []) {
    const chat = await tx.objectStore('conversations').get(c.id)
    if (!chat) continue
    chats.set(c.id, {
      chat,
      messages: await tx.objectStore('messages').index('conversationId').getAll(c.id),
      document: await tx.objectStore('sbrd_documents').get(c.id),
    })
  }
  const records = async (store) => {
    const out = new Map()
    for (const r of flat[store] || []) {
      const here = await tx.objectStore(store).get(r.id)
      if (here) out.set(r.id, here)
    }
    return out
  }
  const keys = async (store) => new Set(await tx.objectStore(store).getAllKeys())
  return {
    chats,
    notes: await records('notes'),
    highlights: await records('highlights'),
    favorites: await records('favorites'),
    pins: await records('pins'),
    messages: await keys('messages'),
    files: await keys('files'),
    settings: await keys('settings'),
    modes: await keys('modes'),
    collabs: v6 ? await keys('collabs') : new Set(),
    library: {
      libraryLayouts: await keys('libraryLayouts'),
      libraryRooms: await keys('libraryRooms'),
      libraryComponents: await keys('libraryComponents'),
      librarySchemes: await keys('librarySchemes'),
      libraryResources: await keys('libraryResources'),
    },
  }
}

// Version 6 data whose numbers and dockets can be kept as they are: every
// chat is numbered and in a docket the file holds, every run belongs to a
// docket in the file and names only chats in it, and no number repeats.
function hasConsistentDockets(flat) {
  if (!flat.dockets?.length) return false
  const docketIds = new Set(flat.dockets.map((d) => d.id))
  const chatIds = new Set(flat.conversations.map((c) => c.id))
  if (!flat.conversations.every((c) => Number.isInteger(c.num) && docketIds.has(c.docketId))) return false
  for (const run of flat.runs || []) {
    if (!docketIds.has(run.docketId)) return false
    for (const b of Object.values(run.branches || {})) if (b?.chatId && !chatIds.has(b.chatId)) return false
  }
  const nums = [...flat.dockets, ...flat.conversations, ...flat.notes, ...flat.highlights, ...flat.pins].map((r) => r.num).filter((n) => n !== undefined)
  return nums.every(Number.isInteger) && new Set(nums).size === nums.length
}
