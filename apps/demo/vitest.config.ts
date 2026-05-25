import { defineConfig } from 'vitest/config'

/**
 * Vitest configuration for the demo app.
 *
 * The demo keeps browser e2e tests under apps/demo/e2e/. We explicitly exclude
 * that directory so Vitest doesn't try to run Playwright test files and fail
 * with confusing errors.
 *
 * The root `pnpm test` command runs each package's `test` script recursively;
 * this config ensures `@horizonao/demo` passes cleanly with no test files found.
 */
export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'apps/demo/e2e/**',
      'e2e/**',
    ],
    passWithNoTests: true,
  },
})
