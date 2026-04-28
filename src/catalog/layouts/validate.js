// Layout manifest validator (PR-3).
//
// A layout entry declares the slot inventory a room can target plus a render
// function that arranges resolved slot contents. The IndexedDB
// libraryLayouts record carries only browsable metadata (displayName,
// description, status) — the runtime-critical shape lives here, in code.

import { ALL_SLOT_IDS, SLOT_CAPACITY_VALUES } from '../../lib/slots'

const VERSION_RE = /^\d+\.\d+(\.\d+)?$/
const NAME_RE    = /^[a-z][a-z0-9-]*$/

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0
}

function validateSlot(s, idx, errors, seenIds) {
  if (!isPlainObject(s)) {
    errors.push(`slots[${idx}]: must be an object`)
    return
  }
  if (!isNonEmptyString(s.id)) {
    errors.push(`slots[${idx}].id: required string`)
  } else {
    if (!ALL_SLOT_IDS.includes(s.id)) {
      errors.push(`slots[${idx}].id: '${s.id}' is not a known slot id`)
    }
    if (seenIds.has(s.id)) {
      errors.push(`slots[${idx}].id: '${s.id}' duplicated in this layout`)
    } else {
      seenIds.add(s.id)
    }
  }
  if (!isNonEmptyString(s.capacity)) {
    errors.push(`slots[${idx}].capacity: required string`)
  } else if (!SLOT_CAPACITY_VALUES.includes(s.capacity)) {
    errors.push(`slots[${idx}].capacity: '${s.capacity}' must be one of ${SLOT_CAPACITY_VALUES.join(', ')}`)
  }
}

/**
 * Validate a layout manifest entry.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateLayoutManifest(entry) {
  const errors = []

  if (!isPlainObject(entry)) {
    return { valid: false, errors: ['layout manifest must be an object'] }
  }

  if (!isNonEmptyString(entry.name)) {
    errors.push('name: required non-empty string')
  } else if (!NAME_RE.test(entry.name)) {
    errors.push(`name: '${entry.name}' must match ${NAME_RE}`)
  }
  if (!isNonEmptyString(entry.version)) {
    errors.push('version: required non-empty string')
  } else if (!VERSION_RE.test(entry.version)) {
    errors.push(`version: '${entry.version}' must match ${VERSION_RE}`)
  }
  if (!isNonEmptyString(entry.displayName)) errors.push('displayName: required non-empty string')

  if (entry.scope !== 'room' && entry.scope !== 'homepage') {
    errors.push("scope: must be 'room' or 'homepage'")
  }

  if (!Array.isArray(entry.slots) || entry.slots.length === 0) {
    errors.push('slots: required non-empty array')
  } else {
    const seen = new Set()
    entry.slots.forEach((s, i) => validateSlot(s, i, errors, seen))
  }

  if (typeof entry.render !== 'function') {
    errors.push('render: required function ({ slotContents }) => ReactNode')
  }

  return { valid: errors.length === 0, errors }
}

export function layoutRef(entry) {
  return `${entry.name}@${entry.version}`
}
