import { useEffect, useRef, useState } from 'react'
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  WebGPURenderer,
} from 'three/webgpu'
import { mrt, normalView, output, pass } from 'three/tsl'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createAoComparePanel, type AoMode, type AoViewMode } from './aoComparePanel'
import { createAoPipelines } from './aoPipelines'

type PageState = 'loading' | 'ready' | 'error'

export function VbaoLabScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMsg, setErrorMsg] = useState<string>('')

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return

    let disposed = false
    const ctrl = new AbortController()

    void runVbaoLabScene(container, ctrl.signal).then(
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
        aria-label="VBAO lab demo canvas"
      />
      {pageState === 'error' && (
        <div className="scene-error" role="alert">
          {errorMsg}
        </div>
      )}
    </section>
  )
}

async function runVbaoLabScene(container: HTMLDivElement, signal: AbortSignal): Promise<void> {
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

  const camera = new PerspectiveCamera(44, 1, 0.03, 60)
  camera.position.set(4.6, 2.8, 6.2)
  camera.lookAt(0, 0.9, 0)

  const scene = new Scene()
  scene.background = new Color('#0a0f11')
  scene.add(new AmbientLight(0xffffff, 0.58))

  const sun = new DirectionalLight(0xffffff, 1.35)
  sun.position.set(4, 7, 5)
  scene.add(sun)

  const clay = new MeshStandardMaterial({ color: '#d9d1bd', roughness: 0.86, metalness: 0 })
  const wallMat = new MeshStandardMaterial({ color: '#68737a', roughness: 0.92, metalness: 0 })
  const accentMat = new MeshStandardMaterial({ color: '#34c5bc', roughness: 0.72, metalness: 0 })

  const floor = new Mesh(new BoxGeometry(9, 0.08, 9), wallMat)
  floor.position.set(0, -0.04, 0)
  scene.add(floor)

  const backWall = new Mesh(new BoxGeometry(9, 3.4, 0.12), wallMat)
  backWall.position.set(0, 1.66, -3.4)
  scene.add(backWall)

  const leftWall = new Mesh(new BoxGeometry(0.12, 3.0, 6.8), wallMat)
  leftWall.position.set(-3.4, 1.46, 0)
  scene.add(leftWall)

  const rightWall = new Mesh(new BoxGeometry(0.12, 2.15, 4.4), wallMat)
  rightWall.position.set(3.4, 1.02, -0.8)
  scene.add(rightWall)

  const sphere = new Mesh(new SphereGeometry(0.82, 64, 32), clay)
  sphere.position.set(-0.92, 0.82, -0.25)
  scene.add(sphere)

  const blocker = new Mesh(new BoxGeometry(0.42, 1.64, 0.42), accentMat)
  blocker.position.set(0.78, 0.82, 0.15)
  scene.add(blocker)

  const lowBlocker = new Mesh(new BoxGeometry(1.25, 0.42, 0.78), clay)
  lowBlocker.position.set(1.55, 0.21, -1.45)
  scene.add(lowBlocker)

  const controls = new OrbitControls(camera, canvas)
  controls.target.set(0, 0.75, -0.35)
  controls.enableDamping = true
  controls.dampingFactor = 0.075
  controls.minDistance = 2
  controls.maxDistance = 12
  controls.maxPolarAngle = Math.PI * 0.49
  controls.update()

  const scenePass = pass(scene, camera)
  scenePass.setMRT(
    mrt({
      output,
      normal: normalView,
    }),
  )

  const sceneColor = scenePass.getTextureNode('output')
  const depthNode = scenePass.getTextureNode('depth')
  const normalNode = scenePass.getTextureNode('normal')
  const aoPipelines = isWebGlFallback
    ? undefined
    : createAoPipelines({
        renderer,
        scene,
        sceneColor,
        depthNode,
        normalNode,
        camera,
        radius: 0.55,
        thickness: 0.12,
        scale: 1.0,
        softness: 0.65,
        samples: 8,
        slices: 3,
        resolutionScale: 1.0,
      })

  let activeAo: AoMode = isWebGlFallback ? 'off' : 'vbao'
  let activeView: AoViewMode = 'combined'
  const comparePanel = createAoComparePanel(container, activeAo, activeView, (next) => {
    if (next.mode !== undefined) activeAo = next.mode
    if (next.viewMode !== undefined) activeView = next.viewMode
    comparePanel.sync(activeAo, activeView)
  }, !isWebGlFallback)

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
