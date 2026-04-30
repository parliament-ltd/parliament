// BackupReminderBanner — proactive nudge on the homepage.
//
// Threshold logic lives in lib/backup.js (`shouldShowBackupBanner`).
// Per spec §5.1: shows when (≥5 chats OR ≥2 rooms OR account ≥7 days old)
// AND last backup was more than 30 days ago, AND not dismissed in last 30
// days. Dismissal is persisted in IndexedDB.

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDownToLine, X } from 'lucide-react'
import { dismissBackupBanner, shouldShowBackupBanner } from '../lib/backup'
import { useBackup } from '../stores/BackupContext'

export default function BackupReminderBanner() {
  const [visible, setVisible] = useState(false)
  const { openBackup, modalOpen } = useBackup()

  useEffect(() => {
    let cancelled = false
    async function check() {
      const should = await shouldShowBackupBanner()
      if (!cancelled) setVisible(should)
    }
    check()
    return () => { cancelled = true }
  }, [])

  // Re-check after the modal closes — a successful backup hides the banner
  // for 30 days, so it should disappear without a reload.
  useEffect(() => {
    if (modalOpen) return
    let cancelled = false
    shouldShowBackupBanner().then((should) => {
      if (!cancelled) setVisible(should)
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
              Your Parliament lives in this browser
            </div>
            <div className="text-xs text-[var(--p-text-secondary)]">
              If you clear your data or switch devices, your rooms and chats are gone. Take a minute to back them up.
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
