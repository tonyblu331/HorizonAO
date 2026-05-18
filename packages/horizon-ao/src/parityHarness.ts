export const HORIZON_AO_DEBUG_VIEWS = [
  'none',
  'raw-ao',
  'denoised-ao',
  'linear-depth',
  'normal',
  'edge-confidence',
  'history-rejection',
  'resolution-scale',
] as const

export type HorizonAoDebugView = (typeof HORIZON_AO_DEBUG_VIEWS)[number]

export type HorizonAoBaselineStatus = 'available' | 'pending' | 'unverified'

export const HORIZON_AO_BASELINES = {
  'scene-only': {
    label: 'Scene only',
    status: 'available',
  },
  'three-gtao-node': {
    label: 'Three GTAONode',
    status: 'available',
  },
  'n8ao-webgl2': {
    label: 'N8AO WebGL2',
    status: 'pending',
  },
  'n8ao-webgpu': {
    label: 'N8AO WebGPU',
    status: 'unverified',
  },
  'horizonao-raw': {
    label: 'HorizonAO raw',
    status: 'available',
  },
} as const satisfies Record<
  string,
  {
    readonly label: string
    readonly status: HorizonAoBaselineStatus
  }
>

export type HorizonAoBaseline = keyof typeof HORIZON_AO_BASELINES

export interface ParityCamera {
  readonly position: readonly [number, number, number]
  readonly target: readonly [number, number, number]
  readonly fov: number
  readonly near: number
  readonly far: number
}

export interface ParitySceneFixture {
  readonly key: string
  readonly label: string
  readonly route: string
  readonly camera: ParityCamera
}

export interface ParityViewport {
  readonly width: number
  readonly height: number
  readonly dpr: number
}

export interface ParityCaptureOptions extends ParityViewport {
  readonly baseline?: HorizonAoBaseline
  readonly debugView?: HorizonAoDebugView
}

export interface ParityCaptureDescriptor {
  readonly sceneKey: string
  readonly sceneLabel: string
  readonly route: string
  readonly camera: ParityCamera
  readonly viewport: ParityViewport & {
    readonly pixelWidth: number
    readonly pixelHeight: number
  }
  readonly baseline: HorizonAoBaseline
  readonly baselineStatus: HorizonAoBaselineStatus
  readonly debugView: HorizonAoDebugView
}

export type GpuTimingStatus = 'captured' | 'pending' | 'unavailable' | 'unsupported'

export interface GpuTimingRecord {
  readonly label: string
  readonly status: GpuTimingStatus
  readonly source: 'timestamp-query' | 'not-measured'
  readonly durationMs?: number
  readonly note?: string
}

export interface RenderTargetMemoryEstimate {
  readonly width: number
  readonly height: number
  readonly dpr: number
  readonly bytesPerPixel: number
}

export function createParityCaptureDescriptor(
  fixture: ParitySceneFixture,
  options: ParityCaptureOptions,
): ParityCaptureDescriptor {
  const dpr = sanitizePositive(options.dpr, 1)
  const width = Math.round(sanitizePositive(options.width, 1))
  const height = Math.round(sanitizePositive(options.height, 1))
  const baseline = options.baseline ?? 'scene-only'
  const debugView = options.debugView ?? 'none'

  return Object.freeze({
    sceneKey: fixture.key,
    sceneLabel: fixture.label,
    route: fixture.route,
    camera: fixture.camera,
    viewport: {
      width,
      height,
      dpr,
      pixelWidth: Math.round(width * dpr),
      pixelHeight: Math.round(height * dpr),
    },
    baseline,
    baselineStatus: HORIZON_AO_BASELINES[baseline].status,
    debugView,
  })
}

export function estimateRenderTargetBytes(estimate: RenderTargetMemoryEstimate): number {
  const dpr = sanitizePositive(estimate.dpr, 1)
  const width = Math.round(sanitizePositive(estimate.width, 1) * dpr)
  const height = Math.round(sanitizePositive(estimate.height, 1) * dpr)
  const bytesPerPixel = Math.round(sanitizePositive(estimate.bytesPerPixel, 1))

  return width * height * bytesPerPixel
}

export function createParityArtifactName(
  descriptor: ParityCaptureDescriptor,
  extension: 'json' | 'png' | 'webp',
): string {
  return [
    descriptor.sceneKey,
    descriptor.baseline,
    descriptor.debugView,
    `${descriptor.viewport.pixelWidth}x${descriptor.viewport.pixelHeight}`,
    `dpr${descriptor.viewport.dpr.toFixed(2)}`,
  ].join('__') + `.${extension}`
}

export function createGpuTimingRecord(
  label: string,
  durationMs?: number,
  note?: string,
): GpuTimingRecord {
  if (durationMs === undefined) {
    return Object.freeze({
      label,
      status: 'unavailable',
      source: 'not-measured',
      ...(note === undefined ? {} : { note }),
    })
  }

  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return Object.freeze({
      label,
      status: 'pending',
      source: 'timestamp-query',
      ...(note === undefined ? {} : { note }),
    })
  }

  return Object.freeze({
    label,
    status: 'captured',
    source: 'timestamp-query',
    durationMs,
    ...(note === undefined ? {} : { note }),
  })
}

export function createUnsupportedGpuTimingRecord(label: string, note: string): GpuTimingRecord {
  return Object.freeze({
    label,
    status: 'unsupported',
    source: 'not-measured',
    note,
  })
}

function sanitizePositive(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback
  return value
}
