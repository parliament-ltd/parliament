// EditorTopBar — back, "The Lab" crumb, device chip, scheme chip,
// center Build/Edit mode pills, undo/redo, Preview, primary action.
//
// PR-19c:
//   - Room name input removed from the top bar. Identity editing now
//     lives only in the right rail (one entry point per task).
//   - Single contextual primary action:
//       meta.builtAt == null → "Build"  → routes to /build?ignite=:roomId
//       meta.builtAt is set  → "Save"   → onSave (persist in place)
//     The duplicate Save+Build pair from PR-8 is gone; the wizard owns
//     the celebratory Ignite moment for the "Build" semantics.
//
// PR-19e:
//   - "Editing" crumb renamed to "THE LAB" (the editor IS The Lab).
//   - Center Build/Edit pills indicate the current sub-mode and let the
//     user switch. Click Build while editing a room → copies the
//     current canvas state into a fresh room (parent calls onStartCopy).
//     Click Edit while on blank canvas → opens the Rooms tab so the
//     user can pick a room to edit.

import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Smartphone, Monitor, Eye, Undo2, Redo2, Wrench, Wand2 } from 'lucide-react'
import { SCHEMES } from '../../lib/schemes'
import { normalizeRef } from '../../lib/refs'

const isMac =
  typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || '')
const undoShortcut = isMac ? '⌘Z' : 'Ctrl+Z'
const redoShortcut = isMac ? '⌘⇧Z' : 'Ctrl+Shift+Z'

