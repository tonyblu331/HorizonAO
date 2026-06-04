/**
 * Compile-time constants and clamped defaults for {@link VBAONode}.
 *
 * Pinned by `openspec/specs/vbao-node/spec.md` and `openspec/changes/vbao-pivot/design.md`.
 *
 * SECTOR_COUNT and the quality tier values are **NOT user-adjustable** in v1.
 * Product quality presets now use fixed slice/sample loop shapes while
 * preserving the same 32-sector bitmask contract.
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
  resolutionScale: 0.5,
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
 * One sector count across all tiers (32); product presets vary only the fixed
 * slice/sample loop bounds.
 * Tier values are read by the demo and EVIDENCE capture; tier numbers are
 * pinned by `openspec/specs/vbao-node/spec.md` and any change requires a
 * spec amendment.
 */
export const VBAO_QUALITY_TIERS = Object.freeze({
  performance: { resolutionScale: 0.5, slices: 2, samples: 4, sectors: 32 },
  balanced: { resolutionScale: 0.5, slices: 3, samples: 6, sectors: 32 },
  quality: { resolutionScale: 0.5, slices: 4, samples: 8, sectors: 32 },
  ultra: { resolutionScale: 0.5, slices: 4, samples: 10, sectors: 32 },
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
