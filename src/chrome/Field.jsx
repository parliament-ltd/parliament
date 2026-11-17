import { forwardRef, useRef } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { shownValue, showsHeld } from '../shell/field'
import { CommandFill, PromptFill, Magnifier, Quill, MoonMark } from './Fills'

// The field: one input read three ways (bar reference, "The field"). The
// left names the mode, the right carries its glyph, and the fill wipes in
// from the left when the mode changes. While a reply is edited it folds into
// a circle as tall as itself (C108), showing only its mark: the magnifier,
// the moon, or the quill. Folded, it is a button: Tab reaches it, Enter or
// Space or a click opens it. Its behaviour is the reducer in
// src/shell/field.js.
//
// In prompt mode, marginalia inside the field says who answers a prompt
// here: "answered from Wikipedia", "answered by Sonnet 4.6" (stage 4), and
// the ink pot shows a reply arriving, arrived, or stopped (C114). A click on
// the marginalia opens the picker of who can answer (stage 7; C149).
//
// A prompt edited in the chat and held for Enter shows as a placeholder in
// place of its words (Stefan, 29 October), as the bar reference draws a
// prompt's placeholder in the field ("Reply to 201a").
//
// The microphone sits before the glyph in every mode, on a computer and a
// phone (17 November; C70): speech turned into words on the device only.
// Where the browser cannot do that it is drawn faint, and a click says why.
//
// On a phone (17 November; Stefan: "competitors use a really simple
// input"), a plus on the left opens the menu (PlusMenu.jsx) in place of the
// mode's name, and the ink pot sends a prompt. A tap into a prompt doubles
// the field: its words above, and under them the plus, the frameworks and
// who answers as pills, the microphone and the pot. A swipe across the
// field goes to the next mode or the one before (onSwipe), what was typed
// staying with each. An empty field names its mode. Web search and files
// are in the menu.

// A swipe: further across than down, and past this many pixels, before it counts.
const SWIPE_START = 14

function MicMark() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="5.75" y="1.75" width="4.5" height="8" rx="2.25" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3.5 7.75a4.5 4.5 0 0 0 9 0M8 12.25v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function PlusMark() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

