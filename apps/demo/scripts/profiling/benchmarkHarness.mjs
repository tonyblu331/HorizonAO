import { spawn } from 'node:child_process'
import path from 'node:path'
import { chromium } from '@playwright/test'

export async function waitForServer({ server, baseUrl }) {
  if (server !== undefined) await server.ready

  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl)
      if (response.ok) return
    } catch {
      // Retry until Vite is ready.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250))
  }
  throw new Error(`Timed out waiting for AO benchmark demo server at ${baseUrl}`)
}

export function startBenchmarkServer({ externalServer, appRoot, benchmarkPort, baseUrl }) {
  if (externalServer) return undefined

  const viteBin = path.resolve(appRoot, 'node_modules/vite/bin/vite.js')
  const child = spawn(
    process.execPath,
    [viteBin, '--host', '127.0.0.1', '--port', String(benchmarkPort), '--strictPort'],
    {
      cwd: appRoot,
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  let settled = false
  let output = ''
  let resolveReady
  let rejectReady
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve
    rejectReady = reject
  })
  const observeStartup = (chunk, log) => {
    const text = String(chunk)
    output += text
    log(text.trim())
    if (!settled && /ready in|Local:/i.test(text)) {
      settled = true
      resolveReady()
    }
  }

  child.stdout?.on('data', (chunk) => observeStartup(chunk, console.log))
  child.stderr?.on('data', (chunk) => observeStartup(chunk, console.error))
  child.once('exit', (code, signal) => {
    if (settled) return
    settled = true
    rejectReady(
      new Error(
        `Vite exited before AO benchmark readiness while --strictPort was active (code ${code ?? 'null'}, signal ${signal ?? 'null'}). Refusing stale-server capture at ${baseUrl}.
${output.trim()}`,
      ),
    )
  })

  return { child, ready }
}

export async function launchBenchmarkBrowser() {
  return chromium.launch({
    channel: process.env.PLAYWRIGHT_CHROME_CHANNEL ?? 'chrome',
    headless: true,
    args: [
      '--enable-unsafe-webgpu',
      '--ignore-gpu-blocklist',
      '--enable-features=WebGPUDeveloperFeatures,Vulkan',
      '--use-angle=d3d11',
    ],
  })
}

export async function waitForBenchmark(page) {
  await page.waitForFunction(() => window.__aoBenchmark?.latest !== undefined, undefined, {
    timeout: 30_000,
  })
}

export async function assertWebGpu(page, { requireWebGpu }) {
  const environment = await page.evaluate(() => window.__aoBenchmark?.environment)
  if (requireWebGpu && environment?.rendererBackend !== 'webgpu') {
    throw new Error(`AO benchmark requires WebGPU; got ${environment?.rendererBackend ?? 'unknown'}`)
  }
}
