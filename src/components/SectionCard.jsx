// SectionCard — homepage section chrome (PR-14 rewrite, PR-17 dnd-kit migration).
//
// Per refactor/parliament_homepage_v2 (2).html `.section` block:
//   - 14px section radius, 0.5px border, white surface
//   - Header has hover-revealed grabber (drag handle), title, meta line,
//     chevron toggle that rotates -90deg when collapsed
//   - Body collapses with a max-height + opacity transition, ~0.28s
//
// Drag-reorder uses dnd-kit's useSortable hook directly inside this
// component (the editor's LayoutCard / ComponentCard / SchemeCard precedent).
// The parent layout (stacked-sections@1.0) wraps these in a SortableContext
// and owns the persistence logic. The grabber is a real <button> so the
// keyboard sensor has a focusable activator and screen readers have a name.

import { useState, useEffect, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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

export const Grabber = () => (
  <div className="section-grabber" title="Drag to reorder" aria-hidden="true">
    <div /><div /><div />
  </div>
)

export default function SectionCard({
  title,
  meta,
  defaultOpen = true,
  // Drag-reorder via dnd-kit. Pass `sortable` + `sortableId` from the
  // parent SortableContext to enable. Without them, the section renders
  // without any drag behavior (useful for non-homepage consumers).
  sortable = false,
  sortableId,
  // Right-side header slot for section-level controls (e.g. Favorites' Edit button):
  headerActions,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen)
  const bodyRef = useRef(null)
  const [bodyMaxHeight, setBodyMaxHeight] = useState(undefined)

  // useSortable is always called (Rules of Hooks). When `sortable` is false
  // or `sortableId` is absent, we ignore the outputs and skip the wiring.
  // Destructure at the call site so the eslint react-hooks/refs rule
  // sees plain local variables rather than property access through an
  // object (which it mis-flags as ref access during render).
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes: sortableAttributes,
    listeners: sortableListeners,
    isDragging: sortableIsDragging,
    transform,
    transition,
  } = useSortable({ id: sortableId ?? '__noop__', disabled: !sortable || !sortableId })
  const isDragging = sortable && sortableIsDragging
  const dragStyle = sortable
    ? { transform: CSS.Transform.toString(transform), transition }
    : undefined

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
      ref={sortable ? setNodeRef : undefined}
      style={dragStyle}
      className={`section${collapsed ? ' collapsed' : ''}${isDragging ? ' dragging' : ''}`}
      aria-expanded={open}
    >
      <header className="section-head">
        {sortable && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            className="section-grabber-handle"
            aria-label={`Reorder ${title} section`}
            {...sortableAttributes}
            {...sortableListeners}
          >
            <Grabber />
          </button>
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
