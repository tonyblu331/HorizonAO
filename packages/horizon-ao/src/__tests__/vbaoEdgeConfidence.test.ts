import { describe, expect, it } from 'vitest'
import {
  computeVbaoEdgeConfidenceMetadata,
  computeVbaoEdgeMetrics,
} from '../vbaoEdgeConfidence'

describe('VBAO edge/confidence metadata reference', () => {
  it('reports tangent-plane depth and normal discontinuity metadata', () => {
    const metadata = computeVbaoEdgeMetrics({
      centerPosition: [0, 0, 0],
      centerNormal: [0, 0, 1],
      neighborPosition: [0.25, 0, 0.5],
      neighborNormal: [1, 0, 0],
    })

    expect(metadata.edgeDepth).toBeCloseTo(0.5, 12)
    expect(metadata.edgeNormal).toBeCloseTo(1, 12)
  })

  it('gives high confidence to well-sampled same-surface neighborhoods', () => {
    const metadata = computeVbaoEdgeConfidenceMetadata({
      centerPosition: [0, 0, 0],
      centerNormal: [0, 0, 1],
      neighborPosition: [0.2, 0, 0],
      neighborNormal: [0, 0, 1],
      validSamples: 24,
      sampleBudget: 24,
      depthRange: 0.002,
      maskCoverage: 1,
    })

    expect(metadata.confidence).toBeGreaterThan(0.9)
    expect(metadata.edgeDepth).toBeCloseTo(0, 12)
    expect(metadata.edgeNormal).toBeCloseTo(0, 12)
  })

  it('drops confidence near depth and normal discontinuities', () => {
    const metadata = computeVbaoEdgeConfidenceMetadata({
      centerPosition: [0, 0, 0],
      centerNormal: [0, 0, 1],
      neighborPosition: [0.1, 0, 0.45],
      neighborNormal: [1, 0, 0],
      validSamples: 8,
      sampleBudget: 24,
      depthRange: 0.4,
      maskCoverage: 0.5,
    })

    expect(metadata.edgeDepth).toBeCloseTo(0.45, 12)
    expect(metadata.edgeNormal).toBeCloseTo(1, 12)
    expect(metadata.confidence).toBeLessThan(0.05)
  })
})
