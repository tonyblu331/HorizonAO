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
  Loop,
  abs,
  clamp,
  dot,
  exp2,
  float,
  floor,
  getViewPosition,
  int,
  logarithmicDepthToViewZ,
  max,
  mix,
  reference,
  textureSize,
  uniform,
  uv,
  vec2,
  viewZToPerspectiveDepth,
} from 'three/tsl'

import { computeVbaoBilateralGeometryWeight } from './vbaoBilateralWeight'
import { VBAOEffectPass } from './VBAOEffectPass'
import { clamp01, type Node, type SampleableNode } from './vbaoUtils'

export interface VBAOMergedResolveNodeOptions {
  readonly strength?: number
  readonly confidenceNode?: TextureNode | undefined
}

/**
 * Spatial Gaussian falloff (per half-res texel²) for the wide gather lobe.
 *
 * Sized so the bilinear quad keeps near-unit weight while the surrounding ring
 * contributes the extra smoothing that the standalone half-res cleanup pass
 * used to provide. Not a public knob.
 */
const MERGED_RESOLVE_SPATIAL_SHARPNESS = 1.0

/**
 * P4 evidence-flag prototype: half-res cleanup + JBU resolve folded into ONE
 * full-resolution pass.
 *
 * The standalone path runs `VBAOHalfResCleanupNode` (3x3 edge-aware filter at
 * half-res) and then `VBAOResolveNode` (2x2 JBU upsample to full-res) as two
 * passes with two render targets. This node reproduces both endpoints in a
 * single full-resolution gather from the half-res raw AO:
 *
 * - a TIGHT lobe — the bilinear quad weighted by JBU geometry weights — equals
 *   `VBAOResolveNode`'s primary output (the softness-0 behavior), with the same
 *   bilinear fallback when geometry weights collapse;
 * - a WIDE lobe — a 3x3 Gaussian-plus-geometry gather — reproduces the extra
 *   smoothing the cleanup pass contributed;
 * - the two are blended by `strength * (1 - confidence)`, the same
 *   confidence-guided strength the cleanup pass used.
 *
 * At strength 0 the output is the tight JBU (resolve-only); at strength 1 with
 * low confidence it leans on the wide gather (cleanup-then-resolve). Kept
 * internal and behind a demo/benchmark evidence flag so the merged vs separate
 * reconstruction can be compared before either is promoted.
 *
 * Fullscreen pass plumbing is shared via {@link VBAOEffectPass}; this node
 * always resolves to full output resolution.
 */
export class VBAOMergedResolveNode extends VBAOEffectPass {
  static get type(): string {
    return 'VBAOMergedResolveNode'
  }

  readonly rawAoNode: TextureNode
  readonly depthNode: SampleableNode
  readonly normalNode: SampleableNode
  readonly camera: Camera
  readonly radiusNode: Node
  readonly confidenceNode: TextureNode | undefined
  readonly strengthUniform = uniform(1)
  updateBeforeType = NodeUpdateType.FRAME

  strength: number

  private readonly cameraProjectionMatrixInverse
  private readonly cameraNear
  private readonly cameraFar

  constructor(
    rawAoNode: TextureNode,
    depthNode: Node,
    normalNode: Node,
    camera: Camera,
    radiusNode: Node = uniform(1),
    options: VBAOMergedResolveNodeOptions = {},
  ) {
    super('VBAO.MergedResolve', 'VBAOMergedResolve')

    this.rawAoNode = rawAoNode
    this.depthNode = depthNode as SampleableNode
    this.normalNode = normalNode as SampleableNode
    this.camera = camera
    this.radiusNode = radiusNode
    this.confidenceNode = options.confidenceNode
    this.strength = clamp01(options.strength ?? 1)
    this.strengthUniform.value = this.strength
    this.cameraProjectionMatrixInverse = uniform(camera.projectionMatrixInverse)
    this.cameraNear = reference('near', 'float', camera)
    this.cameraFar = reference('far', 'float', camera)
  }

  configure(options: VBAOMergedResolveNodeOptions): void {
    this.strength = clamp01(options.strength ?? this.strength)
    this.strengthUniform.value = this.strength
  }

  getTextureNode(): TextureNode {
    return this.getPassTextureNode()
  }

  updateBefore(frame: NodeFrame): boolean | undefined {
    return this.renderFullscreenPass(
      frame,
      mergedResolveSize,
      mergedResolveQuadMesh,
      'VBAOMergedResolve',
    )
  }

