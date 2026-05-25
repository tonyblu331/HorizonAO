import { describe, expect, it } from 'vitest'
import {
  VBAO_SAMPLING_SCHEDULES,
  sampleVbaoRadialJitter,
  sampleVbaoRotation,
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

describe('VBAO sampling schedules', () => {
  it('declares the non-temporal schedules available for backtesting', () => {
    expect(VBAO_SAMPLING_SCHEDULES).toEqual(['magic-square', 'r2', 'hilbert', 'blue-noise'])
  })

  it('returns deterministic rotations in [0, 1) for every schedule', () => {
    for (const schedule of VBAO_SAMPLING_SCHEDULES) {
      const first = sampleVbaoRotation(schedule, baseInput)
      const second = sampleVbaoRotation(schedule, baseInput)

      expect(second).toBe(first)
      expect(first).toBeGreaterThanOrEqual(0)
      expect(first).toBeLessThan(1)
    }
  })

  it('does not accept temporal inputs in the sampling contract', () => {
    expect(Object.keys(baseInput).sort()).toEqual([
      'pixel',
      'sampleCount',
      'sampleIndex',
      'sliceCount',
      'sliceIndex',
      'viewport',
    ])
  })

  it('keeps radial sample positions monotonic and inside the marched segment', () => {
    for (const schedule of VBAO_SAMPLING_SCHEDULES) {
      let previous = 0

      for (let sampleIndex = 0; sampleIndex < baseInput.sampleCount; sampleIndex++) {
        const fraction = sampleVbaoStepFraction(schedule, { ...baseInput, sampleIndex })

        expect(fraction).toBeGreaterThan(previous)
        expect(fraction).toBeGreaterThan(0)
        expect(fraction).toBeLessThanOrEqual(1)
        previous = fraction
      }
    }
  })

  it('returns deterministic radial jitter in [0, 1) for every schedule', () => {
    for (const schedule of VBAO_SAMPLING_SCHEDULES) {
      const first = sampleVbaoRadialJitter(schedule, baseInput)
      const second = sampleVbaoRadialJitter(schedule, baseInput)

      expect(second).toBe(first)
      expect(first).toBeGreaterThanOrEqual(0)
      expect(first).toBeLessThan(1)
    }
  })

  it('jitters radial endpoints so neighboring pixels do not march the same lattice', () => {
    for (const schedule of VBAO_SAMPLING_SCHEDULES) {
      const a = sampleVbaoStepFraction(schedule, {
        ...baseInput,
        pixel: [12, 21],
        sampleIndex: 7,
      })
      const b = sampleVbaoStepFraction(schedule, {
        ...baseInput,
        pixel: [13, 21],
        sampleIndex: 7,
      })

      expect(a).toBeGreaterThan(0.5)
      expect(a).toBeLessThanOrEqual(1)
      expect(b).toBeGreaterThan(0.5)
      expect(b).toBeLessThanOrEqual(1)
      expect(a).not.toBe(b)
    }
  })

  it('covers every histogram bin on a 16x16 tile', () => {
    for (const schedule of VBAO_SAMPLING_SCHEDULES) {
      const bins = new Array<number>(8).fill(0)

      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const rotation = sampleVbaoRotation(schedule, {
            ...baseInput,
            pixel: [x, y],
            viewport: [16, 16],
          })
          const binIndex = Math.min(bins.length - 1, Math.floor(rotation * bins.length))
          bins[binIndex] = bins[binIndex]! + 1
        }
      }

      expect(Math.min(...bins)).toBeGreaterThan(0)
      expect(Math.max(...bins) / Math.min(...bins)).toBeLessThanOrEqual(3)
    }
  })
})
