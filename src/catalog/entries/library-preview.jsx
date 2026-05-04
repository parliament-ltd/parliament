// Self-contained render wrapper for library@1.0 (PR-14 rewrite to spec).
//
// Filter-chip browsing across Rooms / Layouts / Components / Schemes /
// Resources, with type-specific preview thumbnails on every card and a
// right-side slide-in overlay (LibraryOverlay) for details. Spec source:
// refactor/parliament_homepage_v2 (2).html, the section labelled
// "LIBRARY".
//
// Data flow (PR-14):
//   - libraryRooms / libraryLayouts / libraryComponents / librarySchemes
//     records load from IndexedDB. v5 migration backfilled author and
//     installedCount on each, and seedLibraryComponents() seeded the
//     components table from the in-memory catalog manifest registry.
//   - Resources stay as a static RESOURCES const here; they're a Phase 1
//     placeholder per refactor/parliament_v2_design_decisions.md §6 — the
//     real resource content production is parked.
//
// All visual classes (`.library-filters`, `.library-grid`, `.lib-card`,
// `.lib-preview`, `.lib-card-type` …) live in src/index.css under the
// "Homepage v2 library" block. Same approach as chats: spec CSS ports
// verbatim from the HTML rather than hand-translating to Tailwind utilities.

import { useEffect, useMemo, useState } from 'react'
import { Search, BookOpen, FileText, Code2, BarChart3, Film } from 'lucide-react'
import { initDB } from '../../lib/db'
import LibraryOverlay from '../../components/LibraryOverlay'

const FILTERS = [
  { id: 'all',       label: 'All',        kinds: ['room', 'layout', 'component', 'scheme', 'resource'] },
  { id: 'room',      label: 'Rooms',      kinds: ['room'] },
  { id: 'layout',    label: 'Layouts',    kinds: ['layout'] },
  { id: 'component', label: 'Components', kinds: ['component'] },
  { id: 'scheme',    label: 'Schemes',    kinds: ['scheme'] },
  { id: 'resource',  label: 'Resources',  kinds: ['resource'] },
]

// Resources are static V2 phase 1 placeholders. Field shape matches the
// canonical metadata in refactor/parliament_v2_design_decisions.md §6.5
// extended with `format` and `target` (resource-only, per the doc).
const RESOURCES = [
  {
    id: 'guide-first-room',
    kind: 'resource',
    displayName: 'Your first room: a walkthrough',
    description: 'Step-by-step walkthrough of building a first room with the wizard. Roughly 6 minutes end to end.',
    format: 'Guide',
    target: ['rooms'],
    covers: ['The three paths', 'Choosing density', 'Picking features', 'Naming and scheme', 'Ignition', 'Editing a built room'],
    author: { name: 'Anthropic', verified: true },
    updatedAt: '2026-04-10',
    status: 'coming-soon',
    iconName: 'book-open',
  },
  {
    id: 'guide-homepage',
    kind: 'resource',
    displayName: 'Your Parliament homepage',
    description: 'How the homepage works as a configurable room. Reordering, adding sections, essentials.',
    format: 'Guide',
    target: ['rooms', 'sections'],
    covers: ['Stacked sections', 'Reordering', 'Adding sections', 'Essentials and removable items'],
    author: { name: 'Anthropic', verified: true },
    updatedAt: '2026-04-12',
    status: 'coming-soon',
    iconName: 'book-open',
  },
  {
    id: 'ref-component-catalog',
    kind: 'resource',
    displayName: 'Component catalog and hostAPI',
    description: 'Canonical list of every built-in component with slot fits, config schema, and capabilities. Plus the hostAPI surface contributors will use when building their own.',
    format: 'Reference',
    target: ['components', 'layouts'],
    covers: ['Component catalog', 'hostAPI reference', 'Mode file format', 'Capability gating', 'Safety guidelines'],
    author: { name: 'Anthropic', verified: true },
    updatedAt: '2026-04-15',
    status: 'coming-soon',
    iconName: 'file-text',
  },
  {
    id: 'recipe-plan-room',
    kind: 'resource',
    displayName: '"Help me plan a room" prompt',
    description: 'A prompt that gets Claude to ask useful questions before proposing a room structure.',
    format: 'Prompt recipe',
    target: ['rooms'],
    covers: ['The prompt', 'When to use it', 'Customizing for your work'],
    author: { name: '@kindred' },
    updatedAt: '2026-04-08',
    status: 'coming-soon',
    iconName: 'code-2',
  },
  {
    id: 'project-newsroom',
    kind: 'resource',
    displayName: 'The Newsroom',
    description: 'A room built for drafting newsletters. Document-centric, Museum Cream, Timeline + Highlights + Branches.',
    format: 'Example project',
    target: ['rooms'],
    covers: [],
    author: { name: '@dispatch' },
    updatedAt: '2026-04-04',
    status: 'coming-soon',
    iconName: 'bar-chart-3',
  },
  {
    id: 'video-90sec',
    kind: 'resource',
    displayName: 'Parliament in 90 seconds',
    description: 'Marketing-adjacent intro video. Homepage tour, a room in action, the build flow at a high level.',
    format: 'Video link',
    target: ['general'],
    covers: [],
    author: { name: 'Anthropic', verified: true },
    updatedAt: '2026-03-28',
    status: 'coming-soon',
    iconName: 'film',
  },
]

