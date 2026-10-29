import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { MenuPanel, MenuColumns, MenuGroup, MenuRow } from './Menu'
import { footOf } from './menus'

// Where the next prompt goes among a prompt's branches (refactor-plan.md,
// stage 8, piece 3; branch slider v9, "Reply to"; C174). Opened from "to
// 201a" in the prompt field, and drawn as the ? reference is (29 October;
// Menu.jsx), one group. One row per branch with a numbered box, as the
// picker of who answers has; a click ticks or unticks it and holds the
// choice, as to: does. "all of them" ticks every one.

/**
 * @param {{ members: Array<{ chatId: string, address: string|null, name: string }>, targets: { chats: string[], why: string },
 *   line: string, onToggle: (chatId: string) => void, onAll: () => void, onClose?: () => void }} props
 */
export default function ReplyPicker({ members, targets, line, onToggle, onAll, onClose = null }) {
  const { i18n } = useLingui()
  const about = (m) => {
    if (targets.why === 'carried' && m.chatId === line) return COPY.replyPicker.carried
    if (targets.why === 'carried') return COPY.replyPicker.ownRoom
    if (targets.why !== 'held' && targets.chats.includes(m.chatId)) return COPY.replyPicker.viewed
    return COPY.replyPicker.thread
  }
  const said = targets.why === 'held' ? COPY.replyPicker.held : targets.why === 'carried' ? COPY.replyPicker.footCarried : COPY.replyPicker.follows
  return (
    <MenuPanel
      className="ch-menu"
      title={i18n._(COPY.replyPicker.title)}
      aside={targets.chats.length < members.length && (
        <button type="button" className="ch-menu-aside" onMouseDown={(e) => e.preventDefault()} onClick={onAll}>{i18n._(COPY.replyPicker.all, { count: members.length })}</button>
      )}
      foot={footOf(i18n._(said), i18n._(COPY.replyPicker.keys), i18n._(COPY.shell.referenceClose))}
      onClose={onClose}
    >
      <MenuColumns>
        <MenuGroup>
          {members.map((m) => {
            const at = targets.chats.indexOf(m.chatId)
            return (
              <MenuRow key={m.chatId} on={at >= 0} mark={at >= 0 ? String(at + 1) : ''} label={m.address ? `${m.address} · ${m.name}` : m.name} onClick={() => onToggle(m.chatId)}>
                {i18n._(about(m))}
              </MenuRow>
            )
          })}
        </MenuGroup>
      </MenuColumns>
    </MenuPanel>
  )
}
