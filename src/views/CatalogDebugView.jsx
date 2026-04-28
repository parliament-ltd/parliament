// Dev-only inspection surface for the V2 catalog (PR-2).
//
// Reachable at /catalog when import.meta.env.DEV is true. Lists every
// registered manifest entry, shows its validation status, and renders each
// entry's previewRender (or render) so authors can sanity-check shapes
// without booting a full RoomShell (PR-3).
//
// This view does NOT touch IndexedDB. It reads only from the in-memory
// registry in src/catalog/index.js.

import { useState } from 'react'
import { listEntries, validateManifest, entryRef } from '../catalog'

const HEADER_LABEL_CLS = 'text-xs font-medium text-[var(--p-text-secondary)] uppercase tracking-wider'

export default function CatalogDebugView() {
  const entries = listEntries()
  const [openRef, setOpenRef] = useState(entries[0] ? entryRef(entries[0]) : null)

  return (
    <div className="min-h-screen bg-[var(--p-bg-primary)] p-8">
      <header className="max-w-5xl mx-auto mb-8">
        <p className={HEADER_LABEL_CLS}>Dev only</p>
        <h1 className="text-2xl font-semibold text-[var(--p-text-primary)] mt-2">
          Catalog
        </h1>
        <p className="text-sm text-[var(--p-text-secondary)] mt-2 max-w-prose">
          {entries.length} component{entries.length === 1 ? '' : 's'} registered. Tier
          rule: components that make model calls in direct response to a user
          action are Composer (or below); autonomous model calls are Agent
          (Phase 2 only). See{' '}
          <code className="text-xs bg-[var(--p-code-bg)] px-1.5 py-0.5 rounded">
            refactor/tier-classification.md
          </code>
          .
        </p>
      </header>

      <main className="max-w-5xl mx-auto space-y-4">
        {entries.map((entry) => {
          const ref = entryRef(entry)
          const result = validateManifest(entry)
          const isOpen = openRef === ref
          return (
            <EntryCard
              key={ref}
              entry={entry}
              refStr={ref}
              result={result}
              isOpen={isOpen}
              onToggle={() => setOpenRef(isOpen ? null : ref)}
            />
          )
        })}
      </main>
    </div>
  )
}

function EntryCard({ entry, refStr, result, isOpen, onToggle }) {
  const Preview = entry.previewRender || entry.render
  const tierColor = TIER_COLORS[entry.tier] || 'var(--p-text-muted)'

  return (
    <section className="px-5 py-4 rounded-xl border border-[var(--p-border)] bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <h2 className="text-base font-medium text-[var(--p-text-primary)]">
            {entry.displayName}{' '}
            <span className="text-xs font-mono text-[var(--p-text-muted)]">
              {refStr}
            </span>
          </h2>
          <p className="text-xs text-[var(--p-text-secondary)] mt-1">
            {entry.description}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span
            className="text-xs uppercase tracking-wider"
            style={{ color: tierColor }}
          >
            {entry.tier}
          </span>
          <ValidationBadge result={result} />
        </div>
      </button>

      {isOpen && (
        <div className="mt-5 pt-5 border-t border-[var(--p-border-subtle)] space-y-5">
          <ManifestSummary entry={entry} />
          {result.errors.length > 0 && <ErrorList items={result.errors} />}
          {result.warnings.length > 0 && <WarningList items={result.warnings} />}
          <PreviewBlock label="Preview" Preview={Preview} />
        </div>
      )}
    </section>
  )
}

function ValidationBadge({ result }) {
  if (!result.valid) {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-[var(--p-error-bg,rgba(224,62,62,0.08))] text-[var(--p-error,#E03E3E)]">
        invalid
      </span>
    )
  }
  if (result.warnings.length > 0) {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-[rgba(217,115,13,0.08)] text-[var(--p-warning,#D9730D)]">
        warn
      </span>
    )
  }
  return (
    <span className="text-xs px-2 py-1 rounded-full bg-[rgba(15,123,108,0.08)] text-[var(--p-success,#0F7B6C)]">
      valid
    </span>
  )
}

function ManifestSummary({ entry }) {
  const slotList = entry.slotTargets
    .map(t => `${t.slot}${t.primary ? ' (primary)' : ''}${t.fallbackOk ? ' (fallback)' : ''}`)
    .join(', ')
  const caps = entry.capabilityRequirements?.length
    ? entry.capabilityRequirements.join(', ')
    : '(none)'
  const configKeys = Object.keys(entry.configSchema || {})
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
      <Field label="Author" value={entry.author} />
      <Field label="Slot targets" value={slotList} />
      <Field label="Capabilities" value={caps} />
      <Field
        label={`Config schema (${configKeys.length})`}
        value={configKeys.length === 0 ? '(empty)' : configKeys.join(', ')}
      />
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <p className={HEADER_LABEL_CLS}>{label}</p>
      <p className="text-sm text-[var(--p-text-primary)] mt-1 font-mono">{value}</p>
    </div>
  )
}

function ErrorList({ items }) {
  return (
    <div>
      <p className={HEADER_LABEL_CLS} style={{ color: 'var(--p-error,#E03E3E)' }}>
        Errors
      </p>
      <ul className="mt-2 space-y-1 text-sm text-[var(--p-error,#E03E3E)]">
        {items.map((m, i) => <li key={i}>• {m}</li>)}
      </ul>
    </div>
  )
}

function WarningList({ items }) {
  return (
    <div>
      <p className={HEADER_LABEL_CLS} style={{ color: 'var(--p-warning,#D9730D)' }}>
        Warnings
      </p>
      <ul className="mt-2 space-y-1 text-sm text-[var(--p-warning,#D9730D)]">
        {items.map((m, i) => <li key={i}>• {m}</li>)}
      </ul>
    </div>
  )
}

function PreviewBlock({ label, Preview }) {
  return (
    <div>
      <p className={HEADER_LABEL_CLS}>{label}</p>
      <div className="mt-2">
        {Preview ? <Preview /> : (
          <p className="text-sm text-[var(--p-text-muted)]">No preview available.</p>
        )}
      </div>
    </div>
  )
}

const TIER_COLORS = {
  utility:    'var(--p-text-secondary)',
  reader:     'var(--p-success, #0F7B6C)',
  composer:   'var(--p-accent-gold, #B8A070)',
  integrator: 'var(--p-warning, #D9730D)',
  agent:      'var(--p-error, #E03E3E)',
  persister:  'var(--p-text-muted)',
}
