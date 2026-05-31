import { describe, expect, it } from 'vitest'
import {
  SECTOR_COUNT,
  VBAO_THETA_MIN,
  VBAO_THETA_STEP,
} from '../vbaoConstants'
import {
  buildGtVbaoPointSampleMask,
  buildGtVbaoSampleInterval,
  cosineWeightedReduction,
  cosineMeasureReduction,
  gtVbaoSliceLocalCdf,
  gtVbaoSliceLocalCdfRemap,
  popcountReduction,
  sampleGtVbaoAxialSliceDirection,
  type Vec3,
} from '../vbaoGtVbaoMath'

const T0: Vec3 = [1, 0, 0]
const T1: Vec3 = [0, 1, 0]

describe('GT-VBAO++ math contracts', () => {
  it('samples axial slice orientations over π for two-sided marching', () => {
    expect(sampleGtVbaoAxialSliceDirection(0, 4, 0, T0, T1)).toEqual([1, 0, 0])
    expect(sampleGtVbaoAxialSliceDirection(2, 4, 0, T0, T1)[0]).toBeCloseTo(0, 12)
    expect(sampleGtVbaoAxialSliceDirection(2, 4, 0, T0, T1)[1]).toBeCloseTo(1, 12)
    expect(sampleGtVbaoAxialSliceDirection(4, 4, 0, T0, T1)[0]).toBeCloseTo(-1, 12)
  })

  it('remaps horizon angles through the slice-local CDF before quantization', () => {
    expect(gtVbaoSliceLocalCdf(VBAO_THETA_MIN, 0)).toBeCloseTo(0, 12)
    expect(gtVbaoSliceLocalCdf(0, 0)).toBeCloseTo(0.5, 12)
    expect(gtVbaoSliceLocalCdf(Math.PI / 2, 0)).toBeCloseTo(1, 12)

    const remapped = gtVbaoSliceLocalCdfRemap(-Math.PI / 6, Math.PI / 6, 0)
    expect(remapped.theta0).toBeGreaterThan(VBAO_THETA_MIN)
    expect(remapped.theta1).toBeLessThan(Math.PI / 2)
    expect(remapped.theta0).toBeLessThan(remapped.theta1)
  })

  it('uses point-sample quantized sector treatment instead of ceil-length sectors', () => {
    const measureCenter = (10 + 0.5) / SECTOR_COUNT
    const center = Math.asin(measureCenter * 2 - 1)
    const tiny = VBAO_THETA_STEP * 0.05
    const mask = buildGtVbaoPointSampleMask(center - tiny, center + tiny, 0)
    expect(mask.toString(2).replaceAll('0', '').length).toBe(1)
  })

  it('recedes blocker back faces along the sample-local view direction', () => {
    const interval = buildGtVbaoSampleInterval({
      samplePosition: [0.6, 0, -2],
      pixelPosition: [0, 0, -2],
      viewDir: [0, 0, 1],
      sliceDir: [1, 0, 0],
      thickness: 0.2,
      normalAngle: 0,
    })

    expect(interval.theta0).toBeGreaterThan(0)
    expect(interval.theta0).toBeLessThan(Math.PI / 2)
    expect(interval.theta1).toBeCloseTo(Math.PI / 2, 4)
  })

  it('keeps mirrored slice sides in opposite mask halves', () => {
    const common = {
      pixelPosition: [0, 0, -2] as Vec3,
      viewDir: [0, 0, 1] as Vec3,
      sliceDir: [1, 0, 0] as Vec3,
      thickness: 0.2,
      normalAngle: 0,
    }
    const positiveSide = buildGtVbaoSampleInterval({
      ...common,
      samplePosition: [0.6, 0, -2] as Vec3,
    })
    const negativeSide = buildGtVbaoSampleInterval({
      ...common,
      samplePosition: [-0.6, 0, -2] as Vec3,
    })

    expect(positiveSide.theta0).toBeGreaterThan(0)
    expect(negativeSide.theta1).toBeLessThan(0)
    expect(positiveSide.mask & negativeSide.mask).toBe(0)
  })

  it('builds bounded masks for PR-01 style open/full/thin/thick cases', () => {
    expect(buildGtVbaoPointSampleMask(0, 0, 0)).toBe(0)
    expect(buildGtVbaoPointSampleMask(VBAO_THETA_MIN, Math.PI / 2, 0)).toBe(0xffffffff)

    const thin = buildGtVbaoPointSampleMask(-0.01, 0.01, 0)
    const thick = buildGtVbaoPointSampleMask(-0.7, 0.7, 0)
    expect(thin.toString(2).replaceAll('0', '').length).toBeLessThan(4)
    expect(thick.toString(2).replaceAll('0', '').length).toBeGreaterThan(SECTOR_COUNT / 3)
  })

  it('uses popcount after cosine-measure sectorization instead of another cosine loop', () => {
    const mask = buildGtVbaoPointSampleMask(-0.35, 0.35, 0)

    expect(cosineMeasureReduction(mask)).toBe(popcountReduction(mask))
    expect(cosineWeightedReduction(mask, 0)).not.toBeCloseTo(cosineMeasureReduction(mask), 4)
  })
})



describe('PR-01 GT-VBAO++ reference fixtures', () => {
  it('keeps a flat plane open', () => {
    const mask = buildGtVbaoPointSampleMask(0, 0, 0)
    expect(cosineMeasureReduction(mask)).toBeCloseTo(1, 6)
  })

  it('treats a full hemisphere as fully occluded', () => {
    const mask = buildGtVbaoPointSampleMask(VBAO_THETA_MIN, Math.PI / 2, 0)
    expect(cosineMeasureReduction(mask)).toBeCloseTo(0, 6)
  })

  it('keeps a two-wall corner partially accessible', () => {
    const leftWall = buildGtVbaoPointSampleMask(-1.2, -0.2, 0)
    const rightWall = buildGtVbaoPointSampleMask(0.2, 1.2, 0)
    const access = cosineMeasureReduction((leftWall | rightWall) >>> 0)
    expect(access).toBeGreaterThan(0)
    expect(access).toBeLessThan(0.45)
  })

  it('keeps a thin occluder narrower than a thick occluder', () => {
    const thin = buildGtVbaoPointSampleMask(-0.03, 0.03, 0)
    const thick = buildGtVbaoPointSampleMask(-0.7, 0.7, 0)
    expect(cosineMeasureReduction(thin)).toBeGreaterThan(cosineMeasureReduction(thick))
  })
})
