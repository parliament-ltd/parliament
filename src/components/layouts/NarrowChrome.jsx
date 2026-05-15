// NarrowChrome — thin top bar rendered inside each room layout's
// narrow branch.
//
// PR-19d restructure: four evenly-distributed slots:
//   [Menu] [Parliament] [Wrench] [PanelRight]
// flex justify-evenly. Each slot has a stable footprint so missing
// callbacks render as aria-hidden spacers — the cluster doesn't
// shift between rooms.
//
// The wrench navigates to /edit/${roomId}?tab=components for the
// surrounding chat. The roomId comes from the ChatFrameContext
// provider mounted in ChatView (PR-19d). When the provider isn't in
// scope (editor preview sheet, dev /catalog route) the wrench renders
// as a hidden spacer, preserving alignment.

import { Menu, PanelRight, Wrench } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import IconButton from '../IconButton'
import ParliamentMark from '../ParliamentMark'
import { useChatFrame } from '../ChatFrameContext'

export default function NarrowChrome({
  onLeftClick,
  onRightClick,
  rightLabel,
  rightActive = false,
}) {
  const navigate = useNavigate()
  const chatFrame = useChatFrame()
  const wrenchTarget = chatFrame?.wrenchTarget || null

  return (
    <div className="flex justify-evenly items-center h-10 bg-white shrink-0">
      {onLeftClick ? (
        <IconButton
          icon={Menu}
          onClick={onLeftClick}
          title="Open menu"
          size="sm"
        />
      ) : (
        <span className="w-7 h-7" aria-hidden="true" />
      )}

      <button
        type="button"
        onClick={() => navigate('/')}
        aria-label="Go to homepage"
        title="Home"
        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--p-text-primary)] hover:text-[var(--p-gold-light)] transition-colors"
      >
        <ParliamentMark />
      </button>

      {wrenchTarget ? (
        <button
          type="button"
          onClick={() => navigate(wrenchTarget)}
          aria-label="Open Editor"
          title="Open Editor"
          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--p-text-secondary)] hover:text-[var(--p-gold-light)] transition-colors"
        >
          <Wrench className="w-4 h-4" />
        </button>
      ) : (
        <span className="w-7 h-7" aria-hidden="true" />
      )}

      {onRightClick ? (
        <IconButton
          icon={PanelRight}
          onClick={onRightClick}
          title={rightActive ? `Hide ${rightLabel}` : `Show ${rightLabel}`}
          active={rightActive}
          size="sm"
        />
      ) : (
        <span className="w-7 h-7" aria-hidden="true" />
      )}
    </div>
  )
}
