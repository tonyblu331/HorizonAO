import {
  HalfFloatType,
  Matrix4,
  NearestFilter,
  NodeMaterial,
  NodeUpdateType,
  NoColorSpace,
  QuadMesh,
  RGBAFormat,
  RedFormat,
  RenderTarget,
  RendererUtils,
  TempNode,
  Vector2,
  Vector3,
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
  float,
  getViewPosition,
  int,
  logarithmicDepthToViewZ,
  max,
  min,
  passTexture,
  reference,
  texture,
  textureSize,
  uniform,
  uv,
  vec2,
  vec4,
  viewZToPerspectiveDepth,
} from 'three/tsl'

export interface VBAOTemporalAccumulationNodeOptions {
  readonly enabled?: boolean
  readonly historyWeight?: number
}

const temporalAccumulationQuadMesh = new QuadMesh()
const temporalAccumulationGuideQuadMesh = new QuadMesh()
const temporalAccumulationSize = new Vector2()
const temporalAccumulationCameraPosition = new Vector3()
const temporalAccumulationCameraWorldMatrix = new Matrix4()
const temporalAccumulationCameraWorldMatrixInverse = new Matrix4()
let temporalAccumulationRendererState:
  | ReturnType<typeof RendererUtils.resetRendererState>
  | undefined

type SampleableNode = Node & {
  sample: (uvCoord: Node) => any
}

type TemporalResetReason = 'initial' | 'manual' | 'resize' | 'camera-cut'

function clampHistoryWeight(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(0.95, value)) : 0.8
}

/**
 * Private AO-owned temporal accumulation prototype.
 *
 * This pass is intentionally not exported from the package API. It starts with
 * same-pixel history reuse plus depth/normal validation and a current-frame 3x3
 * clamp. Reprojection is the next Phase 3 step; until then this is prototype
 * plumbing, not promotion evidence.
 */
export class VBAOTemporalAccumulationNode extends TempNode<'float'> {
  static get type(): string {
    return 'VBAOTemporalAccumulationNode'
  }

  readonly currentAoNode: TextureNode
  readonly depthNode: SampleableNode
  readonly normalNode: SampleableNode
  readonly camera: Camera
  readonly historyWeightUniform = uniform(0.8)
  updateBeforeType = NodeUpdateType.FRAME

  enabled: boolean
  historyWeight: number

  private readonly renderTarget = new RenderTarget(1, 1, {
    depthBuffer: false,
    format: RedFormat,
    type: HalfFloatType,
  })
  private readonly historyRenderTarget = new RenderTarget(1, 1, {
    depthBuffer: false,
    format: RedFormat,
    type: HalfFloatType,
  })
  private readonly previousDepthRenderTarget = new RenderTarget(1, 1, {
    depthBuffer: false,
    format: RedFormat,
    type: HalfFloatType,
  })
  private readonly previousNormalRenderTarget = new RenderTarget(1, 1, {
    depthBuffer: false,
    format: RGBAFormat,
    type: HalfFloatType,
  })
  private readonly material = new NodeMaterial()
  private readonly previousDepthMaterial = new NodeMaterial()
  private readonly previousNormalMaterial = new NodeMaterial()
  private readonly textureNode: TextureNode
  private readonly historyTextureNode
  private readonly previousDepthTextureNode
  private readonly previousNormalTextureNode
  private readonly cameraWorldMatrix = uniform(new Matrix4())
  private readonly cameraProjectionMatrixInverse = uniform(new Matrix4())
  private readonly previousCameraWorldMatrixInverse = uniform(new Matrix4())
  private readonly previousCameraProjectionMatrix = uniform(new Matrix4())
  private readonly resetHistoryUniform = uniform(1)
  private readonly depthContinuityThreshold = uniform(0.01)
  private readonly normalContinuityThreshold = uniform(0.8)
  private readonly cameraNear
  private readonly cameraFar
  private resetHistoryOnNextFrame = true
  private pendingResetReason: TemporalResetReason = 'initial'
  private lastAppliedResetReason: TemporalResetReason | 'none' = 'none'
  private readonly previousCameraPosition = new Vector3()
  private hasPreviousCameraPosition = false
  private hasPreviousCameraMatrices = false
  private readonly cameraCutResetDistance = 0.5

