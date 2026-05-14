// file-shelf@1.0 — staged-files panel for data-workspace rooms.
//
// PR-11a — first of the five Pelican-decomposition entries. Owns the
// `files` and `file_data` IndexedDB stores via FileShelfContext (mounted
// at App.jsx between CollabModeProvider and BrowserRouter, see audit
// §2.8a). Other room components — chart-canvas, table-canvas,
// summary-dashboard, column-inspector — read the same staged-files
// state through the same hook; file-shelf is the only writer.
//
// Tier: composer. Uploads write to IndexedDB; toggling a file in/out
// of context is a write; both are user-action triggered. No autonomous
// model calls live in this component.
//
// Bus contract: publishes `file-context-changed` on every change to the
// staged-files set or the in-context subset (per audit §2.8a documented
// Phase 1 events). Payload shape: { fileIds, conversationId } where
// fileIds is the array of context-file ids. The audit's documented
// payload format is preserved verbatim. No subscriber ships in Phase 1
// — components that need this state read FileShelfContext directly,
// because the bus is non-sticky and a late subscriber would miss the
// most recent payload. The publish call still fires so future plugin
// components and the editor's continuous-validation surface (Phase 2)
// have a known event to subscribe to.

import { useEffect, useRef } from 'react'
import FileShelf from '../../components/core/FileShelf'
import { useChat } from '../../stores/ChatContext'
import { useFileShelf } from '../../stores/FileShelfContext'

function FileShelfRender({ hostAPI }) {
  const { activeConversationId } = useChat()
  const { contextFiles } = useFileShelf()

  // Publish file-context-changed whenever the context-files set
  // identity changes. The set is rebuilt on every mutation, so a
  // shallow-identity comparison suffices.
  const lastPublished = useRef(null)
  useEffect(() => {
    if (!hostAPI?.publish) return
    if (lastPublished.current === contextFiles) return
    lastPublished.current = contextFiles
    hostAPI.publish('file-context-changed', {
      fileIds: Array.from(contextFiles),
      conversationId: activeConversationId,
    })
  }, [contextFiles, activeConversationId, hostAPI])

  return <FileShelf conversationId={activeConversationId} />
}

function FileShelfPreview() {
  return (
    <div className="border border-[var(--p-border)] rounded-xl bg-white p-3 max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-[#787774] uppercase tracking-wider">File shelf</span>
        <span className="text-[10px] text-[#787774]">2 in context</span>
      </div>
      <div className="space-y-1.5 mb-2">
        {[
          { name: 'sales-q3.csv', type: 'csv', rows: 12480 },
          { name: 'forecast.xlsx', type: 'xlsx', rows: 240 },
        ].map((f) => (
          <div key={f.name} className="rounded-xl border border-[#B8A070]/30 bg-[#B8A070]/5 px-3 py-2">
            <div className="text-xs font-semibold text-[#191919] truncate">{f.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase"
                style={{ backgroundColor: f.type === 'csv' ? '#0F7B6C15' : '#D9730D15', color: f.type === 'csv' ? '#0F7B6C' : '#D9730D' }}
              >
                {f.type}
              </span>
              <span className="text-[10px] text-[#787774]">{f.rows.toLocaleString()} rows</span>
            </div>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-[#787774] italic">
        Preview only — production render binds to FileShelfContext.
      </div>
    </div>
  )
}

export default {
  name: 'file-shelf',
  version: '1.0',
  displayName: 'File shelf',
  author: 'parliament',
  description: 'Staged files for data-workspace rooms. Drop CSV/XLSX/JSON; toggle which files Claude can reference.',
  icon: 'FolderOpen',
  surfaces: ['room'],
  tier: 'composer',
  slotTargets: [
    { slot: 'left-rail', primary: true },
    { slot: 'right-rail', fallbackOk: true },
    { slot: 'sheet', fallbackOk: true },
  ],
  capabilityRequirements: ['storage:read', 'storage:write'],
  configSchema: {
    acceptedTypes: {
      type: 'string',
      default: '.csv,.tsv,.xlsx,.xls,.json',
      label: 'Accepted file extensions (comma-separated)',
    },
  },
  render: FileShelfRender,
  previewRender: FileShelfPreview,
}
