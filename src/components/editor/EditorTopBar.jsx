// EditorTopBar — back, "Editing" crumb, room name input, device chip,
// scheme chip, Preview/Save/Build buttons.
//
// Build is a deliberate alias for Save in PR-8: the wizard's "Ignite"
// step (PR-9) handles the API-key-light-up moment. After PR-9 lands,
// Build will trigger the wizard's last step.

import { ArrowLeft, Smartphone, Monitor, Eye, Undo2, Redo2 } from 'lucide-react'
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
  onNameChange,
  onDeviceClassChange,
  onSchemeChange,
  onSave,
}) {
  const name = mode?.meta?.name || 'Untitled room'
  const deviceClass = mode?.deviceClass || 'visual-pointer'
  const isMobile = deviceClass === 'visual-touch-phone'
  const schemeRef = mode?.scheme?.ref
  const normalizedSchemeRef = normalizeRef(schemeRef)
  const scheme = SCHEMES.find((s) => `${s.id}@1.0` === normalizedSchemeRef || s.id === normalizedSchemeRef)
  const schemeLabel = scheme?.displayName || schemeRef || 'Default scheme'
  const schemeSwatch = scheme?.variants?.light?.['--p-gold-light'] || '#C4A94D'

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
          Editing
        </span>
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="text-sm font-medium text-[var(--p-text-primary)] bg-transparent border-0 px-2 py-1 rounded outline-none hover:bg-[var(--p-bg-subtle)] focus:bg-[var(--p-bg-subtle)] focus:shadow-[inset_0_0_0_1.5px_var(--p-gold-light)] min-w-[140px] max-w-[280px]"
          aria-label="Room name"
        />
        <span className="w-px h-5 bg-[var(--p-border)]" />
        <button
          onClick={() => onDeviceClassChange(isMobile ? 'visual-pointer' : 'visual-touch-phone')}
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--p-bg-subtle)] border border-[var(--p-border)] text-[11px] text-[var(--p-text-secondary)] hover:border-[var(--p-gold-light)] hover:text-[var(--p-gold-light)] transition-colors"
          title="Toggle device class"
        >
          {isMobile ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
          {isMobile ? 'Mobile' : 'Desktop'}
        </button>
        <button
          onClick={() => onSchemeChange(schemeRef)}
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--p-bg-subtle)] border border-[var(--p-border)] text-[11px] text-[var(--p-text-secondary)] hover:border-[var(--p-gold-light)] hover:text-[var(--p-gold-light)] transition-colors"
          title="Switch via the Schemes tab in the left rail, or drop a scheme on the canvas"
        >
          <span
            className="w-2.5 h-2.5 rounded-full border border-black/10"
            style={{ backgroundColor: schemeSwatch }}
          />
          {schemeLabel}
        </button>
      </div>
      <div className="flex items-center gap-2">
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
          disabled
          title="Preview launches with PR-9"
          className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--p-border-subtle)] bg-white text-[var(--p-text-muted)] cursor-not-allowed inline-flex items-center gap-1.5"
        >
          <Eye className="w-3 h-3" />
          Preview
        </button>
        <button
          onClick={onSave}
          disabled={saving || !dirty}
          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            saving || !dirty
              ? 'border-[var(--p-border)] bg-white text-[var(--p-text-muted)] cursor-not-allowed'
              : 'border-[var(--p-border)] bg-white text-[var(--p-text-secondary)] hover:border-[var(--p-gold-light)] hover:text-[var(--p-gold-light)]'
          }`}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onSave}
          disabled={saving || trayBlockingBuild}
          title={trayBlockingBuild ? 'Empty the holding tray first' : ''}
          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            trayBlockingBuild || saving
              ? 'border-[var(--p-gold-light)] bg-[var(--p-gold-light)] text-white opacity-40 cursor-not-allowed'
              : 'border-[var(--p-gold-light)] bg-[var(--p-gold-light)] text-white hover:bg-[var(--p-gold-muted)] hover:border-[var(--p-gold-muted)]'
          }`}
        >
          Build
        </button>
      </div>
    </div>
  )
}

