// The gateway and the key module, wired to the app (stage 4). Everything
// that talks to a provider or source, or handles a key, goes through here.

import { destination } from './list'
import { createKeyring } from './keyring'
import { createGateway } from './gateway'
import { getProvider } from '../providers'
import { saveApiKey, loadApiKey, deleteApiKey, hasSavedKey } from '../lib/crypto'

export { Refused } from './gateway'
export { destination, shipped } from './list'

export const keys = createKeyring({
  load: (provider) => loadApiKey('persistent', provider),
  has: (provider) => hasSavedKey(provider),
  save: (provider, key) => saveApiKey(key, 'persistent', provider),
  remove: (provider) => deleteApiKey(provider),
})

// The code behind each shipped entry. Models come from src/providers;
// sources join as they ship (Wikipedia next, in this stage).
function implementation(id) {
  const d = destination(id)
  if (!d) return null
  if (d.kind === 'model') return getProvider(id)
  return null
}

export const gateway = createGateway({ destination, keyring: keys, implementation })
