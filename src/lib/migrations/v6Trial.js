// Dev only: the version 6 upgrade, tried on a throwaway copy.
//
// Writes the data the dry run read (a backup, this browser's data or the
// sample) into a separate database at version 5, upgrades that copy with the
// same upgradeSchema the app will use, and checks the result. Parliament's
// own database is never opened. The copy is replaced by the next trial and
// can be inspected in the browser's storage tools meanwhile.

import { openDB, deleteDB } from 'idb'
import { upgradeSchema, DRAFT_DB_VERSION, TRIAL_DB_NAME } from '../schema'
import { V6_NEW_STORES, V6_NEW_INDEXES } from './v6Upgrade'
import { FIRST_NUM } from '../addresses'

export const TRIAL_DB = TRIAL_DB_NAME
// The version the data is copied in at, before the upgrade is tried on it.
const BEFORE_VERSION = 5

const V5_STORES = [
  'conversations', 'messages', 'highlights', 'notes', 'favorites', 'pins', 'settings', 'files', 'file_data',
  'sbrd_documents', 'modes', 'libraryLayouts', 'libraryRooms', 'libraryComponents', 'librarySchemes', 'libraryResources',
]
// Lists the upgrade must leave exactly as they were.
const UNTOUCHED = ['messages', 'sbrd_documents', 'favorites', 'settings', 'files', 'libraryRooms']
// Lists created empty.
const EMPTY = ['edits', 'asks', 'suggestions', 'arrangements', 'focusSets', 'savedSearches', 'commandHistory', 'sourceCache']

/**
 * @param {object} flat  version 5 records by list name, as the dry run read them
 * @returns {Promise<{ ms: number, counts: object, checks: Array<{ ok: boolean, label: string, detail?: string }> }>}
 */
