import type { Vec3 } from './vbaoReference'

export type VbaoQualityFailureLabel =
  | 'noise'
  | 'mud'
  | 'halo'
  | 'thin-gap'
  | 'edge-bleed'
  | 'scale-mismatch'
  | 'false-curvature'

export interface HemisphereAccessibilityOracleOptions {
  readonly normal: Vec3
  readonly sampleCount: number
  readonly occludes: (direction: Vec3, sampleIndex: number) => boolean
}

export interface AccessibilityGroundTruthScoreInput {
  readonly actual: number
  readonly expected: number
}

export interface AccessibilityGroundTruthScore {
  readonly actual: number
  readonly expected: number
  readonly absoluteError: number
  readonly quality: number
}

export interface VbaoQualityClassificationInput {
  readonly absoluteError: number
  readonly structuredNoise?: number
  readonly mudError?: number
  readonly edgeBleedError?: number
  readonly thinGapError?: number
  readonly haloError?: number
  readonly stairStepError?: number
}

export interface AccessibilityOracleCandidateEvaluationInput {
  readonly rawAccessibility: number
  readonly candidateAccessibility: number
  readonly expectedAccessibility: number
  readonly candidateArtifacts?: Partial<VbaoQualityClassificationInput>
  readonly minQualityImprovement?: number
  readonly maxQualityRegression?: number
}

export interface AccessibilityOracleCandidateEvaluation {
  readonly rawScore: AccessibilityGroundTruthScore
  readonly candidateScore: AccessibilityGroundTruthScore
  readonly qualityDelta: number
  readonly failureLabels: VbaoQualityFailureLabel[]
  readonly accepted: boolean
  readonly reason: string
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function normalize3(v: Vec3): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2])
  if (length < 1e-10) return [0, 0, 1]

  return [v[0] / length, v[1] / length, v[2] / length]
}

function cross3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function scale3(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s]
}

function add3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

function tangentBasis(normal: Vec3): readonly [Vec3, Vec3] {
  const n = normalize3(normal)
  const helper: Vec3 = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]
  const t0 = normalize3(cross3(n, helper))
  const t1 = normalize3(cross3(n, t0))

  return [t0, t1]
}

function fibonacciHemisphereDirection(sampleIndex: number, sampleCount: number, normal: Vec3): Vec3 {
  const safeCount = Math.max(1, Math.floor(sampleCount))
  const i = Math.max(0, Math.min(safeCount - 1, Math.floor(sampleIndex)))
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  const z = (i + 0.5) / safeCount
  const r = Math.sqrt(Math.max(0, 1 - z * z))
  const phi = i * goldenAngle
  const localX = Math.cos(phi) * r
  const localY = Math.sin(phi) * r
  const [t0, t1] = tangentBasis(normal)
  const n = normalize3(normal)

  return normalize3(add3(add3(scale3(t0, localX), scale3(t1, localY)), scale3(n, z)))
}

export function estimateHemisphereAccessibility(
  options: HemisphereAccessibilityOracleOptions,
): number {
  const sampleCount = Math.max(1, Math.floor(options.sampleCount))
  let openSamples = 0

  for (let i = 0; i < sampleCount; i++) {
    const direction = fibonacciHemisphereDirection(i, sampleCount, options.normal)
    if (!options.occludes(direction, i)) {
      openSamples += 1
    }
  }

  return openSamples / sampleCount
}

export function scoreAccessibilityAgainstGroundTruth(
  input: AccessibilityGroundTruthScoreInput,
): AccessibilityGroundTruthScore {
  const actual = clamp01(input.actual)
  const expected = clamp01(input.expected)
  const absoluteError = Math.abs(actual - expected)

  return {
    actual,
    expected,
    absoluteError,
    quality: clamp01(1 - absoluteError),
  }
}

export function classifyVbaoQuality(
  input: VbaoQualityClassificationInput,
): VbaoQualityFailureLabel[] {
  const labels: VbaoQualityFailureLabel[] = []

  if ((input.structuredNoise ?? 0) >= 0.05) labels.push('noise')
  if ((input.mudError ?? 0) >= 0.12) labels.push('mud')
  if ((input.haloError ?? 0) >= 0.1) labels.push('halo')
  if ((input.thinGapError ?? 0) >= 0.1) labels.push('thin-gap')
  if ((input.edgeBleedError ?? 0) >= 0.1) labels.push('edge-bleed')
  if (input.absoluteError >= 0.2) labels.push('scale-mismatch')
  if ((input.stairStepError ?? 0) >= 0.1) labels.push('false-curvature')

  return labels
}

export function evaluateAccessibilityCandidateAgainstOracle(
  input: AccessibilityOracleCandidateEvaluationInput,
): AccessibilityOracleCandidateEvaluation {
  const rawScore = scoreAccessibilityAgainstGroundTruth({
    actual: input.rawAccessibility,
    expected: input.expectedAccessibility,
  })
  const candidateScore = scoreAccessibilityAgainstGroundTruth({
    actual: input.candidateAccessibility,
    expected: input.expectedAccessibility,
  })
  const qualityDelta = candidateScore.quality - rawScore.quality
  const failureLabels = classifyVbaoQuality({
    ...input.candidateArtifacts,
    absoluteError: candidateScore.absoluteError,
  })
  const minQualityImprovement = input.minQualityImprovement ?? 0
  const maxQualityRegression = input.maxQualityRegression ?? 0

  if (candidateScore.quality + maxQualityRegression < rawScore.quality) {
    return {
      rawScore,
      candidateScore,
      qualityDelta,
      failureLabels,
      accepted: false,
      reason: 'rejected by oracle: candidate regresses ground-truth quality',
    }
  }

  if (failureLabels.length > 0) {
    return {
      rawScore,
      candidateScore,
      qualityDelta,
      failureLabels,
      accepted: false,
      reason: `rejected by oracle: candidate has ${failureLabels.join(',')} failure labels`,
    }
  }

  if (qualityDelta < minQualityImprovement) {
    return {
      rawScore,
      candidateScore,
      qualityDelta,
      failureLabels,
      accepted: false,
      reason: 'rejected by oracle: candidate does not improve enough over raw VBAO',
    }
  }

  return {
    rawScore,
    candidateScore,
    qualityDelta,
    failureLabels,
    accepted: true,
    reason: 'accepted by oracle: candidate improves or preserves ground-truth quality',
  }
}
