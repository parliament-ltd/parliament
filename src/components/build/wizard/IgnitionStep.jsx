// IgnitionStep — final wizard step (PR-13; reshaped in PR-19a).
//
// Per parliament_wizard_v5.html lines 1305–1327 (markup) and lines
// 634–762 (animations). The keyframes themselves live in src/index.css
// (search "Build wizard: Ignition step") so the timing exactly matches
// the spec — three flash animations (sweep / room gflash / feature
// fflash) plus the connected-dot breathe loop. This component is the
// state machine that toggles the right CSS classes at the right times.
//
// Phase model (matches the spec's setTimeout chain — see ignite() at
// parliament_wizard_v5.html:1658):
//
//   t=0    'sweeping' : add `wiz-sweep.go`; animation runs 750ms.
//   t=80   'igniting' : add `wiz-room.igniting` (gflash 650ms,
//                       interrupted at t=480 — same as spec).
//   t=480  'lit'      : remove `igniting`, add `wiz-room.lit`. Start
//                       the chip cascade — each chip i adds
//                       `wiz-feat.igniting` at i*110ms, then swaps to
//                       `.lit` 540ms later.
//   t=1200 'connected': show Connected badge + the three navigation
//                       buttons (Enter / Build another / Go to your
//                       Parliament).
//
// PR-19a refinements:
//   - On mount, check loadApiKey() for an existing key. If present,
//     show a "saved key on file" prompt with Continue (default) and a
//     small "Add a different key" toggle. Continue runs the ignite
//     chain WITHOUT a network re-validation (the user said: trust the
//     saved key; surface invalidation as a chat-session error if the
//     key has been revoked since).
//   - Add Claude logo + Anthropic key link as a more discoverable
//     help row, designed so additional providers drop in beside it
//     when Phase 2 multi-provider lands.
//   - Move the Back button into IgnitionStep's footer so it sits on
//     the same row as the action button(s).
//   - Merge the old DoneStep (screen 7) into this step. After
//     'connected', persist the room + show three buttons (Enter /
//     Build another / Go to your Parliament) instead of the single
//     Enter button.
//
// Phase 2 multi-provider note: when audit §3.20 lands, this step will
// read the connection-field shape from the provider abstraction
// instead of hardcoding "Anthropic API key". The animation chain is
// provider-agnostic; only the input label changes.

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { getProvider } from '../../../providers'
import { saveApiKey, loadApiKey } from '../../../lib/crypto'
import { getSetting } from '../../../lib/db'
import { LAYOUT_META, SCHEMES, FEATURES } from '../../../lib/buildWizard'
import { useIsNarrow } from '../../../lib/useViewportWidth'
import StepHeader from './StepHeader'
import LayoutWireframe from './LayoutWireframe'

// Timings from parliament_wizard_v5.html ignite() — keep in sync with
// the keyframe durations in src/index.css.
const IGNITE_AT_MS = 80
const LIT_AT_MS = 480
const FEATURE_STAGGER_MS = 110
const FEATURE_FLASH_MS = 540
const CONNECT_AT_MS = 1200

// Anthropic mark — small monochrome SVG so "Get an API key" reads as
// the model brand, not just generic copy. Phase 2 will add OpenAI /
// Mistral / Ollama marks beside it; the layout below is already a
// flex row so they drop in cleanly.
function ClaudeMark({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19.4 6.3 25.7 25.7H22.1L20.5 21H11.5L9.9 25.7H6.3L12.6 6.3h6.8Zm-3.4 3.6-3.4 8.5h6.8l-3.4-8.5Z" />
    </svg>
  )
}

