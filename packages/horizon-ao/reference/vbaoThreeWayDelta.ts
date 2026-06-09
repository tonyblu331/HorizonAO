/**
 * Three-way delta report: Ground-Truth vs Screen-Space-Achievable vs VBAO Representation (P1-B).
 *
 * Decomposes the total GT→VBAO delta into two components:
 *   - irreducibleDelta = gtAccessibility − ssAchievableAccessibility
 *     (loss inherent to single-depth-layer screen space; cannot be fixed by better VBAO)
 *   - fixableDelta = ssAchievableAccessibility − vbaoAccessibility
 *     (additional loss from VBAO slice/sector quantization; addressable by algorithm improvements)
 *   - totalSignedDelta = gtAccessibility − vbaoAccessibility = irreducibleDelta + fixableDelta
 *
 * Note: because SS can only lose occlusion vs GT (occluders hidden behind nearer surfaces from
 * the camera are undetectable in a depth buffer), ssAccessibility >= gtAccessibility, and
 * therefore irreducibleDelta = gt − ss <= 0. The name "irreducible" refers to the ABSOLUTE
 * magnitude of the SS-vs-GT gap being irreducible from the SSAO algorithm's perspective.
 *
 * `totalRmse` reconciles with `createVbaoGroundTruthDeltaReport().rmse` (P1 ~0.099).
 */

import {
  RAYCAST_AO_FIXTURES,
  evaluateRaycastAoReference,
  type RaycastAoFixtureId,
} from './aoRaycastReference'
import {
  evaluateVbaoRepresentationEstimate,
} from './vbaoGroundTruthDelta'
import {
  SS_AO_CAMERA_SET_ID,
  SS_AO_FIXTURE_CAMERAS,
  evaluateScreenSpaceAchievableAo,
} from './aoScreenSpaceReference'

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ThreeWayDeltaRow {
  readonly fixtureId: string
  readonly gtAccessibility: number
  readonly ssAchievableAccessibility: number
  readonly vbaoAccessibility: number
  /**
   * gtAccessibility − ssAchievableAccessibility.
   * Typically <= 0 because SS is at least as bright as GT (SS loses occlusion vs GT).
   * The absolute value measures the irreducible gap inherent to single-depth-layer SSAO.
   */
  readonly irreducibleDelta: number
  /**
   * ssAchievableAccessibility − vbaoAccessibility.
   * Positive when VBAO is darker than the SS-achievable ideal; the addressable gap.
   */
  readonly fixableDelta: number
  /**
   * gtAccessibility − vbaoAccessibility. Equals irreducibleDelta + fixableDelta.
   * Matches P1 VbaoGroundTruthDeltaRow.signedDelta within float tolerance.
   */
  readonly totalSignedDelta: number
}

