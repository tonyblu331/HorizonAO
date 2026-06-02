#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '../../..')
const artifactRoot = path.join(repoRoot, 'artifacts', 'benchmarks')

const offJsonPath = resolveRepoPath(
  process.env.VBAO_TEMPORAL_OFF_JSON,
  path.join(artifactRoot, 'vbao-temporal-off-latest.json'),
)
const hostJsonPath = resolveRepoPath(
  process.env.VBAO_TEMPORAL_HOST_JSON,
  path.join(artifactRoot, 'vbao-temporal-host-latest.json'),
)
const hostTaaJsonPath = resolveRepoPath(
  process.env.VBAO_TEMPORAL_HOST_TAA_JSON,
  path.join(artifactRoot, 'vbao-temporal-host-traa-latest.json'),
)
const velocityJsonPath = resolveRepoPath(
  process.env.VBAO_TEMPORAL_VELOCITY_JSON,
  path.join(artifactRoot, 'vbao-temporal-velocity-internal-latest.json'),
)
const alternativeJsonPath = resolveRepoPath(
  process.env.VBAO_TEMPORAL_ALTERNATIVE_JSON,
  path.join(artifactRoot, 'vbao-temporal-spatial-ultra-latest.json'),
)
const outputJsonPath = resolveRepoPath(
  process.env.VBAO_TEMPORAL_GATE_JSON,
  path.join(artifactRoot, 'vbao-temporal-gate-verdict.json'),
)
const outputMdPath = resolveRepoPath(
  process.env.VBAO_TEMPORAL_GATE_MD,
  path.join(artifactRoot, 'vbao-temporal-gate-verdict.md'),
)

const MATERIAL_PATTERN_WIN = 0.0005
const STRIPE_REGRESSION_TOLERANCE = 0.0003
const EDGE_REGRESSION_TOLERANCE = 0.0003
const THIN_GAP_REGRESSION_TOLERANCE = 0.0003
const BLOCKING_FAILURE_LABELS = new Set([
  'ghosting',
  'disocclusion',
  'mud',
  'halo',
  'edge-bleed',
  'thin-gap',
])
const requireCandidate = process.env.VBAO_TEMPORAL_REQUIRE_CANDIDATE === '1'

function resolveRepoPath(value, fallback) {
  if (value === undefined) return fallback
  return path.isAbsolute(value) ? value : path.join(repoRoot, value)
}

async function readReport(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

async function readOptionalReport(filePath) {
  try {
    await access(filePath)
    return await readReport(filePath)
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'ENOENT') return undefined
    throw err
  }
}

function outputName(row) {
  if (row.mode === 'vbao') return row.denoise ? 'product' : 'raw-debug'
  return row.denoise ? 'denoised' : 'raw'
}

function comparisonKey(row) {
  return [
    row.scene,
    `${row.resolution?.width}x${row.resolution?.height}`,
    row.mode,
    row.sampleMode,
    row.vbaoResolution,
    row.view,
    outputName(row),
  ].join('|')
}

function alternativeComparisonKey(row) {
  return [
    row.scene,
    `${row.resolution?.width}x${row.resolution?.height}`,
    row.mode,
    row.vbaoResolution,
    row.view,
    outputName(row),
  ].join('|')
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function resolveEvidencePath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(repoRoot, filePath)
}

async function createExistingScreenshotPathSet(reports) {
  const paths = new Set()
  const candidates = reports
    .flatMap((report) => report?.rows ?? [])
    .map((row) => row.screenshotPath)
    .filter((filePath) => typeof filePath === 'string' && filePath.length > 0)

  await Promise.all(
    [...new Set(candidates)].map(async (filePath) => {
      try {
        await access(resolveEvidencePath(filePath))
        paths.add(filePath)
      } catch (err) {
        if (err instanceof Error && 'code' in err && err.code === 'ENOENT') return
        throw err
      }
    }),
  )

  return paths
}

function qualityMetricsComplete(row) {
  return (
    finiteNumber(row.qualityMetrics?.patternNoiseScore) &&
    finiteNumber(row.qualityMetrics?.stripeScore) &&
    finiteNumber(row.qualityMetrics?.edgeBleedProxy) &&
    finiteNumber(row.qualityMetrics?.thinGapPreservationProxy)
  )
}

