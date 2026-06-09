/**
 * Screen-space-achievable AO reference evaluator (P1-B).
 *
 * Models what an ideal single-depth-layer screen-space AO implementation CAN achieve:
 * a hemisphere ray that hits occluder H is counted as occluded only if H is the
 * front-most surface along the camera ray from `eye` toward H. Rays whose occluder
 * is hidden behind a nearer surface are irreducibly lost.
 *
 * This module is intentionally self-contained — it does NOT import or modify
 * `aoRaycastReference.ts`, keeping the GT baseline frozen.
 */

import type { RaycastAoFixture, RaycastAoOccluder, RaycastAoResult, RaycastVec3 } from './aoRaycastReference'

// ─── Private constants (identical to aoRaycastReference to ensure bit-for-bit parity) ─

/** Self-hit guard: origin is offset by EPSILON*normal so the receiver surface doesn't block itself. */
const EPSILON = 1e-4

/** Fibonacci golden-angle step for the cosine-hemisphere sample sequence. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

/**
 * Visibility epsilon for the single-depth-layer oracle.
 *
 * When `tClosest >= tH - VIS_EPSILON` we count the occluder as visible from the camera.
 * Value 1e-3 (10× EPSILON) absorbs the origin offset and self-hit artefacts on the
 * receiver-adjacent occluder face. If a fixture's occluder sits within 1e-3 of the
 * threshold and flickers, widen toward 2e-3 and document here.
 *
 * This is a LOAD-BEARING TUNING CONSTANT. Any change invalidates the deep-equal lock.
 */
export const VIS_EPSILON = 1e-3

// ─── Public camera interface ──────────────────────────────────────────────────

/** Minimal camera model for the SS-achievable depth oracle. No projection, fov, or aspect. */
export interface SsAoCamera {
  readonly eye: RaycastVec3
  readonly lookAt: RaycastVec3
}

/**
 * Stable identifier for this camera assignment set.
 * Emitted in ThreeWayDeltaReport so any future camera change produces a visible diff.
 * LOAD-BEARING REGRESSION CONSTANT — do not change without a baseline re-capture.
 */
export const SS_AO_CAMERA_SET_ID = 'ssao-cam-v1'

/**
 * Per-fixture frozen camera assignments.
 *
 * 7 Y-up fixtures (normal [0,1,0]) share the canonical view eye [0,2,2.5]→origin.
 * Two fixtures with tilted normals use overridden camera positions chosen to provide
 * meaningful depth-visibility coverage for their specific occluder geometries.
 *
 * EVERY VALUE HERE IS A LOAD-BEARING REGRESSION CONSTANT.
 * Changing any entry invalidates the ThreeWayDeltaReport deep-equal baseline and
 * the SS ≤ GT monotonicity invariant. Always recapture and re-lock after edits.
 */
export const SS_AO_FIXTURE_CAMERAS = Object.freeze({
  // ── Y-up group: eye [0,2,2.5] → origin ───────────────────────────────────
  'flat-plane-open': { eye: [0, 2, 2.5], lookAt: [0, 0, 0] },
  'sphere-contact': { eye: [0, 2, 2.5], lookAt: [0, 0, 0] },
  'box-contact': { eye: [0, 2, 2.5], lookAt: [0, 0, 0] },
  'two-wall-corner': { eye: [0, 2, 2.5], lookAt: [0, 0, 0] },
  'broad-wall-contact': { eye: [0, 2, 2.5], lookAt: [0, 0, 0] },
  'thin-gap-separated-slabs': { eye: [0, 2, 2.5], lookAt: [0, 0, 0] },
  'far-object-outside-radius': { eye: [0, 2, 2.5], lookAt: [0, 0, 0] },
  // ── Tilted-normal overrides ───────────────────────────────────────────────
  /** Normal [0.42,0.91,0] — camera shifted to +X side for grazing-geometry coverage. */
  'grazing-surface-wall': { eye: [-1.5, 2.2, 2.0], lookAt: [0, 0, 0] },
  /** Normal [0,0.74,0.67] — camera behind origin so the +Z occluder is front-visible. */
  'normal-sensitive-side-contact': { eye: [0, 2.2, -2.0], lookAt: [0, 0, 0] },
} as const satisfies Record<string, SsAoCamera>)

