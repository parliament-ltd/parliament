# Lock Parliament: design, for review before anything is built

Drafted 23 October 2026 (stage S4, after stage 9). Nothing here is built or
applied. It answers `security-privacy-decisions.md` §6.2 and is put to Stefan
with the questions in `conflicts.md` Part 15, because it changes every stored
record (CLAUDE.md: never a change to stored data without showing it first).

## What it does, in one paragraph

An optional setting, off by default. When it is on, everything you wrote and
everything said in your chats is stored encrypted, and so are your saved
provider keys. Opening Parliament asks you to unlock it: with a passkey
(Touch ID, Windows Hello, a phone) where the browser can, or with your
passphrase, or with a recovery code shown once at setup. Someone who copies
this browser's profile gets nothing they can read. If the passphrase, every
passkey and the recovery code are all lost, nothing can bring the data back:
there is no server to reset it, and setup says so plainly.

## The keys

- **The data key:** one random AES-GCM 256-bit key, made with Web Crypto at
  setup. It encrypts every sealed record. It is never stored as it is.
- **Wrapped three ways,** each a copy of the data key encrypted (AES-GCM) by a
  key that only its owner can make again:
  - **Your passphrase:** stretched with PBKDF2-SHA256, 600,000 rounds, a random
    salt (as new backups are, C182). Web Crypto offers nothing slower to
    guess, such as Argon2.
  - **The recovery code:** 120 random bits shown once as 24 letters and
    digits in six groups of four, in an alphabet with no I, L, O or U so it
    cannot be misread. It is random enough that no stretching is needed: HKDF.
  - **Each passkey,** where the browser and the passkey's maker support the
    WebAuthn PRF extension: the passkey gives 32 secret bytes for a random
    salt kept with it, and HKDF turns them into a key (the bytes are keying
    material, never the key itself). The browser checks your fingerprint,
    face or PIN; no server is involved and none is needed, since nothing is
    sent anywhere and the passkey is only used for these bytes. Web Crypto
    still does all the cryptography; WebAuthn only supplies the bytes.
  - **Passkeys are an extra way in, never the only one.** Support differs by
    password manager, and asking the browser cannot tell (it reports what the
    browser can do, not the passkey). So setup makes the passkey and unlocks
    with it at once, and keeps it only if that works. Setup also says that
    deleting the passkey from a password manager removes that way in.
- **In memory after unlocking,** the data key is held as a non-extractable
  Web Crypto key in this tab only. It never crosses to another tab or window,
  is never written anywhere, and is dropped when the tab closes or the lock
  closes.
- **Saved provider keys** are re-encrypted under the data key while the lock
  is on, so a copied profile cannot use them either.

## What is sealed, and what stays readable

A sealed record keeps the fields the app needs to find and order things, and
encrypts the rest together:

```
{ id, <the fields below>, sealed: { v: 1, iv: <12 random bytes>, data: <bytes> } }
```

`data` is every other field of the record, as JSON, encrypted with the data
key. The store's name and the record's id are bound into it (AES-GCM's
additional data), so a sealed record cannot be moved to another record or
store without failing to open.

As built (piece 2): only each record's key and the fields the database's own
lookups read stay readable; everything else is sealed, the record's kind and
dates included unless a lookup needs them ().

| Store | Stays readable | Sealed |
|---|---|---|
| conversations | id, num, docketId, room, createdAt, updatedAt | title, summary, tags, model, branch, everything else |
| messages | id, conversationId | role, content, thinking, citations, sources, translations, attachments, dates, everything else |
| files, file_data | id and conversationId; fileId | names and details; the file's bytes |
| sbrd_documents | conversationId | the document |
| highlights | id, conversationId, num, kind | text, tags, the rest |
| notes | id, conversationId, num, createdAt | text, quotes, summary, tags, the rest |
| pins, favorites | id, targetConversationId or conversationId, num | the quote, tags, the rest |
| dockets, runs | id, num, updatedAt; id, docketId | titles, branch names, tags, steps |
| collections | id, builtIn, updatedAt | name, description, headings, items |
| collabs (frameworks), saved searches, focus sets | id | everything else |
| commandHistory | id, at | the command line |
| settings | the key, and the value of preferences | personas, the old scratchpad, documents' ripple notes, the backup log |

**Not sealed:** rooms and the library (layouts you built, not your words),
window layouts, and preferences such as the language and text size, which the
unlock screen needs to speak your language. The counter that numbers things.

**What a copied profile still shows:** how many chats, notes and plans there
are, their numbers, when each was made or last changed, which belong
together, and roughly how long each is. Never a word of them. Hiding sizes
too would mean padding every record, at a cost in space; not proposed.

The four indexes built on tags (chats, notes, keywords, plans) are never
queried; with the lock on they simply hold nothing.

## How saving works with the lock on

The browser closes a save the moment it waits for anything but the database,
and encryption is something else to wait for. So encryption cannot happen
inside a save, and 13 places today read and compare your words inside one
(the inventory, below). Each save becomes three steps, the same with the lock
on or off so there is one path to test:

1. **Read** what the change needs, and decrypt it.
2. **Work out** the change on the plain records, exactly as today's code does.
3. **Encrypt** what is to be written, then save it in one go, after checking
   that nothing read in step 1 has changed meanwhile (another tab, a reply
   arriving). If something has, start again from step 1.

