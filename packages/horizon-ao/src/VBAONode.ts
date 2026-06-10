import {
  DataTexture,
  HalfFloatType,
  NearestFilter,
  NodeMaterial,
  NoColorSpace,
  QuadMesh,
  RGFormat,
  RenderTarget,
  RendererUtils,
  TempNode,
  Vector2,
  type Camera,
  type NodeFrame,
  type TextureNode,
} from 'three/webgpu'
import {
  NodeUpdateType,
  PI,
  abs,
  bitNot,
  bitOr,
  clamp,
  cos,
  countOneBits,
  cross,
  dot,
  float,
  Fn,
  getScreenPosition,
  getViewPosition,
  If,
  int,
  logarithmicDepthToViewZ,
  Loop,
  max,
  min,
  normalize,
  passTexture,
  pow,
  reference,
  sin,
  sqrt,
  texture,
  uint,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
  viewZToPerspectiveDepth,
} from 'three/tsl'

import {
  VBAO_CONTACT_THICKNESS_RADIUS_RATIO,
  SECTOR_COUNT,
  VBAO_DEFAULTS,
  VBAO_NEAR_SAMPLE_THICKNESS_RATIO,
  VBAO_QUALITY_TIERS,
  clampVbaoNodeOptions,
  type VbaoDeprecatedOptionAliases,
  type VBAONodeOptions,
} from './vbaoConstants'
import { VBAOFullResPolishNode } from './VBAOFullResPolishNode'
import { VBAOHalfResCleanupNode } from './VBAOHalfResCleanupNode'
import { VBAOResolveNode } from './VBAOResolveNode'
import { VBAOTemporalAccumulateNode } from './VBAOTemporalAccumulateNode'
import {
  createVbaoNoisePhaseSampler,
  vbaoCosineMeasureNoAtan,
  vbaoIntervalMaskStochasticFn as intervalMaskStochasticFn,
} from './vbaoKernelPrimitives'
import { getSharedVbaoNoiseTexture } from './vbaoNoise'
import { VBAO_PHASE_ATLAS_PHASES } from './vbaoSampling'
import { type Node, type SampleableNode } from './vbaoUtils'

const quadMesh = new QuadMesh()
const size = new Vector2()

type VbaoRawLoopShape = {
  readonly slices: number
  readonly samples: number
}

type VbaoInternalTemporalMode = 'off' | 'host'

type VbaoInternalBenchmarkOptions = VBAONodeOptions & {
  readonly benchmark?: { readonly noiseTexture?: DataTexture }
  readonly temporalMode?: VbaoInternalTemporalMode | 'velocity-internal'
}

function resolveInternalTemporalMode(mode: VbaoInternalBenchmarkOptions['temporalMode']): VbaoInternalTemporalMode {
  return mode === 'host' ? 'host' : 'off'
}

/** Visibility-bitmask ambient occlusion for Three.js TSL/WebGPU. */
export class VBAONode extends TempNode<'float'> {
  static get type(): string {
    return 'VBAONode'
  }

  readonly depthNode: SampleableNode
  readonly normalNode: SampleableNode
  readonly camera: Camera

  readonly radius = uniform(VBAO_DEFAULTS.radius)
  readonly thickness = uniform(VBAO_DEFAULTS.thickness)
  readonly strength = uniform(VBAO_DEFAULTS.strength)
  readonly contrast = uniform(VBAO_DEFAULTS.contrast)
  readonly softness = uniform(VBAO_DEFAULTS.softness)
  readonly slices = uniform(VBAO_DEFAULTS.slices)
  readonly samples = uniform(VBAO_DEFAULTS.samples)
  readonly resolution = uniform(new Vector2())
  readonly sourceResolution = uniform(new Vector2())
  readonly sectors = SECTOR_COUNT

  resolutionScale: number = VBAO_DEFAULTS.resolutionScale
  updateBeforeType = NodeUpdateType.FRAME
  private contactValue: number = VBAO_DEFAULTS.contact

