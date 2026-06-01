/**
 * vbaoGltfScene — shared raw Three.js setup for GLTF model scenes rendered
 * through VBAONode.
 *
 * Used by VbaoSponzaScene, VbaoBunnyScene, VbaoSuzanneScene.  Each of those
 * files is a thin React wrapper; the actual render loop lives here.
 *
 * Pattern mirrors VbaoScene.tsx — raw Three.js (no R3F) so RenderPipeline
 * controls the render step without conflicting with R3F's renderAsync().
 */

import {
  AmbientLight,
  DirectionalLight,
  Color,
  Fog,
  PerspectiveCamera,
  Scene,
  WebGPURenderer,
} from 'three/webgpu'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { mrt, normalView, output, pass } from 'three/tsl'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { type VBAONodeOptions } from '@horizonao/core'
import { createAoComparePanel, type AoMode, type AoViewMode } from './aoComparePanel'
import { createAoPipelines } from './aoPipelines'

export interface VbaoGltfSceneConfig {
  /** Remote or local URL of the GLTF/GLB model to load. */
  readonly modelUrl: string
  /** Uniform scale applied to the loaded model root. */
  readonly modelScale: number
  /** Optional XYZ translation of the loaded model root. Default: [0, 0, 0] */
  readonly modelPosition?: readonly [number, number, number]
  /** Optional XYZ rotation (Euler, radians) of the model root. Default: [0, 0, 0] */
  readonly modelRotation?: readonly [number, number, number]

  /** Camera configuration. All units: world-space (meters), fov: degrees. */
  readonly camera: {
    readonly position: readonly [number, number, number]
    readonly target: readonly [number, number, number]
    readonly fov: number
    readonly near: number
    readonly far: number
  }

  /** Scene background colour (CSS hex). */
  readonly background: string
  /** Optional fog (same colour as background is typical). */
  readonly fog?: { readonly near: number; readonly far: number }

  /** OrbitControls distance limits. */
  readonly controls?: {
    readonly minDistance?: number
    readonly maxDistance?: number
    readonly maxPolarAngle?: number
  }

  /** VBAONode options; falls back to balanced-tier defaults if omitted. */
  readonly vbao?: Partial<VBAONodeOptions>

  /** Ambient light intensity [0, ∞]. Default: 0.6 */
  readonly ambientIntensity?: number
  /** Directional light position [x, y, z]. Default: [8, 18, 6] */
  readonly sunPosition?: readonly [number, number, number]
  /** Directional light intensity. Default: 1.2 */
  readonly sunIntensity?: number
}

// ─── main entry point ─────────────────────────────────────────────────────────

/**
 * Mount a GLTF model in a raw Three.js render loop with VBAONode post-processing.
 * Returns a cleanup promise that resolves once the scene is running.  The caller
 * is responsible for calling `ctrl.abort()` to tear down the animation loop.
 */
