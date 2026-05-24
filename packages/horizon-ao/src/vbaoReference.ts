/**
 * Scalar JavaScript reference for the VBAO kernel.
 *
 * Mirrors the TSL kernel byte-for-byte on:
 *   - sector indexing (θ ∈ [-π/2, π/2] → [0, 31]),
 *   - count-clamped maskRange (no `1 << 32` UB at any input),
 *   - mirrored slice marching (both sides of S_i),
 *   - cosine-weighted reduction (production) and popcount (reference ablation).
 *
 * This module has zero external runtime deps. It uses only the Math built-in
 * and the two constants from vbaoConstants (SECTOR_COUNT, VBAO_SECTOR_ANGLES).
 *
 * Role: parity oracle. Tests assert that the TSL kernel's rendered output
 * matches these functions on a set of fixed depth/normal configurations.
 * If this module disagrees with the TSL kernel, the kernel is wrong.
 *
 * Pinned by:
 *   - openspec/changes/vbao-pivot/design.md (slice frame, maskRange, reductions)
 *   - openspec/specs/vbao-node/spec.md (Given/When/Then scenarios)
 *
 * Citation: Therrien O., Levesque Y., Gilet G. *Screen Space Indirect Lighting
 * with Visibility Bitmask*. arXiv:2301.11376, 2023.
 */

import { SECTOR_COUNT, VBAO_SECTOR_ANGLES } from './vbaoConstants'

// ─── internal 3-D vector helpers ─────────────────────────────────────────────
// No external deps in the reference module — these are the only three needed.

type Vec3 = readonly [number, number, number]

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
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
  return len < 1e-10 ? [0, 0, 0] : [v[0] / len, v[1] / len, v[2] / len]
}

// ─── private constants (design.md §3) ────────────────────────────────────────

/** Lower bound of the sector angular range in radians. */
const THETA_MIN = -Math.PI / 2

/** Angular width of one sector: π / SECTOR_COUNT. */
const DELTA_THETA = Math.PI / SECTOR_COUNT

// ─── public functions ─────────────────────────────────────────────────────────

/**
 * Map a horizon angle θ ∈ [-π/2, π/2] to a sector index in [0, SECTOR_COUNT).
 *
 * Formula (design.md §3):
 *   sectorIndex(θ) = clamp(floor((θ − θ_min) / Δθ), 0, SECTOR_COUNT − 1)
 *
 * Angles outside [-π/2, π/2] are clamped to the nearest boundary sector.
 */
export function sectorIndex(theta: number): number {
  return Math.max(
    0,
    Math.min(SECTOR_COUNT - 1, Math.floor((theta - THETA_MIN) / DELTA_THETA)),
  )
}

/**
 * Build a sector mask covering the range [k0, k1Exclusive).
 *
 * Inputs may be any integers (negative, or > SECTOR_COUNT) — they are clamped
 * to [0, SECTOR_COUNT] before use so that out-of-domain angles correctly
 * contribute nothing.
 *
 * Equivalent WGSL formula (design.md §5):
 *   count = clamp(k1 − k0, 0, SECTOR_COUNT)
 *   count == 0          → 0u
 *   count >= SECTOR_COUNT → 0xFFFFFFFFu
 *   else                → ((1u << count) − 1u) << k0
 *
 * This implementation clamps k0/k1 individually first to prevent undefined
 * shift behaviour at k0 < 0 or k0+count > 32 (JS shifts by lower 5 bits).
 */
export function maskRange(k0: number, k1Exclusive: number): number {
  const lo = Math.max(0, Math.min(SECTOR_COUNT, k0))
  const hi = Math.max(0, Math.min(SECTOR_COUNT, k1Exclusive))
  const count = hi - lo // guaranteed ∈ [0, SECTOR_COUNT]

  if (count === 0) return 0
  if (count >= SECTOR_COUNT) return 0xffffffff

  // Set `count` bits starting at position `lo`.
  // (-1 >>> (32 - count)) gives a run of `count` ones in the low bits; <<lo
  // shifts them into position. >>> 0 normalises to unsigned for lo+count = 32.
  return ((-1 >>> (SECTOR_COUNT - count)) << lo) >>> 0
}

/**
 * Configuration for a single per-sample mask contribution.
 *
 * All vectors are in view space.
 */
export interface SampleMaskContribution {
  /** View-space position of the sampled surface point (depth-reconstructed). */
  readonly samplePosition: Vec3
  /** View-space position of the pixel being shaded. */
  readonly pixelPosition: Vec3
  /** View direction: V = normalize(−P). Points from surface toward camera. */
  readonly viewDir: Vec3
  /** Slice direction S_i in the basis plane perpendicular to V. NOT pre-mirrored. */
  readonly sliceDir: Vec3
  /** Thickness uniform (view-space units). Determines back-face horizon depth. */
  readonly thickness: number
}

