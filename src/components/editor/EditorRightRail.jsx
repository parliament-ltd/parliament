// EditorRightRail — properties panel.
//
// Selection-driven:
//   - room       → name, device class, scheme picker
//   - slot       → label + a hint (slot-level config land in PR-9 if needed)
//   - component  → render fields from the entry's configSchema
//
// Field types come from src/catalog/validate.js: boolean | number |
// string | enum | object | array. PR-8 renders the first four as
// editable controls; complex types (object, array) show a read-only
// hint until later PRs need them.

import { getLayoutSlots } from '../../lib/layoutMigration'
import { SCHEMES } from '../../lib/schemes'
import { findCatalogEntry, normalizeRef } from '../../lib/refs'

export default function EditorRightRail({
  mode,
  selection,
  catalogEntries,
  onUpdateConfig,
  onSetName,
  onSetDeviceClass,
  onApplyScheme,
  onRemoveComponent,
}) {
  const heading = headingFor(mode, selection, catalogEntries)

  return (
    <aside className="bg-white border-l border-[var(--p-border)] flex flex-col overflow-hidden">
      <div className="px-4 pt-3.5 pb-3 border-b border-[var(--p-border)]">
        <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--p-text-muted)] mb-1">
          {heading.kindLabel}
        </div>
        <div className="text-sm font-medium text-[var(--p-text-primary)] truncate">
          {heading.name}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {selection.type === 'room' && (
          <RoomFields
            mode={mode}
            onSetName={onSetName}
            onSetDeviceClass={onSetDeviceClass}
            onApplyScheme={onApplyScheme}
          />
        )}
        {selection.type === 'slot' && <SlotFields slotId={selection.id} mode={mode} />}
        {selection.type === 'component' && (
          <ComponentFields
            mode={mode}
            componentId={selection.id}
            catalogEntries={catalogEntries}
            onUpdateConfig={onUpdateConfig}
            onRemove={onRemoveComponent}
          />
        )}
      </div>
    </aside>
  )
}

function headingFor(mode, selection, catalogEntries) {
  if (selection.type === 'room') {
    return { kindLabel: 'Room', name: mode?.meta?.name || 'Untitled room' }
  }
  if (selection.type === 'slot') {
    const allSlots = getLayoutSlots(mode?.layout?.ref)
    const slot = allSlots.find((s) => s.id === selection.id)
    return { kindLabel: 'Spot', name: slot?.label || selection.id }
  }
  if (selection.type === 'component') {
    const spec = (mode?.components || []).find((c) => c.id === selection.id)
    const entry = findEntry(catalogEntries, spec?.ref)
    return { kindLabel: 'Component', name: entry?.displayName || spec?.ref || 'Component' }
  }
  return { kindLabel: '', name: '' }
}

function findEntry(entries, ref) {
  return findCatalogEntry(entries, ref)
}

// ─── Room fields ─────────────────────────────────────────

function RoomFields({ mode, onSetName, onSetDeviceClass, onApplyScheme }) {
  const isMobile = mode?.deviceClass === 'visual-touch-phone'
  const schemeRef = normalizeRef(mode?.scheme?.ref) || ''
  return (
    <div>
      <SectionLabel>Identity</SectionLabel>
      <Field label="Name">
        <input
          value={mode?.meta?.name || ''}
          onChange={(e) => onSetName(e.target.value)}
          className={fieldInputClass}
          placeholder="Untitled room"
        />
      </Field>

      <SectionLabel>Device class</SectionLabel>
      <Field label="Built for">
        <Segmented
          options={[
            { label: 'Desktop', value: 'visual-pointer' },
            { label: 'Mobile', value: 'visual-touch-phone' },
          ]}
          value={isMobile ? 'visual-touch-phone' : 'visual-pointer'}
          onChange={onSetDeviceClass}
        />
      </Field>

      <SectionLabel>Scheme</SectionLabel>
      <Field label="Active scheme">
        <select
          value={schemeRef || ''}
          onChange={(e) => onApplyScheme(e.target.value)}
          className={fieldInputClass}
        >
          {SCHEMES.map((s) => {
            const ref = `${s.id}@1.0`
            return <option key={ref} value={ref}>{s.displayName}</option>
          })}
        </select>
      </Field>

      <Hint>
        A room can be exported as a mode file and shared. Every choice you make here travels with it.
      </Hint>
    </div>
  )
}

// ─── Slot fields ─────────────────────────────────────────

function SlotFields({ slotId, mode }) {
  const slot = (getLayoutSlots(mode?.layout?.ref)).find((s) => s.id === slotId)
  return (
    <div>
      <Hint>Drop a component from the library to fill this spot.</Hint>
      {slot && (
        <div className="mt-3 text-[11px] text-[var(--p-text-secondary)]">
          <span className="font-medium text-[var(--p-text-primary)]">Capacity:</span>{' '}
          {slot.capacity === 'stack' ? 'multiple components, stacked' : 'one component'}
        </div>
      )}
    </div>
  )
}

// ─── Component fields (configSchema-driven) ─────────────

