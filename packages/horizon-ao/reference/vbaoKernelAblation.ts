/**
 * P3-B Stage-1: VBAO Kernel Ablation Study.
 *
 * Parameterizes the P3-A faithful inner loop over three toggles:
 *   probeFrame ∈ {V, Nproj}
 *   codecClip  ∈ {boundary, foldToHorizon, skip}
 *   resolve    ∈ {uniform, cosineWeighted}
 *
 * Scores all 8 ablation matrix cells against ssAchievable on all non-excluded
 * fixtures, emits a locked deterministic KernelAblationReport, picks a winner
 * per the pre-registered selection rule, and gates Stage-2 TSL edits.
 *
 * VBAONode.ts is NOT touched in Stage-1.
 * vbaoRuntimeFaithfulReference.ts is ONLY modified to export countOneBits.
 */

import {
  buildVFrame,
  faithfulCosineU,
  countOneBits,
  createRuntimeFaithfulReport,
} from './vbaoRuntimeFaithfulReference'
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

// ─── Fixed timestamp (enables deep-equal lock) ───────────────────────────────

export const KERNEL_ABLATION_GENERATED_AT = '1970-01-01T00:00:00.000Z'

// ─── Toggle types ─────────────────────────────────────────────────────────────

export type ProbeFrame = 'V' | 'Nproj'
export type CodecClip = 'boundary' | 'foldToHorizon' | 'skip'
export type ResolveMode = 'uniform' | 'cosineWeighted'

// ─── Cell descriptor ─────────────────────────────────────────────────────────

export interface AblationCell {
  readonly probeFrame: ProbeFrame
  readonly codecClip: CodecClip
  readonly resolve: ResolveMode
  /** true for probeFrame=V cells; false for probeFrame=Nproj diagnostic cells */
  readonly realizable: boolean
  /** Human-readable label */
  readonly label: string
}

// ─── Per-fixture result ───────────────────────────────────────────────────────

export interface AblationFixtureScore {
  /** Ablated accessibility in [0,1] */
  readonly ablatedAccessibility: number
  /** ssAchievable for this fixture */
  readonly ssAchievable: number
  /** ssAchievable − ablatedAccessibility (positive = over-occlusion, negative = under-occlusion) */
  readonly fixableDelta: number
}

// ─── Per-cell result ──────────────────────────────────────────────────────────

export interface AblationCellResult {
  readonly cell: AblationCell
  /** Per-fixture scores (excludes two-wall-corner) */
  readonly perFixture: Readonly<Record<string, AblationFixtureScore>>
  /** sqrt(mean(fixableDelta² over the two primary fixtures)) */
  readonly primaryAggregateRMSE: number
  /** Per-primary verdict */
  readonly primaryVerdict: Readonly<Record<string, 'collapsed' | 'residual'>>
  /**
   * True if all non-primary, non-excluded fixture |delta| growth vs baseline
   * is ≤ ε = 0.03 absolute. Undefined for the baseline cell itself (no guard needed).
   */
  readonly regressionGuardPass?: boolean | undefined
  /**
   * Only set on baseline cell: |delta vs P3-A faithfulAccessibility| < 1e-12.
   */
  readonly baselineAnchorOk?: boolean | undefined
}

// ─── Full report ──────────────────────────────────────────────────────────────

export interface KernelAblationReport {
  /** Fixed deterministic timestamp — DO NOT use wall clock. */
  readonly generatedAt: string
  readonly cameraSetId: 'ssao-cam-v1'
  readonly tau: 0.05
  readonly epsilon: 0.03
  readonly primaryFixtures: readonly ['grazing-surface-wall', 'normal-sensitive-side-contact']
  readonly excludedFixtures: readonly ['two-wall-corner']
  readonly cells: readonly AblationCellResult[]
  /** True if baseline cell matches P3-A faithfulAccessibility to 1e-12 across all fixtures */
  readonly baselineAnchorCheck: boolean
  /**
   * Winning realizable cell (min primaryAggregateRMSE passing regression guard
   * AND improving ≥ 0.02 vs baseline), or null if no winner.
   */
  readonly winner: { readonly cell: AblationCell; readonly reason: string } | null
  readonly stage2Gate: 'proceed-tsl' | 'defer'
  readonly selectionRule: string
  readonly verdict: string
}

// ─── Ablation matrix (8 cells) ────────────────────────────────────────────────

