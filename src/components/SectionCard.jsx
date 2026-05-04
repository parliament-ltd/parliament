// SectionCard — homepage section chrome (PR-14 rewrite).
//
// Per refactor/parliament_homepage_v2 (2).html `.section` block:
//   - 14px section radius, 0.5px border, white surface
//   - Header has hover-revealed grabber (drag handle), title, meta line,
//     chevron toggle that rotates -90deg when collapsed
//   - Body collapses with a max-height + opacity transition, ~0.28s
//
// Drag-reorder lives here as native HTML5 D&D — the parent
// (stacked-sections@1.0) owns the drag state and persists the new order
// to the homepage mode file. SectionCard only forwards the events.
//
// The previous implementation lived at
// src/catalog/layouts/section-card.jsx and shipped a plain ▾/▸ glyph
// header with no animation. PR-14 replaces it; the old file re-exports
// from here for any straggling imports, then is deleted in the same PR.

import { useState, useEffect, useRef } from 'react'

const Chevron = ({ collapsed }) => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 12 12"
    fill="none"
    style={{
      transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
      transition: 'transform 0.22s ease',
    }}
    aria-hidden="true"
  >
    <polyline
      points="3,4.5 6,7.5 9,4.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const Grabber = () => (
  <div className="section-grabber" title="Drag to reorder" aria-hidden="true">
    <div /><div /><div />
  </div>
)

export default function SectionCard({
  title,
  meta,
  defaultOpen = true,
  // Drag-reorder props (all optional — section still works without them):
  draggable = false,
  isDragging = false,
  isDropTarget = false,
  onSectionDragStart,
  onSectionDragOver,
  onSectionDragEnd,
  onSectionDrop,
  // Right-side header slot for section-level controls (e.g. Favorites' Edit button):
  headerActions,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen)
  const bodyRef = useRef(null)
  const [bodyMaxHeight, setBodyMaxHeight] = useState(undefined)

  // Measure the body's natural height so we can transition between 0 and
  // the actual content height. Setting max-height to a fixed huge value
  // (the previous spec approach) breaks the timing on tall sections; this
  // measures fresh on toggle.
  useEffect(() => {
    if (!bodyRef.current) return
    if (open) {
      // On open: set max-height to scrollHeight, then clear it after the
      // transition so dynamically-growing content (chat lists, library
      // grids) isn't capped.
      const h = bodyRef.current.scrollHeight
      setBodyMaxHeight(h)
      const t = setTimeout(() => setBodyMaxHeight(undefined), 320)
      return () => clearTimeout(t)
    } else {
      // On close: pin to current height, then drop to 0 next frame so
      // the transition sees a real start value.
      const h = bodyRef.current.scrollHeight
      setBodyMaxHeight(h)
      const r = requestAnimationFrame(() => setBodyMaxHeight(0))
      return () => cancelAnimationFrame(r)
    }
  }, [open])

  const collapsed = !open

  return (
    <section
      className={`section${collapsed ? ' collapsed' : ''}${isDragging ? ' dragging' : ''}${isDropTarget ? ' drop-target' : ''}`}
      aria-expanded={open}
    >
      <header
        className="section-head"
        // Drag is initiated only from the grabber (draggable=true on the
        // grabber div), but the dragover/drop handlers live on the whole
        // header so dropping anywhere in the header counts.
        onDragOver={onSectionDragOver}
        onDrop={onSectionDrop}
      >
        {draggable && (
          <div
            draggable
            onDragStart={onSectionDragStart}
            onDragEnd={onSectionDragEnd}
            // Keep the drag image clean: drag the whole section, not the
            // grabber dot grid.
            style={{ cursor: 'grab' }}
          >
            <Grabber />
          </div>
        )}

        <button
          type="button"
          className="section-title-btn"
          onClick={() => setOpen(o => !o)}
          aria-controls={`section-body-${title}`}
          aria-expanded={open}
        >
          <span className="section-title">{title}</span>
          {meta && <span className="section-meta">{meta}</span>}
        </button>

        {headerActions && (
          <div className="section-header-actions" onClick={(e) => e.stopPropagation()}>
            {headerActions}
          </div>
        )}

        <div className="section-actions">
          <button
            type="button"
            className="section-action"
            onClick={() => setOpen(o => !o)}
            title={open ? 'Collapse' : 'Expand'}
            aria-label={open ? 'Collapse section' : 'Expand section'}
          >
            <Chevron collapsed={collapsed} />
          </button>
        </div>
      </header>

      <div
        ref={bodyRef}
        id={`section-body-${title}`}
        className="section-body"
        style={bodyMaxHeight !== undefined ? { maxHeight: `${bodyMaxHeight}px` } : undefined}
      >
        {children}
      </div>
    </section>
  )
}
