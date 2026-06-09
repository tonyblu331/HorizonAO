/**
 * Deterministic finite-radius ray-cast AO reference fixtures.
 *
 * This is not a production renderer. It is a small frozen verifier for the
 * quality-hardening roadmap: if a screen-space candidate claims "closer to
 * ground truth", it first needs to be compared against stable geometry cases
 * whose reference accessibility is computed by explicit hemisphere rays.
 */

export type RaycastVec3 = readonly [number, number, number]

export interface RaycastAoSphere {
  readonly type: 'sphere'
  readonly center: RaycastVec3
  readonly radius: number
}

export interface RaycastAoBox {
  readonly type: 'box'
  readonly min: RaycastVec3
  readonly max: RaycastVec3
}

export type RaycastAoOccluder = RaycastAoSphere | RaycastAoBox

export interface RaycastAoFixture {
  readonly id: string
  readonly description: string
  readonly point: RaycastVec3
  readonly normal: RaycastVec3
  readonly radius: number
  readonly occluders: readonly RaycastAoOccluder[]
}

export interface RaycastAoResult {
  readonly accessibility: number
  readonly occludedRays: number
  readonly sampleCount: number
}

const EPSILON = 1e-4
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

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

function intersectSphere(origin: RaycastVec3, direction: RaycastVec3, sphere: RaycastAoSphere): number {
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

function intersectBox(origin: RaycastVec3, direction: RaycastVec3, box: RaycastAoBox): number {
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

function intersectsWithinRadius(
  origin: RaycastVec3,
  direction: RaycastVec3,
  occluder: RaycastAoOccluder,
  radius: number,
): boolean {
  const hit =
    occluder.type === 'sphere'
      ? intersectSphere(origin, direction, occluder)
      : intersectBox(origin, direction, occluder)
  return hit > EPSILON && hit <= radius
}

export function evaluateRaycastAoReference(
  fixture: RaycastAoFixture,
  sampleCount = 1024,
): RaycastAoResult {
  const safeSampleCount = Math.max(1, Math.round(sampleCount))
  const n = normalize3(fixture.normal)
  const origin = add3(fixture.point, scale3(n, EPSILON))
  let occludedRays = 0

  for (let index = 0; index < safeSampleCount; index++) {
    const direction = cosineHemisphereDirection(index, safeSampleCount, n)
    if (
      fixture.occluders.some((occluder) =>
        intersectsWithinRadius(origin, direction, occluder, fixture.radius),
      )
    ) {
      occludedRays++
    }
  }

  return {
    accessibility: 1 - occludedRays / safeSampleCount,
    occludedRays,
    sampleCount: safeSampleCount,
  }
}

/**
 * Whether a single hemisphere direction is occluded within the fixture's finite
 * AO radius. Exposed so VBAO-representation estimators can reuse the exact same
 * occluder intersection as the ground-truth reference (apples-to-apples deltas).
 */
export function isRaycastDirectionOccluded(
  fixture: RaycastAoFixture,
  direction: RaycastVec3,
): boolean {
  const n = normalize3(fixture.normal)
  const origin = add3(fixture.point, scale3(n, EPSILON))
  const dir = normalize3(direction)
  return fixture.occluders.some((occluder) =>
    intersectsWithinRadius(origin, dir, occluder, fixture.radius),
  )
}

export const RAYCAST_AO_FIXTURES = Object.freeze([
  {
    id: 'flat-plane-open',
    description: 'Receiver point with no nearby above-surface occluders.',
    point: [0, 0, 0],
    normal: [0, 1, 0],
    radius: 1.5,
    occluders: [],
  },
  {
    id: 'sphere-contact',
    description: 'Finite sphere near the receiver; should create localized contact AO.',
    point: [0, 0, 0],
    normal: [0, 1, 0],
    radius: 1.5,
    occluders: [{ type: 'sphere', center: [0.48, 0.34, 0], radius: 0.34 }],
  },
  {
    id: 'box-contact',
    description: 'Vertical box near the receiver; exercises hard-edged blocker behavior.',
    point: [0, 0, 0],
    normal: [0, 1, 0],
    radius: 1.5,
    occluders: [{ type: 'box', min: [0.3, 0, -0.25], max: [0.72, 0.78, 0.25] }],
  },
  {
    id: 'two-wall-corner',
    description: 'Two perpendicular thin walls; catches broad false-corner darkening.',
    point: [0, 0, 0],
    normal: [0, 1, 0],
    radius: 1.5,
    occluders: [
      { type: 'box', min: [0.55, 0, -0.75], max: [0.62, 1.2, 0.75] },
      { type: 'box', min: [-0.75, 0, 0.55], max: [0.75, 1.2, 0.62] },
    ],
  },
  {
    id: 'broad-wall-contact',
    description: 'Single broad wall near the receiver; gates broad-contact under-occlusion.',
    point: [0, 0, 0],
    normal: [0, 1, 0],
    radius: 1.5,
    occluders: [{ type: 'box', min: [0.38, 0, -1.0], max: [0.54, 1.25, 1.0] }],
  },
  {
    id: 'thin-gap-separated-slabs',
    description: 'Two separated thin slabs with a visible center opening.',
    point: [0, 0, 0],
    normal: [0, 1, 0],
    radius: 1.5,
    occluders: [
      { type: 'box', min: [0.45, 0, -0.82], max: [0.52, 1.05, -0.14] },
      { type: 'box', min: [0.45, 0, 0.14], max: [0.52, 1.05, 0.82] },
    ],
  },
  {
    id: 'grazing-surface-wall',
    description: 'Tilted receiver normal near a wall; stresses grazing finite-geometry AO.',
    point: [0, 0, 0],
    normal: [0.42, 0.91, 0],
    radius: 1.5,
    occluders: [{ type: 'box', min: [0.46, 0, -0.7], max: [0.58, 1.15, 0.7] }],
  },
  {
    id: 'normal-sensitive-side-contact',
    description: 'Receiver normal tilted toward a side blocker; gates normal-sensitive contact.',
    point: [0, 0, 0],
    normal: [0, 0.74, 0.67],
    radius: 1.5,
    occluders: [{ type: 'box', min: [-0.36, 0, 0.46], max: [0.36, 1.05, 0.58] }],
  },
  {
    id: 'far-object-outside-radius',
    description: 'Large object outside AO radius; validates finite-radius rejection.',
    point: [0, 0, 0],
    normal: [0, 1, 0],
    radius: 1.0,
    occluders: [{ type: 'sphere', center: [2.4, 0.5, 0], radius: 0.5 }],
  },
] as const satisfies readonly RaycastAoFixture[])

export type RaycastAoFixtureId = (typeof RAYCAST_AO_FIXTURES)[number]['id']
