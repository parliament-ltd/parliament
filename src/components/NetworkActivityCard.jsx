import { useSyncExternalStore } from 'react'
import { Trash2, Activity } from 'lucide-react'
import { Card, SectionLabel } from './index'
import { getEntries, subscribe, clearLog } from '../lib/networkLog'
import { gateway, networkByHost } from '../net'

// The network log in today's Settings, grouped by host (stage 7, piece 2;
// privacy copy draft, item 17). Each host is named by the provider or source
// it belongs to on the list, with what made its requests; a host on no list
// says so. Settings v1 replaces this card at stage 9.

function formatTime(ts) {
  const d = new Date(ts)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  const s = d.getSeconds().toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

export default function NetworkActivityCard() {
  const entries = useSyncExternalStore(subscribe, getEntries, getEntries)
  const requests = useSyncExternalStore(gateway.subscribe, gateway.requests, gateway.requests)
  const groups = networkByHost(entries, requests)

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[var(--p-text-secondary)]" />
          <SectionLabel>Network activity</SectionLabel>
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
        Requests made by this page, grouped by host. Every host should be a provider or source you use. The list is kept in memory and clears when you reload.
      </p>
      {groups.length === 0 ? (
        <div className="text-xs text-[var(--p-text-muted)] py-6 text-center border border-dashed border-[var(--p-border)] rounded-md">
          No requests yet.
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto border border-[var(--p-border)] rounded-md divide-y divide-[var(--p-border-subtle)]">
          {groups.map((g) => (
            <div key={g.host} className="px-3 py-2 text-[11px]">
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-[var(--p-text-primary)]">{g.host}</span>
                <span className="italic text-[var(--p-text-secondary)]">
                  {g.name ?? (g.self ? 'this page' : 'not a provider or source on the list')}
                </span>
                <span className="ml-auto text-[var(--p-text-muted)] tabular-nums">
                  {g.count === 1 ? '1 request' : `${g.count} requests`}
                  {g.failed ? `, ${g.failed} failed` : ''}
                  {` · last ${formatTime(g.last)}`}
                </span>
              </div>
              {g.labels.length > 0 && (
                <div className="mt-0.5 text-[var(--p-text-secondary)]">
                  {g.labels.map((l) => (l.count > 1 ? `${l.label} ×${l.count}` : l.label)).join(' · ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
