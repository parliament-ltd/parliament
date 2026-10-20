import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'

// Throwaway prototype for stage 3 (refactor-plan.md): can the bar be popped
// into a window of its own (pop:command) and stay dependable? Not part of the
// product. Reached at /dev/popout in development, and in a production build
// only when it is built with VITE_PROTOTYPES=1, so it can be tried under the
// real security headers with `vite preview`. Delete once the verdict is in.
//
// What it tries, from the audit (research/state-architecture.md 11c):
//   - opening from Enter, without a pop-up blocker stopping it
//   - styles in the new window, under the content security policy
//   - keys, selection and focus inside the window
//   - timers and animation when the tab that opened it is hidden
//   - closing either side
//   - an ordinary window, and the always-on-top window Chromium offers
//     (Document Picture-in-Picture)
//
// The window has no code of its own: React draws into it from this tab
// through a portal, as the security audit recommends.

const C = {
  paper: '#FCFCFA', surface: '#FFFFFF', ink: '#191919', ink2: '#5F5E59', ink3: '#6F6E69',
  border: '#E9E9E7', navy: '#1F2A44',
  sans: '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif',
  serif: '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif',
  mono: 'ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace',
}

const canPip = () => typeof window !== 'undefined' && 'documentPictureInPicture' in window

// Copy this page's stylesheets into another document: a <link> to a file
// stays a link (allowed by style-src 'self'); a <style> element (Vite in
// development, motion libraries at run time) is cloned, which needs
// 'unsafe-inline'. The report counts each, since stage 3 wants to drop it.
function copyStyles(from, to) {
  const counts = { links: 0, inline: 0 }
  for (const node of from.querySelectorAll('link[rel="stylesheet"], style')) {
    to.head.appendChild(node.cloneNode(true))
    counts[node.tagName === 'LINK' ? 'links' : 'inline']++
  }
  return counts
}

// Open a window with no code of its own and return a container in it.
async function openBarWindow(kind) {
  let win
  if (kind === 'pip') {
    win = await window.documentPictureInPicture.requestWindow({ width: 520, height: 220 })
  } else {
    // Same-origin and blank: it inherits this page's policy and is never navigated.
    win = window.open('', 'parliament-bar', 'popup,width=560,height=260')
    if (!win) throw new Error('The browser did not open the window (a pop-up blocker, or no click led here).')
  }
  const doc = win.document
  doc.title = 'Parliament'
  doc.documentElement.lang = document.documentElement.lang || 'en'
  doc.body.style.margin = '0'
  doc.body.style.background = C.paper
  const styles = copyStyles(document, doc)
  const container = doc.createElement('div')
  doc.body.appendChild(container)
  return { win, container, styles }
}

// Keys handled on whichever document the bar is drawn in: one handler per
// window, the way the shell's key manager would attach to each.
function useKeysIn(doc, onKey) {
  useEffect(() => {
    if (!doc) return
    const handler = (e) => onKey(e)
    doc.addEventListener('keydown', handler)
    return () => doc.removeEventListener('keydown', handler)
  }, [doc, onKey])
}

// A clock driven by a given window's timers and frames, counting how many
// ticks and frames arrived in each of the last seconds.
function useClocks(win, label) {
  const [stats, setStats] = useState({ ticks: 0, frames: 0, expectedTicks: 0 })
  useEffect(() => {
    if (!win) return
    let ticks = 0
    let frames = 0
    let raf = 0
    const started = win.performance.now()
    const tick = win.setInterval(() => { ticks++ }, 100)
    const frame = () => { frames++; raf = win.requestAnimationFrame(frame) }
    raf = win.requestAnimationFrame(frame)
    const report = win.setInterval(() => {
      setStats({ ticks, frames, expectedTicks: Math.round((win.performance.now() - started) / 100) })
    }, 1000)
    return () => {
      win.clearInterval(tick)
      win.clearInterval(report)
      win.cancelAnimationFrame(raf)
    }
  }, [win, label])
  return stats
}

