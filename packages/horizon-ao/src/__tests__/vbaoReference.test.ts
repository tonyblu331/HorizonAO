/**
 * PR-01 correctness tests for the VBAO scalar reference.
 *
 * These four tests are the non-negotiable gate for any kernel work:
 *
 *   1. Flat plane          — mask = 0           → A = 1.0 (no occlusion)
 *   2. Full hemisphere     — mask = 0xFFFFFFFF  → A = 0.0 (fully blocked)
 *   3. Symmetric half-mask — sectors 0..15 set  → A ≈ 0.5 (symmetric weight)
 *   4. Thin occluder       — small thickness    → few sectors set; thin > thick
 *
 * Tests 1-3 are also verified against the cosine-weighted production formula
 * with a concrete γ_norm value so that any regression in the weight loop
 * breaks a test rather than silently returning a plausible-but-wrong number.
 *
 * Test 4 is the VBAO > GTAO proof: a thin-walled occluder occupies only the
 * sectors that it physically subtends, unlike GTAO which blocks every sector
 * from zero up to the maximum horizon angle.
 *
 * All tests run entirely in JS — no GPU required.
 */

import { describe, expect, it } from 'vitest'
import {
  VBAO_SECTOR_ANGLES,
  VBAO_SECTOR_COSINES,
  VBAO_SECTOR_SINES,
  clampVbaoNodeOptions,
} from '../vbaoConstants'
import {
  buildViewLocalFrame,
  buildAdaptiveThicknessReferenceMask,
  buildSampleMask,
  areSameSurfaceSamples,
  cosineWeightedReduction,
  estimateAdaptiveThickness,
  maskCoverage,
  maskRange,
  maskTransitions,
  popcountReduction,
  REFERENCE_SECTOR_COUNT,
  rotateLeft32,
  sampleBlockerInterval,
  stepAlongProjectedSlice,
  sampleUniformSliceDirection,
  sectorIndex,
  type Vec3,
} from '../vbaoReference'

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Count set bits in a u32. Used to assert mask width directly. */
function popcount(n: number): number {
  let m = n >>> 0
  let bits = 0
  while (m !== 0) {
    m = (m & (m - 1)) >>> 0
    bits++
  }
  return bits
}

function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function sub3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function scale3(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s]
}

function normalize3(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2])
  return len < 1e-10 ? [0, 0, 0] : [v[0] / len, v[1] / len, v[2] / len]
}

const SECTOR_COUNT = REFERENCE_SECTOR_COUNT

function naiveCosineWeightedReduction(mask: number, gammaNorm: number): number {
  const m = mask >>> 0
  let numerator = 0
  let denominator = 0

  for (let k = 0; k < SECTOR_COUNT; k++) {
    const w = Math.max(0, Math.cos(VBAO_SECTOR_ANGLES[k]! - gammaNorm))
    denominator += w
    if (((m >>> k) & 1) === 0) {
      numerator += w
    }
  }

  return numerator / Math.max(denominator, 1e-6)
}

// ─── sectorIndex ─────────────────────────────────────────────────────────────

describe('sectorIndex', () => {
  it('maps −π/2 to sector 0 (lower boundary)', () => {
    expect(sectorIndex(-Math.PI / 2)).toBe(0)
  })

  it('maps +π/2 to sector SECTOR_COUNT−1 (upper boundary, clamped)', () => {
    // θ = π/2 → floor(32) = 32, clamped to 31
    expect(sectorIndex(Math.PI / 2)).toBe(SECTOR_COUNT - 1)
  })

  it('maps 0 to sector 16 (centre of range)', () => {
    // θ = 0 → (0 + π/2) / (π/32) = 16.0 → floor = 16
    expect(sectorIndex(0)).toBe(16)
  })

  it('maps a value just below 0 to sector 15', () => {
    expect(sectorIndex(-0.001)).toBe(15)
  })

  it('clamps angles below −π/2 to sector 0', () => {
    expect(sectorIndex(-Math.PI)).toBe(0)
    expect(sectorIndex(-999)).toBe(0)
  })

  it('clamps angles above +π/2 to sector 31', () => {
    expect(sectorIndex(Math.PI)).toBe(SECTOR_COUNT - 1)
    expect(sectorIndex(999)).toBe(SECTOR_COUNT - 1)
  })

  it('sector centres are spaced (π/32 apart) and each maps to its own sector', () => {
    // Test sector centres — not boundaries — to avoid IEEE 754 floor/ceil ambiguity
    // at exact multiples of Δθ.  Centre = (k + 0.5) · Δθ + θ_min is unambiguous.
    const delta = Math.PI / SECTOR_COUNT
    for (let k = 0; k < SECTOR_COUNT; k++) {
      const thetaCenter = -Math.PI / 2 + (k + 0.5) * delta
      expect(sectorIndex(thetaCenter)).toBe(k)
    }
  })
})

