import type { HorizonAoDebugView } from '@horizonao/core'
import type { Node } from 'three/webgpu'
import { vec3, vec4 } from 'three/tsl'

type TslChainNode = {
  readonly rgb: TslChainNode
  normalize: () => TslChainNode
  mul: (value: unknown) => TslChainNode
  add: (value: unknown) => TslChainNode
}

interface AoDebugOutputOptions {
  readonly sceneColor: unknown
  readonly sceneLinearDepth: unknown
  readonly sceneNormal: unknown
  readonly aoValue: unknown
  readonly debugView: HorizonAoDebugView
}

export function createAoDebugOutput({
  sceneColor,
  sceneLinearDepth,
  sceneNormal,
  aoValue,
  debugView,
}: AoDebugOutputOptions): Node {
  // Three's TSL runtime exposes chainable node operators on pass texture nodes,
  // while the public d.ts surface is still narrower for these composed display nodes.
  const colorNode = sceneColor as TslChainNode
  const normalNode = sceneNormal as TslChainNode
  const aoNode = aoValue as never
  const linearDepthNode = sceneLinearDepth as never

  if (debugView === 'raw-ao') return vec4(vec3(aoNode), 1) as Node
  if (debugView === 'linear-depth') return vec4(vec3(linearDepthNode), 1) as Node
  if (debugView === 'normal') return vec4(normalNode.rgb.normalize().mul(0.5).add(0.5) as never, 1) as Node

  return colorNode.mul(vec4(vec3(aoNode), 1)) as unknown as Node
}
