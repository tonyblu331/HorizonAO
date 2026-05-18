import { Suspense, useLayoutEffect, useState, type ReactNode } from 'react'
import { OrbitControls, type OrbitControlsProps } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import {
  createGpuTimingRecord,
  type GpuTimingRecord,
  type HorizonAoBaseline,
  type HorizonAoDebugView,
  type ParitySceneFixture,
} from '@horizonao/core'
import { Vector3 } from 'three'
import { HorizonAoRawBaseline } from './HorizonAoRawBaseline'
import { ParityHarnessPanel } from './ParityHarnessPanel'
import { ThreeGtaoNodeBaseline } from './ThreeGtaoNodeBaseline'
import { WebGpuCanvas } from './WebGpuCanvas'

type RenderBackend = 'pending' | 'webgpu' | 'webgl-fallback' | 'unknown'

interface ScenePageProps {
  readonly title: ReactNode
  readonly subtitle: string
  readonly fixture: ParitySceneFixture
  readonly camera: {
    readonly position: readonly [number, number, number]
    readonly fov?: number
    readonly near?: number
    readonly far?: number
  }
  readonly controls?: {
    readonly target: readonly [number, number, number]
    readonly minDistance?: number
    readonly maxDistance?: number
    readonly maxPolarAngle?: number
  }
  readonly children: ReactNode
}

export function ScenePage({ title, subtitle, fixture, camera, controls, children }: ScenePageProps) {
  const [baseline, setBaseline] = useState<HorizonAoBaseline>('scene-only')
  const [debugView, setDebugView] = useState<HorizonAoDebugView>('none')
  const [gpuTiming, setGpuTiming] = useState<GpuTimingRecord>(() =>
    createGpuTimingRecord('render', undefined, 'select a measured baseline'),
  )
  const [renderBackend, setRenderBackend] = useState<RenderBackend>('pending')
  const orbitProps: OrbitControlsProps = {
    makeDefault: true,
    enableDamping: true,
    dampingFactor: 0.075,
    target: controls?.target ?? [0, 0, 0],
    maxPolarAngle: controls?.maxPolarAngle ?? Math.PI * 0.48,
  }

  if (controls?.minDistance !== undefined) orbitProps.minDistance = controls.minDistance
  if (controls?.maxDistance !== undefined) orbitProps.maxDistance = controls.maxDistance

  const handleBaselineChange = (nextBaseline: HorizonAoBaseline) => {
    setBaseline(nextBaseline)
    setGpuTiming(createGpuTimingRecord('render', undefined, 'waiting for timestamp query'))
  }

  return (
    <section className="scene-page">
      <WebGpuCanvas camera={camera} fallback={<div className="scene-fallback">WebGPU unavailable</div>}>
        <RenderBackendProbe onBackendChange={setRenderBackend} />
        {baseline === 'three-gtao-node' ? (
          <ThreeGtaoNodeBaseline debugView={debugView} onGpuTiming={setGpuTiming} />
        ) : null}
        {baseline === 'horizonao-raw' ? (
          <HorizonAoRawBaseline debugView={debugView} onGpuTiming={setGpuTiming} />
        ) : null}
        <CameraRig target={controls?.target ?? [0, 0, 0]} />
        <Suspense fallback={<FallbackStage />}>{children}</Suspense>
        <OrbitControls {...orbitProps} />
      </WebGpuCanvas>
      <div className="scene-copy">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <ParityHarnessPanel
        fixture={fixture}
        baseline={baseline}
        debugView={debugView}
        renderBackend={renderBackend}
        gpuTiming={gpuTiming}
        onBaselineChange={handleBaselineChange}
        onDebugViewChange={setDebugView}
      />
    </section>
  )
}

function RenderBackendProbe({ onBackendChange }: { readonly onBackendChange: (backend: RenderBackend) => void }) {
  const gl = useThree((state) => state.gl)

  useLayoutEffect(() => {
    const backend = (gl as { readonly backend?: { readonly isWebGPUBackend?: boolean; readonly isWebGLBackend?: boolean } })
      .backend

    if (backend?.isWebGPUBackend === true) {
      onBackendChange('webgpu')
      return
    }

    if (backend?.isWebGLBackend === true) {
      onBackendChange('webgl-fallback')
      return
    }

    onBackendChange('unknown')
  }, [gl, onBackendChange])

  return null
}

function CameraRig({ target }: { readonly target: readonly [number, number, number] }) {
  const camera = useThree((state) => state.camera)

  useLayoutEffect(() => {
    camera.lookAt(new Vector3(...target))
    camera.updateProjectionMatrix()
  }, [camera, target])

  return null
}

function FallbackStage() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[2.4, 48]} />
      <meshStandardMaterial color="#f5f1e8" roughness={0.92} metalness={0} />
    </mesh>
  )
}
