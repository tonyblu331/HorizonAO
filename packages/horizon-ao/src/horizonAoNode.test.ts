import { describe, expect, it } from 'vitest'
import { DEFAULT_HORIZON_AO_NODE_OPTIONS, HorizonAoNode, horizonAO } from './horizonAoNode'

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
})
