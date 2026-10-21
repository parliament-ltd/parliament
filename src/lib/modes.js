// Mode files — Phase 1 PR-1 CRUD layer.
//
// A "mode file" is a JSON document describing how a single interface surface
// looks and behaves. Schema: parliament-mode/1.0. There are two kinds:
//   - room modes (scope: 'room')  — one per user-built room
//   - homepage mode (scope: 'homepage') — exactly one per user
//
// In V2 every conversation is associated with a room mode via the `room`
// field on the conversation record. The /chat/:id route loads the conversation,
// reads conversation.room, loads the matching mode, and renders <RoomShell>.
//
// PR-1 ships only the storage primitives; nothing renders modes yet. PR-3
// introduces <RoomShell>; PR-9 seeds the available room templates; PR-10a
// performs the one-time createdInMode → room migration.
//
// The full parliament_mode_file_format.md spec is not yet committed. Until
// it lands, the canonical Phase 1 contract is split across:
//   - refactor/data-migration.md §"Per-template mode file contents"
//     (top-level shape, layout/scheme refs, components array)
//   - refactor/v2-phase1-audit.md §2 (slot inventory, tier rule)
//   - src/catalog/validate.js (manifest field shapes, configSchema camelCase)
//   - src/lib/validate.js → validateMode (top-level mode validation)

import { initDB } from './db'

const SCHEMA = 'parliament-mode/1.0'
const PARLIAMENT_VERSION = '0.4.0' // bump per release

function generateId(prefix = 'mode') {
  return `${prefix}_${crypto.randomUUID()}`
}

function nowIso() {
  return new Date().toISOString()
}

// ─── Read ────────────────────────────────────────────────

/**
 * PR-19c: legacy modes (created before the `builtAt` field shipped) have
 * `meta.builtAt === undefined`. We treat those as already built — the
 * editor button reads "Save" for them. New modes that need explicit user
 * confirmation set `meta.builtAt: null` (button reads "Build"). Once built,
 * `meta.builtAt` is a timestamp. This normalization runs at read time so
 * we don't need an IDB migration.
 */
function normalizeBuiltAt(mode) {
  if (!mode || !mode.meta) return mode
  if (mode.meta.builtAt === undefined) {
    return {
      ...mode,
      meta: { ...mode.meta, builtAt: mode.meta.created || new Date().toISOString() },
    }
  }
  return mode
}

/**
 * Load a single mode by id. Returns null if not found.
 */
export async function loadMode(id) {
  const db = await initDB()
  const mode = await db.get('modes', id)
  return mode ? normalizeBuiltAt(mode) : null
}

/**
 * List all modes the user has, optionally filtered by scope.
 * @param {object} [opts]
 * @param {string} [opts.scope] - 'room' | 'homepage'
 */
export async function listModes({ scope } = {}) {
  const db = await initDB()
  const all = scope
    ? await db.getAllFromIndex('modes', 'scope', scope)
    : await db.getAll('modes')
  return all.map(normalizeBuiltAt)
}

/**
 * The user has exactly one homepage mode. Returns it, or null if not yet seeded.
 */
export async function loadHomepageMode() {
  const matches = await listModes({ scope: 'homepage' })
  return matches[0] || null
}

// ─── Write ───────────────────────────────────────────────

/**
 * Persist a mode. The caller is responsible for the mode's full shape
 * (validators in lib/validate.js can confirm). On save:
 *   - meta.modified is updated
 *   - parliamentVersion is updated to current
 *   - id, meta.created, meta.author, buildIntent are preserved if present
 *
 * Returns the saved mode (the same shape with timestamps applied).
 */
export async function saveMode(mode) {
  if (!mode || typeof mode !== 'object') {
    throw new Error('saveMode: mode must be an object')
  }
  if (!mode.id) {
    throw new Error('saveMode: mode.id is required')
  }
  if (!mode.scope || (mode.scope !== 'room' && mode.scope !== 'homepage')) {
    throw new Error("saveMode: mode.scope must be 'room' or 'homepage'")
  }

  const db = await initDB()
  const existing = await db.get('modes', mode.id)
  const now = nowIso()

  const merged = {
    ...mode,
    schema: SCHEMA,
    parliamentVersion: PARLIAMENT_VERSION,
    meta: {
      ...(existing?.meta || {}),
      ...(mode.meta || {}),
      // Preserve original created and author if they existed.
      created: existing?.meta?.created || mode?.meta?.created || now,
      modified: now,
    },
  }

  await db.put('modes', merged)
  return merged
}

/**
 * Names a room, as name: does (stage 4; C40): the person's own words, kept
 * as they typed them. The rest of the room is unchanged.
 * @returns {Promise<object|null>} the saved mode, or null when there is no such room
 */
export async function renameMode(id, name) {
  const mode = await loadMode(id)
  if (!mode) return null
  return saveMode({ ...mode, meta: { ...mode.meta, name } })
}

/**
 * Delete a mode. Use with care — this does not migrate any conversations
 * whose `room` field references the deleted mode (those will fall back to
 * placeholder rendering when loaded). Future PRs may add a guard.
 */
export async function deleteMode(id) {
  const db = await initDB()
  await db.delete('modes', id)
}

// ─── Construction ────────────────────────────────────────

