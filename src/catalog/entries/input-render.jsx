// input@1.0 — live render component for the V2 RoomShell chat path.
//
// PR-10a.5. Self-binds to ChatContext + SettingsContext per
// refactor/v2-phase1-audit.md §2.8a "Component data plumbing".
//
// Wraps the existing src/components/core/InputArea.jsx without modifying
// it — same component the V1 Albatross adapter renders, just driven by
// useChat()/useSettings() hooks instead of props from a 1500-line
// ChatLayout. The shape of sendMessage()'s call (apiKey, conversationId,
// content, model, provider, systemPrompt, tools) mirrors Albatross
// exactly, so streaming, tool-loop, ghost-text-on-failure all behave
// the same.
//
// What this slice wires:
//   - Composing text into a local value state.
//   - Send → useChat().sendMessage(...).
//   - Stop → useChat().stopGenerating() during streaming.
//   - Voice-transcript bus subscription preserved from PR-5 — final
//     transcripts append to the value when subscribeToVoice is on.
//
// What this slice intentionally does NOT wire (next slices, before PR-10b):
//   - Attachment upload / file context (file-shelf@1.0 territory anyway).
//   - Tool toggles (web_search / calculate / create_chart) — UI shows
//     them via the +menu but click is a no-op for now. Sending without
//     tools selected is the V1 default behavior, so this isn't a regression.
//   - Collab-mode system prompt (collab-mode@1.0 wires this later).
//   - Mid-conversation key-failure / rate-limit banners — the input
//     surfaces a small inline error instead until those land.
//
// Lives in its own file (separate from input.jsx, the catalog manifest's
// default export) so react-refresh's only-export-components rule stays
// happy and so input-preview.jsx can stay focused on the catalog
// debug-route render.

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import InputArea from '../../components/core/InputArea'
import { useChat } from '../../stores/ChatContext'
import { useSettings } from '../../stores/SettingsContext'
import { usePWA } from '../../stores/PWAContext'
import { getProvider } from '../../providers'
import { loadApiKey } from '../../lib/crypto'
import { PHASE_1_EVENTS } from '../../lib/hostAPI'

const SEND_DEBOUNCE_MS = 500

export default function InputRender({ config = {}, hostAPI } = {}) {
  const { id: conversationId } = useParams()
  const { isStreaming, sendMessage, stopGenerating } = useChat()
  const { settings, refreshStorageEstimate } = useSettings()
  const { isOnline, trackMessageSent } = usePWA()

  const [value, setValue] = useState('')
  const [error, setError] = useState(null) // small inline error for send failures
  const [lastSendAt, setLastSendAt] = useState(0)

  const subscribeToVoice = config.subscribeToVoice !== false // default true
  const cardLayout = !!config.cardLayout
  const placeholder = config.placeholder ?? 'Ask a question...'

  // PR-5 bus subscription — append final voice transcripts to the value.
  useEffect(() => {
    if (!subscribeToVoice || !hostAPI?.subscribe) return
    return hostAPI.subscribe(PHASE_1_EVENTS.VOICE_TRANSCRIPT, (payload) => {
      if (!payload || !payload.isFinal) return
      const t = typeof payload.text === 'string' ? payload.text.trim() : ''
      if (!t) return
      setValue(prev => (prev ? `${prev} ${t}` : t))
    })
  }, [subscribeToVoice, hostAPI])

  // Clear error when the user starts typing again.
  useEffect(() => {
    if (error) setError(null)
    // Intentionally only depend on value changes — the effect's only job
    // is to dismiss a stale error on edit. eslint-disable to silence the
    // exhaustive-deps complaint about not depending on `error`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const handleSend = useCallback(async () => {
    const trimmed = value.trim()
    if (!trimmed || isStreaming || !conversationId) return
    if (!isOnline) {
      setError('You\'re offline. Reconnect to send.')
      return
    }
    const now = Date.now()
    if (now - lastSendAt < SEND_DEBOUNCE_MS) return
    setLastSendAt(now)

    let apiKey
    try {
      apiKey = await loadApiKey(settings.storageMode)
    } catch (err) {
      setError('Couldn\'t read your API key. Open Settings to re-enter it.')
      if (import.meta.env.DEV) console.warn('[input@1.0] loadApiKey failed:', err)
      return
    }
    if (!apiKey) {
      setError('No API key configured. Add one in Settings to continue.')
      return
    }

    const provider = getProvider('anthropic')
    setValue('')
    setError(null)
    try {
      // No system prompt and no tools in the PR-10a.5 slice — those
      // hook in when collab-mode@1.0 / tool-toggle wiring lands.
      await sendMessage(apiKey, conversationId, trimmed, settings.defaultModel, provider, '', [])
      try { await refreshStorageEstimate() } catch { /* non-fatal */ }
      try { trackMessageSent() } catch { /* non-fatal */ }
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        setError('Your API key is no longer working. Update it in Settings to continue.')
      } else if (err?.status === 429) {
        setError('Rate limit reached. Please wait a moment before sending.')
      } else if (err?.name !== 'AbortError') {
        setError(err?.message || 'Something went wrong. Please try again.')
      }
    }
  }, [
    value, isStreaming, conversationId, isOnline, lastSendAt,
    settings.storageMode, settings.defaultModel,
    sendMessage, refreshStorageEstimate, trackMessageSent,
  ])

  const handleStop = useCallback(() => {
    stopGenerating()
  }, [stopGenerating])

  return (
    <div className="px-4 pb-4 pt-2">
      {error && (
        <div
          className="mb-2 px-3 py-2 rounded-md text-xs"
          style={{
            backgroundColor: 'var(--p-bg-surface)',
            color: 'var(--p-error, #E03E3E)',
            border: '1px solid var(--p-border)',
          }}
          role="alert"
        >
          {error}
        </div>
      )}
      <InputArea
        value={value}
        onChange={setValue}
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
        isOnline={isOnline}
        placeholder={placeholder}
        cardLayout={cardLayout}
        // Tool toggles UI rendered via the +menu, but the active set is
        // empty for now — wiring lands with the next slice. Passing an
        // empty Set + empty list keeps the menu interactive without
        // surfacing a click that does nothing.
        availableTools={[]}
        activeTools={new Set()}
        onToggleTool={() => { /* no-op until tool wiring lands */ }}
      />
    </div>
  )
}