// ─── Private vec3 helpers ────────────────────────────────────────────────────

function dot3(a: RaycastVec3, b: RaycastVec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function add3(a: RaycastVec3, b: RaycastVec3): RaycastVec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

function sub3(a: RaycastVec3, b: RaycastVec3): RaycastVec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function scale3(v: RaycastVec3, s: number): RaycastVec3 {
  return [v[0] * s, v[1] * s, v[2] * s]
}

function cross3(a: RaycastVec3, b: RaycastVec3): RaycastVec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function length3(v: RaycastVec3): number {
  return Math.hypot(v[0], v[1], v[2])
}

function normalize3(v: RaycastVec3): RaycastVec3 {
  const len = length3(v)
  return len < 1e-10 ? [0, 1, 0] : [v[0] / len, v[1] / len, v[2] / len]
}

// ─── Private intersection helpers (distance-returning) ───────────────────────
// Bodies are intentionally identical to aoRaycastReference's intersectSphere /
// intersectBox, but return the hit distance t instead of a boolean.  GT is kept
// frozen; correctness is validated through the evaluator tests and reconciliation.

/**
 * Ray–sphere intersection. Returns the nearest positive t > EPSILON, or +Infinity.
 * PRIVATE — tested indirectly through evaluateScreenSpaceAchievableAo.
 */
function intersectSphereT(origin: RaycastVec3, direction: RaycastVec3, sphere: Extract<RaycastAoOccluder, { type: 'sphere' }>): number {
  const oc = sub3(origin, sphere.center)
  const halfB = dot3(oc, direction)
  const c = dot3(oc, oc) - sphere.radius * sphere.radius
  const discriminant = halfB * halfB - c
  if (discriminant < 0) return Number.POSITIVE_INFINITY

  const root = Math.sqrt(discriminant)
  const t0 = -halfB - root
  if (t0 > EPSILON) return t0

  const t1 = -halfB + root
  return t1 > EPSILON ? t1 : Number.POSITIVE_INFINITY
}

/**
 * Ray–AABB intersection. Returns the nearest positive t > EPSILON, or +Infinity.
 * PRIVATE — tested indirectly through evaluateScreenSpaceAchievableAo.
 */
function intersectBoxT(origin: RaycastVec3, direction: RaycastVec3, box: Extract<RaycastAoOccluder, { type: 'box' }>): number {
  let tMin = EPSILON
  let tMax = Number.POSITIVE_INFINITY

  for (let axis = 0; axis < 3; axis++) {
    const d = direction[axis]!
    if (Math.abs(d) < 1e-10) {
      if (origin[axis]! < box.min[axis]! || origin[axis]! > box.max[axis]!) {
        return Number.POSITIVE_INFINITY
      }
      continue
    }

    const invD = 1 / d
    let t0 = (box.min[axis]! - origin[axis]!) * invD
    let t1 = (box.max[axis]! - origin[axis]!) * invD
    if (t0 > t1) [t0, t1] = [t1, t0]

    tMin = Math.max(tMin, t0)
    tMax = Math.min(tMax, t1)
    if (tMax < tMin) return Number.POSITIVE_INFINITY
  }

  return tMin
}

/**
 * Nearest hit distance among all occluders from origin along direction.
 * Returns +Infinity if no occluder is hit.
 * PRIVATE — tested indirectly through evaluateScreenSpaceAchievableAo.
 */
function nearestHitT(origin: RaycastVec3, direction: RaycastVec3, occluders: readonly RaycastAoOccluder[]): number {
  let nearest = Number.POSITIVE_INFINITY
  for (const occluder of occluders) {
    const t =
      occluder.type === 'sphere'
        ? intersectSphereT(origin, direction, occluder)
        : intersectBoxT(origin, direction, occluder)
    if (t < nearest) nearest = t
  }
  return nearest
}

// ─── Cosine-hemisphere sample generation ─────────────────────────────────────
// Identical implementation to aoRaycastReference so AO ray directions are bit-for-bit
// the same — required for totalRmse reconciliation with P1 (~0.099).

function buildFrame(normal: RaycastVec3): {
  readonly n: RaycastVec3
  readonly t: RaycastVec3
  readonly b: RaycastVec3
} {
  const n = normalize3(normal)
  const seed: RaycastVec3 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  const t = normalize3(cross3(seed, n))
  const b = normalize3(cross3(n, t))
  return { n, t, b }
}

function cosineHemisphereDirection(index: number, sampleCount: number, normal: RaycastVec3): RaycastVec3 {
  const { n, t, b } = buildFrame(normal)
  const u = (index + 0.5) / Math.max(1, sampleCount)
  const r = Math.sqrt(u)
  const phi = index * GOLDEN_ANGLE
  const x = Math.cos(phi) * r
  const z = Math.sin(phi) * r
  const y = Math.sqrt(Math.max(0, 1 - r * r))

  return normalize3(add3(add3(scale3(t, x), scale3(n, y)), scale3(b, z)))
}

// ─── Public evaluator ────────────────────────────────────────────────────────

/**
 * Compute the screen-space-achievable AO accessibility for a fixture from a given camera.
 *
 * For each cosine-hemisphere AO ray:
 * 1. Find the nearest occluder hit H within fixture.radius (same GT rule).
 *    If no hit → ray is OPEN in both GT and SS.
 * 2. Compute tH = distance from `eye` to H; fire a camera ray from `eye` toward H.
 *    tClosest = nearest occluder along that camera ray (unbounded — no radius clamp).
 * 3. Count occlusion IFF `tClosest >= tH - VIS_EPSILON`.
 *    Otherwise H is hidden behind a nearer surface → irreducible loss for SS.
 *
 * Result shape is identical to `evaluateRaycastAoReference` ({accessibility,occludedRays,sampleCount}).
 * By construction: ssAccessibility <= gtAccessibility + VIS_EPSILON for every fixture.
 *
 * @param fixture   The analytic AO fixture to evaluate.
 * @param camera    Camera eye and look-at position (from SS_AO_FIXTURE_CAMERAS).
 * @param sampleCount  Cosine-hemisphere sample count; MUST equal the GT count (4096) for reconciliation.
 */
export function evaluateScreenSpaceAchievableAo(
  fixture: RaycastAoFixture,
  camera: SsAoCamera,
  sampleCount = 4096,
): RaycastAoResult {
  const safeSampleCount = Math.max(1, Math.round(sampleCount))
  const n = normalize3(fixture.normal)
  const origin = add3(fixture.point, scale3(n, EPSILON))
  const eye = camera.eye as RaycastVec3
  let occludedRays = 0

  for (let index = 0; index < safeSampleCount; index++) {
    const direction = cosineHemisphereDirection(index, safeSampleCount, n)

    // Step 1: nearest AO-ray hit within radius
    const tH = nearestHitT(origin, direction, fixture.occluders)
    if (!isFinite(tH) || tH > fixture.radius) {
      // Ray is OPEN — no occluder within AO radius
      continue
    }

    // Step 2: hit point H; camera ray from eye toward H
    const H = add3(origin, scale3(direction, tH))
    const eyeToH = sub3(H, eye)
    const tHcam = length3(eyeToH)
    const camDir = normalize3(eyeToH)

    // Step 3: nearest camera-ray hit (unbounded)
    const tClosest = nearestHitT(eye, camDir, fixture.occluders)

    // Count occluded iff the occluder H is the front-most visible surface
    if (tClosest >= tHcam - VIS_EPSILON) {
      occludedRays++
    }
    // else: H hidden behind a nearer surface → irreducible loss, ray counted OPEN in SS
  }

  return {
    accessibility: 1 - occludedRays / safeSampleCount,
    occludedRays,
    sampleCount: safeSampleCount,
  }
}
