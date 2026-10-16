import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.claude', 'refactor/v1-mockups-archive']),
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
])
