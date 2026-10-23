// Delete everything (stage 9, piece 3; settings spec §4 and §11; Settings
// v1; C73; audit T5; C183). The one red in the product, and the one action
// undo cannot reach. A button in Settings, never a command: it lists what
// goes, offers a backup first, says what it cannot reach, and is armed only
// by typing its word. What it deletes is in lib/eraseAll.js.

import { useEffect, useRef, useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { deleteEverything } from '../lib/deleteEverything'

const BACKUP_LINE = 'backup:'

/**
 * @param {{ counts: { chats: number, plans: number, markings: number }, keyNames: string[], onWrite: (line: string) => void }} props
 *   keyNames: the providers with a key here, by their names in the list of providers
 */
export default function DeleteEverything({ counts, keyNames, onWrite }) {
  const { i18n } = useLingui()
  const say = (d, values) => i18n._(d, values)
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [state, setState] = useState(null) // null, 'working', 'waiting' or { failed }
  const field = useRef(null)
  const word = say(COPY.erase.word)
  const armed = typed.trim().toLowerCase() === word.toLowerCase()
  const busy = state === 'working' || state === 'waiting'

  // Opening it puts the cursor where the word goes.
  useEffect(() => { if (open) field.current?.focus() }, [open])

  const close = () => { setOpen(false); setTyped(''); setState(null) }
  async function run() {
    if (!armed || busy) return
    setState('working')
    try {
      // When it is done, the page is covered by a notice (DbStateNotice).
      await deleteEverything({ onBlocked: () => setState('waiting') })
    } catch (err) {
      setState({ failed: String(err?.message || err?.name || '') })
    }
  }

  let names = keyNames.join(', ')
  try { names = new Intl.ListFormat(i18n.locale, { type: 'conjunction' }).format(keyNames) } catch { /* the plain list */ }

  return (
    <div className="ch-danger">
      <div className="ch-danger-t">{say(COPY.erase.title)}</div>
      <p className="ch-danger-h">
        {say(COPY.erase.about)}{' '}
        <span className="ch-danger-first">
          {say(COPY.erase.backupFirst)}{' '}
          <button type="button" className="ch-marg ch-smarg" onMouseDown={(e) => e.preventDefault()} onClick={() => onWrite(`>${BACKUP_LINE}`)}>{BACKUP_LINE}</button>
        </span>
      </p>
      {!open && (
        <button type="button" className="ch-red-btn" onClick={() => setOpen(true)}>{say(COPY.erase.start)}</button>
      )}
      {open && (
        <>
          <p className="ch-danger-lt">{say(COPY.erase.listTitle)}</p>
          <ul className="ch-danger-list">
            <li>{say(COPY.erase.goesChats, counts)}</li>
            <li>{say(COPY.erase.goesMarkings, counts)}</li>
            <li>{say(COPY.erase.goesRooms)}</li>
            {keyNames.length > 0 && <li>{say(COPY.erase.goesKeys, { names })}</li>}
            <li>{say(COPY.erase.goesSettings)}</li>
            <li>{say(COPY.erase.goesOffline)}</li>
          </ul>
          <p className="ch-danger-h">{say(COPY.erase.cannot)}</p>
          <div className="ch-danger-confirm">
            <input
              ref={field} type="text" value={typed} disabled={busy}
              autoComplete="off" spellCheck={false} data-1p-ignore data-lpignore="true"
              placeholder={say(COPY.erase.typeWord, { word })} aria-label={say(COPY.erase.typeWord, { word })}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); close() } }}
            />
            <button type="button" className="ch-red-btn" disabled={!armed || busy} onClick={run}>{say(busy ? COPY.erase.working : COPY.erase.go)}</button>
            <button type="button" className="ch-plain-btn" disabled={busy} onClick={close}>{say(COPY.erase.keep)}</button>
          </div>
          {state === 'waiting' && <p className="ch-danger-h" role="status">{say(COPY.erase.waiting)}</p>}
          {state?.failed != null && <p className="ch-danger-h warn" role="alert">{say(COPY.erase.failed, { reason: state.failed })}</p>}
        </>
      )}
    </div>
  )
}
