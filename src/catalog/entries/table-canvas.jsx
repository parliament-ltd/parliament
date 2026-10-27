// table-canvas@1.0 — sortable, paginated data grid for data-workspace rooms.
//
// PR-11a — third of the five Pelican-decomposition entries. Reader tier.
// Reads the active file's parsed data via FileShelfContext, renders a
// sticky-header table with click-to-sort, right-aligned numerics, and
// "Load more" pagination.
//
// Sort state is local — V1 Pelican kept it on PelicanContext so it
// persisted across canvas-tab toggles, but the V2 decomposition stacks
// canvases vertically (no toggle), so per-component state is fine.
//
// Soft dependency on file-shelf@1.0 — same contract as chart-canvas.

import { useFileShelf } from '../../stores/FileShelfContext'
import TableCanvas from '../../components/core/TableCanvas'

function TableCanvasRender({ config = {} }) {
  const { activeFileId } = useFileShelf()
  // Config fields (density, columns) are reserved; they map onto
  // TableCanvas internals once that surface is wired in a follow-up.
  void config
  return (
    <div className="min-h-[300px] max-h-[480px] overflow-hidden border-t border-[var(--p-border)] flex flex-col">
      <TableCanvas fileId={activeFileId} filters={[]} />
    </div>
  )
}

function TableCanvasPreview() {
  return (
    <div className="border border-[var(--p-border)] rounded-xl bg-white max-w-sm overflow-hidden">
      <div className="px-3 py-2 bg-[#FAFAFA] border-b border-[#F1F1EF]">
        <span className="text-[10px] font-medium text-[#787774] uppercase tracking-wider">Table preview</span>
      </div>
      <table className="w-full text-[10px]">
        <thead>
          <tr className="text-[#787774] uppercase tracking-wider">
            <th className="text-left px-3 py-1.5">Col A</th>
            <th className="text-right px-3 py-1.5">Value</th>
            <th className="text-left px-3 py-1.5">Region</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['alpha', '12,340', 'NA'],
            ['beta', '8,902', 'EU'],
            ['gamma', '4,510', 'APAC'],
          ].map(row => (
            <tr key={row[0]} className="border-t border-[#F1F1EF]">
              <td className="px-3 py-1.5">{row[0]}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{row[1]}</td>
              <td className="px-3 py-1.5">{row[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default {
  name: 'table-canvas',
  version: '1.0',
  displayName: 'Table canvas',
  author: 'parliament',
  description: 'Sortable, paginated grid over the active dataset. Sticky header, right-aligned numerics.',
  icon: 'Table2',
  surfaces: ['room'],
  tier: 'reader',
  slotTargets: [
    { slot: 'canvas', primary: true },
    { slot: 'msg-area', fallbackOk: true },
  ],
  capabilityRequirements: ['storage:read'],
  configSchema: {
  },
  softDependencies: [
    { component: 'file-shelf@1.0', fallbackUI: 'data-source-needed' },
  ],
  render: TableCanvasRender,
  previewRender: TableCanvasPreview,
}