/**
 * Instantiate a new mode from a room template (an entry in libraryRooms).
 * The template is essentially a mode file with `id` placeholder; this
 * function generates a fresh id, fills in timestamps, and persists.
 *
 * @param {object} template - the libraryRooms entry, shaped like a mode file
 * @param {object} [overrides] - optional name, scheme, etc. overrides
 * @returns {Promise<object>} the saved mode
 */
export async function createModeFromTemplate(template, overrides = {}) {
  if (!template || !template.id) {
    throw new Error('createModeFromTemplate: template missing or invalid')
  }

  const id = generateId(template.scope === 'homepage' ? 'home' : 'mode')
  const now = nowIso()

  // Each component instance gets a fresh stable id, separate from the
  // template's component placeholder ids. That way users can have multiple
  // rooms instantiated from the same template without id collisions.
  const components = (template.components || []).map((c) => ({
    ...c,
    id: `comp_${crypto.randomUUID()}`,
  }))

  const mode = {
    schema: SCHEMA,
    parliamentVersion: PARLIAMENT_VERSION,
    id,
    scope: template.scope || 'room',
    meta: {
      name: overrides.name || template.displayName || template.name || 'New room',
      // Which template the room came from, so the new screens can show its
      // name in the reader's language until the owner names it (C90).
      ...(template.id && !overrides.name ? { template: template.id } : {}),
      author: overrides.author || null,
      description: template.description || '',
      icon: template.icon || null,
      preferredProvider: null,
      created: now,
      modified: now,
      // PR-19c: builtAt: null marks the room as "needs user confirmation"
      // (button reads "Build" in editor). Set to a timestamp via igniteExistingRoom
      // or buildAndOpenRoom once the user has committed via Ignition.
      // Callers can override via `overrides.builtAt`.
      builtAt: overrides.builtAt !== undefined ? overrides.builtAt : null,
    },
    deviceClass: template.deviceClass || 'visual-pointer',
    layout: template.layout,
    scheme: overrides.scheme || template.scheme,
    components,
    pipelines: [],
    requestedPermissions: [], // filled in by saveMode flow when components declare requirements
    buildIntent: overrides.buildIntent || template.buildIntent || null,
  }

  return saveMode(mode)
}

/**
 * Build a fresh blank mode object without persisting it. Used by the
 * editor's blank-canvas flow (PR-19d): the user lands on /edit with no
 * mode, drags a layout (or room) onto the canvas, and we materialize a
 * draft via this helper. Save (in EditorView) writes it to IDB.
 *
 * The returned mode has an empty `meta.name`. The editor's top bar
 * keeps Save disabled until the user enters a name in the right rail.
 *
 * @param {string} [layoutRef] - layout ref to seed (e.g. 'three-panel@1.0').
 *   When omitted, `layout` is null and the canvas stays in splash mode.
 */
export function createBlankMode(layoutRef) {
  const now = nowIso()
  return {
    schema: SCHEMA,
    parliamentVersion: PARLIAMENT_VERSION,
    id: generateId('mode'),
    scope: 'room',
    meta: {
      name: '',
      author: null,
      description: '',
      icon: null,
      preferredProvider: null,
      created: now,
      modified: now,
      builtAt: null,
    },
    deviceClass: 'visual-pointer',
    layout: layoutRef ? { ref: layoutRef } : null,
    scheme: { ref: 'parliament@1.0' },
    components: [],
    pipelines: [],
    requestedPermissions: [],
    buildIntent: null,
  }
}

/**
 * In-memory copy of an existing mode, ready to seed the editor's
 * blank-canvas Build flow (PR-19e). The returned object has:
 *   - a fresh id (so saveMode persists it as a new record)
 *   - blank meta.name (the user picks one in the right rail)
 *   - new component instance ids (so the new room edits don't bleed
 *     into the source)
 *   - builtAt: null (Build button lights up; Ignition runs again)
 *
 * The source mode is unchanged. Caller is responsible for handing this
 * object to the editor (e.g. via router location state) and then calling
 * saveMode when the user names + saves it.
 */
export function createCopyOfMode(source) {
  if (!source || typeof source !== 'object') {
    throw new Error('createCopyOfMode: source must be an object')
  }
  const now = nowIso()
  return {
    schema: SCHEMA,
    parliamentVersion: PARLIAMENT_VERSION,
    id: generateId('mode'),
    scope: 'room',
    meta: {
      name: '',
      author: null,
      description: source.meta?.description || '',
      icon: source.meta?.icon || null,
      preferredProvider: null,
      created: now,
      modified: now,
      builtAt: null,
    },
    deviceClass: source.deviceClass || 'visual-pointer',
    layout: source.layout ? { ...source.layout } : null,
    scheme: source.scheme ? { ...source.scheme } : { ref: 'parliament@1.0' },
    components: (source.components || []).map((c) => ({
      ...c,
      id: `comp_${crypto.randomUUID()}`,
    })),
    pipelines: [],
    requestedPermissions: [],
    buildIntent: source.buildIntent || null,
  }
}

// ─── Constants exported for other callers ────────────────

export const MODE_SCHEMA = SCHEMA
export const MODE_SCOPES = Object.freeze({ ROOM: 'room', HOMEPAGE: 'homepage' })
