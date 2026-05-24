import { describe, expect, it } from 'vitest'
import { createHorizonAoSettings, estimateAoSampleBudget } from './settings'

describe('createHorizonAoSettings', () => {
  it('clamps invalid numeric overrides to supported ranges', () => {
    const settings = createHorizonAoSettings('compact', {
      radius: Number.POSITIVE_INFINITY,
      intensity: -1,
      samples: 100,
    })

    expect(settings.radius).toBe(0.05)
    expect(settings.intensity).toBe(0)
    expect(settings.samples).toBe(32)
  })

  it('keeps cinematic more expensive than compact', () => {
    const compact = createHorizonAoSettings('compact')
    const cinematic = createHorizonAoSettings('cinematic')

    expect(estimateAoSampleBudget(cinematic)).toBeGreaterThan(estimateAoSampleBudget(compact))
  })
})
