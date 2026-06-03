// EditorView — the three-rail mode editor (PR-8 + PR-8b).
//
// Routes:
//   /edit/:roomId  → loads modes[roomId] (scope='room')
//   /edit-home     → loads the user's homepage mode (scope='homepage')
//
// EditorView owns the draft state via useReducer, wires the dnd-kit
// DndContext that spans the three rails, and persists to IndexedDB on
// Save. The three rails plus the holding tray + migration dialog are
// children — see src/components/editor/.
//
// State runs through editorHistoryReducer (PR-8b), which wraps the pure
// editorReducer with an undo / redo stack. EditorView only reads
// historyState.present; children never see the history shape.

import { useEffect, useReducer, useState, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, rectIntersection } from '@dnd-kit/core'
import { X } from 'lucide-react'
import EditorTopBar from '../components/editor/EditorTopBar'
import EditorLeftRail from '../components/editor/EditorLeftRail'
import EditorCanvas from '../components/editor/EditorCanvas'
import EditorRightRail from '../components/editor/EditorRightRail'
import EditorHoldingTray from '../components/editor/EditorHoldingTray'
import EditorMigrationDialog from '../components/editor/EditorMigrationDialog'
import EditorApplyRoomDialog from '../components/editor/EditorApplyRoomDialog'
import EditorPreviewSheet from '../components/editor/EditorPreviewSheet'
import EditorLibraryMode from '../components/editor/EditorLibraryMode'
import Card from '../components/Card'
import Button from '../components/Button'
import {
  editorHistoryReducer,
  makeInitialHistoryState,
  canUndo,
  canRedo,
} from '../lib/editorHistory'
import { planLayoutMigration } from '../lib/layoutMigration'
import { listModes, loadHomepageMode, loadMode, saveMode, createCopyOfMode } from '../lib/modes'
import { useIsNarrow } from '../lib/useViewportWidth'
import { listEntries as listCatalogEntries } from '../catalog'