export async function runV6Trial(flat) {
  // A tab running the app on the copy holds it open, and the delete would
  // wait for it forever, so say so instead.
  await new Promise((resolve, reject) => {
    deleteDB(TRIAL_DB, {
      blocked: () => reject(new Error('the trial copy is open in the app in this tab; leave it from the line at the top of the page first')),
    }).then(resolve, reject)
  })

  // 1. A version 5 copy of the data.
  const v5 = await openDB(TRIAL_DB, BEFORE_VERSION, { upgrade: upgradeSchema })
  const before = {}
  try {
    for (const name of V5_STORES) {
      const tx = v5.transaction(name, 'readwrite')
      for (const record of flat[name] || []) tx.store.put(record)
      await tx.done
      before[name] = await v5.getAll(name)
    }
  } finally {
    v5.close()
  }

  // 2. The upgrade.
  const started = performance.now()
  const v6 = await openDB(TRIAL_DB, DRAFT_DB_VERSION, { upgrade: upgradeSchema })
  const ms = Math.round(performance.now() - started)

  try {
    const after = {}
    for (const name of v6.objectStoreNames) after[name] = await v6.getAll(name)
    const checks = []
    const check = (ok, label, detail) => checks.push({ ok: Boolean(ok), label, detail })

    check(v6.version === DRAFT_DB_VERSION, `The copy is at version ${DRAFT_DB_VERSION}`,
      v6.version === DRAFT_DB_VERSION ? undefined : `it is at ${v6.version}`)

    const missing = Object.keys(V6_NEW_STORES).filter((s) => !v6.objectStoreNames.contains(s))
    check(!missing.length, 'Every new list exists', missing.length ? `missing: ${missing.join(', ')}` : undefined)
    const tx = v6.transaction(Object.keys(V6_NEW_INDEXES))
    const missingIdx = Object.entries(V6_NEW_INDEXES).flatMap(([s, idx]) =>
      idx.map(([i]) => i).filter((i) => !tx.objectStore(s).indexNames.contains(i)).map((i) => `${s}.${i}`))
    await tx.done
    check(!missingIdx.length, 'Every new index exists', missingIdx.length ? `missing: ${missingIdx.join(', ')}` : undefined)

    const chats = after.conversations
    const noDocket = chats.filter((c) => !Number.isInteger(c.num) || !c.docketId || !c.branch || c.run !== 1)
    check(!noDocket.length, `Every chat has a number, a docket, a branch letter and run 1 (${chats.length})`,
      noDocket.length ? `${noDocket.length} without` : undefined)

    const runsByDocket = new Map(after.runs.map((r) => [r.docketId, r]))
    const badLinks = chats.filter((c) => runsByDocket.get(c.docketId)?.branches?.[c.branch]?.chatId !== c.id)
    check(after.runs.length === after.dockets.length && !badLinks.length,
      `Each docket has one run, and each chat is the branch that points back at it (${after.dockets.length} dockets)`,
      badLinks.length ? `${badLinks.length} chats not found in their docket` : undefined)

    const numbered = [...after.dockets, ...chats, ...after.notes, ...after.highlights, ...after.pins].map((r) => r.num)
    const sorted = [...numbered].sort((a, b) => a - b)
    const contiguous = sorted.every((n, i) => n === FIRST_NUM + i)
    const counter = after.counters.find((c) => c.name === 'num')?.next
    check(new Set(numbered).size === numbered.length && contiguous && counter === FIRST_NUM + numbered.length,
      `Numbers run from ${FIRST_NUM} with no gaps or repeats, and the counter is next (${counter})`)

    check(after.highlights.every((h) => h.kind === 'term'), `Every highlight is now a term (${after.highlights.length})`)
    check(after.pins.every((p) => p.kind === 'quote'), `Every pinned reference is now a quote (${after.pins.length})`)

    const favItems = after.collections.find((c) => c.builtIn === 'favorites')?.items.length ?? 0
    check(favItems <= before.favorites.length, `Favorites collection: ${favItems} of ${before.favorites.length} favourites`)

    const changed = UNTOUCHED.filter((s) => !sameRecords(before[s], after[s]))
    check(!changed.length, `Left exactly as they were: ${UNTOUCHED.join(', ')}`, changed.length ? `changed: ${changed.join(', ')}` : undefined)

    const notEmpty = EMPTY.filter((s) => after[s]?.length)
    check(!notEmpty.length, 'Edits, asks, suggestions, arrangements, focus sets, saved searches, history and the source cache start empty')

    const chatFieldsKept = before.conversations.every((b) => {
      const a = chats.find((c) => c.id === b.id)
      return a && Object.keys(b).every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]))
    })
    check(chatFieldsKept, 'Every chat keeps every field it had; the upgrade only adds')

    const roomsChanged = after.modes.filter((m) => {
      const b = before.modes.find((x) => x.id === m.id)
      if (!b) return true
      return JSON.stringify({ ...m, meta: { ...m.meta, template: undefined } }) !== JSON.stringify({ ...b, meta: { ...b.meta, template: undefined } })
    })
    check(!roomsChanged.length, `Rooms change only by recording their template (${after.modes.filter((m) => m.meta?.template).length} of ${after.modes.length})`)

    const first = chats.length ? await v6.getFromIndex('conversations', 'num', Math.min(...chats.map((c) => c.num))) : true
    check(first, 'A chat can be found by its number')

    const counts = Object.fromEntries([...new Set([...V5_STORES, ...v6.objectStoreNames])]
      .map((s) => [s, [before[s]?.length ?? null, after[s]?.length ?? 0]]))
    return { ms, counts, checks }
  } finally {
    v6.close()
  }
}

// Same records, in any order. Records are compared as JSON, which is how a
// backup would see them.
function sameRecords(a = [], b = []) {
  if (a.length !== b.length) return false
  const key = (r) => JSON.stringify(r)
  const left = a.map(key).sort()
  const right = b.map(key).sort()
  return left.every((x, i) => x === right[i])
}
