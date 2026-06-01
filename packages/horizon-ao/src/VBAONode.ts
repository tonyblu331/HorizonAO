import {
  DataTexture,
  HalfFloatType,
  NearestFilter,
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
  NodeUpdateType,
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
  VBAO_DEFAULTS,
  VBAO_QUALITY_TIERS,
  clampVbaoNodeOptions,
  type VBAONodeOptions,
} from './vbaoConstants'
import { VBAOFullResPolishNode } from './VBAOFullResPolishNode'
import { VBAOHalfResCleanupNode } from './VBAOHalfResCleanupNode'
import { VBAOResolveNode } from './VBAOResolveNode'
import { VBAOTemporalAccumulationNode } from './VBAOTemporalAccumulationNode'
import { VBAO_NOISE_TILE_SIZE, getSharedVbaoNoiseTexture } from './vbaoNoise'
import {
  VBAO_PHASE_ATLAS_COLUMNS,
  VBAO_PHASE_ATLAS_ROWS,
  VBAO_PHASE_ATLAS_PHASES,
  VBAO_PHASE_STRIDE,
} from './vbaoSampling'

const quadMesh = new QuadMesh()
const size = new Vector2()
let rendererState: ReturnType<typeof RendererUtils.resetRendererState> | undefined

type SampleableNode = Node & {
  sample: (uvCoord: Node) => any
}

type VbaoRawLoopShape = {
  readonly slices: number
  readonly samples: number
  readonly fixed: boolean
}

type VbaoInternalTemporalMode = 'off' | 'host' | 'internal'

