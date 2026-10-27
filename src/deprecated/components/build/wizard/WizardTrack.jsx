// Retired with R14, approved by Stefan on 27 October 2026 (C250 (b)).
// Was src/components/build/wizard/WizardTrack.jsx. Nothing imports it and it is not built.
// To restore: move it back with the rest of the old editor and wizard, and put back their routes in App.jsx.
// WizardTrack — six-dot progress indicator for the build wizard (PR-13).
//
// Per parliament_wizard_v5.html lines 151–180. Six dots numbered 1..6
// connected by thin lines. State per dot: pending (default), active
// (current step, gold ring), done (filled gold + checkmark). The
// Welcome screen (step 0) doesn't show the track — it's only on
// steps 1..6 (the wizard proper). PR-19a merged the old Done step
// (was step 7) into Ignition (step 6); there is no step 7 anymore.

import { Check } from 'lucide-react'

const TOTAL = 6

export default function WizardTrack({ current }) {
  return (
    <div className="flex items-center mb-7">
      {Array.from({ length: TOTAL }).map((_, i) => {
        const stepNum = i + 1
        const done = stepNum < current
        const active = stepNum === current
        return (
          <div key={stepNum} className="flex items-center" style={{ flex: i < TOTAL - 1 ? 1 : 'initial' }}>
            <Dot stepNum={stepNum} done={done} active={active} />
            {i < TOTAL - 1 && <Line done={done} />}
          </div>
        )
      })}
    </div>
  )
}

function Dot({ stepNum, done, active }) {
  if (done) {
    return (
      <div
        className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-white shrink-0"
        style={{ background: 'var(--p-gold-light)', border: '0.5px solid var(--p-gold-light)' }}
      >
        <Check className="w-3 h-3" strokeWidth={2.5} />
      </div>
    )
  }
  if (active) {
    return (
      <div
        className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-medium shrink-0"
        style={{ border: '2px solid var(--p-gold-light)', color: 'var(--p-gold-light)', background: 'var(--p-bg-surface)' }}
      >
        {stepNum}
      </div>
    )
  }
  return (
    <div
      className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-medium shrink-0"
      style={{ border: '0.5px solid var(--p-border)', color: 'var(--p-text-muted)', background: 'var(--p-bg-surface)' }}
    >
      {stepNum}
    </div>
  )
}

function Line({ done }) {
  return (
    <div
      className="flex-1 h-px"
      style={{ background: done ? 'var(--p-gold-light)' : 'var(--p-border)' }}
    />
  )
}
