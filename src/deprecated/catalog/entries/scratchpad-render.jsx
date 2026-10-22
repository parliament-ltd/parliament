// Retired with R7, approved by Stefan on 22 October 2026: The homepage's scratchpad, drawn.
// Was src/catalog/entries/scratchpad-render.jsx. Nothing imports it and it is not built. To restore:
// Move it back with scratchpad.jsx.

// Render component for scratchpad@1.0. Lives in its own file so the
// manifest entry stays a clean default-export.

import { useEffect, useState } from 'react'
import { getSetting, setSetting } from '../../lib/db'

const SETTING_KEY = 'scratchpad-text'

export default function ScratchpadRender({ config = {} }) {
  const placeholder = config.placeholder ?? 'A place to jot anything…'
  const [text, setText] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const v = await getSetting(SETTING_KEY)
      if (!cancelled) {
        setText(typeof v === 'string' ? v : '')
        setLoaded(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Debounce writes — saving on every keystroke is needless churn.
  useEffect(() => {
    if (!loaded) return
    const t = setTimeout(() => { setSetting(SETTING_KEY, text) }, 400)
    return () => clearTimeout(t)
  }, [text, loaded])

  return (
    <textarea
      value={text}
      onChange={(e) => setText(e.target.value)}
      placeholder={placeholder}
      rows={4}
      className="w-full bg-white rounded-lg px-4 py-3 text-sm text-[var(--p-text-primary)] resize-none outline-none border border-[var(--p-border)] focus:border-[var(--p-accent-gold,#B8A070)] transition-colors placeholder:text-[var(--p-text-muted)]"
    />
  )
}
