import { describe, expect, it } from 'vitest'
import {
  computeVbaoSpatialDenoiseWeight,
  denoiseVbaoAccessibility,
  type VbaoDenoiseSample,
} from '../vbaoSpatialDenoise'

const center: VbaoDenoiseSample = {
  accessibility: 0.2,
  position: [0, 0, 0],
  normal: [0, 0, 1],
}

describe('VBAO spatial denoise reference', () => {
  it('keeps invalid background neighbors from bleeding into foreground AO', () => {
    const background: VbaoDenoiseSample = {
      accessibility: 1,
      position: [0, 0, 10],
      normal: [0, 0, 1],
      valid: false,
    }

    expect(computeVbaoSpatialDenoiseWeight(center, background)).toBe(0)
    expect(denoiseVbaoAccessibility(center, [background])).toBeCloseTo(center.accessibility, 12)
  })

  it('rejects normal discontinuities before they can smear across edges', () => {
    const perpendicularSurface: VbaoDenoiseSample = {
      accessibility: 1,
      position: [0.1, 0, 0],
      normal: [1, 0, 0],
    }

    expect(computeVbaoSpatialDenoiseWeight(center, perpendicularSurface)).toBe(0)
    expect(denoiseVbaoAccessibility(center, [perpendicularSurface])).toBeCloseTo(
      center.accessibility,
      12,
    )
  })

  it('makes large tangent-plane depth breaks contribute near-zero weight', () => {
    const farBehindSurface: VbaoDenoiseSample = {
      accessibility: 1,
      position: [0, 0, 0.5],
      normal: [0, 0, 1],
    }

    expect(computeVbaoSpatialDenoiseWeight(center, farBehindSurface)).toBeLessThan(0.001)
    expect(denoiseVbaoAccessibility(center, [farBehindSurface])).toBeLessThan(0.201)
  })

  it('averages same-plane aligned neighbors through accessibility values only', () => {
    const sameSurface: VbaoDenoiseSample = {
      accessibility: 1,
      position: [0.1, 0, 0],
      normal: [0, 0, 1],
    }

    expect(computeVbaoSpatialDenoiseWeight(center, sameSurface)).toBeCloseTo(1, 12)
    expect(denoiseVbaoAccessibility(center, [sameSurface])).toBeCloseTo(0.6, 12)
  })

  it('scales otherwise valid filter weights by confidence metadata', () => {
    const lowConfidenceSurface: VbaoDenoiseSample = {
      accessibility: 1,
      position: [0.1, 0, 0],
      normal: [0, 0, 1],
      confidence: 0.25,
    }

    expect(computeVbaoSpatialDenoiseWeight(center, lowConfidenceSurface)).toBeCloseTo(0.25, 12)
  })

  it('uses edge/confidence metadata to suppress geometrically suspicious neighbors', () => {
    const suspiciousSurface: VbaoDenoiseSample = {
      accessibility: 1,
      position: [0.1, 0, 0],
      normal: [0, 0, 1],
      metadata: {
        edgeDepth: 0.4,
        edgeNormal: 0.75,
        confidence: 0.2,
      },
    }

    expect(computeVbaoSpatialDenoiseWeight(center, suspiciousSurface)).toBeLessThan(0.001)
    expect(denoiseVbaoAccessibility(center, [suspiciousSurface])).toBeLessThan(0.201)
  })

  it('is deterministic without frame index, history, or temporal jitter input', () => {
    const neighbors: VbaoDenoiseSample[] = [
      { accessibility: 0.6, position: [0.1, 0, 0], normal: [0, 0, 1] },
      { accessibility: 0.9, position: [-0.1, 0, 0], normal: [0, 0, 1] },
    ]

    expect(denoiseVbaoAccessibility(center, neighbors)).toBe(
      denoiseVbaoAccessibility(center, neighbors),
    )
  })
})