/**
 * Compute the sector mask contribution from one depth sample.
 *
 * Per design.md §4 — MIRRORED SLICE MARCHING: the slice is marched on BOTH
 * sides (side ∈ {+1, −1}). Using S_side = side · S_i keeps atan2 in the
 * intended domain and prevents samples on the wrong side of the slice axis
 * from producing phantom wide-angle contributions.
 *
 * For each side, the mask covers sectors between the front-face and back-face
 * horizon angles. A narrow angular spread (thin occluder) produces a narrow
 * bit range; a wide spread (thick occluder) produces a wide range.
 *
 * @returns  u32-range number — the OR of both-side contributions.
 */
export function buildSampleMask(c: SampleMaskContribution): number {
  const { samplePosition: S, pixelPosition: P, viewDir: V, sliceDir, thickness } = c

  // Back-face position: recede the sample by `thickness` along the view direction.
  const backPos = sub3(S, scale3(V, thickness))

  let mask = 0

  for (let sideIdx = 0; sideIdx < 2; sideIdx++) {
    const side = sideIdx === 0 ? 1 : -1
    const S_side = scale3(sliceDir, side)

    // Delta vectors from pixel to front/back of occluder.
    const D_front = normalize3(sub3(S, P))
    const D_back = normalize3(sub3(backPos, P))

    // Horizon angles relative to S_side within the slice plane (design.md §4).
    // atan2(dot·V, dot·S_side): angle from S_side axis toward V (camera).
    const thetaFront = Math.atan2(dot3(D_front, V), dot3(D_front, S_side))
    const thetaBack = Math.atan2(dot3(D_back, V), dot3(D_back, S_side))

    // The sector range for this contribution.
    const t0 = Math.min(thetaFront, thetaBack)
    const t1 = Math.max(thetaFront, thetaBack)

    // floor/ceil for inclusive-start / exclusive-end discrete indexing.
    const k0 = Math.floor((t0 - THETA_MIN) / DELTA_THETA)
    const k1 = Math.ceil((t1 - THETA_MIN) / DELTA_THETA)

    // maskRange clamps k0/k1 to [0, SECTOR_COUNT], so angles outside
    // [-π/2, π/2] (wrong side of slice axis) contribute nothing.
    mask = (mask | maskRange(k0, k1)) >>> 0
  }

  return mask
}

/**
 * Popcount-only accessibility reduction. Reference ablation — NOT the
 * production formula.
 *
 *   A = 1 − countOneBits(mask) / SECTOR_COUNT
 *
 * Ships only in this reference module and the test suite. The TSL kernel uses
 * the cosine-weighted reduction exclusively.
 */
export function popcountReduction(mask: number): number {
  // Brian Kernighan's algorithm: repeatedly clear the lowest set bit.
  // O(set bits) — adequate for a reference with SECTOR_COUNT = 32.
  let m = mask >>> 0
  let bits = 0
  while (m !== 0) {
    m = (m & (m - 1)) >>> 0
    bits++
  }
  return 1 - bits / SECTOR_COUNT
}

/**
 * Cosine-weighted accessibility reduction. Production formula per design.md §6.1:
 *
 *   numerator   = Σ_k  (bit(mask, k) == 0) ? max(0, cos(θ_k − γ_norm)) : 0
 *   denominator = Σ_k  max(0, cos(θ_k − γ_norm))
 *   A           = numerator / max(denominator, ε)
 *
 * Open sectors (bit = 0) contribute their cosine weight to the numerator.
 * Closed (occluded) sectors do not. A flat facing surface (no occlusion)
 * returns 1.0 regardless of γ_norm.
 *
 * @param mask      Per-slice u32 visibility mask. 0 = fully open, 0xFFFFFFFF = fully blocked.
 * @param gammaNorm Projected surface-normal angle in the slice plane, clamped to [-π/2, π/2].
 *                  Compute as: clamp(atan2(dot(N,V), dot(N,S_i)), −π/2, π/2).
 */
export function cosineWeightedReduction(mask: number, gammaNorm: number): number {
  const m = mask >>> 0
  let numerator = 0
  let denominator = 0

  for (let k = 0; k < SECTOR_COUNT; k++) {
    // VBAO_SECTOR_ANGLES[k] = (k + 0.5) * Δθ + θ_min (compile-time constant, design.md §3).
    const w = Math.max(0, Math.cos(VBAO_SECTOR_ANGLES[k]! - gammaNorm))
    denominator += w
    // (m >>> k) & 1 == 0  →  sector k is OPEN
    if (((m >>> k) & 1) === 0) {
      numerator += w
    }
  }

  return numerator / Math.max(denominator, 1e-6)
}

// ─── sentinels for test introspection ────────────────────────────────────────

/**
 * Re-export the sector centre angles so tests can verify reduction formulas
 * without re-importing vbaoConstants directly.
 */
export const REFERENCE_SECTOR_ANGLES = VBAO_SECTOR_ANGLES

/**
 * Re-export SECTOR_COUNT for the same reason.
 */
export const REFERENCE_SECTOR_COUNT = SECTOR_COUNT
