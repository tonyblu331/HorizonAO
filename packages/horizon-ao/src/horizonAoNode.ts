/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import {
  DataTexture,
  NodeMaterial,
  QuadMesh,
  RedFormat,
  RenderTarget,
  RendererUtils,
  RepeatWrapping,
  TempNode,
  Vector2,
  Vector3,
  type Camera,
  type Node,
  type NodeBuilder,
  type NodeBuilderContext,
  type NodeFrame,
  type TextureNode,
} from 'three/webgpu'
import {
  Fn,
  If,
  Loop,
  NodeUpdateType,
  PI,
  abs,
  acos,
  add,
  clamp,
  cos,
  cross,
  div,
  dot,
  float,
  getNormalFromDepth,
  getScreenPosition,
  getViewPosition,
  int,
  logarithmicDepthToViewZ,
  mat3,
  max,
  mix,
  mul,
  nodeObject,
  normalize,
  passTexture,
  pow,
  reference,
  sin,
  sqrt,
  sub,
  texture,
  textureSize,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
  viewZToPerspectiveDepth,
} from 'three/tsl'
import {
  DEFAULT_HORIZON_AO_KERNEL_OPTIONS,
  HORIZON_AO_CENTER_BIAS_EXPONENT,
  clampHorizonAoKernelOptions,
  generateMagicSquareIndices,
  type HorizonAoKernelOptions,
} from './horizonAoMath'

const quadMesh = new QuadMesh()
const size = new Vector2()

let rendererState
type SampleableNode = TextureNode & { readonly value?: unknown }
type SharedContextBuilder = NodeBuilder & { getSharedContext: () => NodeBuilderContext }

export type HorizonAoNodeOptions = HorizonAoKernelOptions

export const DEFAULT_HORIZON_AO_NODE_OPTIONS = DEFAULT_HORIZON_AO_KERNEL_OPTIONS

export interface HorizonAoDenoiseOptions {
  readonly radius?: number
  readonly lumaPhi?: number
  readonly depthPhi?: number
  readonly normalPhi?: number
}

export const DEFAULT_HORIZON_AO_DENOISE_OPTIONS = {
  radius: 3,
  lumaPhi: 5,
  depthPhi: 5,
  normalPhi: 8,
} as const satisfies Required<HorizonAoDenoiseOptions>

export class HorizonAoNode extends TempNode<'float'> {
  readonly depthNode: SampleableNode
  readonly normalNode: SampleableNode | null
  readonly camera: Camera
  readonly radius = uniform(DEFAULT_HORIZON_AO_NODE_OPTIONS.radius)
  readonly intensity = uniform(DEFAULT_HORIZON_AO_NODE_OPTIONS.intensity)
  readonly falloff = uniform(DEFAULT_HORIZON_AO_NODE_OPTIONS.falloff)
  readonly thickness = uniform(DEFAULT_HORIZON_AO_NODE_OPTIONS.thickness)
  readonly slices = uniform(DEFAULT_HORIZON_AO_NODE_OPTIONS.slices)
  readonly samples = uniform(DEFAULT_HORIZON_AO_NODE_OPTIONS.samples)
  readonly resolution = uniform(new Vector2())

  resolutionScale: number = DEFAULT_HORIZON_AO_NODE_OPTIONS.resolutionScale
  updateBeforeType = NodeUpdateType.FRAME

  private readonly renderTarget = new RenderTarget(1, 1, {
    depthBuffer: false,
    format: RedFormat,
  })
  private readonly material = new NodeMaterial()
  private readonly textureNode
  private readonly sampleTextureNode
  private readonly noiseNode
  private readonly cameraProjectionMatrix
  private readonly cameraProjectionMatrixInverse
  private readonly cameraNear
  private readonly cameraFar

