/**
 * VbaoScene — VBAO demonstration using a raw Three.js WebGPU render loop.
 *
 * Does NOT use React Three Fiber. Raw Three.js is used deliberately so the
 * RenderPipeline (pass → VBAONode → composite) controls the render step
 * without conflicting with R3F's built-in renderer.renderAsync() call.
 *
 * Scene: instanced box grid (identical geometry to GridScene) rendered with
 * VBAONode post-processing. AO is composited as:
 *   outputRGB = sceneColor.rgb × aoTex.r
 *
 * Route: /vbao
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
import { VBAONode } from '@horizonao/core'

// ─── grid constants (mirrors GridScene.tsx) ───────────────────────────────────

const GRID_N   = 13   // grid is GRID_N × GRID_N instances
const GRID_GAP = 1.55
const GRID_HALF = Math.floor(GRID_N / 2)

type PageState = 'loading' | 'ready' | 'error'

// ─── component ───────────────────────────────────────────────────────────────

export function VbaoScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMsg, setErrorMsg]   = useState<string>('')

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return
    let disposed = false

    const ctrl = new AbortController()

    void runVbaoScene(container, ctrl.signal).then(
      () => { if (!disposed) setPageState('ready') },
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
        aria-label="VBAO demo canvas"
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
      <div className="scene-copy">
        <h1>
          <strong>VBAO</strong>
        </h1>
        <p>
          Visibility-Bitmask Ambient Occlusion · 32-sector per-slice mask · cosine-weighted
          reduction · WebGPU / TSL
        </p>
      </div>
    </section>
  )
}

// ─── main render loop (raw Three.js) ─────────────────────────────────────────

async function runVbaoScene(container: HTMLDivElement, signal: AbortSignal): Promise<void> {
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
    trackTimestamp: true,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
  await renderer.init()
  if (signal.aborted) { renderer.dispose(); return }

  // ── camera ──────────────────────────────────────────────────────────────────
  const camera = new PerspectiveCamera(42, 1, 0.1, 120)
  camera.position.set(9, 7, 12)
  camera.lookAt(0, 0, 0)

  // ── scene ───────────────────────────────────────────────────────────────────
  const scene = new Scene()
  scene.background = new Color('#0a0f11')
  scene.fog = new Fog('#0a0f11', 22, 62)

  // ambient + directional
  scene.add(new AmbientLight(0xffffff, 0.6))
  const sun = new DirectionalLight(0xffffff, 1.2)
  sun.position.set(8, 18, 6)
  scene.add(sun)

  // ground plane
  const groundMesh = new InstancedMesh(
    new BoxGeometry(40, 0.04, 40),
    new MeshStandardMaterial({ color: '#1a2025', roughness: 0.9 }),
    1,
  )
  groundMesh.setMatrixAt(0, new Matrix4().makeTranslation(0, -0.02, 0))
  groundMesh.instanceMatrix.needsUpdate = true
  scene.add(groundMesh)

  // instanced box grid
  const count    = GRID_N * GRID_N
  const dummy    = new Object3D()
  const color    = new Color()
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

  // ── controls ─────────────────────────────────────────────────────────────────
  const controls = new OrbitControls(camera, canvas)
  controls.target.set(0, 0, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.075
  controls.maxPolarAngle = Math.PI * 0.48
  controls.update()

  // ── post-processing pipeline ──────────────────────────────────────────────
  //  scenePass renders the scene and captures depth + view-space normals via MRT.
  //  VBAONode reads those textures, computes the 32-sector per-slice bitmask, and
  //  outputs per-pixel accessibility A ∈ [0,1] to a RedFormat render target.
  //  The pipeline composites: outputRGB = sceneColor.rgb × A^scale.
  const scenePass = pass(scene, camera)
  scenePass.setMRT(
    mrt({
      output,          // colour output (required for sceneColor below)
      normal: normalView, // view-space normals (required by VBAONode, ADR-010)
    }),
  )

  const depthNode  = scenePass.getTextureNode('depth')
  const normalNode = scenePass.getTextureNode('normal')
  const sceneColor = scenePass.getTextureNode('output')

  const vbaoNode = new VBAONode(depthNode, normalNode, camera, {
    radius:          1.25,
    samples:         8,
    slices:          3,
    thickness:       0.25,
    scale:           1.0,
    resolutionScale: 0.5, // half-res AO, upsampled at composite
  })

  const aoTex = vbaoNode.getTextureNode()

  // Composite: multiply scene colour by AO factor.
  // Using scene alpha from the colour pass.
  const composited = vec4(sceneColor.rgb.mul(aoTex.r), float(1.0))

  const pipeline = new RenderPipeline(renderer, composited)

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
  let lastTime = 0
  let gridRotY = 0

  function animate(now: number) {
    if (signal.aborted) return

    rafId = requestAnimationFrame(animate)

    const delta = Math.min((now - lastTime) / 1000, 0.1)
    lastTime = now

    // Rotate the grid (same rate as GridScene's useFrame delta * 0.035)
    gridRotY += delta * 0.035
    gridMesh.rotation.y = gridRotY

    controls.update()
    pipeline.render()
  }

  rafId = requestAnimationFrame(animate)

  // Setup complete — the async function returns here.
  // The component's .then() callback will set pageState → 'ready'.

  // ── cleanup ──────────────────────────────────────────────────────────────────
  signal.addEventListener('abort', () => {
    cancelAnimationFrame(rafId)
    resizeObserver.disconnect()
    controls.dispose()
    pipeline.dispose()
    vbaoNode.dispose()
    renderer.dispose()
    canvas.remove()
  })
}

