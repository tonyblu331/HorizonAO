import { describe, expect, it } from 'vitest'
import depthHierarchySpec from '../../../../openspec/changes/vbao-depth-hierarchy-evidence/specs/vbao-node/spec.md?raw'
import benchmarkCollectorSource from '../../../../apps/demo/scripts/collect-ao-benchmark.mjs?raw'
import museumSource from '../../../../apps/demo/src/scenes/MuseumScene.tsx?raw'
import indexSource from '../index.ts?raw'
import optionsSource from '../vbaoConstants.ts?raw'
import { chooseVbaoDepthHierarchyLevel } from '../vbaoDepthHierarchy'

describe('VBAO depth hierarchy evidence gate', () => {
  it('chooses deterministic hierarchy levels from projected sample footprint', () => {
    expect(chooseVbaoDepthHierarchyLevel({ maxLevel: 4, sampleFootprintPixels: 0 })).toBe(0)
    expect(chooseVbaoDepthHierarchyLevel({ maxLevel: 4, sampleFootprintPixels: 1.99 })).toBe(0)
    expect(chooseVbaoDepthHierarchyLevel({ maxLevel: 4, sampleFootprintPixels: 2 })).toBe(1)
    expect(chooseVbaoDepthHierarchyLevel({ maxLevel: 4, sampleFootprintPixels: 4 })).toBe(2)
    expect(chooseVbaoDepthHierarchyLevel({ maxLevel: 4, sampleFootprintPixels: 8 })).toBe(3)
    expect(chooseVbaoDepthHierarchyLevel({ maxLevel: 4, sampleFootprintPixels: 64 })).toBe(4)
  })

  it('keeps depth hierarchy out of the public API while the gate is evidence-only', () => {
    expect(indexSource).not.toContain('vbaoDepthHierarchy')
    expect(optionsSource).not.toContain('depthHierarchy')
    expect(optionsSource).not.toContain('depthMip')
    expect(optionsSource).not.toContain('depthPrefilter')
  })

  it('clamps invalid and overlarge footprints without changing the public contract', () => {
    expect(chooseVbaoDepthHierarchyLevel({ maxLevel: 3, sampleFootprintPixels: Number.NaN })).toBe(0)
    expect(chooseVbaoDepthHierarchyLevel({ maxLevel: 3, sampleFootprintPixels: -8 })).toBe(0)
    expect(chooseVbaoDepthHierarchyLevel({ maxLevel: 3, sampleFootprintPixels: Number.POSITIVE_INFINITY })).toBe(3)
    expect(chooseVbaoDepthHierarchyLevel({ maxLevel: -1, sampleFootprintPixels: 16 })).toBe(0)
  })

  it('defines radius stress benchmark labels before any production depth path exists', () => {
    for (const required of [
      'AO_BENCHMARK_VBAO_RADIUS_STRESS_MATRIX',
      'vbaoRadiusStressPreset',
      'vbaoRadius',
      'vbaoExpectedDepthHierarchyLevel',
    ]) {
      expect(depthHierarchySpec).toContain(required)
      expect(benchmarkCollectorSource).toContain(required)
    }

    expect(depthHierarchySpec).toContain('scale-mismatch')
    expect(museumSource).toContain('setVbaoRadiusStressPreset')
    expect(museumSource).toContain('vbaoRadiusStressPreset')
    expect(museumSource).toContain('vbaoExpectedDepthHierarchyLevel')
    expect(indexSource).not.toContain('vbaoDepthHierarchy')
    expect(optionsSource).not.toContain('radiusStress')
  })
})
