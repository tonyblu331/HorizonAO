/**
 * Runtime-Faithful VBAO CPU Model (P3-A).
 *
 * Mirrors VBAONode.ts vbaoKernel() (lines 524–822) term-for-term, replacing
 * screen-space depth marching with dense deterministic direction sampling
 * against isRaycastDirectionOccluded. Isolates the frame+weighting+codec+bitmask
 * pipeline from depth-sampling fidelity.
 *
 * All frozen modules (VBAONode.ts, canonicalVbaoReference.ts,
 * vbaoRepresentationCandidates.ts, aoScreenSpaceReference.ts,
 * aoRaycastReference.ts, vbaoConstants.ts) are UNTOUCHED.
 */

import {
  isRaycastDirectionOccluded,
  RAYCAST_AO_FIXTURES,
  type RaycastAoFixture,
  type RaycastVec3,
} from './aoRaycastReference'
import {
  evaluateScreenSpaceAchievableAo,
  SS_AO_FIXTURE_CAMERAS,
} from './aoScreenSpaceReference'
import { createCosineBitmaskEstimator } from './vbaoRepresentationCandidates'

// ─── Fixed timestamp (enables deep-equal lock) ───────────────────────────────

/**
 * Fixed deterministic timestamp emitted in the runtime-faithful report.
 * DO NOT change without re-locking the T8 baseline.
 */
export const RUNTIME_FAITHFUL_GENERATED_AT = '1970-01-01T00:00:00.000Z'

// ─── Vec3 helpers (local, mirror P2 naming conventions) ──────────────────────

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

function dot3(a: RaycastVec3, b: RaycastVec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function normalize3(v: RaycastVec3): RaycastVec3 {
  const len = Math.hypot(v[0], v[1], v[2])
  return len < 1e-10 ? [0, 1, 0] : [v[0] / len, v[1] / len, v[2] / len]
}

// ─── V-tangent frame construction ────────────────────────────────────────────

/**
 * Build the V-tangent frame matching VBAONode.ts lines 629–633 EXACTLY.
 *
 * Branch: abs(V.x) < 0.9 → seed = cross(V, [1,0,0])
 *         else            → seed = cross(V, [0,1,0])
 * T0 = normalize(seed)
 * T1 = normalize(cross(V, T0))
 */
export function buildVFrame(
  eye: RaycastVec3,
  point: RaycastVec3,
): { V: RaycastVec3; T0: RaycastVec3; T1: RaycastVec3 } {
  const raw = [eye[0] - point[0], eye[1] - point[1], eye[2] - point[2]] as RaycastVec3
  const V = normalize3(raw)

  const seed =
    Math.abs(V[0]) < 0.9
      ? cross3(V, [1, 0, 0] as RaycastVec3)
      : cross3(V, [0, 1, 0] as RaycastVec3)

  const T0 = normalize3(seed)
  const T1 = normalize3(cross3(V, T0))

  return { V, T0, T1 }
}

// ─── Codec: vbaoCosineMeasureNoAtan (exact CPU transcription) ────────────────

/**
 * CPU transcription of vbaoCosineMeasureNoAtan (VBAONode.ts lines 550–576).
 *
 * EXACT codec including all guards and branches:
 *   x = dot(D, S)
 *   y = max(dot(D, V), 1e-5)
 *   invLen = 1 / sqrt(max(x²+y², 1e-8))
 *   sinBeta = (x*cosGamma − y*sinGamma) * invLen
 *   cosBeta = (y*cosGamma + x*sinGamma) * invLen
 *   interior = sinBeta * 0.5 + 0.5
 *   clampedBoundary = sinBeta >= 0 ? 1 : 0
 *   cosBeta < 0 → return clampedBoundary   (backface branch)
 *   else        → return clamp(interior, 0, 1)
 */
export function faithfulCosineU(
  D: RaycastVec3,
  V: RaycastVec3,
  S: RaycastVec3,
  sinGamma: number,
  cosGamma: number,
): number {
  const x = dot3(D, S)
  const y = Math.max(dot3(D, V), 1e-5)
  const invLen = 1.0 / Math.sqrt(Math.max(x * x + y * y, 1e-8))
  const sinBeta = (x * cosGamma - y * sinGamma) * invLen
  const cosBeta = (y * cosGamma + x * sinGamma) * invLen
  const interior = sinBeta * 0.5 + 0.5
  const clampedBoundary = sinBeta >= 0 ? 1 : 0
  if (cosBeta < 0) return clampedBoundary
  return Math.min(1, Math.max(0, interior))
}

// ─── Count set bits in a 32-bit integer ──────────────────────────────────────

function countOneBits(n: number): number {
  // Treat n as unsigned 32-bit (>>> 0)
  let x = n >>> 0
  x = x - ((x >>> 1) & 0x55555555)
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333)
  x = (x + (x >>> 4)) & 0x0f0f0f0f
  return ((x * 0x01010101) >>> 24)
}

