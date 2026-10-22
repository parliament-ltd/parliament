import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { getMessages, addMessage, updateMessage, getSetting, setSetting, getConversation } from '../lib/db'
import { askToKeepStorage } from '../lib/storageKeep'
import { nameFromChat, titleFromPrompt, fieldsFromDescription } from '../lib/chatTitles'
import { useConversations } from './ConversationContext'
import { useSettings } from './SettingsContext'
import { gateway, destination, runClientTool, continueInstruction, providerOf } from '../net'
import {
  startStream, appendStream, resetStreamText, stopStream, endStream, getStream,
  isStreaming as streamingIn, streamingIds, addNotice, noteCut,
  getMessages as heldMessages, hasMessages, setMessages as holdMessages, updateMessages, releaseMessages, sendable,
} from './chatStore'
import { useIsStreaming, useMessages } from './chatHooks'
import { forModel, cutReason } from './sendHistory'

// The open chat, for today's screens (refactor-plan.md, stages 3 and 4;
// state audit §11a; C109).
//
// The reply being written and the chat's messages live in the chat store,
// kept by conversation, so blocks that only need the messages do not redraw
// for every piece of a reply, each conversation can stream on its own, and
// what is sent is built from the chat it goes to, by its id. This context
// is a facade over the store for the open chat: `messages` and
// `isStreaming` are the open chat's, and the commands take a chat's id.
// Read the reply's text with useStreamText(id) (chatHooks.js).
//
// What is sent is what is shown: hidden messages and messages waiting to
// be deleted stay out (chatStore.sendable), and an answer from a source
// goes as quoted context, not as the model's own words (sendHistory.js).
//
// Each send works on its own chat, and builds the title request from its
// own messages, so a reply that ends after its chat was left can no longer
// title the wrong chat. Leaving a chat stops its reply, and says so, unless
// the person turned on "Finish replies after I leave a chat" (C109).
//
// Every request goes through the gateway (src/net, stage 4), which picks the
// provider's key itself: callers no longer read or pass a key.

const ChatContext = createContext(null)

// Interval for incremental streaming persistence (ms)
const PERSIST_INTERVAL = 3000

const isQuota = (err) => err?.name === 'QuotaExceededError' || err?.name === 'NS_ERROR_DOM_QUOTA_REACHED'

// What a finished reply records of how it was made (C132 (h)): the model
// that answered, and the tokens it took in and gave out, as the provider
// reported them. Optional fields on the message; older replies have none.
const answeredWith = (model, input, output) => (model ? { model, usage: { input, output } } : {})
// The frameworks a reply was written under (stage 7, piece 5; C164).
const underWith = (frameworks) => (Array.isArray(frameworks) && frameworks.length ? { frameworks } : {})

