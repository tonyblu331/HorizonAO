import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const testPort = 41737
const baseURL = `http://127.0.0.1:${testPort}`
const nodeBin = JSON.stringify(process.execPath)
const viteBin = JSON.stringify(fileURLToPath(new URL('./node_modules/vite/bin/vite.js', import.meta.url)))

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  workers: 1,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `${nodeBin} ${viteBin} --host 127.0.0.1 --port ${testPort} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    gracefulShutdown: { signal: 'SIGINT', timeout: 500 },
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
