# Security Model

Parliament is designed so that you never need to trust us with your data. Here's how.

## Architecture

This is a pure client-side web application. There is no backend server, no database, no user accounts, and no way for us to access your data. The only network requests the app makes are directly from your browser to Anthropic's API when you send a message.

## API Key Protection

Your Anthropic API key is encrypted at rest using the Web Crypto API before being stored in IndexedDB.

- Encryption: AES-GCM (256-bit)
- The encryption key is generated as a non-extractable CryptoKey via `crypto.subtle.generateKey` and stored in IndexedDB. Even JavaScript running on the page cannot export the raw key material.
- A fresh initialization vector (IV) is generated for each encryption operation.
- Users can choose their storage preference: persistent (survives browser restarts), session-only (cleared when the browser closes), or memory-only (never written to disk).

## Content Security Policy

The app is served with a strict Content Security Policy header:
```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
connect-src 'self' https://api.anthropic.com;
img-src 'self' data:;
font-src 'self';
object-src 'none';
frame-src 'none';
base-uri 'self'
```

This means no third-party scripts can execute, and the app can only make network requests to itself and Anthropic's API.

## Data Storage

All conversation data — messages, branches, highlights, notes, favorites, pinned references, and settings — is stored in your browser's IndexedDB. This storage is origin-locked, meaning only this app running on its exact domain can access it.

Conversation data is stored unencrypted in IndexedDB. It is protected by the browser's same-origin policy, the Content Security Policy, and HTTPS.

## Encrypted Backups

When you export your data, you can choose between two formats:

- **Encrypted (.apb):** You set a passphrase. The app derives an AES-256 encryption key from your passphrase using PBKDF2 (100,000 iterations, SHA-256), generates a random salt and IV, and encrypts the entire data payload with AES-GCM. The resulting file contains only the salt, IV, and ciphertext. Without the passphrase, the data cannot be recovered.
- **Plain JSON (.json):** An unencrypted export for portability. Use this if you want to analyze your data with other tools or migrate to another platform.

## What We Don't Do

- We do not run a backend server
- We do not store any user data
- We do not use analytics, tracking, or advertising scripts
- We do not make network requests to any service other than Anthropic's API
- We do not use third-party JavaScript libraries for cryptography (Web Crypto API only)
- We cannot recover your data if you clear your browser storage

## Spending Limits

Because you use your own Anthropic API key, you are responsible for any API costs incurred. We strongly recommend setting a monthly spending limit in your Anthropic dashboard at [console.anthropic.com](https://console.anthropic.com). The app includes a budget alert feature to help you track usage, but this is informational only and does not enforce limits.

## Reporting Vulnerabilities

If you discover a security vulnerability, please open a GitHub issue or contact us directly. We take security seriously and will respond promptly.
```
