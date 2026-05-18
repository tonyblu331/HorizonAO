import { Clone, useGLTF } from '@react-three/drei'
import { modelSources } from '../assets/modelSources'
import { PARITY_SCENES } from '../parityScenes'
import { GroundPlane } from './GroundPlane'
import { HorizonEnvironment } from './HorizonEnvironment'
import { ScenePage } from './ScenePage'

export function BunnyScene() {
  return (
    <ScenePage
      title="Stanford Bunny"
      subtitle="Classic geometry benchmark. The source is Stanford; the browser runtime path uses a CC0 GLB mirror."
      fixture={PARITY_SCENES.bunny}
      camera={PARITY_SCENES.bunny.camera}
      controls={{ target: PARITY_SCENES.bunny.camera.target, minDistance: 0.55, maxDistance: 3.8 }}
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
