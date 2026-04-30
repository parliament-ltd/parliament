import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  listConversations,
  createConversation,
  updateConversation as dbUpdateConversation,
  deleteConversation,
  runIntegrityCheck,
} from '../lib/db'
import { migrateChatRoomAssignments } from '../lib/migration'

const ConversationContext = createContext(null)

export function ConversationProvider({ children }) {
  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [loaded, setLoaded] = useState(false)

  // Run integrity check, then the PR-10a one-time createdInMode → room
  // migration, then load conversations on mount. Order matters:
  //   1. Integrity check first — it deletes orphaned (zero-message)
  //      conversations, so we don't waste a migration on records we're
  //      about to remove.
  //   2. Migration second — it sets `conversation.room` for every
  //      recognized createdInMode value, leaving null when unmapped.
  //      Idempotent: a settings flag short-circuits subsequent boots.
  //   3. List third — picks up the migrated `room` field so /chat/:id
  //      can route through <RoomShell> on first render after migration.
  useEffect(() => {
    async function init() {
      await runIntegrityCheck()
      try {
        await migrateChatRoomAssignments()
      } catch (err) {
        // A migration failure should not block conversation listing —
        // unmigrated conversations fall back to the V1 Albatross adapter
        // (room: null path). Surface the failure in dev so it's noticed.
        if (import.meta.env.DEV) {
          console.error('[ConversationProvider] chat-room migration failed:', err)
        }
      }
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