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

import { ArrowLeft, Smartphone, Monitor, Eye, Undo2, Redo2, Wrench, Wand2, LibraryBig } from 'lucide-react'
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
  // PR-28: onBuild fires when the user clicks the primary "Build" button
  // on a never-built mode. EditorView saves the mode first (so the
  // wizard's ?ignite=:id can actually find it in IDB) then navigates.
  // Previously this view inlined the navigate(), which broke for any
  // mode whose id hadn't been persisted yet.
  onBuild,
  onPreview,
  // PR-19e: Build/Edit pill state + handlers.
  // labMode is 'build' | 'edit' — drives which pill is active.
  // onStartCopy fires when user clicks Build from Edit (copies current
  // canvas state into a fresh draft). onSwitchToEdit fires when user
  // clicks Edit from blank canvas (opens rooms picker).
  labMode = 'edit',
  onStartCopy,
  onSwitchToEdit,
  // PR-44: third pill — Library. libraryOpen=true means the center
  // column is showing the Library shopping UI in place of the canvas.
  // onOpenLibrary opens it, onCloseLibrary closes it (also called by
  // Build/Edit pills when Library is open, since switching away from
  // Library is the implicit close).
  libraryOpen = false,
  onOpenLibrary,
  onCloseLibrary,
  // PR-45: Build/Edit pill clicks while Library is open run the bag's
  // diff against the draft via this callback. Returns true on success,
  // false if a conflict (>1 layout or >1 scheme in the union) refused
  // the commit — in that case the pill click is a no-op and the user
  // stays in Library to resolve.
  onCommitLibrary,
}) {
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
  // PR-47: surface the disabled-reason in a hover tooltip on the
  // primary button. Ordered by severity (most fundamental fix first)
  // so the user is guided toward an actionable next step.
  const primaryDisabledReason = isBlank
    ? 'Please add a layout to start.'
    : isUnnamed
      ? 'Please enter a room name.'
      : trayBlockingBuild
        ? 'Please clear the holding tray first.'
        : !isUnbuilt && !dirty
          ? 'No unsaved changes.'
          : saving
            ? 'Saving…'
            : ''

  const onPrimary = () => {
    if (primaryDisabled) return
    if (isUnbuilt) {
      // PR-28: route through EditorView's handleBuild, which saves
      // the mode first (so IDB has it) and then navigates to
      // /build?ignite=:savedId. The wizard reads ?ignite and reuses
      // IgnitionStep for the API-key + animation + three-button flow.
      onBuild?.()
      return
    }
    onSave()
  }

  // PR-19e: Build/Edit pill clicks. PR-44 adds Library; when Library is
  // open the canvas-side pills (Build/Edit) reflect the route-derived
  // state but show as inactive — clicking one closes Library AND fires
  // its existing navigation handler if a real switch is needed.
  const libraryActive = libraryOpen
  const buildActive = !libraryOpen && labMode === 'build'
  const editActive = !libraryOpen && labMode === 'edit'
  const onPillLibrary = () => {
    if (libraryActive) return
    if (onOpenLibrary) onOpenLibrary()
  }
  // PR-45: closing Library via Build/Edit pill commits the bag first.
  // A conflict refusal aborts both the commit AND the close, so the
  // user stays in Library to resolve.
  const commitIfOpen = () => {
    if (!libraryOpen) return true
    if (onCommitLibrary && !onCommitLibrary()) return false
    onCloseLibrary?.()
    return true
  }
  const onPillEdit = () => {
    // Library open + already on the edit route: just commit + close.
    if (libraryOpen && labMode === 'edit') {
      commitIfOpen()
      return
    }
    if (editActive) return
    if (!commitIfOpen()) return
    if (onSwitchToEdit) onSwitchToEdit()
  }
  const onPillBuild = () => {
    if (libraryOpen && labMode === 'build') {
      commitIfOpen()
      return
    }
    if (buildActive) return
    // PR-48d: forking from Edit with Library open — onStartCopy
    // applies the bag to the FORK (not the source). Skip the
    // commit-to-current path so the source room stays clean.
    if (libraryOpen) {
      onStartCopy?.()
      return
    }
    if (!commitIfOpen()) return
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

      {/* PR-19e: center Library | Build | Edit mode pills. Library shows
          the shopping UI in the center column; Build copies the current
          canvas state into a fresh draft; Edit opens the Rooms tab.
          Hidden on /edit-home (labMode === null). PR-44 added Library. */}
      {labMode && (
        <div className="flex items-center rounded-full border border-[var(--p-border)] bg-[var(--p-bg-subtle)] p-0.5 shrink-0">
          <button
            type="button"
            onClick={onPillLibrary}
            title="Browse layouts, components, schemes, and rooms"
            aria-pressed={libraryActive}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
              libraryActive
                ? 'bg-white text-[var(--p-gold-deep,#8B6A10)] shadow-sm'
                : 'text-[var(--p-text-secondary)] hover:text-[var(--p-gold-light)]'
            }`}
          >
            <LibraryBig className="w-3 h-3" />
            Library
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
        <div className="primary-action-wrap">
          <button
            onClick={onPrimary}
            disabled={primaryDisabled}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              primaryDisabled
                ? 'border-[var(--p-gold-light)] bg-[var(--p-gold-light)] text-white opacity-40 cursor-not-allowed'
                : 'border-[var(--p-gold-light)] bg-[var(--p-gold-light)] text-white hover:bg-[var(--p-gold-muted)] hover:border-[var(--p-gold-muted)]'
            }`}
          >
            {saving ? 'Saving…' : primaryLabel}
          </button>
          {primaryDisabled && primaryDisabledReason && (
            <div className="primary-action-tooltip" role="status">
              {primaryDisabledReason}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
