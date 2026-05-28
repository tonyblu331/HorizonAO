import { describe, expect, it } from 'vitest'
import { AO_FAILURE_LABELS, classifyFailureLabels } from '../../../../apps/demo/scripts/profiling/failureLabels.mjs'

describe('VBAO profiling failure labels', () => {
  it('keeps the evidence label vocabulary explicit', () => {
    expect(AO_FAILURE_LABELS).toEqual([
      'none',
      'noise',
      'mud',
      'halo',
      'thin-gap',
      'edge-bleed',
      'scale-mismatch',
      'false-curvature',
    ])
  })

  it('labels non-VBAO rows as no VBAO failure', () => {
    expect(classifyFailureLabels({ mode: 'gtao' })).toEqual(['none'])
  })

  it('rejects half-resolution VBAO product rows with scale artifacts', () => {
    expect(classifyFailureLabels({ mode: 'vbao', fullResolutionVbao: false })).toEqual([
      'noise',
      'false-curvature',
      'scale-mismatch',
    ])
  })

  it('labels full-resolution raw/product VBAO rows with current production artifacts', () => {
    expect(
      classifyFailureLabels({
        mode: 'vbao',
        fullResolutionVbao: true,
        denoise: false,
      }),
    ).toEqual(['noise', 'edge-bleed'])

    expect(
      classifyFailureLabels({
        mode: 'vbao',
        fullResolutionVbao: true,
        denoise: true,
        productOutputContract: 'VBAONode.getTextureNode() final product AO',
      }),
    ).toEqual(['noise', 'edge-bleed'])
  })

  it('keeps legacy denoised rows visibly rejected when old filter fields appear', () => {
    expect(
      classifyFailureLabels({
        mode: 'vbao',
        fullResolutionVbao: true,
        denoise: true,
        vbaoDenoiseFilter: 'legacy',
      }),
    ).toEqual(['noise', 'mud', 'thin-gap', 'edge-bleed'])
  })
})
