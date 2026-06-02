import {
  HalfFloatType,
  NodeUpdateType,
  QuadMesh,
  RedFormat,
  RenderTarget,
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
  float,
  logarithmicDepthToViewZ,
  max,
  min,
  reference,
  texture,
  textureSize,
  uniform,
  uv,
  vec2,
  viewZToPerspectiveDepth,
} from 'three/tsl'

import { VBAOEffectPass } from './VBAOEffectPass'

export interface VBAOVelocityTemporalNodeOptions {
  readonly historyWeight?: number
  readonly depthThreshold?: number
  readonly normalThreshold?: number
  readonly maxVelocityUv?: number
}

const velocityTemporalQuadMesh = new QuadMesh()
const velocityTemporalSize = new Vector2()

type SampleableNode = Node & {
  sample: (uvCoord: Node) => any
}

function clampFinite(value: number, fallback: number, minValue: number, maxValue: number): number {
  return Number.isFinite(value) ? Math.max(minValue, Math.min(maxValue, value)) : fallback
}

/**
 * Private velocity-backed temporal AO accumulation.
 *
 * This consumes host-owned previous depth/normal guide nodes and owns only AO
 * history. It is intentionally not exported from the public package entrypoint.
 */
export class VBAOVelocityTemporalNode extends VBAOEffectPass {
  static get type(): string {
    return 'VBAOVelocityTemporalNode'
  }

  readonly currentAoNode: TextureNode
  readonly currentDepthNode: SampleableNode
  readonly currentNormalNode: SampleableNode
  readonly velocityNode: SampleableNode
  readonly previousDepthNode: SampleableNode
  readonly previousNormalNode: SampleableNode
  readonly camera: Camera
  readonly historyWeight = uniform(0.8)
  readonly depthThreshold = uniform(0.0005)
  readonly normalThreshold = uniform(0.85)
  readonly maxVelocityUv = uniform(0.25)
  readonly resetHistory = uniform(1)
  updateBeforeType = NodeUpdateType.FRAME

  private readonly historyRenderTarget = new RenderTarget(1, 1, {
    depthBuffer: false,
    format: RedFormat,
    type: HalfFloatType,
  })
  private readonly cameraNear
  private readonly cameraFar

  constructor(
    currentAoNode: TextureNode,
    currentDepthNode: Node,
    currentNormalNode: Node,
    velocityNode: Node,
    previousDepthNode: Node,
    previousNormalNode: Node,
    camera: Camera,
    options: VBAOVelocityTemporalNodeOptions = {},
  ) {
    super('VBAO.VelocityTemporal', 'VBAOVelocityTemporal')

    this.currentAoNode = currentAoNode
    this.currentDepthNode = currentDepthNode as SampleableNode
    this.currentNormalNode = currentNormalNode as SampleableNode
    this.velocityNode = velocityNode as SampleableNode
    this.previousDepthNode = previousDepthNode as SampleableNode
    this.previousNormalNode = previousNormalNode as SampleableNode
    this.camera = camera
    this.cameraNear = reference('near', 'float', camera)
    this.cameraFar = reference('far', 'float', camera)
    this.historyRenderTarget.texture.name = 'VBAO.VelocityTemporalHistory'
    this.historyRenderTarget.texture.magFilter = this.renderTarget.texture.magFilter
    this.historyRenderTarget.texture.minFilter = this.renderTarget.texture.minFilter
    this.historyRenderTarget.texture.generateMipmaps = false
    this.historyRenderTarget.texture.colorSpace = this.renderTarget.texture.colorSpace
    this.configure(options)
  }

  configure(options: VBAOVelocityTemporalNodeOptions): void {
    this.historyWeight.value = clampFinite(options.historyWeight ?? this.historyWeight.value, 0.8, 0, 0.95)
    this.depthThreshold.value = clampFinite(options.depthThreshold ?? this.depthThreshold.value, 0.0005, 0, 0.05)
    this.normalThreshold.value = clampFinite(options.normalThreshold ?? this.normalThreshold.value, 0.85, 0, 1)
    this.maxVelocityUv.value = clampFinite(options.maxVelocityUv ?? this.maxVelocityUv.value, 0.25, 0.001, 2)
  }

  reset(): void {
    this.resetHistory.value = 1
  }

  getTextureNode(): TextureNode {
    return this.getPassTextureNode()
  }

  setSize(width: number, height: number): void {
    const nextWidth = Math.max(1, Math.round(width))
    const nextHeight = Math.max(1, Math.round(height))
    const resized =
      this.renderTarget.width !== nextWidth ||
      this.renderTarget.height !== nextHeight ||
      this.historyRenderTarget.width !== nextWidth ||
      this.historyRenderTarget.height !== nextHeight

    super.setSize(nextWidth, nextHeight)
    this.historyRenderTarget.setSize(nextWidth, nextHeight)
    if (resized) this.reset()
  }

  updateBefore(frame: NodeFrame): boolean | undefined {
    const renderer = frame.renderer
    if (renderer === null || renderer === undefined) return undefined

    const rendered = this.renderFullscreenPass(
      frame,
      velocityTemporalSize,
      velocityTemporalQuadMesh,
      'VBAOVelocityTemporal',
    )
    if (rendered !== true) return rendered

    renderer.copyTextureToTexture(this.renderTarget.texture, this.historyRenderTarget.texture)
    this.resetHistory.value = 0
    return true
  }