// ─── Estimate types ───────────────────────────────────────────────────────────

export interface RuntimeFaithfulEstimateResult {
  /** Faithful accessibility in [0,1]. */
  readonly estimate: number
  /** True when weightSum < 1e-7 (degenerate normal projection). */
  readonly degenerateWeight: boolean
  /**
   * ssAchievable − estimate.
   * Negative means the faithful kernel reports MORE accessibility than
   * screen-space geometry allows (under-occlusion / too bright); positive
   * means over-occlusion (too dark).
   * Populated only when called via createRuntimeFaithfulReport; undefined for
   * standalone calls (caller computes it separately with evaluateScreenSpaceAchievableAo).
   */
  readonly faithfulFixableDelta?: number
}

export interface RuntimeFaithfulEstimateOptions {
  readonly slices?: number
  readonly probesPerSide?: number
  readonly rotation?: number
}

// ─── Core estimator ───────────────────────────────────────────────────────────

/**
 * Runtime-faithful AO estimate for one fixture from one camera eye.
 *
 * Mirrors vbaoKernel() slice/side/sample loop with these deterministic
 * substitutions:
 * - rotation = options.rotation ?? 0.5 (noise mean, not random)
 * - stepT = (j+0.5)/probesPerSide (no stepJitter)
 * - single-direction probe replaces depth-march front/back interval
 *
 * Resolve is UNIFORM: sliceAccessibility = 1 − popcount(mask) / 32.
 * Weighted accumulation: sum(sliceAccessibility * NprojLen) / sum(NprojLen).
 * WeightSum guard: max(weightSum, 1e-4) (matches runtime line 796).
 * Degenerate guard: if weightSum < 1e-7 → return 1.0, degenerateWeight=true.
 */
