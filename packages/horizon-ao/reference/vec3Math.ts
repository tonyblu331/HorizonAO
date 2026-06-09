export type Vec3 = readonly [number, number, number]

export function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

export function add3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

export function sub3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

export function scale3(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s]
}

export function cross3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

export function length3(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2])
}

export function normalize3(v: Vec3): Vec3 {
  const len = length3(v)
  return len < 1e-10 ? [0, 0, 0] : [v[0] / len, v[1] / len, v[2] / len]
}

export function normalize3Up(v: Vec3): Vec3 {
  const len = length3(v)
  return len < 1e-10 ? [0, 1, 0] : [v[0] / len, v[1] / len, v[2] / len]
}
