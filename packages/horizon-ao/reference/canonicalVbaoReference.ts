import { SECTOR_COUNT } from '../src/vbaoConstants'
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

export interface CanonicalVbaoSample {
  readonly position: Vec3
  readonly valid?: boolean
}

export interface CanonicalVbaoReferenceInput {
  readonly pixelPosition: Vec3
  readonly viewDir: Vec3
  readonly normalAngle: number
  readonly radius: number
  readonly thickness: number
  readonly sampleProvider: (input: {
    readonly sideSign: 1 | -1
    readonly viewDir: Vec3
  }) => readonly CanonicalVbaoSample[]
}

export interface CanonicalVbaoReferenceResult {
  readonly accessibility: number
  readonly mask: number
}

const HALF_PI = Math.PI / 2
const FULL_MASK = 0xffffffff

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function canonicalVbaoUpdateSectors(
  minHorizon: number,
  maxHorizon: number,
  occludedBitfield = 0,
): number {
  const start = Math.max(0, Math.min(SECTOR_COUNT, Math.floor(clamp01(minHorizon) * SECTOR_COUNT)))
  const sectorCount = Math.max(
    0,
    Math.min(SECTOR_COUNT - start, Math.ceil((clamp01(maxHorizon) - clamp01(minHorizon)) * SECTOR_COUNT)),
  )

  if (sectorCount <= 0) return occludedBitfield >>> 0
  if (sectorCount >= SECTOR_COUNT) return FULL_MASK

  const angleBitfield = FULL_MASK >>> (SECTOR_COUNT - sectorCount)
  return (occludedBitfield | (angleBitfield << start)) >>> 0
}

export function canonicalVbaoSampleMask(input: {
  readonly samplePosition: Vec3
  readonly pixelPosition: Vec3
  readonly viewDir: Vec3
  readonly sideSign: 1 | -1
  readonly normalAngle: number
  readonly thickness: number
}): number {
  const viewDir = normalize3(input.viewDir)
  const deltaFront = sub3(input.samplePosition, input.pixelPosition)
  const deltaBack = sub3(deltaFront, scale3(viewDir, input.thickness))
  const frontAngle = Math.acos(Math.max(-1, Math.min(1, dot3(normalize3(deltaFront), viewDir))))
  const backAngle = Math.acos(Math.max(-1, Math.min(1, dot3(normalize3(deltaBack), viewDir))))
  const shiftedFront = clamp01(((input.sideSign * -frontAngle) - input.normalAngle + HALF_PI) / Math.PI)
  const shiftedBack = clamp01(((input.sideSign * -backAngle) - input.normalAngle + HALF_PI) / Math.PI)
  const minHorizon = input.sideSign >= 0 ? shiftedBack : shiftedFront
  const maxHorizon = input.sideSign >= 0 ? shiftedFront : shiftedBack

  return canonicalVbaoUpdateSectors(minHorizon, maxHorizon)
}

export function makeCanonicalVbaoSampleAtAngle(input: {
  readonly pixelPosition: Vec3
  readonly viewDir: Vec3
  readonly sideSign: 1 | -1
  readonly angleFromView: number
  readonly distance: number
  readonly tangentDir: Vec3
}): CanonicalVbaoSample {
  const viewDir = normalize3(input.viewDir)
  const tangent = normalize3(input.tangentDir)
  const direction = normalize3(
    add3(
      scale3(viewDir, Math.cos(input.angleFromView)),
      scale3(tangent, input.sideSign * Math.sin(input.angleFromView)),
    ),
  )

  return {
    position: add3(input.pixelPosition, scale3(direction, input.distance)),
  }
}

export function evaluateCanonicalVbaoReference(
  input: CanonicalVbaoReferenceInput,
): CanonicalVbaoReferenceResult {
  const viewDir = normalize3(input.viewDir)
  const maxDistance = Math.max(0, input.radius + Math.max(0, input.thickness))
  const maxDistance2 = maxDistance * maxDistance
  let mask = 0

  for (const sideSign of [1, -1] as const) {
    const samples = input.sampleProvider({ sideSign, viewDir })
    for (const sample of samples) {
      if (mask === FULL_MASK) break
      if (sample.valid === false) continue

      const delta = sub3(sample.position, input.pixelPosition)
      const dist2 = dot3(delta, delta)
      if (dist2 <= 1e-8 || dist2 > maxDistance2) continue

      mask = (mask | canonicalVbaoSampleMask({
        samplePosition: sample.position,
        pixelPosition: input.pixelPosition,
        viewDir,
        sideSign,
        normalAngle: input.normalAngle,
        thickness: input.thickness,
      })) >>> 0
    }
  }

  return {
    accessibility: 1 - popcount32(mask) / SECTOR_COUNT,
    mask,
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
