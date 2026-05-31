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
  abs,
  clamp,
  dot,
  exp2,
  float,
  getViewPosition,
  logarithmicDepthToViewZ,
  max,
  passTexture,
  reference,
  textureSize,
  uniform,
  uv,
  vec2,
  viewZToPerspectiveDepth,
} from 'three/tsl'

export interface VBAOHalfResCleanupNodeOptions {
  readonly enabled?: boolean
  readonly strength?: number
  readonly resolutionScale?: number
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
let halfResCleanupRendererState: ReturnType<typeof RendererUtils.resetRendererState> | undefined

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
 */
export class VBAOHalfResCleanupNode extends TempNode<'float'> {
  static get type(): string {
    return 'VBAOHalfResCleanupNode'
  }

  readonly rawAoNode: TextureNode
  readonly depthNode: SampleableNode
  readonly normalNode: SampleableNode
  readonly camera: Camera
  readonly radiusNode: Node
  readonly strengthUniform = uniform(1)
  updateBeforeType = NodeUpdateType.FRAME

  enabled: boolean
  strength: number
  resolutionScale: number

  private readonly renderTarget = new RenderTarget(1, 1, {
    depthBuffer: false,
    format: RedFormat,
    type: HalfFloatType,
  })
  private readonly material = new NodeMaterial()
  private readonly textureNode: TextureNode
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
    super('float')

    this.rawAoNode = rawAoNode
    this.depthNode = depthNode as SampleableNode
    this.normalNode = normalNode as SampleableNode
    this.camera = camera
    this.radiusNode = radiusNode
    this.enabled = options.enabled ?? true
    this.strength = clamp01(options.strength ?? 1)
    this.resolutionScale = clampResolutionScale(options.resolutionScale ?? 0.5)
    this.strengthUniform.value = this.strength
    this.renderTarget.texture.name = 'VBAO.HalfResCleanup'
    this.renderTarget.texture.magFilter = NearestFilter
    this.renderTarget.texture.minFilter = NearestFilter
    this.renderTarget.texture.generateMipmaps = false
    this.renderTarget.texture.colorSpace = NoColorSpace
    this.material.name = 'VBAOHalfResCleanup'
    this.textureNode = passTexture(this as never, this.renderTarget.texture)
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
    return this.enabled ? this.textureNode : this.rawAoNode
  }

  setSize(width: number, height: number): void {
    this.renderTarget.setSize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)))
  }

  updateBefore(frame: NodeFrame): boolean | undefined {
    if (!this.enabled) return undefined

    const renderer = frame.renderer
    if (renderer === null || renderer === undefined) return undefined

    halfResCleanupRendererState = RendererUtils.resetRendererState(
      renderer,
      halfResCleanupRendererState as never,
    )

    const drawingBufferSize = renderer.getDrawingBufferSize(halfResCleanupSize)
    this.setSize(
      drawingBufferSize.width * this.resolutionScale,
      drawingBufferSize.height * this.resolutionScale,
    )

    halfResCleanupQuadMesh.material = this.material
    halfResCleanupQuadMesh.name = 'VBAOHalfResCleanup'

    renderer.setClearColor(0xffffff, 1)
    renderer.setRenderTarget(this.renderTarget)
    halfResCleanupQuadMesh.render(renderer)

    RendererUtils.restoreRendererState(renderer, halfResCleanupRendererState)
    return true
  }

  setup(builder: any): TextureNode {
    if (!this.enabled) return this.rawAoNode

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

    const cleanupKernel = (Fn as any)(() => {
      const rawSize = vec2((textureSize as any)(rawAo, 0) as any).toVar('vbaoHalfResCleanupRawSize')
      const texelSize = vec2(1).div(rawSize).toVar('vbaoHalfResCleanupTexelSize')
      const centerAo = rawAo.sample(uvNode).r.toVar('vbaoHalfResCleanupCenterAo')
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
            const normalAgreement = clamp(dot(centerNormal, tapNormal), float(0), float(1))
            const planeDistance = abs(dot(tapPosition.sub(centerPosition), centerNormal)).toVar(
              `vbaoHalfResCleanupPlaneDistance${tapIndex}`,
            )
            const depthWeight = exp2(
              planeDistance
                .negate()
                .mul(float(24))
                .div(max(float(this.radiusNode as any), float(1e-3))),
            )
            const normal2 = normalAgreement
              .mul(normalAgreement)
              .toVar(`vbaoHalfResCleanupNormal2${tapIndex}`)
            const normal4 = normal2.mul(normal2).toVar(`vbaoHalfResCleanupNormal4${tapIndex}`)
            const normalWeight = normal4
              .mul(normal4)
              .toVar(`vbaoHalfResCleanupNormalWeight${tapIndex}`)
            const tapWeight = depthWeight
              .mul(normalWeight)
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
      const filteredAo = centerAo
        .mul(float(1).sub(this.strengthUniform))
        .add(cleanedAo.mul(this.strengthUniform))
        .toVar('vbaoHalfResCleanupFilteredAo')
      return centerValid.select(clamp(filteredAo, float(0), float(1)), centerAo)
    })

    this.material.fragmentNode = cleanupKernel()
    this.material.needsUpdate = true

    return this.textureNode
  }

  dispose(): void {
    this.renderTarget.dispose()
    this.material.dispose()
  }
}
