# Privacy copy: draft for review

Drafted 11 October 2026. Nothing here is applied. It replaces the nineteen
statements listed in `research/security-audit.md`, item 11, and is written for
the app as it will be when the refactor is finished and the repository is
public: several providers, keyless sources, the address `parliament.ltd`.

Four rules behind the wording:

1. **No "never", "only" or "nothing" unless a test or the browser enforces it.**
   Where the old copy made a promise the app did not keep, the draft either
   lists what really happens or depends on a fix (last section).
2. **One source.** Every surface below draws on the same short list, "What
   leaves your device". It lives in the copy table, so the README, SECURITY.md,
   Settings and the welcome letter cannot drift apart.
3. **Say what cannot be promised.** The host sees an IP address. A key on disk
   is protected; a key in a running page is not. A provider keeps what it is
   sent under its own terms.

4. **No provider is named in a sentence.** The copy says "the provider", "a
   model on your own machine" or "a source", and takes names from the list of
   providers. Adding Mistral, Ollama or one that does not exist yet changes the
   list, not the sentences. Where a line sits on one provider's row, the name is
   filled in from that row, shown below as {provider}.

Revised 12 October 2026 after Stefan's review: wording made neutral across
providers, and the title and voice lines settled (C62, C70).

## What leaves your device

The one list everything else points to.

> - **Your prompt.** When you press Enter, your prompt, the conversation it
>   continues and anything you attached go straight from your browser to the
>   provider or source named on the line under the field. Nowhere else.
> - **A model on your own machine.** If that is what you chose, the prompt goes
>   no further than your computer.
> - **Your key.** The key for a provider travels with the request, to that
>   provider only. A model on your own machine and a source such as Wikipedia
>   get no key.
> - **A key check.** Saving or checking a key sends one very small test request
>   to that provider.
> - **A title.** After the first answer in a new chat, one small request asks
>   a model for a title, a summary and tags. The line under the field says so
>   before you send, and Settings can turn it off.
> - **Web search, if you switch it on.** The provider runs the searches on its
>   side, so search terms drawn from your chat reach the search service it
>   uses.
> - **Voice, if you use it.** Speech is turned into text on this device. No
>   audio leaves it. Where a browser can only do this by sending audio to its
>   maker, Parliament does not offer voice.
> - **The app itself.** Your browser fetches Parliament's files from
>   `parliament.ltd`, hosted by Netlify. Like any web host it sees your IP
>   address and browser type. It never receives your chats or keys.
> - **Nothing else.** No analytics, no tracking, no advertising, and no code
>   loaded from any other site.
>
> Settings lists every provider and source Parliament can reach. A new one
> appears there and in the published policy before it can be used.

## The nineteen, old and new

### README.md

**1. Opening lines (L3 to 5)**
- Today: "runs entirely in your browser. Bring your own API key — there is no backend, no account, and nothing leaves your machine except API calls to Anthropic."
- Problem: more leaves than "API calls" suggests, and soon not only to Anthropic.
- Draft: "Parliament runs in your browser. There is no backend and no account. You bring your own keys, or run a model on your own machine. What you write stays on your device until you press Enter. Then it goes straight to the provider or source you chose, and nowhere else."

### SECURITY.md

**2. First line (L3)**
- Today: "designed so that you never need to trust us with your data."
- Problem: true of storage, but people still rely on the code their browser loads.
- Draft: "Parliament is built so that we never hold your data: there is no server to send it to. You do rely on the code your browser loads from parliament.ltd. That code is public, and the app loads none from anywhere else."

**3. Architecture (L7)**
- Today: "The only network requests the app makes are directly from your browser to Anthropic's API when you send a message."
- Problem: a key check, the calls after a first answer, and a connection opened on every page load are all outside "when you send a message".
- Draft: "There is no backend, no database of ours and no accounts." followed by the list "What leaves your device" in full.