export function evaluateRuntimeFaithfulEstimate(
  fixture: RaycastAoFixture,
  eye: RaycastVec3,
  options?: RuntimeFaithfulEstimateOptions,
): RuntimeFaithfulEstimateResult {
  // Floor at 0, not 1: zero slices is the degenerate configuration that the
  // weightSum < 1e-7 guard below exists to handle (the NprojLen floor makes
  // the guard unreachable for any sliceCount >= 1).
  const sliceCount = Math.max(0, Math.round(options?.slices ?? 4))
  const probesPerSide = Math.max(1, Math.round(options?.probesPerSide ?? 4096))
  const rotation = options?.rotation ?? 0.5

  const N = fixture.normal as RaycastVec3
  const { V, T0, T1 } = buildVFrame(eye, fixture.point as RaycastVec3)

  const SECTOR_COUNT = 32

  let weightedAccessibility = 0
  let weightSum = 0

  for (let i = 0; i < sliceCount; i++) {
    // phi = (i + rotation) / sliceCount * PI  (runtime line 657)
    const phi = ((i + rotation) / sliceCount) * Math.PI
    // S_i = normalize(T0*cos(phi) + T1*sin(phi))  (runtime line 658-660)
    const S_i = normalize3(
      add3(scale3(T0, Math.cos(phi)), scale3(T1, Math.sin(phi))),
    )
    // B_i = normalize(cross(S_i, V))  (runtime line 661)
    const B_i = normalize3(cross3(S_i, V))

    // NprojRaw = N - B_i * dot(N, B_i)  (runtime line 662)
    const NprojRaw = [
      N[0] - B_i[0] * dot3(N, B_i),
      N[1] - B_i[1] * dot3(N, B_i),
      N[2] - B_i[2] * dot3(N, B_i),
    ] as RaycastVec3
    // NprojLen = sqrt(max(dot(NprojRaw,NprojRaw), 1e-8))  (runtime line 663)
    const NprojLen = Math.sqrt(Math.max(dot3(NprojRaw, NprojRaw), 1e-8))
    // Nproj = NprojRaw / NprojLen  (runtime line 664)
    const Nproj = scale3(NprojRaw, 1.0 / NprojLen)

    // sinGamma = dot(Nproj, S_i)  (runtime line 665)
    const sinGamma = dot3(Nproj, S_i)
    // cosGamma = max(dot(Nproj, V), 1e-5)  (runtime line 666)
    const cosGamma = Math.max(dot3(Nproj, V), 1e-5)

    let occludedMask = 0

    // sideSign loop: sideIdx in {0,1} → sideSign in {+1,-1}  (runtime lines 670-776)
    for (let sideIdx = 0; sideIdx < 2; sideIdx++) {
      const sideSign = sideIdx === 0 ? 1 : -1
      // sampleDir = S_i * sideSign  (runtime line 674)
      const sampleDir = scale3(S_i, sideSign)

      // Dense deterministic probe sweep (replaces depth march).
      // We sweep elevation angle uniformly in [0, pi] in the {sampleDir, V} half-plane.
      // Each probe direction D = normalize(sampleDir * cos(alpha) + V * sin(alpha))
      // for alpha in (0, pi) produces directions that span the half-plane above the surface.
      // Use (j+0.5)/probesPerSide uniform centers (deterministic, no stepJitter).
      for (let j = 0; j < probesPerSide; j++) {
        const stepT = (j + 0.5) / probesPerSide
        // alpha ∈ (0, pi): alpha=0 → sampleDir, alpha=pi → -sampleDir
        const alpha = stepT * Math.PI
        const D = normalize3(
          add3(scale3(sampleDir, Math.cos(alpha)), scale3(V, Math.sin(alpha))),
        )

        if (isRaycastDirectionOccluded(fixture, D)) {
          // Map to sector via faithful codec.
          // Codec S arg is S_i (unsigned) for BOTH sides — confirmed VBAONode.ts lines 749-762.
          const u = faithfulCosineU(D, V, S_i, sinGamma, cosGamma)
          const bin = Math.min(SECTOR_COUNT - 1, Math.max(0, Math.floor(u * SECTOR_COUNT)))
          // Set bit in occludedMask (deterministic midpoint binning)
          occludedMask = (occludedMask | (1 << bin)) >>> 0
        }
      }
    }

    // sliceAccessibility = 1 - countOneBits(mask) / 32  (uniform, not cosine-weighted)
    const sliceAccessibility = 1 - countOneBits(occludedMask) / SECTOR_COUNT

    // Weighted accumulation
    weightedAccessibility += sliceAccessibility * NprojLen
    weightSum += NprojLen
  }

  // Degenerate guard: if weightSum < 1e-7, return 1.0
  if (weightSum < 1e-7) {
    return { estimate: 1.0, degenerateWeight: true }
  }

  // Final accessibility = clamp(weightedAccessibility / max(weightSum, 1e-4), 0, 1)
  const estimate = Math.min(1, Math.max(0, weightedAccessibility / Math.max(weightSum, 1e-4)))

  return { estimate, degenerateWeight: false }
}

