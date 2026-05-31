/**
 * Compile-time constants and clamped defaults for {@link VBAONode}.
 *
 * Pinned by `openspec/specs/vbao-node/spec.md` and `openspec/changes/vbao-pivot/design.md`.
 *
 * SECTOR_COUNT, the sector angle table, and the quality tier values are
 * **NOT user-adjustable** in v1. They are exposed here so callers can read
 * them for diagnostics and demo wiring, but they cannot be changed without
 * a new shader variant — and v1 ships exactly one.
 */

/**
 * Number of sectors in the per-slice visibility bitmask.
 *
 * Fixed at 32 in v1 to ship a single shader variant and to take advantage
 * of native WGSL `countOneBits()` on a `u32` value (1 cycle on WebGPU,
 * ~12 ALU ops in the GLSL emulation on WebGL2).
 */
export const SECTOR_COUNT = 32 as const

export const VBAO_THETA_MIN = -Math.PI * 0.5
export const VBAO_THETA_MAX = Math.PI * 0.5
export const VBAO_THETA_RANGE = Math.PI
export const VBAO_THETA_STEP = VBAO_THETA_RANGE / SECTOR_COUNT

/**
 * Sector center angles in radians, indexed by sector `k ∈ [0, SECTOR_COUNT)`.
 *
 * Sectors are uniformly distributed after the slice-local cosine-measure CDF,
 * so exported angles are reference/debug coordinates only:
 *
 *   `θ_k = (k + 0.5) · (π / SECTOR_COUNT) - π/2`
 *
 * Computed once at module load. NOT a uniform.
 */
export const VBAO_SECTOR_ANGLES: readonly number[] = (() => {
  const out = new Array<number>(SECTOR_COUNT)
  for (let k = 0; k < SECTOR_COUNT; k++) {
    out[k] = (k + 0.5) * VBAO_THETA_STEP + VBAO_THETA_MIN
  }
  return Object.freeze(out)
})()

/**
 * Cosine and sine tables for {@link VBAO_SECTOR_ANGLES}.
 *
 * Reference/debug cosine and sine tables for {@link VBAO_SECTOR_ANGLES}.
 *
 * Production sectorization uses cosine-measure CDF remapping and reduces by
 * popcount, so these tables are not part of the live shader hot path.
 */
export const VBAO_SECTOR_COSINES: readonly number[] = Object.freeze(
  VBAO_SECTOR_ANGLES.map((theta) => Math.cos(theta)),
)

export const VBAO_SECTOR_SINES: readonly number[] = Object.freeze(
  VBAO_SECTOR_ANGLES.map((theta) => Math.sin(theta)),
)

/**
 * Default values for the public `VBAONode` uniforms.
 *
 * `resolutionScale` is a JS field on `VBAONode`, not a raw AO uniform; included
 * here because quality tiers override it alongside the shader values.
 */
export const VBAO_DEFAULTS = Object.freeze({
  radius: 1.25,
  thickness: 0.25,
  strength: 1.0,
  contrast: 1.0,
  softness: 0.0,
  slices: 3,
  samples: 8,
  resolutionScale: 1.0,
} as const)

/**
 * Clamp ranges for the public `VBAONode` uniforms.
 *
 * `samples` and `slices` are clamped to the 64-phase atlas layout used by the
 * production shader (`slice * 16 + sample`). That keeps public overrides inside
 * the non-aliasing phase budget instead of silently wrapping high sample counts.
 */
export const VBAO_CLAMP_RANGES = Object.freeze({
  radius: { min: 0.05, max: 8 },
  thickness: { min: 0, max: 2 },
  strength: { min: 0, max: 1 },
  contrast: { min: 0, max: 4 },
  softness: { min: 0, max: 1 },
  slices: { min: 1, max: 4 },
  samples: { min: 2, max: 16 },
  resolutionScale: { min: 0.05, max: 1 },
} as const)

/**
 * Locked quality tier values.
 *
 * One sector count across all tiers (32) so v1 ships a single shader variant.
 * Tier values are read by the demo and EVIDENCE capture; tier numbers are
 * pinned by `openspec/specs/vbao-node/spec.md` and any change requires a
 * spec amendment.
 */
export const VBAO_QUALITY_TIERS = Object.freeze({
  performance: { resolutionScale: 1.0, slices: 2, samples: 4, sectors: 32 },
  balanced: { resolutionScale: 1.0, slices: 3, samples: 6, sectors: 32 },
  quality: { resolutionScale: 1.0, slices: 4, samples: 8, sectors: 32 },
  ultra: { resolutionScale: 1.0, slices: 4, samples: 10, sectors: 32 },
} as const)

export type VBAOQualityPreset = keyof typeof VBAO_QUALITY_TIERS

/**
 * User-supplied options accepted by `VBAONode` constructor and the
 * `vbao(...)` factory.
 *
 * `sectors` is intentionally NOT a key — the value is compile-time in v1.
 */
export interface VBAONodeOptions {
  readonly quality?: VBAOQualityPreset
  /** @deprecated Use `quality`; kept temporarily for older HorizonAO callers. */
  readonly preset?: VBAOQualityPreset
  readonly radius?: number
  readonly thickness?: number
  readonly strength?: number
  readonly contrast?: number
  readonly softness?: number
  /** @deprecated Use `contrast`; kept for GTAONode-style compatibility. */
  readonly scale?: number
  /** @deprecated Use `strength`; kept for older HorizonAO callers. */
  readonly intensity?: number
  readonly slices?: number
  readonly samples?: number
  readonly resolutionScale?: number
}

export interface VBAOResolvedNodeOptions {
  readonly radius: number
  readonly thickness: number
  readonly strength: number
  readonly contrast: number
  readonly softness: number
  readonly slices: number
  readonly samples: number
  readonly resolutionScale: number
}

/**
 * Clamp a partial options bag against {@link VBAO_CLAMP_RANGES} and fill
 * any missing keys with {@link VBAO_DEFAULTS}.
 */
export function clampVbaoNodeOptions(options: VBAONodeOptions): VBAOResolvedNodeOptions {
  const qualityName = options.quality ?? options.preset
  const quality =
    qualityName === undefined ? {} : VBAO_QUALITY_TIERS[qualityName] ?? {}
  const merged = {
    ...VBAO_DEFAULTS,
    ...quality,
    ...options,
    strength: options.strength ?? options.intensity ?? VBAO_DEFAULTS.strength,
    contrast: options.contrast ?? options.scale ?? VBAO_DEFAULTS.contrast,
  }
  const clamp = (v: number, range: { min: number; max: number }) =>
    Number.isFinite(v) ? Math.min(range.max, Math.max(range.min, v)) : range.min

  return Object.freeze({
    radius: clamp(merged.radius, VBAO_CLAMP_RANGES.radius),
    thickness: clamp(merged.thickness, VBAO_CLAMP_RANGES.thickness),
    strength: clamp(merged.strength, VBAO_CLAMP_RANGES.strength),
    contrast: clamp(merged.contrast, VBAO_CLAMP_RANGES.contrast),
    softness: clamp(merged.softness, VBAO_CLAMP_RANGES.softness),
    slices: Math.round(clamp(merged.slices, VBAO_CLAMP_RANGES.slices)),
    samples: Math.round(clamp(merged.samples, VBAO_CLAMP_RANGES.samples)),
    resolutionScale: clamp(merged.resolutionScale, VBAO_CLAMP_RANGES.resolutionScale),
  })
}
