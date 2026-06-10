/**
 * VBAO Representation Study — Candidate Estimators (P2).
 *
 * Scores four candidate AO estimators against the screen-space-achievable
 * reference (`evaluateScreenSpaceAchievableAo`) over all `RAYCAST_AO_FIXTURES`.
 * All estimators share the same oracle (`isRaycastDirectionOccluded`) so deltas
 * are apples-to-apples. No frozen modules are modified.
 *
 * Verdict rule (pre-registered D4):
 *   improvement = primaryRmse(R0-cosine) − primaryRmse(R2-dense-sweep)
 *   >= 0.02  → 'representation-bottleneck'
 *   < 0.005  → 'not-bottleneck'
 *   otherwise → 'marginal'
 */

import {
  RAYCAST_AO_FIXTURES,
  isRaycastDirectionOccluded,
  type RaycastAoFixture,
  type RaycastVec3,
} from './aoRaycastReference'
import {
  SS_AO_CAMERA_SET_ID,
  SS_AO_FIXTURE_CAMERAS,
  evaluateScreenSpaceAchievableAo,
  type SsAoCamera,
} from './aoScreenSpaceReference'
import { evaluateVbaoRepresentationEstimate } from './vbaoGroundTruthDelta'

// ─── Fixed timestamp (enables deep-equal lock) ───────────────────────────────

/** Fixed deterministic timestamp emitted in the study report. DO NOT change without re-locking the baseline. */
export const REPRESENTATION_STUDY_GENERATED_AT = '1970-01-01T00:00:00.000Z'

// ─── Vec3 helpers ─────────────────────────────────────────────────────────────

function add3(a: RaycastVec3, b: RaycastVec3): RaycastVec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

function scale3(v: RaycastVec3, s: number): RaycastVec3 {
  return [v[0] * s, v[1] * s, v[2] * s]
}

function cross3(a: RaycastVec3, b: RaycastVec3): RaycastVec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function normalize3(v: RaycastVec3): RaycastVec3 {
  const len = Math.hypot(v[0], v[1], v[2])
  return len < 1e-10 ? [0, 1, 0] : [v[0] / len, v[1] / len, v[2] / len]
}

function buildTangentFrame(normal: RaycastVec3): {
  readonly n: RaycastVec3
  readonly t0: RaycastVec3
  readonly t1: RaycastVec3
} {
  const n = normalize3(normal)
  const seed: RaycastVec3 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  const t0 = normalize3(cross3(seed, n))
  const t1 = normalize3(cross3(n, t0))
  return { n, t0, t1 }
}

// ─── Cosine-domain sector helpers ─────────────────────────────────────────────

/**
 * Maps an elevation angle `alpha` (∈[0,π]) to a cosine-domain sector index.
 *
 * Runtime codec: u = cos(alpha)*0.5 + 0.5 ∈ [0,1]; alpha π→0 maps u 0→1.
 * Sector index: k = clamp(floor(u * sectorCount), 0, sectorCount − 1).
 */
export function cosineSectorIndex(alpha: number, sectorCount: number): number {
  const u = Math.cos(alpha) * 0.5 + 0.5
  return Math.min(sectorCount - 1, Math.max(0, Math.floor(u * sectorCount)))
}

/**
 * Returns the sector-center elevation angle for sector k (cosine domain).
 *
 * Center is uniform in u: u_k = (k + 0.5) / sectorCount.
 * Invert: alpha_k = acos(2 * u_k − 1).
 */
export function cosineSectorCenterAlpha(k: number, sectorCount: number): number {
  const u = (k + 0.5) / sectorCount
  return Math.acos(2 * u - 1)
}

// ─── Estimator interface ──────────────────────────────────────────────────────

export interface RepresentationEstimator {
  readonly id: string
  readonly sectorCount: number
  readonly costNote: string
  evaluate(fixture: RaycastAoFixture, slices?: number): number
}

// ─── R0-angle: 32-sector angle-domain bitmask ─────────────────────────────────
// Delegates directly to the frozen `evaluateVbaoRepresentationEstimate` to guarantee
// === match with the P1-locked per-fixture values.

export function createAngleBitmaskEstimator(sectorCount = 32): RepresentationEstimator {
  return {
    id: 'R0-angle',
    sectorCount,
    costNote: '32b u32 countOneBits',
    evaluate(fixture, slices = 4) {
      return evaluateVbaoRepresentationEstimate(fixture, slices)
    },
  }
}

