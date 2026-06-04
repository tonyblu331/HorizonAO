import {
  SECTOR_COUNT,
  VBAO_CONTACT_THICKNESS_RADIUS_RATIO,
  VBAO_NEAR_SAMPLE_THICKNESS_RATIO,
  VBAO_THETA_MIN,
  clampVbaoNodeOptions,
} from '../src/vbaoConstants'
import {
  buildGtVbaoSampleInterval,
  cosineMeasureReduction,
  sampleGtVbaoAxialSliceDirection,
  type Vec3,
} from './vbaoGtVbaoMath'

export type { Vec3 }

export interface ScalarVbaoSample {
  readonly position: Vec3
  readonly valid?: boolean
}

export type ScalarVbaoThicknessPolicy =
  | 'current'
  | 'adaptive-near-sample'
  | 'minimum-effective-floor'

export interface ScalarVbaoReferenceInput {
  readonly pixelPosition: Vec3
  readonly normal: Vec3
  readonly radius: number
  readonly thickness: number
  readonly slices: number
  readonly rotation?: number
  readonly thicknessPolicy?: ScalarVbaoThicknessPolicy
  readonly sampleProvider: (input: {
    readonly sliceIndex: number
    readonly sideSign: 1 | -1
    readonly sliceDir: Vec3
    readonly viewDir: Vec3
  }) => readonly ScalarVbaoSample[]
}

export interface ScalarVbaoReferenceResult {
  readonly accessibility: number
  readonly uniformAccessibility: number
  readonly projectedWeightedAccessibility: number
  readonly sliceMasks: readonly number[]
  readonly sliceAccessibilities: readonly number[]
  readonly sliceWeights: readonly number[]
}

function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function add3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

function sub3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function scale3(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s]
}

function cross3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function length3(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2])
}

function normalize3(v: Vec3): Vec3 {
  const len = length3(v)
  return len < 1e-10 ? [0, 0, 0] : [v[0] / len, v[1] / len, v[2] / len]
}

