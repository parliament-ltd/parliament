// BuildSteps — wizard step bodies (PR-9). One file because each step is
// small and they share helpers; if they grow they can be split out.
//
// Each step receives the running `config` and a `onChange(patch)`
// updater. Steps don't manage their own validity — BuildView gates
// "Next" centrally via stepValid().

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Loader2, Sparkles } from 'lucide-react'
import {
  PURPOSES,
  DEVICES,
  DENSITIES,
  LAYOUT_OPTIONS,
  FEATURES,
  SCHEMES,
  deriveLayout,
} from '../../lib/buildWizard'
import { useShimmer } from '../../hooks/useShimmer'
import { loadApiKey } from '../../lib/crypto'

// ─── Shared building blocks ──────────────────────────────

function StepHeading({ title, subtitle }) {
  return (
    <div className="text-center mb-8">
      <div className="text-2xl font-medium text-[var(--p-text-primary)] mb-1.5">
        {title}
      </div>
      {subtitle && (
        <div className="text-sm text-[var(--p-text-secondary)]">{subtitle}</div>
      )}
    </div>
  )
}

function ChoiceCard({ id, label, description, selected, onSelect, swatch, compact }) {
  return (
    <motion.button
      whileHover={{ y: -1, borderColor: 'var(--p-gold-light)' }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect(id)}
      className={`text-left flex flex-col gap-1.5 ${compact ? 'px-4 py-3' : 'px-5 py-4'} rounded-xl border bg-white transition-colors ${
        selected
          ? 'border-[var(--p-gold-light)] outline outline-1 outline-[var(--p-gold-light)]'
          : 'border-[var(--p-border)]'
      }`}
    >
      <div className="flex items-center gap-2">
        {swatch && (
          <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: swatch }} />
        )}
        <span className="text-sm font-medium text-[var(--p-text-primary)]">{label}</span>
        {selected && <Check className="w-3.5 h-3.5 text-[var(--p-gold-light)] ml-auto" />}
      </div>
      {description && (
        <span className="text-xs text-[var(--p-text-secondary)] leading-relaxed">
          {description}
        </span>
      )}
    </motion.button>
  )
}

// ─── Step 1: Purpose ─────────────────────────────────────

