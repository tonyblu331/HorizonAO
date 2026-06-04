import type { RaycastAoFixtureId } from './aoRaycastReference'
import {
  createAoReferenceReport,
  formatAoReferenceReportMarkdown,
  type AoReferenceObservation,
  type AoReferenceObservationSource,
  type AoReferenceReport,
  type AoReferenceThresholds,
  type CreateAoReferenceReportOptions,
} from './aoReferenceReport'
import {
  createVbaoCanonicalDriftReport,
  formatVbaoCanonicalDriftReportMarkdown,
  type VbaoCanonicalDriftReport,
  type VbaoCanonicalDriftThresholds,
} from './vbaoCanonicalDriftReport'

export const AO_PRODUCTION_REFERENCE_ALGORITHMS = ['vbao', 'gtao', 'ssao', 'n8ao'] as const

export type AoProductionReferenceAlgorithm = (typeof AO_PRODUCTION_REFERENCE_ALGORITHMS)[number]

const AO_PRODUCTION_REFERENCE_EXPECTED_ALGORITHMS: readonly string[] = [
  'vbao-raw',
  'vbao-product',
  'gtao',
  'ssao',
  'n8ao',
]

export type AoProductionReferenceGateStatus = 'compared' | 'missing-reference-observation'

export interface AoProductionReferenceObservation {
  readonly fixtureId: RaycastAoFixtureId
  readonly accessibility: number
  readonly source?: AoReferenceObservationSource
  readonly note?: string
}

export interface AoProductionReferenceGateInputRow {
  readonly label?: string
  readonly mode?: string
  readonly algorithm?: string
  readonly view?: string
  readonly viewMode?: string
  readonly denoise?: boolean
  readonly denoiseEnabled?: boolean
  readonly referenceObservations?: readonly AoProductionReferenceObservation[]
  readonly referenceGate?: {
    readonly observations?: readonly AoProductionReferenceObservation[]
  }
}

export interface AoProductionReferenceGateRow {
  readonly label: string
  readonly algorithm: AoProductionReferenceAlgorithm
  readonly output: string
  readonly observedFixtureCount: number
  readonly status: AoProductionReferenceGateStatus
}

export interface AoProductionReferenceGateReport {
  readonly generatedAt: string
  readonly basis: string
  readonly productRows: readonly AoProductionReferenceGateRow[]
  readonly raycastReport: AoReferenceReport
  readonly canonicalVbaoDriftReport: VbaoCanonicalDriftReport
}

export interface CreateAoProductionReferenceGateOptions {
  readonly generatedAt?: string
  readonly sampleCount?: number
  readonly raycastThresholds?: Partial<AoReferenceThresholds>
  readonly canonicalThresholds?: Partial<VbaoCanonicalDriftThresholds>
}

function normalizeAlgorithm(value: string | undefined): AoProductionReferenceAlgorithm | null {
  if (value === undefined) return null
  return AO_PRODUCTION_REFERENCE_ALGORITHMS.find((algorithm) => algorithm === value) ?? null
}

function isAoView(row: AoProductionReferenceGateInputRow): boolean {
  const view = row.view ?? row.viewMode
  return view === undefined || view === 'ao'
}

function isProductOutput(
  row: AoProductionReferenceGateInputRow,
  algorithm: AoProductionReferenceAlgorithm,
): boolean {
  const denoise = row.denoise ?? row.denoiseEnabled

  if (algorithm === 'n8ao') return denoise !== false
  return denoise === true
}

function outputLabel(
  row: AoProductionReferenceGateInputRow,
  algorithm: AoProductionReferenceAlgorithm,
): string {
  const denoise = row.denoise ?? row.denoiseEnabled

  if (algorithm === 'vbao') return denoise ? 'product' : 'raw-debug'
  if (algorithm === 'n8ao') return denoise === false ? 'raw' : 'internally-filtered'
  return denoise ? 'denoised' : 'raw'
}

function comparableAlgorithm(
  row: AoProductionReferenceGateInputRow,
): AoProductionReferenceAlgorithm | null {
  const algorithm = normalizeAlgorithm(row.mode ?? row.algorithm)
  if (algorithm === null) return null
  if (!isAoView(row)) return null
  if (algorithm === 'vbao') return algorithm
  if (!isProductOutput(row, algorithm)) return null
  return algorithm
}

