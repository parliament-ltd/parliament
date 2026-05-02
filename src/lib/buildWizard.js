// Wizard config → mode file logic.
//
// PR-13 rewrote this module to match parliament_wizard_v5.html — the
// fine-tuned wizard spec the user owns. The shape is multi-select on
// purpose + device, density-driven layout reveal, a features list with
// category tags, and an inline ignition step that validates the API key
// before committing the mode and a fresh conversation.
//
// Two callers consume this module: src/views/BuildView.jsx (the wizard
// page) and src/components/build/wizard/* (the per-step UIs). Both pull
// the option arrays + the build helpers from here.
//
// The "Open in editor" escape hatch from any step ≥ 3 calls
// buildModeFromWizard(config) and routes to /edit/:newId. The Done step
// calls buildAndOpenRoom(config) which also creates a conversation in
// the new room and routes to /chat/:newConvId.

import { createModeFromTemplate } from './modes'
import { createConversation as dbCreateConversation } from './db'

/* ── Spec-aligned data shape ──────────────────────────────────
 *
 * State carried through the wizard:
 *
 *   {
 *     purposes:     Set<string>,    // step 1, multi-select; ids below
 *     devices:      Set<string>,    // step 2, multi-select; ids below
 *     density:      string | null,  // step 3, single-select
 *     layout:       string | null,  // step 3, layout id; auto-set when
 *                                   //   density picks a single layout
 *     features:     Set<string>,    // step 4; FEATURE.id values
 *     buildAnother: boolean,        // step 1 checkbox (only when
 *                                   //   purposes.size > 1)
 *     name:         string,         // step 5
 *     scheme:       string,         // step 5; SCHEME.id values
 *   }
 */

export function makeInitialWizardConfig() {
  return {
    purposes: new Set(),
    devices: new Set(),
    density: null,
    layout: null,
    features: new Set(),
    buildAnother: false,
    name: '',
    scheme: 'parliament@^1.0',
  }
}

/* ── Step 1: Purposes (multi-select) ─────────────────────────
 *
 * Per spec — Writing / Research / Coding / Thinking. Purpose drives
 * "Build another room" affordance only; layout selection is density-
 * driven, not purpose-driven.
 */

export const PURPOSES = Object.freeze([
  { id: 'writing',  label: 'Writing',  description: 'Long-form, drafts, edits and refinements' },
  { id: 'research', label: 'Research', description: 'Gathering, comparing and exploring ideas' },
  { id: 'coding',   label: 'Coding',   description: 'Building, debugging and reviewing code' },
  { id: 'thinking', label: 'Thinking', description: 'Exploring ideas and thinking out loud' },
])

/* ── Step 2: Devices (multi-select) ──────────────────────────
 *
 * Determines deviceClass on the resulting mode. If both Desktop and
 * Mobile are picked, Desktop wins for the deviceClass field — Mobile-
 * specific behaviors (touch-first input, slide-up sheet) come from the
 * single-column-with-sheet layout when the user picks Minimal density.
 */

export const DEVICES = Object.freeze([
  { id: 'desktop', label: 'Desktop', description: 'Laptop or desktop, larger screen' },
  { id: 'mobile',  label: 'Mobile',  description: 'Phone or small tablet, touch first' },
])

/* ── Step 3: Density + layout reveal ─────────────────────────
 *
 * Per the spec's LAYOUTS_BY_DENSITY table — density picks layouts. If a
 * density has only one layout (Minimal, Balanced) the wizard auto-
 * selects it with a gold-pulse animation; if multiple (Full) the user
 * picks one of three.
 */

export const DENSITIES = Object.freeze([
  { id: 'minimal',  label: 'Minimal',  description: 'Just the conversation, nothing extra' },
  { id: 'balanced', label: 'Balanced', description: 'Light context alongside the conversation' },
  { id: 'full',     label: 'Full',     description: 'Panels, tools and context all visible' },
])

export const LAYOUTS_BY_DENSITY = Object.freeze({
  minimal:  ['single-column-with-sheet@^1.0'],
  balanced: ['three-panel@^1.0'],
  full:     ['three-panel@^1.0', 'canvas-centric@^1.0', 'document-centric@^1.0'],
})