function passTimingComplete(row) {
  if (!Array.isArray(row.passTimings) || row.passTimings.length === 0) return false
  if (row.passTimings.some((pass) => ['missing', 'unexpected'].includes(pass.status))) {
    return false
  }

  const rawPass = row.passTimings.find((pass) => pass.pass === 'raw')
  if (rawPass?.status !== 'measured' || !finiteNumber(rawPass.gpuMs)) return false

  if (outputName(row) !== 'product') return true

  const totalProductPass = row.passTimings.find((pass) => pass.pass === 'total-product')
  return (
    totalProductPass !== undefined &&
    ['derived', 'measured'].includes(totalProductPass.status) &&
    finiteNumber(totalProductPass.gpuMs)
  )
}

function hasBlockingFailureLabels(row) {
  return (row.failureLabels ?? []).some((label) => BLOCKING_FAILURE_LABELS.has(label))
}

let existingScreenshotPaths = new Set()

function evidenceComplete(row) {
  if (typeof row.screenshotPath !== 'string' || row.screenshotPath.length === 0) return false
  if (!existingScreenshotPaths.has(row.screenshotPath)) return false
  if (!finiteNumber(row.latest?.medianFrameMs)) return false
  if (!finiteNumber(row.latest?.p95FrameMs)) return false
  if (!qualityMetricsComplete(row)) return false
  return passTimingComplete(row)
}

function totalProductGpuMs(row) {
  return row.passTimings?.find((pass) => pass.pass === 'total-product')?.gpuMs ?? null
}

function compareRows(offRow, hostRow) {
  const patternDelta =
    hostRow.qualityMetrics.patternNoiseScore - offRow.qualityMetrics.patternNoiseScore
  const stripeDelta = hostRow.qualityMetrics.stripeScore - offRow.qualityMetrics.stripeScore
  const edgeDelta = hostRow.qualityMetrics.edgeBleedProxy - offRow.qualityMetrics.edgeBleedProxy
  const thinGapDelta =
    hostRow.qualityMetrics.thinGapPreservationProxy -
    offRow.qualityMetrics.thinGapPreservationProxy

  return {
    key: comparisonKey(offRow),
    scene: offRow.scene,
    resolution: offRow.resolution,
    view: offRow.view,
    output: outputName(offRow),
    off: {
      patternNoiseScore: offRow.qualityMetrics.patternNoiseScore,
      stripeScore: offRow.qualityMetrics.stripeScore,
      edgeBleedProxy: offRow.qualityMetrics.edgeBleedProxy,
      thinGapPreservationProxy: offRow.qualityMetrics.thinGapPreservationProxy,
      totalProductGpuMs: totalProductGpuMs(offRow),
      screenshotPath: offRow.screenshotPath,
    },
    host: {
      patternNoiseScore: hostRow.qualityMetrics.patternNoiseScore,
      stripeScore: hostRow.qualityMetrics.stripeScore,
      edgeBleedProxy: hostRow.qualityMetrics.edgeBleedProxy,
      thinGapPreservationProxy: hostRow.qualityMetrics.thinGapPreservationProxy,
      totalProductGpuMs: totalProductGpuMs(hostRow),
      screenshotPath: hostRow.screenshotPath,
    },
    delta: {
      patternNoiseScore: patternDelta,
      stripeScore: stripeDelta,
      edgeBleedProxy: edgeDelta,
      thinGapPreservationProxy: thinGapDelta,
    },
    materialPatternWin: patternDelta <= -MATERIAL_PATTERN_WIN,
    stripeRegression: stripeDelta > STRIPE_REGRESSION_TOLERANCE,
    edgeRegression: edgeDelta > EDGE_REGRESSION_TOLERANCE,
    thinGapRegression: thinGapDelta > THIN_GAP_REGRESSION_TOLERANCE,
    evidenceComplete: evidenceComplete(offRow) && evidenceComplete(hostRow),
  }
}

