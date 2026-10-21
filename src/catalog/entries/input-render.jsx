// input@1.0 — live render component for the V2 RoomShell chat path.
//
// PR-10a.5. Self-binds to ChatContext + SettingsContext per
// refactor/v2-phase1-audit.md §2.8a "Component data plumbing".
//
// Wraps the existing src/components/core/InputArea.jsx without modifying
// it — same component the V1 Albatross adapter renders, just driven by
// useChat()/useSettings() hooks instead of props from a 1500-line
// ChatLayout. sendMessage() takes (conversationId, content, model,
// systemPrompt, tools, attachments); the gateway picks the provider's key
// itself (stage 4), so streaming, tool-loop and ghost-text-on-failure behave
// as before without the key passing through here.
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
//   - Mid-conversation key-failure / rate-limit banners — the input
//     surfaces a small inline error instead until those land.
//
// PR-10a.9: collab-mode system prompt wired in. `useCollabMode().
// buildSystemPrompt()` resolves the active presets + custom instruction
// for the active conversation (resets on conversation change inside the
// context) and threads them into sendMessage's existing systemPrompt
// argument.
//
// Lives in its own file (separate from input.jsx, the catalog manifest's
// default export) so react-refresh's only-export-components rule stays
// happy and so input-preview.jsx can stay focused on the catalog
// debug-route render.

import { useCallback, useEffect, useMemo, useState } from 'react'
import InputArea from '../../components/core/InputArea'
import { useChat } from '../../stores/ChatContext'
import { useConversationId } from '../../stores/ConversationScope'
import { useSettings } from '../../stores/SettingsContext'
import { usePWA } from '../../stores/PWAContext'
import { useCollabMode } from '../../stores/CollabModeContext'
import { hasKey } from '../../net'
import { PHASE_1_EVENTS } from '../../lib/hostAPI'
import { useIsNarrow } from '../../lib/useViewportWidth'
import { checkOnDeviceVoice } from '../../hooks/useVoiceInput'
import {
  attachmentToContentBlock,
  formatTextAttachmentForMessage,
} from '../../lib/fileUpload'

const SEND_DEBOUNCE_MS = 500

