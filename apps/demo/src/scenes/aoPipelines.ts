import { RenderPipeline, type Object3D, type PerspectiveCamera, type WebGPURenderer } from 'three/webgpu'
import {
  float,
  Fn,
  getScreenPosition,
  getViewPosition,
  If,
  int,
  Loop,
  PI,
  sqrt,
  uniform,
  uv,
  vec3,
  vec4,
} from 'three/tsl'
import { ao as gtao } from 'three/addons/tsl/display/GTAONode.js'
import { createN8AOScenePass, N8AONode } from 'n8ao-webgpu'
import { VBAONode, type VBAONodeOptions } from '@horizonao/core'
import type { AoMode, AoViewMode } from './aoComparePanel'

type TslScalar = ReturnType<typeof float>
type TslVec3 = ReturnType<typeof vec3>
type TslIntLoop = (
  params: { readonly start: unknown; readonly end: unknown; readonly type: 'int'; readonly condition: '<' },
  body: (vars: { readonly i: never }) => void,
) => void

const loopInt = Loop as unknown as TslIntLoop

interface N8AOTextureNode {
  readonly a: TslScalar
  readonly rgb: TslVec3
}

export interface AoPipelineOptions extends Partial<VBAONodeOptions> {
  readonly scene: Object3D
  readonly sceneColor: unknown
  readonly depthNode: unknown
  readonly normalNode: unknown
  readonly camera: PerspectiveCamera
  readonly renderer: WebGPURenderer
}

export interface AoPipelines {
  render: (mode: AoMode, viewMode: AoViewMode, productOutput?: boolean) => void
  dispose: () => void
}