function ComponentFields({ mode, componentId, catalogEntries, onUpdateConfig, onRemove }) {
  const spec = (mode?.components || []).find((c) => c.id === componentId)
  const entry = findEntry(catalogEntries, spec?.ref)
  if (!entry) {
    return <Hint>This component isn't registered in the catalog. It will not render at runtime.</Hint>
  }
  const schema = entry.configSchema || {}
  const config = spec?.config || {}
  const fields = Object.entries(schema)

  // Handle the Section component config (homepage section title/meta).
  // It's stored under config.section even though configSchema doesn't
  // declare it (PR-6 stamps it onto the component spec at seed time).
  // Surface it here so editing homepages from the editor works.
  const isHomepageSection = mode?.scope === 'homepage'

  return (
    <div>
      {entry.description && (
        <Hint>{entry.description}</Hint>
      )}

      {isHomepageSection && (
        <>
          <SectionLabel>Section</SectionLabel>
          <Field label="Section title">
            <input
              value={config.section?.title || ''}
              onChange={(e) =>
                onUpdateConfig(componentId, {
                  section: { ...(config.section || {}), title: e.target.value },
                })
              }
              className={fieldInputClass}
            />
          </Field>
          <Field label="Section meta line">
            <input
              value={config.section?.meta || ''}
              onChange={(e) =>
                onUpdateConfig(componentId, {
                  section: { ...(config.section || {}), meta: e.target.value },
                })
              }
              className={fieldInputClass}
              placeholder="Optional helper text"
            />
          </Field>
        </>
      )}

      {fields.length === 0 && !isHomepageSection && (
        <Hint>This component has no configurable options.</Hint>
      )}

      {fields.length > 0 && (
        <>
          <SectionLabel>Configuration</SectionLabel>
          {fields.map(([key, field]) => (
            <ComponentField
              key={key}
              fieldKey={key}
              field={field}
              value={config[key] !== undefined ? config[key] : field.default}
              onChange={(v) => onUpdateConfig(componentId, { [key]: v })}
            />
          ))}
        </>
      )}

      <div className="border-t border-[var(--p-border)] pt-3.5 mt-5">
        <button
          onClick={() => onRemove(componentId)}
          className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[var(--p-border)] bg-transparent text-[var(--p-text-secondary)] transition-colors hover:border-[#E03E3E] hover:text-[#E03E3E] hover:bg-[rgba(224,62,62,0.04)]"
        >
          Remove from spot
        </button>
      </div>
    </div>
  )
}

function ComponentField({ fieldKey, field, value, onChange }) {
  const label = field.label || fieldKey
  if (field.type === 'boolean') {
    return (
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-xs text-[var(--p-text-primary)] flex-1">{label}</div>
        <Toggle on={!!value} onChange={onChange} />
      </div>
    )
  }
  if (field.type === 'number') {
    return (
      <Field label={label}>
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => {
            const n = e.target.value === '' ? null : Number(e.target.value)
            if (n === null || !Number.isNaN(n)) onChange(n)
          }}
          className={fieldInputClass}
        />
      </Field>
    )
  }
  if (field.type === 'enum') {
    const opts = field.options || []
    if (opts.length <= 4) {
      return (
        <Field label={label}>
          <Segmented
            options={opts.map((o) => ({ label: o, value: o }))}
            value={value}
            onChange={onChange}
          />
        </Field>
      )
    }
    return (
      <Field label={label}>
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={fieldInputClass}
        >
          {opts.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </Field>
    )
  }
  if (field.type === 'string') {
    return (
      <Field label={label}>
        <input
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={fieldInputClass}
        />
      </Field>
    )
  }
  // object / array — not editable inline yet
  return (
    <Field label={label}>
      <Hint>This field has a complex value and isn't editable inline yet.</Hint>
    </Field>
  )
}

// ─── Small primitives ────────────────────────────────────

const fieldInputClass =
  'w-full px-2.5 py-1.5 text-xs border border-[var(--p-border)] rounded-md bg-white text-[var(--p-text-primary)] outline-none focus:border-[var(--p-gold-light)] transition-colors'

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-medium text-[var(--p-text-secondary)] mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--p-text-muted)] mt-5 mb-2.5 first:mt-0">
      {children}
    </div>
  )
}

function Hint({ children }) {
  return (
    <div className="text-[10.5px] text-[var(--p-text-muted)] leading-[1.5]">
      {children}
    </div>
  )
}

function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className="relative flex-shrink-0 transition-colors rounded-full"
      style={{
        width: 32,
        height: 18,
        background: on ? 'var(--p-gold-light)' : 'var(--p-border)',
      }}
    >
      <span
        className="absolute top-0.5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition-all"
        style={{ left: on ? 16 : 2, width: 14, height: 14 }}
      />
    </button>
  )
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="flex gap-0.5 p-0.5 bg-[var(--p-bg-subtle)] border border-[var(--p-border)] rounded-md">
      {options.map((opt) => {
        const isActive = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 px-2 py-1 text-[11px] rounded-sm transition-colors ${
              isActive
                ? 'bg-white text-[var(--p-text-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                : 'bg-transparent text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)]'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
