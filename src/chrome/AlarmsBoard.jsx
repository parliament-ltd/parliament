import { useEffect, useRef, useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { leftOf, lengthOf } from '../lib/alarms'

// The Alarms board (C303 (a), ruled 16 November; parliament-alarms-v1.html):
// each alarm a row, the next to ring first, its time left counting down once
// a second while the board is on the screen, and only then. The switch turns
// one off without losing it; the plus adds one in place. Every change runs
// as its command would, said under the bar and taken back by undo:.
//
// alarms: in board order (alarms.ordered); onRun(line): a command, run at
// once; onSwitch(alarm): on or off.

const clock = (iso) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
// Commands, which stay English.
const OFF = (n) => `alarm:off ${n}`
const quote = (name) => (name ? ` "${name.replace(/"/g, "'")}"` : '')

function Switch({ on, label, onClick }) {
  return (
    <button type="button" role="switch" aria-checked={on ? 'true' : 'false'} aria-label={label} className={`ch-al-sw${on ? ' on' : ''}`} onClick={onClick}>
      <span aria-hidden="true" />
    </button>
  )
}

function Add({ onRun, onCancel }) {
  const { i18n } = useLingui()
  const [name, setName] = useState('')
  const [kind, setKind] = useState('in')
  const [amount, setAmount] = useState('25')
  const first = useRef(null)
  useEffect(() => { first.current?.focus() }, [])
  const amountLine = kind === 'at' ? amount.trim() : /^\d+$/.test(amount.trim()) ? `${amount.trim()}m` : amount.trim().replace(/\s+/g, '')
  const line = `alarm:${kind === 'every' ? 'every ' : ''}${amountLine}${quote(name.trim())}`
  const keep = () => { if (amount.trim()) onRun(line) }
  return (
    <div className="ch-tk-form" onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onCancel() } }}>
      <label className="ch-tk-f">
        <span className="ch-tk-k">{i18n._(COPY.alarms.fieldName)}</span>
        <input ref={first} className="ch-tk-in" value={name} maxLength={200} placeholder={i18n._(COPY.alarms.namePlaceholder)} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') keep() }} />
      </label>
      <div className="ch-tk-f" role="radiogroup" aria-label={i18n._(COPY.alarms.fieldKind)}>
        <span className="ch-tk-k">{i18n._(COPY.alarms.fieldKind)}</span>
        <span className="ch-tk-pick">
          {[['in', COPY.alarms.kindIn], ['at', COPY.alarms.kindAt], ['every', COPY.alarms.kindEvery]].map(([k, words]) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k ? 'true' : 'false'} className={`ch-tk-opt${kind === k ? ' on' : ''}`}
              onClick={() => { setKind(k); setAmount(k === 'at' ? '15:30' : k === 'every' ? '50' : '25') }}>{i18n._(words)}</button>
          ))}
        </span>
      </div>
      <label className="ch-tk-f">
        <span className="ch-tk-k">{i18n._(kind === 'at' ? COPY.alarms.fieldAt : kind === 'every' ? COPY.alarms.fieldEvery : COPY.alarms.fieldIn)}</span>
        <span className="ch-al-amount">
          <input className="ch-tk-in" value={amount} maxLength={12} inputMode={kind === 'at' ? 'text' : 'numeric'} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') keep() }} />
          <span className="ch-marg">{i18n._(kind === 'at' ? COPY.alarms.atHint : COPY.alarms.minutesHint)}</span>
        </span>
      </label>
      {kind === 'every' && <div className="ch-tk-f"><span className="ch-tk-k" /><span className="ch-marg">{i18n._(COPY.alarms.everyHow)}</span></div>}
      <div className="ch-tk-f">
        <span className="ch-tk-k" />
        <span className="ch-tk-acts">
          <button type="button" className="ch-tk-keep" disabled={!amount.trim()} onClick={keep}>{i18n._(COPY.alarms.add)}</button>
          <button type="button" className="ch-tk-cancel" onClick={onCancel}>{i18n._(COPY.tasks.cancel)}</button>
        </span>
      </div>
    </div>
  )
}

