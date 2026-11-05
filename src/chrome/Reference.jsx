import { useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { everyday } from '../commands/registry'
import { isRoom } from '../shell/boards'
import { referenceGroups, anyAway } from './referenceGroups'
import { andList, boardName } from './say'
import { MenuPanel, MenuColumns, MenuGroup } from './Menu'

// The ? reference: every command, grouped, generated from the verb list
// (docket spec §6). It lists every command on every board, as a complete
// reference (C279 (f), ruled 29 October); one that works on another board is
// fainter and names where it works. The Lab's commands wait for a later
// release and are left out (C279 (a)). `?bar` shows one verb's forms.
//
// In two tiers (C291 (a); mockup parliament-reference-v1.html): ? opens the
// Everyday group (the bar's leaders, Esc and fourteen verbs), with one row,
// "more", under it. A click on more folds Everyday to its heading and
// "fewer", and every command follows in its group, exactly as before, so
// nothing is listed twice. ?all opens it that way at once.
//
// Drawn as Almanac v30 draws it: under the bar and as wide as the stage, its
// groups flowing into as many columns as fit, each row the command and what
// it does, the keys at its foot. A click writes the command into the field
// for Enter. The menus under the bar are drawn from the same pieces
// (Menu.jsx; 29 October), so they stay alike.

// The examples the foot and the more row give. Commands stay English.
const ONE_VERB = '?bar'
const ALL = '?all'

export default function Reference({ board, topic, all = false, onPick, onClose = null }) {
  const { i18n } = useLingui()
  const [more, setMore] = useState(Boolean(all))
  const groups = referenceGroups(board, topic)
  const first = everyday(isRoom(board) ? 'room' : board)
  // One verb's forms (?bar) are shown as before, with no tiers.
  const open = Boolean(topic) || more
  const fainter = !topic && more && anyAway(groups)
  // What more adds: the commands not among the everyday ones, and their groups.
  const shownFirst = new Set(first.rows.map((r) => r.verb ?? r.example))
  const rest = groups.map((g) => g.rows.filter((r) => !shownFirst.has(r.verb ?? r.example)).length)
  const count = rest.reduce((n, k) => n + k, 0)
  const restGroups = rest.filter(Boolean).length
  return (
    <MenuPanel
      title={i18n._(COPY.shell.referenceTitle)}
      name={i18n._(COPY.shell.referenceName)}
      aside={fainter && <span className="ch-marg">{i18n._(COPY.shell.referenceFainter)}</span>}
      foot={i18n._(COPY.shell.referenceKeys, { example: ONE_VERB })}
      onClose={onClose}
    >
      {!topic && (
        <div className="ch-ref-first">
          <MenuColumns>
            <MenuGroup title={i18n._(first.title)}>
              {!more && <ReferenceRows rows={first.rows} onPick={onPick} />}
              <button type="button" className="ch-ref-row ch-ref-more" aria-expanded={more} onMouseDown={(e) => e.preventDefault()} onClick={() => setMore((was) => !was)}>
                <span className="ch-code">{i18n._(more ? COPY.shell.referenceFewer : COPY.shell.referenceMore)}</span>
                {!more && <span className="gloss">{i18n._(COPY.shell.referenceMoreCount, { count, groups: restGroups, all: ALL })}</span>}
              </button>
            </MenuGroup>
          </MenuColumns>
        </div>
      )}
      {open && <ReferenceColumns groups={groups} topic={topic} onPick={onPick} />}
    </MenuPanel>
  )
}

/** One group's rows: a command and what it does; a key (Esc) is said, not written. */
function ReferenceRows({ rows, topic = null, onPick }) {
  const { i18n } = useLingui()
  const where = (row) => i18n._(COPY.shell.referenceOn, { boards: andList(i18n, row.on.map((b) => boardName(i18n, b))) })
  return rows.map((row) => (topic ? row.forms : [row.example]).map((form) => (row.key
    ? (
      <div key={form} className="ch-ref-row ch-ref-key">
        <span className="ch-code" dir="ltr">{form}</span>
        <span className="gloss">{i18n._(row.gloss)}</span>
      </div>
    )
    : (
      <button key={form} type="button" className={`ch-ref-row${row.here ? '' : ' away'}`} title={form} onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(form)}>
        <span className="ch-code" dir="ltr">{form}</span>
        <span className="gloss">
          {i18n._(row.gloss)}
          {!row.here && <span className="on"><span className="sep" aria-hidden="true">·</span>{where(row)}</span>}
        </span>
      </button>
    ))))
}

/** The groups in v30's flowing columns, each row a command and what it does; the ? panel and the command menu board share it. */
export function ReferenceColumns({ groups, topic = null, onPick }) {
  const { i18n } = useLingui()
  return (
    <MenuColumns>
      {groups.map((g) => (
        <MenuGroup key={g.group} title={i18n._(g.title)}>
          <ReferenceRows rows={g.rows} topic={topic} onPick={onPick} />
        </MenuGroup>
      ))}
    </MenuColumns>
  )
}
