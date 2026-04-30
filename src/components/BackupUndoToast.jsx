// BackupUndoToast — surfaces the 60s undo window after a Replace restore.
//
// Per spec §5.4: "Show an Undo toast: 'Replaced with backup. Undo restore'.
// If user clicks Undo, restore the auto-backup and discard the imported
// data. After 60 seconds, discard the auto-backup."
//
// The auto-backup snapshot lives in BackupContext (`undoState.contents`).
// Clicking Undo here pulls that snapshot, runs a replace strategy with it,
// and reloads so React state matches IndexedDB again.

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Undo2 } from 'lucide-react'
import { useBackup } from '../stores/BackupContext'
import { restoreContents } from '../lib/backup'

export default function BackupUndoToast({ onClear }) {
  const { undoState } = useBackup()
  const [working, setWorking] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(() =>
    undoState ? Math.max(0, Math.floor((undoState.deadline - Date.now()) / 1000)) : 0
  )

  useEffect(() => {
    if (!undoState) return
    const id = setInterval(() => {
      const left = Math.max(0, Math.floor((undoState.deadline - Date.now()) / 1000))
      setSecondsLeft(left)
    }, 1000)
    return () => clearInterval(id)
  }, [undoState])

  if (!undoState) return null

  async function handleUndo() {
    if (working) return
    setWorking(true)
    try {
      await restoreContents(undoState.contents, { strategy: 'replace' })
      onClear()
      window.location.reload()
    } catch (err) {
      console.error('[backup undo] failed', err)
      setWorking(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-4 py-2.5 rounded-md text-xs shadow-2xl"
      style={{ background: 'var(--p-text-primary)', color: 'white' }}
      role="status"
      aria-live="polite"
    >
      <span className="font-medium">Replaced with backup.</span>
      <span className="text-white/70">{secondsLeft}s</span>
      <button
        disabled={working}
        onClick={handleUndo}
        className="flex items-center gap-1 px-2.5 py-1 rounded-sm border border-white/30 hover:border-white/60 text-white transition-colors disabled:opacity-50"
      >
        <Undo2 className="w-3 h-3" />
        Undo restore
      </button>
    </motion.div>
  )
}
