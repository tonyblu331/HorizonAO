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

export const AO_REQUIRED_REFERENCE_FIXTURE_IDS = [
  'flat-plane-open',
  'box-contact',
  'two-wall-corner',
  'broad-wall-contact',
  'thin-gap-separated-slabs',
  'grazing-surface-wall',
  'normal-sensitive-side-contact',
]

export const VBAO_RECONSTRUCTION_STAGES = ['raw', 'cleanup', 'resolve', 'polish', 'final']
export const VBAO_RECONSTRUCTION_DIAGNOSTIC_STAGES = ['confidence']

export const AO_DEFAULT_PRODUCT_SAMPLE_MODES = [undefined, 'product-preset', 'n/a']
export const AO_DEFAULT_PRODUCT_NOISE_SOURCES = [undefined, 'phase-atlas-stable-hash', 'n/a']

export const VBAO_PRODUCT_QUALITY_MATRIX = Object.freeze([
  Object.freeze({
    id: 'confidence-guided-candidate',
    role: 'candidate',
    receiverConfidence: 'confidence-guided',
    sampleCost: 'product-preset',
    resolution: 'half-res',
    compute: 'compute-off',
    temporal: 'temporal-off',
    promotionBoundary: 'eligible-after-reference-threshold-and-same-cost-gates',
  }),
  Object.freeze({
    id: 'scalar-control',
    role: 'control',
    receiverConfidence: 'scalar-control',
    sampleCost: 'product-preset',
    resolution: 'candidate-resolution',
    compute: 'compute-off',
    temporal: 'temporal-off',
    promotionBoundary: 'control-only',
  }),
  Object.freeze({
    id: 'same-cost-3x10',
    role: 'control',
    receiverConfidence: 'confidence-guided',
    sampleCost: 'same-cost-raw-samples',
    resolution: 'candidate-resolution',
    compute: 'compute-off',
    temporal: 'temporal-off',
    promotionBoundary: 'control-only',
  }),
  Object.freeze({
    id: 'same-cost-2x16',
    role: 'control',
    receiverConfidence: 'confidence-guided',
    sampleCost: 'same-cost-raw-samples',
    resolution: 'candidate-resolution',
    compute: 'compute-off',
    temporal: 'temporal-off',
    promotionBoundary: 'control-only',
  }),
  Object.freeze({
    id: 'full-res-product-control',
    role: 'control',
    receiverConfidence: 'confidence-guided',
    sampleCost: 'product-preset',
    resolution: 'full-res',
    compute: 'compute-off',
    temporal: 'temporal-off',
    promotionBoundary: 'control-only',
  }),
  Object.freeze({
    id: 'compute-off-control',
    role: 'control',
    receiverConfidence: 'any',
    sampleCost: 'any',
    resolution: 'any',
    compute: 'compute-off',
    temporal: 'any',
    promotionBoundary: 'control-axis',
  }),
  Object.freeze({
    id: 'compute-smoke-observability',
    role: 'observability',
    receiverConfidence: 'confidence-guided',
    sampleCost: 'product-preset',
    resolution: 'candidate-resolution',
    compute: 'sector-confidence-smoke',
    temporal: 'temporal-off',
    promotionBoundary: 'observability-only',
  }),
  Object.freeze({
    id: 'temporal-off-baseline',
    role: 'baseline',
    receiverConfidence: 'any',
    sampleCost: 'any',
    resolution: 'any',
    compute: 'any',
    temporal: 'temporal-off',
    promotionBoundary: 'baseline-axis',
  }),
  Object.freeze({
    id: 'velocity-internal-private',
    role: 'private',
    receiverConfidence: 'confidence-guided',
    sampleCost: 'product-preset',
    resolution: 'candidate-resolution',
    compute: 'compute-off',
    temporal: 'velocity-internal',
    promotionBoundary: 'private-only',
  }),
])

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
  if (row.view !== undefined && row.view !== 'ao' && row.view !== 'beauty') return false

  if (row.mode === 'vbao') return row.denoise === true || row.denoise === false
  if (row.mode === 'n8ao') return row.denoise !== false
  return row.denoise === true
}

