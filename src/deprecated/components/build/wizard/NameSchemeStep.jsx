// Retired with R14, approved by Stefan on 27 October 2026 (C250 (b)).
// Was src/components/build/wizard/NameSchemeStep.jsx. Nothing imports it and it is not built.
// To restore: move it back with the rest of the old editor and wizard, and put back their routes in App.jsx.
// NameSchemeStep — step 5: name input + scheme picker + summary card
// (PR-13).
//
// Per parliament_wizard_v5.html lines 1220–1303. Free-text name input
// plus a 3-column scheme grid. The summary card at the bottom mirrors
// the chosen scheme bg color and shows the name + receipt-style tags.

import { useMemo } from 'react'
import { SCHEMES, PURPOSES, DEVICES, LAYOUT_META, FEATURES } from '../../../lib/buildWizard'
import StepHeader from './StepHeader'

export default function NameSchemeStep({ config, onChange }) {
  const activeScheme = SCHEMES.find(s => s.id === config.scheme) || SCHEMES[0]

  const summaryTags = useMemo(() => {
    const tags = []
    config.purposes.forEach((id) => {
      const p = PURPOSES.find(x => x.id === id)
      if (p) tags.push(p.label)
    })
    config.devices.forEach((id) => {
      const d = DEVICES.find(x => x.id === id)
      if (d) tags.push(d.label)
    })
    if (config.density) tags.push(capitalize(config.density))
    if (config.layout && LAYOUT_META[config.layout]) {
      tags.push(LAYOUT_META[config.layout].label)
    }
    if (activeScheme) tags.push(activeScheme.label)
    config.features.forEach((id) => {
      const f = FEATURES.find(x => x.id === id)
      if (f && !f.comingSoon) tags.push(f.label)
    })
    return tags
  }, [config, activeScheme])

  return (
    <div>
      <StepHeader
        kicker="Almost there"
        title="Name your room and pick a feel"
        subtitle="You can change both of these any time."
      />

      <div className="text-[12px] mb-1.5" style={{ color: 'var(--p-text-secondary)' }}>
        Room name
      </div>
      <input
        type="text"
        autoFocus
        value={config.name}
        maxLength={48}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="e.g. The Writing Studio"
        className="w-full px-3.5 py-2.5 text-[15px] rounded-md mb-5 outline-none transition-colors"
        style={{
          border: '0.5px solid var(--p-border)',
          background: 'var(--p-bg-surface)',
          color: 'var(--p-text-primary)',
        }}
        onFocus={(e) => { e.target.style.border = '1.5px solid var(--p-gold-light)' }}
        onBlur={(e) => { e.target.style.border = '0.5px solid var(--p-border)' }}
      />

      <div className="text-[12px] mb-2" style={{ color: 'var(--p-text-secondary)' }}>
        Color scheme
      </div>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {SCHEMES.map((s) => (
          <SchemeCard
            key={s.id}
            scheme={s}
            selected={config.scheme === s.id}
            onSelect={() => onChange({ scheme: s.id })}
          />
        ))}
      </div>

      <div
        className="rounded-[10px] p-5 mb-2 transition-colors"
        style={{
          border: '0.5px solid var(--p-border)',
          background: activeScheme.bg,
          color: activeScheme.id === 'deep-calm@^1.0' ? 'white' : 'var(--p-text-primary)',
        }}
      >
        <div className="text-lg font-medium mb-1.5">
          {config.name.trim() || 'Untitled room'}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {summaryTags.map((t, i) => (
            <span
              key={`${t}-${i}`}
              className="text-[11px] px-2 py-[3px] rounded-full"
              style={{
                background: 'var(--p-bg-surface)',
                border: '0.5px solid var(--p-border)',
                color: 'var(--p-text-secondary)',
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function SchemeCard({ scheme, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-[10px] p-2.5 text-left cursor-pointer transition-colors"
      style={{
        border: selected ? '1.5px solid var(--p-gold-light)' : '0.5px solid var(--p-border)',
        background: 'var(--p-bg-surface)',
      }}
    >
      <div
        className="rounded-md mb-2 flex items-center px-2 gap-1.5"
        style={{
          height: 36,
          background: scheme.bg,
          border: scheme.builtIn ? `0.5px solid ${scheme.dot}` : 'none',
        }}
      >
        <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: scheme.dot }} />
        <span className="flex-1 h-[2px] rounded-sm" style={{ background: scheme.line }} />
      </div>
      <div className="text-[12px] font-medium" style={{ color: 'var(--p-text-primary)' }}>
        {scheme.label}
      </div>
      <div className="text-[10px] mt-0.5" style={{ color: 'var(--p-text-muted)' }}>
        {scheme.description}
      </div>
      {scheme.builtIn && (
        <div
          className="inline-flex items-center gap-1 mt-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
          style={{
            background: 'rgba(196, 169, 77, 0.1)',
            color: 'var(--p-gold-deep)',
            border: '0.5px solid var(--p-gold-light)',
          }}
        >
          Built in
        </div>
      )}
    </button>
  )
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}
