// IgnitionStep — step 6: validate API key + light up the room (PR-13).
//
// Per parliament_wizard_v5.html lines 1305–1327 (markup) and lines
// 634–762 (animations). On Validate-button click we call
// getProvider().validateKey(key); on success we sweep, ignite the
// room border, cascade-light each feature chip, then show the
// Connected badge + Enter button.
//
// Phase 2 multi-provider notes: today we hardcode "Anthropic API key"
// and call validateKey directly. When Phase 2 lands the keyless local
// provider work (audit §3.20), this step will read the field shape from
// the provider abstraction (provider.getConnectionFields() or similar)
// — the wizard structure stays.

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getProvider } from '../../../providers'
import { saveApiKey } from '../../../lib/crypto'
import { getSetting } from '../../../lib/db'
import { LAYOUT_META, SCHEMES, FEATURES } from '../../../lib/buildWizard'
import StepHeader from './StepHeader'

const SWEEP_MS = 750
const ROOM_FLASH_MS = 650
const FEATURE_STAGGER_MS = 110
const FEATURE_FLASH_MS = 540
const CONNECT_AT_MS = 1200

export default function IgnitionStep({ config, onConnected }) {
  const [apiKey, setApiKey] = useState('')
  const [validating, setValidating] = useState(false)
  const [status, setStatus] = useState(null) // 'valid' | 'invalid' | 'billing_error' | 'network'
  const [errorMsg, setErrorMsg] = useState('')
  const [phase, setPhase] = useState('idle') // 'idle' | 'sweeping' | 'igniting' | 'connected'
  const sweepKey = useRef(0)

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

  const roomName = (config.name || '').trim() || 'The Writing Studio'

  // Reset visible state if the user navigates back to this step.
  useEffect(() => {
    setPhase('idle')
    setStatus(null)
    setErrorMsg('')
    setValidating(false)
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
      // The key validates fine; failing to persist it is not a hard
      // block — the user can re-enter on next visit. Surface a soft
      // status so they know.
      setErrorMsg('Connected, but key could not be saved locally — you may need to re-enter it next time.')
    }

    setStatus('valid')
    sweepKey.current += 1
    setPhase('sweeping')
    setTimeout(() => setPhase('igniting'), 80)
    setTimeout(() => setPhase('connected'), CONNECT_AT_MS)
  }

  const lit = phase === 'igniting' || phase === 'connected'
  const showEnter = phase === 'connected'

  return (
    <div>
      <StepHeader
        kicker="Turn the lights on"
        title="Connect your API key"
        subtitle="Your room is built. Adding your key brings it to life."
      />

      {/* Room preview card — un-lit by default; gold on success */}
      <div
        className="relative overflow-hidden rounded-[10px] p-5 mb-4"
        style={{
          border: lit ? '1.5px solid var(--p-gold-light)' : '1.5px dashed var(--p-text-light)',
          background: lit ? 'var(--p-gold-tint)' : 'transparent',
          transition: 'border-color .4s, border-style .4s, background .6s',
        }}
      >
        <AnimatePresence>
          {phase === 'sweeping' && (
            <motion.div
              key={sweepKey.current}
              initial={{ top: -4, opacity: 1 }}
              animate={{ top: '110%', opacity: 0 }}
              transition={{ duration: SWEEP_MS / 1000, ease: 'easeOut' }}
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                height: 2,
                background: 'linear-gradient(90deg, transparent, #D4A843 40%, #F5E6B8 60%, transparent)',
                boxShadow: '0 0 8px 2px rgba(212, 168, 67, 0.28)',
              }}
            />
          )}
        </AnimatePresence>

        <div
          className="text-[10px] font-medium uppercase mb-1.5"
          style={{ letterSpacing: '0.08em', color: 'var(--p-text-muted)' }}
        >
          Your room
        </div>
        <div
          className="text-[17px] font-medium mb-2.5 transition-colors"
          style={{ color: lit ? 'var(--p-gold-deep)' : 'var(--p-text-secondary)' }}
        >
          {roomName}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {featureChips.map((label, i) => (
            <FeatureChip key={`${label}-${i}`} label={label} phase={phase} delayMs={i * FEATURE_STAGGER_MS} />
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
      {errorMsg && status !== 'valid' && (
        <div
          className="mt-3 text-[12px]"
          style={{
            color: status === 'billing_error' ? 'var(--p-warning,#D9730D)' : 'var(--p-error,#E03E3E)',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Connected badge */}
      <AnimatePresence>
        {phase === 'connected' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 mt-3 text-[12px]"
            style={{ color: 'var(--p-gold-deep)' }}
          >
            <motion.span
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-[7px] h-[7px] rounded-full"
              style={{ background: 'var(--p-gold-light)' }}
            />
            Connected. Your room is ready.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enter button (revealed only after Connected) */}
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

function FeatureChip({ label, phase, delayMs }) {
  const [lit, setLit] = useState(false)
  useEffect(() => {
    if (phase !== 'igniting' && phase !== 'connected') {
      setLit(false)
      return
    }
    const t = setTimeout(() => setLit(true), delayMs)
    return () => clearTimeout(t)
  }, [phase, delayMs])

  return (
    <motion.span
      animate={lit
        ? { borderColor: 'var(--p-gold-light)', borderStyle: 'solid', background: 'var(--p-gold-tint)', color: 'var(--p-gold-deep)' }
        : { borderColor: 'var(--p-text-light)', borderStyle: 'dashed', background: 'transparent', color: 'var(--p-text-muted)' }
      }
      transition={{ duration: FEATURE_FLASH_MS / 1000 }}
      className="inline-flex items-center px-2 py-[3px] rounded-full text-[11px] mr-1 mb-1"
      style={{ borderWidth: '0.5px' }}
    >
      {label}
    </motion.span>
  )
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}
