// EditorCanvas — center pane. Reads the draft mode and renders each
// declared slot as both a drop target (dnd-kit useDroppable) and a
// click-selectable region. Components inside slots render via their
// catalog entry's previewRender (or render) and are also click-selectable.
//
// PR-8 ships per-layout geometry tables for each layout the user can
// drop. Layouts whose runtime entry hasn't landed yet fall back to a
// horizontal strip of slot rectangles drawn from LAYOUT_SLOTS — users
// can still configure rooms before those layouts get full renderers.

import { useDroppable } from '@dnd-kit/core'
import { getLayoutSlots } from '../../lib/layoutMigration'
import { findCatalogEntry, normalizeRef } from '../../lib/refs'
import { schemeName } from '../../lib/schemes'

// Visual kind per slot id. Drives subtle bg variance for the
// .editor-area-card on each slot zone (PR-27, item 3). Unknown ids
// fall through to 'main'.
const AREA_KIND_BY_SLOT = {
  'left-rail':        'rail',
  'right-rail':       'rail',
  'right-rail-extra': 'rail',
  'chat-panel':       'rail',
  'inspector':        'rail',
  'margin':           'rail',
  'outline':          'rail',
  'msg-area':         'main',
  'canvas':           'main',
  'document':         'main',
  'section-slot':     'main',
  'input-dock':       'dock',
  'sheet':            'sheet',
}

// Per-layout slot positioning. Each entry maps slotId → CSS grid
// classes so the canvas approximates the live layout's spatial
// proportions. Layouts not listed here render as a flat row.
// PR-19d follow-up: two fixes layered together for the right-rail-
// off-canvas bug.
//   (1) Each fr-sized column uses `minmax(0, 1fr)` so intrinsic content
//       min-widths (e.g. unbreakable strings inside a component
//       preview) can't push neighboring columns past their share.
//   (2) `aspect-[16/9]` is removed from the inner grids. When combined
//       with `min-h-[420px]`, the aspect-ratio rule forces the WIDTH
//       to grow to 420 * 16/9 = 747px even when the parent canvas is
//       narrower (e.g. 632px at 1280px viewport with 300px rails).
//       The grid then overflows horizontally and the right-rail slot
//       lands outside the canvas's rounded-lg boundary. The canvas
//       wrapper still pairs `aspect-[16/9]` with `overflow-hidden`
//       below, so the overall card keeps its 16:9 silhouette.
const LAYOUT_GEOMETRY = {
  'three-panel@1.0': {
    // PR-28g: both side rails 22% to mirror the runtime w-72/w-72 equal
    // widths (PR-28a). Previously 18/24 visually disagreed with the
    // runtime; the preview now reads the same as the live room.
    container: 'grid grid-cols-[22%_minmax(0,1fr)_22%] gap-2 p-2 min-h-[420px] h-full',
    slots: {
      'left-rail':        { className: 'flex flex-col gap-1.5 row-span-1 min-w-0' },
      'msg-area':         { className: 'flex flex-col gap-1.5 row-span-1 min-w-0' },
      'input-dock':       { className: 'col-start-2 row-start-2 mt-1 min-w-0' },
      'right-rail':       { className: 'flex flex-col gap-1.5 row-start-1 col-start-3 min-w-0' },
      'right-rail-extra': { className: 'flex flex-col gap-1.5 row-start-2 col-start-3 min-w-0' },
    },
    style: { gridTemplateRows: '1fr auto' },
  },
  'canvas-centric@1.0': {
    // PR-28g: both sides 24% to mirror canvas-centric's runtime w-72/w-72
    // equal-width rails. Was 22/28 — visually disagreed with the runtime.
    container: 'grid grid-cols-[24%_minmax(0,1fr)_24%] gap-2 p-2 min-h-[420px] h-full',
    slots: {
      'left-rail':  { className: 'flex flex-col gap-1.5 min-w-0' },
      'canvas':     { className: 'flex flex-col gap-1.5 min-w-0' },
      'chat-panel': { className: 'flex flex-col gap-1.5 min-w-0' },
      'inspector':  { className: 'flex flex-col gap-1.5 col-span-3 min-w-0' },
      'input-dock': { className: 'col-span-3 mt-1 min-w-0' },
    },
  },
  'document-centric@1.0': {
    container: 'grid grid-cols-[minmax(0,1fr)_30%] gap-2 p-2 min-h-[420px] h-full',
    slots: {
      'outline':    { className: 'flex flex-col gap-1.5 col-span-2 min-w-0' },
      'document':   { className: 'flex flex-col gap-1.5 min-w-0' },
      'margin':     { className: 'flex flex-col gap-1.5 min-w-0' },
      'chat-panel': { className: 'flex flex-col gap-1.5 col-span-2 min-w-0' },
    },
  },
  'single-column-with-sheet@1.0': {
    container: 'flex flex-col gap-2 p-2 min-h-[420px] aspect-[9/16] max-w-[320px] mx-auto',
    slots: {
      'msg-area':   { className: 'flex flex-col gap-1.5 flex-1' },
      'input-dock': { className: 'mt-1' },
      'sheet':      { className: 'flex flex-col gap-1.5 mt-2 border-t border-dashed border-[var(--p-text-light)] pt-2' },
    },
  },
  'stacked-sections@1.0': {
    container: 'flex flex-col gap-3 p-4 min-h-[480px]',
    slots: {
      'section-slot': { className: 'flex flex-col gap-3' },
    },
  },
}

