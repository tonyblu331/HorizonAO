import {
  SECTOR_COUNT,
  VBAO_CONTACT_THICKNESS_RADIUS_RATIO,
  VBAO_NEAR_SAMPLE_THICKNESS_RATIO,
  VBAO_THETA_MIN,
  VBAO_THETA_STEP,
  clampVbaoNodeOptions,
} from '../src/vbaoConstants'
import {
  buildGtVbaoSampleInterval,
  cosineMeasureReduction,
  sampleGtVbaoAxialSliceDirection,
} from './vbaoGtVbaoMath'
import {
  add3,
  cross3,
  dot3,
  length3,
  normalize3,
  scale3,
  sub3,
  type Vec3,
} from './vec3Math'

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
  readonly sliceAcceptedSampleCounts: readonly number[]
  readonly sliceCandidateSampleCounts: readonly number[]
}

export interface DirectionalVisibilityReferenceInput {
  readonly pixelPosition: Vec3
  readonly normal: Vec3
  readonly sliceMasks: readonly number[]
  readonly rotation?: number
}

export interface DirectionalVisibilityBucket {
  readonly direction: Vec3
  readonly weight: number
  readonly aperture: number
  readonly sectorCount: number
}

export interface DirectionalVisibilityReferenceResult {
  readonly accessibility: number
  readonly directionalWeight: number
  readonly bentNormal: Vec3
  readonly buckets: readonly DirectionalVisibilityBucket[]
}

const DIRECTIONAL_BUCKET_LIMIT = 2
const DIRECTIONAL_BUCKET_MERGE_DOT = 0.92

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

function directionForSliceSector(viewDir: Vec3, sliceDir: Vec3, sectorIndex: number): Vec3 {
  const theta = VBAO_THETA_MIN + (sectorIndex + 0.5) * VBAO_THETA_STEP

  return normalize3(
    add3(
      scale3(sliceDir, Math.sin(theta)),
      scale3(viewDir, Math.max(0, Math.cos(theta))),
    ),
  )
}

function directionalSectorWeight(sectorIndex: number, normalAngle: number): number {
  const theta = VBAO_THETA_MIN + (sectorIndex + 0.5) * VBAO_THETA_STEP

  return Math.max(0, Math.cos(theta - normalAngle))
}

function sectorIsOpen(mask: number, sectorIndex: number): boolean {
  return (((mask >>> 0) >>> sectorIndex) & 1) === 0
}

function mergeDirectionalBucket(
  target: DirectionalVisibilityBucket,
  incoming: DirectionalVisibilityBucket,
): DirectionalVisibilityBucket {
  const weight = target.weight + incoming.weight
  const direction: Vec3 =
    weight <= 1e-8
      ? [0, 0, 0]
      : normalize3(
          add3(
            scale3(target.direction, target.weight),
            scale3(incoming.direction, incoming.weight),
          ),
        )

  return {
    direction,
    weight,
    aperture: Math.max(target.aperture, incoming.aperture),
    sectorCount: target.sectorCount + incoming.sectorCount,
  }
}

function mergeDirectionalBuckets(
  buckets: readonly DirectionalVisibilityBucket[],
): readonly DirectionalVisibilityBucket[] {
  const merged: DirectionalVisibilityBucket[] = []

  for (const bucket of buckets) {
    const similarIndex = merged.findIndex(
      (candidate) => dot3(candidate.direction, bucket.direction) >= DIRECTIONAL_BUCKET_MERGE_DOT,
    )

    if (similarIndex < 0) {
      merged.push(bucket)
      continue
    }

    merged[similarIndex] = mergeDirectionalBucket(merged[similarIndex]!, bucket)
  }

  return merged.sort((a, b) => b.weight - a.weight).slice(0, DIRECTIONAL_BUCKET_LIMIT)
}

