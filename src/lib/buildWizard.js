// Wizard config → mode file logic (PR-9).
//
// The seven-step wizard collects the user's intent in a small `config`
// object; this module translates that into the same parliament-mode/1.0
// shape that template instantiation produces. Both paths flow through
// `modes.createModeFromTemplate()` so the resulting mode files are
// structurally identical for matching choices.
//
// "Sensible defaults" anywhere config is partially complete — the
// "Open in editor" escape from step 3+ relies on this being safe to
// call mid-flow.

import { createModeFromTemplate } from './modes'

// ─── Config defaults / shape ─────────────────────────────

export function makeInitialWizardConfig() {
  return {
    purpose: null,        // 'writing' | 'data' | 'drafting' | 'quick-chat' | 'custom'
    device: 'visual-pointer',
    density: 'moderate',  // 'minimal' | 'moderate' | 'dense'
    layoutOverride: null, // user manually picked a layout in step 4
    features: new Set(),  // optional component refs (without @version)
    name: '',
    schemeRef: 'parliament@^1.0',
  }
}

// ─── Step 1: Purpose options ─────────────────────────────

export const PURPOSES = Object.freeze([
  {
    id: 'writing',
    label: 'Writing',
    description: 'Long-form drafting, essays, prose. Notes and references close at hand.',
  },
  {
    id: 'data',
    label: 'Data analysis',
    description: 'Charts, tables, dashboards. A canvas for the data and a chat to help you analyze.',
  },
  {
    id: 'drafting',
    label: 'Document drafting',
    description: 'Editable document with margin annotations. Tracked changes flow.',
  },
  {
    id: 'quick-chat',
    label: 'Quick chat',
    description: 'Just the conversation. Minimal chrome, fewest distractions.',
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Pick the layout yourself. Useful when nothing above quite fits.',
  },
])

// ─── Step 2: Device options ──────────────────────────────

export const DEVICES = Object.freeze([
  { id: 'visual-pointer',    label: 'Desktop',  description: 'Mouse and keyboard, large screen.' },
  { id: 'visual-touch-phone', label: 'Mobile',   description: 'Touch input, narrow screen.' },
])

// ─── Step 3: Density + layout reveal ─────────────────────

export const DENSITIES = Object.freeze([
  { id: 'minimal',  label: 'Minimal',  description: 'Just the essentials. Easy to focus.' },
  { id: 'moderate', label: 'Moderate', description: 'Balanced — chat plus a few helpful panels.' },
  { id: 'dense',    label: 'Dense',    description: 'Everything visible. For power-user workflows.' },
])

export const LAYOUT_OPTIONS = Object.freeze([
  { id: 'three-panel@^1.0',              label: 'Three-panel',              scope: 'room' },
  { id: 'canvas-centric@^1.0',           label: 'Canvas-centric',           scope: 'room' },
  { id: 'document-centric@^1.0',         label: 'Document-centric',         scope: 'room' },
  { id: 'single-column-with-sheet@^1.0', label: 'Single column with sheet', scope: 'room' },
])

/**
 * Derive a layout from purpose + device + density. Phone always picks
 * single-column-with-sheet regardless of purpose. Custom returns null —
 * the user has to pick a layout manually in step 4.
 */
export function deriveLayout(config) {
  if (config.layoutOverride) return config.layoutOverride
  if (config.purpose === 'custom') return null
  if (config.device === 'visual-touch-phone') return 'single-column-with-sheet@^1.0'
  switch (config.purpose) {
    case 'data':
      return 'canvas-centric@^1.0'
    case 'drafting':
      return 'document-centric@^1.0'
    case 'writing':
      // Minimal writing → three-panel (less margin clutter); dense / moderate
      // benefit from the document-centric document body + margin gutters.
      return config.density === 'minimal'
        ? 'three-panel@^1.0'
        : 'document-centric@^1.0'
    case 'quick-chat':
    default:
      return 'three-panel@^1.0'
  }
}

// ─── Step 4: Features (optional components) ──────────────
//
// Each feature carries which slot it lands in for each layout. If a
// layout doesn't expose a compatible slot, the feature is silently
// skipped at conversion (the room can still be edited later).