export const LAYOUT_META = Object.freeze({
  'three-panel@^1.0': {
    label: 'Three-panel',
    short: 'A sidebar for navigation, the conversation in the middle, a panel for context and tools.',
    long: 'The Parliament classic. A left rail for table of contents and quick actions, the conversation at the center, and a right rail for highlights, branches, context health, and any other ambient context. Both rails can collapse if you need more focus.',
  },
  'canvas-centric@^1.0': {
    label: 'Canvas-centric',
    short: 'A workspace at the center for visualizations or data, with chat alongside.',
    long: 'Built for analysis. A file shelf on the left stages your uploads. The center is a workspace for charts, tables, and computed results. A compact chat panel on the right keeps Claude alongside the work without dominating the screen.',
  },
  'document-centric@^1.0': {
    label: 'Document-centric',
    short: 'A document you can edit, with comments and chat in the margin.',
    long: "For real prose. The page takes the center as an editable canvas. Comments and Claude's replies live in the margin alongside the text they refer to. Tracked changes mark every edit so you can accept or reject them deliberately.",
  },
  'single-column-with-sheet@^1.0': {
    label: 'Single column with sheet',
    short: 'Just the conversation. Tools live in a panel that slides up when needed.',
    long: 'A single column with the conversation, the input, and a menu. Anything you add as a feature lives in a sheet that slides up from the bottom on demand. Designed for quiet, focused sessions where the tools are out of sight until you ask for them.',
  },
})

/**
 * Resolve density → layout. If density picks exactly one layout it's
 * auto-selected. Otherwise the user has to make an explicit pick (config.layout)
 * and we return that. Returns null when neither has happened yet.
 */
export function deriveLayout(config) {
  if (!config?.density) return null
  const eligible = LAYOUTS_BY_DENSITY[config.density] || []
  if (eligible.length === 1) return eligible[0]
  if (config.layout && eligible.includes(config.layout)) return config.layout
  return null
}

/* ── Step 4: Features (optional components) ──────────────────
 *
 * Each feature carries:
 *   - id            (unique within FEATURES)
 *   - label         (what the user sees)
 *   - description   (the "why this exists" copy)
 *   - tags[]        (category chips: 'Writing', 'AI behavior', etc.)
 *   - comingSoon    (if true: render with badge, can't be selected,
 *                   never shipped as a component when the room builds)
 *   - catalogRef    (component manifest ref or null for stubs)
 *   - config        (initial component config, e.g. { mode: 'response-headings' })
 *   - slotByLayout  (per-layout slot id; if a layout has no entry, the
 *                   feature is skipped silently when that layout is the
 *                   target — same pattern V1 wizardComponentsFor used)
 */

