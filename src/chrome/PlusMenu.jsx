import { useEffect, useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { strip, wordFor, isRoom } from '../shell/boards'
import { ownNameOf } from '../lib/languages'
import { leftOf } from '../lib/alarms'
import { MenuPanel, MenuColumns, MenuGroup, MenuRow } from './Menu'
import BirdsMark from './BirdsMark'

// The plus menu, on a phone (17 November; Stefan: "the simple input
// competitors use is a plus sign that opens a menu ... we might as well
// consolidate the bird icon and the plus menu"). It holds what the strip
// along the top holds on a wider screen, so a phone keeps its whole height
// for the boards:
// - the boards, named as the strip names them: those open ticked, a room
//   by its chat's number; a tap shows one that is open and opens one that
//   is not, as the strip does; then Import: and Tour:;
// - the page: markup, focus and the language, and the alarms while one is set;
// - the prompt's own: web search and files, where the room offers them.
// Drawn as every menu is (Menu.jsx), above the bar. A row does what the
// strip's word does, and the menu closes.

/**
 * @param {{ arrangement: object, rooms: { board: string, num: number|null }[],
 *   onPick: (board: string, exact?: boolean) => void, onRun: (line: string) => void,
 *   onMarkup: () => void, onLanguage: (() => void)|null, alarm: object|null, focusOn: boolean,
 *   features: { key: string, words: string, on?: boolean, onClick?: () => void }[], onClose: () => void }} props
 */
export default function PlusMenu({ arrangement, rooms = [], onPick, onRun, onMarkup, onLanguage = null, alarm = null, focusOn = false, features = [], onClose }) {
  const { i18n } = useLingui()
  // The time left on the next alarm, kept current while the menu is open.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!alarm) return undefined
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [alarm])
  const then = (act) => () => { onClose(); act() }
  const boards = strip(arrangement).flatMap((b) => (b.board === 'room' && rooms.length
    ? rooms.map((r) => ({ board: r.board, title: b.title, context: r.num, here: true, exact: true, addressed: arrangement.addressed === r.board }))
    : [b]))
  return (
    <MenuPanel
      className="ch-plusmenu"
      title={<><BirdsMark className="ch-plusbirds" />{i18n._(COPY.plus.title)}</>}
      name={i18n._(COPY.plus.title)}
      foot={i18n._(COPY.plus.foot)}
      onClose={onClose}
    >
      <MenuColumns>
        <MenuGroup title={i18n._(COPY.plus.boards)}>
          {boards.map((b) => (
            <MenuRow key={b.board} on={b.here} label={<span dir="ltr">{b.title}</span>} title={i18n._(COPY.shell.focusRuns, { command: isRoom(b.board) ? 'room:' : `open:${wordFor(b.board)}` })} onClick={then(() => onPick(b.board, Boolean(b.exact)))}>
              {b.context != null ? String(b.context) : ''}{b.addressed ? <span className="ch-plus-here">{i18n._(COPY.plus.here)}</span> : null}
            </MenuRow>
          ))}
          {[['import:', 'Import:'], ['tour:', 'Tour:']].map(([command, shown]) => (
            <MenuRow key={command} label={<span dir="ltr">{shown}</span>} title={i18n._(COPY.shell.focusRuns, { command })} onClick={then(() => onRun(command))} />
          ))}
        </MenuGroup>
        <MenuGroup title={i18n._(COPY.plus.page)}>
          <MenuRow label={i18n._(COPY.shell.markupMenu)} title={i18n._(COPY.shell.markupTitle, { command: 'markup:' })} onClick={then(onMarkup)} />
          <MenuRow on={focusOn} label={i18n._(focusOn ? COPY.shell.focusOn : COPY.shell.focusOff)} title={i18n._(COPY.shell.focusTitle, { command: focusOn ? 'focus:off' : 'focus:' })} onClick={then(() => onRun(focusOn ? 'focus:off' : 'focus:'))} />
          {onLanguage && (
            <MenuRow label={i18n._(COPY.plus.language)} onClick={then(onLanguage)}>
              <span lang={i18n.locale}>{ownNameOf(i18n.locale)}</span>
            </MenuRow>
          )}
          {alarm && (
            <MenuRow label={i18n._(COPY.alarms.strip)} title={i18n._(COPY.shell.focusRuns, { command: 'alarm:' })} onClick={then(() => onRun('alarm:'))}>
              {leftOf(alarm, now)}
            </MenuRow>
          )}
        </MenuGroup>
        {features.length > 0 && (
          <MenuGroup title={i18n._(COPY.modes.prompt)}>
            {features.map((f) => (
              <MenuRow key={f.key} on={Boolean(f.on)} label={f.words} title={f.title} off={Boolean(f.off)} onClick={then(() => f.onClick?.())} />
            ))}
          </MenuGroup>
        )}
      </MenuColumns>
    </MenuPanel>
  )
}
