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
import { analyzeScreenshotQuality } from './profiling/screenshotMetrics.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(scriptDir, '../../..')
const artifactRoot = path.join(repoRoot, 'artifacts', 'benchmarks')
const screenshotRoot = path.join(artifactRoot, 'screenshots-vbao-noise-sources')
const outputJson = path.join(artifactRoot, 'vbao-noise-source-comparison-latest.json')
const outputMd = path.join(artifactRoot, 'vbao-noise-source-comparison-summary.md')
const benchmarkPort = Number(
  process.env.PLAYWRIGHT_TEST_PORT ?? process.env.AO_BENCHMARK_PORT ?? 5173,
)
const explicitBaseUrl = process.env.AO_BENCHMARK_BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL
const externalServer =
  process.env.AO_BENCHMARK_EXTERNAL_SERVER === '1' || explicitBaseUrl !== undefined
if (process.env.AO_BENCHMARK_EXTERNAL_SERVER === '1' && explicitBaseUrl === undefined) {
  throw new Error(
    'AO_BENCHMARK_EXTERNAL_SERVER=1 requires AO_BENCHMARK_BASE_URL or PLAYWRIGHT_BASE_URL to avoid stale-server captures.',
  )
}
const baseUrl = explicitBaseUrl ?? `http://127.0.0.1:${benchmarkPort}`
const requireWebGpu = process.env.AO_BENCHMARK_REQUIRE_WEBGPU !== '0'
const noiseSources = ['phase-atlas-stable-hash', 'ign', 'static-stbn', 'fast-like']
const resolutions = process.env.AO_BENCHMARK_WIDTH
  ? [
      {
        width: Number(process.env.AO_BENCHMARK_WIDTH),
        height: Number(process.env.AO_BENCHMARK_HEIGHT ?? 720),
      },
    ]
  : [
      { width: 1920, height: 1080 },
      { width: 1280, height: 720 },
    ]
const views = ['beauty', 'ao']
const productStates = [false, true]

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

async function setFullResolutionVbao(page, enabled) {
  await page.evaluate((nextEnabled) => {
    const input = document.querySelector('input[data-full-resolution]')
    if (input instanceof HTMLInputElement && input.checked !== nextEnabled) input.click()
  }, enabled)
}

async function setComposeDebug(page, enabled) {
  await page.evaluate((nextEnabled) => {
    const input = document.querySelector('input[data-compose-debug]')
    if (input instanceof HTMLInputElement && input.checked !== nextEnabled) input.click()
  }, enabled)
}

async function resetBenchmark(page) {
  await page.evaluate(() => window.__aoBenchmark?.reset())
}

async function readSnapshot(page) {
  return page.evaluate(() => window.__aoBenchmark?.snapshot())
}

async function waitForLatest(page, expected) {
  await page.waitForFunction(
    ({ view, productOutput, noiseSource }) => {
      const latest = window.__aoBenchmark?.latest
      return (
        latest?.renderMode === 'single' &&
        latest.mode === 'vbao' &&
        latest.viewMode === view &&
        latest.denoiseEnabled === productOutput &&
        latest.fullResolutionVbao === true &&
        latest.vbaoNoiseSource === noiseSource &&
        latest.reportIndex > 0
      )
    },
    expected,
    { timeout: 30_000 },
  )
}

function comparisonKey(row) {
  return [row.resolution.width, row.resolution.height, row.view, row.output].join('|')
}

function relativeGreater(value, baseline, tolerance) {
  return value > Math.max(baseline * (1 + tolerance), baseline + 1e-6)
}

function relativeLess(value, baseline, tolerance) {
  return value < Math.min(baseline * (1 - tolerance), baseline - 1e-6)
}

function assignFailureLabels(rows) {
  const baselineByKey = new Map(
    rows
      .filter((row) => row.noiseSource === 'phase-atlas-stable-hash')
      .map((row) => [comparisonKey(row), row]),
  )

  return rows.map((row) => {
    const baseline = baselineByKey.get(comparisonKey(row))
    const labels = new Set()

    if (row.noiseSource === 'phase-atlas-stable-hash' || baseline === undefined) {
      labels.add('noise')
      labels.add('edge-bleed')
    } else {
      if (
        !relativeLess(
          row.qualityMetrics.patternNoiseScore,
          baseline.qualityMetrics.patternNoiseScore,
          0.05,
        )
      ) {
        labels.add('noise')
      }
      if (
        relativeGreater(
          row.qualityMetrics.edgeBleedProxy,
          baseline.qualityMetrics.edgeBleedProxy,
          0.05,
        )
      ) {
        labels.add('edge-bleed')
      }
      if (
        relativeLess(
          row.qualityMetrics.thinGapPreservationProxy,
          baseline.qualityMetrics.thinGapPreservationProxy,
          0.05,
        )
      ) {
        labels.add('thin-gap')
      }
      if (labels.size === 0) labels.add('none')
    }

    return {
      ...row,
      failureLabels: [...labels],
      baselineNoiseSource: baseline?.noiseSource ?? null,
      baselineMedianFrameMs: baseline?.latest?.medianFrameMs ?? null,
      baselinePatternNoiseScore: baseline?.qualityMetrics.patternNoiseScore ?? null,
    }
  })
}

