// FeaturesStep — step 4: feature checklist (PR-13).
//
// Per parliament_wizard_v5.html lines 1160–1218. One row per feature
// with an icon, name + category tags, why-it-exists copy, and a circular
// check. Coming-soon features (Open Room) render with a tag and aren't
// togglable.

import { FEATURES } from '../../../lib/buildWizard'
import StepHeader from './StepHeader'
import { Check } from 'lucide-react'

const FEATURE_ICONS = {
  'table-of-contents': (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <line x1="2" y1="3" x2="11" y2="3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <line x1="4" y1="6.5" x2="11" y2="6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <line x1="2" y1="10" x2="9" y2="10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  ),
  'context-health': (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1" fill="none" />
      <path d="M6.5 3.5v3l2 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  highlights: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M1.5 9.5L4.5 2.5 6.5 7.5 8.5 4.5 11.5 9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  branches: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="6.5" cy="2.5" r="1.6" stroke="currentColor" strokeWidth="1" fill="none" />
      <circle cx="2.2" cy="10.5" r="1.4" stroke="currentColor" strokeWidth="1" fill="none" />
      <circle cx="10.8" cy="10.5" r="1.4" stroke="currentColor" strokeWidth="1" fill="none" />
      <line x1="5.7" y1="3.9" x2="3" y2="9.2" stroke="currentColor" strokeWidth=".9" />
      <line x1="7.3" y1="3.9" x2="10" y2="9.2" stroke="currentColor" strokeWidth=".9" />
    </svg>
  ),
  'collab-mode': (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="4.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1" fill="none" />
      <circle cx="10.5" cy="3.5" r="1.4" stroke="currentColor" strokeWidth="1" fill="none" />
      <circle cx="10.5" cy="9.5" r="1.4" stroke="currentColor" strokeWidth="1" fill="none" />
      <line x1="6.5" y1="5.8" x2="9.2" y2="4.4" stroke="currentColor" strokeWidth=".9" />
      <line x1="6.5" y1="7.2" x2="9.2" y2="8.6" stroke="currentColor" strokeWidth=".9" />
    </svg>
  ),
  'open-room': (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x=".8" y="3.5" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1" fill="none" />
      <path d="M8.8 5.5h1.2a1.4 1.4 0 000-2.8h-1.2" stroke="currentColor" strokeWidth="1" fill="none" />
      <line x1="2.8" y1="6.5" x2="6.8" y2="6.5" stroke="currentColor" strokeWidth=".9" strokeLinecap="round" />
      <line x1="2.8" y1="8.5" x2="5.8" y2="8.5" stroke="currentColor" strokeWidth=".9" strokeLinecap="round" />
    </svg>
  ),
  'file-shelf': (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x=".8" y="3.8" width="7.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1" fill="none" />
      <path d="M8.3 5.5L12 3v7l-3.7-2.5" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" fill="none" />
    </svg>
  ),
}

export default function FeaturesStep({ config, onChange }) {
  const toggleFeature = (id) => {
    const next = new Set(config.features)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange({ features: next })
  }

  return (
    <div>
      <StepHeader
        kicker="The tools"
        title="Add signature features to personalize your room"
        subtitle="Pick any that feel useful. You can add or remove these any time."
      />

      <div className="flex flex-col gap-1.5 mb-6">
        {FEATURES.map((f) => (
          <FeatureRow
            key={f.id}
            feature={f}
            checked={config.features.has(f.id)}
            onToggle={toggleFeature}
          />
        ))}
      </div>
    </div>
  )
}

function FeatureRow({ feature, checked, onToggle }) {
  const disabled = feature.comingSoon
  const isSel = checked && !disabled
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(feature.id)}
      className="flex items-start gap-2.5 px-3 py-2.5 rounded-md text-left transition-colors w-full disabled:cursor-not-allowed"
      style={{
        border: isSel ? '1.5px solid var(--p-gold-light)' : '0.5px solid var(--p-border)',
        background: isSel ? 'var(--p-gold-tint)' : 'var(--p-bg-surface)',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-px"
        style={{
          background: isSel ? 'var(--p-gold-tint-2)' : 'var(--p-bg-subtle)',
          color: isSel ? 'var(--p-gold-deep)' : 'var(--p-text-secondary)',
        }}
      >
        {FEATURE_ICONS[feature.id]}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span className="text-[13px] font-medium" style={{ color: 'var(--p-text-primary)' }}>
            {feature.label}
          </span>
          {feature.tags.map((tag) => (
            <FeatureTag key={tag} label={tag} active={isSel} />
          ))}
          {feature.comingSoon && <FeatureTag label="Coming soon" muted />}
        </div>
        <div className="text-[11px] leading-[1.4]" style={{ color: 'var(--p-text-secondary)' }}>
          {feature.description}
        </div>
      </div>

      <div
        className="w-[18px] h-[18px] rounded-full shrink-0 mt-1 flex items-center justify-center"
        style={{
          border: '1.5px solid ' + (isSel ? 'var(--p-gold-light)' : 'var(--p-text-light)'),
          background: isSel ? 'var(--p-gold-light)' : 'transparent',
          color: isSel ? 'white' : 'transparent',
        }}
      >
        {isSel && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
      </div>
    </button>
  )
}

function FeatureTag({ label, active, muted }) {
  let style = {
    background: 'var(--p-bg-subtle)',
    border: '0.5px solid var(--p-border)',
    color: 'var(--p-text-muted)',
  }
  if (active) {
    style = {
      background: 'var(--p-gold-tint-2)',
      border: '0.5px solid var(--p-gold-light)',
      color: 'var(--p-gold-deep)',
    }
  }
  if (muted) {
    style = {
      background: 'var(--p-bg-subtle)',
      border: '0.5px solid var(--p-border)',
      color: 'var(--p-text-muted)',
    }
  }
  return (
    <span className="text-[10px] px-1.5 py-px rounded-full" style={style}>
      {label}
    </span>
  )
}