  constructor(
    currentAoNode: TextureNode,
    depthNode: Node,
    normalNode: Node,
    camera: Camera,
    options: VBAOTemporalAccumulationNodeOptions = {},
  ) {
    super('float')

    this.currentAoNode = currentAoNode
    this.depthNode = depthNode as SampleableNode
    this.normalNode = normalNode as SampleableNode
    this.camera = camera
    this.enabled = options.enabled ?? true
    this.historyWeight = clampHistoryWeight(options.historyWeight ?? 0.8)
    this.historyWeightUniform.value = this.historyWeight
    this.renderTarget.texture.name = 'VBAO.TemporalAccumulation'
    this.historyRenderTarget.texture.name = 'VBAO.TemporalHistory'

    for (const target of [
      this.renderTarget,
      this.historyRenderTarget,
      this.previousDepthRenderTarget,
      this.previousNormalRenderTarget,
    ]) {
      target.texture.magFilter = NearestFilter
      target.texture.minFilter = NearestFilter
      target.texture.generateMipmaps = false
      target.texture.colorSpace = NoColorSpace
    }

    this.material.name = 'VBAOTemporalAccumulation'
    this.previousDepthMaterial.name = 'VBAOTemporalPreviousDepth'
    this.previousNormalMaterial.name = 'VBAOTemporalPreviousNormal'
    this.textureNode = passTexture(this as never, this.renderTarget.texture)
    this.historyTextureNode = texture(this.historyRenderTarget.texture)
    this.previousDepthRenderTarget.texture.name = 'VBAO.TemporalPreviousDepth'
    this.previousNormalRenderTarget.texture.name = 'VBAO.TemporalPreviousNormal'
    this.previousDepthTextureNode = texture(this.previousDepthRenderTarget.texture)
    this.previousNormalTextureNode = texture(this.previousNormalRenderTarget.texture)
    this.cameraNear = reference('near', 'float', camera)
    this.cameraFar = reference('far', 'float', camera)
    this.updateCameraUniformsBeforeRender()
    this.updatePreviousCameraUniformsAfterRender()
  }

  configure(options: VBAOTemporalAccumulationNodeOptions): void {
    this.enabled = options.enabled ?? this.enabled
    this.historyWeight = clampHistoryWeight(options.historyWeight ?? this.historyWeight)
    this.historyWeightUniform.value = this.historyWeight
  }

  resetHistory(reason: TemporalResetReason = 'manual'): void {
    this.resetHistoryOnNextFrame = true
    this.pendingResetReason = reason
  }

  getTextureNode(): TextureNode {
    return this.enabled ? this.textureNode : this.currentAoNode
  }

  setSize(width: number, height: number): void {
    const nextWidth = Math.max(1, Math.round(width))
    const nextHeight = Math.max(1, Math.round(height))
    if (this.renderTarget.width !== nextWidth || this.renderTarget.height !== nextHeight) {
      this.resetHistory('resize')
    }

    this.renderTarget.setSize(nextWidth, nextHeight)
    this.historyRenderTarget.setSize(nextWidth, nextHeight)
    this.previousDepthRenderTarget.setSize(nextWidth, nextHeight)
    this.previousNormalRenderTarget.setSize(nextWidth, nextHeight)
  }

  getInternalTemporalDiagnostics() {
    return {
      enabled: this.enabled,
      validationMode: 'reproject-depth-normal-clamp',
      historyWeight: this.historyWeight,
      depthContinuityThreshold: this.depthContinuityThreshold.value,
      normalContinuityThreshold: this.normalContinuityThreshold.value,
      cameraCutResetDistance: this.cameraCutResetDistance,
      historyResetPending: this.resetHistoryOnNextFrame,
      pendingResetReason: this.resetHistoryOnNextFrame ? this.pendingResetReason : 'none',
      lastAppliedResetReason: this.lastAppliedResetReason,
      gpuRejectionCounters: 'not-instrumented',
    }
  }

  private updateCameraUniformsBeforeRender(): void {
    this.camera.updateMatrixWorld()
    this.cameraWorldMatrix.value.copy(this.camera.matrixWorld)
    this.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse)

