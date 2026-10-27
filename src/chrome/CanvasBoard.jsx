import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { slotsOf, deviceOf, nameOf } from '../lib/lab'
import { GUIDE, optionOf } from '../lib/labGuide'
import { featuresOf } from '../lib/inputFeatures'

// The Canvas (stage 13, piece 1; the arrangements spec §5; Lab v7; C238):
// the room being built, by slot, in its own theme, with the room line above
// it: its name, then Layout, Theme and Built for. A theme or a device
// applies on click and is echoed under the field, undo: taking it back; a
// layout moves blocks, so a click writes the command and waits for Enter
// (A2, C38). Blocks are named here; changing them is the Blocks board's
// (piece 2): a block clicked here opens its row there (C240 (f)). Web search, voice and attaching files show as features of
// input, as the Library shows them.

// The guide (piece 4; C244 (d), (e)), above the room: one question at a
// time, each answer writing its command; one already so moves on at once.
function Guide({ guide, mode, layouts, themes, onWrite, onGuide }) {
  const { i18n } = useLingui()
  const G = COPY.guide
  const total = GUIDE.length
  const track = (
    <span className="ch-gtrack" aria-hidden="true">
      {GUIDE.map((q, i) => <i key={q.id} className={i < guide.step ? 'done' : i === guide.step ? 'now' : undefined} />)}
    </span>
  )
  if (guide.step >= total) {
    return (
      <section className="ch-guide" aria-label={i18n._(G.label)}>
        <div className="ch-gtop"><span className="ch-gstep">{i18n._(G.done)}</span>{track}</div>
        <p className="ch-gq">{i18n._(G.built)}</p>
        <p className="ch-marg">{i18n._(G.builtWhy)}</p>
        <p className="ch-gfoot ch-marg"><button type="button" onClick={() => onGuide('off')}>{i18n._(G.off)}</button></p>
      </section>
    )
  }
  const q = GUIDE[guide.step]
  return (
    <section className="ch-guide" aria-label={i18n._(G.label)}>
      <div className="ch-gtop"><span className="ch-gstep">{i18n._(G.step, { n: guide.step + 1, total })}</span>{track}</div>
      <p className="ch-gq">{i18n._(G[`q.${q.id}`])}</p>
      <p className="ch-marg">{i18n._(G[`why.${q.id}`])} {i18n._(G.how)}</p>
      <div className="ch-gopts">
        {q.options.map((o) => {
          const words = o.theme ? i18n._(COPY.themes[o.theme]) : i18n._(G[`o.${o.id}`])
          const { command, already } = optionOf(o, { mode, layouts, themes, nameWords: words })
          if (!command) return null
          return (
            <button key={o.id} type="button" className={already ? 'on' : undefined}
              title={already ? undefined : i18n._(COPY.canvas.writes, { command })}
              onClick={() => (already ? onGuide('next') : onWrite(`>${command}`))}>
              {words}
              <small>{already ? i18n._(G.asItIs) : command}</small>
            </button>
          )
        })}
      </div>
      <p className="ch-gfoot ch-marg">
        <button type="button" onClick={() => onGuide('next')}>{i18n._(G.skip)}</button>
        <button type="button" onClick={() => onGuide('off')}>{i18n._(G.off)}</button>
        <span>{i18n._(G.back)}</span>
      </p>
    </section>
  )
}

const FEATURE_WORDS = { webSearch: COPY.library.featureWebSearch, voice: COPY.library.featureVoice, files: COPY.library.featureAttach }

/**
 * @param {{ addressed: boolean, onAddress: (board: string) => void, onWrite: (text: string) => void, onRun: (line: string) => void,
 *   room: { id: string, mode: object|null, name: string }|null, layouts: Array<{ ref: string, key: string, name: string, slots: object[] }>,
 *   themes: Array<{ ref: string, key: string, name: string }>, picked?: string|null, onPick?: (block: string) => void,
 *   guide?: { step: number }|null, onGuide?: (action: 'next'|'off') => void }} props
 */