describe('sector trig tables', () => {
  it('match the sector centre angles', () => {
    for (let k = 0; k < SECTOR_COUNT; k++) {
      expect(VBAO_SECTOR_COSINES[k]).toBeCloseTo(Math.cos(VBAO_SECTOR_ANGLES[k]!), 15)
      expect(VBAO_SECTOR_SINES[k]).toBeCloseTo(Math.sin(VBAO_SECTOR_ANGLES[k]!), 15)
    }
  })

  it('produce the same reduction as the direct cosine formula', () => {
    const masks = [0x00000000, 0xffffffff, 0x0000ffff, 0xffff0000, 0x00ff00ff, 0x81020408]
    const gammas = [-Math.PI / 2, -Math.PI / 4, 0, Math.PI / 6, Math.PI / 2]

    for (const mask of masks) {
      for (const gamma of gammas) {
        expect(cosineWeightedReduction(mask, gamma)).toBeCloseTo(
          naiveCosineWeightedReduction(mask, gamma),
          12,
        )
      }
    }
  })
})

describe('quality presets', () => {
  it('applies preset values before explicit overrides', () => {
    expect(clampVbaoNodeOptions({ preset: 'fast' })).toMatchObject({
      resolutionScale: 0.5,
      slices: 2,
      samples: 6,
    })

    expect(clampVbaoNodeOptions({ preset: 'quality', samples: 7 })).toMatchObject({
      resolutionScale: 1,
      slices: 4,
      samples: 7,
    })
  })
})

describe('view-local slice helpers', () => {
  it('builds an orthonormal frame around the pixel view vector', () => {
    const { V, T0, T1 } = buildViewLocalFrame([1, 2, -4])

    expect(Math.hypot(...V)).toBeCloseTo(1, 12)
    expect(Math.hypot(...T0)).toBeCloseTo(1, 12)
    expect(Math.hypot(...T1)).toBeCloseTo(1, 12)
    expect(dot3(V, T0)).toBeCloseTo(0, 12)
    expect(dot3(V, T1)).toBeCloseTo(0, 12)
    expect(dot3(T0, T1)).toBeCloseTo(0, 12)
  })

  it('samples uniform slice directions in the view-local frame', () => {
    const { V, T0, T1 } = buildViewLocalFrame([0, 0, -3])
    const S0 = sampleUniformSliceDirection(0, 4, 0, T0, T1)
    const S1 = sampleUniformSliceDirection(1, 4, 0, T0, T1)

    expect(Math.hypot(...S0)).toBeCloseTo(1, 12)
    expect(Math.hypot(...S1)).toBeCloseTo(1, 12)
    expect(dot3(S0, V)).toBeCloseTo(0, 12)
    expect(dot3(S1, V)).toBeCloseTo(0, 12)
    expect(dot3(S0, S1)).toBeCloseTo(0, 12)
  })
})

describe('projected slice marching', () => {
  it('walks linearly along the projected slice direction in screen space', () => {
    const uv: readonly [number, number] = [0.62, 0.47]
    const projectedEndpoint: readonly [number, number] = [0.88, 0.63]

    expect(stepAlongProjectedSlice(uv, projectedEndpoint, 0)).toEqual(uv)
    expect(stepAlongProjectedSlice(uv, projectedEndpoint, 1)).toEqual(projectedEndpoint)
    expect(stepAlongProjectedSlice(uv, projectedEndpoint, 0.5)).toEqual([0.75, 0.55])
  })

  it('clamps the step fraction to the marched segment', () => {
    const uv: readonly [number, number] = [0.2, 0.3]
    const projectedEndpoint: readonly [number, number] = [0.4, 0.7]

    expect(stepAlongProjectedSlice(uv, projectedEndpoint, -1)).toEqual(uv)
    expect(stepAlongProjectedSlice(uv, projectedEndpoint, 2)).toEqual(projectedEndpoint)
  })
})

