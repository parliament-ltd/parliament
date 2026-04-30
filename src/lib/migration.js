// Phase 1 PR-10a — one-time createdInMode → room migration.
//
// Every existing conversation gets a `conversation.room` value pointing at
// a freshly instantiated mode in the `modes` store. The mapping derives
// from the V1 `createdInMode` value, with a fallback to the legacy
// `localStorage[parliament-mode]` value when `createdInMode` is null.
//
// See refactor/data-migration.md §"createdInMode → room migration map"
// for the canonical mapping table. This module is the only consumer of
// that mapping; if the table changes there, change MIGRATION_MAP below.
//
// ─── Guarantees ───────────────────────────────────────────────────────
//
// 1. Idempotent at two layers:
//      a. A `migration_v2_chat_room_assigned` setting flips to true on
//         successful completion. Subsequent boots short-circuit before
//         touching any conversations.
//      b. The per-conversation step skips records that already have a
//         non-null `room`. A second run after an interrupted first pass
//         picks up where the first left off without re-instantiating
//         rooms that were already assigned.
//
// 2. Conservative on unknowns. Only the six known `createdInMode` values
//    map to templates. Any unrecognized value (or null after the
//    localStorage fallback) leaves `room: null` so the route can render
//    the V1 Albatross adapter as a safe fallback. This is intentional —
//    don't guess at a template for unfamiliar data.
//
// 3. Touches only the `room` field on conversations. Messages, highlights,
//    notes, branches, favorites, files, sbrd_documents, settings — all
//    untouched. The only IndexedDB writes are: add records to `modes`,
//    set `room` on `conversations`, and one settings flag.
//
// 4. `createdInMode` stays on the conversation record for at least one
//    release. PR-12 strips it; until then it's useful for debugging
//    migration reports.

import { initDB, getSetting, setSetting } from './db'
import { createModeFromTemplate } from './modes'

// Settings key for the idempotent guard.
const MIGRATION_DONE_KEY = 'migration_v2_chat_room_assigned'

// Legacy localStorage key consulted exactly once for conversations whose
// createdInMode is null. PR-12 will strip this key on app load; the
// migration drops it after the first successful run as a belt-and-braces.
const LEGACY_MODE_LOCALSTORAGE_KEY = 'parliament-mode'

// Per refactor/data-migration.md §"createdInMode → room migration map".
// kingfisher and starling fall back to writing-studio because their
// planned layouts don't ship in Phase 1 (data-migration.md notes the
// mapping is aspirational; closest-available default applies).
const MIGRATION_MAP = Object.freeze({
  pelican:       'data-workspace@1.0',
  secretarybird: 'drafting-desk@1.0',
  swift:         'pocket-chat@1.0',
  albatross:     'writing-studio@1.0',
  kingfisher:    'writing-studio@1.0',
  starling:      'writing-studio@1.0',
})

/**
 * Resolve the target template id for a conversation, consulting the
 * legacy localStorage key only when createdInMode is null.
 *
 * Returns null if no mapping applies — the caller leaves room: null and
 * the V1 Albatross adapter takes over.
 *
 * @param {string | null | undefined} createdInMode
 * @returns {string | null} libraryRooms id, or null
 */
export function resolveTemplateId(createdInMode) {
  if (createdInMode && MIGRATION_MAP[createdInMode]) {
    return MIGRATION_MAP[createdInMode]
  }
  if (createdInMode == null) {
    let stored = null
    try {
      stored = typeof localStorage !== 'undefined'
        ? localStorage.getItem(LEGACY_MODE_LOCALSTORAGE_KEY)
        : null
    } catch {
      // localStorage unavailable (private mode, certain browser configs)
      // — fall through to the no-mapping branch.
    }
    if (stored && MIGRATION_MAP[stored]) {
      return MIGRATION_MAP[stored]
    }
  }
  return null
}

