// EditorRightRail — properties panel.
//
// PR-27 restructures this from a single selection-driven view into three
// always-visible collapsible sections: Layout / Room / Components.
// Selecting a component on the canvas auto-collapses Layout + Room and
// expands the matching ComponentRow inside Components, but Layout + Room
// stay clickable so the user can navigate back without losing their
// component selection. Before PR-27 the right panel REPLACED contents
// based on selection, so picking a component hid the room-level fields
// entirely — that's the friction this commit removes.
//
// Field types come from src/catalog/validate.js: boolean | number |
// string | enum | object | array. The first four render as editable
// controls; complex types (object, array) show a read-only hint.

import { useState } from 'react'
import { ChevronDown, ChevronRight, Home } from 'lucide-react'
import { getLayoutSlots } from '../../lib/layoutMigration'
import { SCHEMES } from '../../lib/schemes'
import { findCatalogEntry, normalizeRef } from '../../lib/refs'
import { useSettings } from '../../stores/SettingsContext'

// PR-27: per-layout list of slot ids the user can opt into a runtime
// panel-toggle for. Both desktop layouts share the same left-rail key.
// Three-panel's right-rail toggle covers right-rail + right-rail-extra;
// canvas-centric's chat-panel toggle covers chat-panel + inspector
// (they share an aside element in each layout's renderer).
const PANEL_TOGGLE_SLOTS = {
  'three-panel@1.0': [
    { id: 'left-rail',  label: 'Left rail'  },
    { id: 'right-rail', label: 'Right rail' },
  ],
  'canvas-centric@1.0': [
    { id: 'left-rail',  label: 'Left rail'                },
    { id: 'chat-panel', label: 'Right panel'              },
  ],
}

export default function EditorRightRail({
  mode,
  selection,
  catalogEntries,
  onUpdateConfig,
  onSetName,
  onSetDeviceClass,
  onApplyScheme,
  onSetPanelButton,
  onRemoveComponent,
}) {
  // Section open/closed state — local UI only, derived from selection
  // but user toggles override.
  const [layoutOpen,     setLayoutOpen]     = useState(selection.type === 'room')
  const [roomOpen,       setRoomOpen]       = useState(selection.type === 'room')
  const [componentsOpen, setComponentsOpen] = useState(selection.type === 'component')
  const [expandedComponentId, setExpandedComponentId] = useState(
    selection.type === 'component' ? selection.id : null
  )

  // On selection KEY change, reset section visibility to match the new
  // focus. Done as a render-phase update (React batches these into the
  // same render) rather than a useEffect — the React 18+ docs prefer
  // this pattern when state is derived from a prop change. We track
  // the previous key as STATE (not a ref) so the React lint rule is
  // happy: refs-during-render is flagged, but compare-and-set on
  // state during render is the documented pattern for this case.
  // User toggles after the key settles still win, because we only
  // react when the key actually changes.
  const selKey = `${selection.type}:${selection.id || ''}`
  const [prevSelKey, setPrevSelKey] = useState(selKey)
  if (prevSelKey !== selKey) {
    setPrevSelKey(selKey)
    if (selection.type === 'component') {
      setLayoutOpen(false)
      setRoomOpen(false)
      setComponentsOpen(true)
      setExpandedComponentId(selection.id)
    } else if (selection.type === 'room') {
      setLayoutOpen(true)
      setRoomOpen(true)
      setComponentsOpen(false)
    }
    // selection.type === 'slot' deliberately leaves section state
    // alone; the inline hint above the sections covers it.
  }

  return (
    <aside className="bg-white border-l border-[var(--p-border)] flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {selection.type === 'slot' && (
          <SlotHint slotId={selection.id} mode={mode} />
        )}

        <Section
          title="Layout"
          open={layoutOpen}
          onToggle={() => setLayoutOpen((v) => !v)}
        >
          <LayoutSectionBody mode={mode} onSetPanelButton={onSetPanelButton} />
        </Section>

        <Section
          title="Room"
          open={roomOpen}
          onToggle={() => setRoomOpen((v) => !v)}
        >
          <RoomFields
            mode={mode}
            onSetName={onSetName}
            onSetDeviceClass={onSetDeviceClass}
            onApplyScheme={onApplyScheme}
          />
        </Section>

        <Section
          title="Components"
          open={componentsOpen}
          onToggle={() => setComponentsOpen((v) => !v)}
        >
          <ComponentsSectionBody
            mode={mode}
            catalogEntries={catalogEntries}
            expandedComponentId={expandedComponentId}
            onToggleComponent={(id) =>
              setExpandedComponentId((prev) => (prev === id ? null : id))
            }
            onUpdateConfig={onUpdateConfig}
            onRemove={onRemoveComponent}
          />
        </Section>
      </div>
    </aside>
  )
}

