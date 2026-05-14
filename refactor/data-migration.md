# Parliament V2 — Data Migration Plan

**Status:** Active reference for Phase 1 implementation.
**Audience:** Engineers implementing PR-1, PR-10a, PR-10b, and PR-11a/b.
**Companion docs:** [v2-phase1-audit.md](v2-phase1-audit.md), [phase-1-pr-plan.md](phase-1-pr-plan.md), [glossary.md](glossary.md).

This document is the canonical reference for every data-shape change Phase 1 makes. Anyone touching IndexedDB, mode files, or migration paths during Phase 1 reads this first.

---

## Goals

1. **No user data loss.** Every conversation, message, highlight, note, favorite, pin, file, sbrd_document, and setting from V1 survives the V2 cutover.
2. **One-shot, deterministic migration.** The transition runs once on first V2 boot. The result is reproducible: same V1 state → same V2 state.
3. **Recoverable midpoint.** Between PR-10a (mode wiring) and PR-10b (adapter deletion) the app is in a hybrid state that can be rolled back if necessary. PR-10b is the point of no return.

---

## V1 IndexedDB schema (current state, `DB_VERSION = 3`)

Two databases:

**`parliament`** (10 stores):

| Store | Key | Indexes |
|---|---|---|
| `conversations` | `id` | `updatedAt` |
| `messages` | `id` | `conversationId` |
| `highlights` | `id` | `conversationId` |
| `notes` | `id` | `conversationId` |
| `favorites` | `id` | `conversationId` |
| `pins` | `id` | `targetConversationId` |
| `settings` | `key` | — |
| `files` | `id` | `conversationId` |
| `file_data` | `fileId` | — |
| `sbrd_documents` | `conversationId` | — |

**`parliament-keystore`** (1 store, separate database):

| Store | Key |
|---|---|
| `encryption-keys` | `id` (single record: `api-key-encryption`) |

---

## V2 IndexedDB schema (`DB_VERSION = 4`)

PR-1 adds 6 new stores to the `parliament` database. `parliament-keystore` is unchanged.

**New stores added at v4:**

| Store | Key | Indexes | Purpose | `status` field? |
|---|---|---|---|---|
| `modes` | `id` | `scope` | One row per mode file. Includes one homepage mode (`scope: 'homepage'`) and N room modes (`scope: 'room'`). | No |
| `libraryLayouts` | `id` | `status` | Catalog entries for layouts. 5 available + 2 coming-soon at PR-1 seed. | **Yes** (`'available' \| 'beta' \| 'coming-soon'`) |
| `libraryRooms` | `id` | `status` | Room template catalog. 5 available + 2 coming-soon at PR-9 seed. | **Yes** |
| `libraryComponents` | `id` | `tier` | Component catalog entries. Seeded incrementally PR-2 through PR-11. | No |
| `librarySchemes` | `id` | — | Six schemes seeded by PR-4b. | No |
| `libraryResources` | `id` | `status, format` | Pre-seeded with 6 coming-soon placeholder cards in PR-6. | **Yes** (all `'coming-soon'` at V2 launch) |

**Existing stores modified at v4:**

- `conversations` — add `room: string \| null` field. Default `null` at the migration; filled in by PR-10a.

**Existing stores untouched:**

- `messages`, `highlights`, `notes`, `favorites`, `pins`, `settings`, `files`, `file_data`, `sbrd_documents` — schemas unchanged. Validators added in PR-7 for any that don't have one (specifically `sbrd_documents`).

**Reserved for Phase 2 (NOT added in v4):**

- `permissionGrants` — added later as DB v5 alongside the consent flow. Don't pre-reserve.

---

## v3 → v4 migration logic (PR-1)

