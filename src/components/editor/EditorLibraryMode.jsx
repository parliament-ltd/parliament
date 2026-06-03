// EditorLibraryMode — the "shopping" surface for the editor (PR-44).
//
// Replaces the canvas in the editor's center column when the user
// clicks the Library pill in the top bar. Three vertically stacked
// chevron-collapsible sections:
//
//   1. Showcase    — small cards for each item currently in the
//                    libraryBag. Items contributed by a checked room
//                    glow with that room's deterministic color, so
//                    bundles read as bundles. Hover any card → x in
//                    the top-right removes it (toggles the bag).
//                    Layouts and schemes flag a conflict outline +
//                    toast when more than one is selected.
//
//   2. Library     — filter chips (All / Layouts / Components / …) +
//                    an in-section search bar + a grid of LibraryCards
//                    with a check badge overlaid. Clicking a card
//                    toggles its bag entry and focuses it in Details.
//
//   3. Details     — info panel for the most-recently-clicked card.
//                    Mirrors what the study library's right-side modal
//                    surfaces today.
//
// Library mode does not yet feed Build mode's canvas / holding tray —
// that's PR-45. For now, opening Library is a side-experience: the
// underlying draft is unaffected while the user shops.

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, X as XIcon, Check, Search as SearchIcon, AlertTriangle } from 'lucide-react'
import { initDB } from '../../lib/db'
import { SCHEMES } from '../../lib/schemes'
import { findCatalogEntry } from '../../lib/refs'
import LibraryCard from '../LibraryCard'

const FILTER_CHIPS = [
  { id: 'all',        label: 'All' },
  { id: 'layouts',    label: 'Layouts' },
  { id: 'components', label: 'Components' },
  { id: 'schemes',    label: 'Schemes' },
  { id: 'rooms',      label: 'Rooms' },
]

// Map chip id → item.kind value for filtering.
const CHIP_TO_KIND = {
  layouts:    'layout',
  components: 'component',
  schemes:    'scheme',
  rooms:      'room',
}

export default function EditorLibraryMode({
  scope,
  bag,
  modes,
  catalogEntries,
  onToggle,
  onShowToast,
}) {
  const [layouts, setLayouts] = useState([])
  const [openSections, setOpenSections] = useState({
    showcase: true,
    library: true,
    details: false,
  })
  const [focused, setFocused] = useState(null) // { kind, ref }
  const [filterChip, setFilterChip] = useState('all')
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()

  useEffect(() => {
    let cancelled = false
    async function loadLayouts() {
      const db = await initDB()
      const all = await db.getAll('libraryLayouts')
      if (cancelled) return
      const filtered = all.filter((l) =>
        Array.isArray(l.scopes) ? l.scopes.includes(scope) : true
      )
      setLayouts(filtered)
    }
    loadLayouts()
    return () => { cancelled = true }
  }, [scope])

  // Toast on conflict transitions: 1 → 2+ layouts / schemes. Holding
  // the prev counts in a ref so we only fire on the transition, not on
  // every render that keeps the count >= 2.
  const prevConflict = useRef({ layouts: 0, schemes: 0 })
  useEffect(() => {
    const layoutCount = bag.layouts.length
    const schemeCount = bag.schemes.length
    if (layoutCount > 1 && prevConflict.current.layouts <= 1) {
      onShowToast?.('Only one layout can be used at a time for a room.')
    }
    if (schemeCount > 1 && prevConflict.current.schemes <= 1) {
      onShowToast?.('Only one scheme can be applied at a time for a room.')
    }
    prevConflict.current = { layouts: layoutCount, schemes: schemeCount }
  }, [bag.layouts.length, bag.schemes.length, onShowToast])

  function toggleSection(key) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleCardClick(kind, id, room) {
    onToggle(kind, id, kind === 'room' ? room : null)
    setFocused({ kind, ref: id })
    setOpenSections((prev) => ({ ...prev, details: true }))
  }

  function handleRemoveFromShowcase(kind, id) {
    onToggle(kind, id, null)
    // If we removed the focused item, drop focus.
    if (focused && focused.kind === kind && focused.ref === id) {
      setFocused(null)
    }
  }

  // ── Derived: Showcase items + conflict flags ───────────
  const showcaseItems = useMemo(
    () => buildShowcaseItems({ bag, layouts, catalogEntries, modes: modes || [] }),
    [bag, layouts, catalogEntries, modes]
  )
  const layoutConflict = bag.layouts.length > 1
  const schemeConflict = bag.schemes.length > 1

  // ── Derived: catalog items + filtering ─────────────────
  const catalogItems = useMemo(
    () => buildCatalogItems({ layouts, catalogEntries, modes: modes || [] }),
    [layouts, catalogEntries, modes]
  )
  const filteredCatalog = useMemo(
    () => filterCatalogItems(catalogItems, filterChip, query),
    [catalogItems, filterChip, query]
  )

  // ── Derived: focused item details ───────────────────────
  const focusedItem = useMemo(() => {
    if (!focused) return null
    return catalogItems.find(
      (it) => it.kind === focused.kind && it.id === focused.ref
    ) || null
  }, [focused, catalogItems])

  return (
    <div className="editor-library-mode">
      <Section
        title="Showcase"
        subtitle={describeShowcaseSummary(bag)}
        open={openSections.showcase}
        onToggle={() => toggleSection('showcase')}
      >
        <ShowcaseBody
          items={showcaseItems}
          layoutConflict={layoutConflict}
          schemeConflict={schemeConflict}
          onRemove={handleRemoveFromShowcase}
        />
      </Section>

      <Section
        title="Library"
        subtitle={describeLibrarySummary(filteredCatalog, query)}
        open={openSections.library}
        onToggle={() => toggleSection('library')}
      >
        <LibraryBody
          activeChip={filterChip}
          onChipChange={setFilterChip}
          search={search}
          onSearchChange={setSearch}
          items={filteredCatalog}
          bag={bag}
          focused={focused}
          onCardClick={handleCardClick}
        />
      </Section>

      <Section
        title="Details"
        subtitle={focusedItem ? focusedItem.displayName : 'Click a card to view details'}
        open={openSections.details}
        onToggle={() => toggleSection('details')}
      >
        <DetailsBody
          item={focusedItem}
          bag={bag}
          onToggle={onToggle}
        />
      </Section>
    </div>
  )
}

