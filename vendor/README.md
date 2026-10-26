# Vendored packages

Packages kept in the repository instead of fetched from npm, and why.

## xlsx-0.20.3.tgz

SheetJS, which reads spreadsheets (`.xlsx`, `.xls`) for the file shelf.

- **Why it is here:** the copy on npm is frozen at 0.18.5 (2022), which has two
  high advisories when reading crafted files and no fix on npm. The vendor
  publishes fixed versions only from its own site and recommends vendoring the
  tarball.
- **Source:** `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, fetched on
  15 October 2026 with Stefan's approval. It was the newest version listed.
- **Checks:** 2,409,319 bytes. SHA-256
  `8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8`. The
  npm integrity value in `package-lock.json` matches the file. Apache-2.0
  licence, no dependencies, no install scripts.
- **How it is used:** loaded only when a spreadsheet is opened, inside a
  background worker (`src/lib/spreadsheetWorker.js`) with a size limit and a
  timeout, so a malicious file cannot reach the page that holds the keys.
- **Updating:** `npm audit` does not watch this package. Check the vendor's
  site for a newer version now and then, fetch it into an empty folder, check
  it as above, replace the file, run `npm install ./vendor/<file>`, update this
  note.

## ProseMirror: seven tarballs

The editor that edits replies and prompts in place (stage 11; C205, C208,
C210 (e), C211 (e)): `prosemirror-model-1.25.12`, `prosemirror-state-1.4.4`,
`prosemirror-view-1.42.6`, `prosemirror-transform-1.12.2`,
`prosemirror-keymap-1.2.3`, and the two small helpers they need,
`orderedmap-2.1.1` and `w3c-keyname-2.2.8`.

- **Why they are here:** chosen on 26 October on condition that the code sits
  in the repository, so a version changes only on purpose, after a read
  (C211 (e)). Kept as the published tarballs, not unpacked folders: npm then
  installs them like any package, so the five share one copy of the model
  (two copies break the editor), and none of their build scripts runs.
- **Source:** the exact files npm installed on 24 October with Stefan's
  approval, packed from npm's local cache on 26 October with no network. Each
  matches the integrity value the lockfile recorded from the registry.
- **Checks (SHA-256):**
  - `orderedmap-2.1.1.tgz`, 3,308 bytes, `9ad98abe6ac4156daef2232d7c1d2c8b3681545604c54f7f3754e791f12c168d`
  - `prosemirror-keymap-1.2.3.tgz`, 7,470 bytes, `3131823ce73eaf3487cada22c85b76349da02c114dee3de696f4c1c3c645ca8c`
  - `prosemirror-model-1.25.12.tgz`, 130,134 bytes, `0ac7e5deed004b7f983ca295fa1e84b19f7ee38995e39dee9809d9a4ebd5c6c8`
  - `prosemirror-state-1.4.4.tgz`, 43,710 bytes, `ad3eb60bd6db8e74b2576dc0b7c2800d6def362e0e990c9fb108fc4b724ee651`
  - `prosemirror-transform-1.12.2.tgz`, 75,618 bytes, `a9b778a065f7a5d723b9aaeb6c7026216dba678086abe9d24b52d7abb96366dc`
  - `prosemirror-view-1.42.6.tgz`, 228,272 bytes, `cf47baf6a53d609220fdc9b6a71b7de04f5e4cc67b2a00d1f55d967f22a68c2c`
  - `w3c-keyname-2.2.8.tgz`, 2,970 bytes, `05d21484026d1f2dd842c843181e391e66d60f1d5dff292d562c3f40302dab36`

  MIT licence, all by one author. No network calls, no storage, nothing run
  as code; the one place they read HTML (a pasted or dropped clipboard) is
  never reached, because Parliament takes paste and drop first, as plain text.
- **Updating:** fetch the new tarballs into an empty folder
  (`npm pack <name>@<version>`), read what changed before taking it (unpack
  the old and new tarballs side by side and compare them, or
  `npm diff --diff=<name>@<old> --diff=<name>@<new>`), check the sizes and
  hashes, replace the files, run `npm install`, update this note. `npm audit`
  still reads these by name and version.