```javascript
upgrade(db, oldVersion) {
  // Existing v1, v2, v3 migrations stay unchanged.

  if (oldVersion < 4) {
    // 1. Add new stores
    db.createObjectStore('modes', { keyPath: 'id' })
      .createIndex('scope', 'scope');

    const layouts = db.createObjectStore('libraryLayouts', { keyPath: 'id' });
    layouts.createIndex('status', 'status');

    const rooms = db.createObjectStore('libraryRooms', { keyPath: 'id' });
    rooms.createIndex('status', 'status');

    const components = db.createObjectStore('libraryComponents', { keyPath: 'id' });
    components.createIndex('tier', 'tier');

    db.createObjectStore('librarySchemes', { keyPath: 'id' });

    const resources = db.createObjectStore('libraryResources', { keyPath: 'id' });
    resources.createIndex('status', 'status');
    resources.createIndex('format', 'format');

    // 2. Add `room: null` to existing conversations
    const tx = db.transaction('conversations', 'readwrite');
    const cursor = tx.store.openCursor();
    cursor.onsuccess = function() {
      const c = cursor.result;
      if (c) {
        c.update({ ...c.value, room: null });
        c.continue();
      }
    };
  }
}
```

**Post-migration seeding (runs once after v4 schema is in place):**

- Seed `libraryLayouts` with 5 available + 2 coming-soon entries (placeholders only at PR-1; real layout details seeded by PR-3 and PR-9).
- Seed `librarySchemes` with `parliament@1.0` (the existing scheme tokens from `index.css`). Other 5 schemes seeded by PR-4b.
- Seed homepage mode (a single record in `modes` with `scope: 'homepage'`) reflecting the V2 default homepage composition.

`libraryRooms`, `libraryComponents`, `libraryResources` stay empty until later PRs seed them.

---

## `createdInMode` → `room` migration map (PR-10a)

PR-10a runs a one-time migration over every existing conversation. Each conversation gets a `room` field pointing at a mode file in `modes`. The assignment derives from the V1 `createdInMode` value, with a fallback to the legacy `localStorage[parliament-mode]` value when `createdInMode` is null.

| `conversation.createdInMode` value | Migration result | Notes |
|---|---|---|
| `'pelican'` | New mode in `modes` instantiated from the **Data Workspace** template; `room` set to its id. | Pelican users get a faithful Data Workspace room. |
| `'secretarybird'` | Instantiated from **Drafting Desk** template. | Document workflow preserved. |
| `'swift'` | Instantiated from **Pocket Chat** template. PR-10b additionally injects `voice-input@1.0` into this mode (see below). | Mobile users keep voice access. |
| `'albatross'` | Instantiated from **Writing Studio** template. | Default desktop. |
| `'kingfisher'` (any pre-existing record with this value, even though K was a stub) | Falls back to **Writing Studio**. | K's planned layout (`reading-pane@1.0`) doesn't exist yet. The user's choice was aspirational; we pick the closest available default. |
| `'starling'` (same scenario) | Falls back to **Writing Studio**. | Same reason. |
| `null` or any other value | Consults `localStorage[parliament-mode]` if present and applies the same mapping. If still no match, falls back to **Writing Studio**. | Defensive — covers users whose first conversation pre-dates the `createdInMode` field. |

**The `localStorage[parliament-mode]` value is consulted exactly once,** as a fallback for null `createdInMode` values, then the localStorage key is dropped (PR-12 strips it on app load).

**`createdInMode` field stays in the conversation record** for at least one release after PR-10a — useful for debugging migration reports. A later cleanup PR strips it.

---

## Per-template mode file contents (PR-9 seeds)

Five available templates seeded into `libraryRooms` by PR-9. Each is a complete mode file.

### Writing Studio (default)

```
schema: "parliament-mode/1.0"
scope: "room"
deviceClass: "visual-pointer"
layout: { ref: "three-panel@^1.0" }
scheme: { ref: "parliament@^1.0", snapshot: { ... } }
components:
  - { id: "comp_xxx", ref: "messages@^1.0", slot: "msg-area", order: 0, essential: true }
  - { id: "comp_xxx", ref: "input@^1.0", slot: "input-dock", order: 0, essential: true }
  - { id: "comp_xxx", ref: "toc@^1.0", slot: "left-rail", order: 0 }
  - { id: "comp_xxx", ref: "context@^1.0", slot: "right-rail", order: 0 }
  - { id: "comp_xxx", ref: "highlights@^1.0", slot: "right-rail", order: 1 }
  - { id: "comp_xxx", ref: "branches@^1.0", slot: "right-rail", order: 2 }
  - { id: "comp_xxx", ref: "favorites@^1.0", slot: "right-rail-extra", order: 0 }
```