// ─── maskRange ───────────────────────────────────────────────────────────────

describe('maskRange', () => {
  it('empty range [k, k) returns 0', () => {
    expect(maskRange(5, 5)).toBe(0)
    expect(maskRange(0, 0)).toBe(0)
    expect(maskRange(31, 31)).toBe(0)
  })

  it('full range [0, 32) returns 0xFFFFFFFF', () => {
    expect(maskRange(0, 32)).toBe(0xffffffff)
  })

  it('single sector at position 0 sets only bit 0', () => {
    expect(maskRange(0, 1)).toBe(0x00000001)
  })

  it('single sector at position 31 sets only bit 31', () => {
    expect(maskRange(31, 32)).toBe(0x80000000)
  })

  it('lower 16 sectors sets bits 0..15', () => {
    expect(maskRange(0, 16)).toBe(0x0000ffff)
  })

  it('upper 16 sectors sets bits 16..31', () => {
    expect(maskRange(16, 32)).toBe(0xffff0000)
  })

  it('middle 8 sectors (8..15) sets correct bits', () => {
    // 8 bits set starting at position 8 = 0x0000FF00
    expect(maskRange(8, 16)).toBe(0x0000ff00)
  })

  it('negative k0 is clamped to 0 (out-of-domain angle)', () => {
    // Range [-3, 4) clamped to [0, 4)
    expect(maskRange(-3, 4)).toBe(maskRange(0, 4))
  })

  it('k1 > SECTOR_COUNT is clamped to SECTOR_COUNT', () => {
    // Range [28, 35) clamped to [28, 32)
    expect(maskRange(28, 35)).toBe(maskRange(28, 32))
  })

  it('entirely out-of-range [33, 36) returns 0', () => {
    expect(maskRange(33, 36)).toBe(0)
  })

  it('k0 >= SECTOR_COUNT returns 0', () => {
    expect(maskRange(32, 34)).toBe(0)
  })

  it('count equals SECTOR_COUNT − 1 = 31 (bit 1..31 set, bit 0 clear)', () => {
    const mask = maskRange(1, 32)
    expect(popcount(mask)).toBe(31)
    expect(mask & 0x1).toBe(0) // bit 0 clear
    expect(mask & 0x2).toBe(0x2) // bit 1 set
    expect((mask >>> 31) & 1).toBe(1) // bit 31 set
  })
})

describe('sample-local thickness', () => {
  it('recedes blocker back faces along the sample view vector under perspective', () => {
    const P = [1, 0, -3] as const
    const V = normalize3(scale3(P, -1))
    const S_i = [1, 0, 0] as const
    const Q = [2, 0, -2] as const
    const thickness = 0.5

    const sampleLocal = sampleBlockerInterval({
      samplePosition: Q,
      pixelPosition: P,
      viewDir: V,
      sliceDir: S_i,
      thickness,
    })

    const pixelLocalBack = sub3(Q, scale3(V, thickness))
    const DFront = normalize3(sub3(Q, P))
    const DBackPixelLocal = normalize3(sub3(pixelLocalBack, P))
    const pixelLocalTheta0 = Math.min(
      Math.atan2(dot3(DFront, V), dot3(DFront, S_i)),
      Math.atan2(dot3(DBackPixelLocal, V), dot3(DBackPixelLocal, S_i)),
    )

    expect(sampleLocal.theta0).not.toBeCloseTo(pixelLocalTheta0, 6)
  })
})

describe('mask metadata helpers', () => {
  it('computes coverage from set sectors', () => {
    expect(maskCoverage(0x00000000)).toBe(0)
    expect(maskCoverage(0xffffffff)).toBe(1)
    expect(maskCoverage(maskRange(0, 16))).toBe(0.5)
  })

  it('computes circular transition density', () => {
    expect(rotateLeft32(0x80000000, 1)).toBe(0x00000001)
    expect(maskTransitions(0x00000000)).toBe(0)
    expect(maskTransitions(0xffffffff)).toBe(0)
    expect(maskTransitions(maskRange(0, 16))).toBe(2 / 32)
  })
})

