// HomepageTopBar — page-level chrome above The Study (V2 homepage) and
// the Build wizard.
//
// PR-19e renamed homepage → The Study and swapped the gold "+ Build a
// room" Home icon for two clearer entry points:
//   Parliament mark | The Study / breadcrumb | (spacer) | Backup dot |
//   Wrench (Open the Lab) | Wand2 (Build with the Wizard — gold) |
//   Database (Backup) | Settings
//
// The Lab is the editor; the Wand is the guided build flow. Both
// entries are reachable from any surface that mounts this top bar.
// Backup is preserved (the design doc spec drops it, but it's core to
// the no-backend story so we keep it).

import { Settings as SettingsIcon, Database, Wand2, Wrench } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useBackup } from '../stores/BackupContext'
import BackupStatusIndicator from './BackupStatusIndicator'
import ParliamentMark from './ParliamentMark'

const ICON_BTN = 'inline-flex items-center justify-center w-8 h-8 rounded-md text-[var(--p-text-secondary)] hover:text-[var(--p-gold-light)] transition-colors'
const ICON_BTN_PRIMARY = 'inline-flex items-center justify-center w-8 h-8 rounded-md text-[var(--p-gold-light)] hover:text-[var(--p-gold-muted)] transition-colors'

export default function HomepageTopBar({ breadcrumb }) {
  const navigate = useNavigate()
  const { openBackup } = useBackup()

  return (
    <div className="flex items-center gap-3 px-4 sm:px-6 py-3 bg-white border-b border-[var(--p-border)]">
      {/* PR-29: brand cluster (mark + wordmark) is now a clickable
          anchor back to The Study. Previously the Parliament mark was
          static SVG with no handler — users in the wizard on mobile
          had no way to escape back home from the top bar. */}
      <button
        type="button"
        onClick={() => navigate('/')}
        title="Go to The Study"
        aria-label="Go to The Study"
        className="flex items-center gap-2 text-[var(--p-text-primary)] font-medium shrink-0 rounded-md hover:opacity-80 transition-opacity"
      >
        <ParliamentMark />
        {/* Wordmark hides below 480px to give the breadcrumb + icons room.
            The bird-mark icon stays as the brand anchor. */}
        <span className="text-sm hidden min-[480px]:inline">Parliament</span>
      </button>

      {breadcrumb && (
        <>
          <span className="text-[var(--p-text-light)] text-sm select-none" aria-hidden="true">/</span>
          <div className="text-sm text-[var(--p-text-secondary)] min-w-0 truncate">
            {breadcrumb}
          </div>
        </>
      )}

      <div className="flex-1" />

      <BackupStatusIndicator />

      <button
        type="button"
        onClick={() => navigate('/edit?tab=rooms')}
        title="Open the Lab"
        aria-label="Open the Lab"
        className={ICON_BTN}
      >
        <Wrench className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => navigate('/build')}
        title="Build a room with the Wizard"
        aria-label="Build a room with the Wizard"
        className={ICON_BTN_PRIMARY}
      >
        <Wand2 className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => openBackup('backup')}
        title="Backup & restore (Cmd+Shift+B)"
        aria-label="Backup & restore"
        className={ICON_BTN}
      >
        <Database className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => navigate('/settings')}
        className={`${ICON_BTN} settings-icon-spin-host`}
        aria-label="Settings"
        title="Settings"
        data-tour="settings-btn"
      >
        <SettingsIcon className="w-4 h-4 settings-icon-spin" />
      </button>
    </div>
  )
}