export default function EditorTopBar({
  mode,
  dirty,
  saving,
  trayBlockingBuild,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onBack,
  onDeviceClassChange,
  onSchemeChange,
  onSave,
  onPreview,
  // PR-19e: Build/Edit pill state + handlers.
  // labMode is 'build' | 'edit' — drives which pill is active.
  // onStartCopy fires when user clicks Build from Edit (copies current
  // canvas state into a fresh draft). onSwitchToEdit fires when user
  // clicks Edit from blank canvas (opens rooms picker).
  labMode = 'edit',
  onStartCopy,
  onSwitchToEdit,
}) {
  const navigate = useNavigate()
  const deviceClass = mode?.deviceClass || 'visual-pointer'
  const isMobile = deviceClass === 'visual-touch-phone'
  const schemeRef = mode?.scheme?.ref
  const normalizedSchemeRef = normalizeRef(schemeRef)
  const scheme = SCHEMES.find((s) => `${s.id}@1.0` === normalizedSchemeRef || s.id === normalizedSchemeRef)
  const schemeLabel = scheme?.displayName || schemeRef || 'Default scheme'
  const schemeSwatch = scheme?.variants?.light?.['gold-light'] || scheme?.variants?.light?.['gold'] || '#C4A94D'

  // PR-19c: contextual primary action. builtAt === null on rooms the
  // user hasn't committed via Ignition yet (Build it myself, Open in
  // editor, Template gallery). Once built, label switches to Save.
  // PR-19d: blank canvas (no mode) forces Save semantics; the button
  // stays disabled until a layout is placed AND a name is entered.
  const isBlank = !mode
  const isUnbuilt = mode?.meta?.builtAt == null && !isBlank
  const isUnnamed = !!mode && !mode.meta?.name?.trim()
  const primaryLabel = isBlank || isUnbuilt ? 'Build' : 'Save'
  const primaryDisabled = isBlank
    ? true
    : isUnbuilt
      ? (saving || trayBlockingBuild || isUnnamed)
      : (saving || !dirty || isUnnamed)
  const primaryTitle = isBlank
    ? 'Drop a layout or room first'
    : isUnnamed
      ? 'Name your room first'
      : trayBlockingBuild
        ? 'Empty the holding tray first'
        : ''

  const onPrimary = () => {
    if (primaryDisabled) return
    if (isUnbuilt) {
      // Route to the wizard's Ignition step in existing-room mode.
      // BuildView reads ?ignite=:roomId, loads the mode, and reuses
      // IgnitionStep for the API-key + animation + three-button flow.
      navigate(`/build?ignite=${mode.id}`)
      return
    }
    onSave()
  }

  // PR-19e: Build/Edit pill clicks.
  const buildActive = labMode === 'build'
  const editActive = labMode === 'edit'
  const onPillEdit = () => {
    if (editActive) return
    if (onSwitchToEdit) onSwitchToEdit()
  }
  const onPillBuild = () => {
    if (buildActive) return
    if (onStartCopy) onStartCopy()
  }

  return (
    <div className="h-[52px] flex items-center px-4 bg-white border-b border-[var(--p-border)] gap-3">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <button
          onClick={onBack}
          className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--p-text-secondary)] hover:bg-[var(--p-bg-subtle)] hover:text-[var(--p-text-primary)] transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <span className="w-px h-5 bg-[var(--p-border)]" />
        <span className="text-[11px] uppercase tracking-wider font-medium text-[var(--p-text-muted)]">
          The Lab
        </span>
        <span className="w-px h-5 bg-[var(--p-border)]" />
        <button
          onClick={() => onDeviceClassChange(isMobile ? 'visual-pointer' : 'visual-touch-phone')}
          disabled={isBlank}
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--p-bg-subtle)] border border-[var(--p-border)] text-[11px] text-[var(--p-text-secondary)] transition-colors ${isBlank ? 'opacity-40 cursor-not-allowed' : 'hover:border-[var(--p-gold-light)] hover:text-[var(--p-gold-light)]'}`}
          title="Toggle device class"
        >
          {isMobile ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
          {isMobile ? 'Mobile' : 'Desktop'}
        </button>
        <button
          onClick={() => onSchemeChange(schemeRef)}
          disabled={isBlank}
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--p-bg-subtle)] border border-[var(--p-border)] text-[11px] text-[var(--p-text-secondary)] transition-colors ${isBlank ? 'opacity-40 cursor-not-allowed' : 'hover:border-[var(--p-gold-light)] hover:text-[var(--p-gold-light)]'}`}
          title="Switch via the Schemes tab in the left rail, or drop a scheme on the canvas"
        >
          <span
            className="w-2.5 h-2.5 rounded-full border border-black/10"
            style={{ backgroundColor: schemeSwatch }}
          />
          {schemeLabel}
        </button>
      </div>

      {/* PR-19e: center Build/Edit mode pills. Build copies the current
          canvas state into a fresh draft; Edit opens the Rooms tab.
          Hidden on /edit-home (labMode === null). */}
      {labMode && (
        <div className="flex items-center rounded-full border border-[var(--p-border)] bg-[var(--p-bg-subtle)] p-0.5 shrink-0">
          <button
            type="button"
            onClick={onPillEdit}
            title="Enter editing mode to edit an existing room"
            aria-pressed={editActive}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
              editActive
                ? 'bg-white text-[var(--p-text-primary)] shadow-sm'
                : 'text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)]'
            }`}
          >
            <Wrench className="w-3 h-3" />
            Edit
          </button>
          <button
            type="button"
            onClick={onPillBuild}
            title="Build a new room"
            aria-pressed={buildActive}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
              buildActive
                ? 'bg-white text-[var(--p-gold-deep,#8B6A10)] shadow-sm'
                : 'text-[var(--p-text-secondary)] hover:text-[var(--p-gold-light)]'
            }`}
          >
            <Wand2 className="w-3 h-3" />
            Build
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 flex-1 justify-end">
        <div className="flex items-center gap-0.5 mr-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title={`Undo (${undoShortcut})`}
            aria-label="Undo"
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
              canUndo
                ? 'text-[var(--p-text-secondary)] hover:bg-[var(--p-bg-subtle)] hover:text-[var(--p-gold-light)]'
                : 'text-[var(--p-text-muted)] opacity-40 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title={`Redo (${redoShortcut})`}
            aria-label="Redo"
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
              canRedo
                ? 'text-[var(--p-text-secondary)] hover:bg-[var(--p-bg-subtle)] hover:text-[var(--p-gold-light)]'
                : 'text-[var(--p-text-muted)] opacity-40 cursor-not-allowed'
            }`}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          onClick={onPreview}
          title="Preview the room (read-only)"
          className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--p-border)] bg-white text-[var(--p-text-secondary)] hover:border-[var(--p-gold-light)] hover:text-[var(--p-gold-light)] transition-colors inline-flex items-center gap-1.5"
        >
          <Eye className="w-3 h-3" />
          Preview
        </button>
        <button
          onClick={onPrimary}
          disabled={primaryDisabled}
          title={primaryTitle}
          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            primaryDisabled
              ? 'border-[var(--p-gold-light)] bg-[var(--p-gold-light)] text-white opacity-40 cursor-not-allowed'
              : 'border-[var(--p-gold-light)] bg-[var(--p-gold-light)] text-white hover:bg-[var(--p-gold-muted)] hover:border-[var(--p-gold-muted)]'
          }`}
        >
          {saving ? 'Saving…' : primaryLabel}
        </button>
      </div>
    </div>
  )
}