// ─── Section primitive ───────────────────────────────────

function Section({ title, open, onToggle, children }) {
  return (
    <div className="border-b border-[var(--p-border)] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--p-bg-subtle)] transition-colors"
        aria-expanded={open}
      >
        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--p-text-secondary)]">
          {title}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[var(--p-text-muted)] transition-transform ${
            open ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>
      <div
        className="overflow-hidden transition-all"
        style={{
          maxHeight: open ? '4000px' : '0px',
          opacity: open ? 1 : 0,
          transitionDuration: '220ms',
        }}
      >
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>
  )
}

// ─── Layout section body ─────────────────────────────────

function LayoutSectionBody({ mode, onSetPanelButton }) {
  if (!mode) {
    return (
      <Hint>Drop a layout on the canvas to start configuring.</Hint>
    )
  }
  const layoutRef = mode.layout?.ref
  const layoutKey = normalizeRef(layoutRef)
  const layoutName = layoutKey || '(no layout)'
  const toggles = PANEL_TOGGLE_SLOTS[layoutKey] || []
  const panelButtons = mode.layoutConfig?.panelButtons || {}

  return (
    <div>
      <Field label="Active layout">
        <div className="px-2.5 py-1.5 text-xs rounded-md border border-[var(--p-border)] bg-[var(--p-bg-subtle)] text-[var(--p-text-primary)]">
          {layoutName}
        </div>
      </Field>
      <Hint>Drop a layout from the left rail to swap.</Hint>

      {toggles.length > 0 && (
        <>
          <SectionLabel>Panel toggles</SectionLabel>
          {toggles.map((slot) => (
            <div key={slot.id} className="mb-3 flex items-center justify-between gap-3">
              <div className="text-xs text-[var(--p-text-primary)] flex-1">
                Show open/close button for {slot.label}
              </div>
              <Toggle
                on={!!panelButtons[slot.id]}
                onChange={(v) => onSetPanelButton(slot.id, v)}
              />
            </div>
          ))}
        </>
      )}
    </div>
  )
}

// ─── Components section body ─────────────────────────────

function ComponentsSectionBody({
  mode, catalogEntries, expandedComponentId, onToggleComponent,
  onUpdateConfig, onRemove,
}) {
  const components = mode?.components || []
  if (!mode) {
    return <Hint>Drop a layout first, then add components from the left rail.</Hint>
  }
  if (components.length === 0) {
    return <Hint>No components yet. Drop one onto a slot in the canvas.</Hint>
  }
  return (
    <div className="flex flex-col gap-1.5">
      {components.map((spec) => {
        const entry = findEntry(catalogEntries, spec.ref)
        return (
          <ComponentRow
            key={spec.id}
            spec={spec}
            entry={entry}
            mode={mode}
            expanded={spec.id === expandedComponentId}
            onToggle={() => onToggleComponent(spec.id)}
            onUpdateConfig={onUpdateConfig}
            onRemove={onRemove}
          />
        )
      })}
    </div>
  )
}

