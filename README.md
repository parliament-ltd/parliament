# Parliament

Parliament is an attempt to rethink how we interact with AI.

Parliament runs in your browser. There is no backend and no account. You
bring your own keys, or run a model on your own machine. What you write stays
on your device until you press Enter. Then it goes straight to the provider or
source you chose, and nowhere else.

## What it is

- **Boards.** Everything on screen is a board: Records (everything you have
  made, by number), the Collection, the Library, the Plan board, Reflection,
  Settings, and every room. Boards sit side by side, can be popped into their
  own windows and moved to another screen, and arrangements of them can be
  saved.
- **The bar.** One field, read three ways: search, `>` for a command, `p>` for
  a prompt. The line under it says what Enter will do before you press it.
  [Every command](docs/verbs.md).
- **Rooms.** A room is a board built around a conversation, from blocks,
  a layout and a theme. Rooms are built in the Lab, by command.
- **Sources before AI.** A question can go to a public source such as
  Wikipedia first, with no key and no model.
- **Taking part.** Replies are edited in place: strike words, add your own,
  ask for a change. Your edits go with your next prompt. Prompts can go to
  several models at once, as branches, or be planned as steps and run.

## What leaves your device

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
  audio leaves it. Where a browser can only do this by sending audio to its
  maker, Parliament does not offer voice.
- **The app itself.** Your browser fetches Parliament's files from
  `parliament.ltd` and `keys.parliament.ltd`, hosted by Netlify. Like any web
  host it sees your IP address and browser type. It never receives your chats
  or keys.
- **Nothing else.** No analytics, no tracking, no advertising, and no code
  loaded from any other site.

## Your keys

Each key is kept by Parliament's key vault, a small page of its own at
`keys.parliament.ltd`, encrypted, and is sent only to its own provider. Code
running on Parliament's page cannot read a key; it can only ask the vault to
send to a provider on the vault's own list. See [SECURITY.md](SECURITY.md).

## Who it can talk to

Every provider and source is listed in Settings, and in the published policy,
before it can be used.

- Providers that take a key: Anthropic, Mistral.
- A model on your own machine: Ollama, on `localhost:11434`.
- Sources with no key: Wikipedia, Hacker News (through Algolia), OpenAlex.

## Running it on your own computer

```bash
npm install
npm run dev          # the app, on localhost:5173
npm run dev:vault    # the key vault, on localhost:5175, beside it
npm run check        # tests, lint, and both builds
npm run reference    # rewrites docs/verbs.md and SECURITY.md's policy block
node scripts/policy-trial.mjs   # both builds under the real headers, on 4173 and 5176
```

## More

- [Every command](docs/verbs.md), written from the command registry.
- [SECURITY.md](SECURITY.md): how Parliament is built to keep your work yours,
  and how to report a vulnerability.
- [Browsers](docs/spec/browsers.md): what works where. Settings, About, says
  what works in the browser you are using.
- [CHANGELOG.md](CHANGELOG.md): what each version changed.
- [CLAUDE.md](CLAUDE.md) and [docs/spec/](docs/spec/): the design record and
  its rulings. [refactor/](refactor/) explains how the code got here.

## Licence

MIT. See [LICENSE](LICENSE).
