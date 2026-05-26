import type { Vec3 } from './vbaoReference'

export interface VbaoEdgeMetricsInput {
  readonly centerPosition: Vec3
  readonly centerNormal: Vec3
  readonly neighborPosition: Vec3
  readonly neighborNormal: Vec3
}

export interface VbaoEdgeConfidenceInput extends VbaoEdgeMetricsInput {
  readonly validSamples: number
  readonly sampleBudget: number
  readonly depthRange: number
  readonly normalAgreement?: number
  readonly maskCoverage?: number
  readonly depthRangeSigma?: number
}

export interface VbaoEdgeMetrics {
  readonly edgeDepth: number
  readonly edgeNormal: number
  readonly normalDot: number
}

export interface VbaoEdgeConfidenceMetadata extends VbaoEdgeMetrics {
  readonly confidence: number
  readonly validSampleRatio: number
  readonly depthRangeConfidence: number
  readonly normalAgreement: number
  readonly maskCoverage: number
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function sub3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function normalize3(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2])
  if (len < 1e-10) return [0, 0, 0]
  return [v[0] / len, v[1] / len, v[2] / len]
}

export function computeVbaoEdgeMetrics(input: VbaoEdgeMetricsInput): VbaoEdgeMetrics {
  const centerNormal = normalize3(input.centerNormal)
  const neighborNormal = normalize3(input.neighborNormal)
  const normalDot = clamp01(dot3(centerNormal, neighborNormal))
  const edgeDepth = Math.abs(dot3(sub3(input.neighborPosition, input.centerPosition), centerNormal))

  return {
    edgeDepth,
    edgeNormal: 1 - normalDot,
    normalDot,
  }
}

export function computeVbaoEdgeConfidenceMetadata(
  input: VbaoEdgeConfidenceInput,
): VbaoEdgeConfidenceMetadata {
  const metrics = computeVbaoEdgeMetrics(input)
  const sampleBudget = Math.max(1, Math.floor(input.sampleBudget))
  const validSampleRatio = clamp01(Math.max(0, input.validSamples) / sampleBudget)
  const depthRangeSigma = Math.max(1e-6, input.depthRangeSigma ?? 0.05)
  const depthRangeConfidence = Math.exp(-Math.max(0, input.depthRange) / depthRangeSigma)
  const normalAgreement = clamp01(input.normalAgreement ?? metrics.normalDot)
  const maskCoverage = clamp01(input.maskCoverage ?? 1)

  return {
    ...metrics,
    confidence: clamp01(
      validSampleRatio * depthRangeConfidence * normalAgreement * maskCoverage,
    ),
    validSampleRatio,
    depthRangeConfidence,
    normalAgreement,
    maskCoverage,
  }
}
