# Security

Parliament is built so that we never hold your data: there is no server to send
it to. You do rely on the code your browser loads from `parliament.ltd`. That
code is public, and the app loads none from anywhere else.

## How it is built

There is no backend, no database of ours and no accounts. Everything you make
is stored in your browser. What leaves your device:

- **Your prompt.** When you press Enter, your prompt, the conversation it
  continues and anything you attached go straight from your browser to the
  provider or source named on the line under the bar. Nowhere else.
- **A model on your own machine.** If that is what you chose, the prompt goes
  no further than your computer.
- **Your key.** The key for a provider travels with the request, to that
  provider only. A model on your own machine and a source such as Wikipedia
  get no key.
- **A key check.** Saving or checking a key sends one very small test request
  to that provider.
- **A name for a new chat.** After the first answer in a new chat, one small
  request asks a model for a title, a summary and tags. The line under the bar
  says so before you send, and Settings can turn it off.
- **Web search, if you switch it on.** The provider runs the searches on its
  side, so search terms drawn from your chat reach the search service it uses.
- **Voice, if you use it.** Speech is turned into text on this device. No
  audio leaves it.
- **The app itself.** Your browser fetches Parliament's files from
  `parliament.ltd` and `keys.parliament.ltd`, hosted by Netlify. Like any web
  host it sees your IP address and browser type. It never receives your chats
  or keys.
- **Nothing else.** No analytics, no tracking, no advertising, and no code
  loaded from any other site.

## Your keys and the key vault

Each key is kept by Parliament's key vault, a small page of its own at
`keys.parliament.ltd` that Parliament loads in one frame. The vault stores the
keys in its own storage, which code on Parliament's page cannot read, and
sends requests to a provider itself, adding that provider's key. Code on the
page can ask the vault to send only to a provider on the vault's own list,
and only to the few addresses Parliament uses (`vault/allow.js`). A key is
typed into the vault's own field, so the page never holds it.

Keys are encrypted with AES-GCM under a key the browser will not let anyone
read out, so a copy of the stored data is useless outside this browser. With
Lock Parliament on, they are sealed again under the lock's key. Keys are never
put in a backup.

By default your keys are kept in this browser, encrypted. If you would rather
not store them, turn on "Don't save": keys are then held in memory only, and
you type them again after a reload.

The vault is deployed on its own, rarely, from a tagged release. It allows
four narrow exceptions to Parliament's rules, each written into
[CLAUDE.md](CLAUDE.md): it is the one frame the page allows; it is one more
host, Parliament's own; prompts and replies cross between the page and the
vault over one private channel, never a key; and it sends only what its own
list names, while the page decides and logs.

## Lock Parliament

In Settings, Lock Parliament encrypts what you make with a passphrase or a
passkey. Locked, nothing of yours is shown or readable until you unlock, and a
copy of the browser's storage is useless without the passphrase, the passkey
or the recovery code.

## The security policy

The policy below is copied from `src/lib/securityHeaders.js` by
`npm run reference`, and a test fails if they differ; `netlify.toml` and
`vault/netlify.toml` are held to the same values by tests.

<!-- policy: written by npm run reference from src/lib/securityHeaders.js; do not edit -->

**The page** (https://www.parliament.ltd), every response:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' http://localhost:11434 https://*.wikipedia.org https://hn.algolia.com https://api.openalex.org; img-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src https://keys.parliament.ltd; frame-ancestors 'none'; worker-src 'self'; manifest-src 'self';
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: accelerometer=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), hid=(), magnetometer=(), microphone=(self), midi=(), payment=(), serial=(), usb=(), window-management=(self)
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

And first in the head of the page itself, so that the service worker and the workers, which load their own scripts, are not covered:

```
Content-Security-Policy: require-trusted-types-for 'script'; trusted-types default
```

**The key vault** (https://keys.parliament.ltd), every response:

```
Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; connect-src https://api.anthropic.com https://api.mistral.ai https://api.eu.mistral.ai https://api.us.mistral.ai; img-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; frame-ancestors https://www.parliament.ltd;
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Origin-Agent-Cluster: ?1
Cross-Origin-Resource-Policy: same-site
Permissions-Policy: accelerometer=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), hid=(), magnetometer=(), microphone=(), midi=(), payment=(), serial=(), usb=()
```

And first in its page:

```
Content-Security-Policy: require-trusted-types-for 'script'; trusted-types 'none'
```

<!-- end of policy -->

In words: scripts, styles and images load only from Parliament itself. The
page connects only to itself, a model on your own machine and the sources
listed; providers that take a key are reached only through the key vault,
which connects to nothing else. The page may frame the vault and nothing
else, and the vault may be framed only by the page.

### Trusted Types

Each page also asks the browser to refuse to turn text into HTML, script, or a
script's address, unless Parliament's own policy says yes
(`src/lib/trustedTypes.js`). That policy lets through only the addresses of
Parliament's own built scripts, and never HTML or script text. Text from
outside, such as a reply, a source's answer, a pasted line or a restored file,
is always shown as text and can never run a command.

## Backups

Backups are `.parliament` files. With a password, the file is encrypted with
AES-256-GCM, using a key stretched from your password with PBKDF2 (SHA-256; the
number of rounds is written in the file). Without a password the file is plain
text that anyone holding it can read, and the backup window says so. API keys
are never included. Older `.apb` and JSON exports can still be read.

## What we don't do

- No analytics, tracking or advertising, and no scripts from other sites.
- The page connects only to the providers and sources you use. Each one is
  named in the policy above and shown in the network log in Settings.

## Reporting a vulnerability

Report a vulnerability privately: use "Report a vulnerability" on the
repository's Security tab, or write to support@parliament.ltd. Please do not
open a public issue for it.