export const FEATURES = Object.freeze([
  {
    id: 'table-of-contents',
    label: 'Table of Contents',
    description: 'Automatically tracks the structure of long pieces in a side panel, so you can jump to any section without scrolling.',
    tags: ['Writing'],
    comingSoon: false,
    catalogRef: 'toc@^1.0',
    config: { mode: 'response-headings' },
    slotByLayout: {
      'three-panel@^1.0':              'left-rail',
      'canvas-centric@^1.0':           'left-rail',
      'document-centric@^1.0':         'outline',
      'single-column-with-sheet@^1.0': 'sheet',
    },
  },
  {
    id: 'context-health',
    label: 'Context Health',
    description: 'Shows how much of your conversation window remains, so you know when to start a new chat or compress context.',
    tags: [],
    comingSoon: false,
    catalogRef: 'context@^1.0',
    config: {},
    slotByLayout: {
      'three-panel@^1.0':              'right-rail',
      'canvas-centric@^1.0':           'inspector',
      'document-centric@^1.0':         'margin',
      'single-column-with-sheet@^1.0': 'sheet',
    },
  },
  {
    id: 'highlights',
    label: 'Highlights',
    description: 'Mark key terms and navigate every place they appear across the conversation, useful for research or recurring concepts.',
    tags: [],
    comingSoon: false,
    catalogRef: 'highlights@^1.0',
    config: {},
    slotByLayout: {
      'three-panel@^1.0':              'left-rail',
      'canvas-centric@^1.0':           'inspector',
      'document-centric@^1.0':         'margin',
      'single-column-with-sheet@^1.0': 'sheet',
    },
  },
  {
    id: 'branches',
    label: 'Branches',
    description: 'Create a duplicate conversation to explore different directions, without losing your original thread.',
    tags: [],
    comingSoon: false,
    catalogRef: 'branches@^1.0',
    config: {},
    slotByLayout: {
      'three-panel@^1.0':              'left-rail',
      'canvas-centric@^1.0':           'left-rail',
      'document-centric@^1.0':         'outline',
      'single-column-with-sheet@^1.0': 'sheet',
    },
  },
  {
    id: 'collab-mode',
    label: 'Collaboration Mode',
    description: 'Toggle behavioral presets that shape how Claude works with you. Push back, show reasoning, flag uncertainty and more.',
    tags: ['AI behavior'],
    comingSoon: false,
    catalogRef: 'collab-mode@^1.0',
    config: {},
    slotByLayout: {
      'three-panel@^1.0':              'right-rail-extra',
      'canvas-centric@^1.0':           'inspector',
      'document-centric@^1.0':         'chat-panel',
      'single-column-with-sheet@^1.0': 'sheet',
    },
  },
  {
    // PR-13: stub. Real-time multi-user collab needs a server, which
    // contradicts the no-backend constraint (CLAUDE.md). Surfaces in the
    // wizard with a "Coming soon" badge; never adds a component to the
    // built mode. Revisit as a separate scope statement after Phase 2.
    id: 'open-room',
    label: 'Open Room',
    description: 'Share a link to invite others into your conversation and work through it together in real time.',
    tags: ['Human sharing'],
    comingSoon: true,
    catalogRef: null,
    config: {},
    slotByLayout: {},
  },
  {
    id: 'file-shelf',
    label: 'File Shelf',
    description: 'Keep reference files pinned alongside your conversation so you can refer to documents without re-uploading them each time.',
    tags: ['Research', 'Coding'],
    comingSoon: false,
    catalogRef: 'file-shelf@^1.0',
    config: {},
    slotByLayout: {
      // file-shelf is canvas-centric's anchor; no slot in three-panel
      // (architecture §2.4) so we skip there. Single-column rooms get
      // file-shelf in the slide-up sheet.
      'canvas-centric@^1.0':           'left-rail',
      'single-column-with-sheet@^1.0': 'sheet',
    },
  },
])

/* ── Step 5: Schemes ─────────────────────────────────────────
 *
 * Per the spec, six schemes. The catalog ids match the seeded library
 * schemes (PR-4a/4b). Backgrounds are the spec's `data-bg` colors,
 * shown on the live summary card so the user sees the room's tone.
 */

export const SCHEMES = Object.freeze([
  { id: 'parliament@^1.0',  label: 'Parliament Default', description: 'Warm base, gold accents',  bg: '#F5F0E8', dot: '#D4A843', line: '#C4A882', builtIn: true  },
  { id: 'cool-bright@^1.0', label: 'Cool Bright',        description: 'Clean, high contrast',     bg: '#E8F0F8', dot: '#2B6CB0', line: '#90B8E0', builtIn: false },
  { id: 'deep-calm@^1.0',   label: 'Deep Calm',          description: 'Dark, quiet, focused',     bg: '#1A1F2E', dot: '#7C9CBF', line: '#3A4A5E', builtIn: false },
  { id: 'soft-violet@^1.0', label: 'Soft Violet',        description: 'Gentle, creative',         bg: '#F0EFF5', dot: '#6B5EA8', line: '#C5BFDF', builtIn: false },
  { id: 'fresh-teal@^1.0',  label: 'Fresh Teal',         description: 'Light, open, clear',       bg: '#ECFBF4', dot: '#1D9E75', line: '#9FE1CB', builtIn: false },
  { id: 'amber-glow@^1.0',  label: 'Amber Glow',         description: 'Warm, energetic',          bg: '#FFF8EE', dot: '#B85C00', line: '#F5C57A', builtIn: false },
])