export default function EditorCanvas({
  mode,
  selection,
  catalogEntries,
  onSelectRoom,
  onSelectSlot,
  onSelectComponent,
}) {
  const layoutRef = mode?.layout?.ref
  const layoutKey = normalizeRef(layoutRef)
  const slots = getLayoutSlots(layoutRef)
  const geometry = LAYOUT_GEOMETRY[layoutKey]

  // PR-19c: live scheme preview. The canvas wrapper carries
  // data-scheme=<bareName>, which scopes the scheme's CSS variable
  // overrides to the canvas and its descendants. Editor chrome stays
  // on the user's global scheme.
  const schemeRef = normalizeRef(mode?.scheme?.ref) || 'parliament@1.0'
  const canvasScheme = schemeName(schemeRef)

  // Group placed components by slot, sorted by `order`.
  const componentsBySlot = {}
  for (const c of mode?.components || []) {
    if (!c?.slot) continue
    if (!componentsBySlot[c.slot]) componentsBySlot[c.slot] = []
    componentsBySlot[c.slot].push(c)
  }
  for (const k of Object.keys(componentsBySlot)) {
    componentsBySlot[k].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }

  const isRoomSelected = selection.type === 'room'

  // PR-19d: blank-canvas splash when the editor has no mode yet
  // (the /edit route, before the user drops anything in).
  const isBlank = !mode

  return (
    <div className="p-6 flex flex-col items-center">
      <CanvasDropTarget
        onClick={(e) => {
          // Clicks on background → select room
          if (e.target === e.currentTarget) onSelectRoom()
        }}
        selected={isRoomSelected}
        schemeName={canvasScheme}
      >
        {isBlank ? (
          <div className="min-h-[420px] flex items-center justify-center text-center px-6 py-12 text-[var(--p-text-muted)]">
            <div className="max-w-[320px] text-[12.5px] leading-[1.6]">
              Drag a layout, scheme, or room to begin.
            </div>
          </div>
        ) : !geometry ? (
          <div className="p-6 text-center text-xs text-[var(--p-text-secondary)]">
            <div className="font-medium text-[var(--p-text-primary)] mb-1">
              {layoutRef || '(no layout selected)'}
            </div>
            This layout's runtime renderer ships in a later PR. Slots are listed below.
            <div className="mt-4 grid grid-cols-2 gap-2 text-left">
              {slots.map((s) => (
                <SlotDropTarget
                  key={s.id}
                  slotId={s.id}
                  label={s.label}
                  selected={selection.type === 'slot' && selection.id === s.id}
                  onSelect={onSelectSlot}
                  onSelectComponent={onSelectComponent}
                  components={componentsBySlot[s.id] || []}
                  catalogEntries={catalogEntries}
                  selectedComponentId={selection.type === 'component' ? selection.id : null}
                  capacity={s.capacity}
                />
              ))}
            </div>
          </div>
        ) : (
          <div
            className={geometry.container}
            style={geometry.style}
          >
            {slots.map((s) => {
              const slotGeom = geometry.slots[s.id]
              return (
                <div key={s.id} className={slotGeom?.className || ''}>
                  <SlotDropTarget
                    slotId={s.id}
                    label={s.label}
                    selected={selection.type === 'slot' && selection.id === s.id}
                    onSelect={onSelectSlot}
                    onSelectComponent={onSelectComponent}
                    components={componentsBySlot[s.id] || []}
                    catalogEntries={catalogEntries}
                    selectedComponentId={selection.type === 'component' ? selection.id : null}
                    capacity={s.capacity}
                    compact
                  />
                </div>
              )
            })}
          </div>
        )}
      </CanvasDropTarget>
    </div>
  )
}

// ─── Canvas (background drop target) ─────────────────────

function CanvasDropTarget({ children, onClick, selected, schemeName: schemeAttr }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-root',
    data: { kind: 'canvas' },
  })
  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      data-scheme={schemeAttr}
      className={`w-full max-w-[920px] min-h-[420px] rounded-lg border overflow-hidden shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)] transition-shadow ${
        selected ? 'border-[var(--p-gold-light)]' : 'border-[var(--p-border)]'
      }`}
      style={{
        background: 'var(--p-bg-base)',
        boxShadow: isOver
          ? '0 0 0 2px var(--p-gold-light), 0 8px 30px -10px rgba(0,0,0,0.12)'
          : undefined,
      }}
    >
      {children}
    </div>
  )
}