  constructor(
    depthNode: Node,
    normalNode: Node | null,
    camera: Camera,
    options: HorizonAoNodeOptions = {},
  ) {
    super('float')

    this.depthNode = depthNode as SampleableNode
    this.normalNode = normalNode as SampleableNode | null
    this.camera = camera
    this.renderTarget.texture.name = 'HorizonAO.Raw'
    this.material.name = 'HorizonAO Raw'
    this.textureNode = passTexture(this as never, this.renderTarget.texture)
    this.sampleTextureNode = texture(this.renderTarget.texture)
    this.noiseNode = texture(generateMagicSquareNoise())
    this.cameraProjectionMatrix = uniform(camera.projectionMatrix)
    this.cameraProjectionMatrixInverse = uniform(camera.projectionMatrixInverse)
    this.cameraNear = reference('near', 'float', camera)
    this.cameraFar = reference('far', 'float', camera)

    this.configure(options)
  }

  configure(options: HorizonAoNodeOptions): void {
    const next = clampHorizonAoKernelOptions({
      radius: this.radius.value,
      intensity: this.intensity.value,
      falloff: this.falloff.value,
      thickness: this.thickness.value,
      slices: this.slices.value,
      samples: this.samples.value,
      resolutionScale: this.resolutionScale,
      ...options,
    })

    this.radius.value = next.radius
    this.intensity.value = next.intensity
    this.falloff.value = next.falloff
    this.thickness.value = next.thickness
    this.slices.value = next.slices
    this.samples.value = next.samples
    this.resolutionScale = next.resolutionScale
  }

  getTextureNode(): TextureNode {
    return this.textureNode
  }

  getSampleTextureNode(): TextureNode {
    return this.sampleTextureNode
  }

  setSize(width: number, height: number): void {
    const scaledWidth = Math.round(this.resolutionScale * width)
    const scaledHeight = Math.round(this.resolutionScale * height)

    this.resolution.value.set(scaledWidth, scaledHeight)
    this.renderTarget.setSize(scaledWidth, scaledHeight)
  }

  updateBefore(frame: NodeFrame): void {
    const renderer = frame.renderer
    if (renderer === null) return

    rendererState = RendererUtils.resetRendererState(renderer, rendererState)

    const drawingBufferSize = renderer.getDrawingBufferSize(size)
    this.setSize(drawingBufferSize.width, drawingBufferSize.height)

    quadMesh.material = this.material
    quadMesh.name = 'HorizonAO Raw'

    renderer.setClearColor(0xffffff, 1)
    renderer.setRenderTarget(this.renderTarget)
    quadMesh.render(renderer)

    RendererUtils.restoreRendererState(renderer, rendererState)
  }