// ────────────────────────────────────────────────────────
//  Section shell
// ────────────────────────────────────────────────────────
function Section({ title, subtitle, open, onToggle, children }) {
  return (
    <div className="editor-library-section">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="editor-library-section-head"
      >
        <ChevronDown
          className="w-4 h-4 transition-transform shrink-0"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
        <div className="flex-1 text-left min-w-0">
          <div className="text-[12.5px] font-medium text-[var(--p-text-primary)]">
            {title}
          </div>
          {subtitle && (
            <div className="text-[10.5px] text-[var(--p-text-muted)] mt-0.5 truncate">
              {subtitle}
            </div>
          )}
        </div>
      </button>
      {open && <div className="editor-library-section-body">{children}</div>}
    </div>
  )
}

// ────────────────────────────────────────────────────────
//  Showcase
// ────────────────────────────────────────────────────────
function ShowcaseBody({ items, layoutConflict, schemeConflict, onRemove }) {
  if (items.length === 0) {
    return (
      <div className="text-[11.5px] text-[var(--p-text-muted)] py-8 text-center">
        Nothing selected yet. Pick items from the Library section below.
      </div>
    )
  }
  return (
    <>
      {layoutConflict && (
        <ConflictBanner message="More than one layout selected. A room can only use one." />
      )}
      {schemeConflict && (
        <ConflictBanner message="More than one scheme selected. A room can only use one." />
      )}
      <div className="editor-library-showcase-grid">
        {items.map((item) => (
          <ShowcaseCard
            key={`${item.kind}-${item.ref}`}
            item={item}
            warning={
              (item.kind === 'layout' && layoutConflict) ||
              (item.kind === 'scheme' && schemeConflict)
            }
            onRemove={() => onRemove(item.kind, item.ref)}
          />
        ))}
      </div>
    </>
  )
}

