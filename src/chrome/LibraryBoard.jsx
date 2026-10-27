import { useEffect, useMemo, useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { roomLabel } from './say'
import { wordFor } from '../shell/boards'
import { nameOf } from '../lib/lab'
import { settingsOf, wordOfBlock } from '../lib/labBlocks'

// The Library (refactor-plan.md, stage 5, piece 4, thin; stage 13, piece 3,
// in full: C242; Lab v7's Library; arrangements spec §5): everything the
// catalogue holds, from the one read layer (lib/catalogue.js). The shelves
// along the top and the bar's search narrow what it shows; that only changes
// the view, so it acts at once.
//
// In the Lab, with a room on the Canvas, blocks, layouts and themes can be
// ticked and added to the room together: "add to room" writes add: and waits
// for Enter (C242 (a), (b)). A click on an item opens its details under it
// (C242 (c)). Marginalia is facts, and one action: a board's "open", your
// room's "edit here", a template's "duplicate" (C242 (d)); each writes its
// command in the bar.

const SHELF_WORDS = {
  all: COPY.library.shelfAll, room: COPY.library.shelfRooms, board: COPY.library.shelfBoards, layout: COPY.library.shelfLayouts,
  block: COPY.library.shelfBlocks, theme: COPY.library.shelfThemes, resource: COPY.library.shelfResources,
}
const FILTERS = ['all', 'room', 'board', 'layout', 'block', 'theme', 'resource']
const FEATURE_WORDS = { 'web-search': COPY.library.featureWebSearch, 'voice-input': COPY.library.featureVoice, 'file-attach': COPY.library.featureAttach }
const BOARD_WORDS = {
  almanac: COPY.library.aboutAlmanac, collection: COPY.library.aboutCollection, library: COPY.library.aboutLibrary,
  docket: COPY.library.aboutDocket, reflection: COPY.library.aboutReflection, settings: COPY.library.aboutSettings,
}
// What can be ticked and added to a room, and what opens details.
const TICKS = new Set(['block', 'layout', 'theme'])
const DETAILS = new Set(['block', 'layout', 'theme', 'room'])
const CHECK = <svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 6.2l2.3 2.3 4.7-4.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>

// People's words for the catalogue, from the copy table (C131), by shelf;
// the manifest's English where the table has none.
const NAMES = { block: COPY.blocks, layout: COPY.layouts, theme: COPY.themes }
const ABOUT = { block: COPY.blocksAbout, layout: COPY.layoutsAbout, theme: COPY.themesAbout }
const own = (i18n, table, word, fallback) => (word && table && Object.hasOwn(table, word) ? i18n._(table[word]) : fallback)

/** An item's name and about, in the reader's words. */
function wordsOf(i18n, item) {
  const name = item.shelf === 'room' ? roomLabel(i18n, item.name)
    : item.shelf === 'board' ? i18n._(COPY.boards[item.board]) : own(i18n, NAMES[item.shelf], item.word, item.name)
  const about = item.shelf === 'board' ? i18n._(BOARD_WORDS[item.board])
    : item.aboutTemplate ? own(i18n, COPY.templatesAbout, item.aboutTemplate, item.description)
      : own(i18n, ABOUT[item.shelf], item.word, item.description)
  return { name, about }
}

/** Whether an item is in the room on the Canvas already. */
function inRoom(item, mode) {
  if (!mode) return false
  if (item.shelf === 'block') return (mode.components ?? []).some((c) => nameOf(c.ref) === item.word)
  if (item.shelf === 'layout') return nameOf(mode.layout?.ref) === item.word
  if (item.shelf === 'theme') return nameOf(mode.scheme?.ref) === item.word
  return false
}

function Details({ item, items, onClose }) {
  const { i18n } = useLingui()
  const L = COPY.library
  const slot = (s) => (COPY.slots[s] ? i18n._(COPY.slots[s]) : s)
  const block = (b) => (COPY.blocks[b] ? i18n._(COPY.blocks[b]) : b)
  const list = (xs) => (xs.length ? xs.join(', ') : i18n._(L.dNone))
  const rooms = items.filter((x) => x.shelf === 'room' && x.mine)
  const usedIn = (test) => {
    const names = rooms.filter(test).map((r) => roomLabel(i18n, r.name))
    return names.length ? names.join(', ') : i18n._(L.dNoRoom)
  }
  const rows = []
  if (item.shelf === 'block') {
    rows.push([L.dFits, list((item.fits ?? []).map(slot))])
    rows.push([L.dSettings, list(settingsOf(item.word).map((s) => i18n._(COPY.blocksBoard[`${item.word}.${s.key}`])))])
    rows.push([L.dUsedIn, usedIn((r) => (r.blockKeys ?? []).includes(item.word))])
  }
  if (item.shelf === 'layout') {
    rows.push([L.dPlaces, list((item.slots ?? []).map(slot))])
    rows.push([L.dUsedIn, usedIn((r) => r.layoutWord === item.word)])
  }
  if (item.shelf === 'theme') rows.push([L.dUsedIn, usedIn((r) => r.themeWord === item.word)])
  if (item.shelf === 'room') {
    rows.push([L.dLayout, item.layout ? own(i18n, COPY.layouts, item.layoutWord, item.layout) : i18n._(L.dNone)])
    rows.push([L.dTheme, item.theme ? own(i18n, COPY.themes, item.themeWord, item.theme) : i18n._(L.dNone)])
    rows.push([L.dBuiltFor, i18n._(item.device === 'mobile' ? L.dPhone : L.dComputer)])
    rows.push([L.dSendsTo, i18n._(item.localOnly ? L.dThisComputer : L.dAnyone)])
    rows.push([L.dBlocks, list((item.blockKeys ?? []).map(block))])
  }
  return (
    <div className="ch-linl" onClick={(e) => e.stopPropagation()}>
      {rows.map(([k, v]) => (
        <div key={k.id} className="ch-crow"><span className="k">{i18n._(k)}</span><span className="v" dir="auto">{v}</span></div>
      ))}
      <p className="ch-marg ch-lmarg"><button type="button" className="ch-lact" onClick={onClose}>{i18n._(L.close)}</button></p>
    </div>
  )
}

function Item({ item, items, onWrite, lab, ticked, onTick, open, onOpen }) {
  const { i18n } = useLingui()
  const L = COPY.library
  const { name, about } = wordsOf(i18n, item)
  const facts = []
  if (item.shelf === 'room') {
    if (item.layout) facts.push(own(i18n, COPY.layouts, item.layoutWord, item.layout))
    if (item.theme) facts.push(own(i18n, COPY.themes, item.themeWord, item.theme))
    facts.push(i18n._(L.blocks, { count: item.blocks }))
  }
  if (item.shelf === 'layout' && item.places) facts.push(i18n._(L.places, { count: item.places }))
  if (item.shelf === 'block') facts.push(i18n._(L.inRoom))
  if (item.shelf === 'theme') facts.push(i18n._(L.themeFact))
  if (item.shelf === 'board') facts.push(i18n._(L.onScreen))
  if (item.shelf === 'resource' && item.format) facts.push(item.format)
  const here = lab?.room?.mode ? inRoom(item, lab.room.mode) : false
  if (here) facts.push(i18n._(L.inThisRoom))

  // The one action (C242 (d)).
  const write = (command, words) => (
    <button type="button" className="ch-lact" title={i18n._(L.writes, { command })} onClick={(e) => { e.stopPropagation(); onWrite(`>${command}`) }}>{words}</button>
  )
  let action = null
  if (!item.soon) {
    if (item.shelf === 'board') action = write(`open:${wordFor(item.board)}`, i18n._(L.open))
    else if (item.shelf === 'room' && item.mine) action = lab?.inLab && lab.room?.id === item.id ? <span>{i18n._(L.onCanvas)}</span> : write(`edit:"${name}"`, i18n._(L.editHere))
    else if (item.shelf === 'room') action = write(`duplicate:"${name}" template`, i18n._(L.duplicate))
  }

  const canTick = Boolean(lab?.room?.mode) && TICKS.has(item.shelf) && !item.soon
  const canOpen = DETAILS.has(item.shelf) && !item.soon
  return (
    <li className={`ch-li${item.soon ? ' soon' : ''}${canTick ? ' tickable' : ''}${open ? ' sel' : ''}`}
      onClick={canOpen ? () => onOpen(open ? null : item.key) : undefined}>
      {canTick && (
        <button type="button" role="checkbox" className={`ch-cb${ticked ? ' on' : ''}${here ? ' dis' : ''}`} aria-checked={ticked} disabled={here}
          aria-label={i18n._(L.tick, { name })} title={here ? i18n._(L.inThisRoom) : undefined}
          onClick={(e) => { e.stopPropagation(); onTick(item.key) }}>{CHECK}</button>
      )}
      <div className="ch-lmain">
        <div className="ch-lname" dir="auto">
          {canOpen ? <button type="button" className="ch-lopen" aria-expanded={open} onClick={(e) => { e.stopPropagation(); onOpen(open ? null : item.key) }}>{name}</button> : name}
          {item.mine && <span className="ch-lpill">{i18n._(L.pillMine)}</span>}
          {item.template && <span className="ch-lpill">{i18n._(L.pillTemplate)}</span>}
          {item.soon && <span className="ch-lpill">{i18n._(L.pillSoon)}</span>}
        </div>
        {about && <div className="ch-ldesc" dir="auto">{about}</div>}
        {item.features?.length > 0 && (
          <div className="ch-lfeat">{item.features.map((f) => <span key={f}>{i18n._(FEATURE_WORDS[f])}</span>)}</div>
        )}
        <div className="ch-marg ch-lmarg">
          {facts.join(' · ')}
          {action && <>{' · '}{action}</>}
        </div>
      </div>
      {open && <Details item={item} items={items} onClose={() => onOpen(null)} />}
    </li>
  )
}

/**
 * @param {{ items: object[]|null, addressed: boolean, onAddress: (board: string) => void,
 *   onWrite: (text: string) => void, query?: string, onCount?: (n: number) => void,
 *   lab?: { inLab: boolean, room: { id: string, mode: object|null, name: string }|null }|null }} props
 *   items: from lib/catalogue.js, null while they are read
 */
export default function LibraryBoard({ items, addressed, onAddress, onWrite, query = '', onCount, lab = null }) {
  const { i18n } = useLingui()
  const L = COPY.library
  const [shelf, setShelf] = useState('all')
  const [openKey, setOpenKey] = useState(null)
  // Ticks, for the room on the Canvas: another room clears them (C242 (a)).
  const roomId = lab?.inLab ? lab.room?.id ?? null : null
  const [ticks, setTicks] = useState({ room: roomId, keys: [] })
  const keys = ticks.room === roomId ? ticks.keys : []
  const onTick = (key) => setTicks({ room: roomId, keys: keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key] })

  const q = query.trim().toLocaleLowerCase()
  const matches = useMemo(() => (items ?? []).filter((item) => {
    if (!q) return true
    const w = wordsOf(i18n, item)
    const feats = (item.features ?? []).map((f) => i18n._(FEATURE_WORDS[f]))
    return [w.name, w.about, ...feats].some((t) => String(t ?? '').toLocaleLowerCase().includes(q))
  }), [items, q, i18n])
  const shown = matches.filter((i) => shelf === 'all' || i.shelf === shelf)
  useEffect(() => { if (q) onCount?.(shown.length) }, [q, shown.length, onCount])

  // What is ticked and not yet in the room, in the order ticked.
  const mode = lab?.inLab ? lab.room?.mode ?? null : null
  const ticked = keys.map((k) => (items ?? []).find((i) => i.key === k)).filter((i) => i && !inRoom(i, mode))
  const command = ticked.length
    ? `add:${ticked.map((i) => (i.shelf === 'block' ? wordOfBlock(i.word) : `"${wordsOf(i18n, i).name}"`)).join(', ')}`
    : null

  const groups = [
    [L.groupMine, shown.filter((i) => i.shelf === 'room' && i.mine)],
    [L.groupTemplates, shown.filter((i) => i.shelf === 'room' && !i.mine)],
    [L.shelfBoards, shown.filter((i) => i.shelf === 'board')],
    [L.shelfLayouts, shown.filter((i) => i.shelf === 'layout')],
    [L.shelfBlocks, shown.filter((i) => i.shelf === 'block')],
    [L.shelfThemes, shown.filter((i) => i.shelf === 'theme')],
    [L.shelfResources, shown.filter((i) => i.shelf === 'resource')],
  ].filter(([, list]) => list.length)

  let body
  if (items === null) body = <p className="ch-marg ch-alm-note">{i18n._(L.loading)}</p>
  else if (!groups.length) body = <p className="ch-marg ch-alm-note">{i18n._(q ? L.noMatch : L.emptyShelf)}</p>
  else {
    body = groups.map(([title, list]) => (
      <section key={title.id} className="ch-lgroup">
        <h3>{i18n._(title)} <span className="n">{list.length}</span></h3>
        <ul className="ch-lgrid">
          {list.map((item) => (
            <Item key={item.key} item={item} items={items} onWrite={onWrite} lab={lab?.inLab ? lab : null}
              ticked={ticked.includes(item)} onTick={onTick} open={openKey === item.key} onOpen={setOpenKey} />
          ))}
        </ul>
      </section>
    ))
  }

  const narrowed = items && (shelf !== 'all' || q)
  return (
    <article
      className={`ch-card ch-library${addressed ? ' addressed' : ''}`}
      aria-current={addressed ? 'true' : undefined}
      onMouseDown={() => onAddress('library')}
    >
      <header className="ch-chead">
        <h2>{i18n._(COPY.boards.library)}</h2>
        {narrowed && <span className="ch-marg">{i18n._(L.shown, { shown: shown.length, all: items.length })}</span>}
        {addressed && <span className="ch-marg">{i18n._(COPY.shell.addressed)}</span>}
      </header>
      <div className="ch-lfilt" role="group" aria-label={i18n._(L.shelves)}>
        {FILTERS.map((f) => (
          <button key={f} type="button" className={shelf === f ? 'on' : ''} aria-pressed={shelf === f} onClick={() => setShelf(f)}>
            {i18n._(SHELF_WORDS[f])}
          </button>
        ))}
      </div>
      {mode && (
        <p className={`ch-marg ch-lsel${ticked.length ? ' on' : ''}`}>
          {ticked.length
            ? (
              <>
                <span><b>{i18n._(L.ticked, { count: ticked.length, names: ticked.map((i) => wordsOf(i18n, i).name).join(', ') })}</b></span>
                <button type="button" className="ch-lact" title={i18n._(L.writes, { command })} onClick={() => onWrite(`>${command}`)}>{i18n._(L.addToRoom)}</button>
                <button type="button" className="ch-lact" onClick={() => setTicks({ room: roomId, keys: [] })}>{i18n._(L.clear)}</button>
              </>
            )
            : <span>{i18n._(L.tickHow)}</span>}
        </p>
      )}
      <div className="ch-lbody">{body}</div>
    </article>
  )
}
