# The key vault: scope review (S1)

Written 22 October 2026, at stage 7, piece 8. Ruled 21 October (S1): "the vault: not now ... its own scope review with stage 7 or 15, and there the most secure design wins". This is that review. It decides nothing: the question at the end is put to Stefan at the stage 7 checkpoint (C170).

Read with: `security-privacy-decisions.md` §2, `conflicts.md` Part 10, CLAUDE.md's hard constraints, `research/security-audit.md`.

## 1. What a key is up against

A key is stored encrypted in its own database (`parliament-keystore`), with AES-GCM under a browser key that cannot be exported (`src/lib/crypto.js`), and decrypted for a moment on each request, inside `src/net` only (a lint rule keeps provider code and the key functions there).

| Threat | Today | Notes |
|---|---|---|
| Someone copies the browser's profile from the disk | Not stopped | The browser key that unlocks the key is stored in the same profile, so the copy can decrypt it. A passphrase or a passkey would stop this (Lock Parliament, after stage 9) |
| Code running on Parliament's own page: a compromised dependency, a cross-site scripting bug, a bad block | Not stopped | It can call the same decrypt function the app calls, read the key and send it anywhere it can reach. The connection policy limits where it can send from this page, but not what it does with a key once it has it (a key in a link the person clicks, for example) |
| The same code, using the key without reading it | Not stopped | It can ask the gateway to send prompts, and read every chat, which are not encrypted |
| A browser extension that reads every site | Not stopped | No page can stop this; advice in the browser support table (stage 15) |
| Malware on the computer | Not stopped | Out of a web page's reach |
| A key leaking anyway | Limited | The key panel suggests a key for Parliament alone, in its own workspace with a spending limit, and how to revoke one (done in stage 5) |

The difference between the second and third rows matters: a key that is **read** can be used from anywhere, for as long as it is valid, and the person never sees it happen; a key that is only **used** through the page can be used only while the page is open, through the providers on the list, and every request shows in the network log.

## 2. The options

### A. As built, with the layers already planned

Keep the key module. Add, as already planned: Lock Parliament (a passphrase or passkey wraps the browser key, so a copied profile is useless; after stage 9), Trusted Types and styles without `unsafe-inline` (fewer ways for injected code to run; stage 15), exact dependency versions and as few packages as possible (stage 15), published file hashes once the repository is public (stage 15).

- Stops: a copied profile (with Lock Parliament); makes injected code less likely.
- Does not stop: code that does run on the page reading the key.
- Costs: nothing beyond what is planned.

### B. A vault on its own origin

A small page on another origin of Parliament's (for example `keys.parliament.ltd`, its own Netlify site), loaded in a hidden frame. It alone holds the keys, in its own storage, which the main page's code cannot read. It has its own key panel, since a key typed into a field on the main page can be read by code on the main page. The main page sends it a request (a provider, a model, the messages) over one private channel; the vault checks the provider is on its list and sends it with the key; the reply streams back.

- Stops: code on the main page **reading** a key. That is the one measure here that does.
- Does not stop: that code **using** the key through the vault while the page is open (it can ask the vault to send what it likes, to the listed providers), or reading chats. A deploy that is compromised could change the vault too, unless the vault is a separate site with its own, rarer deploys and published hashes.
- Costs, against the hard constraints (each would be a narrow, written exception):
  1. **Frames.** The main site forbids frames (`frame-src 'none'`, `X-Frame-Options: DENY`). It would allow exactly one, the vault's origin; the vault would allow being framed only by `https://parliament.ltd` (`frame-ancestors`).
  2. **A new host.** "A new host is added only with its provider or source": the vault is Parliament's own host, not a provider's. One more entry, on the list, in the policy.
  3. **Content across windows.** "Cross-window messages carry ids and signals only, never content or keys": prompts and replies would cross to the vault and back. The exception would be one private `MessageChannel` between the page and its vault frame, never `BroadcastChannel`, and still never a key.
  4. **One gateway.** The gateway and its network log would sit on both sides: the page decides and logs what is sent, the vault sends. The vault would report each request back for the log, and refuse anything the page's list does not name.
- Also: the vault is same-site with the main page. Browsers that partition a frame's storage do so by the top-level site, so the vault's storage should be its own and lasting; not checked, and to be tried in each browser on the list before anything is built. Ollama and the sources take no key, so they would stay on the main page. A second, small key panel lives in the vault frame and must be styled to match (`api:` would show it).

### C. Ask again for the key each time

Hold no key at all: the person pastes it each session ("Don't save", which exists). Stops a copied profile and long-lived theft from storage, but code on the page reads the key the moment it is pasted. It is an option people already have, not a design.

## 3. What is most secure

Against the threat that matters most for a key, a key read by code on the page and used elsewhere, **B is more secure than A**, and nothing in A or C reaches it. B leaves the rest as A does: chats and the key's use while the page is open. B and A are not alternatives: B is A plus the vault.

Its costs are real but bounded: four narrow exceptions to rules that were written for other reasons (frames, BroadcastChannel between tabs, the list of hosts, one gateway), a second small site, and its own key panel. It changes nothing in stored chats or backups, since keys are already never in a backup; existing keys would move from the key database to the vault's once, shown first.

## 4. Suggestion

- **Build B in stage 15, before going public,** as above, as its own small site with its own deploys and published hashes, and the four exceptions written into CLAUDE.md with the reason. Keep A's layers: Lock Parliament after stage 9 also protects the vault's storage against a copied profile (the vault would use the same passphrase or passkey).
- **Not earlier:** stages 8 to 14 change how requests are made (branches, runs, the Lab's blocks) and the vault's channel should be designed against the finished request path, once.
- **Ask an outside reviewer** (security notes §6.6) to look at the vault with the key module, which is where a review is most worth its cost.

Put to Stefan at the stage 7 checkpoint as C170.
