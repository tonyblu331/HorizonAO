import { SECTOR_COUNT } from '../src/vbaoConstants'
import { VBAO_THETA_MIN } from './vbaoThetaConstants'
import {
  add3,
  dot3,
  length3,
  normalize3,
  scale3,
  sub3,
  type Vec3,
} from './vec3Math'

export type { Vec3 }

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function clampTheta(value: number): number {
  return Math.max(VBAO_THETA_MIN, Math.min(Math.PI / 2, value))
}

export function sampleGtVbaoAxialSliceDirection(
  sliceIndex: number,
  sliceCount: number,
  rotation: number,
  t0: Vec3,
  t1: Vec3,
): Vec3 {
  const safeCount = Math.max(1, sliceCount)
  const phi = (Math.PI * (sliceIndex + rotation)) / safeCount
  return normalize3(add3(scale3(t0, Math.cos(phi)), scale3(t1, Math.sin(phi))))
}

export function gtVbaoSliceLocalCdf(theta: number, normalAngle: number): number {
  const beta = clampTheta(theta - normalAngle)
  return 0.5 * (Math.sin(beta) + 1)
}

export function gtVbaoSliceLocalCdfRemap(
  theta0: number,
  theta1: number,
  normalAngle: number,
): { readonly theta0: number; readonly theta1: number } {
  const c0 = gtVbaoSliceLocalCdf(theta0, normalAngle)
  const c1 = gtVbaoSliceLocalCdf(theta1, normalAngle)
  return {
    theta0: VBAO_THETA_MIN + Math.min(c0, c1) * Math.PI,
    theta1: VBAO_THETA_MIN + Math.max(c0, c1) * Math.PI,
  }
}

function maskRangeExclusive(k0: number, k1: number): number {
  const lo = Math.max(0, Math.min(SECTOR_COUNT, k0))
  const hiExclusive = Math.max(0, Math.min(SECTOR_COUNT, k1))
  const count = hiExclusive - lo
  if (count <= 0) return 0
  if (count >= SECTOR_COUNT) return 0xffffffff
  return ((-1 >>> (SECTOR_COUNT - count)) << lo) >>> 0
}

export function buildGtVbaoPointSampleMask(
  theta0: number,
  theta1: number,
  normalAngle: number,
): number {
  if (theta0 === theta1) return 0

  const remapped = gtVbaoSliceLocalCdfRemap(theta0, theta1, normalAngle)
  const u0 = clamp01((remapped.theta0 - VBAO_THETA_MIN) / Math.PI)
  const u1 = clamp01((remapped.theta1 - VBAO_THETA_MIN) / Math.PI)
  const first = Math.ceil(Math.min(u0, u1) * SECTOR_COUNT - 0.5)
  const last = Math.floor(Math.max(u0, u1) * SECTOR_COUNT - 0.5)
  return maskRangeExclusive(first, last + 1)
}

export interface GtVbaoSampleIntervalInput {
  readonly samplePosition: Vec3
  readonly pixelPosition: Vec3
  readonly viewDir: Vec3
  readonly sliceDir: Vec3
  readonly thickness: number
  readonly normalAngle: number
}

export function buildGtVbaoSampleInterval(input: GtVbaoSampleIntervalInput): {
  readonly theta0: number
  readonly theta1: number
  readonly mask: number
} {
  const sampleViewDir = normalize3(scale3(input.samplePosition, -1))
  const backPosition = sub3(input.samplePosition, scale3(sampleViewDir, input.thickness))
  const frontDir = normalize3(sub3(input.samplePosition, input.pixelPosition))
  const backDir = normalize3(sub3(backPosition, input.pixelPosition))
  const viewDir = normalize3(input.viewDir)
  const sliceDir = normalize3(input.sliceDir)
  const thetaFront = Math.atan2(dot3(frontDir, sliceDir), Math.max(dot3(frontDir, viewDir), 1e-5))
  const thetaBack = Math.atan2(dot3(backDir, sliceDir), Math.max(dot3(backDir, viewDir), 1e-5))
  const theta0 = Math.min(thetaFront, thetaBack)
  const theta1 = Math.max(thetaFront, thetaBack)

  return {
    theta0,
    theta1,
    mask: buildGtVbaoPointSampleMask(theta0, theta1, input.normalAngle),
  }
}

export function popcount32(mask: number): number {
  let n = mask >>> 0
  let count = 0
  while (n !== 0) {
    n &= n - 1
    count++
  }
  return count
}

export function popcountReduction(mask: number): number {
  return 1 - popcount32(mask) / SECTOR_COUNT
}

export function cosineMeasureReduction(mask: number): number {
  return popcountReduction(mask)
}

export function cosineWeightedReduction(mask: number, gammaNorm: number): number {
  const cosGamma = Math.cos(gammaNorm)
  const sinGamma = Math.sin(gammaNorm)
  let numerator = 0
  let denominator = 0

  for (let k = 0; k < SECTOR_COUNT; k++) {
    const theta = VBAO_THETA_MIN + (k + 0.5) * (Math.PI / SECTOR_COUNT)
    const w = Math.max(0, Math.cos(theta) * cosGamma + Math.sin(theta) * sinGamma)
    denominator += w
    if (((mask >>> k) & 1) === 0) numerator += w
  }

  return denominator === 0 ? 1 : numerator / denominator
}
