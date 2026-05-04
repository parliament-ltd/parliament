// IgnitionStep — step 6: validate API key + light up the room (PR-13).
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
//   t=1200 'connected': show Connected badge + Enter button.
//
// On Validate-button click we call getProvider().validateKey(key); on
// any failure we show the spec'd error copy without firing the chain.
//
// Phase 2 multi-provider note: when audit §3.20 lands, this step will
// read the connection-field shape from the provider abstraction
// instead of hardcoding "Anthropic API key". The animation chain is
// provider-agnostic; only the input label changes.

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getProvider } from '../../../providers'
import { saveApiKey } from '../../../lib/crypto'
import { getSetting } from '../../../lib/db'
import { LAYOUT_META, SCHEMES, FEATURES } from '../../../lib/buildWizard'
import StepHeader from './StepHeader'

// Timings from parliament_wizard_v5.html ignite() — keep in sync with
// the keyframe durations in src/index.css.
const IGNITE_AT_MS = 80
const LIT_AT_MS = 480
const FEATURE_STAGGER_MS = 110
const FEATURE_FLASH_MS = 540
const CONNECT_AT_MS = 1200

export default function IgnitionStep({ config, onConnected }) {
  const [apiKey, setApiKey] = useState('')
  const [validating, setValidating] = useState(false)
  const [status, setStatus] = useState(null) // 'invalid' | 'billing_error' | null
  const [errorMsg, setErrorMsg] = useState('')
  const [phase, setPhase] = useState('idle') // 'idle' | 'sweeping' | 'igniting' | 'lit' | 'connected'
  const sweepKey = useRef(0)
  const timersRef = useRef([])

  const featureChips = useMemo(() => {
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
  }, [config])

  // Per-chip animation phase — independent because each chip lights at
  // a different t = LIT_AT_MS + i * FEATURE_STAGGER_MS.
  const [chipPhases, setChipPhases] = useState(() => featureChips.map(() => 'idle'))

  useEffect(() => {
    setChipPhases(featureChips.map(() => 'idle'))
  }, [featureChips])

  const roomName = (config.name || '').trim() || 'The Writing Studio'

  // Reset visible state if the user navigates back to this step or
  // unmounts while the cascade is in flight.
  useEffect(() => {
    return () => {
      for (const t of timersRef.current) clearTimeout(t)
      timersRef.current = []
    }
  }, [])

  const ignite = async () => {
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

    sweepKey.current += 1
    setPhase('sweeping')

    // Schedule the spec's setTimeout chain. Each schedule reference is
    // tracked so unmount can clear them.
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

  // CSS class chain for the room card. Matches the spec's class swaps:
  //   sweeping     → wiz-room (dashed, pre-flash)
  //   igniting     → wiz-room + wiz-room.igniting (gflash playing)
  //   lit/connected→ wiz-room + wiz-room.lit (settled gold-tint)
  const roomClasses = ['wiz-room', 'rounded-[10px]', 'p-5', 'mb-4', 'relative', 'overflow-hidden']
  if (phase === 'igniting') roomClasses.push('igniting')
  if (phase === 'lit' || phase === 'connected') roomClasses.push('lit')

  const showEnter = phase === 'connected'

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
        <div className="flex flex-wrap gap-1 mt-1">
          {featureChips.map((label, i) => (
            <FeatureChip key={`${label}-${i}`} label={label} chipPhase={chipPhases[i] || 'idle'} />
          ))}
        </div>
      </div>

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
          onKeyDown={(e) => { if (e.key === 'Enter') ignite() }}
        />
        <button
          type="button"
          disabled={validating || !apiKey.trim() || phase === 'connected'}
          onClick={ignite}
          className="px-4 py-2 text-[13px] font-medium rounded-md text-white disabled:opacity-50"
          style={{ background: 'var(--p-gold-light)' }}
        >
          {validating ? 'Validating…' : 'Validate'}
        </button>
      </div>

      <div className="text-[11px] leading-[1.5]" style={{ color: 'var(--p-text-muted)' }}>
        Encrypted with AES-GCM and stored locally. Never leaves your browser.{' '}
        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--p-gold-light)', textDecoration: 'none' }}
        >
          Get an API key
        </a>
      </div>

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

      {/* Enter button reveals once Connected. */}
      <AnimatePresence>
        {showEnter && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="flex justify-end mt-5"
          >
            <button
              type="button"
              onClick={onConnected}
              className="px-6 py-2.5 text-sm font-medium rounded-md text-white"
              style={{ background: 'var(--p-gold-light)' }}
            >
              Enter
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