  private readonly rawEstimateTarget = new RenderTarget(1, 1, {
    depthBuffer: false,
    format: RGFormat,
    type: HalfFloatType,
  })
  private readonly material = new NodeMaterial()
  private readonly rawEstimateTextureNode: TextureNode
  private resolveNode?: VBAOResolveNode | undefined
  private halfCleanupNode?: VBAOHalfResCleanupNode | undefined
  private fullPolishNode?: VBAOFullResPolishNode | undefined
  private productAoTextureNode?: TextureNode
  private temporalAccumulateNode?: VBAOTemporalAccumulateNode | undefined
  private receiverProductGraphKey = ''
  private receiverProductGraphCreated = false
  private rawLoopShape: VbaoRawLoopShape = {
    slices: VBAO_DEFAULTS.slices,
    samples: VBAO_DEFAULTS.samples,
  }
  private readonly cameraProjectionMatrix
  private readonly cameraProjectionMatrixInverse
  private readonly cameraNear
  private readonly cameraFar
  private readonly noiseTexture: DataTexture
  private readonly noiseNode
  private readonly temporalPhaseOffset = uniform(0)
  private readonly temporalMode: VbaoInternalTemporalMode
  // Per-instance renderer state: a module-level slot would let two live
  // VBAONode instances corrupt each other's save/restore every frame.
  private rendererState: ReturnType<typeof RendererUtils.resetRendererState> | undefined
  private readonly temporalOptions: VBAONodeOptions['temporal']

  constructor(depthNode: Node, normalNode: Node, camera: Camera, options: VBAONodeOptions = {}) {
    if (normalNode === null || normalNode === undefined) {
      throw new TypeError('VBAONode: normalNode is required')
    }

    // Validate temporal options at construction time (spec §Opt-In Temporal Option).
    if (options.temporal !== undefined) {
      if (options.temporal.mode === undefined || options.temporal.mode === null) {
        throw new TypeError('VBAONode: temporal.mode is required when temporal is provided')
      }
      if (options.temporal.mode === 'velocity' && options.temporal.velocityNode === undefined) {
        throw new TypeError(
          'VBAONode: temporal.velocityNode is required when temporal.mode is "velocity"',
        )
      }
    }

    super('float')

    this.depthNode = depthNode as SampleableNode
    this.normalNode = normalNode as SampleableNode
    this.camera = camera
    this.rawEstimateTarget.texture.name = 'VBAO.Raw'
    this.rawEstimateTarget.texture.magFilter = NearestFilter
    this.rawEstimateTarget.texture.minFilter = NearestFilter
    this.rawEstimateTarget.texture.generateMipmaps = false
    this.rawEstimateTarget.texture.colorSpace = NoColorSpace
    this.material.name = 'VBAO'
    this.rawEstimateTextureNode = passTexture(this as never, this.rawEstimateTarget.texture)
    this.cameraProjectionMatrix = uniform(camera.projectionMatrix)
    this.cameraProjectionMatrixInverse = uniform(camera.projectionMatrixInverse)
    this.cameraNear = reference('near', 'float', camera)
    this.cameraFar = reference('far', 'float', camera)
    const internalOptions = options as VbaoInternalBenchmarkOptions
    this.noiseTexture = internalOptions.benchmark?.noiseTexture ?? getSharedVbaoNoiseTexture()
    this.noiseNode = texture(this.noiseTexture)
    this.temporalMode = resolveInternalTemporalMode(internalOptions.temporalMode)
    this.temporalOptions = options.temporal

    this.configure(options)
  }

  private resolveRawLoopShape(next: { slices: number; samples: number }): VbaoRawLoopShape {
    return {
      slices: next.slices,
      samples: next.samples,
    }
  }