const offReport = await readReport(offJsonPath)
const hostReport = await readReport(hostJsonPath)
const hostTaaReport = await readOptionalReport(hostTaaJsonPath)
const velocityReport = await readOptionalReport(velocityJsonPath)
const alternativeReport = await readOptionalReport(alternativeJsonPath)
existingScreenshotPaths = await createExistingScreenshotPathSet([
  offReport,
  hostReport,
  hostTaaReport,
  velocityReport,
  alternativeReport,
])
const offRows = offReport.rows.filter((row) => row.mode === 'vbao' && row.temporalMode === 'off')
const hostRows = hostReport.rows.filter((row) => row.mode === 'vbao' && row.temporalMode === 'host')
const hostTaaRows =
  hostTaaReport?.rows.filter(
    (row) =>
      row.mode === 'vbao' &&
      row.temporalMode === 'host' &&
      (row.hostTaaMode === 'traa' || row.latest?.vbaoHostTaaMode === 'traa'),
  ) ?? []
const velocityRows =
  velocityReport?.rows.filter(
    (row) => row.mode === 'vbao' && row.temporalMode === 'velocity-internal',
  ) ?? []
const alternativeRows =
  alternativeReport?.rows.filter(
    (row) => row.mode === 'vbao' && row.temporalMode === 'off' && row.sampleMode !== 'product-preset',
  ) ?? []
const hostByKey = new Map(hostRows.map((row) => [comparisonKey(row), row]))
const hostTaaByKey = new Map(hostTaaRows.map((row) => [comparisonKey(row), row]))
const velocityByKey = new Map(velocityRows.map((row) => [comparisonKey(row), row]))
const alternativeByKey = new Map(alternativeRows.map((row) => [alternativeComparisonKey(row), row]))
const comparisons = offRows
  .map((offRow) => {
    const hostRow = hostByKey.get(comparisonKey(offRow))
    return hostRow === undefined ? undefined : compareRows(offRow, hostRow)
  })
  .filter(Boolean)

const missingHostRows = offRows
  .filter((row) => !hostByKey.has(comparisonKey(row)))
  .map((row) => comparisonKey(row))
const productOffRows = offRows.filter((row) => outputName(row) === 'product')
const missingHostTaaRows = productOffRows
  .filter((row) => !hostTaaByKey.has(comparisonKey(row)))
  .map((row) => comparisonKey(row))
const hostEvidenceComplete =
  missingHostRows.length === 0 && comparisons.every((row) => row.evidenceComplete)
const productComparisons = comparisons.filter((row) => row.output === 'product')
const hostTaaComparisons = productOffRows
  .map((offRow) => {
    const hostTaaRow = hostTaaByKey.get(comparisonKey(offRow))
    return hostTaaRow === undefined ? undefined : compareRows(offRow, hostTaaRow)
  })
  .filter(Boolean)
const hostTaaEvidence =
  productOffRows.length > 0 &&
  missingHostTaaRows.length === 0 &&
  hostTaaComparisons.every((row) => row.evidenceComplete)
const hasHostTaaMaterialPatternWin = hostTaaComparisons.some((row) => row.materialPatternWin)
const hasHostTaaStripeRegression = hostTaaComparisons.some((row) => row.stripeRegression)
const hasHostTaaBlockingFailureLabels = hostTaaRows.some(hasBlockingFailureLabels)
const velocityComparisons = productOffRows
  .map((offRow) => {
    const velocityRow = velocityByKey.get(comparisonKey(offRow))
    return velocityRow === undefined ? undefined : compareRows(offRow, velocityRow)
  })
  .filter(Boolean)
const velocityTemporalEvidence =
  productOffRows.length > 0 &&
  velocityRows.length > 0 &&
  productOffRows.every((row) => velocityByKey.has(comparisonKey(row))) &&
  velocityComparisons.every((row) => row.evidenceComplete)
