import { describe, expect, it } from 'vitest'
import benchmarkCollectorSource from '../../../../apps/demo/scripts/collect-ao-benchmark.mjs?raw'
import museumSource from '../../../../apps/demo/src/scenes/MuseumScene.tsx?raw'
import indexSource from '../index.ts?raw'
import optionsSource from '../vbaoConstants.ts?raw'

describe('VBAO metadata debug view evidence gate', () => {
  it('defines internal metadata debug views without adding public package options', () => {
    for (const required of [
      "type VbaoMetadataDebugView = 'none' | 'edge-depth' | 'edge-normal' | 'confidence'",
      'vbaoMetadataDebugView',
      'setVbaoMetadataDebugView',
      'createVbaoMetadataDebugScalars',
      'vbaoMetadataEdgeDepth',
      'vbaoMetadataEdgeNormal',
      'vbaoMetadataConfidence',
    ]) {
      expect(museumSource).toContain(required)
    }

    expect(indexSource).not.toContain('metadataDebug')
    expect(optionsSource).not.toContain('metadataDebug')
    expect(optionsSource).not.toContain('debugView')
  })

  it('wires screenshot collection for metadata debug evidence rows', () => {
    for (const required of [
      'AO_BENCHMARK_VBAO_METADATA_DEBUG_MATRIX',
      'vbaoMetadataDebugView',
      'setVbaoMetadataDebugView',
      "'edge-depth'",
      "'edge-normal'",
      "'confidence'",
    ]) {
      expect(benchmarkCollectorSource).toContain(required)
    }
  })
})
