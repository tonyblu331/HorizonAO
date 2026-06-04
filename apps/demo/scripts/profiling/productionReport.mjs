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
  if (row.fullResolutionVbao === false) return ['noise']

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

function outputLabelForRow(row) {
  if (row.mode === 'vbao') return row.denoise ? 'product' : 'raw-debug'
  return row.denoise ? 'denoised' : 'raw'
}

export function createRenderedThinGeometryProxyRows(rows) {
  return rows
    .filter((row) => row.mode === 'vbao' && (row.view === 'beauty' || row.view === 'ao'))
    .map((row) => {
      const metrics = row.qualityMetrics
      const failureLabels = row.failureLabels ?? classifyFailureLabels(row)
      const missing = []

      if (!isFiniteNumber(metrics?.thinGapPreservationProxy)) {
        missing.push('qualityMetrics.thinGapPreservationProxy')
      }
      if (!isFiniteNumber(metrics?.edgeBleedProxy)) {
        missing.push('qualityMetrics.edgeBleedProxy')
      }
      if (!isFiniteNumber(metrics?.stripeScore)) {
        missing.push('qualityMetrics.stripeScore')
      }
      if (!Array.isArray(failureLabels)) {
        missing.push('failureLabels')
      }

      return {
        label: row.label,
        view: row.view,
        output: outputLabelForRow(row),
        vbaoResolution: row.vbaoResolution ?? 'n/a',
        thinGapProxy: metrics?.thinGapPreservationProxy ?? null,
        edgeBleedProxy: metrics?.edgeBleedProxy ?? null,
        stripeScore: metrics?.stripeScore ?? null,
        failureLabels: Array.isArray(failureLabels) ? failureLabels : [],
        status: missing.length === 0 ? 'complete' : 'incomplete',
        missing,
      }
    })
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function isMissingPassTiming(passTiming) {
  return ['blocked', 'incomplete', 'missing', 'unexpected', 'unmeasured'].includes(passTiming.status)
}

function hasTemporalDiagnostics(row) {
  if (row.temporalMode !== 'velocity-internal') return true
  const diagnostics = row.temporalDiagnostics ?? row.latest?.vbaoTemporalDiagnostics
  return (
    diagnostics !== null &&
    typeof diagnostics === 'object' &&
    diagnostics.renderTargetName === 'VBAO.VelocityTemporalDiagnostics' &&
    diagnostics.encodedReasonBits?.reset === 1 &&
    diagnostics.encodedReasonBits?.viewport === 2 &&
    diagnostics.encodedReasonBits?.depth === 4 &&
    diagnostics.encodedReasonBits?.normal === 8 &&
    diagnostics.encodedReasonBits?.velocity === 16 &&
    diagnostics.encodedReasonBits?.clampHistoryRange === 32
  )
}

function hasTemporalTargetInventory(row) {
  if (row.temporalMode !== 'velocity-internal') return true
  const inventory = row.temporalTargetInventory ?? row.latest?.vbaoTemporalTargetInventory
  return (
    inventory !== null &&
    typeof inventory === 'object' &&
    inventory.currentAo?.owner === 'VBAONode' &&
    inventory.aoHistory?.owner === 'VBAOVelocityTemporalNode' &&
    inventory.aoHistory?.format === 'RedFormat' &&
    inventory.aoHistory?.type === 'HalfFloatType' &&
    inventory.diagnostics?.owner === 'VBAOVelocityTemporalNode' &&
    inventory.diagnostics?.format === 'RGBAFormat' &&
    inventory.velocity?.owner === 'host-pass' &&
    inventory.previousDepth?.owner === 'host-pass' &&
    inventory.previousNormal?.owner === 'host-pass'
  )
}

function hasRequestedTemporalResetEvidence(row) {
  if (row.temporalMode !== 'velocity-internal') return true
  if (row.temporalResetEvidenceReason === undefined || row.temporalResetEvidenceReason === 'n/a') {
    return true
  }
  const diagnostics = row.temporalDiagnostics ?? row.latest?.vbaoTemporalDiagnostics
  return diagnostics?.lastResetReason === row.temporalResetEvidenceReason
}

function requiredPassesForEvidenceRow(row) {
  if (!isHalfResolutionProductVbaoRow(row)) return null

  switch (row.vbaoReconstructionStage) {
    case 'raw':
      return new Set(['raw', 'total-product'])
    case 'cleanup':
      return new Set(['raw', 'cleanup', 'total-product'])
    case 'resolve':
    case 'polish':
    case 'final':
    default:
      return null
  }
}

export function createEvidenceArtifactStatusRows(rows) {
  return rows.map((row) => {
    const missing = []
    const requiredPasses = requiredPassesForEvidenceRow(row)

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
    if (!hasTemporalDiagnostics(row)) {
      missing.push('temporalDiagnostics')
    }
    if (!hasTemporalTargetInventory(row)) {
      missing.push('temporalTargetInventory')
    }
    if (!hasRequestedTemporalResetEvidence(row)) {
      missing.push('temporalResetEvidence')
    }
    for (const passTiming of row.passTimings ?? []) {
      if (requiredPasses !== null && !requiredPasses.has(passTiming.pass)) {
        if (passTiming.status === 'unexpected') {
          missing.push(`passTimings.${passTiming.pass}`)
        }
        continue
      }
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
  lines.push('| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pass | Status | GPU ms | CPU ms |')
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: |')
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
      const cpuMs =
        passTiming.cpuMs === null || passTiming.cpuMs === undefined
          ? 'n/a'
          : passTiming.cpuMs.toFixed(3)
      lines.push(
        `| ${row.resolution.width}x${row.resolution.height} | ${row.mode} | ${row.sampleMode ?? 'n/a'} | ${row.temporalMode ?? 'n/a'} | ${row.hostTaaMode ?? 'n/a'} | ${row.vbaoResolution} | ${row.view} | ${outputLabel} | ${passTiming.pass} | ${passTiming.status} | ${gpuMs} | ${cpuMs} |`,
      )
    }
  }
  lines.push('')
  lines.push('## VBAO Temporal Architecture Status')
  lines.push('')
  lines.push(
    'Camera-only AO-owned temporal accumulation remains removed. Velocity-backed internal temporal is private evidence plumbing only and requires same-cost plus motion/disocclusion gates before promotion.',
  )
  lines.push('')
  lines.push('| Mode | Status | Evidence boundary |')
  lines.push('| --- | --- | --- |')
  lines.push('| off | product baseline | temporal-free AO evidence |')
  lines.push('| host | demo/evidence only | requires host TRAA and same-cost spatial comparison |')
  lines.push('| velocity-internal | private candidate only | requires host previous guides, temporal pass timing, same-cost spatial comparison, and motion evidence |')
  lines.push('')
  lines.push('## VBAO Compute Candidate Status')
  lines.push('')
  lines.push(
    'Compute candidates are private evidence paths. A listed candidate is not a public `VBAONodeOptions` feature and is not promoted unless it wins a named gate.',
  )
  lines.push('')
  lines.push('| Row | Candidate | Storage targets |')
  lines.push('| --- | --- | --- |')
  const computeRows = report.rows.filter((row) => row.mode === 'vbao')
  if (computeRows.length === 0) {
    lines.push('| n/a | n/a | n/a |')
  } else {
    for (const row of computeRows) {
      const inventory = row.computeCandidateInventory ?? row.latest?.vbaoComputeCandidateInventory ?? []
      const inventoryLabel = Array.isArray(inventory)
        ? inventory
            .map((target) => `${target.name ?? 'unknown'}:${target.role ?? 'unknown'}`)
            .join(',')
        : 'n/a'
      lines.push(
        `| ${row.label ?? 'n/a'} | ${row.computeCandidateLabel ?? row.latest?.vbaoComputeCandidateLabel ?? 'n/a'} | ${inventoryLabel.length === 0 ? 'none' : inventoryLabel} |`,
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
  const thinGeometryRows =
    report.thinGeometryProxyRows ?? createRenderedThinGeometryProxyRows(report.rows)
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
  lines.push('## VBAO Rendered Thin-Geometry Proxy Status')
  lines.push('')
  lines.push(
    'This section is rendered screenshot evidence only. It tracks thin-gap, edge-bleed, mud, and stripe proxy signals; it does not replace scalar thin diff or ray-cast thin diff evidence.',
  )
  lines.push('')
  lines.push('| Row | View | Output | VBAO res | Status | Labels | Thin-gap proxy ↑ | Edge bleed proxy ↓ | Stripe ↓ | Missing |')
  lines.push('| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |')
  if (thinGeometryRows.length === 0) {
    lines.push('| n/a | n/a | n/a | n/a | incomplete | n/a | n/a | n/a | n/a | vbao-rendered-row |')
  } else {
    for (const row of thinGeometryRows) {
      lines.push(
        `| ${row.label ?? 'n/a'} | ${row.view ?? 'n/a'} | ${row.output ?? 'n/a'} | ${row.vbaoResolution ?? 'n/a'} | ${row.status} | ${row.failureLabels.length === 0 ? 'none' : row.failureLabels.join(',')} | ${row.thinGapProxy === null ? 'n/a' : row.thinGapProxy.toFixed(5)} | ${row.edgeBleedProxy === null ? 'n/a' : row.edgeBleedProxy.toFixed(5)} | ${row.stripeScore === null ? 'n/a' : row.stripeScore.toFixed(5)} | ${row.missing.length === 0 ? 'none' : row.missing.join(',')} |`,
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
  lines.push(
    '- AO-view screenshot metrics are measured after the demo display transform; compare cross-algorithm rows only as rendered presentation evidence, not scalar AO truth.',
  )
  await writeFile(outputMd, `${lines.join('\n')}\n`)
}