async function writeReport(report) {
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`)

  const lines = []
  lines.push('# VBAO Noise Source Comparison')
  lines.push('')
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push('')
  lines.push(
    'Default remains `phase-atlas-stable-hash`. Candidate rows are benchmark-only and are not public `VBAONodeOptions`.',
  )
  lines.push('')
  lines.push(
    '| Resolution | View | Output | Noise source | Median ms ↓ | p95 ms ↓ | Pattern/noise ↓ | Stripe ↓ | Edge bleed proxy ↓ | Thin-gap proxy ↑ | Failure labels | Screenshot |',
  )
  lines.push('| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |')
  for (const row of report.rows) {
    const metrics = row.qualityMetrics
    lines.push(
      `| ${row.resolution.width}x${row.resolution.height} | ${row.view} | ${row.output} | ${row.noiseSource} | ${row.latest.medianFrameMs.toFixed(3)} | ${row.latest.p95FrameMs.toFixed(3)} | ${metrics.patternNoiseScore.toFixed(5)} | ${metrics.stripeScore.toFixed(5)} | ${metrics.edgeBleedProxy.toFixed(5)} | ${metrics.thinGapPreservationProxy.toFixed(5)} | ${row.failureLabels.join(',')} | ${path.relative(repoRoot, row.screenshotPath).replaceAll(path.sep, '/')} |`,
    )
  }
  lines.push('')
  lines.push('Metric basis:')
  lines.push(
    '- Timing is the Museum route frame sampler (`latest.medianFrameMs` / `latest.p95FrameMs`), not pass-level GPU timestamps.',
  )
  lines.push(
    '- `patternNoiseScore` and `stripeScore` come from cropped screenshot luma high-pass metrics.',
  )
  lines.push(
    '- `edgeBleedProxy` and `thinGapPreservationProxy` are screenshot proxies; they are useful for same-scene ranking, not proof of physical correctness.',
  )
  lines.push(
    '- Candidate labels are relative to `phase-atlas-stable-hash` for the same resolution/view/output.',
  )
  await writeFile(outputMd, `${lines.join('\n')}\n`)
}

await mkdir(screenshotRoot, { recursive: true })
const server = startBenchmarkServer({ externalServer, appRoot, benchmarkPort, baseUrl })
let browser
const rows = []
try {
  await waitForServer({ server, baseUrl })
  browser = await launchBenchmarkBrowser()

  for (const viewport of resolutions) {
    for (const noiseSource of noiseSources) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
      try {
        await page.goto(`${baseUrl}/museum?vbaoNoiseSource=${encodeURIComponent(noiseSource)}`, {
          waitUntil: 'domcontentloaded',
        })
        await waitForBenchmark(page)
        await assertWebGpu(page, { requireWebGpu })
        await setComposeDebug(page, false)
        await setMode(page, 'vbao')
        await setFullResolutionVbao(page, true)

        for (const view of views) {
          for (const productOutput of productStates) {
            await setView(page, view)
            await setDenoise(page, productOutput)
            await resetBenchmark(page)
            await page.waitForTimeout(650)
            await resetBenchmark(page)
            await waitForLatest(page, { view, productOutput, noiseSource })
            const snapshot = await readSnapshot(page)
            const latest = snapshot?.latest
            if (latest === undefined) throw new Error('Missing AO benchmark latest snapshot')
            const output = productOutput ? 'product' : 'raw-debug'
            const label = `${viewport.width}x${viewport.height}-museum-vbao-${view}-${output}-${noiseSource}`
            const screenshotPath = path.join(screenshotRoot, `${label}.png`)
            await page.screenshot({ path: screenshotPath })
            const qualityMetrics = await analyzeScreenshotQuality(page, screenshotPath)

            rows.push({
              label,
              backend: latest.rendererBackend,
              scene: 'museum',
              cameraId: 'museumBaseline',
              resolution: viewport,
              mode: 'vbao',
              view,
              output,
              denoise: productOutput,
              fullResolutionVbao: true,
              noiseSource,
              sampling: latest.vbaoSamplingSchedule,
              qualityMetrics,
              screenshotPath,
              latest,
            })
          }
        }
      } finally {
        await page.close()
      }
    }
  }
} finally {
  await browser?.close()
  server?.child.kill('SIGTERM')
}

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  scene: 'museum',
  cameraId: 'museumBaseline',
  resolutions,
  rows: assignFailureLabels(rows),
}
await writeReport(report)
console.log(
  JSON.stringify({ outputJson, outputMd, screenshotRoot, rows: report.rows.length }, null, 2),
)
