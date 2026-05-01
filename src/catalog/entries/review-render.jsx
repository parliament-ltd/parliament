// review@1.0 — production render for the V2 RoomShell chat path.
//
// PR-10a.9. Self-binds to ChatContext + AnnotationsContext +
// ConversationContext + SettingsContext per refactor/v2-phase1-audit.md
// §2.8a. Owns the synthesis-call lifecycle for the active conversation:
// the trigger button opens the V1 ReviewModal seeded with live
// messages / highlights / notes / favorites / branches / token-usage,
// and `onGenerateSynthesis` runs a Composer-tier Haiku call against the
// most recent ~20 messages with optional annotation context — same
// recipe as V1 Albatross.
//
// Composer tier per refactor/tier-classification.md: the synthesis call
// fires only when the user clicks "Generate Synthesis with Claude". No
// autonomous calls, no consent flow.
//
// Markdown export reuses MessageCard's content + per-message highlight /
// favorite / note state. Same lines lifted out of Albatross's
// handleExportMarkdown to keep V1 parity.

import { useCallback, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen } from 'lucide-react'
import ReviewModal from '../../components/ReviewModal'
import { useChat } from '../../stores/ChatContext'
import { useAnnotations } from '../../stores/AnnotationsContext'
import { useConversations } from '../../stores/ConversationContext'
import { useSettings } from '../../stores/SettingsContext'
import { getProvider } from '../../providers'
import { loadApiKey } from '../../lib/crypto'

const DEFAULT_CONTEXT_WINDOW = 200_000

