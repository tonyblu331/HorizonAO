/**
 * VbaoParityPage — standalone Three.js render (no R3F) for VBAO parity testing.
 *
 * Mounts a small canvas, initialises a WebGPURenderer, runs one frame of VBAONode
 * on a synthetic flat-plane scene, reads back the AO render target, and exposes
 * results on `window.__vbaoParity` for Playwright to inspect.
 *
 * Route: /vbao-parity
 *
 * Test flow (vbao-parity.spec.ts):
 *   1. Navigate to /vbao-parity.
 *   2. Poll `[data-state="ready"]` on the status paragraph.
 *   3. Read `window.__vbaoParity.pixels`, verify:
 *      a. All values ∈ [0, 1].
 *      b. No NaN values.
 *      c. Flat-plane center pixels are ≥ 0.3 (non-trivially open).
 *      d. Spatial standard deviation > 0 (not constant — proof of computation).
 *
 * TODO (PR-05 follow-up): For quantitative parity (TSL ≡ scalar reference, ≤ 1e-3
 * tolerance), also expose `window.__vbaoParityInputs` with the per-pixel depth and
 * normal values from the scene pass MRT, so the Playwright test can run the scalar
 * reference functions on the exact same inputs and compare.
 */

import { useEffect, useRef, useState } from 'react'
import {
  AmbientLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RenderPipeline,
  Scene,
  WebGPURenderer,
} from 'three/webgpu'
import { float, mrt, normalView, output, pass, vec4 } from 'three/tsl'
import { VBAONode } from '@horizonao/core'

// ─── window contract (read by Playwright) ────────────────────────────────────

export interface VbaoParityResult {
  /** Width of the VBAONode render target (equals renderer size × resolutionScale). */
  readonly width: number
  /** Height of the VBAONode render target. */
  readonly height: number
  /**
   * Per-pixel AO values in [0, 1], row-major, bottom-row first (WebGL convention).
   * Length = width × height.
   */
  readonly pixels: readonly number[]
  /** The VBAONode options used for this capture. */
  readonly config: {
    readonly radius: number
    readonly samples: number
    readonly slices: number
    readonly thickness: number
  }
}

declare global {
  interface Window {
    __vbaoParity?: VbaoParityResult
    __vbaoParityError?: string
  }
}

// ─── constants ────────────────────────────────────────────────────────────────

/** Canvas + RT size for the parity render. Small for fast GPU readback. */
const PARITY_SIZE = 64

// ─── component ───────────────────────────────────────────────────────────────

type PageState = 'loading' | 'ready' | 'error'

export function VbaoParityPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMsg, setErrorMsg] = useState<string>('')

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) return
    let disposed = false

    void runParityCapture(canvas).then(
      () => {
        if (!disposed) setPageState('ready')
      },
      (err: unknown) => {
        if (!disposed) {
          const msg = err instanceof Error ? err.message : String(err)
          window.__vbaoParityError = msg
          setErrorMsg(msg)
          setPageState('error')
        }
      },
    )

    return () => {
      disposed = true
    }
  }, [])

  return (
    <main style={{ padding: 24, fontFamily: 'monospace', maxWidth: 480 }}>
      <h1 style={{ fontSize: 18, marginBottom: 8 }}>VBAO Parity</h1>
      <p
        data-testid="parity-status"
        data-state={pageState}
        style={{ marginBottom: 12, color: pageState === 'error' ? '#c00' : '#555' }}
      >
        {pageState === 'loading' && 'Running VBAO kernel…'}
        {pageState === 'ready' && 'Ready — window.__vbaoParity set'}
        {pageState === 'error' && `Error: ${errorMsg}`}
      </p>
      {/* Small render canvas; visible so Playwright can confirm WebGPU booted. */}
      <canvas
        ref={canvasRef}
        data-testid="parity-canvas"
        style={{ display: 'block', width: PARITY_SIZE, height: PARITY_SIZE, border: '1px solid #ccc' }}
      />
    </main>
  )
}

// ─── core render + readback ───────────────────────────────────────────────────

