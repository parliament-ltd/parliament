// column-inspector@1.0 — column schema viewer for data-workspace rooms.
//
// PR-11a — fifth and final Pelican-decomposition entry. Reader tier:
// no model calls, no IndexedDB writes. Reads the active file's
// columnStats via FileShelfContext and renders a clickable list of
// columns with type icons, null counts, and an expand-to-detail row.
//
// V1 Pelican's InspectorPanel embedded a chat surface alongside the
// schema view. The catalog decomposition splits those — messages@1.0 +
// input@1.0 handle chat in the same room. Per-column action buttons
// ("Group by", "Filter", "Visualize") that V1 used to populate the
// chat input are not wired in PR-11a; cross-component compose dispatch
// expands the bus event surface beyond the three Phase 1 events and is
// a Phase 2 concern.
//
// Soft dependency on file-shelf@1.0 — same contract as chart-canvas /
// table-canvas / summary-dashboard.

import ColumnInspector from '../../components/core/ColumnInspector'

function ColumnInspectorRender() {
  return <ColumnInspector />
}

function ColumnInspectorPreview() {
  return (
    <div className="border border-[var(--p-border)] rounded-xl bg-white p-3 max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-[#787774] uppercase tracking-wider">Schema</span>
        <span className="text-[10px] text-[#787774]">5 cols</span>
      </div>
      <div className="space-y-0.5">
        {[
          { name: 'date', type: 'date' },
          { name: 'region', type: 'string' },
          { name: 'revenue', type: 'number' },
          { name: 'customers', type: 'number' },
          { name: 'is_promo', type: 'boolean' },
        ].map(col => (
          <div key={col.name} className="flex items-center gap-2 px-3 py-1.5 rounded-lg">
            <span className="text-[11px] flex-1 truncate text-[#787774]">{col.name}</span>
            <span className="text-[9px] text-[#787774] px-1.5 py-0.5 rounded bg-[#F1F1EF]">{col.type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default {
  name: 'column-inspector',
  version: '1.0',
  displayName: 'Column inspector',
  author: 'parliament',
  description: 'A column list for your dataset, with types, null counts, sample values, and an expandable detail row.',
  icon: 'Columns3',
  surfaces: ['room'],
  tier: 'reader',
  slotTargets: [
    { slot: 'inspector', primary: true },
    { slot: 'right-rail', fallbackOk: true },
    { slot: 'right-rail-extra', fallbackOk: true },
    { slot: 'sheet', fallbackOk: true },
  ],
  capabilityRequirements: ['storage:read'],
  configSchema: {},
  softDependencies: [
    { component: 'file-shelf@1.0', fallbackUI: 'data-source-needed' },
  ],
  render: ColumnInspectorRender,
  previewRender: ColumnInspectorPreview,
}
