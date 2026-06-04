// EditorLibraryMode — the "shopping" surface for the editor (PR-44).
//
// Replaces the canvas in the editor's center column when the user
// clicks the Library pill in the top bar. Three vertically stacked
// chevron-collapsible sections:
//
//   1. Showcase    — small cards for the UNION of (a) what's already
//                    in the draft (placed components, current layout,
//                    current scheme) and (b) what's in the libraryBag
//                    pending apply. PR-45 made the Showcase a persistent
//                    "cart": it reflects the room's contents whether
//                    you're shopping or revisiting after a build.
//                    Items contributed by a checked room glow with
//                    that room's deterministic color. Hover any card →
//                    x in the top-right. For bag items the x just
//                    removes from bag; for draft items it dispatches
//                    MOVE_COMPONENT_TO_TRAY (PR-49a) / clear-layout /
//                    clear-scheme immediately on the draft (per user
//                    decision in PR-45 planning). Conflict outline +
//                    toast when the union has more than one layout /
//                    scheme.
//
//   2. Library     — filter chips (All / Layouts / Components / …) +
//                    an in-section search bar + a grid of LibraryCards
//                    with a check badge overlaid. A card is checked
//                    when it's in the bag OR placed in the draft.
//                    Clicking a card toggles its bag entry and focuses
//                    it in Details.
//
//   3. Details     — info panel for the most-recently-clicked card.
//                    Mirrors what the study library's right-side modal
//                    surfaces today.
//
// Apply-on-close (PR-45): clicking the Build/Edit pill while Library
// is open commits the bag's diff against the draft via existing
// actions (SWAP_LAYOUT / INIT_FROM_LAYOUT, APPLY_SCHEME, push
// components into the holding tray) and then clears the bag. The
// Showcase keeps showing the same items, now sourced from the draft
// side of the union. See EditorView.handleLibraryClose.

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
  mode,
  tray,
  bag,
  modes,
  catalogEntries,
  onToggle,
  onShowToast,
  // PR-45: hover-x on a Showcase item that's already placed in the
  // draft (the component case) needs to mutate the draft directly.
  // EditorView wires this to a handler that removes every placed
  // instance of the ref.
  onRemovePlacedComponent,
  // PR-46d: hover-x on a Showcase item that's still in the holding
  // tray (unplaced, e.g. from a recent Library commit). Dismisses
  // every tray chip matching that ref.
  onDismissTrayByRef,
  // PR-46: hover-x on the active layout when the bag has exactly one
  // queued layout (i.e., the user has staged a swap and wants to
  // commit it). EditorView's handler does the SWAP_LAYOUT + clears
  // the bag entry + toasts. Same idea for scheme.
  onSwapToBagLayout,
  onSwapToBagScheme,
}) {
  const [layouts, setLayouts] = useState([])
  const [openSections, setOpenSections] = useState({
    showcase: true,
    library: true,
    details: false,
  })
  // PR-48b: per-section heights, driven by drag handles at the bottom
  // of each section. `null` means "auto" (content height). User-set
  // values clamp to per-section min/max. Session-only — re-opens
  // reset to auto (Showcase / Details) or the default cap (Library).
  const [sectionHeights, setSectionHeights] = useState({
    showcase: null,
    library: 320,
    details: null,
  })
  const SECTION_LIMITS = {
    showcase: { min: 80, max: 600 },
    library:  { min: 200, max: 720 },
    details:  { min: 80, max: 500 },
  }
  const [focused, setFocused] = useState(null) // { kind, ref }
  // PR-46c: scroll the Details section into view when focus changes so
  // a card click doesn't leave the user staring at the Library grid
  // with the Details panel below the fold.
  const detailsRef = useRef(null)
  useEffect(() => {
    if (focused && detailsRef.current) {
      detailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [focused])
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

  // ── Derived: Showcase items + conflict flags ───────────
  // PR-45: Showcase is the UNION of (a) draft items already in the
  // room and (b) bag items pending apply. Each item carries a `source`
  // ('draft' | 'bag') so hover-x can dispatch the right action.
  const showcaseItems = useMemo(
    () => buildShowcaseItems({ bag, mode, tray, layouts, catalogEntries, modes: modes || [] }),
    [bag, mode, tray, layouts, catalogEntries, modes]
  )
  const uniqueLayouts = new Set([
    ...(mode?.layout?.ref ? [mode.layout.ref] : []),
    ...(bag.layouts || []),
  ])
  const uniqueSchemes = new Set([
    ...(mode?.scheme?.ref ? [mode.scheme.ref] : []),
    ...(bag.schemes || []),
  ])
  const layoutConflict = uniqueLayouts.size > 1
  const schemeConflict = uniqueSchemes.size > 1

  // Toast when the union flips into a conflict. Stored as booleans so
  // we fire on the false → true edge, not every render that holds the
  // conflict open.
  const prevConflict = useRef({ layouts: false, schemes: false })
  useEffect(() => {
    if (layoutConflict && !prevConflict.current.layouts) {
      onShowToast?.('Only one layout can be used at a time for a room.')
    }
    if (schemeConflict && !prevConflict.current.schemes) {
      onShowToast?.('Only one scheme can be applied at a time for a room.')
    }
    prevConflict.current = { layouts: layoutConflict, schemes: schemeConflict }
  }, [layoutConflict, schemeConflict, onShowToast])

  function toggleSection(key) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // PR-48b: pointer drag on a section's resize handle updates its
  // height. Clamped to per-section min/max. Live updates while
  // dragging.
  function startResize(key, e) {
    e.preventDefault()
    const startY = e.clientY
    const startHeight = sectionHeights[key] ?? e.currentTarget.parentElement?.offsetHeight ?? 200
    const limits = SECTION_LIMITS[key]
    function onMove(ev) {
      const delta = ev.clientY - startY
      const next = Math.max(limits.min, Math.min(limits.max, startHeight + delta))
      setSectionHeights((prev) => ({ ...prev, [key]: next }))
    }
    function onUp() {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }

  // PR-45 / PR-46d: card click = toggle. If the card is checked
  // because it's in the bag → remove from bag. If checked because it's
  // placed in the draft → dispatch the corresponding draft mutation.
  // If checked because it's in the holding tray (post-commit, unplaced)
  // → dismiss from tray. Unchecked → add to bag.
  function handleCardClick(item) {
    const inBag = isInBag(item, bag)
    const inDraft = isInDraft(item, mode)
    const inTray = isInTray(item, tray)
    if (inBag) {
      onToggle(item.kind, item.id, null)
    } else if (inDraft) {
      removeDraftItem(item)
    } else if (inTray) {
      removeDraftItem({ ...item, source: 'tray' })
    } else {
      onToggle(item.kind, item.id, item.kind === 'room' ? item.room : null)
    }
    setFocused({ kind: item.kind, ref: item.id })
    setOpenSections((prev) => ({ ...prev, details: true }))
  }

  // Hover-x on a Showcase card. Branches on the item's source: a bag
  // item toggles out of the bag; a draft item fires the corresponding
  // draft mutation. Active layout / scheme refuse with a toast — a
  // room can't be left without a layout, and removing-the-scheme isn't
  // a clean action either (no clear scheme action today).
  function handleRemoveFromShowcase(item) {
    if (item.source === 'bag') {
      onToggle(item.kind, item.ref, null)
    } else if (item.source === 'draft') {
      removeDraftItem({ kind: item.kind, id: item.ref })
    } else if (item.source === 'tray') {
      removeDraftItem({ kind: item.kind, id: item.ref, source: 'tray' })
    }
    if (focused && focused.kind === item.kind && focused.ref === item.ref) {
      setFocused(null)
    }
  }

  function removeDraftItem(item) {
    // PR-46d: tray-sourced Showcase items dismiss by ref so all
    // matching chips clear in one go.
    if (item.source === 'tray') {
      if (item.kind === 'component') {
        onDismissTrayByRef?.(item.ref || item.id)
      }
      return
    }
    if (item.kind === 'component') {
      onRemovePlacedComponent?.(item.id)
      return
    }
    if (item.kind === 'layout') {
      // PR-46: if the user staged exactly one replacement layout in
      // the bag, treat hover-x on the active layout as "commit the
      // swap." Anything else (no bag layout, or >1) keeps the old
      // toast — too ambiguous to pick automatically.
      if ((bag.layouts || []).length === 1 && onSwapToBagLayout) {
        onSwapToBagLayout()
        return
      }
      onShowToast?.('A room needs a layout. Pick a new layout from the catalog below to swap.')
      return
    }
    if (item.kind === 'scheme') {
      if ((bag.schemes || []).length === 1 && onSwapToBagScheme) {
        onSwapToBagScheme()
        return
      }
      onShowToast?.('Pick a different scheme from the catalog below to change it.')
      return
    }
  }

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
        subtitle={describeShowcaseSummary(bag, mode, tray)}
        open={openSections.showcase}
        onToggle={() => toggleSection('showcase')}
        height={sectionHeights.showcase}
        onResizeStart={(e) => startResize('showcase', e)}
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
        height={sectionHeights.library}
        onResizeStart={(e) => startResize('library', e)}
      >
        <LibraryBody
          activeChip={filterChip}
          onChipChange={setFilterChip}
          search={search}
          onSearchChange={setSearch}
          items={filteredCatalog}
          bag={bag}
          mode={mode}
          tray={tray}
          focused={focused}
          onCardClick={handleCardClick}
        />
      </Section>

      <div ref={detailsRef}>
        <Section
          title="Details"
          subtitle={focusedItem ? focusedItem.displayName : 'Click a card to view details'}
          open={openSections.details}
          onToggle={() => toggleSection('details')}
          height={sectionHeights.details}
          onResizeStart={(e) => startResize('details', e)}
        >
          <DetailsBody
            item={focusedItem}
            bag={bag}
            mode={mode}
            tray={tray}
            onCardClick={handleCardClick}
          />
        </Section>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────
//  Section shell
// ────────────────────────────────────────────────────────
function Section({ title, subtitle, open, onToggle, children, height, onResizeStart }) {
  // PR-48b: when a user-set height is present, the body uses that
  // exact height with internal overflow. `null` height means natural
  // content height (auto). Resize handle only renders when open.
  const bodyStyle = open && height
    ? { height: `${height}px`, overflowY: 'auto' }
    : undefined
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
      {open && (
        <>
          <div className="editor-library-section-body" style={bodyStyle}>
            {children}
          </div>
          {onResizeStart && (
            <div
              className="editor-library-section-resize"
              onPointerDown={onResizeStart}
              role="separator"
              aria-orientation="horizontal"
              aria-label={`Resize ${title} section`}
            />
          )}
        </>
      )}
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
        Nothing in the room yet. Pick items from the Library section below.
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
      <ShowcaseGrid
        items={items}
        layoutConflict={layoutConflict}
        schemeConflict={schemeConflict}
        onRemove={onRemove}
      />
    </>
  )
}

// PR-48c: thin SVG lines connecting Showcase cards that share a
// sourceRoomId. Wrap ref hosts both the grid and the overlay so the
// overlay can measure card positions relative to a common origin.
// ResizeObserver keeps the lines aligned through resizes / reflows.
function ShowcaseGrid({ items, layoutConflict, schemeConflict, onRemove }) {
  const wrapRef = useRef(null)
  const [edges, setEdges] = useState([])

  const groups = useMemo(() => {
    const map = new Map()
    for (const it of items) {
      if (!it.sourceRoomId) continue
      const key = it.sourceRoomId
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(it)
    }
    return [...map.entries()].filter(([, g]) => g.length >= 2)
  }, [items])

  useEffect(() => {
    function measure() {
      const wrap = wrapRef.current
      if (!wrap) return
      const wrapRect = wrap.getBoundingClientRect()
      const next = []
      for (const [roomId, group] of groups) {
        const color = colorForRoomId(roomId)
        const cards = group
          .map((it) => {
            const key = `${it.kind}-${it.ref}-${it.source}`
            const el = wrap.querySelector(`[data-connect="${CSS.escape(key)}"]`)
            if (!el) return null
            const r = el.getBoundingClientRect()
            return {
              x: r.left - wrapRect.left + r.width / 2,
              y: r.top - wrapRect.top + r.height / 2,
            }
          })
          .filter(Boolean)
        for (let i = 0; i < cards.length; i++) {
          for (let j = i + 1; j < cards.length; j++) {
            next.push({ a: cards[i], b: cards[j], color })
          }
        }
      }
      setEdges(next)
    }
    measure()
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(measure)
    ro.observe(wrap)
    // Observe each card too so showing/hiding the resize handle on the
    // ancestor section doesn't desync the line endpoints.
    for (const el of wrap.querySelectorAll('[data-connect]')) {
      ro.observe(el)
    }
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [groups, items])

  return (
    <div ref={wrapRef} className="editor-library-showcase-wrap">
      <div className="editor-library-showcase-grid">
        {items.map((item) => (
          <ShowcaseCard
            key={`${item.kind}-${item.ref}-${item.source}`}
            item={item}
            warning={
              (item.kind === 'layout' && layoutConflict) ||
              (item.kind === 'scheme' && schemeConflict)
            }
            onRemove={() => onRemove(item)}
          />
        ))}
      </div>
      {edges.length > 0 && (
        <svg
          className="editor-library-showcase-overlay"
          aria-hidden="true"
          preserveAspectRatio="none"
        >
          {edges.map((e, idx) => (
            <line
              key={idx}
              x1={e.a.x} y1={e.a.y}
              x2={e.b.x} y2={e.b.y}
              stroke={e.color}
              strokeWidth="1"
              strokeOpacity="0.35"
              strokeLinecap="round"
            />
          ))}
        </svg>
      )}
    </div>
  )
}

function ShowcaseCard({ item, warning, onRemove }) {
  const glow = item.sourceRoomId ? colorForRoomId(item.sourceRoomId) : null
  const isDraftItem = item.source === 'draft'
  const isTrayItem = item.source === 'tray'
  let tag = null
  if (isDraftItem) tag = 'In room'
  else if (isTrayItem) tag = 'In tray'
  // PR-48c: data-connect lets the ConnectorOverlay find this card to
  // measure its center for the bundle lines.
  const connectKey = `${item.kind}-${item.ref}-${item.source}`
  return (
    <div
      className={`editor-library-showcase-card${warning ? ' is-warning' : ''}${glow ? ' has-glow' : ''}${isDraftItem ? ' is-placed' : ''}${isTrayItem ? ' is-tray' : ''}`}
      style={glow ? { '--glow': glow } : undefined}
      data-connect={connectKey}
    >
      <div className="editor-library-showcase-card-kind">
        {item.kindLabel}
        {tag && <span className="editor-library-showcase-card-placed-tag">{tag}</span>}
      </div>
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
  items, bag, mode, tray, focused, onCardClick,
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
              checked={isItemCheckedAny(item, bag, mode, tray)}
              focused={focused?.kind === item.kind && focused?.ref === item.id}
              onClick={() => onCardClick(item)}
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
function DetailsBody({ item, bag, mode, tray, onCardClick }) {
  if (!item) {
    return (
      <div className="text-[11.5px] text-[var(--p-text-muted)] py-6 text-center">
        Click a card in the Library section to see more.
      </div>
    )
  }
  const checked = isItemCheckedAny(item, bag, mode, tray)
  const inDraft = isInDraft(item, mode)
  // The Details CTA mirrors the catalog click behavior. Label is the
  // exact action that will fire so users know what they're clicking.
  let ctaLabel = 'Add to selection'
  if (checked) {
    ctaLabel = inDraft ? 'Remove from room' : 'Remove from selection'
  }
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
          onClick={() => onCardClick(item)}
          className={`editor-library-details-cta${checked ? ' is-on' : ''}`}
        >
          {ctaLabel}
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
function buildShowcaseItems({ bag, mode, tray, layouts, catalogEntries, modes }) {
  const out = []
  const seen = new Set()
  const key = (kind, ref) => `${kind}:${ref}`

  // ── Draft side (PR-45): what's already in the room.
  // PR-46d: each draft item may carry a sourceRoomId stamped at the
  // time it was added via Library — read it here to drive the glow.
  if (mode?.layout?.ref) {
    const ref = mode.layout.ref
    const layout = layouts.find((l) => l.id === ref)
    out.push({
      kind: 'layout',
      ref,
      source: 'draft',
      kindLabel: 'Layout',
      displayName: layout?.displayName || ref,
      sourceRoomId: mode.layout.sourceRoomId || null,
    })
    seen.add(key('layout', ref))
  }
  if (mode?.scheme?.ref) {
    const ref = mode.scheme.ref
    const scheme = SCHEMES.find((s) => s.id === ref || `${s.id}@1.0` === ref)
    out.push({
      kind: 'scheme',
      ref,
      source: 'draft',
      kindLabel: 'Scheme',
      displayName: scheme?.displayName || ref,
      sourceRoomId: mode.scheme.sourceRoomId || null,
    })
    seen.add(key('scheme', ref))
  }
  const placedRefs = [...new Set((mode?.components || []).map((c) => c.ref))]
  for (const ref of placedRefs) {
    const entry = findCatalogEntry(catalogEntries, ref)
    // Use the first placed instance's sourceRoomId; if no instances
    // have one (the room predates PR-46d, or the component was placed
    // directly via drag), the glow simply doesn't show.
    const placedInstance = (mode?.components || []).find(
      (c) => c.ref === ref && c.sourceRoomId
    )
    out.push({
      kind: 'component',
      ref,
      source: 'draft',
      kindLabel: 'Component',
      displayName: entry?.displayName || ref,
      sourceRoomId: placedInstance?.sourceRoomId || null,
    })
    seen.add(key('component', ref))
  }

  // ── Tray side (PR-46d): unplaced components added via Library or
  //    orphaned by a layout swap. They're conceptually "in the room
  //    workflow," just not placed in a slot yet. Skip refs already
  //    shown from the draft side.
  const trayRefs = [...new Set((tray || []).map((t) => t.ref).filter(Boolean))]
  for (const ref of trayRefs) {
    if (seen.has(key('component', ref))) continue
    const entry = findCatalogEntry(catalogEntries, ref)
    const chip = (tray || []).find((t) => t.ref === ref && t.sourceRoomId)
    out.push({
      kind: 'component',
      ref,
      source: 'tray',
      kindLabel: 'Component',
      displayName: entry?.displayName || ref,
      sourceRoomId: chip?.sourceRoomId || null,
    })
    seen.add(key('component', ref))
  }

  // ── Bag side: pending additions. Skip any item that's already in
  //    the draft (the union shows it once, sourced from draft).
  for (const ref of bag.layouts || []) {
    if (seen.has(key('layout', ref))) continue
    const layout = layouts.find((l) => l.id === ref)
    out.push({
      kind: 'layout',
      ref,
      source: 'bag',
      kindLabel: 'Layout',
      displayName: layout?.displayName || ref,
      sourceRoomId: firstSource(bag, 'layouts', ref),
    })
  }
  for (const ref of bag.components || []) {
    if (seen.has(key('component', ref))) continue
    const entry = findCatalogEntry(catalogEntries, ref)
    out.push({
      kind: 'component',
      ref,
      source: 'bag',
      kindLabel: 'Component',
      displayName: entry?.displayName || ref,
      sourceRoomId: firstSource(bag, 'components', ref),
    })
  }
  for (const ref of bag.schemes || []) {
    if (seen.has(key('scheme', ref))) continue
    const scheme = SCHEMES.find((s) => s.id === ref || `${s.id}@1.0` === ref)
    out.push({
      kind: 'scheme',
      ref,
      source: 'bag',
      kindLabel: 'Scheme',
      displayName: scheme?.displayName || ref,
      sourceRoomId: firstSource(bag, 'schemes', ref),
    })
  }
  // Rooms are bag-only — no draft representation (the draft holds the
  // resulting layout / scheme / components, not the source room).
  for (const id of bag.rooms || []) {
    const room = modes.find((m) => m.id === id)
    out.push({
      kind: 'room',
      ref: id,
      source: 'bag',
      kindLabel: 'Room',
      displayName: room?.meta?.name?.trim() || (room?.scope === 'homepage' ? 'Homepage' : 'Untitled'),
      sourceRoomId: id,
    })
  }

  return out
}

// PR-45: source predicates used by the click + hover-x handlers and
// by isItemCheckedAny. Catalog items use `.id`; reducer keys are
// pluralised by item.kind.
function isInBag(item, bag) {
  const ref = item.id ?? item.ref
  const list = bag?.[`${item.kind}s`] || []
  return list.includes(ref)
}
function isInDraft(item, mode) {
  if (!mode) return false
  const ref = item.id ?? item.ref
  if (item.kind === 'layout')    return mode.layout?.ref === ref
  if (item.kind === 'scheme')    return mode.scheme?.ref === ref
  if (item.kind === 'component') return (mode.components || []).some((c) => c.ref === ref)
  return false // rooms have no draft side
}
// PR-46d: tray-side check. Only components live in the tray.
function isInTray(item, tray) {
  if (item.kind !== 'component') return false
  const ref = item.id ?? item.ref
  return (tray || []).some((t) => t.ref === ref)
}
function isItemCheckedAny(item, bag, mode, tray) {
  return isInBag(item, bag) || isInDraft(item, mode) || isInTray(item, tray)
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

function describeShowcaseSummary(bag, mode, tray) {
  // PR-45 / PR-46d: union of draft + tray + bag. Dedups refs across
  // all sides so a layout that's both in the draft AND queued in the
  // bag counts once.
  const layoutSet = new Set([
    ...(mode?.layout?.ref ? [mode.layout.ref] : []),
    ...(bag.layouts || []),
  ])
  const schemeSet = new Set([
    ...(mode?.scheme?.ref ? [mode.scheme.ref] : []),
    ...(bag.schemes || []),
  ])
  const compSet = new Set([
    ...(mode?.components || []).map((c) => c.ref),
    ...(tray || []).map((t) => t.ref).filter(Boolean),
    ...(bag.components || []),
  ])
  const roomCount = bag.rooms?.length || 0
  const total = layoutSet.size + schemeSet.size + compSet.size + roomCount
  if (total === 0) return 'Nothing in the room yet'
  const parts = []
  if (roomCount)        parts.push(`${roomCount} room${roomCount === 1 ? '' : 's'}`)
  if (layoutSet.size)   parts.push(`${layoutSet.size} layout${layoutSet.size === 1 ? '' : 's'}`)
  if (compSet.size)     parts.push(`${compSet.size} component${compSet.size === 1 ? '' : 's'}`)
  if (schemeSet.size)   parts.push(`${schemeSet.size} scheme${schemeSet.size === 1 ? '' : 's'}`)
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