export const ABLATION_MATRIX: readonly AblationCell[] = [
  // Realizable cells (probeFrame=V)
  { probeFrame: 'V', codecClip: 'boundary',      resolve: 'uniform',        realizable: true,  label: 'V-boundary-uniform (BASELINE)' },
  { probeFrame: 'V', codecClip: 'boundary',      resolve: 'cosineWeighted', realizable: true,  label: 'V-boundary-cosineWeighted' },
  { probeFrame: 'V', codecClip: 'foldToHorizon', resolve: 'uniform',        realizable: true,  label: 'V-foldToHorizon-uniform' },
  { probeFrame: 'V', codecClip: 'foldToHorizon', resolve: 'cosineWeighted', realizable: true,  label: 'V-foldToHorizon-cosineWeighted' },
  { probeFrame: 'V', codecClip: 'skip',          resolve: 'uniform',        realizable: true,  label: 'V-skip-uniform' },
  // Diagnostic cells (probeFrame=Nproj)
  { probeFrame: 'Nproj', codecClip: 'boundary',      resolve: 'uniform',        realizable: false, label: 'Nproj-boundary-uniform (DIAGNOSTIC)' },
  { probeFrame: 'Nproj', codecClip: 'foldToHorizon', resolve: 'uniform',        realizable: false, label: 'Nproj-foldToHorizon-uniform (DIAGNOSTIC)' },
  { probeFrame: 'Nproj', codecClip: 'foldToHorizon', resolve: 'cosineWeighted', realizable: false, label: 'Nproj-foldToHorizon-cosineWeighted (DIAGNOSTIC)' },
]

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTOR_COUNT = 32
const PRIMARY_FIXTURES = ['grazing-surface-wall', 'normal-sensitive-side-contact'] as const
const EXCLUDED_FIXTURES = ['two-wall-corner'] as const
const TAU = 0.05
const EPSILON = 0.03

const SELECTION_RULE =
  'Winner: realizable cell (probeFrame=V) with min primaryAggregateRMSE that passes ' +
  'regression guard (all non-primary non-excluded |delta| growth ≤ ε=0.03 vs baseline) ' +
  'AND improves primary RMSE by ≥ 0.02 vs baseline. ' +
  'Stage2Gate=proceed-tsl: at least one realizable cell passes guard AND both primary |delta| ' +
  'reduced ≥ 50% vs baseline (or |delta| < τ=0.05). ' +
  'Excluded: two-wall-corner (methodology artifact — corner geometry violates sliced-horizon assumption).'

// ─── Cosine weights ───────────────────────────────────────────────────────────

/**
 * Per-sector cosine weights for the cosineWeighted resolve mode.
 * weight_k = sqrt(1 − (2·(k+0.5)/32 − 1)²) for k = 0..31.
 * Derived from: sector center u_k = (k+0.5)/32; sinBeta_k = 2*u_k - 1;
 * weight = cos(asin(sinBeta_k)) = sqrt(1 - sinBeta_k²).
 */
export const COSINE_WEIGHTS: readonly number[] = Array.from({ length: SECTOR_COUNT }, (_, k) => {
  const u = (k + 0.5) / SECTOR_COUNT
  const sinBeta = 2 * u - 1
  return Math.sqrt(1 - sinBeta * sinBeta)
})

export const COSINE_WEIGHT_TOTAL: number = COSINE_WEIGHTS.reduce((s, w) => s + w, 0)

// ─── Vec3 helpers (local copies — P3-A versions not exported) ─────────────────

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

// ─── codecClip variants ───────────────────────────────────────────────────────

/**
 * Apply a codecClip variant to produce the sector index u ∈ [0,1], or -1 (skip sentinel).
 *
 * boundary:      existing faithfulCosineU result — cosBeta<0 → clampedBoundary select.
 * foldToHorizon: clamp(interior, 0, 1) unconditionally — no cosBeta<0 branch.
 * skip:          returns -1 sentinel when cosBeta<0 (below-horizon direction excluded).
 */