  configure(options: VBAONodeOptions): void {
    // Deprecated flat aliases stay runtime-accepted as untyped shims; they are
    // not part of the documented VBAONodeOptions surface.
    const legacy = options as VBAONodeOptions & VbaoDeprecatedOptionAliases
    const qualityName = options.quality ?? legacy.preset
    const quality = qualityName === undefined ? undefined : VBAO_QUALITY_TIERS[qualityName]
    const advanced = options.advanced ?? {}
    const fallback = {
      radius: this.radius.value,
      contact: this.contactValue,
      thickness: this.thickness.value,
      strength: this.strength.value,
      contrast: this.contrast.value,
      softness: this.softness.value,
      slices: this.slices.value,
      samples: this.samples.value,
      resolutionScale: this.resolutionScale,
    }
    const mergedOptions = {
      ...(qualityName === undefined ? {} : { quality: qualityName }),
      radius: options.radius ?? fallback.radius,
      contact: options.contact ?? fallback.contact,
      strength: options.strength ?? legacy.intensity ?? fallback.strength,
      softness: options.softness ?? fallback.softness,
      advanced: {
        ...(() => {
          const thickness =
            advanced.thickness ??
            legacy.thickness ??
            (options.radius === undefined && options.contact === undefined
              ? fallback.thickness
              : undefined)
          return thickness === undefined ? {} : { thickness }
        })(),
        contrast: advanced.contrast ?? legacy.contrast ?? legacy.scale ?? fallback.contrast,
        slices: advanced.slices ?? legacy.slices ?? quality?.slices ?? fallback.slices,
        samples: advanced.samples ?? legacy.samples ?? quality?.samples ?? fallback.samples,
        resolutionScale:
          advanced.resolutionScale ??
          legacy.resolutionScale ??
          quality?.resolutionScale ??
          fallback.resolutionScale,
      },
    } satisfies VBAONodeOptions
    const next = clampVbaoNodeOptions(mergedOptions)
    const nextLoopShape = this.resolveRawLoopShape(next)

    if (
      this.receiverProductGraphCreated &&
      (next.softness !== this.softness.value ||
        next.resolutionScale !== this.resolutionScale ||
        nextLoopShape.slices !== this.rawLoopShape.slices ||
        nextLoopShape.samples !== this.rawLoopShape.samples)
    ) {
      throw new Error(
        'VBAONode.configure(): softness, resolutionScale, and raw loop shape affect the pass graph and are construction-time only after getTextureNode(); create a new VBAONode or rebuild downstream pipelines.',
      )
    }

    this.radius.value = next.radius
    this.contactValue = next.contact
    this.thickness.value = next.thickness
    this.strength.value = next.strength
    this.contrast.value = next.contrast
    this.softness.value = next.softness
    this.slices.value = next.slices
    this.samples.value = next.samples
    this.resolutionScale = next.resolutionScale
    this.rawLoopShape = nextLoopShape
  }

  private lowResolutionCleanupStrength(): number {
    return this.resolutionScale < 0.99 ? this.softness.value : 0
  }

  private fullResolutionPolishStrength(): number {
    if (this.resolutionScale < 0.99) {
      return Math.max(0, this.softness.value - 0.5) * 2
    }

    return this.softness.value
  }

  private getOrCreateHalfCleanupNode(
    input: TextureNode,
    strength: number,
    confidenceNode: TextureNode,
  ): VBAOHalfResCleanupNode {
    if (this.halfCleanupNode === undefined || this.halfCleanupNode.rawAoNode !== input) {
      this.halfCleanupNode?.dispose()
      this.halfCleanupNode = new VBAOHalfResCleanupNode(
        input,
        this.depthNode,
        this.normalNode,
        this.camera,
        this.radius,
        {
          enabled: true,
          strength,
          resolutionScale: this.resolutionScale,
          confidenceNode,
        },
      )
    } else {
      this.halfCleanupNode.configure({
        enabled: true,
        strength,
        resolutionScale: this.resolutionScale,
      })
    }

    return this.halfCleanupNode
  }

