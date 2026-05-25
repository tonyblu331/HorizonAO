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
 * and constants from vbaoConstants.
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

import {
  SECTOR_COUNT,
  VBAO_SECTOR_ANGLES,
  VBAO_SECTOR_COSINES,
  VBAO_SECTOR_SINES,
  VBAO_THETA_MIN,
  VBAO_THETA_STEP,
} from './vbaoConstants'

// ─── internal 3-D vector helpers ─────────────────────────────────────────────
// No external deps in the reference module — these are the only three needed.

export type Vec3 = readonly [number, number, number]

function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function sub3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function scale3(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s]
}

function add3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

function cross3(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

function normalize3(v: Vec3): Vec3 {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
  return len < 1e-10 ? [0, 0, 0] : [v[0] / len, v[1] / len, v[2] / len]
}

const TAU = Math.PI * 2

// ─── public functions ─────────────────────────────────────────────────────────

export function anyPerpendicular(v: Vec3): Vec3 {
  const axis: Vec3 = Math.abs(v[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]
  return normalize3(cross3(v, axis))
}

export function buildViewLocalFrame(pixelPosition: Vec3): {
  readonly V: Vec3
  readonly T0: Vec3
  readonly T1: Vec3
} {
  const V = normalize3(scale3(pixelPosition, -1))
  const T0 = anyPerpendicular(V)
  const T1 = normalize3(cross3(V, T0))

  return { V, T0, T1 }
}

export function sampleUniformSliceDirection(
  sliceIndex: number,
  sliceCount: number,
  rotation: number,
  T0: Vec3,
  T1: Vec3,
): Vec3 {
  const phi = (TAU * (sliceIndex + rotation)) / sliceCount
  return normalize3(add3(scale3(T0, Math.cos(phi)), scale3(T1, Math.sin(phi))))
}

export type Vec2 = readonly [number, number]

/**
 * Step along a slice direction after it has been projected to screen space.
 *
 * GT-VBAO's perspective correction samples along the image-plane projection of
 * the slice, then reconstructs each sampled depth. Reprojecting a fresh
 * `P + S * radius * t` point per step bends the path for off-axis pixels.
 */
export function stepAlongProjectedSlice(uv: Vec2, projectedEndpoint: Vec2, t: number): Vec2 {
  const u = Math.max(0, Math.min(1, t))
  return [
    uv[0] + (projectedEndpoint[0] - uv[0]) * u,
    uv[1] + (projectedEndpoint[1] - uv[1]) * u,
  ]
}

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
    Math.min(SECTOR_COUNT - 1, Math.floor((theta - VBAO_THETA_MIN) / VBAO_THETA_STEP)),
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

export interface AdaptiveThicknessSample {
  readonly position: Vec3
  readonly normal?: Vec3
  readonly valid?: boolean
}

export interface AdaptiveThicknessContinuityOptions {
  readonly continuityDepthTolerance: number
  readonly continuityNormalDot: number
}

export interface AdaptiveThicknessOptions extends AdaptiveThicknessContinuityOptions {
  readonly minThickness: number
  readonly maxThickness: number
  readonly thicknessScale: number
}

export function areSameSurfaceSamples(
  a: AdaptiveThicknessSample,
  b: AdaptiveThicknessSample,
  viewDir: Vec3,
  options: AdaptiveThicknessContinuityOptions,
): boolean {
  if (a.valid === false || b.valid === false) {
    return false
  }

  const depthDelta = Math.abs(dot3(sub3(b.position, a.position), normalize3(viewDir)))
  if (depthDelta > options.continuityDepthTolerance) {
    return false
  }

  if (a.normal !== undefined && b.normal !== undefined) {
    return dot3(normalize3(a.normal), normalize3(b.normal)) >= options.continuityNormalDot
  }

  return true
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function depthAlongView(sample: AdaptiveThicknessSample, viewDir: Vec3): number {
  return dot3(sample.position, normalize3(viewDir))
}

export function estimateAdaptiveThickness(
  samples: readonly AdaptiveThicknessSample[],
  sampleIndex: number,
  viewDir: Vec3,
  options: AdaptiveThicknessOptions,
): number {
  const clampedMin = Math.min(options.minThickness, options.maxThickness)
  const clampedMax = Math.max(options.minThickness, options.maxThickness)
  const center = samples[sampleIndex]

  if (center === undefined || center.valid === false) {
    return clampedMin
  }

  const V = normalize3(viewDir)
  let first = sampleIndex
  let last = sampleIndex

  while (first > 0 && areSameSurfaceSamples(samples[first - 1]!, samples[first]!, V, options)) {
    first--
  }

  while (
    last < samples.length - 1 &&
    areSameSurfaceSamples(samples[last]!, samples[last + 1]!, V, options)
  ) {
    last++
  }

  let minDepth = Number.POSITIVE_INFINITY
  let maxDepth = Number.NEGATIVE_INFINITY
  for (let i = first; i <= last; i++) {
    const sample = samples[i]!
    const depth = depthAlongView(sample, V)
    minDepth = Math.min(minDepth, depth)
    maxDepth = Math.max(maxDepth, depth)
  }

  const span = maxDepth - minDepth
  return clampNumber(clampedMin + span * options.thicknessScale, clampedMin, clampedMax)
}

export interface AdaptiveThicknessReferenceMaskContribution {
  readonly samples: readonly AdaptiveThicknessSample[]
  readonly sampleIndex: number
  readonly pixelPosition: Vec3
  readonly viewDir: Vec3
  readonly sliceDir: Vec3
  readonly options: AdaptiveThicknessOptions
}

export function buildAdaptiveThicknessReferenceMask(
  c: AdaptiveThicknessReferenceMaskContribution,
): number {
  const sample = c.samples[c.sampleIndex]
  if (sample === undefined || sample.valid === false) {
    return 0
  }

  const thickness = estimateAdaptiveThickness(c.samples, c.sampleIndex, c.viewDir, c.options)

  return buildSampleMask({
    samplePosition: sample.position,
    pixelPosition: c.pixelPosition,
    viewDir: c.viewDir,
    sliceDir: c.sliceDir,
    thickness,
  })
}

export function sampleBlockerInterval(c: SampleMaskContribution): {
  readonly theta0: number
  readonly theta1: number
} {
  const { samplePosition: S, pixelPosition: P, viewDir: V, sliceDir, thickness } = c

  // Perspective-correct GT-VBAO thickness: the back face recedes along the
  // sampled point's own view vector, not the shaded pixel's view vector.
  const sampleViewDir = normalize3(scale3(S, -1))
  const backPos = sub3(S, scale3(sampleViewDir, thickness))

  const D_front = normalize3(sub3(S, P))
  const D_back = normalize3(sub3(backPos, P))

  const thetaFront = Math.atan2(dot3(D_front, V), dot3(D_front, sliceDir))
  const thetaBack = Math.atan2(dot3(D_back, V), dot3(D_back, sliceDir))

  return {
    theta0: Math.min(thetaFront, thetaBack),
    theta1: Math.max(thetaFront, thetaBack),
  }
}

export function accumulateSampleMask(mask: number, theta0: number, theta1: number): number {
  const k0 = Math.floor((theta0 - VBAO_THETA_MIN) / VBAO_THETA_STEP)
  const k1 = Math.ceil((theta1 - VBAO_THETA_MIN) / VBAO_THETA_STEP)

  return (mask | maskRange(k0, k1)) >>> 0
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
  const { sliceDir } = c

  let mask = 0

  for (let sideIdx = 0; sideIdx < 2; sideIdx++) {
    const side = sideIdx === 0 ? 1 : -1
    const S_side = scale3(sliceDir, side)
    const { theta0, theta1 } = sampleBlockerInterval({ ...c, sliceDir: S_side })
    mask = accumulateSampleMask(mask, theta0, theta1)
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
  return 1 - popcount32(mask) / SECTOR_COUNT
}

export function popcount32(mask: number): number {
  let m = mask >>> 0
  let bits = 0
  while (m !== 0) {
    m = (m & (m - 1)) >>> 0
    bits++
  }
  return bits
}

export function rotateLeft32(x: number, bits: number): number {
  const b = bits & 31
  return ((x << b) | (x >>> ((32 - b) & 31))) >>> 0
}

export function maskCoverage(mask: number): number {
  return popcount32(mask) / SECTOR_COUNT
}

export function maskTransitions(mask: number): number {
  return popcount32((mask ^ rotateLeft32(mask, 1)) >>> 0) / SECTOR_COUNT
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
  const cosGamma = Math.cos(gammaNorm)
  const sinGamma = Math.sin(gammaNorm)

  for (let k = 0; k < SECTOR_COUNT; k++) {
    // Equivalent to max(0, cos(VBAO_SECTOR_ANGLES[k] - gammaNorm)).
    const w = Math.max(0, VBAO_SECTOR_COSINES[k]! * cosGamma + VBAO_SECTOR_SINES[k]! * sinGamma)
    denominator += w
    // (m >>> k) & 1 == 0  →  sector k is OPEN
    if (((m >>> k) & 1) === 0) {
      numerator += w
    }
  }

  return numerator / Math.max(denominator, 1e-6)
}

export interface DirectionalVisibilitySlice {
  readonly mask: number
  readonly sliceDir: Vec3
  readonly gammaNorm: number
}

export interface DirectionalVisibilityInput {
  readonly viewDir: Vec3
  readonly slices: readonly DirectionalVisibilitySlice[]
}

export interface DirectionalVisibilityResult {
  readonly accessibility: number
  readonly directionalWeight: number
  readonly bentNormal: Vec3
  readonly buckets: readonly DirectionalVisibilityBucket[]
}

export interface DirectionalVisibilityBucket {
  readonly direction: Vec3
  readonly weight: number
  readonly aperture: number
}

export function reconstructDirectionalVisibility(
  input: DirectionalVisibilityInput,
): DirectionalVisibilityResult {
  const V = normalize3(input.viewDir)
  let openWeight = 0
  let possibleWeight = 0
  let bent: Vec3 = [0, 0, 0]
  const rawBuckets: DirectionalVisibilityBucket[] = []

  for (const slice of input.slices) {
    const mask = slice.mask >>> 0
    const S = normalize3(slice.sliceDir)
    const cosGamma = Math.cos(slice.gammaNorm)
    const sinGamma = Math.sin(slice.gammaNorm)

    for (let k = 0; k < SECTOR_COUNT; k++) {
      const cosTheta = VBAO_SECTOR_COSINES[k]!
      const sinTheta = VBAO_SECTOR_SINES[k]!
      const weight = Math.max(0, cosTheta * cosGamma + sinTheta * sinGamma)
      possibleWeight += weight

      if (((mask >>> k) & 1) !== 0) {
        continue
      }

      const sectorDir = normalize3(add3(scale3(S, cosTheta), scale3(V, sinTheta)))
      openWeight += weight
      bent = add3(bent, scale3(sectorDir, weight))
    }

    rawBuckets.push(...extractDirectionalLobes(mask, S, V, cosGamma, sinGamma))
  }

  return {
    accessibility: possibleWeight <= 1e-6 ? 0 : openWeight / possibleWeight,
    directionalWeight: openWeight,
    bentNormal: openWeight <= 1e-6 ? [0, 0, 0] : normalize3(bent),
    buckets: mergeDirectionalBuckets(rawBuckets).slice(0, 2),
  }
}

function isOpenSector(mask: number, sector: number): boolean {
  return ((mask >>> sector) & 1) === 0
}

function sectorDirection(sliceDir: Vec3, viewDir: Vec3, sector: number): Vec3 {
  return normalize3(
    add3(
      scale3(sliceDir, VBAO_SECTOR_COSINES[sector]!),
      scale3(viewDir, VBAO_SECTOR_SINES[sector]!),
    ),
  )
}

function sectorWeight(sector: number, cosGamma: number, sinGamma: number): number {
  return Math.max(
    0,
    VBAO_SECTOR_COSINES[sector]! * cosGamma + VBAO_SECTOR_SINES[sector]! * sinGamma,
  )
}

function extractDirectionalLobes(
  mask: number,
  sliceDir: Vec3,
  viewDir: Vec3,
  cosGamma: number,
  sinGamma: number,
): DirectionalVisibilityBucket[] {
  const buckets: DirectionalVisibilityBucket[] = []
  let sector = 0

  while (sector < SECTOR_COUNT) {
    if (!isOpenSector(mask, sector)) {
      sector++
      continue
    }

    const firstSector = sector
    let weight = 0
    let directionSum: Vec3 = [0, 0, 0]

    while (sector < SECTOR_COUNT && isOpenSector(mask, sector)) {
      const w = sectorWeight(sector, cosGamma, sinGamma)
      weight += w
      directionSum = add3(directionSum, scale3(sectorDirection(sliceDir, viewDir, sector), w))
      sector++
    }

    if (weight > 1e-6) {
      buckets.push({
        direction: normalize3(directionSum),
        weight,
        aperture: (sector - firstSector) * VBAO_THETA_STEP,
      })
    }
  }

  return buckets
}

function mergeDirectionalBuckets(
  buckets: readonly DirectionalVisibilityBucket[],
): DirectionalVisibilityBucket[] {
  const merged: DirectionalVisibilityBucket[] = []

  for (const bucket of buckets) {
    const existingIndex = merged.findIndex(
      (candidate) => dot3(candidate.direction, bucket.direction) >= 0.94,
    )

    if (existingIndex < 0) {
      merged.push(bucket)
      continue
    }

    const existing = merged[existingIndex]!
    const weight = existing.weight + bucket.weight
    merged[existingIndex] = {
      direction: normalize3(
        add3(
          scale3(existing.direction, existing.weight),
          scale3(bucket.direction, bucket.weight),
        ),
      ),
      weight,
      aperture: Math.max(existing.aperture, bucket.aperture),
    }
  }

  return merged.sort((a, b) => b.weight - a.weight || a.direction[2] - b.direction[2])
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
