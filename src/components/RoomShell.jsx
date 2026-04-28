// <RoomShell mode={mode}> — the V2 mode→layout→slot→component pipeline (PR-3).
//
// Given a parliament-mode/1.0 mode object:
//   1. Resolves mode.layout.ref against the layout registry.
//   2. Resolves each mode.components[].ref against the component catalog.
//   3. Groups resolved components by slot and sorts by order.
//   4. Builds a fresh hostAPI bus scoped to this room instance.
//   5. Calls each component's render({ config, hostAPI }) function.
//   6. Hands the resulting slotContents map to the layout's render function.
//
// Missing layouts and missing components do NOT crash the shell — they
// render a small inline diagnostic so authors of hand-built modes can see
// what's wrong without opening DevTools. Components targeting a slot the
// active layout does not declare are silently skipped (with a dev-only
// console warning) per "RoomShell must handle missing components
// gracefully" in phase-1-pr-plan.md PR-3 risk note.

import { useMemo } from 'react'
import { getEntry as getComponentEntry } from '../catalog'
import { getLayoutEntry } from '../catalog/layouts'
import { createHostAPI } from '../lib/hostAPI'

/**
 * Normalize a component or layout ref like 'messages@^1.0' or
 * 'three-panel@1.0.0' into the registry-key form 'messages@1.0'.
 *
 * PR-3 ships exact-match resolution only; this normalizer just collapses
 * the small set of equivalent spellings the mode-file format permits.
 */
function normalizeRef(ref) {
  if (typeof ref !== 'string' || !ref.includes('@')) return ref
  const [name, versionSpec = ''] = ref.split('@', 2)
  const raw = versionSpec.replace(/^[\^~]/, '')
  const trimmed = raw.replace(/^(\d+\.\d+)\.0$/, '$1')
  return `${name}@${trimmed}`
}

function Diagnostic({ children }) {
  return (
    <div className="m-4 px-4 py-3 rounded-lg border border-[var(--p-border)] bg-[var(--p-code-bg,#F7F6F3)] text-sm text-[var(--p-text-secondary)]">
      {children}
    </div>
  )
}

export default function RoomShell({ mode, hostAPI: hostAPIProp }) {
  // One bus per RoomShell instance. useMemo with [mode?.id] keeps it stable
  // across re-renders while ensuring switching rooms gives a fresh bus.
  // The dependency is intentional invalidation, not a transitive read of
  // mode.id inside createHostAPI() — exhaustive-deps can't tell.
  // An optional `hostAPI` prop lets a parent (currently only the dev /catalog
  // route) share the room's bus with sibling inspector widgets — production
  // routes never pass it and get a fresh internally-owned bus.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ownedHostAPI = useMemo(() => createHostAPI(), [mode?.id])
  const hostAPI = hostAPIProp ?? ownedHostAPI

  if (!mode || typeof mode !== 'object') {
    return <Diagnostic>RoomShell received no mode.</Diagnostic>
  }

  const layoutRef = mode.layout?.ref
  if (!layoutRef) {
    return <Diagnostic>Mode <code>{mode.id}</code> has no <code>layout.ref</code>.</Diagnostic>
  }

  const layoutEntry = getLayoutEntry(normalizeRef(layoutRef))
  if (!layoutEntry) {
    return (
      <Diagnostic>
        Layout <code>{layoutRef}</code> is not registered. Phase 1 layouts ship
        incrementally — see <code>src/catalog/layouts/index.js</code>.
      </Diagnostic>
    )
  }

  const declaredSlotIds = new Set(layoutEntry.slots.map(s => s.id))
  const slotContents = {}
  const skipped = []

  // Sort first so insertion order into slotContents reflects component order.
  const ordered = [...(mode.components || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  for (const spec of ordered) {
    if (!spec || !spec.ref || !spec.slot) {
      skipped.push({ id: spec?.id, reason: 'missing ref or slot' })
      continue
    }
    const entry = getComponentEntry(normalizeRef(spec.ref))
    if (!entry) {
      skipped.push({ id: spec.id, reason: `unknown component ref ${spec.ref}` })
      continue
    }
    if (!declaredSlotIds.has(spec.slot)) {
      skipped.push({ id: spec.id, reason: `slot '${spec.slot}' not declared by ${layoutRef}` })
      continue
    }
    if (!slotContents[spec.slot]) slotContents[spec.slot] = []
    // Mount the render function as a React component (via JSX) rather than
    // invoking it imperatively, so entries are free to use hooks internally.
    const RenderFn = entry.render
    slotContents[spec.slot].push(
      <RenderFn
        key={spec.id || `${spec.ref}-${slotContents[spec.slot].length}`}
        config={spec.config || {}}
        hostAPI={hostAPI}
        componentId={spec.id}
      />
    )
  }

  if (skipped.length > 0 && import.meta.env.DEV) {
    console.warn(
      `[RoomShell] ${skipped.length} component(s) skipped while resolving mode '${mode.id}':`,
      skipped
    )
  }

  // Layouts are also invoked as React components (parity with components).
  const LayoutRender = layoutEntry.render
  return <LayoutRender slotContents={slotContents} mode={mode} hostAPI={hostAPI} />
}