export function applyCodecClip(
  D: RaycastVec3,
  V: RaycastVec3,
  S: RaycastVec3,
  sinGamma: number,
  cosGamma: number,
  mode: CodecClip,
): number {
  const x = dot3(D, S)
  const y = Math.max(dot3(D, V), 1e-5)
  const invLen = 1.0 / Math.sqrt(Math.max(x * x + y * y, 1e-8))
  const sinBeta = (x * cosGamma - y * sinGamma) * invLen
  const cosBeta = (y * cosGamma + x * sinGamma) * invLen
  const interior = sinBeta * 0.5 + 0.5
  const clampedBoundary = sinBeta >= 0 ? 1 : 0

  switch (mode) {
    case 'boundary':
      if (cosBeta < 0) return clampedBoundary
      return Math.min(1, Math.max(0, interior))

    case 'foldToHorizon':
      // Drop the cosBeta<0 branch — clamp unconditionally.
      // Monotonicity: interior = sinBeta*0.5+0.5 is monotone in sinBeta which is
      // monotone in alpha (elevation angle); clamp preserves monotonicity.
      return Math.min(1, Math.max(0, interior))

    case 'skip':
      // Below-horizon directions contribute no bit.
      if (cosBeta < 0) return -1
      return Math.min(1, Math.max(0, interior))
  }
}

// ─── resolve variants ─────────────────────────────────────────────────────────

/**
 * Compute slice accessibility from an occluded sector bitmask.
 *
 * uniform:        1 − countOneBits(mask) / 32
 * cosineWeighted: 1 − (Σ weight_k for set bits k) / COSINE_WEIGHT_TOTAL
 */
export function applyResolve(mask: number, mode: ResolveMode): number {
  if (mode === 'uniform') {
    return 1 - countOneBits(mask) / SECTOR_COUNT
  }
  // cosineWeighted
  let occludedWeight = 0
  for (let k = 0; k < SECTOR_COUNT; k++) {
    if ((mask >>> k) & 1) {
      occludedWeight += COSINE_WEIGHTS[k] ?? 0
    }
  }
  return 1 - occludedWeight / COSINE_WEIGHT_TOTAL
}

// ─── Ablated estimator ────────────────────────────────────────────────────────

export interface AblatedEstimateOptions {
  readonly slices?: number
  readonly probesPerSide?: number
  readonly rotation?: number
}

/**
 * Ablated AO estimate for one fixture from one camera eye.
 *
 * Mirrors evaluateRuntimeFaithfulEstimate (P3-A) but branches on cell toggles.
 * When cell === {V, boundary, uniform} the arithmetic is byte-identical to P3-A.
 */
export function evaluateAblatedEstimate(
  fixture: RaycastAoFixture,
  eye: RaycastVec3,
  cell: AblationCell,
  options?: AblatedEstimateOptions,
): { estimate: number; degenerateWeight: boolean } {
  const sliceCount = Math.max(0, Math.round(options?.slices ?? 4))
  const probesPerSide = Math.max(1, Math.round(options?.probesPerSide ?? 4096))
  const rotation = options?.rotation ?? 0.5

  const N = fixture.normal as RaycastVec3
  const { V, T0, T1 } = buildVFrame(eye, fixture.point as RaycastVec3)

  let weightedAccessibility = 0
  let weightSum = 0

  for (let i = 0; i < sliceCount; i++) {
    const phi = ((i + rotation) / sliceCount) * Math.PI
    const S_i = normalize3(add3(scale3(T0, Math.cos(phi)), scale3(T1, Math.sin(phi))))
    const B_i = normalize3(cross3(S_i, V))

    const NprojRaw = [
      N[0] - B_i[0] * dot3(N, B_i),
      N[1] - B_i[1] * dot3(N, B_i),
      N[2] - B_i[2] * dot3(N, B_i),
    ] as RaycastVec3
    const NprojLen = Math.sqrt(Math.max(dot3(NprojRaw, NprojRaw), 1e-8))
    const Nproj = scale3(NprojRaw, 1.0 / NprojLen)

    const sinGamma = dot3(Nproj, S_i)
    const cosGamma = Math.max(dot3(Nproj, V), 1e-5)

    // Elevation basis: V for realizable cells, Nproj for diagnostic cells.
    const elevationBasis: RaycastVec3 = cell.probeFrame === 'V' ? V : Nproj

    let occludedMask = 0

    for (let sideIdx = 0; sideIdx < 2; sideIdx++) {
      const sideSign = sideIdx === 0 ? 1 : -1
      const sampleDir = scale3(S_i, sideSign)

      for (let j = 0; j < probesPerSide; j++) {
        const stepT = (j + 0.5) / probesPerSide
        const alpha = stepT * Math.PI
        // D = normalize(sampleDir * cos(alpha) + elevationBasis * sin(alpha))
        const D = normalize3(
          add3(scale3(sampleDir, Math.cos(alpha)), scale3(elevationBasis, Math.sin(alpha))),
        )

        if (isRaycastDirectionOccluded(fixture, D)) {
          const u = applyCodecClip(D, V, S_i, sinGamma, cosGamma, cell.codecClip)
          if (u < 0) continue // skip sentinel — do not set bit
          const bin = Math.min(SECTOR_COUNT - 1, Math.max(0, Math.floor(u * SECTOR_COUNT)))
          occludedMask = (occludedMask | (1 << bin)) >>> 0
        }
      }
    }

    const sliceAccessibility = applyResolve(occludedMask, cell.resolve)
    weightedAccessibility += sliceAccessibility * NprojLen
    weightSum += NprojLen
  }

  if (weightSum < 1e-7) {
    return { estimate: 1.0, degenerateWeight: true }
  }

  const estimate = Math.min(1, Math.max(0, weightedAccessibility / Math.max(weightSum, 1e-4)))
  return { estimate, degenerateWeight: false }
}

