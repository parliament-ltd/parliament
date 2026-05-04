// Library item slide-in overlay (PR-14).
//
// Right-side 420px panel matching .ov-backdrop / .ov-panel from
// refactor/parliament_homepage_v2 (2).html. Replaces the centered modal
// the v1 library-preview shipped at PR-7. Esc + backdrop click both
// close.
//
// Per-type "extra" content (Includes / Slots / Fits in slots / Covers /
// Chapters) is derived live from the existing catalog manifests and
// seeded library records — no hardcoded LIB_ITEMS const. The build-time
// info that ships with each entry is enough; this overlay just formats
// it into the spec layout.

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { getEntry as getComponentEntry } from '../catalog'
import { getLayoutEntry } from '../catalog/layouts'

const TYPE_LABEL = {
  room:      'Room',
  layout:    'Layout',
  component: 'Component',
  scheme:    'Scheme',
  resource:  'Resource',
}

function authorLine(author) {
  if (!author) return null
  if (typeof author === 'string') return author
  if (author.handle) return `@${author.handle}`
  if (author.name) return author.name
  return null
}

function fmtDate(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return null }
}

// ─── Per-type extra-content blocks ───────────────────────────

// Strip semver-range prefixes ('^', '~') from a `name@version` ref so it
// matches the registry keys used by the catalog. Mirrors RoomShell's
// internal normalizer; duplicated here rather than imported because
// RoomShell doesn't export it (it's an implementation detail).
function normalizeRef(ref) {
  if (typeof ref !== 'string' || !ref.includes('@')) return ref
  const [name, versionSpec = ''] = ref.split('@', 2)
  const trimmed = versionSpec.replace(/^[\^~]/, '').replace(/^(\d+\.\d+)\.0$/, '$1')
  return `${name}@${trimmed}`
}

function refName(ref) {
  return String(ref || '').split('@')[0]
}

function RoomExtras({ item }) {
  const componentNames = (item.components || [])
    .map(c => getComponentEntry(normalizeRef(c.ref))?.displayName || refName(c.ref))
    .filter(Boolean)
  const unique = Array.from(new Set(componentNames))
  const layoutName = getLayoutEntry(normalizeRef(item.layout?.ref))?.displayName || refName(item.layout?.ref)
  const schemeName = refName(item.scheme?.ref)
  const includes = [layoutName, ...unique, schemeName].filter(Boolean).join(' · ')
  if (!includes) return null
  return (
    <div>
      <div className="ov-section-label">Includes</div>
      <div className="ov-desc">{includes}</div>
    </div>
  )
}

function LayoutExtras({ item }) {
  // Real slot inventory lives on the runtime layout entry, not the
  // seeded record (which has empty slots[] in PR-1's seed).
  const entry = getLayoutEntry(normalizeRef(item.id))
  const slots = entry?.slots?.map(s => s.id) || []
  if (slots.length === 0) return null
  return (
    <div>
      <div className="ov-section-label">Slots</div>
      <div className="ov-desc">{slots.join(' · ')}</div>
    </div>
  )
}

function ComponentExtras({ item }) {
  const targets = item.slotTargets || []
  if (targets.length === 0) return null
  const labels = targets.map(t => t.slot + (t.primary ? ' (primary)' : ''))
  return (
    <div>
      <div className="ov-section-label">Fits in slots</div>
      <div className="ov-desc">{labels.join(' · ')}</div>
    </div>
  )
}

function ResourceExtras({ item }) {
  if (!item.covers || item.covers.length === 0) return null
  return (
    <div>
      <div className="ov-section-label">Covers</div>
      <div className="ov-desc">{item.covers.join(' · ')}</div>
    </div>
  )
}

function ExtrasFor({ item }) {
  switch (item.kind) {
    case 'room':      return <RoomExtras item={item} />
    case 'layout':    return <LayoutExtras item={item} />
    case 'component': return <ComponentExtras item={item} />
    case 'resource':  return <ResourceExtras item={item} />
    default:          return null
  }
}

function ctaLabelFor(kind) {
  switch (kind) {
    case 'room':      return 'Add as room'
    case 'layout':    return 'Add to layouts'
    case 'component': return 'Add to components'
    case 'scheme':    return 'Add to schemes'
    case 'resource':  return 'Open'
    default:          return 'Add'
  }
}

// ─── Overlay shell ───────────────────────────────────────────

export default function LibraryOverlay({ item, onClose }) {
  // Esc closes, regardless of focus.
  useEffect(() => {
    if (!item) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [item, onClose])

  if (!item) return null

  const author = authorLine(item.author)
  const updated = fmtDate(item.updatedAt || item.createdAt)
  const installs = typeof item.installedCount === 'number' ? item.installedCount : null
  const cta = ctaLabelFor(item.kind)
  const status = item.status === 'coming-soon' ? 'Coming soon' : null

  return (
    <div className="ov-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ov-panel" role="dialog" aria-modal="true" aria-labelledby="ov-title">
        <div className="ov-head">
          <div>
            <div id="ov-title" className="ov-name">{item.displayName || item.name || item.title}</div>
            <span className={`ov-type-tag ov-type-${item.kind}`}>{TYPE_LABEL[item.kind] || 'Item'}</span>
          </div>
          <button className="ov-close" onClick={onClose} aria-label="Close">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {item.description && <div className="ov-desc">{item.description}</div>}

        <div>
          <div className="ov-section-label">Details</div>
          <div className="ov-meta-row">
            {author   && <div><strong>Author:</strong> {author}</div>}
            {updated  && <div><strong>Updated:</strong> {updated}</div>}
            {installs !== null && <div><strong>Installs:</strong> {installs}</div>}
            {item.version && <div><strong>Version:</strong> {item.version}</div>}
            {status   && <div><strong>Status:</strong> {status}</div>}
          </div>
        </div>

        <ExtrasFor item={item} />

        <div className="ov-actions">
          <button type="button" className="tb-btn" onClick={onClose}>Close</button>
          <button
            type="button"
            className="tb-btn primary"
            onClick={onClose}
            disabled={item.status === 'coming-soon'}
            title={item.status === 'coming-soon' ? 'Available in a future Parliament release' : cta}
          >
            {cta}
          </button>
        </div>
      </div>
    </div>
  )
}
