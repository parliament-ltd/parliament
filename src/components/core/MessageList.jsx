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
      className="flex-1 overflow-y-auto p-6 space-y-4"
      onMouseDown={onContainerMouseDown}
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#EBEBEB transparent' }}
    >
      {/* Empty state */}
      {messages.length === 0 && !isStreaming && hiddenCount === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <img
            src="/logo.png"
            alt=""
            className="w-16 h-16 mb-4 object-contain"
            style={{ opacity: 0.22 }}
          />
          <p className="text-sm text-[#6B7C93] mb-1">Start a conversation</p>
          <p className="text-xs text-[#D5D5D5]">Type a message below to begin</p>
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
            whileHover={{ scale: 1.04, borderColor: '#4A7AE5' }}
            whileTap={{ scale: 0.97 }}
            onClick={onShowHidden}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-[#EBEBEB] cursor-pointer transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-[#6B7C93]" />
            <span className="text-xs text-[#6B7C93]">
              {hiddenCount} message{hiddenCount !== 1 ? 's' : ''} hidden
            </span>
          </motion.button>
        </motion.div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
