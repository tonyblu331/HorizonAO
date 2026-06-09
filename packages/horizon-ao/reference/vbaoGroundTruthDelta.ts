/**
 * VBAO vs independent ground-truth delta verifier (P1).
 *
 * Compares the algorithm-independent ray-cast AO truth (`aoRaycastReference`)
 * against a faithful VBAO *representation* estimate on the SAME occluder geometry:
 * slice decomposition × 32-sector visibility bitmask, cosine-weighted popcount.
 *
 * This isolates VBAO's REPRESENTATION error (finite slices + 32-sector quantization)
 * from the continuous truth — it is view-independent. The screen-space-achievable
 * delta (what VBAO can know from a depth buffer at a camera pin) is a separate
 * reference (roadmap P1-B) and is NOT modeled here.
 *
 * Deterministic (no RNG): suitable as a committed regression anchor. Later quality
 * phases (P2 representation, P3 raw signal) must hold or beat this baseline.
 */
import { SECTOR_COUNT } from '../src/vbaoConstants'
import {
  RAYCAST_AO_FIXTURES,
  evaluateRaycastAoReference,
  isRaycastDirectionOccluded,
  type RaycastAoFixture,
  type RaycastVec3,
} from './aoRaycastReference'

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

/**
 * VBAO-representation accessibility on a fixture's geometry.
 *
 * For each of `slices` axial slices, the half-disk spanned by {±sliceDir, n} is
 * partitioned into {@link SECTOR_COUNT} elevation sectors; each sector's center
 * direction is occlusion-tested, building the per-slice visibility bitmask. Per-slice
 * accessibility is the cosine-weighted (n·ω) fraction of unoccluded sectors; the final
 * value averages the slices.
 */
export function evaluateVbaoRepresentationEstimate(
  fixture: RaycastAoFixture,
  slices = 4,
): number {
  const sliceCount = Math.max(1, Math.round(slices))
  const { n, t0, t1 } = buildTangentFrame(fixture.normal)
  const sectorStep = Math.PI / SECTOR_COUNT
  let accessibilitySum = 0

  for (let i = 0; i < sliceCount; i++) {
    const phi = (Math.PI * (i + 0.5)) / sliceCount
    const sliceDir = add3(scale3(t0, Math.cos(phi)), scale3(t1, Math.sin(phi)))
    let weightedOpen = 0
    let weightTotal = 0

    for (let k = 0; k < SECTOR_COUNT; k++) {
      // alpha in [0, pi]: 0 = +sliceDir (grazing), pi/2 = normal, pi = -sliceDir.
      const alpha = (k + 0.5) * sectorStep
      const dir = add3(scale3(sliceDir, Math.cos(alpha)), scale3(n, Math.sin(alpha)))
      const cosineWeight = Math.sin(alpha) // n·ω, >= 0 across the half-disk
      weightTotal += cosineWeight
      if (!isRaycastDirectionOccluded(fixture, dir)) weightedOpen += cosineWeight
    }

    accessibilitySum += weightTotal > 0 ? weightedOpen / weightTotal : 1
  }

  return accessibilitySum / sliceCount
}

export interface VbaoGroundTruthDeltaRow {
  readonly fixtureId: string
  readonly truthAccessibility: number
  readonly vbaoAccessibility: number
  readonly signedDelta: number
  readonly absDelta: number
}

export interface VbaoGroundTruthDeltaReport {
  readonly generatedAt: string
  readonly slices: number
  readonly truthSamples: number
  readonly rows: readonly VbaoGroundTruthDeltaRow[]
  readonly rmse: number
  readonly mae: number
  readonly maxAbsDelta: number
  readonly verdict: 'baseline-captured'
}

export function createVbaoGroundTruthDeltaReport(options: {
  readonly slices?: number
  readonly truthSamples?: number
  readonly generatedAt?: string
} = {}): VbaoGroundTruthDeltaReport {
  const slices = options.slices ?? 4
  const truthSamples = options.truthSamples ?? 4096
  const rows: VbaoGroundTruthDeltaRow[] = RAYCAST_AO_FIXTURES.map((fixture) => {
    const truthAccessibility = evaluateRaycastAoReference(fixture, truthSamples).accessibility
    const vbaoAccessibility = evaluateVbaoRepresentationEstimate(fixture, slices)
    const signedDelta = truthAccessibility - vbaoAccessibility
    return {
      fixtureId: fixture.id,
      truthAccessibility,
      vbaoAccessibility,
      signedDelta,
      absDelta: Math.abs(signedDelta),
    }
  })

  const count = Math.max(1, rows.length)
  const rmse = Math.sqrt(rows.reduce((sum, row) => sum + row.signedDelta * row.signedDelta, 0) / count)
  const mae = rows.reduce((sum, row) => sum + row.absDelta, 0) / count
  const maxAbsDelta = rows.reduce((peak, row) => Math.max(peak, row.absDelta), 0)

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    slices,
    truthSamples,
    rows,
    rmse,
    mae,
    maxAbsDelta,
    verdict: 'baseline-captured',
  }
}

export function formatVbaoGroundTruthDeltaReportMarkdown(report: VbaoGroundTruthDeltaReport): string {
  const lines: string[] = []
  lines.push('# VBAO vs Ground-Truth Representation Delta')
  lines.push('')
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push('')
  lines.push(
    `Slices: ${report.slices} · Truth samples: ${report.truthSamples} · Verdict: ${report.verdict}`,
  )
  lines.push('')
  lines.push(
    `RMSE: ${report.rmse.toFixed(5)} · MAE: ${report.mae.toFixed(5)} · Max |Δ|: ${report.maxAbsDelta.toFixed(5)}`,
  )
  lines.push('')
  lines.push('| Fixture | Truth | VBAO repr | Δ (truth − vbao) | |Δ| |')
  lines.push('| --- | ---: | ---: | ---: | ---: |')
  for (const row of report.rows) {
    lines.push(
      `| ${row.fixtureId} | ${row.truthAccessibility.toFixed(4)} | ${row.vbaoAccessibility.toFixed(4)} | ${row.signedDelta.toFixed(4)} | ${row.absDelta.toFixed(4)} |`,
    )
  }
  lines.push('')
  lines.push('Notes:')
  lines.push('- Truth is algorithm-independent cosine-hemisphere ray casting vs the fixture occluders.')
  lines.push('- VBAO repr is the slice × 32-sector bitmask quantization on the SAME geometry (view-independent).')
  lines.push('- This measures representation error only; screen-space-achievable delta (P1-B) is separate.')
  return `${lines.join('\n')}\n`
}
