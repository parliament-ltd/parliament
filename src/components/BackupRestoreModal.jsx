// BackupRestoreModal — V2 unified backup/restore surface.
//
// Spec: refactor/parliament_backup_restore_implementation.md
// Mockup: refactor/parliament_backup_restore_v1.html
//
// One modal, two tabs. Backup tab gathers categories and triggers a
// download. Restore tab takes a file (drag-drop or click-to-browse),
// decrypts and previews it, then commits with a merge or replace strategy.
//
// Replace flow includes the destructive REPLACE confirmation per spec §5.5
// and arms an undo toast (handled by BackupContext) for the next 60s.

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Database, Upload, Lock, AlertTriangle, ArrowDownToLine, Check, ArrowRight } from 'lucide-react'
import {
  CATEGORIES,
  buildBackupFile,
  buildManifest,
  decryptBackup,
  downloadBlob,
  flatV1ToContents,
  gatherBackupContents,
  getBackupStats,
  getBackupStatus,
  parseBackupFile,
  recordBackup,
  restoreContents,
  validateContents,
} from '../lib/backup'
import { useBackup } from '../stores/BackupContext'

const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 }

// Display metadata for each category. Order here drives the order in the
// UI. The "preferences" category is the only one off by default.
const CATEGORY_META = {
  chats:       { label: 'Chats',                  desc: 'Conversations with full message history' },
  annotations: { label: 'Annotations',            desc: 'Notes, highlights, favorites, pinned references' },
  rooms:       { label: 'Rooms',                  desc: 'Rooms you\'ve built or customized' },
  homepage:    { label: 'Homepage configuration', desc: 'Section order, per-section settings' },
  library:     { label: 'Library items',          desc: 'Installed layouts, components, schemes, resources' },
  preferences: { label: 'Preferences and settings', desc: 'Tour state, UI preferences. Not required for most users.' },
}

const DEFAULT_CHECKED = {
  chats: true,
  annotations: true,
  rooms: true,
  homepage: true,
  library: true,
  preferences: false,
}