function ComponentRow({ spec, entry, mode, expanded, onToggle, onUpdateConfig, onRemove }) {
  const displayName = entry?.displayName || spec.ref
  return (
    <div className="border border-[var(--p-border)] rounded-md overflow-hidden bg-[var(--p-bg-surface)]">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-[var(--p-bg-subtle)] transition-colors"
        aria-expanded={expanded}
      >
        <ChevronRight
          className={`w-3 h-3 text-[var(--p-text-muted)] transition-transform ${
            expanded ? 'rotate-90' : ''
          }`}
        />
        <span className="text-xs font-medium text-[var(--p-text-primary)] truncate flex-1">
          {displayName}
        </span>
        <span className="text-[10px] text-[var(--p-text-muted)] truncate">
          {spec.slot}
        </span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-2 border-t border-[var(--p-border)]">
          <ComponentFields
            mode={mode}
            spec={spec}
            entry={entry}
            onUpdateConfig={onUpdateConfig}
            onRemove={onRemove}
          />
        </div>
      )}
    </div>
  )
}

// ─── Slot hint (inline, above sections) ──────────────────

function SlotHint({ slotId, mode }) {
  const slot = (getLayoutSlots(mode?.layout?.ref)).find((s) => s.id === slotId)
  if (!slot) return null
  return (
    <div className="px-4 py-2.5 border-b border-[var(--p-border)] bg-[var(--p-bg-subtle)]">
      <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--p-text-muted)] mb-0.5">
        Spot selected
      </div>
      <div className="text-xs text-[var(--p-text-primary)]">
        {slot.label}{' '}
        <span className="text-[var(--p-text-muted)]">
          ({slot.capacity === 'stack' ? 'multiple components, stacked' : 'one component'})
        </span>
      </div>
    </div>
  )
}

function findEntry(entries, ref) {
  return findCatalogEntry(entries, ref)
}

// ─── Room fields ─────────────────────────────────────────

function RoomFields({ mode, onSetName, onSetDeviceClass, onApplyScheme }) {
  // PR-19d: blank-canvas state. Nothing to configure until the user
  // drops a layout or room — show a hint instead of dead inputs.
  if (!mode) {
    return (
      <div className="text-[12px] leading-[1.6] text-[var(--p-text-muted)]">
        Drop a layout, scheme, or room on the canvas to start configuring.
      </div>
    )
  }
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
          {/* PR-26: option value is `s.id` directly — it already
              includes `@1.0` (e.g. 'parliament@1.0'). The prior
              `${s.id}@1.0` produced 'parliament@1.0@1.0', so no option
              matched the normalized select value and "Active Scheme"
              never reflected drag-applied changes. */}
          {SCHEMES.map((s) => (
            <option key={s.id} value={s.id}>{s.displayName}</option>
          ))}
        </select>
      </Field>

      <Hint>
        A room can be exported as a mode file and shared. Every choice you make here travels with it.
      </Hint>

      <ChosenHomeSection mode={mode} />
    </div>
  )
}

