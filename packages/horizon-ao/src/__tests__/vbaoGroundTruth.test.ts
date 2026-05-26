import { describe, expect, it } from 'vitest'
import {
  classifyVbaoQuality,
  evaluateAccessibilityCandidateAgainstOracle,
  estimateHemisphereAccessibility,
  scoreAccessibilityAgainstGroundTruth,
} from '../vbaoGroundTruth'

describe('VBAO ground-truth quality oracle', () => {
  it('returns fully open accessibility when no oracle rays are blocked', () => {
    expect(
      estimateHemisphereAccessibility({
        normal: [0, 0, 1],
        sampleCount: 64,
        occludes: () => false,
      }),
    ).toBe(1)
  })

  it('returns fully blocked accessibility when every oracle ray is blocked', () => {
    expect(
      estimateHemisphereAccessibility({
        normal: [0, 0, 1],
        sampleCount: 64,
        occludes: () => true,
      }),
    ).toBe(0)
  })

  it('scores accessibility error as a normalized quality value', () => {
    expect(scoreAccessibilityAgainstGroundTruth({ actual: 0.9, expected: 1 }).quality).toBeCloseTo(
      0.9,
      12,
    )
    expect(scoreAccessibilityAgainstGroundTruth({ actual: 0.2, expected: 1 }).quality).toBeCloseTo(
      0.2,
      12,
    )
  })

  it('labels false curvature separately from ordinary noise when stair-step error is present', () => {
    expect(
      classifyVbaoQuality({
        absoluteError: 0.22,
        structuredNoise: 0.08,
        stairStepError: 0.18,
      }),
    ).toEqual(['noise', 'scale-mismatch', 'false-curvature'])
  })

  it('accepts denoise candidates only when the oracle score improves without failures', () => {
    const evaluation = evaluateAccessibilityCandidateAgainstOracle({
      rawAccessibility: 0.55,
      candidateAccessibility: 0.88,
      expectedAccessibility: 0.9,
    })

    expect(evaluation.accepted).toBe(true)
    expect(evaluation.qualityDelta).toBeGreaterThan(0)
    expect(evaluation.failureLabels).toEqual([])
  })

  it('rejects smoother candidates that regress the oracle or introduce edge failures', () => {
    const evaluation = evaluateAccessibilityCandidateAgainstOracle({
      rawAccessibility: 0.8,
      candidateAccessibility: 0.55,
      expectedAccessibility: 0.9,
      candidateArtifacts: {
        absoluteError: 0.35,
        edgeBleedError: 0.2,
        mudError: 0.2,
      },
    })

    expect(evaluation.accepted).toBe(false)
    expect(evaluation.failureLabels).toContain('edge-bleed')
    expect(evaluation.failureLabels).toContain('mud')
    expect(evaluation.reason).toContain('oracle')
  })
})
