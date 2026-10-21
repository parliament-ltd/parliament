import { useEffect, useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { getConversation } from '../lib/db'
import { useStopNotices } from '../stores/chatHooks'
import { dismissNotice } from '../stores/chatStore'

// Said once, on the page the person lands on, when a reply stopped because
// its chat was left (C109), at the top, clear of the bar and the chat's
// input. The chat is named by its number, or by its
// title where it has none yet. It closes on a click, or by itself.

const CLOSE_AFTER_MS = 12000

export default function ReplyStoppedNotice() {
  const { i18n } = useLingui()
  const notices = useStopNotices()
  const notice = notices[0] ?? null
  const [named, setNamed] = useState(null) // { id, label }

  useEffect(() => {
    if (!notice) return undefined
    let live = true
    getConversation(notice.conversationId)
      .then((c) => { if (live) setNamed({ id: notice.conversationId, label: c?.num ? String(c.num) : `“${c?.title ?? ''}”` }) })
      .catch(() => { if (live) setNamed({ id: notice.conversationId, label: '' }) })
    const timer = setTimeout(() => dismissNotice(notice.conversationId), CLOSE_AFTER_MS)
    return () => { live = false; clearTimeout(timer) }
  }, [notice])

  if (!notice || named?.id !== notice.conversationId) return null
  const words = i18n._(notice.kept ? COPY.chat.stoppedNotice : COPY.chat.stoppedNoticeEmpty, { chat: named.label })

  return (
    <div
      className="fixed top-5 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 max-w-[min(92vw,560px)] px-4 py-2.5 rounded-md text-xs shadow-2xl bg-[var(--p-text-primary)] text-white"
      role="status"
      aria-live="polite"
    >
      <span>{words}</span>
      <button
        type="button"
        onClick={() => dismissNotice(notice.conversationId)}
        className="shrink-0 px-2.5 py-1 rounded-sm border border-white/30 hover:border-white/60 text-white transition-colors"
      >
        {i18n._(COPY.chat.close)}
      </button>
    </div>
  )
}
