// The key module (refactor-plan.md §4 and stage 4; request-path audit §8).
//
// One place holds keys, one per provider. A key is either saved, encrypted
// in its own store (crypto.js, keyStore.js), which is the default (ruled 11
// October), or, when the person chooses "Don't save", held in this tab's
// memory only and gone when the tab closes. Before this, "Don't save" kept
// the key nowhere, so the chat said there was no key (audit finding).
//
// Keys go out only through the gateway, which asks for a provider's key by
// the provider's id, so no caller can hand one provider's key to another.
// They are never logged, never put in a backup, and never cross windows.
//
// Pure: the saved store is passed in, so this runs in tests without the app.

/**
 * @param {{ load: (provider: string) => Promise<string|null>, has: (provider: string) => Promise<boolean>,
 *   save: (provider: string, key: string) => Promise<void>, remove: (provider: string) => Promise<void> }} saved
 */
export function createKeyring(saved) {
  const held = new Map() // provider -> key, this tab only

  return {
    /** The key for a provider, held or saved, or null. */
    async get(provider) {
      if (held.has(provider)) return held.get(provider)
      return (await saved.load(provider)) || null
    },

    /** Whether there is a key for a provider, without decrypting a saved one. */
    async has(provider) {
      return held.has(provider) || Boolean(await saved.has(provider))
    },

    /** Whether the provider's key is held for this tab only. */
    isHeld(provider) {
      return held.has(provider)
    },

    /**
     * Puts a key in. Saved by default; with { save: false } it is held in
     * this tab's memory, and any saved copy is removed, since the person
     * asked for it not to be kept.
     */
    async put(provider, key, { save = true } = {}) {
      if (typeof key !== 'string' || !key.trim()) throw new Error('A key is needed')
      if (save) {
        await saved.save(provider, key)
        held.delete(provider)
      } else {
        held.set(provider, key)
        await saved.remove(provider)
      }
    },

    /** Removes a provider's key, held and saved. */
    async remove(provider) {
      held.delete(provider)
      await saved.remove(provider)
    },

    /** Forgets every held key, as closing the tab does. */
    forgetHeld() {
      held.clear()
    },
  }
}
