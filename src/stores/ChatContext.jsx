import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { getMessages, addMessage, updateMessage, getSetting, setSetting } from '../lib/db'
import { askToKeepStorage } from '../lib/storageKeep'
import { useConversations } from './ConversationContext'
import { useSettings } from './SettingsContext'
import { gateway, runClientTool, continueInstruction, DEFAULT_MODEL_PROVIDER as PROVIDER } from '../net'
import {
  startStream, appendStream, resetStreamText, stopStream, endStream, getStream,
  isStreaming as streamingIn, streamingIds, addNotice,
} from './chatStore'
import { useIsStreaming } from './chatHooks'

// The open chat, for today's screens (refactor-plan.md, stage 3; state audit
// §11a; C109).
//
// The reply being written no longer lives here: it is in the chat store,
// kept by conversation, so blocks that only need the messages do not redraw
// for every piece of a reply, and each conversation can stream on its own.
// This context keeps the open chat's messages and the commands, and reads
// `isStreaming` for the open chat from the store. Read the reply's text with
// useStreamText(id) (chatHooks.js).
//
// Each send works on its own chat: it changes the open chat's state only
// while that chat is open, and builds the title request from its own
// messages, so a reply that ends after its chat was left can no longer title
// the wrong chat. Leaving a chat stops its reply, and says so, unless the
// person turned on "Finish replies after I leave a chat" (C109).
//
// Every request goes through the gateway (src/net, stage 4), which picks the
// provider's key itself: callers no longer read or pass a key.

const ChatContext = createContext(null)

// Interval for incremental streaming persistence (ms)
const PERSIST_INTERVAL = 3000

