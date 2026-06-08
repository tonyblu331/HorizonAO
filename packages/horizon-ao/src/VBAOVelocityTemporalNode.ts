import {
  HalfFloatType,
  NearestFilter,
  NodeMaterial,
  NodeUpdateType,
  NoColorSpace,
  QuadMesh,
  RGBAFormat,
  RedFormat,
  RenderTarget,
  RendererUtils,
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
  vec4,
  viewZToPerspectiveDepth,
} from 'three/tsl'

import { VBAOEffectPass } from './VBAOEffectPass'

export interface VBAOVelocityTemporalNodeOptions {
  readonly historyWeight?: number
  readonly depthThreshold?: number
  readonly normalThreshold?: number
  readonly maxVelocityUv?: number
}

export interface VBAOVelocityTemporalDiagnostics {
  readonly frame: number
  readonly resetCount: number
  readonly lastResetFrame: number
  readonly lastResetReason: string
  readonly renderTargetName: string
  readonly resolution: {
    readonly width: number
    readonly height: number
  }
  readonly encodedReasonBits: {
    readonly reset: number
    readonly viewport: number
    readonly depth: number
    readonly normal: number
    readonly velocity: number
    readonly clampHistoryRange: number
  }
  readonly channels: {
    readonly r: 'reasonBitsNormalizedBy63'
    readonly g: 'depthDelta'
    readonly b: 'normalDot'
    readonly a: 'velocityLengthSquared'
  }
}