// ─── Report types ─────────────────────────────────────────────────────────────

export interface RuntimeFaithfulPerFixture {
  readonly id: string
  readonly faithfulAccessibility: number
  readonly ssAchievable: number
  readonly faithfulFixableDelta: number
  readonly r0CosineAccessibility: number
  readonly vsR0Delta: number
  readonly degenerateWeight: boolean
}

export interface RuntimeFaithfulDecision {
  readonly tau: number
  readonly rule: string
}

export type PerFixtureVerdict = 'collapsed' | 'residual'
export type OverallVerdict = 'cpu-model-artifact' | 'kernel-error-confirmed' | 'mixed'

export interface RuntimeFaithfulReport {
  readonly generatedAt: string
  readonly cameraSetId: string
  readonly fixtures: readonly RuntimeFaithfulPerFixture[]
  readonly primaryFixtures: readonly [string, string]
  readonly decision: RuntimeFaithfulDecision
  readonly perFixtureVerdict: Readonly<Record<string, PerFixtureVerdict>>
  readonly aggregateRMSE: number
  readonly verdict: OverallVerdict
}

// ─── Verdict computation ──────────────────────────────────────────────────────

/**
 * Compute verdict from per-fixture faithfulFixableDelta values for the two
 * primary fixtures. Exported so tests can exercise all branches with synthetic data.
 *
 * @param primaryDeltas  Record mapping primary fixture ids to their faithfulFixableDelta.
 * @param tau            Decision threshold (default 0.05).
 */
export function computeVerdict(
  primaryDeltas: Record<string, number>,
  tau = 0.05,
): {
  verdict: OverallVerdict
  aggregateRMSE: number
  perFixtureVerdict: Record<string, PerFixtureVerdict>
} {
  const primaryFixtures = ['grazing-surface-wall', 'normal-sensitive-side-contact'] as const

  const perFixtureVerdict: Record<string, PerFixtureVerdict> = {}
  let squaredSum = 0
  let collapsedCount = 0

  for (const id of primaryFixtures) {
    const delta = primaryDeltas[id] ?? 0
    const collapsed = Math.abs(delta) < tau
    perFixtureVerdict[id] = collapsed ? 'collapsed' : 'residual'
    squaredSum += delta * delta
    if (collapsed) collapsedCount++
  }

  const aggregateRMSE = Math.sqrt(squaredSum / primaryFixtures.length)

  let verdict: OverallVerdict
  if (collapsedCount === primaryFixtures.length && aggregateRMSE < tau) {
    verdict = 'cpu-model-artifact'
  } else if (collapsedCount === 1) {
    verdict = 'mixed'
  } else {
    verdict = 'kernel-error-confirmed'
  }

  return { verdict, aggregateRMSE, perFixtureVerdict }
}

// ─── R0-cosine reference estimator ───────────────────────────────────────────

const r0CosineEstimator = createCosineBitmaskEstimator(32)

// ─── Report assembly ──────────────────────────────────────────────────────────

/**
 * DECISION RULE (pre-registered, locked).
 *
 * Per-fixture verdict: |faithfulFixableDelta| < tau (0.05) → 'collapsed'; else 'residual'.
 * Primary fixtures: grazing-surface-wall + normal-sensitive-side-contact.
 * aggregateRMSE = sqrt(mean(faithfulFixableDelta² over primary fixtures)).
 * Verdict: BOTH collapsed AND aggregateRMSE < tau → 'cpu-model-artifact';
 *          exactly ONE collapsed → 'mixed';
 *          else → 'kernel-error-confirmed'.
 */
const DECISION_RULE =
  "Per-fixture: |faithfulFixableDelta| < tau(0.05) → 'collapsed' else 'residual'. " +
  "Primary: grazing-surface-wall + normal-sensitive-side-contact. " +
  "aggregateRMSE = sqrt(mean(delta² over primaries)). " +
  "Verdict: both-collapsed AND rmse<tau → 'cpu-model-artifact'; " +
  "exactly-one-collapsed → 'mixed'; else → 'kernel-error-confirmed'."

