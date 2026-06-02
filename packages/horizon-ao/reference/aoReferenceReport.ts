import {
  RAYCAST_AO_FIXTURES,
  evaluateRaycastAoReference,
  type RaycastAoFixtureId,
} from './aoRaycastReference'

export type AoReferenceAlgorithm = 'canonical-vbao' | 'vbao' | 'gtao' | 'ssao' | 'n8ao' | string

export type AoReferenceObservationSource =
  | 'gpu-readback'
  | 'screenshot-proxy'
  | 'analytic-proxy'
  | 'manual'

export interface AoReferenceThresholds {
  readonly warnAbsError: number
  readonly failAbsError: number
}

export interface AoReferenceObservation {
  readonly fixtureId: RaycastAoFixtureId
  readonly algorithm: AoReferenceAlgorithm
  readonly accessibility: number
  readonly source: AoReferenceObservationSource
  readonly note?: string
}

export type AoReferenceVerdict = 'pass' | 'warn' | 'fail'

export interface AoReferenceCandidateRow extends AoReferenceObservation {
  readonly referenceAccessibility: number
  readonly absError: number
  readonly verdict: AoReferenceVerdict
}

export interface AoReferenceFixtureRow {
  readonly fixtureId: RaycastAoFixtureId
  readonly description: string
  readonly referenceAccessibility: number
  readonly occludedRays: number
  readonly sampleCount: number
  readonly candidates: readonly AoReferenceCandidateRow[]
}

export interface AoReferenceAlgorithmSummary {
  readonly algorithm: AoReferenceAlgorithm
  readonly observedFixtureCount: number
  readonly missingFixtureIds: readonly RaycastAoFixtureId[]
  readonly mae: number | null
  readonly rmse: number | null
  readonly worstFixtureId: RaycastAoFixtureId | null
  readonly worstAbsError: number | null
  readonly verdict: AoReferenceVerdict | 'missing'
}

export interface AoReferenceReport {
  readonly generatedAt: string
  readonly basis: string
  readonly sampleCount: number
  readonly thresholds: AoReferenceThresholds
  readonly rows: readonly AoReferenceFixtureRow[]
  readonly summary: readonly AoReferenceAlgorithmSummary[]
}

export interface CreateAoReferenceReportOptions {
  readonly generatedAt?: string
  readonly sampleCount?: number
  readonly thresholds?: Partial<AoReferenceThresholds>
  readonly expectedAlgorithms?: readonly AoReferenceAlgorithm[]
}

const DEFAULT_REFERENCE_SAMPLE_COUNT = 4096
const DEFAULT_EXPECTED_REFERENCE_ALGORITHMS: readonly AoReferenceAlgorithm[] = [
  'canonical-vbao',
  'vbao',
  'gtao',
  'ssao',
  'n8ao',
]

