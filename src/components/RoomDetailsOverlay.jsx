// RoomDetailsOverlay — slide-in panel for a single user room (PR-19g).
//
// Triggered when the user clicks a room in the homepage blueprint.
// Replaces the previous direct-navigation behavior with a "details
// first, enter second" flow that mirrors how clicking a library card
// opens its overlay. Re-uses the `.ov-*` CSS from LibraryOverlay, but
// adds the `.ov-sheet-mobile` modifier on the backdrop so phone-width
// viewports render as a slide-up bottom sheet instead of a right-side
// panel.
//
// Actions (per user-direction in PR-19g):
//   - Copy Room   → createCopyOfMode + saveMode → /edit/:newId.
//   - Delete Room → window.confirm + deleteMode, emits a refetch event.
//   - Enter Room  → most-recent conversation in the room, or create one.
//
// The blueprint renderer owns selection state (selectedRoomId); this
// overlay is presentational beyond the action callbacks.

import { useEffect, useMemo } from 'react'
import { X, Copy, Trash2, ArrowRight } from 'lucide-react'
import LayoutWireframe from './build/wizard/LayoutWireframe'
import { getEntry as getComponentEntry } from '../catalog'
import { modelLabel } from '../lib/modelLabels'

const LAYOUT_LABELS = {
  'three-panel':              'Three-panel',
  'canvas-centric':           'Canvas-centric',
  'document-centric':         'Document-centric',
  'single-column-with-sheet': 'Single column',
}

const SCHEME_LABELS = {
  parliament:    'Parliament Default',
  'cool-bright': 'Cool Bright',
  'deep-calm':   'Deep Calm',
  'soft-violet': 'Soft Violet',
  'fresh-teal':  'Fresh Teal',
  'amber-glow':  'Amber Glow',
}

function normalizeRef(ref) {
  if (typeof ref !== 'string' || !ref.includes('@')) return ref
  const [name, versionSpec = ''] = ref.split('@', 2)
  const trimmed = versionSpec.replace(/^[\^~]/, '').replace(/^(\d+\.\d+)\.0$/, '$1')
  return `${name}@${trimmed}`
}
function refName(ref) {
  return String(ref || '').split('@')[0]
}

function fmtDate(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return null }
}

export default function RoomDetailsOverlay({
  room,           // full mode record (scope='room')
  lastConv,       // most-recent conversation in this room, or null
  onClose,
  onEnter,
  onCopy,
  onDelete,
}) {
  // Esc closes regardless of focus.
  useEffect(() => {
    if (!room) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [room, onClose])

  // Build the Includes list — each component gets its catalog displayName
  // and short description so the user sees what actually lives in the
  // room, not just refs.
  const includes = useMemo(() => {
    if (!room) return []
    const out = []
    const layoutRef = room.layout?.ref
    if (layoutRef) {
      out.push({
        kind: 'layout',
        name: LAYOUT_LABELS[refName(layoutRef)] || refName(layoutRef) || 'Layout',
        desc: 'Spatial arrangement — where rails, canvas, and chat sit.',
      })
    }
    const schemeName = SCHEME_LABELS[refName(room.scheme?.ref)]
    if (schemeName) {
      out.push({
        kind: 'scheme',
        name: schemeName,
        desc: 'Color scheme and typography.',
      })
    }
    const seen = new Set()
    for (const c of room.components || []) {
      const norm = normalizeRef(c.ref)
      if (seen.has(norm)) continue
      seen.add(norm)
      const entry = getComponentEntry(norm)
      if (!entry) continue
      out.push({
        kind: 'component',
        name: entry.displayName || refName(c.ref),
        desc: entry.description || '',
      })
    }
    return out
  }, [room])

  // Quick pills for the same component refs — short uppercase labels
  // mirror the blueprint cards' look, so the overlay reads as a richer
  // view of the same surface.
  const pillLabels = useMemo(() => {
    if (!room) return []
    const PILL_LABELS = {
      toc:         'TOC',
      branches:    'BRANCHES',
      highlights:  'HIGHLIGHTS',
      'file-shelf':'FILE SHELF',
      context:     'CONTEXT',
      notes:       'NOTES',
      review:      'REVIEW',
    }
    const seen = new Set()
    const out = []
    for (const c of room.components || []) {
      const l = PILL_LABELS[refName(c.ref)]
      if (l && !seen.has(l)) { seen.add(l); out.push(l) }
    }
    return out
  }, [room])

  if (!room) return null

  const layoutRef = room.layout?.ref
  const created = fmtDate(room.meta?.created)
  const lastUsed = lastConv ? fmtDate(lastConv.updatedAt) : null
  const lastModel = lastConv ? modelLabel(lastConv.model) : null
  const name = room.meta?.name || 'Untitled room'

  return (
    <div
      className="ov-backdrop ov-sheet-mobile show"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="ov-panel" role="dialog" aria-modal="true" aria-labelledby="rd-title">
        <div className="ov-sheet-handle" aria-hidden="true" />
        <div className="ov-head">
          <div>
            <div id="rd-title" className="ov-name">{name}</div>
            <span className="ov-type-tag ov-type-room">Room</span>
          </div>
          <button className="ov-close" onClick={onClose} aria-label="Close">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {room.meta?.description && (
          <div className="ov-desc">{room.meta.description}</div>
        )}

        {/* Layout abstract — same wireframe shapes the wizard uses, at
            the small (64px) size so it reads at a glance. */}
        {layoutRef && (
          <div>
            <div className="ov-section-label">Layout</div>
            <div className="flex items-center gap-3">
              <div style={{ width: 96, flexShrink: 0 }}>
                <LayoutWireframe id={layoutRef} small />
              </div>
              <div className="text-[12.5px]" style={{ color: 'var(--p-text-secondary)' }}>
                {LAYOUT_LABELS[refName(layoutRef)] || refName(layoutRef)}
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="ov-section-label">Details</div>
          <div className="ov-meta-row">
            {created  && <div><strong>Created:</strong> {created}</div>}
            {lastUsed && <div><strong>Last used:</strong> {lastUsed}</div>}
            {lastModel && <div><strong>Last spoken to:</strong> {lastModel}</div>}
          </div>
        </div>

        {pillLabels.length > 0 && (
          <div>
            <div className="ov-section-label">Features</div>
            <div className="ov-room-pills">
              {pillLabels.map(l => (
                <span key={l} className="ov-room-pill">{l}</span>
              ))}
            </div>
          </div>
        )}

        {includes.length > 0 && (
          <div>
            <div className="ov-section-label">Includes</div>
            <ul className="ov-includes">
              {includes.map((it, i) => (
                <li key={`${it.kind}-${it.name}-${i}`}>
                  <span className="ov-inc-name">{it.name}</span>
                  {it.desc && <span className="ov-inc-desc">{it.desc}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="ov-actions">
          <button type="button" className="tb-btn" onClick={onCopy}>
            <Copy className="inline-block w-3 h-3 mr-1 -mt-px" />
            Copy Room
          </button>
          <button
            type="button"
            className="tb-btn"
            onClick={onDelete}
            style={{ color: '#C5342A', borderColor: '#E0A8A8' }}
          >
            <Trash2 className="inline-block w-3 h-3 mr-1 -mt-px" />
            Delete Room
          </button>
          <button
            type="button"
            className="tb-btn primary"
            onClick={onEnter}
          >
            Enter Room
            <ArrowRight className="inline-block w-3 h-3 ml-1 -mt-px" />
          </button>
        </div>
      </div>
    </div>
  )
}
