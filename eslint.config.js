import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import noHardCodedWords from './eslint-rules/no-hard-coded-words.js'

export default defineConfig([
  globalIgnores(['dist', '.claude', 'refactor/v1-mockups-archive', 'src/locales']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Core no-unused-vars cannot see JSX use: <Icon /> from a renamed prop and
      // <motion.div> from framer-motion read as unused. Capitalised names and
      // motion are exempt so real findings stay visible.
      'no-unused-vars': ['error', { varsIgnorePattern: '^([A-Z_]|motion$)', argsIgnorePattern: '^[A-Z_]' }],
      // Fast Refresh in dev only. Catalogue entries export a manifest beside
      // their component; splitting them is part of lazy-loading blocks
      // (refactor plan, stage 3 onward). A warning until then.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // One way out (refactor-plan.md, stage 4; CLAUDE.md, hard constraints).
    // Requests to providers and sources, and keys, go through the gateway
    // and the key module in src/net. Nothing else imports provider code,
    // reads or writes a key, or calls the network itself.
    files: ['src/**/*.{js,jsx}'],
    ignores: ['src/net/**', 'src/providers/**', 'src/lib/crypto.js', 'src/lib/keyStore.js', 'src/lib/networkLog.js', 'src/**/*.test.js'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['**/providers', '**/providers/*'], message: 'Provider code is reached through the gateway: import from src/net.' },
          { group: ['**/lib/keyStore'], message: 'Keys are kept by the key module: import keys from src/net.' },
          {
            group: ['**/lib/crypto'],
            importNames: ['loadApiKey', 'saveApiKey', 'deleteApiKey', 'hasSavedKey'],
            message: 'Keys are read and kept by the key module: use keys or hasKey from src/net.',
          },
        ],
      }],
      'no-restricted-globals': ['error',
        { name: 'fetch', message: 'Requests go through the gateway (src/net), which names where they go.' },
        { name: 'XMLHttpRequest', message: 'Requests go through the gateway (src/net).' },
        { name: 'WebSocket', message: 'Requests go through the gateway (src/net).' },
        { name: 'EventSource', message: 'Requests go through the gateway (src/net).' },
      ],
      'no-restricted-properties': ['error',
        { object: 'window', property: 'fetch', message: 'Requests go through the gateway (src/net).' },
        { object: 'globalThis', property: 'fetch', message: 'Requests go through the gateway (src/net).' },
        { object: 'navigator', property: 'sendBeacon', message: 'Requests go through the gateway (src/net).' },
      ],
    },
  },
  {
    // The new chrome speaks through the copy table (src/copy.js), so every
    // word can be translated (C87). Today's screens are replaced, not
    // translated, so the rule covers the new chrome's folders only.
    files: ['src/chrome/**/*.{js,jsx}', 'src/shell/**/*.{js,jsx}', 'src/boards/**/*.{js,jsx}'],
    plugins: { parliament: { rules: { 'no-hard-coded-words': noHardCodedWords } } },
    rules: { 'parliament/no-hard-coded-words': 'error' },
  },
  {
    // Reflection reads, never writes (stage 12, piece 4; C228 (j), C235 (h)):
    // the board and its module import nothing that can write stored data,
    // on top of the one way out above. reflection.test.js follows every
    // import they make, so a module that writes cannot come in sideways.
    files: ['src/lib/reflection.js', 'src/chrome/ReflectionBoard.jsx'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['**/providers', '**/providers/*'], message: 'Provider code is reached through the gateway: import from src/net.' },
          { group: ['**/net', '**/net/*'], message: 'Reflection is given what it reads, and its calls are made by the shell.' },
          { group: ['**/db', '**/records', '**/stores/*', '**/migrations/*', '**/backup*', '**/restore*'], message: 'Reflection reads, never writes: it is given what it reads, and imports nothing that writes.' },
        ],
      }],
    },
  },
])
