import { writeFile } from 'node:fs/promises'

export const AO_FAILURE_LABELS = [
  'none',
  'noise',
  'mud',
  'halo',
  'thin-gap',
  'edge-bleed',
  'ghosting',
  'disocclusion',
  'scale-mismatch',
  'false-curvature',
]

export const AO_REFERENCE_GATE_MODES = ['vbao', 'gtao', 'ssao', 'n8ao']

export const VBAO_RECONSTRUCTION_STAGES = ['raw', 'cleanup', 'resolve', 'polish', 'final']

export function classifyFailureLabels(row) {
  if (row.mode !== 'vbao') return ['none']
  if (row.fullResolutionVbao === false) return ['noise', 'false-curvature', 'scale-mismatch']

  const labels = new Set(['noise'])
  const contract = row.productOutputContract ?? ''
  const legacyDenoisedMode =
    row.denoise === true &&
    ((contract.length > 0 && !contract.includes('final product AO')) ||
      row.vbaoFilter !== undefined ||
      row.vbaoDenoiseFilter !== undefined)

  if (legacyDenoisedMode) {
    labels.add('mud')
    labels.add('thin-gap')
    labels.add('edge-bleed')
    return [...labels]
  }

  if (row.denoise === false || row.fullResolutionVbao === true) return ['noise', 'edge-bleed']
  return [...labels]
}

function isHalfResolutionProductVbaoRow(row) {
  return row.mode === 'vbao' && row.denoise === true && row.fullResolutionVbao === false
}

function isHalfResolutionReconstructionGateRow(row) {
  return isHalfResolutionProductVbaoRow(row) && row.label?.includes('half-res-reconstruction-gate')
}

export function createVbaoReconstructionStageStatusRows(rows) {
  return rows
    .filter((row) => isHalfResolutionProductVbaoRow(row) && Array.isArray(row.reconstructionStages))
    .map((row) => {
      const stages = row.reconstructionStages ?? []
      const stagesByName = new Map(stages.map((stage) => [stage.stage, stage]))
      const missingStages = VBAO_RECONSTRUCTION_STAGES.filter((stage) => !stagesByName.has(stage))
      const firstFailingStage = VBAO_RECONSTRUCTION_STAGES.find((stage) => {
        const labels = stagesByName.get(stage)?.failureLabels ?? []
        return labels.some((label) => label !== 'none')
      })

      return {
        label: row.label,
        status: missingStages.length === 0 ? 'complete' : 'incomplete',
        missingStages,
        firstFailingStage: firstFailingStage ?? null,
      }
    })
}

function isReferenceGateProductRow(row) {
  if (!AO_REFERENCE_GATE_MODES.includes(row.mode)) return false
  if (row.view !== undefined && row.view !== 'ao') return false

  if (row.mode === 'n8ao') return row.denoise !== false
  return row.denoise === true
}

function referenceObservationCount(row) {
  const observations = row.referenceObservations ?? row.referenceGate?.observations ?? []
  return observations.length
}