function promotionOutputLabelForRow(row) {
  if (row.mode === 'vbao' && row.vbaoReconstructionStage === 'confidence') {
    return 'confidence-diagnostic'
  }
  if (row.mode === 'vbao') return row.denoise === false ? 'raw-debug' : 'product'
  if (row.mode === 'n8ao') return 'internally-filtered'
  return 'denoised'
}

function referenceObservationCount(row) {
  const observations = row.referenceObservations ?? row.referenceGate?.observations ?? []
  return observations.length
}

function missingRequiredReferenceFixtures(row) {
  const observedFixtures = new Set(
    (row.referenceObservations ?? row.referenceGate?.observations ?? []).map(
      (observation) => observation.fixtureId,
    ),
  )
  return AO_REQUIRED_REFERENCE_FIXTURE_IDS.filter((fixtureId) => !observedFixtures.has(fixtureId))
}

export function createReferenceGateStatusRows(rows) {
  return rows.filter(isReferenceGateProductRow).map((row) => {
    const observedFixtures = new Set(
      (row.referenceObservations ?? row.referenceGate?.observations ?? []).map(
        (observation) => observation.fixtureId,
      ),
    )
      return {
        label: row.label,
        algorithm: row.mode,
        output: promotionOutputLabelForRow(row),
        observedFixtureCount: observedFixtures.size || referenceObservationCount(row),
        missingRequiredFixtureIds: missingRequiredReferenceFixtures(row),
      status:
        observedFixtures.size === 0 && referenceObservationCount(row) === 0
          ? 'missing-reference-observation'
          : missingRequiredReferenceFixtures(row).length > 0
            ? 'missing-required-observation'
            : 'compared',
    }
  })
}

function receiverConfidenceModeForRow(row) {
  if (row.mode !== 'vbao') return 'n/a'
  return row.receiverConfidenceMode ?? row.latest?.vbaoReceiverConfidenceMode ?? 'confidence-guided'
}

function sampleCostForRow(row) {
  if (row.mode !== 'vbao') return 'n/a'
  if (row.sampleMode === 'same-cost-3x10' || row.sampleMode === 'same-cost-2x16') {
    return 'same-cost-raw-samples'
  }
  if (row.sampleMode === 'spatial-ultra') return 'extra-raw-samples'
  if (row.sampleMode === 'debug-override') return 'debug-override'
  return 'product-preset'
}

function resolutionLaneForRow(row) {
  if (row.mode !== 'vbao') return 'n/a'
  if (row.fullResolutionVbao === true || row.vbaoResolution === 'full-res' || row.vbaoResolution === 'full') {
    return 'full-res'
  }
  if (row.fullResolutionVbao === false || row.vbaoResolution === 'half-res' || row.vbaoResolution === 'half') {
    return 'half-res'
  }
  return 'unknown-resolution'
}

function computeModeForRow(row) {
  const computeCandidateLabel = row.computeCandidateLabel ?? row.latest?.vbaoComputeCandidateLabel
  if (row.mode !== 'vbao') return 'n/a'
  if (computeCandidateLabel === undefined || computeCandidateLabel === 'n/a' || computeCandidateLabel === 'off') {
    return 'compute-off'
  }
  if (computeCandidateLabel === 'sector-confidence-smoke') return 'sector-confidence-smoke'
  return String(computeCandidateLabel)
}

function temporalModeForRow(row) {
  if (row.mode !== 'vbao') return 'n/a'
  if (row.temporalMode === undefined || row.temporalMode === 'n/a' || row.temporalMode === 'off') {
    return 'temporal-off'
  }
  return row.temporalMode
}