  private getOrCreateResolveNode(input: TextureNode): VBAOResolveNode {
    if (this.resolveNode === undefined || this.resolveNode.rawAoNode !== input) {
      this.resolveNode?.dispose()
      this.resolveNode = new VBAOResolveNode(
        input,
        this.depthNode,
        this.normalNode,
        this.camera,
        this.radius,
      )
    }

    return this.resolveNode
  }

  private getOrCreateFullPolishNode(
    input: TextureNode,
    strength: number,
    confidenceNode: TextureNode,
  ): VBAOFullResPolishNode {
    if (this.fullPolishNode === undefined || this.fullPolishNode.aoNode !== input) {
      this.fullPolishNode?.dispose()
      this.fullPolishNode = new VBAOFullResPolishNode(
        input,
        this.depthNode,
        this.normalNode,
        this.camera,
        this.radius,
        {
          enabled: true,
          strength,
          confidenceNode,
        },
      )
    } else {
      this.fullPolishNode.configure({
        enabled: true,
        strength,
      })
    }

    return this.fullPolishNode
  }

  private disposeLowResGraph(): void {
    this.resolveNode?.dispose()
    this.resolveNode = undefined
    this.halfCleanupNode?.dispose()
    this.halfCleanupNode = undefined
  }

  private disposeFullPolishGraph(): void {
    this.fullPolishNode?.dispose()
    this.fullPolishNode = undefined
  }

  private currentReceiverProductGraphKey(): string {
    const cleanupStrength = this.lowResolutionCleanupStrength()
    const polishStrength = this.fullResolutionPolishStrength()
    return [
      this.resolutionScale < 0.99 ? 'low' : 'full',
      cleanupStrength > 0 ? 'cleanup' : 'raw',
      polishStrength > 0 ? 'polish' : 'no-polish',
      this.resolutionScale.toFixed(4),
      this.softness.value.toFixed(4),
      this.temporalMode,
      this.temporalOptions !== undefined ? `temporal:${this.temporalOptions.mode}` : 'no-temporal',
    ].join(':')
  }

  private assertReceiverProductGraphStable(): void {
    if (!this.receiverProductGraphCreated) return

    const currentGraphKey = this.currentReceiverProductGraphKey()
    if (currentGraphKey === this.receiverProductGraphKey) return

    throw new Error(
      'VBAONode: softness and resolutionScale affect the pass graph and are construction-time only after getTextureNode(); create a new VBAONode or rebuild downstream pipelines.',
    )
  }

  private rebuildReceiverProductGraph(): void {
    const cleanupStrength = this.lowResolutionCleanupStrength()
    const polishStrength = this.fullResolutionPolishStrength()
    const graphKey = this.currentReceiverProductGraphKey()

    if (graphKey === this.receiverProductGraphKey && this.productAoTextureNode !== undefined) return

    let output: TextureNode = this.rawEstimateTextureNode
    const usesConfidenceGuidedReconstruction = cleanupStrength > 0 || polishStrength > 0
    // Confidence is folded into the raw pass (G channel of the RG raw target),
    // so reconstruction reads it directly from the raw texture — no second march.
    const confidenceTextureNode = usesConfidenceGuidedReconstruction
      ? this.rawEstimateTextureNode
      : undefined

    if (this.resolutionScale < 0.99) {
      if (cleanupStrength > 0) {
        output = this.getOrCreateHalfCleanupNode(
          output,
          cleanupStrength,
          confidenceTextureNode as TextureNode,
        ).getTextureNode()
      } else {
        this.halfCleanupNode?.dispose()
        this.halfCleanupNode = undefined
      }

      output = this.getOrCreateResolveNode(output).getTextureNode()
    } else {
      this.disposeLowResGraph()
    }

    if (polishStrength > 0) {
      output = this.getOrCreateFullPolishNode(
        output,
        polishStrength,
        confidenceTextureNode as TextureNode,
      ).getTextureNode()
    } else {
      this.disposeFullPolishGraph()
    }

    // Temporal accumulate is the TERMINAL stage of the product graph.
    // Pass ordering decision (task 1.1.1): temporal runs AFTER polish
    // because polish currently terminates the graph and temporal wraps
    // the fully-resolved, polished full-res AO output.
    if (this.temporalOptions !== undefined) {
      if (
        this.temporalAccumulateNode === undefined ||
        this.temporalAccumulateNode.productAoNode !== output
      ) {
        this.temporalAccumulateNode?.dispose()
        this.temporalAccumulateNode = new VBAOTemporalAccumulateNode(output, this.temporalOptions)
      }
      output = this.temporalAccumulateNode.getTextureNode()
    } else {
      this.temporalAccumulateNode?.dispose()
      this.temporalAccumulateNode = undefined
    }

    this.productAoTextureNode = output
    this.receiverProductGraphKey = graphKey
  }

