# Project Apollo

A power-user chat interface for AI models, starting with Claude. Built for people who want more control over their conversations.

## What is this?

Project Apollo is a client-side web app that gives you a better way to interact with Claude. It runs entirely in your browser — no backend, no accounts, no servers. You bring your own Anthropic API key, and all your data stays on your machine.

## Key Features

- **Conversation branching** — fork any conversation at any message to explore alternative paths without losing your original thread
- **Context health monitoring** — real-time visibility into how much of the context window you've used, with smart compression that preserves your history via branching
- **Highlights, notes, and favorites** — annotate messages with color-coded highlights, attach notes, and bookmark important responses
- **Pinned references** — keep key messages visible for quick reference without using context window tokens
- **Conversation review** — generate AI-powered summaries of your conversations, with control over which annotations feed into the synthesis
- **Encrypted backups** — export your data as encrypted `.apb` files or portable plain-text JSON
- **Multiple storage modes** — choose how your API key is stored: persistent, session-only, or memory-only
- **Model selection** — switch between Claude Haiku, Sonnet, and Opus based on your needs

## Getting Started

### 1. Get an Anthropic API Key

Visit [console.anthropic.com](https://console.anthropic.com) to create an account and generate an API key. We strongly recommend setting a monthly spending limit in your Anthropic dashboard.

### 2. Use the App

Visit the hosted version at [link coming soon] — paste your API key in Settings, and you're ready to go.

### 3. Run Locally (Optional)
```bash
git clone https://github.com/[your-username]/project-apollo.git
cd project-apollo
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Privacy and Security

Project Apollo is designed with a zero-trust architecture:

- **No backend** — the app makes zero network requests except directly to Anthropic's API
- **API key encrypted at rest** — stored using the Web Crypto API (AES-GCM) with a non-extractable encryption key
- **Strict Content Security Policy** — no third-party scripts can run
- **All data stays local** — conversations, notes, highlights, and settings live in your browser's IndexedDB
- **No analytics, tracking, or ads** — none, ever
- **Open source** — every line of code is auditable

For full details, see [SECURITY.md](SECURITY.md).

## Tech Stack

- React 18 + Vite
- Tailwind CSS
- Framer Motion
- IndexedDB (via idb)
- Web Crypto API
- React Router v6
- Lucide React

## Project Structure
```
src/
  components/       # Shared UI components
  views/            # Route-level pages (Chat, Selector, Settings)
  lib/              # Utilities (db, crypto, tokens)
  providers/        # API provider abstraction
  stores/           # React Context state management
  assets/           # Static assets
mockups/            # Reference UI mockups (.jsx)
```

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

## License

MIT — see [LICENSE](LICENSE) for details.
