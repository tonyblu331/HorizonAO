import {
  NodeUpdateType,
  QuadMesh,
  Vector2,
  type Camera,
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

import { computeVbaoBilateralGeometryWeight } from './vbaoBilateralWeight'
import { VBAOEffectPass } from './VBAOEffectPass'
import { clamp01, type Node, type SampleableNode } from './vbaoUtils'

export interface VBAOFullResPolishNodeOptions {
  readonly enabled?: boolean
  readonly strength?: number
  readonly confidenceNode?: TextureNode | undefined
}

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

const fullResPolishQuadMesh = new QuadMesh()
const fullResPolishSize = new Vector2()



/**
 * Optional full-resolution scalar AO polish.
 *
 * This is intentionally not a generic 5x5 grid blur. It uses an eight-tap
 * rotated isotropic stencil and tangent-plane geometry rejection so low-slice
 * VBAO structure is softened without locking the filter to screen axes.
 */
export class VBAOFullResPolishNode extends VBAOEffectPass {
  static get type(): string {
    return 'VBAOFullResPolishNode'
  }

  readonly aoNode: TextureNode
  readonly depthNode: SampleableNode
  readonly normalNode: SampleableNode
  readonly camera: Camera
  readonly radiusNode: Node
  readonly confidenceNode: TextureNode | undefined
  readonly strengthUniform = uniform(1)
  updateBeforeType = NodeUpdateType.FRAME

  enabled: boolean
  strength: number

  private readonly cameraProjectionMatrixInverse
  private readonly cameraNear
  private readonly cameraFar

  constructor(
    aoNode: TextureNode,
    depthNode: Node,
    normalNode: Node,
    camera: Camera,
    radiusNode: Node = uniform(1),
    options: VBAOFullResPolishNodeOptions = {},
  ) {
    super('VBAO.FullResPolish', 'VBAOFullResPolish')

    this.aoNode = aoNode
    this.depthNode = depthNode as SampleableNode
    this.normalNode = normalNode as SampleableNode
    this.camera = camera
    this.radiusNode = radiusNode
    this.confidenceNode = options.confidenceNode
    this.enabled = options.enabled ?? true
    this.strength = clamp01(options.strength ?? 1)
    this.strengthUniform.value = this.strength
    this.cameraProjectionMatrixInverse = uniform(camera.projectionMatrixInverse)
    this.cameraNear = reference('near', 'float', camera)
    this.cameraFar = reference('far', 'float', camera)
  }

  configure(options: VBAOFullResPolishNodeOptions): void {
    this.enabled = options.enabled ?? this.enabled
    this.strength = clamp01(options.strength ?? this.strength)
    this.strengthUniform.value = this.strength
  }

  getTextureNode(): TextureNode {
    return this.enabled ? this.getPassTextureNode() : this.aoNode
  }

  updateBefore(frame: NodeFrame): boolean | undefined {
    if (!this.enabled) return undefined

    return this.renderFullscreenPass(
      frame,
      fullResPolishSize,
      fullResPolishQuadMesh,
      'VBAOFullResPolish',
    )
  }

  setup(builder: any): TextureNode {
    if (!this.enabled) return this.aoNode

    const uvNode = uv()
    const aoNode = this.aoNode as any
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

    const polishKernel = (Fn as any)(() => {
      const aoSize = vec2((textureSize as any)(aoNode, 0) as any).toVar('vbaoFullResPolishAoSize')
      const texelSize = vec2(1).div(aoSize).toVar('vbaoFullResPolishTexelSize')
      const centerAo = aoNode.sample(uvNode).r.toVar('vbaoFullResPolishCenterAo')
      const centerConfidence = (confidence === undefined ? float(1) : confidence.sample(uvNode).r)
        .clamp(0, 1)
        .toVar('vbaoFullResPolishCenterConfidence')
      const centerDepth = sampleDepth(uvNode).toVar('vbaoFullResPolishCenterDepth')
      const centerNormal = sampleNormal(uvNode).toVar('vbaoFullResPolishCenterNormal')
      const centerPosition = getViewPosition(
        uvNode,
        centerDepth,
        this.cameraProjectionMatrixInverse,
      ).toVar('vbaoFullResPolishCenterPosition')
      const centerValid = centerDepth
        .lessThan(float(1))
        .and(centerDepth.greaterThanEqual(float(0)))
        .and(dot(centerNormal, centerNormal).greaterThan(float(0.001)))
        .toVar('vbaoFullResPolishCenterValid')
      const weightedAo = centerAo.mul(float(4)).toVar('vbaoFullResPolishWeightedAo')
      const totalWeight = float(4).toVar('vbaoFullResPolishTotalWeight')
      const minAo = centerAo.toVar('vbaoFullResPolishMinAo')
      const maxAo = centerAo.toVar('vbaoFullResPolishMaxAo')
      const pixel = uvNode.mul(aoSize).toVar('vbaoFullResPolishPixel')
      const noise = fract(
        float(52.9829189).mul(
          fract(pixel.x.mul(float(0.06711056)).add(pixel.y.mul(float(0.00583715)))),
        ),
      ).toVar('vbaoFullResPolishIgnNoise')
      const noiseAngle = noise.mul(PI.mul(float(2))).toVar('vbaoFullResPolishNoiseAngle')
      const c = cos(noiseAngle).toVar('vbaoFullResPolishRotationCos')
      const s = sin(noiseAngle).toVar('vbaoFullResPolishRotationSin')
      const filterRadius = float(1)
        .add(this.strengthUniform.mul(float(0.75)))
        .toVar('vbaoFullResPolishFilterRadius')

      const visitTap = (x: number, y: number, spatialWeight: number, tapIndex: number) => {
        const offset = vec2(
          float(x).mul(c).sub(float(y).mul(s)),
          float(x).mul(s).add(float(y).mul(c)),
        )
          .mul(filterRadius)
          .toVar(`vbaoFullResPolishRotatedOffset${tapIndex}`)
        const tapUv = uvNode.add(offset.mul(texelSize)).toVar(`vbaoFullResPolishTapUv${tapIndex}`)

        If(
          tapUv.x
            .greaterThanEqual(float(0))
            .and(tapUv.x.lessThanEqual(float(1)))
            .and(tapUv.y.greaterThanEqual(float(0)))
            .and(tapUv.y.lessThanEqual(float(1))),
          () => {
            const tapAo = aoNode.sample(tapUv).r.toVar(`vbaoFullResPolishTapAo${tapIndex}`)
            const tapDepth = sampleDepth(tapUv).toVar(`vbaoFullResPolishTapDepth${tapIndex}`)
            const tapNormal = sampleNormal(tapUv).toVar(`vbaoFullResPolishTapNormal${tapIndex}`)
            const tapPosition = getViewPosition(
              tapUv,
              tapDepth,
              this.cameraProjectionMatrixInverse,
            ).toVar(`vbaoFullResPolishTapPosition${tapIndex}`)
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
              `vbaoFullResPolish${tapIndex}`,
            )
            const tapWeight = geometryWeight
              .mul(float(spatialWeight))
              .toVar(`vbaoFullResPolishTapWeight${tapIndex}`)

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

      const meanAo = weightedAo.div(max(totalWeight, float(1e-6))).toVar('vbaoFullResPolishMeanAo')
      const confidenceGuidedStrength = this.strengthUniform
        .mul(float(1).sub(centerConfidence))
        .toVar('vbaoFullResPolishConfidenceGuidedStrength')
      const expand = float(0.025)
        .add(float(0.075).mul(confidenceGuidedStrength))
        .toVar('vbaoFullResPolishClampExpand')
      const clampedPolishAo = clamp(meanAo, minAo.sub(expand), maxAo.add(expand)).toVar(
        'clampedPolishAo',
      )
      const filteredAo = centerAo
        .mul(float(1).sub(confidenceGuidedStrength))
        .add(clampedPolishAo.mul(confidenceGuidedStrength))
        .toVar('vbaoFullResPolishFilteredAo')
      return centerValid.select(filteredAo, centerAo)
    })

    this.material.fragmentNode = polishKernel()
    this.material.needsUpdate = true

    return this.getPassTextureNode()
  }
}
