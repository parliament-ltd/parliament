// Retired with R3 and R11, approved by Stefan on 22 October 2026.
//
// The seed that gave every new install the Study, the homepage room with
// four sections (blueprint, chats, library, favorites). It ran from initDB in
// src/lib/db.js on every start. Nothing imports this file and it is not built
// into the app. To restore: move it back above "ID Generation" in
// src/lib/db.js and call seedHomepageMode(db) from initDB again.

/**
 * Seed the single homepage mode (one record per user, scope='homepage').
 * The component list is empty at PR-1 — PR-6 fills it with the homepage
 * components (blueprint, chats, library, favorites). The record exists
 * from v4 so the homepage route in PR-6 can resolve a real mode rather
 * than a hand-built fallback.
 * Idempotent: only seeds when no homepage mode already exists.
 *
 * Constants below mirror src/lib/modes.js — keep in sync if either changes.
 */
// PR-6: the homepage mode now ships with four default sections —
// Blueprint, Chats, Library, Favorites. The seed populates them when
// it creates `home_default`, AND tops up the components array if an
// existing `home_default` (from a fresh PR-1 install) still has empty
// components. Once PR-8's editor lets users edit the homepage, the
// top-up condition becomes irrelevant — by then every saved homepage
// has at least one component the user added.
const HOMEPAGE_DEFAULT_COMPONENTS = [
  {
    id: 'home-section-blueprint',
    ref: 'blueprint@^1.0',
    slot: 'section-slot',
    order: 0,
    essential: true,
    config: {
      section: { title: 'Your rooms', meta: 'Hover a chat row to spotlight its room' },
    },
  },
  {
    id: 'home-section-chats',
    ref: 'chats@^1.0',
    slot: 'section-slot',
    order: 1,
    essential: true,
    config: {
      section: { title: 'Chats', meta: 'Browse your history across rooms' },
      defaultView: 'summary',
      publishHoverEvents: true,
    },
  },
  {
    id: 'home-section-library',
    ref: 'library@^1.0',
    slot: 'section-slot',
    order: 2,
    essential: false,
    config: {
      section: { title: 'Library', meta: 'Rooms, parts, and guides' },
      defaultTab: 'rooms',
    },
  },
  {
    id: 'home-section-favorites',
    ref: 'favorites@^1.0',
    slot: 'section-slot',
    order: 3,
    essential: false,
    config: {
      section: { title: 'Favorites', meta: 'Saved snippets across conversations' },
    },
  },
]

export async function seedHomepageMode(db) {
  const existing = await db.getAllFromIndex('modes', 'scope', 'homepage')
  const now = new Date().toISOString()

  if (existing.length === 0) {
    await db.put('modes', {
      id: 'home_default',
      schema: 'parliament-mode/1.0',
      parliamentVersion: '0.5.0',
      scope: 'homepage',
      meta: {
        name: 'The Study',
        description: 'Your default landing surface. Four sections out of the box.',
        created: now,
        modified: now,
      },
      layout: { ref: 'stacked-sections@^1.0' },
      scheme: { ref: 'parliament@^1.0' },
      components: HOMEPAGE_DEFAULT_COMPONENTS,
      pipelines: [],
      requestedPermissions: [],
      buildIntent: null,
    })
    return
  }

  // Top-up: a home_default record from PR-1 has empty `components`. Fill
  // it in so the new homepage has its four default sections without
  // requiring users to clear their browser data. Untouched if the user
  // (or a later PR) populated components already.
  const home = existing.find(m => m.id === 'home_default') || existing[0]
  if (Array.isArray(home.components) && home.components.length === 0) {
    await db.put('modes', {
      ...home,
      components: HOMEPAGE_DEFAULT_COMPONENTS,
      parliamentVersion: '0.5.0',
      meta: { ...(home.meta || {}), modified: now },
    })
  }

  // PR-19e: rename the default homepage name from "Home" to "The Study".
  // Only triggers when the current meta.name exactly matches the prior
  // seed value, so user-renamed homepages are left alone.
  const refreshed = (await db.getAllFromIndex('modes', 'scope', 'homepage'))
    .find(m => m.id === 'home_default') || home
  if (refreshed.meta?.name === 'Home') {
    await db.put('modes', {
      ...refreshed,
      meta: { ...(refreshed.meta || {}), name: 'The Study', modified: now },
    })
  }
}
