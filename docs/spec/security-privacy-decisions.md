# Security and privacy: prompt injection, keys, training, privacy features

**Date:** 21 October 2026.
**Status:** Stefan's notes from a planning conversation on 21 October, corrected
the same day against the repo (`conflicts.md` Part 10) and the rulings on them
(S1 to S5). Sections marked approved were agreed in that conversation. Rulings
in `conflicts.md` win over this document; this document wins over the
planning conversation it comes from.

---

## 0. Where things stand

- **Sources.** Wikipedia ships (stage 4). Hacker News and OpenAlex come with
  stage 7. Brave is later (C28); arXiv cannot be reached from a browser (C28).
  An answer from a source is never sent to a model unless the person acts on
  it (C115); bringing one into a prompt is designed with stage 8.
- **Keys.** Encrypted at rest with AES-GCM and a non-extractable key, each in
  its own record in its own database, never in settings and never in a backup.
  "Don't save" holds a key in this tab's memory only and removes any saved
  copy (stage 4, audit T4). There is no "session only" mode.
- **Chats** are stored unencrypted.
- **Other people's code does not run inside Parliament** (ruled S2: for now,
  kept open for later). The aim is a community library: blocks arrive by pull
  request and ship in the catalogue after review. If running others' code
  ever opens, it runs in a sandboxed frame on another origin, after a scope
  review. A lint rule already keeps the network, provider code and key
  functions inside `src/net`; keeping the database out of blocks comes with
  stage 13.

---

## 1. Prompt injection (approved)

1. **Included sources go to a model as labelled, untrusted data** (stage 8).
   - Anthropic: `search_result` blocks in the user message, a source and title
     for each.
   - Each source's text labelled with where it came from and JSON-encoded, so
     injected text cannot break out of its delimiters. One line in the system
     prompt says source content is data, never instructions.
   - Mistral and Ollama: the JSON-wrapped form.
   - All of it behind the provider interface (`src/providers/base.js`).
2. **No second consent prompt.** Enter is the only confirmation (plan rule 1),
   and the Enter line names who receives a request and what it costs. Text
   from outside can never run a command or start or steer a run (CLAUDE.md;
   stage 10), so an injection cannot spend money or reach the network on its
   own.
3. **Nothing leaks out through a reply.**
   - `img-src 'self' data:`: in place. Remote images are never loaded; they
     show as links (done, audit T8).
   - Links go to web and mail addresses only and open with no opener (done).
   - **To do:** show a link's full address before it opens. Today the tooltip
     shows the host only, and a link's words can hide where it goes.
   - Addresses a model writes are never fetched: only what is on the list of
     providers and sources can be reached (done, by construction).
4. **A free check before a source is included** (stage 8).
   - Strip invisible characters (zero-width and Unicode tag characters).
   - Mark phrases like "ignore previous instructions" with a warning, without
     blocking.
   - No HTML step: sources already return plain text only, and the plan says
     never to use a source's HTML.
   - Runs in a worker, only when a source is included; no model call.
5. **An optional classifier** (stage 7 or 8).
   - Hosted: a small model's yes or no, opt-in, named with its cost on the
     Enter line.
   - Local: only through a local model (Ollama), offered only when one is
     connected (S3). No model runs inside the browser: the strict security
     policy stays as it is.
   - A result is a warning, never a guarantee.

---

## 2. Keys (approved)

**The gap.** Any script running on Parliament's own origin can call the same
decrypt function the app uses and read a key: a bad block, a cross-site
scripting bug, or a compromised dependency. Encryption at rest protects a
copied browser profile only when a passphrase is also needed.

| State | Protection | What it does not stop |
|---|---|---|
| Stored | AES-GCM with a non-extractable key. A passphrase (with Lock Parliament, §6.2) makes a copied profile useless | Code running on the live page |
| Sent | HTTPS, to the key's own provider only | |
| In use | In memory for a moment on every request; no browser technique avoids that | Extensions that can read every site; malware on the device |

**Steps**

1. **A key vault on a separate origin: not now (S1).** A small page on a
   subdomain would hold the keys and make provider calls itself, so code on
   the main origin could not read them. It meets four hard rules (the main
   site forbids frames; a new host is added only with a provider or source;
   cross-window messages never carry content; one gateway for every request)
   and would need the key panel inside it. It is its own scope review with
   stage 7 or 15, where the most secure design wins. Stage 5 builds the key
   panel through the key module as planned.
2. **A tighter policy.** No `unsafe-eval` today, and no
   `dangerouslySetInnerHTML` anywhere. Trusted Types and dropping
   `unsafe-inline` from styles are trialled at stage 15. `connect-src` stays
   generated from the list of what ships.
3. **The supply chain** (stage 15). A lockfile (kept), exact versions, as few
   packages as possible, two-factor on GitHub and Netlify (the registrar is
   done), and build hashes published once the repository is public.
4. **Less damage if a key leaks.** The `api:` panel (stage 5) and Settings
   (stage 9) suggest a key for Parliament alone, in its own workspace with a
   spending limit, and link a short "revoke and replace" guide. The optional
   passphrase comes with Lock Parliament (§6.2).
5. **Small fixes.** Memory-only "Don't save": done. Keys never in backups:
   done. Settings copy that overstates the protection: replacement drafted in
   `privacy-copy-draft.md`, applied at stage 9 and 15. `SECURITY.md` still
   describes the old session-only mode and is rewritten at stage 15.

---

## 3. Training on chats sent through APIs

To be checked before any of it becomes user-facing text.