Built once, as one helper the existing save functions use, so their logic
stays as it is. Reading stays simple: anything read is decrypted on the way
out, before the rest of the app sees it.

A reply that is still arriving is saved every three seconds; each save
encrypts it again. Search across chats already works in memory, on what has
been read and decrypted, so it keeps working.

## Turning it on, using it, turning it off

- **Setup,** in Settings: a passphrase (typed twice), the recovery code shown
  once with a request to type part of it back, a passkey if the browser can,
  and how long it stays open when idle. A backup is offered first.
- **Turning it on** encrypts everything already stored, in one go: read all,
  encrypt in memory, write all in a single save. If the tab closes or anything
  fails partway, nothing has changed. Other open tabs are told to reload.
- **Opening Parliament** with the lock on shows only the unlock screen until
  it is unlocked: nothing of yours is read before.
- **Idle:** after 15 minutes, 1 hour, 8 hours, or not until the tab closes,
  the page locks: it reloads to the unlock screen, so nothing decrypted stays
  in memory. The clock waits while a reply is arriving or a run is going.
- **Turning it off** asks you to unlock, then decrypts everything in one save
  and removes the lock.
- **Changing the passphrase or adding a passkey** rewraps the data key only;
  nothing else is rewritten.

## Backups and the rest

- **Backups keep their format,** so every backup ever written stays readable.
  Making one needs the lock open; the file is encrypted with its own password
  or not, as today. A restore encrypts what it writes while the lock is on.
- **Delete everything** removes the lock too (it lives in the key database).
- **The lock's own record** lives in the key database beside the saved keys,
  as one more entry: no new store, no change to the database's version.

## The lock's record

```
{ id: 'lock', v: 1, createdAt, idle: '1h',
  passphrase: { salt, iterations: 600000, iv, wrapped },
  recovery:   { salt, iv, wrapped },
  passkeys:   [ { credentialId, prfSalt, iv, wrapped, addedAt } ],
  check:      { iv, data } }
```

`check` is a known value sealed with the data key, so an unlock can tell a
wrong passphrase from damaged data.

## Pieces

1. **The lock's keys.** The data key, wrapping by passphrase, recovery code
   and passkey, the lock's record, and tests. Nothing stored changes.
2. **Sealed records.** Seal and open per store, the three-step save, every
   write path moved onto it, reads opening sealed records. With the lock off,
   nothing on disk changes; tested with the lock on in a test database.
3. **Setup and unlock.** Settings, the setup panel, the unlock screen, idle
   locking, other tabs, and turning it on and off. Checked on a trial copy.
4. **Backups, restore and Delete everything with the lock on,** then the
   checkpoint.

## Inventory behind this (23 October)

Read-only survey of every place the app reads or writes the stores above:
38 functions write content; records.js holds 19 of them, in transactions over
up to twelve stores. Thirteen places compute with your words inside a save:
branch titles taken from the chat's title, plan names from titles, merging
tags, sizes of stored messages, the checks before a change, comparing a
document, a note, a collection, a saved search and the last command,
rewriting a quote's tags, copying messages into a branch, and the restore's
comparison of what is here with the file. Nothing searches inside the
database; every search is in memory. No index or key is built from your
words that the app queries.

## Passkeys and PRF: the facts (checked 23 October 2026)

From a research pass on primary sources (the W3C WebAuthn Level 3
Recommendation of 25 August 2026, §10.1.4; browser makers' release notes and
change logs; Apple, Yubico, 1Password and Bitwarden documentation):

- **Browsers:** Chrome and Edge since 116 (desktop and Android; not in
  Android WebView), Safari 18 (macOS and iOS), Firefox 135 on Windows and
  Linux, 139 on macOS 15, 149 on Android. Some return the bytes only when
  unlocking, not when the passkey is made, so setup unlocks once to be sure.
- **Passkey makers:** Google Password Manager and iCloud Keychain give the
  bytes and sync them with the passkey; security keys such as YubiKey do
  (firmware 5.2 and later). Windows Hello did not until early 2026 builds of
  Windows 11, reported by testers but not announced by Microsoft. 1Password
  supports it but has an open fault since June 2026; Dashlane and NordPass are
  reported not to (secondary source only).
- **No server needed:** the specification itself anticipates using these
  bytes to derive encryption keys on the client only. The passkey is bound to
  the site's domain (parliament.ltd), so one made in development on
  `localhost` does not work on the site, and the reverse.
- **What it cannot stop:** code running on the page can ask the browser for
  the bytes (you would still see the fingerprint or PIN prompt) or read the
  opened data key from memory. The same is true of any lock in a web page;
  the policy that loads no outside code (and the stage 15 hardening) is what
  stands against it.
- **No Argon2:** no shipping browser offers Argon2 in Web Crypto (a draft
  exists), so the passphrase is stretched with PBKDF2-SHA256 at 600,000
  rounds, OWASP's figure.
- **A warning worth heeding** (Tim Cappalli, 27 February 2026): people delete
  passkeys without knowing data depends on them. Hence the passphrase and the
  recovery code stay, and setup says what a passkey's removal means.
