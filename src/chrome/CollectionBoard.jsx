import { useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { dayOf } from './when'
import { WORDED, selectionOf, actCommand } from '../lib/cardActs'

// The Collection (refactor-plan.md, stage 6, piece 6; collection board v3;
// the editing spec; C139, C144): cards, not a table. Markings are read, not
// scanned.
//
// At the top, the collections, one line, a click showing one as
// open:"…" does. Then the one on screen: its name, what it holds ("from"),
// whose list writes add: or rm: into the bar for Enter; the tabs, each kind
// shown only when it holds something (A16); the three orders; and the cards,
// with the headings between them in your order.
//
// Tabs, orders and showing a collection only change the screen, so they act
// at once; anything that changes a collection is written into the bar.
//
// Piece 7 (C145): a box on each card selects it, for the tab only; the foot
// names what is selected and offers the four acts, each writing its command
// with the numbers into the bar (Prompt turns the bar to a prompt about
// them). A card's number finds its passage in the chat.

const TABS = [
  ['all', COPY.collections.tabAll], ['highlight', COPY.collections.tabHighlight], ['term', COPY.collections.tabTerm],
  ['quote', COPY.collections.tabQuote], ['note', COPY.collections.tabNote], ['message', COPY.collections.tabMessage],
]
const ORDERS = [['yours', COPY.collections.yours], ['source', COPY.collections.source], ['date', COPY.collections.date]]
// Commands, which stay English.
const ADD = (num) => `add:${num}`
const RM = (num) => `rm:${num}`
const QUOTED = new Set(['term', 'quote', 'highlight', 'message'])

function Card({ card, under, onWrite, picked, onPick, onFind, rowOf }) {
  const { i18n } = useLingui()
  const kind = card.kind === 'gone' ? null : COPY.kinds[card.kind]
  const from = card.chatNum ?? (card.via?.kind === 'chat' ? card.via.num : null)
  const name = i18n._(COPY.collections.card, { kind: card.kind, num: card.num ?? '' })
  const pickable = card.num != null && WORDED.has(card.kind)
  // Its passage can be found when it sits in a chat that is still there.
  const findable = pickable && !card.gone && !card.own && from != null
  const quoted = (card.quotes ?? []).map((n) => ({ num: n, row: rowOf(n) }))
  return (
    <div className={`ch-mk ck-${card.kind}${card.gone ? ' gone' : ''}${picked ? ' sel' : ''}`} data-key={card.key} data-num={card.num ?? undefined}>
      {pickable
        ? <button type="button" className="ch-mk-box" aria-pressed={picked} aria-label={i18n._(COPY.collections.select, { card: name })} onClick={() => onPick(card.num)}>{picked ? '✓' : ''}</button>
        : <span className="ch-mk-box none" aria-hidden="true" />}
      <div className="ch-mk-body">
        {card.text
          ? <div className={QUOTED.has(card.kind) ? 'q' : 't'} dir="auto">{card.text}</div>
          : <div className="t gonetext">{i18n._(COPY.collections.erased, { what: card.what ?? 'other', num: card.num ?? '' })}</div>}
        {quoted.length > 0 && (
          <div className="ch-mk-qs">
            {quoted.map(({ num, row }) => (
              <div key={num} className={row ? `ck-${row.kind}` : 'gone'} dir="auto">
                {row ? row.text || row.title : null}
                <span className="c-id">{row ? i18n._(COPY.collections.card, { kind: row.kind, num }) : i18n._(COPY.collections.quotedGone, { num })}</span>
              </div>
            ))}
          </div>
        )}
        <div className="ch-marg ch-mk-marg">
          {card.num != null && (findable
            ? <button type="button" className="c-id" title={i18n._(COPY.collections.findHelp)} onClick={() => onFind(card.num)}>{card.num}</button>
            : <span className="c-id">{card.num}</span>)}
          {kind && <span>{i18n._(kind)}</span>}
          {card.summary
            ? <span>{i18n._(COPY.collections.summaryOf, { day: dayOf(i18n, card.summary.at), nums: card.summary.from.join(', ') })}</span>
            : card.own && <span>{i18n._(COPY.collections.writtenHere)}</span>}
          {from != null && !card.erasedFrom && (findable
            ? <button type="button" title={i18n._(COPY.collections.findHelp)} onClick={() => onFind(card.num)}>{i18n._(COPY.collections.cardFrom, { num: from })}</button>
            : (
              <button type="button" title={i18n._(COPY.collections.openHelp, { num: from })} onClick={() => onWrite(`>open:${from}`)}>
                {i18n._(COPY.collections.cardFrom, { num: from })}
              </button>
            ))}
          {card.erasedFrom != null && <span>{i18n._(COPY.collections.erasedFrom, { num: card.erasedFrom })}</span>}
          {under && <span>{i18n._(COPY.collections.under, { heading: under })}</span>}
          {card.tags.map((t) => <span key={t} className="ch-tag" dir="auto">{t}</span>)}
        </div>
      </div>
    </div>
  )
}

/** The foot: what is selected, and the four acts (C145 (d)). */
function Acts({ cards, picked, onPick, onClearPicked, onWrite, onPrompt }) {
  const { i18n } = useLingui()
  const sel = selectionOf(cards, picked)
  const n = sel.nums.length
  const act = (word, command, extra = null, disabled = false) => (
    <button type="button" className="ch-act" disabled={disabled} title={command ? i18n._(COPY.collections.actHelp, { command: command.slice(1) }) : undefined} onClick={() => onWrite(command)}>
      {i18n._(word)}{extra && <small>{extra}</small>}
    </button>
  )
  return (
    <div className="ch-col-acts">
      <div className="ch-col-scope ch-marg">
        {n === 0
          ? <span>{i18n._(COPY.collections.selectNone)}</span>
          : (
            <>
              <b>{i18n._(COPY.collections.selected, { count: n })}</b>
              {sel.items.map((c) => (
                <button key={c.num} type="button" className={`ch-pick ck-${c.kind}`} aria-label={i18n._(COPY.collections.select, { card: i18n._(COPY.collections.card, c) })} onClick={() => onPick(c.num)}>
                  {i18n._(COPY.collections.card, c)}
                </button>
              ))}
              <button type="button" onClick={onClearPicked}>{i18n._(COPY.collections.selectClear)}</button>
            </>
          )}
      </div>
      <div className="ch-col-actrow">
        {act(COPY.collections.actNote, actCommand.note(sel.nums), n ? i18n._(COPY.collections.actNoteQuoting, { count: n }) : null)}
        {act(COPY.collections.actTag, actCommand.tag(sel.nums), null, n === 0)}
        {act(COPY.collections.actSummarize, actCommand.summarize(sel.nums), i18n._(COPY.collections.actOneCall))}
        <button type="button" className="ch-act" disabled={n === 0} title={i18n._(COPY.collections.actPromptHelp)} onClick={onPrompt}>
          {i18n._(COPY.collections.actPrompt)}<small>{i18n._(COPY.collections.actNewChat)}</small>
        </button>
      </div>
    </div>
  )
}

/** What a collection can hold, with numbered boxes for what it holds (C144 (f)). */
function Picker({ pickable, sources, onWrite }) {
  const { i18n } = useLingui()
  const place = new Map(sources.map((s, i) => [`${s.kind}:${s.num}`, i + 1]))
  const group = (title, rows, kind) => rows.length > 0 && (
    <div className="ch-pk-group">
      <div className="ch-pk-title">{i18n._(title)}</div>
      {rows.map((r) => {
        const n = place.get(`${kind}:${r.num}`)
        const command = n ? RM(r.num) : ADD(r.num)
        return (
          <button key={r.num} type="button" className={`ch-pk-item${n ? ' on' : ''}`} title={i18n._(COPY.collections.pickHelp, { command })} onClick={() => onWrite(`>${command}`)}>
            <span className="box">{n ?? ''}</span>
            <span className="nm" dir="auto">{r.title || i18n._(COPY.almanac.untitled)}</span>
            <span className="c-id">{r.num}</span>
          </button>
        )
      })}
    </div>
  )
  return (
    <div className="ch-pk">
      {group(COPY.collections.plans, pickable.filter((r) => r.kind === 'docket'), 'plan')}
      {group(COPY.collections.chats, pickable.filter((r) => r.kind === 'chat'), 'chat')}
      <p className="ch-marg ch-pk-foot">{i18n._(COPY.collections.pickFoot)}</p>
    </div>
  )
}

/**
 * @param {{ collection: object|null, collections: object[], label: (c: object) => string, entries: object[], counts: object,
 *   view: { tab: string, sort: string, asc?: boolean }, sources: object[], pickable: object[], searching: boolean,
 *   addressed: boolean, onAddress: (board: string) => void, onWrite: (text: string) => void,
 *   onView: (change: object) => void, onShow: (collection: object) => void }} props
 *   entries: the sequence to draw (collectionCards.sequenceOf); counts: cards by kind; pickable: plans and chats to hold
 */
export default function CollectionBoard({ collection, collections, label, entries, counts, view, sources, pickable, searching, addressed, onAddress, onWrite, onView, onShow, cards = [], picked = [], onPick, onClearPicked, onFind, onPrompt, rowOf = () => null }) {
  const { i18n } = useLingui()
  const [picking, setPicking] = useState(false)

  let body
  if (!collection) body = <p className="ch-marg ch-alm-note">{i18n._(COPY.collections.none)}</p>
  else {
    const tabs = TABS.filter(([k]) => k === 'all' || counts[k])
    const list = entries.length
      ? entries.map((e) => {
        if (e.head) return <div key={`h:${e.head.id}`} className="ch-mk-head" dir="auto"><span aria-hidden="true">{'§'}</span>{e.head.text}</div>
        if (e.group) {
          const title = e.group.kind === 'added' ? COPY.collections.groupAdded : e.group.kind === 'plan' ? COPY.collections.groupPlan : COPY.collections.groupChat
          return <div key={`g:${e.group.kind}:${e.group.num}`} className="ch-mk-group">{i18n._(title, { num: e.group.num ?? '' })}</div>
        }
        return (
          <Card
            key={e.card.key} card={e.card} under={view.sort !== 'yours' ? e.under : null} onWrite={onWrite}
            picked={e.card.num != null && picked.includes(e.card.num)} onPick={onPick} onFind={onFind} rowOf={rowOf}
          />
        )
      })
      : <p className="ch-marg ch-alm-note">{i18n._(searching ? COPY.collections.noneMatch : collection.items.length ? COPY.collections.emptyHeld : COPY.collections.empty)}</p>
    body = (
      <>
        <div className="ch-col-head">
          <span className="ch-col-name" dir="auto">{label(collection)}</span>
          <span className="ch-marg">
            {i18n._(COPY.collections.from)}{' '}
            <button type="button" className="ch-col-from" aria-expanded={picking} title={i18n._(COPY.collections.fromHelp)} onClick={() => setPicking((p) => !p)}>
              {sources.length ? sources.map((s) => s.num).join(', ') : i18n._(COPY.collections.fromNothing)}
            </button>
            <span className="ch-col-count">{i18n._(COPY.collections.count, { count: counts.all ?? 0 })}</span>
          </span>
        </div>
        {picking && <Picker pickable={pickable} sources={sources} onWrite={onWrite} />}
        <div className="ch-col-tabs" role="tablist">
          {tabs.map(([k, word]) => (
            <button key={k} type="button" role="tab" aria-selected={view.tab === k} className={view.tab === k ? 'on' : undefined} onClick={() => onView({ tab: k })}>
              {i18n._(word)}<span className="n">{counts[k] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="ch-col-tools ch-marg">
          <span>{i18n._(COPY.collections.by)}</span>
          {ORDERS.map(([k, word]) => (
            <button key={k} type="button" className={view.sort === k ? 'on' : undefined} onClick={() => onView({ sort: k, asc: false })}>{i18n._(word)}</button>
          ))}
        </div>
        <div className="ch-col-list">{list}</div>
        <Acts cards={cards} picked={picked} onPick={onPick} onClearPicked={onClearPicked} onWrite={onWrite} onPrompt={onPrompt} />
      </>
    )
  }

  return (
    <article
      className={`ch-card ch-collection${addressed ? ' addressed' : ''}`}
      aria-current={addressed ? 'true' : undefined}
      onMouseDown={() => onAddress('collection')}
    >
      <header className="ch-chead">
        <h2>{i18n._(COPY.boards.collection)}</h2>
        {addressed && <span className="ch-marg">{i18n._(COPY.shell.addressed)}</span>}
      </header>
      {collections.length > 1 && (
        <div className="ch-alm-saved ch-marg" role="group" aria-label={i18n._(COPY.collections.line)}>
          <span className="k">{i18n._(COPY.collections.line)}</span>
          {collections.map((c) => (
            <button
              key={c.id}
              type="button"
              className={c.id === collection?.id ? 'on' : undefined}
              aria-current={c.id === collection?.id ? 'true' : undefined}
              title={i18n._(COPY.collections.showHelp, { name: label(c) })}
              onClick={() => onShow(c)}
            >
              <span dir="auto">{label(c)}</span>
            </button>
          ))}
        </div>
      )}
      {body}
    </article>
  )
}