const DEFAULT_REFERENCE_THRESHOLDS: AoReferenceThresholds = {
  warnAbsError: 0.08,
  failAbsError: 0.15,
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function verdictForAbsError(absError: number, thresholds: AoReferenceThresholds): AoReferenceVerdict {
  if (absError >= thresholds.failAbsError) return 'fail'
  if (absError >= thresholds.warnAbsError) return 'warn'
  return 'pass'
}

function uniqueAlgorithms(observations: readonly AoReferenceObservation[]): AoReferenceAlgorithm[] {
  return [...new Set(observations.map((observation) => observation.algorithm))].sort()
}

function summaryAlgorithms(
  observations: readonly AoReferenceObservation[],
  expectedAlgorithms: readonly AoReferenceAlgorithm[],
): AoReferenceAlgorithm[] {
  const algorithms = new Set<AoReferenceAlgorithm>()
  for (const algorithm of expectedAlgorithms) algorithms.add(algorithm)
  for (const algorithm of uniqueAlgorithms(observations)) algorithms.add(algorithm)
  return [...algorithms]
}

function summarizeAlgorithm(
  algorithm: AoReferenceAlgorithm,
  rows: readonly AoReferenceFixtureRow[],
): AoReferenceAlgorithmSummary {
  const candidateRows = rows.flatMap((row) =>
    row.candidates
      .filter((candidate) => candidate.algorithm === algorithm)
      .map((candidate) => ({ fixtureId: row.fixtureId, candidate })),
  )
  const observedFixtureIds = new Set(candidateRows.map((row) => row.fixtureId))
  const missingFixtureIds = RAYCAST_AO_FIXTURES
    .map((fixture) => fixture.id)
    .filter((id) => !observedFixtureIds.has(id))

  if (candidateRows.length === 0) {
    return {
      algorithm,
      observedFixtureCount: 0,
      missingFixtureIds,
      mae: null,
      rmse: null,
      worstFixtureId: null,
      worstAbsError: null,
      verdict: 'missing',
    }
  }

  const errors = candidateRows.map((row) => row.candidate.absError)
  const mae = errors.reduce((sum, error) => sum + error, 0) / errors.length
  const rmse = Math.sqrt(errors.reduce((sum, error) => sum + error * error, 0) / errors.length)
  const worstIndex = errors.indexOf(Math.max(...errors))
  const worst = candidateRows[worstIndex]
  const hasFail = candidateRows.some((row) => row.candidate.verdict === 'fail')
  const hasWarn = candidateRows.some((row) => row.candidate.verdict === 'warn')

  return {
    algorithm,
    observedFixtureCount: observedFixtureIds.size,
    missingFixtureIds,
    mae,
    rmse,
    worstFixtureId: worst?.fixtureId ?? null,
    worstAbsError: worst?.candidate.absError ?? null,
    verdict: hasFail ? 'fail' : hasWarn || missingFixtureIds.length > 0 ? 'warn' : 'pass',
  }
}

export function createAoReferenceReport(
  observations: readonly AoReferenceObservation[],
  options: CreateAoReferenceReportOptions = {},
): AoReferenceReport {
  const sampleCount = Math.max(1, Math.round(options.sampleCount ?? DEFAULT_REFERENCE_SAMPLE_COUNT))
  const thresholds = {
    ...DEFAULT_REFERENCE_THRESHOLDS,
    ...options.thresholds,
  }

  const observationsByFixture = new Map<RaycastAoFixtureId, AoReferenceObservation[]>()
  for (const observation of observations) {
    const bucket = observationsByFixture.get(observation.fixtureId) ?? []
    bucket.push({
      ...observation,
      accessibility: clamp01(observation.accessibility),
    })
    observationsByFixture.set(observation.fixtureId, bucket)
  }

  const rows = RAYCAST_AO_FIXTURES.map((fixture): AoReferenceFixtureRow => {
    const reference = evaluateRaycastAoReference(fixture, sampleCount)
    const fixtureObservations = observationsByFixture.get(fixture.id) ?? []
    const candidates = fixtureObservations.map((observation): AoReferenceCandidateRow => {
      const absError = Math.abs(observation.accessibility - reference.accessibility)
      return {
        ...observation,
        referenceAccessibility: reference.accessibility,
        absError,
        verdict: verdictForAbsError(absError, thresholds),
      }
    })

    return {
      fixtureId: fixture.id,
      description: fixture.description,
      referenceAccessibility: reference.accessibility,
      occludedRays: reference.occludedRays,
      sampleCount: reference.sampleCount,
      candidates,
    }
  })

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    basis:
      'Deterministic finite-radius cosine-hemisphere ray-cast AO fixtures. Candidate rows must come from explicit GPU readbacks, screenshot proxies, analytic proxies, or manual measurements; absent candidate rows are reported as missing expected algorithm coverage, not inferred.',
    sampleCount,
    thresholds,
    rows,
    summary: summaryAlgorithms(
      observations,
      options.expectedAlgorithms ?? DEFAULT_EXPECTED_REFERENCE_ALGORITHMS,
    ).map((algorithm) => summarizeAlgorithm(algorithm, rows)),
  }
}

function formatMetric(value: number | null): string {
  return value === null ? 'n/a' : value.toFixed(4)
}

export function formatAoReferenceReportMarkdown(report: AoReferenceReport): string {
  const lines: string[] = []
  lines.push('# AO Reference Fixture Report')
  lines.push('')
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push('')
  lines.push(`Basis: ${report.basis}`)
  lines.push('')
  lines.push(
    `Thresholds: warn at abs error >= ${report.thresholds.warnAbsError.toFixed(3)}, fail at abs error >= ${report.thresholds.failAbsError.toFixed(3)}.`,
  )
  lines.push('')
  lines.push('| Algorithm | Verdict | Observed fixtures | Missing fixtures | MAE ↓ | RMSE ↓ | Worst fixture | Worst abs error ↓ |')
  lines.push('| --- | --- | ---: | --- | ---: | ---: | --- | ---: |')
  for (const item of report.summary) {
    lines.push(
      `| ${item.algorithm} | ${item.verdict} | ${item.observedFixtureCount} | ${item.missingFixtureIds.join(', ') || 'none'} | ${formatMetric(item.mae)} | ${formatMetric(item.rmse)} | ${item.worstFixtureId ?? 'n/a'} | ${formatMetric(item.worstAbsError)} |`,
    )
  }
  lines.push('')
  lines.push('| Fixture | Reference | Algorithm | Observed | Abs error ↓ | Verdict | Source |')
  lines.push('| --- | ---: | --- | ---: | ---: | --- | --- |')
  for (const row of report.rows) {
    if (row.candidates.length === 0) {
      lines.push(`| ${row.fixtureId} | ${row.referenceAccessibility.toFixed(4)} | n/a | n/a | n/a | missing | n/a |`)
      continue
    }
    for (const candidate of row.candidates) {
      lines.push(
        `| ${row.fixtureId} | ${row.referenceAccessibility.toFixed(4)} | ${candidate.algorithm} | ${candidate.accessibility.toFixed(4)} | ${candidate.absError.toFixed(4)} | ${candidate.verdict} | ${candidate.source} |`,
      )
    }
  }
  lines.push('')
  lines.push('Notes:')
  lines.push('- This report is a reference gate, not a renderer performance benchmark.')
  lines.push('- N8AO, GTAO, SSAO, and VBAO rows are comparable only when their observed accessibility values come from the same fixture/camera/readback protocol.')
  lines.push('- Missing expected candidate rows produce missing or warning summaries, not passes.')

  return `${lines.join('\n')}\n`
}