export default function InputRender({ config = {}, hostAPI } = {}) {
  // The conversation this board shows, told by the board (stage 3), not
  // read from the address bar.
  const conversationId = useConversationId()
  const { isStreaming, sendMessage, stopGenerating } = useChat()
  const { settings, refreshStorageEstimate } = useSettings()
  const { isOnline, trackMessageSent } = usePWA()
  const { buildSystemPrompt } = useCollabMode()

  const [value, setValue] = useState('')
  const [error, setError] = useState(null) // small inline error for send failures
  const [lastSendAt, setLastSendAt] = useState(0)

  const subscribeToVoice = config.subscribeToVoice !== false // default true
  // PR-18b: card layout is forced on narrow viewports regardless of
  // the config value, so all room layouts that mount input@1.0
  // inherit the mobile design when the user is on a phone. Above
  // 768px the config-driven default (off → inline render) wins.
  const isNarrow = useIsNarrow(768)
  const cardLayout = !!config.cardLayout || isNarrow
  const placeholder = config.placeholder ?? 'Ask a question...'

  // PR-18b: read sibling inputActions contributions from the room's
  // hostAPI. RoomShell aggregates these from every mounted component's
  // manifest (see src/components/RoomShell.jsx). Split into:
  //   - rightPrimaryAction: first contribution with `primary === 'right'`
  //     (renders as the right button slot — mic↔send swap consumer)
  //   - overflowActions: contributions without a `primary` flag
  //     (render in the `+` overflow menu)
  // Recomputes when the mode (and therefore the list) changes — hostAPI
  // is keyed off mode.id in RoomShell so the identity is stable for
  // the duration of a room view.
  // The voice block's microphone shows only where the browser can transcribe
  // on the device (ruling C70). Hidden until the browser says it can.
  const [voiceOk, setVoiceOk] = useState(false)
  useEffect(() => {
    const offersVoice = (hostAPI?.getInputActions?.() || []).some(a => a.id === 'voice-toggle')
    if (!offersVoice) return
    let cancelled = false
    checkOnDeviceVoice().then(s => { if (!cancelled) setVoiceOk(s !== 'unavailable') })
    return () => { cancelled = true }
  }, [hostAPI])

  const { rightPrimaryAction, overflowActions } = useMemo(() => {
    const list = hostAPI?.getInputActions?.() || []
    let primary = null
    const overflow = []
    for (const action of list) {
      if (action.id === 'voice-toggle' && !voiceOk) continue
      if (action.primary === 'right' && primary === null) {
        primary = action
      } else if (!action.primary) {
        overflow.push(action)
      }
    }
    return { rightPrimaryAction: primary, overflowActions: overflow }
  }, [hostAPI, voiceOk])

  // PR-18b: when InputArea invokes a contributed action, publish on the
  // hostAPI bus so the contributing component (e.g. voice-input@1.0
  // listening for `input-action:voice-toggle`) can react.
  const handleInvokeAction = useCallback((actionId, payload) => {
    if (!actionId) return
    hostAPI?.publish?.(`input-action:${actionId}`, payload || {})
  }, [hostAPI])

  // PR-18d: mirror hostAPI.getArmedTools() into local state. Bumping
  // on each tool-armed-changed event re-reads from the registry and
  // re-renders the chip strip via the InputArea prop.
  const [armedTools, setArmedTools] = useState(() => hostAPI?.getArmedTools?.() || [])
  useEffect(() => {
    if (!hostAPI?.subscribe) return
    const refresh = () => setArmedTools(hostAPI?.getArmedTools?.() || [])
    return hostAPI.subscribe('tool-armed-changed', refresh)
  }, [hostAPI])

  // PR-18d: chip strip × → hostAPI._disarmTool, which publishes
  // tool-armed-changed back to update the strip and notify the
  // contributing component to clear its own local armed flag.
  const handleDisarmTool = useCallback((componentId) => {
    if (!componentId) return
    hostAPI?._disarmTool?.(componentId)
  }, [hostAPI])

  // PR-18e: mirror hostAPI.getAttachments() into local state. file-attach@1.0
  // calls _setAttachments on every picker change; we refresh the chip
  // strip via subscription to the resulting `attachments-changed` event.
  const [attachments, setAttachments] = useState(() => hostAPI?.getAttachments?.() || [])
  useEffect(() => {
    if (!hostAPI?.subscribe) return
    const refresh = () => setAttachments(hostAPI?.getAttachments?.() || [])
    return hostAPI.subscribe('attachments-changed', refresh)
  }, [hostAPI])

  // PR-18e: chip × → remove one attachment from the registry. We re-set
  // the component's list to the same array minus the one being removed.
  // hostAPI publishes attachments-changed; the contributing component's
  // local state listens and re-syncs.
  const handleRemoveAttachment = useCallback((componentId, attachmentId) => {
    if (!componentId || !attachmentId) return
    const current = hostAPI?.getAttachments?.() || []
    const remaining = current
      .filter(a => a.componentId === componentId && a.id !== attachmentId)
      .map(a => ({ ...a }))
    hostAPI?._setAttachments?.(componentId, remaining)
  }, [hostAPI])

  // PR-18e: surface attach:error bus events inline above the textarea
  // using the same `error` state that powers send-failure messages.
  // file-attach@1.0 publishes these on unsupported types, oversize
  // files, or read failures.
  useEffect(() => {
    if (!hostAPI?.subscribe) return
    return hostAPI.subscribe('attach:error', (payload) => {
      const msg = payload?.message || 'Could not read that file.'
      setError(msg)
    })
  }, [hostAPI])

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
    const attachmentsAtSend = hostAPI?.getAttachments?.() || []
    const trimmed = value.trim()
    // PR-18e: allow sending with attachments but no typed text (e.g.
    // "here's an image, tell me about it"). The user message text
    // becomes empty in that case; Claude sees just the attachment.
    if (!trimmed && attachmentsAtSend.length === 0) return
    if (isStreaming || !conversationId) return
    if (!isOnline) {
      setError('You\'re offline. Reconnect to send.')
      return
    }
    const now = Date.now()
    if (now - lastSendAt < SEND_DEBOUNCE_MS) return
    setLastSendAt(now)

    // The gateway picks and sends the key itself; here only whether there
    // is one, without decrypting it (stage 4).
    let keyed = false
    try {
      keyed = await hasKey()
    } catch (err) {
      setError('Couldn\'t read your API key. Open Settings to re-enter it.')
      if (import.meta.env.DEV) console.warn('[input@1.0] hasKey failed:', err)
      return
    }
    if (!keyed) {
      setError('No API key configured. Add one in Settings to continue.')
      return
    }

    const systemPrompt = buildSystemPrompt() // '' when collab-mode is inactive
    // PR-18d: read armed-tool registrations once at send time. Each
    // entry already carries `definition` + `serverSide` — the shape
    // ChatContext.sendMessage's tool-loop expects. After the send
    // resolves (success path below), publish `message-sent` so arming
    // components auto-reset per the W1 per-message-toggle contract.
    const armedToolsAtSend = hostAPI?.getArmedTools?.() || []

    // PR-18e: fold attachments into the send shape.
    //   - text/code attachments → <attached_file> blocks appended to
    //     the typed text, so they persist with the user message and
    //     Claude has the content on follow-up turns.
    //   - binary attachments (image / PDF) → Anthropic content blocks
    //     attached to THIS turn's API call only. Not persisted.
    //   - metadata for all attachments persists on the user message
    //     record as `attachmentMeta` for the MessageCard chip strip.
    const textAttachments = attachmentsAtSend.filter(a => a.category === 'text')
    const binaryAttachments = attachmentsAtSend.filter(a => a.category === 'image' || a.category === 'document')
    const textBlocks = textAttachments.map(a => formatTextAttachmentForMessage(a)).join('\n\n')
    const userContentForPersist = trimmed
      ? (textBlocks ? `${trimmed}\n\n${textBlocks}` : trimmed)
      : textBlocks // attachments only (no typed text)
    const binaryParts = binaryAttachments
      .map(a => attachmentToContentBlock(a))
      .filter(Boolean)
    const attachmentMeta = attachmentsAtSend.map(a => ({
      id: a.id,
      name: a.name,
      category: a.category,
      mimeType: a.mimeType,
      size: a.size,
    }))

    setValue('')
    setError(null)
    try {
      // PR-10a.9: collab-mode system prompt threads through here.
      // PR-18d: armed tools (e.g. web-search) flow through the existing
      // `tools` parameter so ChatContext's tool-loop honors them without
      // any structural change.
      // PR-18e: attachments arg carries binary parts (for THIS turn's
      // API call) + metadata (for the persisted user message).
      await sendMessage(
        conversationId,
        userContentForPersist,
        settings.defaultModel,
        systemPrompt,
        armedToolsAtSend,
        binaryParts.length > 0 || attachmentMeta.length > 0
          ? { parts: binaryParts, meta: attachmentMeta }
          : null,
      )
      // PR-18d/PR-18e: announce successful send so per-message
      // contributions (armed tools, staged attachments) auto-reset.
      // Publish before the non-critical side effects so a slow
      // trackMessageSent never delays the clear.
      hostAPI?.publish?.('message-sent', { conversationId })
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
    settings.defaultModel,
    sendMessage, refreshStorageEstimate, trackMessageSent,
    buildSystemPrompt, hostAPI,
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
      {/* PR-23: the input + send + plus + overflow buttons all live
          inside a card with rounded corners + gentle shadow, matching
          the blueprint section's framed feel. The card uses the same
          surface bg + thin border + soft shadow as .bp-action-card so
          the chat surface reads as a coherent set of cards. */}
      <div className="chat-input-card">
      <InputArea
        value={value}
        onChange={setValue}
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
        isOnline={isOnline}
        placeholder={placeholder}
        cardLayout={cardLayout}
        armedTools={armedTools}
        onDisarmTool={handleDisarmTool}
        attachments={attachments}
        onRemoveAttachment={handleRemoveAttachment}
        rightPrimaryAction={rightPrimaryAction}
        overflowActions={overflowActions}
        onInvokeAction={handleInvokeAction}
      />
      </div>
    </div>
  )
}
