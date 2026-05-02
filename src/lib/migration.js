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
import { createModeFromTemplate, saveMode } from './modes'

// Settings keys for the idempotent guards. Each PR-10a/PR-10b/PR-11a
// migration step has its own flag so adding a new pass later doesn't
// require re-running prior ones.
const MIGRATION_DONE_KEY = 'migration_v2_chat_room_assigned'
const REPAIR_DONE_KEY = 'migration_v2_room_repair_done'
const VOICE_INJECT_DONE_KEY = 'migration_v2_voice_input_injected'
const PELICAN_DECOMPOSE_DONE_KEY = 'migration_v2_pelican_room_decomposed'

// Default fallback template for the room-repair pass (PR-10b). Any
// conversation that didn't get a room assignment from the PR-10a pass
// defaults to Writing Studio — same closest-available default the
// kingfisher/starling stubs use in MIGRATION_MAP.
const DEFAULT_TEMPLATE_ID = 'writing-studio@1.0'

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

// ─── PR-10b migrations ────────────────────────────────────────────────
//
// PR-10b is the point of no return — Albatross adapter goes away, V2 is
// the only chat path. Two migration steps run alongside the existing
// PR-10a pass on first PR-10b boot:
//
//   1. migrateRepairNullRooms — assigns a default Writing Studio room to
//      any conversation whose `room` is still null. Catches:
//        - conversations whose PR-10a `createdInMode` was unrecognized
//          (and there was no localStorage hint to fall back on)
//        - conversations created via Albatross "+ New Chat" between
//          PR-10a's deploy and PR-10b's deploy (those passed `createdInMode`
//          but the migration's MIGRATION_DONE_KEY guard blocked re-running)
//      Without this, after PR-10b a null-room conversation would render
//      a diagnostic stub in ChatView with no recovery path. The repair
//      itself uses the same template that PR-10a's MIGRATION_MAP picks
//      for the kingfisher/starling stubs (writing-studio@1.0).
//
//   2. migrateInjectVoiceInput — injects voice-input@1.0 into every
//      pocket-chat-shaped room derived from a swift migration that
//      doesn't already have it. Pre-PR-10a.8 the pocket-chat seed
//      didn't include voice-input; after PR-10b removes InputArea's
//      built-in cardLayout mic, mobile users on those rooms would lose
//      voice access without this injection. Per-room idempotent (skips
//      rooms that already include voice-input — covers users who edited
//      their migrated room in the editor or already have an up-to-date
//      seed).

/**
 * Instantiate a fresh Writing Studio mode and assign it to the given
 * conversation. Used by the repair pass and as a defense-in-depth
 * fallback the route shell can call when it encounters a null-room
 * conversation at render time.
 *
 * Returns the new mode id, or null on failure. Does nothing if the
 * conversation already has a non-null room (returns the existing id).
 *
 * @param {string} conversationId
 * @returns {Promise<string | null>}
 */
export async function assignDefaultRoom(conversationId) {
  const db = await initDB()
  const conv = await db.get('conversations', conversationId)
  if (!conv) return null
  if (conv.room) return conv.room

  const template = await db.get('libraryRooms', DEFAULT_TEMPLATE_ID)
  if (!template) {
    if (import.meta.env.DEV) {
      console.warn(
        `[migration] ${DEFAULT_TEMPLATE_ID} template missing; cannot repair conversation ${conversationId}`,
      )
    }
    return null
  }

  const newMode = await createModeFromTemplate(template, {
    buildIntent: { derivedFrom: 'null-room-repair' },
  })
  await db.put('conversations', { ...conv, room: newMode.id })
  return newMode.id
}

/**
 * Second-pass migration: any conversation still at room: null gets a
 * fresh Writing Studio mode. Runs once (idempotent via REPAIR_DONE_KEY).
 *
 * Returns a small report shape:
 *   { skipped: boolean, scanned, repaired, errors }
 */