export async function runVbaoGltfScene(
  container: HTMLDivElement,
  signal: AbortSignal,
  cfg: VbaoGltfSceneConfig,
): Promise<void> {
  // ── canvas ──────────────────────────────────────────────────────────────────
  const canvas = document.createElement('canvas')
  canvas.className = 'scene-canvas'
  container.appendChild(canvas)

  // ── renderer ────────────────────────────────────────────────────────────────
  const renderer = new WebGPURenderer({
    canvas,
    antialias: true,
    forceWebGL: false,
    powerPreference: 'high-performance',
    trackTimestamp: false,
  })
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

  // ── camera ──────────────────────────────────────────────────────────────────
  const { position: camPos, target: camTarget, fov, near, far } = cfg.camera
  const camera = new PerspectiveCamera(fov, 1, near, far)
  camera.position.set(...camPos)
  camera.lookAt(...camTarget)

  // ── scene ───────────────────────────────────────────────────────────────────
  const scene = new Scene()
  scene.background = new Color(cfg.background)
  if (cfg.fog) {
    scene.fog = new Fog(cfg.background, cfg.fog.near, cfg.fog.far)
  }

  const ambientIntensity = cfg.ambientIntensity ?? 0.6
  scene.add(new AmbientLight(0xffffff, ambientIntensity))

  const sunPos = cfg.sunPosition ?? [8, 18, 6]
  const sun = new DirectionalLight(0xffffff, cfg.sunIntensity ?? 1.2)
  sun.position.set(...sunPos)
  scene.add(sun)

  // ── load model ──────────────────────────────────────────────────────────────
  const loader = new GLTFLoader()
  const gltf = await new Promise<Awaited<ReturnType<GLTFLoader['loadAsync']>>>(
    (resolve, reject) => {
      loader.load(cfg.modelUrl, resolve, undefined, reject)
    },
  )
  if (signal.aborted) {
    renderer.dispose()
    canvas.remove()
    return
  }

  const modelRoot = gltf.scene
  modelRoot.scale.setScalar(cfg.modelScale)
  if (cfg.modelPosition) modelRoot.position.set(...cfg.modelPosition)
  if (cfg.modelRotation) modelRoot.rotation.set(...cfg.modelRotation)
  scene.add(modelRoot)

  // ── controls ─────────────────────────────────────────────────────────────────
  const controls = new OrbitControls(camera, canvas)
  controls.target.set(...camTarget)
  controls.enableDamping = true
  controls.dampingFactor = 0.075
  if (cfg.controls?.minDistance !== undefined) controls.minDistance = cfg.controls.minDistance
  if (cfg.controls?.maxDistance !== undefined) controls.maxDistance = cfg.controls.maxDistance
  controls.maxPolarAngle = cfg.controls?.maxPolarAngle ?? Math.PI * 0.48
  controls.update()

  // ── post-processing pipeline ─────────────────────────────────────────────────
  const scenePass = pass(scene, camera)
  scenePass.setMRT(
    mrt({
      output,
      normal: normalView,
    }),
  )

  const depthNode = scenePass.getTextureNode('depth')
  const normalNode = scenePass.getTextureNode('normal')
  const sceneColor = scenePass.getTextureNode('output')

  const aoPipelines = isWebGlFallback
    ? undefined
    : createAoPipelines({
        renderer,
        scene,
        sceneColor,
        depthNode,
        normalNode,
        camera,
        radius: 1.25,
        samples: 8,
        slices: 3,
        thickness: 0.25,
        scale: 1.0,
        softness: 0.65,
        resolutionScale: 1.0,
        ...cfg.vbao,
      })

  let activeAo: AoMode = isWebGlFallback ? 'off' : 'vbao'
  let activeView: AoViewMode = 'combined'
  const comparePanel = createAoComparePanel(container, activeAo, activeView, (next) => {
    if (next.mode !== undefined) activeAo = next.mode
    if (next.viewMode !== undefined) activeView = next.viewMode
    comparePanel.sync(activeAo, activeView)
  }, !isWebGlFallback)

  // ── resize ───────────────────────────────────────────────────────────────────
  function onResize() {
    const w = container.clientWidth
    const h = container.clientHeight
    if (w === 0 || h === 0) return
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  onResize()
  const resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(container)

  // ── animation loop ───────────────────────────────────────────────────────────
  let rafId: number

  function animate() {
    if (signal.aborted) return
    rafId = requestAnimationFrame(animate)
    controls.update()
    if (isWebGlFallback) {
      renderer.render(scene, camera)
      return
    }
    aoPipelines?.render(activeAo, activeView)
  }

  rafId = requestAnimationFrame(animate)

  // ── cleanup ──────────────────────────────────────────────────────────────────
  signal.addEventListener('abort', () => {
    cancelAnimationFrame(rafId)
    resizeObserver.disconnect()
    controls.dispose()
    comparePanel.remove()
    aoPipelines?.dispose()
    renderer.dispose()
    canvas.remove()
  })
}
