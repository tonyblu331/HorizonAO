import { describe, expect, it } from 'vitest'
import { maskRange } from '../vbaoReference'
import {
  reconstructDirectionalVisibility,
  type DirectionalVisibilitySlice,
  type Vec3,
} from '../vbaoReference'

const viewDir: Vec3 = [0, 0, 1]
const sliceDir: Vec3 = [1, 0, 0]

function openSectorRange(first: number, lastExclusive: number): number {
  return (0xffffffff ^ maskRange(first, lastExclusive)) >>> 0
}

function openSectorRanges(ranges: readonly (readonly [number, number])[]): number {
  return ranges.reduce((mask, [first, lastExclusive]) => {
    return (mask & ~maskRange(first, lastExclusive)) >>> 0
  }, 0xffffffff)
}

function singleSlice(mask: number): readonly DirectionalVisibilitySlice[] {
  return [{ mask, sliceDir, gammaNorm: 0 }]
}

describe('VBAO directional visibility reference', () => {
  it('reconstructs a full-open mask as fully accessible with a non-zero bent direction', () => {
    const result = reconstructDirectionalVisibility({
      viewDir,
      slices: singleSlice(0x00000000),
    })

    expect(result.accessibility).toBeCloseTo(1, 12)
    expect(result.directionalWeight).toBeGreaterThan(0)
    expect(result.bentNormal).toEqual([
      expect.closeTo(1, 12),
      expect.closeTo(0, 12),
      expect.closeTo(0, 12),
    ])
  })

  it('reconstructs a full-blocked mask as zero accessibility and zero directional weight', () => {
    const result = reconstructDirectionalVisibility({
      viewDir,
      slices: singleSlice(0xffffffff),
    })

    expect(result.accessibility).toBe(0)
    expect(result.directionalWeight).toBe(0)
    expect(result.bentNormal).toEqual([0, 0, 0])
  })

  it('keeps a symmetric open sector window stable around the slice direction', () => {
    const result = reconstructDirectionalVisibility({
      viewDir,
      slices: singleSlice(openSectorRange(14, 18)),
    })

    expect(result.accessibility).toBeGreaterThan(0)
    expect(result.accessibility).toBeLessThan(1)
    expect(result.bentNormal).toEqual([
      expect.closeTo(1, 12),
      expect.closeTo(0, 12),
      expect.closeTo(0, 12),
    ])
  })

  it('keeps two separated open lobes as separate visibility buckets', () => {
    const result = reconstructDirectionalVisibility({
      viewDir,
      slices: singleSlice(
        openSectorRanges([
          [8, 12],
          [20, 24],
        ]),
      ),
    })

    expect(result.buckets).toHaveLength(2)
    expect(result.buckets[0]!.weight).toBeGreaterThan(0)
    expect(result.buckets[1]!.weight).toBeGreaterThan(0)
    expect(result.buckets[0]!.direction[2]).toBeLessThan(0)
    expect(result.buckets[1]!.direction[2]).toBeGreaterThan(0)
    expect(result.bentNormal).toEqual([
      expect.closeTo(1, 12),
      expect.closeTo(0, 12),
      expect.closeTo(0, 12),
    ])
  })

  it('merges similar lobe directions across slices', () => {
    const mask = openSectorRange(14, 18)
    const single = reconstructDirectionalVisibility({
      viewDir,
      slices: singleSlice(mask),
    })
    const merged = reconstructDirectionalVisibility({
      viewDir,
      slices: [
        { mask, sliceDir, gammaNorm: 0 },
        { mask, sliceDir, gammaNorm: 0 },
      ],
    })

    expect(single.buckets).toHaveLength(1)
    expect(merged.buckets).toHaveLength(1)
    expect(merged.buckets[0]!.weight).toBeCloseTo(single.buckets[0]!.weight * 2, 12)
    expect(merged.buckets[0]!.direction).toEqual([
      expect.closeTo(1, 12),
      expect.closeTo(0, 12),
      expect.closeTo(0, 12),
    ])
  })

  it('caps the first reference pass at two strongest buckets', () => {
    const result = reconstructDirectionalVisibility({
      viewDir,
      slices: singleSlice(
        openSectorRanges([
          [4, 7],
          [14, 18],
          [25, 28],
        ]),
      ),
    })

    expect(result.buckets).toHaveLength(2)
    expect(result.buckets[0]!.weight).toBeGreaterThanOrEqual(result.buckets[1]!.weight)
  })
})
