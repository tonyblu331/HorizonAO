import { useEffect, useRef, useState } from 'react'
import {
  AmbientLight,
  AnimationMixer,
  Box3,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  ACESFilmicToneMapping,
  PerspectiveCamera,
  RenderPipeline,
  Scene,
  SphereGeometry,
  TorusKnotGeometry,
  UnsignedByteType,
  Vector2,
  Vector3,
  WebGPURenderer,
} from 'three/webgpu'
import {
  colorToDirection,
  directionToColor,
  float,
  Fn,
  getScreenPosition,
  getViewPosition,
  If,
  int,
  Loop,
  mrt,
  normalView,
  perspectiveDepthToViewZ,
  PI,
  pass,
  reference,
  rtt,
  sample,
  sqrt,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
  velocity,
  viewZToPerspectiveDepth,
} from 'three/tsl'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { ao as gtao } from 'three/addons/tsl/display/GTAONode.js'
import { denoise } from 'three/addons/tsl/display/DenoiseNode.js'
import { N8AONode, createN8AOScenePass } from 'n8ao-webgpu'
import { VBAONode } from '@horizonao/core'

type PageState = 'loading' | 'ready' | 'error'
type CompareMode = 'off' | 'gtao' | 'ssao' | 'vbao' | 'n8ao'
type ComposeDebugMode = Exclude<CompareMode, 'off'>
type ViewMode = 'beauty' | 'ao'
type SceneVariant = 'city' | 'museum'
type VbaoSamplingSchedule = 'magic-square' | 'r2' | 'hilbert' | 'blue-noise'
type VbaoBenchmarkSamplingSchedule = VbaoSamplingSchedule | 'n/a'
type VbaoSamplePreset = 'baseline' | 'high-sample'
type VbaoBenchmarkSamplePreset = VbaoSamplePreset | 'n/a'
type VbaoDenoiseFilter = 'generic' | 'custom-bilateral'
type VbaoBenchmarkDenoiseFilter = VbaoDenoiseFilter | 'n/a'
type VbaoRadiusStressPreset = 'baseline' | 'large-radius'
type VbaoBenchmarkRadiusStressPreset = VbaoRadiusStressPreset | 'n/a'
type VbaoDepthPrefilterPreset = 'baseline' | 'prefilter'
type VbaoBenchmarkDepthPrefilterPreset = VbaoDepthPrefilterPreset | 'n/a'
type TslIntLoop = (
  params: { readonly start: unknown; readonly end: unknown; readonly type: 'int'; readonly condition: '<' },
  body: (vars: { readonly i: never }) => void,
) => void

const loopInt = Loop as unknown as TslIntLoop

interface Stats {
  readonly fps: number
  readonly frameMs: number
  readonly avgFrameMs: number
  readonly medianFrameMs: number
  readonly p95FrameMs: number
  readonly reportIndex: number
  readonly sampleCount: number
  readonly scene: SceneVariant
  readonly rendererBackend: 'webgpu' | 'webgl'
  readonly renderMode: 'single' | 'compose'
  readonly mode: CompareMode | 'compose'
  readonly composeModes: readonly ComposeDebugMode[]
  readonly viewMode: ViewMode
  readonly denoiseEnabled: boolean
  readonly fullResolutionVbao: boolean
  readonly vbaoSamplingSchedule: VbaoBenchmarkSamplingSchedule
  readonly vbaoSamplePreset: VbaoBenchmarkSamplePreset
  readonly vbaoDenoiseFilter: VbaoBenchmarkDenoiseFilter
  readonly vbaoRadiusStressPreset: VbaoBenchmarkRadiusStressPreset
  readonly vbaoDepthPrefilterPreset: VbaoBenchmarkDepthPrefilterPreset
  readonly vbaoRadius: number
  readonly vbaoExpectedDepthHierarchyLevel: number
  readonly vbaoSamples: number
  readonly vbaoSlices: number
  readonly viewport: {
    readonly width: number
    readonly height: number
  }
  readonly devicePixelRatio: number
  readonly timestamp: number
}

interface AoBenchmarkEnvironment {
  readonly rendererBackend: 'webgpu' | 'webgl'
  readonly aoAvailable: boolean
  readonly navigatorGpu: boolean
  readonly requiredBackend: 'webgpu'
  readonly userAgent: string
}

const COMPOSE_DEBUG_MODES = [
  'ssao',
  'gtao',
  'vbao',
  'n8ao',
] as const satisfies readonly ComposeDebugMode[]
const VBAO_BENCHMARK_SAMPLING_SCHEDULES = [
  'magic-square',
  'r2',
  'hilbert',
  'blue-noise',
] as const satisfies readonly VbaoSamplingSchedule[]
const VBAO_PRODUCTION_SAMPLING_SCHEDULE: VbaoSamplingSchedule = 'magic-square'
const VBAO_DEPTH_PREFILTER_CANDIDATE_ENABLED = true
const VBAO_SAMPLE_PRESETS = {
  baseline: { samples: 8, slices: 3 },
  'high-sample': { samples: 16, slices: 3 },
} as const satisfies Record<VbaoSamplePreset, { readonly samples: number; readonly slices: number }>
const VBAO_RADIUS_STRESS_PRESETS = {
  baseline: { radius: 0.35, expectedDepthHierarchyLevel: 0 },
  'large-radius': { radius: 0.7, expectedDepthHierarchyLevel: 1 },
} as const satisfies Record<
  VbaoRadiusStressPreset,
  { readonly radius: number; readonly expectedDepthHierarchyLevel: number }
>

interface AoBenchmarkApi {
  readonly environment: AoBenchmarkEnvironment
  latest?: Stats
  readonly history: Stats[]
  reset: () => void
  setVbaoDenoiseFilter: (filter: VbaoDenoiseFilter) => void
  setVbaoDepthPrefilterPreset: (preset: VbaoDepthPrefilterPreset) => void
  setVbaoRadiusStressPreset: (preset: VbaoRadiusStressPreset) => void
  setVbaoSamplingSchedule: (schedule: VbaoSamplingSchedule) => void
  setVbaoSamplePreset: (preset: VbaoSamplePreset) => void
  snapshot: () => {
    readonly environment: AoBenchmarkEnvironment
    readonly latest?: Stats
    readonly history: Stats[]
  }
}

declare global {
  interface Window {
    __aoBenchmark?: AoBenchmarkApi
  }
}

function isVbaoSamplePreset(value: string): value is VbaoSamplePreset {
  return value === 'baseline' || value === 'high-sample'
}

function isVbaoDenoiseFilter(value: string): value is VbaoDenoiseFilter {
  return value === 'generic' || value === 'custom-bilateral'
}

function isVbaoRadiusStressPreset(value: string): value is VbaoRadiusStressPreset {
  return value === 'baseline' || value === 'large-radius'
}

function isVbaoDepthPrefilterPreset(value: string): value is VbaoDepthPrefilterPreset {
  return value === 'baseline' || value === 'prefilter'
}

function isVbaoSamplingSchedule(value: string): value is VbaoSamplingSchedule {
  return VBAO_BENCHMARK_SAMPLING_SCHEDULES.some((schedule) => schedule === value)
}

function isComposeDebugMode(value: string | undefined): value is ComposeDebugMode {
  return COMPOSE_DEBUG_MODES.some((mode) => mode === value)
}

function sortComposeDebugModes(modes: readonly ComposeDebugMode[]) {
  return COMPOSE_DEBUG_MODES.filter((mode) => modes.includes(mode))
}