function matrixRowIdsForClassification(row, classification) {
  if (row.mode !== 'vbao') return ['comparison-row']

  const matrixRows = []

  if (
    row.denoise === true &&
    classification.receiverConfidenceMode === 'confidence-guided' &&
    classification.sampleCost === 'product-preset' &&
    classification.resolution === 'half-res' &&
    classification.computeMode === 'compute-off' &&
    classification.temporalMode === 'temporal-off' &&
    row.vbaoReconstructionStage !== 'confidence' &&
    row.cleanupMode !== 'skip' &&
    row.vbaoCleanupMode !== 'skip'
  ) {
    matrixRows.push('confidence-guided-candidate')
  }
  if (classification.receiverConfidenceMode === 'scalar-control') matrixRows.push('scalar-control')
  if (row.sampleMode === 'same-cost-3x10') matrixRows.push('same-cost-3x10')
  if (row.sampleMode === 'same-cost-2x16') matrixRows.push('same-cost-2x16')
  if (classification.resolution === 'full-res') matrixRows.push('full-res-product-control')
  if (classification.computeMode === 'compute-off') matrixRows.push('compute-off-control')
  if (classification.computeMode === 'sector-confidence-smoke') {
    matrixRows.push('compute-smoke-observability')
  }
  if (classification.temporalMode === 'temporal-off') matrixRows.push('temporal-off-baseline')
  if (classification.temporalMode === 'velocity-internal') matrixRows.push('velocity-internal-private')

  if (row.vbaoReconstructionStage === 'confidence') matrixRows.push('confidence-diagnostic')
  if (row.denoise === false) matrixRows.push('raw-debug-diagnostic')
  if (row.cleanupMode === 'skip' || row.vbaoCleanupMode === 'skip') matrixRows.push('cleanup-skip-control')
  if (!AO_DEFAULT_PRODUCT_NOISE_SOURCES.includes(row.noiseSource)) matrixRows.push('noise-source-control')
  if (row.sampleMode === 'spatial-ultra') matrixRows.push('spatial-extra-samples-control')
  if (row.sampleMode === 'debug-override') matrixRows.push('debug-sample-control')

  return matrixRows.length === 0 ? ['unclassified-vbao-row'] : matrixRows
}

function matrixRoleForRow(row, classification, matrixRows) {
  if (row.mode !== 'vbao') return 'comparison'
  if (classification.computeMode === 'sector-confidence-smoke') return 'observability'
  if (classification.temporalMode === 'velocity-internal' || classification.temporalMode === 'host') {
    return 'private'
  }
  if (matrixRows.some((id) => id.endsWith('-diagnostic'))) return 'diagnostic'
  if (
    matrixRows.some(
      (id) =>
        id.includes('control') ||
        id.startsWith('same-cost') ||
        id === 'scalar-control' ||
        id === 'full-res-product-control',
    )
  ) {
    const onlyAxisControls = matrixRows.every(
      (id) =>
        id === 'compute-off-control' ||
        id === 'temporal-off-baseline' ||
        id === 'confidence-guided-candidate',
    )
    return onlyAxisControls && matrixRows.includes('confidence-guided-candidate')
      ? 'candidate'
      : 'control'
  }
  if (matrixRows.includes('confidence-guided-candidate')) return 'candidate'
  return 'candidate'
}

function promotionBoundaryForRole(role) {
  switch (role) {
    case 'candidate':
      return 'eligible-after-reference-threshold-and-same-cost-gates'
    case 'control':
      return 'control-only'
    case 'observability':
      return 'observability-only'
    case 'private':
      return 'private-only'
    case 'diagnostic':
      return 'diagnostic-only'
    case 'comparison':
      return 'comparison-only'
    default:
      return 'unclassified'
  }
}

export function classifyVbaoProductQualityMatrixRow(row) {
  const classification = {
    receiverConfidenceMode: receiverConfidenceModeForRow(row),
    sampleCost: sampleCostForRow(row),
    resolution: resolutionLaneForRow(row),
    computeMode: computeModeForRow(row),
    temporalMode: temporalModeForRow(row),
  }
  const matrixRows = matrixRowIdsForClassification(row, classification)
  const matrixRole = matrixRoleForRow(row, classification, matrixRows)

  return {
    ...classification,
    matrixRole,
    matrixRows,
    promotionBoundary: promotionBoundaryForRole(matrixRole),
  }
}

