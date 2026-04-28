// Manifest validator for V2 catalog entries.
//
// Two surfaces use this:
//   - the in-memory registry in ./index.js (rejects malformed entries on register)
//   - the dev-only /catalog debug route (renders pass/fail per entry)
//
// Validation is intentionally lenient — non-runtime fields (descriptions,
// labels) are checked for type only, not content. The runtime-critical
// invariants (tier, slot targets, render function, configSchema key shape)
// are checked strictly.
//
// Returns { valid: boolean, errors: string[], warnings: string[] }.

import { TIER_VALUES } from '../lib/catalog'
import { ALL_SLOT_IDS } from '../lib/slots'

const VERSION_RE   = /^\d+\.\d+(\.\d+)?$/
const NAME_RE      = /^[a-z][a-z0-9-]*$/        // lowercase, kebab-friendly
const CAMEL_KEY_RE = /^[a-z][a-zA-Z0-9]*$/      // configSchema key shape

const FIELD_TYPES = new Set([
  'boolean', 'number', 'string', 'enum', 'object', 'array',
])

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0
}

function validateSlotTarget(t, idx, errors) {
  if (!isPlainObject(t)) {
    errors.push(`slotTargets[${idx}]: must be an object`)
    return
  }
  if (!isNonEmptyString(t.slot)) {
    errors.push(`slotTargets[${idx}].slot: must be a non-empty string`)
    return
  }
  if (!ALL_SLOT_IDS.includes(t.slot)) {
    errors.push(`slotTargets[${idx}].slot: '${t.slot}' is not a known slot id`)
  }
  if (t.primary !== undefined && typeof t.primary !== 'boolean') {
    errors.push(`slotTargets[${idx}].primary: must be boolean if present`)
  }
  if (t.fallbackOk !== undefined && typeof t.fallbackOk !== 'boolean') {
    errors.push(`slotTargets[${idx}].fallbackOk: must be boolean if present`)
  }
}

function validateConfigSchemaField(key, field, errors) {
  if (!CAMEL_KEY_RE.test(key)) {
    errors.push(`configSchema['${key}']: key must be camelCase (per mode-file-format §3.1)`)
  }
  if (!isPlainObject(field)) {
    errors.push(`configSchema['${key}']: field must be an object`)
    return
  }
  if (!isNonEmptyString(field.type)) {
    errors.push(`configSchema['${key}'].type: required string`)
  } else if (!FIELD_TYPES.has(field.type)) {
    errors.push(`configSchema['${key}'].type: '${field.type}' not in supported types (${[...FIELD_TYPES].join(', ')})`)
  }
  if (field.type === 'enum') {
    if (!Array.isArray(field.options) || field.options.length === 0) {
      errors.push(`configSchema['${key}'].options: enum fields require a non-empty options array`)
    }
  }
  if (field.label !== undefined && typeof field.label !== 'string') {
    errors.push(`configSchema['${key}'].label: must be a string if present`)
  }
}

function validateSoftDependency(d, idx, errors) {
  if (!isPlainObject(d)) {
    errors.push(`softDependencies[${idx}]: must be an object`)
    return
  }
  if (!isNonEmptyString(d.component)) {
    errors.push(`softDependencies[${idx}].component: required string (e.g. 'file-shelf@1.0')`)
  }
  if (!isNonEmptyString(d.fallbackUI)) {
    errors.push(`softDependencies[${idx}].fallbackUI: required string (key into shared empty-state templates)`)
  }
}

function validateMessageAction(a, idx, errors) {
  if (!isPlainObject(a)) {
    errors.push(`contributions.messageActions[${idx}]: must be an object`)
    return
  }
  if (!isNonEmptyString(a.id)) {
    errors.push(`contributions.messageActions[${idx}].id: required string`)
  }
  if (!isNonEmptyString(a.label)) {
    errors.push(`contributions.messageActions[${idx}].label: required string`)
  }
  // handler is wired at runtime (PR-3+), so we don't require it at manifest time.
}

