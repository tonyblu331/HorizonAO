import { describe, expect, it } from 'vitest'
import depthHierarchySpec from '../../../../openspec/changes/vbao-depth-hierarchy-evidence/specs/vbao-node/spec.md?raw'
import benchmarkCollectorSource from '../../../../apps/demo/scripts/collect-ao-benchmark.mjs?raw'
import museumSource from '../../../../apps/demo/src/scenes/MuseumScene.tsx?raw'
import prefilterDesign from '../../../../openspec/changes/vbao-depth-prefilter-experiment/design.md?raw'
import prefilterSpec from '../../../../openspec/changes/vbao-depth-prefilter-experiment/specs/vbao-node/spec.md?raw'
import indexSource from '../index.ts?raw'
import optionsSource from '../vbaoConstants.ts?raw'
import {
  chooseVbaoDepthHierarchyLevel,
  chooseVbaoRepresentativeDepth,
} from '../vbaoDepthHierarchy'

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

  it('chooses a farthest-supported representative depth for coarse prefilter blocks', () => {
    const result = chooseVbaoRepresentativeDepth({
      fallbackViewDepth: 1,
      farthestDepthTolerance: 0.1,
      viewDepths: [6, 6.05, 5.98, 2.1],
    })

    expect(result.farthestViewDepth).toBe(6.05)
    expect(result.supportCount).toBe(3)
    expect(result.viewDepth).toBeCloseTo(6.01, 3)
  })

  it('documents the internal-only prefilter experiment without adding public knobs', () => {
    expect(prefilterSpec).toContain('Internal Depth Prefilter Experiment')
    expect(prefilterSpec).toContain('Representative depth ignores thin foreground outliers')
    expect(prefilterDesign).toContain('farthest positive view depth')
    expect(prefilterDesign).toContain('TSL render target chain preferred')
    expect(indexSource).not.toContain('vbaoDepthPrefilter')
    expect(optionsSource).not.toContain('depthPrefilter')
    expect(optionsSource).not.toContain('depthHierarchy')
    expect(optionsSource).not.toContain('depthMip')
  })

  it('defines the benchmark-only depth prefilter label schema before capture work', () => {
    for (const required of [
      'AO_BENCHMARK_VBAO_DEPTH_PREFILTER_MATRIX',
      'vbaoDepthPrefilterPreset',
      'baseline',
      'prefilter',
    ]) {
      expect(prefilterSpec).toContain(required)
      expect(prefilterDesign).toContain(required)
    }
  })

  it('wires benchmark-only depth prefilter labels through the demo harness', () => {
    expect(benchmarkCollectorSource).toContain('AO_BENCHMARK_VBAO_DEPTH_PREFILTER_MATRIX')

    for (const required of [
      'vbaoDepthPrefilterPreset',
      'setVbaoDepthPrefilterPreset',
      'baseline',
      'prefilter',
    ]) {
      expect(benchmarkCollectorSource).toContain(required)
      expect(museumSource).toContain(required)
    }

    expect(indexSource).not.toContain('vbaoDepthPrefilter')
    expect(optionsSource).not.toContain('depthPrefilter')
  })

  it('keeps the internal prefilter candidate real before emitting prefilter rows', () => {
    expect(museumSource).toContain('createVbaoDepthPrefilterNode')
    expect(museumSource).toContain('rtt(')
    expect(museumSource).toContain('perspectiveDepthToViewZ')
    expect(museumSource).toContain('VBAO_DEPTH_PREFILTER_CANDIDATE_ENABLED = true')
    expect(benchmarkCollectorSource).toContain(
      '[baselineVbaoDepthPrefilterPreset, experimentalVbaoDepthPrefilterPreset]',
    )
  })
})
