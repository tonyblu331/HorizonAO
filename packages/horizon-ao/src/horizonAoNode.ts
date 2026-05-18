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

    const rawAo = Fn(() => {
      const depth = sampleDepth(uvNode).toVar()
      depth.greaterThanEqual(1.0).discard()

      const viewPosition = getViewPosition(uvNode, depth, this.cameraProjectionMatrixInverse).toVar()
      const viewNormal = sampleNormal(uvNode).toVar()
      const viewDir = normalize(viewPosition.xyz.negate()).toVar()
      const tangent = normalize(vec3(viewNormal.y.negate(), viewNormal.x, 0.0)).toVar()
      const bitangent = normalize(cross(viewNormal, tangent)).toVar()
      const kernelMatrix = mat3(tangent, bitangent, viewNormal)
      const directions = this.slices.toVar()
      const steps = add(this.samples, directions.sub(1)).div(directions).toVar()
      const occlusion = float(0).toVar()

      Loop({ start: int(0), end: directions, type: 'int', condition: '<' }, ({ i }: { readonly i: Node<'int'> }) => {
        const angle = float(i).div(directions).mul(PI).toVar()
        const sampleDir = normalize(kernelMatrix.mul(vec3(cos(angle), sin(angle), 0))).toVar()
        const sliceBitangent = normalize(cross(sampleDir, viewDir)).toVar()
        const sliceTangent = cross(sliceBitangent, viewDir)
        const normalInSlice = normalize(viewNormal.sub(sliceBitangent.mul(dot(viewNormal, sliceBitangent)))).toVar()
        const tangentToNormalInSlice = cross(normalInSlice, sliceBitangent).toVar()
        const cosHorizons = vec2(
          dot(viewDir, tangentToNormalInSlice),
          dot(viewDir, tangentToNormalInSlice.negate()),
        ).toVar()

        Loop({ end: steps, type: 'int', condition: '<' }, ({ i: j }: { readonly i: Node<'int'> }) => {
          const centerBias = pow(div(float(j).add(1), steps), 1.35)
          const sampleViewOffset = sampleDir.mul(this.radius).mul(centerBias)

          const sampleScreenPositionX = getScreenPosition(
            viewPosition.add(sampleViewOffset),
            this.cameraProjectionMatrix,
          ).toVar()
          const sampleDepthX = sampleDepth(sampleScreenPositionX).toVar()
          const sampleSceneViewPositionX = getViewPosition(
            sampleScreenPositionX,
            sampleDepthX,
            this.cameraProjectionMatrixInverse,
          ).toVar()
          const viewDeltaX = sampleSceneViewPositionX.sub(viewPosition).toVar()

          If(abs(viewDeltaX.z).lessThan(this.thickness), () => {
            const sampleCosHorizon = dot(viewDir, normalize(viewDeltaX))
            const sampleFalloff = mix(1, float(2).div(float(j).add(2)), this.falloff)
            cosHorizons.x.addAssign(max(0, mul(sampleCosHorizon.sub(cosHorizons.x), sampleFalloff)))
          })

          const sampleScreenPositionY = getScreenPosition(
            viewPosition.sub(sampleViewOffset),
            this.cameraProjectionMatrix,
          ).toVar()
          const sampleDepthY = sampleDepth(sampleScreenPositionY).toVar()
          const sampleSceneViewPositionY = getViewPosition(
            sampleScreenPositionY,
            sampleDepthY,
            this.cameraProjectionMatrixInverse,
          ).toVar()
          const viewDeltaY = sampleSceneViewPositionY.sub(viewPosition).toVar()

          If(abs(viewDeltaY.z).lessThan(this.thickness), () => {
            const sampleCosHorizon = dot(viewDir, normalize(viewDeltaY))
            const sampleFalloff = mix(1, float(2).div(float(j).add(2)), this.falloff)
            cosHorizons.y.addAssign(max(0, mul(sampleCosHorizon.sub(cosHorizons.y), sampleFalloff)))
          })
        })

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

        occlusion.addAssign(nx.mul(tangentContribution).add(ny.mul(normalContribution)))
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
