// DeviceStep — step 2: multi-select Device tiles (PR-13).
//
// Per parliament_wizard_v5.html lines 1075–1109. Multi-select grid of 2.

import { DEVICES } from '../../../lib/buildWizard'
import StepHeader from './StepHeader'
import TileGrid from './TileGrid'

export default function DeviceStep({ config, onChange }) {
  const toggleDevice = (id) => {
    const next = new Set(config.devices)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange({ devices: next })
  }

  return (
    <div>
      <StepHeader
        kicker="The room"
        title="Where will you use this room?"
        subtitle="Pick one or more."
      />
      <TileGrid items={DEVICES} selected={config.devices} onToggle={toggleDevice} cols={2} />
    </div>
  )
}
