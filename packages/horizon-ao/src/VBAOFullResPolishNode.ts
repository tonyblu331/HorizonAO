import {
  HalfFloatType,
  NearestFilter,
  NodeMaterial,
  NodeUpdateType,
  NoColorSpace,
  QuadMesh,
  RedFormat,
  RenderTarget,
  RendererUtils,
  TempNode,
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
  abs,
  clamp,
  cos,
  dot,
  exp2,
  float,
  fract,
  getViewPosition,
  logarithmicDepthToViewZ,
  max,
  min,
  passTexture,
  reference,
  sin,
  textureSize,
  uniform,
  uv,
  vec2,
  viewZToPerspectiveDepth,
} from 'three/tsl'

export interface VBAOFullResPolishNodeOptions {
  readonly enabled?: boolean
  readonly strength?: number
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
let fullResPolishRendererState: ReturnType<typeof RendererUtils.resetRendererState> | undefined

type SampleableNode = Node & {
  sample: (uvCoord: Node) => any
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1
}

/**
 * Optional full-resolution scalar AO polish.
 *
 * This is intentionally not a generic 5x5 grid blur. It uses an eight-tap
 * rotated isotropic stencil and tangent-plane geometry rejection so low-slice
 * VBAO structure is softened without locking the filter to screen axes.
 */
export class VBAOFullResPolishNode extends TempNode<'float'> {
  static get type(): string {
    return 'VBAOFullResPolishNode'
  }

  readonly aoNode: TextureNode
  readonly depthNode: SampleableNode
  readonly normalNode: SampleableNode
  readonly camera: Camera
  readonly radiusNode: Node
  readonly strengthUniform = uniform(1)
  updateBeforeType = NodeUpdateType.FRAME

  enabled: boolean
  strength: number

  protected readonly renderTarget = new RenderTarget(1, 1, {
    depthBuffer: false,
    format: RedFormat,
    type: HalfFloatType,
  })
  protected readonly material = new NodeMaterial()
  protected readonly textureNode: TextureNode
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
    super('float')

    this.aoNode = aoNode
    this.depthNode = depthNode as SampleableNode
    this.normalNode = normalNode as SampleableNode
    this.camera = camera
    this.radiusNode = radiusNode
    this.enabled = options.enabled ?? true
    this.strength = clamp01(options.strength ?? 1)
    this.strengthUniform.value = this.strength
    this.renderTarget.texture.name = 'VBAO.FullResPolish'
    this.renderTarget.texture.magFilter = NearestFilter
    this.renderTarget.texture.minFilter = NearestFilter
    this.renderTarget.texture.generateMipmaps = false
    this.renderTarget.texture.colorSpace = NoColorSpace
    this.material.name = 'VBAOFullResPolish'
    this.textureNode = passTexture(this as never, this.renderTarget.texture)
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
    return this.enabled ? this.textureNode : this.aoNode
  }

  setSize(width: number, height: number): void {
    this.renderTarget.setSize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)))
  }

  updateBefore(frame: NodeFrame): boolean | undefined {
    if (!this.enabled) return undefined

    const renderer = frame.renderer
    if (renderer === null || renderer === undefined) return undefined

    fullResPolishRendererState = RendererUtils.resetRendererState(
      renderer,
      fullResPolishRendererState as never,
    )

    const drawingBufferSize = renderer.getDrawingBufferSize(fullResPolishSize)
    this.setSize(drawingBufferSize.width, drawingBufferSize.height)

    fullResPolishQuadMesh.material = this.material
    fullResPolishQuadMesh.name = 'VBAOFullResPolish'

    renderer.setClearColor(0xffffff, 1)
    renderer.setRenderTarget(this.renderTarget)
    fullResPolishQuadMesh.render(renderer)

    RendererUtils.restoreRendererState(renderer, fullResPolishRendererState)
    return true
  }

  setup(builder: any): TextureNode {
    if (!this.enabled) return this.aoNode

    const uvNode = uv()
    const aoNode = this.aoNode as any
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
            const normalAgreement = max(float(0), dot(centerNormal, tapNormal))
            const planeDistance = abs(dot(tapPosition.sub(centerPosition), centerNormal)).toVar(
              `vbaoFullResPolishPlaneDistance${tapIndex}`,
            )
            const depthWeight = exp2(
              planeDistance
                .negate()
                .mul(float(24))
                .div(max(float(this.radiusNode as any), float(1e-3))),
            )
            const normal2 = normalAgreement
              .mul(normalAgreement)
              .toVar(`vbaoFullResPolishNormal2${tapIndex}`)
            const normal4 = normal2.mul(normal2).toVar(`vbaoFullResPolishNormal4${tapIndex}`)
            const normalWeight = normal4
              .mul(normal4)
              .toVar(`vbaoFullResPolishNormalWeight${tapIndex}`)
            const tapWeight = depthWeight
              .mul(normalWeight)
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
      const expand = float(0.025)
        .add(float(0.075).mul(this.strengthUniform))
        .toVar('vbaoFullResPolishClampExpand')
      const clampedPolishAo = clamp(meanAo, minAo.sub(expand), maxAo.add(expand)).toVar(
        'clampedPolishAo',
      )
      const filteredAo = centerAo
        .mul(float(1).sub(this.strengthUniform))
        .add(clampedPolishAo.mul(this.strengthUniform))
        .toVar('vbaoFullResPolishFilteredAo')
      return centerValid.select(filteredAo, centerAo)
    })

    this.material.fragmentNode = polishKernel()
    this.material.needsUpdate = true

    return this.textureNode
  }

  dispose(): void {
    this.renderTarget.dispose()
    this.material.dispose()
  }
}
