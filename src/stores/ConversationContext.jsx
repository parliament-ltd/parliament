import { createContext, useContext, useState } from 'react'

const ConversationContext = createContext(null)

export function ConversationProvider({ children }) {
  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(null)

  // Load conversations from IndexedDB
  async function loadConversations() {
    // TODO: implement — call listConversations() from db.js
  }

  // Create a new conversation and return its ID
  async function createNewConversation(model) {
    // TODO: implement — call createConversation() from db.js
    // Return the new conversation ID
  }

  // Delete a conversation and its related data
  async function removeConversation(id) {
    // TODO: implement — call deleteConversation() from db.js
  }

  return (
    <ConversationContext.Provider value={{
      conversations,
      activeConversationId,
      setActiveConversationId,
      loadConversations,
      createNewConversation,
      removeConversation,
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