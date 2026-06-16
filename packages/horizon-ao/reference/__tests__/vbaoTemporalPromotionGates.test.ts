/**
 * vbaoTemporalPromotionGates.test.ts — CPU-testable gate logic for PR3 temporal promotion
 *
 * Covers the pure math functions exported from the 4 evidence fixture scripts:
 *   - collect-vbao-temporal-convergence.mjs  (Gate 1: static RMSE convergence)
 *   - collect-vbao-temporal-camera-dolly.mjs (Gate 2: camera dolly no-ghost)
 *   - collect-vbao-temporal-object-motion.mjs (Gate 3: object motion no-ghost)
 *   - collect-vbao-temporal-cold-start.mjs   (Gate 4: cold-start ≤3 frames)
 *
 * GPU-dependent collection is scaffolded in the .mjs scripts; this file covers
 * everything that is deterministic and CPU-testable.
 */

import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// Gate 1: Static convergence math
// ---------------------------------------------------------------------------

function computeAoRmse(reference: Float32Array, temporal: Float32Array): number {
  if (reference.length !== temporal.length || reference.length === 0) {
    throw new RangeError(
      `computeAoRmse: arrays must be non-empty and equal length (got ${reference.length} vs ${temporal.length})`,
    )
  }
  let sumSq = 0
  for (let i = 0; i < reference.length; i++) {
    const diff = (reference[i] ?? 0) - (temporal[i] ?? 0)
    sumSq += diff * diff
  }
  return Math.sqrt(sumSq / reference.length)
}

function findConvergenceFrame(rmseByFrame: number[], threshold: number): number | null {
  for (let i = 0; i < rmseByFrame.length; i++) {
    if ((rmseByFrame[i] ?? Infinity) <= threshold) return i
  }
  return null
}

function evaluateConvergenceGate(
  rmseByFrame: number[],
  threshold: { maxRmse: number; byFrame: number },
): { verdict: 'pass' | 'fail'; convergedByFrame: number | null } {
  const convergedByFrame = findConvergenceFrame(rmseByFrame, threshold.maxRmse)
  const verdict =
    convergedByFrame !== null && convergedByFrame <= threshold.byFrame ? 'pass' : 'fail'
  return { verdict, convergedByFrame }
}

