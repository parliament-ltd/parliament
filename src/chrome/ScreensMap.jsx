// The screens map (stage 14, piece 4; C259; parliament_screens_v1.html):
// each screen labelled, the boards and windows on it, the board the bar
// points at in navy, and, while a command is typed, what would move. It
// stands where the boards are while it is open; the boards stay as they
// are underneath. Everything on it writes a command; Escape closes it.

import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { andList, boardName } from './say'
import { moveCommand } from '../shell/screensMap'
import { wordFor, isRoom } from '../shell/boards'

// How big a screen is drawn: its share of the widest, between these.
const MAX_W = 380
const MIN_W = 240
const UNKNOWN = { here: [320, 190], other: [380, 214] }

function sizeOf(screen, widest) {
  if (!screen.width || !widest || screen.n == null) return screen.current ? UNKNOWN.here : UNKNOWN.other
  const w = Math.max(MIN_W, Math.round((MAX_W * screen.width) / widest))
  return [w, Math.round((w * (screen.height || screen.width * 0.6)) / screen.width)]
}

/**
 * @param {{ screens: object[], foot: string|null, under: { lab: boolean, name: string|null, boards: string[] },
 *   saved: { id: string, name: string }[], subOf: (board: string) => string|null, listName: (board: string) => string,
 *   onWrite: (value: string) => void, onClose: () => void }} props
 */
export default function ScreensMap({ screens, foot, under, saved, subOf, listName, onWrite, onClose }) {
  const { i18n } = useLingui()
  const widest = Math.max(0, ...screens.map((s) => s.width ?? 0))
  const write = (command) => onWrite(`>${command}`)

  const label = (s) => {
    if (s.n == null) {
      return s.current
        ? [i18n._(COPY.screensMap.here), s.width ? i18n._(COPY.screensMap.wideHere, { width: i18n.number(s.width, { useGrouping: false }) }) : i18n._(COPY.screensMap.hereSub)]
        : [i18n._(COPY.screensMap.other), i18n._(COPY.screensMap.otherSub)]
    }
    const wide = i18n.number(s.width, { useGrouping: false })
    return [i18n._(COPY.screensMap.display, { n: s.n }), i18n._(s.current ? COPY.screensMap.wideHere : COPY.screensMap.wide, { width: wide })]
  }
  const note = (item) => {
    if (item.mark === 'ghost') return i18n._(COPY.screensMap.ghost)
    if (item.mark === 'leaving') {
      if (!item.to) return i18n._(COPY.screensMap.leavingGone)
      if (!item.to.window) return i18n._(COPY.screensMap.leavingHere)
      if (item.to.current) return i18n._(COPY.screensMap.leavingWindow)
      return item.to.n != null ? i18n._(COPY.screensMap.leavingTo, { n: item.to.n }) : i18n._(COPY.screensMap.leavingOther)
    }
    if (item.window) return i18n._(COPY.screensMap.window)
    return subOf(item.board)
  }

  const onScreen = under.lab ? COPY.screensMap.onScreenLab : under.name ? COPY.screensMap.onScreenNamed : COPY.screensMap.onScreen
  const boards = andList(i18n, under.boards.map(listName))

  // A board or window: a click writes the command that moves it; one already moving only shows it.
  const drawItem = (it) => {
    const command = it.mark ? null : moveCommand(it, wordFor(it.board), screens)
    const sub = note(it)
    const name = isRoom(it.board) ? i18n._(COPY.screensMap.room) : boardName(i18n, it.board)
    const cls = `ch-map-b${it.addressed ? ' addr' : ''}${it.mark ? ` ${it.mark}` : ''}${it.window ? ' win' : ''}${isRoom(it.board) ? ' room' : ''}`
    const inner = (
      <>
        <span className="ch-map-bn">{name}</span>
        {sub && <small className="ch-marg">{sub}</small>}
      </>
    )
    return command
      ? <button key={`${it.board}:${it.mark}`} type="button" className={cls} title={i18n._(COPY.screensMap.move, { command })} onClick={() => write(command)}>{inner}</button>
      : <div key={`${it.board}:${it.mark}`} className={cls} title={name}>{inner}</div>
  }

  return (
    <section className="ch-map" aria-label={i18n._(COPY.screensMap.label)}>
      <div className="ch-map-screens">
        {screens.map((s) => {
          const [w, h] = sizeOf(s, widest)
          const [name, sub] = label(s)
          const page = s.items.filter((it) => !it.window)
          const wins = s.items.filter((it) => it.window)
          return (
            <div key={s.key} className="ch-map-disp" style={{ '--w': `${w}px`, '--h': `${h}px` }}>
              <div className={`ch-map-scr${s.items.length ? '' : ' empty'}${s.n == null && !s.current ? ' unknown' : ''}`}>
                {!s.items.length && <span className="ch-marg">{i18n._(COPY.screensMap.empty)}</span>}
                {/* The boards on the page side by side; windows over them, as on a screen. */}
                {page.length > 0 && <div className="ch-map-page">{page.map(drawItem)}</div>}
                {wins.length > 0 && <div className="ch-map-wins">{wins.map(drawItem)}</div>}
              </div>
              <p className="ch-map-lab"><b>{name}</b><br /><span className="ch-marg">{sub}</span></p>
            </div>
          )
        })}
      </div>
      <p className="ch-map-under ch-marg">
        <span>{i18n._(onScreen, { name: under.name ?? '', boards })}</span>
        <span className="sep" aria-hidden="true">·</span>
        <button type="button" onClick={() => write('arrange:save ')}>{i18n._(COPY.screensMap.save)}</button>
        <span className="sep" aria-hidden="true">·</span>
        <button type="button" onClick={() => write('reset:')}>{i18n._(COPY.screensMap.reset)}</button>
        <span className="sep" aria-hidden="true">·</span>
        <button type="button" onClick={onClose}>{i18n._(COPY.screensMap.back)}</button>
      </p>
      {saved.length > 0 && (
        <p className="ch-map-saved ch-marg">
          <span>{i18n._(COPY.screensMap.saved)}</span>
          {saved.map((s) => (
            <span key={s.id}>
              <span className="sep" aria-hidden="true">·</span>
              <button type="button" dir="auto" onClick={() => write(`arrange:"${s.name}"`)}>{s.name}</button>
            </span>
          ))}
        </p>
      )}
      {foot && (
        <p className="ch-map-foot">
          <b>{i18n._(COPY.screensMap[`${foot}Head`])}</b> {i18n._(COPY.screensMap[`${foot}Body`])}
        </p>
      )}
    </section>
  )
}