export function ChatProvider({ children }) {
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0 })
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [persistError, setPersistError] = useState(null) // 'quota' | null

  const { updateConversation } = useConversations()
  const { settings } = useSettings()
  const isStreaming = useIsStreaming(activeConversationId)
  const messages = useMessages(activeConversationId)

  const activeRef = useRef(null)
  const finishOnLeave = useRef(false)
  const describeOn = useRef(true)

  useEffect(() => { finishOnLeave.current = Boolean(settings.finishRepliesOnLeave) }, [settings.finishRepliesOnLeave])
  useEffect(() => { describeOn.current = settings.describeNewChats !== false }, [settings.describeNewChats])

  // Unmount cleanup: stop every reply this app was writing.
  useEffect(() => () => { for (const id of streamingIds()) stopStream(id, 'closed') }, [])

  // Load messages for a conversation from IndexedDB into the store.
  const loadMessages = useCallback(async (conversationId) => {
    activeRef.current = conversationId
    const msgs = await getMessages(conversationId)
    if (activeRef.current !== conversationId) return
    holdMessages(conversationId, msgs)
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

  // A reply that stopped part way: keep what arrived, and mark why it
  // stopped: its chat was left (said once where the person lands, C109),
  // or an error broke it off (`cut`). A reply that stalled keeps its place
  // even when nothing arrived (`keepEmpty`), so it can be sent again
  // without streaming (C114). Returns whether any text was kept.
  const keepPartial = useCallback(async (conversationId, messageId, before = '', cut = null, { keepEmpty = false } = {}) => {
    const stream = getStream(conversationId)
    const content = stream?.text ?? ''
    const left = stream?.stopReason === 'left'
    const reason = left ? 'left' : cut
    const kept = Boolean(content && content !== before)
    if (kept) {
      const updates = { content, incomplete: true, ...(reason ? { stopReason: reason } : {}) }
      await updateMessage(messageId, updates)
      updateMessages(conversationId, (prev) => prev.map((m) => (m.id === messageId ? { ...m, ...updates } : m)))
    } else if (!before && keepEmpty && reason) {
      const updates = { incomplete: true, stopReason: reason }
      await updateMessage(messageId, updates)
      updateMessages(conversationId, (prev) => prev.map((m) => (m.id === messageId ? { ...m, ...updates } : m)))
    } else if (!before) {
      // No content received — remove the empty placeholder
      updateMessages(conversationId, (prev) => prev.filter((m) => m.id !== messageId))
    }
    if (left) addNotice({ conversationId, messageId, kept: Boolean(content) })
    return kept
  }, [])

  // An untitled chat takes the first words of its prompt as its title,
  // made here and sending nothing (C62).
  const titleIfUntitled = useCallback(async (conversationId, prompt) => {
    const chat = await getConversation(conversationId)
    if (!chat || nameFromChat(chat) != null) return
    const title = titleFromPrompt(prompt)
    if (title) await updateConversation(conversationId, { title }).catch(() => {})
  }, [updateConversation])

  // After a chat's first answer (C62): one request for its title, summary
  // and tags, in place of the three silent ones there were. The Enter line
  // names it before Enter, and a switch in Settings turns it off. Off, or
  // if the request fails, an untitled chat takes the first words of its
  // prompt instead, and nothing more is sent.
  // It goes to the provider that answered, with that provider's key.
  const describeNewChat = useCallback(async (conversationId, exchange, prompt, model) => {
    if (describeOn.current) {
      try {
        const fields = fieldsFromDescription(await gateway.call(providerOf(model), 'generateMetadata', [exchange], { label: 'title, summary and tags' }))
        if (Object.keys(fields).length) { await updateConversation(conversationId, fields); return }
      } catch (err) {
        console.warn('Describing the chat failed:', err.message)
      }
    }
    await titleIfUntitled(conversationId, prompt)
  }, [updateConversation, titleIfUntitled])

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
  // frameworks: what the reply records it was written under (C164).
  const sendMessage = useCallback(async (conversationId, userContent, model, systemPrompt = '', tools = [], attachments = null, { frameworks = null } = {}) => {
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

    // This chat's messages as they stand, by its id: the history for this
    // request, and later for its title. Read now, so nothing from another
    // chat gets in, and leaving out what is hidden or being deleted.
    const held = hasMessages(conversationId) ? heldMessages(conversationId) : await getMessages(conversationId)
    const before = sendable(conversationId, held)
    const first = held.length === 0 // the chat's first prompt

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
    updateMessages(conversationId, prev => [...prev, userMsg])

    // 2. Create a placeholder assistant message marked incomplete
    const assistantMsg = await addMessage({
      conversationId,
      role: 'assistant',
      content: '',
      incomplete: true,
    })
    updateMessages(conversationId, prev => [...prev, assistantMsg])

    // 3. The stream, kept by conversation, with its own controller and saving.
    const controller = new AbortController()
    startStream(conversationId, { messageId: assistantMsg.id, controller })
    const stopPersisting = persistEvery(conversationId, assistantMsg.id)
    const history = [...before.filter(m => m.id !== userMsg.id && m.id !== assistantMsg.id), userMsg]

    try {
      // Empty messages and answers from sources stay out (C115).
      const baseHistory = forModel(history)

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
      let last = null // the last turn's response: its stop reason says whether the reply came back whole

      for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
        // To the provider of the model that answers (stage 7, piece 3).
        const response = await gateway.call(providerOf(model), 'sendMessage', [
          toolLoopHistory,
          model,
          (chunk) => appendStream(conversationId, chunk),
          controller.signal,
          systemPrompt || undefined,
          tools,
        ], { label: 'chat send' })
        last = response

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

      // 5. Stream complete. A reply cut off by the length allowed for one
      //    reply, or one whose stream ended without saying why, stays
      //    incomplete and is marked as cut off, so it is never taken for
      //    a whole answer and Continue can ask for the rest.
      stopPersisting()
      // Prepend any chart blocks before Claude's explanatory text
      const finalContent = chartBlocks + (getStream(conversationId)?.text ?? '')
      const tokenCount = totalOutputTokens
      const cut = finalContent ? cutReason(last?.stopReason) : null
      // The model that answered and the tokens it took, so what a chat cost
      // can be worked out later, never guessed (C132 (h)).
      const outcome = { content: finalContent, incomplete: Boolean(cut), tokenCount, ...(cut ? { stopReason: cut } : {}), ...answeredWith(model, totalInputTokens, totalOutputTokens), ...underWith(frameworks) }

      await updateMessage(assistantMsg.id, outcome)
      const finished = { ...assistantMsg, ...outcome }
      updateMessages(conversationId, prev => prev.map(m => (m.id === assistantMsg.id ? finished : m)))

      // Update cumulative token usage (accumulated across all tool loop turns)
      if (activeRef.current === conversationId) {
        setTokenUsage(prev => ({
          input: prev.input + totalInputTokens,
          output: prev.output + tokenCount,
        }))
      }

      // 6. After a chat's first answer, its title, summary and tags, from
      //    this chat's own exchange (C62). Not awaited.
      if (first && finalContent) describeNewChat(conversationId, forModel([userMsg, finished]), userContent, model).catch(() => {})
    } catch (error) {
      stopPersisting()
      // Stopped or left: kept as it was. Anything else broke the reply off;
      // a stall keeps its place, to be sent again without streaming (C114).
      const aborted = error.name === 'AbortError'
      if (!aborted) noteCut(conversationId) // the ink pot spills (C114)
      const kept = await keepPartial(conversationId, assistantMsg.id, '', aborted ? null : 'error', { keepEmpty: error.name === 'Stalled' })

      // Re-throw if not an abort (abort is expected from stopping or leaving)
      if (!aborted) {
        error.kept = kept
        throw error
      }
    } finally {
      endStream(conversationId)
    }
  }, [persistEvery, keepPartial, describeNewChat, updateConversation])

  // Sends a chat's last prompt again without streaming, after its reply
  // stalled behind a network that holds streamed replies (C114). Only on the
  // person's Enter, which named it and its cost. A stalled reply with
  // nothing in it is filled; if some text had arrived, a new reply follows
  // it and the one cut off stays as it was.
  const resendWhole = useCallback(async (conversationId, model, systemPrompt = '', { frameworks = null } = {}) => {
    if (streamingIn(conversationId)) return
    const held = hasMessages(conversationId) ? heldMessages(conversationId) : await getMessages(conversationId)
    let at = -1
    for (let i = held.length - 1; i >= 0; i--) if (held[i].role === 'user') { at = i; break }
    if (at < 0) return
    const prompt = held[at]
    const history = forModel(sendable(conversationId, held.slice(0, at + 1)))
    let reply = held.slice(at + 1).find((m) => m.role === 'assistant' && !m.content) ?? null
    if (!reply) {
      reply = await addMessage({ conversationId, role: 'assistant', content: '', incomplete: true })
      updateMessages(conversationId, (prev) => [...prev, reply])
    }

    const controller = new AbortController()
    startStream(conversationId, { messageId: reply.id, controller })
    try {
      const response = await gateway.call(providerOf(model), 'sendMessageWhole', [
        history,
        model,
        (chunk) => appendStream(conversationId, chunk),
        controller.signal,
        systemPrompt || undefined,
      ], { label: 'chat send without streaming' })
      if (controller.signal.aborted) throw new DOMException('Stopped', 'AbortError')
      const content = getStream(conversationId)?.text ?? ''
      const cut = content ? cutReason(response?.stopReason) : null
      const outcome = {
        content, incomplete: Boolean(cut) || !content, tokenCount: response?.usage?.output_tokens || 0, stopReason: cut,
        ...answeredWith(model, response?.usage?.input_tokens || 0, response?.usage?.output_tokens || 0),
        ...underWith(frameworks),
      }
      await updateMessage(reply.id, outcome)
      const finished = { ...reply, ...outcome }
      updateMessages(conversationId, (prev) => prev.map((m) => (m.id === reply.id ? finished : m)))
      if (activeRef.current === conversationId) {
        setTokenUsage((prev) => ({
          input: prev.input + (response?.usage?.input_tokens || 0),
          output: prev.output + outcome.tokenCount,
        }))
      }
      if (at === 0 && content) describeNewChat(conversationId, forModel([prompt, finished]), prompt.content, model).catch(() => {})
    } catch (error) {
      const aborted = error.name === 'AbortError'
      if (!aborted) noteCut(conversationId) // the ink pot spills (C114)
      const kept = await keepPartial(conversationId, reply.id, '', aborted ? null : 'error', { keepEmpty: !aborted })
      if (!aborted) {
        error.kept = kept
        throw error
      }
    } finally {
      endStream(conversationId)
    }
  }, [keepPartial, describeNewChat])

  // Ask a source instead of a model (stage 4): a prompt with no key goes to
  // Wikipedia. The person's words go as a search and nothing else; what
  // comes back is plain text, kept with a note of where it came from (the
  // page, its revision, its licence), or a note that nothing was found. The
  // note holds no words of the interface (C86): the reply card words it.
  // An untitled chat takes the prompt's first words as its title, made
  // here, sending nothing (C62).
  const askSource = useCallback(async (conversationId, question, { source = 'wikipedia', lang } = {}) => {
    if (streamingIn(conversationId)) return
    askToKeepStorage({ getSetting, setSetting }).catch(() => {})

    titleIfUntitled(conversationId, question).catch(() => {})

    const userMsg = await addMessage({ conversationId, role: 'user', content: question })
    updateMessages(conversationId, prev => [...prev, userMsg])
    const placeholder = await addMessage({ conversationId, role: 'assistant', content: '', incomplete: true })
    updateMessages(conversationId, prev => [...prev, placeholder])

    const controller = new AbortController()
    startStream(conversationId, { messageId: placeholder.id, controller })
    try {
      const found = await gateway.call(source, 'answer', [question, { lang, signal: controller.signal }], { label: 'prompt' })
      // A lookup that finished after its chat was left still stops there (C109).
      if (controller.signal.aborted) throw new DOMException('Stopped', 'AbortError')
      // A list of results (Hacker News, OpenAlex; stage 7) keeps each one's
      // title, link, date, text and facts in the note, for the card to draw.
      const updates = found?.shape === 'list'
        ? {
          content: found.text,
          incomplete: false,
          source: { id: found.source, name: found.name, shape: 'list', items: found.items, licence: found.licence, lang: found.lang },
        }
        : found
        ? {
          content: found.text,
          incomplete: false,
          source: {
            id: found.source, name: found.name, title: found.title, url: found.url,
            revision: found.revision, revisedAt: found.revisedAt, licence: found.licence, lang: found.lang,
          },
        }
        : { content: '', incomplete: false, source: { id: source, name: destination(source)?.name ?? source, found: false } }
      await updateMessage(placeholder.id, updates)
      updateMessages(conversationId, prev => prev.map(m => (m.id === placeholder.id ? { ...m, ...updates } : m)))
    } catch (error) {
      if (error.name !== 'AbortError') noteCut(conversationId)
      await keepPartial(conversationId, placeholder.id)
      if (error.name !== 'AbortError') throw error
    } finally {
      endStream(conversationId)
    }
  }, [keepPartial, titleIfUntitled])

  // Continue from an interrupted (ghost text) message in the open chat
  // systemPrompt: optional string from collaboration mode presets + custom instruction
  const continueMessage = useCallback(async (incompleteMessageId, model, systemPrompt = '') => {
    const conversationId = activeRef.current
    if (!conversationId || streamingIn(conversationId)) return
    const currentMessages = heldMessages(conversationId)
    const incompleteMsg = currentMessages.find(m => m.id === incompleteMessageId)
    if (!incompleteMsg) return

    // What came before it, as a send would carry it.
    const msgIndex = currentMessages.indexOf(incompleteMsg)
    const priorMessages = forModel(sendable(conversationId, currentMessages.slice(0, msgIndex)))

    // The continue instruction lives as a constant in the provider abstraction
    const history = [
      ...priorMessages,
      { role: 'assistant', content: incompleteMsg.content },
      { role: 'user', content: continueInstruction(providerOf(model)) },
    ]

    // Reuse the existing message record
    const controller = new AbortController()
    startStream(conversationId, { messageId: incompleteMsg.id, text: incompleteMsg.content, controller })
    const stopPersisting = persistEvery(conversationId, incompleteMsg.id)

    try {
      const response = await gateway.call(providerOf(model), 'sendMessage', [
        history,
        model,
        (chunk) => appendStream(conversationId, chunk),
        controller.signal,
        systemPrompt || undefined,
      ], { label: 'continue' })

      stopPersisting()
      const finalContent = getStream(conversationId)?.text ?? incompleteMsg.content
      const tokenCount = (incompleteMsg.tokenCount || 0) + (response?.usage?.output_tokens || 0)
      const cut = cutReason(response?.stopReason)
      // Its tokens add to what the first part recorded, if that part recorded
      // any with the same model; otherwise the whole is not known (C132 (h)).
      const was = incompleteMsg.model === model ? incompleteMsg.usage : null
      const answered = was
        ? answeredWith(model, was.input + (response?.usage?.input_tokens || 0), was.output + (response?.usage?.output_tokens || 0))
        : (model ? { model } : {})
      const updates = { content: finalContent, incomplete: Boolean(cut), tokenCount, stopReason: cut, ...answered }

      await updateMessage(incompleteMsg.id, updates)
      updateMessages(conversationId, prev => prev.map(m => (m.id === incompleteMsg.id ? { ...m, ...updates } : m)))

      if (activeRef.current === conversationId) {
        const inputTokens = response?.usage?.input_tokens || 0
        setTokenUsage(prev => ({
          input: prev.input + inputTokens,
          output: prev.output + (response?.usage?.output_tokens || 0),
        }))
      }
    } catch (error) {
      stopPersisting()
      const aborted = error.name === 'AbortError'
      if (!aborted) noteCut(conversationId) // the ink pot spills (C114)
      const kept = await keepPartial(conversationId, incompleteMsg.id, incompleteMsg.content, aborted ? null : 'error')

      if (!aborted) {
        error.kept = kept
        throw error
      }
    } finally {
      endStream(conversationId)
    }
  }, [persistEvery, keepPartial])

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
    const left = activeRef.current
    activeRef.current = null
    if (left) releaseMessages(left)
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
      resendWhole,
      askSource,
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
