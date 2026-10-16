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