export function createVbaoProductQualityMatrixStatusRows(rows) {
  return rows
    .filter((row) => row.mode === 'vbao')
    .map((row) => ({
      label: row.label,
      ...classifyVbaoProductQualityMatrixRow(row),
    }))
}

function fixedVerdictForMatrixRole(role) {
  switch (role) {
    case 'control':
      return 'control-only'
    case 'observability':
      return 'observability-only'
    case 'private':
      return 'private-only'
    case 'diagnostic':
      return 'diagnostic-only'
    default:
      return null
  }
}

function blockingFailureLabels(row) {
  const labels = row.failureLabels ?? classifyFailureLabels(row)
  return labels.filter((label) => label !== 'none')
}

function computeInventoryForRow(row) {
  const inventory = row.computeCandidateInventory ?? row.latest?.vbaoComputeCandidateInventory ?? []
  return Array.isArray(inventory) ? inventory : []
}

function uniqueInventoryValues(inventory, keys) {
  const values = inventory
    .flatMap((target) => keys.map((key) => target?.[key]))
    .filter((value) => value !== undefined && value !== null && value !== '')
  return [...new Set(values)].join(',') || 'n/a'
}

function formatComputeCandidateTiming(row) {
  const timing = row.computeCandidateTiming ?? row.latest?.vbaoComputeCandidateTiming
  if (timing === undefined || timing === null) return 'n/a'

  const pass = timing.pass ?? 'compute'
  const status = timing.status ?? 'unknown'
  if (typeof timing.cpuMs === 'number') return `${pass}:${status}:cpu ${timing.cpuMs.toFixed(3)} ms`
  if (typeof timing.gpuMs === 'number') return `${pass}:${status}:gpu ${timing.gpuMs.toFixed(3)} ms`
  return `${pass}:${status}:n/a`
}

export function createProductThresholdGateRows(rows, options = {}) {
  const thresholdRows = options.thresholdRows
  if (thresholdRows !== undefined) return thresholdRows

  return rows.filter(isReferenceGateProductRow).map((row) => ({
    label: row.label,
    status: 'incomplete',
    blockers: ['thresholdGate'],
  }))
}

export function createProductPromotionVerdictRows(rows, options = {}) {
  const evidenceArtifactRows = options.evidenceArtifactRows ?? createEvidenceArtifactStatusRows(rows)
  const referenceGateRows = options.referenceGateRows ?? createReferenceGateStatusRows(rows)
  const thresholdGateRows = createProductThresholdGateRows(rows, {
    thresholdRows: options.thresholdGateRows,
  })
  const evidenceByLabel = new Map(evidenceArtifactRows.map((row) => [row.label, row]))
  const referenceByLabel = new Map(referenceGateRows.map((row) => [row.label, row]))
  const thresholdByLabel = new Map(thresholdGateRows.map((row) => [row.label, row]))

  return rows.filter(isReferenceGateProductRow).map((row) => {
    const evidence = evidenceByLabel.get(row.label)
    const reference = referenceByLabel.get(row.label)
    const threshold = thresholdByLabel.get(row.label)
    const failures = blockingFailureLabels(row)
    const matrix = classifyVbaoProductQualityMatrixRow(row)
    const fixedVerdict = fixedVerdictForMatrixRole(matrix.matrixRole)
    const blockers = []

    if (evidence === undefined || evidence.status !== 'complete') {
      blockers.push(...(evidence?.missing ?? ['evidenceArtifact']))
    }
    if (reference === undefined || reference.status !== 'compared') {
      blockers.push(reference?.status ?? 'referenceGate')
    }
    if (threshold === undefined || threshold.status !== 'pass') {
      const thresholdBlockers = threshold?.blockers ?? []
      blockers.push(
        ...(thresholdBlockers.length > 0
          ? thresholdBlockers
          : [threshold?.status ?? 'thresholdGate']),
      )
    }
    if (failures.length > 0) {
      blockers.push(...failures.map((label) => `failureLabel.${label}`))
    }
    const hasFailureBlocker = blockers.some((blocker) =>
      String(blocker).startsWith('failureLabel.'),
    )
    const hasThresholdFailureBlocker = threshold?.status === 'fail'

    return {
      label: row.label,
      scene: row.scene ?? 'n/a',
      resolution:
        row.resolution === undefined
          ? 'n/a'
          : `${row.resolution.width}x${row.resolution.height}`,
      view: row.view ?? 'n/a',
      algorithm: row.mode,
      output: promotionOutputLabelForRow(row),
      matrixRole: matrix.matrixRole,
      matrixRows: matrix.matrixRows,
      promotionBoundary: matrix.promotionBoundary,
      verdict: fixedVerdict ?? (blockers.length === 0
          ? 'pass'
          : hasFailureBlocker || hasThresholdFailureBlocker
            ? 'fail'
            : 'incomplete'),
      blockers,
    }
  })
}

