// Inline-text renderers — wordDiff overlay for tracked-changes mode,
// HighlightedText for the active-comment selection highlight, and the
// ClaudeInlineSuggestionPreview for showing find→replace edits inside
// a paragraph. Lifted verbatim from V1 secretarybird ChatLayout.jsx.

import { wordDiff } from './diff'

const DELETION = '#EF4444'
const INSERTION = '#4A7AE5'
const SUGGESTION = '#22C55E'

export function DiffText({ baseline, text }) {
  const t = text == null ? '' : String(text)
  const b = baseline == null ? '' : String(baseline)
  if (!b || b === t) return <span style={{ color: 'var(--p-text-primary)' }}>{t}</span>
  const parts = wordDiff(b, t)
  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'unchanged') return <span key={i} style={{ color: 'var(--p-text-primary)' }}>{part.text}</span>
        if (part.type === 'deleted') {
          return (
            <span
              key={i}
              style={{ color: DELETION, textDecoration: 'line-through', opacity: 0.7 }}
            >
              {part.text}
            </span>
          )
        }
        return (
          <span
            key={i}
            style={{ color: INSERTION, fontWeight: 500, borderBottom: `1.5px solid ${INSERTION}50` }}
          >
            {part.text}
          </span>
        )
      })}
    </>
  )
}

export function HighlightedText({ text, highlight }) {
  if (!highlight) return <span style={{ color: 'var(--p-text-primary)' }}>{text}</span>
  const idx = text.indexOf(highlight)
  if (idx === -1) return <span style={{ color: 'var(--p-text-primary)' }}>{text}</span>
  return (
    <>
      {idx > 0 && <span style={{ color: 'var(--p-text-primary)' }}>{text.slice(0, idx)}</span>}
      <mark
        style={{
          backgroundColor: 'rgba(255, 213, 50, 0.38)',
          color: 'var(--p-text-primary)',
          borderRadius: '2px',
          padding: '1px 0',
        }}
      >
        {text.slice(idx, idx + highlight.length)}
      </mark>
      {idx + highlight.length < text.length && (
        <span style={{ color: 'var(--p-text-primary)' }}>{text.slice(idx + highlight.length)}</span>
      )}
    </>
  )
}

export function ClaudeInlineSuggestionPreview({ text, suggestion }) {
  if (!suggestion.find) {
    return <span style={{ color: SUGGESTION, fontWeight: 500 }}>{suggestion.replace}</span>
  }
  const idx = text.indexOf(suggestion.find)
  if (idx === -1) {
    return (
      <>
        <span style={{ color: 'var(--p-text-primary)' }}>{text}</span>
        <span style={{ color: SUGGESTION, fontWeight: 500 }}> → {suggestion.replace}</span>
      </>
    )
  }
  return (
    <>
      <span style={{ color: 'var(--p-text-primary)', opacity: 0.45 }}>{text.slice(0, idx)}</span>
      <span style={{ color: SUGGESTION, textDecoration: 'line-through', opacity: 0.75 }}>{suggestion.find}</span>
      <span
        style={{ color: SUGGESTION, fontWeight: 500, borderBottom: `1.5px solid ${SUGGESTION}50` }}
      >
        {suggestion.replace}
      </span>
      <span style={{ color: 'var(--p-text-primary)', opacity: 0.45 }}>
        {text.slice(idx + suggestion.find.length)}
      </span>
    </>
  )
}
