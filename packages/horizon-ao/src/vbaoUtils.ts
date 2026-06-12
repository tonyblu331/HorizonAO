import { type Node } from 'three/webgpu'

export type { Node }

export type SampleableNode = Node & {
  sample: (uvCoord: Node) => any
}

export function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1
}

export function clamp01OrZero(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0
}

export function clampResolutionScale(value: number): number {
  return Number.isFinite(value) ? Math.max(0.05, Math.min(1, value)) : 0.5
}
