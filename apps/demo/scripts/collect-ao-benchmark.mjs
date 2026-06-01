#!/usr/bin/env node
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertWebGpu,
  launchBenchmarkBrowser,
  startBenchmarkServer,
  waitForBenchmark,
  waitForServer,
} from './profiling/benchmarkHarness.mjs'
import {
  classifyFailureLabels,
  createReferenceGateStatusRows,
  writeProductionQualityReports,
} from './profiling/productionReport.mjs'
import { analyzeScreenshotQuality } from './profiling/screenshotMetrics.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(scriptDir, '../../..')
const artifactRoot = path.join(repoRoot, 'artifacts', 'benchmarks')
const resolveRepoOutputPath = (value, fallback) =>
  value === undefined ? fallback : path.isAbsolute(value) ? value : path.join(repoRoot, value)
const screenshotRoot =
  resolveRepoOutputPath(
    process.env.AO_BENCHMARK_SCREENSHOT_ROOT,
    path.join(artifactRoot, 'screenshots-ao-production'),
  )
const outputJson =
  resolveRepoOutputPath(
    process.env.AO_BENCHMARK_OUTPUT_JSON,
    path.join(artifactRoot, 'ao-production-latest.json'),
  )
const outputMd =
  resolveRepoOutputPath(
    process.env.AO_BENCHMARK_OUTPUT_MD,
    path.join(artifactRoot, 'ao-production-quality-summary.md'),
  )
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
const scenes = (process.env.AO_BENCHMARK_SCENES ?? 'museum')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
const requireWebGpu = process.env.AO_BENCHMARK_REQUIRE_WEBGPU !== '0'
const passTimingSampleCount = Number(process.env.AO_BENCHMARK_PASS_TIMING_SAMPLES ?? 10)
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