const Field = forwardRef(function Field({ state, folded, win, hint = null, marginalia = null, onMarginalia = null, marginaliaOpen = false, frameworks = null, onFrameworks = null, frameworksOpen = false, features = [], ink = null, inkKey = null, onInput, onKeyDown, onFocus, onBlur, onOpen, onHover, onLeave, phone = false, plus = null, voice = null, onSend = null, onSwipe = null, pill = null, frameworksPill = null }, ref) {
  const { i18n } = useLingui()
  const { mode } = state
  const held = showsHeld(state)
  // A prompt tapped into on a phone shows its pills on a second row.
  const two = phone && mode === 'prompt' && state.focused && !folded && Boolean(marginalia)
  const mic = Boolean(voice) && voice.status !== 'checking'
  // A swipe across the field, by touch: told as it moves and when it ends.
  const swipe = useRef(null)
  const touch = phone && onSwipe && !folded
    ? {
      onPointerDown: (e) => { if (e.pointerType !== 'mouse') swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY, on: false } },
      onPointerMove: (e) => {
        const s = swipe.current
        if (!s || s.id !== e.pointerId) return
        const dx = e.clientX - s.x
        if (!s.on && Math.abs(dx) > SWIPE_START && Math.abs(dx) > 1.4 * Math.abs(e.clientY - s.y)) {
          s.on = true
          try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* the browser decides */ }
        }
        if (s.on) onSwipe({ dx, done: false })
      },
      onPointerUp: (e) => {
        const s = swipe.current
        swipe.current = null
        if (s?.on && s.id === e.pointerId) onSwipe({ dx: e.clientX - s.x, done: true })
      },
      onPointerCancel: () => {
        const s = swipe.current
        swipe.current = null
        if (s?.on) onSwipe({ dx: 0, done: true })
      },
    }
    : {}
  const placeholder = held ? i18n._(COPY.field.heldPrompt) : hint ?? (phone ? i18n._(COPY.modes[mode]) : undefined)
  return (
    <div className={`ch-field ${mode}${folded ? ' min' : ''}${marginalia ? ' with-marg' : ''}${held ? ' held' : ''}${mic ? ' with-mic' : ''}${phone ? ' phone' : ''}${two ? ' two' : ''}`} role="search" onMouseEnter={onHover} onMouseLeave={onLeave} {...touch}>
      <div className={`ch-fillwrap${mode === 'command' ? ' on' : ''}`}><div className="ch-fill command"><CommandFill /></div></div>
      <div className={`ch-fillwrap${mode === 'prompt' ? ' on' : ''}`}><div className="ch-fill prompt"><PromptFill /></div></div>
      {!phone && <span className={`ch-chip search${mode === 'search' ? ' on' : ''}`} aria-hidden="true">{i18n._(COPY.modes.search)}</span>}
      {!phone && <span className={`ch-chip command${mode === 'command' ? ' on' : ''}`} aria-hidden="true">{i18n._(COPY.modes.command)}</span>}
      {!phone && <span className={`ch-chip prompt${mode === 'prompt' ? ' on' : ''}`} aria-hidden="true">{i18n._(COPY.modes.prompt)}</span>}
      {phone && plus && (
        <button type="button" className={`ch-plus${plus.open ? ' on' : ''}`} aria-label={i18n._(COPY.plus.open)} aria-expanded={plus.open} aria-haspopup="true"
          tabIndex={folded ? -1 : 0} onMouseDown={(e) => e.preventDefault()} onClick={plus.onToggle}>
          <PlusMark />
        </button>
      )}
      <input
        ref={ref}
        value={shownValue(state)}
        placeholder={placeholder}
        onChange={(e) => onInput(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        tabIndex={folded ? -1 : 0}
        aria-hidden={folded ? 'true' : undefined}
        aria-label={i18n._(COPY.shell.field)}
        aria-description={i18n._(COPY.modes[mode])}
        autoComplete="off"
        spellCheck={false}
        dir="auto"
      />
      {/* On a phone, the pills on the second row, and nothing in the field's one row. */}
      {two && (
        <span className="ch-pills">
          {frameworks && onFrameworks && (
            <button type="button" className="ch-pill" aria-expanded={frameworksOpen} title={i18n._(COPY.field.frameworkHelp)} onMouseDown={(e) => e.preventDefault()} onClick={onFrameworks}>{frameworksPill ?? frameworks}</button>
          )}
          {onMarginalia
            ? <button type="button" className="ch-pill" aria-expanded={marginaliaOpen} title={i18n._(COPY.field.answeredHelp)} onMouseDown={(e) => e.preventDefault()} onClick={onMarginalia}>{pill ?? marginalia}</button>
            : <span className="ch-pill">{pill ?? marginalia}</span>}
        </span>
      )}
      {/* Features of input: web search and files (stage 13, piece 6; C248); voice is the microphone. */}
      {marginalia && !phone && features.map((f) => (f.off
        ? <span key={f.key} className="ch-marg ch-fmarg feat off" title={f.title}>{f.words}</span>
        : (
          <button key={f.key} type="button" className={`ch-marg ch-fmarg pick feat${f.on ? ' on' : ''}`} aria-pressed={f.on} title={f.title}
            onMouseDown={(e) => e.preventDefault()} onClick={f.onClick}>{f.words}</button>
        )))}
      {/* The frameworks on this chat, before who answers (C164). */}
      {marginalia && !phone && frameworks && onFrameworks && (
        <button type="button" className="ch-marg ch-fmarg pick fw" aria-expanded={frameworksOpen} title={i18n._(COPY.field.frameworkHelp)} onMouseDown={(e) => e.preventDefault()} onClick={onFrameworks}>{frameworks}</button>
      )}
      {marginalia && !phone && (onMarginalia
        ? <button type="button" className="ch-marg ch-fmarg pick" aria-expanded={marginaliaOpen} title={i18n._(COPY.field.answeredHelp)} onMouseDown={(e) => e.preventDefault()} onClick={onMarginalia}>{marginalia}</button>
        : <span className="ch-marg ch-fmarg">{marginalia}</span>)}
      {/* The microphone keeps the caret, and a selection, where they are. */}
      {mic && (
        <button type="button" className={`ch-mic${voice.listening ? ' on' : ''}${voice.off ? ' off' : ''}`} aria-label={i18n._(voice.listening ? COPY.field.listening : COPY.field.speak)} aria-pressed={voice.listening} title={voice.title}
          tabIndex={folded ? -1 : 0} onPointerDown={(e) => e.preventDefault()} onMouseDown={(e) => e.preventDefault()} onClick={voice.onClick}>
          <MicMark />
        </button>
      )}
      {/* On a phone the ink pot sends the prompt (Stefan: "keep inkpot as send"). */}
      {phone && onSend && mode === 'prompt' && !folded
        ? (
          <button type="button" className="ch-gslot ch-send" aria-label={i18n._(COPY.field.send)} onMouseDown={(e) => e.preventDefault()} onClick={onSend}>
            <Quill on ink={ink} inkKey={inkKey} />
          </button>
        )
        : (
          // In a prompt the pot takes the pointer, to drain under it (chrome.css); a click there puts the caret in the field.
          <div className="ch-gslot" aria-hidden="true" onMouseDown={mode === 'prompt' && !folded ? (e) => { e.preventDefault(); if (ref && typeof ref === 'object') ref.current?.focus() } : undefined}>
            <Magnifier on={mode === 'search'} />
            <Quill on={mode === 'prompt'} ink={ink} inkKey={inkKey} />
          </div>
        )}
      <MoonMark folded={folded && mode === 'command'} win={win} />
      {folded && (
        <button type="button" className="ch-fold-button" aria-label={i18n._(COPY.hints.minimised)} onClick={onOpen} />
      )}
    </div>
  )
})

export default Field
