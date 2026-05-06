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
import { useNavigate, useParams } from 'react-router-dom'
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import EditorTopBar from '../components/editor/EditorTopBar'
import EditorLeftRail from '../components/editor/EditorLeftRail'
import EditorCanvas from '../components/editor/EditorCanvas'
import EditorRightRail from '../components/editor/EditorRightRail'
import EditorHoldingTray from '../components/editor/EditorHoldingTray'
import EditorMigrationDialog from '../components/editor/EditorMigrationDialog'
import EditorPreviewSheet from '../components/editor/EditorPreviewSheet'
import Card from '../components/Card'
import Button from '../components/Button'
import {
  editorHistoryReducer,
  makeInitialHistoryState,
  canUndo,
  canRedo,
} from '../lib/editorHistory'
import { planLayoutMigration } from '../lib/layoutMigration'
import { loadHomepageMode, loadMode, saveMode } from '../lib/modes'
import { useIsNarrow } from '../lib/useViewportWidth'
import { listEntries as listCatalogEntries } from '../catalog'

export default function EditorView({ scope = 'room' }) {
  const navigate = useNavigate()
  const { roomId } = useParams()
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
  const [previewOpen, setPreviewOpen] = useState(false)

  // ── Load the mode on mount ─────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
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
  }, [scope, roomId])

  // ── Toast helper ───────────────────────────────────────
  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }, [])

  // ── Save ───────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (saving) return
    if (state.tray.length > 0) {
      showToast('Empty the holding tray first.')
      return
    }
    setSaving(true)
    try {
      const saved = await saveMode(state.mode)
      // MARK_SAVED (not RESET_TO) so undo history survives a save.
      dispatch({ type: 'MARK_SAVED', mode: saved })
      showToast('Saved')
    } catch (err) {
      showToast(err.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }, [saving, state.tray.length, state.mode, showToast])

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

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over) return
    const dragData = active.data.current
    const dropData = over.data.current
    if (!dragData || !dropData) return

    // Layout dropped on canvas → migration dialog
    if (dragData.kind === 'layout' && dropData.kind === 'canvas') {
      const layoutRef = dragData.ref
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

    // Scheme dropped on canvas → apply
    if (dragData.kind === 'scheme' && (dropData.kind === 'canvas' || dropData.kind === 'slot')) {
      dispatch({ type: 'APPLY_SCHEME', schemeRef: dragData.ref })
      showToast(`Applied scheme: ${dragData.displayName}`)
      return
    }

    // Component dropped on a slot
    if (dragData.kind === 'component' && dropData.kind === 'slot') {
      // Already-placed instance moving between slots
      if (dragData.componentId) {
        dispatch({
          type: 'MOVE_COMPONENT',
          componentId: dragData.componentId,
          slot: dropData.slot,
        })
        return
      }
      // Tray chip dropped back into a slot
      if (dragData.fromTray) {
        dispatch({
          type: 'RESTORE_FROM_TRAY',
          compId: dragData.componentId || dragData.trayCompId,
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
    return <EditorTooNarrow onBack={() => navigate('/')} />
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

  const placedRefs = new Set((state.mode.components || []).map((c) => c.ref))
  const catalogEntries = listCatalogEntries()

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="h-screen flex flex-col bg-[var(--p-bg-subtle)] overflow-hidden">
        <EditorTopBar
          mode={state.mode}
          dirty={state.dirty}
          saving={saving}
          trayBlockingBuild={state.tray.length > 0}
          canUndo={undoAvailable}
          canRedo={redoAvailable}
          onUndo={() => dispatch({ type: 'UNDO' })}
          onRedo={() => dispatch({ type: 'REDO' })}
          onBack={() => navigate('/')}
          onNameChange={(name) => dispatch({ type: 'SET_NAME', name })}
          onDeviceClassChange={(deviceClass) => dispatch({ type: 'SET_DEVICE_CLASS', deviceClass })}
          onSchemeChange={(schemeRef) => dispatch({ type: 'APPLY_SCHEME', schemeRef })}
          onSave={handleSave}
          onPreview={() => setPreviewOpen(true)}
        />
        <div className="grid grid-cols-[240px_1fr_300px] flex-1 min-h-0">
          <EditorLeftRail
            scope={scope}
            currentLayoutRef={state.mode.layout?.ref}
            currentSchemeRef={state.mode.scheme?.ref}
            placedComponentRefs={placedRefs}
            catalogEntries={catalogEntries}
          />
          <div className="overflow-y-auto bg-[var(--p-bg-subtle)]">
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
function EditorTooNarrow({ onBack }) {
  return (
    <div className="min-h-screen bg-[var(--p-bg-base)] flex items-center justify-center px-6">
      <Card className="max-w-md w-full text-center flex flex-col gap-4 py-6">
        <div className="text-base font-medium text-[var(--p-text-primary)]">
          The editor needs a wider screen
        </div>
        <div className="text-xs leading-relaxed text-[var(--p-text-secondary)]">
          Building rooms is a hands-on, drag-and-drop affair — best on a
          tablet or laptop for now. We're working on something special
          for phones in V3. For now, open this on a wider screen to keep
          building.
        </div>
        <div className="flex justify-center pt-2">
          <Button variant="default" size="md" onClick={onBack}>
            Back to home
          </Button>
        </div>
      </Card>
    </div>
  )
}
