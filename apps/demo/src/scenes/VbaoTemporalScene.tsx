/**
 * VbaoTemporalScene — VBAO + public temporal accumulation demo.
 *
 * Demonstrates the opt-in `temporal` option on VBAONode with
 * mode='depth-reprojection'. The scene is a static camera grid — ideal for
 * observing temporal convergence with no ghosting.
 *
 * Route: /vbao-temporal
 */

import { useEffect, useRef, useState } from 'react'
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Fog,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  RenderPipeline,
  Scene,
  WebGPURenderer,
} from 'three/webgpu'
import { float, mrt, normalView, output, pass, vec4 } from 'three/tsl'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { VBAONode, resolveTemporalPreset } from '@horizonao/core'

// ─── grid constants (mirrors VbaoScene.tsx) ──────────────────────────────────

const GRID_N = 13
const GRID_GAP = 1.55
const GRID_HALF = Math.floor(GRID_N / 2)

type PageState = 'loading' | 'ready' | 'error'
type TemporalToggle = 'temporal' | 'spatial'

// ─── component ───────────────────────────────────────────────────────────────

export function VbaoTemporalScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMsg, setErrorMsg] = useState<string>('')

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return
    let disposed = false

    const ctrl = new AbortController()

    void runVbaoTemporalScene(container, ctrl.signal).then(
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
  }, [])

  return (
    <section className="scene-page" style={{ position: 'relative' }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
        aria-label="VBAO temporal demo canvas"
      />
      {pageState === 'error' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)',
            color: '#f55',
            fontFamily: 'monospace',
            padding: 24,
          }}
        >
          {errorMsg}
        </div>
      )}
    </section>
  )
}

// ─── temporal toggle overlay ──────────────────────────────────────────────────

function createTemporalTogglePanel(
  container: HTMLElement,
  initial: TemporalToggle,
  onChange: (next: TemporalToggle) => void,
): { remove: () => void } {
  const panel = document.createElement('div')
  panel.className = 'compare-panel'
  panel.innerHTML = `
    <strong>Temporal</strong>
    <div class="compare-options" role="group" aria-label="Temporal accumulation mode">
      <button type="button" data-temporal="temporal">On</button>
      <button type="button" data-temporal="spatial">Off (spatial)</button>
    </div>
    <div style="font-size:11px;opacity:0.6;margin-top:4px;">
      mode: depth-reprojection &nbsp;|&nbsp; Halton-2 phase
    </div>
  `
  container.appendChild(panel)

  function sync(mode: TemporalToggle) {
    panel.querySelectorAll<HTMLButtonElement>('[data-temporal]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.temporal === mode)
    })
  }
  sync(initial)

  panel.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const val = target.dataset.temporal as TemporalToggle | undefined
    if (val !== undefined) {
      sync(val)
      onChange(val)
    }
  })

  return { remove: () => panel.remove() }
}

// ─── main render loop (raw Three.js) ─────────────────────────────────────────