export interface ThreeWayDeltaReport {
  readonly generatedAt: string
  /** Number of VBAO axial slices used for the representation estimate. */
  readonly slices: number
  /** Cosine-hemisphere sample count for the GT reference. */
  readonly truthSamples: number
  /** Camera assignment set tag; changing the camera record makes this visible in diffs. */
  readonly cameraSetId: string
  readonly rows: readonly ThreeWayDeltaRow[]
  /** RMSE of irreducibleDelta across all fixtures. */
  readonly irreducibleRmse: number
  /** MAE of irreducibleDelta across all fixtures. */
  readonly irreducibleMae: number
  /** RMSE of fixableDelta across all fixtures. */
  readonly fixableRmse: number
  /** MAE of fixableDelta across all fixtures. */
  readonly fixableMae: number
  /**
   * RMSE of totalSignedDelta; reconciles with VbaoGroundTruthDeltaReport.rmse (~0.099).
   */
  readonly totalRmse: number
  /** Maximum absolute fixableDelta across all fixtures. */
  readonly maxFixableAbsDelta: number
  /**
   * Fraction of total variance attributable to the irreducible SS gap.
   * = irreducibleRmse² / totalRmse²
   */
  readonly irreducibleFraction: number
  readonly verdict: 'baseline-captured'
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/** Fixed deterministic timestamp used when `generatedAt: 'fixed'`. */
const FIXED_GENERATED_AT = '1970-01-01T00:00:00.000Z'

export function createThreeWayDeltaReport(
  options: {
    readonly slices?: number
    readonly truthSamples?: number
    readonly generatedAt?: string
  } = {},
): ThreeWayDeltaReport {
  const slices = options.slices ?? 4
  const truthSamples = options.truthSamples ?? 4096
  const generatedAt =
    options.generatedAt === 'fixed'
      ? FIXED_GENERATED_AT
      : (options.generatedAt ?? new Date().toISOString())

  const rows: ThreeWayDeltaRow[] = RAYCAST_AO_FIXTURES.map((fixture) => {
    const fixtureId = fixture.id as RaycastAoFixtureId
    const camera = SS_AO_FIXTURE_CAMERAS[fixtureId]

    const gtAccessibility = evaluateRaycastAoReference(fixture, truthSamples).accessibility
    const ssAchievableAccessibility = evaluateScreenSpaceAchievableAo(fixture, camera, truthSamples).accessibility
    const vbaoAccessibility = evaluateVbaoRepresentationEstimate(fixture, slices)

    const irreducibleDelta = gtAccessibility - ssAchievableAccessibility
    const fixableDelta = ssAchievableAccessibility - vbaoAccessibility
    const totalSignedDelta = gtAccessibility - vbaoAccessibility

    return {
      fixtureId,
      gtAccessibility,
      ssAchievableAccessibility,
      vbaoAccessibility,
      irreducibleDelta,
      fixableDelta,
      totalSignedDelta,
    }
  })

  const count = Math.max(1, rows.length)

  const irreducibleRmse = Math.sqrt(
    rows.reduce((sum, r) => sum + r.irreducibleDelta * r.irreducibleDelta, 0) / count,
  )
  const irreducibleMae =
    rows.reduce((sum, r) => sum + Math.abs(r.irreducibleDelta), 0) / count

  const fixableRmse = Math.sqrt(
    rows.reduce((sum, r) => sum + r.fixableDelta * r.fixableDelta, 0) / count,
  )
  const fixableMae =
    rows.reduce((sum, r) => sum + Math.abs(r.fixableDelta), 0) / count

  const totalRmse = Math.sqrt(
    rows.reduce((sum, r) => sum + r.totalSignedDelta * r.totalSignedDelta, 0) / count,
  )

  const maxFixableAbsDelta = rows.reduce((peak, r) => Math.max(peak, Math.abs(r.fixableDelta)), 0)

  const irreducibleFraction =
    totalRmse > 0 ? (irreducibleRmse * irreducibleRmse) / (totalRmse * totalRmse) : 0

  return {
    generatedAt,
    slices,
    truthSamples,
    cameraSetId: SS_AO_CAMERA_SET_ID,
    rows,
    irreducibleRmse,
    irreducibleMae,
    fixableRmse,
    fixableMae,
    totalRmse,
    maxFixableAbsDelta,
    irreducibleFraction,
    verdict: 'baseline-captured',
  }
}

// ─── Markdown formatter ───────────────────────────────────────────────────────

/**
 * Renders a ThreeWayDeltaReport as a markdown table.
 * Mirrors `formatVbaoGroundTruthDeltaReportMarkdown` in structure.
 */
export function formatThreeWayDeltaReportMarkdown(report: ThreeWayDeltaReport): string {
  const lines: string[] = []
  lines.push('# VBAO Three-Way Delta: GT vs Screen-Space-Achievable vs Representation')
  lines.push('')
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push('')
  lines.push(
    `Camera set: ${report.cameraSetId} · Slices: ${report.slices} · Truth samples: ${report.truthSamples} · Verdict: ${report.verdict}`,
  )
  lines.push('')
  lines.push(
    `Total RMSE: ${report.totalRmse.toFixed(5)} · Irreducible RMSE: ${report.irreducibleRmse.toFixed(5)} · Fixable RMSE: ${report.fixableRmse.toFixed(5)}`,
  )
  lines.push(
    `Irreducible fraction: ${(report.irreducibleFraction * 100).toFixed(1)}% · Max |fixable Δ|: ${report.maxFixableAbsDelta.toFixed(5)}`,
  )
  lines.push('')
  lines.push('| Fixture | GT | SS-achievable | VBAO repr | irred. Δ | fixable Δ | total Δ |')
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: |')
  for (const row of report.rows) {
    lines.push(
      `| ${row.fixtureId} | ${row.gtAccessibility.toFixed(4)} | ${row.ssAchievableAccessibility.toFixed(4)} | ${row.vbaoAccessibility.toFixed(4)} | ${row.irreducibleDelta.toFixed(4)} | ${row.fixableDelta.toFixed(4)} | ${row.totalSignedDelta.toFixed(4)} |`,
    )
  }
  lines.push('')
  lines.push('Notes:')
  lines.push('- GT: algorithm-independent cosine-hemisphere ray casting vs fixture occluders.')
  lines.push('- SS-achievable: best single-depth-layer SSAO can do with the given camera (irreducible loss if occluder hidden behind nearer surface).')
  lines.push('- VBAO repr: slice × 32-sector bitmask quantization on same geometry (view-independent).')
  lines.push('- irreducibleDelta = GT − SS (negative when SS is brighter than GT, as expected).')
  lines.push('- fixableDelta = SS − VBAO (positive when VBAO is darker than SS-achievable ideal).')
  return `${lines.join('\n')}\n`
}

// Re-export the camera set ID so test files can import it from here without depending on aoScreenSpaceReference directly
export { SS_AO_CAMERA_SET_ID }
