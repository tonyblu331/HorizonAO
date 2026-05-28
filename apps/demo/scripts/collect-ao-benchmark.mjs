#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { classifyFailureLabels } from './profiling/failureLabels.mjs'
import { writeProductionQualityReports } from './profiling/reportWriters.mjs'
import { analyzeScreenshotQuality } from './profiling/screenshotMetrics.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(scriptDir, '../../..')
const artifactRoot = path.join(repoRoot, 'artifacts', 'benchmarks')
const screenshotRoot = path.join(artifactRoot, 'screenshots-ao-production')
const outputJson = path.join(artifactRoot, 'ao-production-latest.json')
const outputMd = path.join(artifactRoot, 'ao-production-quality-summary.md')
const benchmarkPort = Number(process.env.PLAYWRIGHT_TEST_PORT ?? process.env.AO_BENCHMARK_PORT ?? 5173)
const explicitBaseUrl = process.env.AO_BENCHMARK_BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL
const externalServer = process.env.AO_BENCHMARK_EXTERNAL_SERVER === '1' || explicitBaseUrl !== undefined
if (process.env.AO_BENCHMARK_EXTERNAL_SERVER === '1' && explicitBaseUrl === undefined) {
  throw new Error(
    'AO_BENCHMARK_EXTERNAL_SERVER=1 requires AO_BENCHMARK_BASE_URL or PLAYWRIGHT_BASE_URL to avoid stale-server captures.',
  )
}
const baseUrl = explicitBaseUrl ?? `http://127.0.0.1:${benchmarkPort}`
const scene = 'museum'
const requireWebGpu = process.env.AO_BENCHMARK_REQUIRE_WEBGPU !== '0'
const resolutions = process.env.AO_BENCHMARK_WIDTH
  ? [{ width: Number(process.env.AO_BENCHMARK_WIDTH), height: Number(process.env.AO_BENCHMARK_HEIGHT ?? 720) }]
  : [
      { width: 1920, height: 1080 },
      { width: 1280, height: 720 },
    ]
const modes = ['off', 'gtao', 'vbao']
const views = ['beauty', 'ao']
const denoiseStates = [false, true]
const vbaoResolutionStates = [false, true]

async function waitForServer(server) {
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

function startServer() {
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
        `Vite exited before AO benchmark readiness while --strictPort was active (code ${code ?? 'null'}, signal ${signal ?? 'null'}). Refusing stale-server capture at ${baseUrl}.\n${output.trim()}`,
      ),
    )
  })

  return { child, ready }
}

async function waitForBenchmark(page) {
  await page.waitForFunction(() => window.__aoBenchmark?.latest !== undefined, undefined, {
    timeout: 30_000,
  })
}

async function setMode(page, mode) {
  await page.evaluate((nextMode) => {
    document.querySelector(`button[data-mode="${nextMode}"]`)?.click()
  }, mode)
}

async function setView(page, view) {
  await page.evaluate((nextView) => {
    document.querySelector(`button[data-view="${nextView}"]`)?.click()
  }, view)
}

async function setComposeDebug(page, enabled) {
  await page.evaluate((nextEnabled) => {
    const input = document.querySelector('input[data-compose-debug]')
    if (input instanceof HTMLInputElement && input.checked !== nextEnabled) input.click()
  }, enabled)
}

async function setDenoise(page, enabled) {
  await page.evaluate((nextEnabled) => {
    const input = document.querySelector('input[data-denoise]')
    if (input instanceof HTMLInputElement && input.checked !== nextEnabled) input.click()
  }, enabled)
}

async function setFullResolutionVbao(page, enabled) {
  await page.evaluate((nextEnabled) => {
    const input = document.querySelector('input[data-full-resolution]')
    if (input instanceof HTMLInputElement && input.checked !== nextEnabled) input.click()
  }, enabled)
}

async function readSnapshot(page) {
  return page.evaluate(() => window.__aoBenchmark?.snapshot())
}

async function assertWebGpu(page) {
  const environment = await page.evaluate(() => window.__aoBenchmark?.environment)
  if (requireWebGpu && environment?.rendererBackend !== 'webgpu') {
    throw new Error(`AO benchmark requires WebGPU; got ${environment?.rendererBackend ?? 'unknown'}`)
  }
}