export async function migrateRepairNullRooms() {
  const done = await getSetting(REPAIR_DONE_KEY)
  if (done === true) {
    return { skipped: true, scanned: 0, repaired: 0, errors: [] }
  }

  const db = await initDB()
  const conversations = await db.getAll('conversations')

  let repaired = 0
  const errors = []

  for (const conv of conversations) {
    if (conv.room != null) continue
    try {
      const id = await assignDefaultRoom(conv.id)
      if (id) repaired++
      else errors.push({ conversationId: conv.id, reason: 'assignDefaultRoom returned null' })
    } catch (err) {
      errors.push({ conversationId: conv.id, reason: err?.message || String(err) })
    }
  }

  await setSetting(REPAIR_DONE_KEY, true)
  return { skipped: false, scanned: conversations.length, repaired, errors }
}

/**
 * Third-pass migration: ensure every swift-derived pocket-chat room has
 * voice-input@1.0 in its input-dock slot. Per-room idempotent (skips
 * rooms that already include voice-input). Whole-pass idempotent via
 * VOICE_INJECT_DONE_KEY.
 *
 * Selection criteria match data-migration.md §"Voice-input migration":
 *   - scope === 'room'
 *   - layout.ref starts with 'single-column-with-sheet'
 *   - buildIntent.derivedFrom === 'swift-migration'
 *   - components do not already include a voice-input ref
 *
 * Returns:
 *   { skipped: boolean, scanned, injected, errors }
 */
export async function migrateInjectVoiceInput() {
  const done = await getSetting(VOICE_INJECT_DONE_KEY)
  if (done === true) {
    return { skipped: true, scanned: 0, injected: 0, errors: [] }
  }

  const db = await initDB()
  const allModes = await db.getAll('modes')

  let scanned = 0
  let injected = 0
  const errors = []

  for (const mode of allModes) {
    if (mode.scope !== 'room') continue
    const layoutRef = mode.layout?.ref
    if (!layoutRef || !layoutRef.startsWith('single-column-with-sheet')) continue
    if (mode.buildIntent?.derivedFrom !== 'swift-migration') continue
    scanned++
    const components = mode.components || []
    if (components.some((c) => c.ref?.startsWith('voice-input'))) continue

    try {
      const updated = {
        ...mode,
        components: [
          ...components,
          {
            id: `comp_${crypto.randomUUID()}`,
            ref: 'voice-input@^1.0',
            slot: 'input-dock',
            order: 1,
            essential: false,
            config: {},
          },
        ],
      }
      await saveMode(updated)
      injected++
    } catch (err) {
      errors.push({ modeId: mode.id, reason: err?.message || String(err) })
    }
  }

  await setSetting(VOICE_INJECT_DONE_KEY, true)
  return { skipped: false, scanned, injected, errors }
}

// ─── PR-11a migration ─────────────────────────────────────────────────
//
// PR-11a decomposed Pelican into five catalog components (file-shelf,
// chart-canvas, table-canvas, summary-dashboard, column-inspector). The
// Data Workspace template seed updated accordingly and the libraryRooms
// seed bumps its seedVersion to 2 to re-seed existing installs.
// User-instantiated room MODE records (one per conversation, in the
// `modes` store) are not touched by the libraryRooms re-seed — those
// were instantiated at PR-10a-migration time from the OLD template
// shape (messages + input + context) and need rewriting in place to
// pick up the decomposition.
//
// Selection: any mode that uses canvas-centric layout AND does not
// already include a file-shelf component. Both pelican-migrated rooms
// (`buildIntent.derivedFrom === 'pelican-migration'`) and any fresh
// rooms created from the V1 data-workspace seed (no `derivedFrom` set)
// match. Idempotent at two layers: the per-room "already has file-shelf"
// check, and the whole-pass guard key.
//
// Customisations preserved: the rewrite swaps the components array
// only. meta.name, scheme override, deviceClass, and any
// non-component fields stay untouched. The original component instance
// ids are dropped (replaced with fresh ids on the new components),
// but per-instance config carried by old components is also dropped —
// the old shape's components didn't have meaningful per-instance config
// (V1 PelicanContext owned all the state), so this is lossless in
// practice. PR-12's editor pass will let users re-customise.