const isQuota = (err) => err?.name === 'QuotaExceededError' || err?.name === 'NS_ERROR_DOM_QUOTA_REACHED'

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([])
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0 })
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [persistError, setPersistError] = useState(null) // 'quota' | null

  const { updateConversation } = useConversations()
  const { settings } = useSettings()
  const isStreaming = useIsStreaming(activeConversationId)

  const messagesRef = useRef([])
  const activeRef = useRef(null)
  const finishOnLeave = useRef(false)

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { finishOnLeave.current = Boolean(settings.finishRepliesOnLeave) }, [settings.finishRepliesOnLeave])

  // The open chat's state changes only for the open chat.
  const setOpenMessages = useCallback((conversationId, update) => {
    if (activeRef.current === conversationId) setMessages(update)
  }, [])

  // Unmount cleanup: stop every reply this app was writing.
  useEffect(() => () => { for (const id of streamingIds()) stopStream(id, 'closed') }, [])

  // Load messages for a conversation from IndexedDB
  const loadMessages = useCallback(async (conversationId) => {
    activeRef.current = conversationId
    const msgs = await getMessages(conversationId)
    if (activeRef.current !== conversationId) return
    setMessages(msgs)
    setActiveConversationId(conversationId)

    // Calculate cumulative token usage from loaded messages
    const usage = msgs.reduce(
      (acc, msg) => ({
        input: acc.input + (msg.role === 'user' ? msg.tokenCount || 0 : 0),
        output: acc.output + (msg.role === 'assistant' ? msg.tokenCount || 0 : 0),
      }),
      { input: 0, output: 0 }
    )
    setTokenUsage(usage)
  }, [])

  // Save a stream's text as it arrives, every few seconds, for its own message.
  const persistEvery = useCallback((conversationId, messageId) => {
    const timer = setInterval(async () => {
      const content = getStream(conversationId)?.text
      if (!content) return
      try {
        await updateMessage(messageId, { content, incomplete: true })
      } catch (err) {
        // Surface quota errors; swallow others to not block streaming
        if (isQuota(err)) setPersistError('quota')
      }
    }, PERSIST_INTERVAL)
    return () => clearInterval(timer)
  }, [])

  // A reply that stopped part way: keep what arrived, and if it stopped
  // because its chat was left, mark it and say so where the person lands.
  const keepPartial = useCallback(async (conversationId, messageId, before = '') => {
    const stream = getStream(conversationId)
    const content = stream?.text ?? ''
    const left = stream?.stopReason === 'left'
    if (content && content !== before) {
      const updates = { content, incomplete: true, ...(left ? { stopReason: 'left' } : {}) }
      await updateMessage(messageId, updates)
      setOpenMessages(conversationId, (prev) => prev.map((m) => (m.id === messageId ? { ...m, ...updates } : m)))
    } else if (!before) {
      // No content received — remove the empty placeholder
      setOpenMessages(conversationId, (prev) => prev.filter((m) => m.id !== messageId))
    }
    if (left) addNotice({ conversationId, messageId, kept: Boolean(content) })
  }, [setOpenMessages])

  // Auto-generate title, summary, and tags after the first user→assistant exchange.
  // All three are fire-and-forget: failures are silent.
  // They run in parallel to minimize latency.
  const generateMetadataIfNeeded = useCallback(async (conversationId, currentMessages) => {
    // Only trigger on exactly 2 messages (first user + first assistant)
    if (currentMessages.length !== 2) return
    if (currentMessages[0].role !== 'user' || currentMessages[1].role !== 'assistant') return

    // Run all three in parallel — each is independent and fire-and-forget
    const titlePromise = gateway.call(PROVIDER, 'generateTitle', [currentMessages], { label: 'title' })
      .then(title => updateConversation(conversationId, { title }))
      .catch(err => console.warn('Auto-title generation failed:', err.message))

    const summaryPromise = gateway.call(PROVIDER, 'generateSummary', [currentMessages], { label: 'summary' })
      .then(aiSummary => updateConversation(conversationId, { aiSummary }))
      .catch(err => console.warn('Auto-summary generation failed:', err.message))

    const tagsPromise = gateway.call(PROVIDER, 'generateTags', [currentMessages], { label: 'tags' })
      .then(tags => updateConversation(conversationId, { tags }))
      .catch(err => console.warn('Auto-tags generation failed:', err.message))

    // We don't await the combined result — this is background work
    Promise.allSettled([titlePromise, summaryPromise, tagsPromise])
  }, [updateConversation])

  // Send a message and handle streaming response
  // systemPrompt: optional string from collaboration mode presets + custom instruction
  // tools: optional array of tool definitions from provider.getAvailableTools()
  // PR-18e: optional `attachments` arg for file-attach@1.0. Shape:
  //   { parts: Array<Anthropic content block>, meta: Array<{ name, category, mimeType, size }> }
  //   - parts are folded into THIS turn's user-message content array
  //     (multi-part API call). Not persisted to IndexedDB — base64 stays
  //     in memory only.
  //   - meta is persisted alongside the user message so MessageCard can
  //     render attachment chips in history (a memory aid, not replay).
  const sendMessage = useCallback(async (conversationId, userContent, model, systemPrompt = '', tools = [], attachments = null) => {
    // One reply at a time in a chat; other chats are free.
    if (streamingIn(conversationId)) return

    // There is now a chat worth keeping, and a click led here: ask the
    // browser, once, to keep Parliament's storage (C88).
    askToKeepStorage({ getSetting, setSetting }).catch(() => {})

    // PR-16a: persist the model used on this turn back to the conversation
    // record. The semantic shift: `conversation.model` now means "the most
    // recently used model in this room," not "the model the room was
    // created with." Fire-and-forget; the .catch swallows the rare case
    // where the conversation no longer exists.
    if (model) {
      updateConversation(conversationId, { model }).catch(() => {})
    }

    // This chat's messages as they stand: the history for this request, and
    // later for its title. Read now, so nothing from another chat gets in.
    const before = activeRef.current === conversationId ? messagesRef.current : await getMessages(conversationId)

    // 1. Add user message to state and IndexedDB.
    //    PR-18e: `userContent` is already the text the user typed PLUS
    //    any `<attached_file>` blocks for text/code attachments (folded
    //    in by input-render at send time). Binary attachments come via
    //    `attachments.parts` and are NEVER persisted — they only attach
    //    to this turn's API call.
    const userMsg = await addMessage({
      conversationId,
      role: 'user',
      content: userContent,
      ...(attachments?.meta ? { attachmentMeta: attachments.meta } : {}),
    })
    setOpenMessages(conversationId, prev => [...prev, userMsg])

    // 2. Create a placeholder assistant message marked incomplete
    const assistantMsg = await addMessage({
      conversationId,
      role: 'assistant',
      content: '',
      incomplete: true,
    })
    setOpenMessages(conversationId, prev => [...prev, assistantMsg])

    // 3. The stream, kept by conversation, with its own controller and saving.
    const controller = new AbortController()
    startStream(conversationId, { messageId: assistantMsg.id, controller })
    const stopPersisting = persistEvery(conversationId, assistantMsg.id)
    const history = [...before.filter(m => m.id !== userMsg.id && m.id !== assistantMsg.id), userMsg]

    try {
      const baseHistory = history
        .filter(m => m.content) // Exclude any empty messages
        .map(m => ({ role: m.role, content: m.content }))

      // PR-18e: for THIS turn only, fold binary attachment content
      // blocks into the user message's content array. The persisted
      // record stays as text-only (the text already carries any
      // <attached_file> wrappers for text/code attachments). Anthropic
      // accepts either a string or an array of content blocks; we use
      // the array form when there's at least one binary part.
      const binaryParts = Array.isArray(attachments?.parts) ? attachments.parts : []
      if (binaryParts.length > 0 && baseHistory.length > 0) {
        const lastIdx = baseHistory.length - 1
        const last = baseHistory[lastIdx]
        if (last.role === 'user') {
          baseHistory[lastIdx] = {
            role: 'user',
            content: [
              { type: 'text', text: typeof last.content === 'string' ? last.content : '' },
              ...binaryParts,
            ],
          }
        }
      }

      // 4. Call provider with streaming — handle client-side tool loop
      let totalInputTokens = 0
      let totalOutputTokens = 0
      let toolLoopHistory = [...baseHistory]
      let chartBlocks = '' // accumulated create_chart output across turns
      const clientSideTools = tools.filter(t => !t.serverSide)
      const MAX_TOOL_TURNS = 5 // prevent infinite loops

      for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
        const response = await gateway.call(PROVIDER, 'sendMessage', [
          toolLoopHistory,
          model,
          (chunk) => appendStream(conversationId, chunk),
          controller.signal,
          systemPrompt || undefined,
          tools,
        ], { label: 'chat send' })

        totalInputTokens += response?.usage?.input_tokens || 0
        totalOutputTokens += response?.usage?.output_tokens || 0

        // If no client-side tool calls, or stop reason isn't tool_use, we're done
        if (!response.toolUses?.length || response.stopReason !== 'tool_use') break
        const clientToolUses = response.toolUses.filter(tu =>
          clientSideTools.some(t => t.name === tu.name || t.id === tu.name)
        )
        if (!clientToolUses.length) break

        // Accumulate create_chart calls as fenced code blocks embedded in the message
        for (const tu of clientToolUses) {
          if (tu.name === 'create_chart') {
            chartBlocks += `\n\`\`\`chart\n${JSON.stringify(tu.input)}\n\`\`\`\n`
          }
        }

        // Execute client-side tools and build tool_result messages
        const toolResults = clientToolUses.map(tu => ({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: runClientTool(tu.name, tu.input),
        }))

        // Build the assistant message content (text + tool_use blocks)
        const soFar = getStream(conversationId)?.text ?? ''
        const assistantContent = [
          ...(soFar ? [{ type: 'text', text: soFar }] : []),
          ...clientToolUses.map(tu => ({
            type: 'tool_use',
            id: tu.id,
            name: tu.name,
            input: tu.input,
          })),
        ]

        toolLoopHistory = [
          ...toolLoopHistory,
          { role: 'assistant', content: assistantContent },
          { role: 'user', content: toolResults },
        ]

        // Reset streaming content for the next turn's text
        resetStreamText(conversationId)
      }

      // 5. Stream complete — final persist with incomplete: false
      stopPersisting()
      // Prepend any chart blocks before Claude's explanatory text
      const finalContent = chartBlocks + (getStream(conversationId)?.text ?? '')
      const tokenCount = totalOutputTokens

      await updateMessage(assistantMsg.id, {
        content: finalContent,
        incomplete: false,
        tokenCount,
      })
      const finished = { ...assistantMsg, content: finalContent, incomplete: false, tokenCount }
      setOpenMessages(conversationId, prev => prev.map(m => (m.id === assistantMsg.id ? finished : m)))

      // Update cumulative token usage (accumulated across all tool loop turns)
      if (activeRef.current === conversationId) {
        setTokenUsage(prev => ({
          input: prev.input + totalInputTokens,
          output: prev.output + tokenCount,
        }))
      }

      // 6. Auto-generate title, summary, and tags from this chat's own
      //    messages (fire and forget — not awaited)
      generateMetadataIfNeeded(conversationId, [...history, finished])
    } catch (error) {
      stopPersisting()
      await keepPartial(conversationId, assistantMsg.id)

      // Re-throw if not an abort (abort is expected from stopping or leaving)
      if (error.name !== 'AbortError') {
        throw error
      }
    } finally {
      endStream(conversationId)
    }
  }, [persistEvery, keepPartial, setOpenMessages, generateMetadataIfNeeded, updateConversation])

  // Continue from an interrupted (ghost text) message in the open chat
  // systemPrompt: optional string from collaboration mode presets + custom instruction
  const continueMessage = useCallback(async (incompleteMessageId, model, systemPrompt = '') => {
    const conversationId = activeRef.current
    if (!conversationId || streamingIn(conversationId)) return
    const currentMessages = messagesRef.current
    const incompleteMsg = currentMessages.find(m => m.id === incompleteMessageId)
    if (!incompleteMsg) return

    const msgIndex = currentMessages.indexOf(incompleteMsg)
    const priorMessages = currentMessages.slice(0, msgIndex)
      .filter(m => m.content)
      .map(m => ({ role: m.role, content: m.content }))

    // The continue instruction lives as a constant in the provider abstraction
    const history = [
      ...priorMessages,
      { role: 'assistant', content: incompleteMsg.content },
      { role: 'user', content: continueInstruction(PROVIDER) },
    ]

    // Reuse the existing message record
    const controller = new AbortController()
    startStream(conversationId, { messageId: incompleteMsg.id, text: incompleteMsg.content, controller })
    const stopPersisting = persistEvery(conversationId, incompleteMsg.id)

    try {
      const response = await gateway.call(PROVIDER, 'sendMessage', [
        history,
        model,
        (chunk) => appendStream(conversationId, chunk),
        controller.signal,
        systemPrompt || undefined,
      ], { label: 'continue' })

      stopPersisting()
      const finalContent = getStream(conversationId)?.text ?? incompleteMsg.content
      const tokenCount = (incompleteMsg.tokenCount || 0) + (response?.usage?.output_tokens || 0)
      const updates = { content: finalContent, incomplete: false, tokenCount, stopReason: null }

      await updateMessage(incompleteMsg.id, updates)
      setOpenMessages(conversationId, prev => prev.map(m => (m.id === incompleteMsg.id ? { ...m, ...updates } : m)))

      if (activeRef.current === conversationId) {
        const inputTokens = response?.usage?.input_tokens || 0
        setTokenUsage(prev => ({
          input: prev.input + inputTokens,
          output: prev.output + (response?.usage?.output_tokens || 0),
        }))
      }
    } catch (error) {
      stopPersisting()
      await keepPartial(conversationId, incompleteMsg.id, incompleteMsg.content)

      if (error.name !== 'AbortError') {
        throw error
      }
    } finally {
      endStream(conversationId)
    }
  }, [persistEvery, keepPartial, setOpenMessages])

  // Stop the open chat's reply
  const stopGenerating = useCallback(() => {
    if (activeRef.current) stopStream(activeRef.current, 'stopped')
  }, [])

  // Leaving a chat: its reply stops and says so, unless the person chose to
  // let replies finish in the background, each saved to its own chat (C109).
  const leaveConversation = useCallback((conversationId) => {
    if (!conversationId || !streamingIn(conversationId) || finishOnLeave.current) return
    stopStream(conversationId, 'left')
  }, [])

  // Clear messages (when switching conversations)
  const clearMessages = useCallback(() => {
    activeRef.current = null
    setMessages([])
    setTokenUsage({ input: 0, output: 0 })
    setActiveConversationId(null)
    setPersistError(null)
  }, [])

  const clearPersistError = useCallback(() => setPersistError(null), [])

  return (
    <ChatContext.Provider value={{
      messages,
      isStreaming,
      tokenUsage,
      activeConversationId,
      persistError,
      clearPersistError,
      loadMessages,
      sendMessage,
      continueMessage,
      stopGenerating,
      leaveConversation,
      clearMessages,
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) throw new Error('useChat must be used within ChatProvider')
  return context
}
