import { useCallback, useSyncExternalStore } from 'react'
import { subscribe, streamText, streamMessageId, isStreaming, getNotices, getMessages, hiddenIds, pendingDeletes, streamEnd, streamThinking, streamAnswering } from './chatStore'

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

/** The thinking of the reply being written, as it goes, or '' (C165). */
export function useStreamThinking(id) {
  return useTopic(`stream:${id}`, useCallback(() => streamThinking(id), [id]))
}

/** Whether the reply being written has begun to answer, past its thinking. */
export function useStreamAnswering(id) {
  return useTopic(`stream:${id}`, useCallback(() => streamAnswering(id), [id]))
}

/** The message a conversation's reply is filling, or null. */
export function useStreamMessageId(id) {
  return useTopic(`status:${id}`, useCallback(() => streamMessageId(id), [id]))
}

/** Whether a reply is being written in a conversation. */
export function useIsStreaming(id) {
  return useTopic(`status:${id}`, useCallback(() => isStreaming(id), [id]))
}

/** How a conversation's last reply ended: { how: 'done'|'stopped', at }, or null (C114). */
export function useStreamEnd(id) {
  return useTopic(`status:${id}`, useCallback(() => streamEnd(id), [id]))
}

/** A chat's messages while it is open (stage 4). */
export function useMessages(id) {
  return useTopic(`messages:${id}`, useCallback(() => getMessages(id), [id]))
}

/** The ids of a chat's hidden messages. */
export function useHiddenIds(id) {
  return useTopic(`hidden:${id}`, useCallback(() => hiddenIds(id), [id]))
}

/** A chat's messages waiting to be deleted: [{ messageId, at }]. */
export function usePendingDeletes(id) {
  return useTopic(`deleting:${id}`, useCallback(() => pendingDeletes(id), [id]))
}

/** Replies stopped because their chat was left, not yet shown (C109). */
export function useStopNotices() {
  return useTopic('notices', getNotices)
}
