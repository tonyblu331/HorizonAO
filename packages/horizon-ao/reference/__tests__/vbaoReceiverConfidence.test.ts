import { describe, expect, it } from 'vitest'
import {
  evaluateScalarVbaoReference,
  makeScalarVbaoSampleAtTheta,
  type ScalarVbaoSample,
  type Vec3,
} from '../vbaoReference'
import { evaluateVbaoReceiverConfidence } from '../vbaoReceiverConfidence'

const PIXEL: Vec3 = [0, 0, -1]
const NORMAL: Vec3 = [0, 0, 1]

function scale3(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s]
}

describe('VBAO receiver confidence semantics', () => {
  it('separates supported open visibility from unsupported open visibility', () => {
    const supportedOpen = evaluateVbaoReceiverConfidence({
      sliceMasks: [0, 0, 0, 0],
      sliceAcceptedSampleCounts: [8, 8, 8, 8],
      sliceCandidateSampleCounts: [8, 8, 8, 8],
    })
    const unsupportedOpen = evaluateVbaoReceiverConfidence({
      sliceMasks: [0, 0, 0, 0],
      sliceAcceptedSampleCounts: [0, 0, 0, 0],
      sliceCandidateSampleCounts: [8, 8, 8, 8],
    })

    expect(supportedOpen.meanAccessibility).toBe(unsupportedOpen.meanAccessibility)
    expect(supportedOpen.support).toBe(1)
    expect(supportedOpen.sliceAgreement).toBe(1)
    expect(supportedOpen.confidence).toBe(1)
    expect(unsupportedOpen.support).toBe(0)
    expect(unsupportedOpen.confidence).toBe(0)
  })

  it('penalizes slice disagreement without treating occlusion itself as low confidence', () => {
    const coherentOccluded = evaluateVbaoReceiverConfidence({
      sliceMasks: [0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff],
      sliceAcceptedSampleCounts: [8, 8, 8, 8],
      sliceCandidateSampleCounts: [8, 8, 8, 8],
    })
    const disagreeing = evaluateVbaoReceiverConfidence({
      sliceMasks: [0xffffffff, 0, 0xffffffff, 0],
      sliceAcceptedSampleCounts: [8, 8, 8, 8],
      sliceCandidateSampleCounts: [8, 8, 8, 8],
    })

    expect(coherentOccluded.meanAccessibility).toBe(0)
    expect(coherentOccluded.support).toBe(1)
    expect(coherentOccluded.sliceAgreement).toBe(1)
    expect(coherentOccluded.confidence).toBe(1)
    expect(disagreeing.support).toBe(1)
    expect(disagreeing.sliceAgreement).toBeLessThan(0.1)
    expect(disagreeing.confidence).toBeLessThan(0.1)
  })

  it('derives support from receiver-compatible scalar reference samples', () => {
    const result = evaluateScalarVbaoReference({
      pixelPosition: PIXEL,
      normal: NORMAL,
      radius: 1,
      thickness: 0.2,
      slices: 1,
      sampleProvider: ({ sideSign, sliceDir, viewDir }): readonly ScalarVbaoSample[] => {
        const signedSliceDir = scale3(sliceDir, sideSign)
        return [
          makeScalarVbaoSampleAtTheta({
            pixelPosition: PIXEL,
            viewDir,
            sliceDir: signedSliceDir,
            theta: 0.2,
            distance: 0.7,
          }),
          {
            position: makeScalarVbaoSampleAtTheta({
              pixelPosition: PIXEL,
              viewDir,
              sliceDir: signedSliceDir,
              theta: 0.35,
              distance: 0.7,
            }).position,
            valid: false,
          },
          makeScalarVbaoSampleAtTheta({
            pixelPosition: PIXEL,
            viewDir,
            sliceDir: scale3(signedSliceDir, -1),
            theta: 0.2,
            distance: 0.7,
          }),
        ]
      },
    })
    const confidence = evaluateVbaoReceiverConfidence(result)

    expect(result.sliceCandidateSampleCounts).toEqual([6])
    expect(result.sliceAcceptedSampleCounts).toEqual([2])
    expect(confidence.support).toBeCloseTo(1 / 3, 6)
    expect(confidence.confidence).toBeGreaterThan(0)
    expect(confidence.confidence).toBeLessThan(1)
  })
})