export function createAoPipelines(options: AoPipelineOptions): AoPipelines {
  const radius = options.radius ?? 1.25
  const thickness = options.thickness ?? 0.25
  const scale = options.scale ?? 1.0
  const softness = options.softness ?? 0.65
  const samples = options.samples ?? 8
  const slices = options.slices ?? 3
  const resolutionScale = options.resolutionScale ?? 1.0
  const sceneColor = options.sceneColor as { readonly rgb: TslVec3 }
  const depthNode = options.depthNode as { sample: (sampleUv: unknown) => { readonly r: TslScalar } }
  const normalNode = options.normalNode as { sample: (sampleUv: unknown) => { readonly rgb: TslVec3 } }

  const gtaoNode = gtao(options.depthNode as never, options.normalNode as never, options.camera)
  gtaoNode.radius.value = radius
  gtaoNode.thickness.value = thickness
  gtaoNode.scale.value = scale
  gtaoNode.samples.value = samples
  gtaoNode.resolutionScale = resolutionScale
  gtaoNode.useTemporalFiltering = false

  const ssaoTex = createSsaoScalar({
    depthNode,
    normalNode,
    camera: options.camera,
    radius,
    bias: Math.max(0.01, thickness * 0.1),
    intensity: Math.max(0.5, scale * 1.25),
    sampleCount: Math.max(8, samples + slices),
  })

  const vbaoNode = new VBAONode(options.depthNode as never, options.normalNode as never, options.camera, {
    radius,
    thickness,
    scale,
    softness,
    samples,
    slices,
    resolutionScale,
  })
  const n8aoScenePass = createN8AOScenePass(options.scene, options.camera)
  const n8aoNode = new N8AONode({
    beautyNode: n8aoScenePass.getTextureNode('output'),
    beautyTexture: n8aoScenePass.getTexture('output'),
    depthNode: n8aoScenePass.getTextureNode('depth'),
    depthTexture: n8aoScenePass.getTexture('depth'),
    normalNode: n8aoScenePass.getTextureNode('normal'),
    normalTexture: n8aoScenePass.getTexture('normal'),
    scenePassNode: n8aoScenePass,
    scene: options.scene,
    camera: options.camera,
  })
  n8aoNode.setQualityMode(samples <= 8 ? 'Medium' : samples <= 12 ? 'High' : 'Ultra')
  n8aoNode.configuration.screenSpaceRadius = true
  n8aoNode.configuration.aoRadius = Math.max(18, Math.min(48, radius * 58))
  n8aoNode.configuration.distanceFalloff = 1
  n8aoNode.configuration.intensity = Math.max(3.5, Math.min(6, scale * 5))
  n8aoNode.configuration.denoiseIterations = 2
  n8aoNode.configuration.denoiseRadius = 12
  n8aoNode.configuration.aoTones = 0
  n8aoNode.configuration.colorMultiply = true
  n8aoNode.configuration.gammaCorrection = false
  // n8ao-webgpu@0.1.0 targets three@^0.182.0. With three@0.184.0 its half-res
  // downsample shader fails WebGPU validation, so keep the comparison full-res.
  n8aoNode.configuration.halfRes = false
  n8aoNode.configuration.depthAwareUpsampling = true
  n8aoNode.configuration.accumulate = false
  n8aoNode.configuration.autoRenderBeauty = true

  const gtaoTex = gtaoNode.getTextureNode()
  const vbaoTex = vbaoNode.getTextureNode()
  const vbaoRawTex = vbaoNode.getRawTextureNode()
  const n8aoTex = n8aoNode.getTextureNode() as N8AOTextureNode

  const offPipeline = new RenderPipeline(options.renderer, vec4(sceneColor.rgb, float(1.0)))
  const gtaoPipeline = new RenderPipeline(
    options.renderer,
    vec4(sceneColor.rgb.mul(gtaoTex.r), float(1.0)),
  )
  const ssaoPipeline = new RenderPipeline(
    options.renderer,
    vec4(sceneColor.rgb.mul(ssaoTex), float(1.0)),
  )
  const vbaoPipeline = new RenderPipeline(
    options.renderer,
    vec4(sceneColor.rgb.mul(vbaoTex.r), float(1.0)),
  )
  const vbaoRawPipeline = new RenderPipeline(
    options.renderer,
    vec4(sceneColor.rgb.mul(vbaoRawTex.r), float(1.0)),
  )
  const n8aoPipeline = new RenderPipeline(options.renderer, vec4(n8aoTex.rgb, n8aoTex.a))
  const offAoPipeline = new RenderPipeline(
    options.renderer,
    vec4(float(1.0), float(1.0), float(1.0), float(1.0)),
  )
  const gtaoAoPipeline = new RenderPipeline(
    options.renderer,
    vec4(gtaoTex.r, gtaoTex.r, gtaoTex.r, float(1.0)),
  )
  const ssaoAoPipeline = new RenderPipeline(
    options.renderer,
    vec4(ssaoTex, ssaoTex, ssaoTex, float(1.0)),
  )
  const vbaoAoPipeline = new RenderPipeline(
    options.renderer,
    vec4(vbaoTex.r, vbaoTex.r, vbaoTex.r, float(1.0)),
  )
  const vbaoRawAoPipeline = new RenderPipeline(
    options.renderer,
    vec4(vbaoRawTex.r, vbaoRawTex.r, vbaoRawTex.r, float(1.0)),
  )
  const n8aoAoPipeline = new RenderPipeline(options.renderer, vec4(n8aoTex.rgb, n8aoTex.a))

  return {
    render: (mode, viewMode, productOutput = true) => {
      if (viewMode === 'ao') {
        if (mode === 'off') offAoPipeline.render()
        else if (mode === 'gtao') gtaoAoPipeline.render()
        else if (mode === 'ssao') ssaoAoPipeline.render()
        else if (mode === 'vbao') {
          if (productOutput) vbaoAoPipeline.render()
          else vbaoRawAoPipeline.render()
        }
        else {
          n8aoNode.setDisplayMode('AO')
          n8aoAoPipeline.render()
        }
        return
      }

      if (mode === 'off') offPipeline.render()
      else if (mode === 'gtao') gtaoPipeline.render()
      else if (mode === 'ssao') ssaoPipeline.render()
      else if (mode === 'vbao') {
        if (productOutput) vbaoPipeline.render()
        else vbaoRawPipeline.render()
      }
      else {
        n8aoNode.setDisplayMode('Combined')
        n8aoPipeline.render()
      }
    },
    dispose: () => {
      offPipeline.dispose()
      gtaoPipeline.dispose()
      ssaoPipeline.dispose()
      vbaoPipeline.dispose()
      vbaoRawPipeline.dispose()
      n8aoPipeline.dispose()
      offAoPipeline.dispose()
      gtaoAoPipeline.dispose()
      ssaoAoPipeline.dispose()
      vbaoAoPipeline.dispose()
      vbaoRawAoPipeline.dispose()
      n8aoAoPipeline.dispose()
      gtaoNode.dispose()
      vbaoNode.dispose()
      n8aoNode.dispose()
    },
  }
}

