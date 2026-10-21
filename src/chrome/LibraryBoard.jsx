import { useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { roomLabel } from './say'
import { wordFor } from '../shell/boards'

// The Library, thin (refactor-plan.md, stage 5, piece 4; Lab v7's Library;
// arrangements spec §5): everything the catalogue holds, read-only, from the
// one read layer (lib/catalogue.js). The shelves along the top narrow what
// it shows; that only changes the view, so it acts at once. Ticking,
// details in place and adding to a room come with the Lab (stage 13).
//
// Marginalia is facts only (AB §5). The one action is a board's "open",
// which writes open:<board> in the bar, as the Almanac's rows do.

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

function Item({ item, onWrite }) {
  const { i18n } = useLingui()
  const name = item.shelf === 'room' ? roomLabel(i18n, item.name)
    : item.shelf === 'board' ? i18n._(COPY.boards[item.board]) : item.name
  const about = item.shelf === 'board' ? i18n._(BOARD_WORDS[item.board]) : item.description
  const facts = []
  if (item.shelf === 'room') {
    if (item.layout) facts.push(item.layout)
    if (item.theme) facts.push(item.theme)
    facts.push(i18n._(COPY.library.blocks, { count: item.blocks }))
  }
  if (item.shelf === 'layout' && item.places) facts.push(i18n._(COPY.library.places, { count: item.places }))
  if (item.shelf === 'block') facts.push(i18n._(COPY.library.inRoom))
  if (item.shelf === 'theme') facts.push(i18n._(COPY.library.themeFact))
  if (item.shelf === 'board') facts.push(i18n._(COPY.library.onScreen))
  if (item.shelf === 'resource' && item.format) facts.push(item.format)
  return (
    <li className={`ch-li${item.soon ? ' soon' : ''}`}>
      <div className="ch-lname" dir="auto">
        {name}
        {item.mine && <span className="ch-lpill">{i18n._(COPY.library.pillMine)}</span>}
        {item.template && <span className="ch-lpill">{i18n._(COPY.library.pillTemplate)}</span>}
        {item.soon && <span className="ch-lpill">{i18n._(COPY.library.pillSoon)}</span>}
      </div>
      {about && <div className="ch-ldesc" dir="auto">{about}</div>}
      {item.features?.length > 0 && (
        <div className="ch-lfeat">{item.features.map((f) => <span key={f}>{i18n._(FEATURE_WORDS[f])}</span>)}</div>
      )}
      <div className="ch-marg ch-lmarg">
        {facts.join(' · ')}
        {item.shelf === 'board' && !item.soon && (
          <>
            {' · '}
            <button type="button" className="ch-lact" title={i18n._(COPY.library.openHelp, { board: wordFor(item.board) })} onClick={() => onWrite(`>open:${wordFor(item.board)}`)}>
              {i18n._(COPY.library.open)}
            </button>
          </>
        )}
      </div>
    </li>
  )
}

/**
 * @param {{ items: object[]|null, addressed: boolean, onAddress: (board: string) => void,
 *   onWrite: (text: string) => void }} props items: from lib/catalogue.js, null while they are read
 */
export default function LibraryBoard({ items, addressed, onAddress, onWrite }) {
  const { i18n } = useLingui()
  const [shelf, setShelf] = useState('all')
  const shown = (items ?? []).filter((i) => shelf === 'all' || i.shelf === shelf)
  const groups = [
    [COPY.library.groupMine, shown.filter((i) => i.shelf === 'room' && i.mine)],
    [COPY.library.groupTemplates, shown.filter((i) => i.shelf === 'room' && !i.mine)],
    [COPY.library.shelfBoards, shown.filter((i) => i.shelf === 'board')],
    [COPY.library.shelfLayouts, shown.filter((i) => i.shelf === 'layout')],
    [COPY.library.shelfBlocks, shown.filter((i) => i.shelf === 'block')],
    [COPY.library.shelfThemes, shown.filter((i) => i.shelf === 'theme')],
    [COPY.library.shelfResources, shown.filter((i) => i.shelf === 'resource')],
  ].filter(([, list]) => list.length)

  let body
  if (items === null) body = <p className="ch-marg ch-alm-note">{i18n._(COPY.library.loading)}</p>
  else if (!groups.length) body = <p className="ch-marg ch-alm-note">{i18n._(COPY.library.emptyShelf)}</p>
  else {
    body = groups.map(([title, list]) => (
      <section key={title.id} className="ch-lgroup">
        <h3>{i18n._(title)} <span className="n">{list.length}</span></h3>
        <ul className="ch-lgrid">{list.map((item) => <Item key={item.key} item={item} onWrite={onWrite} />)}</ul>
      </section>
    ))
  }

  return (
    <article
      className={`ch-card ch-library${addressed ? ' addressed' : ''}`}
      aria-current={addressed ? 'true' : undefined}
      onMouseDown={() => onAddress('library')}
    >
      <header className="ch-chead">
        <h2>{i18n._(COPY.boards.library)}</h2>
        {shelf !== 'all' && items && <span className="ch-marg">{i18n._(COPY.library.shown, { shown: shown.length, all: items.length })}</span>}
        {addressed && <span className="ch-marg">{i18n._(COPY.shell.addressed)}</span>}
      </header>
      <div className="ch-lfilt" role="group" aria-label={i18n._(COPY.library.shelves)}>
        {FILTERS.map((f) => (
          <button key={f} type="button" className={shelf === f ? 'on' : ''} aria-pressed={shelf === f} onClick={() => setShelf(f)}>
            {i18n._(SHELF_WORDS[f])}
          </button>
        ))}
      </div>
      <div className="ch-lbody">{body}</div>
    </article>
  )
}
