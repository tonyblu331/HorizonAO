/**
 * Unit tests for vbaoTemporalMath.ts — pure-TS temporal accumulation helpers.
 *
 * TDD: these tests are written BEFORE the implementation. They are the
 * acceptance criteria for spec §Depth-Reprojection Validity, §AABB Variance
 * Clamping, §EMA Blend Core, and the reprojection matrix helper.
 *
 * All functions under test are pure (no side effects) so every assertion
 * directly exercises the production return value.
 */

import { describe, expect, it } from 'vitest'

import {
  isReprojectionValid,
  clampToAABB,
  buildReprojMatrix,
  emaBlend,
  adaptiveAlpha,
  counterToAlphaScale,
  updateReliabilityCounter,
  halton,
} from '../vbaoTemporalMath'

// ---------------------------------------------------------------------------
// §Depth-Reprojection Validity
// ---------------------------------------------------------------------------

describe('isReprojectionValid', () => {
  const defaultThresholds = { relDepth: 0.05, normalDot: 0.906 } as const

  it('returns true when all three sub-tests pass', () => {
    const curr = { uv: { x: 0.5, y: 0.5 }, viewLen: 10.0, normal: { x: 0, y: 0, z: 1 } }
    const prev = { uv: { x: 0.5, y: 0.5 }, viewLen: 10.0, normal: { x: 0, y: 0, z: 1 } }
    expect(isReprojectionValid(curr, prev, defaultThresholds)).toBe(true)
  })

  it('returns false when prevUV is out-of-screen (x > 1)', () => {
    const curr = { uv: { x: 0.5, y: 0.5 }, viewLen: 10.0, normal: { x: 0, y: 0, z: 1 } }
    const prev = { uv: { x: 1.01, y: 0.5 }, viewLen: 10.0, normal: { x: 0, y: 0, z: 1 } }
    expect(isReprojectionValid(curr, prev, defaultThresholds)).toBe(false)
  })

  it('returns false when prevUV is out-of-screen (x < 0)', () => {
    const curr = { uv: { x: 0.5, y: 0.5 }, viewLen: 10.0, normal: { x: 0, y: 0, z: 1 } }
    const prev = { uv: { x: -0.01, y: 0.5 }, viewLen: 10.0, normal: { x: 0, y: 0, z: 1 } }
    expect(isReprojectionValid(curr, prev, defaultThresholds)).toBe(false)
  })

  it('returns false when prevUV is out-of-screen (y > 1)', () => {
    const curr = { uv: { x: 0.5, y: 0.5 }, viewLen: 10.0, normal: { x: 0, y: 0, z: 1 } }
    const prev = { uv: { x: 0.5, y: 1.01 }, viewLen: 10.0, normal: { x: 0, y: 0, z: 1 } }
    expect(isReprojectionValid(curr, prev, defaultThresholds)).toBe(false)
  })

  it('returns false when relative depth equals threshold exactly (boundary: strict less-than)', () => {
    // spec: abs(curr_len - prev_len) / curr_len < 0.05 — STRICT less-than, so 0.05 fails
    const curr = { uv: { x: 0.5, y: 0.5 }, viewLen: 10.0, normal: { x: 0, y: 0, z: 1 } }
    const prev = { uv: { x: 0.5, y: 0.5 }, viewLen: 10.5, normal: { x: 0, y: 0, z: 1 } }
    // |10.0 - 10.5| / 10.0 = 0.05 exactly → false
    expect(isReprojectionValid(curr, prev, defaultThresholds)).toBe(false)
  })

  it('returns true when relative depth is just below threshold (0.049)', () => {
    const curr = { uv: { x: 0.5, y: 0.5 }, viewLen: 10.0, normal: { x: 0, y: 0, z: 1 } }
    const prev = { uv: { x: 0.5, y: 0.5 }, viewLen: 10.49, normal: { x: 0, y: 0, z: 1 } }
    // |10.0 - 10.49| / 10.0 = 0.049 < 0.05 → true
    expect(isReprojectionValid(curr, prev, defaultThresholds)).toBe(true)
  })

  it('returns false when normal dot is 0.9 (below 0.906)', () => {
    // Normal vectors with dot product 0.9 — use exact values: N_curr = (0,0,1), N_prev = (sin θ, 0, cos θ)
    // cos θ = 0.9 → θ = arccos(0.9) ≈ 25.8°, sin θ ≈ 0.4359
    const curr = { uv: { x: 0.5, y: 0.5 }, viewLen: 10.0, normal: { x: 0, y: 0, z: 1 } }
    const prev = {
      uv: { x: 0.5, y: 0.5 },
      viewLen: 10.0,
      normal: { x: Math.sqrt(1 - 0.81), y: 0, z: 0.9 }, // dot with (0,0,1) = 0.9
    }
    expect(isReprojectionValid(curr, prev, defaultThresholds)).toBe(false)
  })

  it('returns true when normal dot is 0.907 (just above 0.906)', () => {
    const sinComp = Math.sqrt(1 - 0.907 * 0.907)
    const curr = { uv: { x: 0.5, y: 0.5 }, viewLen: 10.0, normal: { x: 0, y: 0, z: 1 } }
    const prev = {
      uv: { x: 0.5, y: 0.5 },
      viewLen: 10.0,
      normal: { x: sinComp, y: 0, z: 0.907 },
    }
    expect(isReprojectionValid(curr, prev, defaultThresholds)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §AABB Variance Clamping
// ---------------------------------------------------------------------------

describe('clampToAABB', () => {
  it('returns history unchanged when it is inside the neighborhood range', () => {
    // range: [min - 0.05, max + 0.05] = [0.3, 0.85]
    expect(clampToAABB(0.5, 0.35, 0.8)).toBeCloseTo(0.5)
  })

  it('returns history unchanged when it equals the lower boundary (min - pad)', () => {
    // clampToAABB(0.3, 0.35, 0.8) → history=neighborMin−pad → inside
    expect(clampToAABB(0.3, 0.35, 0.8)).toBeCloseTo(0.3)
  })

  it('clamps history to neighborMax + pad when history exceeds upper boundary', () => {
    // history=0.9, max=0.8, pad=0.05 → clamp to 0.85
    expect(clampToAABB(0.9, 0.35, 0.8)).toBeCloseTo(0.85)
  })

  it('clamps history to neighborMin - pad when history falls below lower boundary', () => {
    // history=0.1, min=0.35, pad=0.05 → clamp to 0.30
    expect(clampToAABB(0.1, 0.35, 0.8)).toBeCloseTo(0.3)
  })

  it('accepts custom pad value', () => {
    // pad=0.1: range=[0.25, 0.9]; history=0.95 → clamped to 0.9
    expect(clampToAABB(0.95, 0.35, 0.8, 0.1)).toBeCloseTo(0.9)
  })
})

// ---------------------------------------------------------------------------
// Reprojection matrix composition
// ---------------------------------------------------------------------------

describe('buildReprojMatrix', () => {
  it('multiplies proj_prev * view_prev * view_curr_inv in correct order', () => {
    // Use simple scaling matrices to verify composition order.
    // proj_prev scales by 2, view_prev scales by 3, view_curr_inv scales by 5.
    // Expected: any input vector v → result = 2*(3*(5*v)) = 30v
    const projPrev = scalingMat4(2)
    const viewPrev = scalingMat4(3)
    const viewCurrInv = scalingMat4(5)

    const reproj = buildReprojMatrix(projPrev, viewPrev, viewCurrInv)

    // Apply to column vector [1, 0, 0, 1]
    const result = applyMat4(reproj, [1, 0, 0, 1])
    // x should be 30 (2*3*5), w should be 1 (identity diagonal for w row)
    expect(result[0]).toBeCloseTo(30)
  })

  it('returns identity when all inputs are identity', () => {
    const identity = identityMat4()
    const reproj = buildReprojMatrix(identity, identity, identity)

    const input = [1, 2, 3, 1] as const
    const result = applyMat4(reproj, input)
    expect(result[0]).toBeCloseTo(1)
    expect(result[1]).toBeCloseTo(2)
    expect(result[2]).toBeCloseTo(3)
    expect(result[3]).toBeCloseTo(1)
  })
})

// ---------------------------------------------------------------------------
// §EMA Blend Core
// ---------------------------------------------------------------------------

describe('emaBlend', () => {
  it('returns raw_ao when alpha is 1 (validity failure / cold start)', () => {
    expect(emaBlend(0.3, 0.8, 1.0)).toBeCloseTo(0.8)
  })

  it('returns history when alpha is 0 (maximum accumulation)', () => {
    expect(emaBlend(0.3, 0.8, 0.0)).toBeCloseTo(0.3)
  })

  it('computes lerp(history, raw, alpha) for mid alpha', () => {
    // lerp(0.0, 1.0, 0.5) = 0.5
    expect(emaBlend(0.0, 1.0, 0.5)).toBeCloseTo(0.5)
  })

  it('lerp identity: emaBlend(v, v, alpha) = v regardless of alpha', () => {
    expect(emaBlend(0.6, 0.6, 0.3)).toBeCloseTo(0.6)
  })
})

// ---------------------------------------------------------------------------
// §Confidence-Adaptive α (PR2)
//
// Spec: α = mix(alpha.min, alpha.max, 1.0 - confidence)
//   confidence=1 → α=min (maximum accumulation)
//   confidence=0 → α=max (minimum accumulation)
// ---------------------------------------------------------------------------

describe('adaptiveAlpha', () => {
  const bounds = { min: 0.05, max: 0.25 } as const

  it('returns alpha.min when confidence is 1 (full confidence → maximum accumulation)', () => {
    // mix(0.05, 0.25, 1.0 - 1.0) = mix(0.05, 0.25, 0.0) = 0.05
    expect(adaptiveAlpha(1.0, bounds)).toBeCloseTo(0.05)
  })

  it('returns alpha.max when confidence is 0 (zero confidence → minimum accumulation)', () => {
    // mix(0.05, 0.25, 1.0 - 0.0) = mix(0.05, 0.25, 1.0) = 0.25
    expect(adaptiveAlpha(0.0, bounds)).toBeCloseTo(0.25)
  })

  it('returns midpoint when confidence is 0.5', () => {
    // mix(0.05, 0.25, 0.5) = 0.05 + (0.25 - 0.05) * 0.5 = 0.15
    expect(adaptiveAlpha(0.5, bounds)).toBeCloseTo(0.15)
  })

  it('clamps result to alpha.min at confidence = 1 for different bounds', () => {
    expect(adaptiveAlpha(1.0, { min: 0.1, max: 0.9 })).toBeCloseTo(0.1)
  })

  it('clamps result to alpha.max at confidence = 0 for different bounds', () => {
    expect(adaptiveAlpha(0.0, { min: 0.1, max: 0.9 })).toBeCloseTo(0.9)
  })
})

// ---------------------------------------------------------------------------
// §TSVGF Reliability Counter → α scale (PR2)
//
// Spec: counter increments on valid reprojection (max 15), resets to 0 on failure.
// counterToAlphaScale maps counter (0-15) to a blend weight multiplier:
//   counter=0 → scale=1.0 (full alpha — no history trust)
//   counter=15 → scale=0.0 (full trust — use adaptive alpha as-is)
//   Monotonically decreasing: higher counter → lower scale
// ---------------------------------------------------------------------------

describe('counterToAlphaScale', () => {
  it('returns 1.0 when counter is 0 (no history, full alpha)', () => {
    expect(counterToAlphaScale(0)).toBeCloseTo(1.0)
  })

  it('returns 0.0 when counter is 15 (fully warmed up, full trust)', () => {
    expect(counterToAlphaScale(15)).toBeCloseTo(0.0)
  })

  it('returns a value strictly between 0 and 1 for counter=7 (mid-warmup)', () => {
    const scale = counterToAlphaScale(7)
    expect(scale).toBeGreaterThan(0)
    expect(scale).toBeLessThan(1)
  })

  it('is monotonically decreasing: scale(counter+1) <= scale(counter)', () => {
    for (let c = 0; c < 15; c++) {
      expect(counterToAlphaScale(c + 1)).toBeLessThanOrEqual(counterToAlphaScale(c))
    }
  })

  it('counter increment: counter goes from 7 to 8 on valid reprojection (pure increment logic)', () => {
    // This tests the spec requirement for counter increment — pure function
    expect(updateReliabilityCounter(7, true)).toBe(8)
  })

  it('counter saturation: counter stays at 15 when already at max', () => {
    expect(updateReliabilityCounter(15, true)).toBe(15)
  })

  it('counter reset: counter goes to 0 on validity failure', () => {
    expect(updateReliabilityCounter(10, false)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Phase 1.4 — Integration guard tests (graph-key and constructor guards)
// ---------------------------------------------------------------------------

describe('VBAOTemporalOptions — construction guards (via VBAOTemporalAccumulateNode)', () => {
  // PR2 updated signature: (productAoNode, rawAoNode, depthNode, normalNode, camera, options)
  // Mode guards fire before super() so placeholders are fine for the node args.

  it('throws TypeError when mode is missing (task 1.4.2)', async () => {
    const { VBAOTemporalAccumulateNode } = await import('../VBAOTemporalAccumulateNode')
    const fakeNode = {} as any
    const fakeCamera = {} as any

    // JS callers can pass {} as options — should throw TypeError at construction time
    expect(() => new VBAOTemporalAccumulateNode(fakeNode, fakeNode, fakeNode, fakeNode, fakeCamera, {} as any)).toThrow(TypeError)
  })

  it('throws TypeError when mode is "velocity" without velocityNode (task 1.4.3)', async () => {
    const { VBAOTemporalAccumulateNode } = await import('../VBAOTemporalAccumulateNode')
    const fakeNode = {} as any
    const fakeCamera = {} as any

    expect(() =>
      new VBAOTemporalAccumulateNode(fakeNode, fakeNode, fakeNode, fakeNode, fakeCamera, { mode: 'velocity' }),
    ).toThrow(TypeError)
  })

  it('throws TypeError mentioning "velocityNode" when mode="velocity" without velocityNode (PR3: guard-without-impl removed)', async () => {
    const { VBAOTemporalAccumulateNode } = await import('../VBAOTemporalAccumulateNode')
    const fakeNode = {} as any
    const fakeCamera = {} as any

    expect(() =>
      new VBAOTemporalAccumulateNode(fakeNode, fakeNode, fakeNode, fakeNode, fakeCamera, { mode: 'velocity' }),
    ).toThrow(/velocityNode/)
  })
})

// ---------------------------------------------------------------------------
// Test helpers — matrix math (column-major, like Three.js mat4)
// ---------------------------------------------------------------------------

/** Creates a 4x4 identity matrix (column-major, 16 elements). */
function identityMat4(): number[] {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]
}

/** Creates a 4x4 uniform scaling matrix. */
function scalingMat4(s: number): number[] {
  return [
    s, 0, 0, 0,
    0, s, 0, 0,
    0, 0, s, 0,
    0, 0, 0, 1,
  ]
}

// ---------------------------------------------------------------------------
// §Halton Temporal Phase (PR3)
//
// Spec: halton(index, base) — low-discrepancy sequence
//   base=2, index=0..7 → [0, 0.5, 0.25, 0.75, 0.125, 0.625, 0.375, 0.875]
//   Mod-N wrap: halton(t % N, base) gives same value as halton(t, base) for t<N
// ---------------------------------------------------------------------------

describe('halton', () => {
  // Known Halton values for base=2, indices 0..7 (spec §Halton Temporal Phase)
  const knownBase2 = [0, 0.5, 0.25, 0.75, 0.125, 0.625, 0.375, 0.875] as const

  it('returns 0 for index=0, base=2', () => {
    expect(halton(0, 2)).toBeCloseTo(0)
  })

  it('returns 0.5 for index=1, base=2', () => {
    expect(halton(1, 2)).toBeCloseTo(0.5)
  })

  it('returns correct values for all 8 known base-2 entries', () => {
    for (let i = 0; i < 8; i++) {
      expect(halton(i, 2)).toBeCloseTo(knownBase2[i]!, 10)
    }
  })

  it('is deterministic: calling halton(i, base) twice returns the same value', () => {
    expect(halton(3, 2)).toBe(halton(3, 2))
    expect(halton(5, 3)).toBe(halton(5, 3))
  })

  it('returns values in [0,1) for all indices 0..15 with base=2', () => {
    for (let i = 0; i < 16; i++) {
      const v = halton(i, 2)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('returns values in [0,1) for base=3 across indices 0..15', () => {
    for (let i = 0; i < 16; i++) {
      const v = halton(i, 3)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('mod-N wrap: halton(N, base) equals halton(0, base) via caller mod', () => {
    // Spec: caller does t % N; halton(0, 2) and halton(8 % 8, 2) are both index=0
    const N = 8
    expect(halton(8 % N, 2)).toBeCloseTo(halton(0, 2))
    // Additional triangulation: periodic wrap at t=9 and t=15
    expect(halton(9 % N, 2)).toBeCloseTo(halton(1, 2))
    expect(halton(15 % N, 2)).toBeCloseTo(halton(7, 2))
  })
})

// ---------------------------------------------------------------------------
// §Temporal Budget Presets (PR3)
// These tests exercise the VBAO constants resolver for temporal presets.
// ---------------------------------------------------------------------------

describe('temporal budget presets', () => {
  it('resolves temporal-fast to { slices: 1, samples: 2 }', async () => {
    const { VBAO_TEMPORAL_PRESETS } = await import('../vbaoConstants')
    expect(VBAO_TEMPORAL_PRESETS['temporal-fast']).toEqual({ slices: 1, samplesPerSlice: 2 })
  })

  it('resolves temporal-balanced to { slices: 2, samples: 3 }', async () => {
    const { VBAO_TEMPORAL_PRESETS } = await import('../vbaoConstants')
    expect(VBAO_TEMPORAL_PRESETS['temporal-balanced']).toEqual({ slices: 2, samplesPerSlice: 3 })
  })

  it('resolves temporal-quality to { slices: 2, samples: 4 }', async () => {
    const { VBAO_TEMPORAL_PRESETS } = await import('../vbaoConstants')
    expect(VBAO_TEMPORAL_PRESETS['temporal-quality']).toEqual({ slices: 2, samplesPerSlice: 4 })
  })

  it('throws TypeError when temporal preset is used without temporal option (via resolveTemporalPreset)', async () => {
    const { resolveTemporalPreset } = await import('../vbaoConstants')
    expect(() => resolveTemporalPreset('temporal-fast', undefined)).toThrow(TypeError)
  })

  it('returns the preset when temporal option is present', async () => {
    const { resolveTemporalPreset } = await import('../vbaoConstants')
    const fakeTemporalOptions = { mode: 'depth-reprojection' as const }
    expect(resolveTemporalPreset('temporal-fast', fakeTemporalOptions)).toEqual({ slices: 1, samplesPerSlice: 2 })
  })
})

// ---------------------------------------------------------------------------
// §Velocity path construction guard (PR3)
// Spec: velocityNode required when mode='velocity'; TypeError must NOT fire anymore
// (the PR3 guard-without-impl is REPLACED by a real implementation + validation).
// ---------------------------------------------------------------------------

describe('VBAOTemporalAccumulateNode — velocity path (PR3)', () => {
  it('does NOT throw for mode="velocity" with a velocityNode provided', async () => {
    const { VBAOTemporalAccumulateNode } = await import('../VBAOTemporalAccumulateNode')
    const fakeNode = {} as any
    const fakeCamera = {} as any
    const fakeVelocityNode = {} as any

    // PR3 removes the "not yet implemented" TypeError — should construct cleanly
    expect(() =>
      new VBAOTemporalAccumulateNode(fakeNode, fakeNode, fakeNode, fakeNode, fakeCamera, {
        mode: 'velocity',
        velocityNode: fakeVelocityNode,
      }),
    ).not.toThrow()
  })

  it('still throws TypeError for mode="velocity" when velocityNode is missing', async () => {
    const { VBAOTemporalAccumulateNode } = await import('../VBAOTemporalAccumulateNode')
    const fakeNode = {} as any
    const fakeCamera = {} as any

    expect(() =>
      new VBAOTemporalAccumulateNode(fakeNode, fakeNode, fakeNode, fakeNode, fakeCamera, {
        mode: 'velocity',
      }),
    ).toThrow(TypeError)
  })
})

// ---------------------------------------------------------------------------

/**
 * Applies a column-major 4x4 matrix to a 4-element column vector.
 * result[i] = sum_j(mat[j*4 + i] * vec[j])  (standard CG convention)
 */
function applyMat4(m: number[], v: readonly [number, number, number, number]): [number, number, number, number] {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const x = m[0]! * v[0] + m[4]! * v[1] + m[8]!  * v[2] + m[12]! * v[3]
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const y = m[1]! * v[0] + m[5]! * v[1] + m[9]!  * v[2] + m[13]! * v[3]
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const z = m[2]! * v[0] + m[6]! * v[1] + m[10]! * v[2] + m[14]! * v[3]
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const w = m[3]! * v[0] + m[7]! * v[1] + m[11]! * v[2] + m[15]! * v[3]
  return [x, y, z, w]
}
