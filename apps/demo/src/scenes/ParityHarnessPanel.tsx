import { useMemo, useSyncExternalStore } from 'react'
import {
  HORIZON_AO_BASELINES,
  HORIZON_AO_DEBUG_VIEWS,
  createParityArtifactName,
  createParityCaptureDescriptor,
  estimateRenderTargetBytes,
  type GpuTimingRecord,
  type HorizonAoBaseline,
  type HorizonAoDebugView,
  type ParitySceneFixture,
  type ParityViewport,
} from '@horizonao/core'

interface ParityHarnessPanelProps {
  readonly fixture: ParitySceneFixture
  readonly baseline: HorizonAoBaseline
  readonly debugView: HorizonAoDebugView
  readonly renderBackend: 'pending' | 'webgpu' | 'webgl-fallback' | 'unknown'
  readonly gpuTiming: GpuTimingRecord
  readonly onBaselineChange: (baseline: HorizonAoBaseline) => void
  readonly onDebugViewChange: (debugView: HorizonAoDebugView) => void
}

let viewportSnapshot: ParityViewport = { width: 1, height: 1, dpr: 1 }

export function ParityHarnessPanel({
  fixture,
  baseline,
  debugView,
  renderBackend,
  gpuTiming,
  onBaselineChange,
  onDebugViewChange,
}: ParityHarnessPanelProps) {
  const viewport = useViewportSnapshot()

  const descriptor = useMemo(
    () =>
      createParityCaptureDescriptor(fixture, {
        ...viewport,
        baseline,
        debugView,
      }),
    [baseline, debugView, fixture, viewport],
  )

  const memoryBytes = estimateRenderTargetBytes({
    width: descriptor.viewport.width,
    height: descriptor.viewport.height,
    dpr: descriptor.viewport.dpr,
    bytesPerPixel: 2,
  })
  const artifactName = createParityArtifactName(descriptor, 'png')

  return (
    <aside
      className="parity-panel"
      aria-label="Parity harness"
      data-scene={descriptor.sceneKey}
      data-baseline={descriptor.baseline}
      data-baseline-status={descriptor.baselineStatus}
      data-debug-view={descriptor.debugView}
      data-render-backend={renderBackend}
      data-resolution={`${descriptor.viewport.pixelWidth}x${descriptor.viewport.pixelHeight}`}
      data-dpr={descriptor.viewport.dpr.toFixed(2)}
      data-artifact={artifactName}
      data-gpu-timing={gpuTiming.status}
      data-gpu-timing-source={gpuTiming.source}
      data-gpu-timing-ms={gpuTiming.durationMs?.toFixed(3) ?? ''}
    >
      <header>
        <span>Judgment Day</span>
        <strong>{descriptor.sceneLabel}</strong>
      </header>

      <label>
        Baseline
        <select
          aria-label="AO baseline"
          value={baseline}
          onChange={(event) => onBaselineChange(event.target.value as HorizonAoBaseline)}
        >
          {Object.entries(HORIZON_AO_BASELINES).map(([value, entry]) => (
            <option key={value} value={value}>
              {entry.label} ({entry.status})
            </option>
          ))}
        </select>
      </label>

      <label>
        Debug
        <select
          aria-label="AO debug view"
          value={debugView}
          onChange={(event) => onDebugViewChange(event.target.value as HorizonAoDebugView)}
        >
          {HORIZON_AO_DEBUG_VIEWS.map((view) => (
            <option key={view} value={view}>
              {view}
            </option>
          ))}
        </select>
      </label>

      <dl>
        <div>
          <dt>Camera</dt>
          <dd>{formatTuple(descriptor.camera.position)}</dd>
        </div>
        <div>
          <dt>Target</dt>
          <dd>{formatTuple(descriptor.camera.target)}</dd>
        </div>
        <div>
          <dt>Backend</dt>
          <dd>{renderBackend}</dd>
        </div>
        <div>
          <dt>Resolution</dt>
          <dd>
            {descriptor.viewport.pixelWidth}x{descriptor.viewport.pixelHeight}
          </dd>
        </div>
        <div>
          <dt>DPR</dt>
          <dd>{descriptor.viewport.dpr.toFixed(2)}</dd>
        </div>
        <div>
          <dt>AO target</dt>
          <dd>{formatBytes(memoryBytes)}</dd>
        </div>
        <div>
          <dt>Artifact</dt>
          <dd>{artifactName}</dd>
        </div>
        <div>
          <dt>GPU timing</dt>
          <dd>{formatTiming(gpuTiming)}</dd>
        </div>
      </dl>
    </aside>
  )
}

function useViewportSnapshot(): ParityViewport {
  return useSyncExternalStore(subscribeViewport, readViewportSnapshot, readViewportSnapshot)
}

function subscribeViewport(callback: () => void): () => void {
  window.addEventListener('resize', callback)
  return () => window.removeEventListener('resize', callback)
}

function readViewportSnapshot(): ParityViewport {
  if (typeof window === 'undefined') return viewportSnapshot

  const next = {
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight),
    dpr: Math.max(1, window.devicePixelRatio || 1),
  }

  if (
    next.width !== viewportSnapshot.width ||
    next.height !== viewportSnapshot.height ||
    next.dpr !== viewportSnapshot.dpr
  ) {
    viewportSnapshot = next
  }

  return viewportSnapshot
}

function formatTuple(tuple: readonly [number, number, number]): string {
  return tuple.map((value) => value.toFixed(2)).join(', ')
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KiB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`
}

function formatTiming(timing: GpuTimingRecord): string {
  if (timing.durationMs !== undefined) return `${timing.durationMs.toFixed(3)} ms`
  return timing.status
}
