/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import {
  NodeMaterial,
  QuadMesh,
  RedFormat,
  RenderTarget,
  RendererUtils,
  TempNode,
  Vector2,
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
  uniform,
  uv,
  vec2,
  vec3,
  viewZToPerspectiveDepth,
} from 'three/tsl'

const quadMesh = new QuadMesh()
const size = new Vector2()

let rendererState
type SampleableNode = TextureNode & { readonly value?: unknown }
type SharedContextBuilder = NodeBuilder & { getSharedContext: () => NodeBuilderContext }

export interface HorizonAoNodeOptions {
  readonly radius?: number
  readonly intensity?: number
  readonly falloff?: number
  readonly thickness?: number
  readonly slices?: number
  readonly samples?: number
  readonly resolutionScale?: number
}

export const DEFAULT_HORIZON_AO_NODE_OPTIONS = {
  radius: 1.25,
  intensity: 1,
  falloff: 0.85,
  thickness: 0.5,
  slices: 3,
  samples: 12,
  resolutionScale: 0.5,
} as const satisfies Required<HorizonAoNodeOptions>

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
  private readonly cameraProjectionMatrix
  private readonly cameraProjectionMatrixInverse
  private readonly cameraNear
  private readonly cameraFar

  constructor(depthNode: Node, normalNode: Node | null, camera: Camera, options: HorizonAoNodeOptions = {}) {
    super('float')

    this.depthNode = depthNode as SampleableNode
    this.normalNode = normalNode as SampleableNode | null
    this.camera = camera
    this.renderTarget.texture.name = 'HorizonAO.Raw'
    this.material.name = 'HorizonAO Raw'
    this.textureNode = passTexture(this as never, this.renderTarget.texture)
    this.cameraProjectionMatrix = uniform(camera.projectionMatrix)
    this.cameraProjectionMatrixInverse = uniform(camera.projectionMatrixInverse)
    this.cameraNear = reference('near', 'float', camera)
    this.cameraFar = reference('far', 'float', camera)

    this.configure(options)
  }

  configure(options: HorizonAoNodeOptions): void {
    if (options.radius !== undefined) this.radius.value = clampNumber(options.radius, 0.05, 8)
    if (options.intensity !== undefined) this.intensity.value = clampNumber(options.intensity, 0, 4)
    if (options.falloff !== undefined) this.falloff.value = clampNumber(options.falloff, 0, 1)
    if (options.thickness !== undefined) this.thickness.value = clampNumber(options.thickness, 0, 4)
    if (options.slices !== undefined) this.slices.value = Math.round(clampNumber(options.slices, 1, 8))
    if (options.samples !== undefined) this.samples.value = Math.round(clampNumber(options.samples, 2, 32))
    if (options.resolutionScale !== undefined) this.resolutionScale = clampNumber(options.resolutionScale, 0.25, 1)
  }

  getTextureNode(): TextureNode {
    return this.textureNode
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
        : getNormalFromDepth(sampleUv, this.depthNode.value as never, this.cameraProjectionMatrixInverse)

    const buildSliceFrame = (viewNormal: Node, viewDir: Node, sliceIndex: Node, sliceCount: Node) => {
      const angle = float(sliceIndex).div(sliceCount).mul(PI).toVar()
      const tangent = normalize(vec3(viewNormal.y.negate(), viewNormal.x, 0.0)).toVar()
      const bitangent = normalize(cross(viewNormal, tangent)).toVar()
      const kernelMatrix = mat3(tangent, bitangent, viewNormal)
      const sampleDir = normalize(kernelMatrix.mul(vec3(cos(angle), sin(angle), 0))).toVar()
      const sliceBitangent = normalize(cross(sampleDir, viewDir)).toVar()
      const sliceTangent = cross(sliceBitangent, viewDir)
      const normalInSlice = normalize(viewNormal.sub(sliceBitangent.mul(dot(viewNormal, sliceBitangent)))).toVar()
      const tangentToNormalInSlice = cross(normalInSlice, sliceBitangent).toVar()

      return {
        normalInSlice,
        sampleDir,
        sliceTangent,
        tangentToNormalInSlice,
      }
    }

    const computeSampleOffset = (sampleDir: Node, stepIndex: Node, stepCount: Node) => {
      const centerBias = pow(div(float(stepIndex).add(1), stepCount), 1.35)
      return sampleDir.mul(this.radius).mul(centerBias)
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
      stepIndex: Node,
      stepCount: Node,
    ) => {
      const sampleOffset = computeSampleOffset(sampleDir, stepIndex, stepCount)

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
        horizonY.sub(horizonX).add(sinHorizons.x.mul(cosHorizons.x).sub(sinHorizons.y.mul(cosHorizons.y))),
      )
      const normalContribution = mul(0.5, sub(2, cosHorizons.x.mul(cosHorizons.x)).sub(cosHorizons.y.mul(cosHorizons.y)))

      return nx.mul(tangentContribution).add(ny.mul(normalContribution))
    }

    const rawAo = Fn(() => {
      const depth = sampleDepth(uvNode).toVar()
      depth.greaterThanEqual(1.0).discard()

      const viewPosition = getViewPosition(uvNode, depth, this.cameraProjectionMatrixInverse).toVar()
      const viewNormal = sampleNormal(uvNode).toVar()
      const viewDir = normalize(viewPosition.xyz.negate()).toVar()
      const directions = this.slices.toVar()
      const steps = add(this.samples, directions.sub(1)).div(directions).toVar()
      const occlusion = float(0).toVar()

      Loop({ start: int(0), end: directions, type: 'int', condition: '<' }, ({ i }: { readonly i: Node<'int'> }) => {
        const { normalInSlice, sampleDir, sliceTangent, tangentToNormalInSlice } = buildSliceFrame(
          viewNormal,
          viewDir,
          i,
          directions,
        )
        const cosHorizons = vec2(
          dot(viewDir, tangentToNormalInSlice),
          dot(viewDir, tangentToNormalInSlice.negate()),
        ).toVar()

        Loop({ end: steps, type: 'int', condition: '<' }, ({ i: j }: { readonly i: Node<'int'> }) => {
          marchHorizonPair(cosHorizons, viewPosition, viewDir, sampleDir, j, steps)
        })

        occlusion.addAssign(resolveSliceOcclusion(cosHorizons, normalInSlice, sliceTangent, viewDir))
      })

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
  return new HorizonAoNode(nodeObject(depthNode), normalNode === null ? null : nodeObject(normalNode), camera, options)
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}
