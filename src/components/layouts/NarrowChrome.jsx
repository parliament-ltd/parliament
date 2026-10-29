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
//
// Its words are the copy table's (C279 (b)): the left button opens the
// left column, and the layout names what the right one shows and hides
// (rightWords, two copy entries).
//
// With the columns not drawn (C280 (a); release.js, COLUMNS), a room on the
// shell with nothing to open here draws no top line at all: the chat starts
// at the top of the room.

import { useContext } from 'react'
import { Menu, PanelRight, Wrench } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import IconButton from '../IconButton'
import ParliamentMark from '../ParliamentMark'
import { useChatFrame } from '../ChatFrameContext'
import { RoomHost } from '../../lib/useViewportWidth'
import { useLingui } from '@lingui/react'
import { COPY } from '../../copy'
import { COLUMNS } from '../../lib/release'

export default function NarrowChrome({
  onLeftClick,
  onRightClick,
  rightWords = { show: COPY.room.openRight, hide: COPY.room.closeRight },
  rightActive = false,
}) {
  const navigate = useNavigate()
  const chatFrame = useChatFrame()
  const wrenchTarget = chatFrame?.wrenchTarget || null
  // A room hosted on the shell keeps its top line to its own panels: the
  // shell has its own way home (C126).
  const hosted = useContext(RoomHost) != null
  const { i18n } = useLingui()
  const homeLabel = i18n._(COPY.room.home)
  const leftLabel = i18n._(COPY.room.openLeft)
  const editorLabel = i18n._(COPY.room.openEditor)
  const rightLabel = i18n._(rightActive ? rightWords.hide : rightWords.show)

  if (!COLUMNS && hosted && !onLeftClick && !onRightClick && !wrenchTarget) return null

  return (
    <div className="flex justify-evenly items-center h-10 bg-white shrink-0">
      {onLeftClick ? (
        <IconButton
          icon={Menu}
          onClick={onLeftClick}
          title={leftLabel}
          size="sm"
        />
      ) : (
        <span className="w-7 h-7" aria-hidden="true" />
      )}

      {hosted ? (
        <span className="w-7 h-7" aria-hidden="true" />
      ) : (
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label={homeLabel}
          title={homeLabel}
          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--p-text-primary)] hover:text-[var(--p-gold-light)] transition-colors"
        >
          <ParliamentMark />
        </button>
      )}

      {wrenchTarget ? (
        <button
          type="button"
          onClick={() => navigate(wrenchTarget, { state: { fromChat: true } })}
          aria-label={editorLabel}
          title={editorLabel}
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
          title={rightLabel}
          active={rightActive}
          size="sm"
        />
      ) : (
        <span className="w-7 h-7" aria-hidden="true" />
      )}
    </div>
  )
}