  setup(builder: NodeBuilder): Node | null {
    const sharedBuilder = builder as SharedContextBuilder
    const uvNode = uv()

    const sampleDepth = (sampleUv: Node) => {
      const depth = this.depthNode.sample(sampleUv).r

      if (sharedBuilder.renderer.logarithmicDepthBuffer === true) {
        const viewZ = logarithmicDepthToViewZ(depth, this.cameraNear, this.cameraFar)
        return viewZToPerspectiveDepth(viewZ, this.cameraNear, this.cameraFar)
      }

      return depth
    }

    const sampleNormal = (sampleUv: Node) =>
      this.normalNode !== null
        ? this.normalNode.sample(sampleUv).rgb.normalize()
        : getNormalFromDepth(
            sampleUv,
            this.depthNode.value as never,
            this.cameraProjectionMatrixInverse,
          )

    const sampleNoise = (sampleUv: Node) => this.noiseNode.sample(sampleUv)

    const buildSliceFrame = (
      viewNormal: Node,
      viewDir: Node,
      sliceIndex: Node,
      sliceCount: Node,
      kernelMatrix: Node,
      noiseTexel: Node,
    ) => {
      const angle = float(sliceIndex).div(sliceCount).mul(PI).toVar()
      const sampleDir = vec4(cos(angle), sin(angle), 0, add(0.5, mul(0.5, noiseTexel.w)))
      sampleDir.xyz = normalize(kernelMatrix.mul(sampleDir.xyz))
      const sliceBitangent = normalize(cross(sampleDir.xyz, viewDir)).toVar()
      const sliceTangent = cross(sliceBitangent, viewDir)
      const normalInSlice = normalize(
        viewNormal.sub(sliceBitangent.mul(dot(viewNormal, sliceBitangent))),
      ).toVar()
      const tangentToNormalInSlice = cross(normalInSlice, sliceBitangent).toVar()

      return {
        normalInSlice,
        sampleDir: sampleDir.xyz,
        sampleRadiusScale: sampleDir.w,
        sliceTangent,
        tangentToNormalInSlice,
      }
    }

    const computeSampleOffset = (
      sampleDir: Node,
      sampleRadiusScale: Node,
      stepIndex: Node,
      stepCount: Node,
    ) => {
      const centerBias = pow(
        div(float(stepIndex).add(1), stepCount),
        HORIZON_AO_CENTER_BIAS_EXPONENT,
      )
      return sampleDir.mul(this.radius).mul(sampleRadiusScale).mul(centerBias)
    }

    const updateHorizon = (
      horizonValue: Node,
      sampleViewPosition: Node,
      viewPosition: Node,
      viewDir: Node,
      stepIndex: Node,
    ) => {
      const viewDelta = sampleViewPosition.sub(viewPosition).toVar()

      If(abs(viewDelta.z).lessThan(this.thickness), () => {
        const sampleCosHorizon = dot(viewDir, normalize(viewDelta))
        const sampleFalloff = mix(1, float(2).div(float(stepIndex).add(2)), this.falloff)
        horizonValue.addAssign(max(0, mul(sampleCosHorizon.sub(horizonValue), sampleFalloff)))
      })
    }

    const marchHorizonPair = (
      cosHorizons: Node,
      viewPosition: Node,
      viewDir: Node,
      sampleDir: Node,
      sampleRadiusScale: Node,
      stepIndex: Node,
      stepCount: Node,
    ) => {
      const sampleOffset = computeSampleOffset(sampleDir, sampleRadiusScale, stepIndex, stepCount)

      const positiveScreenPosition = getScreenPosition(
        viewPosition.add(sampleOffset),
        this.cameraProjectionMatrix,
      ).toVar()
      const positiveDepth = sampleDepth(positiveScreenPosition).toVar()
      const positiveViewPosition = getViewPosition(
        positiveScreenPosition,
        positiveDepth,
        this.cameraProjectionMatrixInverse,
      ).toVar()
      updateHorizon(cosHorizons.x, positiveViewPosition, viewPosition, viewDir, stepIndex)

      const negativeScreenPosition = getScreenPosition(
        viewPosition.sub(sampleOffset),
        this.cameraProjectionMatrix,
      ).toVar()
      const negativeDepth = sampleDepth(negativeScreenPosition).toVar()
      const negativeViewPosition = getViewPosition(
        negativeScreenPosition,
        negativeDepth,
        this.cameraProjectionMatrixInverse,
      ).toVar()
      updateHorizon(cosHorizons.y, negativeViewPosition, viewPosition, viewDir, stepIndex)
    }

    const resolveSliceOcclusion = (
      cosHorizons: Node,
      normalInSlice: Node,
      sliceTangent: Node,
      viewDir: Node,
    ) => {
      const sinHorizons = sqrt(sub(1, cosHorizons.mul(cosHorizons))).toVar()
      const nx = dot(normalInSlice, sliceTangent)
      const ny = dot(normalInSlice, viewDir)
      const horizonX = acos(cosHorizons.x)
      const horizonY = acos(cosHorizons.y)
      const tangentContribution = mul(
        0.5,
        horizonY
          .sub(horizonX)
          .add(sinHorizons.x.mul(cosHorizons.x).sub(sinHorizons.y.mul(cosHorizons.y))),
      )
      const normalContribution = mul(
        0.5,
        sub(2, cosHorizons.x.mul(cosHorizons.x)).sub(cosHorizons.y.mul(cosHorizons.y)),
      )

      return nx.mul(tangentContribution).add(ny.mul(normalContribution))
    }

    const rawAo = Fn(() => {
      const depth = sampleDepth(uvNode).toVar()
      depth.greaterThanEqual(1.0).discard()

      const viewPosition = getViewPosition(
        uvNode,
        depth,
        this.cameraProjectionMatrixInverse,
      ).toVar()
      const viewNormal = sampleNormal(uvNode).toVar()
      const viewDir = normalize(viewPosition.xyz.negate()).toVar()
      const noiseResolution = textureSize(this.noiseNode, 0)
      let noiseUv = vec2(uvNode.x, uvNode.y.oneMinus())
      noiseUv = noiseUv.mul(this.resolution.div(noiseResolution))
      const noiseTexel = sampleNoise(noiseUv).toVar()
      const randomVec = noiseTexel.xyz.mul(2.0).sub(1.0)
      const tangent = vec3(randomVec.xy, 0.0).normalize()
      const bitangent = vec3(tangent.y.mul(-1.0), tangent.x, 0.0)
      const kernelMatrix = mat3(tangent, bitangent, vec3(0.0, 0.0, 1.0))
      const directions = this.slices.toVar()
      const steps = add(this.samples, directions.sub(1)).div(directions).toVar()
      const occlusion = float(0).toVar()

      Loop(
        { start: int(0), end: directions, type: 'int', condition: '<' },
        ({ i }: { readonly i: Node<'int'> }) => {
          const {
            normalInSlice,
            sampleDir,
            sampleRadiusScale,
            sliceTangent,
            tangentToNormalInSlice,
          } = buildSliceFrame(viewNormal, viewDir, i, directions, kernelMatrix, noiseTexel)
          const cosHorizons = vec2(
            dot(viewDir, tangentToNormalInSlice),
            dot(viewDir, tangentToNormalInSlice.negate()),
          ).toVar()

          Loop(
            { end: steps, type: 'int', condition: '<' },
            ({ i: j }: { readonly i: Node<'int'> }) => {
              marchHorizonPair(
                cosHorizons,
                viewPosition,
                viewDir,
                sampleDir,
                sampleRadiusScale,
                j,
                steps,
              )
            },
          )

          occlusion.addAssign(
            resolveSliceOcclusion(cosHorizons, normalInSlice, sliceTangent, viewDir),
          )
        },
      )

      const accessibility = clamp(occlusion.div(directions), 0, 1)
      return pow(accessibility, this.intensity)
    })

    this.material.fragmentNode = rawAo().context(sharedBuilder.getSharedContext())
    this.material.needsUpdate = true

    return this.textureNode
  }

