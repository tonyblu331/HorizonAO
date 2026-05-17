import { Clone, useGLTF } from '@react-three/drei'
import { modelSources } from '../assets/modelSources'
import { GroundPlane } from './GroundPlane'
import { HorizonEnvironment } from './HorizonEnvironment'
import { ScenePage } from './ScenePage'

export function BunnyScene() {
  return (
    <ScenePage
      title="Stanford Bunny"
      subtitle="Classic geometry benchmark. The source is Stanford; the browser runtime path uses a CC0 GLB mirror."
      camera={{ position: [0.92, 0.56, 1.62], fov: 34, near: 0.01, far: 18 }}
      controls={{ target: [0, 0.12, 0], minDistance: 0.55, maxDistance: 3.8 }}
    >
      <HorizonEnvironment background="#11100d" fog="#11100d" fogNear={3.5} fogFar={11} />
      <GroundPlane />
      <BunnyModel />
    </ScenePage>
  )
}

function BunnyModel() {
  const gltf = useGLTF(modelSources.bunny.runtimeUrl)

  return (
    <Clone
      object={gltf.scene}
      scale={0.58}
      position={[0, 0.02, 0]}
      rotation={[0, Math.PI / 7, 0]}
      castShadow
      receiveShadow
    />
  )
}

useGLTF.preload(modelSources.bunny.runtimeUrl)