function raycastAlgorithmLabel(
  row: AoProductionReferenceGateInputRow,
  algorithm: AoProductionReferenceAlgorithm,
): string {
  if (algorithm !== 'vbao') return algorithm
  return outputLabel(row, algorithm) === 'product' ? 'vbao-product' : 'vbao-raw'
}

function rowObservations(
  row: AoProductionReferenceGateInputRow,
): readonly AoProductionReferenceObservation[] {
  return row.referenceObservations ?? row.referenceGate?.observations ?? []
}

function compareRow(
  row: AoProductionReferenceGateInputRow,
  algorithm: AoProductionReferenceAlgorithm,
): {
  readonly gateRow: AoProductionReferenceGateRow
  readonly observations: readonly AoReferenceObservation[]
} {
  const observations = rowObservations(row)
  const label = row.label ?? `${algorithm}-${outputLabel(row, algorithm)}`

  return {
    gateRow: {
      label,
      algorithm,
      output: outputLabel(row, algorithm),
      observedFixtureCount: new Set(observations.map((observation) => observation.fixtureId)).size,
      status: observations.length > 0 ? 'compared' : 'missing-reference-observation',
    },
    observations: observations.map(
      (observation): AoReferenceObservation => ({
        fixtureId: observation.fixtureId,
        algorithm: raycastAlgorithmLabel(row, algorithm),
        accessibility: observation.accessibility,
        source: observation.source ?? 'gpu-readback',
        note: observation.note ?? label,
      }),
    ),
  }
}

export function createAoProductionReferenceGateReport(
  rows: readonly AoProductionReferenceGateInputRow[],
  options: CreateAoProductionReferenceGateOptions = {},
): AoProductionReferenceGateReport {
  const generatedAt = options.generatedAt ?? new Date().toISOString()
  const productRows: AoProductionReferenceGateRow[] = []
  const observations: AoReferenceObservation[] = []

  for (const row of rows) {
    const algorithm = comparableAlgorithm(row)
    if (algorithm === null) continue

    const comparison = compareRow(row, algorithm)
    productRows.push(comparison.gateRow)
    observations.push(...comparison.observations)
  }
  const raycastOptions: CreateAoReferenceReportOptions = {
    generatedAt,
    expectedAlgorithms: AO_PRODUCTION_REFERENCE_EXPECTED_ALGORITHMS,
    ...(options.sampleCount !== undefined ? { sampleCount: options.sampleCount } : {}),
    ...(options.raycastThresholds !== undefined ? { thresholds: options.raycastThresholds } : {}),
  }
  const canonicalOptions =
    options.canonicalThresholds === undefined
      ? { generatedAt }
      : { generatedAt, thresholds: options.canonicalThresholds }

  return {
    generatedAt,
    basis:
      'Production AO rows are only comparable to the ray-cast reference when they provide explicit fixture observations. Missing fixture observations are reported as gate misses, not inferred from screenshots or FPS rows.',
    productRows,
    raycastReport: createAoReferenceReport(observations, raycastOptions),
    canonicalVbaoDriftReport: createVbaoCanonicalDriftReport(canonicalOptions),
  }
}

export function formatAoProductionReferenceGateMarkdown(
  report: AoProductionReferenceGateReport,
): string {
  const lines: string[] = []
  lines.push('# AO Production Reference Gate')
  lines.push('')
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push('')
  lines.push(`Basis: ${report.basis}`)
  lines.push('')
  lines.push('| Product row | Algorithm | Output | Observed fixtures | Status |')
  lines.push('| --- | --- | --- | ---: | --- |')

  if (report.productRows.length === 0) {
    lines.push('| n/a | n/a | n/a | 0 | missing-reference-observation |')
  } else {
    for (const row of report.productRows) {
      lines.push(
        `| ${row.label} | ${row.algorithm} | ${row.output} | ${row.observedFixtureCount} | ${row.status} |`,
      )
    }
  }

  lines.push('')
  lines.push(formatAoReferenceReportMarkdown(report.raycastReport).trimEnd())
  lines.push('')
  lines.push(formatVbaoCanonicalDriftReportMarkdown(report.canonicalVbaoDriftReport).trimEnd())

  return `${lines.join('\n')}\n`
}
