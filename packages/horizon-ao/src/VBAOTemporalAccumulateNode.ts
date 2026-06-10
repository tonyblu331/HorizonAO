/**
 * Public opt-in temporal AO accumulation node.
 *
 * Extends {@link VBAOEffectPass} to own a RG16F ping-pong history pair:
 * - R channel: accumulated AO
 * - G channel: reliability counter (4-bit, 0–15)
 *
 * PR2 features (over PR1 stub):
 * - Per-pixel GPU depth-reprojection via reprojection matrix uniform (WARNING-1 fix)
 * - Validity gating: UV bounds + relative-depth 5% + normal-dot 0.906 (forced α=1 on any failure)
 * - Confidence-adaptive α: α = mix(min, max, 1 - confidence), confidence from raw.g bilinear
 * - 4-bit TSVGF reliability counter packed in G channel of RG16F history
 * - 3×3 AABB variance clamping on history before blending
 *
 * Pass ordering decision (recorded per task 1.1.1):
 * Temporal accumulate is the TERMINAL stage of the receiver product graph,
 * running AFTER cleanup → resolve → polish.
 */

import {
  HalfFloatType,
  Matrix4,
  NearestFilter,
  NoColorSpace,
  QuadMesh,
  RenderTarget,
  RendererUtils,
  RGFormat,
  Vector2,
  type Camera,
  type NodeFrame,
  type TextureNode,
} from 'three/webgpu'
import {
  abs,
  clamp,
  dot,
  float,
  Fn,
  getViewPosition,
  If,
  logarithmicDepthToViewZ,
  max,
  min,
  mix,
  normalize,
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
import type { VBAOTemporalOptions } from './vbaoConstants'

const quadMesh = new QuadMesh()
const size = new Vector2()

/**
 * Reprojection validity thresholds (per spec §Depth-Reprojection Validity).
 */
const REPROJ_REL_DEPTH_THRESHOLD = 0.05 as const
const REPROJ_NORMAL_DOT_THRESHOLD = 0.906 as const

/**
 * Public, opt-in temporal AO accumulation node.
 *
 * Renders accumulated AO into the base-class renderTarget (format patched to
 * RG16F at construction). A single historyTarget holds the previous frame's
 * result; after each render the output is copied into historyTarget.
 *
 * The constructor requires:
 *   - `productAoNode` — resolved/polished full-res product AO
 *   - `rawAoNode` — half-res raw RG texture (G = confidence, bilinear)
 *   - `depthNode` — current-frame depth texture
 *   - `normalNode` — current-frame normal texture
 *   - `camera` — active Three.js camera (provides projection/view matrices)
 *   - `options` — VBAOTemporalOptions (mode, alpha, reliabilityCounter)
 */
export class VBAOTemporalAccumulateNode extends VBAOEffectPass {
  static get type(): string {
    return 'VBAOTemporalAccumulateNode'
  }

  /** Input: the resolved/polished full-res product AO texture. */
  readonly productAoNode: TextureNode

  /** Input: half-res raw RG texture (G channel = confidence, bilinear at full-res UV). */
  readonly rawAoNode: TextureNode

  /** Input: current-frame depth texture for view-position reconstruction. */
  readonly depthNode: TextureNode

  /** Input: current-frame normal texture for validity gating. */
  readonly normalNode: TextureNode

  private readonly camera: Camera
  private readonly options: Readonly<Required<Pick<VBAOTemporalOptions, 'alpha'>> & { reliabilityCounter: boolean }>
  private readonly historyTarget: RenderTarget

  /** CPU-side reprojection matrix: proj_prev * view_prev * view_curr_inv */
  private readonly reprojMatrix = new Matrix4()
  /** Previous frame's view-projection (view * proj) for next-frame reprojection. */
  private readonly prevViewMatrix = new Matrix4()
  private readonly prevProjMatrix = new Matrix4()
  private hasPrevFrame = false

  private isFirstFrame = true
  private lastWidth = 0
  private lastHeight = 0

  // ---------------------------------------------------------------------------
  // TSL uniforms — updated in updateBefore each frame
  // ---------------------------------------------------------------------------

  /** Column-major mat4: proj_prev * view_prev * view_curr_inv, uploaded each frame. */
  private readonly reprojMatrixUniform = uniform(new Matrix4())
  /** Inverse of current projection matrix for view-position reconstruction. */
  private readonly projInvUniform: ReturnType<typeof uniform>
  private readonly cameraNear: ReturnType<typeof reference>
  private readonly cameraFar: ReturnType<typeof reference>

  constructor(
    productAoNode: TextureNode,
    rawAoNode: TextureNode,
    depthNode: TextureNode,
    normalNode: TextureNode,
    camera: Camera,
    options: VBAOTemporalOptions,
  ) {
    if (options === null || options === undefined || (options as any).mode === undefined || (options as any).mode === null) {
      throw new TypeError(
        'VBAOTemporalAccumulateNode: temporal.mode is required.',
      )
    }

    if (options.mode === 'velocity') {
      throw new TypeError(
        'VBAOTemporalAccumulateNode: mode="velocity" is not yet implemented (PR3). ' +
          'Use mode="depth-reprojection" for PR1/PR2.',
      )
    }

    super('VBAO.TemporalAccumulate', 'VBAOTemporalAccumulate')

    this.productAoNode = productAoNode
    this.rawAoNode = rawAoNode
    this.depthNode = depthNode
    this.normalNode = normalNode
    this.camera = camera

    this.options = {
      alpha: options.alpha ?? { min: 0.05, max: 0.25 },
      reliabilityCounter: options.reliabilityCounter !== false,
    }

    this.projInvUniform = uniform(camera.projectionMatrixInverse)
    this.cameraNear = reference('near', 'float', camera)
    this.cameraFar = reference('far', 'float', camera)

    // Patch the base-class render target to RG16F (R=AO, G=reliability counter).
    this.renderTarget.texture.format = RGFormat
    this.renderTarget.texture.name = 'VBAO.TemporalAccumulate'

    // Single history target: holds the previous frame's accumulated (AO, counter).
    this.historyTarget = this.createHistoryTarget('VBAO.TemporalHistory')
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

  private getHistoryTextureNode(): TextureNode {
    return texture(this.historyTarget.texture)
  }

  override setSize(width: number, height: number): void {
    const w = Math.max(1, Math.round(width))
    const h = Math.max(1, Math.round(height))

    if (w !== this.lastWidth || h !== this.lastHeight) {
      this.historyTarget.setSize(w, h)
      this.lastWidth = w
      this.lastHeight = h
      // Reset history on resize — next frame is a cold start (α forced to 1).
      this.isFirstFrame = true
      this.hasPrevFrame = false
    }

    super.setSize(w, h)
  }

  override updateBefore(frame: NodeFrame): boolean | undefined {
    const renderer = frame.renderer
    if (renderer === null || renderer === undefined) return undefined

    const rendererState = RendererUtils.resetRendererState(renderer, undefined as never)

    const drawingBufferSize = renderer.getDrawingBufferSize(size)
    this.setSize(drawingBufferSize.width, drawingBufferSize.height)

    // Build the reprojection matrix on CPU:
    //   reproj = proj_prev * view_prev * view_curr_inv
    // where view = camera.matrixWorldInverse (Three.js column-major).
    if (this.hasPrevFrame) {
      // view_curr_inv = camera.matrixWorld (inverse of matrixWorldInverse)
      // We compute: proj_prev * (view_prev * matrixWorld_curr)
      const viewCurrInv = this.camera.matrixWorld
      const temp = new Matrix4().multiplyMatrices(this.prevViewMatrix, viewCurrInv)
      this.reprojMatrix.multiplyMatrices(this.prevProjMatrix, temp)
      this.reprojMatrixUniform.value = this.reprojMatrix
    } else {
      // First frame: use identity so prevUV = uvNode (maps to itself — will fail validity)
      this.reprojMatrixUniform.value = new Matrix4()
    }

    // Snapshot current-frame matrices for use as prev-frame next frame.
    this.prevViewMatrix.copy(this.camera.matrixWorldInverse)
    this.prevProjMatrix.copy(this.camera.projectionMatrix)
    this.hasPrevFrame = true

    // Update projInv uniform (camera.projectionMatrixInverse is live on the camera).
    this.projInvUniform.value = this.camera.projectionMatrixInverse

    quadMesh.material = this.material
    quadMesh.name = 'VBAOTemporalAccumulate'

    renderer.setClearColor(0xffffff, 1)
    renderer.setRenderTarget(this.renderTarget)
    quadMesh.render(renderer)

    // Copy the freshly-rendered (AO, counter) into historyTarget for next frame.
    renderer.copyTextureToTexture(this.renderTarget.texture, this.historyTarget.texture)

    this.isFirstFrame = false

    RendererUtils.restoreRendererState(renderer, rendererState)
    return true
  }

  override setup(builder: any): TextureNode {
    const uvNode = uv()
    const isFirstFrameUniform = uniform(this.isFirstFrame ? 1.0 : 0.0)

    // Retrieve all input textures.
    const productAo = (this.productAoNode as any).sample(uvNode)
    const currentAo = productAo.r.toVar('vbaoTemporalCurrentAo')

    const historyTex = this.getHistoryTextureNode()
    const rawAoTex = this.rawAoNode as any

    // Confidence from raw.g (bilinear half-res → full-res, acceptable per design decision).
    const confidence = rawAoTex.sample(uvNode).g.toVar('vbaoTemporalConfidence')

    // Depth and normal inputs for reprojection validity.
    const depthTex = this.depthNode as any
    const normalTex = this.normalNode as any

    const sampleDepth = (node: any, uvCoord: any): any => {
      const d = node.sample(uvCoord).r
      if (builder.renderer?.logarithmicDepthBuffer === true) {
        const vz = logarithmicDepthToViewZ(d, this.cameraNear, this.cameraFar)
        return viewZToPerspectiveDepth(vz, this.cameraNear, this.cameraFar)
      }
      return d
    }

    const temporalKernel = (Fn as any)(() => {
      // -------------------------------------------------------------------
      // 3×3 AABB — gather neighborhood min/max of current-frame AO
      // -------------------------------------------------------------------
      const aoSize = vec2((textureSize as any)(this.productAoNode, 0) as any).toVar('vbaoTemporalAoSize')
      const texelSize = vec2(1).div(aoSize).toVar('vbaoTemporalTexelSize')

      const minAo = currentAo.toVar('vbaoTemporalMinAo')
      const maxAo = currentAo.toVar('vbaoTemporalMaxAo')

      const visitNeighbor = (x: number, y: number, tapIdx: number) => {
        const tapUv = uvNode
          .add(vec2(float(x), float(y)).mul(texelSize))
          .toVar(`vbaoTemporalTapUv${tapIdx}`)
        If(
          tapUv.x
            .greaterThanEqual(float(0))
            .and(tapUv.x.lessThanEqual(float(1)))
            .and(tapUv.y.greaterThanEqual(float(0)))
            .and(tapUv.y.lessThanEqual(float(1))),
          () => {
            const tapAo = (this.productAoNode as any).sample(tapUv).r.toVar(`vbaoTemporalTapAo${tapIdx}`)
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

      // -------------------------------------------------------------------
      // Per-pixel GPU reprojection: reconstruct view position, apply reproj matrix
      // -------------------------------------------------------------------
      const currentDepth = sampleDepth(depthTex, uvNode).toVar('vbaoTemporalCurrentDepth')
      const P_view = getViewPosition(uvNode, currentDepth, this.projInvUniform).toVar('vbaoTemporalPView')

      // Compute prevUV via reproj matrix: P_prev_clip = reprojMatrix * vec4(P_view, 1)
      const reprojNode = this.reprojMatrixUniform as any
      const P4 = vec4(P_view.x, P_view.y, P_view.z, float(1))
      const P_prev_clip = (reprojNode.mul(P4 as any) as any).toVar('vbaoTemporalPPrevClip')
      const invW = float(1).div(P_prev_clip.w.add(float(1e-8))).toVar('vbaoTemporalInvW')
      const prevUV = P_prev_clip.xy.mul(invW).mul(float(0.5)).add(float(0.5)).toVar('vbaoTemporalPrevUv')

      // -------------------------------------------------------------------
      // Validity sub-test 1: prevUV in [0,1]²
      // -------------------------------------------------------------------
      const validUv = prevUV.x
        .greaterThanEqual(float(0))
        .and(prevUV.x.lessThanEqual(float(1)))
        .and(prevUV.y.greaterThanEqual(float(0)))
        .and(prevUV.y.lessThanEqual(float(1)))
        .toVar('vbaoTemporalValidUv')

      // -------------------------------------------------------------------
      // Validity sub-test 2: relative depth < 0.05
      // -------------------------------------------------------------------
      const prevDepth = sampleDepth(depthTex, prevUV).toVar('vbaoTemporalPrevDepth')
      const relDepth = abs(currentDepth.sub(prevDepth))
        .div(max(currentDepth, float(1e-8)))
        .toVar('vbaoTemporalRelDepth')
      const validDepth = relDepth.lessThan(float(REPROJ_REL_DEPTH_THRESHOLD)).toVar('vbaoTemporalValidDepth')

      // -------------------------------------------------------------------
      // Validity sub-test 3: normal dot > 0.906
      // -------------------------------------------------------------------
      const currentNormal = normalTex.sample(uvNode).rgb.normalize().toVar('vbaoTemporalCurrentNormal')
      const prevNormal = normalTex.sample(prevUV).rgb.normalize().toVar('vbaoTemporalPrevNormal')
      const normalDot = dot(currentNormal, prevNormal).toVar('vbaoTemporalNormalDot')
      const validNormal = normalDot.greaterThan(float(REPROJ_NORMAL_DOT_THRESHOLD)).toVar('vbaoTemporalValidNormal')

      // Combined validity — forced-α when any sub-test fails.
      const validHistory = validUv
        .and(validDepth)
        .and(validNormal)
        .and(isFirstFrameUniform.lessThan(float(0.5)))
        .toVar('vbaoTemporalValidHistory')

      // -------------------------------------------------------------------
      // History sample at prevUV + AABB clamp
      // -------------------------------------------------------------------
      const historyRG = historyTex.sample(prevUV).toVar('vbaoTemporalHistoryRG')
      const historyAo = historyRG.r.toVar('vbaoTemporalHistoryAo')
      const historyCounter = historyRG.g.toVar('vbaoTemporalHistoryCounter')

      const AABB_PAD = 0.05 as const
      const clampedHistoryAo = clamp(historyAo, minAo.sub(float(AABB_PAD)), maxAo.add(float(AABB_PAD))).toVar('vbaoTemporalClampedHistoryAo')

      // -------------------------------------------------------------------
      // Reliability counter update (4-bit, saturate at 15, reset on invalid)
      // -------------------------------------------------------------------
      const newCounter = (validHistory as any)
        .select(min(historyCounter.add(float(1)), float(15)), float(0))
        .toVar('vbaoTemporalNewCounter')

      // counterScale: 1 - counter/15 → full history trust when counter=15
      const counterScale = float(1).sub(newCounter.div(float(15))).toVar('vbaoTemporalCounterScale')

      // -------------------------------------------------------------------
      // Confidence-adaptive α: mix(min, max, 1 - confidence)
      // Spec: α = mix(alpha.min, alpha.max, 1.0 - confidence)
      // Then: override to 1.0 on validity failure; also factor in counterScale.
      // -------------------------------------------------------------------
      const alphaMin = float(this.options.alpha.min)
      const alphaMax = float(this.options.alpha.max)
      const adaptAlpha = mix(alphaMin, alphaMax, float(1).sub(confidence)).toVar('vbaoTemporalAdaptAlpha')

      // Apply counter scale: blend alpha ↑ during warmup frames
      const warmupAlpha = max(adaptAlpha, counterScale).toVar('vbaoTemporalWarmupAlpha')

      // On invalid: force α=1 (discard history entirely per spec)
      const blendAlpha = (validHistory as any)
        .select(warmupAlpha, float(1))
        .toVar('vbaoTemporalBlendAlpha')

      // EMA blend: lerp(clampedHistory, current, alpha)
      const accumulatedAo = mix(clampedHistoryAo, currentAo, blendAlpha).toVar('vbaoTemporalAccumulatedAo')

      // Output: (accumulated AO, reliability counter)
      return vec4(accumulatedAo, newCounter, float(0), float(1))
    })

    this.material.fragmentNode = (temporalKernel as any)().context(
      builder.getSharedContext(),
    )
    this.material.needsUpdate = true

    return this.getPassTextureNode()
  }

  getTextureNode(): TextureNode {
    return this.getPassTextureNode()
  }

  override dispose(): void {
    this.historyTarget.dispose()
    super.dispose()
  }
}
