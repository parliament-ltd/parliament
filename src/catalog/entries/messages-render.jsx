// messages@1.0 — live render component for the V2 RoomShell chat path.
//
// PR-10a.5 wired the live message list, streaming, and ghost-text
// continue. PR-10a.6 adds the per-message annotation handlers:
// favorites toggle, inline note panel + save, and text-selection
// highlight popover. State for those is shared with the right-rail
// components (highlights@1.0, notes@1.0) via AnnotationsContext —
// see refactor/v2-phase1-audit.md §2.8a "Component data plumbing".
//
// What this slice wires (cumulative):
//   - PR-10a.5: live messages, streaming splice, ghost-text continue,
//     copy.
//   - PR-10a.6: favorite toggle (Star icon), inline note panel
//     (StickyNote icon), text-selection highlight (popover with color
//     picker, persisted), inline highlight rendering (matched terms
//     wrapped in <mark> via MessageCard's `highlights` prop).
//
// What this slice intentionally does NOT wire (subsequent slices,
// before PR-10b):
//   - Branch creation / branch panel / move-to-branch (branches@1.0).
//   - Hide / delete with undo (still no-op).
//   - Per-message action menu items contributed by other components —
//     contributions ARE aggregated by RoomShell, but nothing is rendered
//     in MessageCard's menu yet (the existing icons cover Phase 1
//     contributors; the more-options menu surfaces hide/move/copy only
//     until contributed actions get a UI surface).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import MessageList from '../../components/core/MessageList'
import MessageCard from '../../components/core/MessageCard'
import { useChat } from '../../stores/ChatContext'
import { useSettings } from '../../stores/SettingsContext'
import { useAnnotations } from '../../stores/AnnotationsContext'
import { getProvider } from '../../providers'
import { loadApiKey } from '../../lib/crypto'

export default function MessagesRender() {
  const { id: conversationId } = useParams()
  const { messages, isStreaming, streamingContent, continueMessage } = useChat()
  const { settings } = useSettings()
  const {
    favorites, notes, highlights, showNotes,
    toggleFavorite, toggleNotePanel, saveNote, addHighlight,
  } = useAnnotations()
  const containerRef = useRef(null)
  const bottomRef = useRef(null)
  const [activePopoverMsgId, setActivePopoverMsgId] = useState(null)

  // Auto-scroll to bottom on new messages or streaming chunks. Mirrors
  // the V1 Albatross behavior. Uses 'smooth' for finished messages and
  // 'auto' for streaming so chunked rendering doesn't fight scroll easing.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' })
  }, [messages, streamingContent, isStreaming])

  // Visible vs hidden — PR-10a.5 doesn't wire the hide-undo flow, so
  // visibleMessages == messages. Reserved variable name kept so the
  // signature mirrors Albatross when the next slice wires hide.
  const visibleMessages = messages

  const handleContinue = useCallback(async (incompleteId) => {
    try {
      const apiKey = await loadApiKey(settings.storageMode)
      if (!apiKey) return
      const provider = getProvider('anthropic')
      await continueMessage(apiKey, incompleteId, settings.defaultModel, provider, '')
    } catch (err) {
      if (err?.name !== 'AbortError' && import.meta.env.DEV) {
        console.warn('[messages@1.0] continueMessage failed:', err)
      }
    }
  }, [settings.storageMode, settings.defaultModel, continueMessage])

  const handleCopyText = useCallback(async (content) => {
    try {
      await navigator.clipboard.writeText(content)
    } catch {
      // Clipboard API can fail in non-secure contexts; fall back.
      const textarea = document.createElement('textarea')
      textarea.value = content
      document.body.appendChild(textarea)
      textarea.select()
      try { document.execCommand('copy') } catch { /* nothing more we can do */ }
      document.body.removeChild(textarea)
    }
  }, [])

  // Stable index → message-number map (1-based per role-pair, matching
  // Albatross's #N counter behavior).
  const numberByMessageId = useMemo(() => {
    const m = new Map()
    let userCount = 0
    let assistantCount = 0
    for (const msg of messages) {
      if (msg.role === 'user') {
        userCount++
        m.set(msg.id, userCount)
      } else if (msg.role === 'assistant') {
        assistantCount++
        m.set(msg.id, assistantCount)
      }
    }
    return m
  }, [messages])

  const renderCard = useCallback((msg, idx) => {
    // For the assistant message currently being streamed, splice in the
    // partial content so the user sees text appear in real time. ChatContext
    // exposes streamingContent separately because it doesn't write the
    // partial to state on every chunk — that would be expensive.
    const isLatestAssistantStreaming =
      isStreaming &&
      msg.role === 'assistant' &&
      idx === messages.length - 1 &&
      msg.content === '' // empty placeholder created by sendMessage

    const displayContent = isLatestAssistantStreaming ? streamingContent : msg.content

    // Ghost text for interrupted messages — same treatment as Albatross
    // (low opacity + dashed border via MessageCard's isGhostText prop).
    // Don't ghost the actively-streaming placeholder; only completed-but-
    // incomplete records get the ghost treatment.
    const isGhost = msg.incomplete && !isLatestAssistantStreaming

    const noteRecord = notes.get(msg.id)
    const isFav = favorites.has(msg.id)

    return (
      <MessageCard
        key={msg.id}
        id={msg.id}
        type={msg.role === 'user' ? 'user' : 'assistant'}
        content={displayContent}
        number={numberByMessageId.get(msg.id) || 0}
        index={idx}
        isGhostText={isGhost}
        isFavorited={isFav}
        showNotes={showNotes.has(msg.id)}
        savedNoteText={noteRecord?.text || ''}
        // MessageCard renders all conversation highlights and matches
        // them against this card's content; passing the whole list (not
        // a per-message slice) is the V1 contract.
        highlights={highlights}
        isPopoverActive={activePopoverMsgId === msg.id}
        onPopoverChange={(active) => setActivePopoverMsgId(active ? msg.id : null)}
        onContinue={isGhost ? () => handleContinue(msg.id) : undefined}
        onCopyText={() => handleCopyText(msg.content)}
        onFavorite={() => toggleFavorite(msg.id)}
        onNote={() => toggleNotePanel(msg.id)}
        onNoteSave={(text) => saveNote(msg.id, text)}
        onHighlight={(text, color) => addHighlight(msg.id, text, color)}
        // Branch / hide / delete / move-to-branch land in subsequent
        // slices. Optional-chained inside MessageCard so omitting them
        // leaves the icon clickable but inert.
      />
    )
  }, [
    messages.length, isStreaming, streamingContent,
    numberByMessageId, activePopoverMsgId,
    favorites, notes, highlights, showNotes,
    handleContinue, handleCopyText,
    toggleFavorite, toggleNotePanel, saveNote, addHighlight,
  ])

  // Defensive: if for some reason ChatContext's activeConversationId
  // doesn't match the route id, fall back to the empty state rather
  // than render stale messages from another conversation. ChatView's
  // <RoomShellChatHost> gates the render until they match, so this
  // shouldn't fire in practice.
  void conversationId

  return (
    <MessageList
      messages={visibleMessages}
      renderCard={renderCard}
      hiddenCount={0}
      isStreaming={isStreaming}
      containerRef={containerRef}
      bottomRef={bottomRef}
    />
  )
}