export default function EditorView({ scope = 'room', blank = false }) {
  const navigate = useNavigate()
  const { roomId } = useParams()
  const location = useLocation()
  // PR-19e: when the user clicks the Build pill from Edit mode, the
  // parent navigates to /edit with location.state.seedMode set to a
  // freshly-copied draft. The blank-canvas load path picks it up.
  const seedMode = location.state?.seedMode || null
  // The editor's three-rail D&D model is unusable below ~768px. PR-15
  // gates with a friendly full-screen panel; V3 will replace this with
  // a phone-first wizard-per-section editor (see refactor docs).
  const tooNarrow = useIsNarrow(768)
  const [historyState, dispatch] = useReducer(
    editorHistoryReducer,
    null,
    () => makeInitialHistoryState(null),
  )
  const state = historyState.present
  const undoAvailable = canUndo(historyState)
  const redoAvailable = canRedo(historyState)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [pendingLayoutSwap, setPendingLayoutSwap] = useState(null) // { layoutRef, plan }
  const [pendingRoomApply, setPendingRoomApply] = useState(null) // { sourceMode }
  const [previewOpen, setPreviewOpen] = useState(false)
  // PR-19d: lifted list of all modes for the Rooms tab and for drop-time
  // source-mode lookups. Loaded once on mount; refreshed after Save so a
  // freshly-saved mode appears in the tab without a full reload.
  const [modes, setModes] = useState(null)
  // PR-44: Library mode is the third top-bar pill. When open, the center
  // column renders the Library shopping UI in place of the canvas. The
  // underlying draft is untouched while Library is open — selections
  // only flow into the draft when Build wiring lands in a later PR.
  const [libraryOpen, setLibraryOpen] = useState(false)

  // ── Load the mode on mount ─────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        // PR-19d: /edit (blank) skips the load entirely.
        // PR-19e: if location.state.seedMode is set (Build pill from
        // Edit), seed the canvas with that draft instead of resetting
        // to null. The draft has a fresh id + blank name, so saveMode
        // will persist it as a new room.
        if (blank) {
          if (!cancelled) {
            dispatch({ type: 'RESET_TO', mode: seedMode })
            setLoaded(true)
          }
          return
        }
        let mode
        if (scope === 'homepage') {
          mode = await loadHomepageMode()
          if (!mode) throw new Error('No homepage mode found.')
        } else {
          mode = await loadMode(roomId)
          if (!mode) throw new Error(`Room not found: ${roomId}`)
        }
        if (cancelled) return
        dispatch({ type: 'RESET_TO', mode })
        setLoaded(true)
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Failed to load mode')
      }
    }
    init()
    return () => { cancelled = true }
  }, [scope, roomId, blank, seedMode])

  // ── Load modes list for Rooms tab + drop lookups ───────
  useEffect(() => {
    let cancelled = false
    async function loadAllModes() {
      try {
        const all = await listModes()
        if (!cancelled) setModes(all)
      } catch {
        if (!cancelled) setModes([])
      }
    }
    loadAllModes()
    return () => { cancelled = true }
  }, [])

  // ── Toast helper ───────────────────────────────────────
  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }, [])

  // ── PR-19e: Build/Edit pill handlers. ──────────────────
  // Build pill (from Edit) copies the current canvas state — including
  // unsaved edits — into a new draft and navigates to /edit with the
  // seed in router state. The original room is untouched on disk.
  // Edit pill (from Build) navigates to the Rooms tab so the user can
  // pick a room to edit.
  const onStartCopy = useCallback(() => {
    const sourceMode = historyState.present?.mode
    if (!sourceMode) return
    const draft = createCopyOfMode(sourceMode)
    // PR-28g: carry the source room id so the Edit pill can navigate
    // back to it. Previously the Edit pill always blanked the canvas
    // via /edit?tab=rooms, which wiped the user's in-progress work
    // when they were toggling Build ↔ Edit on a populated canvas.
    navigate('/edit', {
      state: { seedMode: draft, returnToRoomId: sourceMode.id },
    })
  }, [historyState, navigate])
  const onSwitchToEdit = useCallback(() => {
    // PR-28g: if we got to /edit (build mode) from /edit/:id, return
    // there instead of blanking the canvas. Carries the user's
    // original edit context through a Build → Edit toggle.
    const returnTo = location.state?.returnToRoomId
    if (returnTo) {
      navigate(`/edit/${returnTo}`)
      return
    }
    navigate('/edit?tab=rooms')
    // PR-19f: the Edit pill on blank canvas opens the Rooms tab but
    // can't visually toggle the pill (route is unchanged → labMode
    // stays 'build'). A toast narrates the next step so the click
    // doesn't feel like a no-op.
    showToast('Drag a room from the left rail to start editing')
  }, [navigate, location.state, showToast])

  // ── Save ───────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (saving) return
    if (!state.mode) {
      showToast('Drop a layout, scheme, or room first.')
      return
    }
    if (!state.mode.meta?.name?.trim()) {
      showToast('Name your room first.')
      return
    }
    if (state.tray.length > 0) {
      showToast('Empty the holding tray first.')
      return
    }
    setSaving(true)
    try {
      const saved = await saveMode(state.mode)
      // MARK_SAVED (not RESET_TO) so undo history survives a save.
      dispatch({ type: 'MARK_SAVED', mode: saved })
      // Refresh the lifted modes list so the Rooms tab reflects the new save.
      try {
        const all = await listModes()
        setModes(all)
      } catch { /* ignore */ }
      // PR-19d: when saving for the first time on a blank canvas, the
      // mode now has a real id — switch the URL to /edit/:newId so a
      // reload returns to the same draft.
      if (blank) {
        navigate(`/edit/${saved.id}?tab=rooms`, { replace: true })
      }
      showToast('Saved')
    } catch (err) {
      showToast(err.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }, [saving, state.tray.length, state.mode, showToast, blank, navigate])

  // ── Build ──────────────────────────────────────────────
  // The Build button on a never-built mode used to navigate directly
  // to /build?ignite=:id, but a fresh draft (or any never-persisted
  // mode) isn't in IDB yet — BuildView's loadMode() returned null and
  // surfaced "Room not found" + the same error from igniteExistingRoom.
  // Save first so the mode actually exists in IDB before the wizard
  // tries to load it; saveMode is idempotent so re-saving a clean
  // mode is harmless.
  const handleBuild = useCallback(async () => {
    if (saving) return
    if (!state.mode) {
      showToast('Drop a layout, scheme, or room first.')
      return
    }
    if (!state.mode.meta?.name?.trim()) {
      showToast('Name your room first.')
      return
    }
    if (state.tray.length > 0) {
      showToast('Empty the holding tray first.')
      return
    }
    setSaving(true)
    try {
      const saved = await saveMode(state.mode)
      dispatch({ type: 'MARK_SAVED', mode: saved })
      navigate(`/build?ignite=${saved.id}`)
    } catch (err) {
      showToast(err.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }, [saving, state.tray.length, state.mode, showToast, navigate])

  // ── Keyboard shortcuts: Esc deselects, Cmd/Ctrl+Z undo, ─
  //    Cmd/Ctrl+Shift+Z (or Cmd/Ctrl+Y) redo. All gated against
  //    typing in inputs / textareas / contenteditable so the
  //    browser's native text-input undo wins there.
  useEffect(() => {
    function onKey(e) {
      const tag = (e.target?.tagName || '').toLowerCase()
      const isTyping =
        tag === 'input' || tag === 'textarea' || e.target?.isContentEditable
      if (isTyping) return

      if (e.key === 'Escape') {
        dispatch({ type: 'CLEAR_SELECTION' })
        return
      }

      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      const key = e.key.toLowerCase()

      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        dispatch({ type: 'UNDO' })
        return
      }
      if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault()
        dispatch({ type: 'REDO' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Drag-and-drop ──────────────────────────────────────
  // Two sensors so dragging starts only after a small displacement
  // (prevents accidental drags when clicking) and keyboard works for a11y.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  )

  // PR-28i: collision detection prefers nested slot droppables over the
  // outer canvas wrapper. With the default rectIntersection, holding-
  // tray drops were silently landing on `canvas-root` instead of the
  // slot the user hovered — the slot would highlight gold during drag
  // (slot.isOver true), but at release the over flipped to canvas-root
  // and handleDragEnd fired the "drop on a specific slot" toast.
  // Filtering canvas-root out when any slot also matches forces the
  // intended drop target to win on every drop.
  function collisionDetection(args) {
    const collisions = rectIntersection(args)
    if (collisions.length <= 1) return collisions
    const slotCollisions = collisions.filter((c) => c.id !== 'canvas-root')
    return slotCollisions.length > 0 ? slotCollisions : collisions
  }

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over) return
    const dragData = active.data.current
    const dropData = over.data.current
    if (!dragData || !dropData) return

    const isBlankCanvas = state.mode === null

    // Room dropped on canvas (or any slot).
    if (dragData.kind === 'room' && (dropData.kind === 'canvas' || dropData.kind === 'slot')) {
      const sourceMode = (modes || []).find((m) => m.id === dragData.ref)
      if (!sourceMode) {
        showToast('Room not found — try refreshing the page.')
        return
      }
      if (state.mode && sourceMode.id === state.mode.id) {
        showToast("That's the room you're editing.")
        return
      }
      // PR-19f: blank canvas has nothing to merge into, so the
      // ApplyRoomDialog's "keep what" toggle + migration preview are
      // meaningless. Drop a room → open it for editing directly.
      if (isBlankCanvas) {
        navigate(`/edit/${sourceMode.id}?tab=rooms`)
        return
      }
      setPendingRoomApply({ sourceMode })
      return
    }

    // Layout dropped on canvas
    if (dragData.kind === 'layout' && dropData.kind === 'canvas') {
      const layoutRef = dragData.ref
      // Blank canvas: materialize a fresh mode from this layout.
      if (isBlankCanvas) {
        dispatch({ type: 'INIT_FROM_LAYOUT', layoutRef })
        showToast('Layout placed. Name your room in the right panel.')
        return
      }
      if (layoutRef === state.mode.layout?.ref) {
        showToast('That layout is already active.')
        return
      }
      const plan = planLayoutMigration({
        fromLayout: state.mode.layout?.ref,
        toLayout: layoutRef,
        components: state.mode.components || [],
      })
      setPendingLayoutSwap({ layoutRef, plan })
      return
    }

    // Scheme dropped on canvas → apply (rejected on blank canvas).
    if (dragData.kind === 'scheme' && (dropData.kind === 'canvas' || dropData.kind === 'slot')) {
      if (isBlankCanvas) {
        showToast('Drop a layout or room first.')
        return
      }
      dispatch({ type: 'APPLY_SCHEME', schemeRef: dragData.ref })
      showToast(`Applied scheme: ${dragData.displayName}`)
      return
    }

    // Component dropped on a slot (rejected on blank canvas — no slots yet).
    if (dragData.kind === 'component' && isBlankCanvas) {
      showToast('Drop a layout or room first.')
      return
    }

    // Component dropped on a slot
    if (dragData.kind === 'component' && dropData.kind === 'slot') {
      // PR-28g: tray chip BEFORE already-placed move. Tray chips carry
      // both `fromTray: true` AND `componentId: chip.compId` (see
      // EditorHoldingTray.jsx), so checking componentId first ate the
      // tray case — MOVE_COMPONENT's .map(c => c.id === id) silently
      // no-op'd because the chip wasn't in state.mode.components, and
      // the drop appeared to fail with no error.
      if (dragData.fromTray) {
        dispatch({
          type: 'RESTORE_FROM_TRAY',
          compId: dragData.componentId || dragData.trayCompId,
          slot: dropData.slot,
        })
        return
      }
      // Already-placed instance moving between slots
      if (dragData.componentId) {
        dispatch({
          type: 'MOVE_COMPONENT',
          componentId: dragData.componentId,
          slot: dropData.slot,
        })
        return
      }
      // New component instance from the library
      dispatch({
        type: 'PLACE_COMPONENT',
        ref: dragData.ref,
        slot: dropData.slot,
      })
      return
    }

    // Component dropped on canvas (not a specific slot) → toast hint
    if (dragData.kind === 'component' && dropData.kind === 'canvas') {
      showToast('Drop a component on a specific slot, not the canvas.')
    }
  }

  function confirmMigration() {
    if (!pendingLayoutSwap) return
    dispatch({ type: 'SWAP_LAYOUT', layoutRef: pendingLayoutSwap.layoutRef })
    setPendingLayoutSwap(null)
    showToast('Layout switched.')
  }

  if (tooNarrow) {
    // PR-19g: when the user came here from a chat via the Wrench icon,
    // also offer "Back to chat" (browser history back). The Wrench
    // handlers in NarrowChrome + ChatDesktopChrome pass `fromChat` in
    // router state.
    const fromChat = Boolean(location.state?.fromChat)
    return (
      <EditorTooNarrow
        onBackToStudy={() => navigate('/')}
        onBackToChat={fromChat ? () => navigate(-1) : null}
        onDismiss={() => navigate(-1)}
      />
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[var(--p-bg-base)] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="text-sm font-medium text-[var(--p-text-primary)] mb-2">Couldn't open the editor</div>
          <div className="text-xs text-[var(--p-text-secondary)] mb-4">{loadError}</div>
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--p-border)] text-[var(--p-text-secondary)] hover:border-[var(--p-gold-light)] hover:text-[var(--p-gold-light)]"
          >
            Back to home
          </button>
        </div>
      </div>
    )
  }

  if (!loaded) return null

  const placedRefs = new Set((state.mode?.components || []).map((c) => c.ref))
  const catalogEntries = listCatalogEntries()
  // PR-19d: default tab depends on entry. Blank canvas opens the Rooms
  // tab because that's where users typically start; populated editors
  // default to Layouts. ?tab= URL query overrides either.
  const defaultTab = blank ? 'rooms' : 'layouts'
  // PR-19e: pill state derives from the route. /edit blank canvas =
  // Build mode; /edit/:roomId = Edit mode. /edit-home (homepage
  // editing) hides the pills — copy-as-new-room semantics don't apply
  // to the singleton homepage mode.
  const labMode = scope === 'homepage' ? null : (blank ? 'build' : 'edit')

  function confirmRoomApply({ applyLayout, applyScheme, applyComponents, componentRefsToApply }) {
    if (!pendingRoomApply?.sourceMode) return
    dispatch({
      type: 'APPLY_ROOM',
      sourceMode: pendingRoomApply.sourceMode,
      applyLayout,
      applyScheme,
      applyComponents,
      componentRefsToApply,
    })
    setPendingRoomApply(null)
    showToast('Applied')
  }

  function openHomepageEditorFromModal() {
    setPendingRoomApply(null)
    navigate('/edit-home')
  }

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={handleDragEnd}>
      <div className="h-screen flex flex-col bg-[var(--p-bg-subtle)] overflow-hidden">
        {/* PR-26: when the user arrived from a chat via the wrench
            icon, the top-bar Back button returns to that chat
            (history.back) rather than the homepage. The chat-entry
            path passes `fromChat: true` in router state; this honors
            it on every viewport (was: only the tooNarrow branch). */}
        <EditorTopBar
          mode={state.mode}
          dirty={state.dirty}
          saving={saving}
          trayBlockingBuild={state.tray.length > 0}
          canUndo={undoAvailable}
          canRedo={redoAvailable}
          onUndo={() => dispatch({ type: 'UNDO' })}
          onRedo={() => dispatch({ type: 'REDO' })}
          onBack={() => {
            if (location.state?.fromChat) {
              navigate(-1)
            } else {
              navigate('/')
            }
          }}
          onDeviceClassChange={(deviceClass) => dispatch({ type: 'SET_DEVICE_CLASS', deviceClass })}
          onSchemeChange={(schemeRef) => dispatch({ type: 'APPLY_SCHEME', schemeRef })}
          onSave={handleSave}
          onBuild={handleBuild}
          onPreview={() => setPreviewOpen(true)}
          labMode={labMode}
          onStartCopy={onStartCopy}
          onSwitchToEdit={onSwitchToEdit}
          libraryOpen={libraryOpen}
          onOpenLibrary={() => setLibraryOpen(true)}
          onCloseLibrary={() => setLibraryOpen(false)}
        />
        <div className="grid grid-cols-[300px_1fr_300px] flex-1 min-h-0">
          <EditorLeftRail
            scope={scope}
            currentLayoutRef={state.mode?.layout?.ref}
            currentSchemeRef={state.mode?.scheme?.ref}
            placedComponentRefs={placedRefs}
            catalogEntries={catalogEntries}
            modes={modes}
            defaultTab={defaultTab}
          />
          <div className="overflow-y-auto bg-[var(--p-bg-subtle)]">
            {libraryOpen ? (
              <EditorLibraryMode
                scope={scope}
                mode={state.mode}
                bag={state.libraryBag}
                modes={modes}
                catalogEntries={catalogEntries}
                onToggle={(kind, ref, room) =>
                  dispatch({ type: 'LIBRARY_TOGGLE', kind, ref, room })
                }
                onShowToast={showToast}
                onRemovePlacedComponent={(ref) => {
                  // PR-45: Showcase hover-x / click on a placed
                  // component removes every instance of that ref from
                  // the draft. One ref = one Showcase card, so the
                  // user's mental model is "remove this type from the
                  // room"; multi-instance editing happens via slot-
                  // level UI (right rail, drag).
                  const placed = (state.mode?.components || []).filter((c) => c.ref === ref)
                  for (const c of placed) {
                    dispatch({ type: 'REMOVE_COMPONENT', componentId: c.id })
                  }
                }}
              />
            ) : (
              <>
                <EditorCanvas
                  mode={state.mode}
                  selection={state.selection}
                  catalogEntries={catalogEntries}
                  onSelectRoom={() => dispatch({ type: 'SELECT_ROOM' })}
                  onSelectSlot={(slotId) => dispatch({ type: 'SELECT_SLOT', slotId })}
                  onSelectComponent={(componentId) => dispatch({ type: 'SELECT_COMPONENT', componentId })}
                />
                <EditorHoldingTray
                  tray={state.tray}
                  onDismiss={(compId) => dispatch({ type: 'DISMISS_FROM_TRAY', compId })}
                />
              </>
            )}
          </div>
          <EditorRightRail
            mode={state.mode}
            selection={state.selection}
            catalogEntries={catalogEntries}
            onUpdateConfig={(componentId, patch) =>
              dispatch({ type: 'UPDATE_COMPONENT_CONFIG', componentId, patch })
            }
            onSetName={(name) => dispatch({ type: 'SET_NAME', name })}
            onSetDeviceClass={(deviceClass) => dispatch({ type: 'SET_DEVICE_CLASS', deviceClass })}
            onApplyScheme={(schemeRef) => dispatch({ type: 'APPLY_SCHEME', schemeRef })}
            onSetPanelButton={(slotId, enabled) =>
              dispatch({ type: 'SET_PANEL_BUTTON', slotId, enabled })
            }
            onRemoveComponent={(componentId) => dispatch({ type: 'REMOVE_COMPONENT', componentId })}
          />
        </div>

        {pendingLayoutSwap && (
          <EditorMigrationDialog
            targetLayoutRef={pendingLayoutSwap.layoutRef}
            plan={pendingLayoutSwap.plan}
            mode={state.mode}
            catalogEntries={catalogEntries}
            onCancel={() => setPendingLayoutSwap(null)}
            onConfirm={confirmMigration}
          />
        )}

        {pendingRoomApply && (
          <EditorApplyRoomDialog
            sourceMode={pendingRoomApply.sourceMode}
            currentMode={state.mode}
            catalogEntries={catalogEntries}
            onCancel={() => setPendingRoomApply(null)}
            onConfirm={confirmRoomApply}
            onOpenHomepageEditor={openHomepageEditorFromModal}
          />
        )}

        <EditorPreviewSheet
          open={previewOpen}
          mode={state.mode}
          onClose={() => setPreviewOpen(false)}
        />

        {toast && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[var(--p-text-primary)] text-white px-4 py-2 rounded-md text-xs z-[200] shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </DndContext>
  )
}

// EditorTooNarrow — full-screen gate shown when the viewport is below
// the editor's minimum width (768px). PR-15. The editor's three-rail
// drag-and-drop model assumes a desktop pointer + screen real estate.
// V3 ships a phone-first wizard-per-section editor that replaces this
// gate; until then, send the user back to the homepage with a friendly
// note rather than rendering a broken layout.
//
// PR-19g: surface an X dismiss in the corner (browser back), rename
// "Back to home" → "Back to The Study", and add "Back to chat" when
// the user arrived here via the Wrench icon in a chat.
function EditorTooNarrow({ onBackToStudy, onBackToChat, onDismiss }) {
  return (
    <div className="min-h-screen bg-[var(--p-bg-base)] flex items-center justify-center px-6">
      <Card className="max-w-md w-full text-center flex flex-col gap-4 py-6 relative">
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close"
          className="absolute top-2.5 right-2.5 w-7 h-7 inline-flex items-center justify-center rounded-md text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)] hover:bg-[var(--p-bg-subtle)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="text-base font-medium text-[var(--p-text-primary)]">
          The editor needs a wider screen
        </div>
        <div className="text-xs leading-relaxed text-[var(--p-text-secondary)]">
          Building rooms is a hands-on, drag-and-drop affair — best on a
          tablet or laptop for now. We're working on something special
          for phones in V3. For now, open this on a wider screen to keep
          building.
        </div>
        <div className="flex gap-2 pt-2">
          {onBackToChat && (
            <Button
              variant="default"
              size="md"
              onClick={onBackToChat}
              className="flex-1"
            >
              Back to chat
            </Button>
          )}
          <Button
            variant="default"
            size="md"
            onClick={onBackToStudy}
            className="flex-1"
          >
            Back to The Study
          </Button>
        </div>
      </Card>
    </div>
  )
}
