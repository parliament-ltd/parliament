import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  listConversations,
  createConversation,
  updateConversation as dbUpdateConversation,
  deleteConversation,
  runIntegrityCheck,
} from '../lib/db'

const ConversationContext = createContext(null)

export function ConversationProvider({ children }) {
  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [loaded, setLoaded] = useState(false)

  // Run integrity check and load conversations on mount
  useEffect(() => {
    async function init() {
      await runIntegrityCheck()
      const convs = await listConversations()
      setConversations(convs)
      setLoaded(true)
    }
    init()
  }, [])

  // Reload conversations from IndexedDB
  const loadConversations = useCallback(async () => {
    const convs = await listConversations()
    setConversations(convs)
  }, [])

  // Create a new conversation and return it
  const createNewConversation = useCallback(async (options = {}) => {
    const conv = await createConversation(options)
    setConversations(prev => [conv, ...prev])
    return conv
  }, [])

  // Update a conversation (title, pinned, storageBytes, etc.)
  const updateConversation = useCallback(async (id, updates) => {
    const updated = await dbUpdateConversation(id, updates)
    setConversations(prev =>
      prev.map(c => (c.id === id ? updated : c))
    )
    return updated
  }, [])

  // Delete a conversation and its related data
  const removeConversation = useCallback(async (id) => {
    await deleteConversation(id)
    setConversations(prev => prev.filter(c => c.id !== id))
    setActiveConversationId(prev => prev === id ? null : prev)
  }, [])

  // Bulk delete conversations
  const removeConversations = useCallback(async (ids) => {
    for (const id of ids) {
      await deleteConversation(id)
    }
    setConversations(prev => prev.filter(c => !ids.includes(c.id)))
    setActiveConversationId(prev => ids.includes(prev) ? null : prev)
  }, [])

  return (
    <ConversationContext.Provider value={{
      conversations,
      activeConversationId,
      setActiveConversationId,
      loaded,
      loadConversations,
      createConversation: createNewConversation,
      updateConversation,
      deleteConversation: removeConversation,
      deleteConversations: removeConversations,
    }}>
      {children}
    </ConversationContext.Provider>
  )
}

export function useConversations() {
  const context = useContext(ConversationContext)
  if (!context) throw new Error('useConversations must be used within ConversationProvider')
  return context
}