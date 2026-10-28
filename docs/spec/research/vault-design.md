# The key vault: design (stage 15, piece 2)

**Built in piece 3 (C269), 28 October 2026,** as written here, except that the page passes the vault's field its words (section 5).

Written 27 October 2026, for C170 (build it), C264 (e) (its address and the
four exceptions, approved) and C267 (its open points). Built in piece 3. Where
C267 has a choice still open, both ways are written and marked.

## 1. What it is for

A key saved in Parliament is encrypted, but any code running on Parliament's
page (a compromised package, a scripting bug) can ask the key module for it,
read it, and send it anywhere. A stolen key works until it is revoked.

The vault is a second, very small site of Parliament's, `keys.parliament.ltd`,
loaded invisibly inside the page. It alone holds the keys, in its own storage,
which the page's code cannot read: browsers keep each address's storage apart.
The page asks the vault to send a request to a provider; the vault adds the
key and sends it.

- **It stops:** code on the page reading a key, and so taking it elsewhere.
- **It does not stop:** that code asking the vault to send requests while
  Parliament is open, within what the vault allows (section 4), or reading
  chats. The provider's spending limit stays the backstop.
- **It relies on:** the vault's own code being sound and rarely changed. It is
  small, deployed on its own, rarely, with published file hashes, and is the
  first thing an outside review looks at (C264 (e)).

## 2. The parts

```
 www.parliament.ltd (the page)                   keys.parliament.ltd (the vault)
 ┌────────────────────────────────────┐          ┌───────────────────────────────┐
 │ provider code (anthropic, mistral) │          │ allow list per provider       │
 │   builds the request, key = ⟨key⟩   │  one     │ key store (its own IndexedDB) │
 │ vault client: fetch through vault ─┼─private─▶│ adds the key, sends, streams  │
 │ gateway: decides and logs          │◀channel──┼─ the reply back in pieces     │
 │ key panel ─ frame of the vault's ──┼──────────┼─ field: Save, Don't save,     │
 │             own field              │ outcomes │   Remove (the key typed here) │
 └────────────────────────────────────┘          └───────────────────────────────┘
        Ollama and the sources: straight from the page, no key, as today
```

### The page's side

- **The gateway** stays the one way out. For a keyed provider it no longer
  asks the key module for a key. It hands the provider's code a stand-in, the
  text `⟨vault:anthropic⟩`, and a `fetch` that goes through the vault. The
  gateway still decides whether a request may go and logs it.
- **Provider code** is unchanged except that it uses the `fetch` it is given
  rather than the browser's own. It builds headers as now, with the stand-in
  where the key was, and reads the reply's stream as now.
- **The vault client** (`src/net/vaultClient.js`):
  - opens the frame and the private channel (section 3);
  - turns a `fetch` call into a request message;
  - turns the pieces that come back into an ordinary `Response` with a
    readable body, so provider code cannot tell the difference;
  - passes "stop" when the request's signal aborts.
- **The key module** keeps only what the page may know: whether each
  provider has a key, its last four characters, and whether it is held for
  this tab only. The vault reports these and never the key.

### The vault's side

A separate small build from this repository (`vault/`), with no framework:

- `vault/index.html` and `vault/vault.js`: the channel, the allow list, the
  send.
- `vault/store.js`: keys in the vault's own IndexedDB, encrypted with Web
  Crypto (AES-GCM, a non-extractable key), as `crypto.js` does today. "Don't
  save" holds a key in the vault frame's memory only.
- `vault/panel.html`: the key field the `api:` panel shows (section 5).
- The provider allow list (section 4), written into the vault's own code,
  not sent by the page.

Its size target is a few hundred lines, readable in one sitting.

## 3. The channel

- The page creates the frame (`https://keys.parliament.ltd/`, hidden) and,
  on its `load`, sends it one `MessagePort` with `postMessage(…, origin)`
  naming the vault's exact address.