function Bar({ doc, onCommand, docked }) {
  const inputRef = useRef(null)
  const [text, setText] = useState('')
  const [lastKey, setLastKey] = useState('')
  const [selection, setSelection] = useState('')
  const mode = text.startsWith('p>') ? 'prompt' : text.startsWith('>') ? 'command' : 'search'

  // Focus the field when the bar appears in a window.
  useEffect(() => { inputRef.current?.focus() }, [doc])

  const onKey = useCallback((e) => {
    const k = `${e.ctrlKey ? 'Ctrl+' : ''}${e.metaKey ? 'Cmd+' : ''}${e.key}`
    setLastKey(k)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      inputRef.current?.focus()
      setText('>')
    } else if (e.key === '/' && doc.activeElement !== inputRef.current) {
      e.preventDefault()
      inputRef.current?.focus()
    } else if (e.key === 'Escape') {
      setText('')
    }
  }, [doc])
  useKeysIn(doc, onKey)

  // Selection is read from the bar's own document, never this tab's.
  useEffect(() => {
    if (!doc) return
    const onSel = () => setSelection(doc.getSelection()?.toString() || '')
    doc.addEventListener('selectionchange', onSel)
    return () => doc.removeEventListener('selectionchange', onSel)
  }, [doc])

  const submit = (e) => {
    e.preventDefault()
    const command = text.replace(/^>\s*/, '').trim()
    if (mode === 'command' && command) onCommand(command)
    setText('>')
  }

  return (
    <div style={{ padding: 16, font: `400 14px ${C.sans}`, color: C.ink }}>
      <form onSubmit={submit}>
        <div className="popout-proto-field" data-mode={mode} style={{
          display: 'flex', alignItems: 'center', gap: 8, height: 40, borderRadius: 14, padding: '0 14px',
          border: `1px solid ${mode === 'command' ? C.navy : C.border}`, background: C.surface,
        }}>
          <span style={{ font: `500 12px ${C.mono}`, color: mode === 'command' ? C.navy : C.ink3 }}>{mode}</span>
          <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} aria-label="The bar"
            placeholder={docked ? 'Try > pop:command, or > pop:pip' : 'Try > pop:back'}
            style={{ flex: 1, border: 'none', outline: 'none', font: `400 14px ${C.sans}`, background: 'transparent' }} />
        </div>
      </form>
      <p style={{ margin: '8px 0 0', font: `italic 400 12px ${C.serif}`, color: C.ink2 }}>
        Last key here: {lastKey || 'none'}. Selected here: {selection ? `"${selection.slice(0, 40)}"` : 'nothing'}.
        {' '}Select this sentence to try selection.
      </p>
      {/* A JavaScript-driven animation (framer-motion, on this tab's frame loop). */}
      <motion.div animate={{ x: [0, 120, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: 10, height: 10, borderRadius: 5, background: C.ink, marginTop: 10 }} title="framer-motion" />
      {/* The same movement as a CSS animation, run by the window that shows it. */}
      <div className="popout-proto-css-dot" title="CSS animation" style={{ width: 10, height: 10, borderRadius: 5, background: C.ink3, marginTop: 6 }} />
    </div>
  )
}

