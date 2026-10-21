import { forwardRef } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { fieldValue } from '../shell/field'
import { CommandFill, PromptFill, Magnifier, Quill } from './Fills'

// The field: one input read three ways (bar reference, "The field"). The
// left names the mode, the right carries its glyph, and the fill wipes in
// from the left when the mode changes. Its behaviour is the reducer in
// src/shell/field.js; keys that reach it from elsewhere are in keys.js.

const Field = forwardRef(function Field({ state, onInput, onKeyDown, onFocus, onBlur }, ref) {
  const { i18n } = useLingui()
  const { mode } = state
  return (
    <div className={`ch-field ${mode}`} role="search">
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
        aria-label={i18n._(COPY.shell.field)}
        aria-description={i18n._(COPY.modes[mode])}
        autoComplete="off"
        spellCheck={false}
        dir="auto"
      />
      <div className="ch-gslot" aria-hidden="true">
        <Magnifier on={mode === 'search'} />
        <Quill on={mode === 'prompt'} />
      </div>
    </div>
  )
})

export default Field