/**
 * Validate a catalog manifest entry.
 *
 * @param {object} entry
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateManifest(entry) {
  const errors = []
  const warnings = []

  if (!isPlainObject(entry)) {
    return { valid: false, errors: ['manifest must be an object'], warnings }
  }

  // ─── Identity ──────────────────────────────────────
  if (!isNonEmptyString(entry.name)) {
    errors.push('name: required non-empty string')
  } else if (!NAME_RE.test(entry.name)) {
    errors.push(`name: '${entry.name}' must match ${NAME_RE} (lowercase, kebab)`)
  }
  if (!isNonEmptyString(entry.version)) {
    errors.push('version: required non-empty string')
  } else if (!VERSION_RE.test(entry.version)) {
    errors.push(`version: '${entry.version}' must match ${VERSION_RE}`)
  }
  if (!isNonEmptyString(entry.displayName))  errors.push('displayName: required non-empty string')
  if (!isNonEmptyString(entry.author))       errors.push('author: required non-empty string')
  if (!isNonEmptyString(entry.description))  errors.push('description: required non-empty string')

  // ─── Tier ──────────────────────────────────────────
  if (!isNonEmptyString(entry.tier)) {
    errors.push('tier: required string')
  } else if (!TIER_VALUES.includes(entry.tier)) {
    errors.push(`tier: '${entry.tier}' must be one of ${TIER_VALUES.join(', ')}`)
  } else if (entry.tier === 'agent') {
    // Phase 1 ships no Agent components — flag as a warning so reviewers catch it.
    warnings.push("tier: 'agent' components ship in Phase 2 only (see refactor/tier-classification.md)")
  }

  // ─── Slot targets ──────────────────────────────────
  if (!Array.isArray(entry.slotTargets) || entry.slotTargets.length === 0) {
    errors.push('slotTargets: required non-empty array')
  } else {
    entry.slotTargets.forEach((t, i) => validateSlotTarget(t, i, errors))
    const primaryCount = entry.slotTargets.filter(t => t && t.primary === true).length
    if (primaryCount > 1) {
      warnings.push(`slotTargets: ${primaryCount} entries marked primary; convention is at most one`)
    }
  }

  // ─── Capability requirements ───────────────────────
  if (entry.capabilityRequirements === undefined) {
    errors.push('capabilityRequirements: required array (use [] when none)')
  } else if (!Array.isArray(entry.capabilityRequirements)) {
    errors.push('capabilityRequirements: must be an array')
  } else if (!entry.capabilityRequirements.every(c => isNonEmptyString(c))) {
    errors.push('capabilityRequirements: every entry must be a non-empty string')
  }

  // ─── Config schema ─────────────────────────────────
  if (!isPlainObject(entry.configSchema)) {
    errors.push('configSchema: required object (use {} when none)')
  } else {
    for (const [key, field] of Object.entries(entry.configSchema)) {
      validateConfigSchemaField(key, field, errors)
    }
  }

  // ─── Optional: softDependencies ────────────────────
  if (entry.softDependencies !== undefined) {
    if (!Array.isArray(entry.softDependencies)) {
      errors.push('softDependencies: must be an array if present')
    } else {
      entry.softDependencies.forEach((d, i) => validateSoftDependency(d, i, errors))
    }
  }

  // ─── Optional: contributions ───────────────────────
  if (entry.contributions !== undefined) {
    if (!isPlainObject(entry.contributions)) {
      errors.push('contributions: must be an object if present')
    } else if (entry.contributions.messageActions !== undefined) {
      if (!Array.isArray(entry.contributions.messageActions)) {
        errors.push('contributions.messageActions: must be an array if present')
      } else {
        entry.contributions.messageActions.forEach((a, i) => validateMessageAction(a, i, errors))
      }
    }
  }

  // ─── Render ────────────────────────────────────────
  if (typeof entry.render !== 'function') {
    errors.push('render: required function (config, hostAPI) => ReactNode')
  }
  if (entry.previewRender !== undefined && typeof entry.previewRender !== 'function') {
    errors.push('previewRender: must be a function if present')
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Build the canonical `name@version` ref from an entry.
 */
export function entryRef(entry) {
  return `${entry.name}@${entry.version}`
}
