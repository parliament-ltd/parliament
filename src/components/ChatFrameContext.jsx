// ChatFrameContext — small React context that lets in-chat chrome
// (specifically NarrowChrome on mobile, but extensible) discover the
// surrounding chat's editor target without prop-drilling through
// RoomShell → layout → chrome.
//
// PR-19d: ChatView wraps RoomShell with this provider, supplying
// `wrenchTarget` = `/edit/${conversation.room}?tab=components`.
// NarrowChrome consumes the context via useChatFrame(); when the
// provider isn't in scope (editor preview sheet, dev /catalog route)
// the consumer renders a hidden spacer instead of the wrench so the
// 4-icon cluster stays anchored.

import { createContext, useContext } from 'react'

const ChatFrameContext = createContext(null)

export function ChatFrameProvider({ value, children }) {
  return (
    <ChatFrameContext.Provider value={value}>
      {children}
    </ChatFrameContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with provider, same pattern as other context files in the codebase
export function useChatFrame() {
  return useContext(ChatFrameContext)
}