function createSsaoScalar(options: {
  readonly depthNode: { sample: (sampleUv: unknown) => { readonly r: TslScalar } }
  readonly normalNode: { sample: (sampleUv: unknown) => { readonly rgb: TslVec3 } }
  readonly camera: PerspectiveCamera
  readonly radius: number
  readonly bias: number
  readonly intensity: number
  readonly sampleCount: number
}) {
  const ssaoRadius = uniform(options.radius)
  const ssaoBias = uniform(options.bias)
  const ssaoIntensity = uniform(options.intensity)
  const ssaoSampleCount = int(options.sampleCount)
  const projectionMatrix = uniform(options.camera.projectionMatrix)
  const projectionMatrixInverse = uniform(options.camera.projectionMatrixInverse)
  const readViewPosition = getViewPosition as unknown as (
    sampleUv: unknown,
    depth: unknown,
    projectionMatrixInverse: unknown,
  ) => TslVec3
  const readScreenPosition = getScreenPosition as unknown as (
    viewPosition: unknown,
    projectionMatrix: unknown,
  ) => TslVec3

  return Fn(() => {
    const centerUv = uv()
    const centerDepth = options.depthNode.sample(centerUv).r.toVar()
    centerDepth.greaterThanEqual(1).discard()

    const centerView = readViewPosition(centerUv, centerDepth, projectionMatrixInverse).toVar()
    const centerNormal = options.normalNode.sample(centerUv).rgb.normalize().toVar()
    const occlusion = float(0).toVar()

    loopInt({ start: int(0), end: ssaoSampleCount, type: 'int', condition: '<' }, ({ i }) => {
      const sampleIndex = float(i).add(0.5)
      const angle = sampleIndex.div(float(ssaoSampleCount)).mul(PI.mul(2))
      const sampleRadius = ssaoRadius
        .div(centerView.z.abs().max(0.001))
        .mul(sampleIndex.div(float(ssaoSampleCount)))
        .mul(0.55)
      const sampleUv = centerUv.add(vec3(angle.cos(), angle.sin(), 0).xy.mul(sampleRadius)).toVar()
      const sampleDepth = options.depthNode.sample(sampleUv).r.toVar()
      const sampleView = readViewPosition(sampleUv, sampleDepth, projectionMatrixInverse).toVar()
      const sampleDelta = sampleView.sub(centerView).toVar()
      const sampleDistance = sqrt(sampleDelta.dot(sampleDelta)).toVar()
      const rangeWeight = float(1).sub(sampleDistance.div(ssaoRadius)).clamp(0, 1)
      const normalWeight = centerNormal.dot(sampleDelta.normalize()).max(0)
      const sampleScreen = readScreenPosition(sampleView, projectionMatrix)

      If(
        sampleView.z
          .greaterThan(centerView.z.add(ssaoBias))
          .and(sampleScreen.x.greaterThanEqual(0))
          .and(sampleScreen.x.lessThanEqual(1))
          .and(sampleScreen.y.greaterThanEqual(0))
          .and(sampleScreen.y.lessThanEqual(1)),
        () => {
          occlusion.addAssign(rangeWeight.mul(normalWeight))
        },
      )
    })

    return float(1).sub(occlusion.div(float(ssaoSampleCount)).mul(ssaoIntensity)).clamp(0, 1)
  })()
}
