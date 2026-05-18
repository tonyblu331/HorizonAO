import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HORIZON_AO_DENOISE_OPTIONS,
  DEFAULT_HORIZON_AO_NODE_OPTIONS,
  HorizonAoDenoiseNode,
  HorizonAoNode,
  horizonAO,
  horizonAODenoise,
} from './horizonAoNode'

describe('HorizonAO TSL node API', () => {
  it('keeps the raw node defaults stable', () => {
    expect(DEFAULT_HORIZON_AO_NODE_OPTIONS).toEqual({
      radius: 1.25,
      intensity: 1,
      falloff: 0.85,
      thickness: 0.5,
      slices: 3,
      samples: 12,
      resolutionScale: 0.5,
    })
  })

  it('exports the factory and node class', () => {
    expect(typeof horizonAO).toBe('function')
    expect(typeof HorizonAoNode).toBe('function')
  })

  it('keeps the spatial denoise defaults stable', () => {
    expect(DEFAULT_HORIZON_AO_DENOISE_OPTIONS).toEqual({
      radius: 3,
      lumaPhi: 5,
      depthPhi: 5,
      normalPhi: 8,
    })
  })

  it('exports the denoise factory and node class', () => {
    expect(typeof horizonAODenoise).toBe('function')
    expect(typeof HorizonAoDenoiseNode).toBe('function')
  })
})
