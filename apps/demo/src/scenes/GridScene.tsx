import { useLayoutEffect, useMemo, useRef } from 'react'
import { createHorizonAoSettings, estimateAoSampleBudget } from '@horizonao/core'
import { useFrame } from '@react-three/fiber'
import { Color, InstancedMesh, Matrix4, Object3D } from 'three'
import { GroundPlane } from './GroundPlane'
import { HorizonEnvironment } from './HorizonEnvironment'
import { ScenePage } from './ScenePage'

const temp = new Object3D()
const color = new Color()

export function GridScene() {
  const settings = createHorizonAoSettings('compact')
  const budget = estimateAoSampleBudget(settings)

  return (
    <ScenePage
      title={
        <>
          Horizon<strong>AO</strong>
        </>
      }
      subtitle={`High Quality - Compact - Horizon Based Ambient Occlusion. Sample budget target: ${budget}.`}
      camera={{ position: [9, 7, 12], fov: 42, near: 0.1, far: 120 }}
    >
      <HorizonEnvironment background="#0a0f11" fog="#0a0f11" fogNear={22} fogFar={62} />
      <GroundPlane />
      <PrimitiveGrid />
    </ScenePage>
  )
}

function PrimitiveGrid() {
  const meshRef = useRef<InstancedMesh>(null)
  const count = 13 * 13

  const matrices = useMemo(() => {
    const transforms: Matrix4[] = []
    const gap = 1.55

    for (let x = -6; x <= 6; x += 1) {
      for (let z = -6; z <= 6; z += 1) {
        const height = 0.35 + ((Math.abs(x * 11 + z * 7) % 9) / 9) * 1.4
        temp.position.set(x * gap, height / 2, z * gap)
        temp.scale.setScalar(0.72)
        temp.scale.y = height
        temp.rotation.set(0, ((x + z) * Math.PI) / 12, 0)
        temp.updateMatrix()
        transforms.push(temp.matrix.clone())
      }
    }

    return transforms
  }, [])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    matrices.forEach((matrix, index) => {
      mesh.setMatrixAt(index, matrix)
      color.set(index % 3 === 0 ? '#35d4ca' : index % 3 === 1 ? '#f5f1e8' : '#c9a24d')
      mesh.setColorAt(index, color)
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [matrices])

  useFrame((_state, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.035
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.66} metalness={0.02} vertexColors />
    </instancedMesh>
  )
}
