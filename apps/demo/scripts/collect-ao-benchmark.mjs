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
const vbaoDemoSoftnessDefault = 0.2
const vbaoDemoSoftness = (() => {
  const requested = Number(process.env.AO_BENCHMARK_VBAO_SOFTNESS ?? vbaoDemoSoftnessDefault)
  return Number.isFinite(requested)
    ? Math.max(0, Math.min(1, requested))
    : vbaoDemoSoftnessDefault
})()
const vbaoSampleMode = (() => {
  const requested = process.env.AO_BENCHMARK_VBAO_SAMPLE_MODE ?? 'product-preset'
  if (
    requested === 'product-preset' ||
    requested === 'debug-override' ||
    requested === 'spatial-ultra' ||
    requested === 'same-cost-3x10' ||
    requested === 'same-cost-2x16'
  ) {
    return requested
  }
  throw new Error(
    `AO_BENCHMARK_VBAO_SAMPLE_MODE must be "product-preset", "debug-override", "spatial-ultra", "same-cost-3x10", or "same-cost-2x16", received "${requested}".`,
  )
})()
const vbaoTemporalMode = (() => {
  const requested = process.env.AO_BENCHMARK_VBAO_TEMPORAL_MODE ?? 'off'
  if (requested === 'off' || requested === 'host' || requested === 'velocity-internal') {
    return requested
  }
  throw new Error(
    `AO_BENCHMARK_VBAO_TEMPORAL_MODE must be "off", "host", or "velocity-internal"; the rejected camera-only internal temporal prototype remains removed, received "${requested}".`,
  )
})()
const vbaoMotionEvidenceKind = (() => {
  const requested = process.env.AO_BENCHMARK_VBAO_MOTION_EVIDENCE_KIND
  if (
    requested === undefined ||
    requested === 'camera-motion' ||
    requested === 'object-motion' ||
    requested === 'disocclusion'
  ) {
    return requested
  }
  throw new Error(
    `AO_BENCHMARK_VBAO_MOTION_EVIDENCE_KIND must be "camera-motion", "object-motion", or "disocclusion", received "${requested}".`,
  )
})()
const vbaoTemporalResetEvidenceReason = process.env.AO_BENCHMARK_VBAO_TEMPORAL_RESET_REASON
const vbaoHostTaaMode = (() => {
  const requested = process.env.AO_BENCHMARK_VBAO_HOST_TAA ?? 'off'
  if (requested === 'off' || requested === 'traa') return requested
  throw new Error(
    `AO_BENCHMARK_VBAO_HOST_TAA must be "off" or "traa", received "${requested}".`,
  )
})()
const vbaoCleanupMode = (() => {
  const requested = process.env.AO_BENCHMARK_VBAO_CLEANUP_MODE ?? 'on'
  if (requested === 'on' || requested === 'skip') return requested
  throw new Error(
    `AO_BENCHMARK_VBAO_CLEANUP_MODE must be "on" or "skip", received "${requested}".`,
  )
})()
const vbaoComputeCandidateMode = (() => {
  const requested = process.env.AO_BENCHMARK_VBAO_COMPUTE_CANDIDATE ?? 'off'
  if (requested === 'off' || requested === 'sector-confidence-smoke') return requested
  throw new Error(
    `AO_BENCHMARK_VBAO_COMPUTE_CANDIDATE must be "off" or "sector-confidence-smoke", received "${requested}".`,
  )
})()
const vbaoProductReconstructionStages = ['raw', 'cleanup', 'resolve', 'polish', 'final']
const vbaoReconstructionStages =
  process.env.AO_BENCHMARK_VBAO_RECONSTRUCTION_STAGES === '1'
    ? vbaoProductReconstructionStages
    : (process.env.AO_BENCHMARK_VBAO_RECONSTRUCTION_STAGES ?? 'final')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
const validVbaoReconstructionStages = new Set([
  ...vbaoProductReconstructionStages,
  'confidence',
])
for (const stage of vbaoReconstructionStages) {
  if (!validVbaoReconstructionStages.has(stage)) {
    throw new Error(
      `AO_BENCHMARK_VBAO_RECONSTRUCTION_STAGES contains unsupported stage "${stage}".`,
    )
  }
}

