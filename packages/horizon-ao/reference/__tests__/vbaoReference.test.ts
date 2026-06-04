import { describe, expect, it } from 'vitest'
import {
  REFERENCE_SECTOR_COUNT,
  REFERENCE_THETA_MIN,
  evaluateScalarVbaoReference,
  makeScalarVbaoSampleAtTheta,
  sectorPopcount,
  type ScalarVbaoThicknessPolicy,
  type ScalarVbaoSample,
  type Vec3,
} from '../vbaoReference'

const PIXEL: Vec3 = [0, 0, -1]
const NORMAL: Vec3 = [0, 0, 1]
const GRAZING_NORMAL: Vec3 = [0, Math.sin(1.05), Math.cos(1.05)]

function angularSamples(
  theta0: number,
  theta1: number,
  count: number,
  distance = 0.9,
): (input: { readonly sliceDir: Vec3; readonly viewDir: Vec3 }) => readonly ScalarVbaoSample[] {
  return ({ sliceDir, viewDir }) => {
    if (count <= 0) return []
    return Array.from({ length: count }, (_, index) => {
      const t = count === 1 ? 0.5 : index / (count - 1)
      return makeScalarVbaoSampleAtTheta({
        pixelPosition: PIXEL,
        viewDir,
        sliceDir,
        theta: theta0 + (theta1 - theta0) * t,
        distance,
      })
    })
  }
}

function combinedSamples(
  ...providers: readonly ((input: { readonly sliceDir: Vec3; readonly viewDir: Vec3 }) => readonly ScalarVbaoSample[])[]
): (input: { readonly sliceDir: Vec3; readonly viewDir: Vec3 }) => readonly ScalarVbaoSample[] {
  return (input) => providers.flatMap((provider) => provider(input))
}

function evaluatePolicyMask(
  thicknessPolicy: ScalarVbaoThicknessPolicy,
  sampleProvider: (input: { readonly sliceDir: Vec3; readonly viewDir: Vec3 }) => readonly ScalarVbaoSample[],
): number {
  return evaluateScalarVbaoReference({
    pixelPosition: PIXEL,
    normal: NORMAL,
    radius: 1,
    thickness: 0.3,
    slices: 1,
    thicknessPolicy,
    sampleProvider,
  }).sliceMasks[0] ?? 0
}

