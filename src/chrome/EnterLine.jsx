import { Fragment } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { say, boardName } from './say'

// The Enter line: one reserved row under the field that changes wording and
// never pushes anything down. It reads → target · what Enter will do · how
// to leave (bar reference). The words come from the copy table.

function Parts({ parts }) {
  return parts.map((part, i) => (
    <Fragment key={part.key}>
      {i > 0 && <span className="sep" aria-hidden="true">{'·'}</span>}
      <span className={part.now ? 'now' : undefined}>{part.text}</span>
    </Fragment>
  ))
}

/**
 * @param {{ mode: string, resting: string, empty: boolean, says: { message: string, values?: object }|null, addressed: string,
 *   room?: { chat: number|null, name?: string|null }, welcome?: { next: { shows: string }|null }|null }} props
 *   welcome: set on the welcome page, with its next step (W §2, §6)
 *   room: the room on this screen, its chat's number, or null for an empty
 *   room; left out when the screen has no room. A prompt goes there.
 *   search: on Records, how many rows the search leaves ({ count }); null
 *   where search does not reach yet (C132 (a))
 */
export default function EnterLine({ mode, resting, empty, says, addressed, room, welcome = null, hidden = false, search = null }) {
  const { i18n } = useLingui()
  const leave = { key: 'leave', text: i18n._(resting === 'prompt' ? COPY.enter.leavePrompt : COPY.enter.leaveSearch) }
  const toRoom = room && (mode === 'prompt' || addressed === 'room')
  const target = {
    key: 'target',
    now: true,
    text: !toRoom
      ? i18n._(COPY.enter.target, { board: boardName(i18n, addressed) })
      : room.chat == null
        ? i18n._(COPY.enter.targetNewRoom)
        : room.name ? i18n._(COPY.enter.targetChatIn, { chat: room.chat, room: room.name }) : i18n._(COPY.enter.targetChat, { chat: room.chat }),
  }
  let parts
  // More sentences, as where a window cannot stay on top (C94), or what
  // stays out of a prompt: a key of COPY.enter, or { message, values }.
  const also = (says?.also == null ? [] : [].concat(says.also))
    .map((a) => (typeof a === 'string' ? { message: a } : a))
    .map((a, i) => ({ key: `also${i}`, text: say(i18n, a.message, a.values) }))
  if (mode === 'command' && welcome?.next && says?.message === 'empty') {
    // The welcome page's command line leads with the next step (W §6).
    parts = [
      { key: 'next', now: true, text: i18n._(COPY.enter.nextStep, { command: welcome.next.shows }) },
      { key: 'p', text: i18n._(COPY.enter.restingPrompt) },
      { key: 'h', text: i18n._(COPY.enter.restingHelp) },
      leave,
    ]
  } else if (mode === 'command') {
    parts = [target, { key: 'does', now: true, text: say(i18n, says.message, says.values) }, ...also]
    parts.push(leave)
  } else if (mode === 'search' && welcome && empty) {
    // At rest on the welcome page, one line only (W §2).
    parts = [{ key: 'begin', now: true, text: i18n._(COPY.enter.toBegin, { leader: '>' }) }]
  } else if (mode === 'search') {
    parts = empty
      ? [
        { key: 'c', text: i18n._(COPY.enter.restingCommand) },
        { key: 'p', text: i18n._(COPY.enter.restingPrompt) },
        { key: 'h', text: i18n._(COPY.enter.restingHelp) },
      ]
      : [{
        key: 'does',
        now: true,
        text: search ? i18n._(COPY.enter.searchShows, { count: search.count }) : i18n._(COPY.enter.searchRecords, { board: boardName(i18n, 'almanac') }),
      }]
    if (resting !== 'search') parts.push(leave)
  } else {
    // Who receives the prompt and what it costs, before Enter (C83).
    parts = [target]
    if (says?.message) parts.push({ key: 'does', now: true, text: say(i18n, says.message, says.values) }, ...also)
    // On the welcome page, the way to the command line from a prompt (C119).
    if (welcome) parts.push({ key: 'cmd', text: i18n._(COPY.enter.toCommand, { leader: '>' }) })
    if (resting !== 'prompt') parts.push(leave)
  }
  return (
    <div className={`ch-enter${hidden ? ' hide' : ''}`} aria-live="polite" aria-hidden={hidden ? 'true' : undefined}>
      <Parts parts={parts} />
    </div>
  )
}
