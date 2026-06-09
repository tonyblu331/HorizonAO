import { describe, expect, it } from 'vitest'
import specSource from '../../../../openspec/specs/vbao-node/spec.md?raw'
import adrSource from '../../../../openspec/adr/ADR-007-vbao-pivot.md?raw'
import gpuReadbackSource from '../../../../apps/demo/scripts/collect-ao-gpu-readback-baseline.mjs?raw'
import archiveManifestSource from '../../../../openspec/changes/vbao-release-candidate-gates/review-archive-manifest.md?raw'
import archiveVerifySource from '../../../../scripts/verify-vbao-review-archive.mjs?raw'
import indexSource from '../../src/index.ts?raw'
import optionsSource from '../../src/vbaoConstants.ts?raw'
import canonicalReferenceSource from '../canonicalVbaoReference.ts?raw'

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
    expect(optionsSource).not.toContain('VBAO_SECTOR_ANGLES')
    expect(optionsSource).not.toContain('VBAO_SECTOR_COSINES')
    expect(optionsSource).not.toContain('VBAO_SECTOR_SINES')
    expect(indexSource).not.toContain('canonicalVbaoReference')
    expect(indexSource).not.toContain('evaluateCanonicalVbaoReference')
  })

  it('keeps GT-VBAO reference math out of runtime src', () => {
    expect(canonicalReferenceSource).not.toContain('../src/vbaoGtVbaoMath')
    expect(canonicalReferenceSource).toContain('./vbaoGtVbaoMath')
  })

  it('documents visibility-bitmask AO with selected GT-VBAO corrections without overclaiming', () => {
    expect(specSource).toContain('visibility-bitmask kernel')
    expect(specSource).toContain('selected GT-VBAO corrections')
    expect(specSource).toContain('axial')
    expect(specSource).toContain('CDF')
    expect(specSource).toContain('projected-normal weighted slice accumulation')
    expect(specSource).toContain('projected normal length')
    expect(specSource).toContain('point-sample')
    expect(specSource).not.toContain('vbaoReference.ts')
  })

  it('keeps the canonical VBAO verifier separate from the product node', () => {
    expect(canonicalReferenceSource).toContain('canonicalVbaoUpdateSectors')
    expect(canonicalReferenceSource).toContain('1 - popcount32(mask) / SECTOR_COUNT')
    expect(canonicalReferenceSource).not.toContain('VBAOFullResPolishNode')
    expect(canonicalReferenceSource).not.toContain('VBAOResolveNode')
    expect(canonicalReferenceSource).not.toContain('sample-local')
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

  it('keeps the review archive manifest self-contained for files under review', () => {
    const requiredManifestEntries = [
      'packages/horizon-ao/src/index.ts',
      'packages/horizon-ao/src/VBAONode.ts',
      'packages/horizon-ao/src/VBAOResolveNode.ts',
      'packages/horizon-ao/src/VBAOHalfResCleanupNode.ts',
      'packages/horizon-ao/src/VBAOFullResPolishNode.ts',
      'packages/horizon-ao/src/vbaoConstants.ts',
      'packages/horizon-ao/src/vbaoNoise.ts',
      'packages/horizon-ao/src/vbaoSampling.ts',
      'packages/horizon-ao/reference/vbaoReference.ts',
      'packages/horizon-ao/reference/canonicalVbaoReference.ts',
      'packages/horizon-ao/reference/vbaoGtVbaoMath.ts',
      'packages/horizon-ao/reference/vbaoSectorTables.ts',
      'packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts',
      'packages/horizon-ao/reference/__tests__/vbaoEvidenceContract.test.ts',
    ]

    for (const entry of requiredManifestEntries) {
      expect(archiveManifestSource).toContain(`- \`${entry}\``)
    }
    expect(archiveManifestSource).toContain('No excluded internal imports')
    expect(archiveVerifySource).toContain('verifyManifestImportClosure')
    expect(archiveVerifySource).toContain('review-archive-manifest.md')
  })
})
