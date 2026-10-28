import { useEffect, useRef, useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { vault, checkTypedKey } from '../net'
import { andList, longDay } from './say'

// The key panel (refactor-plan.md, stage 5, piece 5; settings spec §6;
// Settings v1): api: opens it under the field, wherever you are. Each built
// provider that takes a key, with its state; for the one asked for, a
// password field. A key goes into that field and nowhere else: never the
// bar, which keeps a history.
//
// The field is the key vault's own (stage 15, piece 3; C267 (f)): its frame,
// from keys.parliament.ltd, laid over this spot, so a key is typed into the
// vault and never into this page. Save there checks the key with its own
// provider first (one short request, said before Save is pressed, built
// here and sent by the vault with the typed key), then the vault keeps it,
// saved or for this tab only as Settings says, or lets it go. This page
// learns only the outcome. Escape goes back to the bar.

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

// What a provider does with what it is sent (security notes §3; C167).
const TRAINING = { no: COPY.picker.trainNo, optOut: COPY.picker.trainOptOut, always: COPY.picker.trainAlways }
const KEPT = { upTo30: COPY.picker.keptUpTo30, days30: COPY.picker.kept30, atLeast30: COPY.picker.keptAtLeast30, device: COPY.picker.keptDevice }

// Its facts as its own pages give them, dated, with the page; for one that
// may train, the checklist: where to opt out, and the models trained on
// whatever is chosen. Parliament cannot see a person's settings there.
function DataLines({ data, regions }) {
  const { i18n } = useLingui()
  const first = [TRAINING[data.training], KEPT[data.kept]].filter(Boolean).map((d) => i18n._(d))
  return (
    <div className="ch-keys-note ch-keydata">
      <p>
        {first.join(' · ')}
        {data.checked && <> · {i18n._(COPY.keysData.checked, { date: longDay(i18n, data.checked) })}</>}
        {data.page && <> · <a className="ch-marg" href={data.page} target="_blank" rel="noopener noreferrer">{i18n._(COPY.keysData.page)}</a></>}
      </p>
      {data.flagged && <p>{i18n._(COPY.keysData.flagged)}</p>}
      {data.longer?.length > 0 && <p>{i18n._(COPY.keysData.longer, { count: data.longer.length, names: andList(i18n, data.longer) })}</p>}
      {data.training === 'optOut' && <p>{i18n._(COPY.keysData.optOut)}</p>}
      {data.trainsAll?.length > 0 && <p>{i18n._(COPY.keysData.trainsAll, { count: data.trainsAll.length, names: andList(i18n, data.trainsAll) })}</p>}
      {regions && <p>{i18n._(COPY.keysData.regionKept)}</p>}
      {data.training === 'optOut' && <p>{i18n._(COPY.keysData.cannotSee)}</p>}
    </div>
  )
}

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
  const slot = useRef(null) // where the vault's field is laid
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null) // { id, status }
  const [asks, setAsks] = useState(0) // a focus asked of the vault's field
  // A provider newly asked for: its field takes the focus.
  const [seenFocus, setSeenFocus] = useState(null)
  if (focus !== seenFocus) {
    setSeenFocus(focus)
    if (focus) setAsks((n) => n + 1)
  }
  const open = keys.find((p) => p.id === focus) ?? null

  // The vault's frame follows the slot while a key can be typed.
  useEffect(() => {
    if (!open) { vault.place(null); return undefined }
    let raf
    const follow = () => {
      const r = slot.current?.getBoundingClientRect()
      // Only while the slot is wholly in view in the panel, so the frame never floats over anything else.
      const box = slot.current?.closest('.ch-keys')?.getBoundingClientRect()
      const seen = r && r.width && box && r.top >= box.top && r.bottom <= box.bottom && r.top >= 0 && r.bottom <= window.innerHeight
      vault.place(seen ? { left: r.left, top: r.top, width: r.width, height: r.height } : null)
      raf = requestAnimationFrame(follow)
    }
    follow()
    return () => { cancelAnimationFrame(raf); vault.place(null) }
  }, [open])

  // What the vault's field shows: this provider's words, and whether it is checking.
  const words = open ? {
    provider: open.id,
    label: i18n._(COPY.keys.fieldLabel, { provider: open.name }),
    placeholder: i18n._(open.has ? COPY.keys.placeholderNew : COPY.keys.placeholder),
    save: i18n._(COPY.keys.save),
    checking: i18n._(COPY.keys.checking),
  } : null
  const wordsKey = JSON.stringify(words)
  useEffect(() => {
    vault.show(wordsKey === 'null' ? null : { ...JSON.parse(wordsKey), busy, focus: asks > 0 })
  }, [wordsKey, busy, asks])
  useEffect(() => () => vault.show(null), [])

  // Save or Escape in the vault's field.
  useEffect(() => {
    const offTyped = vault.subscribe('typed', async ({ provider, empty }) => {
      if (!open || provider !== open.id || busy) return
      setBusy(true)
      setProblem(null)
      const out = await checkTypedKey(provider, { save: !holdOnly, empty })
      setBusy(false)
      if (!out.ok) {
        setProblem({ id: provider, status: out.status })
        setAsks((n) => n + 1)
        return
      }
      onSaved(provider, out.fresh)
    })
    const offEscape = vault.subscribe('escape', () => onClose())
    return () => { offTyped(); offEscape() }
  }, [open, busy, holdOnly, onSaved, onClose])

  const stateOf = (p) => {
    if (p.unreached) return i18n._(COPY.keys.vaultUnreached)
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
          {p.data && <DataLines data={p.data} regions={p.id === 'mistral' && Boolean(region)} />}
          {focus === p.id && (
            <div className="ch-keyopen">
              {/* The vault's own field is laid over this slot (C267 (f)). */}
              <div ref={slot} className="ch-keyfield ch-keyvault" />
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
              {/* Its models that run on its own servers are left out (C167 (d)). */}
              {local.status === 'ok' && local.away?.length > 0 && <p className="ch-keys-note">{i18n._(COPY.keysData.localAway, { count: local.away.length })}</p>}
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
