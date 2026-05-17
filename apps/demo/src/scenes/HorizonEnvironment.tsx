import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Color, Fog } from 'three'

interface HorizonEnvironmentProps {
  readonly background?: string
  readonly fog?: string
  readonly fogNear?: number
  readonly fogFar?: number
}

export function HorizonEnvironment({
  background = '#0a0f11',
  fog = '#0a0f11',
  fogNear = 18,
  fogFar = 70,
}: HorizonEnvironmentProps) {
  const scene = useThree((state) => state.scene)

  useLayoutEffect(() => {
    const previousBackground = scene.background
    const previousFog = scene.fog

    scene.background = new Color(background)
    scene.fog = new Fog(fog, fogNear, fogFar)

    return () => {
      scene.background = previousBackground
      scene.fog = previousFog
    }
  }, [background, fog, fogFar, fogNear, scene])

  return (
    <>
      <hemisphereLight args={['#f5f1e8', '#26313a', 1.35]} />
      <directionalLight
        castShadow
        position={[8, 12, 7]}
        intensity={3.6}
        shadow-mapSize={[2048, 2048]}
      />
    </>
  )
}