const hasVelocityMaterialPatternWin = velocityComparisons.some((row) => row.materialPatternWin)
const hasVelocityStripeRegression = velocityComparisons.some((row) => row.stripeRegression)
const hasVelocityEdgeRegression = velocityComparisons.some((row) => row.edgeRegression)
const hasVelocityThinGapRegression = velocityComparisons.some((row) => row.thinGapRegression)
const hasVelocityBlockingFailureLabels = velocityRows.some(hasBlockingFailureLabels)
const alternativeComparisons = productOffRows
  .map((offRow) => {
    const alternativeRow = alternativeByKey.get(alternativeComparisonKey(offRow))
    if (alternativeRow === undefined) return undefined
    return {
      key: alternativeComparisonKey(offRow),
      scene: offRow.scene,
      resolution: offRow.resolution,
      view: offRow.view,
      output: outputName(offRow),
      sampleMode: alternativeRow.sampleMode,
      evidenceComplete: evidenceComplete(offRow) && evidenceComplete(alternativeRow),
      off: {
        patternNoiseScore: offRow.qualityMetrics.patternNoiseScore,
        stripeScore: offRow.qualityMetrics.stripeScore,
        totalProductGpuMs: totalProductGpuMs(offRow),
      },
      alternative: {
        patternNoiseScore: alternativeRow.qualityMetrics.patternNoiseScore,
        stripeScore: alternativeRow.qualityMetrics.stripeScore,
        totalProductGpuMs: totalProductGpuMs(alternativeRow),
        screenshotPath: alternativeRow.screenshotPath,
      },
    }
  })
  .filter(Boolean)
const sameCostAlternativeEvidence =
  productOffRows.length > 0 &&
  productOffRows.every((row) => alternativeByKey.has(alternativeComparisonKey(row))) &&
  alternativeComparisons.every((row) => row.evidenceComplete)
const hasMaterialPatternWin = productComparisons.some((row) => row.materialPatternWin)
const hasStripeRegression = productComparisons.some((row) => row.stripeRegression)
const internalTemporalEvidence = velocityTemporalEvidence
const hasInternalMaterialPatternWin = hasVelocityMaterialPatternWin
const hasInternalStripeRegression = hasVelocityStripeRegression
const hasInternalEdgeRegression = hasVelocityEdgeRegression
const hasInternalThinGapRegression = hasVelocityThinGapRegression
const hasInternalBlockingFailureLabels = hasVelocityBlockingFailureLabels

const hostTaaPassesPromotion =
  hostTaaEvidence &&
  hasHostTaaMaterialPatternWin &&
  !hasHostTaaStripeRegression &&
  !hasHostTaaBlockingFailureLabels
const internalTemporalPassesPromotion =
  velocityTemporalEvidence &&
  hasVelocityMaterialPatternWin &&
  !hasVelocityStripeRegression &&
  !hasVelocityEdgeRegression &&
  !hasVelocityThinGapRegression &&
  !hasVelocityBlockingFailureLabels
const complete = hostEvidenceComplete && hostTaaEvidence && sameCostAlternativeEvidence
const evaluatedInternalEvidence = velocityRows.length > 0

const verdict =
  complete && (hostTaaPassesPromotion || internalTemporalPassesPromotion)
    ? 'candidate'
    : complete
      ? 'reject-promotion'
      : 'incomplete'

const report = {
  generatedAt: new Date().toISOString(),
  inputs: {
    offJsonPath,
    hostJsonPath,
    hostTaaJsonPath,
    velocityJsonPath,
    alternativeJsonPath,
  },
  thresholds: {
    materialPatternWin: MATERIAL_PATTERN_WIN,
    stripeRegressionTolerance: STRIPE_REGRESSION_TOLERANCE,
    edgeRegressionTolerance: EDGE_REGRESSION_TOLERANCE,
    thinGapRegressionTolerance: THIN_GAP_REGRESSION_TOLERANCE,
  },
  hostTaaEvidence,
  hasHostTaaMaterialPatternWin,
  hasHostTaaStripeRegression,
  hasHostTaaBlockingFailureLabels,
  sameCostAlternativeEvidence,
  internalTemporalEvidence,
  evaluatedInternalEvidence,
  hasInternalMaterialPatternWin,
  hasInternalStripeRegression,
  hasInternalEdgeRegression,
  hasInternalThinGapRegression,
  hasInternalBlockingFailureLabels,
  internalTemporalPassesPromotion,
  verdict,
  internalTemporalAllowed: internalTemporalPassesPromotion,
  reason:
    verdict === 'candidate'
      ? internalTemporalPassesPromotion
        ? 'Velocity-backed internal temporal evidence passes the private candidate gate without tracked regressions.'
        : 'Host TAA/TRAA evidence passes the material quality gate without tracked regressions; AO-owned velocity temporal remains private.'
      : verdict === 'reject-promotion'
        ? hostTaaEvidence
          ? 'Host sampling has host TAA/TRAA evidence, but it did not show a material product pattern/noise win without stripe regression.'
          : 'Host TAA/TRAA evidence is missing.'
        : 'Temporal off/host evidence is incomplete.',
  missingHostRows,
  missingHostTaaRows,
  comparisons,
  hostTaaComparisons,
  internalComparisons: velocityComparisons,
  alternativeComparisons,
}