  getTextureNode(): TextureNode {
    this.assertReceiverProductGraphStable()
    this.rebuildReceiverProductGraph()
    this.receiverProductGraphCreated = true
    return this.productAoTextureNode ?? this.rawEstimateTextureNode
  }

  getRawTextureNode(): TextureNode {
    return this.rawEstimateTextureNode
  }

  setSize(width: number, height: number): void {
    this.assertReceiverProductGraphStable()

    const scaledWidth = Math.max(1, Math.round(this.resolutionScale * width))
    const scaledHeight = Math.max(1, Math.round(this.resolutionScale * height))

    this.sourceResolution.value.set(width, height)
    this.resolution.value.set(scaledWidth, scaledHeight)
    this.rawEstimateTarget.setSize(scaledWidth, scaledHeight)
  }

  updateBefore(frame: NodeFrame): boolean | undefined {
    const renderer = frame.renderer
    if (renderer === null || renderer === undefined) return undefined

    this.rendererState = RendererUtils.resetRendererState(renderer, this.rendererState as never)

    const drawingBufferSize = renderer.getDrawingBufferSize(size)
    this.setSize(drawingBufferSize.width, drawingBufferSize.height)

    quadMesh.material = this.material
    quadMesh.name = 'VBAO'

    renderer.setClearColor(0xffffff, 1)
    renderer.setRenderTarget(this.rawEstimateTarget)
    quadMesh.render(renderer)

    if (this.temporalMode === 'host') {
      this.temporalPhaseOffset.value =
        (this.temporalPhaseOffset.value + 1) % VBAO_PHASE_ATLAS_PHASES
    }

    RendererUtils.restoreRendererState(renderer, this.rendererState)
    return true
  }