export default function CanvasBoard({ addressed, onAddress, onWrite, onRun, room, layouts, themes, picked = null, onPick = () => {}, guide = null, onGuide = () => {} }) {
  const { i18n } = useLingui()
  const C = COPY.canvas
  const mode = room?.mode ?? null
  const layoutKey = nameOf(mode?.layout?.ref)
  const themeKey = nameOf(mode?.scheme?.ref)
  const layout = layouts.find((l) => l.key === layoutKey) ?? null
  const device = deviceOf(mode)
  // Its input's features, as its settings say (C248 (a)).
  const onFeatures = mode ? Object.entries(featuresOf(mode)).filter(([, on]) => on).map(([k]) => k) : []
  const blockWord = (b) => (COPY.blocks[b] ? i18n._(COPY.blocks[b]) : b)
  const slotWord = (s) => (COPY.slots[s] ? i18n._(COPY.slots[s]) : s)
  const quoted = (name) => `"${name}"`

  let body
  if (!room) body = <p className="ch-marg">{i18n._(C.empty)}</p>
  else if (!mode) body = <p className="ch-marg">{i18n._(C.gone)}</p>
  else {
    body = (
      <>
        <div className="ch-roomline ch-marg" role="group" aria-label={room.name}>
          <b dir="auto">{room.name}</b>
          <span className="ch-rl-group">
            <span className="k">{i18n._(C.layout)}</span>
            {layouts.map((l) => (
              <button key={l.key} type="button" className={l.key === layoutKey ? 'on' : undefined} aria-pressed={l.key === layoutKey}
                title={i18n._(C.writes, { command: `layout:${quoted(l.name)}` })} onClick={() => onWrite(`>layout:${quoted(l.name)}`)}>{l.name}</button>
            ))}
          </span>
          <span className="ch-rl-group">
            <span className="k">{i18n._(C.theme)}</span>
            {themes.map((t) => (
              <button key={t.key} type="button" className={t.key === themeKey ? 'on' : undefined} aria-pressed={t.key === themeKey}
                title={i18n._(C.runs, { command: `theme:${quoted(t.name)}` })} onClick={() => { if (t.key !== themeKey) onRun(`theme:${quoted(t.name)}`) }}>{t.name}</button>
            ))}
          </span>
          <span className="ch-rl-group">
            <span className="k">{i18n._(C.builtFor)}</span>
            {['desktop', 'mobile'].map((d) => (
              <button key={d} type="button" className={d === device ? 'on' : undefined} aria-pressed={d === device}
                title={i18n._(C.runs, { command: `device:${d}` })} onClick={() => { if (d !== device) onRun(`device:${d}`) }}>{i18n._(C[d])}</button>
            ))}
          </span>
          <span className="ch-rl-group">
            <span className="k">{i18n._(C.sendsTo)}</span>
            {[['off', C.anyone], ['on', C.thisComputer]].map(([w, words]) => {
              const on = (w === 'on') === (mode.localOnly === true)
              return (
                <button key={w} type="button" className={on ? 'on' : undefined} aria-pressed={on}
                  title={i18n._(C.runs, { command: `local:${w}` })} onClick={() => { if (!on) onRun(`local:${w}`) }}>{i18n._(words)}</button>
              )
            })}
          </span>
          <span className="ch-rl-group">
            <button type="button" title={i18n._(C.writes, { command: 'name:' })} onClick={() => onWrite(`>name:${quoted(room.name)}`)}>{i18n._(C.name)}</button>
          </span>
        </div>
        {guide && <Guide guide={guide} mode={mode} layouts={layouts} themes={themes} onWrite={onWrite} onGuide={onGuide} />}
        {!layout
          ? <p className="ch-marg">{i18n._(C.noLayout)}</p>
          : (
            <div className={`ch-lab-room${device === 'mobile' ? ' mobile' : ''}`} data-scheme={themeKey || 'parliament'} data-layout={layoutKey}>
              {slotsOf(mode, layout).map((s) => (
                <section key={s.id} className={`ch-lab-slot${s.blocks.length ? '' : ' empty'}`} data-slot={s.id}>
                  <h3>{slotWord(s.id)}</h3>
                  {s.blocks.length
                    ? <ul>{s.blocks.map((b) => <li key={b} className={picked === b ? 'sel' : undefined}><button type="button" className="ch-lab-block" aria-pressed={picked === b} onClick={() => onPick(b)}>{blockWord(b)}</button>{b === 'input' && onFeatures.length ? <span className="ch-marg ch-lab-feat">{' '}{onFeatures.map((f) => i18n._(FEATURE_WORDS[f])).join(', ')}</span> : null}</li>)}</ul>
                    : <p className="ch-marg">{i18n._(C.emptySlot)}</p>}
                  <p className="ch-marg">{i18n._(s.capacity === 'single' ? (s.full ? C.full : C.roomForOne) : C.roomForMore)}</p>
                </section>
              ))}
            </div>
          )}
      </>
    )
  }

  return (
    <article
      className={`ch-card ch-canvas${addressed ? ' addressed' : ''}`}
      aria-current={addressed ? 'true' : undefined}
      onMouseDown={() => onAddress('canvas')}
    >
      <header className="ch-chead">
        <h2>{i18n._(COPY.boards.canvas)}</h2>
        {addressed && <span className="ch-marg">{i18n._(COPY.shell.addressed)}</span>}
      </header>
      <div className="ch-cbody">{body}</div>
    </article>
  )
}
