import { useEffect, useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'

// A window's full screen mark, in its corner (C283). A browser lets a page
// go full screen only from a click in that page, so it cannot be asked for
// from the bar in another window: the mark is the click. F11 does the same.

/** @param {{ win: Window }} props the popped window it sits in */
export default function FullScreenMark({ win }) {
  const { i18n } = useLingui()
  const doc = win.document
  const [full, setFull] = useState(Boolean(doc.fullscreenElement))
  useEffect(() => {
    const on = () => setFull(Boolean(doc.fullscreenElement))
    doc.addEventListener('fullscreenchange', on)
    return () => doc.removeEventListener('fullscreenchange', on)
  }, [doc])
  if (!doc.fullscreenEnabled) return null
  const flip = () => {
    const asked = doc.fullscreenElement ? doc.exitFullscreen() : doc.documentElement.requestFullscreen()
    asked?.catch?.(() => { /* the browser said no; the window stays as it is */ })
  }
  return (
    <button type="button" className="ch-marg ch-winfull" onClick={flip}>
      {i18n._(full ? COPY.shell.leaveFullScreen : COPY.shell.fullScreen)}
    </button>
  )
}