function buildViewLocalFrame(pixelPosition: Vec3): {
  readonly viewDir: Vec3
  readonly tangent0: Vec3
  readonly tangent1: Vec3
} {
  const viewDir = normalize3(scale3(pixelPosition, -1))
  const seed: Vec3 = Math.abs(viewDir[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]
  const tangent0 = normalize3(cross3(viewDir, seed))
  const tangent1 = normalize3(cross3(viewDir, tangent0))

  return { viewDir, tangent0, tangent1 }
}

function normalAngleForSlice(normal: Vec3, viewDir: Vec3, sliceDir: Vec3): number {
  const { projectedNormal } = projectNormalIntoSlice(normal, viewDir, sliceDir)

  return Math.atan2(dot3(projectedNormal, sliceDir), Math.max(dot3(projectedNormal, viewDir), 1e-5))
}

function projectNormalIntoSlice(normal: Vec3, viewDir: Vec3, sliceDir: Vec3): {
  readonly projectedNormal: Vec3
  readonly projectedLength: number
} {
  const bitangent = normalize3(cross3(sliceDir, viewDir))
  const projected = sub3(normal, scale3(bitangent, dot3(normal, bitangent)))
  const projectedLength = Math.max(length3(projected), 1e-8)
  const projectedNormal = scale3(projected, 1 / projectedLength)

  return { projectedNormal, projectedLength }
}

function resolveEffectiveThickness(
  policy: ScalarVbaoThicknessPolicy,
  baseThickness: number,
  sampleDist: number,
): number {
  const current = Math.min(baseThickness, sampleDist * VBAO_NEAR_SAMPLE_THICKNESS_RATIO)

  if (policy === 'minimum-effective-floor') {
    return Math.min(baseThickness, Math.max(current, baseThickness * 0.25))
  }

  if (policy === 'adaptive-near-sample') {
    return Math.min(baseThickness, Math.sqrt(baseThickness * current))
  }

  return current
}

export function makeScalarVbaoSampleAtTheta(input: {
  readonly pixelPosition: Vec3
  readonly viewDir: Vec3
  readonly sliceDir: Vec3
  readonly theta: number
  readonly distance: number
}): ScalarVbaoSample {
  const direction = normalize3(
    add3(
      scale3(input.sliceDir, Math.sin(input.theta)),
      scale3(input.viewDir, Math.max(1e-5, Math.cos(input.theta))),
    ),
  )

  return {
    position: add3(input.pixelPosition, scale3(direction, input.distance)),
  }
}

export function evaluateScalarVbaoReference(input: ScalarVbaoReferenceInput): ScalarVbaoReferenceResult {
  const options = clampVbaoNodeOptions({
    radius: input.radius,
    thickness: input.thickness,
    slices: input.slices,
    samples: SECTOR_COUNT,
  })
  const { viewDir, tangent0, tangent1 } = buildViewLocalFrame(input.pixelPosition)
  const baseThickness = Math.min(
    options.thickness,
    options.radius * VBAO_CONTACT_THICKNESS_RADIUS_RATIO,
  )
  const maxValidRadius = options.radius + baseThickness
  const maxValidRadius2 = maxValidRadius * maxValidRadius
  const sliceMasks: number[] = []
  const sliceAccessibilities: number[] = []
  const sliceWeights: number[] = []
  const normal = normalize3(input.normal)
  const thicknessPolicy = input.thicknessPolicy ?? 'current'

  for (let sliceIndex = 0; sliceIndex < options.slices; sliceIndex++) {
    const sliceDir = sampleGtVbaoAxialSliceDirection(
      sliceIndex,
      options.slices,
      input.rotation ?? 0,
      tangent0,
      tangent1,
    )
    const normalAngle = normalAngleForSlice(normal, viewDir, sliceDir)
    const sliceWeight = projectNormalIntoSlice(normal, viewDir, sliceDir).projectedLength
    let mask = 0

    for (const sideSign of [1, -1] as const) {
      const sampleDir = scale3(sliceDir, sideSign)
      const samples = input.sampleProvider({ sliceIndex, sideSign, sliceDir, viewDir })

      for (const sample of samples) {
        if (mask === 0xffffffff) break
        if (sample.valid === false) continue

        const delta = sub3(sample.position, input.pixelPosition)
        const dist2 = dot3(delta, delta)
        const along = dot3(delta, sampleDir)
        if (dist2 <= 1e-8 || dist2 > maxValidRadius2 || along <= 0) continue

        const sampleDist = Math.sqrt(Math.max(dist2, 1e-8))
        const effectiveThickness = resolveEffectiveThickness(
          thicknessPolicy,
          baseThickness,
          sampleDist,
        )
        const interval = buildGtVbaoSampleInterval({
          samplePosition: sample.position,
          pixelPosition: input.pixelPosition,
          viewDir,
          sliceDir,
          thickness: effectiveThickness,
          normalAngle,
        })
        mask = (mask | interval.mask) >>> 0
      }
    }

    sliceMasks.push(mask >>> 0)
    sliceAccessibilities.push(cosineMeasureReduction(mask))
    sliceWeights.push(sliceWeight)
  }

  const uniformAccessibility =
    sliceAccessibilities.reduce((total, value) => total + value, 0) /
    Math.max(1, sliceAccessibilities.length)
  const weightedTotal = sliceAccessibilities.reduce(
    (total, value, index) => total + value * (sliceWeights[index] ?? 0),
    0,
  )
  const weightSum = sliceWeights.reduce((total, value) => total + value, 0)
  const accessibility =
    weightSum <= 1e-8 ? uniformAccessibility : weightedTotal / weightSum

  return {
    accessibility,
    uniformAccessibility,
    projectedWeightedAccessibility: accessibility,
    sliceMasks,
    sliceAccessibilities,
    sliceWeights,
  }
}

export function sectorPopcount(mask: number): number {
  let n = mask >>> 0
  let count = 0
  while (n !== 0) {
    n &= n - 1
    count++
  }
  return count
}

export const REFERENCE_SECTOR_COUNT = SECTOR_COUNT
export const REFERENCE_THETA_MIN = VBAO_THETA_MIN
