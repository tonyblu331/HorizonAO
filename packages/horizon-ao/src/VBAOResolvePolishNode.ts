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
  PI,
  clamp,
  cos,
  dot,
  float,
  floor,
  fract,
  getViewPosition,
  logarithmicDepthToViewZ,
  max,
  min,
  reference,
  sin,
  textureSize,
  uniform,
  uv,
  vec2,
  viewZToPerspectiveDepth,
} from 'three/tsl'

import { VBAOEffectPass } from './VBAOEffectPass'
import { computeVbaoBilateralGeometryWeight } from './vbaoBilateralWeight'

export interface VBAOResolvePolishNodeOptions {
  readonly strength?: number
}

const JBU4 = Object.freeze([
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
] as const)

const POISSON8 = Object.freeze([
  [1.0, 0.0, 1.0],
  [-1.0, 0.0, 1.0],
  [0.0, 1.0, 1.0],
  [0.0, -1.0, 1.0],
  [0.707, 0.707, 0.85],
  [-0.707, 0.707, 0.85],
  [0.707, -0.707, 0.85],
  [-0.707, -0.707, 0.85],
] as const)

const resolvePolishQuadMesh = new QuadMesh()
const resolvePolishSize = new Vector2()

type SampleableNode = Node & {
  sample: (uvCoord: Node) => any
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1
}

/**
 * Evidence-only fused JBU4 resolve plus full-resolution polish candidate.
 *
 * This private node intentionally duplicates the two-pass kernels so Phase 4
 * can measure whether eliminating one render target is worth the larger shader.
 */
export class VBAOResolvePolishNode extends VBAOEffectPass {
  static get type(): string {
    return 'VBAOResolvePolishNode'
  }

  readonly lowResolutionAoNode: TextureNode
  readonly depthNode: SampleableNode
  readonly normalNode: SampleableNode
  readonly camera: Camera
  readonly radiusNode: Node
  readonly strengthUniform = uniform(1)
  updateBeforeType = NodeUpdateType.FRAME

  strength: number

  private readonly cameraProjectionMatrixInverse
  private readonly cameraNear
  private readonly cameraFar

  constructor(
    lowResolutionAoNode: TextureNode,
    depthNode: Node,
    normalNode: Node,
    camera: Camera,
    radiusNode: Node = uniform(1),
    options: VBAOResolvePolishNodeOptions = {},
  ) {
    super('VBAO.ResolvePolish', 'VBAOResolvePolish')

    this.lowResolutionAoNode = lowResolutionAoNode
    this.depthNode = depthNode as SampleableNode
    this.normalNode = normalNode as SampleableNode
    this.camera = camera
    this.radiusNode = radiusNode
    this.strength = clamp01(options.strength ?? 1)
    this.strengthUniform.value = this.strength
    this.cameraProjectionMatrixInverse = uniform(camera.projectionMatrixInverse)
    this.cameraNear = reference('near', 'float', camera)
    this.cameraFar = reference('far', 'float', camera)
  }

  getTextureNode(): TextureNode {
    return this.getPassTextureNode()
  }

  updateBefore(frame: NodeFrame): boolean | undefined {
    return this.renderFullscreenPass(
      frame,
      resolvePolishSize,
      resolvePolishQuadMesh,
      'VBAOResolvePolish',
    )
  }

