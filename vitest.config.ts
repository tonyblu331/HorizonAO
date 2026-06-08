import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

/**
 * Root Vitest configuration for the monorepo.
 *
 * Unit and integration tests live under `packages/`.
 * Playwright e2e tests live under `apps/demo/e2e/` and are run via
 * `pnpm test:e2e` (Playwright), NOT Vitest. Explicitly exclude them here
 * so a root-level `vitest run` (used in CI and manually) doesn't pick them up.
 */

/**
 * Normalize CRLF -> LF for every `?raw` import.
 *
 * Source-contract tests (e.g. `vbaoNodeSource.test.ts`) import source files via
 * Vite `?raw` and assert multiline `\n` substrings. On Windows checkouts with
 * `core.autocrlf=true`, `?raw` would carry `\r\n` and break those assertions even
 * though the code is correct. This `enforce: 'pre'` load hook intercepts `?raw`
 * ids before Vite's built-in raw loader and emits LF-normalized content, making the
 * tests line-ending agnostic. Pairs with `.gitattributes` (`eol=lf`) which fixes
 * the repo policy itself.
 */
function rawLfNormalize() {
  return {
    name: 'raw-lf-normalize',
    enforce: 'pre' as const,
    load(id: string) {
      if (!id.endsWith('?raw')) return null
      const filePath = id.slice(0, -'?raw'.length)
      const content = readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n')
      return `export default ${JSON.stringify(content)}`
    },
  }
}

export default defineConfig({
  plugins: [rawLfNormalize()],
  test: {
    include: ['packages/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
    ],
  },
})