export function createReferenceGateStatusRows(rows) {
  return rows.filter(isReferenceGateProductRow).map((row) => {
    const observedFixtures = new Set(
      (row.referenceObservations ?? row.referenceGate?.observations ?? []).map(
        (observation) => observation.fixtureId,
      ),
    )
    const output =
      row.mode === 'vbao' ? 'product' : row.mode === 'n8ao' ? 'internally-filtered' : 'denoised'

    return {
      label: row.label,
      algorithm: row.mode,
      output,
      observedFixtureCount: observedFixtures.size || referenceObservationCount(row),
      status:
        observedFixtures.size > 0 || referenceObservationCount(row) > 0
          ? 'compared'
          : 'missing-reference-observation',
    }
  })
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function isMissingPassTiming(passTiming) {
  return ['blocked', 'incomplete', 'missing', 'unexpected', 'unmeasured'].includes(passTiming.status)
}

export function createEvidenceArtifactStatusRows(rows) {
  return rows.map((row) => {
    const missing = []

    if (typeof row.screenshotPath !== 'string' || row.screenshotPath.length === 0) {
      missing.push('screenshotPath')
    }
    if (!isFiniteNumber(row.latest?.medianFrameMs)) {
      missing.push('latest.medianFrameMs')
    }
    if (!isFiniteNumber(row.latest?.p95FrameMs)) {
      missing.push('latest.p95FrameMs')
    }
    if (row.mode === 'vbao' && !Array.isArray(row.passTimings)) {
      missing.push('passTimings')
    }
    for (const passTiming of row.passTimings ?? []) {
      if (isMissingPassTiming(passTiming)) {
        missing.push(`passTimings.${passTiming.pass ?? 'unknown'}`)
      }
    }
    if (isHalfResolutionReconstructionGateRow(row)) {
      const stages = new Set((row.reconstructionStages ?? []).map((stage) => stage.stage))
      for (const stage of VBAO_RECONSTRUCTION_STAGES) {
        if (!stages.has(stage)) missing.push(`reconstructionStages.${stage}`)
      }
    }

    return {
      label: row.label,
      status: missing.length === 0 ? 'complete' : 'incomplete',
      missing,
    }
  })
}

export async function writeProductionQualityReports({ outputJson, outputMd, report }) {
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`)

  const lines = []
  lines.push('# AO Production Screenshot Quality Summary')
  lines.push('')
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push('')
  lines.push(
    'This is an image-quality benchmark companion to screenshot capture. Lower pattern/noise and stripe scores are better, but this is not a physical AO reference; use `ao-ground-truth-summary.md` and `ao-gpu-readback-summary.md` for reference-accuracy baselines.',
  )
  lines.push('')
  lines.push(
    '| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pattern/noise ↓ | Stripe ↓ | Edge bleed proxy ↓ | Thin-gap proxy ↑ | H stripe ↓ | V stripe ↓ | Anisotropy ↓ |',
  )
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |')
  for (const row of report.rows) {
    const metrics = row.qualityMetrics
    const outputLabel =
      row.mode === 'vbao'
        ? row.denoise
          ? 'product'
          : 'raw-debug'
        : row.denoise
          ? 'denoised'
          : 'raw'
    lines.push(
      `| ${row.resolution.width}x${row.resolution.height} | ${row.mode} | ${row.sampleMode ?? 'n/a'} | ${row.temporalMode ?? 'n/a'} | ${row.hostTaaMode ?? 'n/a'} | ${row.vbaoResolution} | ${row.view} | ${outputLabel} | ${metrics.patternNoiseScore.toFixed(5)} | ${metrics.stripeScore.toFixed(5)} | ${metrics.edgeBleedProxy.toFixed(5)} | ${metrics.thinGapPreservationProxy.toFixed(5)} | ${metrics.horizontalStripeScore.toFixed(5)} | ${metrics.verticalStripeScore.toFixed(5)} | ${metrics.directionalAnisotropy.toFixed(5)} |`,
    )
  }
  lines.push('')
  lines.push('## AO Production Pass Timing Status')
  lines.push('')
  lines.push(
    'Skipped passes are not zero-cost passes; `skipped` means the pass is elided from that graph, `measured` means a pass-level WebGPU timestamp was captured, and `derived` means the value is a sum of measured pass timestamps.',
  )
  lines.push('')
  lines.push('| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pass | Status | GPU ms |')
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: |')
  for (const row of report.rows) {
    const outputLabel =
      row.mode === 'vbao'
        ? row.denoise
          ? 'product'
          : 'raw-debug'
        : row.denoise
          ? 'denoised'
          : 'raw'
    for (const passTiming of row.passTimings ?? []) {
      const gpuMs =
        passTiming.gpuMs === null || passTiming.gpuMs === undefined
          ? 'n/a'
          : passTiming.gpuMs.toFixed(3)
      lines.push(
        `| ${row.resolution.width}x${row.resolution.height} | ${row.mode} | ${row.sampleMode ?? 'n/a'} | ${row.temporalMode ?? 'n/a'} | ${row.hostTaaMode ?? 'n/a'} | ${row.vbaoResolution} | ${row.view} | ${outputLabel} | ${passTiming.pass} | ${passTiming.status} | ${gpuMs} |`,
      )
    }
  }
  const temporalDiagnosticRows = report.rows.filter(
    (row) => row.mode === 'vbao' && row.temporalMode === 'internal',
  )
  lines.push('')
  lines.push('## VBAO Internal Temporal Diagnostics')
  lines.push('')
  lines.push(
    'Internal temporal rows must disclose the validation mode and CPU-visible reset state. GPU rejection counters are only reported once instrumented; absence of counters is not treated as a measured rejection rate.',
  )
  lines.push('')
  lines.push('| Row | Validation | History weight | Depth threshold | Normal threshold | Pending reset | Last reset | GPU counters |')
  lines.push('| --- | --- | ---: | ---: | ---: | --- | --- | --- |')
  if (temporalDiagnosticRows.length === 0) {
    lines.push('| n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |')
  } else {
    for (const row of temporalDiagnosticRows) {
      const diagnostics = row.temporalDiagnostics ?? row.latest?.vbaoTemporalDiagnostics
      lines.push(
        `| ${row.label ?? 'n/a'} | ${diagnostics?.validationMode ?? 'missing'} | ${diagnostics?.historyWeight?.toFixed?.(2) ?? 'n/a'} | ${diagnostics?.depthContinuityThreshold?.toFixed?.(3) ?? 'n/a'} | ${diagnostics?.normalContinuityThreshold?.toFixed?.(2) ?? 'n/a'} | ${diagnostics?.pendingResetReason ?? 'n/a'} | ${diagnostics?.lastAppliedResetReason ?? 'n/a'} | ${diagnostics?.gpuRejectionCounters ?? 'n/a'} |`,
      )
    }
  }
  const evidenceArtifactRows =
    report.evidenceArtifactRows ?? createEvidenceArtifactStatusRows(report.rows)
  lines.push('')
  lines.push('## AO Evidence Artifact Status')
  lines.push('')
  lines.push(
    'Rows missing screenshots or required timing data are incomplete evidence, never passing evidence.',
  )
  lines.push('')
  lines.push('| Row | Status | Missing evidence |')
  lines.push('| --- | --- | --- |')
  if (evidenceArtifactRows.length === 0) {
    lines.push('| n/a | incomplete | row |')
  } else {
    for (const row of evidenceArtifactRows) {
      lines.push(
        `| ${row.label ?? 'n/a'} | ${row.status} | ${row.missing.length === 0 ? 'none' : row.missing.join(',')} |`,
      )
    }
  }
  const referenceGateRows =
    report.referenceGate?.productRows ?? createReferenceGateStatusRows(report.rows)
  const reconstructionStageRows =
    report.reconstructionGate?.stageRows ?? createVbaoReconstructionStageStatusRows(report.rows)
  lines.push('')
  lines.push('## VBAO Half-Resolution Reconstruction Stage Status')
  lines.push('')
  lines.push(
    'Half-resolution product rows must identify raw, cleanup, resolve, polish, and final AO stage labels before promotion. Missing stage evidence is incomplete evidence.',
  )
  lines.push('')
  lines.push('| Product row | Status | Missing stages | First failing stage |')
  lines.push('| --- | --- | --- | --- |')
  if (reconstructionStageRows.length === 0) {
    lines.push('| n/a | incomplete | half-resolution-product-row | n/a |')
  } else {
    for (const row of reconstructionStageRows) {
      lines.push(
        `| ${row.label ?? 'n/a'} | ${row.status} | ${row.missingStages.length === 0 ? 'none' : row.missingStages.join(',')} | ${row.firstFailingStage ?? 'none'} |`,
      )
    }
  }
  lines.push('')
  lines.push('## AO Reference Gate Status')
  lines.push('')
  lines.push(
    'Product AO rows must provide fixture observations before they can be compared against the ray-cast and canonical reports. Missing observations are gate misses, not passes.',
  )
  lines.push('')
  lines.push('| Product row | Algorithm | Output | Observed fixtures | Status |')
  lines.push('| --- | --- | --- | ---: | --- |')
  if (referenceGateRows.length === 0) {
    lines.push('| n/a | n/a | n/a | 0 | missing-reference-observation |')
  } else {
    for (const row of referenceGateRows) {
      lines.push(
        `| ${row.label ?? 'n/a'} | ${row.algorithm} | ${row.output} | ${row.observedFixtureCount ?? 0} | ${row.status} |`,
      )
    }
  }
  lines.push('')
  lines.push('Metric basis:')
  lines.push(
    '- `patternNoiseScore`: RMS of a cross-high-pass residual over the central scene crop.',
  )
  lines.push(
    '- `stripeScore`: max row/column residual coherence normalized by high-pass RMS; catches visible bands/stripes.',
  )
  lines.push(
    '- `edgeBleedProxy`: broad contrast beyond local edge contrast. Lower is better; this is a screenshot proxy, not geometric truth.',
  )
  lines.push(
    '- `thinGapPreservationProxy`: narrow bright-line contrast. Higher is better; compare only within the same scene/view.',
  )
  lines.push(
    '- `directionalAnisotropy`: imbalance between horizontal and vertical neighbor differences.',
  )
  lines.push('- Crop excludes demo chrome and the bottom-right controls.')
  await writeFile(outputMd, `${lines.join('\n')}\n`)
}
