import { useLingui } from '@lingui/react'
import { COPY } from '../copy'

// Where the next prompt goes among a prompt's branches (refactor-plan.md,
// stage 8, piece 3; branch slider v9, "Reply to"; C174). Opened from "to
// 201a" in the prompt field. One row per branch with a numbered box, as the
// picker of who answers has; a click ticks or unticks it and holds the
// choice, as to: does. "all of them" ticks every one.

/**
 * @param {{ members: Array<{ chatId: string, address: string|null, name: string }>, targets: { chats: string[], why: string },
 *   line: string, onToggle: (chatId: string) => void, onAll: () => void }} props
 */
export default function ReplyPicker({ members, targets, line, onToggle, onAll }) {
  const { i18n } = useLingui()
  const about = (m) => {
    if (targets.why === 'carried' && m.chatId === line) return COPY.replyPicker.carried
    if (targets.why === 'carried') return COPY.replyPicker.ownRoom
    if (targets.why !== 'held' && targets.chats.includes(m.chatId)) return COPY.replyPicker.viewed
    return COPY.replyPicker.thread
  }
  return (
    <div className="ch-answers">
      <div className="ch-ans-group" role="group" aria-label={i18n._(COPY.replyPicker.title)}>
        <div className="ch-ans-title">
          <span>{i18n._(COPY.replyPicker.title)}</span>
          {targets.chats.length < members.length && (
            <button type="button" className="ch-marg ch-keyact" onMouseDown={(e) => e.preventDefault()} onClick={onAll}>{i18n._(COPY.replyPicker.all, { count: members.length })}</button>
          )}
        </div>
        {members.map((m) => {
          const at = targets.chats.indexOf(m.chatId)
          return (
            <button key={m.chatId} type="button" className={`ch-ans${at >= 0 ? ' on' : ''}`} aria-pressed={at >= 0} onMouseDown={(e) => e.preventDefault()} onClick={() => onToggle(m.chatId)}>
              <span className="box" aria-hidden="true">{at >= 0 ? String(at + 1) : ''}</span>
              <span className="ch-ans-body">
                <span className="ch-ans-top"><span className="nm" dir="auto">{m.address ? `${m.address} · ${m.name}` : m.name}</span></span>
                <span className="ch-ans-about">{i18n._(about(m))}</span>
              </span>
            </button>
          )
        })}
      </div>
      <p className="ch-marg ch-ans-foot">{i18n._(targets.why === 'held' ? COPY.replyPicker.held : targets.why === 'carried' ? COPY.replyPicker.footCarried : COPY.replyPicker.follows)}</p>
    </div>
  )
}