// ─── Regression guard ─────────────────────────────────────────────────────────

/**
 * Check if a cell's non-primary fixture deltas don't regress by more than ε vs baseline.
 *
 * A cell passes the guard if, for every non-primary non-excluded fixture,
 * |cellDelta| − |baselineDelta| ≤ ε (absolute growth).
 */
export function checkRegressionGuard(
  cellResult: AblationCellResult,
  baselineResult: AblationCellResult,
  eps: number = EPSILON,
): boolean {
  for (const [fixtureId, score] of Object.entries(cellResult.perFixture)) {
    if ((PRIMARY_FIXTURES as readonly string[]).includes(fixtureId)) continue
    if ((EXCLUDED_FIXTURES as readonly string[]).includes(fixtureId)) continue
    const baselineScore = baselineResult.perFixture[fixtureId]
    if (!baselineScore) continue
    const growth = Math.abs(score.fixableDelta) - Math.abs(baselineScore.fixableDelta)
    if (growth > eps) return false
  }
  return true
}

// ─── Winner selection ─────────────────────────────────────────────────────────

/**
 * Select the winner among realizable cells.
 *
 * Rules:
 * 1. Only realizable===true cells are considered.
 * 2. Cell must pass the regression guard vs baseline.
 * 3. Cell must improve primaryAggregateRMSE by ≥ 0.02 vs baseline.
 * 4. Among qualifying cells, select the one with min primaryAggregateRMSE.
 * 5. If no qualifying cell, winner=null, verdict='no-realizable-winner'.
 */
export function selectWinner(
  cells: readonly AblationCellResult[],
  baselineResult: AblationCellResult,
): { winner: AblationCellResult | null; verdict: string } {
  const IMPROVEMENT_THRESHOLD = 0.02
  const realizable = cells.filter((c) => c.cell.realizable)

  let best: AblationCellResult | null = null
  for (const cell of realizable) {
    const improvesEnough =
      baselineResult.primaryAggregateRMSE - cell.primaryAggregateRMSE >= IMPROVEMENT_THRESHOLD
    if (!improvesEnough) continue
    const guardsPass = checkRegressionGuard(cell, baselineResult)
    if (!guardsPass) continue
    if (best === null || cell.primaryAggregateRMSE < best.primaryAggregateRMSE) {
      best = cell
    }
  }

  if (best === null) {
    return {
      winner: null,
      verdict: 'no-realizable-winner',
    }
  }

  return {
    winner: best,
    verdict: `${best.cell.label} selected (primaryRMSE=${best.primaryAggregateRMSE.toFixed(5)})`,
  }
}

// ─── Stage-2 gate ─────────────────────────────────────────────────────────────

/**
 * Compute the stage-2 gate.
 *
 * 'proceed-tsl': at least one realizable cell passes regression guard AND
 *   achieves partial success on BOTH primary fixtures:
 *   per-fixture |delta| reduced ≥ 50% vs baseline OR |delta| < τ = 0.05.
 * 'defer': no such cell.
 */
export function computeStage2Gate(
  cells: readonly AblationCellResult[],
  baselineResult: AblationCellResult,
  tau: number = TAU,
): 'proceed-tsl' | 'defer' {
  const realizable = cells.filter((c) => c.cell.realizable)

  for (const cell of realizable) {
    const guardsPass = checkRegressionGuard(cell, baselineResult)
    if (!guardsPass) continue

    // Check partial success on BOTH primaries
    let bothPass = true
    for (const pid of PRIMARY_FIXTURES) {
      const cellScore = cell.perFixture[pid]
      const baselineScore = baselineResult.perFixture[pid]
      if (!cellScore || !baselineScore) { bothPass = false; break }

      const cellAbs = Math.abs(cellScore.fixableDelta)
      const baselineAbs = Math.abs(baselineScore.fixableDelta)
      const reducedEnough = baselineAbs > 0
        ? (baselineAbs - cellAbs) / baselineAbs >= 0.5
        : cellAbs < tau
      const belowTau = cellAbs < tau

      if (!reducedEnough && !belowTau) { bothPass = false; break }
    }

    if (bothPass) return 'proceed-tsl'
  }

  return 'defer'
}

