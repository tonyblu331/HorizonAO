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
const alternativeJsonPath = resolveRepoPath(
  process.env.VBAO_TEMPORAL_ALTERNATIVE_JSON,
  path.join(artifactRoot, 'vbao-temporal-spatial-ultra-latest.json'),
)
const internalJsonPath = resolveRepoPath(
  process.env.VBAO_TEMPORAL_INTERNAL_JSON,
  path.join(artifactRoot, 'vbao-temporal-internal-latest.json'),
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

function internalTemporalEvidenceComplete(row) {
  const diagnostics = row.temporalDiagnostics ?? row.latest?.vbaoTemporalDiagnostics
  if (!evidenceComplete(row)) return false
  if (diagnostics?.validationMode !== 'reproject-depth-normal-clamp') return false
  for (const passName of ['temporal', 'temporal-depth', 'temporal-normal']) {
    const pass = row.passTimings?.find((candidate) => candidate.pass === passName)
    if (pass?.status !== 'measured' || !finiteNumber(pass.gpuMs)) {
      return false
    }
  }
  return true
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
    evidenceComplete: evidenceComplete(offRow) && evidenceComplete(hostRow),
  }
}

const offReport = await readReport(offJsonPath)
const hostReport = await readReport(hostJsonPath)
const hostTaaReport = await readOptionalReport(hostTaaJsonPath)
const alternativeReport = await readOptionalReport(alternativeJsonPath)
const internalReport = await readOptionalReport(internalJsonPath)
existingScreenshotPaths = await createExistingScreenshotPathSet([
  offReport,
  hostReport,
  hostTaaReport,
  alternativeReport,
  internalReport,
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
const alternativeRows =
  alternativeReport?.rows.filter(
    (row) => row.mode === 'vbao' && row.temporalMode === 'off' && row.sampleMode !== 'product-preset',
  ) ?? []
const internalRows =
  internalReport?.rows.filter((row) => row.mode === 'vbao' && row.temporalMode === 'internal') ?? []
const hostByKey = new Map(hostRows.map((row) => [comparisonKey(row), row]))
const hostTaaByKey = new Map(hostTaaRows.map((row) => [comparisonKey(row), row]))
const alternativeByKey = new Map(alternativeRows.map((row) => [alternativeComparisonKey(row), row]))
const internalByKey = new Map(internalRows.map((row) => [comparisonKey(row), row]))
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
const missingInternalRows = productOffRows
  .filter((row) => !internalByKey.has(comparisonKey(row)))
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
const internalComparisons = productOffRows
  .map((offRow) => {
    const internalRow = internalByKey.get(comparisonKey(offRow))
    return internalRow === undefined ? undefined : compareRows(offRow, internalRow)
  })
  .filter(Boolean)
const internalTemporalEvidence =
  productOffRows.length > 0 &&
  missingInternalRows.length === 0 &&
  internalComparisons.every((row) => row.evidenceComplete) &&
  productOffRows.every((offRow) => {
    const internalRow = internalByKey.get(comparisonKey(offRow))
    return internalRow !== undefined && internalTemporalEvidenceComplete(internalRow)
  })
const hasMaterialPatternWin = productComparisons.some((row) => row.materialPatternWin)
const hasStripeRegression = productComparisons.some((row) => row.stripeRegression)
const hasInternalMaterialPatternWin = internalComparisons.some((row) => row.materialPatternWin)
const hasInternalStripeRegression = internalComparisons.some((row) => row.stripeRegression)
const hasInternalEdgeRegression = internalComparisons.some(
  (row) => row.delta.edgeBleedProxy > EDGE_REGRESSION_TOLERANCE,
)
const hasInternalThinGapRegression = internalComparisons.some(
  (row) => row.delta.thinGapPreservationProxy < -THIN_GAP_REGRESSION_TOLERANCE,
)
const hasInternalBlockingFailureLabels = internalRows.some(hasBlockingFailureLabels)

const hostTaaPassesPromotion =
  hostTaaEvidence &&
  hasHostTaaMaterialPatternWin &&
  !hasHostTaaStripeRegression &&
  !hasHostTaaBlockingFailureLabels
const internalTemporalPassesPromotion =
  internalTemporalEvidence &&
  hasInternalMaterialPatternWin &&
  !hasInternalStripeRegression &&
  !hasInternalEdgeRegression &&
  !hasInternalThinGapRegression &&
  !hasInternalBlockingFailureLabels
const complete = hostEvidenceComplete && sameCostAlternativeEvidence && internalTemporalEvidence
const evaluatedInternalEvidence = internalTemporalEvidence && sameCostAlternativeEvidence

const verdict =
  complete && hostTaaPassesPromotion && internalTemporalPassesPromotion
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
    alternativeJsonPath,
    internalJsonPath,
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
  internalTemporalAllowed: verdict === 'candidate',
  reason:
    verdict === 'candidate'
      ? 'Host TAA/TRAA evidence and internal temporal evidence both pass the material quality gate without tracked regressions.'
      : verdict === 'reject-promotion'
        ? hasInternalBlockingFailureLabels
          ? 'Internal temporal evidence is present, but it has blocking failure labels and no material product pattern/noise win.'
          : hostTaaEvidence
          ? 'Host sampling has host TAA/TRAA evidence, but it did not show a material product pattern/noise win without stripe regression.'
          : 'Host sampling did not show a material product pattern/noise win without regression in the non-TAA smoke comparison.'
        : 'Temporal off/host evidence is incomplete.',
  missingHostRows,
  missingHostTaaRows,
  missingInternalRows,
  comparisons,
  hostTaaComparisons,
  internalComparisons,
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
if (internalComparisons.length > 0) {
  lines.push('## Internal Temporal Comparison')
  lines.push('')
  lines.push('| View | Output | Pattern delta | Stripe delta | Edge delta | Thin-gap delta | Material win | Stripe regression |')
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | --- | --- |')
  for (const row of internalComparisons) {
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
  `Internal temporal evidence: **${report.internalTemporalEvidence ? 'present' : 'not present'}**; promotion pass: **${report.internalTemporalPassesPromotion ? 'yes' : 'no'}**.`,
)
lines.push('')
lines.push('This verifier cannot allow temporal AO unless host TAA/TRAA evidence is present, same-cost non-temporal comparisons are present, and internal temporal evidence produces a material win without blocking labels or stripe, edge, or thin-gap regression. Complete-but-failing evidence remains `reject-promotion`; internal temporal allowance is candidate-only.')
lines.push('')
await writeFile(outputMdPath, lines.join('\n'))

console.log(JSON.stringify({ outputJsonPath, outputMdPath, verdict }, null, 2))

if (requireCandidate && report.verdict !== 'candidate') {
  console.error(
    `VBAO temporal gate requires a candidate verdict, received "${report.verdict}". ${report.reason}`,
  )
  process.exitCode = 1
}
