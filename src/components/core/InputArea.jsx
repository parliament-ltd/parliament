import { motion, AnimatePresence } from 'framer-motion'
import { Square } from 'lucide-react'
import { SPRING_SNAPPY, SPRING_SMOOTH } from '../../lib/constants'

/**
 * Textarea + send/stop button.
 * Handles keyboard shortcuts (Enter to send, Shift+Enter for newline).
 */
export default function InputArea({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming = false,
  placeholder = 'Ask a follow-up question...',
  disabled = false,
  inputRef,
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      isStreaming ? onStop?.() : onSend?.()
    }
  }

  return (
    <div className="relative p-4" data-tour="chat-input">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_SMOOTH, delay: 0.4 }}
        className="flex items-stretch gap-3"
      >
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-white rounded-lg px-4 py-3 text-sm text-[#1E2532] resize-none outline-none placeholder:text-[#9CA3AF] border border-[#EBEBEB] focus:border-[#4A7AE5] transition-colors disabled:opacity-50"
          rows={3}
        />
        <motion.button
          whileHover={{ scale: 1.03, borderColor: '#4A7AE5' }}
          whileTap={{ scale: 0.97 }}
          onClick={isStreaming ? onStop : onSend}
          className={`px-5 rounded-lg font-semibold text-sm border bg-white transition-colors flex items-center gap-2 ${
            isStreaming
              ? 'border-[#EF4444]/30 text-[#EF4444] hover:border-[#EF4444]'
              : 'border-[#EBEBEB] text-[#1E2532] hover:border-[#4A7AE5] hover:text-[#4A7AE5]'
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