function ShowcaseCard({ item, warning, onRemove }) {
  const glow = item.sourceRoomId ? colorForRoomId(item.sourceRoomId) : null
  return (
    <div
      className={`editor-library-showcase-card${warning ? ' is-warning' : ''}${glow ? ' has-glow' : ''}`}
      style={glow ? { '--glow': glow } : undefined}
    >
      <div className="editor-library-showcase-card-kind">{item.kindLabel}</div>
      <div className="editor-library-showcase-card-name" title={item.displayName}>
        {item.displayName}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${item.displayName}`}
        className="editor-library-showcase-card-x"
      >
        <XIcon className="w-3 h-3" />
      </button>
    </div>
  )
}

function ConflictBanner({ message }) {
  return (
    <div className="editor-library-conflict">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

// ────────────────────────────────────────────────────────
//  Library (catalog)
// ────────────────────────────────────────────────────────
function LibraryBody({
  activeChip, onChipChange,
  search, onSearchChange,
  items, bag, focused, onCardClick,
}) {
  return (
    <>
      <div className="editor-library-controls">
        <div className="editor-library-chips">
          {FILTER_CHIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onChipChange(c.id)}
              className={`filter-chip ${activeChip === c.id ? 'active' : ''}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="editor-library-search">
          <SearchIcon className="w-3 h-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search the library"
            aria-label="Search the library"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="editor-library-search-clear"
            >
              <XIcon className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-[11.5px] text-[var(--p-text-muted)] py-8 text-center">
          {search ? 'No matches.' : 'Nothing in this category.'}
        </div>
      ) : (
        <div className="editor-library-grid">
          {items.map((item) => (
            <CatalogCard
              key={`${item.kind}-${item.id}`}
              item={item}
              checked={isItemChecked(item, bag)}
              focused={focused?.kind === item.kind && focused?.ref === item.id}
              onClick={() => onCardClick(item.kind, item.id, item.room)}
            />
          ))}
        </div>
      )}
    </>
  )
}

