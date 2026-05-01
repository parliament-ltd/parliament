import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Square, ArrowUp, Plus, X, FileText, Globe, Calculator, BarChart2, Paperclip, Check } from 'lucide-react'
import { SPRING_SNAPPY, SPRING_SMOOTH } from '../../lib/constants'
import { ACCEPTED_TYPES, readUploadedFile } from '../../lib/fileUpload'

const TOOL_META = {
  web_search:   { label: 'Web search',   Icon: Globe,       color: '#4A7AE5' },
  calculate:    { label: 'Calculate',    Icon: Calculator,  color: '#22C55E' },
  create_chart: { label: 'Create chart', Icon: BarChart2,   color: '#7C6CD4' },
}

/**
 * Textarea + send/stop + '+' menu (upload, tool toggles).
 *
 * Props:
 *   value          {string}
 *   onChange       {(string) => void}
 *   onSend         {() => void}
 *   onStop         {() => void}
 *   isStreaming    {boolean}
 *   placeholder    {string}
 *   disabled       {boolean}
 *   inputRef       {React.Ref}
 *   attachment     {object|null}
 *   onAttach       {(obj) => void}
 *   onClearAttach  {() => void}
 *   availableTools {object[]}
 *   activeTools    {Set<string>}
 *   onToggleTool   {(id) => void}
 *   isOnline       {boolean}  — when false the send button is disabled with an aria-label. Default: true.
 *   cardLayout     {boolean}  — unified card style (mobile). Default: inline (desktop).
 */
