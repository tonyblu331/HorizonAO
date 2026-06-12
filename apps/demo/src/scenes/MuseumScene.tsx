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
  RenderTarget,
  Scene,
  SphereGeometry,
  TorusKnotGeometry,
  UnsignedByteType,
  Vector2,
  Vector3,
  Vector4,
  WebGPURenderer,
} from 'three/webgpu'
import {
  Fn,
  If,
  Loop,
  PI,
  colorToDirection,
  directionToColor,
  float,
  getScreenPosition,
  getViewPosition,
  int,
  mrt,
  normalView,
  pass,
  pow,
  sample,
  sqrt,
  texture,
  uniform,
  uv,
  vec3,
  vec4,
  velocity,
} from 'three/tsl'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { ao as gtao } from 'three/addons/tsl/display/GTAONode.js'
import { denoise } from 'three/addons/tsl/display/DenoiseNode.js'
import { traa } from 'three/addons/tsl/display/TRAANode.js'
import { N8AONode, createN8AOScenePass } from 'n8ao-webgpu'
import { createDebugViewportPlan, createDebugViewportRects } from 'threejs-debug-view'
import { VBAONode } from '@horizonao/core'
import { VBAOFullResPolishNode } from '../../../../packages/horizon-ao/src/VBAOFullResPolishNode'
import { VBAOHalfResCleanupNode } from '../../../../packages/horizon-ao/src/VBAOHalfResCleanupNode'
import { VBAOReceiverConfidenceNode } from '../../../../packages/horizon-ao/src/VBAOReceiverConfidenceNode'
import { VBAOResolveNode } from '../../../../packages/horizon-ao/src/VBAOResolveNode'
import {
  VBAOVelocityTemporalNode,
  type VBAOVelocityTemporalDiagnostics,
  type VBAOVelocityTemporalTargetInventory,
} from '../../../../packages/horizon-ao/src/VBAOVelocityTemporalNode'
import { createGpuPassTimingProbe, type GpuPassTiming } from './gpuPassTimingProbe'
import {
  VBAO_BENCHMARK_NOISE_SOURCES,
  createVbaoBenchmarkNoiseTexture,
  type VbaoBenchmarkNoiseSourceName,
} from './vbaoBenchmarkNoise'
import {
  VBAO_COMPUTE_CANDIDATE_LABEL,
  createVbaoSectorConfidenceComputeCandidate,
} from './vbaoComputeCandidate'

type PageState = 'loading' | 'ready' | 'error'
type CompareMode = 'off' | 'gtao' | 'ssao' | 'vbao' | 'n8ao'
type ComposeDebugMode = 'ssao' | 'vbao' | 'gtao' | 'n8ao' | 'beauty'
type ViewMode = 'beauty' | 'ao'
type SceneVariant = 'city' | 'museum'
type CameraViewPreset = 'default' | 'city-detail' | 'city-facade' | 'city-storefront'
type VbaoSamplingSchedule = 'phase-atlas-stable-hash'
type VbaoBenchmarkSamplingSchedule = VbaoSamplingSchedule | 'n/a'
type VbaoNoiseSource = VbaoBenchmarkNoiseSourceName
type VbaoBenchmarkNoiseSource = VbaoNoiseSource | 'n/a'
type VbaoBenchmarkOptions = NonNullable<ConstructorParameters<typeof VBAONode>[3]> & {
  readonly benchmark?: { readonly noiseTexture?: ReturnType<typeof createVbaoBenchmarkNoiseTexture> }
  readonly temporalMode?: VbaoTemporalMode
}
type VbaoSampleMode =
  | 'product-preset'
  | 'debug-override'
  | 'spatial-ultra'
  | 'same-cost-3x10'
  | 'same-cost-2x16'
type VbaoTemporalMode = 'off' | 'host' | 'velocity-internal'
type VbaoHostTaaMode = 'off' | 'traa'
type VbaoCleanupMode = 'on' | 'skip'
type VbaoComputeCandidateMode = 'off' | typeof VBAO_COMPUTE_CANDIDATE_LABEL
type VbaoBenchmarkTemporalMode = VbaoTemporalMode | 'n/a'
type VbaoBenchmarkHostTaaMode = VbaoHostTaaMode | 'n/a'
type VbaoBenchmarkCleanupMode = VbaoCleanupMode | 'n/a'
type VbaoBenchmarkSamplePreset = 'quality' | VbaoSampleMode | 'n/a'
type VbaoBenchmarkTemporalDiagnostics = VBAOVelocityTemporalDiagnostics | null
type VbaoBenchmarkTemporalTargetInventory = VBAOVelocityTemporalTargetInventory | null
type VbaoComputeCandidate = ReturnType<typeof createVbaoSectorConfidenceComputeCandidate>
type VbaoBenchmarkComputeCandidateLabel = VbaoComputeCandidate['label'] | 'n/a'
type VbaoBenchmarkComputeCandidateInventory =
  | VbaoComputeCandidate['storageTargetInventory']
  | null
type VbaoBenchmarkComputeCandidateTiming = {
  readonly pass: typeof VBAO_COMPUTE_CANDIDATE_LABEL
  readonly status: 'measured'
  readonly cpuMs: number
  readonly reason: string
} | null
type VbaoReceiverConfidenceMode = 'confidence-guided' | 'scalar-control'
type VbaoBenchmarkReceiverConfidenceMode = VbaoReceiverConfidenceMode | 'n/a'
type VbaoReconstructionStage = 'raw' | 'cleanup' | 'resolve' | 'polish' | 'final' | 'confidence'
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
  readonly vbaoNoiseSource: VbaoBenchmarkNoiseSource
  readonly vbaoTemporalMode: VbaoBenchmarkTemporalMode
  readonly vbaoHostTaaMode: VbaoBenchmarkHostTaaMode
  readonly vbaoCleanupMode: VbaoBenchmarkCleanupMode
  readonly vbaoTemporalDiagnostics: VbaoBenchmarkTemporalDiagnostics
  readonly vbaoTemporalTargetInventory: VbaoBenchmarkTemporalTargetInventory
  readonly vbaoComputeCandidateLabel: VbaoBenchmarkComputeCandidateLabel
  readonly vbaoComputeCandidateInventory: VbaoBenchmarkComputeCandidateInventory
  readonly vbaoComputeCandidateTiming: VbaoBenchmarkComputeCandidateTiming
  readonly vbaoReceiverConfidenceMode: VbaoBenchmarkReceiverConfidenceMode
  readonly vbaoSamplePreset: VbaoBenchmarkSamplePreset
  readonly vbaoReconstructionStage: VbaoReconstructionStage | 'n/a'
  readonly vbaoSoftness: number
  readonly vbaoRadius: number
  readonly vbaoThickness: number
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
  'beauty',
] as const satisfies readonly ComposeDebugMode[]
const VBAO_PRODUCTION_SAMPLING_SCHEDULE: VbaoSamplingSchedule = 'phase-atlas-stable-hash'
const VBAO_PRODUCT_QUALITY = 'quality' as const
const VBAO_PRODUCT_PRESET_SHAPE = { samples: 8, slices: 4 } as const
const VBAO_DEBUG_OVERRIDE_SHAPE = VBAO_PRODUCT_PRESET_SHAPE
const VBAO_SPATIAL_ULTRA_SHAPE = { samples: 10, slices: 4 } as const
const VBAO_SAME_COST_3X10_SHAPE = { samples: 10, slices: 3 } as const
const VBAO_SAME_COST_2X16_SHAPE = { samples: 16, slices: 2 } as const
const AO_COMPARISON_PRESET = {
  radius: 1.25,
  thickness: 0.25,
  gtaoContrast: 1.0,
  vbaoContrast: 1.0,
  n8aoIntensity: 1.0,
  samples: 16,
  denoiseRadius: 3,
  denoiseDepthPhi: 3,
  denoiseNormalPhi: 8,
} as const
const AO_ONLY_DISPLAY_BOOST = 1.15
const GTAO_AO_ONLY_DISPLAY_GAMMA = 4.5
const VBAO_AO_ONLY_DISPLAY_BOOST = 3.0
const VBAO_AO_ONLY_DISPLAY_FLOOR = 0.18
const VBAO_AO_ONLY_DISPLAY_GAMMA = 1.0
const N8AO_AO_ONLY_DISPLAY_GAMMA = 3.5
const VBAO_RADIUS_STRESS_PRESETS = {
  baseline: { radius: 1.25, thickness: 0.25 },
} as const

