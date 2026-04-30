// Self-contained render wrapper for library@1.0.
//
// Five tabs — Rooms, Layouts, Components, Schemes, Resources — sourced
// from IndexedDB library tables (PR-1 seeded those). The "Sections"
// category from the original audit is hidden in Phase 1 per NQ-8.
//
// Resources tab shows 6 placeholder coming-soon cards drawn from
// refactor/parliament_v2_resources_spec.md §4 (parliament_v2_resources_spec.md
// is in the reference docs folder, not committed). Click any card →
// read-only preview overlay describing what the resource will be.
//
// Lives in its own file so library.jsx's manifest entry stays a clean
// default-export (react-refresh's "only-export-components" rule).

import { useEffect, useMemo, useState } from 'react'
import { initDB } from '../../lib/db'

const TABS = [
  { id: 'rooms',      label: 'Rooms',      store: 'libraryRooms' },
  { id: 'layouts',    label: 'Layouts',    store: 'libraryLayouts' },
  { id: 'components', label: 'Components', store: 'libraryComponents' },
  { id: 'schemes',    label: 'Schemes',    store: 'librarySchemes' },
  { id: 'resources',  label: 'Resources',  store: null },
]

// 6 placeholder Resource cards — one each across the 5 §4 categories
// plus a second guide. Each card is "coming soon" — clicking opens a
// read-only preview overlay.
const RESOURCES = [
  {
    id: 'guide-first-room',
    title: 'Your first room: a walkthrough',
    format: 'Guide',
    targets: 'rooms',
    description: 'Step-by-step walkthrough of building a first room with the wizard. ~6 minutes.',
  },
  {
    id: 'guide-homepage',
    title: 'Your Parliament homepage',
    format: 'Guide',
    targets: 'rooms, sections',
    description: 'How the homepage works as a configurable room. Reordering, adding sections, essentials. ~5 minutes.',
  },
  {
    id: 'ref-component-catalog',
    title: 'Component catalog',
    format: 'Reference',
    targets: 'components, layouts',
    description: 'Canonical list of every built-in component with slot fits, config schema, and capabilities. ~25 page PDF.',
  },
  {
    id: 'recipe-plan-room',
    title: 'Help me plan a room',
    format: 'Prompt recipe',
    targets: 'rooms',
    description: 'A prompt that gets Claude to ask useful questions before proposing a room structure.',
  },
  {
    id: 'project-newsroom',
    title: 'The Newsroom',
    format: 'Example project',
    targets: 'rooms',
    description: 'A room built for drafting newsletters. Document-centric, Museum Cream, Timeline + Highlights + Branches.',
  },
  {
    id: 'video-90sec',
    title: 'Parliament in 90 seconds',
    format: 'Video link',
    targets: 'general',
    description: 'Marketing-adjacent intro video. Homepage tour, a room in action, the build flow at a high level.',
  },
]

export default function LibraryPreview({ config = {} } = {}) {
  const initialTab = config.defaultTab || 'rooms'
  const [tab, setTab] = useState(initialTab)
  const [items, setItems] = useState([])
  const [resourcePreview, setResourcePreview] = useState(null)

  useEffect(() => {
    if (tab === 'resources') return  // resources are static — no fetch
    let cancelled = false
    ;(async () => {
      try {
        const db = await initDB()
        const storeName = TABS.find(t => t.id === tab)?.store
        if (!storeName) return
        const rows = await db.getAll(storeName)
        if (!cancelled) setItems(rows || [])
      } catch {
        if (!cancelled) setItems([])
      }
    })()
    return () => { cancelled = true }
  }, [tab])

  // Render `RESOURCES` directly when the resources tab is active —
  // no need to round-trip through state since it's a static constant.
  const renderItems = tab === 'resources' ? RESOURCES : items
  const visibleTabs = useMemo(() => TABS, [])

  return (
    <div>
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-4 border-b border-[var(--p-border-subtle)]">
        {visibleTabs.map(t => {
          const active = t.id === tab
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
                active
                  ? 'border-[var(--p-accent-gold,#B8A070)] text-[var(--p-text-primary)]'
                  : 'border-transparent text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)]'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab body */}
      {tab === 'resources' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {RESOURCES.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => setResourcePreview(r)}
              className="text-left rounded-lg border border-[var(--p-border)] bg-white p-3 hover:border-[var(--p-accent-gold,#B8A070)] transition-colors"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--p-text-muted)]">{r.format}</span>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[var(--p-code-bg,#F7F6F3)] text-[var(--p-text-secondary)]">
                  Coming soon
                </span>
              </div>
              <div className="text-sm font-medium text-[var(--p-text-primary)] mt-1.5">
                {r.title}
              </div>
              <p className="text-xs text-[var(--p-text-secondary)] mt-1 line-clamp-3">
                {r.description}
              </p>
            </button>
          ))}
        </div>
      ) : renderItems.length === 0 ? (
        <div className="text-sm text-[var(--p-text-secondary)] py-6 text-center">
          No {tab} yet. The {tab} catalog seeds populate as Phase 1 PRs land.
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {renderItems.map(it => (
            <li
              key={it.id || `${it.name}@${it.version}`}
              className="rounded-lg border border-[var(--p-border)] bg-white p-3"
            >
              <div className="flex items-baseline gap-2">
                {it.status && (
                  <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                    it.status === 'available'
                      ? 'bg-[rgba(15,123,108,0.08)] text-[var(--p-success,#0F7B6C)]'
                      : 'bg-[var(--p-code-bg,#F7F6F3)] text-[var(--p-text-secondary)]'
                  }`}>
                    {it.status}
                  </span>
                )}
              </div>
              <div className="text-sm font-medium text-[var(--p-text-primary)] mt-1.5">
                {it.displayName || it.name || it.id}
              </div>
              {it.description && (
                <p className="text-xs text-[var(--p-text-secondary)] mt-1 line-clamp-2">
                  {it.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Resource preview overlay */}
      {resourcePreview && (
        <ResourcePreviewOverlay
          resource={resourcePreview}
          onClose={() => setResourcePreview(null)}
        />
      )}
    </div>
  )
}

function ResourcePreviewOverlay({ resource, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.2)' }}
      onClick={onClose}
    >
      <div
        className="bg-white border border-[var(--p-border)] rounded-xl shadow-2xl shadow-black/10 max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-wider text-[var(--p-text-muted)]">
            {resource.format}
          </span>
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[var(--p-code-bg,#F7F6F3)] text-[var(--p-text-secondary)]">
            Coming soon
          </span>
        </div>
        <h3 className="text-lg font-medium text-[var(--p-text-primary)]">
          {resource.title}
        </h3>
        <p className="text-sm text-[var(--p-text-secondary)] mt-1">
          Targets: <code className="text-xs">{resource.targets}</code>
        </p>
        <p className="text-sm text-[var(--p-text-primary)] mt-3 leading-relaxed">
          {resource.description}
        </p>
        <p className="text-xs text-[var(--p-text-muted)] mt-4">
          This is a Phase 1 placeholder. Resource content production happens after Phase 1 cleanup (PR-12).
        </p>
        <div className="flex justify-end mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--p-border)] bg-white text-[var(--p-text-primary)] hover:border-[var(--p-accent-gold,#B8A070)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
