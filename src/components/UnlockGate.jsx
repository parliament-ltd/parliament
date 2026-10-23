import { useEffect, useRef, useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { lockStatus, unlock, lockHere, idleMs, LOCK_EVENT } from '../lib/lockSession'
import { readPreferenceQuietly } from '../lib/db'
import { switchLanguage, languageFor } from '../i18n'
import { tabBus } from '../lib/bus'
import { streamingIds } from '../stores/chatStore'
import './lock.css'

// The lock in front of everything (Lock Parliament, stage S4, piece 3; C188,
// ruled 23 October 2026). With the lock on, nothing of the app is drawn, and
// nothing of yours read, until this tab is unlocked; each tab and each reload
// unlocks for itself. Once open, the tab locks again after the idle time
// chosen (it reloads, so nothing decrypted stays in memory; the windows it
// popped out close with it), waiting while a reply is arriving. Another tab
// turning the lock on or off reloads this one.

const CHECK_EVERY = 15000

export default function UnlockGate({ children }) {
  const [state, setState] = useState({ phase: 'checking' })

  useEffect(() => {
    let live = true
    lockStatus()
      .then(async (s) => {
        if (!live) return
        if (!s.on || s.open) { setState({ phase: 'open', status: s }); return }
        // The unlock screen speaks the language chosen, a preference kept readable.
        // Read without opening the database for an upgrade, which the upgrade
        // screen must be first to see.
        const chosen = await readPreferenceQuietly('interfaceLanguage')
        await switchLanguage(languageFor(chosen)).catch(() => {})
        if (live) setState({ phase: 'locked', status: s })
      })
      .catch(() => { if (live) setState({ phase: 'unreadable' }) })
    return () => { live = false }
  }, [])

  // Another tab turned the lock on or off: what this tab holds is out of date.
  useEffect(() => tabBus().on((s) => { if (s.type === 'locked') window.location.reload() }), [])

  if (state.phase === 'checking') return null
  if (state.phase === 'unreadable') return <Unreadable />
  if (state.phase === 'locked') return <UnlockScreen status={state.status} onOpen={(status) => setState({ phase: 'open', status })} />
  return (
    <>
      {state.status?.on && <IdleLock />}
      {children}
    </>
  )
}

// Locks the tab after the idle time; the time is read again when Settings changes it.
function IdleLock() {
  const [idle, setIdle] = useState(null)
  useEffect(() => {
    const read = () => { lockStatus().then((s) => setIdle(s.on ? s.idle : null)).catch(() => {}) }
    read()
    window.addEventListener(LOCK_EVENT, read)
    return () => window.removeEventListener(LOCK_EVENT, read)
  }, [])
  useEffect(() => {
    const ms = idleMs(idle)
    if (!ms) return undefined
    let last = Date.now()
    const bump = () => { last = Date.now() }
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart']
    for (const e of events) window.addEventListener(e, bump, { passive: true })
    const timer = setInterval(() => {
      if (Date.now() - last < ms) return
      // A reply arriving keeps the tab open until it ends.
      if (streamingIds().length) return
      lockHere()
      window.location.reload()
    }, CHECK_EVERY)
    return () => {
      clearInterval(timer)
      for (const e of events) window.removeEventListener(e, bump)
    }
  }, [idle])
  return null
}

function Unreadable() {
  const { i18n } = useLingui()
  return (
    <div className="lk-cover" role="alert">
      <div className="lk-box">
        <p className="lk-help">{i18n._(COPY.lock.unreadable)}</p>
        <button type="button" className="lk-btn" onClick={() => window.location.reload()}>{i18n._(COPY.lock.reload)}</button>
      </div>
    </div>
  )
}

const PROBLEM = { wrong: 'wrong', damaged: 'damaged', version: 'damaged', noPrf: 'noPrf', noPasskey: 'noPrf', cancelled: 'cancelled' }

function UnlockScreen({ status, onOpen }) {
  const { i18n } = useLingui()
  const say = (d, v) => i18n._(d, v)
  const [how, setHow] = useState('passphrase')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)
  const field = useRef(null)

  useEffect(() => { field.current?.focus() }, [how])

  async function open(method, input) {
    if (busy) return
    setBusy(true)
    setProblem(null)
    try {
      await unlock(method, input)
      if (field.current) field.current.value = ''
      onOpen(await lockStatus())
    } catch (err) {
      setProblem(PROBLEM[err?.code] ?? 'wrong')
      setBusy(false)
      field.current?.select()
    }
  }
  const submit = () => {
    const value = field.current?.value ?? ''
    if (value) open(how, value)
  }

  return (
    <main className="lk-cover">
      <div className="lk-box">
        <h1 className="lk-title">{say(COPY.lock.title)}</h1>
        <p className="lk-help">{say(COPY.lock.lede)}</p>
        {status.passkeys?.length > 0 && (
          <button type="button" className="lk-btn lk-primary" disabled={busy} onClick={() => open('passkey')}>{say(COPY.lock.passkey)}</button>
        )}
        <label className="lk-field">
          <span>{say(how === 'passphrase' ? COPY.lock.passphraseLabel : COPY.lock.codeLabel)}</span>
          <input
            ref={field}
            type={how === 'passphrase' ? 'password' : 'text'}
            autoComplete={how === 'passphrase' ? 'current-password' : 'off'}
            spellCheck={false}
            disabled={busy}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
          />
        </label>
        <div className="lk-row">
          <button type="button" className="lk-btn" disabled={busy} onClick={submit}>{say(busy ? COPY.lock.opening : COPY.lock.unlock)}</button>
          <button type="button" className="lk-link" disabled={busy} onClick={() => { setProblem(null); setHow(how === 'passphrase' ? 'recovery' : 'passphrase') }}>
            {say(how === 'passphrase' ? COPY.lock.useCode : COPY.lock.usePassphrase)}
          </button>
        </div>
        {problem && <p className="lk-problem" role="alert">{say(COPY.lock[problem])}</p>}
        <p className="lk-foot">{say(COPY.lock.lost)}</p>
      </div>
    </main>
  )
}
