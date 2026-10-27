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

import { connectOrigins } from '../net/list'

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
  "frame-src 'none'",
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
