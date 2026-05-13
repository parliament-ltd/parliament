// Parliament V2 catalog — in-memory registry of component manifests.
//
// IMPORTANT: tier classification is governed by refactor/tier-classification.md.
// The rule in one line:
//
//   Components that make model calls in DIRECT response to a user action are
//   Composer (or below) and don't require consent. Components that make
//   AUTONOMOUS model calls are Agent and require explicit consent at first use.
//
// Phase 1 ships zero Agent components by design. The validator warns (does not
// reject) on tier='agent' so reviewers catch accidental escalation. Anyone
// adding a new component that calls a model must read tier-classification.md
// before classifying — the rule looks small but has real UX consequences.
//
// ─── This file vs lib/catalog.js ─────────────────────────
//
// This module owns the in-memory registry of component code (manifest +
// React render functions) shipped with the app. lib/catalog.js owns the
// IndexedDB CRUD layer for the V2 library tables (libraryComponents, etc.)
// — those records are the user-facing browse surface and seed/snapshot
// shape. The two layers reference the same `name@version` refs but serve
// different concerns and never share storage.

import messagesEntry       from './entries/messages'
import inputEntry          from './entries/input'
import tocEntry            from './entries/toc'
import highlightsEntry     from './entries/highlights'
import notesEntry          from './entries/notes'
import branchesEntry       from './entries/branches'
import contextEntry        from './entries/context'
import collabModeEntry     from './entries/collab-mode'
import reviewEntry         from './entries/review'
import voiceInputEntry     from './entries/voice-input'
import blueprintEntry      from './entries/blueprint'
import chatsEntry          from './entries/chats'
import libraryEntry        from './entries/library'
import favoritesEntry      from './entries/favorites'
import quickStatsEntry     from './entries/quick-stats'
import recentActivityEntry from './entries/recent-activity'
import scratchpadEntry     from './entries/scratchpad'
import fileShelfEntry        from './entries/file-shelf'
import chartCanvasEntry      from './entries/chart-canvas'
import tableCanvasEntry      from './entries/table-canvas'
import summaryDashboardEntry from './entries/summary-dashboard'
import columnInspectorEntry  from './entries/column-inspector'
import documentCanvasEntry   from './entries/document-canvas'
import claudeCommentsEntry   from './entries/claude-comments'
import rippleAnalysisEntry   from './entries/ripple-analysis'
import webSearchEntry        from './entries/web-search'
import { validateManifest, entryRef } from './validate'

const REGISTRY = new Map()

function register(entry) {
  const result = validateManifest(entry)
  if (!result.valid) {
    const ref = entry?.name && entry?.version ? entryRef(entry) : '<unknown>'
    throw new Error(
      `Catalog manifest invalid for ${ref}: ${result.errors.join('; ')}`
    )
  }
  if (result.warnings.length > 0 && import.meta.env.DEV) {
    const ref = entryRef(entry)
    console.warn(`[catalog] ${ref}:`, result.warnings.join('; '))
  }
  REGISTRY.set(entryRef(entry), entry)
}

// Register the Phase 1 entries. Order is not significant.
register(messagesEntry)
register(inputEntry)
register(tocEntry)
register(highlightsEntry)
register(notesEntry)
register(branchesEntry)
register(contextEntry)
register(collabModeEntry)
register(reviewEntry)
register(voiceInputEntry)
register(blueprintEntry)
register(chatsEntry)
register(libraryEntry)
register(favoritesEntry)
register(quickStatsEntry)
register(recentActivityEntry)
register(scratchpadEntry)
// PR-11a — Pelican decomposition.
register(fileShelfEntry)
register(chartCanvasEntry)
register(tableCanvasEntry)
register(summaryDashboardEntry)
register(columnInspectorEntry)
// PR-11b — Secretarybird decomposition.
register(documentCanvasEntry)
register(claudeCommentsEntry)
register(rippleAnalysisEntry)
// PR-18d — per-message tool arming via inputAction contributions.
register(webSearchEntry)

/**
 * Look up a manifest entry by `name@version` ref. Exact-match only in PR-2;
 * semver range resolution lands when component versioning becomes dynamic.
 */
export function getEntry(ref) {
  return REGISTRY.get(ref) || null
}

/**
 * List all registered manifest entries, optionally filtered by tier.
 */
export function listEntries({ tier } = {}) {
  const all = [...REGISTRY.values()]
  return tier ? all.filter(e => e.tier === tier) : all
}

export { validateManifest, entryRef }
