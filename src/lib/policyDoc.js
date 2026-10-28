// The policy block in SECURITY.md, written from securityHeaders.js (stage 15,
// piece 5; C272 (d); privacy draft 6), so what the document prints is what
// both sites send. `npm run reference` writes it between the markers; a test
// fails when it is out of date.

import { SECURITY_HEADERS, VAULT_HEADERS, PAGE_TRUSTED_TYPES, VAULT_TRUSTED_TYPES, VAULT_SITE, PAGE_SITE } from './securityHeaders'

export const BEGIN = '<!-- policy: written by npm run reference from src/lib/securityHeaders.js; do not edit -->'
export const END = '<!-- end of policy -->'

const block = (headers) => ['```', ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`), '```'].join('\n')

export function policyMarkdown() {
  return [
    BEGIN,
    '',
    `**The page** (${PAGE_SITE}), every response:`,
    '',
    block(SECURITY_HEADERS),
    '',
    'And first in the head of the page itself, so that the service worker and the workers, which load their own scripts, are not covered:',
    '',
    block({ 'Content-Security-Policy': PAGE_TRUSTED_TYPES }),
    '',
    `**The key vault** (${VAULT_SITE}), every response:`,
    '',
    block(VAULT_HEADERS),
    '',
    'And first in its page:',
    '',
    block({ 'Content-Security-Policy': VAULT_TRUSTED_TYPES }),
    '',
    END,
  ].join('\n')
}

/** SECURITY.md with its block replaced by the current one. */
export function withPolicy(text) {
  const a = text.indexOf(BEGIN)
  const b = text.indexOf(END)
  if (a < 0 || b < a) throw new Error('SECURITY.md has no policy markers')
  return text.slice(0, a) + policyMarkdown() + text.slice(b + END.length)
}
