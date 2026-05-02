// FileShelf — the staged-files / context-toggle / quick-actions panel.
//
// PR-11a moved this here from src/adapters/pelican/components/FileShelf.jsx
// when Pelican was decomposed into catalog components. Hard dependency
// on PelicanContext is gone — the component now reads from the
// FileShelfContext at App.jsx so any room that mounts file-shelf@1.0
// (currently only the Data Workspace template) shares state with the
// canvas trio + column-inspector.
//
// Behavior parity with V1 PelicanFileShelf except:
//   - The Pelican-branded header (Database icon + "Pelican" + DATA badge
//     + ChevronLeft to /chats) is gone. The component is now generic;
//     room-level navigation lives in the route shell.
//   - Calls into useFileShelf() for state and mutators rather than
//     usePelican(); same field shapes.

import { useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Upload, Filter, X, Download, Sparkles, Wand2, FileSpreadsheet,
  Link2, Unlink,
} from 'lucide-react'
import { useFileShelf } from '../../stores/FileShelfContext'
import { useSettings } from '../../stores/SettingsContext'
import { SPRING_SMOOTH } from '../../lib/constants'

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.06 } },
}
const staggerItem = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: SPRING_SMOOTH },
}

const ACCEPTED_TYPES = '.csv,.tsv,.xlsx,.xls,.json'

