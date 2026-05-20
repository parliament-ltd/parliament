// document-canvas@1.0 — paper-style writing surface for drafting-desk rooms.
//
// PR-11b — first of the three Secretarybird-decomposition entries. Owns
// the `sbrd_documents` IndexedDB store via the new App.jsx-mounted
// DocumentContext (mounted alongside FileShelfContext / AnnotationsContext
// / BranchPanelContext / CollabModeContext, see audit §2.8a). The other
// two PR-11b components — claude-comments and ripple-analysis — read the
// same paragraphs / comments / suggestion / ripple state through the
// same hook; document-canvas is the only writer (paragraph edits,
// comment add/delete, suggestion accept/reject, ripple dismiss, Submit
// & Branch).
//
// Tier: composer. Edits and comment writes go to IndexedDB; Submit &
// Branch fires a Composer-tier Claude call (via DocumentContext) and
// then creates a branch via createConversation. All writes are
// user-action triggered. No autonomous model calls live in this
// component.

import DocumentCanvas from '../../components/core/DocumentCanvas'

function DocumentCanvasRender() {
  // The render is hook-driven; DocumentCanvas reads everything off
  // useDocument() / useChat(), so there's no prop wiring here.
  return <DocumentCanvas />
}

function DocumentCanvasPreview() {
  return (
    <div className="border border-[var(--p-border)] rounded-xl bg-white p-4 max-w-md">
      <div className="text-[10px] font-medium text-[#787774] uppercase tracking-wider mb-3">
        Document canvas
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-3 bg-[#F1F1EF] rounded w-3/4" />
        <div className="h-3 bg-[#F1F1EF] rounded w-full" />
        <div className="h-3 bg-[#F1F1EF] rounded w-5/6" />
        <div className="h-3 bg-[#F1F1EF] rounded w-2/3" />
      </div>
      <div className="text-[10px] text-[#787774] italic">
        Preview only — production render binds to DocumentContext.
      </div>
    </div>
  )
}

export default {
  name: 'document-canvas',
  version: '1.0',
  displayName: 'Document canvas',
  author: 'parliament',
  description: 'A paper-style writing surface with tracked changes and a slash-command menu. Submitting the draft creates a new branch and snapshots the current version.',
  icon: 'FileText',
  surfaces: ['room'],
  tier: 'composer',
  slotTargets: [
    { slot: 'document', primary: true },
  ],
  capabilityRequirements: ['storage:read', 'storage:write'],
  configSchema: {},
  render: DocumentCanvasRender,
  previewRender: DocumentCanvasPreview,
}