async function runParityCapture(canvas: HTMLCanvasElement): Promise<void> {
  // 1. WebGPU renderer — init must complete before any TSL compilation.
  const renderer = new WebGPURenderer({
    canvas,
    antialias: false,
    forceWebGL: false,
    powerPreference: 'high-performance',
  })
  await renderer.init()
  const backend = (renderer as unknown as { readonly backend?: { readonly isWebGLBackend?: boolean } }).backend
  if (backend?.isWebGLBackend === true) {
    throw new Error('WebGPU unavailable: renderer fell back to WebGL2')
  }
  renderer.setSize(PARITY_SIZE, PARITY_SIZE)

  try {
    // 2. Synthetic scene: flat XY plane centred at origin, camera looking from +Z.
    //    All surface normals point toward the camera → a known, controlled configuration.
    const scene = new Scene()
    const camera = new PerspectiveCamera(
      60,           // fov
      1,            // aspect — matches PARITY_SIZE × PARITY_SIZE
      0.1,          // near
      100,          // far
    )
    camera.position.set(0, 0, 3)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()

    const plane = new Mesh(
      new PlaneGeometry(10, 10), // XY plane, large enough to fill the view
      new MeshStandardMaterial({ color: 0x888888, roughness: 1, metalness: 0 }),
    )
    scene.add(plane)
    scene.add(new AmbientLight(0xffffff, 1.0))

    // 3. PassNode with MRT: output colour + view-space normals + depth.
    //    VBAONode reads from the depth and normal texture nodes produced here.
    const scenePass = pass(scene, camera)
    scenePass.setMRT(
      mrt({
        output,          // colour output
        normal: normalView, // view-space normals (required by VBAONode, ADR-010)
      }),
    )

    const depthNode  = scenePass.getTextureNode('depth')
    const normalNode = scenePass.getTextureNode('normal')

    // 4. VBAONode — required (depthNode, normalNode, camera), with small options
    //    for fast parity capture (fewer samples = faster, still exercises the kernel).
    const vbaoNode = new VBAONode(depthNode, normalNode, camera, {
      radius:          0.4,
      samples:         4,   // minimal — enough to exercise the kernel
      slices:          2,
      thickness:       0.1,
      scale:           1.0,
      resolutionScale: 1.0, // match renderer size exactly
    })

    // 5. RenderPipeline — include VBAONode in the output graph so its
    //    updateBefore() is called and the render target gets populated.
    //    We output the AO value as greyscale RGBA to satisfy the pipeline's vec4 contract.
    const aoTex = vbaoNode.getTextureNode()
    const pipeline = new RenderPipeline(
      renderer,
      vec4(aoTex.r, aoTex.r, aoTex.r, float(1.0)),
    )

    // 6. One render pass.  After this call:
    //    - scenePass.renderTarget is populated (scene rendered).
    //    - vbaoNode.renderTarget is populated (VBAO pass rendered).
    //    - Screen shows AO greyscale.
    pipeline.render()

    // 7. Read back the VBAO render target (not the screen).
    //    The target is RedFormat + UnsignedByteType (default), so WebGPU returns
    //    a Uint8Array where each byte is one pixel's R value in [0, 255].
    const rt   = vbaoNode.getRenderTarget()
    const rtW  = rt.width
    const rtH  = rt.height

    if (rtW === 0 || rtH === 0) {
      throw new Error(
        `VBAONode render target is ${rtW}×${rtH} — setSize() may not have been called` +
        ` (renderer size: ${PARITY_SIZE}×${PARITY_SIZE})`,
      )
    }

    const rawData = await renderer.readRenderTargetPixelsAsync(rt, 0, 0, rtW, rtH)

    // 8. Normalise raw bytes → floats.
    const totalPixels = rtW * rtH
    const pixels = normaliseReadback(rawData, totalPixels)

    // 9. Expose on window for Playwright.
    window.__vbaoParity = {
      width:   rtW,
      height:  rtH,
      pixels,
      config: { radius: 0.4, samples: 4, slices: 2, thickness: 0.1 },
    }
  } finally {
    renderer.dispose()
  }
}

/**
 * Convert the raw GPU readback buffer to a flat number[] of per-pixel AO values
 * in [0, 1], taking only the R channel (regardless of whether the backend pads
 * to RGBA or returns single-channel data).
 *
 * Handles:
 *   - Float32Array  (HalfFloat/FloatType targets) — direct mapping.
 *   - Uint8Array / Uint8ClampedArray (UnsignedByteType, default) — divide by 255.
 *
 * Stride is computed from `byteLength / totalPixels` so padding differences
 * between WebGPU and WebGL2 backends are handled automatically.
 */
function normaliseReadback(
  raw: ArrayBufferView | ArrayBuffer,
  totalPixels: number,
): number[] {
  // Wrap plain ArrayBuffer in Uint8Array for uniform access.
  const data: ArrayBufferView = raw instanceof ArrayBuffer ? new Uint8Array(raw) : raw

  if (data instanceof Float32Array) {
    const stride = Math.round(data.length / totalPixels)
    const pixels: number[] = []
    for (let i = 0; i < data.length; i += stride) {
      pixels.push(data[i] ?? 0)
    }
    return pixels
  }

  // Uint8Array / Uint8ClampedArray
  const typed = data as Uint8Array | Uint8ClampedArray
  const stride = Math.round(typed.byteLength / totalPixels)
  const pixels: number[] = []
  for (let i = 0; i < typed.length; i += stride) {
    pixels.push((typed[i] ?? 0) / 255)
  }
  return pixels
}