export default function FileShelf({ conversationId }) {
  const {
    files, contextFiles, activeFileId,
    uploading, uploadError,
    setActiveFileId, uploadFile, toggleContext, removeFile,
  } = useFileShelf()

  const fileInputRef = useRef(null)

  const handleFilePick = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    await uploadFile(file, conversationId)
  }, [uploadFile, conversationId])

  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    await uploadFile(file, conversationId)
  }, [uploadFile, conversationId])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
  }, [])

  const activeFile = files.find(f => f.id === activeFileId) || null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={SPRING_SMOOTH}
      className="flex flex-col w-full h-full"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Header */}
      <div className="px-1 pt-1 pb-3 flex items-center justify-between flex-shrink-0">
        <h2 className="text-xs font-semibold text-[var(--p-text-primary)] uppercase tracking-wider">
          File shelf
        </h2>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded hover:bg-[#F1F1EF] text-[#787774] hover:text-[#B8A070] transition-colors"
          title="Upload file"
        >
          <Plus className="w-3.5 h-3.5" />
        </motion.button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={handleFilePick}
        />
      </div>

      {/* Upload error */}
      <AnimatePresence>
        {uploadError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 px-3 py-2 bg-[#E03E3E]/8 border border-[#E03E3E]/20 rounded-lg"
          >
            <p className="text-[11px] text-[#E03E3E] leading-relaxed">{uploadError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Staged Files */}
      <div className="flex-shrink-0 mb-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-medium text-[#787774] uppercase tracking-wider">Staged Files</h3>
          {files.length > 0 && (
            <span className="text-[10px] text-[#787774]">{contextFiles.size} in context</span>
          )}
        </div>

        {uploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-3 py-2 border border-[#E9E9E7] rounded-xl text-[11px] text-[#787774] flex items-center gap-2 mb-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Upload className="w-3.5 h-3.5 text-[#B8A070]" />
            </motion.div>
            Parsing file…
          </motion.div>
        )}

        {files.length > 0 ? (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-1.5"
          >
            {files.map(file => (
              <FileCard
                key={file.id}
                file={file}
                active={activeFileId === file.id}
                inContext={contextFiles.has(file.id)}
                onClick={() => setActiveFileId(file.id)}
                onToggleContext={() => toggleContext(file.id)}
                onRemove={() => removeFile(file.id)}
              />
            ))}
            <DropZoneButton onClick={() => fileInputRef.current?.click()} />
          </motion.div>
        ) : (
          <DropZoneButton onClick={() => fileInputRef.current?.click()} />
        )}
      </div>

      {/* Active Dataset Stats */}
      <AnimatePresence>
        {activeFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border-t border-[#F1F1EF] pt-3 mb-3 flex-shrink-0"
          >
            <h3 className="text-[10px] font-medium text-[#787774] uppercase tracking-wider mb-3">Active dataset</h3>
            <div className="space-y-2">
              <StatRow label="File" value={activeFile.name} />
              <StatRow label="Rows" value={activeFile.rows.toLocaleString()} />
              <StatRow label="Columns" value={String(activeFile.cols)} />
              <StatRow label="Size" value={formatBytes(activeFile.sizeBytes)} />
            </div>
            <div className="mt-3 pt-3 border-t border-[#F1F1EF]">
              <div className="flex items-center gap-1.5 mb-1">
                <Link2 className="w-3 h-3 text-[#B8A070]" />
                <span className="text-[10px] font-semibold text-[#B8A070]">{contextFiles.size} file{contextFiles.size !== 1 ? 's' : ''} in context</span>
              </div>
              <p className="text-[10px] text-[#787774] leading-relaxed">
                Claude can reference data from files marked with the link icon.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer */}
      <div className="flex-1 min-h-0" />

      {/* Quick Actions */}
      <div className="border-t border-[#F1F1EF] pt-3 flex-shrink-0">
        <div className="space-y-1">
          <QuickAction icon={Download} label="Export results" disabled={files.length === 0} />
          <QuickAction icon={Sparkles} label="Auto-analyze" accent disabled={files.length === 0} />
          <QuickAction icon={Wand2} label="Suggest charts" disabled={files.length === 0} />
        </div>
      </div>
    </motion.div>
  )
}

// ─── FileCard ─────────────────────────────────────────────

function FileCard({ file, active, inContext, onClick, onToggleContext, onRemove }) {
  const { settings } = useSettings()
  const isDark = settings.theme === 'dark'
  const typeColor = file.type === 'csv' || file.type === 'tsv' ? '#0F7B6C'
                  : file.type === 'xlsx' || file.type === 'xls' ? '#D9730D'
                  : '#787774'

  return (
    <motion.div
      variants={staggerItem}
      className={`relative rounded-xl border transition-colors ${
        active
          ? 'bg-[#B8A070]/5 border-[#B8A070]/30'
          : 'bg-white border-[#E9E9E7] hover:bg-[#FAFAFA]'
      }`}
    >
      <motion.button
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="w-full text-left px-3 py-2.5 pr-8"
      >
        <div className="flex items-start gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: active ? 'rgba(184,160,112,0.1)' : (isDark ? 'rgba(255,255,255,0.06)' : '#F7F6F3') }}
          >
            <FileSpreadsheet
              className="w-3.5 h-3.5"
              style={{ color: active ? '#B8A070' : '#787774' }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-[#191919] truncate">{file.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase"
                style={{ backgroundColor: `${typeColor}15`, color: typeColor }}
              >
                {file.type}
              </span>
              <span className="text-[10px] text-[#787774]">{file.rows.toLocaleString()} rows</span>
              <span className="text-[10px] text-[#787774]">{formatBytes(file.sizeBytes)}</span>
            </div>
          </div>
        </div>
      </motion.button>

      {/* Context toggle */}
      <motion.button
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => { e.stopPropagation(); onToggleContext() }}
        className={`absolute top-2 right-2 p-1 rounded-md transition-colors ${
          inContext
            ? 'text-[#B8A070] bg-[#B8A070]/10 hover:bg-[#B8A070]/20'
            : 'text-[#9B9A97] hover:text-[#787774] hover:bg-[#F1F1EF]'
        }`}
        title={inContext ? 'In context. Click to remove' : 'Click to add to context'}
      >
        {inContext ? <Link2 className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
      </motion.button>

      {/* Remove */}
      <motion.button
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="absolute bottom-2 right-2 p-1 rounded-md text-[#9B9A97] hover:text-[#E03E3E] transition-colors opacity-0 hover:opacity-100"
        title="Remove file"
      >
        <X className="w-3 h-3" />
      </motion.button>
    </motion.div>
  )
}

// ─── Helpers ──────────────────────────────────────────────

function DropZoneButton({ onClick }) {
  return (
    <motion.button
      variants={staggerItem}
      whileHover={{ borderColor: '#B8A070', color: '#B8A070' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full px-3 py-3 border border-dashed border-[#E9E9E7] rounded-xl text-xs text-[#787774] transition-colors flex items-center justify-center gap-2"
    >
      <Upload className="w-3.5 h-3.5" />
      Drop files or browse
    </motion.button>
  )
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-[#787774]">{label}</span>
      <span className="text-[11px] font-medium text-[#191919] truncate ml-2 max-w-[130px]" title={value}>{value}</span>
    </div>
  )
}

function QuickAction({ icon: Icon, label, accent = false, disabled = false }) {
  return (
    <motion.button
      whileHover={disabled ? {} : { x: 3 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      disabled={disabled}
      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${
        disabled
          ? 'text-[#9B9A97] cursor-not-allowed'
          : accent
            ? 'text-[#B8A070] hover:bg-[#B8A070]/5 font-medium'
            : 'text-[#787774] hover:bg-[#FAFAFA] hover:text-[#B8A070]'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </motion.button>
  )
}

function formatBytes(bytes) {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
