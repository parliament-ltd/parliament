// NarrowChrome — thin top bar rendered inside each room layout's
// narrow branch (PR-16). Three slots: a hamburger that opens the
// drawer (left), a centered Parliament mark that navigates to the
// homepage (PR-18f), and an optional panel-toggle that swaps the
// body to the secondary content (right). Each layout passes its own
// rightLabel ("Sheet" / "Inspector" / "Margin").
//
// The right button is conditional — layouts pass `onRightClick`
// only when secondary content exists.
//
// PR-18f: dropped the `border-b` separator; mobile chats rely on the
// extended top-edge fade in `.messages-fade-mask` to read the
// transition from chrome into the scroll area. The centered Mark
// fills the previously empty middle slot and gives users a way back
// to / from any mobile chat (no homepage button existed before).

import { Menu, PanelRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import IconButton from '../IconButton'
import ParliamentMark from '../ParliamentMark'

export default function NarrowChrome({
  onLeftClick,
  onRightClick,
  rightLabel,
  rightActive = false,
}) {
  const navigate = useNavigate()
  return (
    <div className="relative flex items-center justify-between h-10 px-2 bg-white shrink-0">
      <IconButton
        icon={Menu}
        onClick={onLeftClick}
        title="Open menu"
        size="sm"
      />
      <button
        type="button"
        onClick={() => navigate('/')}
        aria-label="Go to homepage"
        title="Home"
        className="absolute left-1/2 -translate-x-1/2 inline-flex items-center justify-center h-8 w-8 rounded-md text-[var(--p-text-primary)] hover:text-[var(--p-gold-light)] transition-colors"
      >
        <ParliamentMark />
      </button>
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
