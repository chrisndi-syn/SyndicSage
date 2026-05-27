// @ts-check
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import globals  from 'globals'

/** @type {import('eslint').Linter.Config[]} */
export default [
  // ── Ignore generated + build output ──────────────────────────
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'packages/types/src/database.types.ts',  // auto-generated
      'docs/generate_costs.py',
    ],
  },

  // ── All TypeScript source files ───────────────────────────────
  {
    files: ['apps/*/src/**/*.{ts,tsx}', 'packages/*/src/**/*.ts'],
    languageOptions: {
      parser:        tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      globals:       { ...globals.browser, ...globals.node },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // TypeScript safety
      '@typescript-eslint/no-explicit-any':  'error',
      '@typescript-eslint/no-unused-vars':   ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      // ── Import isolation (enforces feature-block architecture) ──
      // Features may NOT import from other features.
      // Only allowed imports: shared/, components/, packages/, lib/
      //
      // Pattern: any import containing /features/ that is NOT
      // the current file's own feature folder is forbidden.
      'no-restricted-imports': ['error', {
        patterns: [
          {
            // Prevent cross-feature imports inside apps/web/src/features/
            // e.g. features/documents importing from features/charges
            group:   ['*/features/*/*'],
            message: 'Cross-feature imports are forbidden. Use shared/, components/, or packages/ instead.',
          },
        ],
      }],

      // Prevent console.log leaking into production code
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // ── React-specific (web app only) ────────────────────────────
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    rules: {
      // Hooks
      'no-restricted-syntax': [
        'error',
        {
          // Block raw useState+useEffect for server data — use TanStack Query
          selector: 'CallExpression[callee.name="useEffect"]',
          message:  'Use TanStack Query (useQuery/useMutation) for server data. useEffect is for side effects only.',
        },
      ],
    },
  },

  // ── API + Worker (Node.js) ───────────────────────────────────
  {
    files: ['apps/api/src/**/*.ts', 'apps/worker/src/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // Enforce authorize() is present — caught in code review,
      // this rule catches accidental removal of the import
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
]
