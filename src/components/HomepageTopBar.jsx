// HomepageTopBar — page-level chrome above the V2 homepage.
//
// Per phase-1-pr-plan.md PR-6 scope:
//   Parliament mark | breadcrumb slot | Edit homepage | + Build a room
//   | settings gear | Backup & Restore
//
// + Build a room landed at PR-9: routes to /build, which surfaces the
// template gallery + 7-step wizard. Both paths produce a fresh mode
// file and route the user to /edit/:newId.
//
// Backup & Restore landed at PR-7: the icon button opens the modal; a
// status indicator (gold/amber/red dot per backup age) sits next to it.
//
// Edit homepage landed at PR-8: routes to the three-rail editor at
// /edit-home, which loads the user's homepage mode for editing.

import { Settings as SettingsIcon, Database } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useBackup } from '../stores/BackupContext'
import BackupStatusIndicator from './BackupStatusIndicator'

const PARLIAMENT_MARK_PATH = (
  <svg width="18" height="16" viewBox="0 0 26 24" fill="none" aria-hidden="true">
    <rect x="0"     y="20" width="26"  height="2.5" rx=".8" fill="currentColor"/>
    <rect x="2"     y="16" width="22"  height="2"   rx=".6" fill="currentColor"/>
    <rect x="4"     y="4"  width="18"  height="2"   rx=".6" fill="currentColor"/>
    <rect x="10"    y="1"  width="6"   height="3"   rx=".6" fill="currentColor"/>
    <rect x="4"     y="6"  width="2.5" height="10"  rx=".6" fill="currentColor"/>
    <rect x="8.75"  y="6"  width="2.5" height="10"  rx=".6" fill="currentColor"/>
    <rect x="13.5"  y="6"  width="2.5" height="10"  rx=".6" fill="currentColor"/>
    <rect x="18.25" y="6"  width="2.5" height="10"  rx=".6" fill="currentColor"/>
  </svg>
)

const BTN_BASE = 'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors'
const BTN_DEFAULT = `${BTN_BASE} border-[var(--p-border)] bg-white text-[var(--p-text-secondary)] hover:border-[var(--p-gold-light)] hover:text-[var(--p-gold-light)]`
const BTN_PRIMARY = `${BTN_BASE} border-[var(--p-accent-gold,#B8A070)] bg-[var(--p-accent-gold,#B8A070)] text-white hover:bg-[var(--p-gold-muted)] hover:border-[var(--p-gold-muted)]`

const ICON_BTN_BASE = 'inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-colors'
const ICON_BTN_DEFAULT = `${ICON_BTN_BASE} border-[var(--p-border)] bg-white text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)] hover:border-[var(--p-accent-gold,#B8A070)]`

export default function HomepageTopBar({ breadcrumb }) {
  const navigate = useNavigate()
  const { openBackup } = useBackup()

  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-[var(--p-border)]">
      <div className="flex items-center gap-2 text-[var(--p-text-primary)] font-medium">
        {PARLIAMENT_MARK_PATH}
        <span className="text-sm">Parliament</span>
      </div>

      <div className="text-xs text-[var(--p-text-muted)]">
        {breadcrumb || ''}
      </div>

      <div className="flex-1" />

      <BackupStatusIndicator />

      <button
        type="button"
        onClick={() => navigate('/edit-home')}
        title="Open the homepage in the editor"
        className={BTN_DEFAULT}
      >
        Edit homepage
      </button>

      <button
        type="button"
        onClick={() => navigate('/build')}
        title="Build a new room"
        className={BTN_PRIMARY}
      >
        + Build a room
      </button>

      <button
        type="button"
        onClick={() => openBackup('backup')}
        title="Backup & restore (Cmd+Shift+B)"
        className={ICON_BTN_DEFAULT}
        aria-label="Backup & restore"
      >
        <Database className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => navigate('/settings')}
        className={ICON_BTN_DEFAULT}
        aria-label="Settings"
        data-tour="settings-btn"
      >
        <SettingsIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