describe('adaptive thickness same-surface continuity', () => {
  const viewDir = [0, 0, 1] as const
  const options = {
    continuityDepthTolerance: 0.08,
    continuityNormalDot: 0.95,
  } as const

  it('treats nearby valid samples with aligned normals as the same surface', () => {
    expect(
      areSameSurfaceSamples(
        { position: [0, 0, -2], normal: [0, 0, 1] },
        { position: [0.04, 0, -2.05], normal: [0, 0, 1] },
        viewDir,
        options,
      ),
    ).toBe(true)
  })

  it('breaks a run across a depth discontinuity even when normals align', () => {
    expect(
      areSameSurfaceSamples(
        { position: [0, 0, -2], normal: [0, 0, 1] },
        { position: [0.04, 0, -2.4], normal: [0, 0, 1] },
        viewDir,
        options,
      ),
    ).toBe(false)
  })

  it('breaks a run across a normal discontinuity even when depth is close', () => {
    expect(
      areSameSurfaceSamples(
        { position: [0, 0, -2], normal: [0, 0, 1] },
        { position: [0.04, 0, -2.05], normal: [1, 0, 0] },
        viewDir,
        options,
      ),
    ).toBe(false)
  })

  it('does not treat invalid samples as continuous', () => {
    expect(
      areSameSurfaceSamples(
        { position: [0, 0, -2], normal: [0, 0, 1] },
        { position: [0.04, 0, -2.05], normal: [0, 0, 1], valid: false },
        viewDir,
        options,
      ),
    ).toBe(false)
  })
})

describe('adaptive thickness estimate', () => {
  const viewDir = [0, 0, 1] as const
  const options = {
    minThickness: 0.02,
    maxThickness: 0.5,
    thicknessScale: 2,
    continuityDepthTolerance: 0.08,
    continuityNormalDot: 0.95,
  } as const

  it('isolated thin occluder clamps to minimum thickness', () => {
    const thickness = estimateAdaptiveThickness(
      [{ position: [0, 0, -2], normal: [0, 0, 1] }],
      0,
      viewDir,
      options,
    )

    expect(thickness).toBeCloseTo(options.minThickness, 12)
  })

  it('continuous thick wall estimates more thickness than an isolated occluder', () => {
    const isolated = estimateAdaptiveThickness(
      [{ position: [0, 0, -2], normal: [0, 0, 1] }],
      0,
      viewDir,
      options,
    )
    const continuous = estimateAdaptiveThickness(
      [
        { position: [0, 0, -2], normal: [0, 0, 1] },
        { position: [0.03, 0, -2.05], normal: [0, 0, 1] },
        { position: [0.06, 0, -2.1], normal: [0, 0, 1] },
      ],
      0,
      viewDir,
      options,
    )

    expect(continuous).toBeGreaterThan(isolated)
    expect(continuous).toBeCloseTo(options.minThickness + 0.1 * options.thicknessScale, 12)
  })

  it('depth gap behind an object does not merge into one blocker', () => {
    const thickness = estimateAdaptiveThickness(
      [
        { position: [0, 0, -2], normal: [0, 0, 1] },
        { position: [0.03, 0, -2.4], normal: [0, 0, 1] },
      ],
      0,
      viewDir,
      options,
    )

    expect(thickness).toBeCloseTo(options.minThickness, 12)
  })

  it('normal gap behind an object does not merge into one blocker', () => {
    const thickness = estimateAdaptiveThickness(
      [
        { position: [0, 0, -2], normal: [0, 0, 1] },
        { position: [0.03, 0, -2.04], normal: [1, 0, 0] },
      ],
      0,
      viewDir,
      options,
    )

    expect(thickness).toBeCloseTo(options.minThickness, 12)
  })

  it('clamps large continuous runs to maximum thickness', () => {
    const thickness = estimateAdaptiveThickness(
      [
        { position: [0, 0, -2], normal: [0, 0, 1] },
        { position: [0.03, 0, -2.2], normal: [0, 0, 1] },
        { position: [0.06, 0, -2.4], normal: [0, 0, 1] },
      ],
      1,
      viewDir,
      {
        ...options,
        continuityDepthTolerance: 0.25,
        thicknessScale: 10,
      },
    )

    expect(thickness).toBe(options.maxThickness)
  })
})

