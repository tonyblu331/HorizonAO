import { Suspense, useLayoutEffect, type ReactNode } from 'react'
import { OrbitControls, type OrbitControlsProps } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { WebGpuCanvas } from './WebGpuCanvas'

interface ScenePageProps {
  readonly title: ReactNode
  readonly subtitle: string
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
  // kept for backward compat during PR-04 wiring — unused until VbaoScene ships
  readonly fixture?: unknown
}

export function ScenePage({ title, subtitle, camera, controls, children }: ScenePageProps) {
  const orbitProps: OrbitControlsProps = {
    makeDefault: true,
    enableDamping: true,
    dampingFactor: 0.075,
    target: controls?.target ?? [0, 0, 0],
    maxPolarAngle: controls?.maxPolarAngle ?? Math.PI * 0.48,
  }

  if (controls?.minDistance !== undefined) orbitProps.minDistance = controls.minDistance
  if (controls?.maxDistance !== undefined) orbitProps.maxDistance = controls.maxDistance

  return (
    <section className="scene-page">
      <WebGpuCanvas
        camera={camera}
        fallback={<div className="scene-fallback">WebGPU unavailable</div>}
      >
        <CameraRig target={controls?.target ?? [0, 0, 0]} />
        <Suspense fallback={<FallbackStage />}>{children}</Suspense>
        <OrbitControls {...orbitProps} />
      </WebGpuCanvas>
      <div className="scene-copy">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </section>
  )
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
