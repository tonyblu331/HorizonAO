import { describe, expect, it } from 'vitest'
import {
  RAYCAST_AO_FIXTURES,
  evaluateRaycastAoReference,
} from '../aoRaycastReference'

const fixtureById = Object.fromEntries(RAYCAST_AO_FIXTURES.map((fixture) => [fixture.id, fixture]))

describe('ray-cast AO reference fixtures', () => {
  it('freezes the canonical quality-hardening fixture set', () => {
    expect(RAYCAST_AO_FIXTURES.map((fixture) => fixture.id)).toEqual([
      'flat-plane-open',
      'sphere-contact',
      'box-contact',
      'two-wall-corner',
      'thin-gap-separated-slabs',
      'far-object-outside-radius',
    ])
  })

  it('keeps open and out-of-radius fixtures unoccluded', () => {
    expect(evaluateRaycastAoReference(fixtureById['flat-plane-open']!, 512).accessibility)
      .toBe(1)
    expect(evaluateRaycastAoReference(fixtureById['far-object-outside-radius']!, 512).accessibility)
      .toBe(1)
  })

  it('orders contact occlusion by blocker coverage', () => {
    const sphere = evaluateRaycastAoReference(fixtureById['sphere-contact']!, 2048).accessibility
    const box = evaluateRaycastAoReference(fixtureById['box-contact']!, 2048).accessibility
    const corner = evaluateRaycastAoReference(fixtureById['two-wall-corner']!, 2048).accessibility

    expect(sphere).toBeGreaterThan(0.55)
    expect(sphere).toBeLessThan(0.9)
    expect(box).toBeGreaterThan(0.55)
    expect(box).toBeLessThan(0.9)
    expect(corner).toBeLessThan(Math.min(sphere, box))
  })

  it('preserves thin-gap access instead of treating separated slabs as one wall', () => {
    const thinGap = evaluateRaycastAoReference(
      fixtureById['thin-gap-separated-slabs']!,
      2048,
    ).accessibility
    const corner = evaluateRaycastAoReference(fixtureById['two-wall-corner']!, 2048).accessibility

    expect(thinGap).toBeGreaterThan(corner)
    expect(thinGap).toBeGreaterThan(0.45)
    expect(thinGap).toBeLessThan(0.95)
  })

  it('is deterministic for the same fixture and sample count', () => {
    const first = evaluateRaycastAoReference(fixtureById['box-contact']!, 1024)
    const second = evaluateRaycastAoReference(fixtureById['box-contact']!, 1024)

    expect(second).toEqual(first)
  })
})
