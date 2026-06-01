/**
 * VbaoBunnyScene — Stanford Bunny rendered with VBAONode post-processing.
 *
 * Route: /vbao-bunny
 *
 * Evidence camera: bunnyEars
 * (defined in apps/demo/src/evidence/evidenceCameras.ts)
 */

import { useEffect, useRef, useState } from 'react'
import { modelSources } from '../assets/modelSources'
import { runVbaoGltfScene } from './vbaoGltfScene'

type PageState = 'loading' | 'ready' | 'error'

export function VbaoBunnyScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMsg, setErrorMsg] = useState<string>('')

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return
    let disposed = false
    const ctrl = new AbortController()

    void runVbaoGltfScene(container, ctrl.signal, {
      modelUrl: modelSources.bunny.runtimeUrl,
      modelScale: 1.0,
      camera: {
        position: [0.92, 0.56, 1.62],
        target: [0, 0.12, 0],
        fov: 34,
        near: 0.01,
        far: 18,
      },
      background: '#0d0f10',
      controls: { minDistance: 0.3, maxDistance: 6, maxPolarAngle: Math.PI * 0.49 },
      ambientIntensity: 0.5,
      sunPosition: [4, 8, 4],
      sunIntensity: 1.4,
      // Tighter radius to preserve fine ear detail without over-darkening.
      vbao: { radius: 0.06, thickness: 0.012, samples: 8, slices: 3, resolutionScale: 1.0 },
    }).then(
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
        aria-label="VBAO Bunny demo canvas"
      />
      {pageState === 'error' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)',
            color: '#f55',
            fontFamily: 'monospace',
            padding: 24,
          }}
        >
          {errorMsg}
        </div>
      )}
    </section>
  )
}
