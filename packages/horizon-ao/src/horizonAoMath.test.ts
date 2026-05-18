import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HORIZON_AO_KERNEL_OPTIONS,
  HORIZON_AO_FULL_HEMISPHERE_COSINE_INTEGRAL,
  clampHorizonAoKernelOptions,
  computeCenterBiasedSampleDistance,
  computeFalloffWeight,
  computeSampleStepsPerSlice,
  generateMagicSquareIndices,
  resolveAccessibility,
  resolveSignedHorizonCosineSliceAccessibility,
  resolveSignedHorizonAccessibility,
  resolveSignedHorizonSliceAccessibility,
} from './horizonAoMath'

describe('HorizonAO scalar math policy', () => {
  it('keeps raw kernel defaults stable outside the TSL node', () => {
    expect(DEFAULT_HORIZON_AO_KERNEL_OPTIONS).toEqual({
      radius: 1.25,
      intensity: 1,
      falloff: 0.85,
      thickness: 0.5,
      slices: 3,
      samples: 12,
      resolutionScale: 0.5,
    })
  })

  it('clamps kernel options with the same bounds as the shader node', () => {
    expect(
      clampHorizonAoKernelOptions({
        radius: Number.POSITIVE_INFINITY,
        intensity: -1,
        falloff: 2,
        thickness: -1,
        slices: 99,
        samples: 1,
        resolutionScale: 0,
      }),
    ).toEqual({
      radius: 0.05,
      intensity: 0,
      falloff: 1,
      thickness: 0,
      slices: 8,
      samples: 2,
      resolutionScale: 0.25,
    })
  })

  it('splits samples across slices deterministically with ceil behavior', () => {
    expect(computeSampleStepsPerSlice({ samples: 12, slices: 3 })).toBe(4)
    expect(computeSampleStepsPerSlice({ samples: 13, slices: 3 })).toBe(5)
    expect(computeSampleStepsPerSlice({ samples: 29, slices: 5 })).toBe(6)
  })

  it('uses a monotonic center-biased sample distance curve', () => {
    const first = computeCenterBiasedSampleDistance({ stepIndex: 0, stepCount: 4 })
    const second = computeCenterBiasedSampleDistance({ stepIndex: 1, stepCount: 4 })
    const last = computeCenterBiasedSampleDistance({ stepIndex: 3, stepCount: 4 })

    expect(first).toBeGreaterThan(0)
    expect(first).toBeLessThan(second)
    expect(second).toBeLessThan(last)
    expect(last).toBeCloseTo(1)
  })

  it('keeps falloff weights explicit and bounded', () => {
    expect(computeFalloffWeight({ stepIndex: 0, falloff: 0 })).toBe(1)
    expect(computeFalloffWeight({ stepIndex: 0, falloff: 1 })).toBe(1)
    expect(computeFalloffWeight({ stepIndex: 2, falloff: 1 })).toBe(0.5)
    expect(computeFalloffWeight({ stepIndex: 2, falloff: 0.5 })).toBe(0.75)
  })

  it('resolves no-occluder accessibility as fully accessible', () => {
    expect(resolveAccessibility({ accumulatedSliceVisibility: 3, slices: 3, intensity: 1 })).toBe(1)
    expect(resolveAccessibility({ accumulatedSliceVisibility: 3, slices: 3, intensity: 2 })).toBe(1)
  })

  it('generates odd-sized magic-square indices for deterministic sample rotation', () => {
    const indices = generateMagicSquareIndices(4)

    expect(indices).toHaveLength(25)
    expect(new Set(indices).size).toBe(25)
    expect(indices.every((value) => value >= 1 && value <= 25)).toBe(true)
  })

  it('documents the full signed-horizon cosine normalization constant', () => {
    expect(HORIZON_AO_FULL_HEMISPHERE_COSINE_INTEGRAL).toBe(2)
  })

  it('resolves a no-occluder signed-horizon slice as fully accessible', () => {
    expect(
      resolveSignedHorizonSliceAccessibility({
        normalAngleRad: 0,
        negativeHorizonAngleRad: -Math.PI / 2,
        positiveHorizonAngleRad: Math.PI / 2,
      }),
    ).toBeCloseTo(1)
  })

  it('resolves a fully blocked signed-horizon slice as inaccessible', () => {
    expect(
      resolveSignedHorizonSliceAccessibility({
        normalAngleRad: 0,
        negativeHorizonAngleRad: 0,
        positiveHorizonAngleRad: 0,
      }),
    ).toBe(0)
  })

  it('integrates a symmetric two-wall signed-horizon slice predictably', () => {
    expect(
      resolveSignedHorizonSliceAccessibility({
        normalAngleRad: 0,
        negativeHorizonAngleRad: -Math.PI / 4,
        positiveHorizonAngleRad: Math.PI / 4,
      }),
    ).toBeCloseTo(Math.SQRT1_2)
  })

  it('clips a far-background horizon back to the visible cosine hemisphere', () => {
    expect(
      resolveSignedHorizonSliceAccessibility({
        normalAngleRad: 0,
        negativeHorizonAngleRad: -Math.PI,
        positiveHorizonAngleRad: Math.PI,
      }),
    ).toBeCloseTo(1)
  })

  it('treats non-finite signed-horizon arc inputs as inaccessible', () => {
    expect(
      resolveSignedHorizonSliceAccessibility({
        normalAngleRad: Number.NaN,
        negativeHorizonAngleRad: -Math.PI / 2,
        positiveHorizonAngleRad: Math.PI / 2,
      }),
    ).toBe(0)
  })

  it('keeps reversed signed-horizon arc inputs stable', () => {
    const forward = resolveSignedHorizonSliceAccessibility({
      normalAngleRad: 0,
      negativeHorizonAngleRad: -Math.PI / 4,
      positiveHorizonAngleRad: Math.PI / 4,
    })
    const reversed = resolveSignedHorizonSliceAccessibility({
      normalAngleRad: 0,
      negativeHorizonAngleRad: Math.PI / 4,
      positiveHorizonAngleRad: -Math.PI / 4,
    })

    expect(reversed).toBeCloseTo(forward)
  })

  it('mirrors the current cos-horizon slice resolve for centered normals', () => {
    expect(
      resolveSignedHorizonCosineSliceAccessibility({
        positiveCosHorizon: 0,
        negativeCosHorizon: 0,
        projectedNormalOnTangent: 0,
        projectedNormalOnView: 1,
      }),
    ).toBeCloseTo(1)
    expect(
      resolveSignedHorizonCosineSliceAccessibility({
        positiveCosHorizon: 1,
        negativeCosHorizon: 1,
        projectedNormalOnTangent: 0,
        projectedNormalOnView: 1,
      }),
    ).toBe(0)
  })

  it('averages signed-horizon slices before intensity mapping', () => {
    expect(
      resolveSignedHorizonAccessibility({
        slices: [
          {
            normalAngleRad: 0,
            negativeHorizonAngleRad: -Math.PI / 2,
            positiveHorizonAngleRad: Math.PI / 2,
          },
          {
            normalAngleRad: 0,
            negativeHorizonAngleRad: 0,
            positiveHorizonAngleRad: 0,
          },
        ],
        intensity: 2,
      }),
    ).toBeCloseTo(0.25)
  })
})