function createSceneUrl(scene) {
  const url = new URL(`/${scene}`, baseUrl)
  if (passTimingSampleCount > 0) {
    url.searchParams.set('gpuPassTiming', '1')
  }
  if (vbaoSampleMode !== 'product-preset') {
    url.searchParams.set('vbaoSampleMode', vbaoSampleMode)
  }
  if (vbaoTemporalMode !== 'off') {
    url.searchParams.set('vbaoTemporalMode', vbaoTemporalMode)
  }
  if (vbaoHostTaaMode === 'traa') {
    url.searchParams.set('vbaoHostTaa', 'traa')
  }
  if (vbaoCleanupMode === 'skip') {
    url.searchParams.set('vbaoCleanup', 'skip')
  }
  if (vbaoComputeCandidateMode !== 'off') {
    url.searchParams.set('vbaoComputeCandidate', vbaoComputeCandidateMode)
  }
  if (vbaoDemoSoftness !== vbaoDemoSoftnessDefault) {
    url.searchParams.set('vbaoSoftness', String(vbaoDemoSoftness))
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

async function resetVbaoTemporalEvidence(page, reason) {
  if (reason === undefined || reason.length === 0) return
  await page.evaluate((resetReason) => {
    window.__aoBenchmark?.resetVbaoTemporalEvidence?.(resetReason)
  }, reason)
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
      cleanupMode,
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
          latest.vbaoCleanupMode === undefined ||
          latest.vbaoCleanupMode === cleanupMode) &&
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

function mapAoPassLabel(label, mode) {
  if (label === `AO.PassTiming.${mode.toUpperCase()}`) return 'final'
  if (label === 'GTAONode.AO') return 'ao'
  if (label.startsWith('N8AO.')) return label.slice('N8AO.'.length).toLowerCase()
  if (label === 'VBAO.Raw') return 'raw'
  if (label === 'VBAO.HalfResCleanup') return 'cleanup'
  if (label === 'VBAO.Resolve') return 'resolve'
  if (label === 'VBAO.FullResPolish') return 'polish'
  if (label === 'VBAO.VelocityTemporal') return 'temporal'
  if (label === 'VBAO.VelocityTemporalDiagnostics') return 'diagnostics'
  if (label === 'VBAO.ReceiverConfidence') return 'confidence'
  return undefined
}

async function collectAoGpuPassTimings(page, mode) {
  const samplesByPass = new Map()
  const labelsByPass = new Map()
  const sizesByPass = new Map()
  const uidsByPass = new Map()

  for (let sampleIndex = 0; sampleIndex < passTimingSampleCount; sampleIndex += 1) {
    await page.waitForTimeout(80)
    const rows =
      (await page.evaluate(() => window.__aoBenchmark?.resolveGpuPassTimings?.())) ?? []

    for (const row of rows) {
      const pass = mapAoPassLabel(row.label, mode)
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

function createAoPassTimingRows({ mode, measuredPassTimings }) {
  if (mode === 'vbao') return []

  return measuredPassTimings.map((row) => ({
    pass: row.pass,
    status: 'measured',
    gpuMs: row.gpuMs,
    reason: `Median WebGPU timestamp from ${row.sampleCount} steady-state samples; render target ${row.label} (${row.renderTargetSize}).`,
  }))
}

function createVbaoPassTimingRows({
  mode,
  denoise,
  fullResolutionVbao,
  cleanupMode,
  temporalMode,
  vbaoReconstructionStage,
  measuredPassTimings,
}) {
  if (mode !== 'vbao') return []

  const diagnosticOutput = vbaoReconstructionStage === 'confidence'
  const productOutput = denoise === true
  const lowResolution = fullResolutionVbao === false
  const cleanupEnabled =
    productOutput &&
    !diagnosticOutput &&
    lowResolution &&
    cleanupMode !== 'skip' &&
    vbaoDemoSoftness > 0
  const resolveEnabled = productOutput && !diagnosticOutput && lowResolution
  const temporalEnabled = productOutput && !diagnosticOutput && temporalMode === 'velocity-internal'
  const diagnosticsEnabled = temporalEnabled
  const polishEnabled =
    productOutput &&
    !diagnosticOutput &&
    (lowResolution ? Math.max(0, vbaoDemoSoftness - 0.5) * 2 > 0 : vbaoDemoSoftness > 0)
  const confidenceEnabled = productOutput && (diagnosticOutput || cleanupEnabled || polishEnabled)
  const measuredByPass = new Map(measuredPassTimings.map((row) => [row.pass, row]))
  const enabledByPass = new Map([
    ['raw', !diagnosticOutput],
    ['confidence', confidenceEnabled],
    ['cleanup', cleanupEnabled],
    ['resolve', resolveEnabled],
    ['polish', polishEnabled],
    ['temporal', temporalEnabled],
    ['diagnostics', diagnosticsEnabled],
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
    'confidence',
    'cleanup',
    'resolve',
    'polish',
    'temporal',
    'diagnostics',
  ]
    .filter((pass) => enabledByPass.get(pass) === true)
    .map((pass) => measuredByPass.get(pass)?.gpuMs)
    .filter((value) => value !== undefined)
    .reduce((sum, value) => sum + value, 0)

  return [
    {
      pass: 'raw',
      status: status('raw', enabledByPass.get('raw')),
      gpuMs: gpuMs('raw', enabledByPass.get('raw')),
      reason: reason(
        'raw',
        enabledByPass.get('raw'),
        diagnosticOutput
          ? 'Skipped because the private confidence diagnostic does not sample raw AO.'
          : '',
      ),
    },
    {
      pass: 'confidence',
      status: status('confidence', confidenceEnabled),
      gpuMs: gpuMs('confidence', confidenceEnabled),
      reason: reason(
        'confidence',
        confidenceEnabled,
        diagnosticOutput
          ? 'Expected private receiver-confidence diagnostic did not run.'
          : 'Skipped because this scalar control row does not sample the private receiver-confidence sidecar.',
      ),
    },
    {
      pass: 'cleanup',
      status: status('cleanup', cleanupEnabled),
      gpuMs: gpuMs('cleanup', cleanupEnabled),
      reason: reason(
        'cleanup',
        cleanupEnabled,
        productOutput
          ? cleanupMode === 'skip'
            ? 'Skipped by evidence-only cleanup removal experiment.'
            : 'Skipped for full-resolution output.'
          : 'Skipped for raw debug output.',
      ),
    },
    {
      pass: 'resolve',
      status: status('resolve', enabledByPass.get('resolve')),
      gpuMs: gpuMs('resolve', enabledByPass.get('resolve')),
      reason: reason(
        'resolve',
        enabledByPass.get('resolve'),
        productOutput ? 'Skipped for full-resolution output.' : 'Skipped for raw debug output.',
      ),
    },
    {
      pass: 'polish',
      status: status('polish', enabledByPass.get('polish')),
      gpuMs: gpuMs('polish', enabledByPass.get('polish')),
      reason: reason(
        'polish',
        enabledByPass.get('polish'),
        productOutput
          ? 'Skipped because the configured softness budget does not fund full-resolution polish in this graph.'
          : 'Skipped for raw debug output.',
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
          ? 'Skipped because velocity-backed internal temporal is disabled.'
          : 'Skipped for raw debug output.',
        ),
    },
    {
      pass: 'diagnostics',
      status: status('diagnostics', diagnosticsEnabled),
      gpuMs: gpuMs('diagnostics', diagnosticsEnabled),
      reason: reason(
        'diagnostics',
        diagnosticsEnabled,
        productOutput
          ? 'Skipped because velocity-backed internal temporal diagnostics are disabled.'
          : 'Skipped for raw debug output.',
      ),
    },
    {
      pass: 'total-product',
      status: productOutput && !diagnosticOutput ? 'derived' : 'skipped',
      gpuMs: productOutput && !diagnosticOutput ? totalProductGpuMs : null,
      reason: productOutput
        ? diagnosticOutput
          ? 'Skipped because this row is a private confidence diagnostic, not product AO.'
          : 'Derived sum of measured raw/confidence/cleanup/resolve/polish/temporal/diagnostics pass timestamps emitted for this graph.'
        : 'Skipped for raw debug output.',
    },
    {
      pass: 'total-diagnostic',
      status: productOutput && diagnosticOutput ? 'derived' : 'skipped',
      gpuMs: productOutput && diagnosticOutput ? totalProductGpuMs : null,
      reason:
        productOutput && diagnosticOutput
          ? 'Derived sum of private confidence diagnostic pass timestamps emitted for this graph.'
          : 'Skipped because this row is not the private confidence diagnostic.',
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
                const gateCleanupLabel = vbaoCleanupMode === 'skip' ? '-skip-cleanup' : ''
                const stageRows =
                  mode === 'vbao' && view === 'ao' && denoise && !fullResolutionVbao
                    ? vbaoReconstructionStages
                    : ['final']
                const reconstructionStages = []
                let reconstructionGateBaseRow
                for (const vbaoReconstructionStage of stageRows) {
                  await setComposeDebug(page, false)
                  await setMode(page, scene, mode)
                  await setView(page, scene, view)
                  await setDenoise(page, denoise)
                  await setFullResolutionVbao(page, fullResolutionVbao)
                  await setVbaoReconstructionStage(page, vbaoReconstructionStage)
                  await resetBenchmark(page)
                  await page.waitForTimeout(650)
                  if (mode === 'vbao' && vbaoTemporalMode === 'velocity-internal') {
                    await resetVbaoTemporalEvidence(page, vbaoTemporalResetEvidenceReason)
                    if (vbaoTemporalResetEvidenceReason !== undefined) {
                      await page.waitForTimeout(120)
                    }
                  }
                  await resetBenchmark(page)
                  await waitForLatest(page, {
                    mode,
                    view,
                    denoise,
                    fullResolutionVbao,
                    vbaoReconstructionStage,
                    temporalMode: vbaoTemporalMode,
                    hostTaaMode: vbaoHostTaaMode,
                    cleanupMode: vbaoCleanupMode,
                  })
                  const measuredPassTimings = await collectAoGpuPassTimings(page, mode)
                  const snapshot = await readSnapshot(page)
                  const latest = snapshot?.latest
                  const isVbaoConfidenceDiagnostic =
                    mode === 'vbao' && vbaoReconstructionStage === 'confidence'
                  const outputLabel =
                    isVbaoConfidenceDiagnostic
                      ? 'confidence-diagnostic'
                      : mode === 'vbao'
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
                  const cleanupLabel =
                    mode === 'vbao' && vbaoCleanupMode === 'skip' ? '-skip-cleanup' : ''
                  const softnessLabel =
                    mode === 'vbao' && vbaoDemoSoftness !== vbaoDemoSoftnessDefault
                      ? `-soft${String(Math.round(vbaoDemoSoftness * 100)).padStart(3, '0')}`
                      : ''
                  const label =
                    mode === 'vbao'
                      ? `${viewport.width}x${viewport.height}-${scene}-${mode}-${vbaoSampleMode}${temporalLabel}${hostTaaLabel}${cleanupLabel}${softnessLabel}-${vbaoResolutionLabel}${stageLabel}-${outputLabel}-${view}`
                      : `${viewport.width}x${viewport.height}-${scene}-${mode}-${outputLabel}-${view}`
                  const screenshotPath = path.join(screenshotRoot, `${label}.png`)
                  await page.screenshot({ path: screenshotPath })
                  const qualityMetrics = await analyzeScreenshotQuality(page, screenshotPath)
                  const vbaoBaseProductOutputContract =
                    isVbaoConfidenceDiagnostic
                      ? 'Private VBAOReceiverConfidenceNode diagnostic scalar; not product AO or public API'
                      : vbaoCleanupMode === 'skip' && !fullResolutionVbao
                      ? 'Evidence-only final product AO with half-resolution cleanup skipped before resolve'
                      : 'VBAONode.getTextureNode() final product AO with internal reconstruction/polish'
                  const vbaoProductOutputContract =
                    isVbaoConfidenceDiagnostic
                      ? vbaoBaseProductOutputContract
                      : vbaoTemporalMode === 'velocity-internal'
                      ? `Private VBAOVelocityTemporalNode wrapped ${vbaoBaseProductOutputContract}`
                      : vbaoBaseProductOutputContract
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
                          ? vbaoProductOutputContract
                          : 'VBAONode.getRawTextureNode() raw debug AO'
                        : 'n/a',
                    sampling:
                      mode === 'vbao'
                        ? (latest?.vbaoSamplingSchedule ?? 'phase-atlas-stable-hash')
                        : 'n/a',
                    sampleMode: mode === 'vbao' ? vbaoSampleMode : 'n/a',
                    temporalMode: mode === 'vbao' ? vbaoTemporalMode : 'n/a',
                    hostTaaMode: mode === 'vbao' ? vbaoHostTaaMode : 'n/a',
                    cleanupMode: mode === 'vbao' ? vbaoCleanupMode : 'n/a',
                    vbaoSoftness: mode === 'vbao' ? vbaoDemoSoftness : 0,
                    temporalDiagnostics:
                      mode === 'vbao' ? (latest?.vbaoTemporalDiagnostics ?? null) : null,
                    temporalTargetInventory:
                      mode === 'vbao' ? (latest?.vbaoTemporalTargetInventory ?? null) : null,
                    computeCandidateLabel:
                      mode === 'vbao' ? (latest?.vbaoComputeCandidateLabel ?? 'n/a') : 'n/a',
                    computeCandidateInventory:
                      mode === 'vbao' ? (latest?.vbaoComputeCandidateInventory ?? null) : null,
                    computeCandidateTiming:
                      mode === 'vbao' ? (latest?.vbaoComputeCandidateTiming ?? null) : null,
                    temporalResetEvidenceReason:
                      mode === 'vbao' &&
                      vbaoTemporalMode === 'velocity-internal' &&
                      vbaoTemporalResetEvidenceReason !== undefined
                        ? vbaoTemporalResetEvidenceReason
                        : 'n/a',
                    motionEvidenceKind:
                      mode === 'vbao' &&
                      vbaoTemporalMode === 'velocity-internal' &&
                      denoise &&
                      vbaoMotionEvidenceKind !== undefined
                        ? vbaoMotionEvidenceKind
                        : 'n/a',
                    motionEvidenceSource:
                      mode === 'vbao' &&
                      vbaoTemporalMode === 'velocity-internal' &&
                      denoise &&
                      vbaoMotionEvidenceKind !== undefined
                        ? 'ao-benchmark-motion'
                        : 'n/a',
                    passTimings:
                      mode === 'vbao'
                        ? [
                            ...createVbaoPassTimingRows({
                              mode,
                              denoise,
                              fullResolutionVbao,
                              cleanupMode: vbaoCleanupMode,
                              temporalMode: vbaoTemporalMode,
                              vbaoReconstructionStage,
                              measuredPassTimings,
                            }),
                            ...(latest?.vbaoComputeCandidateTiming === null ||
                            latest?.vbaoComputeCandidateTiming === undefined
                              ? []
                              : [
                                  {
                                    pass: latest.vbaoComputeCandidateTiming.pass,
                                    status: latest.vbaoComputeCandidateTiming.status,
                                    gpuMs: null,
                                    cpuMs: latest.vbaoComputeCandidateTiming.cpuMs,
                                    reason: latest.vbaoComputeCandidateTiming.reason,
                                  },
                                ]),
                          ]
                        : createAoPassTimingRows({ mode, measuredPassTimings }),
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
                  const missingFinalTiming =
                    mode !== 'vbao' &&
                    mode !== 'off' &&
                    vbaoReconstructionStage === 'final' &&
                    !row.passTimings.some((passTiming) => passTiming.pass === 'final')
                  if (missingFinalTiming) {
                    throw new Error(`Missing final WebGPU pass timestamp for ${label}`)
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
                  if (vbaoReconstructionStage === 'final') {
                    reconstructionGateBaseRow = {
                      ...row,
                      failureLabels,
                    }
                  }
                }
                const hasProductReconstructionStage = reconstructionStages.some((stage) =>
                  vbaoProductReconstructionStages.includes(stage.stage),
                )
                if (hasProductReconstructionStage) {
                  rows.push({
                    ...(reconstructionGateBaseRow ?? rows[rows.length - 1]),
                    label: `${viewport.width}x${viewport.height}-${scene}-${mode}-${vbaoSampleMode}-${vbaoTemporalMode}${gateCleanupLabel}${vbaoDemoSoftness === vbaoDemoSoftnessDefault ? '' : `-soft${String(Math.round(vbaoDemoSoftness * 100)).padStart(3, '0')}`}-half-res-reconstruction-gate-product-ao`,
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
