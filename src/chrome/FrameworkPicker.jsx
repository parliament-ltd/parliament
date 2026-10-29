import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { MenuPanel, MenuColumns, MenuGroup, MenuRow } from './Menu'
import { footOf } from './menus'

// The frameworks' picker (stage 7, piece 5; the editing spec's collab:
// picker, "in the answered-by picker's shape, grouped Built in and Yours,
// with numbered boxes"; C164). Opened by "framework:" in the prompt field or
// a bare framework:, under the field, and drawn as the ? reference is (29
// October; Menu.jsx). A ticked box carries its place in the stack, which is
// the order the instructions go in. A click adds one at the end, or takes it
// off; it runs framework: as Enter would, so undo: has it.

/**
 * @param {{ items: Array<{ id: string, builtIn: boolean, name: string, about: string|null, at: number|null }>,
 *   onToggle: (id: string) => void, onClose?: () => void }} props
 *   at: its place in this chat's stack, from 1, or null when off
 */
export default function FrameworkPicker({ items, onToggle, onClose = null }) {
  const { i18n } = useLingui()
  const row = (f) => (
    <MenuRow key={f.id} on={Boolean(f.at)} mark={f.at ?? ''} label={f.name} onClick={() => onToggle(f.id)}>
      {f.about && <span dir="auto">{f.about}</span>}
    </MenuRow>
  )
  const builtIn = items.filter((f) => f.builtIn)
  const yours = items.filter((f) => !f.builtIn)
  return (
    <MenuPanel
      className="ch-menu"
      title={i18n._(COPY.frameworkPicker.title)}
      foot={footOf(i18n._(COPY.frameworkPicker.foot), i18n._(COPY.frameworkPicker.keys), i18n._(COPY.shell.referenceClose))}
      onClose={onClose}
    >
      <MenuColumns>
        <MenuGroup title={i18n._(COPY.frameworkPicker.builtIn)}>{builtIn.map(row)}</MenuGroup>
        <MenuGroup title={i18n._(COPY.frameworkPicker.yours)}>
          {yours.length ? yours.map(row) : <p className="ch-menu-note">{i18n._(COPY.frameworkPicker.noneYet)}</p>}
        </MenuGroup>
      </MenuColumns>
    </MenuPanel>
  )
}
