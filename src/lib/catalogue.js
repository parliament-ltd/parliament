// The catalogue, read in one place (refactor-plan.md §4, "One read layer for
// the catalogue"; research/lab-code.md, rebuild 4; stage 5, piece 4). What
// the Library lists: your rooms, room templates, boards, layouts, blocks,
// themes and resources.
//
// What the code knows comes from the code: block manifests (src/catalog),
// the layout registry, the room templates and the themes. The stores are
// read only for what only they hold: your rooms, layouts and resources not
// yet built (coming soon), and a layout's description where its manifest
// has none. The stored copies of manifests are snapshots and are not
// trusted over the code (the audit found them stale).
//
// The block manifests and the layout registry hold React code, so the caller
// passes their lists in (the shell has them loaded for rooms already); this
// module stays plain data.
//
// catalogueItems is pure; readCatalogue reads the stores it needs. Each
// item carries `word`, its key in the copy table (COPY.blocks, layouts,
// themes and their About groups, C131), where people's words for it are
// kept and translated; the manifest's English is the fallback.

import { TEMPLATES } from './seedTemplates'
import { SCHEMES } from './schemes'
import { roomName } from './roomNames'

/** The Library's shelves, in the order it shows them (Lab v7). */
export const SHELVES = Object.freeze(['room', 'board', 'layout', 'block', 'theme', 'resource'])

/** The boards the Library lists: the ones that ship prebuilt (AB §2). */
export const LIBRARY_BOARDS = Object.freeze(['almanac', 'collection', 'library', 'docket', 'reflection', 'settings'])

// Web search, voice input and file attach are features of the input block,
// not blocks (AB §2, decided).
const FEATURES = Object.freeze(['web-search', 'voice-input', 'file-attach'])
const INPUT = 'input'

const bare = (ref) => String(ref ?? '').split('@')[0]
const isRoomScope = (scope) => (Array.isArray(scope) ? scope.includes('room') : scope === 'room')
const blockCount = (components) => (components ?? []).filter((c) => !FEATURES.includes(bare(c?.ref))).length

/**
 * Everything the Library lists, by shelf, in each shelf's order.
 * @param {{ modes?: object[], storedLayouts?: object[], resources?: object[], blocks?: object[], layouts?: object[],
 *   templates?: object[], themes?: object[] }} from  blocks: the block manifests (src/catalog listEntries);
 *   layouts: the layout registry (listLayoutEntries); templates and themes default to the app's own
 * @returns {Array<{ shelf: string, key: string, name: string|object, description: string|null, soon?: boolean,
 *   mine?: boolean, template?: string, blocks?: number, layout?: string|null, theme?: string|null,
 *   places?: number, features?: string[], board?: string, format?: string|null }>}
 *   name: a string from a manifest, or for a room { own } or { template } (roomNames.js)
 */
export function catalogueItems({
  modes = [], storedLayouts = [], resources = [],
  blocks = [], layouts = [], templates = TEMPLATES, themes = SCHEMES,
} = {}) {
  const items = []
  const layoutName = new Map(layouts.map((l) => [l.name, l.displayName]))
  for (const l of storedLayouts) if (!layoutName.has(bare(l.id))) layoutName.set(bare(l.id), l.displayName)
  const themeName = new Map(themes.map((t) => [bare(t.id), t.displayName]))
  const facts = (mode) => ({
    layout: layoutName.get(bare(mode?.layout?.ref)) ?? null,
    layoutWord: bare(mode?.layout?.ref) || null,
    theme: themeName.get(bare(mode?.scheme?.ref)) ?? null,
    themeWord: bare(mode?.scheme?.ref) || null,
    blocks: blockCount(mode?.components),
    // For the Library's details (C242 (c)): the blocks by key, and what it is built for.
    blockKeys: (mode?.components ?? []).map((c) => bare(c?.ref)).filter((b) => b && !FEATURES.includes(b)),
    device: mode?.deviceClass === 'visual-touch-phone' ? 'mobile' : 'desktop',
  })
  // A room made from a template keeps the template's description until its
  // owner writes another, so it reads in the reader's language too.

  // Your rooms, then the templates.
  for (const mode of modes.filter((m) => m?.scope === 'room')) {
    // Matched by the words themselves, since rooms made before C90 do not
    // record their template.
    const said = mode.meta?.description
    const aboutTemplate = said ? templates.find((t) => t.description === said)?.id ?? null : null
    items.push({ shelf: 'room', key: `room:${mode.id}`, id: mode.id, mine: true, name: roomName(mode) ?? { unnamed: true }, description: mode.meta?.description || null, aboutTemplate, ...facts(mode) })
  }
  for (const t of templates.filter((x) => x.scope === 'room')) {
    items.push({ shelf: 'room', key: `template:${t.id}`, template: t.id, name: { template: t.id }, description: t.description ?? null, aboutTemplate: t.id, soon: t.status === 'coming-soon', ...facts(t) })
  }

  for (const board of LIBRARY_BOARDS) items.push({ shelf: 'board', key: `board:${board}`, board, name: board, description: null })

  // Layouts for rooms: the built ones, then the ones still to come.
  const built = new Set()
  for (const l of layouts.filter((x) => isRoomScope(x.scope))) {
    built.add(l.name)
    const stored = storedLayouts.find((s) => bare(s.id) === l.name)
    const places = new Set((l.slots ?? []).map((s) => s.id)).size
    items.push({ shelf: 'layout', key: `layout:${l.name}@${l.version}`, word: l.name, name: l.displayName, description: l.description ?? stored?.description ?? null, places, slots: [...new Set((l.slots ?? []).map((s) => s.id))] })
  }
  for (const s of storedLayouts.filter((x) => x.status === 'coming-soon' && isRoomScope(x.scopes) && !built.has(bare(x.id)))) {
    items.push({ shelf: 'layout', key: `layout:${s.id}`, word: bare(s.id), name: s.displayName, description: s.description ?? null, soon: true })
  }

  for (const b of blocks.filter((x) => (x.surfaces ?? []).includes('room') && !FEATURES.includes(x.name))) {
    items.push({ shelf: 'block', key: `block:${b.name}`, word: b.name, name: b.displayName, description: b.description ?? null, features: b.name === INPUT ? [...FEATURES] : [],
      fits: [...(b.slotTargets ?? [])].sort((x, y) => (y.primary ? 1 : 0) - (x.primary ? 1 : 0)).map((t) => t.slot) })
  }

  for (const t of themes) items.push({ shelf: 'theme', key: `theme:${t.id}`, word: bare(t.id), name: t.displayName, description: t.description ?? null })

  for (const r of resources) {
    items.push({ shelf: 'resource', key: `resource:${r.id}`, name: r.displayName ?? r.name ?? r.id, description: r.description ?? null, soon: r.status === 'coming-soon', format: r.format ?? null })
  }
  return items
}

/**
 * The catalogue as it stands on this device.
 * @param {import('idb').IDBPDatabase} db
 * @param {{ blocks: object[], layouts: object[] }} code the block manifests and the layout registry
 */
export async function readCatalogue(db, { blocks, layouts }) {
  const all = (store) => (db?.objectStoreNames.contains(store) ? db.getAll(store).catch(() => []) : Promise.resolve([]))
  const [modes, storedLayouts, resources] = await Promise.all(['modes', 'libraryLayouts', 'libraryResources'].map(all))
  return catalogueItems({ modes, storedLayouts, resources, blocks, layouts })
}