function getComposeDebugLabel(mode: ComposeDebugMode) {
  return mode.toUpperCase()
}

export function CityScene() {
  return <AoMuseumScene initialVariant="city" />
}

export function MuseumScene() {
  return <AoMuseumScene initialVariant="museum" />
}

function AoMuseumScene({ initialVariant }: { readonly initialVariant: SceneVariant }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return

    let disposed = false
    const ctrl = new AbortController()

    void runGtaoReferenceScene(container, ctrl.signal, initialVariant).then(
      () => {
        if (!disposed) setPageState('ready')
      },
      (err: unknown) => {
        if (!disposed) {
          setErrorMsg(err instanceof Error ? err.message : String(err))
          setPageState('error')
        }
      },
    )

    return () => {
      disposed = true
      ctrl.abort()
    }
  }, [initialVariant])

  return (
    <section className="scene-page" style={{ position: 'relative' }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
        aria-label="Museum ambient occlusion comparison canvas"
      />
      {pageState === 'error' && (
        <div className="scene-error" role="alert">
          {errorMsg}
        </div>
      )}
    </section>
  )
}

async function runGtaoReferenceScene(
  container: HTMLDivElement,
  signal: AbortSignal,
  initialVariant: SceneVariant,
) {
  const canvas = document.createElement('canvas')
  canvas.className = 'scene-canvas'
  container.appendChild(canvas)

  const renderer = new WebGPURenderer({
    canvas,
    antialias: true,
    forceWebGL: false,
    powerPreference: 'high-performance',
    trackTimestamp: false,
  })
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
  await renderer.init()

  const isWebGlFallback =
    (renderer as unknown as { readonly backend?: { readonly isWebGLBackend?: boolean } }).backend
      ?.isWebGLBackend === true
  container.dataset.rendererBackend = isWebGlFallback ? 'webgl' : 'webgpu'

  if (signal.aborted) {
    renderer.dispose()
    canvas.remove()
    return
  }

  const camera = new PerspectiveCamera(40, 1, 1, 100)
  camera.position.set(5, 2, 8)

  const scene = new Scene()
  scene.background = new Color('#e2e0e0')
  const variants = await addSceneVariants(scene, initialVariant)
  let lastTime = performance.now()

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.075
  controls.minDistance = 2
  controls.maxDistance = 16
  controls.target.set(0, 0.7, 0)
  controls.update()

  const pipelines = isWebGlFallback ? undefined : createReferencePipelines(renderer, scene, camera)
  let activeMode: CompareMode = 'off'
  let viewMode: ViewMode = 'beauty'
  let composeDebugEnabled = !isWebGlFallback
  let composeDebugModes: readonly ComposeDebugMode[] = COMPOSE_DEBUG_MODES
  const sceneVariant = initialVariant
  let denoiseEnabled = true
  let fullResolutionVbao = false
  let vbaoSamplingSchedule: VbaoSamplingSchedule = VBAO_PRODUCTION_SAMPLING_SCHEDULE
  let vbaoSamplePreset: VbaoSamplePreset = 'baseline'
  let vbaoDenoiseFilter: VbaoDenoiseFilter = 'generic'
  let vbaoRadiusStressPreset: VbaoRadiusStressPreset = 'baseline'
  let vbaoDepthPrefilterPreset: VbaoDepthPrefilterPreset = 'baseline'

  const labels = createSplitLabels(container)
  const panel = createReferencePanel(container, {
    title: sceneVariant === 'city' ? 'City' : 'Museum',
    mode: activeMode,
    viewMode,
    composeDebugEnabled,
    composeDebugModes,
    denoiseEnabled,
    fullResolutionVbao,
    aoAvailable: !isWebGlFallback,
    onChange: (next) => {
      if (next.mode !== undefined) activeMode = next.mode
      if (next.viewMode !== undefined) viewMode = next.viewMode
      if (next.composeDebugEnabled !== undefined) composeDebugEnabled = next.composeDebugEnabled
      if (next.composeDebugModes !== undefined) composeDebugModes = next.composeDebugModes
      if (next.denoiseEnabled !== undefined) denoiseEnabled = next.denoiseEnabled
      if (next.fullResolutionVbao !== undefined) fullResolutionVbao = next.fullResolutionVbao
      panel.sync({
        mode: activeMode,
        viewMode,
        composeDebugEnabled,
        composeDebugModes,
        denoiseEnabled,
        fullResolutionVbao,
      })
      labels.sync(composeDebugEnabled, composeDebugModes)
    },
  })
  applySceneVariant(sceneVariant, variants, camera, controls)
  labels.sync(composeDebugEnabled, composeDebugModes)

  let resizeRafId = 0
  let rendererCssWidth = 0
  let rendererCssHeight = 0

  function applyResize() {
    resizeRafId = 0
    const w = container.clientWidth
    const h = container.clientHeight
    if (w === 0 || h === 0) return
    if (w === rendererCssWidth && h === rendererCssHeight) return
    rendererCssWidth = w
    rendererCssHeight = h
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }

  function scheduleResize() {
    if (resizeRafId !== 0) return
    resizeRafId = requestAnimationFrame(applyResize)
  }

  applyResize()
  const resizeObserver = new ResizeObserver(scheduleResize)
  resizeObserver.observe(container)

  const benchmark = createAoBenchmarkPublisher(
    {
      rendererBackend: isWebGlFallback ? 'webgl' : 'webgpu',
      aoAvailable: !isWebGlFallback,
      navigatorGpu: 'gpu' in navigator,
      requiredBackend: 'webgpu',
      userAgent: navigator.userAgent,
    },
    {
      setVbaoSamplePreset: (preset) => {
        vbaoSamplePreset = preset
        pipelines?.setVbaoSamplePreset(preset)
      },
      setVbaoDenoiseFilter: (filter) => {
        vbaoDenoiseFilter = filter
      },
      setVbaoDepthPrefilterPreset: (preset) => {
        vbaoDepthPrefilterPreset =
          preset === 'prefilter' && !VBAO_DEPTH_PREFILTER_CANDIDATE_ENABLED ? 'baseline' : preset
        pipelines?.setVbaoDepthPrefilterPreset(vbaoDepthPrefilterPreset)
      },
      setVbaoRadiusStressPreset: (preset) => {
        vbaoRadiusStressPreset = preset
        pipelines?.setVbaoRadiusStressPreset(preset)
      },
      setVbaoSamplingSchedule: (schedule) => {
        vbaoSamplingSchedule = schedule
        pipelines?.setVbaoSamplingSchedule(schedule)
      },
    },
  )
  const stats = createStatsSampler((next) => {
    benchmark.publish(next)
    panel.updateStats(next)
  })
  let rafId = 0

  const benchmarkContext = (
    renderMode: Stats['renderMode'],
    mode: Stats['mode'],
  ): Omit<
    Stats,
    | 'fps'
    | 'frameMs'
    | 'avgFrameMs'
    | 'medianFrameMs'
    | 'p95FrameMs'
    | 'reportIndex'
    | 'sampleCount'
    | 'timestamp'
  > => {
    const usesVbao = mode === 'vbao' || (renderMode === 'compose' && composeDebugModes.includes('vbao'))
    const preset = usesVbao ? VBAO_SAMPLE_PRESETS[vbaoSamplePreset] : undefined
    const radiusStress = usesVbao ? VBAO_RADIUS_STRESS_PRESETS[vbaoRadiusStressPreset] : undefined

    return {
      scene: sceneVariant,
      rendererBackend: isWebGlFallback ? 'webgl' : 'webgpu',
      renderMode,
      mode,
      composeModes: renderMode === 'compose' ? [...composeDebugModes] : [],
      viewMode,
      denoiseEnabled,
      fullResolutionVbao,
      vbaoSamplingSchedule: usesVbao ? vbaoSamplingSchedule : 'n/a',
      vbaoSamplePreset: usesVbao ? vbaoSamplePreset : 'n/a',
      vbaoDenoiseFilter: usesVbao && denoiseEnabled ? vbaoDenoiseFilter : 'n/a',
      vbaoRadiusStressPreset: usesVbao ? vbaoRadiusStressPreset : 'n/a',
      vbaoDepthPrefilterPreset: usesVbao ? vbaoDepthPrefilterPreset : 'n/a',
      vbaoRadius: radiusStress?.radius ?? 0,
      vbaoExpectedDepthHierarchyLevel: radiusStress?.expectedDepthHierarchyLevel ?? 0,
      vbaoSamples: preset?.samples ?? 0,
      vbaoSlices: preset?.slices ?? 0,
      viewport: {
        width: rendererCssWidth,
        height: rendererCssHeight,
      },
      devicePixelRatio: window.devicePixelRatio,
    }
  }

  function animate() {
    if (signal.aborted) return
    rafId = requestAnimationFrame(animate)
    const frameStart = performance.now()
    const deltaSeconds = (frameStart - lastTime) / 1000
    lastTime = frameStart
    if (sceneVariant === 'city') variants.cityMixer?.update(deltaSeconds)
    controls.update()

    if (isWebGlFallback || pipelines === undefined) {
      renderer.render(scene, camera)
      stats.sample(performance.now() - frameStart, benchmarkContext('single', 'off'))
      return
    }

    if (composeDebugEnabled) {
      pipelines.renderComposeDebug(
        composeDebugModes,
        viewMode,
        denoiseEnabled,
        fullResolutionVbao,
        vbaoDenoiseFilter,
      )
      stats.sample(performance.now() - frameStart, benchmarkContext('compose', 'compose'))
    } else {
      pipelines.renderSingle(
        activeMode,
        viewMode,
        denoiseEnabled,
        fullResolutionVbao,
        vbaoDenoiseFilter,
      )
      stats.sample(performance.now() - frameStart, benchmarkContext('single', activeMode))
    }
  }
  rafId = requestAnimationFrame(animate)

  signal.addEventListener('abort', () => {
    cancelAnimationFrame(rafId)
    if (resizeRafId !== 0) cancelAnimationFrame(resizeRafId)
    resizeObserver.disconnect()
    controls.dispose()
    panel.remove()
    labels.remove()
    benchmark.dispose()
    pipelines?.dispose()
    renderer.dispose()
    canvas.remove()
  })
}