/**
 * Drop the legacy localStorage key. Called after the migration's
 * conversation pass completes (whether or not any record matched it).
 * Wrapped in try/catch because a private-mode storage error here would
 * be a bad reason to fail the whole migration.
 */
function dropLegacyModeKey() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LEGACY_MODE_LOCALSTORAGE_KEY)
    }
  } catch {
    /* no-op */
  }
}

/**
 * Run the createdInMode → room migration over every conversation that
 * doesn't yet have a non-null `room`. Idempotent: subsequent calls after
 * the first successful completion are a single settings read and an
 * early return.
 *
 * Returns a small report shape for logging / future debug surfaces:
 *   { skipped: boolean, scanned, assigned, leftNull, errors }
 *
 * `skipped` is true when the migration short-circuited on the settings
 * guard. `errors` collects any per-conversation failures so the rest of
 * the batch can complete — a single bad record shouldn't stall everyone
 * else's migration.
 */
export async function migrateChatRoomAssignments() {
  // Guard 1: completed once already → don't re-run. The legacy localStorage
  // key has already been dropped on the prior successful run.
  const done = await getSetting(MIGRATION_DONE_KEY)
  if (done === true) {
    return { skipped: true, scanned: 0, assigned: 0, leftNull: 0, errors: [] }
  }

  const db = await initDB()
  const conversations = await db.getAll('conversations')

  // Pre-fetch known templates once; createModeFromTemplate needs the
  // template object, not just the id.
  const templateIds = Array.from(new Set(Object.values(MIGRATION_MAP)))
  const templates = {}
  for (const id of templateIds) {
    const t = await db.get('libraryRooms', id)
    if (t) templates[id] = t
  }

  let assigned = 0
  let leftNull = 0
  const errors = []

  for (const conv of conversations) {
    // Guard 2: per-conversation. A non-null room means a prior
    // (interrupted) pass already handled this record. Don't re-instantiate.
    if (conv.room != null) continue

    const templateId = resolveTemplateId(conv.createdInMode)
    if (!templateId) {
      leftNull++
      continue
    }

    const template = templates[templateId]
    if (!template) {
      // The libraryRooms seed should always include this id — but if a
      // user's IndexedDB got into a weird state, log and leave room null
      // rather than crash the whole migration. Albatross fallback handles it.
      errors.push({ conversationId: conv.id, reason: `template missing: ${templateId}` })
      leftNull++
      continue
    }

    try {
      // buildIntent.derivedFrom lets PR-10b find swift-migrated rooms to
      // inject voice-input@1.0 (per data-migration.md §"Voice-input
      // migration"). Tagging every migrated room with the same shape
      // costs nothing and keeps debug surfaces consistent.
      const newMode = await createModeFromTemplate(template, {
        buildIntent: { derivedFrom: `${conv.createdInMode || 'unknown'}-migration` },
      })
      await db.put('conversations', { ...conv, room: newMode.id })
      assigned++
    } catch (err) {
      errors.push({ conversationId: conv.id, reason: err?.message || String(err) })
      leftNull++
    }
  }

  // Drop the localStorage hint after the conversation pass completes.
  // Even an empty conversation list (fresh install) drops the key — a
  // pre-V2 user who reset their data wouldn't expect a stale localStorage
  // value to follow them around.
  dropLegacyModeKey()

  // Mark the migration done. If a partial-assignment crashes mid-loop,
  // we won't reach here — the next boot retries from scratch. Per-conversation
  // guards make the retry safe (already-assigned rooms are skipped).
  await setSetting(MIGRATION_DONE_KEY, true)

  return {
    skipped: false,
    scanned: conversations.length,
    assigned,
    leftNull,
    errors,
  }
}

// Exported for tests / debug consoles.
export const _internal = Object.freeze({
  MIGRATION_MAP,
  MIGRATION_DONE_KEY,
  LEGACY_MODE_LOCALSTORAGE_KEY,
})
