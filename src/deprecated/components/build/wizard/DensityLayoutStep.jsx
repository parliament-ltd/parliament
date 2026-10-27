// Retired with R14, approved by Stefan on 27 October 2026 (C250 (b)).
// Was src/components/build/wizard/DensityLayoutStep.jsx. Nothing imports it and it is not built.
// To restore: move it back with the rest of the old editor and wizard, and put back their routes in App.jsx.
// DensityLayoutStep — step 3: density tiles + revealed layout cards (PR-13).
//
// Per parliament_wizard_v5.html lines 1111–1158, 1379–1572. Density picks
// the layouts that show; if a density has only one eligible layout it's
// auto-selected with the gold-pulse animation. If multiple, the user
// picks. Each layout card has a wireframe preview + Preview link that
// opens the right-side overlay.

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DENSITIES, LAYOUTS_BY_DENSITY, LAYOUT_META } from '../../../lib/buildWizard'
import StepHeader from './StepHeader'
import LayoutWireframe from './LayoutWireframe'

export default function DensityLayoutStep({ config, onChange, onPreviewLayout }) {
  const eligible = config.density ? (LAYOUTS_BY_DENSITY[config.density] || []) : []
  const autoSelectId = eligible.length === 1 ? eligible[0] : null
  const [pulseId, setPulseId] = useState(null)

  // Auto-select when density picks a single-layout density. Pulse for 600ms
  // so the user notices the gold ring expand-then-fade before moving on.
  useEffect(() => {
    if (autoSelectId && config.layout !== autoSelectId) {
      onChange({ layout: autoSelectId })
      setPulseId(autoSelectId)
      const t = setTimeout(() => setPulseId(null), 700)
      return () => clearTimeout(t)
    }
    if (!autoSelectId && config.layout && !eligible.includes(config.layout)) {
      // Density change cleared a previously-valid layout
      onChange({ layout: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSelectId, config.density])

  const pickDensity = (id) => {
    if (id === config.density) return
    onChange({ density: id, layout: null })
  }

  const pickLayout = (id) => {
    onChange({ layout: id })
  }

  return (
    <div>
      <StepHeader
        kicker="Arrange"
        title="How do you want the room to feel?"
        subtitle="Choose one. This sets the spatial mood and reveals layouts that match."
      />

      <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        {DENSITIES.map((d) => {
          const isSel = config.density === d.id
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => pickDensity(d.id)}
              className="rounded-[10px] py-4 px-3 text-center cursor-pointer transition-colors"
              style={{
                border: isSel ? '1.5px solid var(--p-gold-light)' : '0.5px solid var(--p-border)',
                background: isSel ? 'var(--p-gold-tint)' : 'var(--p-bg-surface)',
              }}
            >
              <DensityIcon id={d.id} active={isSel} />
              <div className="text-[13px] font-medium mb-0.5" style={{ color: 'var(--p-text-primary)' }}>
                {d.label}
              </div>
              <div className="text-[11px] leading-[1.4]" style={{ color: 'var(--p-text-secondary)' }}>
                {d.description}
              </div>
            </button>
          )
        })}
      </div>
      <div className="text-[11px] mb-6" style={{ color: 'var(--p-text-muted)' }}>
        This can be adjusted later.
      </div>

      <AnimatePresence>
        {config.density && (
          <motion.div
            key={config.density}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="mt-6"
          >
            <div
              className="text-[10px] font-medium uppercase mb-3"
              style={{ letterSpacing: '0.08em', color: 'var(--p-text-muted)' }}
            >
              Layout
            </div>
            <div
              className="grid gap-2 mb-2"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}
            >
              {eligible.map((id) => (
                <LayoutCard
                  key={id}
                  id={id}
                  meta={LAYOUT_META[id]}
                  selected={config.layout === id}
                  pulse={pulseId === id}
                  onSelect={() => pickLayout(id)}
                  onPreview={() => onPreviewLayout(id)}
                />
              ))}
            </div>
            {eligible.length === 1 && (
              <div
                className="text-[11px] italic text-center mt-2"
                style={{ color: 'var(--p-text-muted)' }}
              >
                Only one layout fits this density. Auto-selected for you.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DensityIcon({ id, active }) {
  // Three ascending bars — heights vary by density level (per spec).
  const heights = id === 'minimal' ? [6, 6, 6]
    : id === 'balanced' ? [8, 14, 8]
    : [14, 18, 14]
  const color = active ? 'var(--p-gold-light)' : 'var(--p-text-light)'
  return (
    <div className="flex justify-center items-end gap-[3px] h-5 mb-1.5">
      {heights.map((h, i) => (
        <div key={i} style={{ width: 5, height: h, background: color, borderRadius: 2 }} />
      ))}
    </div>
  )
}

function LayoutCard({ id, meta, selected, pulse, onSelect, onPreview }) {
  return (
    <motion.div
      animate={pulse
        ? { boxShadow: [
            '0 0 0 0 rgba(196,169,77,0)',
            '0 0 0 4px rgba(196,169,77,0.32)',
            '0 0 0 0 rgba(196,169,77,0)',
          ] }
        : {}}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      onClick={(e) => {
        if (e.target?.dataset?.preview === '1') return
        onSelect()
      }}
      className="rounded-[10px] p-3 cursor-pointer flex flex-col gap-2"
      style={{
        border: selected ? '1.5px solid var(--p-gold-light)' : '0.5px solid var(--p-border)',
        background: selected ? 'var(--p-gold-tint)' : 'var(--p-bg-surface)',
      }}
    >
      <LayoutWireframe id={id} small />
      <div>
        <div className="text-[12.5px] font-medium" style={{ color: 'var(--p-text-primary)' }}>
          {meta.label}
        </div>
        <div className="text-[10.5px] leading-[1.4]" style={{ color: 'var(--p-text-secondary)' }}>
          {meta.short}
        </div>
      </div>
      <button
        type="button"
        data-preview="1"
        onClick={(e) => { e.stopPropagation(); onPreview() }}
        className="self-start text-[10.5px]"
        style={{ color: 'var(--p-gold-light)' }}
      >
        Preview
      </button>
    </motion.div>
  )
}
