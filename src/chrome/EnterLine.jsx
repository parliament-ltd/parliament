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
 * @param {{ mode: string, resting: string, empty: boolean, says: { message: string, values?: object }, addressed: string }} props
 */
export default function EnterLine({ mode, resting, empty, says, addressed }) {
  const { i18n } = useLingui()
  const leave = { key: 'leave', text: i18n._(resting === 'prompt' ? COPY.enter.leavePrompt : COPY.enter.leaveSearch) }
  const target = { key: 'target', now: true, text: i18n._(COPY.enter.target, { board: boardName(i18n, addressed) }) }
  let parts
  if (mode === 'command') {
    parts = [target, { key: 'does', now: true, text: say(i18n, says.message, says.values) }]
    // A second sentence, as where a window cannot stay on top (C94).
    if (says.also) parts.push({ key: 'also', text: say(i18n, says.also) })
    parts.push(leave)
  } else if (mode === 'search') {
    parts = empty
      ? [
        { key: 'c', text: i18n._(COPY.enter.restingCommand) },
        { key: 'p', text: i18n._(COPY.enter.restingPrompt) },
        { key: 'h', text: i18n._(COPY.enter.restingHelp) },
      ]
      : [{ key: 'does', now: true, text: i18n._(COPY.enter.searchLater) }]
    if (resting !== 'search') parts.push(leave)
  } else {
    parts = [target]
    if (!empty) parts.push({ key: 'does', now: true, text: i18n._(COPY.enter.promptLater) })
    if (resting !== 'prompt') parts.push(leave)
  }
  return (
    <div className="ch-enter" aria-live="polite">
      <Parts parts={parts} />
    </div>
  )
}
