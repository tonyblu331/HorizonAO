export const AO_FAILURE_LABELS: readonly [
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

export interface AOReportRowForFailureLabels {
  mode?: string
  fullResolutionVbao?: boolean
  denoise?: boolean
  productOutputContract?: string
  vbaoFilter?: unknown
  vbaoDenoiseFilter?: unknown
}

export function classifyFailureLabels(row: AOReportRowForFailureLabels): string[]

export const AO_REFERENCE_GATE_MODES: readonly ['vbao', 'gtao', 'ssao', 'n8ao']

export const AO_REQUIRED_REFERENCE_FIXTURE_IDS: readonly [
  'flat-plane-open',
  'box-contact',
  'two-wall-corner',
  'broad-wall-contact',
  'thin-gap-separated-slabs',
  'grazing-surface-wall',
  'normal-sensitive-side-contact',
]

export const VBAO_RECONSTRUCTION_STAGES: readonly [
  'raw',
  'cleanup',
  'resolve',
  'polish',
  'final',
]

export const VBAO_RECONSTRUCTION_DIAGNOSTIC_STAGES: readonly ['confidence']

export const AO_DEFAULT_PRODUCT_SAMPLE_MODES: readonly [undefined, 'product-preset', 'n/a']

export const AO_DEFAULT_PRODUCT_NOISE_SOURCES: readonly [
  undefined,
  'phase-atlas-stable-hash',
  'n/a',
]

export type VbaoProductQualityMatrixRole =
  | 'candidate'
  | 'control'
  | 'baseline'
  | 'observability'
  | 'private'

export interface VbaoProductQualityMatrixDefinitionRow {
  readonly id: string
  readonly role: VbaoProductQualityMatrixRole
  readonly receiverConfidence: string
  readonly sampleCost: string
  readonly resolution: string
  readonly compute: string
  readonly temporal: string
  readonly promotionBoundary: string
}

export const VBAO_PRODUCT_QUALITY_MATRIX: readonly VbaoProductQualityMatrixDefinitionRow[]

export type VbaoProductQualityReportMatrixRole =
  | 'candidate'
  | 'control'
  | 'observability'
  | 'private'
  | 'diagnostic'
  | 'comparison'

export interface VbaoProductQualityMatrixInputRow {
  label?: string
  mode?: string
  denoise?: boolean
  sampleMode?: string
  noiseSource?: string
  vbaoResolution?: string
  fullResolutionVbao?: boolean
  temporalMode?: string
  receiverConfidenceMode?: string
  computeCandidateLabel?: string
  cleanupMode?: string
  vbaoCleanupMode?: string
  vbaoReconstructionStage?: string
  latest?: {
    vbaoReceiverConfidenceMode?: string
    vbaoComputeCandidateLabel?: string
  }
}

export interface VbaoProductQualityMatrixStatusRow {
  label?: string
  receiverConfidenceMode: string
  sampleCost: string
  resolution: string
  computeMode: string
  temporalMode: string
  matrixRole: VbaoProductQualityReportMatrixRole
  matrixRows: string[]
  promotionBoundary: string
}

export function classifyVbaoProductQualityMatrixRow(
  row: VbaoProductQualityMatrixInputRow,
): Omit<VbaoProductQualityMatrixStatusRow, 'label'>

export function createVbaoProductQualityMatrixStatusRows(
  rows: VbaoProductQualityMatrixInputRow[],
): VbaoProductQualityMatrixStatusRow[]

export interface VbaoReconstructionStageEvidence {
  stage:
    | (typeof VBAO_RECONSTRUCTION_STAGES)[number]
    | (typeof VBAO_RECONSTRUCTION_DIAGNOSTIC_STAGES)[number]
  failureLabels: string[]
}

export interface VbaoReconstructionStageStatusInputRow {
  label?: string
  mode: string
  denoise?: boolean
  fullResolutionVbao?: boolean
  reconstructionStages?: VbaoReconstructionStageEvidence[]
}

export interface VbaoReconstructionStageStatusRow {
  label?: string
  status: 'complete' | 'incomplete'
  missingStages: string[]
  firstFailingStage: string | null
}

export function createVbaoReconstructionStageStatusRows(
  rows: VbaoReconstructionStageStatusInputRow[],
): VbaoReconstructionStageStatusRow[]

export interface AOReferenceGateObservation {
  fixtureId: string
}

export interface AOReportRowForReferenceGate {
  label?: string
  mode: string
  view?: string
  denoise?: boolean
  referenceObservations?: AOReferenceGateObservation[]
  referenceGate?: {
    observations?: AOReferenceGateObservation[]
  }
}

export interface AOReferenceGateStatusRow {
  label?: string
  algorithm: string
  output: string
  observedFixtureCount: number
  missingRequiredFixtureIds: string[]
  status: 'compared' | 'missing-reference-observation' | 'missing-required-observation'
}

export function createReferenceGateStatusRows(
  rows: AOReportRowForReferenceGate[],
): AOReferenceGateStatusRow[]

export interface AORenderedThinGeometryProxyInputRow {
  label?: string
  mode: string
  view?: string
  denoise?: boolean
  vbaoResolution?: string
  fullResolutionVbao?: boolean
  productOutputContract?: string
  vbaoFilter?: string
  vbaoDenoiseFilter?: string
  failureLabels?: string[]
  qualityMetrics?: {
    thinGapPreservationProxy?: number
    edgeBleedProxy?: number
    stripeScore?: number
  }
}

export interface AORenderedThinGeometryProxyRow {
  label?: string
  view?: string
  output: string
  vbaoResolution: string
  thinGapProxy: number | null
  edgeBleedProxy: number | null
  stripeScore: number | null
  failureLabels: string[]
  status: 'complete' | 'incomplete'
  missing: string[]
}

export function createRenderedThinGeometryProxyRows(
  rows: AORenderedThinGeometryProxyInputRow[],
): AORenderedThinGeometryProxyRow[]

export interface AORenderedProxyReferenceComparisonRow {
  label?: string
  view: string
  output: string
  vbaoResolution: string
  proxyStatus: 'complete' | 'incomplete'
  referenceStatus: 'compared' | 'missing-reference-observation' | 'missing-required-observation'
  observedFixtureCount: number
  missingRequiredFixtureIds: string[]
  status: 'compared' | 'blocked'
  blockers: string[]
}

export function createRenderedProxyReferenceComparisonRows(
  rows: AORenderedThinGeometryProxyInputRow[],
  options?: {
    thinGeometryProxyRows?: AORenderedThinGeometryProxyRow[]
    referenceGateRows?: AOReferenceGateStatusRow[]
  },
): AORenderedProxyReferenceComparisonRow[]

export interface AOEvidenceArtifactStatusInputRow {
  label?: string
  mode?: string
  temporalMode?: string
  receiverConfidenceMode?: string
  denoise?: boolean
  fullResolutionVbao?: boolean
  vbaoReconstructionStage?: (typeof VBAO_RECONSTRUCTION_STAGES)[number] | string
  temporalDiagnostics?: unknown
  temporalTargetInventory?: unknown
  computeCandidateLabel?: string
  computeCandidateInventory?: unknown
  computeCandidateTiming?: unknown
  temporalResetEvidenceReason?: string
  screenshotPath?: string
  latest?: {
    medianFrameMs?: number
    p95FrameMs?: number
    vbaoTemporalDiagnostics?: unknown
    vbaoTemporalTargetInventory?: unknown
    vbaoComputeCandidateLabel?: string
    vbaoComputeCandidateInventory?: unknown
    vbaoComputeCandidateTiming?: unknown
  }
  reconstructionStages?: VbaoReconstructionStageEvidence[]
  passTimings?: Array<{
    pass?: string
    status: string
    gpuMs?: number | null
  }>
}

export interface AOEvidenceArtifactStatusRow {
  label?: string
  status: 'complete' | 'incomplete'
  missing: string[]
}

export function createEvidenceArtifactStatusRows(
  rows: AOEvidenceArtifactStatusInputRow[],
): AOEvidenceArtifactStatusRow[]

export interface AOProductPromotionVerdictInputRow
  extends AOReportRowForReferenceGate,
    AOEvidenceArtifactStatusInputRow,
    AOReportRowForFailureLabels {
  sampleMode?: string
  scene?: string
  resolution?: { width: number; height: number }
  view?: string
  temporalMode?: string
  computeCandidateLabel?: string
  noiseSource?: string
  cleanupMode?: string
  vbaoCleanupMode?: string
  failureLabels?: string[]
  latest?: AOEvidenceArtifactStatusInputRow['latest']
}

export interface AOProductPromotionVerdictRow {
  label?: string
  scene: string
  resolution: string
  view: string
  algorithm: string
  output: string
  matrixRole: VbaoProductQualityReportMatrixRole
  matrixRows: string[]
  promotionBoundary: string
  verdict:
    | 'pass'
    | 'fail'
    | 'incomplete'
    | 'candidate-only'
    | 'control-only'
    | 'observability-only'
    | 'private-only'
    | 'diagnostic-only'
  blockers: string[]
}

export interface AOProductThresholdGateRow {
  label?: string
  status: 'pass' | 'fail' | 'incomplete'
  blockers: string[]
}

export function createProductThresholdGateRows(
  rows: AOProductPromotionVerdictInputRow[],
  options?: {
    thresholdRows?: AOProductThresholdGateRow[]
  },
): AOProductThresholdGateRow[]

export function createProductPromotionVerdictRows(
  rows: AOProductPromotionVerdictInputRow[],
  options?: {
    evidenceArtifactRows?: AOEvidenceArtifactStatusRow[]
    referenceGateRows?: AOReferenceGateStatusRow[]
    thresholdGateRows?: AOProductThresholdGateRow[]
  },
): AOProductPromotionVerdictRow[]

export function writeProductionQualityReports(args: {
  outputJson: string
  outputMd: string
  report: {
    generatedAt: string
    evidenceArtifactRows?: AOEvidenceArtifactStatusRow[]
    productQualityMatrixRows?: VbaoProductQualityMatrixStatusRow[]
    productPromotionRows?: AOProductPromotionVerdictRow[]
    renderedProxyReferenceRows?: AORenderedProxyReferenceComparisonRow[]
    thresholdGate?: {
      productRows?: AOProductThresholdGateRow[]
    }
    reconstructionGate?: {
      stageRows?: VbaoReconstructionStageStatusRow[]
    }
    referenceGate?: {
      productRows?: AOReferenceGateStatusRow[]
    }
    thinGeometryProxyRows?: AORenderedThinGeometryProxyRow[]
    rows: Array<{
      label?: string
      mode: string
      denoise?: boolean
      vbaoResolution?: string
      fullResolutionVbao?: boolean
      temporalMode?: string
      receiverConfidenceMode?: string
      sampleMode?: string
      noiseSource?: string
      cleanupMode?: string
      vbaoCleanupMode?: string
      temporalDiagnostics?: unknown
      temporalTargetInventory?: unknown
      computeCandidateLabel?: string
      computeCandidateInventory?: unknown
      computeCandidateTiming?: unknown
      temporalResetEvidenceReason?: string
      hostTaaMode?: string
      view: string
      resolution: { width: number; height: number }
      referenceObservations?: AOReferenceGateObservation[]
      referenceGate?: {
        observations?: AOReferenceGateObservation[]
      }
      reconstructionStages?: VbaoReconstructionStageEvidence[]
      passTimings?: Array<{
        pass: string
        status: string
        gpuMs?: number | null
        cpuMs?: number | null
      }>
      screenshotPath?: string
      latest?: {
        medianFrameMs?: number
        p95FrameMs?: number
        vbaoTemporalDiagnostics?: unknown
        vbaoTemporalTargetInventory?: unknown
        vbaoComputeCandidateLabel?: string
        vbaoComputeCandidateInventory?: unknown
        vbaoComputeCandidateTiming?: unknown
        vbaoReceiverConfidenceMode?: string
      }
      qualityMetrics: {
        patternNoiseScore: number
        stripeScore: number
        horizontalStripeScore: number
        verticalStripeScore: number
        directionalAnisotropy: number
        edgeBleedProxy: number
        thinGapPreservationProxy: number
      }
    }>
  }
}): Promise<void>
