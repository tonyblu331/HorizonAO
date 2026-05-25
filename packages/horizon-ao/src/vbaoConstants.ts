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
 * Sectors are uniformly distributed in `θ ∈ [-π/2, π/2]`, so:
 *
 *   `θ_k = (k + 0.5) · (π / SECTOR_COUNT) - π/2`
 *
 * Used by the cosine-weighted reduction (production formula):
 *
 *   `w_k = max(0, cos(θ_k − γ_i_norm))`
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
 * The reduction still evaluates `max(0, cos(theta_k - gamma))`, but the shader
 * can use the angle-difference identity:
 *
 *   cos(theta_k - gamma) = cos(theta_k) * cos(gamma) + sin(theta_k) * sin(gamma)
 *
 * This keeps the production formula intact while avoiding one cosine per sector.
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
 * `resolutionScale` is a JS field on `VBAONode`, not a uniform; included here
 * because quality tiers override it alongside the uniform values.
 */
export const VBAO_DEFAULTS = Object.freeze({
  radius: 1.25,
  thickness: 0.25,
  scale: 1.0,
  slices: 3,
  samples: 8,
  resolutionScale: 0.5,
} as const)

/**
 * Clamp ranges for the public `VBAONode` uniforms.
 *
 * `samples` and `slices` are clamped to integer ranges; the constructor
 * rounds to the nearest integer before clamping.
 */
export const VBAO_CLAMP_RANGES = Object.freeze({
  radius: { min: 0.05, max: 8 },
  thickness: { min: 0, max: 2 },
  scale: { min: 0, max: 4 },
  slices: { min: 1, max: 8 },
  samples: { min: 2, max: 32 },
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
  fast: { resolutionScale: 0.5, slices: 2, samples: 6, sectors: 32 },
  balanced: { resolutionScale: 0.5, slices: 3, samples: 8, sectors: 32 },
  quality: { resolutionScale: 1.0, slices: 4, samples: 10, sectors: 32 },
} as const)

export type VBAOQualityPreset = keyof typeof VBAO_QUALITY_TIERS

/**
 * User-supplied options accepted by `VBAONode` constructor and the
 * `vbao(...)` factory.
 *
 * `sectors` is intentionally NOT a key — the value is compile-time in v1.
 */
export interface VBAONodeOptions {
  readonly preset?: VBAOQualityPreset
  readonly radius?: number
  readonly thickness?: number
  readonly scale?: number
  readonly slices?: number
  readonly samples?: number
  readonly resolutionScale?: number
}

/**
 * Clamp a partial options bag against {@link VBAO_CLAMP_RANGES} and fill
 * any missing keys with {@link VBAO_DEFAULTS}.
 */
export function clampVbaoNodeOptions(
  options: VBAONodeOptions,
): Required<Omit<VBAONodeOptions, 'preset'>> {
  const preset = options.preset === undefined ? {} : VBAO_QUALITY_TIERS[options.preset]
  const merged = { ...VBAO_DEFAULTS, ...preset, ...options }
  const clamp = (v: number, range: { min: number; max: number }) =>
    Number.isFinite(v) ? Math.min(range.max, Math.max(range.min, v)) : range.min

  return Object.freeze({
    radius: clamp(merged.radius, VBAO_CLAMP_RANGES.radius),
    thickness: clamp(merged.thickness, VBAO_CLAMP_RANGES.thickness),
    scale: clamp(merged.scale, VBAO_CLAMP_RANGES.scale),
    slices: Math.round(clamp(merged.slices, VBAO_CLAMP_RANGES.slices)),
    samples: Math.round(clamp(merged.samples, VBAO_CLAMP_RANGES.samples)),
    resolutionScale: clamp(merged.resolutionScale, VBAO_CLAMP_RANGES.resolutionScale),
  })
}
