import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  listConversations,
  createConversation,
  updateConversation as dbUpdateConversation,
  deleteConversation,
  runIntegrityCheck,
} from '../lib/db'
import {
  migrateChatRoomAssignments,
  migrateRepairNullRooms,
  migrateInjectVoiceInput,
} from '../lib/migration'

const ConversationContext = createContext(null)

export function ConversationProvider({ children }) {
  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [loaded, setLoaded] = useState(false)

  // Run integrity check, then the PR-10a/PR-10b one-time migrations,
  // then load conversations on mount. Order matters:
  //   1. Integrity check first — it deletes orphaned (zero-message)
  //      conversations, so we don't waste migrations on records we're
  //      about to remove.
  //   2. PR-10a `migrateChatRoomAssignments` — sets `conversation.room`
  //      for every recognized createdInMode value, leaving null when
  //      unmapped. Idempotent via its own settings flag.
  //   3. PR-10b `migrateRepairNullRooms` — assigns a default Writing
  //      Studio room to any conversation that PR-10a couldn't map. After
  //      PR-10b there is no Albatross fallback, so a null room means no
  //      working chat surface. Idempotent via its own flag — safe to
  //      run on every boot.
  //   4. PR-10b `migrateInjectVoiceInput` — pre-PR-10a.8 the pocket-chat
  //      seed didn't include voice-input@1.0; PR-10b removes InputArea's
  //      built-in cardLayout mic. Inject voice-input into legacy
  //      swift-migrated rooms so mobile users keep a mic. Idempotent
  //      whole-pass and per-room.
  //   5. List last — picks up the assigned `room` so /chat/:id renders
  //      through <RoomShell> on first read after migration.
  useEffect(() => {
    async function init() {
      await runIntegrityCheck()
      try {
        await migrateChatRoomAssignments()
        await migrateRepairNullRooms()
        await migrateInjectVoiceInput()
      } catch (err) {
        // A migration failure should not block conversation listing.
        // ChatView's null-room repair path catches any room-assignment
        // gap on demand at /chat/:id render time.
        if (import.meta.env.DEV) {
          console.error('[ConversationProvider] migration failed:', err)
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