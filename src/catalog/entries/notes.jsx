// notes@1.0 — list of conversation notes (per-message and per-conversation).
//
// Wraps src/components/core/NoteList.jsx without moving or modifying it.
// Reader tier — no model calls; reads/writes the `notes` IndexedDB store
// owned by this component.
//
// V1 placed per-message notes inside MessageCard; V2 surfaces them through
// this side-panel component. The "Add note here" message-action contribution
// targets a specific message id; per-conversation notes are added via the
// component's own UI surface (PR-6+ wiring; the V1 NoteList is a stub
// without an inline add form yet).

import NoteList from '../../components/core/NoteList'
import NotesRender from './notes-render'

const SAMPLE_NOTES = [
  { id: 'n1', text: 'Cross-reference with the warm-grey palette doc.' },
  { id: 'n2', text: "Ask about whether 'gold' means metallic or dusty here." },
  { id: 'n3', text: 'Pull a swatch comparison for the next message.' },
]

export default {
  name: 'notes',
  version: '1.0',
  displayName: 'Notes',
  author: 'parliament',
  description: 'Saved notes for the active conversation, per-message or general.',
  icon: 'StickyNote',
  surfaces: ['room'],
  tier: 'reader',
  slotTargets: [
    { slot: 'left-rail',        primary: true },
    { slot: 'right-rail',       fallbackOk: true },
    { slot: 'right-rail-extra', fallbackOk: true },
    { slot: 'margin',           fallbackOk: true },
    { slot: 'sheet',            fallbackOk: true },
  ],
  capabilityRequirements: ['storage:read', 'storage:write'],
  configSchema: {
    sortOrder: {
      type: 'enum',
      options: ['newest', 'oldest', 'message-order'],
      default: 'newest',
      label: 'Note sort order',
    },
  },
  contributions: {
    messageActions: [
      {
        id: 'add-note-here',
        label: 'Add note here',
      },
    ],
  },

  // Production render — self-binds to AnnotationsContext (PR-10a.6).
  render: NotesRender,

  previewRender: () => (
    <div className="border border-[var(--p-border)] rounded-xl bg-white p-3 max-w-sm">
      <NoteList notes={SAMPLE_NOTES} onEdit={() => {}} onDelete={() => {}} />
    </div>
  ),
}