export const FEATURES = Object.freeze([
  {
    id: 'highlights@^1.0',
    label: 'Highlights',
    description: 'Mark passages of conversation for later reference.',
    slotByLayout: {
      'three-panel@^1.0': 'right-rail',
      'document-centric@^1.0': 'margin',
      'canvas-centric@^1.0': 'inspector',
      'single-column-with-sheet@^1.0': 'sheet',
    },
  },
  {
    id: 'notes@^1.0',
    label: 'Notes',
    description: 'Drop standalone or message-anchored notes alongside the chat.',
    slotByLayout: {
      'three-panel@^1.0': 'right-rail-extra',
      'document-centric@^1.0': 'margin',
      'canvas-centric@^1.0': 'inspector',
      'single-column-with-sheet@^1.0': 'sheet',
    },
  },
  {
    id: 'branches@^1.0',
    label: 'Branches',
    description: 'Branch off any point in the conversation to explore alternatives.',
    slotByLayout: {
      'three-panel@^1.0': 'left-rail',
      'document-centric@^1.0': 'outline',
      'canvas-centric@^1.0': 'left-rail',
      'single-column-with-sheet@^1.0': 'sheet',
    },
  },
  {
    id: 'context@^1.0',
    label: 'Context meter',
    description: 'A token-budget indicator with auto-compress threshold control.',
    slotByLayout: {
      'three-panel@^1.0': 'right-rail',
      'document-centric@^1.0': 'margin',
      'canvas-centric@^1.0': 'inspector',
      'single-column-with-sheet@^1.0': 'sheet',
    },
  },
  {
    id: 'voice-input@^1.0',
    label: 'Voice input',
    description: 'Dictate messages instead of typing. Browser permission gates the mic.',
    slotByLayout: {
      'three-panel@^1.0': 'input-dock',
      'document-centric@^1.0': 'chat-panel',
      'canvas-centric@^1.0': 'input-dock',
      'single-column-with-sheet@^1.0': 'input-dock',
    },
  },
  {
    id: 'collab-mode@^1.0',
    label: 'Personas',
    description: 'Switch between Parrot Personas — system-prompt presets you save and reuse.',
    slotByLayout: {
      'three-panel@^1.0': 'right-rail-extra',
      'document-centric@^1.0': 'chat-panel',
      'canvas-centric@^1.0': 'inspector',
      'single-column-with-sheet@^1.0': 'sheet',
    },
  },
  {
    id: 'review@^1.0',
    label: 'Review',
    description: 'Synthesize a conversation into a structured review across categories.',
    slotByLayout: {
      'three-panel@^1.0': 'right-rail-extra',
      'document-centric@^1.0': 'margin',
      'canvas-centric@^1.0': 'inspector',
      'single-column-with-sheet@^1.0': 'sheet',
    },
  },
])

// ─── Step 6: Scheme options ──────────────────────────────

export const SCHEMES = Object.freeze([
  { id: 'parliament@^1.0',  label: 'Parliament',   swatch: '#C4A94D', description: 'Warm dusty gold. The default.' },
  { id: 'cool-bright@^1.0', label: 'Cool bright',  swatch: '#5A9FD4', description: 'Crisp blue. Good for daytime focus.' },
  { id: 'deep-calm@^1.0',   label: 'Deep calm',    swatch: '#6B7B8C', description: 'Muted slate. Easy on the eyes.' },
  { id: 'soft-violet@^1.0', label: 'Soft violet',  swatch: '#A380C4', description: 'Gentle violet. Friendly tone.' },
  { id: 'fresh-teal@^1.0',  label: 'Fresh teal',   swatch: '#5DAB94', description: 'Cool teal. Modern feel.' },
  { id: 'amber-glow@^1.0',  label: 'Amber glow',   swatch: '#D9805C', description: 'Warm amber. Cozy.' },
])

// ─── Build mode from wizard config ───────────────────────

/**
 * Turn a (possibly partial) wizard config into a fresh mode record. Falls
 * back to safe defaults wherever the user hasn't reached a step yet, so
 * the "Open in editor" escape can be invoked at any point from step 3+.
 *
 * Steps to reach this safely:
 *  - Pick a layout (step 3 or override). If no purpose chosen, defaults
 *    to a Quiet Room shape.
 *  - Components are derived from features set, plus messages + input.
 *
 * @param {object} config - wizard config
 * @returns {Promise<object>} the persisted mode
 */
export async function buildModeFromWizard(config) {
  const layoutRef = deriveLayout(config) || 'three-panel@^1.0'
  const components = wizardComponentsFor(layoutRef, config.features || new Set())
  const name = (config.name && config.name.trim()) || defaultName(config)

  // We re-use createModeFromTemplate — it generates a fresh mode id, fills
  // timestamps, and persists. The "template" here is synthesized in
  // memory; it never gets stored as a libraryRooms record.
  const synthetic = {
    id: `wizard_${Date.now()}`,
    scope: 'room',
    displayName: name,
    description: '',
    icon: null,
    deviceClass: config.device || 'visual-pointer',
    layout: { ref: layoutRef },
    scheme: { ref: config.schemeRef || 'parliament@^1.0' },
    components,
    buildIntent: config.purpose
      ? { source: 'wizard', purpose: config.purpose, density: config.density }
      : null,
  }

  return createModeFromTemplate(synthetic, { name })
}

function defaultName(config) {
  const purpose = (PURPOSES.find(p => p.id === config.purpose) || {}).label
  if (purpose) return `${purpose} room`
  return 'New room'
}

/**
 * Compose the components array for a wizard-built room. Every layout
 * gets messages + input as the baseline, plus any features the user
 * checked that have a slot in the chosen layout.
 *
 * Returns specs WITHOUT ids — createModeFromTemplate stamps fresh ids.
 */
export function wizardComponentsFor(layoutRef, features) {
  const baseline = baselineComponentsFor(layoutRef)
  const featureSpecs = []
  for (const featureId of features) {
    const feat = FEATURES.find(f => f.id === featureId)
    if (!feat) continue
    const slot = feat.slotByLayout[layoutRef]
    if (!slot) continue // Layout doesn't accommodate this feature; skip.
    featureSpecs.push({
      id: `wiz_${feat.id.split('@')[0]}`,
      ref: feat.id,
      slot,
      order: orderInSlot(baseline.concat(featureSpecs), slot),
      config: {},
    })
  }
  return baseline.concat(featureSpecs)
}

function orderInSlot(specs, slot) {
  const inSlot = specs.filter(s => s.slot === slot)
  return inSlot.length === 0 ? 0 : Math.max(...inSlot.map(s => s.order ?? 0)) + 1
}

function baselineComponentsFor(layoutRef) {
  // The two everyone needs: messages + input.
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
