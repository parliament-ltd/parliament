import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { MARK_KINDS, SHOWN_KINDS } from '../lib/markupShow'
import { MenuPanel, MenuColumns, MenuGroup, MenuRow } from './Menu'
import { footOf } from './menus'

// The markup menu (C301 (b); Stefan, 15 November; parliament-markup-v1.html),
// where "calm: off" was at the strip's end. Drawn as every menu is (C279 (f);
// Menu.jsx), and opened under "markup ▾" as the languages open under the
// globe (30 October). Mode and what shows are kept apart, as Word keeps Track
// Changes apart from Show Markup. Every click runs a command, which the line
// under the bar names and undo: takes back, and the menu stays open until a
// click outside it or Escape (C297).
//
// Comments are listed and wait: they come into the text with C301 (c).

/**
 * @param {{ show: Record<string, boolean>, mode: 'editing'|'suggesting',
 *   waiting: { where: string|number|null, accept: number, reject: number },
 *   onRun: (line: string) => void, onClose?: () => void }} props
 *   waiting: what accept:all and reject:all would settle in the room here; where: its chat's number
 */
export default function MarkupMenu({ show, mode, waiting, onRun, onClose = null }) {
  const { i18n } = useLingui()
  const C = COPY.markupMenu
  const here = waiting?.where != null
  const count = Math.max(waiting?.accept ?? 0, waiting?.reject ?? 0)
  return (
    <MenuPanel className="ch-menu ch-markup-menu" title={i18n._(C.title)} foot={footOf(i18n._(C.foot))} onClose={onClose}>
      <MenuColumns>
        <MenuGroup title={i18n._(C.mode)}>
          <MenuRow round on={mode === 'editing'} label={i18n._(C.editing)} title={i18n._(C.runs, { command: 'markup:editing' })} onClick={() => onRun('markup:editing')}>
            {i18n._(C.editingAbout)}
          </MenuRow>
          <MenuRow round on={mode === 'suggesting'} label={i18n._(C.suggesting)} title={i18n._(C.runs, { command: 'markup:suggesting' })} onClick={() => onRun('markup:suggesting')}>
            {i18n._(C.suggestingAbout)}
          </MenuRow>
        </MenuGroup>
        <MenuGroup title={i18n._(C.show)}>
          {MARK_KINDS.map((kind) => {
            const later = !SHOWN_KINDS.includes(kind)
            const line = `markup:${show[kind] ? 'off' : 'on'} ${kind}`
            return (
              <MenuRow key={kind} on={!later && show[kind]} later={later} label={i18n._(C.kind, { kind })} title={later ? undefined : i18n._(C.runs, { command: line })} onClick={() => { if (!later) onRun(line) }}>
                {i18n._(C.kindAbout, { kind })}
              </MenuRow>
            )
          })}
        </MenuGroup>
        <MenuGroup title={i18n._(C.waiting)} aside={here && <span className="ch-markup-count">{i18n._(C.waitingCount, { count, where: String(waiting.where) })}</span>}>
          {here ? (
            <>
              <div className="ch-markup-acts">
                <button type="button" className="ch-act" disabled={!waiting.accept} title={i18n._(C.runs, { command: 'accept:all' })} onMouseDown={(e) => e.preventDefault()} onClick={() => onRun('accept:all')}>{i18n._(C.acceptAll)}</button>
                <button type="button" className="ch-act" disabled={!waiting.reject} title={i18n._(C.runs, { command: 'reject:all' })} onMouseDown={(e) => e.preventDefault()} onClick={() => onRun('reject:all')}>{i18n._(C.rejectAll)}</button>
              </div>
              <p className="ch-markup-about">{i18n._(C.allAbout)}</p>
            </>
          ) : <p className="ch-markup-about">{i18n._(C.noRoom)}</p>}
        </MenuGroup>
      </MenuColumns>
    </MenuPanel>
  )
}