function formatBytes(b) {
  if (!b || b < 1024) return `${b || 0} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

function statusDotColor(color) {
  if (color === 'red') return '#E03E3E'
  if (color === 'amber') return '#D9730D'
  return 'var(--p-gold-light)'
}

export default function BackupRestoreModal({ initialTab = 'backup', onClose }) {
  const [tab, setTab] = useState(initialTab)
  const [stats, setStats] = useState(null)
  const [status, setStatus] = useState(null)
  const [working, setWorking] = useState(false)
  const [toast, setToast] = useState('')

  // Backup pane state
  const [checked, setChecked] = useState(DEFAULT_CHECKED)
  const [passwordOn, setPasswordOn] = useState(false)
  const [password, setPassword] = useState('')

  // Restore pane state
  const [parsedFile, setParsedFile] = useState(null) // { kind, envelope, raw, file }
  const [restoreContentsState, setRestoreContentsState] = useState(null) // resolved contents
  const [restorePassword, setRestorePassword] = useState('')
  const [restoreError, setRestoreError] = useState('')
  const [restoreMode, setRestoreMode] = useState('merge')
  const [replaceText, setReplaceText] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const { armUndo } = useBackup()

  const fileInputRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getBackupStats(), getBackupStatus()]).then(([s, st]) => {
      if (!cancelled) { setStats(s); setStatus(st) }
    })
    return () => { cancelled = true }
  }, [])

  // ESC closes the modal (per spec §8 a11y)
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2400)
  }

  // ─── Backup handlers ──────────────────────────────────

  async function runBackup({ allCategories = false } = {}) {
    if (working) return
    const cats = allCategories
      ? [...CATEGORIES]
      : CATEGORIES.filter((c) => checked[c])
    if (cats.length === 0) {
      showToast('Select at least one category to back up.')
      return
    }
    if (passwordOn && password.length < 8) {
      showToast('Use a password of at least 8 characters.')
      return
    }
    setWorking(true)
    try {
      const contents = await gatherBackupContents(cats)
      const manifest = buildManifest(contents)
      const { blob, filename } = await buildBackupFile({
        contents,
        password: passwordOn ? password : null,
      })
      downloadBlob(blob, filename)
      await recordBackup({
        filename,
        size: blob.size,
        encrypted: passwordOn,
        categories: cats,
        manifest,
      })
      const refreshedStatus = await getBackupStatus()
      setStatus(refreshedStatus)
      showToast(`Backed up to ${filename}`)
      // Brief visible delay so the user sees the toast, then close
      setTimeout(() => onClose(), 700)
    } catch (err) {
      console.error('[backup] failed', err)
      showToast(err.message || 'Backup failed. Try again.')
    } finally {
      setWorking(false)
    }
  }

  // ─── Restore handlers ─────────────────────────────────

  async function handleFile(file) {
    if (!file) return
    setRestoreError('')
    setRestoreContentsState(null)
    setRestorePassword('')
    try {
      const parsed = await parseBackupFile(file)
      setParsedFile({ ...parsed, file })
      // Try to decrypt unencrypted files immediately so the preview shows
      if (parsed.kind === 'v2' && !parsed.envelope.encrypted) {
        const contents = parsed.envelope.contents
        const check = validateContents(contents)
        if (!check.valid) {
          setRestoreError(check.error)
          return
        }
        setRestoreContentsState(contents)
      } else if (parsed.kind === 'v1-json') {
        const contents = flatV1ToContents(parsed.envelope)
        const check = validateContents(contents)
        if (!check.valid) {
          setRestoreError(check.error)
          return
        }
        setRestoreContentsState(contents)
      }
      // v2-encrypted and v1-apb wait for the user to enter a password
    } catch (err) {
      setParsedFile(null)
      setRestoreError(err.message || 'Could not read file.')
    }
  }

  async function handleUnlock() {
    if (!parsedFile) return
    setRestoreError('')
    try {
      const contents = await decryptBackup(parsedFile, restorePassword)
      const check = validateContents(contents)
      if (!check.valid) {
        setRestoreError(check.error)
        return
      }
      setRestoreContentsState(contents)
    } catch (err) {
      setRestoreError(err.message || 'Could not decrypt backup.')
    }
  }

  async function runRestore() {
    if (working || !restoreContentsState) return
    if (restoreMode === 'replace' && replaceText !== 'REPLACE') {
      showToast('Type REPLACE exactly to confirm.')
      return
    }
    setWorking(true)
    try {
      // For replace: capture current state for undo
      let priorContents = null
      if (restoreMode === 'replace') {
        priorContents = await gatherBackupContents([...CATEGORIES])
      }
      const summary = await restoreContents(restoreContentsState, { strategy: restoreMode })
      if (priorContents) armUndo(priorContents, summary)
      const totalAdded = Object.values(summary).reduce((sum, s) => sum + (s.added || 0), 0)
      const totalSkipped = Object.values(summary).reduce((sum, s) => sum + (s.skipped || 0), 0)
      const skippedNote = totalSkipped > 0 ? ` (${totalSkipped} already existed, skipped)` : ''
      showToast(restoreMode === 'replace'
        ? `Replaced. Imported ${totalAdded} items.`
        : `Imported ${totalAdded} items${skippedNote}.`)
      setTimeout(() => {
        onClose()
        // Reload so React state and IndexedDB are back in sync
        if (typeof window !== 'undefined') {
          window.location.reload()
        }
      }, 900)
    } catch (err) {
      console.error('[restore] failed', err)
      showToast(err.message || 'Restore failed.')
    } finally {
      setWorking(false)
    }
  }

  // ─── Render ───────────────────────────────────────────

  const totalSelectedCount = CATEGORIES.filter((c) => checked[c]).length

  return (
    <AnimatePresence>
      <motion.div
        key="backup-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[120] flex items-center justify-center p-5"
        style={{ backgroundColor: 'rgba(25, 25, 25, 0.32)' }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Backup and restore"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 6 }}
          transition={SPRING_SMOOTH}
          onClick={(e) => e.stopPropagation()}
          className="bg-[var(--p-bg-surface)] rounded-2xl shadow-2xl shadow-black/25 w-full max-w-[560px] max-h-[92vh] flex flex-col overflow-hidden border border-[var(--p-border)]"
        >
          {/* Header */}
          <div className="px-5 pt-4 border-b border-[var(--p-border-subtle)]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-medium text-[var(--p-text-primary)]">Backup & restore</h2>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--p-text-muted)] hover:bg-[var(--p-bg-subtle)] hover:text-[var(--p-text-secondary)] transition-colors"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex gap-0.5">
              <TabBtn active={tab === 'backup'} onClick={() => setTab('backup')}>Backup</TabBtn>
              <TabBtn active={tab === 'restore'} onClick={() => setTab('restore')}>Restore</TabBtn>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4 overflow-y-auto flex-1">
            {tab === 'backup' && (
              <BackupPane
                stats={stats}
                checked={checked}
                setChecked={setChecked}
                passwordOn={passwordOn}
                setPasswordOn={setPasswordOn}
                password={password}
                setPassword={setPassword}
                onBackupAll={() => runBackup({ allCategories: true })}
                working={working}
              />
            )}
            {tab === 'restore' && (
              <RestorePane
                parsedFile={parsedFile}
                contents={restoreContentsState}
                error={restoreError}
                restorePassword={restorePassword}
                setRestorePassword={setRestorePassword}
                onUnlock={handleUnlock}
                restoreMode={restoreMode}
                setRestoreMode={setRestoreMode}
                replaceText={replaceText}
                setReplaceText={setReplaceText}
                dragOver={dragOver}
                setDragOver={setDragOver}
                onPickFile={() => fileInputRef.current?.click()}
                onDropFile={(file) => handleFile(file)}
                fileInputRef={fileInputRef}
                onInputChange={(e) => handleFile(e.target.files?.[0])}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 px-5 py-3 border-t border-[var(--p-border-subtle)] bg-[var(--p-bg-subtle)]">
            <div className="flex-1 flex items-center gap-1.5 text-[11px] text-[var(--p-text-muted)]">
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ backgroundColor: statusDotColor(status?.color) }}
              />
              {status ? (status.lastBackedUpAt ? `${status.label} · This browser` : 'Never backed up') : 'Loading…'}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--p-border)] bg-transparent text-[var(--p-text-secondary)] hover:border-[var(--p-gold-light)] hover:text-[var(--p-gold-light)] transition-colors"
              >
                Cancel
              </button>
              {tab === 'backup' ? (
                <button
                  disabled={working || totalSelectedCount === 0}
                  onClick={() => runBackup({ allCategories: false })}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
                    working || totalSelectedCount === 0
                      ? 'border-[var(--p-border)] bg-[var(--p-bg-alt)] text-[var(--p-text-muted)] cursor-not-allowed'
                      : 'border-[var(--p-gold-light)] bg-[var(--p-gold-light)] text-white hover:bg-[var(--p-gold-muted)] hover:border-[var(--p-gold-muted)]'
                  } transition-colors`}
                >
                  {working ? 'Working…' : 'Create backup'}
                </button>
              ) : (
                <button
                  disabled={working || !restoreContentsState}
                  onClick={runRestore}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
                    working || !restoreContentsState
                      ? 'border-[var(--p-border)] bg-[var(--p-bg-alt)] text-[var(--p-text-muted)] cursor-not-allowed'
                      : restoreMode === 'replace'
                        ? 'border-[#E03E3E] bg-[#E03E3E] text-white hover:bg-[#C5342A]'
                        : 'border-[var(--p-gold-light)] bg-[var(--p-gold-light)] text-white hover:bg-[var(--p-gold-muted)]'
                  } transition-colors`}
                >
                  {working ? 'Working…' : restoreMode === 'replace' ? 'Replace everything' : 'Restore'}
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[var(--p-text-primary)] text-white px-4 py-2 rounded-md text-xs z-[200] shadow-2xl"
              role="status"
              aria-live="polite"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 text-xs font-medium border-0 bg-transparent transition-colors -mb-px border-b-[1.5px] ${
        active
          ? 'text-[var(--p-gold-light)] border-[var(--p-gold-light)]'
          : 'text-[var(--p-text-muted)] hover:text-[var(--p-text-secondary)] border-transparent'
      }`}
    >
      {children}
    </button>
  )
}