function createReferencePipelines(
  renderer: WebGPURenderer,
  scene: Scene,
  camera: PerspectiveCamera,
) {
  const prePass = pass(scene, camera)
  prePass.transparent = false
  prePass.setMRT(
    mrt({
      output: directionToColor(normalView),
      velocity,
    }),
  )

  const prePassNormal = sample((sampleUv) =>
    colorToDirection(prePass.getTextureNode().sample(sampleUv)),
  )
  const samplePrePassNormal = (
    sampleUv: Parameters<ReturnType<typeof prePass.getTextureNode>['sample']>[0],
  ) =>
    colorToDirection(prePass.getTextureNode().sample(sampleUv))
  const prePassDepth = prePass.getTextureNode('depth')
  const normalTexture = prePass.getTexture('output')
  normalTexture.type = UnsignedByteType
  const vbaoDepthPrefilterResolution = uniform(new Vector2(1, 1))

  function createVbaoDepthPrefilterNode() {
    const cameraNear = reference('near', 'float', camera)
    const cameraFar = reference('far', 'float', camera)
    const farthestDepthTolerance = float(0.1)

    const prefilterDepth = Fn(() => {
      const centerUv = uv()
      const centerDepth = prePassDepth.sample(centerUv).r.toVar('vbaoPrefilterCenterDepth')
      const texelSize = vec2(1, 1)
        .div(vbaoDepthPrefilterResolution)
        .toVar('vbaoPrefilterTexelSize')
      const farthestViewDepth = float(0).toVar('vbaoPrefilterFarthestViewDepth')
      const supportedViewDepthSum = float(0).toVar('vbaoPrefilterSupportedViewDepthSum')
      const supportedViewDepthCount = float(0).toVar('vbaoPrefilterSupportedViewDepthCount')

      const centerValid = centerDepth.lessThan(1).and(centerDepth.greaterThanEqual(0))
      const centerViewDepth = perspectiveDepthToViewZ(
        centerDepth,
        cameraNear,
        cameraFar,
      ).negate()
      const fallbackViewDepth = centerValid.select(centerViewDepth, float(1)).toVar(
        'vbaoPrefilterFallbackViewDepth',
      )

      const uv00 = centerUv.sub(texelSize.mul(0.5)).toVar('vbaoPrefilterUv00')
      const uv10 = uv00.add(vec2(texelSize.x, 0)).toVar('vbaoPrefilterUv10')
      const uv01 = uv00.add(vec2(0, texelSize.y)).toVar('vbaoPrefilterUv01')
      const uv11 = uv00.add(texelSize).toVar('vbaoPrefilterUv11')

      const visitFarthest = (sampleUv: typeof uv00) => {
        const inside = sampleUv.x
          .greaterThanEqual(0)
          .and(sampleUv.x.lessThanEqual(1))
          .and(sampleUv.y.greaterThanEqual(0))
          .and(sampleUv.y.lessThanEqual(1))
        const sampleDepth = prePassDepth.sample(sampleUv).r.toVar('vbaoPrefilterFarthestDepth')
        const sampleValid = inside
          .and(sampleDepth.lessThan(1))
          .and(sampleDepth.greaterThanEqual(0))
        const sampleViewDepth = perspectiveDepthToViewZ(
          sampleDepth,
          cameraNear,
          cameraFar,
        ).negate()

        If(sampleValid, () => {
          farthestViewDepth.assign(farthestViewDepth.max(sampleViewDepth))
        })
      }

      const visitSupport = (sampleUv: typeof uv00) => {
        const inside = sampleUv.x
          .greaterThanEqual(0)
          .and(sampleUv.x.lessThanEqual(1))
          .and(sampleUv.y.greaterThanEqual(0))
          .and(sampleUv.y.lessThanEqual(1))
        const sampleDepth = prePassDepth.sample(sampleUv).r.toVar('vbaoPrefilterSupportDepth')
        const sampleValid = inside
          .and(sampleDepth.lessThan(1))
          .and(sampleDepth.greaterThanEqual(0))
        const sampleViewDepth = perspectiveDepthToViewZ(
          sampleDepth,
          cameraNear,
          cameraFar,
        ).negate()

        If(sampleValid.and(farthestViewDepth.sub(sampleViewDepth).lessThanEqual(farthestDepthTolerance)), () => {
          supportedViewDepthSum.addAssign(sampleViewDepth)
          supportedViewDepthCount.addAssign(1)
        })
      }

      visitFarthest(uv00)
      visitFarthest(uv10)
      visitFarthest(uv01)
      visitFarthest(uv11)
      visitSupport(uv00)
      visitSupport(uv10)
      visitSupport(uv01)
      visitSupport(uv11)

      const representativeViewDepth = supportedViewDepthCount
        .greaterThan(0)
        .select(supportedViewDepthSum.div(supportedViewDepthCount), fallbackViewDepth)

      return centerValid.select(
        viewZToPerspectiveDepth(representativeViewDepth.negate(), cameraNear, cameraFar),
        centerDepth,
      )
    })()

    return rtt(prefilterDepth)
  }

  const scenePass = pass(scene, camera)
  const sceneColor = scenePass.getTextureNode('output')

  const ssaoRadius = uniform(0.35)
  const ssaoBias = uniform(0.025)
  const ssaoIntensity = uniform(1.25)
  const ssaoProjectionMatrix = uniform(camera.projectionMatrix)
  const ssaoProjectionMatrixInverse = uniform(camera.projectionMatrixInverse)
  const ssaoRawScalar = Fn(() => {
    const centerUv = uv()
    const centerDepth = prePassDepth.sample(centerUv).r.toVar()
    centerDepth.greaterThanEqual(1).discard()

    const centerView = getViewPosition(centerUv, centerDepth, ssaoProjectionMatrixInverse).toVar()
    const centerNormal = samplePrePassNormal(centerUv).toVar()
    const occlusion = float(0).toVar()
    const sampleCount = int(12)

    loopInt({ start: int(0), end: sampleCount, type: 'int', condition: '<' }, ({ i }) => {
      const sampleIndex = float(i).add(0.5)
      const angle = sampleIndex.div(float(sampleCount)).mul(PI.mul(2))
      const sampleRadius = ssaoRadius
        .div(centerView.z.abs().max(0.001))
        .mul(sampleIndex.div(float(sampleCount)))
        .mul(0.55)
      const sampleUv = centerUv.add(vec3(angle.cos(), angle.sin(), 0).xy.mul(sampleRadius)).toVar()
      const sampleDepth = prePassDepth.sample(sampleUv).r.toVar()
      const sampleView = getViewPosition(sampleUv, sampleDepth, ssaoProjectionMatrixInverse).toVar()
      const sampleDelta = sampleView.sub(centerView).toVar()
      const sampleDistance = sqrt(sampleDelta.dot(sampleDelta)).toVar()
      const rangeWeight = float(1).sub(sampleDistance.div(ssaoRadius)).clamp(0, 1)
      const normalWeight = centerNormal.dot(sampleDelta.normalize()).max(0)
      const sampleScreen = getScreenPosition(sampleView, ssaoProjectionMatrix)

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

    return float(1)
      .sub(occlusion.div(float(sampleCount)).mul(ssaoIntensity))
      .clamp(0, 1)
  })()

  const gtaoNode = gtao(prePassDepth, prePassNormal, camera)
  gtaoNode.samples.value = 16
  gtaoNode.distanceExponent.value = 1
  gtaoNode.distanceFallOff.value = 1
  gtaoNode.radius.value = 0.25
  gtaoNode.scale.value = 0.5
  gtaoNode.thickness.value = 1
  gtaoNode.resolutionScale = 0.5
  gtaoNode.useTemporalFiltering = false

  const baselineVbaoPreset = VBAO_SAMPLE_PRESETS.baseline
  const vbaoNode = new VBAONode(prePassDepth, prePassNormal, camera, {
    radius: VBAO_RADIUS_STRESS_PRESETS.baseline.radius,
    thickness: 0.28,
    scale: 0.85,
    samples: baselineVbaoPreset.samples,
    slices: baselineVbaoPreset.slices,
    resolutionScale: 0.5,
  })
  const vbaoDepthPrefilterNode = createVbaoDepthPrefilterNode()
  const vbaoPrefilterNode = new VBAONode(vbaoDepthPrefilterNode, prePassNormal, camera, {
    radius: VBAO_RADIUS_STRESS_PRESETS.baseline.radius,
    thickness: 0.28,
    scale: 0.85,
    samples: baselineVbaoPreset.samples,
    slices: baselineVbaoPreset.slices,
    resolutionScale: 0.5,
  })

  const n8aoScenePass = createN8AOScenePass(scene, camera)
  const n8aoNode = new N8AONode({
    beautyNode: n8aoScenePass.getTextureNode('output'),
    beautyTexture: n8aoScenePass.getTexture('output'),
    depthNode: n8aoScenePass.getTextureNode('depth'),
    depthTexture: n8aoScenePass.getTexture('depth'),
    normalNode: n8aoScenePass.getTextureNode('normal'),
    normalTexture: n8aoScenePass.getTexture('normal'),
    scenePassNode: n8aoScenePass,
    scene,
    camera,
  })
  n8aoNode.setQualityMode('Medium')
  n8aoNode.configuration.screenSpaceRadius = true
  n8aoNode.configuration.aoRadius = 32
  n8aoNode.configuration.distanceFalloff = 1
  n8aoNode.configuration.intensity = 5
  n8aoNode.configuration.denoiseIterations = 2
  n8aoNode.configuration.denoiseRadius = 12
  n8aoNode.configuration.aoTones = 0
  n8aoNode.configuration.colorMultiply = true
  n8aoNode.configuration.gammaCorrection = false
  // n8ao-webgpu@0.1.0 targets three@^0.182.0. With three@0.184.0 its half-res
  // depth downsample path can fail WebGPU validation, so keep full-res until ported.
  n8aoNode.configuration.halfRes = false
  n8aoNode.configuration.depthAwareUpsampling = true
  n8aoNode.configuration.accumulate = false
  n8aoNode.configuration.autoRenderBeauty = true

  const gtaoRaw = gtaoNode.getTextureNode()
  const vbaoRaw = vbaoNode.getTextureNode()
  const vbaoPrefilterRaw = vbaoPrefilterNode.getTextureNode()
  const vbaoCustomDenoiseResolution = uniform(new Vector2(1, 1))
  const ssaoDenoised = denoise(
    vec4(vec3(ssaoRawScalar), float(1)),
    prePassDepth,
    prePassNormal,
    camera,
  )
  const gtaoDenoised = denoise(vec4(vec3(gtaoRaw.r), float(1)), prePassDepth, prePassNormal, camera)
  const vbaoDenoised = denoise(vec4(vec3(vbaoRaw.r), float(1)), prePassDepth, prePassNormal, camera)
  const vbaoPrefilterDenoised = denoise(
    vec4(vec3(vbaoPrefilterRaw.r), float(1)),
    vbaoDepthPrefilterNode,
    prePassNormal,
    camera,
  )
  ssaoDenoised.radius.value = 4
  gtaoDenoised.radius.value = 4
  vbaoDenoised.radius.value = 4
  vbaoPrefilterDenoised.radius.value = 4
  ssaoDenoised.depthPhi.value = 3
  gtaoDenoised.depthPhi.value = 3
  vbaoDenoised.depthPhi.value = 3
  vbaoPrefilterDenoised.depthPhi.value = 3
  ssaoDenoised.normalPhi.value = 8
  gtaoDenoised.normalPhi.value = 8
  vbaoDenoised.normalPhi.value = 8
  vbaoPrefilterDenoised.normalPhi.value = 8
  const vbaoCustomBilateralScalar = Fn(() => {
    const centerUv = uv()
    const centerDepth = prePassDepth.sample(centerUv).r.toVar()
    const centerNormal = samplePrePassNormal(centerUv).toVar()
    const centerView = getViewPosition(centerUv, centerDepth, ssaoProjectionMatrixInverse).toVar()
    const centerAo = vbaoRaw.sample(centerUv).r.toVar()
    const filtered = centerAo.toVar()
    const totalWeight = float(1).toVar()
    const texelSize = vec2(1, 1).div(vbaoCustomDenoiseResolution).toVar()

    const addTap = (x: number, y: number, kernelWeight: number) => {
      const sampleUv = centerUv.add(vec2(x, y).mul(texelSize)).toVar()
      const sampleDepth = prePassDepth.sample(sampleUv).r.toVar()
      const sampleNormal = samplePrePassNormal(sampleUv).toVar()
      const sampleView = getViewPosition(sampleUv, sampleDepth, ssaoProjectionMatrixInverse).toVar()
      const normalDot = centerNormal.dot(sampleNormal).toVar()
      const tangentDepthDistance = centerView.sub(sampleView).dot(centerNormal).abs().toVar()
      const depthWeight = tangentDepthDistance.negate().div(float(0.06)).exp().toVar()
      const normalWeight = normalDot.max(0).pow(float(8)).toVar()
      const weight = depthWeight.mul(normalWeight).mul(float(kernelWeight)).toVar()

      If(
        sampleDepth
          .lessThan(1)
          .and(normalDot.greaterThanEqual(0.5))
          .and(sampleUv.x.greaterThanEqual(0))
          .and(sampleUv.x.lessThanEqual(1))
          .and(sampleUv.y.greaterThanEqual(0))
          .and(sampleUv.y.lessThanEqual(1)),
        () => {
          filtered.addAssign(vbaoRaw.sample(sampleUv).r.mul(weight))
          totalWeight.addAssign(weight)
        },
      )
    }

    If(centerDepth.lessThan(1).and(centerNormal.dot(centerNormal).greaterThan(0)), () => {
      addTap(1, 0, 0.5)
      addTap(-1, 0, 0.5)
      addTap(0, 1, 0.5)
      addTap(0, -1, 0.5)
      addTap(1, 1, 0.35)
      addTap(-1, 1, 0.35)
      addTap(1, -1, 0.35)
      addTap(-1, -1, 0.35)
      addTap(2, 0, 0.2)
      addTap(-2, 0, 0.2)
      addTap(0, 2, 0.2)
      addTap(0, -2, 0.2)
      filtered.divAssign(totalWeight)
    })

    return filtered.clamp(0, 1)
  })()

  const gtaoRawScalar = gtaoRaw.r
  const vbaoRawScalar = vbaoRaw.r
  const vbaoPrefilterRawScalar = vbaoPrefilterRaw.r
  type TslScalar = typeof gtaoRaw.r
  type TslVec3 = typeof sceneColor.rgb
  const ssaoDenoisedScalar = (ssaoDenoised as unknown as typeof gtaoRaw).r
  const gtaoDenoisedScalar = (gtaoDenoised as unknown as typeof gtaoRaw).r
  const vbaoDenoisedScalar = (vbaoDenoised as unknown as typeof vbaoRaw).r
  const vbaoPrefilterDenoisedScalar = (vbaoPrefilterDenoised as unknown as typeof vbaoRaw).r
  const vbaoCustomDenoisedScalar = vbaoCustomBilateralScalar
  const n8aoTex = n8aoNode.getTextureNode() as unknown as {
    readonly rgb: TslVec3
    readonly a: TslScalar
  }

  const makeBeautyPipeline = (aoValue: TslScalar) =>
    new RenderPipeline(renderer, vec4(sceneColor.rgb.mul(aoValue), float(1)))
  const makeAoPipeline = (aoValue: TslScalar) =>
    new RenderPipeline(renderer, vec4(vec3(aoValue), float(1)))
  const offBeautyPipeline = new RenderPipeline(renderer, vec4(sceneColor.rgb, float(1)))
  const offAoPipeline = new RenderPipeline(renderer, vec4(float(1), float(1), float(1), float(1)))
  const pipelines = {
    off: {
      beautyRaw: offBeautyPipeline,
      beautyDenoised: offBeautyPipeline,
      aoRaw: offAoPipeline,
      aoDenoised: offAoPipeline,
    },
    gtao: {
      beautyRaw: makeBeautyPipeline(gtaoRawScalar),
      beautyDenoised: makeBeautyPipeline(gtaoDenoisedScalar),
      aoRaw: makeAoPipeline(gtaoRawScalar),
      aoDenoised: makeAoPipeline(gtaoDenoisedScalar),
    },
    ssao: {
      beautyRaw: makeBeautyPipeline(ssaoRawScalar),
      beautyDenoised: makeBeautyPipeline(ssaoDenoisedScalar),
      aoRaw: makeAoPipeline(ssaoRawScalar),
      aoDenoised: makeAoPipeline(ssaoDenoisedScalar),
    },
    vbao: {
      beautyRaw: makeBeautyPipeline(vbaoRawScalar),
      beautyDenoised: makeBeautyPipeline(vbaoDenoisedScalar),
      beautyCustomDenoised: makeBeautyPipeline(vbaoCustomDenoisedScalar),
      aoRaw: makeAoPipeline(vbaoRawScalar),
      aoDenoised: makeAoPipeline(vbaoDenoisedScalar),
      aoCustomDenoised: makeAoPipeline(vbaoCustomDenoisedScalar),
    },
    vbaoPrefilter: {
      beautyRaw: makeBeautyPipeline(vbaoPrefilterRawScalar),
      beautyDenoised: makeBeautyPipeline(vbaoPrefilterDenoisedScalar),
      beautyCustomDenoised: makeBeautyPipeline(vbaoPrefilterDenoisedScalar),
      aoRaw: makeAoPipeline(vbaoPrefilterRawScalar),
      aoDenoised: makeAoPipeline(vbaoPrefilterDenoisedScalar),
      aoCustomDenoised: makeAoPipeline(vbaoPrefilterDenoisedScalar),
    },
    n8ao: {
      beautyRaw: new RenderPipeline(renderer, vec4(n8aoTex.rgb, n8aoTex.a)),
      beautyDenoised: new RenderPipeline(renderer, vec4(n8aoTex.rgb, n8aoTex.a)),
      aoRaw: new RenderPipeline(renderer, vec4(n8aoTex.rgb, n8aoTex.a)),
      aoDenoised: new RenderPipeline(renderer, vec4(n8aoTex.rgb, n8aoTex.a)),
    },
  }

  const vbaoDenoiseBufferSize = new Vector2()
  let activeVbaoDepthPrefilterPreset: VbaoDepthPrefilterPreset = 'baseline'
  const activeVbaoPipelines = () =>
    activeVbaoDepthPrefilterPreset === 'prefilter' ? pipelines.vbaoPrefilter : pipelines.vbao
  const setVbaoEvidenceResolution = (enabled: boolean) => {
    vbaoNode.resolutionScale = enabled ? 1.0 : 0.5
    vbaoPrefilterNode.resolutionScale = enabled ? 1.0 : 0.5
    renderer.getDrawingBufferSize(vbaoDenoiseBufferSize)
    vbaoDepthPrefilterResolution.value.set(vbaoDenoiseBufferSize.width, vbaoDenoiseBufferSize.height)
    vbaoCustomDenoiseResolution.value.set(
      Math.max(1, Math.round(vbaoNode.resolutionScale * vbaoDenoiseBufferSize.width)),
      Math.max(1, Math.round(vbaoNode.resolutionScale * vbaoDenoiseBufferSize.height)),
    )
  }
  const setVbaoSamplePreset = (preset: VbaoSamplePreset) => {
    const config = VBAO_SAMPLE_PRESETS[preset]
    vbaoNode.configure({ samples: config.samples, slices: config.slices })
    vbaoPrefilterNode.configure({ samples: config.samples, slices: config.slices })
  }
  const setVbaoSamplingSchedule = (schedule: VbaoSamplingSchedule) => {
    vbaoNode.setBenchmarkSamplingSchedule(schedule)
    vbaoPrefilterNode.setBenchmarkSamplingSchedule(schedule)
  }
  const setVbaoRadiusStressPreset = (preset: VbaoRadiusStressPreset) => {
    const config = VBAO_RADIUS_STRESS_PRESETS[preset]
    vbaoNode.configure({ radius: config.radius })
    vbaoPrefilterNode.configure({ radius: config.radius })
  }
  const setVbaoDepthPrefilterPreset = (preset: VbaoDepthPrefilterPreset) => {
    activeVbaoDepthPrefilterPreset = preset
  }
  const composeBufferSize = new Vector2()
  let composeBufferWidth = 0
  let composeBufferHeight = 0
  let composeSegmentCount = 0
  let composeSegments: { readonly x: number; readonly width: number }[] = []

  const getComposeSegments = (segmentCount: number) => {
    renderer.getDrawingBufferSize(composeBufferSize)
    if (
      composeBufferWidth === composeBufferSize.width &&
      composeBufferHeight === composeBufferSize.height &&
      composeSegmentCount === segmentCount
    ) {
      return composeSegments
    }
    composeBufferWidth = composeBufferSize.width
    composeBufferHeight = composeBufferSize.height
    composeSegmentCount = segmentCount
    composeSegments = Array.from({ length: segmentCount }, (_, index) => {
      const x = Math.floor((index * composeBufferWidth) / segmentCount)
      const nextX =
        index === segmentCount - 1
          ? composeBufferWidth
          : Math.floor(((index + 1) * composeBufferWidth) / segmentCount)
      return { x, width: nextX - x }
    })
    return composeSegments
  }

  const renderMode = (
    mode: CompareMode,
    viewMode: ViewMode,
    denoiseEnabled: boolean,
    fullResolutionVbao: boolean,
    vbaoDenoiseFilter: VbaoDenoiseFilter,
  ) => {
    setVbaoEvidenceResolution(fullResolutionVbao)
    if (mode === 'n8ao') n8aoNode.setDisplayMode(viewMode === 'ao' ? 'AO' : 'Combined')
    const key: 'beautyRaw' | 'beautyDenoised' | 'aoRaw' | 'aoDenoised' =
      viewMode === 'ao'
        ? denoiseEnabled
          ? 'aoDenoised'
          : 'aoRaw'
        : denoiseEnabled
          ? 'beautyDenoised'
          : 'beautyRaw'
    if (mode === 'vbao' && denoiseEnabled && vbaoDenoiseFilter === 'custom-bilateral') {
      const customKey = viewMode === 'ao' ? 'aoCustomDenoised' : 'beautyCustomDenoised'
      activeVbaoPipelines()[customKey].render()
      return
    }
    if (mode === 'vbao') {
      activeVbaoPipelines()[key].render()
      return
    }
    pipelines[mode][key].render()
  }

  return {
    renderSingle: renderMode,
    setVbaoDepthPrefilterPreset,
    setVbaoSamplePreset,
    setVbaoSamplingSchedule,
    setVbaoRadiusStressPreset,
    renderComposeDebug: (
      modes: readonly ComposeDebugMode[],
      viewMode: ViewMode,
      denoiseEnabled: boolean,
      fullResolutionVbao: boolean,
      vbaoDenoiseFilter: VbaoDenoiseFilter,
    ) => {
      if (modes.length === 0) {
        renderMode('off', viewMode, denoiseEnabled, fullResolutionVbao, vbaoDenoiseFilter)
        return
      }
      setVbaoEvidenceResolution(fullResolutionVbao)
      const key: 'beautyRaw' | 'beautyDenoised' | 'aoRaw' | 'aoDenoised' =
        viewMode === 'ao'
          ? denoiseEnabled
            ? 'aoDenoised'
            : 'aoRaw'
          : denoiseEnabled
            ? 'beautyDenoised'
            : 'beautyRaw'
      const segments = getComposeSegments(modes.length)
      const previousAutoClear = renderer.autoClear
      renderer.autoClear = false
      renderer.setScissorTest(false)
      renderer.setViewport(0, 0, composeBufferWidth, composeBufferHeight)
      renderer.setScissor(0, 0, composeBufferWidth, composeBufferHeight)
      renderer.clear(true, true, true)

      try {
        renderer.setScissorTest(true)
        modes.forEach((mode, index) => {
          const segment = segments[index]
          if (segment === undefined) return
          renderer.setViewport(segment.x, 0, segment.width, composeBufferHeight)
          renderer.setScissor(segment.x, 0, segment.width, composeBufferHeight)
          if (mode === 'n8ao') n8aoNode.setDisplayMode(viewMode === 'ao' ? 'AO' : 'Combined')
          if (mode === 'vbao' && denoiseEnabled && vbaoDenoiseFilter === 'custom-bilateral') {
            const customKey = viewMode === 'ao' ? 'aoCustomDenoised' : 'beautyCustomDenoised'
            activeVbaoPipelines()[customKey].render()
            return
          }
          if (mode === 'vbao') {
            activeVbaoPipelines()[key].render()
            return
          }
          pipelines[mode][key].render()
        })
      } finally {
        renderer.autoClear = previousAutoClear
        renderer.setScissorTest(false)
        renderer.setViewport(0, 0, composeBufferWidth, composeBufferHeight)
        renderer.setScissor(0, 0, composeBufferWidth, composeBufferHeight)
      }
    },
    dispose: () => {
      const disposedPipelines = new Set<RenderPipeline>()
      for (const mode of Object.values(pipelines)) {
        Object.values(mode).forEach((pipeline) => {
          if (disposedPipelines.has(pipeline)) return
          disposedPipelines.add(pipeline)
          pipeline.dispose()
        })
      }
      gtaoNode.dispose()
      vbaoNode.dispose()
      vbaoPrefilterNode.dispose()
      n8aoNode.dispose()
    },
  }
}

interface SceneVariants {
  readonly cityRoot: Group
  readonly museumRoot: Group
  readonly cityMixer: AnimationMixer | null
}

async function addSceneVariants(
  scene: Scene,
  initialVariant: SceneVariant,
): Promise<SceneVariants> {
  const { root: cityRoot, mixer: cityMixer } =
    initialVariant === 'city' ? await createCitySceneRoot() : { root: new Group(), mixer: null }
  cityRoot.name = 'CityRoot'
  const museumRoot = createMuseumSceneRoot()
  scene.add(cityRoot, museumRoot)
  return { cityRoot, museumRoot, cityMixer }
}

function applySceneVariant(
  variant: SceneVariant,
  variants: SceneVariants,
  camera: PerspectiveCamera,
  controls: OrbitControls,
) {
  variants.cityRoot.visible = variant === 'city'
  variants.museumRoot.visible = variant === 'museum'

  if (variant === 'city') {
    camera.fov = 40
    camera.near = 1
    camera.far = 100
    camera.position.set(5, 2, 8)
    controls.minDistance = 2
    controls.maxDistance = 16
    controls.target.set(0, 0.7, 0)
  } else {
    camera.fov = 44
    camera.near = 0.03
    camera.far = 60
    camera.position.set(4.8, 2.5, 6.4)
    controls.minDistance = 1.4
    controls.maxDistance = 12
    controls.target.set(0, 0.9, -0.2)
  }

  camera.updateProjectionMatrix()
  controls.update()
}

async function createCitySceneRoot() {
  const root = new Group()
  root.name = 'CityRoot'

  const sun = new DirectionalLight(0xffffff, 2.5)
  sun.position.set(-4, 5, 3)
  root.add(sun)

  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('https://threejs.org/examples/jsm/libs/draco/gltf/')

  const loader = new GLTFLoader()
  loader.setDRACOLoader(dracoLoader)
  const gltf = await loader.loadAsync(
    'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/LittlestTokyo.glb',
  )

  const model = gltf.scene
  model.position.set(1, 1, 0)
  model.scale.set(0.01, 0.01, 0.01)
  root.add(model)

  const box = new Box3().setFromObject(model)
  const center = new Vector3()
  box.getCenter(center)
  model.position.sub(center).add(new Vector3(0.4, 0.6, 0))

  const mixer = new AnimationMixer(model)
  if (gltf.animations[0] !== undefined) {
    mixer.clipAction(gltf.animations[0]).play()
  }

  return { root, mixer }
}

function createMuseumSceneRoot() {
  const root = new Group()
  root.name = 'MuseumRoot'

  const ambient = new AmbientLight(0xf6efe4, 0.5)
  root.add(ambient)

  const key = new DirectionalLight(0xffffff, 2.2)
  key.position.set(3.5, 5.5, 3)
  root.add(key)

  const fill = new DirectionalLight(0xaec8ff, 0.7)
  fill.position.set(-5, 3, -4)
  root.add(fill)

  const floorMaterial = new MeshStandardMaterial({
    color: '#8f887d',
    roughness: 0.88,
    metalness: 0,
  })
  const wallMaterial = new MeshStandardMaterial({ color: '#d8d0c4', roughness: 0.82, metalness: 0 })
  const stoneMaterial = new MeshStandardMaterial({
    color: '#ece7dd',
    roughness: 0.74,
    metalness: 0,
  })
  const bronzeMaterial = new MeshStandardMaterial({
    color: '#b78f4c',
    roughness: 0.42,
    metalness: 0.3,
  })
  const blueMaterial = new MeshStandardMaterial({
    color: '#4f95a7',
    roughness: 0.48,
    metalness: 0.05,
  })

  const floor = new Mesh(new BoxGeometry(8.8, 0.08, 8.8), floorMaterial)
  floor.position.set(0, -0.04, 0)
  root.add(floor)

  const backWall = new Mesh(new BoxGeometry(8.8, 3.2, 0.12), wallMaterial)
  backWall.position.set(0, 1.56, -3.8)
  root.add(backWall)

  const leftWall = new Mesh(new BoxGeometry(0.12, 3.2, 8.8), wallMaterial)
  leftWall.position.set(-4.4, 1.56, 0)
  root.add(leftWall)

  const rightWall = new Mesh(new BoxGeometry(0.12, 3.2, 8.8), wallMaterial)
  rightWall.position.set(4.4, 1.56, 0)
  root.add(rightWall)

  const mainPlinth = new Mesh(new BoxGeometry(1.35, 0.78, 1.35), stoneMaterial)
  mainPlinth.position.set(0, 0.39, -0.55)
  root.add(mainPlinth)

  const artifact = new Mesh(new TorusKnotGeometry(0.42, 0.13, 96, 18), bronzeMaterial)
  artifact.position.set(0, 1.22, -0.55)
  artifact.rotation.set(0.45, 0.25, -0.25)
  root.add(artifact)

  const sidePlinth = new Mesh(new CylinderGeometry(0.42, 0.52, 0.64, 32), stoneMaterial)
  sidePlinth.position.set(-2.2, 0.32, 0.65)
  root.add(sidePlinth)

  const orb = new Mesh(new SphereGeometry(0.42, 48, 24), blueMaterial)
  orb.position.set(-2.2, 0.98, 0.65)
  root.add(orb)

  const blocker = new Mesh(new BoxGeometry(0.42, 1.7, 1.35), wallMaterial)
  blocker.position.set(2.15, 0.85, -1.75)
  blocker.rotation.y = -0.18
  root.add(blocker)

  const lowBench = new Mesh(new BoxGeometry(1.65, 0.28, 0.62), stoneMaterial)
  lowBench.position.set(1.85, 0.14, 1.55)
  root.add(lowBench)

  const wallPanel = new Mesh(
    new BoxGeometry(1.7, 0.95, 0.08),
    new MeshStandardMaterial({
      color: '#2e3839',
      roughness: 0.72,
      metalness: 0.02,
      side: DoubleSide,
    }),
  )
  wallPanel.position.set(-1.55, 1.55, -3.7)
  root.add(wallPanel)

  return root
}

function createReferencePanel(
  container: HTMLElement,
  options: {
    readonly title: string
    readonly mode: CompareMode
    readonly viewMode: ViewMode
    readonly composeDebugEnabled: boolean
    readonly composeDebugModes: readonly ComposeDebugMode[]
    readonly denoiseEnabled: boolean
    readonly fullResolutionVbao: boolean
    readonly aoAvailable: boolean
    readonly onChange: (next: {
      readonly mode?: CompareMode
      readonly viewMode?: ViewMode
      readonly composeDebugEnabled?: boolean
      readonly composeDebugModes?: readonly ComposeDebugMode[]
      readonly denoiseEnabled?: boolean
      readonly fullResolutionVbao?: boolean
    }) => void
  },
) {
  const panel = document.createElement('div')
  panel.className = 'benchmark-panel'
  panel.innerHTML = `
    <header>
      <strong>${options.title}</strong>
      <span data-stats>-- fps / -- ms</span>
    </header>
    <div class="compare-options" role="group" aria-label="AO implementation">
      <button type="button" data-mode="off">Off</button>
      <button type="button" data-mode="gtao">GTAO</button>
      <button type="button" data-mode="ssao">SSAO</button>
      <button type="button" data-mode="vbao">VBAO</button>
      <button type="button" data-mode="n8ao">N8AO</button>
    </div>
    <label class="benchmark-toggle">
      <input type="checkbox" data-compose-debug />
      <span>Compose debug</span>
    </label>
    <div class="compose-debug-options" role="group" aria-label="Compose debug choices">
      <label><input type="checkbox" data-compose-mode="ssao" /><span>SSAO</span></label>
      <label><input type="checkbox" data-compose-mode="gtao" /><span>GTAO</span></label>
      <label><input type="checkbox" data-compose-mode="vbao" /><span>VBAO</span></label>
      <label><input type="checkbox" data-compose-mode="n8ao" /><span>N8AO</span></label>
    </div>
    <div class="compare-options compare-options-secondary" role="group" aria-label="Output view">
      <button type="button" data-view="beauty">Beauty</button>
      <button type="button" data-view="ao">AO only</button>
    </div>
    <label class="benchmark-toggle">
      <input type="checkbox" data-denoise />
      <span>Denoise</span>
    </label>
    <label class="benchmark-toggle">
      <input type="checkbox" data-full-resolution />
      <span>Full-res VBAO</span>
    </label>
  `
  container.appendChild(panel)

  if (!options.aoAvailable) {
    panel.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
      button.disabled = true
      button.title = 'AO comparison requires the Three.js WebGPU backend.'
    })
    panel.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
      input.disabled = true
      input.title = 'AO comparison requires the Three.js WebGPU backend.'
    })
  }

  const sync = (state: {
    readonly mode: CompareMode
    readonly viewMode: ViewMode
    readonly composeDebugEnabled: boolean
    readonly composeDebugModes: readonly ComposeDebugMode[]
    readonly denoiseEnabled: boolean
    readonly fullResolutionVbao: boolean
  }) => {
    panel.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => {
      const selected = button.dataset.mode === state.mode
      button.classList.toggle('active', selected)
      button.setAttribute('aria-pressed', String(selected))
    })
    panel.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((button) => {
      const selected = button.dataset.view === state.viewMode
      button.classList.toggle('active', selected)
      button.setAttribute('aria-pressed', String(selected))
    })
    const composeDebugInput = panel.querySelector<HTMLInputElement>('[data-compose-debug]')
    if (composeDebugInput !== null) composeDebugInput.checked = state.composeDebugEnabled
    panel.querySelectorAll<HTMLInputElement>('[data-compose-mode]').forEach((input) => {
      const mode = input.dataset.composeMode
      input.checked = isComposeDebugMode(mode) && state.composeDebugModes.includes(mode)
      input.disabled =
        !state.composeDebugEnabled ||
        (state.composeDebugModes.length === 1 && input.checked) ||
        !options.aoAvailable
    })
    const denoiseInput = panel.querySelector<HTMLInputElement>('[data-denoise]')
    if (denoiseInput !== null) denoiseInput.checked = state.denoiseEnabled
    const fullResolutionInput = panel.querySelector<HTMLInputElement>('[data-full-resolution]')
    if (fullResolutionInput !== null) fullResolutionInput.checked = state.fullResolutionVbao
  }

  const onClick = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof HTMLButtonElement)) return
    if (
      target.dataset.mode === 'off' ||
      target.dataset.mode === 'gtao' ||
      target.dataset.mode === 'ssao' ||
      target.dataset.mode === 'vbao' ||
      target.dataset.mode === 'n8ao'
    ) {
      options.onChange({ mode: target.dataset.mode })
    }
    if (target.dataset.view === 'beauty' || target.dataset.view === 'ao') {
      options.onChange({ viewMode: target.dataset.view })
    }
  }

  const onInput = (event: Event) => {
    const target = event.target
    if (target instanceof HTMLInputElement && target.dataset.composeDebug !== undefined) {
      options.onChange({ composeDebugEnabled: target.checked })
    }
    if (target instanceof HTMLInputElement && target.dataset.composeMode !== undefined) {
      const mode = target.dataset.composeMode
      if (!isComposeDebugMode(mode)) return
      const next = Array.from(panel.querySelectorAll<HTMLInputElement>('[data-compose-mode]'))
        .filter((input) => input.checked && isComposeDebugMode(input.dataset.composeMode))
        .map((input) => input.dataset.composeMode as ComposeDebugMode)
      if (next.length > 0) options.onChange({ composeDebugModes: sortComposeDebugModes(next) })
    }
    if (target instanceof HTMLInputElement && target.dataset.denoise !== undefined) {
      options.onChange({ denoiseEnabled: target.checked })
    }
    if (target instanceof HTMLInputElement && target.dataset.fullResolution !== undefined) {
      options.onChange({ fullResolutionVbao: target.checked })
    }
  }

  panel.addEventListener('click', onClick)
  panel.addEventListener('input', onInput)
  sync(options)

  return {
    sync,
    updateStats: (stats: Stats) => {
      const statsEl = panel.querySelector<HTMLElement>('[data-stats]')
      if (statsEl !== null) {
        statsEl.textContent = `${stats.fps.toFixed(0)} fps / ${stats.frameMs.toFixed(2)} ms / ${stats.mode}`
      }
    },
    remove: () => {
      panel.removeEventListener('click', onClick)
      panel.removeEventListener('input', onInput)
      panel.remove()
    },
  }
}

