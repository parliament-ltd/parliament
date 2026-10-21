import { useCallback, useSyncExternalStore } from 'react'
import { subscribe, streamText, streamMessageId, isStreaming, getNotices } from './chatStore'

// Reading the chat store from a component (state audit §11a). Each hook
// listens to one conversation's topic, so a reply streaming in one chat
// redraws only what shows that reply.

function useTopic(topic, read) {
  const listen = useCallback((fn) => subscribe(topic, fn), [topic])
  return useSyncExternalStore(listen, read, read)
}

/** The text of the reply being written in a conversation, or ''. */
export function useStreamText(id) {
  return useTopic(`stream:${id}`, useCallback(() => streamText(id), [id]))
}

/** The message a conversation's reply is filling, or null. */
export function useStreamMessageId(id) {
  return useTopic(`status:${id}`, useCallback(() => streamMessageId(id), [id]))
}

/** Whether a reply is being written in a conversation. */
export function useIsStreaming(id) {
  return useTopic(`status:${id}`, useCallback(() => isStreaming(id), [id]))
}

/** Replies stopped because their chat was left, not yet shown (C109). */
export function useStopNotices() {
  return useTopic('notices', getNotices)
}
