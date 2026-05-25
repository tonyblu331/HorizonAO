import { describe, expect, it } from 'vitest'
import directionalDesign from '../../../../openspec/changes/vbao-directional-visibility-reference/design.md?raw'
import indexSource from '../index.ts?raw'
import { VBAO_DIRECTIONAL_DEBUG_FIXTURES } from '../vbaoDirectionalFixtures'

describe('VBAO directional evidence guardrails', () => {
  it('provides debug fixtures for scalar accessibility, bent normal, and buckets', () => {
    expect(VBAO_DIRECTIONAL_DEBUG_FIXTURES.fullOpen.scalarAccessibility).toBeCloseTo(1, 12)
    expect(VBAO_DIRECTIONAL_DEBUG_FIXTURES.fullOpen.bentNormal).toEqual([
      expect.closeTo(1, 12),
      expect.closeTo(0, 12),
      expect.closeTo(0, 12),
    ])
    expect(VBAO_DIRECTIONAL_DEBUG_FIXTURES.twoLobes.scalarAccessibility).toBeGreaterThan(0)
    expect(VBAO_DIRECTIONAL_DEBUG_FIXTURES.twoLobes.scalarAccessibility).toBeLessThan(1)
    expect(VBAO_DIRECTIONAL_DEBUG_FIXTURES.twoLobes.buckets).toHaveLength(2)
  })

  it('documents uncertainty and keeps directional output out of the public API', () => {
    expect(directionalDesign).toContain('## Uncertainty And Failure Cases')
    expect(directionalDesign).toContain('No public directional API')
    expect(indexSource).not.toContain('DirectionalVisibility')
    expect(indexSource).not.toContain('VBAO_DIRECTIONAL_DEBUG_FIXTURES')
  })
})
