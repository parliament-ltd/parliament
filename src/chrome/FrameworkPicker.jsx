import { useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { MenuPanel, MenuColumns, MenuGroup, MenuRow } from './Menu'
import { footOf, quotedForCommand } from './menus'

// The frameworks' picker (stage 7, piece 5; the editing spec's collab:
// picker, "in the answered-by picker's shape, grouped Built in and Yours,
// with numbered boxes"; C164). Opened by "framework:" in the prompt field or
// a bare framework:, under the field, and drawn as the ? reference is (29
// October; Menu.jsx). A ticked box carries its place in the stack, which is
// the order the instructions go in. A click adds one at the end, or takes it
// off; it runs framework: as Enter would, so undo: has it.
//
// Under Yours, a framework of your own is added here (C308; Stefan, 17
// November: "let users create a new framework in the menu that pops up"):
// its name and what it asks, and Add runs new:framework with them, as typed
// in the bar, so the bar says what it did and undo: has it.

/**
 * @param {{ items: Array<{ id: string, builtIn: boolean, name: string, about: string|null, at: number|null }>,
 *   onToggle: (id: string) => void, onAdd?: ((line: string) => void)|null, onClose?: () => void }} props
 *   at: its place in this chat's stack, from 1, or null when off;
 *   onAdd: runs the new:framework line the form writes
 */
export default function FrameworkPicker({ items, onToggle, onAdd = null, onClose = null }) {
  const { i18n } = useLingui()
  const [name, setName] = useState('')
  const [asks, setAsks] = useState('')
  const row = (f) => (
    <MenuRow key={f.id} on={Boolean(f.at)} mark={f.at ?? ''} label={f.name} onClick={() => onToggle(f.id)}>
      {f.about && <span dir="auto">{f.about}</span>}
    </MenuRow>
  )
  const builtIn = items.filter((f) => f.builtIn)
  const yours = items.filter((f) => !f.builtIn)
  const qName = quotedForCommand(name)
  const qAsks = quotedForCommand(asks)
  const ready = Boolean(name.trim() && asks.trim() && qName && qAsks)
  const add = (e) => {
    e.preventDefault()
    if (!ready || !onAdd) return
    onAdd(`new:framework ${qName} ${qAsks}`)
    setName('')
    setAsks('')
  }
  return (
    <MenuPanel
      className="ch-menu"
      title={i18n._(COPY.frameworkPicker.title)}
      foot={footOf(i18n._(COPY.frameworkPicker.foot))}
      onClose={onClose}
    >
      <MenuColumns>
        <MenuGroup title={i18n._(COPY.frameworkPicker.builtIn)}>{builtIn.map(row)}</MenuGroup>
        <MenuGroup title={i18n._(COPY.frameworkPicker.yours)}>
          {yours.map(row)}
          {onAdd && (
            <form className="ch-fw-add" onSubmit={add}>
              <p className="ch-menu-note">{i18n._(COPY.frameworkPicker.addHere)}</p>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={i18n._(COPY.frameworkPicker.addName)} aria-label={i18n._(COPY.frameworkPicker.addName)} dir="auto" autoComplete="off" spellCheck={false} />
              <input type="text" value={asks} onChange={(e) => setAsks(e.target.value)} placeholder={i18n._(COPY.frameworkPicker.addAsks)} aria-label={i18n._(COPY.frameworkPicker.addAsks)} dir="auto" autoComplete="off" />
              <button type="submit" disabled={!ready}>{i18n._(COPY.frameworkPicker.addButton)}</button>
            </form>
          )}
        </MenuGroup>
      </MenuColumns>
    </MenuPanel>
  )
}
