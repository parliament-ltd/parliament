// The response headers the site is served with.
//
// netlify.toml carries the same values for the deployed site; a test checks
// that the two match. vite.config.js applies these to `vite preview`, so a
// production build can be tried locally under the real policy before deploy.
// `npm run dev` runs without them: the dev server injects inline scripts for
// hot reload, which the policy forbids.
//
// A new host is added only when its provider or source ships (CLAUDE.md,
// hard constraints): connect-src is generated from the list of providers
// and sources (src/net/list.js), where an entry is marked as shipped, and
// netlify.toml must then say the same, which a test checks.

import { connectOrigins, vaultOrigins } from '../net/list'

// The key vault's address (stage 15; research/vault-design.md §8): the one
// frame the page allows, and the one page that may frame the vault.
export const VAULT_SITE = 'https://keys.parliament.ltd'
export const PAGE_SITE = 'https://www.parliament.ltd'

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  ["connect-src 'self'", ...connectOrigins()].join(' '),
  "img-src 'self' data:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  `frame-src ${VAULT_SITE}`,
  "frame-ancestors 'none'",
  "worker-src 'self'",
  "manifest-src 'self'",
].join('; ') + ';'

// The microphone is allowed for this site only: voice input transcribes on
// the device (ruling C70). Placing windows on other screens is allowed for
// this site only, and the browser still asks the person once (C259 (i)).
// Everything else Parliament does not use is off.
export const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'camera=()',
  'display-capture=()',
  'geolocation=()',
  'gyroscope=()',
  'hid=()',
  'magnetometer=()',
  'microphone=(self)',
  'midi=()',
  'payment=()',
  'serial=()',
  'usb=()',
  'window-management=(self)',
].join(', ')

// The vault's own headers (keys.parliament.ltd; vault/netlify.toml): nothing
// from anywhere but itself, connections to the keyed providers only, framed
// only by the page, and its own agent cluster so the browser never merges it
// with the page by the old document.domain rule.
export const VAULT_CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  ["connect-src", ...vaultOrigins()].join(' '),
  "img-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  `frame-ancestors ${PAGE_SITE}`,
].join('; ') + ';'

export const VAULT_HEADERS = {
  'Content-Security-Policy': VAULT_CONTENT_SECURITY_POLICY,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Origin-Agent-Cluster': '?1',
  'Cross-Origin-Resource-Policy': 'same-site',
  'Permissions-Policy': 'accelerometer=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), hid=(), magnetometer=(), microphone=(), midi=(), payment=(), serial=(), usb=()',
}

export const SECURITY_HEADERS = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': PERMISSIONS_POLICY,
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
}
