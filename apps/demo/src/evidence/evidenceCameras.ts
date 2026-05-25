/**
 * Pinned camera configurations for reproducible EVIDENCE.md captures.
 *
 * EVIDENCE.md MUST reference cameras by key, not loose screenshots.
 * Do not change existing entries — add new ones instead.
 *
 * Units: position/target in world-space meters, fov in degrees.
 */

export interface EvidenceCamera {
  readonly position: readonly [number, number, number]
  readonly target: readonly [number, number, number]
  readonly fov: number
  /** EVIDENCE row schema — all numeric columns for a VBAO capture */
  readonly _rowSchema?: never // documentation only
}

export const evidenceCameras = {
  /** Museum comparison route — baseline GTAO/VBAO/N8AO evidence framing */
  museumBaseline: {
    position: [4.8, 2.5, 6.4],
    target: [0, 0.9, -0.2],
    fov: 44,
  },
  /** Thin curtain rails — primary thin-geometry VBAO win case */
  sponzaThinRail: {
    position: [-3.8, 2.4, 0.4],
    target: [-1.2, 1.8, 0.4],
    fov: 45,
  },
  /** Central arched colonnade — wide AO coverage test */
  sponzaArches: {
    position: [0, 5.2, 8.4],
    target: [0, 0.35, 0],
    fov: 48,
  },
  /** Curtain fabric detail — thin/layered geometry */
  sponzaCurtains: {
    position: [2.6, 3.1, 2.0],
    target: [0, 2.0, 0],
    fov: 45,
  },
  /** Bunny ear tips — thin occluder that GTAO over-darkens */
  bunnyEars: {
    position: [0.38, 0.68, 0.72],
    target: [0, 0.45, 0],
    fov: 35,
  },
  /** Suzanne clay — neutral baseline, shadow + AO readability */
  suzanneClay: {
    position: [3.2, 2.05, 4.8],
    target: [0, 1.1, 0],
    fov: 34,
  },
  /** Primitive grid overhead — uniform occlusion stress */
  gridBaseline: {
    position: [9, 7, 12],
    target: [0, 0, 0],
    fov: 42,
  },
} as const satisfies Record<string, EvidenceCamera>

export type EvidenceCameraKey = keyof typeof evidenceCameras

/**
 * Required columns for every row in EVIDENCE.md.
 *
 * ```
 * scene | cameraId | resolution | algorithm | viewMode | denoise
 *   | device | browser | renderer | timingMethod | medianTime_ms
 *   | radius | thickness | slices | samples | resolutionScale | sectors
 *   | failureLabels | screenshotPath
 * ```
 */
export const EVIDENCE_ROW_SCHEMA = [
  'scene',
  'cameraId',
  'resolution',
  'algorithm',
  'viewMode',
  'denoise',
  'device',
  'browser',
  'renderer',
  'timingMethod',
  'medianTime_ms',
  'radius',
  'thickness',
  'slices',
  'samples',
  'resolutionScale',
  'sectors',
  'failureLabels',
  'screenshotPath',
] as const

export type EvidenceRowKey = (typeof EVIDENCE_ROW_SCHEMA)[number]

export const EVIDENCE_FAILURE_LABELS = [
  'none',
  'noise',
  'mud',
  'halo',
  'thin-gap',
  'edge-bleed',
  'scale-mismatch',
] as const

export type EvidenceFailureLabel = (typeof EVIDENCE_FAILURE_LABELS)[number]