// ─── Backup pane ─────────────────────────────────────────

function BackupPane({ stats, checked, setChecked, passwordOn, setPasswordOn, password, setPassword, onBackupAll, working }) {
  const ringingColor = 'var(--p-gold-light)'

  return (
    <div>
      <p className="text-[12.5px] text-[var(--p-text-secondary)] leading-[1.6] mb-4">
        Your rooms, chats, and everything you've built live in this browser. Save a copy to take with you, or restore later if you switch devices.
      </p>

      {/* Recommended card — PR-18a: button stacks below the content as
          a full-width primary action so it reads as the single
          recommended next step rather than a small pill on the side. */}
      <div
        className="border rounded-lg p-3.5 mb-4 flex flex-col gap-3.5"
        style={{ borderColor: ringingColor, background: 'rgba(196, 169, 77, 0.08)' }}
      >
        <div className="flex items-center gap-3.5">
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(196, 169, 77, 0.16)', color: '#8B6A10' }}
          >
            <Database className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium flex items-center gap-2 mb-0.5" style={{ color: '#8B6A10' }}>
              Everything
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-px rounded-full text-white font-medium" style={{ background: ringingColor }}>
                Recommended
              </span>
            </div>
            <div className="text-[11px] text-[var(--p-text-secondary)]">
              {stats
                ? `${stats.chats} chat${stats.chats === 1 ? '' : 's'} · ${stats.rooms} room${stats.rooms === 1 ? '' : 's'} · ${stats.libraryItems} library item${stats.libraryItems === 1 ? '' : 's'} · ~${formatBytes(stats.storageUsed)}`
                : 'Loading…'}
            </div>
          </div>
        </div>
        <button
          disabled={working}
          onClick={onBackupAll}
          className={`w-full px-4 py-2 text-xs font-medium rounded-md text-white whitespace-nowrap transition-colors ${
            working ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          style={{ background: ringingColor }}
        >
          Back up everything
        </button>
      </div>

      <SectionLabel>Or choose what to include</SectionLabel>

      {CATEGORIES.map((cat) => (
        <CategoryCheckRow
          key={cat}
          id={cat}
          checked={!!checked[cat]}
          onToggle={() => setChecked({ ...checked, [cat]: !checked[cat] })}
        />
      ))}

      {/* Password */}
      <div className="mt-3.5 p-3 border border-[var(--p-border)] rounded-md bg-[var(--p-bg-subtle)]">
        <div className="flex items-center gap-2.5">
          <div className="flex-1 text-xs font-medium text-[var(--p-text-primary)]">Password-protect this backup</div>
          <button
            onClick={() => setPasswordOn(!passwordOn)}
            className="relative w-7.5 h-4 rounded-full flex-shrink-0 transition-colors cursor-pointer"
            style={{
              width: 30, height: 17,
              background: passwordOn ? 'var(--p-gold-light)' : 'var(--p-border)',
            }}
            aria-pressed={passwordOn}
          >
            <span
              className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all"
              style={{ left: passwordOn ? 15 : 2, height: 13, width: 13, boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }}
            />
          </button>
        </div>
        <div className="text-[10.5px] text-[var(--p-text-muted)] leading-[1.55] mt-1.5">
          Encrypts the backup with a password of your choice. Anyone (including you) without the password can't open the file.
        </div>
        {passwordOn && (
          <div className="mt-2.5">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a password (8+ characters)"
              className="w-full px-3 py-2 text-[12.5px] border border-[var(--p-border)] rounded-md bg-[var(--p-bg-surface)] text-[var(--p-text-primary)] outline-none focus:border-[var(--p-gold-light)] transition-colors"
            />
            <div className="text-[10.5px] mt-2 px-2.5 py-1.5 rounded-sm flex items-start gap-1.5 leading-[1.5]" style={{ color: '#8B4A10', background: 'rgba(184, 92, 0, 0.08)', border: '0.5px solid rgba(184, 92, 0, 0.25)' }}>
              <AlertTriangle className="w-3 h-3 mt-px flex-shrink-0" />
              If you forget this password, the file cannot be decrypted. Keep it somewhere safe.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--p-text-muted)] mt-4 mb-2.5 first:mt-2">
      {children}
    </div>
  )
}

function CategoryCheckRow({ id, checked, onToggle }) {
  const meta = CATEGORY_META[id]
  return (
    <button
      onClick={onToggle}
      type="button"
      className={`w-full flex items-center gap-2.5 p-2.5 border rounded-md mb-1.5 transition-colors text-left ${
        checked
          ? 'border-[var(--p-gold-light)]'
          : 'border-[var(--p-border)] hover:border-[var(--p-text-light)] hover:bg-[var(--p-bg-subtle)]'
      }`}
      style={checked ? { background: 'rgba(196, 169, 77, 0.08)' } : undefined}
      aria-pressed={checked}
    >
      <span
        className={`w-4 h-4 border rounded-sm flex items-center justify-center flex-shrink-0 transition-colors ${
          checked
            ? 'border-[var(--p-gold-light)] bg-[var(--p-gold-light)] text-white'
            : 'border-[var(--p-text-light)] text-transparent bg-transparent'
        }`}
      >
        <Check className="w-2.5 h-2.5" strokeWidth={3} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-medium text-[var(--p-text-primary)] truncate">{meta.label}</div>
        <div className="text-[10.5px] text-[var(--p-text-muted)] truncate">{meta.desc}</div>
      </div>
    </button>
  )
}

// ─── Restore pane ────────────────────────────────────────

function RestorePane({
  parsedFile, contents, error,
  restorePassword, setRestorePassword, onUnlock,
  restoreMode, setRestoreMode,
  replaceText, setReplaceText,
  dragOver, setDragOver,
  onPickFile, onDropFile, fileInputRef, onInputChange,
}) {
  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onDropFile(file)
  }

  const previewMeta = parsedFile?.envelope
  const env = previewMeta || {}

  const counts = (() => {
    if (parsedFile?.kind === 'v2') {
      return env.manifest?.counts || null
    }
    if (contents) {
      // Synthesize counts from the resolved contents
      return {
        chats: contents.chats?.length || 0,
        rooms: contents.rooms?.length || 0,
        notes: contents.annotations?.notes?.length || 0,
        highlights: contents.annotations?.highlights?.length || 0,
        favorites: contents.annotations?.favorites?.length || 0,
        layoutsInstalled: contents.library?.layouts?.length || 0,
      }
    }
    return null
  })()

  const isEncrypted = parsedFile?.kind === 'v2' ? env.encrypted : parsedFile?.kind === 'v1-apb'
  const needsUnlock = isEncrypted && !contents

  return (
    <div>
      <p className="text-[12.5px] text-[var(--p-text-secondary)] leading-[1.6] mb-4">
        Bring a backup file here to restore your Parliament. You'll see a preview before anything changes.
      </p>

      <div
        className={`border-[1.5px] border-dashed rounded-lg p-7 text-center transition-colors cursor-pointer ${
          dragOver ? 'border-[var(--p-gold-light)]' : 'border-[var(--p-text-light)] hover:border-[var(--p-gold-light)]'
        }`}
        style={dragOver ? { background: 'rgba(196, 169, 77, 0.08)' } : undefined}
        onClick={onPickFile}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onPickFile() }}
        aria-label="Drop a backup file or click to browse"
      >
        <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center bg-[var(--p-bg-subtle)] text-[var(--p-text-secondary)]">
          <Upload className="w-5 h-5" />
        </div>
        <div className="text-[13px] font-medium text-[var(--p-text-primary)] mb-1">Drop a backup file here</div>
        <div className="text-[11.5px] text-[var(--p-text-secondary)] leading-[1.5]">
          Or <span className="text-[var(--p-gold-light)] font-medium">browse files</span> · Accepts <code>.parliament</code>, <code>.apb</code>, or <code>.json</code> backups
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".parliament,.apb,.json,application/json"
          onChange={onInputChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="mt-3 px-3 py-2 rounded-md text-[11.5px] leading-[1.5] flex items-start gap-1.5" style={{ color: '#E03E3E', background: 'rgba(224, 62, 62, 0.06)', border: '0.5px solid rgba(224, 62, 62, 0.3)' }}>
          <AlertTriangle className="w-3 h-3 mt-px flex-shrink-0" />
          {error}
        </div>
      )}

      {parsedFile && (
        <div className="border border-[var(--p-border)] rounded-lg bg-[var(--p-bg-subtle)] p-3.5 mt-4">
          <div className="text-[12.5px] font-medium text-[var(--p-text-primary)] mb-1.5 truncate">
            {parsedFile.file?.name || 'backup.parliament'}
          </div>
          <div className="text-[11px] text-[var(--p-text-secondary)] leading-[1.7] mb-2">
            {parsedFile.kind === 'v2' && (
              <>
                Created {env.createdAt?.slice(0, 10) || '—'} · Parliament {env.parliamentVersion || '—'}
                <br />
                {isEncrypted ? 'Encrypted: yes — enter password below' : 'Encrypted: no'}
              </>
            )}
            {parsedFile.kind === 'v1-apb' && <>Legacy V1 encrypted backup (.apb) — enter password below</>}
            {parsedFile.kind === 'v1-json' && <>Legacy V1 plaintext backup — will be migrated to V2 format on restore</>}
          </div>
          {counts && contents && (
            <div className="text-[11.5px] text-[var(--p-text-secondary)] leading-[1.6]">
              Contains{' '}
              <strong>{counts.chats || 0} chat{counts.chats === 1 ? '' : 's'}</strong>
              {(counts.rooms || 0) > 0 && <>, <strong>{counts.rooms} room{counts.rooms === 1 ? '' : 's'}</strong></>}
              {(counts.layoutsInstalled || 0) > 0 && <>, <strong>{counts.layoutsInstalled} library item{counts.layoutsInstalled === 1 ? '' : 's'}</strong></>}
              {((counts.notes || 0) + (counts.highlights || 0) + (counts.favorites || 0)) > 0 && (
                <>, and annotations</>
              )}.
            </div>
          )}

          {needsUnlock && (
            <div className="mt-3 flex gap-2">
              <input
                type="password"
                value={restorePassword}
                onChange={(e) => setRestorePassword(e.target.value)}
                placeholder="Backup password"
                className="flex-1 px-2.5 py-1.5 text-xs border border-[var(--p-border)] rounded-md bg-white text-[var(--p-text-primary)] outline-none focus:border-[var(--p-gold-light)]"
                onKeyDown={(e) => { if (e.key === 'Enter') onUnlock() }}
                autoFocus
              />
              <button
                onClick={onUnlock}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--p-gold-light)] bg-[var(--p-gold-light)] text-white hover:bg-[var(--p-gold-muted)] transition-colors flex items-center gap-1"
              >
                <Lock className="w-3 h-3" />
                Unlock
              </button>
            </div>
          )}

          {contents && (
            <>
              <SectionLabel>How would you like to restore?</SectionLabel>
              <div className="flex gap-2">
                <RestoreModeBtn
                  selected={restoreMode === 'merge'}
                  title="Merge with current"
                  desc="Adds new items. Nothing in your current Parliament is lost."
                  onClick={() => setRestoreMode('merge')}
                />
                <RestoreModeBtn
                  selected={restoreMode === 'replace'}
                  title="Replace everything"
                  desc="Wipes current Parliament and installs from the backup."
                  onClick={() => setRestoreMode('replace')}
                  destructive
                />
              </div>

              {restoreMode === 'replace' && (
                <div
                  className="mt-3 p-2.5 rounded-md"
                  style={{ border: '0.5px solid #E03E3E', background: 'rgba(224, 62, 62, 0.06)' }}
                >
                  <div className="text-[11.5px] font-medium flex items-center gap-1.5 mb-1" style={{ color: '#E03E3E' }}>
                    <AlertTriangle className="w-3 h-3" />
                    This will erase your current Parliament data.
                  </div>
                  <div className="text-[10.5px] text-[var(--p-text-secondary)] leading-[1.55] mb-2">
                    This cannot be undone after 60 seconds. Type <strong>REPLACE</strong> below to confirm.
                  </div>
                  <input
                    type="text"
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    placeholder="REPLACE"
                    className="w-full px-2.5 py-1.5 text-xs border border-[var(--p-border)] rounded-sm font-mono outline-none focus:border-[#E03E3E]"
                    aria-label="Type REPLACE to confirm destructive action"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function RestoreModeBtn({ selected, title, desc, onClick, destructive = false }) {
  const accentColor = destructive ? '#E03E3E' : 'var(--p-gold-light)'
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 px-3 py-2.5 border rounded-md bg-[var(--p-bg-surface)] text-left transition-colors"
      style={{
        borderColor: selected ? accentColor : 'var(--p-border)',
        background: selected
          ? destructive ? 'rgba(224, 62, 62, 0.06)' : 'rgba(196, 169, 77, 0.08)'
          : 'var(--p-bg-surface)',
      }}
    >
      <div className="text-[12px] font-medium mb-0.5 flex items-center gap-1.5" style={{ color: selected ? (destructive ? '#E03E3E' : '#8B6A10') : 'var(--p-text-primary)' }}>
        {destructive ? <ArrowRight className="w-3 h-3" /> : <ArrowDownToLine className="w-3 h-3" />}
        {title}
      </div>
      <div className="text-[10.5px] text-[var(--p-text-muted)] leading-[1.5]">{desc}</div>
    </button>
  )
}