/**
 * Assemble the full RuntimeFaithfulReport.
 * Uses RUNTIME_FAITHFUL_GENERATED_AT for deep-equal locking.
 */
export function createRuntimeFaithfulReport(): RuntimeFaithfulReport {
  const TAU = 0.05

  const fixtures: RuntimeFaithfulPerFixture[] = []
  const primaryDeltas: Record<string, number> = {}

  for (const fixture of RAYCAST_AO_FIXTURES) {
    const fixtureId = fixture.id as keyof typeof SS_AO_FIXTURE_CAMERAS
    const camera = SS_AO_FIXTURE_CAMERAS[fixtureId]
    const eye = camera.eye as RaycastVec3

    // Faithful estimate
    const faithfulResult = evaluateRuntimeFaithfulEstimate(fixture, eye, {
      slices: 4,
      probesPerSide: 4096,
      rotation: 0.5,
    })
    const faithfulAccessibility = faithfulResult.estimate

    // SS-achievable (returns RaycastAoResult, extract .accessibility)
    const ssResult = evaluateScreenSpaceAchievableAo(fixture, camera)
    const ssAchievable = ssResult.accessibility

    // R0-cosine reference
    const r0CosineAccessibility = r0CosineEstimator.evaluate(fixture, 4)

    const faithfulFixableDelta = ssAchievable - faithfulAccessibility
    const vsR0Delta = faithfulAccessibility - r0CosineAccessibility

    fixtures.push({
      id: fixture.id,
      faithfulAccessibility,
      ssAchievable,
      faithfulFixableDelta,
      r0CosineAccessibility,
      vsR0Delta,
      degenerateWeight: faithfulResult.degenerateWeight,
    })

    // Collect primary fixture deltas
    if (
      fixture.id === 'grazing-surface-wall' ||
      fixture.id === 'normal-sensitive-side-contact'
    ) {
      primaryDeltas[fixture.id] = faithfulFixableDelta
    }
  }

  const { verdict, aggregateRMSE, perFixtureVerdict } = computeVerdict(primaryDeltas, TAU)

  return {
    generatedAt: RUNTIME_FAITHFUL_GENERATED_AT,
    cameraSetId: 'ssao-cam-v1',
    fixtures,
    primaryFixtures: ['grazing-surface-wall', 'normal-sensitive-side-contact'],
    decision: {
      tau: TAU,
      rule: DECISION_RULE,
    },
    perFixtureVerdict,
    aggregateRMSE,
    verdict,
  }
}

// ─── Markdown formatter ───────────────────────────────────────────────────────

/**
 * Format the runtime-faithful report as a Markdown section for EVIDENCE.md.
 *
 * The decision rule MUST appear BEFORE any numeric values in the output.
 */
