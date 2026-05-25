import { Canvas, type CanvasProps } from '@react-three/fiber'
import * as THREE from 'three/webgpu'

type WebGpuCanvasProps = Omit<CanvasProps, 'gl' | 'shadows' | 'dpr'>

export function WebGpuCanvas(props: WebGpuCanvasProps) {
  return (
    <Canvas
      {...props}
      className="scene-canvas"
      dpr={[1, 1.75]}
      shadows="soft"
      gl={async (rendererProps) => {
        const renderer = new THREE.WebGPURenderer({
          canvas: rendererProps.canvas as unknown as HTMLCanvasElement,
          alpha: rendererProps.alpha,
          antialias: true,
          forceWebGL: false,
          powerPreference: 'high-performance',
          trackTimestamp: false,
        })

        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1
        await renderer.init()
        return renderer
      }}
    />
  )
}