| Provider | Training | Retention |
|---|---|---|
| Anthropic API | Not used for training unless the customer gives express permission | Not stored by default, except Fable 5.x and Mythos 5.x, which keep 30 days; content flagged under the usage policy is an exception to check; zero retention by arrangement with Anthropic |
| Mistral API, free mode | May train by default; opt out with the privacy toggle in the admin panel | Not checked |
| Mistral Labs and Preview models | Reported to be trained on even after opting out; not confirmed | Not checked |
| Ollama | Nothing leaves the device | Local only |

- Welcome spec §3 says the major APIs "do not train ... by default". If
  Mistral's free mode trains, copy built on that line has to change.
- Parliament cannot read a person's settings at a provider, so it shows the
  facts and reminds.
- **What Parliament does** (stage 7): a training label and a retention mark on
  each provider's row in setup and in "what leaves this browser"; a Mistral
  checklist that covers the API opt-out and marks Labs and Preview models in
  the picker. Names stay on provider rows: copy names no provider in a
  sentence.
- Parliament never sends ratings or feedback to a provider (none exist).

---

## 4. Privacy features (approved)

### 4.1 A privacy filter on the device (a setting)

Before a message is sent, Parliament finds names, emails, phone numbers,
addresses and account numbers on the device, swaps them for placeholders like
`[PERSON_1]`, and sends that. The reply's placeholders are swapped back, still
on the device.

| Setting | What it catches | Needs |
|---|---|---|
| Off | Nothing | |
| Patterns | Fixed formats such as emails and phone numbers | Nothing; plain code, offered to everyone |
| Patterns and names | The above, and names | A local model (Ollama), offered only when one is connected (S3) |

- The Enter line says what will be swapped before Enter.
- It covers every request: prompts, the title request (C62) and a resend
  (C114).
- Open: on by default in Patterns mode, or off until turned on.

### 4.2 Send only what is needed

Branches with compressed summaries, "send to branch", and sources kept out by
default already cut what each request carries. Present them as privacy, not
only as saving.

### 4.3 Local-only rooms

A room setting that refuses hosted providers and uses a local model only, so
nothing leaves the device (stage 7 for Ollama, stage 13 for room settings). A
new field in room files is a stored-data change, shown first.

### 4.4 Choosing a provider by its data policy

Each provider's training status shown; rooms marked sensitive default to
providers that neither train on nor keep API data.

---

## 5. Not pursued

- **A relay** that sends many people's requests through one account. It
  needs a server, and the relay sees everything.
- **Decoy prompts.** They go out on the same key, the real prompt still goes
  in full, each one costs money, and decoys are easy to spot (Peddinti and
  Saxena, 2010). The privacy filter (§4.1) is what works.

---

## 6. Further items

### 6.1 Privacy wording

Parliament has no servers. The wording is `privacy-copy-draft.md`: requests go
from the browser to the provider you pick, a model on your own machine, or a
source, and the web host sees a visitor's address as any site's host does.

### 6.2 Lock Parliament (approved; its own stage after stage 9, S4)

An optional setting, off by default, that encrypts chats as well as keys.

- **On:** Parliament asks once when the browser opens, then stays unlocked
  until the browser closes or an idle timer runs out (15 minutes, 1 hour,
  8 hours, or until the browser closes).
- **Unlock** with a passkey (Touch ID, Windows Hello or a phone, where the
  browser and password manager support it), with a passphrase always
  available, and a recovery code shown once at setup.
- **If all are lost, the data cannot be recovered;** there is no server to
  reset it. Setup says so plainly.
- **What it meets:** a second database upgrade after the one ruled "one schema
  upgrade", shown before it runs; a new backup and restore path, with every
  older backup still readable; the Almanac's indexes and search; docket runs
  under an idle lock; each tab unlocking without a key crossing windows; and
  "Web Crypto only", since passkeys use WebAuthn.

### 6.3 Browser extensions

Extensions can read everything on a page. Advice to use a separate browser
profile with no extensions for sensitive work goes in the browser support
table (stage 15) and the privacy copy.

### 6.4 Code integrity (stage 15)

| Option | What it does |
|---|---|
| Lock down accounts and deploys | Hardware keys on GitHub, Netlify and the registrar; review before merging; deploys only from tagged builds |
| Published file hashes per release | Anyone can check the live site against the source (needs the public repository) |
| Downloadable versioned builds | Cautious people run a fixed version themselves |
| The update notice with a changelog | Built without a changelog (stage 1). The service worker waits for a reload and the notice, but a hostile deploy still runs on the next load |
| A verifier extension (Meta's Code Verify) | Later |

### 6.5 Imported rooms

Room files are data only, checked on the way in, with any standing
instructions they carry shown in full before anything is applied (C74). The
instructions also go through the check in §1.4.

### 6.6 A security review

| Route | Notes |
|---|---|
| NLnet grant, then NGI Zero Review | Fits an MIT-licensed project with an EU angle. Next deadline 3 November 2026 |
| OTF Security Lab | Open to internet-freedom projects |
| OSTIF | Needs a sponsor |
| A paid firm | Narrow scope: the key module, encryption, the policy, the update process |

The repository stays private until stage 15 (C71), which a review or published
hashes would need open. Open: which route first, and whether that moves going
public earlier. Set up at stage 15: the rewritten `SECURITY.md` (drafted),
private vulnerability reporting, and OpenSSF Scorecard.

### 6.7 Smaller items

- Plain JSON backups say they are not encrypted (stage 9).
- Encrypted backups stretch the password further in new files (stage 9).
- The privacy copy mentions the host's visitor logs (drafted).
- Offline archives and local models are checked before use (with Kiwix,
  later).

---

## 7. Open

1. The privacy filter's default (§4.1).
2. Which review route first (§6.6), and whether it moves going public.
