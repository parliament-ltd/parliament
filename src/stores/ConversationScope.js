import { createContext, useContext } from 'react'

// Which conversation a board shows (refactor-plan.md, stage 3; state audit
// §11a). The board that hosts a room provides the id, and the blocks inside
// read it here instead of from the address bar, so a board can show a chat
// that is not the one in the address: in a second column, or in a window of
// its own. null where no conversation is in scope, as in the room editor.

export const ConversationScope = createContext(null)

/** The id of the conversation this board shows, or null. */
export const useConversationId = () => useContext(ConversationScope)