  dispose(): void {
    this.renderTarget.dispose()
    this.material.dispose()
  }
}

export function horizonAO(
  depthNode: Node,
  normalNode: Node | null,
  camera: Camera,
  options?: HorizonAoNodeOptions,
): HorizonAoNode {
  return new HorizonAoNode(
    nodeObject(depthNode),
    normalNode === null ? null : nodeObject(normalNode),
    camera,
    options,
  )
}

export class HorizonAoDenoiseNode extends TempNode<'float'> {
  readonly aoNode: SampleableNode
  readonly depthNode: SampleableNode
  readonly normalNode: SampleableNode | null
  readonly camera: Camera
  readonly radius = uniform(DEFAULT_HORIZON_AO_DENOISE_OPTIONS.radius)
  readonly lumaPhi = uniform(DEFAULT_HORIZON_AO_DENOISE_OPTIONS.lumaPhi)
  readonly depthPhi = uniform(DEFAULT_HORIZON_AO_DENOISE_OPTIONS.depthPhi)
  readonly normalPhi = uniform(DEFAULT_HORIZON_AO_DENOISE_OPTIONS.normalPhi)
  readonly resolution = uniform(new Vector2())
  updateBeforeType = NodeUpdateType.FRAME

  private readonly renderTarget = new RenderTarget(1, 1, {
    depthBuffer: false,
    format: RedFormat,
  })
  private readonly material = new NodeMaterial()
  private readonly textureNode
  private readonly sourceAoNode: HorizonAoNode | null
  private readonly cameraProjectionMatrixInverse