  setup(builder: any): TextureNode {
    const uvNode = uv()
    const lowResolutionAo = this.lowResolutionAoNode as any
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

    const resolvePolishKernel = (Fn as any)(() => {
      const lowResolutionAoSize = vec2((textureSize as any)(lowResolutionAo, 0) as any).toVar(
        'vbaoResolvePolishLowResolutionAoSize',
      )
      const fullResolutionSize = lowResolutionAoSize
        .mul(float(2))
        .toVar('vbaoResolvePolishFullResolutionSize')
      const texelSize = vec2(1).div(fullResolutionSize).toVar('vbaoResolvePolishTexelSize')

      const resolveAt = (
        resolveUv: any,
        resolveDepth: any,
        resolveNormal: any,
        resolvePosition: any,
        prefix: string,
      ) => {
        const rawCoord = resolveUv
          .mul(lowResolutionAoSize)
          .sub(vec2(0.5))
          .toVar(`${prefix}RawCoord`)
        const baseCoord = floor(rawCoord).toVar(`${prefix}BaseCoord`)
        const bilinearFracX = fract(rawCoord.x).toVar(`${prefix}BilinearFracX`)
        const bilinearFracY = fract(rawCoord.y).toVar(`${prefix}BilinearFracY`)
        const weightedAo = float(0).toVar(`${prefix}WeightedAo`)
        const totalWeight = float(0).toVar(`${prefix}TotalWeight`)
        const fallbackAo = float(0).toVar(`${prefix}FallbackAo`)
        const fallbackWeight = float(0).toVar(`${prefix}FallbackWeight`)
        const centerValid = resolveDepth
          .lessThan(float(1))
          .and(resolveDepth.greaterThanEqual(float(0)))
          .and(dot(resolveNormal, resolveNormal).greaterThan(float(0.001)))
          .toVar(`${prefix}CenterValid`)

        JBU4.forEach(([x, y], tapIndex) => {
          const tapCoord = baseCoord.add(vec2(float(x), float(y))).toVar(`${prefix}TapCoord${tapIndex}`)
          const tapUv = tapCoord.add(vec2(0.5)).div(lowResolutionAoSize).toVar(`${prefix}TapUv${tapIndex}`)
          const bilinearX =
            x === 0 ? float(1).sub(bilinearFracX) : bilinearFracX
          const bilinearY =
            y === 0 ? float(1).sub(bilinearFracY) : bilinearFracY
          const bilinearWeight = bilinearX.mul(bilinearY).toVar(`${prefix}BilinearWeight${tapIndex}`)

          If(
            tapUv.x
              .greaterThanEqual(float(0))
              .and(tapUv.x.lessThanEqual(float(1)))
              .and(tapUv.y.greaterThanEqual(float(0)))
              .and(tapUv.y.lessThanEqual(float(1))),
            () => {
              const tapAo = lowResolutionAo.sample(tapUv).r.toVar(`${prefix}TapAo${tapIndex}`)
              fallbackAo.addAssign(tapAo.mul(bilinearWeight))
              fallbackWeight.addAssign(bilinearWeight)

              const tapDepth = sampleDepth(tapUv).toVar(`${prefix}TapDepth${tapIndex}`)
              const tapNormal = sampleNormal(tapUv).toVar(`${prefix}TapNormal${tapIndex}`)
              const tapPosition = getViewPosition(
                tapUv,
                tapDepth,
                this.cameraProjectionMatrixInverse,
              ).toVar(`${prefix}TapPosition${tapIndex}`)
              const tapValid = tapDepth
                .lessThan(float(1))
                .and(tapDepth.greaterThanEqual(float(0)))
                .and(dot(tapNormal, tapNormal).greaterThan(float(0.001)))
              const geometryWeight = computeVbaoBilateralGeometryWeight(
                resolvePosition,
                resolveNormal,
                tapPosition,
                tapNormal,
                this.radiusNode,
                `${prefix}${tapIndex}`,
              )
              const tapWeight = bilinearWeight.mul(geometryWeight).toVar(`${prefix}TapWeight${tapIndex}`)

              If(centerValid.and(tapValid), () => {
                weightedAo.addAssign(tapAo.mul(tapWeight))
                totalWeight.addAssign(tapWeight)
              })
            },
          )
        })

        const resolvedAo = weightedAo.div(max(totalWeight, float(1e-6))).toVar(`${prefix}ResolvedAo`)
        const fallbackResolvedAo = fallbackAo
          .div(max(fallbackWeight, float(1e-6)))
          .toVar(`${prefix}FallbackResolvedAo`)
        return centerValid
          .and(totalWeight.greaterThan(float(1e-5)))
          .select(clamp(resolvedAo, float(0), float(1)), clamp(fallbackResolvedAo, float(0), float(1)))
      }

      const centerDepth = sampleDepth(uvNode).toVar('vbaoResolvePolishCenterDepth')
      const centerNormal = sampleNormal(uvNode).toVar('vbaoResolvePolishCenterNormal')
      const centerPosition = getViewPosition(
        uvNode,
        centerDepth,
        this.cameraProjectionMatrixInverse,
      ).toVar('vbaoResolvePolishCenterPosition')
      const centerValid = centerDepth
        .lessThan(float(1))
        .and(centerDepth.greaterThanEqual(float(0)))
        .and(dot(centerNormal, centerNormal).greaterThan(float(0.001)))
        .toVar('vbaoResolvePolishCenterValid')
      const centerAo = resolveAt(
        uvNode,
        centerDepth,
        centerNormal,
        centerPosition,
        'vbaoResolvePolishCenter',
      ).toVar('vbaoResolvePolishCenterAo')
      const weightedAo = centerAo.mul(float(4)).toVar('vbaoResolvePolishWeightedAo')
      const totalWeight = float(4).toVar('vbaoResolvePolishTotalWeight')
      const minAo = centerAo.toVar('vbaoResolvePolishMinAo')
      const maxAo = centerAo.toVar('vbaoResolvePolishMaxAo')
      const pixel = uvNode.mul(fullResolutionSize).toVar('vbaoResolvePolishPixel')
      const noise = fract(
        float(52.9829189).mul(
          fract(pixel.x.mul(float(0.06711056)).add(pixel.y.mul(float(0.00583715)))),
        ),
      ).toVar('vbaoResolvePolishIgnNoise')
      const noiseAngle = noise.mul(PI.mul(float(2))).toVar('vbaoResolvePolishNoiseAngle')
      const c = cos(noiseAngle).toVar('vbaoResolvePolishRotationCos')
      const s = sin(noiseAngle).toVar('vbaoResolvePolishRotationSin')
      const filterRadius = float(1)
        .add(this.strengthUniform.mul(float(0.75)))
        .toVar('vbaoResolvePolishFilterRadius')

      const visitTap = (x: number, y: number, spatialWeight: number, tapIndex: number) => {
        const offset = vec2(
          float(x).mul(c).sub(float(y).mul(s)),
          float(x).mul(s).add(float(y).mul(c)),
        )
          .mul(filterRadius)
          .toVar(`vbaoResolvePolishRotatedOffset${tapIndex}`)
        const tapUv = uvNode.add(offset.mul(texelSize)).toVar(`vbaoResolvePolishTapUv${tapIndex}`)

        If(
          tapUv.x
            .greaterThanEqual(float(0))
            .and(tapUv.x.lessThanEqual(float(1)))
            .and(tapUv.y.greaterThanEqual(float(0)))
            .and(tapUv.y.lessThanEqual(float(1))),
          () => {
            const tapDepth = sampleDepth(tapUv).toVar(`vbaoResolvePolishTapDepth${tapIndex}`)
            const tapNormal = sampleNormal(tapUv).toVar(`vbaoResolvePolishTapNormal${tapIndex}`)
            const tapPosition = getViewPosition(
              tapUv,
              tapDepth,
              this.cameraProjectionMatrixInverse,
            ).toVar(`vbaoResolvePolishTapPosition${tapIndex}`)
            const tapValid = tapDepth
              .lessThan(float(1))
              .and(tapDepth.greaterThanEqual(float(0)))
              .and(dot(tapNormal, tapNormal).greaterThan(float(0.001)))
            const tapAo = resolveAt(
              tapUv,
              tapDepth,
              tapNormal,
              tapPosition,
              `vbaoResolvePolishTap${tapIndex}`,
            ).toVar(`vbaoResolvePolishTapAo${tapIndex}`)
            const geometryWeight = computeVbaoBilateralGeometryWeight(
              centerPosition,
              centerNormal,
              tapPosition,
              tapNormal,
              this.radiusNode,
              `vbaoResolvePolishPolish${tapIndex}`,
            )
            const tapWeight = geometryWeight
              .mul(float(spatialWeight))
              .toVar(`vbaoResolvePolishTapWeight${tapIndex}`)

            If(centerValid.and(tapValid), () => {
              weightedAo.addAssign(tapAo.mul(tapWeight))
              totalWeight.addAssign(tapWeight)
              minAo.assign(min(minAo, tapAo))
              maxAo.assign(max(maxAo, tapAo))
            })
          },
        )
      }

      POISSON8.forEach(([x, y, spatialWeight], tapIndex) => {
        visitTap(x, y, spatialWeight, tapIndex)
      })

      const meanAo = weightedAo.div(max(totalWeight, float(1e-6))).toVar('vbaoResolvePolishMeanAo')
      const expand = float(0.025)
        .add(float(0.075).mul(this.strengthUniform))
        .toVar('vbaoResolvePolishClampExpand')
      const clampedPolishAo = clamp(meanAo, minAo.sub(expand), maxAo.add(expand)).toVar(
        'vbaoResolvePolishClampedAo',
      )
      const filteredAo = centerAo
        .mul(float(1).sub(this.strengthUniform))
        .add(clampedPolishAo.mul(this.strengthUniform))
        .toVar('vbaoResolvePolishFilteredAo')
      return centerValid.select(filteredAo, centerAo)
    })

    this.material.fragmentNode = resolvePolishKernel()
    this.material.needsUpdate = true

    return this.getPassTextureNode()
  }
}
