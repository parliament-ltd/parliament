// Retired with R27, approved by Stefan on 22 October 2026: The backup status dot in the top bar.
// Was src/components/BackupStatusIndicator.jsx. Nothing imports it and it is not built. To restore:
// Move it back and draw it in src/components/HomepageTopBar.jsx.

// BackupStatusIndicator — colored dot in the top bar showing backup age.
//
// Per spec §5.2:
//   gold:  < 14 days
//   amber: 14–44 days
//   red:   45+ days
// Never backed up shows amber unless the account is < 7 days old (gold).
//
// On click, opens the backup/restore modal directly to the backup tab.
// Tooltip shows the exact date.

import { useEffect, useState } from 'react'
import { getBackupStatus } from '../lib/backup'
import { useBackup } from '../stores/BackupContext'

const DOT_COLORS = {
  gold: 'var(--p-gold-light)',
  amber: '#D9730D',
  red: '#E03E3E',
}

export default function BackupStatusIndicator() {
  const [status, setStatus] = useState(null)
  const { openBackup, modalOpen } = useBackup()

  useEffect(() => {
    let cancelled = false
    getBackupStatus().then((s) => { if (!cancelled) setStatus(s) })
    return () => { cancelled = true }
  }, [])

  // Refresh when the modal closes — a fresh backup updates the status dot.
  useEffect(() => {
    if (modalOpen) return
    getBackupStatus().then(setStatus)
  }, [modalOpen])

  if (!status) return null

  const tooltip = status.lastBackedUpAt
    ? `Last backup: ${new Date(status.lastBackedUpAt).toLocaleString()}`
    : 'Never backed up'

  return (
    <button
      onClick={() => openBackup('backup')}
      className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-[var(--p-text-muted)] hover:text-[var(--p-text-secondary)] transition-colors"
      title={tooltip}
      aria-label={`Backup status: ${status.label}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full inline-block"
        style={{ backgroundColor: DOT_COLORS[status.color] || DOT_COLORS.gold }}
      />
      <span className="hidden sm:inline">{status.label}</span>
    </button>
  )
}
