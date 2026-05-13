import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Square, ArrowUp, Plus, X, Mic, Globe, Paperclip, Image as ImageIcon, FileText } from 'lucide-react'
import { SPRING_SNAPPY, SPRING_SMOOTH } from '../../lib/constants'
import { formatSize } from '../../lib/fileUpload'

// PR-18b: contribution icon lookup. Components that contribute `inputActions`
// pass an `iconName` string in their manifest; we resolve it here so the
// manifest stays serializable JSON. Predeclared with the icons Phase-1
// contributions use — voice-input ('Mic'), web-search ('Globe'),
// file-attach ('Paperclip'). Unknown names render as the generic Plus
// icon below.
const ICON_BY_NAME = { Mic, Globe, Paperclip }
function iconFor(name) { return ICON_BY_NAME[name] || Plus }

// PR-18e: category → icon lookup for the attachment chip strip. Icons
// only (no thumbnails) — consistent with the rest of the app's icon-
// driven UI, and skips the failure modes of rendering arbitrary base64
// payloads inline (broken images, corrupted PDFs, OOM on huge files).
const CATEGORY_ICON = { image: ImageIcon, document: FileText, text: FileText }
function iconForCategory(category) { return CATEGORY_ICON[category] || FileText }

/**
 * Textarea + send/stop + '+' menu (purely contribution-driven).
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
 *   rightPrimaryAction {object|null}  PR-18b: a contributed action where `primary === 'right'`. When text is empty AND not streaming, this renders in the right-side button slot (mic for voice-toggle). Tapping invokes onInvokeAction(action.id).
 *   overflowActions    {object[]}     PR-18b: contributed actions WITHOUT a primary flag — populate the '+' overflow menu.
 *   onInvokeAction     {(actionId, payload) => void}  PR-18b: called when the user taps any contributed action. input-render publishes `input-action:${id}` on the hostAPI bus.
 *   armedTools         {object[]}     PR-18d: currently armed tools (from hostAPI.getArmedTools()). Rendered as the blue chip strip above the textarea.
 *   onDisarmTool       {(componentId) => void}  PR-18d: called when the user clicks the × on an armed-tool chip.
 *   attachments        {object[]}     PR-18e: currently staged file attachments (from hostAPI.getAttachments()). Each entry has `{ componentId, id, name, size, mimeType, category, ... }`. Rendered as a neutral grey chip strip above the textarea.
 *   onRemoveAttachment {(componentId, attachmentId) => void}  PR-18e: called when the user clicks the × on an attachment chip.
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
  rightPrimaryAction = null,
  overflowActions = [],
  onInvokeAction,
  armedTools = [],
  onDisarmTool,
  attachments = [],
  onRemoveAttachment,
  cardLayout = false,
}) {
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

  // PR-18e: the intrinsic file-upload entry is gone — file-attach@1.0
  // replaces it as an overflow `inputAction` contribution. With zero
  // intrinsic items, the disabled state activates live for any room
  // mounted without overflow contributors (e.g. a stripped Quiet Room).
  const overflowIsEmpty = overflowActions.length === 0

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

  /* ── Shared: popup menu. Declared as a function returning JSX (not
       a component) so it stays a stable identity per render — avoids
       react-hooks/static-components flagging an inner component
       declaration that would reset state every parent render.
       PR-18e: the intrinsic file-upload entry is gone; the menu is
       purely contribution-driven. When `overflowActions.length === 0`,
       the `+` button itself disables. ── */
  function renderPlusMenu() { return (
    <div className="relative" ref={plusRef}>
      <motion.button
        whileHover={overflowIsEmpty ? undefined : { scale: 1.05 }}
        whileTap={overflowIsEmpty ? undefined : { scale: 0.95 }}
        onClick={() => { if (!overflowIsEmpty) setMenuOpen(prev => !prev) }}
        disabled={overflowIsEmpty}
        className={`relative w-8 h-8 rounded-lg border flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          menuOpen
            ? 'border-[#B8A070]/60 bg-[#B8A070]/8 text-[#B8A070]'
            : 'border-[#E9E9E7] text-[var(--p-text-secondary)] hover:border-[var(--p-text-primary)]/20 hover:text-[var(--p-text-primary)]'
        }`}
        title={
          overflowIsEmpty
            ? 'Add components to enable more actions'
            : 'Open actions menu'
        }
      >
        <Plus className="w-4 h-4" />
      </motion.button>

      <AnimatePresence>
        {menuOpen && overflowActions.length > 0 && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={SPRING_SNAPPY}
            className="absolute bottom-full left-0 mb-2 z-50 min-w-[180px] rounded-xl border border-[var(--p-border)] bg-[var(--p-bg-surface)] shadow-lg shadow-black/8 overflow-hidden"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )}

  /* ── PR-18e: attachment chip strip. Renders one neutral grey pill
       per entry in hostAPI.getAttachments() (passed through props).
       Icon by category (image / document / text), filename, size, and
       × to remove. ── */
  function renderAttachmentsStrip() {
    if (!attachments || attachments.length === 0) return null
    return (
      <div className="flex flex-wrap gap-1.5">
        {attachments.map((att) => {
          const Icon = iconForCategory(att.category)
          return (
            <div
              key={att.id}
              className="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-full text-[11px] font-medium"
              style={{
                backgroundColor: 'rgba(155,154,151,0.10)',
                color: 'var(--p-text-primary)',
                border: '1px solid #E9E9E7',
              }}
            >
              <Icon className="w-3 h-3 shrink-0 text-[var(--p-text-secondary)]" />
              <span className="truncate max-w-[140px]" title={att.name}>{att.name}</span>
              <span className="text-[10px] opacity-60">{formatSize(att.size)}</span>
              {att.truncated && (
                <span className="text-[10px] font-semibold text-[#D9730D]" title="Content was truncated to fit the limit">truncated</span>
              )}
              <button
                type="button"
                onClick={() => onRemoveAttachment?.(att.componentId, att.id)}
                aria-label={`Remove ${att.name}`}
                title={`Remove ${att.name}`}
                className="ml-0.5 w-4 h-4 rounded-full inline-flex items-center justify-center hover:bg-[rgba(155,154,151,0.18)] transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  /* ── PR-18d: armed-tools chip strip. Renders one pill per entry
       in hostAPI.getArmedTools() (passed through props). Doubles as
       cost-transparency surface ("Uses API credits") and disarm
       affordance (× button calls onDisarmTool with the componentId).
       Rendered above the textarea in both card and inline layouts. ── */
  function renderArmedToolsStrip() {
    if (!armedTools || armedTools.length === 0) return null
    return (
      <div className="flex flex-wrap gap-1.5">
        {armedTools.map((tool) => {
          const Icon = iconFor(tool.iconName)
          const label = tool.label || tool.id
          return (
            <div
              key={tool.componentId}
              className="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-full text-[11px] font-medium"
              style={{
                backgroundColor: 'rgba(74,122,229,0.10)',
                color: '#4A7AE5',
                border: '1px solid rgba(74,122,229,0.25)',
              }}
            >
              <Icon className="w-3 h-3 shrink-0" />
              <span>{label}</span>
              <span className="text-[10px] opacity-70 hidden sm:inline">· Uses API credits</span>
              <button
                type="button"
                onClick={() => onDisarmTool?.(tool.componentId)}
                aria-label={`Turn off ${label} for next message`}
                title={`Turn off ${label} for next message`}
                className="ml-0.5 w-4 h-4 rounded-full inline-flex items-center justify-center hover:bg-[rgba(74,122,229,0.18)] transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          )
        })}
      </div>
    )
  }

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
          {/* PR-18e: attachment chip strip */}
          {attachments.length > 0 && (
            <div className="mx-3 mt-3">
              {renderAttachmentsStrip()}
            </div>
          )}

          {/* PR-18d: armed-tools chip strip */}
          {armedTools.length > 0 && (
            <div className="mx-3 mt-3">
              {renderArmedToolsStrip()}
            </div>
          )}

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

      </div>
    )
  }

  /* ── Inline layout (Albatross / desktop) ────────────────── */
  return (
    <div className="relative p-4" data-tour="chat-input">
      {/* PR-18e: attachment chip strip */}
      {attachments.length > 0 && (
        <div className="mb-2">
          {renderAttachmentsStrip()}
        </div>
      )}

      {/* PR-18d: armed-tools chip strip */}
      {armedTools.length > 0 && (
        <div className="mb-2">
          {renderArmedToolsStrip()}
        </div>
      )}

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
    </div>
  )
}
