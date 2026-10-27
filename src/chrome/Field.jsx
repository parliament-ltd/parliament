import { forwardRef } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { fieldValue } from '../shell/field'
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

const Field = forwardRef(function Field({ state, folded, win, marginalia = null, onMarginalia = null, marginaliaOpen = false, frameworks = null, onFrameworks = null, frameworksOpen = false, features = [], ink = null, inkKey = null, onInput, onKeyDown, onFocus, onBlur, onOpen, onHover, onLeave }, ref) {
  const { i18n } = useLingui()
  const { mode } = state
  return (
    <div className={`ch-field ${mode}${folded ? ' min' : ''}${marginalia ? ' with-marg' : ''}`} role="search" onMouseEnter={onHover} onMouseLeave={onLeave}>
      <div className={`ch-fillwrap${mode === 'command' ? ' on' : ''}`}><div className="ch-fill command"><CommandFill /></div></div>
      <div className={`ch-fillwrap${mode === 'prompt' ? ' on' : ''}`}><div className="ch-fill prompt"><PromptFill /></div></div>
      <span className={`ch-chip search${mode === 'search' ? ' on' : ''}`} aria-hidden="true">{i18n._(COPY.modes.search)}</span>
      <span className={`ch-chip command${mode === 'command' ? ' on' : ''}`} aria-hidden="true">{i18n._(COPY.modes.command)}</span>
      <span className={`ch-chip prompt${mode === 'prompt' ? ' on' : ''}`} aria-hidden="true">{i18n._(COPY.modes.prompt)}</span>
      <input
        ref={ref}
        value={fieldValue(state)}
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
      {/* Features of input: web search, voice, files (stage 13, piece 6; C248). */}
      {marginalia && features.map((f) => (f.off
        ? <span key={f.key} className="ch-marg ch-fmarg feat off" title={f.title}>{f.words}</span>
        : (
          <button key={f.key} type="button" className={`ch-marg ch-fmarg pick feat${f.on ? ' on' : ''}`} aria-pressed={f.on} title={f.title}
            onMouseDown={(e) => e.preventDefault()} onClick={f.onClick}>{f.words}</button>
        )))}
      {/* The frameworks on this chat, before who answers (C164). */}
      {marginalia && frameworks && onFrameworks && (
        <button type="button" className="ch-marg ch-fmarg pick fw" aria-expanded={frameworksOpen} title={i18n._(COPY.field.frameworkHelp)} onMouseDown={(e) => e.preventDefault()} onClick={onFrameworks}>{frameworks}</button>
      )}
      {marginalia && (onMarginalia
        ? <button type="button" className="ch-marg ch-fmarg pick" aria-expanded={marginaliaOpen} title={i18n._(COPY.field.answeredHelp)} onMouseDown={(e) => e.preventDefault()} onClick={onMarginalia}>{marginalia}</button>
        : <span className="ch-marg ch-fmarg">{marginalia}</span>)}
      <div className="ch-gslot" aria-hidden="true">
        <Magnifier on={mode === 'search'} />
        <Quill on={mode === 'prompt'} ink={ink} inkKey={inkKey} />
      </div>
      <MoonMark folded={folded && mode === 'command'} win={win} />
      {folded && (
        <button type="button" className="ch-fold-button" aria-label={i18n._(COPY.hints.minimised)} onClick={onOpen} />
      )}
    </div>
  )
})

export default Field
