import { useEffect, useRef, useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { slotsOf, nameOf, FEATURES } from '../lib/lab'
import { settingsOf, valueOf, wordOfValue, wordOfBlock, wordForSlot } from '../lib/labBlocks'

// The Blocks board (stage 13, piece 2; C240; Lab v7): every block in the
// room on the Canvas, grouped by where it sits, each with a chevron that
// opens its settings. A setting's choice runs at once and is echoed under the
// field, undo: taking it back; anything that moves or removes a block writes
// its command and waits for Enter (C240 (d)). The Canvas and this board point
// at each other: the block picked on one is marked on the other (C240 (f)).

const STAYS = new Set(['messages', 'input'])
const CHEV = (
  <svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M4.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
)

/**
 * @param {{ addressed: boolean, onAddress: (board: string) => void, onWrite: (text: string) => void, onRun: (line: string) => void,
 *   room: { id: string, mode: object|null, name: string }|null, layouts: Array<{ key: string, name: string, slots: object[] }>,
 *   blocks: Array<{ key: string, name: string }>, fitsOf: (block: string) => string[],
 *   picked: string|null, onPick: (block: string|null) => void }} props
 */
export default function BlocksBoard({ addressed, onAddress, onWrite, onRun, room, layouts, blocks, fitsOf, picked, onPick }) {
  const { i18n } = useLingui()
  const B = COPY.blocksBoard
  const mode = room?.mode ?? null
  const layout = layouts.find((l) => l.key === nameOf(mode?.layout?.ref)) ?? null
  const [open, setOpen] = useState(() => new Set())
  const rows = useRef(new Map())
  const blockName = (b) => (COPY.blocks[b] ? i18n._(COPY.blocks[b]) : b)
  const slotName = (s) => (COPY.slots[s] ? i18n._(COPY.slots[s]) : s)
  const words = (id, values) => (B[id] ? i18n._(B[id], values) : id)

  // A block picked on the Canvas opens its row here, in view.
  const [seen, setSeen] = useState(picked)
  if (seen !== picked) {
    setSeen(picked)
    if (picked && !open.has(picked)) setOpen(new Set([...open, picked]))
  }
  useEffect(() => {
    if (picked) rows.current.get(picked)?.scrollIntoView?.({ block: 'nearest' })
  }, [picked])

  const toggle = (b) => {
    const opening = !open.has(b)
    setOpen((o) => {
      const n = new Set(o)
      if (opening) n.add(b)
      else n.delete(b)
      return n
    })
    onPick(opening ? b : (picked === b ? null : picked))
  }

  // One setting's choices, applied on click (a number takes its presets, or is typed).
  const settingRow = (b, comp, s) => {
    const now = valueOf(s, comp.config, mode)
    const label = words(`${b}.${s.key}`)
    const cmd = (w) => `set:${wordOfBlock(b)} ${s.word} ${w}`
    const pick = (w, shown, on) => (
      <button key={w} type="button" role="radio" aria-checked={on} className={on ? 'on' : ''} title={i18n._(COPY.canvas.runs, { command: cmd(w) })}
        onMouseDown={(e) => e.preventDefault()} onClick={() => { if (!on) onRun(cmd(w)) }}>{shown}</button>
    )
    let choices
    if (s.kind === 'switch') choices = [true, false].map((v) => pick(v ? 'on' : 'off', words(v ? 'on' : 'off'), now === v))
    else if (s.kind === 'choice') {
      choices = Object.keys(s.choices).map((w) => pick(w, B[`${b}.${s.key}.${w}`] ? words(`${b}.${s.key}.${w}`) : w, now === s.choices[w]))
    } else {
      const shown = (n) => (s.key === 'contextThreshold' ? words('percent', { n }) : s.key === 'truncateAt' ? words('chars', { n }) : String(n))
      const presets = s.presets.includes(now) || !now ? s.presets : [...s.presets, now].sort((x, y) => x - y)
      choices = [
        ...presets.map((n) => pick(String(n), shown(n), now === n)),
        <button key="other" type="button" title={i18n._(COPY.canvas.writes, { command: cmd('') })} onMouseDown={(e) => e.preventDefault()} onClick={() => onWrite(`>${cmd('')}`)}>
          {presets.length ? words('other') : (now ? `${now}` : words('none'))}
        </button>,
      ]
    }
    return (
      <div key={s.key} className="ch-crow">
        <span className="k">{label}</span>
        <span className="v"><span className="ch-seg ch-bseg" role="radiogroup" aria-label={label}>{choices}</span></span>
      </div>
    )
  }

  const blockRow = (comp, slot, i, peers) => {
    const b = nameOf(comp.ref)
    const isOpen = open.has(b)
    const settings = settingsOf(b)
    const state = settings.map((s) => {
      const v = valueOf(s, comp.config, mode)
      const w = wordOfValue(s, v)
      return s.kind === 'choice' && B[`${b}.${s.key}.${w}`] ? words(`${b}.${s.key}.${w}`) : null
    }).filter(Boolean).join(', ')
    const fits = fitsOf(b)
    const w = wordOfBlock(b)
    return (
      <li key={comp.id} ref={(el) => { if (el) rows.current.set(b, el); else rows.current.delete(b) }}
        className={`ch-brow${isOpen ? ' open' : ''}${picked === b ? ' sel' : ''}`}>
        <button type="button" className="ch-bhead" aria-expanded={isOpen} aria-label={words(isOpen ? 'close' : 'open', { block: blockName(b) })}
          onMouseDown={(e) => e.preventDefault()} onClick={() => toggle(b)}>
          <span className="chev">{CHEV}</span>
          <span className="ch-bmain"><span className="ch-bname">{blockName(b)}</span>{state && <span className="ch-marg ch-bst">{state}</span>}</span>
        </button>
        {isOpen && (
          <div className="ch-bcfg">
            <div className="ch-crow">
              <span className="k">{words('sitsIn')}</span>
              <span className="v ch-bwhere">
                {layout.slots.map((s) => {
                  const on = s.id === slot
                  const cmd = `place:${w} ${wordForSlot(s.id)}`
                  return (
                    <button key={s.id} type="button" className={on ? 'on' : undefined} aria-pressed={on} title={i18n._(COPY.canvas.writes, { command: cmd })}
                      onMouseDown={(e) => e.preventDefault()} onClick={() => { if (!on) onWrite(`>${cmd}`) }}>
                      {fits.includes(s.id) ? slotName(s.id) : words('notBuilt', { slot: slotName(s.id) })}
                    </button>
                  )
                })}
              </span>
            </div>
            {settings.length
              ? settings.map((s) => settingRow(b, comp, s))
              : <div className="ch-crow"><span className="k">{words('settings')}</span><span className="v ch-marg">{words('nothingToSet')}</span></div>}
            <p className="ch-marg ch-bmarg">
              {i > 0 && <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onWrite(`>place:${w} up`)}>{words('moveUp')}</button>}
              {i < peers.length - 1 && <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onWrite(`>place:${w} down`)}>{words('moveDown')}</button>}
              {STAYS.has(b) ? <span>{words('stays')}</span> : <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onWrite(`>rm:${w}`)}>{words('rm')}</button>}
            </p>
          </div>
        )}
      </li>
    )
  }

  let body
  if (!room) body = <p className="ch-marg">{words('empty')}</p>
  else if (!mode) body = <p className="ch-marg">{i18n._(COPY.canvas.gone)}</p>
  else if (!layout) body = <p className="ch-marg">{words('noLayout')}</p>
  else {
    const comps = [...(mode.components ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    const here = new Set(comps.map((c) => nameOf(c.ref)))
    const inLayout = new Set(layout.slots.map((s) => s.id))
    const missing = blocks.filter((b) => !here.has(b.key) && !FEATURES.includes(b.key) && fitsOf(b.key).some((s) => inLayout.has(s)))
    body = (
      <>
        {slotsOf(mode, layout).map((s) => {
          const peers = comps.filter((c) => c.slot === s.id && !FEATURES.includes(nameOf(c.ref)))
          return (
            <section key={s.id} className="ch-bgrp" data-slot={s.id}>
              <h3>{slotName(s.id)}<span className="n">{s.capacity === 'single' ? words('ofOne', { count: peers.length }) : peers.length}</span></h3>
              {peers.length
                ? <ul>{peers.map((c, i) => blockRow(c, s.id, i, peers))}</ul>
                : <p className="ch-marg ch-bempty">{words('emptySlot')}</p>}
            </section>
          )
        })}
        {missing.length > 0 && (
          <section className="ch-bgrp ch-bmissing">
            <h3>{words('notIn')}</h3>
            <p className="ch-marg">
              {missing.map((b) => (
                <button key={b.key} type="button" title={i18n._(COPY.canvas.writes, { command: `add:${wordOfBlock(b.key)}` })}
                  onMouseDown={(e) => e.preventDefault()} onClick={() => onWrite(`>add:${wordOfBlock(b.key)}`)}>{b.name}</button>
              ))}
            </p>
          </section>
        )}
      </>
    )
  }

  const count = mode ? (mode.components ?? []).filter((c) => !FEATURES.includes(nameOf(c.ref))).length : 0
  return (
    <article
      className={`ch-card ch-blocks${addressed ? ' addressed' : ''}`}
      aria-current={addressed ? 'true' : undefined}
      onMouseDown={() => onAddress('blocks')}
    >
      <header className="ch-chead">
        <h2>{i18n._(COPY.boards.blocks)}</h2>
        {mode && <span className="ch-marg">{words('count', { count, name: room.name })}</span>}
        {addressed && <span className="ch-marg">{i18n._(COPY.shell.addressed)}</span>}
      </header>
      <div className="ch-cbody">{body}</div>
    </article>
  )
}