export interface VBAOVelocityTemporalTargetInventory {
  readonly currentAo: {
    readonly owner: 'VBAONode'
    readonly source: 'product-or-reconstruction-output'
    readonly lifetime: 'active-vbao-pipeline'
  }
  readonly aoHistory: {
    readonly owner: 'VBAOVelocityTemporalNode'
    readonly name: 'VBAO.VelocityTemporalHistory'
    readonly format: 'RedFormat'
    readonly type: 'HalfFloatType'
    readonly lifetime: 'reset-on-first-frame-resize-explicit-reset'
  }
  readonly diagnostics: {
    readonly owner: 'VBAOVelocityTemporalNode'
    readonly name: 'VBAO.VelocityTemporalDiagnostics'
    readonly format: 'RGBAFormat'
    readonly type: 'HalfFloatType'
    readonly lifetime: 'active-vbao-pipeline'
  }
  readonly velocity: {
    readonly owner: 'host-pass'
    readonly source: 'mrt-velocity'
    readonly convention: 'historyUv = uv - velocity.xy * vec2(0.5, -0.5)'
    readonly lifetime: 'host-pass-current-frame'
  }
  readonly previousDepth: {
    readonly owner: 'host-pass'
    readonly source: "PassNode.getPreviousTextureNode('depth')"
    readonly lifetime: 'host-pass-previous-frame'
  }
  readonly previousNormal: {
    readonly owner: 'host-pass'
    readonly source: "PassNode.getPreviousTextureNode('output')"
    readonly lifetime: 'host-pass-previous-frame'
  }
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
 *
 * RETENTION (P0 decision, 2026-06-08): this node is INTENTIONALLY KEPT, not dead
 * code. It is wired into the demo `velocity-internal` temporal mode and the
 * `verify-vbao-temporal-gate` evidence harness, and is the base for the committed
 * P6 mask-reservoir temporal work. The temporal verifier currently returns
 * `reject-promotion`, so it stays private/internal — but it must NOT be archived or
 * deleted by future fat-trim passes. See
 * `openspec/changes/vbao-foundation-reconciliation/branch-reconciliation.md`.
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
  private readonly diagnosticsRenderTarget = new RenderTarget(1, 1, {
    depthBuffer: false,
    format: RGBAFormat,
    type: HalfFloatType,
  })
  private readonly diagnosticsMaterial = new NodeMaterial()
  private readonly cameraNear
  private readonly cameraFar
  private diagnosticsRendererState: ReturnType<typeof RendererUtils.resetRendererState> | undefined
  private diagnosticsFrame = 0
  private resetCount = 1
  private lastResetFrame = 0
  private lastResetReason = 'first-frame'

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
    this.diagnosticsRenderTarget.texture.name = 'VBAO.VelocityTemporalDiagnostics'
    this.diagnosticsRenderTarget.texture.magFilter = NearestFilter
    this.diagnosticsRenderTarget.texture.minFilter = NearestFilter
    this.diagnosticsRenderTarget.texture.generateMipmaps = false
    this.diagnosticsRenderTarget.texture.colorSpace = NoColorSpace
    this.diagnosticsMaterial.name = 'VBAOVelocityTemporalDiagnostics'
    this.configure(options)
  }

  configure(options: VBAOVelocityTemporalNodeOptions): void {
    this.historyWeight.value = clampFinite(options.historyWeight ?? this.historyWeight.value, 0.8, 0, 0.95)
    this.depthThreshold.value = clampFinite(options.depthThreshold ?? this.depthThreshold.value, 0.0005, 0, 0.05)
    this.normalThreshold.value = clampFinite(options.normalThreshold ?? this.normalThreshold.value, 0.85, 0, 1)
    this.maxVelocityUv.value = clampFinite(options.maxVelocityUv ?? this.maxVelocityUv.value, 0.25, 0.001, 2)
  }

  reset(reason = 'explicit'): void {
    this.resetHistory.value = 1
    this.resetCount += 1
    this.lastResetFrame = this.diagnosticsFrame
    this.lastResetReason = reason
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
    this.diagnosticsRenderTarget.setSize(nextWidth, nextHeight)
    if (resized) this.reset('resize')
  }

  getDiagnostics(): VBAOVelocityTemporalDiagnostics {
    return {
      frame: this.diagnosticsFrame,
      resetCount: this.resetCount,
      lastResetFrame: this.lastResetFrame,
      lastResetReason: this.lastResetReason,
      renderTargetName: this.diagnosticsRenderTarget.texture.name,
      resolution: {
        width: this.diagnosticsRenderTarget.width,
        height: this.diagnosticsRenderTarget.height,
      },
      encodedReasonBits: {
        reset: 1,
        viewport: 2,
        depth: 4,
        normal: 8,
        velocity: 16,
        clampHistoryRange: 32,
      },
      channels: {
        r: 'reasonBitsNormalizedBy63',
        g: 'depthDelta',
        b: 'normalDot',
        a: 'velocityLengthSquared',
      },
    }
  }

  getTargetInventory(): VBAOVelocityTemporalTargetInventory {
    return {
      currentAo: {
        owner: 'VBAONode',
        source: 'product-or-reconstruction-output',
        lifetime: 'active-vbao-pipeline',
      },
      aoHistory: {
        owner: 'VBAOVelocityTemporalNode',
        name: 'VBAO.VelocityTemporalHistory',
        format: 'RedFormat',
        type: 'HalfFloatType',
        lifetime: 'reset-on-first-frame-resize-explicit-reset',
      },
      diagnostics: {
        owner: 'VBAOVelocityTemporalNode',
        name: 'VBAO.VelocityTemporalDiagnostics',
        format: 'RGBAFormat',
        type: 'HalfFloatType',
        lifetime: 'active-vbao-pipeline',
      },
      velocity: {
        owner: 'host-pass',
        source: 'mrt-velocity',
        convention: 'historyUv = uv - velocity.xy * vec2(0.5, -0.5)',
        lifetime: 'host-pass-current-frame',
      },
      previousDepth: {
        owner: 'host-pass',
        source: "PassNode.getPreviousTextureNode('depth')",
        lifetime: 'host-pass-previous-frame',
      },
      previousNormal: {
        owner: 'host-pass',
        source: "PassNode.getPreviousTextureNode('output')",
        lifetime: 'host-pass-previous-frame',
      },
    }
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

    this.renderDiagnosticsPass(frame, velocityTemporalSize, velocityTemporalQuadMesh)

    renderer.copyTextureToTexture(this.renderTarget.texture, this.historyRenderTarget.texture)
    this.resetHistory.value = 0
    this.diagnosticsFrame += 1
    return true
  }

  private renderDiagnosticsPass(
    frame: NodeFrame,
    size: Vector2,
    quadMesh: QuadMesh,
  ): boolean | undefined {
    const renderer = frame.renderer
    if (renderer === null || renderer === undefined) return undefined

    this.diagnosticsRendererState = RendererUtils.resetRendererState(
      renderer,
      this.diagnosticsRendererState as never,
    )

    const drawingBufferSize = renderer.getDrawingBufferSize(size)
    this.setSize(drawingBufferSize.width, drawingBufferSize.height)

    quadMesh.material = this.diagnosticsMaterial
    quadMesh.name = 'VBAOVelocityTemporalDiagnostics'

    renderer.setClearColor(0x000000, 1)
    renderer.setRenderTarget(this.diagnosticsRenderTarget)
    quadMesh.render(renderer)

    RendererUtils.restoreRendererState(renderer, this.diagnosticsRendererState)
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

    const diagnosticsKernel = (Fn as any)(() => {
      const currentDepth = sampleDepth(currentDepthNode, uvNode).toVar('vbaoVelocityTemporalDiagCurrentDepth')
      const currentNormal = sampleNormal(currentNormalNode, uvNode).toVar('vbaoVelocityTemporalDiagCurrentNormal')
      const velocityUv = velocityNode
        .sample(uvNode)
        .xy
        .mul(vec2(0.5, -0.5))
        .toVar('vbaoVelocityTemporalDiagOffsetUv')
      const historyUv = uvNode.sub(velocityUv).toVar('vbaoVelocityTemporalDiagHistoryUv')
      const previousDepth = sampleDepth(previousDepthNode, historyUv).toVar('vbaoVelocityTemporalDiagPreviousDepth')
      const previousNormal = sampleNormal(previousNormalNode, historyUv).toVar('vbaoVelocityTemporalDiagPreviousNormal')
      const historyAo = historyAoNode.sample(historyUv).r.toVar('vbaoVelocityTemporalDiagHistoryAo')
      const validUv = historyUv.x
        .greaterThanEqual(float(0))
        .and(historyUv.x.lessThanEqual(float(1)))
        .and(historyUv.y.greaterThanEqual(float(0)))
        .and(historyUv.y.lessThanEqual(float(1)))
        .toVar('vbaoVelocityTemporalDiagValidUv')
      const depthDelta = abs(currentDepth.sub(previousDepth)).toVar('vbaoVelocityTemporalDiagDepthDelta')
      const normalDot = dot(currentNormal, previousNormal).toVar('vbaoVelocityTemporalDiagNormalDot')
      const velocityLengthSquared = dot(velocityUv, velocityUv).toVar('vbaoVelocityTemporalDiagVelocityLengthSquared')
      const validDepth = depthDelta.lessThanEqual(this.depthThreshold).toVar('vbaoVelocityTemporalDiagValidDepth')
      const validNormal = normalDot.greaterThanEqual(this.normalThreshold).toVar('vbaoVelocityTemporalDiagValidNormal')
      const validVelocity = velocityLengthSquared
        .lessThanEqual(this.maxVelocityUv.mul(this.maxVelocityUv))
        .toVar('vbaoVelocityTemporalDiagValidVelocity')
      const validHistory = validUv
        .and(validDepth)
        .and(validNormal)
        .and(validVelocity)
        .and(this.resetHistory.lessThan(float(0.5)))
        .toVar('vbaoVelocityTemporalDiagValidHistory')
      const minAo = currentAoNode.sample(uvNode).r.toVar('vbaoVelocityTemporalDiagMinAo')
      const maxAo = currentAoNode.sample(uvNode).r.toVar('vbaoVelocityTemporalDiagMaxAo')

      const visitNeighbor = (x: number, y: number, tapIndex: number) => {
        const tapUv = uvNode
          .add(vec2(float(x), float(y)).mul(vec2(1).div(vec2((textureSize as any)(currentAoNode, 0) as any))))
          .toVar(`vbaoVelocityTemporalDiagTapUv${tapIndex}`)

        If(
          tapUv.x
            .greaterThanEqual(float(0))
            .and(tapUv.x.lessThanEqual(float(1)))
            .and(tapUv.y.greaterThanEqual(float(0)))
            .and(tapUv.y.lessThanEqual(float(1))),
          () => {
            const tapAo = currentAoNode.sample(tapUv).r.toVar(`vbaoVelocityTemporalDiagTapAo${tapIndex}`)
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

      const clampedHistoryAo = clamp(historyAo, minAo, maxAo).toVar('vbaoVelocityTemporalDiagClampedHistoryAo')
      const reasonBits = float(0).toVar('vbaoVelocityTemporalDiagReasonBits')

      If(this.resetHistory.greaterThanEqual(float(0.5)), () => {
        reasonBits.addAssign(float(1))
      })
      If(validUv.not(), () => {
        reasonBits.addAssign(float(2))
      })
      If(validDepth.not(), () => {
        reasonBits.addAssign(float(4))
      })
      If(validNormal.not(), () => {
        reasonBits.addAssign(float(8))
      })
      If(validVelocity.not(), () => {
        reasonBits.addAssign(float(16))
      })
      If(validHistory.and(abs(historyAo.sub(clampedHistoryAo)).greaterThan(float(0.00001))), () => {
        reasonBits.addAssign(float(32))
      })

      return vec4(reasonBits.div(float(63)), depthDelta, normalDot, velocityLengthSquared)
    })

    this.material.fragmentNode = temporalKernel()
    this.diagnosticsMaterial.fragmentNode = diagnosticsKernel()
    this.material.needsUpdate = true
    this.diagnosticsMaterial.needsUpdate = true

    return this.getPassTextureNode()
  }

  dispose(): void {
    this.historyRenderTarget.dispose()
    this.diagnosticsRenderTarget.dispose()
    this.diagnosticsMaterial.dispose()
    super.dispose()
  }
}