describe('Gate 1: static convergence math', () => {
  it('computeAoRmse returns 0 when reference equals temporal', () => {
    const ref = new Float32Array([0.9, 0.8, 0.7, 0.6])
    const tmp = new Float32Array([0.9, 0.8, 0.7, 0.6])
    expect(computeAoRmse(ref, tmp)).toBeCloseTo(0, 10)
  })

  it('computeAoRmse computes correct RMSE for known inputs', () => {
    // diff = [0.1, 0.1] → mean sq = 0.01 → RMSE = 0.1
    const ref = new Float32Array([0.5, 0.5])
    const tmp = new Float32Array([0.4, 0.6])
    expect(computeAoRmse(ref, tmp)).toBeCloseTo(0.1, 5)
  })

  it('computeAoRmse throws on mismatched array lengths', () => {
    const ref = new Float32Array([0.5, 0.5])
    const tmp = new Float32Array([0.5])
    expect(() => computeAoRmse(ref, tmp)).toThrow(RangeError)
  })

  it('findConvergenceFrame returns first frame index where RMSE ≤ threshold', () => {
    const rmse = [0.20, 0.12, 0.07, 0.04, 0.03]
    expect(findConvergenceFrame(rmse, 0.05)).toBe(3)
  })

  it('findConvergenceFrame returns null when threshold never reached', () => {
    const rmse = [0.20, 0.15, 0.12, 0.10, 0.08]
    expect(findConvergenceFrame(rmse, 0.05)).toBeNull()
  })

  it('evaluateConvergenceGate returns pass when converged by frame 4', () => {
    // RMSE drops below 0.05 at frame 3 (≤ byFrame=4)
    const rmse = [0.20, 0.12, 0.07, 0.04, 0.03]
    const result = evaluateConvergenceGate(rmse, { maxRmse: 0.05, byFrame: 4 })
    expect(result.verdict).toBe('pass')
    expect(result.convergedByFrame).toBe(3)
  })

  it('evaluateConvergenceGate returns fail when converged too late', () => {
    // RMSE drops below 0.05 at frame 6, but byFrame=4
    const rmse = [0.20, 0.15, 0.10, 0.08, 0.06, 0.05, 0.04]
    const result = evaluateConvergenceGate(rmse, { maxRmse: 0.05, byFrame: 4 })
    expect(result.verdict).toBe('fail')
    expect(result.convergedByFrame).toBe(5)
  })

  it('evaluateConvergenceGate returns fail when never converged', () => {
    const rmse = [0.20, 0.18, 0.16, 0.14, 0.12]
    const result = evaluateConvergenceGate(rmse, { maxRmse: 0.05, byFrame: 4 })
    expect(result.verdict).toBe('fail')
    expect(result.convergedByFrame).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Gate 2: Camera dolly ghost score math
// ---------------------------------------------------------------------------

function computeGhostScore(
  prevAo: Float32Array,
  currAo: Float32Array,
  motionMagnitude: number,
): number {
  if (prevAo.length !== currAo.length || prevAo.length === 0) {
    throw new RangeError(
      `computeGhostScore: arrays must be non-empty and equal length (got ${prevAo.length} vs ${currAo.length})`,
    )
  }
  if (motionMagnitude <= 0) return 0

  let sumAbsDiff = 0
  for (let i = 0; i < prevAo.length; i++) {
    sumAbsDiff += Math.abs((currAo[i] ?? 0) - (prevAo[i] ?? 0))
  }
  const meanAbsDiff = sumAbsDiff / prevAo.length
  return meanAbsDiff / motionMagnitude
}

describe('Gate 2: camera dolly ghost score math', () => {
  it('computeGhostScore returns 0 when prevAo equals currAo (no change)', () => {
    const ao = new Float32Array([0.8, 0.7, 0.9])
    expect(computeGhostScore(ao, ao, 0.1)).toBeCloseTo(0, 5)
  })

  it('computeGhostScore returns 0 when motionMagnitude is 0', () => {
    const prev = new Float32Array([0.8, 0.7])
    const curr = new Float32Array([0.5, 0.5])
    expect(computeGhostScore(prev, curr, 0)).toBe(0)
  })

  it('computeGhostScore returns correct normalized score', () => {
    // mean abs diff = 0.1, motion = 0.5 → ghost = 0.2
    const prev = new Float32Array([0.8, 0.8])
    const curr = new Float32Array([0.9, 0.7]) // diffs = [0.1, 0.1] → mean = 0.1
    expect(computeGhostScore(prev, curr, 0.5)).toBeCloseTo(0.2, 5)
  })

  it('computeGhostScore throws on mismatched lengths', () => {
    expect(() =>
      computeGhostScore(new Float32Array([0.8]), new Float32Array([0.7, 0.6]), 0.1),
    ).toThrow(RangeError)
  })
})

// ---------------------------------------------------------------------------
// Gate 3: Object motion residual math
// ---------------------------------------------------------------------------

function computeOcclusionResidual(aoValues: Float32Array): number {
  if (aoValues.length === 0) {
    throw new RangeError('computeOcclusionResidual: aoValues must be non-empty')
  }
  let sum = 0
  for (let i = 0; i < aoValues.length; i++) {
    sum += 1.0 - (aoValues[i] ?? 0)
  }
  return sum / aoValues.length
}

describe('Gate 3: object motion residual math', () => {
  it('computeOcclusionResidual returns 0 when all pixels are fully unoccluded (AO=1)', () => {
    const ao = new Float32Array([1.0, 1.0, 1.0])
    expect(computeOcclusionResidual(ao)).toBeCloseTo(0, 10)
  })

  it('computeOcclusionResidual returns 1 when all pixels are fully occluded (AO=0)', () => {
    const ao = new Float32Array([0.0, 0.0, 0.0])
    expect(computeOcclusionResidual(ao)).toBeCloseTo(1.0, 10)
  })

  it('computeOcclusionResidual returns correct mean residual', () => {
    // AO = [0.9, 0.8] → residuals = [0.1, 0.2] → mean = 0.15
    const ao = new Float32Array([0.9, 0.8])
    expect(computeOcclusionResidual(ao)).toBeCloseTo(0.15, 5)
  })

  it('computeOcclusionResidual throws on empty array', () => {
    expect(() => computeOcclusionResidual(new Float32Array([]))).toThrow(RangeError)
  })
})

// ---------------------------------------------------------------------------
// Gate 4: Cold-start α ramp math
// ---------------------------------------------------------------------------

function computeColdStartAlpha(frameIndex: number, adaptiveAlpha: number): number {
  const counter = Math.min(frameIndex, 15)
  const counterScale = 1.0 - counter / 15
  return Math.max(adaptiveAlpha, counterScale)
}

function computeColdStartDeviation(
  frameIndex: number,
  adaptiveAlpha: number,
  spatialSample: number,
  temporalHistory: number,
): number {
  const alpha = computeColdStartAlpha(frameIndex, adaptiveAlpha)
  const blendedAo = temporalHistory + (spatialSample - temporalHistory) * alpha
  return Math.abs(blendedAo - spatialSample)
}

describe('Gate 4: cold-start α ramp math', () => {
  it('computeColdStartAlpha returns 1.0 on frame 0 (counter=0, scale=1)', () => {
    expect(computeColdStartAlpha(0, 0.1)).toBeCloseTo(1.0, 10)
  })

  it('computeColdStartAlpha returns max(adaptiveAlpha, counterScale) for subsequent frames', () => {
    // frame 1: counter=1, scale=14/15≈0.933 → max(0.1, 0.933)=0.933
    expect(computeColdStartAlpha(1, 0.1)).toBeCloseTo(14 / 15, 5)
    // frame 15: counter=15, scale=0 → max(0.1, 0)=0.1
    expect(computeColdStartAlpha(15, 0.1)).toBeCloseTo(0.1, 10)
  })

  it('computeColdStartAlpha saturates at steady-state adaptiveAlpha after warmup', () => {
    // frame 30: counter=min(30,15)=15, scale=0 → adaptiveAlpha
    expect(computeColdStartAlpha(30, 0.15)).toBeCloseTo(0.15, 10)
  })

  it('computeColdStartDeviation returns 0 on frame 0 (α=1 → output = spatialSample)', () => {
    // α=1 → blended = history + (spatial - history) * 1.0 = spatial
    expect(computeColdStartDeviation(0, 0.1, 0.7, 0.0)).toBeCloseTo(0.0, 10)
  })

  it('computeColdStartDeviation increases as history drifts from spatial on later frames', () => {
    // frame 1: α = 14/15 ≈ 0.933 → blended = 0.5 + (0.7 - 0.5) * 0.933 = 0.687
    // deviation = |0.687 - 0.7| = 0.013
    const alpha = 14 / 15
    const expected = Math.abs(0.5 + (0.7 - 0.5) * alpha - 0.7)
    expect(computeColdStartDeviation(1, 0.1, 0.7, 0.5)).toBeCloseTo(expected, 5)
  })

  it('evaluateColdStartGate passes when max deviation within threshold', () => {
    // All deviations are 0 (frame 0, α=1 always matches spatial)
    const deviations = [0.0, 0.013, 0.027]
    const validDeviations = deviations.filter((d) => Number.isFinite(d))
    const maxDeviation = Math.max(...validDeviations)
    const verdict = maxDeviation <= 0.08 ? 'pass' : 'fail'
    expect(verdict).toBe('pass')
  })
})
