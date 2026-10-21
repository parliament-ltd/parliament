// The gateway: the one way out to a provider or source (refactor-plan.md
// §4 and stage 4; request-path audit §8; CLAUDE.md, hard constraints).
//
// Every request to a provider or source goes through call(). It:
// - refuses a provider or source that is not in the list, or not shipped,
//   so nothing reaches a host the connection policy does not name;
// - picks the key by the provider's id, from the key module, so no caller
//   can hand one provider's key to another, and refuses when there is none;
// - labels the request with what made it, for the network log;
// - passes no key to a source, which never needs one.
//
// Whether a board may make a request at all (its declared capabilities)
// joins here when boards declare them. A lint rule keeps provider code and
// keys reachable only through src/net (eslint.config.js).
//
// Pure: the list, the keyring and the implementations are passed in, so it
// runs in tests without the app; src/net/index.js wires the real ones.

export class Refused extends Error {
  /** @param {'unknown'|'not-shipped'|'no-method'|'no-key'} reason */
  constructor(reason, id) {
    super(`Refused: ${reason} (${id})`)
    this.name = 'Refused'
    this.reason = reason
    this.destination = id
  }
}

/**
 * @param {{ destination: (id: string) => object|null, keyring: { get: (id: string) => Promise<string|null> },
 *   implementation: (id: string) => object|null, now?: () => number }} deps
 */
export function createGateway({ destination, keyring, implementation, now = () => Date.now() }) {
  let log = []
  const listeners = new Set()
  const note = (entry) => {
    log = [...log.slice(-199), entry]
    listeners.forEach((fn) => fn())
  }

  return {
    /**
     * Calls a method of a provider or source.
     * @param {string} id the provider or source, from the list
     * @param {string} method its method: sendMessage, generateMetadata, answer…
     * @param {Array} args the method's arguments, after the key
     * @param {{ label: string }} options what made the request, for the log
     */
    async call(id, method, args = [], { label } = {}) {
      const dest = destination(id)
      if (!dest) throw new Refused('unknown', id)
      if (!dest.ships) throw new Refused('not-shipped', id)
      const impl = implementation(id)
      if (!impl || typeof impl[method] !== 'function') throw new Refused('no-method', id)
      let key = null
      if (dest.key) {
        key = await keyring.get(id)
        if (!key) throw new Refused('no-key', id)
      }
      const entry = { at: now(), to: id, method, label: label ?? method }
      note(entry)
      return dest.key ? impl[method](key, ...args) : impl[method](...args)
    },

    /**
     * Checks a key the person has typed, before it is kept: it goes only to
     * its own provider, and is not stored by this call.
     */
    async check(id, candidate, { label = 'check key' } = {}) {
      const dest = destination(id)
      if (!dest) throw new Refused('unknown', id)
      if (!dest.ships) throw new Refused('not-shipped', id)
      if (!dest.key) throw new Refused('no-method', id)
      const impl = implementation(id)
      if (!impl || typeof impl.validateKey !== 'function') throw new Refused('no-method', id)
      note({ at: now(), to: id, method: 'validateKey', label })
      return impl.validateKey(candidate)
    },

    /** The requests made, oldest first: what made each, where it went. Never a key or content. */
    requests: () => log,
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}