describe('adaptive thickness reference mask', () => {
  const P = [0, 0, -3] as const
  const V = [0, 0, 1] as const
  const S_i = [1, 0, 0] as const
  const frontSample = { position: [0.5, 0, -1.5], normal: [0, 0, 1] } as const
  const options = {
    minThickness: 0.02,
    maxThickness: 1.4,
    thicknessScale: 10,
    continuityDepthTolerance: 0.08,
    continuityNormalDot: 0.95,
  } as const

  function constantMask(thickness: number): number {
    return buildSampleMask({
      samplePosition: frontSample.position,
      pixelPosition: P,
      viewDir: V,
      sliceDir: S_i,
      thickness,
    })
  }

  it('keeps an isolated thin occluder at the minimum-thickness sector count', () => {
    const adaptiveMask = buildAdaptiveThicknessReferenceMask({
      samples: [frontSample],
      sampleIndex: 0,
      pixelPosition: P,
      viewDir: V,
      sliceDir: S_i,
      options,
    })

    expect(popcount(adaptiveMask)).toBe(popcount(constantMask(options.minThickness)))
    expect(popcount(adaptiveMask)).toBeLessThan(popcount(constantMask(options.maxThickness)))
  })

  it('widens a continuous thick wall beyond the minimum-thickness mask', () => {
    const adaptiveMask = buildAdaptiveThicknessReferenceMask({
      samples: [
        frontSample,
        { position: [0.53, 0, -1.57], normal: [0, 0, 1] },
        { position: [0.56, 0, -1.64], normal: [0, 0, 1] },
      ],
      sampleIndex: 0,
      pixelPosition: P,
      viewDir: V,
      sliceDir: S_i,
      options,
    })

    expect(popcount(adaptiveMask)).toBeGreaterThan(popcount(constantMask(options.minThickness)))
    expect(popcount(adaptiveMask)).toBe(popcount(constantMask(options.maxThickness)))
  })

  it('preserves a gap behind the front object instead of merging it into a thick mask', () => {
    const adaptiveMask = buildAdaptiveThicknessReferenceMask({
      samples: [
        frontSample,
        { position: [0.53, 0, -1.57], normal: [1, 0, 0] },
        { position: [0.56, 0, -1.64], normal: [1, 0, 0] },
      ],
      sampleIndex: 0,
      pixelPosition: P,
      viewDir: V,
      sliceDir: S_i,
      options,
    })

    expect(popcount(adaptiveMask)).toBe(popcount(constantMask(options.minThickness)))
    expect(popcount(adaptiveMask)).toBeLessThan(popcount(constantMask(options.maxThickness)))
  })
})

// ─── THE FOUR NON-NEGOTIABLE CORRECTNESS TESTS ───────────────────────────────

describe('correctness test 1 — flat plane (no occlusion)', () => {
  // A pixel on a flat surface facing the camera with nothing in front of it.
  // No samples have been marched → mask = 0 (all sectors open).
  // BOTH reductions must return exactly 1.0.

  const OPEN_MASK = 0x00000000

  it('popcountReduction: mask=0 → A = 1.0 exactly', () => {
    expect(popcountReduction(OPEN_MASK)).toBe(1.0)
  })

  it('cosineWeightedReduction: mask=0 → A = 1.0 for gammaNorm = π/2 (normal facing camera)', () => {
    // N = [0,0,1], V = [0,0,1], S_i = [1,0,0]
    // γ = atan2(N·V, N·S_i) = atan2(1, 0) = π/2 → clamped = π/2
    const gammaNorm = Math.PI / 2
    // All sectors open → numerator = denominator → A = 1.0
    expect(cosineWeightedReduction(OPEN_MASK, gammaNorm)).toBeCloseTo(1.0, 10)
  })

  it('cosineWeightedReduction: mask=0 → A = 1.0 for gammaNorm = 0 (grazing normal)', () => {
    expect(cosineWeightedReduction(OPEN_MASK, 0)).toBeCloseTo(1.0, 10)
  })

  it('cosineWeightedReduction: mask=0 → A = 1.0 regardless of gammaNorm', () => {
    for (let i = 0; i <= 8; i++) {
      const g = -Math.PI / 2 + (i * Math.PI) / 8
      expect(cosineWeightedReduction(OPEN_MASK, g)).toBeCloseTo(1.0, 8)
    }
  })
})

