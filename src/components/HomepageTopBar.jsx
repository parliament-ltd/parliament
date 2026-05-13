// HomepageTopBar — page-level chrome above the V2 homepage.
//
// PR-14 swapped the labelled buttons for borderless icon buttons:
//   Parliament mark | breadcrumb | (spacer) | Backup status dot |
//   Wrench (Edit homepage) | Home (+ Build a room — gold accent) |
//   Database (Backup) | Settings
//
// Backup is preserved (the design doc spec drops it, but it's core to the
// no-backend story so we keep it). The "+ Build a room" Home icon retains
// its gold tint to read as the primary action.

import { Settings as SettingsIcon, Database, Home, Wrench } from 'lucide-react'
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
      <div className="flex items-center gap-2 text-[var(--p-text-primary)] font-medium shrink-0">
        <ParliamentMark />
        {/* Wordmark hides below 480px to give the breadcrumb + icons room.
            The bird-mark icon stays as the brand anchor. */}
        <span className="text-sm hidden min-[480px]:inline">Parliament</span>
      </div>

      <div className="text-xs text-[var(--p-text-muted)] min-w-0 truncate">
        {breadcrumb || ''}
      </div>

      <div className="flex-1" />

      <BackupStatusIndicator />

      <button
        type="button"
        onClick={() => navigate('/edit-home')}
        title="Edit homepage"
        aria-label="Edit homepage"
        className={ICON_BTN}
      >
        <Wrench className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => navigate('/build')}
        title="Build a room"
        aria-label="Build a room"
        className={ICON_BTN_PRIMARY}
      >
        <Home className="w-4 h-4" />
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
