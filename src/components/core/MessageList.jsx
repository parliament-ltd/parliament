import { motion } from 'framer-motion'
import { Eye } from 'lucide-react'
import { SPRING_GENTLE } from '../../lib/constants'

/**
 * Scrollable message container.
 *
 * renderCard(msg, idx) — called for each visible message; returns a ReactElement.
 * containerRef / bottomRef — forwarded from the parent layout for scroll control.
 */
export default function MessageList({
  messages = [],
  renderCard,
  hiddenCount = 0,
  onShowHidden,
  isStreaming = false,
  containerRef,
  bottomRef,
  onContainerMouseDown,
}) {
  return (
    <div
      ref={containerRef}
      // PR-18b: `messages-fade-mask` is inert above 768px; on mobile a
      // CSS `mask-image: linear-gradient(...)` in index.css fades the
      // bottom ~64px of the scroll container into transparency so
      // message content reads as flowing into the input below
      // (matches the Swift V1 visual). PR-18f: same gradient now fades
      // the top 48px so the chat reads as flowing under NarrowChrome /
      // Pocket Chat's home strip (those dropped their border-b).
      // p-chat: its padding, its reading width and the space between turns,
      // as the newer mockups draw a chat (C280 (c); chat.css).
      className="p-chat flex-1 overflow-y-auto messages-fade-mask"
      onMouseDown={onContainerMouseDown}
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#E9E9E7 transparent' }}
    >
      {/* Empty state */}
      {messages.length === 0 && !isStreaming && hiddenCount === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <img
            src="/parliament_logo.png"
            alt=""
            className="w-16 h-16 mb-4 object-contain"
            style={{ opacity: 0.26 }}
          />
          <p className="text-sm text-[var(--p-text-secondary)] mb-1">Start a conversation</p>
          <p className="text-xs text-[var(--p-text-muted)]">Type a message below to begin</p>
        </div>
      )}

      {/* Message cards */}
      {messages.map((msg, idx) => renderCard(msg, idx))}

      {/* Hidden messages indicator */}
      {hiddenCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRING_GENTLE}
          className="flex items-center justify-center py-2"
        >
          <motion.button
            whileHover={{ scale: 1.04, borderColor: 'rgba(25, 25, 25, .30)' }}
            whileTap={{ scale: 0.97 }}
            onClick={onShowHidden}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-[#E9E9E7] cursor-pointer transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-[var(--p-text-secondary)]" />
            <span className="text-xs text-[var(--p-text-secondary)]">
              {hiddenCount} message{hiddenCount !== 1 ? 's' : ''} hidden
            </span>
          </motion.button>
        </motion.div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
