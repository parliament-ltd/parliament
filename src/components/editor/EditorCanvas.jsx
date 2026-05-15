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

// Per-layout slot positioning. Each entry maps slotId → CSS grid
// classes so the canvas approximates the live layout's spatial
// proportions. Layouts not listed here render as a flat row.
const LAYOUT_GEOMETRY = {
  'three-panel@1.0': {
    container: 'grid grid-cols-[18%_1fr_24%] gap-2 p-2 min-h-[420px] aspect-[16/9]',
    slots: {
      'left-rail':        { className: 'flex flex-col gap-1.5 row-span-1' },
      'msg-area':         { className: 'flex flex-col gap-1.5 row-span-1' },
      'input-dock':       { className: 'col-start-2 row-start-2 mt-1' },
      'right-rail':       { className: 'flex flex-col gap-1.5 row-start-1 col-start-3' },
      'right-rail-extra': { className: 'flex flex-col gap-1.5 row-start-2 col-start-3' },
    },
    style: { gridTemplateRows: '1fr auto' },
  },
  'canvas-centric@1.0': {
    container: 'grid grid-cols-[22%_1fr_28%] gap-2 p-2 min-h-[420px] aspect-[16/9]',
    slots: {
      'left-rail':  { className: 'flex flex-col gap-1.5' },
      'canvas':     { className: 'flex flex-col gap-1.5' },
      'chat-panel': { className: 'flex flex-col gap-1.5' },
      'inspector':  { className: 'flex flex-col gap-1.5 col-span-3' },
      'input-dock': { className: 'col-span-3 mt-1' },
    },
  },
  'document-centric@1.0': {
    container: 'grid grid-cols-[1fr_30%] gap-2 p-2 min-h-[420px] aspect-[16/9]',
    slots: {
      'outline':    { className: 'flex flex-col gap-1.5 col-span-2' },
      'document':   { className: 'flex flex-col gap-1.5' },
      'margin':     { className: 'flex flex-col gap-1.5' },
      'chat-panel': { className: 'flex flex-col gap-1.5 col-span-2' },
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
      className={`w-full max-w-[920px] rounded-lg border shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)] transition-shadow ${
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
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slotId}`,
    data: { kind: 'slot', slot: slotId },
  })
  const isEmpty = components.length === 0
  return (
    <div
      ref={setNodeRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.stopPropagation()
          onSelect(slotId)
        }
      }}
      className={`relative rounded-md transition-colors flex flex-col gap-1.5 cursor-pointer min-h-[60px] ${
        isOver
          ? 'border border-[var(--p-gold-light)] bg-[rgba(196,169,77,0.08)]'
          : isEmpty
            ? 'border border-dashed border-[var(--p-text-light)] bg-transparent'
            : 'border border-transparent bg-white'
      } ${selected ? 'outline outline-[1.5px] outline-[var(--p-gold-light)] outline-offset-2' : ''}`}
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
        components.map((c) => (
          <ComponentPreview
            key={c.id}
            spec={c}
            entry={findEntry(catalogEntries, c.ref)}
            selected={c.id === selectedComponentId}
            onSelect={() => onSelectComponent(c.id)}
          />
        ))
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
      className={`relative rounded-sm bg-white px-2.5 py-2 cursor-pointer transition-colors border ${
        selected
          ? 'border-[var(--p-gold-light)] outline outline-1 outline-[var(--p-gold-light)]'
          : 'border-transparent hover:bg-[rgba(196,169,77,0.06)]'
      }`}
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
