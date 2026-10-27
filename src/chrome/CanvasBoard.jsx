import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { slotsOf, deviceOf, nameOf } from '../lib/lab'

// The Canvas (stage 13, piece 1; the arrangements spec §5; Lab v7; C238):
// the room being built, by slot, in its own theme, with the room line above
// it: its name, then Layout, Theme and Built for. A theme or a device
// applies on click and is echoed under the field, undo: taking it back; a
// layout moves blocks, so a click writes the command and waits for Enter
// (A2, C38). Blocks are named here; changing them is the Blocks board's
// (piece 2). Web search, voice and attaching files show as features of
// input, as the Library shows them.

const FEATURE_WORDS = { 'web-search': COPY.library.featureWebSearch, 'voice-input': COPY.library.featureVoice, 'file-attach': COPY.library.featureAttach }

/**
 * @param {{ addressed: boolean, onAddress: (board: string) => void, onWrite: (text: string) => void, onRun: (line: string) => void,
 *   room: { id: string, mode: object|null, name: string }|null, layouts: Array<{ ref: string, key: string, name: string, slots: object[] }>,
 *   themes: Array<{ ref: string, key: string, name: string }> }} props
 */
export default function CanvasBoard({ addressed, onAddress, onWrite, onRun, room, layouts, themes }) {
  const { i18n } = useLingui()
  const C = COPY.canvas
  const mode = room?.mode ?? null
  const layoutKey = nameOf(mode?.layout?.ref)
  const themeKey = nameOf(mode?.scheme?.ref)
  const layout = layouts.find((l) => l.key === layoutKey) ?? null
  const device = deviceOf(mode)
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
            <button type="button" title={i18n._(C.writes, { command: 'name:' })} onClick={() => onWrite(`>name:${quoted(room.name)}`)}>{i18n._(C.name)}</button>
          </span>
        </div>
        {!layout
          ? <p className="ch-marg">{i18n._(C.noLayout)}</p>
          : (
            <div className={`ch-lab-room${device === 'mobile' ? ' mobile' : ''}`} data-scheme={themeKey || 'parliament'} data-layout={layoutKey}>
              {slotsOf(mode, layout).map((s) => (
                <section key={s.id} className={`ch-lab-slot${s.blocks.length ? '' : ' empty'}`} data-slot={s.id}>
                  <h3>{slotWord(s.id)}</h3>
                  {s.blocks.length
                    ? <ul>{s.blocks.map((b) => <li key={b}>{blockWord(b)}{b === 'input' && s.features?.length ? <span className="ch-marg ch-lab-feat">{' '}{s.features.map((f) => i18n._(FEATURE_WORDS[f])).join(', ')}</span> : null}</li>)}</ul>
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
