// NarrowChrome — thin top bar rendered inside each room layout's
// narrow branch (PR-16). Two slots: a hamburger that opens the
// drawer (left), and an optional panel-toggle that swaps the body
// to the secondary content (right). Each layout passes its own
// rightLabel ("Sheet" / "Inspector" / "Margin").
//
// The right button is conditional — layouts pass `onRightClick`
// only when secondary content exists.

import { Menu, PanelRight } from 'lucide-react'
import IconButton from '../IconButton'

export default function NarrowChrome({
  onLeftClick,
  onRightClick,
  rightLabel,
  rightActive = false,
}) {
  return (
    <div className="flex items-center justify-between h-10 px-2 border-b border-[var(--p-border)] bg-white shrink-0">
      <IconButton
        icon={Menu}
        onClick={onLeftClick}
        title="Open menu"
        size="sm"
      />
      {onRightClick ? (
        <IconButton
          icon={PanelRight}
          onClick={onRightClick}
          title={rightActive ? `Hide ${rightLabel}` : `Show ${rightLabel}`}
          active={rightActive}
          size="sm"
        />
      ) : (
        <span className="w-7" aria-hidden="true" />
      )}
    </div>
  )
}
