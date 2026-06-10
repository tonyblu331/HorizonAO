/**
 * Regression assertions for VBAO_DEFAULTS and key exported constants.
 *
 * These are the primary behavioral contracts for default values. Change here
 * first (TDD RED), then update the constants to make them green.
 */

import { describe, expect, it } from 'vitest'

import {
  VBAO_DEFAULTS,
  VBAO_CLAMP_RANGES,
  VBAO_NEAR_SAMPLE_THICKNESS_RATIO,
} from '../vbaoConstants'

describe('VBAO default constant values', () => {
  it('contrast default is 1.8 (non-identity: prevents perceptually flat output)', () => {
    expect(VBAO_DEFAULTS.contrast).toBe(1.8)
  })

  it('contrast default 1.8 is within the allowed clamp range [0, 4]', () => {
    expect(VBAO_DEFAULTS.contrast).toBeGreaterThanOrEqual(VBAO_CLAMP_RANGES.contrast.min)
    expect(VBAO_DEFAULTS.contrast).toBeLessThanOrEqual(VBAO_CLAMP_RANGES.contrast.max)
  })

  it('VBAO_NEAR_SAMPLE_THICKNESS_RATIO is 0.95 (enables contact-occlusion mask bits on close samples)', () => {
    expect(VBAO_NEAR_SAMPLE_THICKNESS_RATIO).toBe(0.95)
  })

  it('VBAO_NEAR_SAMPLE_THICKNESS_RATIO 0.95 makes effectiveThickness non-zero for close samples', () => {
    // Verify the ratio is high enough that for a representative close sample
    // (sampleDist = 0.1), the effective thickness is non-zero.
    // effectiveThickness = min(baseThickness, sampleDist * ratio)
    // With sampleDist=0.1, ratio=0.95: 0.095 > 0 ✓
    const representativeCloseDistance = 0.1
    const effectiveThicknessProxy = representativeCloseDistance * VBAO_NEAR_SAMPLE_THICKNESS_RATIO
    expect(effectiveThicknessProxy).toBeGreaterThan(0)
    // Confirm the new ratio 0.95 exceeds the old value 0.85
    // With the new constant this becomes 0.095, which is strictly greater than 0.085
    expect(effectiveThicknessProxy).toBeGreaterThan(0.085)
  })
})