function parseCsvEnv(name, fallback) {
  return (process.env[name] ?? fallback.join(','))
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

const modes = parseCsvEnv('AO_BENCHMARK_MODES', ['off', 'gtao', 'ssao', 'vbao', 'n8ao'])
const views = parseCsvEnv('AO_BENCHMARK_VIEWS', ['beauty', 'ao'])
const denoiseStates = parseCsvEnv('AO_BENCHMARK_DENOISE_STATES', ['false', 'true']).map(
  (value) => {
    if (value === 'true') return true
    if (value === 'false') return false
    throw new Error(`AO_BENCHMARK_DENOISE_STATES contains unsupported value "${value}".`)
  },
)
const vbaoResolutionStates = parseCsvEnv('AO_BENCHMARK_VBAO_RESOLUTION_STATES', [
  'half',
  'full',
]).map((value) => {
  if (value === 'full' || value === 'true') return true
  if (value === 'half' || value === 'false') return false
  throw new Error(`AO_BENCHMARK_VBAO_RESOLUTION_STATES contains unsupported value "${value}".`)
})
const validModes = new Set(['off', 'gtao', 'ssao', 'vbao', 'n8ao'])
const validViews = new Set(['beauty', 'ao'])
for (const mode of modes) {
  if (!validModes.has(mode)) throw new Error(`AO_BENCHMARK_MODES contains "${mode}".`)
}
for (const view of views) {
  if (!validViews.has(view)) throw new Error(`AO_BENCHMARK_VIEWS contains "${view}".`)
}
const vbaoDemoSoftness = 0.45
const vbaoSampleMode = (() => {
  const requested = process.env.AO_BENCHMARK_VBAO_SAMPLE_MODE ?? 'product-preset'
  if (
    requested === 'product-preset' ||
    requested === 'debug-override' ||
    requested === 'spatial-ultra'
  ) {
    return requested
  }
  throw new Error(
    `AO_BENCHMARK_VBAO_SAMPLE_MODE must be "product-preset", "debug-override", or "spatial-ultra", received "${requested}".`,
  )
})()
const vbaoTemporalMode = (() => {
  const requested = process.env.AO_BENCHMARK_VBAO_TEMPORAL_MODE ?? 'off'
  if (requested === 'off' || requested === 'host' || requested === 'internal') return requested
  throw new Error(
    `AO_BENCHMARK_VBAO_TEMPORAL_MODE must be "off", "host", or "internal", received "${requested}".`,
  )
})()
const vbaoHostTaaMode = (() => {
  const requested = process.env.AO_BENCHMARK_VBAO_HOST_TAA ?? 'off'
  if (requested === 'off' || requested === 'traa') return requested
  throw new Error(
    `AO_BENCHMARK_VBAO_HOST_TAA must be "off" or "traa", received "${requested}".`,
  )
})()
const vbaoReconstructionStages =
  process.env.AO_BENCHMARK_VBAO_RECONSTRUCTION_STAGES === '1'
    ? ['raw', 'cleanup', 'resolve', 'polish', 'final']
    : (process.env.AO_BENCHMARK_VBAO_RECONSTRUCTION_STAGES ?? 'final')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
const validVbaoReconstructionStages = new Set(['raw', 'cleanup', 'resolve', 'polish', 'final'])
for (const stage of vbaoReconstructionStages) {
  if (!validVbaoReconstructionStages.has(stage)) {
    throw new Error(
      `AO_BENCHMARK_VBAO_RECONSTRUCTION_STAGES contains unsupported stage "${stage}".`,
    )
  }
}

function createSceneUrl(scene) {
  const url = new URL(`/${scene}`, baseUrl)
  if (vbaoSampleMode !== 'product-preset') {
    url.searchParams.set('vbaoSampleMode', vbaoSampleMode)
  }
  if (vbaoTemporalMode !== 'off') {
    url.searchParams.set('vbaoTemporalMode', vbaoTemporalMode)
  }
  if (vbaoHostTaaMode === 'traa') {
    url.searchParams.set('vbaoHostTaa', 'traa')
  }
  return url.toString()
}

async function setMode(page, scene, mode) {
  await page.evaluate(
    ({ activeScene, nextMode }) => {
      const selector =
        activeScene === 'lab' ? `button[data-ao="${nextMode}"]` : `button[data-mode="${nextMode}"]`
      document.querySelector(selector)?.click()
    },
    { activeScene: scene, nextMode: mode },
  )
}

async function setView(page, scene, view) {
  await page.evaluate(
    ({ activeScene, nextView }) => {
      const selectorView = activeScene === 'lab' && nextView === 'beauty' ? 'combined' : nextView
      document.querySelector(`button[data-view="${selectorView}"]`)?.click()
    },
    { activeScene: scene, nextView: view },
  )
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

async function setVbaoReconstructionStage(page, stage) {
  await page.evaluate((nextStage) => {
    window.__aoBenchmark?.setVbaoReconstructionStage?.(nextStage)
  }, stage)
}

async function readSnapshot(page) {
  return page.evaluate(() => window.__aoBenchmark?.snapshot())
}

async function resetBenchmark(page) {
  await page.evaluate(() => window.__aoBenchmark?.reset())
}

async function waitForLatest(page, expected) {
  await page.waitForFunction(
    ({
      mode,
      view,
      denoise,
      fullResolutionVbao,
      vbaoReconstructionStage,
      temporalMode,
      hostTaaMode,
    }) => {
      const latest = window.__aoBenchmark?.latest
      return (
        latest?.renderMode === 'single' &&
        latest.mode === mode &&
        latest.viewMode === view &&
        latest.denoiseEnabled === denoise &&
        latest.fullResolutionVbao === fullResolutionVbao &&
        (mode !== 'vbao' ||
          latest.vbaoTemporalMode === undefined ||
          latest.vbaoTemporalMode === temporalMode) &&
        (mode !== 'vbao' ||
          latest.vbaoHostTaaMode === undefined ||
          latest.vbaoHostTaaMode === hostTaaMode) &&
        (mode !== 'vbao' ||
          latest.vbaoReconstructionStage === undefined ||
          latest.vbaoReconstructionStage === vbaoReconstructionStage) &&
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

function isHalfResolutionStageRow(row) {
  return (
    row.mode === 'vbao' &&
    row.view === 'ao' &&
    row.denoise === true &&
    row.fullResolutionVbao === false &&
    row.vbaoReconstructionStage !== 'n/a'
  )
}

function median(values) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function mapVbaoPassLabel(label) {
  if (label === 'VBAO.Raw') return 'raw'
  if (label === 'VBAO.HalfResCleanup') return 'cleanup'
  if (label === 'VBAO.Resolve') return 'resolve'
  if (label === 'VBAO.TemporalAccumulation') return 'temporal'
  if (label === 'VBAO.TemporalPreviousDepth') return 'temporal-depth'
  if (label === 'VBAO.TemporalPreviousNormal') return 'temporal-normal'
  if (label === 'VBAO.FullResPolish') return 'polish'
  return undefined
}

async function collectVbaoGpuPassTimings(page, mode) {
  if (mode !== 'vbao') return []

  const samplesByPass = new Map()
  const labelsByPass = new Map()
  const sizesByPass = new Map()
  const uidsByPass = new Map()

  for (let sampleIndex = 0; sampleIndex < passTimingSampleCount; sampleIndex += 1) {
    await page.waitForTimeout(80)
    const rows =
      (await page.evaluate(() => window.__aoBenchmark?.resolveGpuPassTimings?.())) ?? []

    for (const row of rows) {
      const pass = mapVbaoPassLabel(row.label)
      if (pass === undefined) continue
      const samples = samplesByPass.get(pass) ?? []
      samples.push(row.gpuMs)
      samplesByPass.set(pass, samples)
      labelsByPass.set(pass, row.label)
      sizesByPass.set(pass, `${row.width}x${row.height}`)
      uidsByPass.set(pass, row.uid)
    }
  }

  return Array.from(samplesByPass.entries()).map(([pass, samples]) => ({
    pass,
    label: labelsByPass.get(pass) ?? 'unknown',
    renderTargetSize: sizesByPass.get(pass) ?? 'unknown',
    uid: uidsByPass.get(pass) ?? 'unknown',
    gpuMs: median(samples),
    sampleCount: samples.length,
    samples,
  }))
}

function createVbaoPassTimingRows({ mode, denoise, fullResolutionVbao, measuredPassTimings }) {
  if (mode !== 'vbao') return []

  const productOutput = denoise === true
  const lowResolution = fullResolutionVbao === false
  const cleanupEnabled = productOutput && lowResolution && vbaoDemoSoftness > 0
  const resolveEnabled = productOutput && lowResolution
  const temporalEnabled = productOutput && vbaoTemporalMode === 'internal'
  const temporalGuideEnabled = temporalEnabled
  const polishEnabled =
    productOutput &&
    (lowResolution ? Math.max(0, vbaoDemoSoftness - 0.5) * 2 > 0 : vbaoDemoSoftness > 0)
  const measuredByPass = new Map(measuredPassTimings.map((row) => [row.pass, row]))
  const enabledByPass = new Map([
    ['raw', true],
    ['cleanup', cleanupEnabled],
    ['resolve', resolveEnabled],
    ['temporal', temporalEnabled],
    ['temporal-depth', temporalGuideEnabled],
    ['temporal-normal', temporalGuideEnabled],
    ['polish', polishEnabled],
  ])
  const status = (pass, enabled) => {
    if (!enabled) return measuredByPass.has(pass) ? 'unexpected' : 'skipped'
    return measuredByPass.has(pass) ? 'measured' : 'missing'
  }
  const gpuMs = (pass, enabled) => (enabled ? (measuredByPass.get(pass)?.gpuMs ?? null) : null)
  const reason = (pass, enabled, skippedReason) => {
    const row = measuredByPass.get(pass)
    if (!enabled) {
      if (row !== undefined) {
        return `Unexpected WebGPU timestamp from disabled pass ${row.label} (${row.renderTargetSize}).`
      }
      return skippedReason
    }
    if (row !== undefined) {
      return `Median WebGPU timestamp from ${row.sampleCount} steady-state samples; render target ${row.label} (${row.renderTargetSize}).`
    }
    return 'Expected pass did not emit a WebGPU timestamp for this graph.'
  }
  const totalProductGpuMs = [
    'raw',
    'cleanup',
    'resolve',
    'temporal',
    'temporal-depth',
    'temporal-normal',
    'polish',
  ]
    .filter((pass) => enabledByPass.get(pass) === true)
    .map((pass) => measuredByPass.get(pass)?.gpuMs)
    .filter((value) => value !== undefined)
    .reduce((sum, value) => sum + value, 0)

  return [
    {
      pass: 'raw',
      status: status('raw', true),
      gpuMs: gpuMs('raw', true),
      reason: reason('raw', true, ''),
    },
    {
      pass: 'cleanup',
      status: status('cleanup', cleanupEnabled),
      gpuMs: gpuMs('cleanup', cleanupEnabled),
      reason: reason(
        'cleanup',
        cleanupEnabled,
        productOutput ? 'Skipped for full-resolution output.' : 'Skipped for raw debug output.',
      ),
    },
    {
      pass: 'resolve',
      status: status('resolve', resolveEnabled),
      gpuMs: gpuMs('resolve', resolveEnabled),
      reason: reason(
        'resolve',
        resolveEnabled,
        productOutput ? 'Skipped for full-resolution output.' : 'Skipped for raw debug output.',
      ),
    },
    {
      pass: 'temporal',
      status: status('temporal', temporalEnabled),
      gpuMs: gpuMs('temporal', temporalEnabled),
      reason: reason(
        'temporal',
        temporalEnabled,
        productOutput
          ? 'Skipped because VBAO temporal mode is not internal.'
          : 'Skipped for raw debug output.',
        ),
    },
    {
      pass: 'temporal-depth',
      status: status('temporal-depth', temporalGuideEnabled),
      gpuMs: gpuMs('temporal-depth', temporalGuideEnabled),
      reason: reason(
        'temporal-depth',
        temporalGuideEnabled,
        productOutput
          ? 'Skipped because VBAO temporal mode is not internal.'
          : 'Skipped for raw debug output.',
      ),
    },
    {
      pass: 'temporal-normal',
      status: status('temporal-normal', temporalGuideEnabled),
      gpuMs: gpuMs('temporal-normal', temporalGuideEnabled),
      reason: reason(
        'temporal-normal',
        temporalGuideEnabled,
        productOutput
          ? 'Skipped because VBAO temporal mode is not internal.'
          : 'Skipped for raw debug output.',
      ),
    },
    {
      pass: 'polish',
      status: status('polish', polishEnabled),
      gpuMs: gpuMs('polish', polishEnabled),
      reason: reason(
        'polish',
        polishEnabled,
        productOutput
          ? 'Skipped because the configured softness budget does not fund full-resolution polish in this graph.'
          : 'Skipped for raw debug output.',
      ),
    },
    {
      pass: 'total-product',
      status: productOutput ? 'derived' : 'skipped',
      gpuMs: productOutput ? totalProductGpuMs : null,
      reason: productOutput
        ? 'Derived sum of measured raw/cleanup/resolve/temporal guide/polish pass timestamps emitted for this graph.'
        : 'Skipped for raw debug output.',
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

  for (const scene of scenes) {
    for (const viewport of resolutions) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
      try {
        await page.goto(createSceneUrl(scene), { waitUntil: 'domcontentloaded' })
        await waitForBenchmark(page)
        await assertWebGpu(page, { requireWebGpu })

        const sceneModes = scene === 'lab' ? ['vbao'] : modes
        const sceneDenoiseStates = denoiseStates
        const sceneVbaoResolutionStates = scene === 'lab' ? [true] : vbaoResolutionStates

        for (const mode of sceneModes) {
          for (const view of views) {
            for (const denoise of sceneDenoiseStates) {
              if (shouldSkip(mode, denoise)) continue
              const fullResolutionModes = mode === 'vbao' ? sceneVbaoResolutionStates : [true]
              for (const fullResolutionVbao of fullResolutionModes) {
                const stageRows =
                  mode === 'vbao' && view === 'ao' && denoise && !fullResolutionVbao
                    ? vbaoReconstructionStages
                    : ['final']
                const reconstructionStages = []
                for (const vbaoReconstructionStage of stageRows) {
                  await setComposeDebug(page, false)
                  await setMode(page, scene, mode)
                  await setView(page, scene, view)
                  await setDenoise(page, denoise)
                  await setFullResolutionVbao(page, fullResolutionVbao)
                  await setVbaoReconstructionStage(page, vbaoReconstructionStage)
                  await resetBenchmark(page)
                  await page.waitForTimeout(650)
                  await resetBenchmark(page)
                  await waitForLatest(page, {
                    mode,
                    view,
                    denoise,
                    fullResolutionVbao,
                    vbaoReconstructionStage,
                    temporalMode: vbaoTemporalMode,
                    hostTaaMode: vbaoHostTaaMode,
                  })
                  const measuredPassTimings = await collectVbaoGpuPassTimings(page, mode)
                  const snapshot = await readSnapshot(page)
                  const latest = snapshot?.latest
                  const outputLabel =
                    mode === 'vbao'
                      ? denoise
                        ? 'product'
                        : 'raw-debug'
                      : denoise
                        ? 'denoised'
                        : 'raw'
                  const vbaoResolutionLabel =
                    mode === 'vbao' ? (fullResolutionVbao ? 'full-res' : 'half-res') : 'n/a'
                  const stageLabel =
                    mode === 'vbao' && !fullResolutionVbao && denoise
                      ? `-${vbaoReconstructionStage}`
                      : ''
                  const temporalLabel = mode === 'vbao' ? `-${vbaoTemporalMode}` : ''
                  const hostTaaLabel =
                    mode === 'vbao' && vbaoHostTaaMode !== 'off' ? `-${vbaoHostTaaMode}` : ''
                  const label =
                    mode === 'vbao'
                      ? `${viewport.width}x${viewport.height}-${scene}-${mode}-${vbaoSampleMode}${temporalLabel}${hostTaaLabel}-${vbaoResolutionLabel}${stageLabel}-${outputLabel}-${view}`
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
                    vbaoReconstructionStage:
                      mode === 'vbao' ? (latest?.vbaoReconstructionStage ?? 'final') : 'n/a',
                    productOutputContract:
                      mode === 'vbao'
                        ? denoise
                          ? 'VBAONode.getTextureNode() final product AO with internal reconstruction/polish'
                          : 'VBAONode.getRawTextureNode() raw debug AO'
                        : 'n/a',
                    sampling:
                      mode === 'vbao'
                        ? (latest?.vbaoSamplingSchedule ?? 'phase-atlas-stable-hash')
                        : 'n/a',
                    sampleMode: mode === 'vbao' ? vbaoSampleMode : 'n/a',
                    temporalMode: mode === 'vbao' ? vbaoTemporalMode : 'n/a',
                    hostTaaMode: mode === 'vbao' ? vbaoHostTaaMode : 'n/a',
                    temporalDiagnostics:
                      mode === 'vbao' ? (latest?.vbaoTemporalDiagnostics ?? null) : null,
                    passTimings: createVbaoPassTimingRows({
                      mode,
                      denoise,
                      fullResolutionVbao,
                      measuredPassTimings,
                    }),
                    qualityMetrics,
                    screenshotPath,
                    latest,
                  }
                  const missingPasses =
                    vbaoReconstructionStage === 'final'
                      ? row.passTimings.filter((passTiming) =>
                          ['missing', 'unexpected'].includes(passTiming.status),
                        )
                      : []
                  if (missingPasses.length > 0) {
                    throw new Error(
                      `Invalid WebGPU pass timestamp status for ${label}: ${missingPasses
                        .map((passTiming) => passTiming.pass)
                        .join(', ')}`,
                    )
                  }
                  const failureLabels = classifyFailureLabels(row)
                  if (isHalfResolutionStageRow(row)) {
                    reconstructionStages.push({
                      stage: vbaoReconstructionStage,
                      failureLabels,
                      screenshotPath,
                      qualityMetrics,
                    })
                  }
                  rows.push({
                    ...row,
                    failureLabels,
                  })
                }
                if (reconstructionStages.length > 0) {
                  rows.push({
                    ...rows[rows.length - 1],
                    label: `${viewport.width}x${viewport.height}-${scene}-${mode}-${vbaoSampleMode}-${vbaoTemporalMode}-half-res-reconstruction-gate-product-ao`,
                    reconstructionStages,
                  })
                }
              }
            }
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
  scenes,
  resolutions,
  passTimingSampleCount,
  note: 'Production-only local capture. This is not a formal EVIDENCE.md claim unless copied into EVIDENCE.md with timings review.',
  referenceGate: {
    basis:
      'Product AO rows must provide fixture observations before they can be compared against the ray-cast and canonical reports.',
    productRows: createReferenceGateStatusRows(rows),
  },
  rows,
}
await writeProductionQualityReports({ outputJson, outputMd, report })
console.log(JSON.stringify({ outputJson, outputMd, screenshotRoot, rows: rows.length }, null, 2))