// ─── Report assembly ──────────────────────────────────────────────────────────

/**
 * Assemble the full KernelAblationReport.
 * Uses KERNEL_ABLATION_GENERATED_AT for deep-equal locking.
 * Realizable cells use probesPerSide=4096; Nproj diagnostic cells use 1024.
 */
export function createKernelAblationReport(): KernelAblationReport {
  // Get P3-A locked accessibilities for baseline anchor check
  const p3aReport = createRuntimeFaithfulReport()
  const p3aByFixture: Record<string, number> = {}
  for (const f of p3aReport.fixtures) {
    p3aByFixture[f.id] = f.faithfulAccessibility
  }

  const REALIZABLE_PROBES = 4096
  const DIAGNOSTIC_PROBES = 1024

  const cellResults: AblationCellResult[] = []

  for (const cell of ABLATION_MATRIX) {
    const probesPerSide = cell.realizable ? REALIZABLE_PROBES : DIAGNOSTIC_PROBES
    const perFixture: Record<string, AblationFixtureScore> = {}

    for (const fixture of RAYCAST_AO_FIXTURES) {
      if ((EXCLUDED_FIXTURES as readonly string[]).includes(fixture.id)) continue

      const fixtureId = fixture.id as keyof typeof SS_AO_FIXTURE_CAMERAS
      const camera = SS_AO_FIXTURE_CAMERAS[fixtureId]
      const eye = camera.eye as RaycastVec3

      const { estimate: ablatedAccessibility } = evaluateAblatedEstimate(fixture, eye, cell, {
        slices: 4,
        probesPerSide,
        rotation: 0.5,
      })

      const ssResult = evaluateScreenSpaceAchievableAo(fixture, camera)
      const ssAchievable = ssResult.accessibility
      const fixableDelta = ssAchievable - ablatedAccessibility

      perFixture[fixture.id] = { ablatedAccessibility, ssAchievable, fixableDelta }
    }

    // Compute primary RMSE
    let squaredSum = 0
    for (const pid of PRIMARY_FIXTURES) {
      const score = perFixture[pid]
      if (score) squaredSum += score.fixableDelta * score.fixableDelta
    }
    const primaryAggregateRMSE = Math.sqrt(squaredSum / PRIMARY_FIXTURES.length)

    // Per-primary verdict
    const primaryVerdict: Record<string, 'collapsed' | 'residual'> = {}
    for (const pid of PRIMARY_FIXTURES) {
      const score = perFixture[pid]
      primaryVerdict[pid] = score && Math.abs(score.fixableDelta) < TAU ? 'collapsed' : 'residual'
    }

    // Baseline anchor check (only for the baseline cell)
    const isBaselineCell =
      cell.probeFrame === 'V' && cell.codecClip === 'boundary' && cell.resolve === 'uniform'

    const baselineAnchorOk = isBaselineCell
      ? RAYCAST_AO_FIXTURES
          .filter((f) => !(EXCLUDED_FIXTURES as readonly string[]).includes(f.id))
          .every((f) => {
            const score = perFixture[f.id]
            const p3a = p3aByFixture[f.id]
            return score !== undefined && p3a !== undefined
              ? Math.abs(score.ablatedAccessibility - p3a) < 1e-12
              : true
          })
      : undefined

    cellResults.push({
      cell,
      perFixture,
      primaryAggregateRMSE,
      primaryVerdict,
      baselineAnchorOk,
    })
  }

  // Find baseline cell result
  const baselineResult = cellResults.find(
    (r) => r.cell.probeFrame === 'V' && r.cell.codecClip === 'boundary' && r.cell.resolve === 'uniform',
  )!

  // Attach regressionGuardPass to non-baseline cells
  const cellResultsWithGuard: AblationCellResult[] = cellResults.map((r) => {
    const isBaseline =
      r.cell.probeFrame === 'V' && r.cell.codecClip === 'boundary' && r.cell.resolve === 'uniform'
    if (isBaseline) return r
    return {
      ...r,
      regressionGuardPass: checkRegressionGuard(r, baselineResult),
    }
  })

  const baselineResultWithGuard = cellResultsWithGuard.find(
    (r) => r.cell.probeFrame === 'V' && r.cell.codecClip === 'boundary' && r.cell.resolve === 'uniform',
  )!

  const { winner: winnerResult, verdict } = selectWinner(cellResultsWithGuard, baselineResultWithGuard)
  const stage2Gate = computeStage2Gate(cellResultsWithGuard, baselineResultWithGuard)

  const winner = winnerResult
    ? { cell: winnerResult.cell, reason: verdict }
    : null

  const baselineAnchorCheck = baselineResult.baselineAnchorOk ?? false

  return {
    generatedAt: KERNEL_ABLATION_GENERATED_AT,
    cameraSetId: 'ssao-cam-v1',
    tau: TAU,
    epsilon: EPSILON,
    primaryFixtures: ['grazing-surface-wall', 'normal-sensitive-side-contact'],
    excludedFixtures: ['two-wall-corner'],
    cells: cellResultsWithGuard,
    baselineAnchorCheck,
    winner,
    stage2Gate,
    selectionRule: SELECTION_RULE,
    verdict,
  }
}

