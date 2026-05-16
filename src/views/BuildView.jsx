// BuildView — `/build` route, the build-a-room wizard (rewritten in PR-13).
//
// Implements parliament_wizard_v5.html. PR-19a collapsed step 7 (Done)
// into step 6 (Ignition), so the wizard is now seven screens:
//   0 — Welcome + 3-path picker (Guide me / Template / Build it myself)
//   1 — Purpose (multi-select)
//   2 — Device  (multi-select)
//   3 — Density + revealed Layout
//   4 — Features
//   5 — Name + scheme + summary
//   6 — Ignition (validate API key OR trust saved key, light up the
//       room, persist, then surface three navigation buttons in place)
//
// Path tile dispatch from screen 0:
//   - guided   → screen 1 (the wizard proper)
//   - template → swap to inline TemplateGallery; pick → /edit/:newId
//   - custom   → buildModeFromWizard with empty config + /edit/:newId
//
// Screen 5+ exposes "Open in editor" — buildModeFromWizard with
// whatever's been collected so far + sensible defaults, then /edit/:newId.
//
// First-time visitors land here from HomepageView's first-run gate
// (PR-13 — replaces the V1 /settings bounce). The Done screen flips a
// `tourCompleted_wizard` flag so subsequent boots don't re-trigger the
// first-run gate.

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import HomepageTopBar from '../components/HomepageTopBar'
import TemplateGallery from '../components/build/TemplateGallery'
import WizardEntry from '../components/build/wizard/WizardEntry'
import WizardTrack from '../components/build/wizard/WizardTrack'
import WizardReceipt from '../components/build/wizard/WizardReceipt'
import PurposeStep from '../components/build/wizard/PurposeStep'
import DeviceStep from '../components/build/wizard/DeviceStep'
import DensityLayoutStep from '../components/build/wizard/DensityLayoutStep'
import FeaturesStep from '../components/build/wizard/FeaturesStep'
import NameSchemeStep from '../components/build/wizard/NameSchemeStep'
import IgnitionStep from '../components/build/wizard/IgnitionStep'
import LayoutPreviewOverlay from '../components/build/wizard/LayoutPreviewOverlay'
import {
  makeInitialWizardConfig,
  buildModeFromWizard,
  buildAndOpenRoom,
  igniteExistingRoom,
  deriveLayout,
  PURPOSES,
  DEVICES,
  DENSITIES,
  LAYOUT_META,
  SCHEMES,
} from '../lib/buildWizard'
import { listRooms } from '../lib/catalog'
import { createModeFromTemplate, loadMode, listModes } from '../lib/modes'
import { setSetting } from '../lib/db'

const SPRING_GENTLE = { type: 'spring', stiffness: 200, damping: 24 }

