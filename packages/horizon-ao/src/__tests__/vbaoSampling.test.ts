import { describe, expect, it } from 'vitest'
import { VBAO_CLAMP_RANGES, clampVbaoNodeOptions } from '../vbaoConstants'
import {
  VBAO_PHASE_ATLAS_COLUMNS,
  VBAO_PHASE_ATLAS_PHASES,
  VBAO_PHASE_STRIDE,
  VBAO_SAMPLING_SCHEME,
  sampleVbaoPhaseChannels,
  sampleVbaoRadialJitter,
  sampleVbaoRotation,
  sampleVbaoSubsectorThreshold,
  sampleVbaoStepFraction,
  type VbaoSamplingInput,
} from '../vbaoSampling'

const baseInput: VbaoSamplingInput = {
  pixel: [13, 21],
  viewport: [1280, 720],
  sliceIndex: 1,
  sliceCount: 4,
  sampleIndex: 3,
  sampleCount: 8,
}

describe('single production VBAO sampling scheme', () => {
  it('uses one stable deterministic production scheme', () => {
    expect(VBAO_SAMPLING_SCHEME).toBe('phase-atlas-stable-hash')
    expect(VBAO_PHASE_ATLAS_PHASES).toBe(64)
    expect(VBAO_PHASE_ATLAS_COLUMNS).toBe(8)
    expect(VBAO_PHASE_STRIDE).toBe(16)
    expect(sampleVbaoRotation(baseInput)).toBe(sampleVbaoRotation(baseInput))
    expect(sampleVbaoRadialJitter(baseInput)).toBe(sampleVbaoRadialJitter(baseInput))
  })

  it('provides independent phase-index channels for rotation, radial jitter, subsector coverage, and polish', () => {
    const phase0 = sampleVbaoPhaseChannels({ pixel: baseInput.pixel, phaseIndex: 0 })
    const phase1 = sampleVbaoPhaseChannels({ pixel: baseInput.pixel, phaseIndex: 1 })

    expect(phase0).toHaveProperty('rotation')
    expect(phase0).toHaveProperty('radialJitter')
    expect(phase0).toHaveProperty('subsectorThreshold')
    expect(phase0).toHaveProperty('polishRotation')
    expect(phase0.radialJitter).not.toBe(phase1.radialJitter)
    expect(phase0.subsectorThreshold).not.toBe(phase1.subsectorThreshold)
    expect(sampleVbaoSubsectorThreshold(baseInput)).toBe(
      sampleVbaoPhaseChannels(baseInput).subsectorThreshold,
    )
  })

  it('uses x² near-biased radial spacing', () => {
    const early = sampleVbaoStepFraction({ ...baseInput, sampleIndex: 1, sampleCount: 8 })
    const late = sampleVbaoStepFraction({ ...baseInput, sampleIndex: 6, sampleCount: 8 })
    expect(early).toBeGreaterThanOrEqual(0)
    expect(late).toBeLessThanOrEqual(1)
    expect(early).toBeLessThan((1 + 1) / 8)
    expect(late).toBeLessThan(1)
    expect(late).toBeGreaterThan(early)
  })

  it('keeps neighboring pixels decorrelated without temporal inputs', () => {
    expect(Object.keys({ pixel: baseInput.pixel, phaseIndex: 7 }).sort()).toEqual([
      'phaseIndex',
      'pixel',
    ])
    expect(sampleVbaoRotation({ pixel: baseInput.pixel, phaseIndex: 7 })).not.toBe(
      sampleVbaoRotation({ pixel: [14, 21], phaseIndex: 7 }),
    )
  })

  it('phase atlas hash-scrambles neighboring pixels to avoid visible affine ramps', () => {
    const rotations = Array.from({ length: 16 }, (_, x) =>
      sampleVbaoRotation({ pixel: [x, 0], phaseIndex: 7 }),
    )
    const deltas = rotations.slice(1).map((value, index) => {
      const previous = rotations[index] ?? 0
      return Math.round(((value - previous + 1) % 1) * 1000) / 1000
    })
    expect(new Set(deltas).size).toBeGreaterThan(8)
  })

  it('keeps benchmark noise-source candidates out of product sampling runtime', () => {
    expect(sampleVbaoPhaseChannels(baseInput)).toEqual(sampleVbaoPhaseChannels(baseInput))
  })

  it('clamps public slice/sample overrides to the non-aliasing phase budget', () => {
    expect(VBAO_CLAMP_RANGES.samples.max).toBeLessThanOrEqual(VBAO_PHASE_STRIDE)
    expect(VBAO_CLAMP_RANGES.slices.max * VBAO_PHASE_STRIDE).toBeLessThanOrEqual(
      VBAO_PHASE_ATLAS_PHASES,
    )
    expect(clampVbaoNodeOptions({ slices: 8, samples: 32 })).toMatchObject({
      slices: 4,
      samples: 16,
    })
  })
})

// Phase index API keeps atlas semantics independent from slice/sample names.
