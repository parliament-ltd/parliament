// Friendly Claude model display names (PR-19g).
//
// Promoted out of blueprint-render.jsx so the homepage blueprint AND the
// PR-19g RoomDetailsOverlay both render the same human-readable model
// label for a given raw model id. Add new entries as additional model
// versions land in PROVIDERS or the conversation.model surface.

const MODEL_DISPLAY = Object.freeze({
  'claude-sonnet':         'Claude Sonnet',
  'claude-sonnet-4-6':     'Claude Sonnet 4.6',
  'claude-sonnet-4-7':     'Claude Sonnet 4.7',
  'claude-opus':           'Claude Opus',
  'claude-opus-4-7':       'Claude Opus 4.7',
  'claude-haiku':          'Claude Haiku',
  'claude-haiku-4-5':      'Claude Haiku 4.5',
  'claude-haiku-4-5-20251001': 'Claude Haiku 4.5',
})

/**
 * Convert a raw conversation.model value to a friendly display label.
 * Unknown ids fall through to a kebab → Title Case humanization so we
 * still render something sensible.
 */
export function modelLabel(raw) {
  if (!raw) return ''
  const mapped = MODEL_DISPLAY[raw]
  if (mapped) return mapped
  return raw
    .split('-')
    .map(s => s.length > 0 ? s[0].toUpperCase() + s.slice(1) : '')
    .join(' ')
}
