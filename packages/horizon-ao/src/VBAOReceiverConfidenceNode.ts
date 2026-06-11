import {
  DataTexture,
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
  bitNot,
  bitOr,
  ceil,
  clamp,
  cos,
  countOneBits,
  cross,
  dot,
  float,
  floor,
  getScreenPosition,
  getViewPosition,
  int,
  logarithmicDepthToViewZ,
  Loop,
  max,
  min,
  normalize,
  passTexture,
  reference,
  shiftLeft,
  shiftRight,
  sin,
  sqrt,
  texture,
  uint,
  uniform,
  uv,
  vec2,
  vec3,
  viewZToPerspectiveDepth,
} from 'three/tsl'

import {
  SECTOR_COUNT,
  VBAO_CONTACT_THICKNESS_RADIUS_RATIO,
  VBAO_DEFAULTS,
  VBAO_NEAR_SAMPLE_THICKNESS_RATIO,
} from './vbaoConstants'
import { VBAO_NOISE_TILE_SIZE, getSharedVbaoNoiseTexture } from './vbaoNoise'
import {
  VBAO_PHASE_ATLAS_COLUMNS,
  VBAO_PHASE_ATLAS_PHASES,
  VBAO_PHASE_STRIDE,
} from './vbaoSampling'
import {
  createCosineMeasureNoAtanFn,
  createIntervalMaskStochasticFn,
  createMaskRangeFn,
} from './vbaoShaderFunctions'
import { clampResolutionScale, type SampleableNode } from './vbaoUtils'

const receiverConfidenceQuadMesh = new QuadMesh()
const receiverConfidenceSize = new Vector2()
let receiverConfidenceRendererState:
  | ReturnType<typeof RendererUtils.resetRendererState>
  | undefined

export interface VBAOReceiverConfidenceNodeOptions {
  readonly resolutionScale?: number
  readonly slices?: number
  readonly samples?: number
  readonly noiseTexture?: DataTexture
}

function clampLoopBound(value: number, minValue: number, maxValue: number): number {
  return Math.round(Number.isFinite(value) ? Math.max(minValue, Math.min(maxValue, value)) : minValue)
}

/**
 * Private receiver confidence sidecar candidate.
 *
 * This node computes confidence from observable receiver-state terms: local
 * sample support and agreement between per-slice visibility estimates. It is
 * intentionally not exported from the package entrypoint and does not add public
 * confidence or metadata controls.
 */
export class VBAOReceiverConfidenceNode extends TempNode<'float'> {
  static get type(): string {
    return 'VBAOReceiverConfidenceNode'
  }

  readonly depthNode: SampleableNode
  readonly normalNode: SampleableNode
  readonly camera: Camera
  readonly radiusNode: Node
  readonly thicknessNode: Node
  readonly resolution = uniform(new Vector2())
  readonly sourceResolution = uniform(new Vector2())
  updateBeforeType = NodeUpdateType.FRAME

  resolutionScale: number
  slices: number
  samples: number

  private readonly receiverConfidenceTarget = new RenderTarget(1, 1, {
    depthBuffer: false,
    format: RedFormat,
    type: HalfFloatType,
  })
  private readonly material = new NodeMaterial()
  private readonly receiverConfidenceTextureNode: TextureNode
  private readonly cameraProjectionMatrix
  private readonly cameraProjectionMatrixInverse
  private readonly cameraNear
  private readonly cameraFar
  private readonly noiseTexture: DataTexture
  private readonly noiseNode

