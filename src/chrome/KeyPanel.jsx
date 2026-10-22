import { useEffect, useRef, useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { addKey } from '../net'
import { andList } from './say'

// The key panel (refactor-plan.md, stage 5, piece 5; settings spec §6;
// Settings v1): api: opens it under the field, wherever you are. Each built
// provider that takes a key, with its state; for the one asked for, a
// password field. A key goes into that field and nowhere else: never the
// bar, which keeps a history.
//
// The field is told to be left alone by password managers, so a key is not
// offered up as a site password. What is typed is read once, on Save, and
// the field is cleared; the key is never held in this component's state.
// Save checks the key with its own provider first (one short request, said
// before Save is pressed), then keeps it through the key module, saved or
// for this tab only as Settings says. Escape goes back to the bar.

const PROBLEM = {
  empty: COPY.keys.problemEmpty,
  invalid: COPY.keys.problemInvalid,
  billing: COPY.keys.problemBilling,
  unreached: COPY.keys.problemUnreached,
}

/**
 * @param {{ keys: Array<{ id: string, name: string, has: boolean, held: boolean, ending: string|null, keysPage: string|null }>,
 *   noKey: string[], focus: string|null, holdOnly: boolean, onFocus: (id: string) => void,
 *   onSaved: (id: string, fresh: boolean) => void, onClose: () => void }} props
 *   holdOnly: Settings says "Don't save", so a key is held for this tab only
 */
// Where a provider processes prompts, for one that offers a choice (Mistral,
// C159). Chosen by the person, never from their network address.
const REGION_WORDS = { global: COPY.keys.regionGlobal, eu: COPY.keys.regionEu, us: COPY.keys.regionUs }

// What a check of the models on this computer found (C163).
const LOCAL_STATE = {
  unchecked: COPY.keys.localUnchecked,
  checking: COPY.keys.localChecking,
  unreached: COPY.keys.localMissing,
  denied: COPY.keys.localBlocked,
}

/**
 * local: models on this computer (stage 7, piece 4): { id, name, origin,
 * status: 'unchecked'|'checking'|'ok'|'unreached'|'denied', models: string[],
 * onCheck }. Never checked unasked (C33); a click on check is the asking.
 */
export default function KeyPanel({ keys, noKey, focus, holdOnly, onFocus, onSaved, onClose, region = null, onRegion = null, local = null }) {
  const { i18n } = useLingui()
  const field = useRef(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null) // { id, status }

  useEffect(() => { if (focus) field.current?.focus() }, [focus])

  async function save(p) {
    if (busy || !field.current) return
    const typed = field.current.value
    setBusy(true)
    setProblem(null)
    const out = await addKey(p.id, typed, { save: !holdOnly })
    setBusy(false)
    if (!out.ok) {
      setProblem({ id: p.id, status: out.status })
      field.current?.focus()
      return
    }
    if (field.current) field.current.value = ''
    onSaved(p.id, out.fresh)
  }

  const stateOf = (p) => {
    if (!p.has) return i18n._(COPY.keys.needs)
    return i18n._(p.held ? COPY.keys.endsHeld : COPY.keys.ends, { ending: p.ending })
  }

  return (
    <section className="ch-keys" aria-label={i18n._(COPY.keys.label)}>
      <div className="ch-keys-head">
        <span className="ch-keys-lab">{i18n._(COPY.keys.heading)}</span>
        <span className="ch-keys-note">{i18n._(COPY.keys.promise)}</span>
      </div>
      {keys.map((p) => (
        <div key={p.id} className={`ch-keyrow${focus === p.id ? ' on' : ''}`}>
          <div className="ch-keytop">
            <span className="ch-keyname">{p.name}</span>
            <span className="ch-keystate">
              {stateOf(p)}
              {' · '}
              <button type="button" className="ch-marg ch-keyact" onClick={() => { setProblem(null); onFocus(p.id) }}>
                {i18n._(p.has ? COPY.keys.replace : COPY.keys.add)}
              </button>
            </span>
          </div>
          {p.id === 'mistral' && region && onRegion && (
            <div className="ch-keys-note ch-keyregion" role="group" aria-label={i18n._(COPY.keys.region)}>
              {i18n._(COPY.keys.region)}{' '}
              {Object.keys(REGION_WORDS).map((r, i) => (
                <span key={r}>
                  {i > 0 && ' · '}
                  <button type="button" className={`ch-marg ch-keyact${region === r ? ' on' : ''}`} aria-pressed={region === r} onClick={() => onRegion(r)}>
                    {i18n._(REGION_WORDS[r])}
                  </button>
                </span>
              ))}
              {region !== 'global' && <span className="ch-keys-note ch-keyregion-note"> {i18n._(COPY.keys.regionNote)}</span>}
            </div>
          )}
          {focus === p.id && (
            <div className="ch-keyopen">
              <div className="ch-keyfield">
                <input
                  ref={field}
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  data-1p-ignore=""
                  data-lpignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  aria-label={i18n._(COPY.keys.fieldLabel, { provider: p.name })}
                  placeholder={i18n._(p.has ? COPY.keys.placeholderNew : COPY.keys.placeholder)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); save(p) }
                    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() }
                  }}
                />
                <button type="button" className="ch-keysave" disabled={busy} onClick={() => save(p)}>
                  {i18n._(busy ? COPY.keys.checking : COPY.keys.save)}
                </button>
              </div>
              <p className="ch-keys-note">
                {i18n._(holdOnly ? COPY.keys.checkThenHold : COPY.keys.checkThenKeep, { provider: p.name })}
              </p>
              {problem?.id === p.id && (
                <p className="ch-keyprob" role="alert">{i18n._(PROBLEM[problem.status] ?? COPY.keys.problemUnreached, { provider: p.name })}</p>
              )}
              {p.keysPage && (
                <p className="ch-keys-note">
                  <a className="ch-marg" href={p.keysPage} target="_blank" rel="noopener noreferrer">{i18n._(COPY.keys.keysPage, { provider: p.name })}</a>
                  {' '}{i18n._(COPY.keys.ownKey)}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
      {local && (
        <div className={`ch-keyrow${focus === local.id ? ' on' : ''}`}>
          <div className="ch-keytop">
            <span className="ch-keyname">{local.name}</span>
            <span className="ch-keys-lab ch-keylocal">{i18n._(COPY.keys.localHeading)}</span>
            <span className="ch-keystate">
              {local.status === 'ok' ? i18n._(COPY.keys.localFound, { count: local.models.length }) : i18n._(LOCAL_STATE[local.status] ?? COPY.keys.localUnchecked)}
              {' · '}
              {/* The first click says why, before the browser asks its own question (LPN §7.5); the next one looks. */}
              <button type="button" className="ch-marg ch-keyact" disabled={local.status === 'checking'} onClick={() => { if (focus !== local.id && local.status === 'unchecked') onFocus(local.id); else local.onCheck() }}>
                {i18n._(local.status === 'unchecked' ? COPY.keys.localCheck : COPY.keys.localCheckAgain)}
              </button>
            </span>
          </div>
          {(focus === local.id || local.status !== 'unchecked') && (
            <div className="ch-keyopen">
              {local.status === 'ok' && local.models.length > 0 && <p className="ch-keys-note">{i18n._(COPY.keys.localModels, { names: andList(i18n, local.models) })}</p>}
              {local.status === 'ok' && !local.models.length && <p className="ch-keys-note">{i18n._(COPY.keys.localNone, { provider: local.name })}</p>}
              {local.status === 'unreached' && <p className="ch-keyprob" role="alert">{i18n._(COPY.keys.localUnreached, { provider: local.name, origin: local.origin })}</p>}
              {local.status === 'denied' && <p className="ch-keyprob" role="alert">{i18n._(COPY.keys.localDenied)}</p>}
              {local.status !== 'ok' && <p className="ch-keys-note">{i18n._(COPY.keys.localWhy, { provider: local.name })}</p>}
              <p className="ch-keys-note">{i18n._(COPY.keys.localOrigins, { provider: local.name, origin: local.origin })}</p>
            </div>
          )}
        </div>
      )}
      {noKey.length > 0 && (
        <div className="ch-keyrow"><span className="ch-keys-note">{i18n._(COPY.keys.noKeyNeeded, { count: noKey.length, names: andList(i18n, noKey) })}</span></div>
      )}
      <p className="ch-keys-note ch-keys-foot">{i18n._(COPY.keys.foot)}</p>
    </section>
  )
}