function createSplitLabels(container: HTMLElement) {
  const labels = document.createElement('div')
  labels.className = 'split-labels'
  container.appendChild(labels)
  return {
    sync: (composeDebugEnabled: boolean, modes: readonly ComposeDebugMode[]) => {
      labels.classList.toggle('hidden', !composeDebugEnabled)
      labels.style.gridTemplateColumns = `repeat(${modes.length}, minmax(0, 1fr))`
      labels.replaceChildren(
        ...modes.map((mode) => {
          const label = document.createElement('span')
          label.textContent = getComposeDebugLabel(mode)
          return label
        }),
      )
    },
    remove: () => labels.remove(),
  }
}

function createAoBenchmarkPublisher(
  environment: AoBenchmarkEnvironment,
  options: {
    readonly setVbaoDenoiseFilter: (filter: VbaoDenoiseFilter) => void
    readonly setVbaoDepthPrefilterPreset: (preset: VbaoDepthPrefilterPreset) => void
    readonly setVbaoSamplePreset: (preset: VbaoSamplePreset) => void
    readonly setVbaoSamplingSchedule: (schedule: VbaoSamplingSchedule) => void
    readonly setVbaoRadiusStressPreset: (preset: VbaoRadiusStressPreset) => void
  },
) {
  const history: Stats[] = []
  const api: AoBenchmarkApi = {
    environment,
    history,
    reset: () => {
      history.length = 0
      delete api.latest
    },
    snapshot: () => {
      const snapshot: { environment: AoBenchmarkEnvironment; latest?: Stats; history: Stats[] } = {
        environment,
        history: [...history],
      }
      if (api.latest !== undefined) {
        snapshot.latest = api.latest
      }
      return snapshot
    },
    setVbaoDenoiseFilter: (filter) => {
      if (!isVbaoDenoiseFilter(filter)) return
      options.setVbaoDenoiseFilter(filter)
    },
    setVbaoDepthPrefilterPreset: (preset) => {
      if (!isVbaoDepthPrefilterPreset(preset)) return
      options.setVbaoDepthPrefilterPreset(preset)
    },
    setVbaoRadiusStressPreset: (preset) => {
      if (!isVbaoRadiusStressPreset(preset)) return
      options.setVbaoRadiusStressPreset(preset)
    },
    setVbaoSamplePreset: (preset) => {
      if (!isVbaoSamplePreset(preset)) return
      options.setVbaoSamplePreset(preset)
    },
    setVbaoSamplingSchedule: (schedule) => {
      if (!isVbaoSamplingSchedule(schedule)) return
      options.setVbaoSamplingSchedule(schedule)
    },
  }

  window.__aoBenchmark = api

  return {
    publish: (stats: Stats) => {
      api.latest = stats
      history.push(stats)
      if (history.length > 240) history.shift()
    },
    dispose: () => {
      if (window.__aoBenchmark === api) {
        delete window.__aoBenchmark
      }
    },
  }
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))
  return sorted[index]!
}

function createStatsSampler(onStats: (stats: Stats) => void) {
  let frames = 0
  let totalMs = 0
  let reportIndex = 0
  const frameSamples: number[] = []
  let lastReport = performance.now()
  return {
    sample: (
      frameMs: number,
      context: Omit<
        Stats,
        | 'fps'
        | 'frameMs'
        | 'avgFrameMs'
        | 'medianFrameMs'
        | 'p95FrameMs'
        | 'reportIndex'
        | 'sampleCount'
        | 'timestamp'
      >,
    ) => {
      frames += 1
      totalMs += frameMs
      frameSamples.push(frameMs)
      const now = performance.now()
      if (now - lastReport < 500) return
      const avgMs = totalMs / frames
      const sorted = [...frameSamples].sort((a, b) => a - b)
      reportIndex += 1
      onStats({
        ...context,
        fps: 1000 / avgMs,
        frameMs: avgMs,
        avgFrameMs: avgMs,
        medianFrameMs: percentile(sorted, 0.5),
        p95FrameMs: percentile(sorted, 0.95),
        reportIndex,
        sampleCount: frames,
        timestamp: now,
      })
      frames = 0
      totalMs = 0
      frameSamples.length = 0
      lastReport = now
    },
  }
}
