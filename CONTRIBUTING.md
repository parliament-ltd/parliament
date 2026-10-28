# Contributing to Parliament

Thank you for wanting to help. Parliament is small, and every change is read
closely, so a short note first saves everyone time.

## Before you write code

- **Open an issue first** for anything larger than a fix: what you want to
  change, and why. A design question is settled before the code is written.
- **The design is written down.** `docs/spec/` holds the documents and
  `docs/spec/conflicts.md` the rulings on where they disagree. Where your
  change meets one, follow it, or say in the issue why it should change.
  [CLAUDE.md](CLAUDE.md) is the short version, and its hard constraints are not
  relaxed in a pull request.
- **Security problems are not issues.** See [SECURITY.md](SECURITY.md) to
  report one privately.

## The rules every change keeps

- No backend, no accounts, no analytics, no code loaded from another site.
- Every request to a provider or source goes through the gateway in
  `src/net`. A provider that takes a key is reached only through the key
  vault (`vault/`).
- Text from outside (a reply, a source's answer, pasted text, a restored file)
  is data: it is never turned into HTML and can never run a command.
- Stored data is never changed without the change being shown and agreed
  first, and every backup ever written stays readable.
- Nothing is deleted outright: retired code moves to `src/deprecated/`.
- Words on screen come from the copy table (`src/copy.js`): sentence case, no
  em dashes, no provider named in a sentence.

## Making the change

```bash
npm install
npm run dev          # the app on localhost:5173
npm run dev:vault    # the key vault on localhost:5175, for anything with keys
npm run check        # tests, lint, and both builds: must pass
```

- Keep commits small, each saying what changed and why.
- Add or change a test with the code it covers.
- If you change a command, run `npm run reference` so `docs/verbs.md` follows.
- If you change the security headers, run `npm run reference` so SECURITY.md
  follows; `netlify.toml` and `vault/netlify.toml` must match the code, and a
  test checks they do.

## Blocks

Rooms are built from blocks. New blocks arrive by pull request and ship in the
catalogue after review; no one else's code runs inside Parliament any other
way. See [the block guide](docs/blocks.md).

## Licence

By contributing you agree that your work is published under the MIT licence,
as the rest of Parliament is ([LICENSE](LICENSE)).