interface AoBenchmarkApi {
  readonly environment: AoBenchmarkEnvironment
  latest?: Stats
  readonly history: Stats[]
  reset: () => void
  inspectVbaoGeneratedShaders: () => VbaoGeneratedShaderInspection
  resolveGpuPassTimings: () => Promise<readonly GpuPassTiming[]>
  setVbaoReconstructionStage: (stage: VbaoReconstructionStage) => void
  resetVbaoTemporalEvidence: (reason: string) => void
  snapshot: () => {
    readonly environment: AoBenchmarkEnvironment
    readonly latest?: Stats
    readonly history: Stats[]
  }
}

interface VbaoGeneratedShaderProgram {
  readonly stage: 'vertex' | 'fragment'
  readonly code: string
  readonly length: number
  readonly containsVbao: boolean
}

interface VbaoGeneratedShaderInspection {
  readonly productPreset: typeof VBAO_PRODUCT_QUALITY
  readonly sampleMode: VbaoSampleMode
  readonly fullResolution: boolean
  readonly shaderPrograms: readonly VbaoGeneratedShaderProgram[]
}

declare global {
  interface Window {
    __aoBenchmark?: AoBenchmarkApi
  }
}

function disposeSceneGraph(root: Group) {
  root.traverse((child) => {
    if (child instanceof Mesh) {
      child.geometry?.dispose()
      const mat = child.material
      if (Array.isArray(mat)) mat.forEach((m) => m?.dispose())
      else mat?.dispose()
    }
  })
}

function isComposeDebugMode(value: string | undefined): value is ComposeDebugMode {
  return COMPOSE_DEBUG_MODES.some((mode) => mode === value)
}

function sortComposeDebugModes(modes: readonly ComposeDebugMode[]) {
  return COMPOSE_DEBUG_MODES.filter((mode) => modes.includes(mode))
}

function getComposeDebugLabel(mode: ComposeDebugMode) {
  if (mode === 'beauty') return 'BEAUTY'
  return mode.toUpperCase()
}

function getComposeDebugSlotLabel(mode: ComposeDebugMode, index: number) {
  const label = getComposeDebugLabel(mode)
  return label.length === 0 ? '' : `${index + 1} ${label}`
}

function getRequestedVbaoNoiseSource(): VbaoNoiseSource {
  const requested = new URLSearchParams(window.location.search).get('vbaoNoiseSource')
  return VBAO_BENCHMARK_NOISE_SOURCES.some((source) => source === requested)
    ? (requested as VbaoNoiseSource)
    : VBAO_PRODUCTION_SAMPLING_SCHEDULE
}

function getRequestedVbaoSampleMode(): VbaoSampleMode {
  const requested = new URLSearchParams(window.location.search).get('vbaoSampleMode')
  if (
    requested === 'debug-override' ||
    requested === 'spatial-ultra' ||
    requested === 'same-cost-3x10' ||
    requested === 'same-cost-2x16'
  ) {
    return requested
  }
  return 'product-preset'
}

function getRequestedVbaoTemporalMode(): VbaoTemporalMode {
  const requested = new URLSearchParams(window.location.search).get('vbaoTemporalMode')
  if (requested === 'velocity-internal') return 'velocity-internal'
  return requested === 'host' ? 'host' : 'off'
}

function getRequestedVbaoHostTaaMode(): VbaoHostTaaMode {
  const requested = new URLSearchParams(window.location.search).get('vbaoHostTaa')
  return requested === 'traa' ? 'traa' : 'off'
}

function resolveVbaoSampleShape(sampleMode: VbaoSampleMode) {
  if (sampleMode === 'spatial-ultra') return VBAO_SPATIAL_ULTRA_SHAPE
  if (sampleMode === 'same-cost-3x10') return VBAO_SAME_COST_3X10_SHAPE
  if (sampleMode === 'same-cost-2x16') return VBAO_SAME_COST_2X16_SHAPE
  return VBAO_PRODUCT_PRESET_SHAPE
}

function getRequestedVbaoCleanupMode(): VbaoCleanupMode {
  const requested = new URLSearchParams(window.location.search).get('vbaoCleanup')
  return requested === 'skip' ? 'skip' : 'on'
}

function getRequestedVbaoComputeCandidateMode(): VbaoComputeCandidateMode {
  const requested = new URLSearchParams(window.location.search).get('vbaoComputeCandidate')
  return requested === VBAO_COMPUTE_CANDIDATE_LABEL ? VBAO_COMPUTE_CANDIDATE_LABEL : 'off'
}

function getRequestedVbaoReceiverConfidenceMode(): VbaoReceiverConfidenceMode {
  const requested = new URLSearchParams(window.location.search).get('vbaoReceiverConfidence')
  return requested === 'scalar-control' ? 'scalar-control' : 'confidence-guided'
}

function getRequestedVbaoSoftness(): number {
  const requested = Number(new URLSearchParams(window.location.search).get('vbaoSoftness') ?? 0.2)
  return Number.isFinite(requested) ? Math.max(0, Math.min(1, requested)) : 0.2
}

