import { describe, expect, it } from 'vitest'
import {
  REFERENCE_SECTOR_COUNT,
  reconstructDirectionalVisibility,
  type Vec3,
} from '../vbaoReference'

const PIXEL: Vec3 = [0, 0, -1]
const NORMAL: Vec3 = [0, 0, 1]
const FULLY_BLOCKED = 0xffffffff

function length3(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2])
}

function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function maskWithOpenRanges(ranges: readonly (readonly [number, number])[]): number {
  let mask = FULLY_BLOCKED

  for (const [start, endExclusive] of ranges) {
    for (let sector = start; sector < endExclusive; sector++) {
      const clampedSector = Math.max(0, Math.min(REFERENCE_SECTOR_COUNT - 1, sector))
      mask = (mask & ~(1 << clampedSector)) >>> 0
    }
  }

  return mask >>> 0
}

describe('VBAO directional visibility reference', () => {
  it('reconstructs full-open and full-blocked masks without a public product path', () => {
    const fullOpen = reconstructDirectionalVisibility({
      pixelPosition: PIXEL,
      normal: NORMAL,
      sliceMasks: [0],
    })
    const fullBlocked = reconstructDirectionalVisibility({
      pixelPosition: PIXEL,
      normal: NORMAL,
      sliceMasks: [FULLY_BLOCKED],
    })

    expect(fullOpen.accessibility).toBeCloseTo(1, 6)
    expect(fullOpen.directionalWeight).toBeGreaterThan(0)
    expect(dot3(fullOpen.bentNormal, NORMAL)).toBeGreaterThan(0.99)
    expect(fullOpen.buckets).toHaveLength(1)

    expect(fullBlocked.accessibility).toBeCloseTo(0, 6)
    expect(fullBlocked.directionalWeight).toBe(0)
    expect(length3(fullBlocked.bentNormal)).toBe(0)
    expect(fullBlocked.buckets).toHaveLength(0)
  })

  it('keeps a symmetric open-sector window stable around the receiver normal', () => {
    const result = reconstructDirectionalVisibility({
      pixelPosition: PIXEL,
      normal: NORMAL,
      sliceMasks: [maskWithOpenRanges([[14, 18]])],
    })

    expect(result.accessibility).toBeGreaterThan(0)
    expect(result.accessibility).toBeLessThan(1)
    expect(dot3(result.bentNormal, NORMAL)).toBeGreaterThan(0.98)
    expect(Math.abs(result.bentNormal[1])).toBeLessThan(0.1)
  })

  it('keeps separated open lobes as separate visibility buckets', () => {
    const result = reconstructDirectionalVisibility({
      pixelPosition: PIXEL,
      normal: NORMAL,
      sliceMasks: [maskWithOpenRanges([[8, 12], [20, 24]])],
    })

    expect(result.buckets).toHaveLength(2)
    const first = result.buckets[0]!
    const second = result.buckets[1]!

    expect(first.weight).toBeGreaterThan(0)
    expect(second.weight).toBeGreaterThan(0)
    expect(dot3(first.direction, second.direction)).toBeLessThan(0.75)
    expect(
      Math.sign(first.direction[1]) ===
        Math.sign(second.direction[1]),
    ).toBe(false)
  })

  it('caps directional buckets to the two strongest open lobes', () => {
    const result = reconstructDirectionalVisibility({
      pixelPosition: PIXEL,
      normal: NORMAL,
      sliceMasks: [maskWithOpenRanges([[4, 7], [14, 18], [25, 28]])],
    })

    expect(result.buckets).toHaveLength(2)
    expect(result.buckets[0]!.weight).toBeGreaterThanOrEqual(result.buckets[1]!.weight)
  })
})
