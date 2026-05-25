import { describe, expect, it } from 'vitest'
import evidence from '../../../../EVIDENCE.md?raw'
import whiteboard from '../../../../openspec/changes/vbao-math-alignment-whiteboard/whiteboard.md?raw'
import indexSource from '../index.ts?raw'
import optionsSource from '../vbaoConstants.ts?raw'

describe('VBAO evidence alignment contract', () => {
  it('keeps experimental evidence controls out of the public package API', () => {
    expect(indexSource).not.toContain('vbaoSampling')
    expect(indexSource).not.toContain('vbaoSpatialDenoise')
    expect(optionsSource).not.toContain('samplingSchedule')
    expect(optionsSource).not.toContain('denoise')
    expect(optionsSource).not.toContain('temporal')
    expect(optionsSource).not.toContain('visibilityBucket')
    expect(optionsSource).not.toContain('confidence')
  })

  it('documents the fields required to accept or reject sampling evidence', () => {
    for (const required of [
      'vbaoSamplingSchedule',
      'vbaoSamplePreset',
      'vbaoSamples',
      'vbaoSlices',
      'raw',
      'denoised',
      'failureLabels',
      'screenshotPath',
      'medianFrameMs',
      'p95FrameMs',
    ]) {
      expect(evidence).toContain(required)
    }
  })

  it('aligns the roadmap diagram around current, evidence, and future lanes', () => {
    expect(whiteboard).toContain('Current shipped path')
    expect(whiteboard).toContain('Evidence candidate path')
    expect(whiteboard).toContain('Future pipeline path')
    expect(whiteboard).toContain('radial jitter')
    expect(whiteboard).toContain('adaptive thickness')
    expect(whiteboard).not.toContain('Current constant-thickness interval')
  })
})
