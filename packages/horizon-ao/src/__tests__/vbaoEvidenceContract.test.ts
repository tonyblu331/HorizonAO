import { describe, expect, it } from 'vitest'
import specSource from '../../../../openspec/specs/vbao-node/spec.md?raw'
import adrSource from '../../../../openspec/adr/ADR-007-vbao-pivot.md?raw'
import gpuReadbackSource from '../../../../apps/demo/scripts/collect-ao-gpu-readback-baseline.mjs?raw'
import indexSource from '../index.ts?raw'
import optionsSource from '../vbaoConstants.ts?raw'

describe('VBAO evidence alignment contract', () => {
  it('keeps experimental evidence controls out of the public package API', () => {
    expect(indexSource).not.toContain('vbaoSampling')
    expect(indexSource).not.toContain('vbaoSpatialDenoise')
    expect(indexSource).not.toContain('VBAO_SECTOR_ANGLES')
    expect(indexSource).not.toContain('VBAO_SECTOR_COSINES')
    expect(indexSource).not.toContain('VBAO_SECTOR_SINES')
    expect(optionsSource).not.toContain('samplingSchedule')
    expect(optionsSource).not.toContain('readonly denoise?: boolean')
    expect(optionsSource).not.toContain('temporal')
    expect(optionsSource).not.toContain('visibilityBucket')
    expect(optionsSource).not.toContain('confidence')
  })

  it('documents visibility-bitmask AO with selected GT-VBAO corrections without overclaiming', () => {
    expect(specSource).toContain('visibility-bitmask kernel')
    expect(specSource).toContain('selected GT-VBAO corrections')
    expect(specSource).toContain('axial')
    expect(specSource).toContain('CDF')
    expect(specSource).toContain('uniform slice average')
    expect(specSource).not.toContain('projected-normal slice weighting')
    expect(specSource).toContain('point-sample')
    expect(specSource).not.toContain('vbaoReference.ts')
  })

  it('records the cleanup decision in ADR-007', () => {
    expect(adrSource).toContain('visibility-bitmask AO with selected GT-VBAO corrections')
    expect(adrSource).toContain('VBAOResolveNode')
    expect(adrSource).toContain('vbaoGtVbaoMath.ts')
    expect(adrSource).toContain('Research gates')
  })

  it('provides a real GPU readback baseline instead of screenshot-only evidence', () => {
    expect(gpuReadbackSource).toContain('navigator.gpu')
    expect(gpuReadbackSource).toContain('GPUBufferUsage.MAP_READ')
    expect(gpuReadbackSource).toContain('mapAsync(GPUMapMode.READ)')
    expect(gpuReadbackSource).toContain('vbao-32-sector-gpu')
    expect(gpuReadbackSource).toContain('gtao-horizon-envelope-gpu-proxy')
    expect(gpuReadbackSource).toContain('ssao-uniform-sample-gpu-proxy')
    expect(gpuReadbackSource).not.toContain('non-evidence-placeholder')
  })
})
