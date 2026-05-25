import { describe, expect, it } from 'vitest'
import { EVIDENCE_FAILURE_LABELS, EVIDENCE_ROW_SCHEMA } from './evidenceCameras'

describe('evidence row contract', () => {
  it('includes comparison fields for raw and denoised AO evidence', () => {
    expect(EVIDENCE_ROW_SCHEMA).toEqual([
      'scene',
      'cameraId',
      'resolution',
      'algorithm',
      'viewMode',
      'denoise',
      'device',
      'browser',
      'renderer',
      'timingMethod',
      'medianTime_ms',
      'radius',
      'thickness',
      'slices',
      'samples',
      'resolutionScale',
      'sectors',
      'failureLabels',
      'screenshotPath',
    ])
  })

  it('uses the fixed failure labels from the SDD evidence baseline', () => {
    expect(EVIDENCE_FAILURE_LABELS).toEqual([
      'none',
      'noise',
      'mud',
      'halo',
      'thin-gap',
      'edge-bleed',
      'scale-mismatch',
    ])
  })
})
