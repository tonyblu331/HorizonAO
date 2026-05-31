import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { Mesh, MeshStandardMaterial } from 'three'
import { modelSources } from '../assets/modelSources'
import { PARITY_SCENES } from '../parityScenes'
import { GroundPlane } from './GroundPlane'
import { HorizonEnvironment } from './HorizonEnvironment'
import { ScenePage } from './ScenePage'

export function SuzanneScene() {
  return (
    <ScenePage
      title="Suzanne"
      subtitle="Blender's classic monkey mesh in neutral clay material, tuned for shadow and AO readability."
      camera={PARITY_SCENES.suzanne.camera}
      controls={{ target: PARITY_SCENES.suzanne.camera.target, minDistance: 1.8, maxDistance: 9 }}
    >
      <HorizonEnvironment background="#0b1114" fog="#0b1114" fogNear={12} fogFar={40} />
      <GroundPlane />
      <SuzanneModel />
    </ScenePage>
  )
}

function SuzanneModel() {
  const gltf = useGLTF(modelSources.suzanne.runtimeUrl)
  const clayScene = useMemo(() => {
    const scene = gltf.scene.clone(true)
    const clayMaterial = new MeshStandardMaterial({
      color: '#f2eadc',
      roughness: 0.92,
      metalness: 0,
      envMapIntensity: 0.25,
    })

    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true
        object.receiveShadow = true
        object.material = clayMaterial
      }
    })

    return scene
  }, [gltf.scene])

  return (
    <primitive
      object={clayScene}
      scale={0.9}
      position={[0, 1.05, 0]}
      rotation={[0, -Math.PI / 5, 0]}
    />
  )
}

useGLTF.preload(modelSources.suzanne.runtimeUrl)