type VbaoInternalBenchmarkOptions = VBAONodeOptions & {
  readonly benchmark?: { readonly noiseTexture?: DataTexture }
  readonly temporalMode?: VbaoInternalTemporalMode
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

  private readonly renderTarget = new RenderTarget(1, 1, {
    depthBuffer: false,
    format: RedFormat,
    type: HalfFloatType,
  })
  private readonly material = new NodeMaterial()
  private readonly textureNode: TextureNode
  private resolveNode?: VBAOResolveNode | undefined
  private halfCleanupNode?: VBAOHalfResCleanupNode | undefined
  private fullPolishNode?: VBAOFullResPolishNode | undefined
  private temporalAccumulationNode?: VBAOTemporalAccumulationNode | undefined
  private outputTextureNode?: TextureNode
  private outputGraphKey = ''
  private outputGraphCreated = false
  private rawLoopShape: VbaoRawLoopShape = {
    slices: VBAO_DEFAULTS.slices,
    samples: VBAO_DEFAULTS.samples,
    fixed: false,
  }
  private readonly cameraProjectionMatrix
  private readonly cameraProjectionMatrixInverse
  private readonly cameraNear
  private readonly cameraFar
  private readonly noiseTexture: DataTexture
  private readonly noiseNode
  private readonly temporalPhaseOffset = uniform(0)
  private readonly temporalMode: VbaoInternalTemporalMode

  constructor(depthNode: Node, normalNode: Node, camera: Camera, options: VBAONodeOptions = {}) {
    if (normalNode === null || normalNode === undefined) {
      throw new TypeError('VBAONode: normalNode is required')
    }

    super('float')

    this.depthNode = depthNode as SampleableNode
    this.normalNode = normalNode as SampleableNode
    this.camera = camera
    this.renderTarget.texture.name = 'VBAO.Raw'
    this.renderTarget.texture.magFilter = NearestFilter
    this.renderTarget.texture.minFilter = NearestFilter
    this.renderTarget.texture.generateMipmaps = false
    this.renderTarget.texture.colorSpace = NoColorSpace
    this.material.name = 'VBAO'
    this.textureNode = passTexture(this as never, this.renderTarget.texture)
    this.cameraProjectionMatrix = uniform(camera.projectionMatrix)
    this.cameraProjectionMatrixInverse = uniform(camera.projectionMatrixInverse)
    this.cameraNear = reference('near', 'float', camera)
    this.cameraFar = reference('far', 'float', camera)
    const internalOptions = options as VbaoInternalBenchmarkOptions
    this.noiseTexture = internalOptions.benchmark?.noiseTexture ?? getSharedVbaoNoiseTexture()
    this.noiseNode = texture(this.noiseTexture)
    this.temporalMode = internalOptions.temporalMode ?? 'off'

    this.configure(options)
  }

  private resolveRawLoopShape(
    options: VBAONodeOptions,
    next: { slices: number; samples: number },
  ): VbaoRawLoopShape {
    const qualityName = options.quality ?? options.preset
    const fixed =
      qualityName !== undefined && options.slices === undefined && options.samples === undefined

    return {
      slices: next.slices,
      samples: next.samples,
      fixed,
    }
  }

  configure(options: VBAONodeOptions): void {
    const qualityName = options.quality ?? options.preset
    const quality = qualityName === undefined ? undefined : VBAO_QUALITY_TIERS[qualityName]
    const fallback = {
      radius: this.radius.value,
      thickness: this.thickness.value,
      strength: this.strength.value,
      contrast: this.contrast.value,
      softness: this.softness.value,
      slices: this.slices.value,
      samples: this.samples.value,
      resolutionScale: this.resolutionScale,
    }
    const mergedOptions = {
      ...(options.quality === undefined ? {} : { quality: options.quality }),
      ...(options.preset === undefined ? {} : { preset: options.preset }),
      radius: options.radius ?? fallback.radius,
      thickness: options.thickness ?? fallback.thickness,
      strength: options.strength ?? options.intensity ?? fallback.strength,
      contrast: options.contrast ?? options.scale ?? fallback.contrast,
      softness: options.softness ?? fallback.softness,
      slices: options.slices ?? quality?.slices ?? fallback.slices,
      samples: options.samples ?? quality?.samples ?? fallback.samples,
      resolutionScale:
        options.resolutionScale ?? quality?.resolutionScale ?? fallback.resolutionScale,
    } satisfies VBAONodeOptions
    const next = clampVbaoNodeOptions(mergedOptions)
    const nextLoopShape = this.resolveRawLoopShape(options, next)

    if (
      this.outputGraphCreated &&
      (next.softness !== this.softness.value ||
        next.resolutionScale !== this.resolutionScale ||
        nextLoopShape.slices !== this.rawLoopShape.slices ||
        nextLoopShape.samples !== this.rawLoopShape.samples ||
        nextLoopShape.fixed !== this.rawLoopShape.fixed)
    ) {
      throw new Error(
        'VBAONode.configure(): softness and resolutionScale affect the pass graph; product loop shape is construction-time only after getTextureNode(); create a new VBAONode or rebuild downstream pipelines.',
      )
    }

    this.radius.value = next.radius
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

  private getOrCreateHalfCleanupNode(input: TextureNode, strength: number): VBAOHalfResCleanupNode {
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

  private getOrCreateFullPolishNode(input: TextureNode, strength: number): VBAOFullResPolishNode {
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

  private getOrCreateTemporalAccumulationNode(input: TextureNode): VBAOTemporalAccumulationNode {
    if (
      this.temporalAccumulationNode === undefined ||
      this.temporalAccumulationNode.currentAoNode !== input
    ) {
      this.temporalAccumulationNode?.dispose()
      this.temporalAccumulationNode = new VBAOTemporalAccumulationNode(
        input,
        this.depthNode,
        this.normalNode,
        this.camera,
        {
          enabled: true,
          historyWeight: 0.8,
        },
      )
    } else {
      this.temporalAccumulationNode.configure({
        enabled: true,
        historyWeight: 0.8,
      })
    }

    return this.temporalAccumulationNode
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

  private disposeTemporalGraph(): void {
    this.temporalAccumulationNode?.dispose()
    this.temporalAccumulationNode = undefined
  }

  private currentOutputGraphKey(): string {
    const cleanupStrength = this.lowResolutionCleanupStrength()
    const polishStrength = this.fullResolutionPolishStrength()
    return [
      this.resolutionScale < 0.99 ? 'low' : 'full',
      cleanupStrength > 0 ? 'cleanup' : 'raw',
      polishStrength > 0 ? 'polish' : 'no-polish',
      this.resolutionScale.toFixed(4),
      this.softness.value.toFixed(4),
      this.temporalMode,
    ].join(':')
  }

  private assertOutputGraphStable(): void {
    if (!this.outputGraphCreated) return

    const currentGraphKey = this.currentOutputGraphKey()
    if (currentGraphKey === this.outputGraphKey) return

    throw new Error(
      'VBAONode: softness and resolutionScale affect the pass graph and are construction-time only after getTextureNode(); create a new VBAONode or rebuild downstream pipelines.',
    )
  }

  private rebuildOutputGraph(): void {
    const cleanupStrength = this.lowResolutionCleanupStrength()
    const polishStrength = this.fullResolutionPolishStrength()
    const graphKey = this.currentOutputGraphKey()

    if (graphKey === this.outputGraphKey && this.outputTextureNode !== undefined) return

    let output: TextureNode = this.textureNode

    if (this.resolutionScale < 0.99) {
      if (cleanupStrength > 0) {
        output = this.getOrCreateHalfCleanupNode(output, cleanupStrength).getTextureNode()
      } else {
        this.halfCleanupNode?.dispose()
        this.halfCleanupNode = undefined
      }

      output = this.getOrCreateResolveNode(output).getTextureNode()
    } else {
      this.disposeLowResGraph()
    }

    if (this.temporalMode === 'internal') {
      output = this.getOrCreateTemporalAccumulationNode(output).getTextureNode()
    } else {
      this.disposeTemporalGraph()
    }

    if (polishStrength > 0) {
      output = this.getOrCreateFullPolishNode(output, polishStrength).getTextureNode()
    } else {
      this.disposeFullPolishGraph()
    }

    this.outputTextureNode = output
    this.outputGraphKey = graphKey
  }

  getTextureNode(): TextureNode {
    this.assertOutputGraphStable()
    this.rebuildOutputGraph()
    this.outputGraphCreated = true
    return this.outputTextureNode ?? this.textureNode
  }

  getRawTextureNode(): TextureNode {
    return this.textureNode
  }

  /** @internal Demo benchmark evidence hook; not part of the public package contract. */
  getInternalTemporalDiagnostics() {
    return this.temporalAccumulationNode?.getInternalTemporalDiagnostics()
  }

  setSize(width: number, height: number): void {
    this.assertOutputGraphStable()

    const scaledWidth = Math.max(1, Math.round(this.resolutionScale * width))
    const scaledHeight = Math.max(1, Math.round(this.resolutionScale * height))

    this.sourceResolution.value.set(width, height)
    this.resolution.value.set(scaledWidth, scaledHeight)
    this.renderTarget.setSize(scaledWidth, scaledHeight)
  }

  updateBefore(frame: NodeFrame): boolean | undefined {
    const renderer = frame.renderer
    if (renderer === null || renderer === undefined) return undefined

    rendererState = RendererUtils.resetRendererState(renderer, rendererState as never)

    const drawingBufferSize = renderer.getDrawingBufferSize(size)
    this.setSize(drawingBufferSize.width, drawingBufferSize.height)

    quadMesh.material = this.material
    quadMesh.name = 'VBAO'

    renderer.setClearColor(0xffffff, 1)
    renderer.setRenderTarget(this.renderTarget)
    quadMesh.render(renderer)

    if (this.temporalMode === 'host') {
      this.temporalPhaseOffset.value =
        (this.temporalPhaseOffset.value + 1) % VBAO_PHASE_ATLAS_PHASES
    }

    RendererUtils.restoreRendererState(renderer, rendererState)
    return true
  }

  setup(builder: any): TextureNode {
    const uvNode = uv()
    const sliceLoopEnd = this.rawLoopShape.fixed ? int(this.rawLoopShape.slices) : int(this.slices)
    const sampleLoopEnd = this.rawLoopShape.fixed
      ? int(this.rawLoopShape.samples)
      : int(this.samples)
    const sliceCount = this.rawLoopShape.fixed
      ? float(this.rawLoopShape.slices)
      : float(this.slices)
    const sampleCount = this.rawLoopShape.fixed
      ? float(this.rawLoopShape.samples)
      : float(this.samples)

    const sampleDepth = (uvCoord: any) => {
      const d = this.depthNode.sample(uvCoord).r
      if (builder.renderer.logarithmicDepthBuffer === true) {
        const vz = logarithmicDepthToViewZ(d, this.cameraNear, this.cameraFar)
        return viewZToPerspectiveDepth(vz, this.cameraNear, this.cameraFar)
      }
      return d
    }

    const sampleNormal = (uvCoord: any) => this.normalNode.sample(uvCoord).rgb.normalize()

    const vbaoRawNoisePixel = floor(uvNode.mul(this.sourceResolution))
    const vbaoLocalPixel = vbaoRawNoisePixel
      .sub(
        floor(vbaoRawNoisePixel.div(float(VBAO_NOISE_TILE_SIZE))).mul(
          float(VBAO_NOISE_TILE_SIZE),
        ),
      )
      .toVar('vbaoLocalPixel')

    const sampleNoisePhase = (slice: any, sample: any) => {
      const phaseRaw = float(slice)
        .mul(float(VBAO_PHASE_STRIDE))
        .add(float(sample))
        .add(this.temporalPhaseOffset)
      const phase = phaseRaw.sub(
        floor(phaseRaw.div(float(VBAO_PHASE_ATLAS_PHASES))).mul(float(VBAO_PHASE_ATLAS_PHASES)),
      )
      const phaseY = floor(phase.div(float(VBAO_PHASE_ATLAS_COLUMNS)))
      const phaseX = phase.sub(phaseY.mul(float(VBAO_PHASE_ATLAS_COLUMNS)))
      const atlasPixel = vbaoLocalPixel.add(vec2(phaseX, phaseY).mul(float(VBAO_NOISE_TILE_SIZE)))
      const atlasUv = atlasPixel
        .add(vec2(0.5))
        .div(
          vec2(
            VBAO_NOISE_TILE_SIZE * VBAO_PHASE_ATLAS_COLUMNS,
            VBAO_NOISE_TILE_SIZE * VBAO_PHASE_ATLAS_ROWS,
          ),
        )
      return this.noiseNode.sample(atlasUv)
    }

    const maskRangeFn = (Fn as any)(([k0_in, k1_in]: any[]) => {
      const lo = int(max(float(0), min(float(SECTOR_COUNT), float(k0_in))))
      const hi = int(max(float(0), min(float(SECTOR_COUNT), float(k1_in))))
      const count = hi.sub(lo)
      const result = uint(0).toVar('maskRangeResult')

      If(count.greaterThan(int(0)), () => {
        If(count.greaterThanEqual(int(SECTOR_COUNT)), () => {
          result.assign(bitNot(uint(0)))
        }).Else(() => {
          const ucount = uint(count)
          const ones = shiftRight(bitNot(uint(0)), uint(SECTOR_COUNT).sub(ucount))
          result.assign(shiftLeft(ones, uint(lo)))
        })
      })

      return result
    }).setLayout({
      name: 'vbaoMaskRange',
      type: 'uint',
      inputs: [
        { name: 'k0', type: 'int' },
        { name: 'k1', type: 'int' },
      ],
    })

    const vbaoCosineMeasureNoAtan = (Fn as any)(
      ([D_in, V_in, S_in, sinGamma_in, cosGamma_in]: any[]) => {
        const D = vec3(D_in)
        const Vbasis = vec3(V_in)
        const Sbasis = vec3(S_in)
        const sinGamma = float(sinGamma_in)
        const cosGamma = float(cosGamma_in)
        const x = dot(D, Sbasis)
        const y = max(dot(D, Vbasis), float(1e-5))
        const invLen = float(1).div(sqrt(max(x.mul(x).add(y.mul(y)), float(1e-8))))
        const sinBeta = x.mul(cosGamma).sub(y.mul(sinGamma)).mul(invLen)
        const cosBeta = y.mul(cosGamma).add(x.mul(sinGamma)).mul(invLen)
        const interior = sinBeta.mul(float(0.5)).add(float(0.5))
        const clampedBoundary = sinBeta.greaterThanEqual(float(0)).select(float(1), float(0))
        return cosBeta.lessThan(float(0)).select(clampedBoundary, interior).clamp(0, 1)
      },
    ).setLayout({
      name: 'vbaoCosineMeasureNoAtan',
      type: 'float',
      inputs: [
        { name: 'D', type: 'vec3' },
        { name: 'V', type: 'vec3' },
        { name: 'S', type: 'vec3' },
        { name: 'sinGamma', type: 'float' },
        { name: 'cosGamma', type: 'float' },
      ],
    })

    const intervalMaskStochasticFn = (Fn as any)(([u0_in, u1_in, xi_in]: any[]) => {
      const u0 = clamp(min(float(u0_in), float(u1_in)), float(0), float(1)).toVar(
        'vbaoIntervalMaskU0',
      )
      const u1 = clamp(max(float(u0_in), float(u1_in)), float(0), float(1)).toVar(
        'vbaoIntervalMaskU1',
      )
      const xi = clamp(float(xi_in), float(0), float(1)).toVar('vbaoIntervalMaskXi')
      const intervalSectors = u1.sub(u0).mul(float(SECTOR_COUNT)).toVar('vbaoIntervalSectors')
      const result = uint(0).toVar('vbaoIntervalMaskResult')

      If(intervalSectors.greaterThan(float(1e-5)), () => {
        If(intervalSectors.greaterThanEqual(float(1)), () => {
          const k0 = int(ceil(u0.mul(float(SECTOR_COUNT)).sub(float(0.5))))
          const k1 = int(floor(u1.mul(float(SECTOR_COUNT)).sub(float(0.5))))
          result.assign((maskRangeFn as any)(k0, k1.add(int(1))))
        }).Else(() => {
          const thinSectorRaw = floor(u0.add(u1).mul(float(0.5 * SECTOR_COUNT)))
          const thinSectorIndex = int(
            max(float(0), min(float(SECTOR_COUNT - 1), thinSectorRaw)),
          ).toVar('vbaoThinSectorIndex')
          const thinSectorMask = shiftLeft(uint(1), uint(thinSectorIndex)).toVar(
            'vbaoThinSectorMask',
          )
          const thinContribution = (xi.lessThan(intervalSectors) as any).select(
            thinSectorMask,
            uint(0),
          )
          result.assign(thinContribution)
        })
      })

      return result
    }).setLayout({
      name: 'vbaoIntervalMaskStochastic',
      type: 'uint',
      inputs: [
        { name: 'u0', type: 'float' },
        { name: 'u1', type: 'float' },
        { name: 'xi', type: 'float' },
      ],
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
      const maxThickness = this.radius.mul(float(0.3)).toVar('vbaoMaxThickness')
      const baseThickness = min(this.thickness, maxThickness).toVar('vbaoBaseThickness')
      const maxValidRadius = this.radius.add(baseThickness).toVar('vbaoMaxValidRadius')
      const maxValidRadius2 = maxValidRadius.mul(maxValidRadius).toVar('vbaoMaxValidRadius2')
      const safeTexel = vec2(0.5).div(this.sourceResolution).toVar('vbaoSafeTexel')
      const weightedAccessibility = float(0).toVar('weightedAccessibility')
      const weightSum = float(0).toVar('weightSum')

      ;(Loop as any)(
        { start: int(0), end: sliceLoopEnd, type: 'int', condition: '<' },
        ({ i }: any) => {
          // GT-VBAO++ axial slice orientation: mirrored two-sided sampling covers π, not 2π.
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
                    const sampleDist = sqrt(max(sampleDist2, float(1e-8))).toVar('sampleDist')
                    const effectiveThickness = min(
                      baseThickness,
                      sampleDist.mul(float(0.85)),
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
          weightedAccessibility.addAssign(sliceAccessibility)
          weightSum.addAssign(float(1))
        },
      )

      const accessibility = clamp(
        weightedAccessibility.div(max(weightSum, float(1e-4))),
        float(0),
        float(1),
      ).toVar('accessibility')
      const contrastedAo = pow(accessibility, this.contrast)
      return float(1).sub(float(1).sub(contrastedAo).mul(this.strength))
    })

    this.material.fragmentNode = vbaoKernel().context(builder.getSharedContext())
    this.material.needsUpdate = true

    return this.textureNode
  }

  dispose(): void {
    this.resolveNode?.dispose()
    this.halfCleanupNode?.dispose()
    this.fullPolishNode?.dispose()
    this.temporalAccumulationNode?.dispose()
    this.renderTarget.dispose()
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