const DATA_WORKSPACE_LAYOUT_PREFIX = 'canvas-centric'

function buildDataWorkspaceComponents() {
  return [
    { id: `comp_${crypto.randomUUID()}`, ref: 'file-shelf@^1.0',        slot: 'left-rail',  order: 0, essential: true },
    { id: `comp_${crypto.randomUUID()}`, ref: 'chart-canvas@^1.0',      slot: 'canvas',     order: 0, essential: true },
    { id: `comp_${crypto.randomUUID()}`, ref: 'table-canvas@^1.0',      slot: 'canvas',     order: 1, essential: false },
    { id: `comp_${crypto.randomUUID()}`, ref: 'summary-dashboard@^1.0', slot: 'canvas',     order: 2, essential: false },
    { id: `comp_${crypto.randomUUID()}`, ref: 'column-inspector@^1.0',  slot: 'inspector',  order: 0, essential: false },
    { id: `comp_${crypto.randomUUID()}`, ref: 'context@^1.0',           slot: 'inspector',  order: 1, essential: false },
    { id: `comp_${crypto.randomUUID()}`, ref: 'messages@^1.0',          slot: 'chat-panel', order: 0, essential: true },
    { id: `comp_${crypto.randomUUID()}`, ref: 'input@^1.0',             slot: 'input-dock', order: 0, essential: true },
  ]
}

/**
 * Rewrite every canvas-centric mode that doesn't yet include file-shelf
 * to use the full PR-11a decomposition. Idempotent: per-room (skips
 * rooms that already include file-shelf, so a partial run survives) +
 * whole-pass via PELICAN_DECOMPOSE_DONE_KEY (subsequent boots
 * short-circuit).
 *
 * Returns:
 *   { skipped: boolean, scanned, decomposed, errors }
 */
export async function migrateDecomposeDataWorkspaceRooms() {
  const done = await getSetting(PELICAN_DECOMPOSE_DONE_KEY)
  if (done === true) {
    return { skipped: true, scanned: 0, decomposed: 0, errors: [] }
  }

  const db = await initDB()
  const allModes = await db.getAll('modes')

  let scanned = 0
  let decomposed = 0
  const errors = []

  for (const mode of allModes) {
    if (mode.scope !== 'room') continue
    const layoutRef = mode.layout?.ref
    if (!layoutRef || !layoutRef.startsWith(DATA_WORKSPACE_LAYOUT_PREFIX)) continue
    scanned++
    const components = mode.components || []
    if (components.some((c) => c.ref?.startsWith('file-shelf'))) continue

    try {
      const updated = {
        ...mode,
        components: buildDataWorkspaceComponents(),
        // Tag the rewrite so future debug surfaces know which migration
        // touched this mode. Preserves any prior derivedFrom value.
        buildIntent: {
          ...(mode.buildIntent || {}),
          derivedFrom: mode.buildIntent?.derivedFrom || 'pelican-decomposition',
          decomposedAt: 'pr-11a',
        },
      }
      await saveMode(updated)
      decomposed++
    } catch (err) {
      errors.push({ modeId: mode.id, reason: err?.message || String(err) })
    }
  }

  await setSetting(PELICAN_DECOMPOSE_DONE_KEY, true)
  return { skipped: false, scanned, decomposed, errors }
}

// Exported for tests / debug consoles.
export const _internal = Object.freeze({
  MIGRATION_MAP,
  MIGRATION_DONE_KEY,
  REPAIR_DONE_KEY,
  VOICE_INJECT_DONE_KEY,
  PELICAN_DECOMPOSE_DONE_KEY,
  LEGACY_MODE_LOCALSTORAGE_KEY,
  DEFAULT_TEMPLATE_ID,
  DATA_WORKSPACE_LAYOUT_PREFIX,
})
