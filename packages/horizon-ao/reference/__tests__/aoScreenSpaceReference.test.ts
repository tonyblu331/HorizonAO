import { describe, expect, it } from 'vitest'

import {
  SS_AO_CAMERA_SET_ID,
  SS_AO_FIXTURE_CAMERAS,
  evaluateScreenSpaceAchievableAo,
} from '../aoScreenSpaceReference'
import { RAYCAST_AO_FIXTURES, evaluateRaycastAoReference } from '../aoRaycastReference'

// VIS_EPSILON matches the constant in aoScreenSpaceReference.ts — kept in sync here for test assertions
const VIS_EPSILON = 1e-3

describe('aoScreenSpaceReference — frozen camera record', () => {
  it('SS_AO_FIXTURE_CAMERAS has exactly 9 entries (one per RaycastAoFixtureId)', () => {
    const keys = Object.keys(SS_AO_FIXTURE_CAMERAS)
    expect(keys).toHaveLength(RAYCAST_AO_FIXTURES.length) // 9
  })

  it('cameraSetId is ssao-cam-v1', () => {
    expect(SS_AO_CAMERA_SET_ID).toBe('ssao-cam-v1')
  })

  it('SS_AO_FIXTURE_CAMERAS record is frozen', () => {
    expect(Object.isFrozen(SS_AO_FIXTURE_CAMERAS)).toBe(true)
  })

  it('7 Y-up fixtures share canonical eye [0,2,2.5] and lookAt [0,0,0]', () => {
    const yUpFixtureIds = [
      'flat-plane-open',
      'sphere-contact',
      'box-contact',
      'two-wall-corner',
      'broad-wall-contact',
      'thin-gap-separated-slabs',
      'far-object-outside-radius',
    ] as const

    for (const id of yUpFixtureIds) {
      const cam = SS_AO_FIXTURE_CAMERAS[id]
      expect(cam.eye, `${id} eye`).toEqual([0, 2, 2.5])
      expect(cam.lookAt, `${id} lookAt`).toEqual([0, 0, 0])
    }
  })

  it('grazing-surface-wall has override eye [-1.5,2.2,2.0]', () => {
    const cam = SS_AO_FIXTURE_CAMERAS['grazing-surface-wall']
    expect(cam.eye).toEqual([-1.5, 2.2, 2.0])
    expect(cam.lookAt).toEqual([0, 0, 0])
  })

  it('normal-sensitive-side-contact has override eye [0,2.2,-2.0]', () => {
    const cam = SS_AO_FIXTURE_CAMERAS['normal-sensitive-side-contact']
    expect(cam.eye).toEqual([0, 2.2, -2.0])
    expect(cam.lookAt).toEqual([0, 0, 0])
  })
})

describe('aoScreenSpaceReference — evaluateScreenSpaceAchievableAo', () => {
  it('is deterministic: same result on repeated calls', () => {
    const fixture = RAYCAST_AO_FIXTURES.find((f) => f.id === 'sphere-contact')!
    const camera = SS_AO_FIXTURE_CAMERAS['sphere-contact']
    const r1 = evaluateScreenSpaceAchievableAo(fixture, camera)
    const r2 = evaluateScreenSpaceAchievableAo(fixture, camera)
    expect(r1.accessibility).toBe(r2.accessibility)
    expect(r1.occludedRays).toBe(r2.occludedRays)
  })

  it('flat-plane-open → accessibility === 1.0', () => {
    const fixture = RAYCAST_AO_FIXTURES.find((f) => f.id === 'flat-plane-open')!
    const camera = SS_AO_FIXTURE_CAMERAS['flat-plane-open']
    const result = evaluateScreenSpaceAchievableAo(fixture, camera)
    expect(result.accessibility).toBe(1.0)
  })

  it('far-object-outside-radius → accessibility === 1.0 (equals gtAccessibility)', () => {
    const fixture = RAYCAST_AO_FIXTURES.find((f) => f.id === 'far-object-outside-radius')!
    const camera = SS_AO_FIXTURE_CAMERAS['far-object-outside-radius']
    const ssResult = evaluateScreenSpaceAchievableAo(fixture, camera)
    const gtResult = evaluateRaycastAoReference(fixture, 4096)
    expect(ssResult.accessibility).toBe(1.0)
    expect(gtResult.accessibility).toBe(1.0)
  })

  it('per-fixture: SS accessibility satisfies ss >= gt - VIS_EPSILON (monotonicity: SS never darker than GT)', () => {
    // SS can only LOSE occlusion relative to GT (occluders hidden behind nearer surfaces
    // from the camera are not detectable by a depth buffer). This means SS accessibility
    // is always >= GT accessibility — SS is lighter (less occluded), never darker.
    //
    // The spec's "ss <= gt + VIS_EPSILON" has the direction backwards; the correct
    // invariant is "ss >= gt - VIS_EPSILON" (SS at least as bright as GT, within epsilon).
    // See design narrative: "SS only ever drops occlusion vs GT → irreducibleDelta = ss − gt >= 0".
    for (const fixture of RAYCAST_AO_FIXTURES) {
      const camera = SS_AO_FIXTURE_CAMERAS[fixture.id as keyof typeof SS_AO_FIXTURE_CAMERAS]
      const ssResult = evaluateScreenSpaceAchievableAo(fixture, camera)
      const gtResult = evaluateRaycastAoReference(fixture, 4096)
      expect(ssResult.accessibility, `monotonicity: ${fixture.id}`).toBeGreaterThanOrEqual(
        gtResult.accessibility - VIS_EPSILON,
      )
    }
  })

  it('returns correct shape with sampleCount matching input', () => {
    const fixture = RAYCAST_AO_FIXTURES.find((f) => f.id === 'box-contact')!
    const camera = SS_AO_FIXTURE_CAMERAS['box-contact']
    const result = evaluateScreenSpaceAchievableAo(fixture, camera, 256)
    expect(typeof result.accessibility).toBe('number')
    expect(typeof result.occludedRays).toBe('number')
    expect(result.sampleCount).toBe(256)
    expect(result.accessibility).toBeGreaterThanOrEqual(0)
    expect(result.accessibility).toBeLessThanOrEqual(1)
  })
})