  setup(builder: any): TextureNode {
    const uvNode = uv()
    const sliceLoopEnd = int(this.rawLoopShape.slices)
    const sampleLoopEnd = int(this.rawLoopShape.samples)
    const sliceCount = float(this.rawLoopShape.slices)
    const sampleCount = float(this.rawLoopShape.samples)

    const sampleDepth = (uvCoord: any) => {
      const d = this.depthNode.sample(uvCoord).r
      if (builder.renderer.logarithmicDepthBuffer === true) {
        const vz = logarithmicDepthToViewZ(d, this.cameraNear, this.cameraFar)
        return viewZToPerspectiveDepth(vz, this.cameraNear, this.cameraFar)
      }
      return d
    }

    const sampleNormal = (uvCoord: any) => this.normalNode.sample(uvCoord).rgb.normalize()

    const sampleNoisePhase = createVbaoNoisePhaseSampler({
      noiseNode: this.noiseNode,
      uvNode,
      sourceResolution: this.sourceResolution,
      temporalPhaseOffset: this.temporalPhaseOffset,
    })

    const vbaoKernel = (Fn as any)(() => {
      const depth = sampleDepth(uvNode).toVar('depth')
      depth.greaterThanEqual(1.0).discard()

      const P = getViewPosition(uvNode, depth, this.cameraProjectionMatrixInverse).toVar('P')
      const N = sampleNormal(uvNode).toVar('N')
      const V = normalize(P.negate()).toVar('V')

      const tangentSeed = (abs((V as any).x) as any)
        .lessThan(0.9)
        .select(cross(V, vec3(1, 0, 0)), cross(V, vec3(0, 1, 0)))
      const T0 = (normalize(tangentSeed as any) as any).toVar('T0')
      const T1 = (normalize(cross(V as any, T0 as any) as any) as any).toVar('T1')
      const maxThickness = this.radius
        .mul(float(VBAO_CONTACT_THICKNESS_RADIUS_RATIO))
        .toVar('vbaoMaxThickness')
      const baseThickness = min(this.thickness, maxThickness).toVar('vbaoBaseThickness')
      const maxValidRadius = this.radius.add(baseThickness).toVar('vbaoMaxValidRadius')
      const maxValidRadius2 = maxValidRadius.mul(maxValidRadius).toVar('vbaoMaxValidRadius2')
      const safeTexel = vec2(0.5).div(this.sourceResolution).toVar('vbaoSafeTexel')
      const weightedAccessibility = float(0).toVar('weightedAccessibility')
      const weightSum = float(0).toVar('weightSum')
      // Folded receiver-confidence accumulators (computed from the SAME march —
      // no second estimator pass). Confidence = sqrt(receiverSupport * sliceAgreement).
      const vbaoCandidateCount = float(0).toVar('vbaoCandidateCount')
      const vbaoAcceptedCount = float(0).toVar('vbaoAcceptedCount')
      const vbaoSliceCounter = float(0).toVar('vbaoSliceCounter')
      const vbaoSliceMean = float(0).toVar('vbaoSliceMean')
      const vbaoSliceM2 = float(0).toVar('vbaoSliceM2')

      ;(Loop as any)(
        { start: int(0), end: sliceLoopEnd, type: 'int', condition: '<' },
        ({ i }: any) => {
          // Axial slice orientation: mirrored two-sided sampling covers π, not 2π.
          const sliceNoiseTexel = sampleNoisePhase(i, int(0))
          const rotation = sliceNoiseTexel.x.toVar('vbaoSliceRotation')
          const phi = float(i).add(rotation).div(sliceCount).mul(PI)
          const S_i = (
            normalize((T0 as any).mul(cos(phi)).add((T1 as any).mul(sin(phi)))) as any
          ).toVar('S_i')
          const B_i = (normalize(cross(S_i as any, V as any) as any) as any).toVar('B_i')
          const NprojRaw = N.sub(B_i.mul(dot(N, B_i))).toVar('NprojRaw')
          const NprojLen = sqrt(max(dot(NprojRaw, NprojRaw), float(1e-8))).toVar('NprojLen')
          const Nproj = NprojRaw.div(NprojLen).toVar('Nproj')
          const sinGamma = dot(Nproj, S_i).toVar('sinGamma')
          const cosGamma = max(dot(Nproj, V), float(1e-5)).toVar('cosGamma')

          const occludedMask = uint(0).toVar('occludedMask')

          ;(Loop as any)(
            { start: int(0), end: int(2), type: 'int', condition: '<', name: 'sideIdx' },
            ({ sideIdx }: any) => {
              const sideSign = sideIdx.equal(int(0)).select(float(1), float(-1))
              const sampleDir = S_i.mul(sideSign).toVar('sampleDir')
              const sampleScreenEnd = getScreenPosition(
                P.add(sampleDir.mul(this.radius)),
                this.cameraProjectionMatrix,
              )

              ;(Loop as any)(
                { start: int(0), end: sampleLoopEnd, type: 'int', condition: '<', name: 'j' },
                ({ j }: any) => {
                  If(occludedMask.notEqual(bitNot(uint(0))), () => {
                    const sampleNoiseTexel = sampleNoisePhase(i, j)
                    const stepJitter = sampleNoiseTexel.y.toVar('stepJitter')
                    const subsectorNoise = sampleNoiseTexel.z.toVar('vbaoSubsectorNoise')
                    const stepT = float(j).add(stepJitter).div(sampleCount)
                    const stepFrac = stepT.mul(stepT)
                    const sampleScreenPos = uvNode
                      .add(sampleScreenEnd.sub(uvNode).mul(stepFrac))
                      .toVar('sampleScreenPos')
                    const sampleSafeUv = clamp(
                      sampleScreenPos,
                      safeTexel,
                      vec2(1).sub(safeTexel),
                    ).toVar('sampleSafeUv')
                    const onScreen = sampleScreenPos.x
                      .greaterThanEqual(float(0))
                      .and(sampleScreenPos.x.lessThanEqual(float(1)))
                      .and(sampleScreenPos.y.greaterThanEqual(float(0)))
                      .and(sampleScreenPos.y.lessThanEqual(float(1)))
                      .toVar('vbaoSampleOnScreen')
                    const sD = sampleDepth(sampleSafeUv).toVar('vbaoSampleDepth')
                    const samplePos = getViewPosition(
                      sampleSafeUv,
                      sD,
                      this.cameraProjectionMatrixInverse,
                    ).toVar('samplePos')
                    const sampleDelta = samplePos.sub(P).toVar('sampleDelta')
                    const sampleDist2 = dot(sampleDelta, sampleDelta).toVar('sampleDist2')
                    const sampleAlong = dot(sampleDelta, sampleDir).toVar('sampleAlong')
                    const sampleValid = onScreen
                      .and(sD.lessThan(float(1.0)))
                      .and(sD.greaterThanEqual(float(0)))
                      .and(sampleDist2.greaterThan(float(1e-8)))
                      .and(sampleDist2.lessThanEqual(maxValidRadius2))
                      .and(sampleAlong.greaterThan(float(0)))
                      .toVar('sampleValid')
                    // Confidence support: candidate = on-screen sample with valid depth;
                    // accepted = candidate that also passed the full validity test.
                    const vbaoCandidateSample = onScreen
                      .and(sD.lessThan(float(1.0)))
                      .and(sD.greaterThanEqual(float(0)))
                      .toVar('vbaoCandidateSample')
                    // Branchless accumulation (matches the kernel's select-not-branch contract).
                    vbaoCandidateCount.addAssign((vbaoCandidateSample as any).select(float(1), float(0)))
                    vbaoAcceptedCount.addAssign((sampleValid as any).select(float(1), float(0)))
                    const sampleDist = sqrt(max(sampleDist2, float(1e-8))).toVar('sampleDist')
                    const effectiveThickness = min(
                      baseThickness,
                      sampleDist.mul(float(VBAO_NEAR_SAMPLE_THICKNESS_RATIO)),
                    ).toVar('effectiveThickness')
                    const D_front = sampleDelta.div(sampleDist).toVar('D_front')
                    const sampleViewLen = sqrt(max(dot(samplePos, samplePos), float(1e-8))).toVar(
                      'sampleViewLen',
                    )
                    const sampleViewDir = samplePos
                      .negate()
                      .div(sampleViewLen)
                      .toVar('sampleViewDir')
                    const backDelta = samplePos
                      .sub(sampleViewDir.mul(effectiveThickness))
                      .sub(P)
                      .toVar('backDelta')
                    const backDist = sqrt(max(dot(backDelta, backDelta), float(1e-8))).toVar(
                      'backDist',
                    )
                    const D_back = backDelta.div(backDist).toVar('D_back')
                    const uFront = (vbaoCosineMeasureNoAtan as any)(
                      D_front,
                      V,
                      S_i,
                      sinGamma,
                      cosGamma,
                    )
                    const uBack = (vbaoCosineMeasureNoAtan as any)(
                      D_back,
                      V,
                      S_i,
                      sinGamma,
                      cosGamma,
                    )
                    const u0 = min(uFront, uBack).toVar('vbaoIntervalU0')
                    const u1 = max(uFront, uBack).toVar('vbaoIntervalU1')
                    const pointSampleMask = (intervalMaskStochasticFn as any)(
                      u0,
                      u1,
                      subsectorNoise,
                    ).toVar('pointSampleMask')
                    const validSampleMask = (sampleValid as any).select(pointSampleMask, uint(0))
                    occludedMask.assign(bitOr(occludedMask, validSampleMask))
                  })
                },
              )
            },
          )

          const blockedSectors = float(countOneBits(occludedMask) as any).toVar('blockedSectors')
          const sliceAccessibility = float(1)
            .sub(blockedSectors.div(float(SECTOR_COUNT)))
            .toVar('sliceAccessibility')
          weightedAccessibility.addAssign(sliceAccessibility.mul(NprojLen))
          weightSum.addAssign(NprojLen)
          // Welford online variance of per-slice accessibility → slice agreement.
          vbaoSliceCounter.addAssign(float(1))
          const vbaoSliceDelta = sliceAccessibility.sub(vbaoSliceMean).toVar('vbaoSliceDelta')
          vbaoSliceMean.addAssign(vbaoSliceDelta.div(vbaoSliceCounter))
          const vbaoSliceDeltaAfterMean = sliceAccessibility
            .sub(vbaoSliceMean)
            .toVar('vbaoSliceDeltaAfterMean')
          vbaoSliceM2.addAssign(vbaoSliceDelta.mul(vbaoSliceDeltaAfterMean))
        },
      )

      const accessibility = clamp(
        weightedAccessibility.div(max(weightSum, float(1e-4))),
        float(0),
        float(1),
      ).toVar('accessibility')
      const contrastedAo = pow(accessibility, this.contrast)
      const vbaoAo = float(1)
        .sub(float(1).sub(contrastedAo).mul(this.strength))
        .toVar('vbaoAo')
      // Receiver confidence folded into the G channel (R = AO).
      const vbaoReceiverSupport = vbaoAcceptedCount
        .div(max(vbaoCandidateCount, float(1e-6)))
        .clamp(0, 1)
        .toVar('vbaoReceiverSupport')
      const vbaoSliceVariance = vbaoSliceM2
        .div(max(vbaoSliceCounter, float(1)))
        .toVar('vbaoSliceVariance')
      const vbaoSliceStdDev = sqrt(max(vbaoSliceVariance, float(0))).toVar('vbaoSliceStdDev')
      const vbaoSliceAgreement = clamp(
        float(1).sub(vbaoSliceStdDev.div(float(0.5))),
        float(0),
        float(1),
      ).toVar('vbaoSliceAgreement')
      const vbaoConfidence = sqrt(vbaoReceiverSupport.mul(vbaoSliceAgreement))
        .clamp(0, 1)
        .toVar('vbaoConfidence')
      return vec4(vbaoAo, vbaoConfidence, float(0), float(1))
    })

    this.material.fragmentNode = vbaoKernel().context(builder.getSharedContext())
    this.material.needsUpdate = true

    return this.rawEstimateTextureNode
  }

  dispose(): void {
    this.resolveNode?.dispose()
    this.halfCleanupNode?.dispose()
    this.fullPolishNode?.dispose()
    this.temporalAccumulateNode?.dispose()
    this.rawEstimateTarget.dispose()
    this.material.dispose()
  }
}

export function vbao(
  depthNode: Node,
  normalNode: Node,
  camera: Camera,
  options?: VBAONodeOptions,
): VBAONode {
  return new VBAONode(depthNode, normalNode, camera, options)
}