    if (!this.hasPreviousCameraMatrices) {
      this.updatePreviousCameraUniformsAfterRender()
      this.hasPreviousCameraMatrices = true
    }
  }

  private updatePreviousCameraUniformsAfterRender(): void {
    this.previousCameraProjectionMatrix.value.copy(this.camera.projectionMatrix)
    temporalAccumulationCameraWorldMatrix.copy(this.camera.matrixWorld)
    temporalAccumulationCameraWorldMatrixInverse.copy(
      temporalAccumulationCameraWorldMatrix,
    ).invert()
    this.previousCameraWorldMatrixInverse.value.copy(
      temporalAccumulationCameraWorldMatrixInverse,
    )
  }

  private renderGuideHistory(renderer: NonNullable<NodeFrame['renderer']>): void {
    temporalAccumulationGuideQuadMesh.material = this.previousDepthMaterial
    temporalAccumulationGuideQuadMesh.name = 'VBAOTemporalPreviousDepth'
    renderer.setRenderTarget(this.previousDepthRenderTarget)
    temporalAccumulationGuideQuadMesh.render(renderer)

    temporalAccumulationGuideQuadMesh.material = this.previousNormalMaterial
    temporalAccumulationGuideQuadMesh.name = 'VBAOTemporalPreviousNormal'
    renderer.setRenderTarget(this.previousNormalRenderTarget)
    temporalAccumulationGuideQuadMesh.render(renderer)
  }

  updateBefore(frame: NodeFrame): boolean | undefined {
    if (!this.enabled) return undefined

    const renderer = frame.renderer
    if (renderer === null || renderer === undefined) return undefined

    temporalAccumulationRendererState = RendererUtils.resetRendererState(
      renderer,
      temporalAccumulationRendererState as never,
    )

    const drawingBufferSize = renderer.getDrawingBufferSize(temporalAccumulationSize)
    this.setSize(drawingBufferSize.width, drawingBufferSize.height)
    this.updateCameraUniformsBeforeRender()
    this.camera.getWorldPosition(temporalAccumulationCameraPosition)
    if (
      !this.hasPreviousCameraPosition ||
      temporalAccumulationCameraPosition.distanceTo(this.previousCameraPosition) >
        this.cameraCutResetDistance
    ) {
      this.resetHistory('camera-cut')
    }
    this.previousCameraPosition.copy(temporalAccumulationCameraPosition)
    this.hasPreviousCameraPosition = true

    temporalAccumulationQuadMesh.material = this.material
    temporalAccumulationQuadMesh.name = 'VBAOTemporalAccumulation'

    const resetHistoryThisFrame = this.resetHistoryOnNextFrame
    this.lastAppliedResetReason = resetHistoryThisFrame ? this.pendingResetReason : 'none'
    this.resetHistoryUniform.value = resetHistoryThisFrame ? 1 : 0
    renderer.setClearColor(0xffffff, 1)
    renderer.setRenderTarget(this.renderTarget)
    temporalAccumulationQuadMesh.render(renderer)

    if (resetHistoryThisFrame) {
      renderer.copyTextureToTexture((this.currentAoNode as any).value, this.historyRenderTarget.texture)
      this.resetHistoryOnNextFrame = false
    } else {
      renderer.copyTextureToTexture(this.renderTarget.texture, this.historyRenderTarget.texture)
    }
    this.renderGuideHistory(renderer)
    this.updatePreviousCameraUniformsAfterRender()

    RendererUtils.restoreRendererState(renderer, temporalAccumulationRendererState)
    return true
  }

  setup(builder: any): TextureNode {
    if (!this.enabled) return this.currentAoNode

    const uvNode = uv()
    const currentAo = this.currentAoNode as any
    const historyAo = this.historyTextureNode as any
    const previousDepthHistory = this.previousDepthTextureNode as any
    const previousNormalHistory = this.previousNormalTextureNode as any
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

    const temporalKernel = (Fn as any)(() => {
      const currentAoValue = currentAo.sample(uvNode).r.toVar('vbaoTemporalCurrentAo')
      const currentDepth = sampleDepth(uvNode).toVar('vbaoTemporalCurrentDepth')
      const currentNormal = sampleNormal(uvNode).toVar('vbaoTemporalCurrentNormal')
      const currentViewPosition = getViewPosition(
        uvNode,
        currentDepth,
        this.cameraProjectionMatrixInverse,
      ).toVar('vbaoTemporalCurrentViewPosition')
      const currentWorldPosition = this.cameraWorldMatrix
        .mul(vec4(currentViewPosition, float(1)))
        .toVar('vbaoTemporalCurrentWorldPosition')
      const previousViewPosition = this.previousCameraWorldMatrixInverse
        .mul(currentWorldPosition)
        .toVar('vbaoTemporalPreviousViewPosition')
      const previousClipPosition = this.previousCameraProjectionMatrix
        .mul(previousViewPosition)
        .toVar('vbaoTemporalPreviousClipPosition')
      const previousNdc = previousClipPosition.xy
        .div(max(previousClipPosition.w, float(1e-6)))
        .toVar('vbaoTemporalPreviousNdc')
      const previousUv = vec2(
        previousNdc.x.mul(float(0.5)).add(float(0.5)),
        previousNdc.y.mul(float(-0.5)).add(float(0.5)),
      ).toVar('vbaoTemporalPreviousUv')
      const previousUvValid = previousUv.x
        .greaterThanEqual(float(0))
        .and(previousUv.x.lessThanEqual(float(1)))
        .and(previousUv.y.greaterThanEqual(float(0)))
        .and(previousUv.y.lessThanEqual(float(1)))
        .and(previousClipPosition.w.greaterThan(float(1e-6)))
        .toVar('vbaoTemporalPreviousUvValid')
      const historyAoValue = historyAo.sample(previousUv).r.toVar('vbaoTemporalHistoryAo')
      const previousDepth = previousDepthHistory
        .sample(previousUv)
        .r.toVar('vbaoTemporalPreviousDepth')
      const previousNormal = previousNormalHistory
        .sample(previousUv)
        .rgb.normalize()
        .toVar('vbaoTemporalPreviousNormal')
      const expectedPreviousDepth = viewZToPerspectiveDepth(
        previousViewPosition.z,
        this.cameraNear,
        this.cameraFar,
      ).toVar('vbaoTemporalExpectedPreviousDepth')
      const currentWorldNormal = this.cameraWorldMatrix
        .mul(vec4(currentNormal, float(0)))
        .xyz.normalize()
        .toVar('vbaoTemporalCurrentWorldNormal')
      const currentPreviousViewNormal = this.previousCameraWorldMatrixInverse
        .mul(vec4(currentWorldNormal, float(0)))
        .xyz.normalize()
        .toVar('vbaoTemporalCurrentPreviousViewNormal')
      const depthContinuity = abs(previousDepth.sub(expectedPreviousDepth))
        .lessThanEqual(this.depthContinuityThreshold)
        .toVar('vbaoTemporalDepthContinuity')
      const normalContinuity = dot(previousNormal, currentPreviousViewNormal)
        .greaterThanEqual(this.normalContinuityThreshold)
        .toVar('vbaoTemporalNormalContinuity')
      const currentFrameValid = currentDepth
        .lessThan(float(1))
        .and(currentDepth.greaterThanEqual(float(0)))
        .and(dot(currentNormal, currentNormal).greaterThan(float(0.001)))
        .toVar('vbaoTemporalCurrentFrameValid')
      const historyValid = previousUvValid
        .and(currentFrameValid)
        .and(depthContinuity)
        .and(normalContinuity)
        .and(this.resetHistoryUniform.lessThan(float(0.5)))
        .toVar('vbaoTemporalHistoryValid')
      const currentSize = vec2((textureSize as any)(currentAo, 0) as any).toVar(
        'vbaoTemporalCurrentSize',
      )
      const texelSize = vec2(1).div(currentSize).toVar('vbaoTemporalTexelSize')
      const minAo = currentAoValue.toVar('vbaoTemporalNeighborhoodMinAo')
      const maxAo = currentAoValue.toVar('vbaoTemporalNeighborhoodMaxAo')

      ;(Loop as any)({ start: int(-1), end: int(2), type: 'int', condition: '<', name: 'oy' }, ({ oy }: any) => {
        ;(Loop as any)({ start: int(-1), end: int(2), type: 'int', condition: '<', name: 'ox' }, ({ ox }: any) => {
          const tapUv = uvNode
            .add(vec2(float(ox), float(oy)).mul(texelSize))
            .toVar('vbaoTemporalNeighborhoodTapUv')

          If(
            tapUv.x
              .greaterThanEqual(float(0))
              .and(tapUv.x.lessThanEqual(float(1)))
              .and(tapUv.y.greaterThanEqual(float(0)))
              .and(tapUv.y.lessThanEqual(float(1))),
            () => {
              const tapAo = currentAo.sample(tapUv).r.toVar('vbaoTemporalNeighborhoodTapAo')
              minAo.assign(min(minAo, tapAo))
              maxAo.assign(max(maxAo, tapAo))
            },
          )
        })
      })

      const clampedHistoryAo = clamp(
        historyAoValue,
        minAo.sub(float(0.025)),
        maxAo.add(float(0.025)),
      ).toVar('vbaoTemporalClampedHistoryAo')
      const blendedAo = currentAoValue
        .mul(float(1).sub(this.historyWeightUniform))
        .add(clampedHistoryAo.mul(this.historyWeightUniform))
        .toVar('vbaoTemporalBlendedAo')

      return historyValid.select(blendedAo, currentAoValue)
    })

    this.material.fragmentNode = temporalKernel()
    this.material.needsUpdate = true

    const depthGuideKernel = (Fn as any)(() => sampleDepth(uvNode))
    const normalGuideKernel = (Fn as any)(() => vec4(sampleNormal(uvNode), float(1)))
    this.previousDepthMaterial.fragmentNode = depthGuideKernel()
    this.previousNormalMaterial.fragmentNode = normalGuideKernel()
    this.previousDepthMaterial.needsUpdate = true
    this.previousNormalMaterial.needsUpdate = true

    return this.textureNode
  }

  dispose(): void {
    this.renderTarget.dispose()
    this.historyRenderTarget.dispose()
    this.previousDepthRenderTarget.dispose()
    this.previousNormalRenderTarget.dispose()
    this.material.dispose()
    this.previousDepthMaterial.dispose()
    this.previousNormalMaterial.dispose()
  }
}