  constructor(
    depthNode: Node,
    normalNode: Node,
    camera: Camera,
    radiusNode: Node = uniform(VBAO_DEFAULTS.radius),
    thicknessNode: Node = uniform(VBAO_DEFAULTS.thickness),
    options: VBAOReceiverConfidenceNodeOptions = {},
  ) {
    super('float')

    this.depthNode = depthNode as SampleableNode
    this.normalNode = normalNode as SampleableNode
    this.camera = camera
    this.radiusNode = radiusNode
    this.thicknessNode = thicknessNode
    this.resolutionScale = clampResolutionScale(options.resolutionScale ?? VBAO_DEFAULTS.resolutionScale)
    this.slices = clampLoopBound(options.slices ?? VBAO_DEFAULTS.slices, 1, 4)
    this.samples = clampLoopBound(options.samples ?? VBAO_DEFAULTS.samples, 2, 16)
    this.receiverConfidenceTarget.texture.name = 'VBAO.ReceiverConfidence'
    this.receiverConfidenceTarget.texture.magFilter = NearestFilter
    this.receiverConfidenceTarget.texture.minFilter = NearestFilter
    this.receiverConfidenceTarget.texture.generateMipmaps = false
    this.receiverConfidenceTarget.texture.colorSpace = NoColorSpace
    this.material.name = 'VBAOReceiverConfidence'
    this.receiverConfidenceTextureNode = passTexture(
      this as never,
      this.receiverConfidenceTarget.texture,
    )
    this.cameraProjectionMatrix = uniform(camera.projectionMatrix)
    this.cameraProjectionMatrixInverse = uniform(camera.projectionMatrixInverse)
    this.cameraNear = reference('near', 'float', camera)
    this.cameraFar = reference('far', 'float', camera)
    this.noiseTexture = options.noiseTexture ?? getSharedVbaoNoiseTexture()
    this.noiseNode = texture(this.noiseTexture)
  }

  configure(options: VBAOReceiverConfidenceNodeOptions): void {
    this.resolutionScale = clampResolutionScale(options.resolutionScale ?? this.resolutionScale)
    this.slices = clampLoopBound(options.slices ?? this.slices, 1, 4)
    this.samples = clampLoopBound(options.samples ?? this.samples, 2, 16)
  }

  getTextureNode(): TextureNode {
    return this.receiverConfidenceTextureNode
  }

  setSize(width: number, height: number): void {
    const scaledWidth = Math.max(1, Math.round(this.resolutionScale * width))
    const scaledHeight = Math.max(1, Math.round(this.resolutionScale * height))

    this.sourceResolution.value.set(width, height)
    this.resolution.value.set(scaledWidth, scaledHeight)
    this.receiverConfidenceTarget.setSize(scaledWidth, scaledHeight)
  }

  updateBefore(frame: NodeFrame): boolean | undefined {
    const renderer = frame.renderer
    if (renderer === null || renderer === undefined) return undefined

    receiverConfidenceRendererState = RendererUtils.resetRendererState(
      renderer,
      receiverConfidenceRendererState as never,
    )

    const drawingBufferSize = renderer.getDrawingBufferSize(receiverConfidenceSize)
    this.setSize(drawingBufferSize.width, drawingBufferSize.height)

    receiverConfidenceQuadMesh.material = this.material
    receiverConfidenceQuadMesh.name = 'VBAOReceiverConfidence'

    renderer.setClearColor(0x000000, 1)
    renderer.setRenderTarget(this.receiverConfidenceTarget)
    receiverConfidenceQuadMesh.render(renderer)

    RendererUtils.restoreRendererState(renderer, receiverConfidenceRendererState)
    return true
  }

