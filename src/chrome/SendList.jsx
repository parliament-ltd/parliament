import { useLingui } from '@lingui/react'
import { COPY } from '../copy'

// The bar's sign for a prompt, as the text shows it after a passage (C301 (d)). It stays as it is.
const LEAD = 'p>'

// What Enter sends, by branch (C301 (d), the list; ruled 16 November: "Yes,
// build the list"; parliament-prompts-list-v1.html, section 1). Above the
// bar's field: a row for each branch of the room's prompt, ticked when Enter
// sends to it, with who answers it; under it each prompt in the text and
// each edit waiting there, ticked unless held back. Every tick runs a
// command, said under the bar and taken back by undo:: a branch's runs to:
// (C174), a prompt's or an edit's hold: or hold:off (C298).

/**
 * @param {{ rows: ReturnType<typeof import('../lib/sendList').listOf>, words: boolean,
 *   onBranch: (chatId: string) => void, onItem: (num: number, held: boolean) => void, onFold: () => void }} props
 */
export default function SendList({ rows, words, onBranch, onItem, onFold }) {
  const { i18n } = useLingui()
  const C = COPY.sendList
  const requests = rows.filter((b) => b.ticked && (words || b.going.prompts + b.going.edits > 0)).length
  const keep = (e) => e.preventDefault()
  return (
    <div className="ch-slist" role="group" aria-label={i18n._(C.title)}>
      <div className="ch-slist-head">
        <h3>{i18n._(C.title)}</h3>
        <span className="ch-marg">{i18n._(C.requests, { count: requests })}</span>
        <button type="button" className="ch-marg ch-slist-fold" onMouseDown={keep} onClick={onFold}>{i18n._(C.fold)}</button>
      </div>
      {rows.map((b) => {
        const held = b.prompts.filter((x) => x.held).length + b.edits.filter((x) => x.held).length
        const goes = b.going.prompts + b.going.edits
        const sends = b.ticked && (words || goes > 0)
        return (
          <div key={b.chatId} className={`ch-slist-br${goes + held ? '' : ' none'}`}>
            <button type="button" className="ch-slist-row" aria-pressed={b.ticked} onMouseDown={keep} onClick={() => onBranch(b.chatId)}
              title={i18n._(COPY.shell.focusRuns, { command: 'to:' })}>
              <span className={`ch-slist-box${b.ticked ? ' on' : ''}`} aria-hidden="true" />
              <span className="addr" dir="ltr">{b.address}</span>
              <span className="who">{b.name}</span>
              <span className="what">
                {sends || goes ? i18n._(C.goes, { words: words && b.ticked ? 'yes' : 'no', sep: words && b.ticked && goes ? 'yes' : 'no', prompts: b.going.prompts, edits: b.going.edits, both: b.going.prompts && b.going.edits ? 'yes' : 'no' }) : i18n._(C.nothing)}
              </span>
              <span className="ch-marg">
                {b.here ? i18n._(C.here) : held ? i18n._(C.held, { count: held }) : !b.ticked && !goes ? i18n._(C.tickToSend) : null}
              </span>
            </button>
            {b.prompts.map((x) => (
              <button key={x.num} type="button" className={`ch-slist-it${x.held ? ' held' : ''}`} aria-pressed={!x.held} onMouseDown={keep} onClick={() => onItem(x.num, x.held)}
                title={i18n._(COPY.shell.focusRuns, { command: x.held ? `hold:off ${x.num}` : `hold:${x.num}` })}>
                <span className={`ch-slist-box${x.held ? '' : ' on'}`} aria-hidden="true" />
                <span className="pl" dir="auto"><b dir="ltr">{LEAD}</b>{x.question}</span>
                {x.passage.trim() && <span className="on-what" dir="auto">{i18n._(C.on, { passage: x.passage.trim() })}</span>}
                {x.held && <span className="how">{i18n._(C.waits)}</span>}
              </button>
            ))}
            {b.edits.map((x) => (
              <button key={x.num} type="button" className={`ch-slist-it${x.held ? ' held' : ''}`} aria-pressed={!x.held} onMouseDown={keep} onClick={() => onItem(x.num, x.held)}
                title={i18n._(COPY.shell.focusRuns, { command: x.held ? `hold:off ${x.num}` : `hold:${x.num}` })}>
                <span className={`ch-slist-box${x.held ? '' : ' on'}`} aria-hidden="true" />
                <span className="el" dir="auto">{i18n._(C.edit)} {x.struck && <s>{x.struck}</s>} {x.added && <ins>{x.added}</ins>}</span>
                {x.held && <span className="how">{i18n._(C.waits)}</span>}
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}