function CatalogCard({ item, checked, focused, onClick }) {
  // LibraryCard expects an item with kind + displayName + optional preview
  // metadata (layoutId for layout, surfaces/icon for component, etc.).
  return (
    <div
      className={`editor-library-card-wrap${checked ? ' is-checked' : ''}${focused ? ' is-focused' : ''}`}
    >
      <LibraryCard item={item} onClick={onClick} />
      <div
        className={`editor-library-card-check${checked ? ' is-on' : ''}`}
        aria-hidden="true"
      >
        {checked && <Check className="w-3 h-3" />}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────
//  Details
// ────────────────────────────────────────────────────────
function DetailsBody({ item, bag, onToggle }) {
  if (!item) {
    return (
      <div className="text-[11.5px] text-[var(--p-text-muted)] py-6 text-center">
        Click a card in the Library section to see more.
      </div>
    )
  }
  const checked = isItemChecked(item, bag)
  return (
    <div className="editor-library-details">
      <div className="editor-library-details-head">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-[var(--p-text-muted)] mb-1">
            {item.kindLabel}
          </div>
          <div className="text-[15px] font-medium text-[var(--p-text-primary)]">
            {item.displayName}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onToggle(item.kind, item.id, item.room)}
          className={`editor-library-details-cta${checked ? ' is-on' : ''}`}
        >
          {checked ? 'Remove from selection' : 'Add to selection'}
        </button>
      </div>
      {item.description && (
        <p className="editor-library-details-body-text">{item.description}</p>
      )}
      {item.kind === 'room' && item.room && (
        <RoomBundleDetails room={item.room} />
      )}
      {item.kind === 'layout' && item.slots && (
        <SlotList slots={item.slots} />
      )}
    </div>
  )
}

function RoomBundleDetails({ room }) {
  const compCount = (room.components || []).length
  const layoutRef = room.layout?.ref
  const schemeRef = room.scheme?.ref
  return (
    <div className="editor-library-details-bundle">
      <div className="text-[10.5px] text-[var(--p-text-muted)] uppercase tracking-wider mb-2">
        What you'll add
      </div>
      <ul className="editor-library-details-bundle-list">
        {layoutRef && <li>Layout: <strong>{layoutRef}</strong></li>}
        {schemeRef && <li>Scheme: <strong>{schemeRef}</strong></li>}
        {compCount > 0 && (
          <li>
            {compCount} component{compCount === 1 ? '' : 's'}
          </li>
        )}
      </ul>
    </div>
  )
}

function SlotList({ slots }) {
  if (!Array.isArray(slots) || slots.length === 0) return null
  return (
    <div className="editor-library-details-bundle">
      <div className="text-[10.5px] text-[var(--p-text-muted)] uppercase tracking-wider mb-2">
        Slots in this layout
      </div>
      <ul className="editor-library-details-bundle-list">
        {slots.map((s) => (
          <li key={s.id || s}>{s.label || s.id || String(s)}</li>
        ))}
      </ul>
    </div>
  )
}

// ────────────────────────────────────────────────────────
//  Pure helpers
// ────────────────────────────────────────────────────────
function buildShowcaseItems({ bag, layouts, catalogEntries, modes }) {
  const out = []
  for (const ref of bag.layouts || []) {
    const layout = layouts.find((l) => l.id === ref)
    out.push({
      kind: 'layout',
      ref,
      kindLabel: 'Layout',
      displayName: layout?.displayName || ref,
      sourceRoomId: firstSource(bag, 'layouts', ref),
    })
  }
  for (const ref of bag.components || []) {
    const entry = findCatalogEntry(catalogEntries, ref)
    out.push({
      kind: 'component',
      ref,
      kindLabel: 'Component',
      displayName: entry?.displayName || ref,
      sourceRoomId: firstSource(bag, 'components', ref),
    })
  }
  for (const ref of bag.schemes || []) {
    const scheme = SCHEMES.find((s) => s.id === ref || `${s.id}@1.0` === ref)
    out.push({
      kind: 'scheme',
      ref,
      kindLabel: 'Scheme',
      displayName: scheme?.displayName || ref,
      sourceRoomId: firstSource(bag, 'schemes', ref),
    })
  }
  for (const id of bag.rooms || []) {
    const room = modes.find((m) => m.id === id)
    out.push({
      kind: 'room',
      ref: id,
      kindLabel: 'Room',
      displayName: room?.meta?.name?.trim() || (room?.scope === 'homepage' ? 'Homepage' : 'Untitled'),
      sourceRoomId: id,
    })
  }
  return out
}

function firstSource(bag, key, ref) {
  return bag.sourceRooms?.[key]?.[ref]?.[0] || null
}

function buildCatalogItems({ layouts, catalogEntries, modes }) {
  const items = []
  for (const l of layouts) {
    items.push({
      ...l,
      kind: 'layout',
      id: l.id,
      kindLabel: 'Layout',
    })
  }
  for (const e of catalogEntries) {
    const ref = `${e.name}@${e.version}`
    items.push({
      ...e,
      kind: 'component',
      id: ref,
      kindLabel: 'Component',
    })
  }
  for (const s of SCHEMES) {
    items.push({
      ...s,
      kind: 'scheme',
      id: s.id,
      kindLabel: 'Scheme',
    })
  }
  for (const m of modes) {
    items.push({
      kind: 'room',
      id: m.id,
      kindLabel: 'Room',
      displayName: m.meta?.name?.trim() || (m.scope === 'homepage' ? 'Homepage' : 'Untitled'),
      description: m.meta?.description || null,
      author: 'You',
      layoutId: m.layout?.ref || null,
      room: m,
    })
  }
  return items
}

function filterCatalogItems(items, chip, query) {
  let list = items
  if (chip !== 'all') {
    const kind = CHIP_TO_KIND[chip]
    if (kind) list = list.filter((it) => it.kind === kind)
  }
  if (query) {
    list = list.filter((it) =>
      String(it.displayName || '').toLowerCase().includes(query) ||
      String(it.description || '').toLowerCase().includes(query) ||
      String(it.id || '').toLowerCase().includes(query)
    )
  }
  return list
}

function isItemChecked(item, bag) {
  const key = `${item.kind}s`
  return (bag[key] || []).includes(item.id)
}

function describeShowcaseSummary(bag) {
  const total =
    (bag.layouts?.length || 0) +
    (bag.components?.length || 0) +
    (bag.schemes?.length || 0) +
    (bag.rooms?.length || 0)
  if (total === 0) return 'Nothing selected yet'
  const parts = []
  if (bag.rooms?.length)      parts.push(`${bag.rooms.length} room${bag.rooms.length === 1 ? '' : 's'}`)
  if (bag.layouts?.length)    parts.push(`${bag.layouts.length} layout${bag.layouts.length === 1 ? '' : 's'}`)
  if (bag.components?.length) parts.push(`${bag.components.length} component${bag.components.length === 1 ? '' : 's'}`)
  if (bag.schemes?.length)    parts.push(`${bag.schemes.length} scheme${bag.schemes.length === 1 ? '' : 's'}`)
  return parts.join(' · ')
}

function describeLibrarySummary(items, query) {
  if (query) return `${items.length} match${items.length === 1 ? '' : 'es'}`
  return `${items.length} item${items.length === 1 ? '' : 's'}`
}

// Stable hue per room id → consistent glow color across renders.
function colorForRoomId(roomId) {
  let h = 0
  for (let i = 0; i < String(roomId).length; i++) {
    h = (h * 31 + String(roomId).charCodeAt(i)) >>> 0
  }
  return `hsl(${h % 360} 65% 55%)`
}
