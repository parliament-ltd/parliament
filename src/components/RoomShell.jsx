// <RoomShell mode={mode}> — the V2 mode→layout→slot→component pipeline (PR-3).
//
// Given a parliament-mode/1.0 mode object:
//   1. Resolves mode.layout.ref against the layout registry.
//   2. Resolves each mode.components[].ref against the component catalog.
//   3. Groups resolved components by slot and sorts by order.
//   4. Builds a fresh hostAPI bus scoped to this room instance.
//   5. Calls each component's render({ config, hostAPI, componentId }).
//   6. Hands the resulting slotContents map to the layout's render function.
//
// Missing layouts and missing components do NOT crash the shell — they
// render a small inline diagnostic so authors of hand-built modes can see
// what's wrong without opening DevTools. Components targeting a slot the
// active layout does not declare are silently skipped (with a dev-only
// console warning) per "RoomShell must handle missing components
// gracefully" in phase-1-pr-plan.md PR-3 risk note.
//
// ─── Where conversation data enters the room ──────────────────────────
//
// RoomShell deliberately does NOT plumb conversation data through props or
// hostAPI events. Components that need active-conversation state
// (messages@1.0 reading the message list, input@1.0 firing sendMessage,
// context@1.0 reading the token meter) consume the existing React contexts
// directly via `useChatContext()` / `useConversationContext()` /
// `useSettingsContext()`. App.jsx keeps those providers mounted around
// every route, so any RoomShell descendant can subscribe.
//
// PR-2/PR-3 entries render with empty defaults because no provider data is
// in scope on the dev /catalog route — the providers ARE mounted but no
// active conversation is selected. PR-10a wires /chat/:id to load a
// conversation, set it active, then render <RoomShell mode={...} /> inside
// the same provider tree. Each component picks up the live data via its
// own hook calls. Do not add a "componentData" prop or a hostAPI
// "data-changed" event to plumb this — contexts already do the job and
// keep re-renders scoped per CLAUDE.md's state-management guidance.
//
// ─── Intentionally deferred behaviors ─────────────────────────────────
//
// These are accepted by the manifest format and reserved in the runtime,
// but RoomShell does not act on them yet. Each has a target PR; if you
// implement one earlier than that, update this list.
//
//   - Slot capacity enforcement (single | stack | overlay): layouts
//     declare it, RoomShell does not yet check that single-capacity slots
//     hold at most one component. Mode-file authors are trusted in
//     Phase 1. Target: enforce when the editor (PR-8) starts producing
//     mode files automatically.
//   - softDependencies aggregation: components declare them on the
//     manifest, but RoomShell does not check whether the dependency is
//     present in the room or render the declared fallbackUI. Target:
//     PR-11a, when chart/table/summary canvas components need the
//     "Add a File shelf component to provide data" empty state.
//   - contributions.messageActions aggregation: components declare per-
//     message menu items, but messages@1.0 does not yet collect them
//     across the room and surface a unified menu. Target: PR-5, when
//     highlights/notes/branches each ship a contribution.

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
        incrementally. See <code>src/catalog/layouts/index.js</code>.
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