- The vault accepts a port only from a message whose `origin` is exactly
  `https://www.parliament.ltd` (in development, the app's local address).
- Every later message travels on that port alone, never on `window` and
  never on the tab-to-tab `BroadcastChannel`.
- Messages, page to vault:
  - `{ id, kind: 'send', provider, url, method, headers, body }`;
  - `{ id, kind: 'stop' }`;
  - `{ kind: 'status' }`.
- Messages, vault to page:
  - `{ id, kind: 'head', status, headers }`, then `{ id, kind: 'piece', bytes }` as the reply arrives;
  - `{ id, kind: 'end' }`, or `{ id, kind: 'error', reason }`;
  - `{ kind: 'keys', providers: [{ id, has, held, ending }] }` whenever keys change;
  - `{ kind: 'sent', provider, url, at }` for the network log.
- Replies come back as pieces in messages. Handing a whole stream across
  works in Chromium (tried, section 9) but not in every browser on the list.
- Header names the page may send are an allow list too (`content-type`,
  `accept`, `anthropic-version`, `anthropic-beta`,
  `anthropic-dangerous-direct-browser-access`). The vault sets the key
  header itself: Anthropic's `x-api-key`, Mistral's `Authorization: Bearer`.

## 4. What the vault allows

For each keyed provider, its origins and the paths Parliament uses. Anything
else is refused, and the page is told why.

| Provider | Origins | Methods and paths |
| --- | --- | --- |
| Anthropic | `https://api.anthropic.com` | `POST /v1/messages`, `POST /v1/messages/count_tokens` |
| Mistral | `https://api.mistral.ai`, `https://api.eu.mistral.ai`, `https://api.us.mistral.ai` | `POST /v1/chat/completions`, `GET /v1/models` |

The key check uses the same paths. A new provider or path is a vault deploy,
reviewed, which is the point.

## 5. The key panel

- `api:` shows the panel on the page as today: the provider rows, training
  labels, guides, Ollama. Where a key is typed, it embeds the vault's own
  small frame (`https://keys.parliament.ltd/panel?provider=anthropic`), with
  the field, Save, "Don't save" and Remove.
- The key is typed into the vault's frame, so the page never holds it, even
  for a moment. The vault checks it with its provider itself, then tells the
  page only the outcome:
  - saved, and whether it is new, which sets off the ignition;
  - not accepted;
  - out of credit;
  - not reached.
- The frame is styled to match, with its own small stylesheet of the same
  tokens, and carries its few words (English now).

## 6. Storage, and the lock

- The vault's database is `parliament-keys` at `keys.parliament.ltd`, holding
  each provider's key, encrypted. Nothing else.
- Keys are never in a backup, as now. The page's backup cannot reach them
  anyway.
- **With Lock Parliament on** (C267 (e), a choice):
  1. At unlock the page lends the vault its data key, a Web Crypto key the
     browser will not let anyone read out, only use. It goes over the private
     channel. The vault seals the API keys under it, and forgets it when
     Parliament locks. One unlock; a copied profile yields nothing.
  2. The vault has its own lock, and you unlock twice.
  3. The vault ignores the lock.

  Suggested: 1.
- **Keeping storage:** Chromium declined the vault frame's request to keep
  its storage (section 9). If the browser clears the vault's storage under
  pressure, the keys are gone and are pasted again; chats are not affected.
  The panel says so where the browser has not agreed.

## 7. Moving the keys people already have

C267 (d), a choice:

1. **Moved once, over the private channel,** then deleted from the page's
   database. Shown before it runs.
2. **Pasted again** into the vault's panel; the page's copies are deleted
   once the vault holds one.

Suggested: 1.

## 8. Headers and hosting

- **The vault** (`keys.parliament.ltd`, its own Netlify site, built from
  `vault/`):
  - `Content-Security-Policy: default-src 'none'; script-src 'self';
    style-src 'self'; connect-src` the keyed providers' origins only`;
    frame-ancestors https://www.parliament.ltd; base-uri 'none';
    form-action 'none'`;
  - `Origin-Agent-Cluster: ?1`, so the browser never merges the two pages
    by the old `document.domain` rule;
  - `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, and
    `Cross-Origin-Resource-Policy: same-site`.
  - It is deployed only from a tagged release, with its files' hashes
    published.
- **The page** (`www.parliament.ltd`):
  - `frame-src https://keys.parliament.ltd`, the one frame allowed, where
    today none is;
  - Anthropic and Mistral leave its `connect-src`: the page itself can no
    longer reach a keyed provider at all.
  - The list (`src/net/list.js`) marks them as reached through the vault,
    and the test that keeps `netlify.toml` equal to the headers learns it.
- **DNS:** one record at deSEC, `keys` to the vault's Netlify site. It is
  never left pointing at a deleted site.
- **Development:** the vault runs on `localhost:5175` beside the app,
  configured by one setting, so the trial copy works the same way.

## 9. Tried: does a browser keep the vault's storage?

The one unknown from the scope review. Tried on 27 October 2026 in Chromium
(the in-app browser), with `scripts/vault-trial/`: a page on
`localhost:5190` framing a vault on `localhost:5191`. These are the same
site and different origins, as `www` and `keys` will be. The control is the
page on `127.0.0.1:5190`, a different site.

| Check | Result |
| --- | --- |
| Write a value in the framed vault, reload, read | Kept |
| Read from a second tab | Same value |
| Open the vault on its own address | Same value: its storage is not split off for being framed |
| Read from the different site (control) | Nothing: split off, so the check can tell the two apart |
| Replies in pieces over the channel | Arrived in order |
| A whole stream handed across | Works in Chromium |
| Asking the browser to keep the vault's storage | Declined in the frame |

Still to try, with the same pages (`node scripts/vault-trial/server.mjs`,
then `http://localhost:5190/top.html`): Firefox, LibreWolf and Zen, and
closing the browser between write and read. Safari waits, as ruled.

## 10. The exceptions, for CLAUDE.md

Approved in C264 (e); the wording is added to the hard constraints when the
vault is built:

- **One framed origin.** The page may frame `https://keys.parliament.ltd`
  and nothing else; the vault may be framed only by the page.
- **One more host,** Parliament's own `keys.parliament.ltd`.
- **One private channel.** Prompts and replies cross between the page and
  its vault frame over one `MessageChannel`, never `BroadcastChannel`, and
  never an API key. With C267 (d) 1, the move of existing keys, once, is the
  one exception. With C267 (e) 1, the lock's unreadable data key may cross
  too.
- **One gateway, two halves.** The page decides and logs; the vault sends,
  and refuses anything its own list does not name.

## 11. Built in piece 3, in order

1. The vault build (`vault/`, a second Vite config), its store, allow list and channel, with tests.
2. The vault client and the gateway's keyed `fetch`; provider code takes the
   `fetch` it is given.
3. The key panel's frame and its outcomes.
4. The move of existing keys (C267 (d)), shown before it runs.
5. The lock's lent key (C267 (e)).
6. Headers for both sites; the list and its test; CLAUDE.md's exceptions.
7. Tried end to end on the trial copy, the vault on `localhost:5175`.
