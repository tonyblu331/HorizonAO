import {
  maskRange,
  reconstructDirectionalVisibility,
  type DirectionalVisibilityBucket,
  type Vec3,
} from './vbaoReference'

const viewDir: Vec3 = [0, 0, 1]
const sliceDir: Vec3 = [1, 0, 0]

function openSectorRanges(ranges: readonly (readonly [number, number])[]): number {
  return ranges.reduce((mask, [first, lastExclusive]) => {
    return (mask & ~maskRange(first, lastExclusive)) >>> 0
  }, 0xffffffff)
}

function directionalFixture(mask: number): {
  readonly mask: number
  readonly scalarAccessibility: number
  readonly bentNormal: Vec3
  readonly buckets: readonly DirectionalVisibilityBucket[]
} {
  const result = reconstructDirectionalVisibility({
    viewDir,
    slices: [{ mask, sliceDir, gammaNorm: 0 }],
  })

  return {
    mask,
    scalarAccessibility: result.accessibility,
    bentNormal: result.bentNormal,
    buckets: result.buckets,
  }
}

export const VBAO_DIRECTIONAL_DEBUG_FIXTURES = Object.freeze({
  fullOpen: directionalFixture(0x00000000),
  fullBlocked: directionalFixture(0xffffffff),
  twoLobes: directionalFixture(
    openSectorRanges([
      [8, 12],
      [20, 24],
    ]),
  ),
})
