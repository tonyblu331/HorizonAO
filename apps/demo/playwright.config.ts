import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const testPort = Number(process.env.PLAYWRIGHT_TEST_PORT ?? 41737)
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${testPort}`
const nodeBin = JSON.stringify(process.execPath)
const viteBin = JSON.stringify(fileURLToPath(new URL('./node_modules/vite/bin/vite.js', import.meta.url)))
const useExternalServer = process.env.PLAYWRIGHT_EXTERNAL_SERVER === '1'
const webgpuArgs = [
  '--enable-unsafe-webgpu',
  '--ignore-gpu-blocklist',
  '--enable-features=WebGPUDeveloperFeatures',
]

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
  ...(useExternalServer
    ? {}
    : {
      webServer: {
        command: `${nodeBin} ${viteBin} --host 127.0.0.1 --port ${testPort} --strictPort`,
        url: baseURL,
        reuseExistingServer: false,
        gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
        timeout: 120_000,
      },
    }),
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
        launchOptions: {
          args: webgpuArgs,
        },
      },
    },
  ],
})
