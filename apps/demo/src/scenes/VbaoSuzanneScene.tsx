/**
 * VbaoSuzanneScene — Suzanne rendered with VBAONode post-processing.
 *
 * Route: /vbao-suzanne
 *
 * Evidence camera: suzanneClay
 * (defined in apps/demo/src/evidence/evidenceCameras.ts)
 */

import { useEffect, useRef, useState } from 'react'
import { modelSources } from '../assets/modelSources'
import { runVbaoGltfScene } from './vbaoGltfScene'

type PageState = 'loading' | 'ready' | 'error'

export function VbaoSuzanneScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMsg, setErrorMsg]   = useState<string>('')

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return
    let disposed = false
    const ctrl = new AbortController()

    void runVbaoGltfScene(container, ctrl.signal, {
      modelUrl:   modelSources.suzanne.runtimeUrl,
      modelScale: 1.0,
      camera: {
        position: [3.2, 2.05, 4.8],
        target:   [0, 1.1, 0],
        fov: 34, near: 0.04, far: 40,
      },
      background: '#0c0e10',
      controls: { minDistance: 1.5, maxDistance: 12, maxPolarAngle: Math.PI * 0.49 },
      ambientIntensity: 0.5,
      sunPosition: [6, 12, 5],
      sunIntensity: 1.3,
    }).then(
      () => { if (!disposed) setPageState('ready') },
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
        aria-label="VBAO Suzanne demo canvas"
      />
      {pageState === 'error' && (
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)', color: '#f55',
            fontFamily: 'monospace', padding: 24,
          }}
        >
          {errorMsg}
        </div>
      )}
      <div className="scene-copy">
        <h1><strong>VBAO</strong> — Suzanne</h1>
        <p>Blender Suzanne — clay material, concave eye sockets and nose; neutral AO readability test.</p>
      </div>
    </section>
  )
}