### Data Workspace (replaces Pelican)

```
layout: { ref: "canvas-centric@^1.0" }
components:
  - file-shelf@1.0 → left-rail
  - chart-canvas@1.0 → canvas (order 0)
  - table-canvas@1.0 → canvas (order 1)
  - column-inspector@1.0 → chat-panel (order 0)
  - messages@1.0 → chat-panel (order 1)
  - input@1.0 → chat-panel (order 2)
```

### Drafting Desk (replaces Secretarybird)

```
layout: { ref: "document-centric@^1.0" }
components:
  - document-canvas@1.0 → document
  - claude-comments@1.0 → margin (right)
  - ripple-analysis@1.0 → margin (right, order 1)
  - input@1.0 → input-dock
```

Note: the Pelican and Secretarybird templates initially seed at PR-9 with placeholder catalog refs because the actual decomposed components don't exist until PR-11a and PR-11b. PR-11a/b update the templates to point at the real catalog entries. Existing rooms migrated at PR-10a using these templates inherit the updated component list when their template version range allows.

### Pocket Chat (replaces Swift)

```
layout: { ref: "single-column-with-sheet@^1.0" }
deviceClass: "visual-touch-phone"
components:
  - messages@1.0 → msg-area
  - input@1.0 → input-dock
  - voice-input@1.0 → input-dock (order 1) — added by PR-10b for migrated swift users
  - context@1.0 → sheet
  - branches@1.0 → sheet
  - highlights@1.0 → sheet
  - collab-mode@1.0 → sheet
```

### Quiet Room

```
layout: { ref: "three-panel@^1.0" }
components:
  - messages@1.0 → msg-area
  - input@1.0 → input-dock
  - context@1.0 → right-rail (only)
```

Minimal-distraction room for users who want messages and a small context indicator. No TOC, no highlights, no branches, no favorites.

### Coming-soon templates (PR-9 seeds, status `'coming-soon'`)

- **Kingfisher (deep reading)** — points at `reading-pane@1.0` layout (also coming-soon).
- **Starling (collaboration)** — points at `split-view@1.0` layout (also coming-soon).

Click on either card → read-only preview overlay with wireframe + description. No install path.

---

## Per-template default scheme

Per NQ-9, **all five available templates default to `parliament@1.0` scheme**. Changing scheme at template instantiation would surprise users.

The wizard's step 5 (name + scheme) lets the user pick a different scheme at room-creation time. The template just sets the initial value.

---

## Voice-input migration (PR-10b)

InputArea's V1 cardLayout has a built-in mic button. PR-10b removes it. Two consequences:

1. **The Pocket Chat template seeds with `voice-input@1.0`** in `input-dock` (alongside `input@1.0`). New mobile-default rooms get voice automatically.
2. **Existing conversations migrated from `createdInMode === 'swift'`** have the voice component **injected** into their already-instantiated room mode file. Migration logic:

```javascript
// PR-10b migration step (runs once)
const swiftMigratedRooms = await db.modes.find(m =>
  m.scope === 'room' &&
  m.layout.ref.startsWith('single-column-with-sheet') &&
  m.buildIntent?.derivedFrom === 'swift-migration'
);

for (const room of swiftMigratedRooms) {
  if (!room.components.find(c => c.ref.startsWith('voice-input'))) {
    room.components.push({
      id: generateId(),
      ref: 'voice-input@^1.0',
      slot: 'input-dock',
      order: 1,
      essential: false,
      config: {},
    });
    await db.modes.put(room);
  }
}
```

The `buildIntent.derivedFrom = 'swift-migration'` field is set at PR-10a's migration step so PR-10b can find these specific rooms cleanly.