export function formatRuntimeFaithfulReportMarkdown(report: RuntimeFaithfulReport): string {
  const primaryIds = report.primaryFixtures

  const lines: string[] = [
    '## P3-A: Runtime-Faithful Verdict',
    '',
    '### Decision Rule',
    '',
    report.decision.rule,
    '',
    `**tau**: ${report.decision.tau}`,
    '',
    '### Primary Fixture Results',
    '',
    '| Fixture | faithfulAccessibility | ssAchievable | faithfulFixableDelta | r0CosineAccessibility | vsR0Delta | verdict |',
    '| --- | ---: | ---: | ---: | ---: | ---: | --- |',
  ]

  for (const id of primaryIds) {
    const f = report.fixtures.find((fx) => fx.id === id)
    if (f) {
      lines.push(
        `| ${f.id} | ${f.faithfulAccessibility.toFixed(5)} | ${f.ssAchievable.toFixed(5)} | ${f.faithfulFixableDelta.toFixed(5)} | ${f.r0CosineAccessibility.toFixed(5)} | ${f.vsR0Delta.toFixed(5)} | ${report.perFixtureVerdict[id]} |`,
      )
    }
  }

  lines.push('')
  lines.push('### All Fixtures')
  lines.push('')
  lines.push(
    '| Fixture | faithfulAccessibility | ssAchievable | faithfulFixableDelta | r0CosineAccessibility | vsR0Delta |',
  )
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: |')

  for (const f of report.fixtures) {
    lines.push(
      `| ${f.id} | ${f.faithfulAccessibility.toFixed(5)} | ${f.ssAchievable.toFixed(5)} | ${f.faithfulFixableDelta.toFixed(5)} | ${f.r0CosineAccessibility.toFixed(5)} | ${f.vsR0Delta.toFixed(5)} |`,
    )
  }

  lines.push('')
  lines.push('### Verdict')
  lines.push('')
  lines.push(`**Verdict**: ${report.verdict}`)
  lines.push(`**aggregateRMSE**: ${report.aggregateRMSE.toFixed(5)}`)
  lines.push(`**tau**: ${report.decision.tau}`)
  lines.push('')
  lines.push('### Interpretation')
  lines.push('')

  let interpretation: string
  if (report.verdict === 'cpu-model-artifact') {
    interpretation =
      'The runtime-faithful CPU model matches ssAchievable within tau on both primary fixtures. ' +
      'The remaining gap is a CPU model artifact (frame/weighting/codec approximation), not a kernel error.'
  } else if (report.verdict === 'kernel-error-confirmed') {
    // Direction is derived from the primary deltas (ssAchievable − faithful):
    // negative mean = faithful reports more accessibility than screen space
    // allows (under-occlusion / too bright); positive mean = over-occlusion.
    const primaryRows = report.fixtures.filter((row) =>
      (report.primaryFixtures as readonly string[]).includes(row.id),
    )
    const meanPrimaryDelta =
      primaryRows.reduce((sum, row) => sum + row.faithfulFixableDelta, 0) /
      Math.max(primaryRows.length, 1)
    const direction =
      meanPrimaryDelta < 0
        ? 'The faithful kernel reports MORE accessibility than screen-space geometry allows: it UNDER-occludes these fixtures (too bright), so a correction must add occlusion. '
        : 'The faithful kernel reports LESS accessibility than screen-space geometry allows: it OVER-occludes these fixtures (too dark), so a correction must remove occlusion. '
    interpretation =
      'The runtime-faithful CPU model diverges from ssAchievable beyond tau on primary fixtures. ' +
      direction +
      'Kernel-level correction is indicated (P3-B scope).'
  } else {
    interpretation =
      'Mixed result: one primary fixture collapsed within tau, one did not. ' +
      'The kernel error is fixture-dependent; further investigation is needed.'
  }
  lines.push(interpretation)
  lines.push('')
  lines.push(`*Generated at: ${report.generatedAt}*`)
  lines.push(`*Camera set: ${report.cameraSetId}*`)
  lines.push('')

  return lines.join('\n')
}

// ─── EVIDENCE.md append ───────────────────────────────────────────────────────

/**
 * Generate the Markdown section content that should be appended to EVIDENCE.md.
 *
 * The actual file write is intentionally left to the caller (test or script)
 * so this module remains free of Node.js I/O dependencies and can be used
 * in browser/worker contexts without modification.
 *
 * Typical usage from a Node.js test or script:
 *   import { appendRuntimeFaithfulEvidence } from './vbaoRuntimeFaithfulReference'
 *   appendRuntimeFaithfulEvidence() // writes to EVIDENCE.md via the injected writer
 */
export function appendRuntimeFaithfulEvidence(
  report?: RuntimeFaithfulReport,
  writer?: (section: string, existingContent: string) => void,
): string {
  const r = report ?? createRuntimeFaithfulReport()
  const section = formatRuntimeFaithfulReportMarkdown(r)
  if (writer) {
    writer(section, '')
  }
  return section
}
