// Retired with R27, approved by Stefan on 22 October 2026: The backup banner on the homepage (its rules stay in lib/backupReminder.js, which Records' line uses).
// Was src/components/BackupReminderBanner.jsx. Nothing imports it and it is not built. To restore:
// Move it back with the homepage.

// BackupReminderBanner — proactive nudge on the homepage.
//
// When it shows lives in lib/backupReminder.js: per spec §5.1 after some
// work and thirty days without a backup, and much sooner, with plainer
// words, when the browser has not agreed to keep the data (C94). Dismissal
// is persisted in IndexedDB.

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDownToLine, X } from 'lucide-react'
import { dismissBackupBanner, backupReminderState } from '../lib/backup'
import { useBackup } from '../stores/BackupContext'

export default function BackupReminderBanner() {
  const [visible, setVisible] = useState(false)
  const [atRisk, setAtRisk] = useState(false)
  const { openBackup, modalOpen } = useBackup()

  useEffect(() => {
    let cancelled = false
    async function check() {
      const state = await backupReminderState()
      if (!cancelled) {
        setVisible(state.show)
        setAtRisk(state.atRisk)
      }
    }
    check()
    return () => { cancelled = true }
  }, [])

  // Re-check after the modal closes — a successful backup hides the banner
  // for 30 days, so it should disappear without a reload.
  useEffect(() => {
    if (modalOpen) return
    let cancelled = false
    backupReminderState().then((state) => {
      if (!cancelled) {
        setVisible(state.show)
        setAtRisk(state.atRisk)
      }
    })
    return () => { cancelled = true }
  }, [modalOpen])

  async function handleDismiss() {
    await dismissBackupBanner()
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22 }}
          className="flex items-center gap-3 px-4 py-3 rounded-lg mb-4"
          style={{
            background: 'rgba(196, 169, 77, 0.08)',
            border: '0.5px solid var(--p-gold-light)',
          }}
          role="region"
          aria-label="Backup reminder"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(196, 169, 77, 0.16)', color: '#8B6A10' }}
          >
            <ArrowDownToLine className="w-4 h-4" />
          </div>
          <div className="flex-1 leading-[1.5]">
            <div className="text-[13px] font-medium mb-px" style={{ color: '#8B6A10' }}>
              {atRisk ? 'This browser may delete your Parliament' : 'Your Parliament lives in this browser'}
            </div>
            <div className="text-xs text-[var(--p-text-secondary)]">
              {atRisk
                ? "It has not agreed to keep this site's data, and some browsers delete it when they close. Save a backup now, and allow this site to keep its cookies and site data in your browser's privacy settings."
                : 'If you clear your data or switch devices, your rooms and chats are gone. Take a minute to back them up.'}
            </div>
          </div>
          <button
            onClick={() => openBackup('backup')}
            className="px-3.5 py-1.5 text-xs font-medium rounded-md text-white whitespace-nowrap transition-colors"
            style={{ background: 'var(--p-gold-light)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--p-gold-muted)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--p-gold-light)')}
          >
            Create a backup
          </button>
          <button
            onClick={handleDismiss}
            className="w-6 h-6 rounded-sm flex items-center justify-center text-[var(--p-gold-muted)] hover:bg-[rgba(196,169,77,0.15)] transition-colors"
            aria-label="Dismiss"
            title="Dismiss for 30 days"
          >
            <X className="w-3 h-3" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
