// notes@1.0 — live render for the V2 RoomShell chat path.
//
// PR-10a.6. Self-binds to AnnotationsContext + ChatContext per
// refactor/v2-phase1-audit.md §2.8a.
//
// V1 Albatross surfaced notes inline on each MessageCard (the slide-out
// note panel). The catalog version preserves that inline behavior
// (messages-render still owns the inline panel + onNoteSave) and adds
// a side-rail summary list here so users with a Notes pane in
// right-rail / right-rail-extra can see all conversation notes at once.
// Click a note to scroll to its source message; trash icon deletes.

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Trash2, StickyNote } from 'lucide-react'
import { useAnnotations } from '../../stores/AnnotationsContext'
import { useRoomChat } from '../../stores/useRoomChat'

export default function NotesRender({ config = {} } = {}) {
  const { notes, deleteNote, toggleNotePanel } = useAnnotations()
  const { messages } = useRoomChat()

  // Build the display list. Each note is keyed by its message id; we
  // hydrate with the message's content snippet for context.
  const list = useMemo(() => {
    const out = []
    for (const [messageId, note] of notes) {
      const msg = messages.find(m => m.id === messageId)
      if (!msg) continue // message may have been deleted; skip
      out.push({
        id: note.id,
        messageId,
        text: note.text,
        snippet: (msg.content || '').slice(0, 80),
        role: msg.role,
        createdAt: note.createdAt,
      })
    }
    const order = config.sortOrder || 'newest'
    if (order === 'newest') out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    else if (order === 'oldest') out.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    else if (order === 'message-order') {
      const idx = new Map(messages.map((m, i) => [m.id, i]))
      out.sort((a, b) => (idx.get(a.messageId) ?? 0) - (idx.get(b.messageId) ?? 0))
    }
    return out
  }, [notes, messages, config.sortOrder])

  const handleClickNote = (messageId) => {
    // Open the inline note panel for that message AND scroll to it.
    // Toggling the panel surfaces the editable textarea — same control
    // surface as clicking the StickyNote icon on the message itself.
    toggleNotePanel(messageId)
    document.getElementById(`msg-${messageId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }

  const handleDelete = (e, note) => {
    e.stopPropagation()
    deleteNote(note.id)
  }

  if (list.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <StickyNote className="w-5 h-5 mx-auto text-[var(--p-text-muted)] mb-2" />
        <p className="text-xs text-[var(--p-text-secondary)]">
          No notes yet. Click the <StickyNote className="inline w-3 h-3 mx-0.5" /> icon
          on a message to add one.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 space-y-2">
      {list.map(note => (
        <motion.div
          key={note.id}
          whileHover={{ x: 4 }}
          onClick={() => handleClickNote(note.messageId)}
          className="group/note cursor-pointer rounded-lg border border-[#F1F1EF] bg-white p-3"
          style={{ backgroundColor: '#FEFCE8' }}
        >
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-[#D9730D] font-medium">
              {note.role === 'user' ? 'Your message' : 'Claude'}
            </span>
            <button
              type="button"
              onClick={(e) => handleDelete(e, note)}
              className="opacity-0 group-hover/note:opacity-100 transition-opacity text-[var(--p-text-secondary)] hover:text-[var(--p-error,#E03E3E)]"
              title="Delete note"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs text-[var(--p-text-primary)] mb-1.5">{note.text}</p>
          <p
            className="text-[10px] text-[var(--p-text-secondary)] truncate"
            title={note.snippet}
          >
            on: {note.snippet}
          </p>
        </motion.div>
      ))}
    </div>
  )
}