export function PurposeStep({ config, onChange }) {
  return (
    <div>
      <StepHeading title="What's it for?" subtitle="Pick the one that's closest. You can always edit later." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PURPOSES.map((p) => (
          <ChoiceCard
            key={p.id}
            id={p.id}
            label={p.label}
            description={p.description}
            selected={config.purpose === p.id}
            onSelect={(id) => onChange({ purpose: id, layoutOverride: null })}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Step 2: Device ──────────────────────────────────────

export function DeviceStep({ config, onChange }) {
  return (
    <div>
      <StepHeading title="Which device?" subtitle="Mobile rooms get a single column with a slide-up sheet for secondary controls." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
        {DEVICES.map((d) => (
          <ChoiceCard
            key={d.id}
            id={d.id}
            label={d.label}
            description={d.description}
            selected={config.device === d.id}
            onSelect={(id) => onChange({ device: id, layoutOverride: null })}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Step 3: Density + layout reveal ────────────────────

export function DensityLayoutStep({ config, onChange }) {
  const derivedLayout = deriveLayout({ ...config, layoutOverride: null })
  const showLayoutPicker = config.purpose === 'custom' || config.layoutOverride

  return (
    <div>
      <StepHeading
        title="How much should be on screen?"
        subtitle="Controls how busy the room feels. You can rearrange components later."
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {DENSITIES.map((d) => (
          <ChoiceCard
            key={d.id}
            id={d.id}
            label={d.label}
            description={d.description}
            selected={config.density === d.id}
            onSelect={(id) => onChange({ density: id })}
          />
        ))}
      </div>

      {/* Layout reveal */}
      <div className="px-5 py-4 rounded-xl border border-[var(--p-border)] bg-[var(--p-bg-subtle)]">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="text-[10.5px] uppercase tracking-wider font-medium text-[var(--p-text-muted)]">
            Layout
          </div>
          {!showLayoutPicker && config.purpose !== 'custom' && (
            <button
              onClick={() => onChange({ layoutOverride: derivedLayout })}
              className="text-[11px] text-[var(--p-gold-light)] hover:text-[var(--p-gold-muted)]"
            >
              Pick a different one
            </button>
          )}
        </div>
        {showLayoutPicker ? (
          <div className="grid grid-cols-2 gap-2">
            {LAYOUT_OPTIONS.map((l) => (
              <ChoiceCard
                key={l.id}
                id={l.id}
                label={l.label}
                selected={config.layoutOverride === l.id}
                onSelect={(id) => onChange({ layoutOverride: id })}
                compact
              />
            ))}
          </div>
        ) : (
          <div className="text-sm text-[var(--p-text-primary)]">
            {layoutLabel(derivedLayout)}
            <div className="text-xs text-[var(--p-text-secondary)] mt-1">
              {layoutBlurb(derivedLayout)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Step 4: Features ────────────────────────────────────

export function FeaturesStep({ config, onToggleFeature }) {
  const layoutRef = deriveLayout(config) || 'three-panel@^1.0'
  return (
    <div>
      <StepHeading
        title="Anything extra?"
        subtitle="Optional components. You can always add more in the editor later."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FEATURES.map((f) => {
          const slot = f.slotByLayout[layoutRef]
          const fits = Boolean(slot)
          const checked = config.features.has(f.id)
          return (
            <FeatureRow
              key={f.id}
              feature={f}
              fits={fits}
              checked={checked}
              onToggle={() => fits && onToggleFeature(f.id, !checked)}
            />
          )
        })}
      </div>
    </div>
  )
}

function FeatureRow({ feature, fits, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!fits}
      className={`text-left flex items-start gap-3 px-4 py-3 rounded-xl border transition-colors ${
        !fits
          ? 'border-[var(--p-border-subtle)] bg-white opacity-50 cursor-not-allowed'
          : checked
            ? 'border-[var(--p-gold-light)] bg-[rgba(196,169,77,0.06)]'
            : 'border-[var(--p-border)] bg-white hover:border-[var(--p-gold-light)]'
      }`}
    >
      <span
        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
          checked
            ? 'border-[var(--p-gold-light)] bg-[var(--p-gold-light)] text-white'
            : 'border-[var(--p-border)] bg-white'
        }`}
      >
        {checked && <Check className="w-3 h-3" strokeWidth={3} />}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-medium text-[var(--p-text-primary)]">{feature.label}</span>
        <span className="block text-xs text-[var(--p-text-secondary)] mt-0.5">{feature.description}</span>
        {!fits && (
          <span className="block text-[10.5px] uppercase tracking-wider mt-1.5 text-[var(--p-text-muted)]">
            Not available in this layout
          </span>
        )}
      </span>
    </button>
  )
}

// ─── Step 5: Name + scheme ───────────────────────────────

export function NameSchemeStep({ config, onChange }) {
  return (
    <div>
      <StepHeading title="Name it." subtitle="Pick a color too — it sets the room's tone." />
      <div className="max-w-md mx-auto mb-8">
        <label className="block text-[10.5px] uppercase tracking-wider font-medium text-[var(--p-text-muted)] mb-2">
          Room name
        </label>
        <input
          autoFocus
          value={config.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Q3 product brief"
          className="w-full bg-white rounded-lg px-4 py-3 text-sm text-[var(--p-text-primary)] outline-none border border-[var(--p-border)] focus:border-[var(--p-gold-light)] transition-colors placeholder:text-[var(--p-text-muted)]"
          maxLength={64}
        />
      </div>

      <div>
        <label className="block text-[10.5px] uppercase tracking-wider font-medium text-[var(--p-text-muted)] mb-2 text-center">
          Color scheme
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SCHEMES.map((s) => (
            <ChoiceCard
              key={s.id}
              id={s.id}
              label={s.label}
              description={s.description}
              swatch={s.swatch}
              selected={config.schemeRef === s.id}
              onSelect={(id) => onChange({ schemeRef: id })}
              compact
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Step 6: Ignition ────────────────────────────────────

export function IgnitionStep({ config, onIgnite, busy }) {
  const navigate = useNavigate()
  const [hasKey, setHasKey] = useState(null) // null = checking, false = none, true = present
  const { triggerShimmer, shimmerPhase } = useShimmer()
  const [igniting, setIgniting] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadApiKey('persistent')
      .then((k) => !cancelled && setHasKey(Boolean(k)))
      .catch(() => !cancelled && setHasKey(false))
    return () => { cancelled = true }
  }, [])

  const handleIgnite = () => {
    if (!hasKey) {
      navigate('/settings')
      return
    }
    setIgniting(true)
    triggerShimmer()
    // Short delay to let the shimmer pulse start before navigation.
    setTimeout(() => {
      onIgnite()
    }, 400)
  }

  const checking = hasKey === null
  return (
    <div className="text-center max-w-md mx-auto">
      <StepHeading
        title={checking ? 'Checking…' : hasKey ? 'Ready to ignite' : 'Almost there'}
        subtitle={
          checking
            ? ''
            : hasKey
              ? `Build "${config.name?.trim() || 'your room'}" and open it for editing.`
              : 'You need an API key to use the room. Add one in Settings, then come back.'
        }
      />

      <motion.div
        animate={shimmerPhase === 1 ? { boxShadow: ['0 0 0 0 rgba(196,169,77,0)', '0 0 0 6px rgba(196,169,77,0.25)', '0 0 0 0 rgba(196,169,77,0)'] } : {}}
        transition={{ duration: 1.2 }}
        className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 transition-colors ${
          hasKey
            ? 'bg-[var(--p-gold-light)] text-white'
            : 'bg-[var(--p-bg-subtle)] border border-[var(--p-border)] text-[var(--p-text-muted)]'
        }`}
      >
        {igniting && hasKey ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <Sparkles className="w-6 h-6" />
        )}
      </motion.div>

      <div>
        <button
          onClick={handleIgnite}
          disabled={busy || igniting || checking}
          className={`px-5 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
            hasKey
              ? 'border-[var(--p-gold-light)] bg-[var(--p-gold-light)] text-white hover:bg-[var(--p-gold-muted)] hover:border-[var(--p-gold-muted)]'
              : 'border-[var(--p-border)] bg-white text-[var(--p-text-secondary)] hover:border-[var(--p-gold-light)] hover:text-[var(--p-gold-light)]'
          } disabled:opacity-50`}
        >
          {hasKey
            ? busy || igniting
              ? 'Igniting…'
              : 'Ignite & open in editor'
            : checking
              ? '…'
              : 'Add API key in Settings'}
        </button>
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────

function layoutLabel(ref) {
  if (!ref) return '—'
  const m = LAYOUT_OPTIONS.find(l => l.id === ref)
  return m?.label || ref
}

function layoutBlurb(ref) {
  switch (ref) {
    case 'three-panel@^1.0':
      return 'Two side rails flank the message column. Lots of metadata visible at once.'
    case 'canvas-centric@^1.0':
      return 'A wide canvas for charts and tables. Chat panel keeps the conversation alongside.'
    case 'document-centric@^1.0':
      return 'A document body with margin annotations. Tracked changes feel native here.'
    case 'single-column-with-sheet@^1.0':
      return 'Single column for narrow screens. Sheet slides up from the bottom for context.'
    default:
      return ''
  }
}