export default function BuildView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // PR-19c: when arriving from the editor's "Build" button, the URL
  // carries ?ignite=<roomId>. We jump straight to screen 6 (Ignition)
  // and reuse it to validate the API key for the existing room rather
  // than building a fresh one. See lib/buildWizard.js igniteExistingRoom.
  const igniteRoomId = searchParams.get('ignite') || null
  const [existingMode, setExistingMode] = useState(null)
  const [igniteLoadError, setIgniteLoadError] = useState('')

  const [screen, setScreen] = useState(igniteRoomId ? 6 : 0)
  const [view, setView] = useState('wizard') // 'wizard' | 'gallery'
  const [config, setConfig] = useState(makeInitialWizardConfig)
  const [templates, setTemplates] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [previewLayoutId, setPreviewLayoutId] = useState(null)
  // PR-19e: detect returning users (>=1 room built) so WizardEntry can
  // trim its onboarding copy. Defaults to true (treat unknown as
  // first-time) until the IDB lookup resolves.
  const [firstTime, setFirstTime] = useState(true)

  // ── Load the existing mode for the ignite-existing-room path ──
  useEffect(() => {
    if (!igniteRoomId) return
    let cancelled = false
    loadMode(igniteRoomId)
      .then((mode) => {
        if (cancelled) return
        if (!mode) {
          setIgniteLoadError(`Room not found: ${igniteRoomId}`)
          return
        }
        setExistingMode(mode)
      })
      .catch((e) => {
        if (!cancelled) setIgniteLoadError(e?.message || 'Could not load room.')
      })
    return () => { cancelled = true }
  }, [igniteRoomId])

  // ── PR-19e: determine first-time-vs-returning by room count. ──
  useEffect(() => {
    let cancelled = false
    listModes({ scope: 'room' })
      .then((rooms) => {
        if (!cancelled) setFirstTime((rooms || []).length === 0)
      })
      .catch(() => {
        if (!cancelled) setFirstTime(true)
      })
    return () => { cancelled = true }
  }, [])

  // ── Load templates lazily — only when the user asks for the gallery
  useEffect(() => {
    if (view !== 'gallery' || templates.length > 0) return
    let cancelled = false
    listRooms()
      .then((rows) => {
        if (cancelled) return
        rows.sort((a, b) => {
          if (a.status === b.status) return 0
          return a.status === 'available' ? -1 : 1
        })
        setTemplates(rows)
      })
      .catch((e) => !cancelled && setError(e?.message || 'Could not load templates.'))
    return () => { cancelled = true }
  }, [view, templates.length])

  const patchConfig = useCallback((patch) => {
    setConfig((prev) => ({ ...prev, ...patch }))
  }, [])

  const goTo = useCallback((n) => setScreen(n), [])

  // ── Path-picker dispatch ───────────────────────────────
  const handleEntryPick = useCallback(async (path) => {
    setError('')
    if (path === 'guided') {
      setScreen(1)
      return
    }
    if (path === 'template') {
      setView('gallery')
      return
    }
    if (path === 'custom') {
      setBusy(true)
      try {
        const mode = await buildModeFromWizard(makeInitialWizardConfig())
        navigate(`/edit/${mode.id}`)
      } catch (e) {
        setError(e?.message || 'Could not create the room.')
        setBusy(false)
      }
    }
  }, [navigate])

  // ── Template gallery dispatch ──────────────────────────
  const handleTemplatePick = useCallback(async (tpl) => {
    if (tpl.status === 'coming-soon') return // gallery preview overlay handled there
    setBusy(true)
    setError('')
    try {
      const mode = await createModeFromTemplate(tpl)
      navigate(`/edit/${mode.id}`)
    } catch (e) {
      setError(e?.message || 'Could not create the room.')
      setBusy(false)
    }
  }, [navigate])

  // ── Open-in-editor escape (steps ≥ 3) ──────────────────
  const handleOpenInEditor = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const mode = await buildModeFromWizard(config)
      navigate(`/edit/${mode.id}`)
    } catch (e) {
      setError(e?.message || 'Could not create the room.')
      setBusy(false)
    }
  }, [config, navigate])

  // ── Persist room when Ignition reaches the 'connected' phase ───
  // PR-19a: persistence happens once the animation finishes (was: on
  // Enter-button click). IgnitionStep then renders the three
  // navigation buttons; each calls back into BuildView so this view
  // owns navigation. Returns the new conversation id so IgnitionStep
  // can route Enter to /chat/:id.
  // PR-19c: when ignite-existing-room mode, route through
  // igniteExistingRoom(roomId) instead — the mode already exists; we
  // just flip its meta.builtAt and spin up a fresh conversation in it.
  const handlePersist = useCallback(async () => {
    if (igniteRoomId) {
      const { conversation } = await igniteExistingRoom(igniteRoomId)
      await setSetting('tourCompleted_wizard', true)
      return conversation.id
    }
    const { conversation } = await buildAndOpenRoom(config)
    await setSetting('tourCompleted_wizard', true)
    return conversation.id
  }, [config, igniteRoomId])

  // ── Post-success navigation handlers ──────────────────
  const handleEnterChat = useCallback((convId) => {
    if (convId) navigate(`/chat/${convId}`)
  }, [navigate])
  const handleBuildAnother = useCallback(() => {
    setConfig(makeInitialWizardConfig())
    setScreen(0)
  }, [])
  const handleGoToParliament = useCallback(() => navigate('/'), [navigate])

  // ── Receipt chips for steps 1–5 ────────────────────────
  const receiptItems = useMemo(() => {
    const items = []
    config.purposes.forEach((id) => {
      const p = PURPOSES.find(x => x.id === id)
      if (p) items.push(p.label)
    })
    config.devices.forEach((id) => {
      const d = DEVICES.find(x => x.id === id)
      if (d) items.push(d.label)
    })
    if (screen >= 4 && config.density) {
      const dn = DENSITIES.find(x => x.id === config.density)
      if (dn) items.push(dn.label)
    }
    if (screen >= 4 && config.layout && LAYOUT_META[config.layout]) {
      items.push(LAYOUT_META[config.layout].label)
    }
    if (screen >= 6) {
      const s = SCHEMES.find(x => x.id === config.scheme)
      if (s) items.push(s.label)
    }
    return items
  }, [config, screen])

  // ── Per-step "Continue" gate ───────────────────────────
  const canAdvance = useMemo(() => {
    if (screen === 1) return config.purposes.size > 0
    if (screen === 2) return config.devices.size > 0
    if (screen === 3) return Boolean(deriveLayout(config))
    if (screen === 4) return true
    if (screen === 5) return Boolean(config.name?.trim())
    return false
  }, [screen, config])

  // ── Render ─────────────────────────────────────────────
  const showOpenInEditor = screen >= 3 && screen <= 5

  return (
    <div className="min-h-screen" style={{ background: 'var(--p-bg-base)' }}>
      <HomepageTopBar breadcrumb={view === 'gallery' ? 'Templates' : 'Build a room'} />

      <div className="mx-auto px-4 pt-6 pb-12" style={{ maxWidth: 580 }}>
        {/* Inline gallery view (path: Start from a template) */}
        {view === 'gallery' && (
          <div>
            <button
              type="button"
              onClick={() => setView('wizard')}
              className="inline-flex items-center gap-1.5 text-[12px] mb-4 transition-colors"
              style={{ color: 'var(--p-text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--p-gold-light)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--p-text-secondary)')}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <div className="text-[17px] font-medium mb-1" style={{ color: 'var(--p-text-primary)' }}>
              Pick a template
            </div>
            <div className="text-[12px] mb-5" style={{ color: 'var(--p-text-muted)' }}>
              Start from a pre-designed room and tailor it after.
            </div>
            <TemplateGallery templates={templates} onPick={handleTemplatePick} busy={busy} />
          </div>
        )}

        {/* Wizard view */}
        {view === 'wizard' && (
          <>
            {/* PR-19c: hide the wizard step track + receipt when arriving
                via ?ignite=<roomId>. The room already exists; the only
                thing left is API-key entry + the ignite animation, so
                the multi-step chrome would be misleading. */}
            {!igniteRoomId && screen >= 1 && screen <= 6 && (
              <WizardTrack current={screen} />
            )}
            {!igniteRoomId && screen >= 1 && screen <= 5 && (
              <WizardReceipt items={receiptItems} />
            )}

            {igniteLoadError && (
              <div
                className="px-3 py-2 mb-3 rounded-md text-[12px]"
                style={{
                  border: '0.5px solid var(--p-border)',
                  background: 'var(--p-bg-surface)',
                  color: 'var(--p-error,#E03E3E)',
                }}
              >
                {igniteLoadError}
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={screen}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.18 }}
              >
                {screen === 0 && <WizardEntry onPick={handleEntryPick} busy={busy} firstTime={firstTime} />}
                {screen === 1 && <PurposeStep config={config} onChange={patchConfig} />}
                {screen === 2 && <DeviceStep config={config} onChange={patchConfig} />}
                {screen === 3 && (
                  <DensityLayoutStep
                    config={config}
                    onChange={patchConfig}
                    onPreviewLayout={setPreviewLayoutId}
                  />
                )}
                {screen === 4 && <FeaturesStep config={config} onChange={patchConfig} />}
                {screen === 5 && <NameSchemeStep config={config} onChange={patchConfig} />}
                {screen === 6 && (
                  <IgnitionStep
                    config={config}
                    existingMode={existingMode}
                    onBack={
                      igniteRoomId
                        ? () => navigate(`/edit/${igniteRoomId}`)
                        : () => goTo(5)
                    }
                    onPersist={handlePersist}
                    onEnterChat={handleEnterChat}
                    onBuildAnother={handleBuildAnother}
                    onGoHome={handleGoToParliament}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Step-action footer (1–5) */}
            {screen >= 1 && screen <= 5 && (
              <div className="flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={() => goTo(screen - 1)}
                  className="px-3 py-2 text-[13px] rounded-md transition-colors"
                  style={{
                    border: '0.5px solid var(--p-border)',
                    background: 'transparent',
                    color: 'var(--p-text-secondary)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--p-bg-subtle)'; e.currentTarget.style.borderColor = 'var(--p-text-light)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--p-border)' }}
                >
                  Back
                </button>
                <div className="flex gap-2">
                  {showOpenInEditor && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleOpenInEditor}
                      className="px-3.5 py-2 text-[12px] rounded-md transition-colors disabled:opacity-50"
                      style={{
                        border: '0.5px solid var(--p-border)',
                        background: 'transparent',
                        color: 'var(--p-text-secondary)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--p-gold-light)'; e.currentTarget.style.color = 'var(--p-gold-light)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--p-border)'; e.currentTarget.style.color = 'var(--p-text-secondary)' }}
                    >
                      Open in editor
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!canAdvance || busy}
                    onClick={() => goTo(screen + 1)}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-[13px] font-medium rounded-md text-white disabled:opacity-35 disabled:cursor-default"
                    style={{ background: 'var(--p-gold-light)' }}
                  >
                    Continue
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* PR-19a: Ignition footer is owned by IgnitionStep itself
                so Back sits on the same row as the action button(s);
                BuildView no longer renders a footer for screen 6. */}
          </>
        )}

        {error && (
          <div
            className="mt-4 px-3 py-2 rounded-md text-[12px]"
            style={{
              border: '0.5px solid var(--p-border)',
              background: 'var(--p-bg-surface)',
              color: 'var(--p-error,#E03E3E)',
            }}
          >
            {error}
          </div>
        )}
      </div>

      <LayoutPreviewOverlay layoutId={previewLayoutId} onClose={() => setPreviewLayoutId(null)} />
    </div>
  )
}
