import {
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
  type NodeFrame,
  type TextureNode,
} from 'three/webgpu'
import { passTexture } from 'three/tsl'

export class VBAOEffectPass extends TempNode<'float'> {
  protected readonly renderTarget = new RenderTarget(1, 1, {
    depthBuffer: false,
    format: RedFormat,
    type: HalfFloatType,
  })
  protected readonly material = new NodeMaterial()
  private readonly textureNode: TextureNode
  private rendererState: ReturnType<typeof RendererUtils.resetRendererState> | undefined

  constructor(textureName: string, materialName: string) {
    super('float')

    this.renderTarget.texture.name = textureName
    this.renderTarget.texture.magFilter = NearestFilter
    this.renderTarget.texture.minFilter = NearestFilter
    this.renderTarget.texture.generateMipmaps = false
    this.renderTarget.texture.colorSpace = NoColorSpace
    this.material.name = materialName
    this.textureNode = passTexture(this as never, this.renderTarget.texture)
  }

  protected getPassTextureNode(): TextureNode {
    return this.textureNode
  }

  protected renderFullscreenPass(
    frame: NodeFrame,
    size: Vector2,
    quadMesh: QuadMesh,
    quadName: string,
  ): boolean | undefined {
    const renderer = frame.renderer
    if (renderer === null || renderer === undefined) return undefined

    this.rendererState = RendererUtils.resetRendererState(renderer, this.rendererState as never)

    const drawingBufferSize = renderer.getDrawingBufferSize(size)
    this.setSize(drawingBufferSize.width, drawingBufferSize.height)

    quadMesh.material = this.material
    quadMesh.name = quadName

    renderer.setClearColor(0xffffff, 1)
    renderer.setRenderTarget(this.renderTarget)
    quadMesh.render(renderer)

    RendererUtils.restoreRendererState(renderer, this.rendererState)
    return true
  }

  setSize(width: number, height: number): void {
    this.renderTarget.setSize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)))
  }

  dispose(): void {
    this.renderTarget.dispose()
    this.material.dispose()
  }
}
