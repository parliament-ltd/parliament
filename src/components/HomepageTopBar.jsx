// HomepageTopBar — page-level chrome above the V2 homepage.
//
// Per phase-1-pr-plan.md PR-6 scope:
//   Parliament mark | breadcrumb slot | Edit homepage | + Build a room
//   | settings gear | Backup & Restore
//
// "Edit homepage", "+ Build a room", and "Backup & Restore" are
// placeholders here — they get wired up at PR-8, PR-9, and PR-7
// respectively. They render disabled with a "coming soon" tooltip so
// the topbar shape is final from PR-6 onward.

import { Settings as SettingsIcon, Database } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

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
const BTN_DEFAULT = `${BTN_BASE} border-[var(--p-border)] bg-white text-[var(--p-text-primary)]`
const BTN_DISABLED = `${BTN_BASE} border-[var(--p-border-subtle)] bg-white text-[var(--p-text-muted)] cursor-not-allowed`
const BTN_PRIMARY_DISABLED = `${BTN_BASE} border-[var(--p-accent-gold,#B8A070)] bg-[var(--p-accent-gold,#B8A070)] text-white opacity-60 cursor-not-allowed`

const ICON_BTN_BASE = 'inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-colors'
const ICON_BTN_DEFAULT = `${ICON_BTN_BASE} border-[var(--p-border)] bg-white text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)] hover:border-[var(--p-accent-gold,#B8A070)]`
const ICON_BTN_DISABLED = `${ICON_BTN_BASE} border-[var(--p-border-subtle)] bg-white text-[var(--p-text-muted)] cursor-not-allowed`

export default function HomepageTopBar({ breadcrumb }) {
  const navigate = useNavigate()

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

      <button
        type="button"
        disabled
        title="Editor coming soon (PR-8)"
        className={BTN_DISABLED}
      >
        Edit homepage
      </button>

      <button
        type="button"
        disabled
        title="Builder coming soon (PR-9)"
        className={BTN_PRIMARY_DISABLED}
      >
        + Build a room
      </button>

      <button
        type="button"
        disabled
        title="Backup & restore coming soon (PR-7)"
        className={ICON_BTN_DISABLED}
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