**4. The encryption key (L14)**
- Today: "Even JavaScript running on the page cannot export the raw key material."
- Problem: true, and it reads as more protection than there is. Code running in the page could still ask the browser to use the key.
- Draft: "The encryption key cannot be exported, so a copy of the stored data is useless outside this browser. That protects your API keys on disk and keeps them out of backups. It does not protect against code running inside the page, which is why Parliament loads no outside code and why blocks written by other people are reviewed before they ship."

**5. Where the key is kept (L16)**
- Today: "persistent (survives browser restarts), session-only (cleared when the browser closes), or memory-only (never written to disk)."
- Problem: session-only no longer exists, and memory-only does not work.
- Draft: "By default your keys are kept in this browser, encrypted. If you would rather not store them, turn on 'Don't save': keys are then held in memory only, and you type them again after a reload."

**6. The policy listing (L21 to 33)**
- Today: a printed policy, then "the app can only make network requests to itself and Anthropic's API."
- Problem: the printed policy is not the one deployed.
- Draft: "The policy below is copied from `netlify.toml` by a script, and a test fails if the two differ." Then the generated block, then: "In words: scripts load only from Parliament itself, and the page can connect only to itself and to the providers and sources listed."

**7. Backups (L45)**
- Today: describes the old `.apb` format, "PBKDF2 (100,000 iterations, SHA-256)".
- Problem: the current format is `.parliament` and is not described. Backups are unencrypted unless a password is set, which the page does not say.
- Draft: "Backups are `.parliament` files. With a password, the file is encrypted with AES-256-GCM, using a key stretched from your password with PBKDF2 (SHA-256; the number of rounds is written in the file). Without a password the file is plain text that anyone holding it can read, and the backup window says so. API keys are never included. Older `.apb` and JSON exports can still be read."

**8. What we don't do (L52 to 53)**
- Today: "We do not use analytics, tracking, or advertising scripts" and "We do not make network requests to any service other than Anthropic's API".
- Problem: the first is true. The second will not be.
- Draft: "No analytics, tracking or advertising, and no scripts from other sites." and "The page connects only to the providers and sources you use. Each one is named in the policy above and shown in the network log."

**9. Reporting a vulnerability (L63)**
- Today: "please open a GitHub issue or contact us directly."
- Problem: the repository is private, and a public issue is the wrong place for a vulnerability anyway.
- Draft: "Report a vulnerability privately: use 'Report a vulnerability' on the repository's Security tab, or write to support@parliament.ltd. Please do not open a public issue for it."
- Needs: private vulnerability reporting switched on in GitHub, and that mailbox to exist. One address, support@, for everything for now (ruled 12 Oct).

### Settings

**10. First-visit hint (SettingsView.jsx L45)**
- Today: "Start by adding your Anthropic API key. It is encrypted with AES-GCM and stored only in your browser."
- Problem: "stored only in your browser" is fine; the key is also sent.
- Draft, for the `api:` panel that replaces this hint: "Add a key to use a provider's models, or connect a model running on your own machine. A key is encrypted, kept in this browser, and sent only to its own provider."

**11. Under the key field (L476)**
- Today: "Your API key is encrypted using the Web Crypto API (AES-GCM) before being stored. It never leaves your browser."
- Problem: it leaves with every request.
- Draft, on a provider's row: "Encrypted before it is stored. Sent only to {provider}, with each request you make to it."
- Draft, on the row of a model on your own machine: "No key needed. It runs on your machine, and nothing you send it leaves."

**12. About (L1196)**
- Today: "A power-user chat interface for AI. Built with React, Framer Motion, and Tailwind CSS. Open source and community-driven."
- Problem: not open source until the repository is public.
- Draft: "A place to work with AI on your own terms. Open source under the MIT licence." with a working link, "Source on GitHub". Until the repository is public: "MIT licensed. Source published at launch."