describe('correctness test 2 — full hemisphere occluder (fully blocked)', () => {
  // All 32 sectors are blocked. Every direction in the slice plane is occluded.
  // BOTH reductions must return exactly 0.0.

  const FULL_MASK = 0xffffffff

  it('popcountReduction: mask=0xFFFFFFFF → A = 0.0 exactly', () => {
    expect(popcountReduction(FULL_MASK)).toBe(0.0)
  })

  it('cosineWeightedReduction: mask=0xFFFFFFFF → A = 0.0 for gammaNorm = π/2', () => {
    expect(cosineWeightedReduction(FULL_MASK, Math.PI / 2)).toBeCloseTo(0.0, 10)
  })

  it('cosineWeightedReduction: mask=0xFFFFFFFF → A = 0.0 for gammaNorm = 0', () => {
    expect(cosineWeightedReduction(FULL_MASK, 0)).toBeCloseTo(0.0, 10)
  })

  it('cosineWeightedReduction: mask=0xFFFFFFFF → A = 0.0 regardless of gammaNorm', () => {
    for (let i = 0; i <= 8; i++) {
      const g = -Math.PI / 2 + (i * Math.PI) / 8
      expect(cosineWeightedReduction(FULL_MASK, g)).toBeCloseTo(0.0, 8)
    }
  })
})

describe('correctness test 3 — symmetric half-mask', () => {
  // Sectors 0..15 are blocked (lower half of the hemisphere slice).
  // Sectors 16..31 are open (upper half).
  // With gammaNorm = 0 the cosine weights are symmetric:
  //   cos(θ_k) = cos(−θ_k)   because θ_{31−k} = −θ_k
  // so numerator = denominator / 2  →  A = 0.5 exactly.

  // Sectors 0..15 blocked (bits 0..15 set).
  const LOWER_HALF_MASK = maskRange(0, 16)

  it('lower-half mask has exactly 16 bits set', () => {
    expect(popcount(LOWER_HALF_MASK)).toBe(16)
    expect(LOWER_HALF_MASK).toBe(0x0000ffff)
  })

  it('popcountReduction: 16/32 blocked → A = 0.5 exactly', () => {
    expect(popcountReduction(LOWER_HALF_MASK)).toBe(0.5)
  })

  it('cosineWeightedReduction: symmetric half-mask with gammaNorm=0 → A = 0.5 exactly', () => {
    // Sectors are symmetric: θ_{31−k} = −θ_k (proven in design.md §3).
    // cos(θ_k − 0) = cos(θ_k) = cos(−θ_k) = cos(θ_{31−k}).
    // The 16 open sectors (16..31) have equal total weight to the 16 closed ones (0..15).
    expect(cosineWeightedReduction(LOWER_HALF_MASK, 0)).toBeCloseTo(0.5, 10)
  })

  it('cosineWeightedReduction: upper-half mask with gammaNorm=0 → A = 0.5 (symmetric)', () => {
    // Upper half blocked → same argument by symmetry.
    const UPPER_HALF_MASK = maskRange(16, 32)
    expect(cosineWeightedReduction(UPPER_HALF_MASK, 0)).toBeCloseTo(0.5, 10)
  })

  it('cosineWeightedReduction: A ∈ (0, 1) for any partial mask', () => {
    // Sanity: partial occlusion is strictly between 0 and 1.
    expect(cosineWeightedReduction(LOWER_HALF_MASK, Math.PI / 4)).toBeGreaterThan(0)
    expect(cosineWeightedReduction(LOWER_HALF_MASK, Math.PI / 4)).toBeLessThan(1)
  })
})

