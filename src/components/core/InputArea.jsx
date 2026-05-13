import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Square, ArrowUp, Plus, X, FileText, Mic, Globe, Paperclip, Check } from 'lucide-react'
import { SPRING_SNAPPY, SPRING_SMOOTH } from '../../lib/constants'
import { ACCEPTED_TYPES, readUploadedFile } from '../../lib/fileUpload'

// PR-18b: contribution icon lookup. Components that contribute `inputActions`
// pass an `iconName` string in their manifest; we resolve it here so the
// manifest stays serializable JSON. Predeclared with the icons Phase-1
// contributions are expected to use — voice-input ('Mic'), the future
// web-search component ('Globe'), the future file-attach component
// ('Paperclip'). Unknown names render as the generic Plus icon below.
const ICON_BY_NAME = { Mic, Globe, Paperclip }
function iconFor(name) { return ICON_BY_NAME[name] || Plus }

/**
 * Textarea + send/stop + '+' menu (upload + contributed inputActions).
 *
 * Props:
 *   value              {string}
 *   onChange           {(string) => void}
 *   onSend             {() => void}
 *   onStop             {() => void}
 *   isStreaming        {boolean}
 *   placeholder        {string}
 *   disabled           {boolean}
 *   inputRef           {React.Ref}
 *   attachment         {object|null}
 *   onAttach           {(obj) => void}
 *   onClearAttach      {() => void}
 *   rightPrimaryAction {object|null}  PR-18b: a contributed action where `primary === 'right'`. When text is empty AND not streaming, this renders in the right-side button slot (mic for voice-toggle). Tapping invokes onInvokeAction(action.id).
 *   overflowActions    {object[]}     PR-18b: contributed actions WITHOUT a primary flag — populate the '+' overflow menu.
 *   onInvokeAction     {(actionId, payload) => void}  PR-18b: called when the user taps any contributed action. input-render publishes `input-action:${id}` on the hostAPI bus.
 *   isOnline           {boolean}  — when false the send button is disabled with an aria-label. Default: true.
 *   cardLayout         {boolean}  — unified card style (mobile). Default: inline (desktop).
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
  rightPrimaryAction = null,
  overflowActions = [],
  onInvokeAction,
  cardLayout = false,
}) {
  const fileInputRef = useRef(null)
  const menuRef = useRef(null)
  const plusRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)

  // PR-10b: the cardLayout-only mic button was removed. Voice input is
  // now contributed by the standalone voice-input@1.0 catalog component
  // (PR-10a.8 wired its production render). PR-18b: voice-input@1.0 now
  // contributes a `primary: 'right'` inputAction that flows through
  // rightPrimaryAction below, putting the mic back inside the card's
  // right button slot on mobile (matches the Swift V1 visual). On
  // desktop the inline layout doesn't honor rightPrimaryAction, so
  // voice-input@1.0's own button continues to live wherever it's
  // mounted via its slot target.

  // PR-18b: '+' overflow is disabled when there's nothing to put in it.
  // For PR-18b the intrinsic file-upload always counts, so this never
  // fires in practice. When file-attach@1.0 ships in PR-18e and the
  // intrinsic upload moves out, this gate flips on for rooms with no
  // overflow contributors.
  const intrinsicMenuItemCount = 1 // file-upload (PR-18e: move out to file-attach@1.0)
  const overflowIsEmpty = overflowActions.length === 0 && intrinsicMenuItemCount === 0
  const hasActive = !!attachment

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

  /* ── Shared: popup menu. Declared as a function returning JSX (not
       a component) so it stays a stable identity per render — avoids
       react-hooks/static-components flagging an inner component
       declaration that would reset state every parent render. ── */
  function renderPlusMenu() { return (
    <div className="relative" ref={plusRef}>
      <motion.button
        whileHover={overflowIsEmpty ? undefined : { scale: 1.05 }}
        whileTap={overflowIsEmpty ? undefined : { scale: 0.95 }}
        onClick={() => { if (!overflowIsEmpty) setMenuOpen(prev => !prev) }}
        disabled={overflowIsEmpty}
        className={`relative w-8 h-8 rounded-lg border flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          menuOpen || hasActive
            ? 'border-[#B8A070]/60 bg-[#B8A070]/8 text-[#B8A070]'
            : 'border-[#E9E9E7] text-[var(--p-text-secondary)] hover:border-[var(--p-text-primary)]/20 hover:text-[var(--p-text-primary)]'
        }`}
        title={
          overflowIsEmpty
            ? 'Add components to enable more actions'
            : 'Add attachment or invoke a tool'
        }
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
            {/* Intrinsic: file upload. PR-18e: moves to file-attach@1.0 as a contribution. */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[var(--p-text-primary)] border border-transparent hover:border-[var(--p-text-primary)]/20 hover:text-[var(--p-text-primary)] transition-colors text-left"
            >
              <Paperclip className={`w-4 h-4 shrink-0 ${attachment ? 'text-[#B8A070]' : 'text-[var(--p-text-secondary)]'}`} />
              <span className="flex-1">Upload file</span>
              {attachment && <Check className="w-3.5 h-3.5 text-[#B8A070] shrink-0" />}
            </button>

            {/* PR-18b: contributed inputActions from sibling components in the room. */}
            {overflowActions.length > 0 && (
              <>
                <div className="h-px bg-[var(--p-border-subtle)] mx-2" />
                {overflowActions.map((action) => {
                  const Icon = iconFor(action.iconName)
                  return (
                    <button
                      key={action.id}
                      onClick={() => {
                        onInvokeAction?.(action.id, { componentId: action.componentId, contributedBy: action.contributedBy })
                        setMenuOpen(false)
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm border border-transparent text-[var(--p-text-secondary)] hover:border-[var(--p-text-primary)]/20 hover:text-[var(--p-text-primary)] transition-colors text-left"
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{action.label || action.id}</span>
                    </button>
                  )
                })}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )}

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
            {renderPlusMenu()}

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

              /* ── Empty + a right-primary action contributed: render that
                    action's icon (mic for voice-toggle). PR-18b A1 — the
                    Swift V1 mic-to-send swap. Tapping publishes the
                    `input-action:${id}` event so the contributing
                    component (voice-input@1.0) can act on it. ── */
              ) : rightPrimaryAction ? (
                (() => {
                  const Icon = iconFor(rightPrimaryAction.iconName)
                  return (
                    <motion.button
                      key={`right-${rightPrimaryAction.id}`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={SPRING_SNAPPY}
                      whileTap={{ scale: 0.85 }}
                      onClick={() => onInvokeAction?.(rightPrimaryAction.id, {
                        componentId: rightPrimaryAction.componentId,
                        contributedBy: rightPrimaryAction.contributedBy,
                      })}
                      aria-label={rightPrimaryAction.label || rightPrimaryAction.id}
                      title={rightPrimaryAction.label || rightPrimaryAction.id}
                      className="rounded-lg border flex items-center justify-center flex-shrink-0"
                      style={{ width: 36, height: 36, borderColor: '#DDDDE3', backgroundColor: 'transparent' }}
                    >
                      <Icon className="w-4 h-4" style={{ color: '#6B7C93' }} />
                    </motion.button>
                  )
                })()

              /* ── Empty + no contributor: ghost Send fallback ── */
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
            {renderPlusMenu()}
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