function extractDirectionalBucketsForSlice(input: {
  readonly mask: number
  readonly viewDir: Vec3
  readonly sliceDir: Vec3
  readonly normalAngle: number
}): readonly DirectionalVisibilityBucket[] {
  const buckets: DirectionalVisibilityBucket[] = []
  let startSector = -1
  let weight = 0
  let directionSum: Vec3 = [0, 0, 0]

  const flush = (endSectorExclusive: number): void => {
    if (startSector < 0) return

    const sectorCount = endSectorExclusive - startSector
    if (weight > 1e-8 && sectorCount > 0) {
      buckets.push({
        direction: normalize3(directionSum),
        weight,
        aperture: sectorCount * VBAO_THETA_STEP,
        sectorCount,
      })
    }

    startSector = -1
    weight = 0
    directionSum = [0, 0, 0]
  }

  for (let sectorIndex = 0; sectorIndex < SECTOR_COUNT; sectorIndex++) {
    if (!sectorIsOpen(input.mask, sectorIndex)) {
      flush(sectorIndex)
      continue
    }

    if (startSector < 0) startSector = sectorIndex

    const sectorWeight = directionalSectorWeight(sectorIndex, input.normalAngle)
    const direction = directionForSliceSector(input.viewDir, input.sliceDir, sectorIndex)
    weight += sectorWeight
    directionSum = add3(directionSum, scale3(direction, sectorWeight))
  }

  flush(SECTOR_COUNT)

  return buckets
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
  const sliceAcceptedSampleCounts: number[] = []
  const sliceCandidateSampleCounts: number[] = []
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
    let acceptedSampleCount = 0
    let candidateSampleCount = 0

    for (const sideSign of [1, -1] as const) {
      const sampleDir = scale3(sliceDir, sideSign)
      const samples = input.sampleProvider({ sliceIndex, sideSign, sliceDir, viewDir })

      for (const sample of samples) {
        if (mask === 0xffffffff) break
        candidateSampleCount++
        if (sample.valid === false) continue

        const delta = sub3(sample.position, input.pixelPosition)
        const dist2 = dot3(delta, delta)
        const along = dot3(delta, sampleDir)
        if (dist2 <= 1e-8 || dist2 > maxValidRadius2 || along <= 0) continue

        acceptedSampleCount++
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
    sliceAcceptedSampleCounts.push(acceptedSampleCount)
    sliceCandidateSampleCounts.push(candidateSampleCount)
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
    sliceAcceptedSampleCounts,
    sliceCandidateSampleCounts,
  }
}

export function reconstructDirectionalVisibility(
  input: DirectionalVisibilityReferenceInput,
): DirectionalVisibilityReferenceResult {
  const { viewDir, tangent0, tangent1 } = buildViewLocalFrame(input.pixelPosition)
  const normal = normalize3(input.normal)
  const sliceCount = input.sliceMasks.length
  let openWeight = 0
  let totalWeight = 0
  let bentSum: Vec3 = [0, 0, 0]
  const buckets: DirectionalVisibilityBucket[] = []

  if (sliceCount === 0) {
    return {
      accessibility: 1,
      directionalWeight: 0,
      bentNormal: [0, 0, 0],
      buckets: [],
    }
  }

  for (let sliceIndex = 0; sliceIndex < sliceCount; sliceIndex++) {
    const mask = input.sliceMasks[sliceIndex] ?? 0xffffffff
    const sliceDir = sampleGtVbaoAxialSliceDirection(
      sliceIndex,
      sliceCount,
      input.rotation ?? 0,
      tangent0,
      tangent1,
    )
    const normalAngle = normalAngleForSlice(normal, viewDir, sliceDir)

    for (let sectorIndex = 0; sectorIndex < SECTOR_COUNT; sectorIndex++) {
      const sectorWeight = directionalSectorWeight(sectorIndex, normalAngle)
      totalWeight += sectorWeight

      if (!sectorIsOpen(mask, sectorIndex)) continue

      const direction = directionForSliceSector(viewDir, sliceDir, sectorIndex)
      openWeight += sectorWeight
      bentSum = add3(bentSum, scale3(direction, sectorWeight))
    }

    buckets.push(
      ...extractDirectionalBucketsForSlice({
        mask,
        viewDir,
        sliceDir,
        normalAngle,
      }),
    )
  }

  return {
    accessibility: totalWeight <= 1e-8 ? 1 : openWeight / totalWeight,
    directionalWeight: openWeight,
    bentNormal: openWeight <= 1e-8 ? [0, 0, 0] : normalize3(bentSum),
    buckets: mergeDirectionalBuckets(buckets),
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