// PR-19e: surfaces only for saved user rooms (scope='room', has an id
// already in IDB — unsaved drafts can't be set as the home since the
// pointer would break on next refresh). Shows a small home icon when
// the toggle is active; clicking the toggle in either direction pops a
// confirmation modal before flipping the SettingsContext pointer.
function ChosenHomeSection({ mode }) {
  const { settings, updateSetting, loaded } = useSettings()
  const [confirming, setConfirming] = useState(false)

  if (!mode || mode.scope !== 'room' || !mode.id) return null

  // builtAt === null means the room exists in IDB only as an in-memory
  // draft (e.g. Build pill copy not yet saved). Wait for a real save
  // before letting it be the home — otherwise the redirect targets a
  // mode the user may never have committed.
  if (mode.meta?.builtAt == null) {
    return (
      <>
        <SectionLabel>Home</SectionLabel>
        <Hint>Save the room first to set it as your home.</Hint>
      </>
    )
  }

  if (!loaded) return null
  const isChosen = settings.chosenHomeRoomId === mode.id
  const roomName = mode.meta?.name?.trim() || 'this room'

  const onConfirm = async () => {
    await updateSetting('chosenHomeRoomId', isChosen ? null : mode.id)
    setConfirming(false)
  }

  return (
    <>
      <SectionLabel>Home</SectionLabel>
      <div className="flex items-start gap-3 py-1">
        <button
          type="button"
          role="switch"
          aria-checked={isChosen}
          onClick={() => setConfirming(true)}
          className={`relative inline-flex h-[18px] w-[32px] shrink-0 rounded-full transition-colors mt-0.5 ${
            isChosen ? 'bg-[var(--p-gold-light)]' : 'bg-[var(--p-bg-subtle)] border border-[var(--p-border)]'
          }`}
        >
          <span
            className={`inline-block h-[14px] w-[14px] rounded-full bg-white shadow transition-transform ${
              isChosen ? 'translate-x-[16px]' : 'translate-x-[2px]'
            }`}
            style={{ marginTop: 1 }}
          />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--p-text-primary)]">
            Make this room your home
            {isChosen && <Home className="w-3 h-3 text-[var(--p-gold-light)]" />}
          </div>
          <div className="text-[11px] text-[var(--p-text-secondary)] mt-0.5">
            {isChosen
              ? 'Opening Parliament drops you into a fresh conversation here.'
              : 'Parliament will land on The Study by default.'}
          </div>
        </div>
      </div>

      {confirming && (
        <ChosenHomeConfirm
          isChosen={isChosen}
          roomName={roomName}
          onCancel={() => setConfirming(false)}
          onConfirm={onConfirm}
        />
      )}
    </>
  )
}

function ChosenHomeConfirm({ isChosen, roomName, onCancel, onConfirm }) {
  const title = isChosen ? 'Remove home pointer?' : `Set "${roomName}" as your home?`
  const body = isChosen
    ? 'Parliament will go back to landing on The Study.'
    : 'Opening Parliament will drop you into a fresh conversation in this room from now on.'
  const ctaLabel = isChosen ? 'Remove' : 'Set as home'

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center p-5"
      style={{ backgroundColor: 'rgba(25, 25, 25, 0.32)' }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-[400px] max-w-[94vw] bg-[var(--p-bg-surface)] border border-[var(--p-border)] rounded-xl shadow-2xl shadow-black/20 p-5 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-base font-medium text-[var(--p-text-primary)]">
          {title}
        </div>
        <div className="text-[12.5px] text-[var(--p-text-secondary)] leading-[1.55]">
          {body}
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--p-border)] bg-transparent text-[var(--p-text-secondary)] hover:border-[var(--p-gold-light)] hover:text-[var(--p-gold-light)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--p-gold-light)] bg-[var(--p-gold-light)] text-white hover:bg-[var(--p-gold-muted)] hover:border-[var(--p-gold-muted)] transition-colors"
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Component fields (configSchema-driven) ─────────────

function ComponentFields({ mode, spec, entry, onUpdateConfig, onRemove }) {
  if (!entry) {
    return <Hint>This component isn&apos;t registered in the catalog. It will not render at runtime.</Hint>
  }
  const componentId = spec.id
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

      <div className="border-t border-[var(--p-border)] pt-3 mt-4">
        {/* PR-49a: no longer a destructive action — the component goes
            to the holding tray and can be restored (drag back) or
            permanently dismissed (x in the tray). Hover color drops the
            old red treatment since the action is now reversible. */}
        <button
          onClick={() => onRemove(componentId)}
          className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[var(--p-border)] bg-transparent text-[var(--p-text-secondary)] transition-colors hover:border-[var(--p-gold-light)] hover:text-[var(--p-gold-muted)] hover:bg-[rgba(196,169,77,0.06)]"
          title="Move this component to the holding tray. Drag it back onto a slot to restore, or x it from the tray to delete."
        >
          Move to holding
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
      <Hint>This field has a complex value and isn&apos;t editable inline yet.</Hint>
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