await mkdir(path.dirname(outputJsonPath), { recursive: true })
await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`)

const lines = []
lines.push('# VBAO Temporal Gate Verdict')
lines.push('')
lines.push(`Generated: ${report.generatedAt}`)
lines.push('')
lines.push(`Verdict: **${report.verdict}**`)
lines.push('')
lines.push(`Internal temporal allowed: **${report.internalTemporalAllowed ? 'yes' : 'no'}**`)
lines.push('')
lines.push(report.reason)
lines.push('')
lines.push('| View | Output | Pattern delta | Stripe delta | Edge delta | Thin-gap delta | Material win | Stripe regression |')
lines.push('| --- | --- | ---: | ---: | ---: | ---: | --- | --- |')
for (const row of comparisons) {
  lines.push(
    `| ${row.view} | ${row.output} | ${row.delta.patternNoiseScore.toFixed(5)} | ${row.delta.stripeScore.toFixed(5)} | ${row.delta.edgeBleedProxy.toFixed(5)} | ${row.delta.thinGapPreservationProxy.toFixed(5)} | ${row.materialPatternWin ? 'yes' : 'no'} | ${row.stripeRegression ? 'yes' : 'no'} |`,
  )
}
lines.push('')
if (hostTaaComparisons.length > 0) {
  lines.push('## Host TAA/TRAA Comparison')
  lines.push('')
  lines.push('| View | Output | Pattern delta | Stripe delta | Edge delta | Thin-gap delta | Material win | Stripe regression |')
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | --- | --- |')
  for (const row of hostTaaComparisons) {
    lines.push(
      `| ${row.view} | ${row.output} | ${row.delta.patternNoiseScore.toFixed(5)} | ${row.delta.stripeScore.toFixed(5)} | ${row.delta.edgeBleedProxy.toFixed(5)} | ${row.delta.thinGapPreservationProxy.toFixed(5)} | ${row.materialPatternWin ? 'yes' : 'no'} | ${row.stripeRegression ? 'yes' : 'no'} |`,
    )
  }
  lines.push('')
}
lines.push(`Host TAA/TRAA evidence: **${report.hostTaaEvidence ? 'present' : 'not present'}**.`)
lines.push('')
lines.push(
  `Same-cost non-temporal alternative evidence: **${report.sameCostAlternativeEvidence ? 'present' : 'not present'}**.`,
)
lines.push('')
lines.push(
  `Velocity-backed internal temporal evidence: **${report.internalTemporalEvidence ? 'present' : 'not present'}**.`,
)
lines.push('')
lines.push('This verifier cannot allow temporal AO unless host TAA/TRAA or velocity-backed internal evidence and same-cost non-temporal comparisons produce a material win without blocking labels or tracked regressions. Complete-but-failing evidence remains `reject-promotion`; AO-owned temporal remains private unless the velocity-backed evidence reaches candidate.')
lines.push('')
await writeFile(outputMdPath, lines.join('\n'))

console.log(JSON.stringify({ outputJsonPath, outputMdPath, verdict }, null, 2))

if (requireCandidate && report.verdict !== 'candidate') {
  console.error(
    `VBAO temporal gate requires a candidate verdict, received "${report.verdict}". ${report.reason}`,
  )
  process.exitCode = 1
}
