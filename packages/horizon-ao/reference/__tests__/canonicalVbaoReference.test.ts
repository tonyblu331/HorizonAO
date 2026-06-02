import { describe, expect, it } from 'vitest'
import {
  buildGtVbaoSampleInterval,
  type Vec3,
} from '../vbaoGtVbaoMath'
import {
  canonicalVbaoSampleMask,
  canonicalVbaoUpdateSectors,
  evaluateCanonicalVbaoReference,
  makeCanonicalVbaoSampleAtAngle,
  popcount32,
} from '../canonicalVbaoReference'

const PIXEL: Vec3 = [0, 0, -2]
const VIEW: Vec3 = [0, 0, 1]
const TANGENT: Vec3 = [1, 0, 0]

describe('canonical VBAO reference lane', () => {
  it('implements the paper/blog UpdateSectors ceil-touch rule', () => {
    expect(canonicalVbaoUpdateSectors(0, 0)).toBe(0)
    expect(canonicalVbaoUpdateSectors(0, 1)).toBe(0xffffffff)
    expect(canonicalVbaoUpdateSectors(0, 1 / 32)).toBe(0x00000001)
    expect(canonicalVbaoUpdateSectors(31 / 32, 1)).toBe(0x80000000)

    const tinyTouch = canonicalVbaoUpdateSectors(0.4, 0.4001)
    expect(popcount32(tinyTouch)).toBe(1)
  })

  it('keeps a no-sample fixture fully accessible', () => {
    const result = evaluateCanonicalVbaoReference({
      pixelPosition: PIXEL,
      viewDir: VIEW,
      normalAngle: 0,
      radius: 1,
      thickness: 0.1,
      sampleProvider: () => [],
    })

    expect(result.mask).toBe(0)
    expect(result.accessibility).toBe(1)
  })

  it('uses constant pixel-view thickness, so zero thickness contributes no sectors', () => {
    const sample = makeCanonicalVbaoSampleAtAngle({
      pixelPosition: PIXEL,
      viewDir: VIEW,
      tangentDir: TANGENT,
      sideSign: 1,
      angleFromView: 0.35,
      distance: 0.8,
    })

    expect(canonicalVbaoSampleMask({
      samplePosition: sample.position,
      pixelPosition: PIXEL,
      viewDir: VIEW,
      sideSign: 1,
      normalAngle: 0,
      thickness: 0,
    })).toBe(0)
    expect(popcount32(canonicalVbaoSampleMask({
      samplePosition: sample.position,
      pixelPosition: PIXEL,
      viewDir: VIEW,
      sideSign: 1,
      normalAngle: 0,
      thickness: 0.2,
    }))).toBeGreaterThan(0)
  })

  it('preserves separated thin samples as sparse sector coverage', () => {
    const result = evaluateCanonicalVbaoReference({
      pixelPosition: PIXEL,
      viewDir: VIEW,
      normalAngle: 0,
      radius: 1,
      thickness: 0.06,
      sampleProvider: ({ sideSign }) => [
        makeCanonicalVbaoSampleAtAngle({
          pixelPosition: PIXEL,
          viewDir: VIEW,
          tangentDir: TANGENT,
          sideSign,
          angleFromView: 0.25,
          distance: 0.7,
        }),
        makeCanonicalVbaoSampleAtAngle({
          pixelPosition: PIXEL,
          viewDir: VIEW,
          tangentDir: TANGENT,
          sideSign,
          angleFromView: 0.9,
          distance: 0.7,
        }),
      ],
    })

    expect(popcount32(result.mask)).toBeGreaterThan(0)
    expect(popcount32(result.mask)).toBeLessThan(10)
    expect(result.accessibility).toBeGreaterThan(0.65)
  })

  it('makes the product-lane drift from canonical thickness observable', () => {
    const samplePosition: Vec3 = [0.7, 0, -1.2]
    const canonicalMask = canonicalVbaoSampleMask({
      samplePosition,
      pixelPosition: PIXEL,
      viewDir: VIEW,
      sideSign: 1,
      normalAngle: 0,
      thickness: 0.25,
    })
    const productInterval = buildGtVbaoSampleInterval({
      samplePosition,
      pixelPosition: PIXEL,
      viewDir: VIEW,
      sliceDir: TANGENT,
      normalAngle: 0,
      thickness: 0.25,
    })

    expect(canonicalMask).not.toBe(productInterval.mask)
  })
})
