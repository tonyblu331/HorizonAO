import {
  HalfFloatType,
  NearestFilter,
  NodeUpdateType,
  NodeMaterial,
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
  Loop,
  abs,
  clamp,
  dot,
  exp2,
  float,
  floor,
  fract,
  getViewPosition,
  int,
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

const resolveQuadMesh = new QuadMesh()
const resolveSize = new Vector2()
let resolveRendererState: ReturnType<typeof RendererUtils.resetRendererState> | undefined

type SampleableNode = Node & {
  sample: (uvCoord: Node) => any
}

/**
 * Temporal-free JBU4 product resolve for raw VBAO.
 *
 * This is the internal product boundary used when low-resolution raw AO needs
 * final AO: it owns bilinear reconstruction manually and rejects cross-edge taps
 * with depth/normal weights instead of relying on texture filtering.
 */
export class VBAOResolveNode extends TempNode<'float'> {
  static get type(): string {
    return 'VBAOResolveNode'
  }

  readonly rawAoNode: TextureNode
  readonly depthNode: SampleableNode
  readonly normalNode: SampleableNode
  readonly camera: Camera
  readonly radiusNode: Node
  updateBeforeType = NodeUpdateType.FRAME

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
  ) {
    super('float')
    this.rawAoNode = rawAoNode
    this.depthNode = depthNode as SampleableNode
    this.normalNode = normalNode as SampleableNode
    this.camera = camera
    this.radiusNode = radiusNode
    this.renderTarget.texture.name = 'VBAO.Resolve'
    this.renderTarget.texture.magFilter = NearestFilter
    this.renderTarget.texture.minFilter = NearestFilter
    this.renderTarget.texture.generateMipmaps = false
    this.renderTarget.texture.colorSpace = NoColorSpace
    this.material.name = 'VBAOResolve'
    this.textureNode = passTexture(this as never, this.renderTarget.texture)
    this.cameraProjectionMatrixInverse = uniform(camera.projectionMatrixInverse)
    this.cameraNear = reference('near', 'float', camera)
    this.cameraFar = reference('far', 'float', camera)
  }

  getTextureNode(): TextureNode {
    return this.textureNode
  }

  setSize(width: number, height: number): void {
    this.renderTarget.setSize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)))
  }

  updateBefore(frame: NodeFrame): boolean | undefined {
    const renderer = frame.renderer
    if (renderer === null || renderer === undefined) return undefined

    resolveRendererState = RendererUtils.resetRendererState(renderer, resolveRendererState as never)

    const drawingBufferSize = renderer.getDrawingBufferSize(resolveSize)
    this.setSize(drawingBufferSize.width, drawingBufferSize.height)

    resolveQuadMesh.material = this.material
    resolveQuadMesh.name = 'VBAOResolve'

    renderer.setClearColor(0xffffff, 1)
    renderer.setRenderTarget(this.renderTarget)
    resolveQuadMesh.render(renderer)

    RendererUtils.restoreRendererState(renderer, resolveRendererState)
    return true
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
              const tapDepth = sampleDepth(tapUv).toVar('vbaoResolveTapDepth')
              const tapNormal = sampleNormal(tapUv).toVar('vbaoResolveTapNormal')
              const tapPosition = getViewPosition(
                tapUv,
                tapDepth,
                this.cameraProjectionMatrixInverse,
              ).toVar('vbaoResolveTapPosition')
              const normalAgreement = clamp(dot(centerNormal, tapNormal), float(0), float(1))
              const planeDistance = abs(dot(tapPosition.sub(centerPosition), centerNormal))
              const depthWeight = exp2(
                planeDistance
                  .negate()
                  .mul(float(24))
                  .div(max(float(this.radiusNode as any), float(1e-3))),
              )
              const normal2 = normalAgreement.mul(normalAgreement).toVar('vbaoResolveNormal2')
              const normal4 = normal2.mul(normal2).toVar('vbaoResolveNormal4')
              const normalWeight = normal4.mul(normal4).toVar('vbaoResolveNormalWeight')
              const tapWeight = bilinearWeight.mul(depthWeight).mul(normalWeight).toVar('vbaoResolveTapWeight')
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
      const fallbackAo = rawAo.sample(uvNode).r
      return centerValid
        .and(totalWeight.greaterThan(float(1e-5)))
        .select(clamp(resolvedAo, float(0), float(1)), fallbackAo)
    })

    this.material.fragmentNode = resolveKernel()
    this.material.needsUpdate = true

    return this.textureNode
  }

  dispose(): void {
    this.renderTarget.dispose()
    this.material.dispose()
  }
}
