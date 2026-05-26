import type { Vec3 } from './vbaoReference'
import type { VbaoEdgeConfidenceMetadata } from './vbaoEdgeConfidence'

export interface VbaoDenoiseSample {
  readonly accessibility: number
  readonly position: Vec3
  readonly normal: Vec3
  readonly valid?: boolean
  readonly kernelWeight?: number
  readonly confidence?: number
  readonly metadata?: Pick<VbaoEdgeConfidenceMetadata, 'edgeDepth' | 'edgeNormal' | 'confidence'>
}

export interface VbaoSpatialDenoiseOptions {
  readonly depthSigma: number
  readonly minNormalDot: number
  readonly normalPower: number
}

export const VBAO_SPATIAL_DENOISE_DEFAULTS = Object.freeze({
  depthSigma: 0.06,
  minNormalDot: 0.5,
  normalPower: 8,
} as const satisfies VbaoSpatialDenoiseOptions)

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

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function resolveOptions(
  options: Partial<VbaoSpatialDenoiseOptions> = {},
): VbaoSpatialDenoiseOptions {
  return {
    ...VBAO_SPATIAL_DENOISE_DEFAULTS,
    ...options,
    depthSigma: Math.max(1e-6, options.depthSigma ?? VBAO_SPATIAL_DENOISE_DEFAULTS.depthSigma),
    normalPower: Math.max(0, options.normalPower ?? VBAO_SPATIAL_DENOISE_DEFAULTS.normalPower),
  }
}

export function computeVbaoSpatialDenoiseWeight(
  center: VbaoDenoiseSample,
  neighbor: VbaoDenoiseSample,
  options?: Partial<VbaoSpatialDenoiseOptions>,
): number {
  if (center.valid === false || neighbor.valid === false) return 0

  const resolved = resolveOptions(options)
  const centerNormal = normalize3(center.normal)
  const neighborNormal = normalize3(neighbor.normal)
  const rawNormalDot = Math.max(0, dot3(centerNormal, neighborNormal))
  const normalDot =
    neighbor.metadata?.edgeNormal === undefined ? rawNormalDot : clamp01(1 - neighbor.metadata.edgeNormal)

  if (normalDot < resolved.minNormalDot) return 0

  const tangentPlaneDistance =
    neighbor.metadata?.edgeDepth ??
    Math.abs(dot3(sub3(neighbor.position, center.position), centerNormal))
  const depthWeight = Math.exp(-tangentPlaneDistance / resolved.depthSigma)
  const normalWeight = Math.pow(normalDot, resolved.normalPower)

  const confidenceWeight =
    clamp01(neighbor.confidence ?? 1) * clamp01(neighbor.metadata?.confidence ?? 1)

  return Math.max(0, neighbor.kernelWeight ?? 1) * confidenceWeight * depthWeight * normalWeight
}

export function denoiseVbaoAccessibility(
  center: VbaoDenoiseSample,
  neighbors: readonly VbaoDenoiseSample[],
  options?: Partial<VbaoSpatialDenoiseOptions>,
): number {
  if (center.valid === false) return clamp01(center.accessibility)

  let weightedAccessibility = center.accessibility
  let totalWeight = 1

  for (const neighbor of neighbors) {
    const weight = computeVbaoSpatialDenoiseWeight(center, neighbor, options)
    weightedAccessibility += weight * neighbor.accessibility
    totalWeight += weight
  }

  return clamp01(weightedAccessibility / totalWeight)
}