/* ── Build mode + conversation from wizard config ────────────
 *
 * Two entry points:
 *   - buildModeFromWizard(config)
 *       Persists the mode and returns it. Used by the "Open in editor"
 *       escape from steps ≥ 3.
 *   - buildAndOpenRoom(config)
 *       Persists the mode + a fresh conversation tied to it. Used by the
 *       Ignition step's Enter button. Returns { mode, conversation }.
 */

export async function buildModeFromWizard(config) {
  const layoutRef = deriveLayout(config) || 'three-panel@^1.0'
  const components = wizardComponentsFor(layoutRef, config.features || new Set())
  const name = (config.name && config.name.trim()) || defaultName(config)

  const synthetic = {
    id: `wizard_${Date.now()}`,
    scope: 'room',
    displayName: name,
    description: '',
    icon: null,
    deviceClass: pickDeviceClass(config.devices),
    layout: { ref: layoutRef },
    scheme: { ref: config.scheme || 'parliament@^1.0' },
    components,
    buildIntent: {
      source: 'wizard',
      purposes: [...(config.purposes || [])],
      devices: [...(config.devices || [])],
      density: config.density || null,
      buildAnother: Boolean(config.buildAnother),
    },
  }

  return createModeFromTemplate(synthetic, { name })
}

export async function buildAndOpenRoom(config) {
  const mode = await buildModeFromWizard(config)
  const conversation = await dbCreateConversation({
    title: mode.meta?.name || 'New room',
    room: mode.id,
  })
  return { mode, conversation }
}

function defaultName(config) {
  const first = [...(config.purposes || [])][0]
  const purpose = PURPOSES.find(p => p.id === first)
  if (purpose) return `${purpose.label} room`
  return 'New room'
}

function pickDeviceClass(devices) {
  // Desktop wins when both are selected — desktop layouts also work on
  // mobile, but a mobile-only room should not get a three-panel as the
  // default deviceClass. Mobile-only rooms get touch-phone.
  if (devices?.has?.('mobile') && !devices?.has?.('desktop')) {
    return 'visual-touch-phone'
  }
  return 'visual-pointer'
}

/**
 * Compose the components array for a wizard-built room. Every layout
 * gets messages + input as the baseline, plus any features the user
 * checked that have a slot in the chosen layout. Coming-soon features
 * are skipped — they have no catalogRef.
 */
export function wizardComponentsFor(layoutRef, features) {
  const baseline = baselineComponentsFor(layoutRef)
  const featureSpecs = []
  for (const featureId of features) {
    const feat = FEATURES.find(f => f.id === featureId)
    if (!feat) continue
    if (feat.comingSoon) continue
    if (!feat.catalogRef) continue
    const slot = feat.slotByLayout[layoutRef]
    if (!slot) continue
    featureSpecs.push({
      id: `wiz_${feat.id}`,
      ref: feat.catalogRef,
      slot,
      order: orderInSlot(baseline.concat(featureSpecs), slot),
      config: feat.config || {},
    })
  }
  return baseline.concat(featureSpecs)
}

function orderInSlot(specs, slot) {
  const inSlot = specs.filter(s => s.slot === slot)
  return inSlot.length === 0 ? 0 : Math.max(...inSlot.map(s => s.order ?? 0)) + 1
}

function baselineComponentsFor(layoutRef) {
  switch (layoutRef) {
    case 'document-centric@^1.0':
      return [
        { id: 'wiz_messages', ref: 'messages@^1.0', slot: 'chat-panel', order: 0, config: {} },
        { id: 'wiz_input',    ref: 'input@^1.0',    slot: 'chat-panel', order: 1, config: {} },
      ]
    case 'canvas-centric@^1.0':
      return [
        { id: 'wiz_messages', ref: 'messages@^1.0', slot: 'chat-panel', order: 0, config: {} },
        { id: 'wiz_input',    ref: 'input@^1.0',    slot: 'input-dock', order: 0, config: {} },
      ]
    case 'single-column-with-sheet@^1.0':
    case 'three-panel@^1.0':
    default:
      return [
        { id: 'wiz_messages', ref: 'messages@^1.0', slot: 'msg-area',   order: 0, config: {} },
        { id: 'wiz_input',    ref: 'input@^1.0',    slot: 'input-dock', order: 0, config: {} },
      ]
  }
}