**13. "No servers, no accounts" (L1211)**
- Today: "Nothing is transmitted anywhere except directly to Anthropic's API when you send a message."
- Draft: "Parliament runs in your browser. Requests go from here straight to the providers and sources you use, when you press Enter. The line under the field names where each one goes before it is sent."

**14. "API key stays local and encrypted" (L1215)**
- Today: "Even scripts running on the page cannot export the raw encryption key."
- Draft, under the heading "Keys are encrypted on this device": "Each key is encrypted before it is stored and is sent only to its own provider. Encryption protects a key on disk and keeps it out of backups. It cannot protect against code running inside the page, so Parliament loads no code from anywhere else."

**15. "Conversations stay local" (L1219)**
- Today: "We have no way to see, access, or recover it."
- Problem: true, and silent about what providers hold.
- Draft, under "Your work stays here": "Chats, notes, highlights and rooms are stored in this browser. We cannot see them and we cannot recover them, so keep a backup. What you send to a provider is held by that provider under its own terms."

**16. "Verify it yourself" (L1223)**
- Today: "The Network Activity log below records every outbound request this app makes. You can confirm only Anthropic's API ever receives data."
- Problem: the log sees only requests the page makes with `fetch`.
- Draft, under "Check it yourself": "The log below lists the requests this page makes, grouped by host. Every host should be a provider or source you use; if one is not, something is wrong. It cannot show what your browser does by itself, such as fetching the app's own files. The source is on GitHub."

### Elsewhere

**17. The network log card (NetworkActivityCard.jsx L44)**
- Today: "Every outbound network request this app makes is recorded here. … Only requests to api.anthropic.com should appear."
- Draft: "Requests made by this page, grouped by host. Every host should be a provider or source you use. The list is kept in memory and clears when you reload."

**18. The key step in the wizard (IgnitionStep.jsx L492)**
- Today: "Encrypted with AES-GCM and stored locally. Never leaves your browser."
- Draft, for the `api:` panel: "Encrypted and kept in this browser. Sent only to its own provider."

**19. The app manifest (manifest.webmanifest L4)**
- Today: "A power-user chat interface for Claude. Bring your own API key — no accounts, no servers, all data stays in your browser."
- Draft: "A place to work with AI on your own terms. No accounts, no servers. Your work is stored in your browser."

### Beside the microphone (new)

- Where the browser can do it on the device: "Transcribed on this device. No audio leaves it."
- Where it cannot: "Voice is off in this browser. Here it would mean sending your audio to the browser's maker."

### One more: the welcome letter

Not among the nineteen, but the welcome spec says every claim in it must stay true.

- Mockup: "each request goes straight to the provider you pick, to a model running on your own machine, or just Wikipedia."
- Problem: Hacker News and OpenAlex also ship.
- Draft: "each request goes straight to the provider you pick, to a model running on your own machine, or to a public source such as Wikipedia."

## What has to be true in the code first

Each of these makes a sentence above honest. All are part of the refactor.

| Sentence | Needs |
|---|---|
| "stays on your device until you press Enter" | No connection to a provider opened on page load. Today the page preconnects to Anthropic on every load |
| The title line | One announced request in place of three silent ones, with a switch in Settings (ruled 12 Oct, C62) |
| The voice line | On-device recognition only, the microphone allowed in the site's header, and the note shown beside the microphone (ruled 12 Oct, C70) |
| "{provider}" and the list in Settings | One registry of providers and sources that the copy, the policy and the network log all read from |
| "Don't save" | The key module that holds a key in memory. Saving stays the default (ruled 11 Oct) |
| "sent only to its own provider" | One gateway for requests, with each key bound to its provider's address |
| The policy block | A script that writes it from `netlify.toml`, and a test |
| "grouped by host" in the log | The log records who made each request and drops query strings |
| "the backup window says so" | The password choice made visible instead of an unticked box |
| "Open source under the MIT licence" | The public repository |
| Reporting a vulnerability | GitHub's private reporting switched on; the mailbox support@parliament.ltd |