async function resetBenchmark(page) {
  await page.evaluate(() => window.__aoBenchmark?.reset())
}

async function waitForLatest(page, expected) {
  await page.waitForFunction(
    ({ mode, view, denoise, fullResolutionVbao }) => {
      const latest = window.__aoBenchmark?.latest
      return (
        latest?.renderMode === 'single' &&
        latest.mode === mode &&
        latest.viewMode === view &&
        latest.denoiseEnabled === denoise &&
        latest.fullResolutionVbao === fullResolutionVbao &&
        latest.reportIndex > 0
      )
    },
    expected,
    { timeout: 30_000 },
  )
}

function shouldSkip(mode, denoiseEnabled) {
  return mode === 'off' && denoiseEnabled
}

await mkdir(screenshotRoot, { recursive: true })
const server = startServer()
let browser
const rows = []
try {
  await waitForServer(server)
  browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHROME_CHANNEL ?? 'chrome',
    headless: true,
    args: [
      '--enable-unsafe-webgpu',
      '--ignore-gpu-blocklist',
      '--enable-features=WebGPUDeveloperFeatures,Vulkan',
      '--use-angle=d3d11',
    ],
  })

  for (const viewport of resolutions) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
    try {
      await page.goto(`${baseUrl}/museum`, { waitUntil: 'domcontentloaded' })
      await waitForBenchmark(page)
      await assertWebGpu(page)

      for (const mode of modes) {
        for (const view of views) {
          for (const denoise of denoiseStates) {
            if (shouldSkip(mode, denoise)) continue
            const fullResolutionModes = mode === 'vbao' ? vbaoResolutionStates : [true]
            for (const fullResolutionVbao of fullResolutionModes) {
              await setComposeDebug(page, false)
              await setMode(page, mode)
              await setView(page, view)
              await setDenoise(page, denoise)
              await setFullResolutionVbao(page, fullResolutionVbao)
              await resetBenchmark(page)
              await page.waitForTimeout(650)
              await resetBenchmark(page)
              await waitForLatest(page, { mode, view, denoise, fullResolutionVbao })
              const snapshot = await readSnapshot(page)
              const latest = snapshot?.latest
              const outputLabel =
                mode === 'vbao' ? (denoise ? 'product' : 'raw-debug') : denoise ? 'denoised' : 'raw'
              const vbaoResolutionLabel =
                mode === 'vbao' ? (fullResolutionVbao ? 'full-res' : 'half-res') : 'n/a'
              const label =
                mode === 'vbao'
                  ? `${viewport.width}x${viewport.height}-${scene}-${mode}-${vbaoResolutionLabel}-${outputLabel}-${view}`
                  : `${viewport.width}x${viewport.height}-${scene}-${mode}-${outputLabel}-${view}`
              const screenshotPath = path.join(screenshotRoot, `${label}.png`)
              await page.screenshot({ path: screenshotPath })
              const qualityMetrics = await analyzeScreenshotQuality(page, screenshotPath)
              const row = {
                label,
                backend: latest?.rendererBackend ?? 'unknown',
                scene,
                resolution: viewport,
                mode,
                view,
                denoise,
                fullResolutionVbao,
                vbaoResolution: vbaoResolutionLabel,
                productOutputContract:
                  mode === 'vbao'
                    ? denoise
                      ? 'VBAONode.getTextureNode() final product AO with internal reconstruction/polish'
                      : 'VBAONode.getRawTextureNode() raw debug AO'
                    : 'n/a',
                sampling: mode === 'vbao' ? (latest?.vbaoSamplingSchedule ?? 'phase-atlas-stable-hash') : 'n/a',
                qualityMetrics,
                screenshotPath,
                latest,
              }
              rows.push({
                ...row,
                failureLabels: classifyFailureLabels(row),
              })
            }
          }
        }
      }
    } finally {
      await page.close()
    }
  }
} finally {
  await browser?.close()
  server?.child.kill('SIGTERM')
}

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  scene,
  resolutions,
  note: 'Production-only local capture. This is not a formal EVIDENCE.md claim unless copied into EVIDENCE.md with timings review.',
  rows,
}
await writeProductionQualityReports({ outputJson, outputMd, report })
console.log(JSON.stringify({ outputJson, outputMd, screenshotRoot, rows: rows.length }, null, 2))