export default function PopoutPrototype() {
  const [popped, setPopped] = useState(null) // { win, container, styles, kind }
  const [error, setError] = useState('')
  const [visibility, setVisibility] = useState([])
  const openerClocks = useClocks(window, 'opener')
  const popupClocks = useClocks(popped?.win || null, 'popup')

  useEffect(() => {
    const on = () => setVisibility((v) => [...v.slice(-5), `${new Date().toLocaleTimeString()} ${document.visibilityState}`])
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])

  // Closing this tab or reloading it closes the window it drew.
  useEffect(() => {
    if (!popped) return
    const closeIt = () => popped.win.close()
    window.addEventListener('pagehide', closeIt)
    const onClosed = () => setPopped(null)
    popped.win.addEventListener('pagehide', onClosed)
    return () => {
      window.removeEventListener('pagehide', closeIt)
      popped.win.removeEventListener('pagehide', onClosed)
    }
  }, [popped])

  const onCommand = useCallback(async (command) => {
    setError('')
    if (command === 'pop:back') {
      popped?.win.close()
      setPopped(null)
      return
    }
    if (command === 'pop:command' || command === 'pop:pip') {
      const kind = command === 'pop:pip' ? 'pip' : 'window'
      if (kind === 'pip' && !canPip()) {
        setError('This browser has no always-on-top window (Document Picture-in-Picture). pop:command opens an ordinary window instead.')
        return
      }
      try {
        popped?.win.close()
        const opened = await openBarWindow(kind)
        setPopped({ ...opened, kind })
      } catch (e) {
        setError(e?.message || String(e))
      }
      return
    }
    setError(`Not a prototype command: ${command}`)
  }, [popped])

  const row = (label, value) => (
    <div style={{ display: 'flex', gap: 12, padding: '4px 0', borderTop: `.5px solid ${C.border}` }}>
      <span style={{ width: 260, color: C.ink2 }}>{label}</span>
      <span style={{ font: `400 12px ${C.mono}` }}>{value}</span>
    </div>
  )
  const rate = (s) => (s.expectedTicks ? `${Math.round((100 * s.ticks) / s.expectedTicks)}% of ticks, ${s.frames} frames` : 'not running')

  return (
    <div style={{ minHeight: '100vh', background: C.paper, color: C.ink, font: `400 14px ${C.sans}`, padding: '32px 16px' }}>
      <style>{`
        @keyframes popout-proto-slide { 0%, 100% { transform: translateX(0) } 50% { transform: translateX(120px) } }
        .popout-proto-css-dot { animation: popout-proto-slide 2s ease-in-out infinite }
      `}</style>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <h1 style={{ font: `500 20px ${C.sans}`, margin: 0 }}>Pop-out prototype</h1>
        <p style={{ margin: '6px 0 16px', font: `italic 400 13px ${C.serif}`, color: C.ink2, lineHeight: 1.6 }}>
          Throwaway. Type <code>&gt; pop:command</code> and press Enter to pop the bar into its own window, or
          <code> &gt; pop:pip</code> for the window that stays on top. Then hide this tab for ten seconds and come back.
        </p>

        <div style={{ background: C.surface, borderRadius: 16, boxShadow: '0 1px 2px rgba(40,36,28,.035)' }}>
          {popped
            ? <p style={{ margin: 0, padding: 16, color: C.ink2 }}>The bar is in its own window ({popped.kind === 'pip' ? 'always on top' : 'ordinary'}). Type <code>&gt; pop:back</code> there, or close it.</p>
            : <Bar doc={document} onCommand={onCommand} docked />}
        </div>
        {error && <p style={{ margin: '10px 0 0' }}>{error}</p>}

        <h2 style={{ font: `500 15px ${C.sans}`, margin: '24px 0 6px' }}>What happens</h2>
        <div style={{ background: C.surface, borderRadius: 16, padding: '8px 16px' }}>
          {row('This tab is', document.visibilityState)}
          {row('Visibility changes', visibility.join(' · ') || 'none yet')}
          {row('Window', popped ? `${popped.kind}, open` : 'none')}
          {row('Styles copied in', popped ? `${popped.styles.links} linked files, ${popped.styles.inline} inline` : '')}
          {row("This tab's timers and frames", rate(openerClocks))}
          {row("The window's timers and frames", popped ? rate(popupClocks) : '')}
          {row('Window can reach this tab', popped ? String(popped.win.opener === window || popped.kind === 'pip') : '')}
          {row('Cross-origin isolated', String(window.crossOriginIsolated))}
          {row('Always-on-top window available', String(canPip()))}
        </div>
      </div>

      {popped && createPortal(<Bar doc={popped.win.document} onCommand={onCommand} docked={false} />, popped.container)}
    </div>
  )
}
