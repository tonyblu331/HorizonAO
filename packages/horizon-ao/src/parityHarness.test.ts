import { describe, expect, it } from 'vitest'
import {
  HORIZON_AO_BASELINES,
  HORIZON_AO_DEBUG_VIEWS,
  createParityCaptureDescriptor,
  createParityArtifactName,
  createGpuTimingRecord,
  estimateRenderTargetBytes,
  createUnsupportedGpuTimingRecord,
  type ParitySceneFixture,
} from './parityHarness'

const fixture = {
  key: 'grid',
  label: 'Primitive Grid',
  route: '/',
  camera: {
    position: [9, 7, 12],
    target: [0, 0, 0],
    fov: 42,
    near: 0.1,
    far: 120,
  },
} satisfies ParitySceneFixture

describe('createParityCaptureDescriptor', () => {
  it('keeps the scene, camera, viewport, DPR, baseline, and debug view together', () => {
    const descriptor = createParityCaptureDescriptor(fixture, {
      width: 1280,
      height: 720,
      dpr: 1.5,
      baseline: 'three-gtao-node',
      debugView: 'raw-ao',
    })

    expect(descriptor.sceneKey).toBe('grid')
    expect(descriptor.camera.target).toEqual([0, 0, 0])
    expect(descriptor.viewport.pixelWidth).toBe(1920)
    expect(descriptor.viewport.pixelHeight).toBe(1080)
    expect(descriptor.baseline).toBe('three-gtao-node')
    expect(descriptor.debugView).toBe('raw-ao')
  })

  it('uses honest fallback labels for unavailable baselines', () => {
    expect(HORIZON_AO_BASELINES['three-gtao-node'].status).toBe('available')
    expect(HORIZON_AO_BASELINES['n8ao-webgpu'].status).toBe('unverified')
    expect(HORIZON_AO_BASELINES['horizonao-raw'].status).toBe('available')
    expect(HORIZON_AO_DEBUG_VIEWS).toContain('edge-confidence')
  })

  it('creates stable screenshot artifact names from comparison facts', () => {
    const descriptor = createParityCaptureDescriptor(fixture, {
      width: 1280,
      height: 720,
      dpr: 1,
      baseline: 'scene-only',
      debugView: 'none',
    })

    expect(createParityArtifactName(descriptor, 'png')).toBe('grid__scene-only__none__1280x720__dpr1.00.png')
  })
})

describe('estimateRenderTargetBytes', () => {
  it('estimates render target memory from resolved pixel dimensions and bytes per pixel', () => {
    expect(estimateRenderTargetBytes({ width: 640, height: 360, dpr: 2, bytesPerPixel: 2 })).toBe(
      640 * 2 * 360 * 2 * 2,
    )
  })
})

describe('createGpuTimingRecord', () => {
  it('marks missing GPU timings as unavailable instead of inventing a duration', () => {
    expect(createGpuTimingRecord('ao-core')).toEqual({
      label: 'ao-core',
      status: 'unavailable',
      source: 'not-measured',
    })
  })

  it('captures only finite non-negative durations', () => {
    expect(createGpuTimingRecord('render', 1.25)).toEqual({
      label: 'render',
      status: 'captured',
      source: 'timestamp-query',
      durationMs: 1.25,
    })

    expect(createGpuTimingRecord('render', Number.NaN).status).toBe('pending')
  })

  it('marks unsupported GPU timing explicitly', () => {
    expect(createUnsupportedGpuTimingRecord('render', 'timestamp-query missing')).toEqual({
      label: 'render',
      status: 'unsupported',
      source: 'not-measured',
      note: 'timestamp-query missing',
    })
  })
})