export default function AlarmsBoard({ alarms = [], addressed, onAddress, onRun, onSwitch }) {
  const { i18n } = useLingui()
  const [adding, setAdding] = useState(false)
  // A second's tick while the board is on the screen, and only then.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const what = (a) => {
    if (a.rang) return i18n._(a.missed ? COPY.alarms.rangMissed : COPY.alarms.rangAt, { at: clock(a.rang) })
    if (a.kind === 'every') return i18n._(COPY.alarms.factsEvery, { minutes: a.minutes })
    if (a.kind === 'at') return i18n._(COPY.alarms.factsAt, { at: clock(a.at) })
    return i18n._(COPY.alarms.factsIn, { ...lengthOf(a.minutes), at: clock(a.at) })
  }
  return (
    <article className={`ch-card ch-alarms${addressed ? ' addressed' : ''}`} aria-current={addressed ? 'true' : undefined} onMouseDown={() => onAddress('alarms')}>
      <header className="ch-chead"><h2>{i18n._(COPY.boards.alarms)}</h2></header>
      <div className="ch-cbody">
        {adding
          ? <Add onRun={(line) => { onRun(line); setAdding(false) }} onCancel={() => setAdding(false)} />
          : (
            <button type="button" className="ch-tk-plus" onClick={() => setAdding(true)}>
              <span className="ch-tk-p" aria-hidden="true" /><span>{i18n._(COPY.alarms.addPlus)}</span>
            </button>
          )}
        {!alarms.length && !adding && (
          <div className="ch-pl-none">
            <p>{i18n._(COPY.alarms.none)}</p>
            <p className="ch-marg">{i18n._(COPY.alarms.noneHow)}</p>
          </div>
        )}
        {alarms.map((a, i) => (
          <div key={a.id} className={`ch-al-row${a.rang ? ' rang' : a.on ? '' : ' off'}`}>
            <Switch on={a.on && !a.rang} label={i18n._(COPY.alarms.switch, { name: a.name || what(a) })} onClick={() => onSwitch(a)} />
            <span className="ch-al-t" dir="auto">{a.name || i18n._(COPY.alarms.unnamed)}</span>
            <span className="ch-al-end">
              {a.rang ? <span className="ch-tk-state">{i18n._(COPY.alarms.rang)}</span>
                : <span className="ch-al-left">{a.on ? leftOf(a, now) : i18n._(COPY.alarms.off)}</span>}
              <button type="button" className="ch-tk-del" aria-label={i18n._(COPY.alarms.takeOff, { n: i + 1 })} title={i18n._(COPY.alarms.takeOff, { n: i + 1 })} onClick={() => onRun(OFF(i + 1))}>×</button>
            </span>
            <span className="ch-al-facts ch-marg">{what(a)}</span>
          </div>
        ))}
        {alarms.length > 0 && <p className="ch-marg ch-al-foot">{i18n._(COPY.alarms.onlyOpen)}</p>}
      </div>
    </article>
  )
}

// An alarm ringing (§3): over the bar, wherever you are, until stopped or
// pushed five minutes on. In Focus too.
export function AlarmBand({ ringing, at = 'bottom', onStop, onLater }) {
  const { i18n } = useLingui()
  if (!ringing.length) return null
  return (
    <div className={`ch-al-band ${at}`} role="alert">
      {ringing.map((r) => (
        <div key={r.id} className="ch-al-ring">
          <b dir="auto">{r.name || i18n._(COPY.alarms.unnamed)}</b>
          <span className="ch-marg">{i18n._(r.kind === 'every' ? COPY.alarms.bandBreak : r.kind === 'at' ? COPY.alarms.bandAt : COPY.alarms.bandIn, { minutes: r.minutes ?? 0, ...lengthOf(r.minutes ?? 0), at: clock(r.at) })}</span>
          <span className="ch-al-acts">
            <button type="button" className="ch-tk-l" onClick={() => onStop(r.id)}>{i18n._(COPY.alarms.stop)}</button>
            <button type="button" className="ch-tk-l" onClick={() => onLater(r.id)}>{i18n._(COPY.alarms.fiveMore)}</button>
          </span>
        </div>
      ))}
    </div>
  )
}

// The strip's "Alarms: 03:12" (§1): the next alarm's time left, ticking by
// itself, so nothing else is drawn again each second.
export function StripAlarm({ alarm, onOpen }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const { i18n } = useLingui()
  return (
    <button type="button" className="ch-btitle ch-salarm" title={i18n._(COPY.shell.focusRuns, { command: 'alarm:' })} onClick={onOpen}>
      <span dir="ltr">{i18n._(COPY.alarms.strip)}</span>
      <span className="ch-ctx">{leftOf(alarm, now)}</span>
    </button>
  )
}
