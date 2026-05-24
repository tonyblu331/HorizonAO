import { defineConfig } from 'vitest/config'

/**
 * Vitest configuration for the demo app.
 *
 * The demo has no unit/integration tests of its own — only Playwright e2e tests
 * (apps/demo/e2e/). We explicitly exclude the e2e directory so Vitest doesn't
 * try to run Playwright test files and fail with confusing errors.
 *
 * The root `pnpm test` command runs each package's `test` script recursively;
 * this config ensures `@horizonao/demo` passes cleanly with no test files found.
 */
export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'e2e/**',
    ],
    passWithNoTests: true,
  },
})