const ICON_MAP = {
  'book-open':   BookOpen,
  'file-text':   FileText,
  'code-2':      Code2,
  'bar-chart-3': BarChart3,
  'film':        Film,
}

// ─── Component ───────────────────────────────────────────────

export default function LibraryPreview({ config = {} } = {}) {
  const initialFilter = config.defaultFilter || 'all'
  const [filter, setFilter] = useState(initialFilter)
  const [query, setQuery]   = useState('')
  const [items, setItems]   = useState([])
  const [overlayItem, setOverlayItem] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const db = await initDB()
        const [rooms, layouts, components, schemes] = await Promise.all([
          db.getAll('libraryRooms'),
          db.getAll('libraryLayouts'),
          db.getAll('libraryComponents'),
          db.getAll('librarySchemes'),
        ])
        if (cancelled) return
        const all = [
          ...rooms.map(r =>      ({ ...r, kind: 'room' })),
          ...layouts.map(l =>    ({ ...l, kind: 'layout' })),
          ...components.map(c => ({ ...c, kind: 'component' })),
          ...schemes.map(s =>    ({ ...s, kind: 'scheme' })),
          ...RESOURCES,
        ]
        setItems(all)
      } catch {
        if (!cancelled) setItems([])
      }
    })()
    return () => { cancelled = true }
  }, [])

  const visible = useMemo(() => {
    const f = FILTERS.find(x => x.id === filter) || FILTERS[0]
    const q = query.trim().toLowerCase()
    return items.filter(it => {
      if (!f.kinds.includes(it.kind)) return false
      if (!q) return true
      const hay = [it.displayName, it.name, it.description, it.format, ...(it.target || [])]
        .filter(Boolean).join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [items, filter, query])

  return (
    <div>
      <div className="library-filters">
        {FILTERS.map(f => (
          <button
            key={f.id}
            type="button"
            className={`filter-chip${filter === f.id ? ' active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
        <div className="library-search">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search library"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="text-sm text-[var(--p-text-secondary)] py-6 text-center">
          {query ? 'No matches.' : 'No items in this category yet.'}
        </div>
      ) : (
        <div className="library-grid">
          {visible.map(it => (
            <LibraryCard key={`${it.kind}:${it.id}`} item={it} onOpen={() => setOverlayItem(it)} />
          ))}
        </div>
      )}

      <LibraryOverlay item={overlayItem} onClose={() => setOverlayItem(null)} />
    </div>
  )
}

// ─── Card + per-type preview ─────────────────────────────────

function LibraryCard({ item, onOpen }) {
  const author = formatAuthor(item.author)
  const installs = typeof item.installedCount === 'number' ? `${formatInstalls(item.installedCount)} installs` : null
  const cta = ctaLabel(item.kind)

  return (
    <button type="button" className="lib-card" onClick={onOpen}>
      <Preview item={item} />
      <div className="lib-card-head">
        <span className={`lib-card-type ${item.kind}`}>{item.format || typeLabel(item.kind)}</span>
        {item.status === 'coming-soon' && (
          <span className="lib-card-status">Coming soon</span>
        )}
      </div>
      <div className="lib-card-name">{item.displayName || item.name || item.title}</div>
      {author && <div className="lib-card-author">{author}</div>}
      <div className="lib-card-action">
        <span>{installs || '—'}</span>
        <span className="lib-card-cta">{cta} →</span>
      </div>
    </button>
  )
}

function Preview({ item }) {
  switch (item.kind) {
    case 'room':      return <RoomPreview item={item} />
    case 'layout':    return <LayoutPreview item={item} />
    case 'component': return <ComponentPreview item={item} />
    case 'scheme':    return <SchemePreview item={item} />
    case 'resource':  return <ResourcePreview item={item} />
    default:          return <div className="lib-preview" />
  }
}

// Simple wireframe: 3 panels, with a gold input-dock bar on the middle.
function RoomPreview() {
  return (
    <div className="lib-preview">
      <div className="wr" style={{ width: '20%' }}><span className="wd" /></div>
      <div className="wr" style={{ flex: 1, position: 'relative' }}><div className="wb" /></div>
      <div className="wr dashed" style={{ width: '22%' }} />
    </div>
  )
}

// Two equal panels + dashed extra. Closer to "structural" vs the
// inhabited Room preview.
function LayoutPreview() {
  return (
    <div className="lib-preview">
      <div className="wr" style={{ flex: 1 }} />
      <div className="wr" style={{ flex: 1 }} />
      <div className="wr dashed" style={{ width: '25%' }} />
    </div>
  )
}

// Single panel with a horizontal track + a row of dots.
function ComponentPreview() {
  return (
    <div className="lib-preview">
      <div className="wr" style={{ flex: 1, padding: '3px' }}>
        <div style={{ height: 2, background: 'var(--p-gold-muted)', margin: '6px 0', opacity: 0.5 }} />
        <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
          <span className="wd" /><span className="wd" /><span className="wd" /><span className="wd" />
        </div>
      </div>
    </div>
  )
}

// Pull a representative accent color from the seeded scheme variants.
// Falls back to gold-light when no variant snapshot is present (V3
// community-submitted schemes may ship without one).
function SchemePreview({ item }) {
  const variant = item.variants?.[item.defaultVariant || 'light'] || {}
  const bg = variant['bg-base'] || variant['bg-surface'] || '#F8F3E6'
  const accent = variant['gold-light'] || variant['gold'] || '#B8A070'
  const muted = variant['gold-muted'] || variant['gold'] || '#A8623A'
  return (
    <div className="lib-preview scheme-swatch" style={{ background: bg }}>
      <div className="sd" style={{ background: muted }} />
      <div className="sl" style={{ background: accent }} />
    </div>
  )
}

function ResourcePreview({ item }) {
  const Icon = ICON_MAP[item.iconName] || FileText
  return (
    <div className="lib-preview resource">
      <Icon className="w-7 h-7" />
    </div>
  )
}

// ─── Formatters ──────────────────────────────────────────────

function formatAuthor(a) {
  if (!a) return null
  if (typeof a === 'string') return `by ${a}`
  if (a.handle) return `by @${a.handle}`
  if (a.name) return `by ${a.name}`
  return null
}

function formatInstalls(n) {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`
  return `${(n / 1_000_000).toFixed(1)}m`
}

function ctaLabel(kind) {
  switch (kind) {
    case 'room':      return 'Add'
    case 'layout':    return 'Add'
    case 'component': return 'Add'
    case 'scheme':    return 'Add'
    case 'resource':  return 'Open'
    default:          return 'Add'
  }
}

function typeLabel(kind) {
  switch (kind) {
    case 'room':      return 'Room'
    case 'layout':    return 'Layout'
    case 'component': return 'Component'
    case 'scheme':    return 'Scheme'
    case 'resource':  return 'Resource'
    default:          return 'Item'
  }
}