export default function IgnitionStep({
  config,
  existingMode,         // PR-19c: when set, ignite-existing-room mode
  onBack,
  onPersist,
  onEnterChat,
  onBuildAnother,
  onGoHome,
}) {
  // PR-19g: on mobile the three post-success buttons stack vertically
  // and stretch to the column width (matches the room preview card
  // directly above). Desktop keeps the right-justified horizontal row.
  const isNarrow = useIsNarrow(768)
  const [apiKey, setApiKey] = useState('')
  const [validating, setValidating] = useState(false)
  const [status, setStatus] = useState(null) // 'invalid' | 'billing_error' | null
  const [errorMsg, setErrorMsg] = useState('')
  const [phase, setPhase] = useState('idle') // 'idle' | 'sweeping' | 'igniting' | 'lit' | 'connected'
  // PR-19a: 'has-saved-key' (prompt with Continue + Add-different) /
  // 'replace-key' (input visible, replacing the saved one) / 'no-key'
  // (input visible, first-time setup). Set after the loadApiKey check.
  const [keyMode, setKeyMode] = useState(null) // null | 'has-saved-key' | 'replace-key' | 'no-key'
  const [keyCheckDone, setKeyCheckDone] = useState(false)
  const [committedConvId, setCommittedConvId] = useState(null)
  const sweepKey = useRef(0)
  const timersRef = useRef([])
  const persistedRef = useRef(false)

  // ── Mount: load any saved key to decide which flow to render ──
  useEffect(() => {
    let cancelled = false
    loadApiKey('persistent').then((existing) => {
      if (cancelled) return
      setKeyMode(existing ? 'has-saved-key' : 'no-key')
      setKeyCheckDone(true)
    }).catch(() => {
      if (cancelled) return
      setKeyMode('no-key')
      setKeyCheckDone(true)
    })
    return () => { cancelled = true }
  }, [])

  const featureChips = useMemo(() => {
    // PR-19c: existing-room ignite path. Pull labels off the mode's
    // current layout/scheme + per-component refs rather than from the
    // wizard's collected config.
    if (existingMode) {
      const layoutRef = existingMode.layout?.ref
      const schemeRef = existingMode.scheme?.ref
      const layoutLabel = LAYOUT_META[layoutRef]?.label
      const schemeLabel = SCHEMES.find(s => s.id === schemeRef)?.label
      const featureLabels = (existingMode.components || [])
        .map(c => FEATURES.find(f => f.catalogRef === c.ref))
        .filter(f => f && !f.comingSoon)
        .map(f => f.label)
      // De-dupe: baseline messages/input aren't features and won't match.
      const seen = new Set()
      const features = featureLabels.filter(l => seen.has(l) ? false : (seen.add(l), true))
      return [
        layoutLabel || 'Layout',
        schemeLabel,
        ...features,
      ].filter(Boolean).slice(0, 7)
    }
    const layoutLabel = config.layout && LAYOUT_META[config.layout]?.label
    const schemeLabel = SCHEMES.find(s => s.id === config.scheme)?.label
    const features = [...config.features]
      .map(id => FEATURES.find(f => f.id === id))
      .filter(f => f && !f.comingSoon)
      .map(f => f.label)
    return [
      layoutLabel || (config.density ? capitalize(config.density) + ' layout' : 'Layout'),
      schemeLabel,
      ...features,
    ].filter(Boolean).slice(0, 7)
  }, [config, existingMode])

  // PR-19g (followup): render a scheme-tinted layout abstract inside the
  // room preview card so the user sees the layout's shape AND the chosen
  // scheme's accent color before they ignite. Pulls layout + scheme from
  // the existing mode when in the ignite-existing-room flow, else from
  // the wizard's working config.
  const previewLayoutRef = existingMode?.layout?.ref || config.layout || null
  const previewSchemeId = existingMode?.scheme?.ref || config.scheme || null
  const previewScheme = SCHEMES.find(s => s.id === previewSchemeId) || null

  // Per-chip animation phase — independent because each chip lights at
  // a different t = LIT_AT_MS + i * FEATURE_STAGGER_MS.
  const [chipPhases, setChipPhases] = useState(() => featureChips.map(() => 'idle'))

  useEffect(() => {
    setChipPhases(featureChips.map(() => 'idle'))
  }, [featureChips])

  // PR-19c: prefer the existing mode's saved name when igniting an
  // already-built room from the editor; otherwise use the wizard's
  // working config.
  const roomName =
    (existingMode?.meta?.name || '').trim() ||
    (config.name || '').trim() ||
    'The Writing Studio'

  // Reset visible state if the user navigates back to this step or
  // unmounts while the cascade is in flight.
  useEffect(() => {
    return () => {
      for (const t of timersRef.current) clearTimeout(t)
      timersRef.current = []
    }
  }, [])

  // Run the ignite animation chain WITHOUT touching the network or
  // saving anything. Used both by the validate-then-ignite path (after
  // a successful validateKey) and the trust-the-saved-key path
  // (Continue with no API call at all).
  const runIgniteAnimation = () => {
    sweepKey.current += 1
    setPhase('sweeping')

    const schedule = (fn, ms) => {
      const t = setTimeout(fn, ms)
      timersRef.current.push(t)
    }

    schedule(() => setPhase('igniting'), IGNITE_AT_MS)

    schedule(() => {
      setPhase('lit')
      // Cascade-light each feature chip.
      featureChips.forEach((_, i) => {
        schedule(() => {
          setChipPhases(prev => prev.map((p, idx) => idx === i ? 'igniting' : p))
          schedule(() => {
            setChipPhases(prev => prev.map((p, idx) => idx === i ? 'lit' : p))
          }, FEATURE_FLASH_MS)
        }, i * FEATURE_STAGGER_MS)
      })
    }, LIT_AT_MS)

    schedule(() => setPhase('connected'), CONNECT_AT_MS)
  }

  // Validate the entered key against the live provider, save it on
  // success, then run the animation. Used in 'no-key' (first-time)
  // and 'replace-key' (user wants a different key) modes.
  const validateAndIgnite = async () => {
    const trimmed = apiKey.trim()
    if (!trimmed || validating) return
    setValidating(true)
    setStatus(null)
    setErrorMsg('')

    let result
    try {
      result = await getProvider().validateKey(trimmed)
    } catch {
      result = { valid: false, status: 'invalid', error: 'Could not reach the Anthropic API. Please check your connection.' }
    }

    setValidating(false)

    if (!result.valid) {
      setStatus(result.status === 'billing_error' ? 'billing_error' : 'invalid')
      setErrorMsg(result.error || 'This API key is not valid. Please check your key and try again.')
      return
    }

    // Persist the key at the user's chosen storageMode (default
    // 'persistent') so subsequent boots stay logged in.
    try {
      const storageMode = (await getSetting('storageMode')) || 'persistent'
      await saveApiKey(trimmed, storageMode)
    } catch {
      // Soft non-blocker: the key validates, but we couldn't persist
      // it. Surface a status so the user knows.
      setErrorMsg('Connected, but key could not be saved locally — you may need to re-enter it next time.')
    }

    runIgniteAnimation()
  }

  // Trust the saved key — no network call. Per PR-19a decision: any
  // revocation surfaces as a chat-session error at first send time.
  const continueWithSavedKey = () => {
    setStatus(null)
    setErrorMsg('')
    runIgniteAnimation()
  }

  // Persist the room exactly once when the animation reaches
  // 'connected'. Capture the resulting conversation id so the three
  // post-success buttons can navigate to it.
  useEffect(() => {
    if (phase !== 'connected' || persistedRef.current) return
    persistedRef.current = true
    onPersist().then((convId) => {
      setCommittedConvId(convId)
    }).catch((err) => {
      setErrorMsg(err?.message || 'Could not save the room.')
    })
  }, [phase, onPersist])

  // CSS class chain for the room card. Matches the spec's class swaps:
  //   sweeping     → wiz-room (dashed, pre-flash)
  //   igniting     → wiz-room + wiz-room.igniting (gflash playing)
  //   lit/connected→ wiz-room + wiz-room.lit (settled gold-tint)
  const roomClasses = ['wiz-room', 'rounded-[10px]', 'p-5', 'mb-4', 'relative', 'overflow-hidden']
  if (phase === 'igniting') roomClasses.push('igniting')
  if (phase === 'lit' || phase === 'connected') roomClasses.push('lit')

  // Cascade is in flight — disable the action row and Back so the
  // user can't double-fire or rewind mid-animation.
  const cascadeBusy = phase !== 'idle' && phase !== 'connected'
  const showInputRow = keyCheckDone && (keyMode === 'no-key' || keyMode === 'replace-key') && phase === 'idle'
  const showSavedKeyRow = keyCheckDone && keyMode === 'has-saved-key' && phase === 'idle'

  return (
    <div>
      <StepHeader
        kicker="Turn the lights on"
        title="Connect your API key"
        subtitle="Your room is built. Adding your key brings it to life."
      />

      {/* Room preview card — class names drive the gflash + lit chain */}
      <div className={roomClasses.join(' ')}>
        {/* Sweep bar — re-key forces the animation to restart on each
            successful validation (matches the void offsetWidth trick
            in the spec's ignite() function). */}
        {phase !== 'idle' && phase !== 'connected' && (
          <div key={sweepKey.current} className="wiz-sweep go" />
        )}

        <div
          className="text-[10px] font-medium uppercase mb-1.5"
          style={{ letterSpacing: '0.08em', color: 'var(--p-text-muted)' }}
        >
          Your room
        </div>
        <div
          className="text-[17px] font-medium mb-2.5 transition-colors"
          style={{
            color: phase === 'lit' || phase === 'connected'
              ? 'var(--p-gold-deep)'
              : 'var(--p-text-secondary)',
          }}
        >
          {roomName}
        </div>

        {/* PR-19g (followup): layout abstract tinted with the chosen
            scheme. Sits between the room name and the feature chips so
            the user sees BOTH spatial shape AND color identity before
            ignition fires. Falls back gracefully when layout or scheme
            isn't set yet (config.layout is required by step 5 so this
            is almost always populated by the time we land on step 6). */}
        {previewLayoutRef && (
          <div className="mb-3">
            <LayoutWireframe
              id={previewLayoutRef}
              small
              scheme={previewScheme}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-1 mt-1">
          {featureChips.map((label, i) => (
            <FeatureChip key={`${label}-${i}`} label={label} chipPhase={chipPhases[i] || 'idle'} />
          ))}
        </div>
      </div>

      {/* ── Saved-key prompt (PR-19a) ─────────────────────────── */}
      {showSavedKeyRow && (
        <div
          className="px-3 py-3 mb-3 rounded-md"
          style={{
            background: 'var(--p-bg-subtle)',
            border: '0.5px solid var(--p-border)',
          }}
        >
          <div className="text-[12px] mb-2" style={{ color: 'var(--p-text-secondary)' }}>
            An API key is already on file. Continue with your saved key, or add a different one.
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              autoFocus
              onClick={continueWithSavedKey}
              className="px-4 py-2 text-[13px] font-medium rounded-md text-white"
              style={{ background: 'var(--p-gold-light)' }}
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() => { setApiKey(''); setStatus(null); setErrorMsg(''); setKeyMode('replace-key') }}
              className="text-[12px] underline-offset-2 hover:underline"
              style={{ color: 'var(--p-text-secondary)' }}
            >
              Add a different key
            </button>
          </div>
        </div>
      )}

      {/* ── Input row (no-key first-time + replace-key path) ─── */}
      {showInputRow && (
        <>
          <div className="text-[12px] mb-1.5" style={{ color: 'var(--p-text-secondary)' }}>
            Anthropic API key
          </div>
          <div className="flex gap-2 mb-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value)
                if (status) { setStatus(null); setErrorMsg('') }
              }}
              placeholder="sk-ant-..."
              className="flex-1 px-3 py-2 text-[13px] rounded-md outline-none transition-colors"
              style={{
                border: status === 'invalid' ? '1px solid var(--p-error,#E03E3E)'
                  : status === 'billing_error' ? '1px solid var(--p-warning,#D9730D)'
                  : '0.5px solid var(--p-border)',
                background: 'var(--p-bg-surface)',
                color: 'var(--p-text-primary)',
                fontFamily: 'var(--font-mono, ui-monospace, monospace)',
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') validateAndIgnite() }}
              autoFocus
            />
            <button
              type="button"
              disabled={validating || !apiKey.trim()}
              onClick={validateAndIgnite}
              className="px-4 py-2 text-[13px] font-medium rounded-md text-white disabled:opacity-50"
              style={{ background: 'var(--p-gold-light)' }}
            >
              {validating ? 'Validating…' : 'Validate'}
            </button>
          </div>

          {/* Help row — Claude mark + link to grab a key. PR-19a:
              prominent so first-time users find the right URL fast.
              Layout designed so additional providers drop in beside
              the Anthropic mark when Phase 2 multi-provider lands. */}
          <div
            className="flex items-center gap-2 mt-2 mb-1 text-[12px]"
            style={{ color: 'var(--p-text-secondary)' }}
          >
            <span>Don&apos;t have a key yet?</span>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors"
              style={{
                color: 'var(--p-gold-light)',
                border: '0.5px solid var(--p-border)',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--p-gold-light)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--p-border)' }}
            >
              <ClaudeMark />
              Get one from Anthropic
            </a>
          </div>

          <div className="text-[11px] leading-[1.5] mt-1.5" style={{ color: 'var(--p-text-muted)' }}>
            Encrypted with AES-GCM and stored locally. Never leaves your browser.
          </div>

          {keyMode === 'replace-key' && (
            <button
              type="button"
              onClick={() => { setApiKey(''); setStatus(null); setErrorMsg(''); setKeyMode('has-saved-key') }}
              className="mt-2 text-[12px] underline-offset-2 hover:underline"
              style={{ color: 'var(--p-text-secondary)' }}
            >
              Cancel — keep saved key
            </button>
          )}
        </>
      )}

      {/* Error / status copy */}
      {errorMsg && (
        <div
          className="mt-3 text-[12px]"
          style={{
            color: status === 'billing_error' ? 'var(--p-warning,#D9730D)' : 'var(--p-error,#E03E3E)',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Connected badge — uses Framer Motion for the chip-in entrance
          (scale 0.85 → 1 over 0.3s) since that's purely a one-shot
          mount-time animation that doesn't need to live in CSS. */}
      <AnimatePresence>
        {phase === 'connected' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 mt-3 text-[12px]"
            style={{ color: 'var(--p-gold-deep)' }}
          >
            <span
              className="wiz-conn-dot w-[7px] h-[7px] rounded-full"
              style={{ background: 'var(--p-gold-light)' }}
            />
            Connected. Your room is ready.
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer row ────────────────────────────────────────── */}
      {/* Pre-connected: Back ↔ (action button is rendered above
          inline with the saved-key prompt or the input row). After
          connected: three navigation buttons. */}
      {phase !== 'connected' && (
        <div className="flex justify-start mt-5">
          <button
            type="button"
            disabled={cascadeBusy}
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] rounded-md transition-colors disabled:opacity-40 disabled:cursor-default"
            style={{
              border: '0.5px solid var(--p-border)',
              background: 'transparent',
              color: 'var(--p-text-secondary)',
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
        </div>
      )}

      <AnimatePresence>
        {phase === 'connected' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className={
              isNarrow
                ? 'flex flex-col gap-2 mt-5'
                : 'flex flex-wrap gap-2 justify-end mt-5'
            }
          >
            <button
              type="button"
              onClick={onBuildAnother}
              className={
                (isNarrow ? 'w-full ' : '') +
                'px-4 py-2 text-[13px] rounded-md transition-colors'
              }
              style={{
                border: '0.5px solid var(--p-border)',
                background: 'transparent',
                color: 'var(--p-text-secondary)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--p-gold-light)'; e.currentTarget.style.color = 'var(--p-gold-light)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--p-border)'; e.currentTarget.style.color = 'var(--p-text-secondary)' }}
            >
              Build another room
            </button>
            <button
              type="button"
              onClick={onGoHome}
              className={
                (isNarrow ? 'w-full ' : '') +
                'px-4 py-2 text-[13px] rounded-md transition-colors'
              }
              style={{
                border: '0.5px solid var(--p-border)',
                background: 'transparent',
                color: 'var(--p-text-secondary)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--p-gold-light)'; e.currentTarget.style.color = 'var(--p-gold-light)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--p-border)'; e.currentTarget.style.color = 'var(--p-text-secondary)' }}
            >
              Return to The Study
            </button>
            <button
              type="button"
              disabled={!committedConvId}
              onClick={() => onEnterChat(committedConvId)}
              className={
                (isNarrow ? 'w-full ' : '') +
                'px-6 py-2 text-[13px] font-medium rounded-md text-white disabled:opacity-50'
              }
              style={{ background: 'var(--p-gold-light)' }}
              title={!committedConvId ? 'Saving your room…' : 'Open the chat'}
            >
              Enter Room
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// FeatureChip — class chain mirrors .ig-feat / .ig-feat.igniting /
// .ig-feat.lit in parliament_wizard_v5.html. The keyframes that
// animate the transitions live in src/index.css.
function FeatureChip({ label, chipPhase }) {
  const classes = ['wiz-feat', 'inline-flex', 'items-center', 'px-2', 'py-[3px]', 'rounded-full', 'text-[11px]', 'mr-1', 'mb-1']
  if (chipPhase === 'igniting') classes.push('igniting')
  if (chipPhase === 'lit') classes.push('lit')
  return <span className={classes.join(' ')}>{label}</span>
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}
