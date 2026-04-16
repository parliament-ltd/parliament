import { useSyncExternalStore } from 'react'
import { Trash2, Activity } from 'lucide-react'
import { Card, SectionLabel } from './index'
import { getEntries, subscribe, clearLog } from '../lib/networkLog'

function formatTime(ts) {
  const d = new Date(ts)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  const s = d.getSeconds().toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

function statusColor(entry) {
  if (entry.error || entry.status === 0) return '#E03E3E'
  if (entry.status >= 200 && entry.status < 300) return '#0F7B6C'
  if (entry.status >= 400) return '#E03E3E'
  return '#D9730D'
}

export default function NetworkActivityCard() {
  const entries = useSyncExternalStore(subscribe, getEntries, getEntries)
  const reversed = [...entries].reverse()

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[var(--p-text-secondary)]" />
          <SectionLabel>Network Activity</SectionLabel>
        </div>
        {entries.length > 0 && (
          <button
            onClick={clearLog}
            className="inline-flex items-center gap-1 text-[11px] text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)] transition-colors"
            title="Clear log"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>
      <p className="text-xs text-[var(--p-text-secondary)] leading-relaxed mt-2 mb-3">
        Every outbound network request this app makes is recorded here. The log resets when you reload the page. Only requests to api.anthropic.com should appear.
      </p>
      {entries.length === 0 ? (
        <div className="text-xs text-[var(--p-text-muted)] py-6 text-center border border-dashed border-[var(--p-border)] rounded-md">
          No requests yet. Requests will appear here when you send a message.
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto border border-[var(--p-border)] rounded-md divide-y divide-[var(--p-border-subtle)]">
          {reversed.map(entry => (
            <div key={entry.id} className="flex items-center gap-2 px-3 py-1.5 text-[11px]">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: statusColor(entry) }}
                title={entry.error || `Status ${entry.status}`}
              />
              <span className="text-[var(--p-text-muted)] tabular-nums w-[62px] flex-shrink-0">
                {formatTime(entry.timestamp)}
              </span>
              <span className="font-medium text-[var(--p-text-primary)] w-[42px] flex-shrink-0">
                {entry.method}
              </span>
              <span className="text-[var(--p-text-primary)] flex-shrink-0">
                {entry.host}
              </span>
              <span className="text-[var(--p-text-secondary)] truncate flex-1" title={entry.path}>
                {entry.path}
              </span>
              <span className="text-[var(--p-text-muted)] tabular-nums flex-shrink-0">
                {entry.status === 0 ? 'err' : entry.status}
              </span>
              <span className="text-[var(--p-text-muted)] tabular-nums w-[42px] text-right flex-shrink-0">
                {entry.durationMs != null ? `${entry.durationMs}ms` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