describe('PR-01 VBAO scalar reference correctness gate', () => {
  it('keeps a flat plane fully accessible through the scalar oracle path', () => {
    const result = evaluateScalarVbaoReference({
      pixelPosition: PIXEL,
      normal: NORMAL,
      radius: 1,
      thickness: 0.25,
      slices: 1,
      sampleProvider: () => [],
    })

    expect(result.sliceMasks).toEqual([0])
    expect(result.accessibility).toBeCloseTo(1, 6)
  })

  it('treats a full sampled hemisphere as fully occluded through the scalar oracle path', () => {
    const result = evaluateScalarVbaoReference({
      pixelPosition: PIXEL,
      normal: NORMAL,
      radius: 1,
      thickness: 0.3,
      slices: 1,
      sampleProvider: angularSamples(REFERENCE_THETA_MIN + 0.001, Math.PI / 2 - 0.001, 256),
    })

    expect(result.sliceMasks[0]).toBe(0xffffffff)
    expect(result.accessibility).toBeCloseTo(0, 6)
  })

  it('keeps a two-wall corner partially accessible while exercising mirrored slice marching', () => {
    const result = evaluateScalarVbaoReference({
      pixelPosition: PIXEL,
      normal: NORMAL,
      radius: 1,
      thickness: 0.12,
      slices: 1,
      sampleProvider: combinedSamples(
        angularSamples(-1.3, -0.35, 96),
        angularSamples(0.35, 1.3, 96),
      ),
    })

    expect(result.accessibility).toBeGreaterThan(0)
    expect(result.accessibility).toBeLessThan(0.55)
    expect(sectorPopcount(result.sliceMasks[0] ?? 0)).toBeGreaterThan(REFERENCE_SECTOR_COUNT / 2)
  })

  it('keeps a thin occluder narrower and more accessible than a thick occluder', () => {
    const thin = evaluateScalarVbaoReference({
      pixelPosition: PIXEL,
      normal: NORMAL,
      radius: 1,
      thickness: 0.025,
      slices: 1,
      sampleProvider: angularSamples(-0.02, 0.02, 3, 0.7),
    })
    const thick = evaluateScalarVbaoReference({
      pixelPosition: PIXEL,
      normal: NORMAL,
      radius: 1,
      thickness: 0.3,
      slices: 1,
      sampleProvider: angularSamples(-0.7, 0.7, 96, 0.7),
    })

    expect(sectorPopcount(thin.sliceMasks[0] ?? 0)).toBeLessThan(4)
    expect(sectorPopcount(thick.sliceMasks[0] ?? 0)).toBeGreaterThan(REFERENCE_SECTOR_COUNT / 3)
    expect(thin.accessibility).toBeGreaterThan(thick.accessibility)
  })

  it('exposes near-contact configured-thickness saturation from the sample-distance clamp', () => {
    const nearThin = evaluateScalarVbaoReference({
      pixelPosition: PIXEL,
      normal: NORMAL,
      radius: 1,
      thickness: 0.1,
      slices: 1,
      sampleProvider: angularSamples(-0.12, 0.12, 64, 0.035),
    })
    const nearThick = evaluateScalarVbaoReference({
      pixelPosition: PIXEL,
      normal: NORMAL,
      radius: 1,
      thickness: 0.3,
      slices: 1,
      sampleProvider: angularSamples(-0.12, 0.12, 64, 0.035),
    })
    const resolvedThin = evaluateScalarVbaoReference({
      pixelPosition: PIXEL,
      normal: NORMAL,
      radius: 1,
      thickness: 0.1,
      slices: 1,
      sampleProvider: angularSamples(-0.12, 0.12, 64, 0.7),
    })
    const resolvedThick = evaluateScalarVbaoReference({
      pixelPosition: PIXEL,
      normal: NORMAL,
      radius: 1,
      thickness: 0.3,
      slices: 1,
      sampleProvider: angularSamples(-0.12, 0.12, 64, 0.7),
    })

    expect(nearThick.sliceMasks[0]).toBe(nearThin.sliceMasks[0])
    expect(nearThick.accessibility).toBeCloseTo(nearThin.accessibility, 6)
    expect(sectorPopcount(resolvedThick.sliceMasks[0] ?? 0)).toBeGreaterThan(
      sectorPopcount(resolvedThin.sliceMasks[0] ?? 0),
    )
    expect(resolvedThin.accessibility).toBeGreaterThan(resolvedThick.accessibility)
  })

  it('rejects stronger near-contact policy candidates that close the thin-gap gate', () => {
    const thinGap = angularSamples(-0.02, 0.02, 3, 0.035)
    const broadContact = angularSamples(-0.12, 0.12, 64, 0.035)
    const currentThinPopcount = sectorPopcount(evaluatePolicyMask('current', thinGap))
    const currentBroadPopcount = sectorPopcount(evaluatePolicyMask('current', broadContact))

    for (const candidate of ['adaptive-near-sample', 'minimum-effective-floor'] as const) {
      const candidateThinPopcount = sectorPopcount(evaluatePolicyMask(candidate, thinGap))
      const candidateBroadPopcount = sectorPopcount(evaluatePolicyMask(candidate, broadContact))

      expect(candidateBroadPopcount).toBeGreaterThanOrEqual(currentBroadPopcount)
      expect(candidateThinPopcount).toBeGreaterThan(currentThinPopcount)
    }
  })

  it('uses projected-normal weighting for multi-slice accessibility', () => {
    const result = evaluateScalarVbaoReference({
      pixelPosition: PIXEL,
      normal: GRAZING_NORMAL,
      radius: 1,
      thickness: 0.16,
      slices: 4,
      sampleProvider: ({ sliceIndex, sliceDir, viewDir }) =>
        sliceIndex === 0
          ? angularSamples(-1.1, 1.1, 96, 0.8)({ sliceDir, viewDir })
          : [],
    })

    expect(result.sliceWeights[0]).toBeGreaterThan(result.sliceWeights[2] ?? 0)
    expect(result.uniformAccessibility).toBeGreaterThan(result.accessibility)
    expect(result.uniformAccessibility - result.accessibility).toBeGreaterThan(0.03)
    expect(result.projectedWeightedAccessibility).toBe(result.accessibility)
  })
})