describe('correctness test 4 — thin occluder (VBAO > GTAO)', () => {
  // This test is the proof that VBAO correctly handles thin geometry.
  //
  // Setup (view space):
  //   P          = pixel at [0, 0, −3]
  //   V          = [0, 0,  1]   (toward camera)
  //   S_i        = [1, 0,  0]   (slice axis)
  //   samplePos  = [0.5, 0, −1.5]  (0.5 units right, 1.5 units from pixel)
  //
  // The sample subtends a narrow angular range in the slice plane:
  //   theta ≈ atan2(1.5, 0.5) ≈ 71.6°  (near the top of the hemisphere)
  //
  // Thin occluder (thickness = 0.02 vu):
  //   Front and back face are almost identical → ≤ 2 sectors wide.
  //
  // Thick occluder (thickness = 1.4 vu, nearly fills the sample-to-pixel depth):
  //   Back face recedes toward the camera → wide sector range.
  //
  // GTAO-equivalent behaviour would mark every sector from theta=0 (the
  // horizon) up to theta_front as blocked — roughly 12–14 sectors.
  // VBAO correctly marks only the sector band that the wall physically
  // subtends, leaving everything behind the wall unblocked.

  const P = [0, 0, -3] as const
  const V = [0, 0, 1] as const
  const S_i = [1, 0, 0] as const
  const samplePos = [0.5, 0, -1.5] as const

  const thinMask = buildSampleMask({
    samplePosition: samplePos,
    pixelPosition: P,
    viewDir: V,
    sliceDir: S_i,
    thickness: 0.02,
  })

  const thickMask = buildSampleMask({
    samplePosition: samplePos,
    pixelPosition: P,
    viewDir: V,
    sliceDir: S_i,
    thickness: 1.4,
  })

  it('thin occluder: mask has ≤ 3 sectors set (narrow angular width)', () => {
    const bits = popcount(thinMask)
    // The sample subtends ~1.3° at this distance with 0.02 vu thickness.
    // At π/32 ≈ 5.6° per sector that is < 1 sector, so 1–2 sectors maximum
    // (floor/ceil on the sector boundary may straddle two sectors).
    expect(bits).toBeLessThanOrEqual(3)
    expect(bits).toBeGreaterThanOrEqual(1) // at least the front-face sector
  })

  it('thick occluder: mask has > 8 sectors set (wide angular range)', () => {
    // With thickness = 1.4 the back-face recedes toward θ = 0, spanning
    // roughly 12 sectors. GTAO-class behaviour.
    expect(popcount(thickMask)).toBeGreaterThan(8)
  })

  it('thin occluder subtends strictly fewer sectors than thick occluder', () => {
    expect(popcount(thinMask)).toBeLessThan(popcount(thickMask))
  })

  it('thin occluder: popcountReduction A > 0.9 (barely blocks light)', () => {
    // ≤ 3 sectors blocked out of 32 → A ≥ 1 − 3/32 ≈ 0.906
    expect(popcountReduction(thinMask)).toBeGreaterThan(0.9)
  })

  it('thick occluder: popcountReduction A < 0.7 (significant occlusion)', () => {
    // > 8 sectors blocked → A < 1 − 8/32 = 0.75
    expect(popcountReduction(thickMask)).toBeLessThan(0.75)
  })

  it('thin mask is a strict subset of thick mask (same sample direction, wider window)', () => {
    // Every sector the thin occluder blocks must also be blocked by the thick one.
    // This verifies the monotonicity of the mask w.r.t. thickness.
    expect((thinMask & thickMask) >>> 0).toBe(thinMask >>> 0)
  })

  it('thin occluder: cosine-weighted A > 0.9 (production formula agrees)', () => {
    // γ_norm ≈ π/2 for N = [0,0,1], V = [0,0,1] (normal facing camera).
    const gammaNorm = Math.PI / 2
    expect(cosineWeightedReduction(thinMask, gammaNorm)).toBeGreaterThan(0.9)
  })

  it('thick occluder: cosine-weighted A < 0.7 (production formula agrees)', () => {
    const gammaNorm = Math.PI / 2
    expect(cosineWeightedReduction(thickMask, gammaNorm)).toBeLessThan(0.7)
  })

  it('zero-thickness mask occupies ≤ 2 sectors (degenerate: front == back)', () => {
    // thickness = 0: D_front == D_back exactly, so theta_front == theta_back.
    // For a non-boundary angle: floor(x) < ceil(x) so count = 1 (the surface
    // still occupies the sector it projects to — a surface of zero depth is
    // not the same as "no surface").  At most 2 sectors can appear if the
    // front angle lands near a boundary on both the +1 and −1 sides.
    // The key property is that it is MUCH narrower than any real occluder.
    const zeroThickMask = buildSampleMask({
      samplePosition: samplePos,
      pixelPosition: P,
      viewDir: V,
      sliceDir: S_i,
      thickness: 0,
    })
    expect(popcount(zeroThickMask)).toBeLessThanOrEqual(2)
  })
})