// ─── Markdown formatter ───────────────────────────────────────────────────────

/**
 * Format the kernel ablation report as a Markdown section.
 *
 * Winner selection rule and decision appear BEFORE numeric table rows.
 * Includes a 'realizable' column. Annotates two-wall-corner exclusion.
 */
export function formatKernelAblationReportMarkdown(report: KernelAblationReport): string {
  const lines: string[] = [
    '## P3-B: Kernel Ablation Study',
    '',
    '### Selection Rule',
    '',
    report.selectionRule,
    '',
    '### Winner',
    '',
  ]

  if (report.winner) {
    lines.push(`**Winner**: ${report.winner.cell.label}`)
    lines.push(`**Reason**: ${report.winner.reason}`)
  } else {
    lines.push(`**Winner**: none — ${report.verdict}`)
  }
  lines.push('')
  lines.push(`**Stage-2 Gate**: ${report.stage2Gate}`)
  lines.push(`**Baseline Anchor Check**: ${report.baselineAnchorCheck}`)
  lines.push(`**tau**: ${report.tau}  **epsilon**: ${report.epsilon}`)
  lines.push('')
  lines.push('### Ablation Matrix')
  lines.push('')
  lines.push(
    '| Cell | realizable | primaryRMSE | regressionGuardPass | grazing-surface-wall Δ | normal-sensitive-side-contact Δ |',
  )
  lines.push('| --- | --- | ---: | --- | ---: | ---: |')

  for (const cell of report.cells) {
    const graz = cell.perFixture['grazing-surface-wall']?.fixableDelta ?? NaN
    const side = cell.perFixture['normal-sensitive-side-contact']?.fixableDelta ?? NaN
    const guardStr =
      cell.regressionGuardPass === undefined ? 'baseline' : String(cell.regressionGuardPass)
    lines.push(
      `| ${cell.cell.label} | ${cell.cell.realizable} | ${cell.primaryAggregateRMSE.toFixed(5)} | ${guardStr} | ${graz.toFixed(5)} | ${side.toFixed(5)} |`,
    )
  }

  lines.push('')
  lines.push('### Exclusion Notes')
  lines.push('')
  lines.push(
    '- **two-wall-corner**: excluded from primary metrics, regression guard, and winner selection. ' +
      'Methodology artifact — corner geometry violates sliced-horizon assumption of the VBAO kernel.',
  )
  lines.push('')
  lines.push(`*Generated at: ${report.generatedAt}*`)
  lines.push(`*Camera set: ${report.cameraSetId}*`)
  lines.push('')

  return lines.join('\n')
}

// ─── EVIDENCE.md append ───────────────────────────────────────────────────────

/**
 * Generate the Markdown section to be appended to EVIDENCE.md for P3-B.
 *
 * No Node.js I/O: the caller provides the writer callback (same pattern as P3-A).
 */
export function appendKernelAblationEvidence(
  report?: KernelAblationReport,
  writer?: (section: string, existingContent: string) => void,
): string {
  const r = report ?? createKernelAblationReport()
  const section = formatKernelAblationReportMarkdown(r)
  if (writer) {
    writer(section, '')
  }
  return section
}