**Edge case:** if a user manually edited their migrated swift room (via the editor that ships in PR-8) before PR-10b lands, the migration is idempotent — it only adds voice-input if it isn't already present.

**What if the user removed voice-input themselves?** They lose voice access until they re-add it from the catalog. That's acceptable behavior (user explicitly removed a component).

---

## PWA cache rotation (PR-10b)

V1 service worker uses cache name `parliament-adapters-v1`. After PR-10b there are no adapter chunks. PR-10b changes:

```javascript
// vite.config.js — runtimeCaching
{
  urlPattern: ({ url }) =>
    url.origin === self.location.origin &&
    url.pathname.startsWith('/assets/') &&
    /(catalog|component|module)-/.test(url.pathname),  // updated chunk pattern
  handler: 'CacheFirst',
  options: {
    cacheName: 'parliament-modules-v2',  // renamed
    expiration: {
      maxEntries: 50,                      // bumped to accommodate more chunks
      maxAgeSeconds: 60 * 60 * 24 * 30,
    },
    cacheableResponse: { statuses: [0, 200] },
  },
}
```

**Old cache cleanup** runs once on first V2 SW activation:

```javascript
// service worker activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => name === 'parliament-adapters-v1')
          .map((name) => caches.delete(name))
      );
    })
  );
});
```

**Why this matters:** without rotation, returning users could end up with stale adapter chunks cached locally and the new build referencing them via dead imports. The cache rotation forces a clean refetch.

---

## Backup format migration (PR-7)

V1 `.apb` format:

```json
{
  "ciphertext": [...],
  "iv": [...],
  "salt": [...],
  "version": 1
}
```

V2 `.parliament` format (per `parliament_backup_restore_implementation.md` §3):

```json
{
  "format": "parliament-backup",
  "version": 1,
  "createdAt": "2026-04-22T16:30:00.000Z",
  "parliamentVersion": "0.4.0",
  "encrypted": true,
  "encryption": {
    "algorithm": "AES-GCM",
    "kdf": "PBKDF2-SHA256",
    "iterations": 210000,
    "salt": "base64-salt",
    "iv": "base64-iv"
  },
  "manifest": {
    "counts": { "chats": 47, "rooms": 3, "layoutsInstalled": 2, "componentsInstalled": 7, "schemesInstalled": 3 },
    "sizeBeforeCompression": 8812345
  },
  "payload": "base64-encrypted-blob"
}
```

**Key differences:**

- Extension: `.apb` → `.parliament`.
- PBKDF2 iterations: 100k → 210k (OWASP 2023 recommendation).
- Manifest unencrypted at the top level so restore preview shows contents before password entry.
- Payload (encrypted contents) is gzip-compressed before encryption.
- Nested contents shape:
  ```
  contents: {
    chats: [...],
    annotations: { notes, highlights, favorites },
    rooms: [...],
    homepage: { ... },
    library: { layouts, components, schemes, resources },
    preferences: { ... }
  }
  ```

**Import handles both formats:**

- File parser detects `.apb` shape → runs legacy path → upgrades to v4 schema on import.
- File parser detects `.parliament` shape → runs new path.
- Either way, the imported data lands in IndexedDB stores, hydrated, validated.

**Critical: `files` and `file_data` MUST be included in V2 backups.** This was a pre-V2 gap that PR-7 closes. They live under `contents.chats[].files` (per-conversation hydrated form) so restoring a conversation also restores its files.

---

## Validator additions (PR-7)

[validate.js](src/lib/validate.js) currently validates: `conversations, messages, highlights, notes, favorites, pins, settings`. Missing validators added in PR-7:

- `sbrd_documents` (V1 gap; existing pre-V2)
- `modes` (V2 new)
- `libraryLayouts` (V2 new)
- `libraryRooms` (V2 new)
- `libraryComponents` (V2 new)
- `librarySchemes` (V2 new)
- `libraryResources` (V2 new)
- `files` (existed but not validated; gap)
- `file_data` (existed but not validated; gap)