async function runVbaoTemporalScene(container: HTMLDivElement, signal: AbortSignal): Promise<void> {
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
    return
  }

  // ── camera ──────────────────────────────────────────────────────────────────
  const camera = new PerspectiveCamera(42, 1, 0.1, 120)
  camera.position.set(9, 7, 12)
  camera.lookAt(0, 0, 0)

  // ── scene ───────────────────────────────────────────────────────────────────
  const scene = new Scene()
  scene.background = new Color('#0a0f11')
  scene.fog = new Fog('#0a0f11', 22, 62)

  scene.add(new AmbientLight(0xffffff, 0.6))
  const sun = new DirectionalLight(0xffffff, 1.2)
  sun.position.set(8, 18, 6)
  scene.add(sun)

  const groundMesh = new InstancedMesh(
    new BoxGeometry(40, 0.04, 40),
    new MeshStandardMaterial({ color: '#1a2025', roughness: 0.9 }),
    1,
  )
  groundMesh.setMatrixAt(0, new Matrix4().makeTranslation(0, -0.02, 0))
  groundMesh.instanceMatrix.needsUpdate = true
  scene.add(groundMesh)

  const count = GRID_N * GRID_N
  const dummy = new Object3D()
  const color = new Color()
  const gridMesh = new InstancedMesh(
    new BoxGeometry(1, 1, 1),
    new MeshStandardMaterial({ roughness: 0.66, metalness: 0.02, vertexColors: true }),
    count,
  )
  let idx = 0
  for (let x = -GRID_HALF; x <= GRID_HALF; x++) {
    for (let z = -GRID_HALF; z <= GRID_HALF; z++) {
      const height = 0.35 + ((Math.abs(x * 11 + z * 7) % 9) / 9) * 1.4
      dummy.position.set(x * GRID_GAP, height / 2, z * GRID_GAP)
      dummy.scale.set(0.72, height, 0.72)
      dummy.rotation.set(0, ((x + z) * Math.PI) / 12, 0)
      dummy.updateMatrix()
      gridMesh.setMatrixAt(idx, dummy.matrix)
      color.set(idx % 3 === 0 ? '#35d4ca' : idx % 3 === 1 ? '#f5f1e8' : '#c9a24d')
      gridMesh.setColorAt(idx, color)
      idx++
    }
  }
  gridMesh.instanceMatrix.needsUpdate = true
  if (gridMesh.instanceColor) gridMesh.instanceColor.needsUpdate = true
  scene.add(gridMesh)

  // ── controls ──────────────────────────────────────────────────────────────
  const controls = new OrbitControls(camera, canvas)
  controls.target.set(0, 0, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.075
  controls.maxPolarAngle = Math.PI * 0.48
  controls.update()

  // ── scene pass ────────────────────────────────────────────────────────────
  const scenePass = pass(scene, camera)
  scenePass.setMRT(mrt({ output, normal: normalView }))

  const depthNode = scenePass.getTextureNode('depth')
  const normalNode = scenePass.getTextureNode('normal')
  const sceneColor = scenePass.getTextureNode('output')

  // ── VBAO spatial pipeline ─────────────────────────────────────────────────
  const spatialVbaoNode = isWebGlFallback
    ? null
    : new VBAONode(depthNode, normalNode, camera, {
        radius: 1.25,
        softness: 0.65,
        advanced: {
          contrast: 1.8,
          samples: 8,
          slices: 3,
          resolutionScale: 1.0,
        },
      })

  // ── VBAO temporal pipeline ─────────────────────────────────────────────────
  // Opt-in temporal path: mode='depth-reprojection', Halton-2 phase selection.
  // Uses resolveTemporalPreset to derive slice/sample budget from the canonical
  // 'temporal-balanced' preset (2 slices × 3 samples).
  const temporalOptions = { mode: 'depth-reprojection' as const, alpha: { min: 0.05, max: 0.2 }, reliabilityCounter: true }
  const temporalPreset = resolveTemporalPreset('temporal-balanced', temporalOptions)
  const temporalVbaoNode = isWebGlFallback
    ? null
    : new VBAONode(depthNode, normalNode, camera, {
        radius: 1.25,
        softness: 0.65,
        advanced: {
          contrast: 1.8,
          samples: temporalPreset.samplesPerSlice,
          slices: temporalPreset.slices,
          resolutionScale: 1.0,
        },
        temporal: temporalOptions,
      })

  const fallbackPipeline = new RenderPipeline(renderer, vec4(sceneColor.rgb, float(1.0)))

  const spatialPipeline = spatialVbaoNode
    ? new RenderPipeline(
        renderer,
        vec4(sceneColor.rgb.mul(spatialVbaoNode.getTextureNode().r), float(1.0)),
      )
    : null

  const temporalPipeline = temporalVbaoNode
    ? new RenderPipeline(
        renderer,
        vec4(sceneColor.rgb.mul(temporalVbaoNode.getTextureNode().r), float(1.0)),
      )
    : null

  // ── UI ─────────────────────────────────────────────────────────────────────
  let activeMode: TemporalToggle = 'temporal'
  const togglePanel = createTemporalTogglePanel(container, activeMode, (next) => {
    activeMode = next
  })

  // ── resize ──────────────────────────────────────────────────────────────────
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

  // ── animation loop ──────────────────────────────────────────────────────────
  let rafId: number

  function animate() {
    if (signal.aborted) return
    rafId = requestAnimationFrame(animate)
    controls.update()

    if (isWebGlFallback) {
      renderer.render(scene, camera)
      return
    }

    if (activeMode === 'temporal' && temporalPipeline !== null) {
      temporalPipeline.render()
    } else if (spatialPipeline !== null) {
      spatialPipeline.render()
    } else {
      fallbackPipeline.render()
    }
  }

  rafId = requestAnimationFrame(animate)

  // ── cleanup ──────────────────────────────────────────────────────────────────
  signal.addEventListener('abort', () => {
    cancelAnimationFrame(rafId)
    resizeObserver.disconnect()
    controls.dispose()
    togglePanel.remove()
    spatialPipeline?.dispose()
    temporalPipeline?.dispose()
    fallbackPipeline.dispose()
    spatialVbaoNode?.dispose()
    temporalVbaoNode?.dispose()
    renderer.dispose()
    canvas.remove()
  })
}
