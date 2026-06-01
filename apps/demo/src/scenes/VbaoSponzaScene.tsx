/**
 * VbaoSponzaScene — Sponza rendered with VBAONode post-processing.
 *
 * Route: /vbao-sponza
 *
 * Evidence cameras: sponzaThinRail, sponzaArches, sponzaCurtains
 * (defined in apps/demo/src/evidence/evidenceCameras.ts)
 */

import { useEffect, useRef, useState } from 'react'
import { modelSources } from '../assets/modelSources'
import { runVbaoGltfScene } from './vbaoGltfScene'

type PageState = 'loading' | 'ready' | 'error'

export function VbaoSponzaScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMsg, setErrorMsg] = useState<string>('')

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return
    let disposed = false
    const ctrl = new AbortController()

    void runVbaoGltfScene(container, ctrl.signal, {
      modelUrl: modelSources.sponza.runtimeUrl,
      modelScale: 0.18,
      modelPosition: [0, 0, 0],
      modelRotation: [0, Math.PI, 0],
      camera: {
        position: [0, 5.2, 8.4],
        target: [0, 0.35, 0],
        fov: 48,
        near: 0.04,
        far: 180,
      },
      background: '#101315',
      fog: { near: 26, far: 95 },
      controls: { minDistance: 1.4, maxDistance: 22, maxPolarAngle: Math.PI * 0.49 },
      ambientIntensity: 0.55,
      sunPosition: [10, 20, 8],
      vbao: { radius: 0.42, thickness: 0.12, samples: 8, slices: 3, resolutionScale: 1.0 },
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
        aria-label="VBAO Sponza demo canvas"
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
