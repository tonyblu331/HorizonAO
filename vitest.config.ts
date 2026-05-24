import { defineConfig } from 'vitest/config'

/**
 * Root Vitest configuration for the monorepo.
 *
 * Unit and integration tests live under `packages/`.
 * Playwright e2e tests live under `apps/demo/e2e/` and are run via
 * `pnpm test:e2e` (Playwright), NOT Vitest. Explicitly exclude them here
 * so a root-level `vitest run` (used in CI and manually) doesn't pick them up.
 */
export default defineConfig({
  test: {
    include: ['packages/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
    ],
  },
})
