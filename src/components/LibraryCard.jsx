// LibraryCard — shared card primitive used by the homepage Library section
// AND the editor's left-rail Components / Layouts / Schemes tabs (PR-19c).
//
// Single source of truth for ".lib-card" rendering so a Highlights card on
// the homepage and a Highlights card in the editor look like the same thing.
//
// Shape (always):
//   [ preview thumbnail (70px) ]
//   [ type pill • status pill ]
//   [ display name             ]
//   [ optional author          ]
//   [ optional bottom action   ]
//
// Per-kind preview:
//   - component → centered lucide icon (from manifest.icon, falls back to
//                 a generic Box glyph if the manifest predates icons)
//   - layout    → distinct silhouette per layout id (LayoutSilhouette)
//   - scheme    → bg + accent dot + soft stripe (PR-19c 3-color swatch)
//   - room      → 3-panel wireframe with input bar (legacy preview)
//   - resource  → centered iconName-based glyph
//
// Drag behavior: optional. Pass dragRef + dragListeners + dragAttributes
// from useDraggable to make the card a dnd-kit drag source. Without them,
// the card behaves as a click target only (homepage library overlay flow).

import {
  // Component icons (27 manifests as of PR-19c)
  MessagesSquare, MessageSquare, List, Highlighter, StickyNote, GitBranch,
  Activity, Users, ListChecks, Mic, LayoutDashboard, MessageCircle, BookOpen,
  Star, Hash, Clock, NotebookPen, FolderOpen, BarChart3, Table2, Gauge,
  Columns3, FileText, MessageSquareText, Waves, Globe, Paperclip,
  // Resource glyph fallbacks
  Code2, Film,
  // Generic fallback
  Box,
} from 'lucide-react'
import LayoutSilhouette from './LayoutSilhouette'

const ICON_BY_NAME = {
  MessagesSquare, MessageSquare, List, Highlighter, StickyNote, GitBranch,
  Activity, Users, ListChecks, Mic, LayoutDashboard, MessageCircle, BookOpen,
  Star, Hash, Clock, NotebookPen, FolderOpen, BarChart3, Table2, Gauge,
  Columns3, FileText, MessageSquareText, Waves, Globe, Paperclip,
}

const RESOURCE_ICON_BY_NAME = {
  'book-open':   BookOpen,
  'file-text':   FileText,
  'code-2':      Code2,
  'bar-chart-3': BarChart3,
  'film':        Film,
}

export default function LibraryCard({
  item,
  onClick,
  dragRef,
  dragListeners,
  dragAttributes,
  isDragging = false,
  disabled = false,
  statusLabel,
  installs,
  cta,
}) {
  const handlers = dragListeners || {}
  const attrs = dragAttributes || {}
  const draggableProps = (!disabled && dragRef) ? { ref: dragRef, ...handlers, ...attrs } : (dragRef ? { ref: dragRef } : {})

  return (
    <button
      type="button"
      className={`lib-card${disabled ? ' lib-card-disabled' : ''}${isDragging ? ' lib-card-dragging' : ''}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...draggableProps}
    >
      <Preview item={item} />
      <div className="lib-card-head">
        <span className={`lib-card-type ${item.kind || 'component'}`}>
          {item.format || typeLabel(item.kind)}
        </span>
        {statusLabel && <span className="lib-card-status">{statusLabel}</span>}
        {!statusLabel && item.status === 'coming-soon' && (
          <span className="lib-card-status">Coming soon</span>
        )}
      </div>
      <div className="lib-card-name">{item.displayName || item.name || item.title}</div>
      {formatAuthor(item.author) && (
        <div className="lib-card-author">{formatAuthor(item.author)}</div>
      )}
      {(installs !== undefined || cta) && (
        <div className="lib-card-action">
          <span>{installs || '—'}</span>
          {cta && <span className="lib-card-cta">{cta} →</span>}
        </div>
      )}
    </button>
  )
}

// ─── Preview ─────────────────────────────────────────────

export function Preview({ item }) {
  const kind = item.kind || 'component'
  if (kind === 'component') return <ComponentIconPreview item={item} />
  if (kind === 'layout')    return <LayoutSilhouette layoutId={item.id || item.name} />
  if (kind === 'scheme')    return <SchemePreview item={item} />
  if (kind === 'room')      return <RoomPreview item={item} />
  if (kind === 'resource')  return <ResourcePreview item={item} />
  return <div className="lib-preview" />
}

// Component preview: centered lucide icon read from item.icon (manifest
// field added in PR-19c). Falls back to a generic Box glyph for older
// rows that predate the icon field.
function ComponentIconPreview({ item }) {
  const Icon = ICON_BY_NAME[item.icon] || Box
  return (
    <div className="lib-preview component-icon">
      <Icon className="w-7 h-7" strokeWidth={1.4} />
    </div>
  )
}

// Scheme preview: bg + accent dot + soft stripe (3 colors per PR-19c).
function SchemePreview({ item }) {
  const variant = item.variants?.[item.defaultVariant || 'light'] || {}
  const bg     = variant['bg-base']    || variant['bg-surface']  || '#F8F3E6'
  const accent = variant['gold-light'] || variant['gold']        || '#B8A070'
  const soft   = variant['gold-muted'] || variant['border']      || accent
  return (
    <div className="lib-preview scheme-swatch" style={{ background: bg }}>
      <div className="sd" style={{ background: accent }} />
      <div className="sl" style={{ background: soft, opacity: 0.7 }} />
    </div>
  )
}

// Room preview: when `item.layoutId` is set (PR-19d Rooms tab + any caller
// that passes the room's layout ref), render the matching LayoutSilhouette
// so the card visually carries the layout's identity. Falls back to the
// legacy 3-panel wireframe for rows that don't carry layoutId (homepage
// Library section still uses the wireframe today).
function RoomPreview({ item }) {
  if (item?.layoutId) {
    return <LayoutSilhouette layoutId={item.layoutId} />
  }
  return (
    <div className="lib-preview">
      <div className="wr" style={{ width: '20%' }}><span className="wd" /></div>
      <div className="wr" style={{ flex: 1, position: 'relative' }}><div className="wb" /></div>
      <div className="wr dashed" style={{ width: '22%' }} />
    </div>
  )
}

function ResourcePreview({ item }) {
  const Icon = RESOURCE_ICON_BY_NAME[item.iconName] || FileText
  return (
    <div className="lib-preview resource">
      <Icon className="w-7 h-7" />
    </div>
  )
}

// ─── Formatters ──────────────────────────────────────────

function formatAuthor(a) {
  if (!a) return null
  if (typeof a === 'string') return `by ${a}`
  if (a.handle) return `by @${a.handle}`
  if (a.name) return `by ${a.name}`
  return null
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
