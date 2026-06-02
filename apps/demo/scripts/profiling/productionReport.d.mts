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

export const VBAO_RECONSTRUCTION_STAGES: readonly [
  'raw',
  'cleanup',
  'resolve',
  'polish',
  'final',
]

export interface VbaoReconstructionStageEvidence {
  stage: (typeof VBAO_RECONSTRUCTION_STAGES)[number]
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
  status: 'compared' | 'missing-reference-observation'
}

export function createReferenceGateStatusRows(
  rows: AOReportRowForReferenceGate[],
): AOReferenceGateStatusRow[]

export interface AOEvidenceArtifactStatusInputRow {
  label?: string
  mode?: string
  denoise?: boolean
  fullResolutionVbao?: boolean
  vbaoReconstructionStage?: (typeof VBAO_RECONSTRUCTION_STAGES)[number] | string
  screenshotPath?: string
  latest?: {
    medianFrameMs?: number
    p95FrameMs?: number
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

export function writeProductionQualityReports(args: {
  outputJson: string
  outputMd: string
  report: {
    generatedAt: string
    evidenceArtifactRows?: AOEvidenceArtifactStatusRow[]
    reconstructionGate?: {
      stageRows?: VbaoReconstructionStageStatusRow[]
    }
    referenceGate?: {
      productRows?: AOReferenceGateStatusRow[]
    }
    rows: Array<{
      label?: string
      mode: string
      denoise?: boolean
      vbaoResolution?: string
      temporalMode?: string
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
      }>
      screenshotPath?: string
      latest?: {
        medianFrameMs?: number
        p95FrameMs?: number
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