// ─── Slot ────────────────────────────────────────────────

function SlotDropTarget({
  slotId, label, selected, onSelect, onSelectComponent,
  components, catalogEntries, selectedComponentId, compact,
  capacity,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slotId}`,
    data: { kind: 'slot', slot: slotId },
  })
  const isEmpty = components.length === 0
  const areaKind = AREA_KIND_BY_SLOT[slotId] || 'main'
  // PR-28h: for stack/overlay slots, keep a small "Drop another"
  // hint card visible below placed components so the user always
  // sees where the next drop will land. Single-capacity slots
  // suppress the hint once a component is in place.
  const showHintBelow = !isEmpty && (capacity === 'stack' || capacity === 'overlay')
  return (
    <div
      ref={setNodeRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.stopPropagation()
          onSelect(slotId)
        }
      }}
      className="editor-area-card relative flex flex-col gap-1.5 cursor-pointer min-h-[60px] min-w-0"
      data-area-kind={areaKind}
      data-area-empty={isEmpty ? 'true' : 'false'}
      data-area-over={isOver ? 'true' : 'false'}
      data-area-selected={selected ? 'true' : 'false'}
      style={{ padding: compact ? '6px' : '10px' }}
    >
      {isEmpty ? (
        <div className="flex items-center justify-center text-[10.5px] text-[var(--p-text-muted)] text-center min-h-[40px] pointer-events-none">
          <span>
            <span className="block font-medium text-[var(--p-text-secondary)]">{label}</span>
            Drop a component here
          </span>
        </div>
      ) : (
        <>
          {components.map((c) => (
            <ComponentPreview
              key={c.id}
              spec={c}
              entry={findEntry(catalogEntries, c.ref)}
              selected={c.id === selectedComponentId}
              onSelect={() => onSelectComponent(c.id)}
            />
          ))}
          {showHintBelow && (
            <div className="rounded border border-dashed border-[var(--p-text-light)] py-1.5 px-2 text-[10px] text-[var(--p-text-muted)] text-center pointer-events-none">
              Drop another component here
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Component preview ───────────────────────────────────

function findEntry(entries, ref) {
  return findCatalogEntry(entries, ref)
}

function ComponentPreview({ spec, entry, selected, onSelect }) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      className="editor-component-card relative"
      data-selected={selected ? 'true' : 'false'}
    >
      <div className="text-[9.5px] uppercase tracking-wider font-medium text-[var(--p-gold-muted)] mb-1">
        {entry?.displayName || spec.ref}
      </div>
      <ComponentSkeleton entry={entry} />
    </div>
  )
}

// Tiny visual placeholder for each component in the live canvas.
// Avoids invoking the full render() (which depends on contexts and
// can mutate state via hooks) so the editor canvas stays inert.
function ComponentSkeleton({ entry }) {
  const name = entry?.name
  if (name === 'messages') {
    return (
      <div className="flex flex-col gap-1">
        <div className="self-start max-w-[80%] px-2 py-1 rounded bg-[var(--p-bg-subtle)] text-[10px] text-[var(--p-text-secondary)]">
          How can I help today?
        </div>
        <div className="self-end max-w-[80%] px-2 py-1 rounded bg-[rgba(196,169,77,0.15)] text-[10px] text-[var(--p-gold-muted)]">
          Let's start drafting…
        </div>
        <div className="self-start max-w-[80%] px-2 py-1 rounded bg-[var(--p-bg-subtle)] text-[10px] text-[var(--p-text-secondary)]">
          Sure — what's the angle?
        </div>
      </div>
    )
  }
  if (name === 'input') {
    return (
      <div className="bg-[var(--p-bg-subtle)] border border-[var(--p-border)] rounded px-2 py-1.5 text-[10.5px] text-[var(--p-text-muted)] flex items-center gap-2">
        <span className="flex-1 truncate">Message Claude…</span>
        <span className="w-3.5 h-3.5 rounded bg-[var(--p-gold-light)]" />
      </div>
    )
  }
  if (name === 'context') {
    return (
      <div>
        <div className="h-1 rounded bg-[var(--p-bg-alt)] overflow-hidden mb-1">
          <div className="w-1/3 h-full bg-[var(--p-gold-light)]" />
        </div>
        <div className="text-[9.5px] text-[var(--p-text-muted)]">32% of 200k tokens</div>
      </div>
    )
  }
  // Default skeleton: a few line stubs
  return (
    <div className="flex flex-col gap-1">
      <div className="h-0.5 bg-[var(--p-text-light)] rounded" style={{ width: '75%' }} />
      <div className="h-0.5 bg-[var(--p-text-light)] rounded" style={{ width: '60%' }} />
      <div className="h-0.5 bg-[var(--p-text-light)] rounded" style={{ width: '70%' }} />
    </div>
  )
}
