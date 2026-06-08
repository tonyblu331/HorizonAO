import {
  NodeUpdateType,
  QuadMesh,
  Vector2,
  type Camera,
  type Node,
  type NodeFrame,
  type TextureNode,
} from 'three/webgpu'
import {
  Fn,
  If,
  clamp,
  dot,
  float,
  getViewPosition,
  logarithmicDepthToViewZ,
  max,
  reference,
  textureSize,
  uniform,
  uv,
  vec2,
  viewZToPerspectiveDepth,
} from 'three/tsl'

import { computeVbaoBilateralGeometryWeight } from './vbaoBilateralWeight'
import { VBAOEffectPass } from './VBAOEffectPass'

export interface VBAOHalfResCleanupNodeOptions {
  readonly enabled?: boolean
  readonly strength?: number
  readonly resolutionScale?: number
  readonly confidenceNode?: TextureNode | undefined
}

const HALF_RES_CLEANUP_OFFSETS = Object.freeze([
  [-1, -1, 0.707],
  [0, -1, 1.0],
  [1, -1, 0.707],
  [-1, 0, 1.0],
  [1, 0, 1.0],
  [-1, 1, 0.707],
  [0, 1, 1.0],
  [1, 1, 0.707],
] as const)

const halfResCleanupQuadMesh = new QuadMesh()
const halfResCleanupSize = new Vector2()

type SampleableNode = Node & {
  sample: (uvCoord: Node) => any
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1
}

function clampResolutionScale(value: number): number {
  return Number.isFinite(value) ? Math.max(0.05, Math.min(1, value)) : 0.5
}

/**
 * Optional low-resolution AO cleanup before JBU resolve.
 *
 * This pass is for half/low-resolution raw AO only: a 3x3 edge-aware cleanup
 * at raw-AO resolution, followed by pure JBU4 resolve in `VBAOResolveNode`.
 * Fullscreen pass plumbing (render target, material, renderer-state save/restore)
 * is shared via {@link VBAOEffectPass}; this node renders at `resolutionScale`.
 */
export class VBAOHalfResCleanupNode extends VBAOEffectPass {
  static get type(): string {
    return 'VBAOHalfResCleanupNode'
  }

  readonly rawAoNode: TextureNode
  readonly depthNode: SampleableNode
  readonly normalNode: SampleableNode
  readonly camera: Camera
  readonly radiusNode: Node
  readonly confidenceNode: TextureNode | undefined
  readonly strengthUniform = uniform(1)
  updateBeforeType = NodeUpdateType.FRAME

  enabled: boolean
  strength: number
  resolutionScale: number

  private readonly cameraProjectionMatrixInverse
  private readonly cameraNear
  private readonly cameraFar

  constructor(
    rawAoNode: TextureNode,
    depthNode: Node,
    normalNode: Node,
    camera: Camera,
    radiusNode: Node = uniform(1),
    options: VBAOHalfResCleanupNodeOptions = {},
  ) {
    super('VBAO.HalfResCleanup', 'VBAOHalfResCleanup')

    this.rawAoNode = rawAoNode
    this.depthNode = depthNode as SampleableNode
    this.normalNode = normalNode as SampleableNode
    this.camera = camera
    this.radiusNode = radiusNode
    this.confidenceNode = options.confidenceNode
    this.enabled = options.enabled ?? true
    this.strength = clamp01(options.strength ?? 1)
    this.resolutionScale = clampResolutionScale(options.resolutionScale ?? 0.5)
    this.strengthUniform.value = this.strength
    this.cameraProjectionMatrixInverse = uniform(camera.projectionMatrixInverse)
    this.cameraNear = reference('near', 'float', camera)
    this.cameraFar = reference('far', 'float', camera)
  }

  configure(options: VBAOHalfResCleanupNodeOptions): void {
    this.enabled = options.enabled ?? this.enabled
    this.strength = clamp01(options.strength ?? this.strength)
    this.resolutionScale = clampResolutionScale(options.resolutionScale ?? this.resolutionScale)
    this.strengthUniform.value = this.strength
  }

  getTextureNode(): TextureNode {
    return this.enabled ? this.getPassTextureNode() : this.rawAoNode
  }

  /** Cleanup runs at raw-AO (scaled) resolution, not full output resolution. */
  setSize(width: number, height: number): void {
    super.setSize(width * this.resolutionScale, height * this.resolutionScale)
  }

  updateBefore(frame: NodeFrame): boolean | undefined {
    if (!this.enabled) return undefined

    return this.renderFullscreenPass(
      frame,
      halfResCleanupSize,
      halfResCleanupQuadMesh,
      'VBAOHalfResCleanup',
    )
  }

