// Catalog registry — Phase 1 PR-1 skeleton.
//
// The catalog is the V2 surface that holds every layout, component, scheme,
// room template, and resource the user can install or compose with. It is
// backed by the IndexedDB tables created in db.js v4: libraryLayouts,
// libraryRooms, libraryComponents, librarySchemes, libraryResources.
//
// In PR-1 these tables are mostly empty; only libraryLayouts is seeded with
// 5 available + 2 coming-soon placeholders. PR-2 begins seeding components,
// PR-4b seeds schemes, PR-6 seeds resources, PR-9 seeds rooms.
//
// IMPORTANT — the user-action vs autonomous tier rule (refactor/tier-classification.md)
// is the canonical source of truth for component tier classification. This
// file does NOT enforce the rule programmatically; it is enforced editorially
// in catalog reviews. Any future contributor adding an Agent-tier component
// must read tier-classification.md before classifying.

import { initDB } from './db'

// ─── Component tiers (Phase 1) ───────────────────────────

export const TIERS = Object.freeze({
  UTILITY: 'utility',     // pure rendering, no data access
  READER: 'reader',       // reads conversation context, no model calls
  COMPOSER: 'composer',   // makes model calls IN DIRECT RESPONSE TO USER ACTION
  INTEGRATOR: 'integrator', // network calls beyond model API (stacks with others)
  AGENT: 'agent',         // makes AUTONOMOUS model calls (Phase 2 only)
  PERSISTER: 'persister', // shared cross-mode storage (Phase 2.5+ reserved)
})

export const TIER_VALUES = Object.freeze(Object.values(TIERS))

// ─── Library status values ───────────────────────────────

export const STATUS = Object.freeze({
  AVAILABLE: 'available',
  BETA: 'beta',
  COMING_SOON: 'coming-soon',
})

export const STATUS_VALUES = Object.freeze(Object.values(STATUS))

// ─── Components ──────────────────────────────────────────

/**
 * Get a single component catalog entry by ref.
 * @param {string} ref - e.g. 'messages@1.0' or 'messages@^1.0'
 * @returns {Promise<object|null>}
 */
export async function getComponent(ref) {
  const db = await initDB()
  // PR-1: exact-match by id only. PR-2 introduces semver range resolution
  // when components are versioned more dynamically.
  return (await db.get('libraryComponents', ref)) || null
}

/**
 * List all component catalog entries, optionally filtered by tier.
 * @param {object} [opts]
 * @param {string} [opts.tier] - filter by tier (utility | reader | ...)
 * @returns {Promise<object[]>}
 */
export async function listComponents({ tier } = {}) {
  const db = await initDB()
  if (tier) {
    return db.getAllFromIndex('libraryComponents', 'tier', tier)
  }
  return db.getAll('libraryComponents')
}

// ─── Layouts ─────────────────────────────────────────────

export async function getLayout(ref) {
  const db = await initDB()
  return (await db.get('libraryLayouts', ref)) || null
}

/**
 * List layouts, optionally filtered by status or scope.
 * @param {object} [opts]
 * @param {string} [opts.status] - 'available' | 'beta' | 'coming-soon'
 * @param {string} [opts.scope]  - 'room' | 'homepage'
 */
export async function listLayouts({ status, scope } = {}) {
  const db = await initDB()
  let entries
  if (status) {
    entries = await db.getAllFromIndex('libraryLayouts', 'status', status)
  } else {
    entries = await db.getAll('libraryLayouts')
  }
  if (scope) {
    entries = entries.filter(l => Array.isArray(l.scopes) && l.scopes.includes(scope))
  }
  return entries
}

// ─── Schemes ─────────────────────────────────────────────

export async function getScheme(ref) {
  const db = await initDB()
  return (await db.get('librarySchemes', ref)) || null
}

export async function listSchemes() {
  const db = await initDB()
  return db.getAll('librarySchemes')
}

// ─── Rooms (templates) ───────────────────────────────────

export async function getRoom(ref) {
  const db = await initDB()
  return (await db.get('libraryRooms', ref)) || null
}

export async function listRooms({ status } = {}) {
  const db = await initDB()
  if (status) {
    return db.getAllFromIndex('libraryRooms', 'status', status)
  }
  return db.getAll('libraryRooms')
}

// ─── Resources ───────────────────────────────────────────

export async function getResource(id) {
  const db = await initDB()
  return (await db.get('libraryResources', id)) || null
}

/**
 * List resources, optionally filtered by status or format.
 * @param {object} [opts]
 * @param {string} [opts.status]  - 'available' | 'coming-soon'
 * @param {string} [opts.format]  - 'markdown' | 'pdf' | 'prompt' | 'example-room' | 'video-link'
 */
export async function listResources({ status, format } = {}) {
  const db = await initDB()
  if (status && format) {
    const byStatus = await db.getAllFromIndex('libraryResources', 'status', status)
    return byStatus.filter(r => r.format === format)
  }
  if (status) return db.getAllFromIndex('libraryResources', 'status', status)
  if (format) return db.getAllFromIndex('libraryResources', 'format', format)
  return db.getAll('libraryResources')
}

// ─── Generic put-helpers (used by seed scripts in later PRs) ─

export async function putComponent(entry) {
  const db = await initDB()
  await db.put('libraryComponents', entry)
  return entry
}

export async function putLayout(entry) {
  const db = await initDB()
  await db.put('libraryLayouts', entry)
  return entry
}

export async function putScheme(entry) {
  const db = await initDB()
  await db.put('librarySchemes', entry)
  return entry
}

export async function putRoom(entry) {
  const db = await initDB()
  await db.put('libraryRooms', entry)
  return entry
}

export async function putResource(entry) {
  const db = await initDB()
  await db.put('libraryResources', entry)
  return entry
}
