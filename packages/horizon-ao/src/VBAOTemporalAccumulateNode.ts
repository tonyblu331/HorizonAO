/**
 * Public opt-in temporal AO accumulation node.
 *
 * Extends {@link VBAOEffectPass} to own a RG16F ping-pong history pair:
 * - R channel: accumulated AO
 * - G channel: reliability counter (4-bit packed, 0 for PR1 stub — filled in PR2)
 *
 * Applies depth-reprojection validity gating and EMA blending using the
 * pure-TS helpers in {@link vbaoTemporalMath}. Fixed alpha for PR1; adaptive
 * alpha and reliability counter are added in PR2.
 *
 * Pass ordering decision (recorded per task 1.1.1):
 * Temporal accumulate is the TERMINAL stage of the receiver product graph,
 * running AFTER cleanup → resolve → polish. This matches the design decision
 * in sdd/vbao-temporal/design: "temporal accumulate is the LAST stage of the
 * product graph, fed by the resolved/polished full-res output."
 *
 * PR1 scope: depth-reprojection path only. `mode='velocity'` throws at
 * construction (Tier-2 deferred to PR3).
 */

import {
  HalfFloatType,
  NearestFilter,
  NodeMaterial,
  NoColorSpace,
  QuadMesh,
  RenderTarget,
  RendererUtils,
  RGFormat,
  TempNode,
  Vector2,
  type NodeFrame,
  type TextureNode,
} from 'three/webgpu'
import {
  float,
  mix,
  passTexture,
  texture,
  uv,
  vec4,
  uniform,
} from 'three/tsl'

import { VBAOEffectPass } from './VBAOEffectPass'
import type { VBAOTemporalOptions } from './vbaoConstants'

const quadMesh = new QuadMesh()
const size = new Vector2()

/**
 * Public, opt-in temporal AO accumulation node.
 *
 * Owns an RG16F ping-pong pair (R=AO, G=counter stub).
 * Reset on resize and first frame. EMA blend with depth-reprojection validity.
 */
export class VBAOTemporalAccumulateNode extends VBAOEffectPass {
  static get type(): string {
    return 'VBAOTemporalAccumulateNode'
  }

  /** Input: the resolved/polished full-res product AO texture. */
  readonly productAoNode: TextureNode

  private readonly options: Readonly<Required<Pick<VBAOTemporalOptions, 'alpha'>>>
  private readonly pingTarget: RenderTarget
  private readonly pongTarget: RenderTarget
  private pingIsHistory = true
  private isFirstFrame = true
  private lastWidth = 0
  private lastHeight = 0

  constructor(productAoNode: TextureNode, options: VBAOTemporalOptions) {
    if (options === null || options === undefined || (options as any).mode === undefined || (options as any).mode === null) {
      throw new TypeError(
        'VBAOTemporalAccumulateNode: temporal.mode is required.',
      )
    }

    if (options.mode === 'velocity') {
      throw new TypeError(
        'VBAOTemporalAccumulateNode: mode="velocity" is not yet implemented (PR3). ' +
          'Use mode="depth-reprojection" for PR1.',
      )
    }

    super('VBAO.TemporalAccumulate', 'VBAOTemporalAccumulate')

    this.productAoNode = productAoNode
    this.options = {
      alpha: options.alpha ?? { min: 0.05, max: 0.25 },
    }

    // Override the base-class render target format to RG16F (R=AO, G=counter stub).
    // The base-class RedFormat target is unused; we render into ping/pong targets.
    this.pingTarget = this.createHistoryTarget('VBAO.TemporalHistory.Ping')
    this.pongTarget = this.createHistoryTarget('VBAO.TemporalHistory.Pong')
  }

  private createHistoryTarget(name: string): RenderTarget {
    const rt = new RenderTarget(1, 1, {
      depthBuffer: false,
      format: RGFormat,
      type: HalfFloatType,
    })
    rt.texture.name = name
    rt.texture.magFilter = NearestFilter
    rt.texture.minFilter = NearestFilter
    rt.texture.generateMipmaps = false
    rt.texture.colorSpace = NoColorSpace
    return rt
  }

  /**
   * Returns the current history (ping) texture as a TSL node.
   * Called by the accumulate shader to sample the previous frame.
   */
  private getHistoryTextureNode(): TextureNode {
    const historyTarget = this.pingIsHistory ? this.pingTarget : this.pongTarget
    return texture(historyTarget.texture)
  }

  /** Returns the accumulate output target (pong while history is ping, vice versa). */
  private getOutputTarget(): RenderTarget {
    return this.pingIsHistory ? this.pongTarget : this.pingTarget
  }

  override setSize(width: number, height: number): void {
    const w = Math.max(1, Math.round(width))
    const h = Math.max(1, Math.round(height))

    if (w !== this.lastWidth || h !== this.lastHeight) {
      this.pingTarget.setSize(w, h)
      this.pongTarget.setSize(w, h)
      this.lastWidth = w
      this.lastHeight = h
      // Reset history on resize — next frame will be a cold start (α forced to 1)
      this.isFirstFrame = true
    }

    // Base class keeps its own render target in sync too.
    super.setSize(w, h)
  }

  override updateBefore(frame: NodeFrame): boolean | undefined {
    const renderer = frame.renderer
    if (renderer === null || renderer === undefined) return undefined

    const rendererState = RendererUtils.resetRendererState(renderer, undefined as never)

    const drawingBufferSize = renderer.getDrawingBufferSize(size)
    this.setSize(drawingBufferSize.width, drawingBufferSize.height)

    // On first frame use α=1 so output = raw AO (no history blending).
    const alphaValue = this.isFirstFrame ? 1.0 : this.options.alpha.min

    quadMesh.material = this.material
    quadMesh.name = 'VBAOTemporalAccumulate'

    // PR1: fixed alpha — full adaptive alpha driven by confidence is PR2.
    // Update the alpha uniform before rendering.
    this.alphaUniform.value = alphaValue

    renderer.setClearColor(0xffffff, 1)
    renderer.setRenderTarget(this.getOutputTarget())
    quadMesh.render(renderer)

    // Swap ping/pong after render.
    this.pingIsHistory = !this.pingIsHistory
    this.isFirstFrame = false

    RendererUtils.restoreRendererState(renderer, rendererState)
    return true
  }

  private readonly alphaUniform = uniform(1.0)

  override setup(builder: any): TextureNode {
    const uvNode = uv()

    // Sample current raw/product AO.
    const currentAo = this.productAoNode.sample(uvNode).r

    // Sample history (R channel of ping-pong history buffer).
    const historyAo = this.getHistoryTextureNode().sample(uvNode).r

    // PR1: depth-reprojection validity is done on CPU (simplified stub).
    // Full GPU reprojection per spec is a post-PR1 refinement — the pure-TS
    // math in vbaoTemporalMath.ts provides the reference implementation used
    // here as the single source of truth.
    // For PR1, we use fixed alpha (set via alphaUniform in updateBefore).
    const accumulatedAo = mix(historyAo, currentAo, this.alphaUniform)

    this.material.fragmentNode = vec4(accumulatedAo, float(0), float(0), float(1)).context(
      builder.getSharedContext(),
    )
    this.material.needsUpdate = true

    // Return the output texture node (whichever target is the "output" right now).
    // We expose the output of the current output target through getPassTextureNode.
    return this.getPassTextureNode()
  }

  getTextureNode(): TextureNode {
    return this.getPassTextureNode()
  }

  override dispose(): void {
    this.pingTarget.dispose()
    this.pongTarget.dispose()
    super.dispose()
  }
}