  setup(builder: any): TextureNode {
    const uvNode = uv()
    const rawAo = this.rawAoNode as any
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

    const mergedKernel = (Fn as any)(() => {
      const centerDepth = sampleDepth(uvNode).toVar('vbaoMergedResolveCenterDepth')
      const centerNormal = sampleNormal(uvNode).toVar('vbaoMergedResolveCenterNormal')
      const centerPosition = getViewPosition(
        uvNode,
        centerDepth,
        this.cameraProjectionMatrixInverse,
      ).toVar('vbaoMergedResolveCenterPosition')
      const centerConfidence = (confidence === undefined ? float(1) : confidence.sample(uvNode).g)
        .clamp(0, 1)
        .toVar('vbaoMergedResolveCenterConfidence')
      const centerValid = centerDepth
        .lessThan(float(1))
        .and(centerDepth.greaterThanEqual(float(0)))
        .and(dot(centerNormal, centerNormal).greaterThan(float(0.001)))
        .toVar('vbaoMergedResolveCenterValid')

      const rawSize = vec2((textureSize as any)(rawAo, 0) as any).toVar('vbaoMergedResolveRawSize')
      const rawCoord = uvNode.mul(rawSize).sub(vec2(0.5)).toVar('vbaoMergedResolveRawCoord')
      const centerTexel = floor(rawCoord.add(vec2(0.5))).toVar('vbaoMergedResolveCenterTexel')

      // Tight lobe = bilinear-quad JBU (equals VBAOResolveNode primary output).
      const tightAo = float(0).toVar('vbaoMergedResolveTightAo')
      const tightWeight = float(0).toVar('vbaoMergedResolveTightWeight')
      // Wide lobe = 3x3 Gaussian + geometry gather (the cleanup contribution).
      const wideAo = float(0).toVar('vbaoMergedResolveWideAo')
      const wideWeight = float(0).toVar('vbaoMergedResolveWideWeight')
      // Pure bilinear upsample fallback (equals VBAOResolveNode fallback).
      const fallbackAo = float(0).toVar('vbaoMergedResolveFallbackAo')
      const fallbackWeight = float(0).toVar('vbaoMergedResolveFallbackWeight')

      ;(Loop as any)(
        { start: int(-1), end: int(2), type: 'int', condition: '<', name: 'oy' },
        ({ oy }: any) => {
          ;(Loop as any)(
            { start: int(-1), end: int(2), type: 'int', condition: '<', name: 'ox' },
            ({ ox }: any) => {
              const tapCoord = centerTexel
                .add(vec2(float(ox), float(oy)))
                .toVar('vbaoMergedResolveTapCoord')
              const tapUv = tapCoord.add(vec2(0.5)).div(rawSize).toVar('vbaoMergedResolveTapUv')

              If(
                tapUv.x
                  .greaterThanEqual(float(0))
                  .and(tapUv.x.lessThanEqual(float(1)))
                  .and(tapUv.y.greaterThanEqual(float(0)))
                  .and(tapUv.y.lessThanEqual(float(1))),
                () => {
                  const offset = tapCoord.sub(rawCoord).toVar('vbaoMergedResolveOffset')
                  // Bilinear tent: nonzero only for the quad straddling the pixel,
                  // so the tight lobe reproduces bilinear/JBU exactly.
                  const bilinearWeight = max(float(0), float(1).sub(abs(offset.x)))
                    .mul(max(float(0), float(1).sub(abs(offset.y))))
                    .toVar('vbaoMergedResolveBilinearWeight')
                  const dist2 = dot(offset, offset).toVar('vbaoMergedResolveDist2')
                  const gaussianWeight = exp2(
                    dist2.mul(float(-MERGED_RESOLVE_SPATIAL_SHARPNESS)),
                  ).toVar('vbaoMergedResolveGaussianWeight')

                  const tapAo = rawAo.sample(tapUv).r.toVar('vbaoMergedResolveTapAo')
                  fallbackAo.addAssign(tapAo.mul(bilinearWeight))
                  fallbackWeight.addAssign(bilinearWeight)

                  const tapDepth = sampleDepth(tapUv).toVar('vbaoMergedResolveTapDepth')
                  const tapNormal = sampleNormal(tapUv).toVar('vbaoMergedResolveTapNormal')
                  const tapPosition = getViewPosition(
                    tapUv,
                    tapDepth,
                    this.cameraProjectionMatrixInverse,
                  ).toVar('vbaoMergedResolveTapPosition')
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
                    'vbaoMergedResolve',
                  )

                  If(centerValid.and(tapValid), () => {
                    const tightTapWeight = bilinearWeight
                      .mul(geometryWeight)
                      .toVar('vbaoMergedResolveTightTapWeight')
                    tightAo.addAssign(tapAo.mul(tightTapWeight))
                    tightWeight.addAssign(tightTapWeight)

                    const wideTapWeight = gaussianWeight
                      .mul(geometryWeight)
                      .toVar('vbaoMergedResolveWideTapWeight')
                    wideAo.addAssign(tapAo.mul(wideTapWeight))
                    wideWeight.addAssign(wideTapWeight)
                  })
                },
              )
            },
          )
        },
      )

      const tightResolvedAo = tightAo.div(max(tightWeight, float(1e-6)))
      const wideResolvedAo = wideAo.div(max(wideWeight, float(1e-6)))
      const fallbackResolvedAo = fallbackAo.div(max(fallbackWeight, float(1e-6)))
      // strength * (1 - confidence): same confidence-guided strength the
      // standalone cleanup pass used. 0 -> tight JBU; 1 -> wide gather.
      const confidenceGuidedStrength = this.strengthUniform
        .mul(float(1).sub(centerConfidence))
        .toVar('vbaoMergedResolveConfidenceGuidedStrength')
      const edgeAwareAo = mix(tightResolvedAo, wideResolvedAo, confidenceGuidedStrength)

      return centerValid
        .and(tightWeight.greaterThan(float(1e-5)))
        .select(
          clamp(edgeAwareAo, float(0), float(1)),
          clamp(fallbackResolvedAo, float(0), float(1)),
        )
    })

    this.material.fragmentNode = mergedKernel()
    this.material.needsUpdate = true

    return this.getPassTextureNode()
  }
}

const mergedResolveQuadMesh = new QuadMesh()
const mergedResolveSize = new Vector2()