Per-store validator pattern matches existing ones in `validate.js`. Cross-reference checks added: `conversations[].room` must reference a record in `modes`, `modes.components[].ref` must resolve in `libraryComponents`, etc.

---

## Rollback plan

If PR-10a's migration produces unexpected results, rollback is possible:

1. **Before PR-10b:** `<RoomShell>` is wired but Albatross adapter still exists. Rollback = revert PR-10a; users return to V1 routes; data is unaffected because PR-10a's migration only *added* a `room` field (didn't remove anything).
2. **After PR-10b:** Adapter directories are deleted. Rollback requires reverting both PR-10a and PR-10b together. The `room` field remains on conversations but is harmless under the V1 routes.
3. **After PR-11a/b:** Pelican/Secretarybird directories deleted; rollback requires reverting through PR-11. Users with files/sbrd_documents are still safe — those stores exist regardless.

**The pause point at PR-10a's exit criteria is the last clean rollback opportunity.** PR-10b proceeds only after migration validation passes.

---

## Verification checklist

Before each migration-bearing PR ships, confirm:

- [ ] **PR-1** — IndexedDB upgrades v3 → v4 cleanly. New stores exist. Existing data intact.
- [ ] **PR-7** — A V1 `.apb` backup can be imported under V2 and produces correct V2 records. A V2 `.parliament` backup round-trips through export → wipe → import with all stores preserved including `files`, `file_data`, `sbrd_documents`.
- [ ] **PR-10a** — Every existing conversation has a `room` field after migration. Manual sample of 20 conversations confirms each opens correctly under the assigned room. `localStorage[parliament-mode]` is dropped.
- [ ] **PR-10b** — PWA `parliament-adapters-v1` cache is wiped on first V2 activation. `voice-input@1.0` injection is idempotent and only fires once. Migrated mobile users have working voice.
- [ ] **PR-11a** — Existing Pelican users' files (`files`, `file_data`) are accessible under `file-shelf@1.0`. Charts render under `chart-canvas@1.0` against the same data.
- [ ] **PR-11b** — Existing Secretarybird users' documents (`sbrd_documents`) are accessible under `document-canvas@1.0`. Comments and ripple analysis work.
- [ ] **PR-12** — Phase 1 exit criteria pass — see `phase-1-testing.md` PR-12 section for the canonical checklist.

---

## PR-19c — `meta.builtAt` field on modes (no IDB schema change)

PR-19c adds `meta.builtAt: number | string | null` to every mode. The field tracks whether the user has explicitly confirmed (built) the room via the wizard's Ignition step.

**Three states:**
- `null` — fresh room created via the wizard's non-Ignition paths (Build it myself, Open in editor, Template gallery). Editor button reads "Build". Clicking Build routes to `/build?ignite=:roomId`.
- `<ISO timestamp>` — Ignition has been run for this room. Editor button reads "Save".
- `undefined` — legacy mode that predates PR-19c. Treated as built — runtime normalization in `loadMode` / `loadHomepageMode` substitutes `meta.created` for `meta.builtAt`. No IDB write needed for the migration; the value is computed at read time. Re-saving the mode will persist the substituted value.

**Field-setting paths:**
- `createModeFromTemplate(template, overrides)` — defaults `builtAt: null` (intermediate state); callers override via `overrides.builtAt` when needed.
- `buildModeFromWizard(config)` (non-Ignition wizard paths) — leaves `builtAt: null`.
- `buildAndOpenRoom(config)` (full wizard → Ignition path) — saves the mode with `builtAt: Date.now()` as part of the persist-on-connected step.
- `igniteExistingRoom(roomId)` (editor "Build" → reused IgnitionStep) — loads the mode, sets `builtAt: Date.now()`, persists, creates the first conversation.
- Editor `handleSave` — preserves whatever `builtAt` is currently on the mode (does NOT auto-flip).

**Backwards compatibility:** no IDB schema bump. Existing modes load unchanged; the runtime treats them as built. Cross-version rollback safe — older code that doesn't know about `builtAt` will preserve it on save.