function outputLabelForRow(row) {
  if (row.mode === 'vbao' && row.vbaoReconstructionStage === 'confidence') {
    return 'confidence-diagnostic'
  }
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

export function createRenderedProxyReferenceComparisonRows(rows, options = {}) {
  const thinGeometryProxyRows =
    options.thinGeometryProxyRows ?? createRenderedThinGeometryProxyRows(rows)
  const referenceGateRows = options.referenceGateRows ?? createReferenceGateStatusRows(rows)
  const referenceByLabel = new Map(referenceGateRows.map((row) => [row.label, row]))

  return thinGeometryProxyRows.map((row) => {
    const reference = referenceByLabel.get(row.label)
    const blockers = []
    if (row.status !== 'complete') blockers.push(...row.missing)
    if (reference === undefined) {
      blockers.push('referenceGate')
    } else if (reference.status !== 'compared') {
      blockers.push(reference.status)
      blockers.push(
        ...(reference.missingRequiredFixtureIds ?? []).map((fixtureId) => `fixture.${fixtureId}`),
      )
    }

    return {
      label: row.label,
      view: row.view ?? 'n/a',
      output: row.output,
      vbaoResolution: row.vbaoResolution,
      proxyStatus: row.status,
      referenceStatus: reference?.status ?? 'missing-reference-observation',
      observedFixtureCount: reference?.observedFixtureCount ?? 0,
      missingRequiredFixtureIds: reference?.missingRequiredFixtureIds ?? [],
      status: blockers.length === 0 ? 'compared' : 'blocked',
      blockers,
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
    inventory.aoHistory?.lifetime === 'reset-on-first-frame-resize-explicit-reset' &&
    inventory.diagnostics?.owner === 'VBAOVelocityTemporalNode' &&
    inventory.diagnostics?.format === 'RGBAFormat' &&
    inventory.diagnostics?.type === 'HalfFloatType' &&
    inventory.diagnostics?.lifetime === 'active-vbao-pipeline' &&
    inventory.velocity?.owner === 'host-pass' &&
    inventory.velocity?.source === 'mrt-velocity' &&
    inventory.velocity?.convention === 'historyUv = uv - velocity.xy * vec2(0.5, -0.5)' &&
    inventory.velocity?.lifetime === 'host-pass-current-frame' &&
    inventory.previousDepth?.owner === 'host-pass' &&
    inventory.previousDepth?.source === "PassNode.getPreviousTextureNode('depth')" &&
    inventory.previousDepth?.lifetime === 'host-pass-previous-frame' &&
    inventory.previousNormal?.owner === 'host-pass' &&
    inventory.previousNormal?.source === "PassNode.getPreviousTextureNode('output')" &&
    inventory.previousNormal?.lifetime === 'host-pass-previous-frame'
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

function isVelocityTemporalProductRow(row) {
  return row.mode === 'vbao' && row.denoise === true && row.temporalMode === 'velocity-internal'
}

function hasMeasuredPassTiming(row, passName) {
  return (row.passTimings ?? []).some(
    (passTiming) =>
      passTiming.pass === passName &&
      passTiming.status === 'measured' &&
      isFiniteNumber(passTiming.gpuMs),
  )
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
    if (isVelocityTemporalProductRow(row)) {
      for (const passName of ['temporal', 'diagnostics']) {
        if (!hasMeasuredPassTiming(row, passName)) missing.push(`passTimings.${passName}`)
      }
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
    const outputLabel = outputLabelForRow(row)
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
    const outputLabel = outputLabelForRow(row)
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
  lines.push(
    '| Row | Candidate | Backend | Storage targets | Target formats | Lifetimes | Dispatch timing |',
  )
  lines.push('| --- | --- | --- | --- | --- | --- | --- |')
  const computeRows = report.rows.filter((row) => row.mode === 'vbao')
  if (computeRows.length === 0) {
    lines.push('| n/a | n/a | n/a | n/a | n/a | n/a | n/a |')
  } else {
    for (const row of computeRows) {
      const inventory = computeInventoryForRow(row)
      const inventoryLabel = inventory
        .map((target) => `${target.name ?? 'unknown'}:${target.role ?? 'unknown'}`)
        .join(',')
      const backend =
        row.computeCandidateBackend ??
        row.backend ??
        row.latest?.rendererBackend ??
        uniqueInventoryValues(inventory, ['backend'])
      const targetFormats = uniqueInventoryValues(inventory, ['targetFormat', 'format'])
      const targetLifetimes = uniqueInventoryValues(inventory, ['targetLifetime', 'lifetime'])
      const dispatchTiming = formatComputeCandidateTiming(row)
      lines.push(
        `| ${row.label ?? 'n/a'} | ${row.computeCandidateLabel ?? row.latest?.vbaoComputeCandidateLabel ?? 'n/a'} | ${backend} | ${inventoryLabel.length === 0 ? 'none' : inventoryLabel} | ${targetFormats} | ${targetLifetimes} | ${dispatchTiming} |`,
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
  const productQualityMatrixRows =
    report.productQualityMatrixRows ?? createVbaoProductQualityMatrixStatusRows(report.rows)
  const thresholdGateRows =
    report.thresholdGate?.productRows ?? createProductThresholdGateRows(report.rows)
  const productPromotionRows =
    report.productPromotionRows ??
    createProductPromotionVerdictRows(report.rows, {
      evidenceArtifactRows,
      referenceGateRows,
      thresholdGateRows,
    })
  const reconstructionStageRows =
    report.reconstructionGate?.stageRows ?? createVbaoReconstructionStageStatusRows(report.rows)
  const thinGeometryRows =
    report.thinGeometryProxyRows ?? createRenderedThinGeometryProxyRows(report.rows)
  const renderedProxyReferenceRows =
    report.renderedProxyReferenceRows ??
    createRenderedProxyReferenceComparisonRows(report.rows, {
      referenceGateRows,
      thinGeometryProxyRows: thinGeometryRows,
    })
  const outputReport = {
    ...report,
    evidenceArtifactRows,
    productQualityMatrix: VBAO_PRODUCT_QUALITY_MATRIX,
    productQualityMatrixRows,
    productPromotionRows,
    renderedProxyReferenceRows,
    thresholdGate: {
      ...report.thresholdGate,
      productRows: thresholdGateRows,
    },
    reconstructionGate: {
      ...report.reconstructionGate,
      stageRows: reconstructionStageRows,
    },
    referenceGate: {
      ...report.referenceGate,
      productRows: referenceGateRows,
    },
    thinGeometryProxyRows: thinGeometryRows,
  }

  await writeFile(outputJson, `${JSON.stringify(outputReport, null, 2)}\n`)
  lines.push('')
  lines.push('## VBAO Product Quality Matrix')
  lines.push('')
  lines.push(
    'This frozen matrix separates the current candidate from controls, private evidence, and observability rows. Matrix rows can share axes such as compute-off or temporal-off; only candidate rows can ever become product-promotion passes.',
  )
  lines.push('')
  lines.push('| Matrix row | Role | Receiver confidence | Sample cost | Resolution | Compute | Temporal | Promotion boundary |')
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const row of VBAO_PRODUCT_QUALITY_MATRIX) {
    lines.push(
      `| ${row.id} | ${row.role} | ${row.receiverConfidence} | ${row.sampleCost} | ${row.resolution} | ${row.compute} | ${row.temporal} | ${row.promotionBoundary} |`,
    )
  }
  lines.push('')
  lines.push('| Report row | Matrix role | Matrix rows | Receiver confidence | Sample cost | Resolution | Compute | Temporal | Promotion boundary |')
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  if (productQualityMatrixRows.length === 0) {
    lines.push('| n/a | comparison | none | n/a | n/a | n/a | n/a | n/a | comparison-only |')
  } else {
    for (const row of productQualityMatrixRows) {
      lines.push(
        `| ${row.label ?? 'n/a'} | ${row.matrixRole} | ${row.matrixRows.join(',')} | ${row.receiverConfidenceMode} | ${row.sampleCost} | ${row.resolution} | ${row.computeMode} | ${row.temporalMode} | ${row.promotionBoundary} |`,
      )
    }
  }
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
  lines.push('## VBAO Rendered Proxy vs Reference Observation Gate')
  lines.push('')
  lines.push(
    'Rendered thin-gap, edge-bleed, and stripe proxies are compared against reference observation coverage by product row. Complete screenshot proxies still block when required fixture observations are missing.',
  )
  lines.push('')
  lines.push('| Row | View | Output | VBAO res | Proxy status | Reference status | Observed fixtures | Missing required fixtures | Status | Blockers |')
  lines.push('| --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- |')
  if (renderedProxyReferenceRows.length === 0) {
    lines.push('| n/a | n/a | n/a | n/a | incomplete | missing-reference-observation | 0 | all | blocked | vbao-rendered-row |')
  } else {
    for (const row of renderedProxyReferenceRows) {
      lines.push(
        `| ${row.label ?? 'n/a'} | ${row.view} | ${row.output} | ${row.vbaoResolution} | ${row.proxyStatus} | ${row.referenceStatus} | ${row.observedFixtureCount} | ${row.missingRequiredFixtureIds.join(', ') || 'none'} | ${row.status} | ${row.blockers.length === 0 ? 'none' : row.blockers.join(',')} |`,
      )
    }
  }
  lines.push('')
  lines.push('## AO Product Promotion Verdict')
  lines.push('')
  lines.push(
    'A row can pass only when it is candidate product evidence with complete artifacts, complete required reference fixture coverage, passing thresholds, and no blocking failure labels. Controls, diagnostics, private lanes, and observability lanes stay non-promotable.',
  )
  lines.push('')
  lines.push('| Product row | Scene | Resolution | View | Algorithm | Output | Matrix role | Matrix rows | Verdict | Blockers |')
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  if (productPromotionRows.length === 0) {
    lines.push('| n/a | n/a | n/a | n/a | n/a | n/a | comparison | none | incomplete | product-row |')
  } else {
    for (const row of productPromotionRows) {
      lines.push(
        `| ${row.label ?? 'n/a'} | ${row.scene} | ${row.resolution} | ${row.view} | ${row.algorithm} | ${row.output} | ${row.matrixRole} | ${row.matrixRows.join(',')} | ${row.verdict} | ${row.blockers.length === 0 ? 'none' : row.blockers.join(',')} |`,
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
  lines.push('| Product row | Algorithm | Output | Observed fixtures | Missing required fixtures | Status |')
  lines.push('| --- | --- | --- | ---: | --- | --- |')
  if (referenceGateRows.length === 0) {
    lines.push('| n/a | n/a | n/a | 0 | all | missing-reference-observation |')
  } else {
    for (const row of referenceGateRows) {
      lines.push(
        `| ${row.label ?? 'n/a'} | ${row.algorithm} | ${row.output} | ${row.observedFixtureCount ?? 0} | ${row.missingRequiredFixtureIds?.join(', ') || 'none'} | ${row.status} |`,
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