  setup(builder: any): TextureNode {
    const uvNode = uv()
    const currentAoNode = this.currentAoNode as any
    const currentDepthNode = this.currentDepthNode as any
    const currentNormalNode = this.currentNormalNode as any
    const velocityNode = this.velocityNode as any
    const previousDepthNode = this.previousDepthNode as any
    const previousNormalNode = this.previousNormalNode as any
    const historyAoNode = texture(this.historyRenderTarget.texture)

    const sampleDepth = (node: any, uvCoord: any) => {
      const d = node.sample(uvCoord).r
      if (builder.renderer.logarithmicDepthBuffer === true) {
        const vz = logarithmicDepthToViewZ(d, this.cameraNear, this.cameraFar)
        return viewZToPerspectiveDepth(vz, this.cameraNear, this.cameraFar)
      }
      return d
    }

    const sampleNormal = (node: any, uvCoord: any) => node.sample(uvCoord).rgb.normalize()

    const temporalKernel = (Fn as any)(() => {
      const aoSize = vec2((textureSize as any)(currentAoNode, 0) as any).toVar('vbaoVelocityTemporalAoSize')
      const texelSize = vec2(1).div(aoSize).toVar('vbaoVelocityTemporalTexelSize')
      const currentAo = currentAoNode.sample(uvNode).r.toVar('vbaoVelocityTemporalCurrentAo')
      const currentDepth = sampleDepth(currentDepthNode, uvNode).toVar('vbaoVelocityTemporalCurrentDepth')
      const currentNormal = sampleNormal(currentNormalNode, uvNode).toVar('vbaoVelocityTemporalCurrentNormal')
      const velocityUv = velocityNode
        .sample(uvNode)
        .xy
        .mul(vec2(0.5, -0.5))
        .toVar('vbaoVelocityTemporalOffsetUv')
      const historyUv = uvNode.sub(velocityUv).toVar('vbaoVelocityTemporalHistoryUv')
      const previousDepth = sampleDepth(previousDepthNode, historyUv).toVar('vbaoVelocityTemporalPreviousDepth')
      const previousNormal = sampleNormal(previousNormalNode, historyUv).toVar('vbaoVelocityTemporalPreviousNormal')
      const historyAo = historyAoNode.sample(historyUv).r.toVar('vbaoVelocityTemporalHistoryAo')
      const validUv = historyUv.x
        .greaterThanEqual(float(0))
        .and(historyUv.x.lessThanEqual(float(1)))
        .and(historyUv.y.greaterThanEqual(float(0)))
        .and(historyUv.y.lessThanEqual(float(1)))
        .toVar('vbaoVelocityTemporalValidUv')
      const validDepth = abs(currentDepth.sub(previousDepth))
        .lessThanEqual(this.depthThreshold)
        .toVar('vbaoVelocityTemporalValidDepth')
      const validNormal = dot(currentNormal, previousNormal)
        .greaterThanEqual(this.normalThreshold)
        .toVar('vbaoVelocityTemporalValidNormal')
      const validVelocity = dot(velocityUv, velocityUv)
        .lessThanEqual(this.maxVelocityUv.mul(this.maxVelocityUv))
        .toVar('vbaoVelocityTemporalValidVelocity')
      const validHistory = validUv
        .and(validDepth)
        .and(validNormal)
        .and(validVelocity)
        .and(this.resetHistory.lessThan(float(0.5)))
        .toVar('vbaoVelocityTemporalValidHistory')
      const minAo = currentAo.toVar('vbaoVelocityTemporalMinAo')
      const maxAo = currentAo.toVar('vbaoVelocityTemporalMaxAo')

      const visitNeighbor = (x: number, y: number, tapIndex: number) => {
        const tapUv = uvNode
          .add(vec2(float(x), float(y)).mul(texelSize))
          .toVar(`vbaoVelocityTemporalTapUv${tapIndex}`)

        If(
          tapUv.x
            .greaterThanEqual(float(0))
            .and(tapUv.x.lessThanEqual(float(1)))
            .and(tapUv.y.greaterThanEqual(float(0)))
            .and(tapUv.y.lessThanEqual(float(1))),
          () => {
            const tapAo = currentAoNode.sample(tapUv).r.toVar(`vbaoVelocityTemporalTapAo${tapIndex}`)
            minAo.assign(min(minAo, tapAo))
            maxAo.assign(max(maxAo, tapAo))
          },
        )
      }

      let tapIndex = 0
      for (let x = -1; x <= 1; x += 1) {
        for (let y = -1; y <= 1; y += 1) {
          if (x !== 0 || y !== 0) {
            visitNeighbor(x, y, tapIndex)
            tapIndex += 1
          }
        }
      }

      const clampedHistoryAo = clamp(historyAo, minAo, maxAo).toVar('vbaoVelocityTemporalClampedHistoryAo')
      const weight = validHistory
        .select(this.historyWeight, float(0))
        .toVar('vbaoVelocityTemporalWeight')

      return currentAo.mul(float(1).sub(weight)).add(clampedHistoryAo.mul(weight))
    })

    this.material.fragmentNode = temporalKernel()
    this.material.needsUpdate = true

    return this.getPassTextureNode()
  }

  dispose(): void {
    this.historyRenderTarget.dispose()
    super.dispose()
  }
}