// ─── R0-cosine / R1-cosine-128: cosine-domain bitmask estimators ──────────────

export function createCosineBitmaskEstimator(sectorCount: number): RepresentationEstimator {
  const id = sectorCount === 32 ? 'R0-cosine' : `R1-cosine-${sectorCount}`
  const costNote = sectorCount <= 32 ? '32b u32 countOneBits' : '128b vec4 popcount'

  return {
    id,
    sectorCount,
    costNote,
    evaluate(fixture, slices = 4) {
      const sliceCount = Math.max(1, Math.round(slices))
      const { n, t0, t1 } = buildTangentFrame(fixture.normal)
      let accessibilitySum = 0

      for (let i = 0; i < sliceCount; i++) {
        const phi = (Math.PI * (i + 0.5)) / sliceCount
        const sliceDir = normalize3(add3(scale3(t0, Math.cos(phi)), scale3(t1, Math.sin(phi))))
        let weightedOpen = 0
        let weightTotal = 0

        for (let k = 0; k < sectorCount; k++) {
          const alpha = cosineSectorCenterAlpha(k, sectorCount)
          const dir = normalize3(add3(scale3(sliceDir, Math.cos(alpha)), scale3(n, Math.sin(alpha))))
          const cosineWeight = Math.sin(alpha) // n·ω = sin(alpha)
          weightTotal += cosineWeight
          if (!isRaycastDirectionOccluded(fixture, dir)) weightedOpen += cosineWeight
        }

        accessibilitySum += weightTotal > 0 ? weightedOpen / weightTotal : 1
      }

      return accessibilitySum / sliceCount
    },
  }
}

// ─── R2-dense-sweep: cosine-uniform dense probing ────────────────────────────

export function createDenseSweepEstimator(probes = 4096): RepresentationEstimator {
  return {
    id: 'R2-dense-sweep',
    sectorCount: probes,
    costNote: 'analytic',
    evaluate(fixture, slices = 4) {
      const sliceCount = Math.max(1, Math.round(slices))
      const { n, t0, t1 } = buildTangentFrame(fixture.normal)
      let accessibilitySum = 0

      for (let i = 0; i < sliceCount; i++) {
        const phi = (Math.PI * (i + 0.5)) / sliceCount
        const sliceDir = normalize3(add3(scale3(t0, Math.cos(phi)), scale3(t1, Math.sin(phi))))
        let weightedOpen = 0
        let weightTotal = 0

        for (let j = 0; j < probes; j++) {
          // Cosine-uniform probe: u_j = (j+0.5)/probes → alpha_j = acos(2*u_j − 1)
          const u = (j + 0.5) / probes
          const alpha = Math.acos(2 * u - 1)
          const dir = normalize3(add3(scale3(sliceDir, Math.cos(alpha)), scale3(n, Math.sin(alpha))))
          const cosineWeight = Math.sin(alpha)
          weightTotal += cosineWeight
          if (!isRaycastDirectionOccluded(fixture, dir)) weightedOpen += cosineWeight
        }

        accessibilitySum += weightTotal > 0 ? weightedOpen / weightTotal : 1
      }

      return accessibilitySum / sliceCount
    },
  }
}

// ─── Slice-axis variant helper ────────────────────────────────────────────────

/**
 * Evaluates R0-cosine@32 with an overridden slice count.
 * Used for the slices-2, slices-4, slices-8 candidates.
 */
export function estimateSliceAxis(fixture: RaycastAoFixture, sliceCount: number): number {
  return createCosineBitmaskEstimator(32).evaluate(fixture, sliceCount)
}

// ─── Study report types ───────────────────────────────────────────────────────

export interface RepresentationStudyPerFixture {
  readonly ssAchievable: number
  readonly estimate: number
  readonly fixableDelta: number
}

export interface RepresentationStudyRow {
  readonly estimatorId: string
  readonly slices: number
  readonly perFixture: Record<string, RepresentationStudyPerFixture>
  readonly primaryRmse: number
  readonly primaryMae: number
  readonly secondaryRmse: number
  readonly secondaryMae: number
}

export interface RepresentationStudyAggregate {
  readonly rmse: number
  readonly mae: number
  readonly fixtureCount: number
}