export default function ReviewRender({ config = {} } = {}) {
  const { messages, tokenUsage, activeConversationId } = useChat()
  const { highlights, notes, favorites } = useAnnotations()
  const { conversations } = useConversations()
  const { settings } = useSettings()

  const [open, setOpen] = useState(false)

  const label = config.triggerLabel ?? 'Review'

  // Branches off the active conversation (matches V1 Albatross's branches
  // prop into ReviewModal — purely informational; the modal currently
  // doesn't render branches but accepts them for future use).
  const branches = useMemo(() => {
    if (!activeConversationId) return []
    return conversations.filter(c => c.parentId === activeConversationId)
  }, [conversations, activeConversationId])

  // ReviewModal expects notes as `[{ messageId, text }]` and favorites as
  // an array of message records. AnnotationsContext stores them as Maps
  // keyed by messageId — convert here so the modal's V1 contract holds.
  const notesArray = useMemo(() => {
    const out = []
    for (const [messageId, note] of notes) out.push({ messageId, text: note.text })
    return out
  }, [notes])

  const favoritedMessages = useMemo(() => {
    if (!favorites || favorites.size === 0) return []
    return messages.filter(m => favorites.has(m.id))
  }, [messages, favorites])

  // Context usage as a percentage — same calculation as context-render
  // and branches-render. Inlined here because review only needs the
  // number, not the meter UI.
  const contextUsage = useMemo(() => {
    const provider = getProvider('anthropic')
    const models = provider.getModels?.() || []
    const modelInfo = models.find(m => m.id === settings.defaultModel) || models[0]
    const contextWindow = modelInfo?.contextWindow || DEFAULT_CONTEXT_WINDOW
    const totalTokens = (tokenUsage?.input || 0) + (tokenUsage?.output || 0)
    return contextWindow > 0
      ? Math.min(Math.round((totalTokens / contextWindow) * 100), 100)
      : 0
  }, [tokenUsage, settings.defaultModel])

  // ─── Synthesis ─────────────────────────────────────────────
  //
  // V1 Albatross's onGenerateSynthesis trims the last 20 messages, builds
  // an annotation context string from active toggles, and asks Haiku to
  // synthesize. We mirror it verbatim — diverging here would surprise V1
  // users carrying over their workflow.
  const handleGenerateSynthesis = useCallback(async (options) => {
    const apiKey = await loadApiKey(settings.storageMode).catch(() => null)
    if (!apiKey) throw new Error('No API key configured. Add one in Settings to generate a synthesis.')
    const provider = getProvider('anthropic')
    const depth = options.depth === 'detailed' ? 'detailed' : 'brief'

    let annotationContext = ''
    if (options.includeHighlights && highlights.length > 0) {
      const terms = [...new Set(highlights.map(h => h.text))].join(', ')
      annotationContext += `\nHighlighted terms: ${terms}`
    }
    if (options.includeNotes && notesArray.length > 0) {
      const noteTexts = notesArray.map(n => n.text).join('; ')
      annotationContext += `\nUser notes: ${noteTexts}`
    }
    if (options.includeFavorites && favoritedMessages.length > 0) {
      const favPreviews = favoritedMessages.map(m => (m.content || '').slice(0, 100)).join('; ')
      annotationContext += `\nFavorited messages: ${favPreviews}`
    }

    const synthMessages = messages
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content?.slice(0, 300) || '' }))
    synthMessages.push({
      role: 'user',
      content: `Provide a ${depth} synthesis of our conversation.${annotationContext}\n\nFocus on: key decisions, conclusions, open questions, and action items. ${
        depth === 'brief' ? 'Keep it under 150 words.' : 'Be thorough but concise, under 400 words.'
      } Respond with ONLY the synthesis.`,
    })

    let result = ''
    await provider.sendMessage(
      apiKey,
      synthMessages,
      'claude-haiku',
      (chunk) => { result += chunk },
      new AbortController().signal
    )
    if (!result.trim()) throw new Error('Empty synthesis returned.')
    return result.trim()
  }, [
    settings.storageMode, messages,
    highlights, notesArray, favoritedMessages,
  ])

  // ─── Markdown export ──────────────────────────────────────
  //
  // Lifted from V1 Albatross's handleExportMarkdown. Keeps highlight terms,
  // favorites preview, and per-message inline notes in the same shape so
  // a user's saved workflow translates 1:1.
  const handleExportMarkdown = useCallback(() => {
    if (!messages.length) return
    const conv = conversations.find(c => c.id === activeConversationId)
    const title = conv?.title || 'Conversation'
    const date = new Date().toISOString().split('T')[0]
    const lines = []

    lines.push(`# ${title}`, '', `*Exported ${date} - ${messages.length} messages*`, '')

    if (highlights.length > 0) {
      const uniqueTerms = [...new Set(highlights.map(h => h.text))]
      lines.push('## Highlights', '')
      uniqueTerms.forEach(t => lines.push(`- ${t}`))
      lines.push('')
    }

    if (favoritedMessages.length > 0) {
      lines.push('## Favorites', '')
      favoritedMessages.forEach((m, i) => {
        const preview = (m.content || '').slice(0, 120).replace(/\n/g, ' ')
        const truncated = (m.content || '').length > 120 ? '...' : ''
        lines.push(`${i + 1}. **${m.role === 'user' ? 'You' : 'Claude'}:** ${preview}${truncated}`)
      })
      lines.push('')
    }

    lines.push('---', '')
    for (const msg of messages) {
      const labelText = msg.role === 'user' ? '### You' : '### Claude'
      const isFav = favorites.has(msg.id) ? ' ⭐' : ''
      lines.push(`${labelText}${isFav}`, '', msg.content || '', '')
      const note = notes.get(msg.id)
      if (note?.text) {
        lines.push(`> **Note:** ${note.text}`, '')
      }
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-').toLowerCase()}-${date}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [messages, conversations, activeConversationId, highlights, favorites, favoritedMessages, notes])

  return (
    <div className="px-4 py-4">
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.02, borderColor: '#B8A070' }}
        whileTap={{ scale: 0.98 }}
        disabled={!messages.length}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-[var(--p-border)] bg-white text-[var(--p-text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <BookOpen className="w-4 h-4 text-[var(--p-text-secondary)]" />
        {label}
      </motion.button>

      {open && (
        <ReviewModal
          onClose={() => setOpen(false)}
          messages={messages}
          highlights={highlights}
          notes={notesArray}
          favorites={favoritedMessages}
          branches={branches}
          tokenUsage={tokenUsage}
          contextUsage={contextUsage}
          onGenerateSynthesis={handleGenerateSynthesis}
          onExportMarkdown={handleExportMarkdown}
        />
      )}
    </div>
  )
}