function getRequestedVbaoReconstructionStage(): VbaoReconstructionStage {
  const requested = new URLSearchParams(window.location.search).get('vbaoReconstructionStage')
  if (
    requested === 'raw' ||
    requested === 'cleanup' ||
    requested === 'resolve' ||
    requested === 'polish' ||
    requested === 'final' ||
    requested === 'confidence'
  ) {
    return requested
  }
  return 'final'
}

function getRequestedCameraView(): CameraViewPreset {
  const requested = new URLSearchParams(window.location.search).get('cameraView')
  if (requested === 'city-storefront') return requested
  if (requested === 'city-facade') return requested
  return requested === 'city-detail' ? requested : 'default'
}

function collectGeneratedShaderPrograms(renderer: WebGPURenderer): readonly VbaoGeneratedShaderProgram[] {
  const programs = (
    renderer as unknown as {
      readonly _pipelines?: {
        readonly programs?: {
          readonly vertex?: Map<string, { readonly code?: string }>
          readonly fragment?: Map<string, { readonly code?: string }>
        }
      }
    }
  )._pipelines?.programs

  const collectStage = (
    stage: VbaoGeneratedShaderProgram['stage'],
    shaderMap: Map<string, { readonly code?: string }> | undefined,
  ) =>
    [...(shaderMap?.entries() ?? [])].map(([sourceCode, program]) => {
      const code = program.code ?? sourceCode
      return {
        stage,
        code,
        length: code.length,
        containsVbao: code.toLowerCase().includes('vbao'),
      }
    })

  return [
    ...collectStage('vertex', programs?.vertex),
    ...collectStage('fragment', programs?.fragment),
  ].filter((program) => program.containsVbao)
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
  const trackGpuPassTiming =
    new URLSearchParams(window.location.search).get('gpuPassTiming') === '1'

  const renderer = new WebGPURenderer({
    canvas,
    antialias: true,
    forceWebGL: false,
    powerPreference: 'high-performance',
    trackTimestamp: trackGpuPassTiming,
  })
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
  await renderer.init()

  const isWebGlFallback =
    (renderer as unknown as { readonly backend?: { readonly isWebGLBackend?: boolean } }).backend
      ?.isWebGLBackend === true
  container.dataset.rendererBackend = isWebGlFallback ? 'webgl' : 'webgpu'
  const gpuPassTimingProbe = createGpuPassTimingProbe(renderer)

  if (signal.aborted) {
    gpuPassTimingProbe.dispose()
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

  const vbaoNoiseSource = getRequestedVbaoNoiseSource()
  const vbaoSampleMode = getRequestedVbaoSampleMode()
  const vbaoTemporalMode = getRequestedVbaoTemporalMode()
  const vbaoHostTaaMode = getRequestedVbaoHostTaaMode()
  const vbaoCleanupMode = getRequestedVbaoCleanupMode()
  const vbaoComputeCandidateMode = getRequestedVbaoComputeCandidateMode()
  const vbaoReceiverConfidenceMode = getRequestedVbaoReceiverConfidenceMode()
  const vbaoSoftness = getRequestedVbaoSoftness()
  const cameraView = getRequestedCameraView()
  let vbaoReconstructionStage = getRequestedVbaoReconstructionStage()
  const pipelines = isWebGlFallback
    ? undefined
    : createReferencePipelines(
        renderer,
        scene,
        camera,
        vbaoNoiseSource,
        vbaoSampleMode,
        vbaoTemporalMode,
        vbaoHostTaaMode,
        vbaoCleanupMode,
        vbaoComputeCandidateMode,
        vbaoReceiverConfidenceMode,
        vbaoSoftness,
        trackGpuPassTiming,
        () => vbaoReconstructionStage,
      )
  let activeMode: CompareMode = 'off'
  let viewMode: ViewMode = 'beauty'
  let composeDebugEnabled = !isWebGlFallback
  let composeDebugModes: readonly ComposeDebugMode[] = ['ssao', 'gtao', 'vbao', 'n8ao']
  const sceneVariant = initialVariant
  let denoiseEnabled = true
  let fullResolutionVbao = false

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
  applySceneVariant(sceneVariant, variants, camera, controls, cameraView)
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
    () => {
      if (pipelines === undefined) {
        return {
          productPreset: VBAO_PRODUCT_QUALITY,
          sampleMode: vbaoSampleMode,
          fullResolution: fullResolutionVbao,
          shaderPrograms: [],
        }
      }
      return pipelines.inspectVbaoGeneratedShaders(fullResolutionVbao)
    },
    gpuPassTimingProbe.resolveLatestVbaoPassTimings,
    (stage) => {
      vbaoReconstructionStage = stage
    },
    (reason) => {
      pipelines?.resetVbaoTemporalEvidence(reason)
    },
  )
  const stats = createStatsSampler((next) => {
    benchmark.publish(next)
    panel.updateStats(next)
    labels.updateStats(next)
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
    const usesVbao =
      mode === 'vbao' || (renderMode === 'compose' && composeDebugModes.includes('vbao'))

    return {
      scene: sceneVariant,
      rendererBackend: isWebGlFallback ? 'webgl' : 'webgpu',
      renderMode,
      mode,
      composeModes: renderMode === 'compose' ? [...composeDebugModes] : [],
      viewMode,
      denoiseEnabled,
      fullResolutionVbao,
      vbaoSamplingSchedule: usesVbao ? VBAO_PRODUCTION_SAMPLING_SCHEDULE : 'n/a',
      vbaoNoiseSource: usesVbao ? vbaoNoiseSource : 'n/a',
      vbaoTemporalMode: usesVbao ? vbaoTemporalMode : 'n/a',
      vbaoHostTaaMode: usesVbao ? vbaoHostTaaMode : 'n/a',
      vbaoCleanupMode: usesVbao ? vbaoCleanupMode : 'n/a',
      vbaoTemporalDiagnostics:
        usesVbao && vbaoTemporalMode === 'velocity-internal'
          ? (pipelines?.getVbaoTemporalDiagnostics() ?? null)
          : null,
      vbaoTemporalTargetInventory:
        usesVbao && vbaoTemporalMode === 'velocity-internal'
          ? (pipelines?.getVbaoTemporalTargetInventory() ?? null)
          : null,
      vbaoComputeCandidateLabel: usesVbao
        ? (pipelines?.getVbaoComputeCandidateLabel() ?? 'n/a')
        : 'n/a',
      vbaoComputeCandidateInventory: usesVbao
        ? (pipelines?.getVbaoComputeCandidateInventory() ?? null)
        : null,
      vbaoComputeCandidateTiming: usesVbao
        ? (pipelines?.getVbaoComputeCandidateTiming() ?? null)
        : null,
      vbaoReceiverConfidenceMode: usesVbao ? vbaoReceiverConfidenceMode : 'n/a',
      vbaoSamplePreset: usesVbao
        ? vbaoSampleMode !== 'product-preset'
          ? vbaoSampleMode
          : VBAO_PRODUCT_QUALITY
        : 'n/a',
      vbaoReconstructionStage: usesVbao ? vbaoReconstructionStage : 'n/a',
      vbaoSoftness: usesVbao ? vbaoSoftness : 0,
      vbaoRadius: usesVbao ? VBAO_RADIUS_STRESS_PRESETS.baseline.radius : 0,
      vbaoThickness: usesVbao ? VBAO_RADIUS_STRESS_PRESETS.baseline.thickness : 0,
      vbaoSamples: usesVbao ? resolveVbaoSampleShape(vbaoSampleMode).samples : 0,
      vbaoSlices: usesVbao ? resolveVbaoSampleShape(vbaoSampleMode).slices : 0,
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
      pipelines.renderComposeDebug(composeDebugModes, viewMode, denoiseEnabled, fullResolutionVbao)
      stats.sample(performance.now() - frameStart, benchmarkContext('compose', 'compose'))
    } else {
      pipelines.renderSingle(activeMode, viewMode, denoiseEnabled, fullResolutionVbao)
      stats.sample(performance.now() - frameStart, benchmarkContext('single', activeMode))
    }
  }
  rafId = requestAnimationFrame(animate)

  signal.addEventListener('abort', () => {
    cancelAnimationFrame(rafId)
    if (resizeRafId !== 0) cancelAnimationFrame(resizeRafId)
    resizeObserver?.disconnect()
    controls?.dispose()
    disposeSceneGraph(variants.cityRoot)
    disposeSceneGraph(variants.museumRoot)
    panel?.remove()
    labels?.remove()
    benchmark?.dispose()
    gpuPassTimingProbe?.dispose()
    pipelines?.dispose()
    renderer.dispose()
    canvas.remove()
  })
}

function createReferencePipelines(
  renderer: WebGPURenderer,
  scene: Scene,
  camera: PerspectiveCamera,
  vbaoNoiseSource: VbaoNoiseSource,
  vbaoSampleMode: VbaoSampleMode,
  vbaoTemporalMode: VbaoTemporalMode,
  vbaoHostTaaMode: VbaoHostTaaMode,
  vbaoCleanupMode: VbaoCleanupMode,
  vbaoComputeCandidateMode: VbaoComputeCandidateMode,
  vbaoReceiverConfidenceMode: VbaoReceiverConfidenceMode,
  vbaoSoftness: number,
  trackGpuPassTiming: boolean,
  getVbaoReconstructionStage: () => VbaoReconstructionStage,
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
  ) => colorToDirection(prePass.getTextureNode().sample(sampleUv))
  const previousPrePassNormal = sample((sampleUv) =>
    colorToDirection(prePass.getPreviousTextureNode('output').sample(sampleUv)),
  )
  const prePassDepth = prePass.getTextureNode('depth')
  const previousPrePassDepth = prePass.getPreviousTextureNode('depth')
  const prePassVelocity = prePass.getTextureNode('velocity')
  const normalTexture = prePass.getTexture('output')
  normalTexture.type = UnsignedByteType

  const scenePass = pass(scene, camera)
  const sceneColor = scenePass.getTextureNode('output')

  const ssaoRadius = uniform(AO_COMPARISON_PRESET.radius)
  const ssaoBias = uniform(Math.max(0.01, AO_COMPARISON_PRESET.thickness * 0.1))
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
    const sampleCount = int(AO_COMPARISON_PRESET.samples)

    Loop({ start: int(0), end: sampleCount, type: 'int', condition: '<' }, ({ i }) => {
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

    return float(1).sub(occlusion.div(float(sampleCount)).mul(ssaoIntensity)).clamp(0, 1)
  })()

  const gtaoNode = gtao(prePassDepth, prePassNormal, camera)
  gtaoNode.samples.value = AO_COMPARISON_PRESET.samples
  gtaoNode.distanceExponent.value = 1
  gtaoNode.distanceFallOff.value = 1
  gtaoNode.radius.value = AO_COMPARISON_PRESET.radius
  gtaoNode.scale.value = AO_COMPARISON_PRESET.gtaoContrast
  gtaoNode.thickness.value = AO_COMPARISON_PRESET.thickness
  gtaoNode.resolutionScale = 1.0
  gtaoNode.useTemporalFiltering = false

  const baselineVbaoRadius = VBAO_RADIUS_STRESS_PRESETS.baseline
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
  n8aoNode.configuration.screenSpaceRadius = false
  n8aoNode.configuration.aoRadius = AO_COMPARISON_PRESET.radius
  n8aoNode.configuration.distanceFalloff = 1
  n8aoNode.configuration.intensity = AO_COMPARISON_PRESET.n8aoIntensity
  n8aoNode.configuration.denoiseIterations = 2
  n8aoNode.configuration.denoiseRadius = AO_COMPARISON_PRESET.denoiseRadius
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
  const ssaoDenoised = denoise(
    vec4(vec3(ssaoRawScalar), float(1)),
    prePassDepth,
    prePassNormal,
    camera,
  )
  const gtaoDenoised = denoise(vec4(vec3(gtaoRaw.r), float(1)), prePassDepth, prePassNormal, camera)
  ssaoDenoised.radius.value = AO_COMPARISON_PRESET.denoiseRadius
  ssaoDenoised.depthPhi.value = AO_COMPARISON_PRESET.denoiseDepthPhi
  ssaoDenoised.normalPhi.value = AO_COMPARISON_PRESET.denoiseNormalPhi
  gtaoDenoised.radius.value = AO_COMPARISON_PRESET.denoiseRadius
  gtaoDenoised.depthPhi.value = AO_COMPARISON_PRESET.denoiseDepthPhi
  gtaoDenoised.normalPhi.value = AO_COMPARISON_PRESET.denoiseNormalPhi
  const gtaoRawScalar = gtaoRaw.r
  type TslScalar = typeof gtaoRaw.r
  type TslVec3 = typeof sceneColor.rgb
  type PipelineSet = {
    readonly beautyRaw: RenderPipeline
    readonly beautyDenoised: RenderPipeline
    readonly aoRaw: RenderPipeline
    readonly aoDenoised: RenderPipeline
  }
  type VbaoStagePipelineSet = Partial<Record<VbaoReconstructionStage, RenderPipeline>>
  type ComposeTarget = {
    readonly renderTarget: RenderTarget
    readonly copyPipeline: RenderPipeline
    width: number
    height: number
  }
  const ssaoDenoisedScalar = (ssaoDenoised as unknown as typeof gtaoRaw).r
  const gtaoDenoisedScalar = (gtaoDenoised as unknown as typeof gtaoRaw).r
  const n8aoTex = n8aoNode.getTextureNode() as unknown as {
    readonly rgb: TslVec3
    readonly a: TslScalar
  }

  const makeBeautyPipeline = (aoValue: TslScalar) =>
    new RenderPipeline(renderer, vec4(sceneColor.rgb.mul(aoValue), float(1)))
  const boostAoScalar = (aoValue: TslScalar, boost = AO_ONLY_DISPLAY_BOOST) =>
    float(1).sub(float(1).sub(aoValue).mul(float(boost))).clamp(0, 1)
  const displayAoScalar = (
    aoValue: TslScalar,
    gamma: number,
    boost = AO_ONLY_DISPLAY_BOOST,
    floor = 0,
  ) => pow(boostAoScalar(aoValue, boost), float(gamma)).max(float(floor)).clamp(0, 1)
  const makeAoPipeline = (
    aoValue: TslScalar,
    gamma = 1,
    boost = AO_ONLY_DISPLAY_BOOST,
    floor = 0,
  ) =>
    new RenderPipeline(renderer, vec4(vec3(displayAoScalar(aoValue, gamma, boost, floor)), float(1)))
  const n8aoScalar = n8aoTex.rgb.r
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
      aoRaw: makeAoPipeline(gtaoRawScalar, GTAO_AO_ONLY_DISPLAY_GAMMA),
      aoDenoised: makeAoPipeline(gtaoDenoisedScalar, GTAO_AO_ONLY_DISPLAY_GAMMA),
    },
    ssao: {
      beautyRaw: makeBeautyPipeline(ssaoRawScalar),
      beautyDenoised: makeBeautyPipeline(ssaoDenoisedScalar),
      aoRaw: makeAoPipeline(ssaoRawScalar, GTAO_AO_ONLY_DISPLAY_GAMMA),
      aoDenoised: makeAoPipeline(ssaoDenoisedScalar, GTAO_AO_ONLY_DISPLAY_GAMMA),
    },
    n8ao: {
      beautyRaw: new RenderPipeline(renderer, vec4(n8aoTex.rgb, n8aoTex.a)),
      beautyDenoised: new RenderPipeline(renderer, vec4(n8aoTex.rgb, n8aoTex.a)),
      aoRaw: makeAoPipeline(n8aoScalar, N8AO_AO_ONLY_DISPLAY_GAMMA),
      aoDenoised: makeAoPipeline(n8aoScalar, N8AO_AO_ONLY_DISPLAY_GAMMA),
    },
  }

  let activeVbao:
    | {
        readonly fullResolution: boolean
        readonly cleanupMode: VbaoCleanupMode
        readonly receiverConfidenceMode: VbaoReceiverConfidenceMode
        readonly node: VBAONode
        readonly stageNodes: readonly {
          dispose: () => void
        }[]
        readonly pipelines: PipelineSet
        readonly stagePipelines: VbaoStagePipelineSet | undefined
        readonly velocityTemporalNode: VBAOVelocityTemporalNode | undefined
        readonly computeCandidate: VbaoComputeCandidate | null
        readonly computeCandidateTiming: VbaoBenchmarkComputeCandidateTiming
      }
    | undefined

  const disposePipelineSet = (pipelineSet: Record<string, RenderPipeline>) => {
    const disposedPipelines = new Set<RenderPipeline>()
    Object.values(pipelineSet).forEach((pipeline) => {
      if (disposedPipelines.has(pipeline)) return
      disposedPipelines.add(pipeline)
      pipeline.dispose()
    })
  }

  const disposeActiveVbao = () => {
    if (activeVbao === undefined) return
    disposePipelineSet(activeVbao.pipelines)
    if (activeVbao.stagePipelines !== undefined) disposePipelineSet(activeVbao.stagePipelines)
    activeVbao.stageNodes.forEach((node) => node.dispose())
    activeVbao.node.dispose()
    activeVbao = undefined
  }

  const createVbaoPipelines = (fullResolution: boolean) => {
    const vbaoSampleShape = resolveVbaoSampleShape(vbaoSampleMode)
    const vbaoOptions: VbaoBenchmarkOptions = {
      quality: VBAO_PRODUCT_QUALITY,
      radius: baselineVbaoRadius.radius,
      softness: vbaoSoftness,
      benchmark: { noiseTexture: createVbaoBenchmarkNoiseTexture(vbaoNoiseSource) },
      temporalMode: vbaoTemporalMode,
      advanced: {
        thickness: baselineVbaoRadius.thickness,
        contrast: AO_COMPARISON_PRESET.vbaoContrast,
        resolutionScale: fullResolution ? 1.0 : 0.5,
        ...(vbaoSampleMode === 'debug-override'
          ? {
              samples: VBAO_DEBUG_OVERRIDE_SHAPE.samples,
              slices: VBAO_DEBUG_OVERRIDE_SHAPE.slices,
            }
          : vbaoSampleMode !== 'product-preset'
            ? {
                samples: vbaoSampleShape.samples,
                slices: vbaoSampleShape.slices,
              }
          : {}),
      },
    }
    const vbaoNode = new VBAONode(prePassDepth, prePassNormal, camera, vbaoOptions)
    const usesReceiverConfidence =
      vbaoReceiverConfidenceMode === 'confidence-guided' &&
      (vbaoComputeCandidateMode === VBAO_COMPUTE_CANDIDATE_LABEL || vbaoSoftness > 0)
    const receiverConfidenceNode =
      usesReceiverConfidence
        ? new VBAOReceiverConfidenceNode(
            prePassDepth,
            prePassNormal,
            camera,
            vbaoNode.radius,
            vbaoNode.thickness,
            {
              resolutionScale: fullResolution ? 1.0 : 0.5,
              slices: vbaoSampleShape.slices,
              samples: vbaoSampleShape.samples,
            },
          )
        : undefined
    const receiverConfidenceScalar = receiverConfidenceNode?.getTextureNode().r
    const sectorConfidence =
      vbaoComputeCandidateMode === VBAO_COMPUTE_CANDIDATE_LABEL
        ? createVbaoSectorConfidenceComputeCandidate(1, 1)
        : null
    const sectorConfidenceComputeStart = performance.now()
    if (sectorConfidence !== null) sectorConfidence.compute(renderer)
    const sectorConfidenceComputeCpuMs = performance.now() - sectorConfidenceComputeStart
    const vbaoRawScalar = vbaoNode.getRawTextureNode().r
    let vbaoProductNode = fullResolution ? vbaoNode.getTextureNode() : vbaoNode.getRawTextureNode()
    let vbaoProductScalar = vbaoProductNode.r
    let stagePipelines: VbaoStagePipelineSet | undefined
    const stageNodes: {
      dispose: () => void
    }[] = [
      ...(sectorConfidence === null ? [] : [sectorConfidence]),
      ...(receiverConfidenceNode === undefined ? [] : [receiverConfidenceNode]),
    ]

    if (!fullResolution) {
      const cleanupNode = new VBAOHalfResCleanupNode(
        vbaoNode.getRawTextureNode(),
        prePassDepth,
        prePassNormal,
        camera,
        vbaoNode.radius,
        {
          enabled: vbaoCleanupMode === 'on',
          strength: vbaoSoftness,
          resolutionScale: 0.5,
          confidenceNode: vbaoNode.getRawTextureNode(),
        },
      )
      const cleanupTextureNode = cleanupNode.getTextureNode()
      const resolveNode = new VBAOResolveNode(
        vbaoCleanupMode === 'on' ? cleanupTextureNode : vbaoNode.getRawTextureNode(),
        prePassDepth,
        prePassNormal,
        camera,
        vbaoNode.radius,
      )
      const polishStrength = Math.max(0, (vbaoOptions.softness ?? 0) - 0.5) * 2
      const polishNode = new VBAOFullResPolishNode(
        resolveNode.getTextureNode(),
        prePassDepth,
        prePassNormal,
        camera,
        vbaoNode.radius,
        {
          enabled: polishStrength > 0,
          strength: polishStrength,
          confidenceNode: vbaoNode.getRawTextureNode(),
        },
      )
      const cleanupScalar = cleanupTextureNode.r
      const resolveScalar = resolveNode.getTextureNode().r
      const polishTextureNode = polishNode.getTextureNode()
      const polishScalar = polishTextureNode.r
      vbaoProductNode = polishTextureNode
      vbaoProductScalar = polishScalar
      stageNodes.push(cleanupNode, resolveNode, polishNode)
      stagePipelines = {
        raw: makeAoPipeline(
          vbaoRawScalar,
          VBAO_AO_ONLY_DISPLAY_GAMMA,
          VBAO_AO_ONLY_DISPLAY_BOOST,
          VBAO_AO_ONLY_DISPLAY_FLOOR,
        ),
        cleanup: makeAoPipeline(
          cleanupScalar,
          VBAO_AO_ONLY_DISPLAY_GAMMA,
          VBAO_AO_ONLY_DISPLAY_BOOST,
          VBAO_AO_ONLY_DISPLAY_FLOOR,
        ),
        resolve: makeAoPipeline(
          resolveScalar,
          VBAO_AO_ONLY_DISPLAY_GAMMA,
          VBAO_AO_ONLY_DISPLAY_BOOST,
          VBAO_AO_ONLY_DISPLAY_FLOOR,
        ),
        polish: makeAoPipeline(
          polishScalar,
          VBAO_AO_ONLY_DISPLAY_GAMMA,
          VBAO_AO_ONLY_DISPLAY_BOOST,
          VBAO_AO_ONLY_DISPLAY_FLOOR,
        ),
        final: makeAoPipeline(
          vbaoProductScalar,
          VBAO_AO_ONLY_DISPLAY_GAMMA,
          VBAO_AO_ONLY_DISPLAY_BOOST,
          VBAO_AO_ONLY_DISPLAY_FLOOR,
        ),
      }
    }

    if (receiverConfidenceScalar !== undefined) {
      stagePipelines = {
        ...(stagePipelines ?? {}),
        confidence: makeAoPipeline(
          receiverConfidenceScalar,
          VBAO_AO_ONLY_DISPLAY_GAMMA,
          VBAO_AO_ONLY_DISPLAY_BOOST,
          VBAO_AO_ONLY_DISPLAY_FLOOR,
        ),
      }
    }

    const vbaoVelocityTemporalNode =
      vbaoTemporalMode === 'velocity-internal'
        ? new VBAOVelocityTemporalNode(
            vbaoProductNode,
            prePassDepth,
            prePassNormal,
            prePassVelocity,
            previousPrePassDepth,
            previousPrePassNormal,
            camera,
          )
        : undefined
    if (vbaoVelocityTemporalNode !== undefined) {
      vbaoProductScalar = vbaoVelocityTemporalNode.getTextureNode().r
      stageNodes.push(vbaoVelocityTemporalNode)
    }

    const useHostTaa = vbaoTemporalMode === 'host' && vbaoHostTaaMode === 'traa'
    const vbaoBeautyProductNode = useHostTaa
      ? traa(
          vec4(sceneColor.rgb.mul(vbaoProductScalar), float(1)),
          prePassDepth,
          prePassVelocity,
          camera,
        )
      : undefined
    const vbaoAoProductNode = useHostTaa
      ? traa(
          vec4(vbaoProductScalar, vbaoProductScalar, vbaoProductScalar, float(1)),
          prePassDepth,
          prePassVelocity,
          camera,
        )
      : undefined
    if (vbaoBeautyProductNode !== undefined) stageNodes.push(vbaoBeautyProductNode)
    if (vbaoAoProductNode !== undefined) stageNodes.push(vbaoAoProductNode)

    return {
      fullResolution,
      cleanupMode: vbaoCleanupMode,
      receiverConfidenceMode: vbaoReceiverConfidenceMode,
      node: vbaoNode,
      stageNodes,
      pipelines: {
        beautyRaw: makeBeautyPipeline(vbaoRawScalar),
        beautyDenoised:
          vbaoBeautyProductNode === undefined
            ? makeBeautyPipeline(vbaoProductScalar)
            : new RenderPipeline(renderer, vbaoBeautyProductNode),
        aoRaw: makeAoPipeline(
          vbaoRawScalar,
          VBAO_AO_ONLY_DISPLAY_GAMMA,
          VBAO_AO_ONLY_DISPLAY_BOOST,
          VBAO_AO_ONLY_DISPLAY_FLOOR,
        ),
        aoDenoised:
          vbaoAoProductNode === undefined
            ? makeAoPipeline(
                vbaoProductScalar,
                VBAO_AO_ONLY_DISPLAY_GAMMA,
                VBAO_AO_ONLY_DISPLAY_BOOST,
                VBAO_AO_ONLY_DISPLAY_FLOOR,
              )
            : new RenderPipeline(renderer, vbaoAoProductNode),
      },
      stagePipelines,
      velocityTemporalNode: vbaoVelocityTemporalNode,
      computeCandidate: sectorConfidence,
      computeCandidateTiming:
        sectorConfidence === null
          ? null
          : {
              pass: VBAO_COMPUTE_CANDIDATE_LABEL,
              status: 'measured' as const,
              cpuMs: sectorConfidenceComputeCpuMs,
              reason:
                'CPU-side renderer.compute() duration for the private sector-confidence smoke storage texture.',
            },
    }
  }

  const activeVbaoPipelines = (fullResolutionVbao: boolean) => {
    if (
      activeVbao?.fullResolution === fullResolutionVbao &&
      activeVbao.cleanupMode === vbaoCleanupMode &&
      activeVbao.receiverConfidenceMode === vbaoReceiverConfidenceMode
    ) {
      return activeVbao.pipelines
    }
    disposeActiveVbao()
    const nextVbao = createVbaoPipelines(fullResolutionVbao)
    activeVbao = nextVbao
    return nextVbao.pipelines
  }
  const composeBufferSize = new Vector2()
  const composeSavedViewport = new Vector4()
  const composeSavedScissor = new Vector4()
  let composeBufferWidth = 0
  let composeBufferHeight = 0
  let composeSegmentCount = 0
  let composeSegments: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }[] = []
  let composeTarget: ComposeTarget | undefined
  const timingTargets = new Map<string, ComposeTarget>()

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
      const gridColumns = segmentCount === 3 ? 3 : Math.ceil(Math.sqrt(segmentCount))
      const gridRows = segmentCount === 3 ? 1 : Math.ceil(segmentCount / gridColumns)
    const plan = createDebugViewportPlan({
      views: Array.from({ length: segmentCount }, (_, index) => ({
        label: `slot-${index}`,
        source: 'beauty',
        mode: 'passthrough',
      })),
      layout:
        segmentCount === 4
          ? { mode: 'quad' }
          : { mode: 'grid', columns: gridColumns, rows: gridRows, slots: segmentCount },
    })
    composeSegments = createDebugViewportRects(plan).map((rect) => {
      const x = Math.round(rect.scissor.x * composeBufferWidth)
      const width = Math.round(rect.scissor.width * composeBufferWidth)
      const height = Math.round(rect.scissor.height * composeBufferHeight)
      const y = Math.round((1 - rect.scissor.y - rect.scissor.height) * composeBufferHeight)
      return { x, y, width, height }
    })
    return composeSegments
  }

  const getComposeTarget = (width: number, height: number) => {
    if (composeTarget === undefined) {
      const renderTarget = new RenderTarget(1, 1, { depthBuffer: false })
      renderTarget.texture.name = 'AO.Compose.Shared'
      renderTarget.texture.generateMipmaps = false

      const copyPipeline = new RenderPipeline(renderer, texture(renderTarget.texture, uv()))
      // Source pipelines already write the display-ready output into the RT.
      // The split blit must not apply tone mapping / color-space conversion again.
      copyPipeline.outputColorTransform = false

      composeTarget = {
        renderTarget,
        copyPipeline,
        width: 1,
        height: 1,
      }
    }

    if (composeTarget.width !== width || composeTarget.height !== height) {
      composeTarget.width = width
      composeTarget.height = height
      composeTarget.renderTarget.setSize(width, height)
    }

    return composeTarget
  }

  const renderPipelineToComposeTarget = (
    pipeline: RenderPipeline,
    segment: {
      readonly width: number
      readonly height: number
    },
  ) => {
    const target = getComposeTarget(segment.width, segment.height)
    const previousRenderTarget = renderer.getRenderTarget()
    const previousAutoClear = renderer.autoClear
    const previousScissorTest = renderer.getScissorTest()

    renderer.getViewport(composeSavedViewport)
    renderer.getScissor(composeSavedScissor)

    renderer.setRenderTarget(target.renderTarget)
    renderer.setViewport(0, 0, segment.width, segment.height)
    renderer.setScissor(0, 0, segment.width, segment.height)
    renderer.setScissorTest(false)
    renderer.autoClear = true

    try {
      pipeline.render()
    } finally {
      renderer.setRenderTarget(previousRenderTarget)
      renderer.setViewport(composeSavedViewport)
      renderer.setScissor(composeSavedScissor)
      renderer.setScissorTest(previousScissorTest)
      renderer.autoClear = previousAutoClear
    }

    return target.copyPipeline
  }

  const getTimingTarget = (label: string, width: number, height: number) => {
    let target = timingTargets.get(label)
    if (target === undefined) {
      const renderTarget = new RenderTarget(1, 1, { depthBuffer: false })
      renderTarget.texture.name = label
      renderTarget.texture.generateMipmaps = false

      const copyPipeline = new RenderPipeline(renderer, texture(renderTarget.texture, uv()))
      copyPipeline.outputColorTransform = false

      target = {
        renderTarget,
        copyPipeline,
        width: 1,
        height: 1,
      }
      timingTargets.set(label, target)
    }

    if (target.width !== width || target.height !== height) {
      target.width = width
      target.height = height
      target.renderTarget.setSize(width, height)
    }

    return target
  }

  const renderPipelineWithTimingTarget = (pipeline: RenderPipeline, label: string) => {
    renderer.getDrawingBufferSize(composeBufferSize)
    const width = Math.max(1, Math.round(composeBufferSize.width))
    const height = Math.max(1, Math.round(composeBufferSize.height))
    const target = getTimingTarget(label, width, height)
    const previousRenderTarget = renderer.getRenderTarget()
    const previousAutoClear = renderer.autoClear
    const previousScissorTest = renderer.getScissorTest()

    renderer.getViewport(composeSavedViewport)
    renderer.getScissor(composeSavedScissor)

    renderer.setRenderTarget(target.renderTarget)
    renderer.setViewport(0, 0, width, height)
    renderer.setScissor(0, 0, width, height)
    renderer.setScissorTest(false)
    renderer.autoClear = true

    try {
      pipeline.render()
    } finally {
      renderer.setRenderTarget(previousRenderTarget)
      renderer.setViewport(composeSavedViewport)
      renderer.setScissor(composeSavedScissor)
      renderer.setScissorTest(previousScissorTest)
      renderer.autoClear = previousAutoClear
    }

    target.copyPipeline.render()
  }

  const renderMode = (
    mode: CompareMode,
    viewMode: ViewMode,
    denoiseEnabled: boolean,
    fullResolutionVbao: boolean,
  ) => {
    if (mode === 'n8ao') n8aoNode.setDisplayMode(viewMode === 'ao' ? 'AO' : 'Combined')
    const key: 'beautyRaw' | 'beautyDenoised' | 'aoRaw' | 'aoDenoised' =
      viewMode === 'ao'
        ? denoiseEnabled
          ? 'aoDenoised'
          : 'aoRaw'
        : denoiseEnabled
          ? 'beautyDenoised'
          : 'beautyRaw'
    if (mode === 'vbao') {
      const active = activeVbaoPipelines(fullResolutionVbao)
      const stage = getVbaoReconstructionStage()
      const stagePipeline =
        !fullResolutionVbao && denoiseEnabled && viewMode === 'ao'
          ? activeVbao?.stagePipelines?.[stage]
          : undefined
      const pipeline = stagePipeline ?? active[key]
      if (trackGpuPassTiming) renderPipelineWithTimingTarget(pipeline, 'AO.PassTiming.VBAO')
      else pipeline.render()
      return
    }
    const pipeline = pipelines[mode][key]
    if (trackGpuPassTiming && mode !== 'off') {
      renderPipelineWithTimingTarget(pipeline, `AO.PassTiming.${mode.toUpperCase()}`)
    } else {
      pipeline.render()
    }
  }

  return {
    inspectVbaoGeneratedShaders: (fullResolutionVbao: boolean): VbaoGeneratedShaderInspection => {
      activeVbaoPipelines(fullResolutionVbao).aoDenoised.render()
      return {
        productPreset: VBAO_PRODUCT_QUALITY,
        sampleMode: vbaoSampleMode,
        fullResolution: fullResolutionVbao,
        shaderPrograms: collectGeneratedShaderPrograms(renderer),
      }
    },
    renderSingle: renderMode,
    getVbaoTemporalDiagnostics: () => activeVbao?.velocityTemporalNode?.getDiagnostics() ?? null,
    getVbaoTemporalTargetInventory: () =>
      activeVbao?.velocityTemporalNode?.getTargetInventory() ?? null,
    getVbaoComputeCandidateLabel: () => activeVbao?.computeCandidate?.label ?? 'n/a',
    getVbaoComputeCandidateInventory: () =>
      activeVbao?.computeCandidate?.storageTargetInventory ?? null,
    getVbaoComputeCandidateTiming: () => activeVbao?.computeCandidateTiming ?? null,
    resetVbaoTemporalEvidence: (reason: string) => {
      activeVbao?.velocityTemporalNode?.reset(reason)
    },
    renderComposeDebug: (
      modes: readonly ComposeDebugMode[],
      viewMode: ViewMode,
      denoiseEnabled: boolean,
      fullResolutionVbao: boolean,
    ) => {
      if (modes.length === 0) {
        renderMode('off', viewMode, denoiseEnabled, fullResolutionVbao)
        return
      }
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
        modes.forEach((mode, index) => {
          const segment = segments[index]
          if (segment === undefined) return

          renderer.setScissorTest(false)
          if (mode === 'beauty') {
            const copyPipeline = renderPipelineToComposeTarget(offBeautyPipeline, segment)
            renderer.setScissorTest(true)
            renderer.setViewport(segment.x, segment.y, segment.width, segment.height)
            renderer.setScissor(segment.x, segment.y, segment.width, segment.height)
            copyPipeline.render()
            return
          }
          if (mode === 'n8ao') n8aoNode.setDisplayMode(viewMode === 'ao' ? 'AO' : 'Combined')
          const pipeline =
            mode === 'vbao' ? activeVbaoPipelines(fullResolutionVbao)[key] : pipelines[mode][key]
          const copyPipeline = renderPipelineToComposeTarget(pipeline, segment)

          renderer.setScissorTest(true)
          renderer.setViewport(segment.x, segment.y, segment.width, segment.height)
          renderer.setScissor(segment.x, segment.y, segment.width, segment.height)
          copyPipeline.render()
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
      disposeActiveVbao()
      n8aoNode.dispose()
      composeTarget?.copyPipeline.dispose()
      composeTarget?.renderTarget.dispose()
      for (const target of timingTargets.values()) {
        target.copyPipeline.dispose()
        target.renderTarget.dispose()
      }
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
  cameraView: CameraViewPreset = 'default',
) {
  variants.cityRoot.visible = variant === 'city'
  variants.museumRoot.visible = variant === 'museum'

  if (variant === 'city') {
    if (cameraView === 'city-facade') {
      camera.fov = 28
      camera.near = 0.06
      camera.far = 45
      camera.position.set(2.35, 1.1, 3.1)
      controls.minDistance = 0.35
      controls.maxDistance = 8
      controls.target.set(0.05, 0.62, 0)
    } else if (cameraView === 'city-storefront') {
      camera.fov = 30
      camera.near = 0.04
      camera.far = 45
      camera.position.set(-1.45, 0.58, 2.15)
      controls.minDistance = 0.3
      controls.maxDistance = 8
      controls.target.set(-0.28, 0.34, -0.12)
    } else if (cameraView === 'city-detail') {
      camera.fov = 32
      camera.near = 0.08
      camera.far = 40
      camera.position.set(1.65, 1.05, 2.45)
      controls.minDistance = 0.45
      controls.maxDistance = 8
      controls.target.set(0.15, 0.62, -0.1)
    } else {
      camera.fov = 40
      camera.near = 1
      camera.far = 100
      camera.position.set(5, 2, 8)
      controls.minDistance = 2
      controls.maxDistance = 16
      controls.target.set(0, 0.7, 0)
    }
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
      <button type="button" data-mode="ssao" title="TSL/WebGPU SSAO baseline">SSAO</button>
      <button type="button" data-mode="vbao">VBAO</button>
      <button type="button" data-mode="n8ao">N8AO</button>
    </div>
    <label class="benchmark-toggle">
      <input type="checkbox" data-compose-debug />
      <span>Compose debug</span>
    </label>
    <div class="compose-debug-options" role="group" aria-label="Compose debug choices">
      <label><input type="checkbox" data-compose-mode="ssao" /><span>SSAO</span></label>
      <label><input type="checkbox" data-compose-mode="vbao" /><span>VBAO</span></label>
      <label><input type="checkbox" data-compose-mode="gtao" /><span>GTAO</span></label>
      <label><input type="checkbox" data-compose-mode="n8ao" /><span>N8AO</span></label>
      <label><input type="checkbox" data-compose-mode="beauty" /><span>Beauty</span></label>
    </div>
    <div class="compare-options compare-options-secondary" role="group" aria-label="Output view">
      <button type="button" data-view="beauty">Beauty</button>
      <button type="button" data-view="ao">AO only</button>
    </div>
    <label class="benchmark-toggle">
      <input type="checkbox" data-denoise />
      <span>Product output</span>
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
      const columns = modes.length === 3 ? 3 : modes.length === 4 ? 2 : Math.ceil(Math.sqrt(modes.length))
      const rows = modes.length === 3 ? 1 : Math.ceil(modes.length / columns)
      labels.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`
      labels.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`
      labels.replaceChildren(
        ...modes.map((mode, index) => {
          const label = document.createElement('span')
          label.textContent = getComposeDebugSlotLabel(mode, index)
          return label
        }),
      )
    },
    updateStats: (stats: Stats) => {
      void stats
    },
    remove: () => labels.remove(),
  }
}

function createAoBenchmarkPublisher(
  environment: AoBenchmarkEnvironment,
  inspectVbaoGeneratedShaders: () => VbaoGeneratedShaderInspection,
  resolveGpuPassTimings: () => Promise<readonly GpuPassTiming[]>,
  setVbaoReconstructionStage: (stage: VbaoReconstructionStage) => void,
  resetVbaoTemporalEvidence: (reason: string) => void,
) {
  const history: Stats[] = []
  const api: AoBenchmarkApi = {
    environment,
    history,
    reset: () => {
      history.length = 0
      delete api.latest
    },
    inspectVbaoGeneratedShaders,
    resolveGpuPassTimings,
    setVbaoReconstructionStage,
    resetVbaoTemporalEvidence,
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
