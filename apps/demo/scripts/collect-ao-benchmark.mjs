#!/usr/bin/env node
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertWebGpu, launchBenchmarkBrowser, startBenchmarkServer, waitForBenchmark, waitForServer } from './profiling/benchmarkHarness.mjs'
import { classifyFailureLabels, writeProductionQualityReports } from './profiling/productionReport.mjs'
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
const modes = ['off', 'gtao', 'ssao', 'vbao', 'n8ao']
const views = ['beauty', 'ao']
const denoiseStates = [false, true]
const vbaoResolutionStates = [false, true]
const vbaoDemoSoftness = 0.45

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
  return (mode === 'off' && denoiseEnabled) || (mode === 'n8ao' && !denoiseEnabled)
}

function createVbaoPassTimingRows({ mode, denoise, fullResolutionVbao }) {
  if (mode !== 'vbao') return []

  const productOutput = denoise === true
  const lowResolution = fullResolutionVbao === false
  const cleanupEnabled = productOutput && lowResolution && vbaoDemoSoftness > 0
  const resolveEnabled = productOutput && lowResolution
  const polishEnabled =
    productOutput &&
    (lowResolution ? Math.max(0, vbaoDemoSoftness - 0.5) * 2 > 0 : vbaoDemoSoftness > 0)
  const status = (enabled) => (enabled ? 'unmeasured' : 'skipped')
  const reason = (enabled, skippedReason) =>
    enabled
      ? 'Pass participates in this product graph, but pass-level GPU timestamp measurement is not captured by this collector yet.'
      : skippedReason

  return [
    {
      pass: 'raw',
      status: 'unmeasured',
      gpuMs: null,
      reason: 'Raw AO pass participates in both raw debug and product output paths.',
    },
    {
      pass: 'cleanup',
      status: status(cleanupEnabled),
      gpuMs: null,
      reason: reason(cleanupEnabled, productOutput ? 'Skipped for full-resolution output.' : 'Skipped for raw debug output.'),
    },
    {
      pass: 'resolve',
      status: status(resolveEnabled),
      gpuMs: null,
      reason: reason(resolveEnabled, productOutput ? 'Skipped for full-resolution output.' : 'Skipped for raw debug output.'),
    },
    {
      pass: 'polish',
      status: status(polishEnabled),
      gpuMs: null,
      reason: reason(
        polishEnabled,
        productOutput
          ? 'Skipped because the configured softness budget does not fund full-resolution polish in this graph.'
          : 'Skipped for raw debug output.',
      ),
    },
    {
      pass: 'total-product',
      status: status(productOutput),
      gpuMs: null,
      reason: reason(productOutput, 'Skipped for raw debug output.'),
    },
  ]
}

await mkdir(screenshotRoot, { recursive: true })
const server = startBenchmarkServer({ externalServer, appRoot, benchmarkPort, baseUrl })
let browser
const rows = []
try {
  await waitForServer({ server, baseUrl })
  browser = await launchBenchmarkBrowser()

  for (const viewport of resolutions) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
    try {
      await page.goto(`${baseUrl}/museum`, { waitUntil: 'domcontentloaded' })
      await waitForBenchmark(page)
      await assertWebGpu(page, { requireWebGpu })

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
                passTimings: createVbaoPassTimingRows({ mode, denoise, fullResolutionVbao }),
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
