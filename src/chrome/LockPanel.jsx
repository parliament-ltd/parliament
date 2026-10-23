import { useCallback, useEffect, useRef, useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { longDay } from './say'
import {
  lockStatus, prepareLock, addPasskeyToDraft, turnOn, turnOff, checkPassphrase, lockHere,
  changePassphrase, renewRecoveryCode, addPasskey, removePasskey, setIdle,
} from '../lib/lockSession'
import { mayOfferPasskeys } from '../lib/lockPasskey'
import { PASSPHRASE_MIN, IDLE_CHOICES, IDLE_DEFAULT } from '../lib/lockKeys'

// The lock in Settings, Data and backups (Lock Parliament, stage S4, piece 3;
// C187 to C192). Set up in four steps (a passphrase, the recovery code kept,
// a passkey if the browser can, then everything encrypted), and, once on, the
// idle time, locking now, and changes that ask for the passphrase. Secrets
// are read from their fields at the moment they are used, and the fields
// cleared; none passes through the bar, which keeps a history.

const BACKUP_LINE = 'backup:'
const IDLE_WORDS = { '15m': COPY.lock.idle15m, '1h': COPY.lock.idle1h, '8h': COPY.lock.idle8h, tab: COPY.lock.idleTab }
const PROBLEM = { wrong: COPY.lock.wrong, damaged: COPY.lock.damaged, version: COPY.lock.damaged, noPrf: COPY.lock.passkeyNoPrf, noPasskey: COPY.lock.passkeyNoPrf, cancelled: COPY.lock.cancelled }

/** @param {{ onWrite: (line: string) => void }} props */
export default function LockPanel({ onWrite }) {
  const { i18n } = useLingui()
  const say = (d, values) => i18n._(d, values)
  const [status, setStatus] = useState(null)
  const [canPasskey, setCanPasskey] = useState(false)
  const [step, setStep] = useState(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)
  const [note, setNote] = useState(null)
  const [code, setCode] = useState(null)
  const [idle, setIdleChoice] = useState(IDLE_DEFAULT)
  const draft = useRef(null)
  const p1 = useRef(null)
  const p2 = useRef(null)
  const cur = useRef(null)
  const last4 = useRef(null)

  const refresh = useCallback(() => { lockStatus().then(setStatus).catch(() => {}) }, [])
  useEffect(() => {
    refresh()
    mayOfferPasskeys().then(setCanPasskey).catch(() => {})
    return () => { draft.current = null }
  }, [refresh])

  const take = (ref) => { const v = ref.current?.value ?? ''; if (ref.current) ref.current.value = ''; return v }
  const go = (next) => { setStep(next); setProblem(null); setNote(null) }
  const fail = (err) => setProblem(PROBLEM[err?.code] ? { d: PROBLEM[err.code] } : { d: COPY.lock.failed, v: { reason: String(err?.message || err?.name || '') } })
  async function act(fn) {
    if (busy) return
    setBusy(true)
    setProblem(null)
    try { await fn() } catch (err) { fail(err) } finally { setBusy(false) }
  }
  const reloadSoon = () => setTimeout(() => window.location.reload(), 1400)

  if (!status) return null

  // ── Setting it up ──
  const passFields = (
    <span className="ch-lk-fields">
      <input ref={p1} type="password" autoComplete="new-password" spellCheck={false} aria-label={say(COPY.lock.newPass)} placeholder={say(COPY.lock.passPlaceholder, { count: PASSPHRASE_MIN })} />
      <input ref={p2} type="password" autoComplete="new-password" spellCheck={false} aria-label={say(COPY.lock.passAgain)} placeholder={say(COPY.lock.passAgain)} />
    </span>
  )
  const readNew = () => {
    const a = take(p1)
    const b = take(p2)
    if (a.length < PASSPHRASE_MIN) { setProblem({ d: COPY.lock.short, v: { count: PASSPHRASE_MIN } }); return null }
    if (a !== b) { setProblem({ d: COPY.lock.differ }); return null }
    return a
  }
  const currentField = (
    <span className="ch-lk-fields">
      <input ref={cur} type="password" autoComplete="current-password" spellCheck={false} aria-label={say(COPY.lock.currentPass)} placeholder={say(COPY.lock.currentPass)} />
    </span>
  )
  const buttons = (primary, onPrimary) => (
    <span className="ch-lk-buttons">
      <button type="button" className="ch-plain-btn" disabled={busy} onClick={onPrimary}>{say(primary)}</button>
      <button type="button" className="ch-smarg ch-marg" disabled={busy} onClick={() => { draft.current = null; setCode(null); go(null) }}>{say(COPY.lock.cancel)}</button>
    </span>
  )
  const idleSeg = (value, onPick) => (
    <span className="ch-seg" role="radiogroup" aria-label={say(COPY.lock.idleLabel)}>
      {IDLE_CHOICES.map((v) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(v)}>{say(IDLE_WORDS[v])}</button>
      ))}
    </span>
  )

  let body = null
  if (step === 'pass') {
    body = (
      <>
        <p className="ch-lk-t">{say(COPY.lock.step1Title)}</p>
        <p className="ch-sh">{say(COPY.lock.step1Help, { count: PASSPHRASE_MIN })}</p>
        {passFields}
        <p className="ch-sh">{say(COPY.lock.idleLabel)}</p>
        {idleSeg(idle, setIdleChoice)}
        {buttons(COPY.lock.next, () => act(async () => {
          const passphrase = readNew()
          if (!passphrase) return
          draft.current = await prepareLock({ passphrase, idle })
          setCode(draft.current.recoveryCode)
          go('code')
        }))}
      </>
    )
  } else if (step === 'code') {
    body = (
      <>
        <p className="ch-lk-t">{say(COPY.lock.step2Title)}</p>
        <p className="ch-sh">{say(COPY.lock.step2Help)}</p>
        <p className="ch-lk-code" translate="no">{code}</p>
        <span className="ch-lk-fields">
          <input ref={last4} type="text" autoComplete="off" spellCheck={false} aria-label={say(COPY.lock.confirmCode)} placeholder={say(COPY.lock.confirmCode)} />
        </span>
        {buttons(COPY.lock.next, () => {
          const typed = take(last4).toUpperCase().replace(/[\s-]/g, '')
          if (typed !== code.replace(/-/g, '').slice(-4)) { setProblem({ d: COPY.lock.confirmWrong }); return }
          setCode(null)
          go(canPasskey ? 'passkey' : 'confirm')
        })}
      </>
    )
  } else if (step === 'passkey') {
    body = (
      <>
        <p className="ch-lk-t">{say(COPY.lock.step3Title)}</p>
        <p className="ch-sh">{say(COPY.lock.step3Help)}</p>
        <span className="ch-lk-buttons">
          <button type="button" className="ch-plain-btn" disabled={busy || note === COPY.lock.passkeyAdded} onClick={() => act(async () => {
            draft.current = await addPasskeyToDraft(draft.current)
            setNote(COPY.lock.passkeyAdded)
          })}>{say(COPY.lock.addPasskey)}</button>
          <button type="button" className="ch-plain-btn" disabled={busy} onClick={() => go('confirm')}>{say(note ? COPY.lock.next : COPY.lock.skip)}</button>
        </span>
      </>
    )
  } else if (step === 'confirm' || step === 'working') {
    body = (
      <>
        <p className="ch-lk-t">{say(COPY.lock.step4Title)}</p>
        <p className="ch-sh">
          {say(COPY.lock.step4Help)}{' '}
          {say(COPY.lock.backupFirst)}{' '}
          <button type="button" className="ch-marg ch-smarg" onMouseDown={(e) => e.preventDefault()} onClick={() => onWrite(`>${BACKUP_LINE}`)}>{BACKUP_LINE}</button>
        </p>
        {buttons(step === 'working' ? COPY.lock.encrypting : COPY.lock.encrypt, () => act(async () => {
          go('working')
          try {
            await turnOn(draft.current)
          } catch (err) {
            setStep('confirm')
            throw err
          }
          draft.current = null
          setNote(COPY.lock.locked)
          reloadSoon()
        }))}
      </>
    )
  }

  // ── Once on ──
  const passkeyList = status.on && status.passkeys.length > 0 && (
    <span className="ch-lk-list">
      {status.passkeys.map((p) => (
        <span key={Array.from(p.id).join('.')} className="ch-lk-item">
          {say(COPY.lock.passkeyItem, { day: longDay(i18n, String(p.addedAt ?? '').slice(0, 10)) })}{' '}
          <button type="button" className="ch-marg ch-smarg" disabled={busy} onClick={() => act(async () => { await removePasskey(p.id); refresh() })}>{say(COPY.lock.passkeyRemove)}</button>
        </span>
      ))}
    </span>
  )
  if (status.on && step === 'changePass') {
    body = (
      <>{currentField}{passFields}{buttons(COPY.lock.change, () => act(async () => {
        const now = take(cur)
        const next = readNew()
        if (!next) return
        await changePassphrase(now, next)
        go(null)
        setNote(COPY.lock.changed)
      }))}</>
    )
  } else if (status.on && step === 'addPasskey') {
    body = (
      <>{currentField}{buttons(COPY.lock.addPasskey, () => act(async () => {
        await addPasskey(take(cur))
        go(null)
        setNote(COPY.lock.passkeyAdded)
        refresh()
      }))}</>
    )
  } else if (status.on && step === 'newCode') {
    body = (
      <>{currentField}{buttons(COPY.lock.newCode, () => act(async () => {
        const out = await renewRecoveryCode(take(cur))
        setCode(out.recoveryCode)
        go('codeShown')
      }))}</>
    )
  } else if (status.on && step === 'codeShown') {
    body = (
      <>
        <p className="ch-sh">{say(COPY.lock.newCodeShown)}</p>
        <p className="ch-lk-code" translate="no">{code}</p>
        <span className="ch-lk-buttons"><button type="button" className="ch-plain-btn" onClick={() => { setCode(null); go(null) }}>{say(COPY.lock.next)}</button></span>
      </>
    )
  } else if (status.on && step === 'turnOff') {
    body = (
      <>
        <p className="ch-sh">{say(COPY.lock.turnOffHelp)}</p>
        {currentField}
        {buttons(COPY.lock.turnOffConfirm, () => act(async () => {
          await checkPassphrase(take(cur))
          await turnOff()
          setNote(COPY.lock.turnedOff)
          reloadSoon()
        }))}
      </>
    )
  }

  return (
    <div className="ch-srow stack ch-lk">
      <div>
        <div className="ch-sl">{say(COPY.lock.label)}</div>
        <div className="ch-sh">
          {!status.on && say(COPY.lock.offHelp)}
          {status.on && say(status.finished ? COPY.lock.onHelp : COPY.lock.unfinished, { passkeys: status.passkeys.length })}
        </div>
        {passkeyList}
        {!status.on && !step && (
          <span className="ch-lk-buttons"><button type="button" className="ch-plain-btn" onClick={() => go('pass')}>{say(COPY.lock.setUp)}</button></span>
        )}
        {status.on && !step && (
          <>
            <p className="ch-sh">{say(COPY.lock.idleLabel)}</p>
            {idleSeg(status.idle, (v) => act(async () => { await setIdle(v); refresh() }))}
            <span className="ch-lk-buttons">
              <button type="button" className="ch-plain-btn" onClick={() => { lockHere(); window.location.reload() }}>{say(COPY.lock.lockNow)}</button>
              <button type="button" className="ch-plain-btn" onClick={() => go('changePass')}>{say(COPY.lock.changePass)}</button>
              {canPasskey && <button type="button" className="ch-plain-btn" onClick={() => go('addPasskey')}>{say(COPY.lock.addPasskey)}</button>}
              <button type="button" className="ch-plain-btn" onClick={() => go('newCode')}>{say(COPY.lock.newCode)}</button>
              <button type="button" className="ch-plain-btn" onClick={() => go('turnOff')}>{say(COPY.lock.turnOff)}</button>
            </span>
          </>
        )}
        {body && <div className="ch-lk-step">{body}</div>}
        {problem && <p className="ch-sh ch-lk-problem" role="alert">{say(problem.d, problem.v)}</p>}
        {note && <p className="ch-sh" role="status">{say(note)}</p>}
      </div>
    </div>
  )
}
