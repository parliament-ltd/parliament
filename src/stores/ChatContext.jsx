import { createContext, useContext, useState } from 'react'

const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0 })

  // Load messages for a conversation from IndexedDB
  async function loadMessages(conversationId) {
    // TODO: implement — call getMessages() from db.js
  }

  // Send a message and handle streaming response
  async function sendMessage(apiKey, userContent, model) {
    // TODO: implement
    // 1. Add user message to state and IndexedDB
    // 2. Call provider.sendMessage() with onChunk callback
    // 3. Update streamingContent as chunks arrive
    // 4. When complete, save assistant message to IndexedDB
    // 5. Update tokenUsage from response
  }

  // Stop an in-progress generation
  function stopGenerating() {
    // TODO: implement — abort the fetch request
  }

  // Clear messages (when switching conversations)
  function clearMessages() {
    setMessages([])
    setStreamingContent('')
    setTokenUsage({ input: 0, output: 0 })
  }

  return (
    <ChatContext.Provider value={{
      messages,
      isStreaming,
      streamingContent,
      tokenUsage,
      loadMessages,
      sendMessage,
      stopGenerating,
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