  setup(builder: any): TextureNode {
    const uvNode = uv()
    const radiusNode = this.radiusNode as any
    const thicknessNode = this.thicknessNode as any
    const sliceLoopEnd = int(this.slices)
    const sampleLoopEnd = int(this.samples)
    const sliceCount = float(this.slices)
    const sampleCount = float(this.samples)

    const sampleDepth = (uvCoord: any) => {
      const d = this.depthNode.sample(uvCoord).r
      if (builder.renderer.logarithmicDepthBuffer === true) {
        const vz = logarithmicDepthToViewZ(d, this.cameraNear, this.cameraFar)
        return viewZToPerspectiveDepth(vz, this.cameraNear, this.cameraFar)
      }
      return d
    }

    const sampleNormal = (uvCoord: any) => this.normalNode.sample(uvCoord).rgb.normalize()

    const vbaoReceiverConfidenceNoisePixel = floor(uvNode.mul(this.sourceResolution))
    const vbaoReceiverConfidenceLocalPixel = vbaoReceiverConfidenceNoisePixel
      .sub(
        floor(vbaoReceiverConfidenceNoisePixel.div(float(VBAO_NOISE_TILE_SIZE))).mul(
          float(VBAO_NOISE_TILE_SIZE),
        ),
      )
      .toVar('vbaoReceiverConfidenceLocalPixel')

    const sampleNoisePhase = (slice: any, sample: any) => {
      const phaseRaw = float(slice)
        .mul(float(VBAO_PHASE_STRIDE))
        .add(float(sample))
      const phase = phaseRaw.sub(
        floor(phaseRaw.div(float(VBAO_PHASE_ATLAS_PHASES))).mul(float(VBAO_PHASE_ATLAS_PHASES)),
      )
      const phaseY = floor(phase.div(float(VBAO_PHASE_ATLAS_COLUMNS)))
      const phaseX = phase.sub(phaseY.mul(float(VBAO_PHASE_ATLAS_COLUMNS)))
      const atlasPixel = vbaoReceiverConfidenceLocalPixel.add(
        vec2(phaseX, phaseY).mul(float(VBAO_NOISE_TILE_SIZE)),
      )
      const atlasUv = atlasPixel
        .add(vec2(0.5))
        .div(
          vec2(
            VBAO_NOISE_TILE_SIZE * VBAO_PHASE_ATLAS_COLUMNS,
            VBAO_NOISE_TILE_SIZE * (VBAO_PHASE_ATLAS_PHASES / VBAO_PHASE_ATLAS_COLUMNS),
          ),
        )
      return this.noiseNode.sample(atlasUv)
    }

    const maskRangeFn = createMaskRangeFn('vbaoReceiverConfidence')
    const vbaoReceiverConfidenceCosineMeasureNoAtan = createCosineMeasureNoAtanFn(
      'vbaoReceiverConfidence',
    )
    const intervalMaskStochasticFn = createIntervalMaskStochasticFn(
      'vbaoReceiverConfidence',
      maskRangeFn,
    )

    const confidenceKernel = (Fn as any)(() => {
      const depth = sampleDepth(uvNode).toVar('vbaoReceiverConfidenceDepth')
      depth.greaterThanEqual(1.0).discard()

      const P = getViewPosition(uvNode, depth, this.cameraProjectionMatrixInverse).toVar(
        'vbaoReceiverConfidenceP',
      )
      const N = sampleNormal(uvNode).toVar('vbaoReceiverConfidenceN')
      const V = normalize(P.negate()).toVar('vbaoReceiverConfidenceV')

      const tangentSeed = (abs((V as any).x) as any)
        .lessThan(0.9)
        .select(cross(V, vec3(1, 0, 0)), cross(V, vec3(0, 1, 0)))
      const T0 = (normalize(tangentSeed as any) as any).toVar('vbaoReceiverConfidenceT0')
      const T1 = (normalize(cross(V as any, T0 as any) as any) as any).toVar(
        'vbaoReceiverConfidenceT1',
      )
      const maxThickness = radiusNode
        .mul(float(VBAO_CONTACT_THICKNESS_RADIUS_RATIO))
        .toVar('vbaoReceiverConfidenceMaxThickness')
      const baseThickness = min(thicknessNode, maxThickness).toVar(
        'vbaoReceiverConfidenceBaseThickness',
      )
      const maxValidRadius = radiusNode.add(baseThickness).toVar(
        'vbaoReceiverConfidenceMaxValidRadius',
      )
      const maxValidRadius2 = maxValidRadius
        .mul(maxValidRadius)
        .toVar('vbaoReceiverConfidenceMaxValidRadius2')
      const safeTexel = vec2(0.5).div(this.sourceResolution).toVar(
        'vbaoReceiverConfidenceSafeTexel',
      )
      const vbaoReceiverConfidenceCandidateCount = float(0).toVar(
        'vbaoReceiverConfidenceCandidateCount',
      )
      const vbaoReceiverConfidenceAcceptedCount = float(0).toVar(
        'vbaoReceiverConfidenceAcceptedCount',
      )
      const sliceCounter = float(0).toVar('vbaoReceiverConfidenceSliceCounter')
      const sliceMean = float(0).toVar('vbaoReceiverConfidenceSliceMean')
      const sliceM2 = float(0).toVar('vbaoReceiverConfidenceSliceM2')

      ;(Loop as any)(
        { start: int(0), end: sliceLoopEnd, type: 'int', condition: '<' },
        ({ i }: any) => {
          const sliceNoiseTexel = sampleNoisePhase(i, int(0))
          const rotation = sliceNoiseTexel.x.toVar('vbaoReceiverConfidenceSliceRotation')
          const phi = float(i).add(rotation).div(sliceCount).mul(PI)
          const S_i = (
            normalize((T0 as any).mul(cos(phi)).add((T1 as any).mul(sin(phi)))) as any
          ).toVar('vbaoReceiverConfidenceSliceDir')
          const B_i = (normalize(cross(S_i as any, V as any) as any) as any).toVar(
            'vbaoReceiverConfidenceBitangent',
          )
          const NprojRaw = N.sub(B_i.mul(dot(N, B_i))).toVar(
            'vbaoReceiverConfidenceProjectedNormalRaw',
          )
          const NprojLen = sqrt(max(dot(NprojRaw, NprojRaw), float(1e-8))).toVar(
            'vbaoReceiverConfidenceProjectedNormalLength',
          )
          const Nproj = NprojRaw.div(NprojLen).toVar('vbaoReceiverConfidenceProjectedNormal')
          const sinGamma = dot(Nproj, S_i).toVar('vbaoReceiverConfidenceSinGamma')
          const cosGamma = max(dot(Nproj, V), float(1e-5)).toVar(
            'vbaoReceiverConfidenceCosGamma',
          )
          const occludedMask = uint(0).toVar('occludedMask')

          ;(Loop as any)(
            { start: int(0), end: int(2), type: 'int', condition: '<', name: 'sideIdx' },
            ({ sideIdx }: any) => {
              const sideSign = sideIdx.equal(int(0)).select(float(1), float(-1))
              const sampleDir = S_i.mul(sideSign).toVar('vbaoReceiverConfidenceSampleDir')
              const sampleScreenEnd = getScreenPosition(
                P.add(sampleDir.mul(radiusNode)),
                this.cameraProjectionMatrix,
              )

              ;(Loop as any)(
                { start: int(0), end: sampleLoopEnd, type: 'int', condition: '<', name: 'j' },
                ({ j }: any) => {
                  If(occludedMask.notEqual(bitNot(uint(0))), () => {
                    const sampleNoiseTexel = sampleNoisePhase(i, j)
                    const stepJitter = sampleNoiseTexel.y.toVar(
                      'vbaoReceiverConfidenceStepJitter',
                    )
                    const subsectorNoise = sampleNoiseTexel.z.toVar(
                      'vbaoReceiverConfidenceSubsectorNoise',
                    )
                    const stepT = float(j).add(stepJitter).div(sampleCount)
                    const stepFrac = stepT.mul(stepT)
                    const sampleScreenPos = uvNode
                      .add(sampleScreenEnd.sub(uvNode).mul(stepFrac))
                      .toVar('vbaoReceiverConfidenceSampleScreenPos')
                    const sampleSafeUv = clamp(
                      sampleScreenPos,
                      safeTexel,
                      vec2(1).sub(safeTexel),
                    ).toVar('vbaoReceiverConfidenceSampleSafeUv')
                    const onScreen = sampleScreenPos.x
                      .greaterThanEqual(float(0))
                      .and(sampleScreenPos.x.lessThanEqual(float(1)))
                      .and(sampleScreenPos.y.greaterThanEqual(float(0)))
                      .and(sampleScreenPos.y.lessThanEqual(float(1)))
                      .toVar('vbaoReceiverConfidenceSampleOnScreen')
                    const sD = sampleDepth(sampleSafeUv).toVar('vbaoReceiverConfidenceSampleDepth')
                    const candidateSample = onScreen
                      .and(sD.lessThan(float(1.0)))
                      .and(sD.greaterThanEqual(float(0)))
                      .toVar('vbaoReceiverConfidenceCandidateSample')
                    const samplePos = getViewPosition(
                      sampleSafeUv,
                      sD,
                      this.cameraProjectionMatrixInverse,
                    ).toVar('vbaoReceiverConfidenceSamplePos')
                    const sampleDelta = samplePos.sub(P).toVar('vbaoReceiverConfidenceSampleDelta')
                    const sampleDist2 = dot(sampleDelta, sampleDelta).toVar(
                      'vbaoReceiverConfidenceSampleDist2',
                    )
                    const sampleAlong = dot(sampleDelta, sampleDir).toVar(
                      'vbaoReceiverConfidenceSampleAlong',
                    )
                    const sampleValid = candidateSample
                      .and(sampleDist2.greaterThan(float(1e-8)))
                      .and(sampleDist2.lessThanEqual(maxValidRadius2))
                      .and(sampleAlong.greaterThan(float(0)))
                      .toVar('sampleValid')

                    If(candidateSample, () => {
                      vbaoReceiverConfidenceCandidateCount.addAssign(float(1))
                    })

                    If(sampleValid, () => {
                      vbaoReceiverConfidenceAcceptedCount.addAssign(float(1))

                      const sampleDist = sqrt(max(sampleDist2, float(1e-8))).toVar(
                        'vbaoReceiverConfidenceSampleDist',
                      )
                      const effectiveThickness = min(
                        baseThickness,
                        sampleDist.mul(float(VBAO_NEAR_SAMPLE_THICKNESS_RATIO)),
                      ).toVar('vbaoReceiverConfidenceEffectiveThickness')
                      const D_front = sampleDelta.div(sampleDist).toVar(
                        'vbaoReceiverConfidenceDFront',
                      )
                      const sampleViewLen = sqrt(max(dot(samplePos, samplePos), float(1e-8))).toVar(
                        'vbaoReceiverConfidenceSampleViewLen',
                      )
                      const sampleViewDir = samplePos
                        .negate()
                        .div(sampleViewLen)
                        .toVar('vbaoReceiverConfidenceSampleViewDir')
                      const backDelta = samplePos
                        .sub(sampleViewDir.mul(effectiveThickness))
                        .sub(P)
                        .toVar('vbaoReceiverConfidenceBackDelta')
                      const backDist = sqrt(max(dot(backDelta, backDelta), float(1e-8))).toVar(
                        'vbaoReceiverConfidenceBackDist',
                      )
                      const D_back = backDelta.div(backDist).toVar('vbaoReceiverConfidenceDBack')
                      const uFront = (vbaoReceiverConfidenceCosineMeasureNoAtan as any)(
                        D_front,
                        V,
                        S_i,
                        sinGamma,
                        cosGamma,
                      )
                      const uBack = (vbaoReceiverConfidenceCosineMeasureNoAtan as any)(
                        D_back,
                        V,
                        S_i,
                        sinGamma,
                        cosGamma,
                      )
                      const u0 = min(uFront, uBack).toVar('vbaoReceiverConfidenceIntervalU0')
                      const u1 = max(uFront, uBack).toVar('vbaoReceiverConfidenceIntervalU1')
                      const pointSampleMask = (intervalMaskStochasticFn as any)(
                        u0,
                        u1,
                        subsectorNoise,
                      ).toVar('vbaoReceiverConfidencePointSampleMask')
                      occludedMask.assign(bitOr(occludedMask, pointSampleMask))
                    })
                  })
                },
              )
            },
          )

          const blockedSectors = float(countOneBits(occludedMask) as any).toVar(
            'vbaoReceiverConfidenceBlockedSectors',
          )
          const sliceAccessibility = float(1)
            .sub(blockedSectors.div(float(SECTOR_COUNT)))
            .toVar('vbaoReceiverConfidenceSliceAccessibility')
          sliceCounter.addAssign(float(1))
          const sliceDelta = sliceAccessibility.sub(sliceMean).toVar(
            'vbaoReceiverConfidenceSliceDelta',
          )
          sliceMean.addAssign(sliceDelta.div(sliceCounter))
          const sliceDeltaAfterMean = sliceAccessibility.sub(sliceMean).toVar(
            'vbaoReceiverConfidenceSliceDeltaAfterMean',
          )
          sliceM2.addAssign(sliceDelta.mul(sliceDeltaAfterMean))
        },
      )

      const receiverSupport = vbaoReceiverConfidenceAcceptedCount
        .div(max(vbaoReceiverConfidenceCandidateCount, float(1e-6)))
        .clamp(0, 1)
        .toVar('vbaoReceiverConfidenceSupport')
      const sliceVariance = sliceM2.div(max(sliceCounter, float(1))).toVar(
        'vbaoReceiverConfidenceSliceVariance',
      )
      const sliceStdDev = sqrt(max(sliceVariance, float(0))).toVar(
        'vbaoReceiverConfidenceSliceStdDev',
      )
      const sliceAgreement = clamp(float(1).sub(sliceStdDev.div(float(0.5))), float(0), float(1))
        .toVar('vbaoReceiverConfidenceSliceAgreement')
      const confidence = sqrt(receiverSupport.mul(sliceAgreement)).toVar(
        'vbaoReceiverConfidence',
      )
      return depth
        .lessThan(float(1))
        .select(clamp(confidence, float(0), float(1)), float(0))
    })

    this.material.fragmentNode = confidenceKernel().context(builder.getSharedContext())
    this.material.needsUpdate = true

    return this.receiverConfidenceTextureNode
  }

  dispose(): void {
    this.receiverConfidenceTarget.dispose()
    this.material.dispose()
  }
}
