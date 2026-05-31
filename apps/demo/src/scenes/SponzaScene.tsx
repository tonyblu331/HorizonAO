import { Clone, useGLTF } from '@react-three/drei'
import { modelSources } from '../assets/modelSources'
import { PARITY_SCENES } from '../parityScenes'
import { GroundPlane } from './GroundPlane'
import { HorizonEnvironment } from './HorizonEnvironment'
import { ScenePage } from './ScenePage'

export function SponzaScene() {
  return (
    <ScenePage
      title="Sponza"
      subtitle="Large architectural interior from Khronos glTF Sample Assets, useful for lighting and occlusion stress."
      camera={PARITY_SCENES.sponza.camera}
      controls={{
        target: PARITY_SCENES.sponza.camera.target,
        minDistance: 1.4,
        maxDistance: 22,
        maxPolarAngle: Math.PI * 0.49,
      }}
    >
      <HorizonEnvironment background="#101315" fog="#101315" fogNear={26} fogFar={95} />
      <GroundPlane />
      <SponzaModel />
    </ScenePage>
  )
}

function SponzaModel() {
  const gltf = useGLTF(modelSources.sponza.runtimeUrl)

  return (
    <Clone
      object={gltf.scene}
      scale={0.18}
      position={[0, 0, 0]}
      rotation={[0, Math.PI, 0]}
      castShadow
      receiveShadow
    />
  )
}

useGLTF.preload(modelSources.sponza.runtimeUrl)
