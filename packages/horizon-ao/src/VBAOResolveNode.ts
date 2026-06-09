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
  Loop,
  clamp,
  dot,
  float,
  floor,
  fract,
  getViewPosition,
  int,
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

const resolveQuadMesh = new QuadMesh()
const resolveSize = new Vector2()

type SampleableNode = Node & {
  sample: (uvCoord: Node) => any
}

/**
 * Temporal-free JBU4 product resolve for raw VBAO.
 *
 * This is the internal product boundary used when low-resolution raw AO needs
 * final AO: it owns bilinear reconstruction manually and rejects cross-edge taps
 * with depth/normal weights instead of relying on texture filtering. Fullscreen
 * pass plumbing (render target, material, renderer-state save/restore) is shared
 * via {@link VBAOEffectPass}; this node always resolves to full output resolution.
 */
export class VBAOResolveNode extends VBAOEffectPass {
  static get type(): string {
    return 'VBAOResolveNode'
  }

  readonly rawAoNode: TextureNode
  readonly depthNode: SampleableNode
  readonly normalNode: SampleableNode
  readonly camera: Camera
  readonly radiusNode: Node
  updateBeforeType = NodeUpdateType.FRAME

  private readonly cameraProjectionMatrixInverse
  private readonly cameraNear
  private readonly cameraFar

  constructor(
    rawAoNode: TextureNode,
    depthNode: Node,
    normalNode: Node,
    camera: Camera,
    radiusNode: Node = uniform(1),
  ) {
    super('VBAO.Resolve', 'VBAOResolve')
    this.rawAoNode = rawAoNode
    this.depthNode = depthNode as SampleableNode
    this.normalNode = normalNode as SampleableNode
    this.camera = camera
    this.radiusNode = radiusNode
    this.cameraProjectionMatrixInverse = uniform(camera.projectionMatrixInverse)
    this.cameraNear = reference('near', 'float', camera)
    this.cameraFar = reference('far', 'float', camera)
  }

  getTextureNode(): TextureNode {
    return this.getPassTextureNode()
  }

  updateBefore(frame: NodeFrame): boolean | undefined {
    return this.renderFullscreenPass(frame, resolveSize, resolveQuadMesh, 'VBAOResolve')
  }

  setup(builder: any): TextureNode {
    const uvNode = uv()
    const rawAo = this.rawAoNode as any
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

    const resolveKernel = (Fn as any)(() => {
      const centerDepth = sampleDepth(uvNode).toVar('vbaoResolveCenterDepth')
      const centerNormal = sampleNormal(uvNode).toVar('vbaoResolveCenterNormal')
      const centerPosition = getViewPosition(
        uvNode,
        centerDepth,
        this.cameraProjectionMatrixInverse,
      ).toVar('vbaoResolveCenterPosition')
      const rawSize = vec2((textureSize as any)(rawAo, 0) as any).toVar('vbaoResolveRawSize')
      const rawCoord = uvNode.mul(rawSize).sub(vec2(0.5)).toVar('vbaoResolveRawCoord')
      const baseCoord = floor(rawCoord).toVar('vbaoResolveBaseCoord')
      const bilinearFrac = fract(rawCoord).toVar('vbaoResolveBilinearFrac')
      const weightedAo = float(0).toVar('vbaoResolveWeightedAo')
      const totalWeight = float(0).toVar('vbaoResolveTotalWeight')
      const fallbackAo = float(0).toVar('vbaoResolveFallbackAo')
      const fallbackWeight = float(0).toVar('vbaoResolveFallbackWeight')
      const centerValid = centerDepth
        .lessThan(float(1))
        .and(centerDepth.greaterThanEqual(float(0)))
        .and(dot(centerNormal, centerNormal).greaterThan(float(0.001)))
        .toVar('vbaoResolveCenterValid')

      ;(Loop as any)({ start: int(0), end: int(2), type: 'int', condition: '<', name: 'oy' }, ({ oy }: any) => {
        ;(Loop as any)({ start: int(0), end: int(2), type: 'int', condition: '<', name: 'ox' }, ({ ox }: any) => {
          const tapCoord = baseCoord.add(vec2(float(ox), float(oy))).toVar('vbaoResolveTapCoord')
          const tapUv = tapCoord.add(vec2(0.5)).div(rawSize).toVar('vbaoResolveTapUv')
          const bilinearX = ox.equal(int(0)).select(float(1).sub(bilinearFrac.x), bilinearFrac.x)
          const bilinearY = oy.equal(int(0)).select(float(1).sub(bilinearFrac.y), bilinearFrac.y)
          const bilinearWeight = bilinearX.mul(bilinearY).toVar('vbaoResolveBilinearWeight')

          If(
            tapUv.x
              .greaterThanEqual(float(0))
              .and(tapUv.x.lessThanEqual(float(1)))
              .and(tapUv.y.greaterThanEqual(float(0)))
              .and(tapUv.y.lessThanEqual(float(1))),
            () => {
              const tapAo = rawAo.sample(tapUv).r
              fallbackAo.addAssign(tapAo.mul(bilinearWeight))
              fallbackWeight.addAssign(bilinearWeight)

              const tapDepth = sampleDepth(tapUv).toVar('vbaoResolveTapDepth')
              const tapNormal = sampleNormal(tapUv).toVar('vbaoResolveTapNormal')
              const tapPosition = getViewPosition(
                tapUv,
                tapDepth,
                this.cameraProjectionMatrixInverse,
              ).toVar('vbaoResolveTapPosition')
              const geometryWeight = computeVbaoBilateralGeometryWeight(
                centerPosition,
                centerNormal,
                tapPosition,
                tapNormal,
                this.radiusNode,
                'vbaoResolve',
              )
              const tapWeight = bilinearWeight.mul(geometryWeight).toVar('vbaoResolveTapWeight')
              const tapValid = tapDepth
                .lessThan(float(1))
                .and(tapDepth.greaterThanEqual(float(0)))
                .and(dot(tapNormal, tapNormal).greaterThan(float(0.001)))

              If(centerValid.and(tapValid), () => {
                weightedAo.addAssign(tapAo.mul(tapWeight))
                totalWeight.addAssign(tapWeight)
              })
            },
          )
        })
      })

      const resolvedAo = weightedAo.div(max(totalWeight, float(1e-6)))
      const fallbackResolvedAo = fallbackAo.div(max(fallbackWeight, float(1e-6)))
      return centerValid
        .and(totalWeight.greaterThan(float(1e-5)))
        .select(clamp(resolvedAo, float(0), float(1)), clamp(fallbackResolvedAo, float(0), float(1)))
    })

    this.material.fragmentNode = resolveKernel()
    this.material.needsUpdate = true

    return this.getPassTextureNode()
  }
}
