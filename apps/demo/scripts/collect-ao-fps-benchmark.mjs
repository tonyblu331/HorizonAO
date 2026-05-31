#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertWebGpu,
  launchBenchmarkBrowser,
  startBenchmarkServer,
  waitForBenchmark,
  waitForServer,
} from './profiling/benchmarkHarness.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(scriptDir, '../../..')
const artifactRoot = path.join(repoRoot, 'artifacts', 'benchmarks')
const outputJson = path.join(artifactRoot, 'ao-fps-latest.json')
const outputMd = path.join(artifactRoot, 'ao-fps-summary.md')
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
const targetFrames = Number(process.env.AO_FPS_TARGET_FRAMES ?? 500)
const warmupMs = Number(process.env.AO_FPS_WARMUP_MS ?? 1000)
const maxWaitMs = Number(process.env.AO_FPS_MAX_WAIT_MS ?? 20000)
const resolutions = process.env.AO_BENCHMARK_WIDTH
  ? [{ width: Number(process.env.AO_BENCHMARK_WIDTH), height: Number(process.env.AO_BENCHMARK_HEIGHT ?? 720) }]
  : [
      { width: 1920, height: 1080 },
      { width: 1280, height: 720 },
    ]
const rowsToCapture = [
  { mode: 'off', denoise: false, label: 'Off' },
  { mode: 'gtao', denoise: false, label: 'GTAO raw' },
  { mode: 'gtao', denoise: true, label: 'GTAO denoised' },
  { mode: 'vbao', denoise: false, label: 'VBAO raw-debug' },
  { mode: 'vbao', denoise: true, label: 'VBAO product' },
]

function percentile(values, p) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))
  return sorted[index]
}

function weightedAverage(rows, field) {
  const totalFrames = rows.reduce((sum, row) => sum + (row.sampleCount ?? 0), 0)
  if (totalFrames <= 0) return 0
  return rows.reduce((sum, row) => sum + (row[field] ?? 0) * (row.sampleCount ?? 0), 0) / totalFrames
}

async function setComposeDebug(page, enabled) {
  await page.evaluate((nextEnabled) => {
    const input = document.querySelector('input[data-compose-debug]')
    if (input instanceof HTMLInputElement && input.checked !== nextEnabled) input.click()
  }, enabled)
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

async function setDenoise(page, enabled) {
  await page.evaluate((nextEnabled) => {
    const input = document.querySelector('input[data-denoise]')
    if (input instanceof HTMLInputElement && input.checked !== nextEnabled) input.click()
  }, enabled)
}

async function resetBenchmark(page) {
  await page.evaluate(() => window.__aoBenchmark?.reset())
}

async function collectFrameWindows(page, expected) {
  await resetBenchmark(page)
  await page.waitForTimeout(warmupMs)
  await resetBenchmark(page)

  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    const snapshot = await page.evaluate(() => window.__aoBenchmark?.snapshot())
    const matching = (snapshot?.history ?? []).filter((row) =>
      row.renderMode === 'single' &&
      row.mode === expected.mode &&
      row.viewMode === 'beauty' &&
      row.denoiseEnabled === expected.denoise,
    )
    const frames = matching.reduce((sum, row) => sum + (row.sampleCount ?? 0), 0)
    if (frames >= targetFrames) return { snapshot, matching, frames }
    await page.waitForTimeout(250)
  }

  const snapshot = await page.evaluate(() => window.__aoBenchmark?.snapshot())
  const matching = (snapshot?.history ?? []).filter((row) =>
    row.renderMode === 'single' &&
    row.mode === expected.mode &&
    row.viewMode === 'beauty' &&
    row.denoiseEnabled === expected.denoise,
  )
  const frames = matching.reduce((sum, row) => sum + (row.sampleCount ?? 0), 0)
  throw new Error(`Timed out collecting ${targetFrames} frames for ${expected.mode}/${expected.denoise}; got ${frames}`)
}

await mkdir(artifactRoot, { recursive: true })
const server = startBenchmarkServer({ externalServer, appRoot, benchmarkPort, baseUrl })
let browser
const results = []
try {
  await waitForServer({ server, baseUrl })
  browser = await launchBenchmarkBrowser()

  for (const viewport of resolutions) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
    try {
      await page.goto(`${baseUrl}/${scene}`, { waitUntil: 'domcontentloaded' })
      await waitForBenchmark(page)
      await assertWebGpu(page, { requireWebGpu })
      await setComposeDebug(page, false)
      await setView(page, 'beauty')

      for (const row of rowsToCapture) {
        await setMode(page, row.mode)
        await setDenoise(page, row.denoise)
        const { snapshot, matching, frames } = await collectFrameWindows(page, row)
        const avgFrameMs = weightedAverage(matching, 'avgFrameMs')
        const medianFrameMs = percentile(matching.map((item) => item.medianFrameMs), 0.5)
        const p95FrameMs = percentile(matching.map((item) => item.p95FrameMs), 0.95)
        const fps = avgFrameMs > 0 ? 1000 / avgFrameMs : 0
        results.push({
          scene,
          resolution: viewport,
          algorithm: row.mode,
          label: row.label,
          denoise: row.denoise,
          viewMode: 'beauty',
          targetFrames,
          capturedFrames: frames,
          windows: matching.length,
          fps,
          avgFrameMs,
          medianFrameMs,
          p95FrameMs,
          rendererBackend: snapshot?.environment?.rendererBackend ?? 'unknown',
          vbaoSamples: matching.at(-1)?.vbaoSamples ?? 0,
          vbaoSlices: matching.at(-1)?.vbaoSlices ?? 0,
          vbaoSamplingSchedule: matching.at(-1)?.vbaoSamplingSchedule ?? 'n/a',
        })
      }
    } finally {
      await page.close()
    }
  }
} finally {
  await browser?.close()
  server?.child.kill('SIGTERM')
}

results.sort((a, b) => a.resolution.width - b.resolution.width || a.avgFrameMs - b.avgFrameMs)
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  scene,
  targetFrames,
  warmupMs,
  resolutions,
  metricPriority: ['avgFrameMs', 'medianFrameMs', 'p95FrameMs', 'fps'],
  note: 'Simple FPS benchmark. Primary metric is average frame time over approximately targetFrames per row; lower ms wins.',
  results,
}
await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`)

const lines = []
lines.push('# AO FPS Benchmark Summary')
lines.push('')
lines.push(`Generated: ${report.generatedAt}`)
lines.push(`Target frames per row: ${targetFrames}`)
lines.push('')
lines.push('| Resolution | Algorithm | Denoise | Frames | Avg ms ↓ | Median ms ↓ | P95 ms ↓ | FPS ↑ |')
lines.push('| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |')
for (const row of results) {
  lines.push(`| ${row.resolution.width}x${row.resolution.height} | ${row.label} | ${row.denoise ? 'on' : 'off'} | ${row.capturedFrames} | ${row.avgFrameMs.toFixed(3)} | ${row.medianFrameMs.toFixed(3)} | ${row.p95FrameMs.toFixed(3)} | ${row.fps.toFixed(1)} |`)
}
await writeFile(outputMd, `${lines.join('\n')}\n`)
console.log(JSON.stringify({ outputJson, outputMd, rows: results.length }, null, 2))