  constructor(
    aoNode: Node | HorizonAoNode,
    depthNode: Node,
    normalNode: Node | null,
    camera: Camera,
    options: HorizonAoDenoiseOptions = {},
  ) {
    super('float')

    this.sourceAoNode = aoNode instanceof HorizonAoNode ? aoNode : null
    this.aoNode =
      this.sourceAoNode === null
        ? (aoNode as SampleableNode)
        : (this.sourceAoNode.getSampleTextureNode() as SampleableNode)
    this.depthNode = depthNode as SampleableNode
    this.normalNode = normalNode as SampleableNode | null
    this.camera = camera
    this.renderTarget.texture.name = 'HorizonAO.Denoised'
    this.material.name = 'HorizonAO Denoise'
    this.textureNode = passTexture(this as never, this.renderTarget.texture)
    this.cameraProjectionMatrixInverse = uniform(camera.projectionMatrixInverse)

    this.configure(options)
  }

  configure(options: HorizonAoDenoiseOptions): void {
    const next = {
      radius: clampDenoiseNumber(options.radius ?? this.radius.value, 1, 12),
      lumaPhi: clampDenoiseNumber(options.lumaPhi ?? this.lumaPhi.value, 0.1, 32),
      depthPhi: clampDenoiseNumber(options.depthPhi ?? this.depthPhi.value, 0.1, 32),
      normalPhi: clampDenoiseNumber(options.normalPhi ?? this.normalPhi.value, 0.1, 32),
    }

    this.radius.value = next.radius
    this.lumaPhi.value = next.lumaPhi
    this.depthPhi.value = next.depthPhi
    this.normalPhi.value = next.normalPhi
  }

  getTextureNode(): TextureNode {
    return this.textureNode
  }

  setSize(width: number, height: number): void {
    const targetWidth = Math.max(1, Math.round(width))
    const targetHeight = Math.max(1, Math.round(height))

    this.resolution.value.set(targetWidth, targetHeight)
    this.renderTarget.setSize(targetWidth, targetHeight)
  }

  updateBefore(frame: NodeFrame): void {
    const renderer = frame.renderer
    if (renderer === null) return

    this.sourceAoNode?.updateBefore(frame)
    rendererState = RendererUtils.resetRendererState(renderer, rendererState)

    const image = this.aoNode.value?.image
    if (image?.width !== undefined && image?.height !== undefined) {
      this.setSize(image.width, image.height)
    } else {
      const drawingBufferSize = renderer.getDrawingBufferSize(size)
      this.setSize(drawingBufferSize.width, drawingBufferSize.height)
    }

    quadMesh.material = this.material
    quadMesh.name = 'HorizonAO Denoise'

    renderer.setClearColor(0xffffff, 1)
    renderer.setRenderTarget(this.renderTarget)
    quadMesh.render(renderer)

    RendererUtils.restoreRendererState(renderer, rendererState)
  }

