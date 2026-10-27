// Retired with R14, approved by Stefan on 27 October 2026 (C250 (b)).
// Was src/components/build/wizard/PurposeStep.jsx. Nothing imports it and it is not built.
// To restore: move it back with the rest of the old editor and wizard, and put back their routes in App.jsx.
// PurposeStep — step 1: multi-select Purpose tiles + "build another" toggle.
//
// Per parliament_wizard_v5.html lines 1021–1073. Multi-select grid of
// 4 tiles. When >1 purposes are selected, the "Build another room
// after this one" checkbox surfaces under the grid.

import { PURPOSES } from '../../../lib/buildWizard'
import StepHeader from './StepHeader'
import TileGrid from './TileGrid'

export default function PurposeStep({ config, onChange }) {
  const togglePurpose = (id) => {
    const next = new Set(config.purposes)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    // If we drop below 2, force buildAnother off.
    const buildAnother = next.size > 1 ? config.buildAnother : false
    onChange({ purposes: next, buildAnother })
  }

  const showMulti = config.purposes.size > 1

  return (
    <div>
      <StepHeader
        kicker="The room"
        title="What would you like to build? A place for…"
        subtitle="Pick one or more that best fits."
      />

      <TileGrid
        items={PURPOSES}
        selected={config.purposes}
        onToggle={togglePurpose}
        cols={2}
        iconKind="purpose"
      />

      {showMulti && (
        <div
          className="flex items-start gap-2.5 px-3 py-2.5 rounded-md mt-3 mb-5"
          style={{
            background: 'var(--p-gold-tint)',
            border: '0.5px solid var(--p-gold-light)',
          }}
        >
          <input
            id="multi-cb"
            type="checkbox"
            checked={config.buildAnother}
            onChange={(e) => onChange({ buildAnother: e.target.checked })}
            className="mt-0.5 shrink-0 w-3.5 h-3.5 cursor-pointer"
            style={{ accentColor: 'var(--p-gold-light)' }}
          />
          <label
            htmlFor="multi-cb"
            className="text-[12px] leading-[1.5] cursor-pointer"
            style={{ color: 'var(--p-gold-deep)' }}
          >
            Build another room after this one. Since you've chosen more than one purpose, you might want a separate room for each.
          </label>
        </div>
      )}
    </div>
  )
}