export default function InputArea({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming = false,
  placeholder = 'Ask a question...',
  disabled = false,
  isOnline = true,
  inputRef,
  attachment = null,
  onAttach,
  onClearAttach,
  availableTools = [],
  activeTools = new Set(),
  onToggleTool,
  cardLayout = false,
}) {
  const fileInputRef = useRef(null)
  const menuRef = useRef(null)
  const plusRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)

  // PR-10b: the cardLayout-only mic button was removed. Voice input is
  // now contributed by the standalone voice-input@1.0 catalog component
  // (PR-10a.8 wired its production render); the bus contract remains the
  // same — voice-input@1.0 publishes `voice-transcript`, which a wired
  // input-render subscriber appends to its value. Pocket-chat-shaped
  // rooms seed voice-input@1.0 by default; legacy swift-migrated rooms
  // get it injected by lib/migration.js → migrateInjectVoiceInput.

  const hasActive = activeTools.size > 0 || !!attachment

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => {
      if (!menuRef.current?.contains(e.target) && !plusRef.current?.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      isStreaming ? onStop?.() : onSend?.()
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const parsed = await readUploadedFile(file)
    onAttach?.(parsed)
    setMenuOpen(false)
  }

  /* ── Shared: popup menu ──────────────────────────────────── */
  const PlusMenu = () => (
    <div className="relative" ref={plusRef}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setMenuOpen(prev => !prev)}
        className={`relative w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
          menuOpen || hasActive
            ? 'border-[#B8A070]/60 bg-[#B8A070]/8 text-[#B8A070]'
            : 'border-[#E9E9E7] text-[var(--p-text-secondary)] hover:border-[var(--p-text-primary)]/20 hover:text-[var(--p-text-primary)]'
        }`}
        title="Add attachment or toggle tools"
      >
        <Plus className="w-4 h-4" />
        {hasActive && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#B8A070]" />
        )}
      </motion.button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={SPRING_SNAPPY}
            className="absolute bottom-full left-0 mb-2 z-50 min-w-[180px] rounded-xl border border-[var(--p-border)] bg-[var(--p-bg-surface)] shadow-lg shadow-black/8 overflow-hidden"
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[var(--p-text-primary)] border border-transparent hover:border-[var(--p-text-primary)]/20 hover:text-[var(--p-text-primary)] transition-colors text-left"
            >
              <Paperclip className={`w-4 h-4 shrink-0 ${attachment ? 'text-[#B8A070]' : 'text-[var(--p-text-secondary)]'}`} />
              <span className="flex-1">Upload file</span>
              {attachment && <Check className="w-3.5 h-3.5 text-[#B8A070] shrink-0" />}
            </button>

            {availableTools.length > 0 && (
              <>
                <div className="h-px bg-[var(--p-border-subtle)] mx-2" />
                {availableTools.map((tool) => {
                  const meta = TOOL_META[tool.name] || TOOL_META[tool.id]
                  if (!meta) return null
                  const isActive = activeTools.has(tool.id || tool.name)
                  const { label, Icon } = meta
                  return (
                    <button
                      key={tool.id || tool.name}
                      onClick={() => onToggleTool?.(tool.id || tool.name)}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm border border-transparent hover:border-[var(--p-text-primary)]/20 transition-colors text-left ${isActive ? 'text-[#B8A070]' : 'text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)]'}`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{label}</span>
                      {isActive && <Check className="w-3.5 h-3.5 shrink-0 text-[#B8A070]" />}
                    </button>
                  )
                })}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  /* ── Card layout (Swift / mobile) ───────────────────────── */
  if (cardLayout) {
    return (
      <div className="relative px-4 pt-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 12px)' }} data-tour="chat-input">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_SMOOTH, delay: 0.3 }}
          className="rounded-xl border border-[#DDDDE3] bg-white overflow-visible"
        >
          {/* Attachment chip */}
          <AnimatePresence>
            {attachment && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={SPRING_SNAPPY}
                className="flex items-center gap-2 mx-3 mt-3 px-3 py-1.5 rounded-lg border border-[#EBEBEB] bg-[#FAFAFA] w-fit max-w-full"
              >
                <FileText className="w-3.5 h-3.5 text-[#B8A070] shrink-0" />
                <span className="text-xs text-[#1E2532] font-medium truncate max-w-[220px]">
                  {attachment.name}
                </span>
                {attachment.truncated && (
                  <span className="text-[10px] text-[#E5A620] font-semibold shrink-0">truncated</span>
                )}
                <button onClick={onClearAttach} className="ml-1 text-[#6B7C93] hover:text-[#1E2532] transition-colors shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Textarea */}
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={2}
            className="w-full bg-transparent px-4 pt-3 pb-2 text-[#191919] outline-none placeholder:text-[#9B9A97] resize-none disabled:opacity-50"
            style={{ fontSize: 16, lineHeight: '22px', maxHeight: 120 }}
          />

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            <PlusMenu />

            <AnimatePresence mode="wait">
              {/* ── Streaming: Stop button ── */}
              {isStreaming ? (
                <motion.button
                  key="stop"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={SPRING_SNAPPY}
                  whileTap={{ scale: 0.85 }}
                  onClick={onStop}
                  className="rounded-lg border flex items-center justify-center flex-shrink-0"
                  style={{ width: 36, height: 36, borderColor: '#E03E3E', backgroundColor: '#E03E3E' }}
                >
                  <Square className="w-3.5 h-3.5 text-white" />
                </motion.button>

              /* ── Has text: Send button ── */
              ) : value.trim() ? (
                <motion.button
                  key="send"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={SPRING_SNAPPY}
                  whileTap={isOnline ? { scale: 0.85 } : undefined}
                  onClick={isOnline ? onSend : undefined}
                  disabled={!isOnline}
                  aria-label={isOnline ? 'Send message' : 'Send message (unavailable while offline)'}
                  className="rounded-lg border flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                  style={{
                    width: 36, height: 36,
                    borderColor: isOnline ? '#B8A070' : '#9B9A97',
                    backgroundColor: isOnline ? '#B8A070' : '#9B9A97',
                  }}
                >
                  <ArrowUp className="w-4 h-4 text-white" />
                </motion.button>

              /* ── Empty: ghost Send (voice now lives in voice-input@1.0) ── */
              ) : (
                <motion.button
                  key="send-empty"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={SPRING_SNAPPY}
                  whileTap={{ scale: 0.85 }}
                  onClick={onSend}
                  className="rounded-lg border flex items-center justify-center flex-shrink-0"
                  style={{ width: 36, height: 36, borderColor: '#DDDDE3', backgroundColor: 'transparent' }}
                >
                  <ArrowUp className="w-4 h-4" style={{ color: '#9B9A97' }} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES} className="hidden" onChange={handleFileChange} />
      </div>
    )
  }

  /* ── Inline layout (Albatross / desktop) ────────────────── */
  return (
    <div className="relative p-4" data-tour="chat-input">
      {/* File attachment chip */}
      <AnimatePresence>
        {attachment && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={SPRING_SNAPPY}
            className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg border border-[#EBEBEB] bg-[#FAFAFA] w-fit max-w-full"
          >
            <FileText className="w-3.5 h-3.5 text-[#4A7AE5] shrink-0" />
            <span className="text-xs text-[#1E2532] font-medium truncate max-w-[240px]">
              {attachment.name}
            </span>
            {attachment.truncated && (
              <span className="text-[10px] text-[#E5A620] font-semibold shrink-0">truncated</span>
            )}
            <button onClick={onClearAttach} className="ml-1 text-[#6B7C93] hover:text-[#1E2532] transition-colors shrink-0">
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_SMOOTH, delay: 0.4 }}
        className="flex items-stretch gap-3"
      >
        {/* Textarea with + overlaid bottom-left */}
        <div className="relative flex-1">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full h-full bg-white rounded-lg pl-11 pr-4 py-3 text-sm text-[var(--p-text-primary)] resize-none outline-none placeholder:text-[var(--p-text-muted)] border border-[#E9E9E7] focus:border-[#B8A070] transition-colors disabled:opacity-50"
            rows={3}
          />
          <div className="absolute bottom-3 left-2.5">
            <PlusMenu />
          </div>
        </div>

        <motion.button
          whileHover={!isStreaming && isOnline ? { scale: 1.03, borderColor: '#B8A070' } : undefined}
          whileTap={!isStreaming && isOnline ? { scale: 0.97 } : undefined}
          onClick={isStreaming ? onStop : (isOnline ? onSend : undefined)}
          disabled={!isStreaming && !isOnline}
          aria-label={
            isStreaming
              ? 'Stop generating'
              : isOnline
                ? 'Send message'
                : 'Send message (unavailable while offline)'
          }
          className={`px-5 rounded-lg font-semibold text-sm border bg-white transition-colors flex items-center gap-2 flex-shrink-0 disabled:opacity-40 ${
            isStreaming
              ? 'border-[#EF4444]/30 text-[#EF4444] hover:border-[#EF4444]'
              : 'border-[#E9E9E7] text-[var(--p-text-primary)] hover:border-[#B8A070] hover:text-[#B8A070]'
          }`}
        >
          <AnimatePresence mode="wait">
            {isStreaming ? (
              <motion.div
                key="stop"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={SPRING_SNAPPY}
                className="flex items-center gap-2"
              >
                <Square className="w-3.5 h-3.5" />
                Stop
              </motion.div>
            ) : (
              <motion.div
                key="send"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={SPRING_SNAPPY}
              >
                Send
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>

      <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES} className="hidden" onChange={handleFileChange} />
    </div>
  )
}
