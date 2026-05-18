import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HORIZON_AO_KERNEL_OPTIONS,
  clampHorizonAoKernelOptions,
  computeCenterBiasedSampleDistance,
  computeFalloffWeight,
  computeSampleStepsPerSlice,
  generateMagicSquareIndices,
  resolveAccessibility,
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
})