  setup(builder: NodeBuilder): Node | null {
    const sharedBuilder = builder as SharedContextBuilder
    const uvNode = uv()

    this.sourceAoNode?.setup(builder)

    const sampleAo = (sampleUv: Node) => this.aoNode.sample(sampleUv).r
    const sampleDepth = (sampleUv: Node) => this.depthNode.sample(sampleUv).r
    const sampleNormal = (sampleUv: Node) =>
      this.normalNode !== null
        ? this.normalNode.sample(sampleUv).rgb.normalize()
        : getNormalFromDepth(
            sampleUv,
            this.depthNode.value as never,
            this.cameraProjectionMatrixInverse,
          )

    const accumulate = (
      filteredAo: Node,
      totalWeight: Node,
      centerAo: Node,
      centerNormal: Node,
      centerViewPosition: Node,
      sampleUv: Node,
    ) => {
      const neighborAo = sampleAo(sampleUv).toVar()
      const neighborDepth = sampleDepth(sampleUv).toVar()
      const neighborNormal = sampleNormal(sampleUv).toVar()
      const neighborViewPosition = getViewPosition(
        sampleUv,
        neighborDepth,
        this.cameraProjectionMatrixInverse,
      ).toVar()
      const lumaSimilarity = float(1).div(max(1, abs(neighborAo.sub(centerAo)).div(this.lumaPhi)))
      const depthDelta = abs(dot(centerViewPosition.sub(neighborViewPosition), centerNormal))
      const depthSimilarity = float(1).div(max(1, depthDelta.div(this.depthPhi)))
      const normalSimilarity = pow(max(dot(centerNormal, neighborNormal), 0), this.normalPhi)
      const weight = lumaSimilarity.mul(depthSimilarity).mul(normalSimilarity).toVar()

      filteredAo.addAssign(neighborAo.mul(weight))
      totalWeight.addAssign(weight)
    }

    const denoiseAo = Fn(() => {
      const centerDepth = sampleDepth(uvNode).toVar()
      const centerAo = sampleAo(uvNode).toVar()
      const centerNormal = sampleNormal(uvNode).toVar()
      const centerViewPosition = getViewPosition(
        uvNode,
        centerDepth,
        this.cameraProjectionMatrixInverse,
      ).toVar()
      const radiusUv = vec2(
        this.radius.div(this.resolution.x),
        this.radius.div(this.resolution.y),
      ).toVar()
      const halfRadiusUv = radiusUv.mul(0.5).toVar()
      const filteredAo = centerAo.toVar()
      const totalWeight = float(1).toVar()

      accumulate(
        filteredAo,
        totalWeight,
        centerAo,
        centerNormal,
        centerViewPosition,
        uvNode.add(vec2(radiusUv.x, 0)),
      )
      accumulate(
        filteredAo,
        totalWeight,
        centerAo,
        centerNormal,
        centerViewPosition,
        uvNode.sub(vec2(radiusUv.x, 0)),
      )
      accumulate(
        filteredAo,
        totalWeight,
        centerAo,
        centerNormal,
        centerViewPosition,
        uvNode.add(vec2(0, radiusUv.y)),
      )
      accumulate(
        filteredAo,
        totalWeight,
        centerAo,
        centerNormal,
        centerViewPosition,
        uvNode.sub(vec2(0, radiusUv.y)),
      )
      accumulate(
        filteredAo,
        totalWeight,
        centerAo,
        centerNormal,
        centerViewPosition,
        uvNode.add(halfRadiusUv),
      )
      accumulate(
        filteredAo,
        totalWeight,
        centerAo,
        centerNormal,
        centerViewPosition,
        uvNode.sub(halfRadiusUv),
      )

      return clamp(filteredAo.div(totalWeight), 0, 1)
    })

    this.material.fragmentNode = denoiseAo().context(sharedBuilder.getSharedContext())
    this.material.needsUpdate = true

    return this.textureNode
  }

  dispose(): void {
    this.renderTarget.dispose()
    this.material.dispose()
  }
}

export function horizonAODenoise(
  aoNode: Node | HorizonAoNode,
  depthNode: Node,
  normalNode: Node | null,
  camera: Camera,
  options?: HorizonAoDenoiseOptions,
): HorizonAoDenoiseNode {
  return new HorizonAoDenoiseNode(
    aoNode instanceof HorizonAoNode ? aoNode : nodeObject(aoNode),
    nodeObject(depthNode),
    normalNode === null ? null : nodeObject(normalNode),
    camera,
    options,
  )
}

function generateMagicSquareNoise(size = 5): DataTexture {
  const magicSquare = generateMagicSquareIndices(size)
  const noiseSize = Math.sqrt(magicSquare.length)
  const data = new Uint8Array(magicSquare.length * 4)

  for (let index = 0; index < magicSquare.length; index += 1) {
    const angle = (2 * Math.PI * magicSquare[index]) / magicSquare.length
    const randomVec = new Vector3(Math.cos(angle), Math.sin(angle), 0).normalize()

    data[index * 4] = (randomVec.x * 0.5 + 0.5) * 255
    data[index * 4 + 1] = (randomVec.y * 0.5 + 0.5) * 255
    data[index * 4 + 2] = 127
    data[index * 4 + 3] = 255
  }

  const noiseTexture = new DataTexture(data, noiseSize, noiseSize)
  noiseTexture.wrapS = RepeatWrapping
  noiseTexture.wrapT = RepeatWrapping
  noiseTexture.needsUpdate = true

  return noiseTexture
}

function clampDenoiseNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}
