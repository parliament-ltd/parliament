// BuildView — the wizard + template gallery surface (PR-9).
//
// Routes:
//   /build  — wizard step 1 (entry) shows the template gallery up top
//             with a "or take the wizard" link below. Step 2+ are the
//             classic seven-step flow. Final step instantiates the mode
//             and routes to /edit/:newId.
//
// The "Open in editor" escape (from step 3+) instantiates whatever the
// user has chosen so far (with safe defaults filling the gaps) and
// jumps to the editor — see lib/buildWizard.buildModeFromWizard().
//
// Coming-soon templates render with a read-only preview (no install
// path) per phase-1-pr-plan.md PR-9 NQ-3.

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import HomepageTopBar from '../components/HomepageTopBar'
import TemplateGallery from '../components/build/TemplateGallery'
import BuildStepper from '../components/build/BuildStepper'
import {
  PurposeStep,
  DeviceStep,
  DensityLayoutStep,
  FeaturesStep,
  NameSchemeStep,
  IgnitionStep,
} from '../components/build/BuildSteps'
import {
  makeInitialWizardConfig,
  buildModeFromWizard,
  deriveLayout,
} from '../lib/buildWizard'
import { listRooms } from '../lib/catalog'
import { createModeFromTemplate } from '../lib/modes'

const SPRING_GENTLE = { type: 'spring', stiffness: 200, damping: 24 }

// Step ids — index 0 is entry/gallery, 1..6 are the wizard steps.
const STEPS = [
  { id: 'entry',    label: 'Start' },
  { id: 'purpose',  label: 'Purpose' },
  { id: 'device',   label: 'Device' },
  { id: 'layout',   label: 'Layout' },
  { id: 'features', label: 'Features' },
  { id: 'name',     label: 'Name' },
  { id: 'ignite',   label: 'Ignition' },
]

