// SelectConversationModal — V2 extraction of V1's MoveToBranchModal.
//
// PR-10a.10. Reusable target-conversation picker for the per-message
// transfer flows: "Send to branch" (copies the message into the target
// conversation's messages) and "Pin for reference" (writes a pin record
// against the target conversation, no token cost).
//
// Visual + interaction lifted verbatim from
// adapters/albatross/ChatLayout.jsx (the inline `MoveToBranchModal`
// helper). The only V1 → V2 change is parametrizing the title +
// affordance copy so the same component serves both the send and the
// pin flows.
//
// Renders a "New conversation with this message" affordance ABOVE the
// search results so users can spin off a fresh conversation seeded
// with the message they're acting on. Caller decides how to handle
// the new-chat case via `onNewChat`; we just call back.

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Search, X } from 'lucide-react'

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }

export default function SelectConversationModal({
  conversations,
  currentId,
  title = 'Move to conversation',
  newChatLabel = 'New conversation with this message',
  onClose,
  onSelect,
  onNewChat,
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const others = [...(conversations || [])]
      .filter(c => c.id !== currentId)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    if (!q) return others.slice(0, 12)
    return others
      .filter(c =>
        c.title?.toLowerCase().includes(q) ||
        c.aiSummary?.toLowerCase().includes(q)
      )
      .slice(0, 12)
  }, [conversations, currentId, query])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
    >
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: -8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: -8 }}
        transition={SPRING_SNAPPY}
        className="relative z-10 bg-white border border-[var(--p-border)] rounded-xl w-full max-w-[480px] overflow-hidden"
        style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}
      >
        <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--p-border-subtle)' }}>
          <p className="text-xs font-medium text-[var(--p-text-secondary)] uppercase tracking-wider mb-2.5">
            {title}
          </p>
          <div className="flex items-center gap-3">
            <Search className="w-4 h-4 text-[var(--p-text-muted)] flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats..."
              className="flex-1 text-sm text-[var(--p-text-primary)] bg-transparent outline-none placeholder:text-[var(--p-text-muted)]"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-[var(--p-text-muted)] hover:text-[var(--p-text-secondary)] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {onNewChat && (
          <button
            onClick={onNewChat}
            className="w-full text-left px-4 py-2.5 hover:bg-[#F7F6F3] transition-colors"
            style={{ borderBottom: '1px solid var(--p-border-subtle)' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-[#B8A070] flex-shrink-0" />
              <p className="text-sm font-medium text-[#B8A070]">{newChatLabel}</p>
            </div>
          </button>
        )}

        <div
          className="max-h-[280px] overflow-y-auto py-1.5"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--p-border) transparent' }}
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-[var(--p-text-muted)]">No other conversations found</p>
            </div>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                onClick={() => onSelect?.(c.id)}
                className="w-full text-left px-4 py-2.5 hover:bg-[#F7F6F3] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 text-[var(--p-text-muted)] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--p-text-primary)] truncate font-medium">
                      {c.title || 'New Conversation'}
                    </p>
                    {c.aiSummary && (
                      <p className="text-[11px] text-[var(--p-text-secondary)] truncate mt-0.5">
                        {c.aiSummary}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div
          className="px-4 py-2.5 flex items-center"
          style={{ borderTop: '1px solid var(--p-border-subtle)' }}
        >
          <kbd
            className="px-1.5 py-0.5 rounded text-[10px] font-medium border border-[var(--p-border)] bg-[#F7F6F3] text-[var(--p-text-secondary)]"
            style={{ fontFamily: 'monospace' }}
          >
            Esc
          </kbd>
          <span className="text-[10px] text-[var(--p-text-muted)] ml-1">to close</span>
        </div>
      </motion.div>
    </motion.div>
  )
}
