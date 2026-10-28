// Parliament's one Trusted Types policy (stage 15, piece 4; C270 (c), (d)).
//
// The built page asks the browser to refuse to turn text into HTML, script,
// or a script's address, unless a policy says yes (the tag in index.html,
// added at build by vite.config.js). This is that policy, named `default` so
// the libraries that hand the browser a plain address for a worker or the
// service worker pass through it:
// - a script's address only when it is one of this site's own built files,
//   /assets/….js or /sw.js;
// - never HTML, never script text.
// Loaded before anything else (main.jsx). In development the page asks for
// none of this, and the policy is never consulted.

const OWN_SCRIPT = /^\/(assets\/[\w.-]+\.js|sw\.js)$/

/** Whether an address is one of this site's own built scripts. */
export function ownScript(value, here) {
  try {
    const url = new URL(String(value), here)
    return url.origin === new URL(here).origin && OWN_SCRIPT.test(url.pathname) && !url.search.includes('<') ? url.href : null
  } catch {
    return null
  }
}

export function installPolicy(g = globalThis) {
  const tt = g.trustedTypes
  if (!tt?.createPolicy || tt.defaultPolicy) return null
  const here = g.location?.href ?? 'http://localhost/'
  return tt.createPolicy('default', {
    createHTML: () => { throw new TypeError('Parliament turns no text into HTML') },
    createScript: () => { throw new TypeError('Parliament runs no script from text') },
    createScriptURL: (value) => {
      const ok = ownScript(value, here)
      if (!ok) throw new TypeError('Only this site\'s own scripts may load')
      return ok
    },
  })
}

installPolicy()