export default function BuildView() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [config, setConfig] = useState(makeInitialWizardConfig)
  const [templates, setTemplates] = useState([])
  const [comingSoonPreview, setComingSoonPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // ── Load templates once ────────────────────────────────
  useEffect(() => {
    let cancelled = false
    listRooms()
      .then((rows) => {
        if (cancelled) return
        // Stable sort: available first (in original order), then coming-soon.
        rows.sort((a, b) => {
          if (a.status === b.status) return 0
          if (a.status === 'available') return -1
          return 1
        })
        setTemplates(rows)
      })
      .catch((e) => !cancelled && setError(e?.message || 'Could not load templates.'))
    return () => { cancelled = true }
  }, [])

  // ── Config patch helper ────────────────────────────────
  const patchConfig = useCallback((patch) => {
    setConfig((prev) => ({ ...prev, ...patch }))
  }, [])

  const setFeature = useCallback((featureId, on) => {
    setConfig((prev) => {
      const next = new Set(prev.features)
      if (on) next.add(featureId); else next.delete(featureId)
      return { ...prev, features: next }
    })
  }, [])

  // ── Step navigation ────────────────────────────────────
  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), [])
  const goBack = useCallback(() => setStep((s) => Math.max(s - 1, 0)), [])
  const goTo = useCallback((idx) => setStep(idx), [])

  // ── Open template in editor ────────────────────────────
  const useTemplate = useCallback(async (tpl) => {
    if (tpl.status === 'coming-soon') {
      setComingSoonPreview(tpl)
      return
    }
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

  // ── Open editor escape (step 3+) ───────────────────────
  const openInEditor = useCallback(async () => {
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

  // ── Final commit at ignition ───────────────────────────
  const igniteAndOpen = useCallback(async () => {
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

  // ── Step validity ──────────────────────────────────────
  const canAdvance = stepValid(step, config)
  const showOpenInEditor = step >= 3

  return (
    <div className="min-h-screen bg-[var(--p-bg-base)]">
      <HomepageTopBar breadcrumb="Build a room" />

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Stepper */}
        <BuildStepper
          steps={STEPS}
          current={step}
          onJump={(idx) => idx <= step && goTo(idx)}
        />

        {/* Step body */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={SPRING_GENTLE}
            className="mt-8"
          >
            {step === 0 && (
              <EntryStep
                templates={templates}
                onPick={useTemplate}
                onStartWizard={() => goTo(1)}
                busy={busy}
              />
            )}
            {step === 1 && (
              <PurposeStep config={config} onChange={patchConfig} />
            )}
            {step === 2 && (
              <DeviceStep config={config} onChange={patchConfig} />
            )}
            {step === 3 && (
              <DensityLayoutStep config={config} onChange={patchConfig} />
            )}
            {step === 4 && (
              <FeaturesStep
                config={config}
                onChange={patchConfig}
                onToggleFeature={setFeature}
              />
            )}
            {step === 5 && (
              <NameSchemeStep config={config} onChange={patchConfig} />
            )}
            {step === 6 && (
              <IgnitionStep
                config={config}
                onIgnite={igniteAndOpen}
                busy={busy}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Error banner */}
        {error && (
          <div className="mt-6 px-4 py-3 rounded-lg border border-[var(--p-border)] bg-white text-xs text-[var(--p-error,#E03E3E)]">
            {error}
          </div>
        )}

        {/* Step navigation footer */}
        {step > 0 && step < STEPS.length - 1 && (
          <div className="mt-10 flex items-center justify-between">
            <button
              onClick={goBack}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[var(--p-border)] bg-white text-[var(--p-text-secondary)] hover:border-[var(--p-gold-light)] hover:text-[var(--p-gold-light)] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <div className="flex items-center gap-2">
              {showOpenInEditor && (
                <button
                  onClick={openInEditor}
                  disabled={busy}
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-[var(--p-border)] bg-white text-[var(--p-text-secondary)] hover:border-[var(--p-gold-light)] hover:text-[var(--p-gold-light)] transition-colors disabled:opacity-50"
                >
                  Open in editor
                </button>
              )}
              <button
                onClick={goNext}
                disabled={!canAdvance || busy}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  canAdvance && !busy
                    ? 'border-[var(--p-gold-light)] bg-[var(--p-gold-light)] text-white hover:bg-[var(--p-gold-muted)] hover:border-[var(--p-gold-muted)]'
                    : 'border-[var(--p-border)] bg-white text-[var(--p-text-muted)] cursor-not-allowed'
                }`}
              >
                Next
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Coming-soon preview overlay */}
      <AnimatePresence>
        {comingSoonPreview && (
          <ComingSoonPreviewOverlay
            template={comingSoonPreview}
            onClose={() => setComingSoonPreview(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Entry step (gallery + start wizard) ─────────────────

function EntryStep({ templates, onPick, onStartWizard, busy }) {
  return (
    <div className="space-y-8">
      <div className="text-center max-w-xl mx-auto">
        <div className="text-2xl font-medium text-[var(--p-text-primary)] mb-2">
          What kind of room do you want to build?
        </div>
        <div className="text-sm text-[var(--p-text-secondary)]">
          Pick a starting template, or take a quick wizard if you want a
          guided walkthrough.
        </div>
      </div>

      <TemplateGallery
        templates={templates}
        onPick={onPick}
        busy={busy}
      />

      <div className="text-center pt-2">
        <button
          onClick={onStartWizard}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-[var(--p-border)] bg-white text-[var(--p-text-secondary)] hover:border-[var(--p-gold-light)] hover:text-[var(--p-gold-light)] transition-colors"
        >
          Take the 30-second wizard
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Coming-soon preview ─────────────────────────────────

function ComingSoonPreviewOverlay({ template, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={SPRING_GENTLE}
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-[var(--p-border)] rounded-xl shadow-2xl shadow-black/20 w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--p-border)]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-medium text-[var(--p-gold-muted)] bg-[var(--p-bg-subtle)] px-1.5 py-0.5 rounded">
              Coming soon
            </span>
            <span className="text-sm font-medium text-[var(--p-text-primary)]">{template.displayName}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)] hover:bg-[var(--p-bg-subtle)]" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-5 space-y-3">
          <div className="text-sm text-[var(--p-text-secondary)] leading-relaxed">
            {template.description}
          </div>
          <div className="text-xs text-[var(--p-text-muted)]">
            This template uses the <span className="text-[var(--p-text-secondary)]">{template.layout?.ref}</span> layout, which ships in a future release. The preview is read-only.
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Validity gate per step ──────────────────────────────

function stepValid(step, config) {
  switch (step) {
    case 0: return true                            // entry: nothing required to advance
    case 1: return Boolean(config.purpose)
    case 2: return Boolean(config.device)
    case 3: return Boolean(deriveLayout(config))   // layout decided either by purpose+device or explicit override
    case 4: return true                            // features step is optional
    case 5: return Boolean(config.name?.trim())
    case 6: return false                           // ignition has its own commit button; Next not used
    default: return true
  }
}