export interface RepresentationStudyReport {
  readonly generatedAt: string
  readonly cameraSetId: string
  readonly candidates: readonly RepresentationStudyRow[]
  readonly faithfulnessDelta: number
  readonly primaryAggregate: Record<string, RepresentationStudyAggregate>
  readonly secondaryAggregate: Record<string, RepresentationStudyAggregate>
  readonly secondaryAnnotation: string
  readonly decisionRuleThreshold: number
  readonly verdict: 'representation-bottleneck' | 'not-bottleneck' | 'marginal'
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Two-wall-corner is excluded from the primary aggregate (irreducible SS > GT artefact). */
const TWO_WALL_CORNER_ID = 'two-wall-corner'

export function computeRmse(values: readonly number[]): number {
  if (values.length === 0) return 0
  return Math.sqrt(values.reduce((s, v) => s + v * v, 0) / values.length)
}

export function computeMae(values: readonly number[]): number {
  if (values.length === 0) return 0
  return values.reduce((s, v) => s + Math.abs(v), 0) / values.length
}

export function evaluateVerdict(
  r2PrimaryRmse: number,
  r0cosinePrimaryRmse: number,
  threshold: number,
  margin: number,
): 'representation-bottleneck' | 'not-bottleneck' | 'marginal' {
  const improvement = r0cosinePrimaryRmse - r2PrimaryRmse
  if (improvement >= threshold) return 'representation-bottleneck'
  if (improvement < margin) return 'not-bottleneck'
  return 'marginal'
}

// ─── Main factory ─────────────────────────────────────────────────────────────

/**
 * Runs the full representation study and returns a deterministic, regression-lockable report.
 *
 * Candidates (7 total):
 *   R0-angle (32, slices=4), R0-cosine (32, slices=4), R1-cosine-128 (128, slices=4),
 *   R2-dense-sweep (4096, slices=4), slices-2 (cosine-32), slices-4 (cosine-32), slices-8 (cosine-32)
 */
export function createRepresentationStudyReport(): RepresentationStudyReport {
  const DECISION_RULE_THRESHOLD = 0.02
  const DECISION_RULE_MARGIN = 0.005

  // Build candidate list: (estimator, slicesOverride, candidateId)
  type CandidateSpec = { estimator: RepresentationEstimator; slices: number; id: string }
  const candidateSpecs: CandidateSpec[] = [
    { estimator: createAngleBitmaskEstimator(32), slices: 4, id: 'R0-angle' },
    { estimator: createCosineBitmaskEstimator(32), slices: 4, id: 'R0-cosine' },
    { estimator: createCosineBitmaskEstimator(128), slices: 4, id: 'R1-cosine-128' },
    { estimator: createDenseSweepEstimator(4096), slices: 4, id: 'R2-dense-sweep' },
    { estimator: createCosineBitmaskEstimator(32), slices: 2, id: 'slices-2' },
    { estimator: createCosineBitmaskEstimator(32), slices: 4, id: 'slices-4' },
    { estimator: createCosineBitmaskEstimator(32), slices: 8, id: 'slices-8' },
  ]

  // Pre-compute ssAchievable per fixture (shared across all candidates)
  const ssAchievableMap: Record<string, number> = {}
  for (const fixture of RAYCAST_AO_FIXTURES) {
    const camera = SS_AO_FIXTURE_CAMERAS[fixture.id as keyof typeof SS_AO_FIXTURE_CAMERAS] as SsAoCamera
    ssAchievableMap[fixture.id] = evaluateScreenSpaceAchievableAo(fixture, camera).accessibility
  }

  // Compute per-candidate rows
  const candidates: RepresentationStudyRow[] = candidateSpecs.map((spec) => {
    const perFixture: Record<string, RepresentationStudyPerFixture> = {}
    const primaryDeltas: number[] = []
    const secondaryDeltas: number[] = []

    for (const fixture of RAYCAST_AO_FIXTURES) {
      const ssAchievable = ssAchievableMap[fixture.id]!
      const estimate = spec.estimator.evaluate(fixture, spec.slices)
      const fixableDelta = estimate - ssAchievable

      perFixture[fixture.id] = { ssAchievable, estimate, fixableDelta }
      secondaryDeltas.push(fixableDelta)
      if (fixture.id !== TWO_WALL_CORNER_ID) primaryDeltas.push(fixableDelta)
    }

    return {
      estimatorId: spec.id,
      slices: spec.slices,
      perFixture,
      primaryRmse: computeRmse(primaryDeltas),
      primaryMae: computeMae(primaryDeltas),
      secondaryRmse: computeRmse(secondaryDeltas),
      secondaryMae: computeMae(secondaryDeltas),
    }
  })

  // Build aggregate maps
  const primaryAggregate: Record<string, RepresentationStudyAggregate> = {}
  const secondaryAggregate: Record<string, RepresentationStudyAggregate> = {}
  for (const row of candidates) {
    primaryAggregate[row.estimatorId] = {
      rmse: row.primaryRmse,
      mae: row.primaryMae,
      fixtureCount: RAYCAST_AO_FIXTURES.length - 1, // excludes two-wall-corner
    }
    secondaryAggregate[row.estimatorId] = {
      rmse: row.secondaryRmse,
      mae: row.secondaryMae,
      fixtureCount: RAYCAST_AO_FIXTURES.length,
    }
  }

  // faithfulnessDelta: |primaryRmse(R0-angle) − primaryRmse(R0-cosine)|
  const r0angleRow = candidates.find((r) => r.estimatorId === 'R0-angle')!
  const r0cosineRow = candidates.find((r) => r.estimatorId === 'R0-cosine')!
  const r2denseRow = candidates.find((r) => r.estimatorId === 'R2-dense-sweep')!

  const faithfulnessDelta = Math.abs(r0angleRow.primaryRmse - r0cosineRow.primaryRmse)

  const verdict = evaluateVerdict(
    r2denseRow.primaryRmse,
    r0cosineRow.primaryRmse,
    DECISION_RULE_THRESHOLD,
    DECISION_RULE_MARGIN,
  )

  return {
    generatedAt: REPRESENTATION_STUDY_GENERATED_AT,
    cameraSetId: SS_AO_CAMERA_SET_ID,
    candidates,
    faithfulnessDelta,
    primaryAggregate,
    secondaryAggregate,
    secondaryAnnotation:
      'two-wall-corner excluded from primary aggregate: its fixable delta reflects irreducible SS > GT camera geometry, not addressable quantization error',
    decisionRuleThreshold: DECISION_RULE_THRESHOLD,
    verdict,
  }
}

// ─── Markdown formatter ───────────────────────────────────────────────────────

export function formatRepresentationStudyReportMarkdown(report: RepresentationStudyReport): string {
  const lines: string[] = []
  lines.push('# VBAO Representation Study — P2')
  lines.push('')
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push(`Camera set: ${report.cameraSetId}`)
  lines.push(`Verdict: **${report.verdict}**`)
  lines.push(`Decision-rule threshold: ${report.decisionRuleThreshold}`)
  lines.push(`Faithfulness delta (R0-angle vs R0-cosine primary RMSE): ${report.faithfulnessDelta.toFixed(5)}`)
  lines.push('')
  lines.push('## Primary Aggregate (excludes two-wall-corner)')
  lines.push('')
  lines.push('| Candidate | Primary RMSE | Primary MAE |')
  lines.push('| --- | ---: | ---: |')
  for (const row of report.candidates) {
    const agg = report.primaryAggregate[row.estimatorId]!
    lines.push(`| ${row.estimatorId} (slices=${row.slices}) | ${agg.rmse.toFixed(5)} | ${agg.mae.toFixed(5)} |`)
  }
  lines.push('')
  lines.push('## Secondary Aggregate (all 9 fixtures)')
  lines.push('')
  lines.push(`Note: ${report.secondaryAnnotation}`)
  lines.push('')
  lines.push('| Candidate | Secondary RMSE | Secondary MAE |')
  lines.push('| --- | ---: | ---: |')
  for (const row of report.candidates) {
    const agg = report.secondaryAggregate[row.estimatorId]!
    lines.push(`| ${row.estimatorId} (slices=${row.slices}) | ${agg.rmse.toFixed(5)} | ${agg.mae.toFixed(5)} |`)
  }
  lines.push('')
  lines.push('## Per-Fixture Table (fixable delta = estimate − ssAchievable)')
  lines.push('')
  const fixtureIds = RAYCAST_AO_FIXTURES.map((f) => f.id)
  const headerCells = ['Candidate', ...fixtureIds].join(' | ')
  lines.push(`| ${headerCells} |`)
  lines.push(`| ${['---', ...fixtureIds.map(() => '---:')].join(' | ')} |`)
  for (const row of report.candidates) {
    const cells = [
      `${row.estimatorId} (s=${row.slices})`,
      ...fixtureIds.map((fid) => row.perFixture[fid]?.fixableDelta.toFixed(4) ?? 'N/A'),
    ]
    lines.push(`| ${cells.join(' | ')} |`)
  }
  lines.push('')
  return lines.join('\n')
}