  setup(builder: any): TextureNode {
    const uvNode = uv()
    const rawAo = this.rawAoNode as any
    const confidence = this.confidenceNode as any
    const depthNode = this.depthNode as any
    const normalNode = this.normalNode as any

    const sampleDepth = (uvCoord: any) => {
      const d = depthNode.sample(uvCoord).r
      if (builder.renderer.logarithmicDepthBuffer === true) {
        const vz = logarithmicDepthToViewZ(d, this.cameraNear, this.cameraFar)
        return viewZToPerspectiveDepth(vz, this.cameraNear, this.cameraFar)
      }
      return d
    }

    const sampleNormal = (uvCoord: any) => normalNode.sample(uvCoord).rgb.normalize()

    const cleanupKernel = (Fn as any)(() => {
      const rawSize = vec2((textureSize as any)(rawAo, 0) as any).toVar('vbaoHalfResCleanupRawSize')
      const texelSize = vec2(1).div(rawSize).toVar('vbaoHalfResCleanupTexelSize')
      const centerAo = rawAo.sample(uvNode).r.toVar('vbaoHalfResCleanupCenterAo')
      const centerConfidence = (confidence === undefined ? float(1) : confidence.sample(uvNode).g)
        .clamp(0, 1)
        .toVar('vbaoHalfResCleanupCenterConfidence')
      const centerDepth = sampleDepth(uvNode).toVar('vbaoHalfResCleanupCenterDepth')
      const centerNormal = sampleNormal(uvNode).toVar('vbaoHalfResCleanupCenterNormal')
      const centerPosition = getViewPosition(
        uvNode,
        centerDepth,
        this.cameraProjectionMatrixInverse,
      ).toVar('vbaoHalfResCleanupCenterPosition')
      const centerValid = centerDepth
        .lessThan(float(1))
        .and(centerDepth.greaterThanEqual(float(0)))
        .and(dot(centerNormal, centerNormal).greaterThan(float(0.001)))
        .toVar('vbaoHalfResCleanupCenterValid')
      const weightedAo = centerAo.mul(float(4)).toVar('vbaoHalfResCleanupWeightedAo')
      const totalWeight = float(4).toVar('vbaoHalfResCleanupTotalWeight')

      const visitTap = (x: number, y: number, spatialWeight: number, tapIndex: number) => {
        const tapUv = uvNode
          .add(vec2(float(x), float(y)).mul(texelSize))
          .toVar(`vbaoHalfResCleanupTapUv${tapIndex}`)

        If(
          tapUv.x
            .greaterThanEqual(float(0))
            .and(tapUv.x.lessThanEqual(float(1)))
            .and(tapUv.y.greaterThanEqual(float(0)))
            .and(tapUv.y.lessThanEqual(float(1))),
          () => {
            const tapAo = rawAo.sample(tapUv).r.toVar(`vbaoHalfResCleanupTapAo${tapIndex}`)
            const tapDepth = sampleDepth(tapUv).toVar(`vbaoHalfResCleanupTapDepth${tapIndex}`)
            const tapNormal = sampleNormal(tapUv).toVar(`vbaoHalfResCleanupTapNormal${tapIndex}`)
            const tapPosition = getViewPosition(
              tapUv,
              tapDepth,
              this.cameraProjectionMatrixInverse,
            ).toVar(`vbaoHalfResCleanupTapPosition${tapIndex}`)
            const tapValid = tapDepth
              .lessThan(float(1))
              .and(tapDepth.greaterThanEqual(float(0)))
              .and(dot(tapNormal, tapNormal).greaterThan(float(0.001)))
            const geometryWeight = computeVbaoBilateralGeometryWeight(
              centerPosition,
              centerNormal,
              tapPosition,
              tapNormal,
              this.radiusNode,
              `vbaoHalfResCleanup${tapIndex}`,
            )
            const tapWeight = geometryWeight
              .mul(float(spatialWeight))
              .toVar(`vbaoHalfResCleanupTapWeight${tapIndex}`)

            If(centerValid.and(tapValid), () => {
              weightedAo.addAssign(tapAo.mul(tapWeight))
              totalWeight.addAssign(tapWeight)
            })
          },
        )
      }

      HALF_RES_CLEANUP_OFFSETS.forEach(([x, y, spatialWeight], tapIndex) => {
        visitTap(x, y, spatialWeight, tapIndex)
      })

      const cleanedAo = weightedAo
        .div(max(totalWeight, float(1e-6)))
        .toVar('vbaoHalfResCleanupCleanedAo')
      const confidenceGuidedStrength = this.strengthUniform
        .mul(float(1).sub(centerConfidence))
        .toVar('vbaoHalfResCleanupConfidenceGuidedStrength')
      const filteredAo = centerAo
        .mul(float(1).sub(confidenceGuidedStrength))
        .add(cleanedAo.mul(confidenceGuidedStrength))
        .toVar('vbaoHalfResCleanupFilteredAo')
      return centerValid.select(clamp(filteredAo, float(0), float(1)), centerAo)
    })

    this.material.fragmentNode = cleanupKernel()
    this.material.needsUpdate = true

    return this.getPassTextureNode()
  }
}
